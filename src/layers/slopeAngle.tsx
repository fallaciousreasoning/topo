import React from "react"
import { addProtocol, getData, getProtocol } from '../caches/protocols'
import Layer from '../map/Layer'
import Source from '../map/Source'
import { OverlayDefinition } from "./config"
import { demSource } from "./demSource"

// Import worker types
import type { ElevationRequest, ElevationResponse, MainMessage, ProcessTileRequest, TileResponse, CalculatePointSlopeRequest, PointSlopeResponse, PointElevationRequest, PointElevationResponse } from './slopeWorker'
import { getElevation } from './contours'

// Custom tile generator for slope angles using web worker
class SlopeAngleTileSource {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private worker: Worker
    private pendingTiles = new Map<string, { 
        resolve: (dataUrl: string) => void, 
        reject: (error: Error) => void,
        abortController: AbortController 
    }>()
    private pendingSlopes = new Map<string, { 
        resolve: (angle: number | null) => void, 
        reject: (error: Error) => void 
    }>()
    
    constructor() {
        this.canvas = document.createElement('canvas')
        this.canvas.width = 256
        this.canvas.height = 256
        this.ctx = this.canvas.getContext('2d')!
        
        // Create worker
        this.worker = new Worker(new URL('./slopeWorker.ts', import.meta.url), { type: 'module' })
        this.worker.addEventListener('message', this.handleWorkerMessage.bind(this))
    }
    
    private handleWorkerMessage(event: MessageEvent<MainMessage>) {
        const message = event.data
        
        if (message.type === 'REQUEST_ELEVATION_DATA') {
            // Worker is asking for elevation data
            this.provideElevationData(message as ElevationRequest)
        } else if (message.type === 'REQUEST_POINT_ELEVATION_DATA') {
            // Worker is asking for point elevation data
            this.providePointElevationData(message as PointElevationRequest)
        } else if (message.type === 'TILE_COMPLETE') {
            // Worker has finished processing a tile
            const tileMessage = message as TileResponse
            const pending = this.pendingTiles.get(tileMessage.id)
            
            if (pending && !pending.abortController.signal.aborted) {
                this.pendingTiles.delete(tileMessage.id)
                
                if (tileMessage.error) {
                    pending.reject(new Error(tileMessage.error))
                } else {
                    pending.resolve(tileMessage.dataUrl)
                }
            }
        } else if (message.type === 'POINT_SLOPE_COMPLETE') {
            // Worker has finished calculating point slope
            const slopeMessage = message as PointSlopeResponse
            const pending = this.pendingSlopes.get(slopeMessage.id)
            
            if (pending) {
                this.pendingSlopes.delete(slopeMessage.id)
                
                if (slopeMessage.error) {
                    pending.reject(new Error(slopeMessage.error))
                } else {
                    pending.resolve(slopeMessage.slopeAngle)
                }
            }
        }
    }
    
    private async provideElevationData(request: ElevationRequest) {
        // Check if the request is still pending (not aborted)
        const pending = this.pendingTiles.get(request.id)
        if (!pending || pending.abortController.signal.aborted) {
            return // Don't fetch data for cancelled requests
        }
        
        try {
            // Fetch elevation data for center tile and neighbors
            const { center, neighbors } = await this.fetchNeighborTiles(request.x, request.y, request.z, pending.abortController)
            
            // Check again if still pending after async fetch
            if (pending.abortController.signal.aborted) {
                return
            }
            
            const response: ElevationResponse = {
                type: 'ELEVATION_DATA',
                id: request.id,
                centerTile: center,
                neighbors: {
                    top: neighbors.top,
                    bottom: neighbors.bottom,
                    left: neighbors.left,
                    right: neighbors.right
                }
            }
            
            this.worker.postMessage(response)
        } catch (error) {
            // Check if error is due to abortion
            if (pending.abortController.signal.aborted) {
                return
            }
            
            // Send null data if fetch fails
            const response: ElevationResponse = {
                type: 'ELEVATION_DATA',
                id: request.id,
                centerTile: null,
                neighbors: {
                    top: null,
                    bottom: null,
                    left: null,
                    right: null
                }
            }
            
            this.worker.postMessage(response)
        }
    }

    private async providePointElevationData(request: PointElevationRequest) {
        try {
            const { id, lat, lng, offset } = request
            const abortController = new AbortController()
            
            // Get elevations at center point and nearby points
            const [center, east, west, north, south] = await Promise.all([
                getElevation([lat, lng], abortController).catch(() => null),
                getElevation([lat, lng + offset], abortController).catch(() => null),
                getElevation([lat, lng - offset], abortController).catch(() => null),
                getElevation([lat + offset, lng], abortController).catch(() => null),
                getElevation([lat - offset, lng], abortController).catch(() => null)
            ])
            
            const response: PointElevationResponse = {
                type: 'POINT_ELEVATION_DATA',
                id,
                elevations: {
                    center,
                    east,
                    west,
                    north,
                    south
                }
            }
            
            this.worker.postMessage(response)
        } catch (error) {
            // Send null data if fetch fails
            const response: PointElevationResponse = {
                type: 'POINT_ELEVATION_DATA',
                id: request.id,
                elevations: {
                    center: null,
                    east: null,
                    west: null,
                    north: null,
                    south: null
                }
            }
            
            this.worker.postMessage(response)
        }
    }

    private getElevationTileUrl(x: number, y: number, z: number): string {
        // Use the same URL pattern as the DEM source
        return demSource.sharedDemProtocolUrl.replace('{z}', z.toString()).replace('{x}', x.toString()).replace('{y}', y.toString())
    }
    
    private async fetchNeighborTiles(x: number, y: number, z: number, abortController: AbortController): Promise<{
        center: ImageData,
        neighbors: { [key: string]: ImageData | null }
    }> {
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
                // Check for abort before starting
                if (abortController.signal.aborted) {
                    return { key, imageData: null }
                }
                
                // Skip tiles that are outside valid range
                if (tx < 0 || ty < 0 || tx >= Math.pow(2, z) || ty >= Math.pow(2, z)) {
                    return { key, imageData: null }
                }
                
                const url = this.getElevationTileUrl(tx, ty, z)
                const response = await getData({ url } as any, abortController)
                
                // Check for abort after getData
                if (abortController.signal.aborted) {
                    return { key, imageData: null }
                }
                
                const blob = new Blob([response.data])
                const tileUrl = URL.createObjectURL(blob)
                
                const img = new Image()
                img.crossOrigin = 'anonymous'
                
                return new Promise<{ key: string, imageData: ImageData | null }>((resolve) => {
                    const cleanup = () => {
                        URL.revokeObjectURL(tileUrl)
                    }
                    
                    // Handle abort during image loading
                    const onAbort = () => {
                        cleanup()
                        resolve({ key, imageData: null })
                    }
                    
                    if (abortController.signal.aborted) {
                        onAbort()
                        return
                    }
                    
                    abortController.signal.addEventListener('abort', onAbort)
                    
                    img.onload = () => {
                        if (abortController.signal.aborted) {
                            cleanup()
                            resolve({ key, imageData: null })
                            return
                        }
                        
                        this.ctx.clearRect(0, 0, 256, 256)
                        this.ctx.drawImage(img, 0, 0, 256, 256)
                        const imageData = this.ctx.getImageData(0, 0, 256, 256)
                        cleanup()
                        resolve({ key, imageData })
                    }
                    img.onerror = () => {
                        cleanup()
                        resolve({ key, imageData: null })
                    }
                    img.src = tileUrl
                })
            } catch (error) {
                return { key, imageData: null }
            }
        })
        
        const results = await Promise.all(tilePromises)
        
        // Check for abort before processing results
        if (abortController.signal.aborted) {
            throw new Error('Fetch aborted')
        }
        
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
    
    async generateSlopeTile(x: number, y: number, z: number, abortSignal?: AbortSignal): Promise<string> {
        return new Promise((resolve, reject) => {
            const id = `${x}-${y}-${z}-${Date.now()}`
            const abortController = new AbortController()
            
            // Check if already aborted
            if (abortSignal?.aborted) {
                reject(new Error('Tile generation aborted'))
                return
            }
            
            // Store the promise resolvers and abort controller
            this.pendingTiles.set(id, { resolve, reject, abortController })
            
            // Handle external abort signal
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => {
                    if (this.pendingTiles.has(id)) {
                        this.pendingTiles.delete(id)
                        abortController.abort()
                        reject(new Error('Tile generation aborted'))
                    }
                })
            }
            
            // Handle timeout
            const timeoutId = setTimeout(() => {
                if (this.pendingTiles.has(id)) {
                    this.pendingTiles.delete(id)
                    abortController.abort()
                    reject(new Error('Tile generation timeout'))
                }
            }, 30000) // 30 second timeout
            
            // Clean up timeout when request completes
            abortController.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId)
            })
            
            // Send processing request to worker
            const request: ProcessTileRequest = {
                type: 'PROCESS_TILE',
                id,
                x,
                y,
                z
            }
            
            this.worker.postMessage(request)
        })
    }
    
    // Method to cancel all pending tiles
    cancelAllPendingTiles() {
        for (const [id, pending] of this.pendingTiles.entries()) {
            pending.abortController.abort()
            pending.reject(new Error('Tile generation cancelled'))
        }
        this.pendingTiles.clear()
    }
    
    // Method to cancel a specific tile
    cancelTile(x: number, y: number, z: number) {
        for (const [id, pending] of this.pendingTiles.entries()) {
            if (id.startsWith(`${x}-${y}-${z}-`)) {
                this.pendingTiles.delete(id)
                pending.abortController.abort()
                pending.reject(new Error('Tile generation cancelled'))
                break
            }
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

    async calculatePointSlope(lat: number, lng: number): Promise<number | null> {
        return new Promise((resolve, reject) => {
            const id = `slope-${lat}-${lng}-${Date.now()}`
            
            // Store the promise resolvers
            this.pendingSlopes.set(id, { resolve, reject })
            
            // Handle timeout
            const timeoutId = setTimeout(() => {
                if (this.pendingSlopes.has(id)) {
                    this.pendingSlopes.delete(id)
                    reject(new Error('Slope calculation timeout'))
                }
            }, 10000) // 10 second timeout

            // Clean up timeout when request completes
            const cleanup = () => clearTimeout(timeoutId)
            const originalResolve = resolve
            const originalReject = reject

            this.pendingSlopes.set(id, { 
                resolve: (angle) => {
                    cleanup()
                    originalResolve(angle)
                },
                reject: (error) => {
                    cleanup()
                    originalReject(error)
                }
            })

            // Send request to worker
            const request: CalculatePointSlopeRequest = {
                type: 'CALCULATE_POINT_SLOPE',
                id,
                lat,
                lng
            }

            this.worker.postMessage(request)
        })
    }
}

// Create slope angle tile source instance
const slopeAngleSource = new SlopeAngleTileSource()

// Export the instance for use in other components
export { slopeAngleSource }

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
    defaultOpacity: 0.6,
    source: (
        <>
            <Source 
                id="slopeAngleSource" 
                spec={{
                    type: 'raster',
                    tiles: [`slope-angle://{z}/{x}/{y}`],
                    tileSize: 256,
                    minzoom: 7,
                    maxzoom: 17
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
