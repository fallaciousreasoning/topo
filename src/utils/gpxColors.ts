// Garmin's DisplayColor_t palette, used for gpxx:DisplayColor on devices/BaseCamp
// that don't understand arbitrary hex colors.
export const GARMIN_COLORS: [name: string, hex: string][] = [
    ['Black', '#000000'],
    ['DarkRed', '#8b0000'],
    ['DarkGreen', '#006400'],
    ['DarkYellow', '#808000'],
    ['DarkBlue', '#00008b'],
    ['DarkMagenta', '#8b008b'],
    ['DarkCyan', '#008b8b'],
    ['LightGray', '#d3d3d3'],
    ['DarkGray', '#a9a9a9'],
    ['Red', '#ff0000'],
    ['Green', '#00ff00'],
    ['Yellow', '#ffff00'],
    ['Blue', '#0000ff'],
    ['Magenta', '#ff00ff'],
    ['Cyan', '#00ffff'],
    ['White', '#ffffff'],
]

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

export function nearestGarminColorName(hex: string): string {
    const [r, g, b] = hexToRgb(hex)
    let best = GARMIN_COLORS[0]
    let bestDist = Infinity
    for (const entry of GARMIN_COLORS) {
        const [er, eg, eb] = hexToRgb(entry[1])
        const dist = (r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2
        if (dist < bestDist) {
            bestDist = dist
            best = entry
        }
    }
    return best[0]
}

export function garminColorNameToHex(name: string): string | undefined {
    const entry = GARMIN_COLORS.find(([n]) => n.toLowerCase() === name.trim().toLowerCase())
    return entry?.[1]
}

function hslToHex(h: number, s: number, l: number): string {
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
        return Math.round(c * 255).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

// A random, but readable and visually distinct, track color for imports
// that don't specify one.
export function randomTrackColor(): string {
    const hue = Math.floor(Math.random() * 360)
    return hslToHex(hue, 0.7, 0.5)
}
