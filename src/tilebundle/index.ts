/**
 * Tilebundle: a flat file format for concatenating tile pyramid images.
 *
 * Record layout (appended sequentially, lowest zoom first):
 *
 *   [magic: u32 LE][z: u8][x: u32 LE][y: u32 LE][len: u32 LE][tile data: <len> bytes]
 *   |<-------------- HEADER_SIZE = 17 bytes ------------>|<------- tile data -------->|
 *
 * The header precedes each tile's data (rather than trailing it), so a reader can parse
 * it the instant it arrives over the wire, know exactly how many bytes of tile data
 * follow, and extract tiles one at a time while the rest of the file is still
 * downloading — without ever buffering the whole bundle in memory.
 *
 * Tiles are written lowest-zoom-first, so an interrupted download leaves a usable
 * (if coarse) map rather than a scatter of high-zoom fragments with no overview.
 *
 * Magic bytes: "TPYR" = 0x52595054 (little-endian)
 */

const MAGIC = 0x52595054;

/** Fixed byte length of the header preceding each tile's data. */
export const HEADER_SIZE = 17; // magic(4) + z(1) + x(4) + y(4) + len(4)

export interface TileCoord {
    z: number;
    x: number;
    y: number;
}

/** Web Mercator: longitude → tile x at zoom z */
export function tileX(lng: number, z: number): number {
    return Math.floor((lng + 180) / 360 * (1 << z));
}

/** Web Mercator: latitude → tile y at zoom z (y increases southward) */
export function tileY(lat: number, z: number): number {
    const r = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z));
}

export interface TileRecord extends TileCoord {
    data: Uint8Array;
}

export interface DecodedHeader extends TileCoord {
    /** Byte length of the tile data that follows this header. */
    len: number;
}

/** Encode one tile into the bytes to append to a bundle file. */
export function encodeTile(data: Uint8Array, z: number, x: number, y: number): Uint8Array {
    const record = new Uint8Array(HEADER_SIZE + data.length);
    const view = new DataView(record.buffer, record.byteOffset, HEADER_SIZE);
    view.setUint32(0, MAGIC, true);
    view.setUint8(4, z);
    view.setUint32(5, x, true);
    view.setUint32(9, y, true);
    view.setUint32(13, data.length, true);
    record.set(data, HEADER_SIZE);
    return record;
}

/**
 * Parse a HEADER_SIZE-byte buffer into its fields. Throws on magic mismatch.
 */
export function decodeHeader(bytes: Uint8Array): DecodedHeader {
    if (bytes.length < HEADER_SIZE) {
        throw new Error(`Header must be ${HEADER_SIZE} bytes, got ${bytes.length}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, HEADER_SIZE);
    const magic = view.getUint32(0, true);
    if (magic !== MAGIC) {
        throw new Error(`Invalid magic 0x${magic.toString(16).padStart(8, '0')} (expected 0x${MAGIC.toString(16)})`);
    }
    return {
        z: view.getUint8(4),
        x: view.getUint32(5, true),
        y: view.getUint32(9, true),
        len: view.getUint32(13, true),
    };
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    if (a.length === 0) return b;
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}

/**
 * Incrementally parse tile records from a byte stream as chunks arrive, yielding each
 * tile as soon as its data is fully received. Never holds more than one partially-read
 * record in memory, regardless of how large the overall bundle is.
 */
export async function* parseTileStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<TileRecord> {
    let buffer = new Uint8Array(0);

    while (true) {
        const { done, value } = await reader.read();
        if (value) buffer = concat(buffer, value);

        while (buffer.length >= HEADER_SIZE) {
            const header = decodeHeader(buffer);
            const recordSize = HEADER_SIZE + header.len;
            if (buffer.length < recordSize) break;

            yield { z: header.z, x: header.x, y: header.y, data: buffer.subarray(HEADER_SIZE, recordSize) };
            buffer = buffer.subarray(recordSize);
        }

        if (done) {
            if (buffer.length > 0) {
                throw new Error(`Bundle stream ended with ${buffer.length} trailing bytes (truncated?)`);
            }
            return;
        }
    }
}
