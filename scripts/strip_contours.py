#!/usr/bin/env python3
"""
Strips vector source-layers (by default just `contours`) out of a LINZ
topographic mbtiles export and writes the result to a new .mbtiles file.

This app renders its own contours client-side from a DEM (see
src/layers/demSource.ts), so the `contours` layer baked into the LINZ vector
export is dead weight - stripping it cuts the file size noticeably without
changing anything the map actually shows.

Usage:
    python3 scripts/strip_contours.py <input.mbtiles> <output.mbtiles> [--layer contours]

Requires: pip install mapbox-vector-tile
"""

import argparse
import gzip
import json
import multiprocessing
import os
import sqlite3
import time

import mapbox_vector_tile

BATCH_SIZE = 2000


def strip_layers(data: bytes, layers_to_strip: set) -> bytes | None:
    """Remove the given source-layers from a (possibly gzipped) MVT tile.

    Returns the original bytes unchanged if none of the layers are present,
    or None if stripping them leaves the tile with no layers at all.
    """
    is_gzipped = data[:2] == b'\x1f\x8b'
    raw = gzip.decompress(data) if is_gzipped else data

    tile = mapbox_vector_tile.decode(raw)
    if not any(layer in tile for layer in layers_to_strip):
        return data

    for layer in layers_to_strip:
        tile.pop(layer, None)

    if not tile:
        return None

    formatted = [dict(value, name=name) for name, value in tile.items()]
    encoded = mapbox_vector_tile.encode(formatted)
    return gzip.compress(encoded, 6) if is_gzipped else encoded


def _worker(task):
    z, x, y, data, layers = task
    return z, x, y, strip_layers(data, layers)


def strip_metadata_layers(value: str, layers_to_strip: set) -> str:
    """Drop the stripped layers from the `json` metadata's vector_layers list."""
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value

    vector_layers = parsed.get('vector_layers')
    if not vector_layers:
        return value

    parsed['vector_layers'] = [l for l in vector_layers if l.get('id') not in layers_to_strip]
    return json.dumps(parsed)


def create_output_db(path: str) -> sqlite3.Connection:
    if os.path.exists(path):
        os.remove(path)

    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE metadata (name text, value text);
        CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
        CREATE UNIQUE INDEX name on metadata (name);
        CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);
    """)
    return conn


def strip_contours(input_path: str, output_path: str, layers_to_strip: set):
    src = sqlite3.connect(input_path)
    src_cur = src.cursor()

    dst = create_output_db(output_path)
    dst_cur = dst.cursor()

    src_cur.execute('SELECT name, value FROM metadata')
    for name, value in src_cur.fetchall():
        if name == 'json':
            value = strip_metadata_layers(value, layers_to_strip)
        dst_cur.execute('INSERT INTO metadata (name, value) VALUES (?, ?)', (name, value))
    dst.commit()

    src_cur.execute('SELECT count(*) FROM tiles')
    total = src_cur.fetchone()[0]
    print(f'Stripping [{", ".join(sorted(layers_to_strip))}] from {total} tiles...')

    src_cur.execute('SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles')

    done = 0
    dropped = 0
    start = time.time()
    with multiprocessing.Pool() as pool:
        while True:
            batch = src_cur.fetchmany(BATCH_SIZE)
            if not batch:
                break

            tasks = [(z, x, y, data, layers_to_strip) for z, x, y, data in batch]
            for z, x, y, new_data in pool.imap_unordered(_worker, tasks, chunksize=32):
                if new_data is None:
                    dropped += 1
                    continue
                dst_cur.execute(
                    'INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)',
                    (z, x, y, new_data),
                )
            dst.commit()

            done += len(batch)
            elapsed = time.time() - start
            rate = done / elapsed if elapsed else 0
            eta_min = (total - done) / rate / 60 if rate else 0
            print(f'  {done}/{total} ({done / total * 100:.1f}%) - {rate:.0f} tiles/s - ETA {eta_min:.1f}m', end='\r')

    print()
    dst.close()
    src.close()

    in_size = os.path.getsize(input_path)
    out_size = os.path.getsize(output_path)
    print(f'Dropped {dropped} now-empty tiles.')
    print(f'Done. {input_path} ({in_size / 1e6:.0f} MB) -> {output_path} ({out_size / 1e6:.0f} MB)')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('input', help='Source .mbtiles file')
    parser.add_argument('output', help='Destination .mbtiles file to write (overwritten if it exists)')
    parser.add_argument('--layer', action='append', dest='layers',
                         help='Vector source-layer to strip (repeatable). Defaults to "contours".')
    args = parser.parse_args()

    layers_to_strip = set(args.layers) if args.layers else {'contours'}
    strip_contours(args.input, args.output, layers_to_strip)


if __name__ == '__main__':
    main()
