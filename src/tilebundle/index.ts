/**
 * Tilebundle: a flat file format for concatenating tile pyramid images.
 *
 * Record layout (appended sequentially, bottom-of-pyramid first):
 *
 *   [tile data: <len> bytes][z: u8][x: u32 LE][y: u32 LE][len: u32 LE][magic: u32 LE]
 *   |<------- tile data -------->|<-------------- TRAILER_SIZE = 17 bytes ------------>|
 *
 * The top-of-pyramid tiles sit at the end of the file, so extraction can proceed
 * by reading the trailer, writing the tile file, and truncating — without seeking
 * forward or maintaining an index.
 *
 * Magic bytes: "TPYR" = 0x52595054 (little-endian)
 */

const MAGIC = 0x52595054;

/** Fixed byte length of the trailer appended after each tile's data. */
export const TRAILER_SIZE = 17; // z(1) + x(4) + y(4) + len(4) + magic(4)

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

export interface DecodedTrailer extends TileCoord {
    /** Byte length of the tile data that precedes this trailer. */
    len: number;
}

/**
 * Encode one tile into the bytes to append to a bundle file.
 * Write tiles bottom-of-pyramid first so higher zoom levels land at the end.
 */
export function encodeTile(data: Uint8Array, z: number, x: number, y: number): Uint8Array {
    const record = new Uint8Array(data.length + TRAILER_SIZE);
    record.set(data);
    const view = new DataView(record.buffer, record.byteOffset + data.length, TRAILER_SIZE);
    view.setUint8(0, z);
    view.setUint32(1, x, true);
    view.setUint32(5, y, true);
    view.setUint32(9, data.length, true);
    view.setUint32(13, MAGIC, true);
    return record;
}

/**
 * Parse a TRAILER_SIZE-byte buffer into its fields. Throws on magic mismatch.
 */
export function decodeTrailer(bytes: Uint8Array): DecodedTrailer {
    if (bytes.length < TRAILER_SIZE) {
        throw new Error(`Trailer must be ${TRAILER_SIZE} bytes, got ${bytes.length}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, TRAILER_SIZE);
    const magic = view.getUint32(13, true);
    if (magic !== MAGIC) {
        throw new Error(`Invalid magic 0x${magic.toString(16).padStart(8, '0')} (expected 0x${MAGIC.toString(16)})`);
    }
    return {
        z: view.getUint8(0),
        x: view.getUint32(1, true),
        y: view.getUint32(5, true),
        len: view.getUint32(9, true),
    };
}

/**
 * Decode the last tile record from an in-memory bundle.
 * Returns null for an empty bundle; throws on corruption.
 *
 * `nextSize` is the byte length to truncate the bundle to after extracting this tile,
 * suitable for passing directly to `FileSystemWritableFileStream.truncate()`.
 */
export function decodeLastTile(bundle: Uint8Array): (TileRecord & { nextSize: number }) | null {
    if (bundle.length === 0) return null;
    if (bundle.length < TRAILER_SIZE) {
        throw new Error(`Bundle too small (${bundle.length} B) to hold a valid record`);
    }

    const trailerOffset = bundle.length - TRAILER_SIZE;
    const { z, x, y, len } = decodeTrailer(bundle.subarray(trailerOffset));

    const dataOffset = trailerOffset - len;
    if (dataOffset < 0) {
        throw new Error(`Record claims length ${len} but only ${trailerOffset} bytes precede the trailer`);
    }

    return {
        z, x, y,
        data: bundle.slice(dataOffset, trailerOffset),
        nextSize: dataOffset,
    };
}

/**
 * Iterate all tiles in a bundle from last to first (top-of-pyramid first).
 * Yields tiles in the correct order for in-place extraction with truncation.
 */
export function* iterateTiles(bundle: Uint8Array): Generator<TileRecord & { nextSize: number }> {
    let remaining = bundle;
    while (remaining.length > 0) {
        const tile = decodeLastTile(remaining);
        if (!tile) break;
        yield tile;
        remaining = bundle.subarray(0, tile.nextSize);
    }
}
