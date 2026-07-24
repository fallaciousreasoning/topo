// Color stops for slope angles, shared between the worker (tile rendering) and UI (legend)
export const colorStops = [
    { angle: 0, color: { r: 0, g: 0, b: 0, a: 0 } },          // Transparent
    { angle: 15, color: { r: 255, g: 255, b: 0, a: 255 } },   // Yellow
    { angle: 30, color: { r: 255, g: 70, b: 0, a: 255 } },    // Orange
    { angle: 40, color: { r: 255, g: 0, b: 0, a: 255 } },     // Red
    { angle: 50, color: { r: 128, g: 0, b: 128, a: 255 } },   // Purple
    { angle: 60, color: { r: 0, g: 0, b: 0, a: 255 } }        // Black
]
