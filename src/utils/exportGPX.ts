import { Track } from "../tracks/track";
import { Point } from "../tracks/point";
import { buildFullCoordinates } from "../tracks/trackUtils";
import { nearestGarminColorName } from "./gpxColors";

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export function exportGPX(tracks: Track[], points: Point[]): string {
    const lines: string[] = []
    lines.push('<?xml version="1.0" encoding="UTF-8"?>')
    lines.push('<gpx version="1.1" creator="NZ Topo" xmlns="http://www.topografix.com/GPX/1/1"')
    lines.push('  xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"')
    lines.push('  xmlns:gpx_style="http://www.topografix.com/GPX/gpx_style/0.2">')

    for (const track of tracks) {
        lines.push('  <trk>')
        if (track.name) lines.push(`    <name>${escapeXml(track.name)}</name>`)
        if (track.color) {
            lines.push('    <extensions>')
            lines.push('      <gpxx:TrackExtension>')
            lines.push(`        <gpxx:DisplayColor>${nearestGarminColorName(track.color)}</gpxx:DisplayColor>`)
            lines.push('      </gpxx:TrackExtension>')
            lines.push('      <gpx_style:line>')
            lines.push(`        <gpx_style:color>${track.color.replace('#', '')}</gpx_style:color>`)
            lines.push('      </gpx_style:line>')
            lines.push('    </extensions>')
        }
        lines.push('    <trkseg>')
        for (const [lng, lat] of buildFullCoordinates(track)) {
            lines.push(`      <trkpt lat="${lat}" lon="${lng}"/>`)
        }
        lines.push('    </trkseg>')
        lines.push('  </trk>')
    }

    for (const point of points) {
        const [lng, lat] = point.coordinates
        lines.push(`  <wpt lat="${lat}" lon="${lng}">`)
        if (point.name) lines.push(`    <name>${escapeXml(point.name)}</name>`)
        if (point.description) lines.push(`    <desc>${escapeXml(point.description)}</desc>`)
        if (point.tags.length > 0) lines.push(`    <type>${escapeXml(point.tags[0])}</type>`)
        lines.push('  </wpt>')
    }

    lines.push('</gpx>')
    return lines.join('\n')
}

export function downloadGPX(gpx: string, filename = 'export.gpx') {
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
