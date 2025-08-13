import React from "react"
import { OverlayDefinition } from "./config"
import Source from '../map/Source'
import Layer from '../map/Layer'
import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "./demSource"
import { addProtocol, getProtocol, getData } from '../caches/protocols'

// Slope angle calculation utilities with neighbor tile support
function calculateSlopeAngleWithNeighbors(
    centerTile: ImageData, 
    neighbors: { [key: string]: ImageData | null },
    x: number, 
    y: number, 
    resolution: number = 1
): number {
    const width = centerTile.width
    const height = centerTile.height
    
    // Get elevation from any tile (including neighbors)
    const getElevation = (px: number, py: number): number => {
        let sourceData = centerTile
        let sourcePx = px
        let sourcePy = py
        
        // Check if we need to look in neighbor tiles
        if (px < 0 && neighbors.left) {
            sourceData = neighbors.left
            sourcePx = width + px // px is negative, so this gives us the right edge
        } else if (px >= width && neighbors.right) {
            sourceData = neighbors.right
            sourcePx = px - width
        } else if (py < 0 && neighbors.top) {
            sourceData = neighbors.top
            sourcePy = height + py // py is negative
        } else if (py >= height && neighbors.bottom) {
            sourceData = neighbors.bottom
            sourcePy = py - height
        } else if (px < 0 || px >= width || py < 0 || py >= height) {
            // No neighbor available, return current pixel elevation
            const currentIdx = (y * width + x) * 4
            const r = centerTile.data[currentIdx]
            const g = centerTile.data[currentIdx + 1]  
            const b = centerTile.data[currentIdx + 2]
            
            if (elevationEncoding === 'mapbox') {
                return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1)
            } else if (elevationEncoding === 'terrarium') {
                return (r * 256 + g + b / 256) - 32768
            }
            return 0
        }
        
        const idx = (sourcePy * width + sourcePx) * 4
        const r = sourceData.data[idx]
        const g = sourceData.data[idx + 1]  
        const b = sourceData.data[idx + 2]
        
        // Decode elevation based on encoding type
        if (elevationEncoding === 'mapbox') {
            return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1)
        } else if (elevationEncoding === 'terrarium') {
            return (r * 256 + g + b / 256) - 32768
        }
        return 0
    }
    
    // Calculate gradients using finite differences
    const dzdx = (getElevation(x + 1, y) - getElevation(x - 1, y)) / (2 * resolution)
    const dzdy = (getElevation(x, y + 1) - getElevation(x, y - 1)) / (2 * resolution)
    
    // Calculate slope angle in degrees
    const slopeRadians = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy))
    return slopeRadians * (180 / Math.PI)
}

// Custom tile generator for slope angles
class SlopeAngleTileSource {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    
    constructor() {
        this.canvas = document.createElement('canvas')
        this.canvas.width = 256
        this.canvas.height = 256
        this.ctx = this.canvas.getContext('2d')!
    }
    
    private getElevationTileUrl(x: number, y: number, z: number): string {
        // Use the same URL pattern as the DEM source
        return demSource.sharedDemProtocolUrl.replace('{z}', z.toString()).replace('{x}', x.toString()).replace('{y}', y.toString())
    }
    
    private async fetchNeighborTiles(x: number, y: number, z: number): Promise<{
        center: ImageData,
        neighbors: { [key: string]: ImageData | null }
    }> {
        const abortController = new AbortController()
        const tiles: { [key: string]: ImageData | null } = {
            center: null,
            top: null,
            bottom: null,
            left: null,
            right: null
        }
        
        // Fetch center tile and neighbors
        const tilePromises = [
            { key: 'center', tx: x, ty: y },
            { key: 'top', tx: x, ty: y - 1 },
            { key: 'bottom', tx: x, ty: y + 1 },
            { key: 'left', tx: x - 1, ty: y },
            { key: 'right', tx: x + 1, ty: y }
        ].map(async ({ key, tx, ty }) => {
            try {
                // Skip tiles that are outside valid range
                if (tx < 0 || ty < 0 || tx >= Math.pow(2, z) || ty >= Math.pow(2, z)) {
                    return { key, imageData: null }
                }
                
                const url = this.getElevationTileUrl(tx, ty, z)
                const response = await getData({ url } as any, abortController)
                const blob = new Blob([response.data])
                const tileUrl = URL.createObjectURL(blob)
                
                const img = new Image()
                img.crossOrigin = 'anonymous'
                
                return new Promise<{ key: string, imageData: ImageData | null }>((resolve) => {
                    img.onload = () => {
                        this.ctx.clearRect(0, 0, 256, 256)
                        this.ctx.drawImage(img, 0, 0, 256, 256)
                        const imageData = this.ctx.getImageData(0, 0, 256, 256)
                        URL.revokeObjectURL(tileUrl)
                        resolve({ key, imageData })
                    }
                    img.onerror = () => {
                        URL.revokeObjectURL(tileUrl)
                        resolve({ key, imageData: null })
                    }
                    img.src = tileUrl
                })
            } catch (error) {
                return { key, imageData: null }
            }
        })
        
        const results = await Promise.all(tilePromises)
        results.forEach(({ key, imageData }) => {
            tiles[key] = imageData
        })
        
        return {
            center: tiles.center!,
            neighbors: {
                top: tiles.top,
                bottom: tiles.bottom,
                left: tiles.left,
                right: tiles.right
            }
        }
    }
    
    async generateSlopeTile(x: number, y: number, z: number): Promise<string> {
        try {
            // Fetch center tile and neighbors
            const { center: imageData, neighbors } = await this.fetchNeighborTiles(x, y, z)
            
            if (!imageData) {
                return this.generateEmptyTile()
            }
            
            const slopeImageData = this.ctx.createImageData(256, 256)
            
            // Calculate ground resolution based on zoom level
            // At zoom level z, each pixel represents about (40075000 / (256 * 2^z)) meters
            const groundResolution = 40075000 / (256 * Math.pow(2, z))
            
            // Calculate slope angles for each pixel
            for (let py = 0; py < 256; py++) {
                for (let px = 0; px < 256; px++) {
                    const slope = calculateSlopeAngleWithNeighbors(imageData, neighbors, px, py, groundResolution)
                    
                    // Convert slope angle to color gradient
                    const idx = (py * 256 + px) * 4
                    
                    if (slope < 15) {
                        // Transparent for slopes less than 15°
                        slopeImageData.data[idx] = 0     // R
                        slopeImageData.data[idx + 1] = 0 // G  
                        slopeImageData.data[idx + 2] = 0 // B
                        slopeImageData.data[idx + 3] = 0 // Alpha (fully transparent)
                    } else if (slope <= 20) {
                        // Yellow (15° to 20°)
                        slopeImageData.data[idx] = 255     // R (yellow)
                        slopeImageData.data[idx + 1] = 255 // G (yellow)
                        slopeImageData.data[idx + 2] = 0   // B
                        slopeImageData.data[idx + 3] = 255 // Alpha (fully opaque)
                    } else if (slope <= 30) {
                        // Orange (20° to 30°)
                        slopeImageData.data[idx] = 255     // R (orange)
                        slopeImageData.data[idx + 1] = 165 // G (orange)
                        slopeImageData.data[idx + 2] = 0   // B
                        slopeImageData.data[idx + 3] = 255 // Alpha (fully opaque)
                    } else if (slope <= 40) {
                        // Red (30° to 40°)
                        slopeImageData.data[idx] = 255     // R (red)
                        slopeImageData.data[idx + 1] = 0   // G
                        slopeImageData.data[idx + 2] = 0   // B
                        slopeImageData.data[idx + 3] = 255 // Alpha (fully opaque)
                    } else if (slope <= 50) {
                        // Purple (40° to 50°)
                        slopeImageData.data[idx] = 128     // R (purple)
                        slopeImageData.data[idx + 1] = 0   // G
                        slopeImageData.data[idx + 2] = 128 // B (purple)
                        slopeImageData.data[idx + 3] = 255 // Alpha (fully opaque)
                    } else if (slope <= 60) {
                        // Black (50° to 60°)
                        slopeImageData.data[idx] = 0       // R (black)
                        slopeImageData.data[idx + 1] = 0   // G (black)
                        slopeImageData.data[idx + 2] = 0   // B (black)
                        slopeImageData.data[idx + 3] = 255 // Alpha (fully opaque)
                    } else {
                        // Black (60°+)
                        slopeImageData.data[idx] = 0       // R (black)
                        slopeImageData.data[idx + 1] = 0   // G (black)
                        slopeImageData.data[idx + 2] = 0   // B (black)
                        slopeImageData.data[idx + 3] = 255 // Alpha (fully opaque)
                    }
                }
            }
            
            this.ctx.putImageData(slopeImageData, 0, 0)
            return this.canvas.toDataURL()
        } catch (error) {
            console.warn('Failed to generate slope tile:', error)
            return this.generateEmptyTile()
        }
    }
    
    private generateEmptyTile(): string {
        this.ctx.clearRect(0, 0, 256, 256)
        return this.canvas.toDataURL()
    }
    
    getTileUrl(x: number, y: number, z: number): string {
        // This would be called by maplibre to get tile URLs
        // In practice, we'd need to set up a custom protocol or tile server
        return `slope-angle://${z}/${x}/${y}`
    }
}

// Create slope angle tile source instance
const slopeAngleSource = new SlopeAngleTileSource()

// Register custom protocol handler
const protocol = 'slope-angle'

if (!getProtocol(`${protocol}://test`)) {
    addProtocol(protocol, async (params, abortController) => {
        // Remove hash fragment and parse coordinates
        const urlWithoutHash = params.url.replace(`${protocol}://`, '').split('#')[0]
        const urlParts = urlWithoutHash.split('/')
        const [z, x, y] = urlParts.map(Number)
        
        if (isNaN(z) || isNaN(x) || isNaN(y)) {
            throw new Error(`Invalid tile coordinates: z=${z}, x=${x}, y=${y}`)
        }
        
        try {
            const tileData = await slopeAngleSource.generateSlopeTile(x, y, z)
            
            // Convert data URL to array buffer
            const response = await fetch(tileData, { signal: abortController.signal })
            const arrayBuffer = await response.arrayBuffer()
            
            return { data: arrayBuffer }
        } catch (error) {
            throw error
        }
    })
}

export default {
    id: 'slope-angle',
    name: 'Slope Angle',
    description: 'Shows terrain slope angles as colored raster tiles',
    type: 'overlay',
    cacheable: false,
    source: (
        <>
            <Source 
                id="slopeAngleSource" 
                spec={{
                    type: 'raster',
                    tiles: [`slope-angle://{z}/{x}/{y}`],
                    tileSize: 256,
                    minzoom: 6,
                    maxzoom: maxContourZoom
                }}
            />
            <Layer 
                key="slope-angle" 
                layer={{
                    id: 'slope-angle',
                    type: 'raster',
                    source: 'slopeAngleSource',
                    paint: {
                        'raster-opacity': 0.7
                    }
                }} 
            />
        </>
    )
} as OverlayDefinition