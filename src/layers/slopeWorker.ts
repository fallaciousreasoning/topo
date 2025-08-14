// Web Worker for slope angle tile generation
// Uses actor pattern: worker requests elevation data from main thread

interface ElevationRequest {
    type: 'REQUEST_ELEVATION_DATA'
    id: string
    x: number
    y: number 
    z: number
}

interface ElevationResponse {
    type: 'ELEVATION_DATA'
    id: string
    centerTile: ImageData | null
    neighbors: {
        top: ImageData | null
        bottom: ImageData | null
        left: ImageData | null
        right: ImageData | null
    }
}

interface ProcessTileRequest {
    type: 'PROCESS_TILE'
    id: string
    x: number
    y: number
    z: number
}

interface TileResponse {
    type: 'TILE_COMPLETE'
    id: string
    dataUrl: string
    error?: string
}

type WorkerMessage = ElevationRequest | ProcessTileRequest
type MainMessage = ElevationResponse | TileResponse

// Color stops for slope angles
const colorStops = [
    { angle: 0, color: { r: 0, g: 0, b: 0, a: 0 } },        // Transparent
    { angle: 15, color: { r: 255, g: 255, b: 0, a: 255 } }, // Yellow
    { angle: 20, color: { r: 255, g: 255, b: 0, a: 255 } }, // Yellow
    { angle: 30, color: { r: 255, g: 165, b: 0, a: 255 } }, // Orange
    { angle: 40, color: { r: 255, g: 0, b: 0, a: 255 } },   // Red
    { angle: 50, color: { r: 128, g: 0, b: 128, a: 255 } }, // Purple
    { angle: 60, color: { r: 0, g: 0, b: 0, a: 255 } }      // Black
]

// Pending tile requests waiting for elevation data
const pendingRequests = new Map<string, { x: number, y: number, z: number }>()

// Slope angle calculation with neighbor tile support
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
            
            // Use mapbox encoding (matching demSource.ts)
            return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1)
        }
        
        const idx = (sourcePy * width + sourcePx) * 4
        const r = sourceData.data[idx]
        const g = sourceData.data[idx + 1]  
        const b = sourceData.data[idx + 2]
        
        // Use mapbox encoding (matching demSource.ts)
        return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1)
    }
    
    // Calculate gradients using finite differences
    const dzdx = (getElevation(x + 1, y) - getElevation(x - 1, y)) / (2 * resolution)
    const dzdy = (getElevation(x, y + 1) - getElevation(x, y - 1)) / (2 * resolution)
    
    // Calculate slope angle in degrees
    const slopeRadians = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy))
    return slopeRadians * (180 / Math.PI)
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

function getSlopeColor(slope: number): { r: number, g: number, b: number, a: number } {
    // Below minimum threshold
    if (slope < colorStops[0].angle) {
        return { r: 0, g: 0, b: 0, a: 0 } // Transparent
    }
    
    // Above maximum threshold
    if (slope >= colorStops[colorStops.length - 1].angle) {
        return colorStops[colorStops.length - 1].color
    }
    
    // Find the two color stops to interpolate between
    for (let i = 0; i < colorStops.length - 1; i++) {
        const lower = colorStops[i]
        const upper = colorStops[i + 1]
        
        if (slope >= lower.angle && slope <= upper.angle) {
            const t = (slope - lower.angle) / (upper.angle - lower.angle)
            return {
                r: Math.round(lerp(lower.color.r, upper.color.r, t)),
                g: Math.round(lerp(lower.color.g, upper.color.g, t)),
                b: Math.round(lerp(lower.color.b, upper.color.b, t)),
                a: Math.round(lerp(lower.color.a, upper.color.a, t))
            }
        }
    }
    
    // Fallback (shouldn't reach here)
    return { r: 0, g: 0, b: 0, a: 0 }
}

function applyBlur(imageData: ImageData): ImageData {
    const width = imageData.width
    const height = imageData.height
    const blurred = new ImageData(width, height)
    
    // 3x3 box blur kernel (equal weights)
    const kernel = [
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9
    ]
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0
            
            // Apply kernel
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = Math.max(0, Math.min(width - 1, x + kx))
                    const py = Math.max(0, Math.min(height - 1, y + ky))
                    const idx = (py * width + px) * 4
                    const weight = kernel[(ky + 1) * 3 + (kx + 1)]
                    
                    r += imageData.data[idx] * weight
                    g += imageData.data[idx + 1] * weight
                    b += imageData.data[idx + 2] * weight
                    a += imageData.data[idx + 3] * weight
                }
            }
            
            const outputIdx = (y * width + x) * 4
            blurred.data[outputIdx] = Math.round(r)
            blurred.data[outputIdx + 1] = Math.round(g)
            blurred.data[outputIdx + 2] = Math.round(b)
            blurred.data[outputIdx + 3] = Math.round(a)
        }
    }
    
    return blurred
}

function processTileData(centerTile: ImageData, neighbors: any, x: number, y: number, z: number): string {
    try {
        if (!centerTile) {
            return generateEmptyTile()
        }
        
        const slopeImageData = new ImageData(256, 256)
        
        // Calculate ground resolution based on zoom level
        const groundResolution = 40075000 / (256 * Math.pow(2, z))
        
        // Calculate slope angles for each pixel
        for (let py = 0; py < 256; py++) {
            for (let px = 0; px < 256; px++) {
                const slope = calculateSlopeAngleWithNeighbors(centerTile, neighbors, px, py, groundResolution)
                
                // Convert slope angle to color using gradient
                const color = getSlopeColor(slope)
                const idx = (py * 256 + px) * 4
                
                slopeImageData.data[idx] = color.r
                slopeImageData.data[idx + 1] = color.g
                slopeImageData.data[idx + 2] = color.b
                slopeImageData.data[idx + 3] = color.a
            }
        }
        
        // Apply 3x3 blur kernel
        const blurredImageData = applyBlur(slopeImageData)
        
        // Convert to canvas and return data URL
        const canvas = new OffscreenCanvas(256, 256)
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(blurredImageData, 0, 0)
        
        return canvas.convertToBlob().then(blob => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
            })
        })
    } catch (error) {
        console.warn('Failed to process tile in worker:', error)
        return generateEmptyTile()
    }
}

function generateEmptyTile(): string {
    const canvas = new OffscreenCanvas(256, 256)
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 256, 256)
    return canvas.convertToBlob().then(blob => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
        })
    })
}

// Worker message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data
    
    if (message.type === 'PROCESS_TILE') {
        const { id, x, y, z } = message
        
        // Store the request and ask main thread for elevation data
        pendingRequests.set(id, { x, y, z })
        
        const elevationRequest: ElevationRequest = {
            type: 'REQUEST_ELEVATION_DATA',
            id,
            x,
            y,
            z
        }
        
        self.postMessage(elevationRequest)
    } else if (message.type === 'ELEVATION_DATA') {
        const { id, centerTile, neighbors } = message as ElevationResponse
        const request = pendingRequests.get(id)
        
        if (request) {
            pendingRequests.delete(id)
            
            try {
                const dataUrl = await processTileData(centerTile, neighbors, request.x, request.y, request.z)
                
                const response: TileResponse = {
                    type: 'TILE_COMPLETE',
                    id,
                    dataUrl
                }
                
                self.postMessage(response)
            } catch (error) {
                const response: TileResponse = {
                    type: 'TILE_COMPLETE',
                    id,
                    dataUrl: await generateEmptyTile(),
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
                
                self.postMessage(response)
            }
        }
    }
})

export type { WorkerMessage, MainMessage, ElevationRequest, ElevationResponse, ProcessTileRequest, TileResponse }