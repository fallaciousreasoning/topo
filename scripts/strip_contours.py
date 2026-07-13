#!/usr/bin/env python3
"""
Strips vector data this app no longer needs from a LINZ topographic mbtiles
export, and writes the result to a new .mbtiles file:

- The whole `contours` source-layer is dropped - this app renders its own
  contours client-side from a DEM (see src/layers/demSource.ts), so LINZ's
  copy baked into the vector export is dead weight.
- Individual point features are dropped from the `pois` and `place_labels`
  layers where they duplicate a type this app now renders itself, in its own
  overlays sourced from OpenStreetMap (see src/layers/landforms.tsx,
  waterFeatures.tsx, geologicalFeatures.tsx) - springs, cave entrances,
  waterfalls, fords, wetlands, bays, islands, lakes, peninsulas. Scoped
  tightly to those two layers, which exist purely to place a point label/icon
  - never touches the shape/fill layers (water_polygons, land, etc), which
  render regardless of name and stay untouched.

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

# Individual features dropped from otherwise-kept layers, matched by
# (field, value) pairs - a feature is dropped if any pair matches its
# properties. Both layers are pure point label/icon layers (see module
# docstring), so removing a feature here removes it from every style rule
# that might reference it, generic "has name" fallback markers included.
FEATURE_FILTERS = {
    'pois': {
        ('natural', 'spring'),
        ('natural', 'cave_entrance'),
        ('waterway', 'waterfall'),
        ('waterway', 'ford'),
        ('wetland', 'swamp'),
    },
    'place_labels': {
        ('water', 'bay'),
        ('place', 'island'),
        ('place', 'lake'),
        ('natural', 'peninsula'),
    },
}


def matches_any(properties: dict, rules: set) -> bool:
    return any(properties.get(field) == value for field, value in rules)


def strip_layers(data: bytes, layers_to_drop: set, feature_filters: dict) -> tuple[bytes | None, int]:
    """Remove the given source-layers, and any features matching
    feature_filters, from a (possibly gzipped) MVT tile.

    Returns (data, 0) unchanged if nothing in the tile is affected, or
    (None, 0) if stripping leaves the tile with no layers at all.
    """
    is_gzipped = data[:2] == b'\x1f\x8b'
    raw = gzip.decompress(data) if is_gzipped else data

    tile = mapbox_vector_tile.decode(raw)
    touches_drop = any(layer in tile for layer in layers_to_drop)
    touches_filter = any(layer in tile for layer in feature_filters)
    if not touches_drop and not touches_filter:
        return data, 0

    for layer in layers_to_drop:
        tile.pop(layer, None)

    filtered_count = 0
    for layer, rules in feature_filters.items():
        if layer not in tile:
            continue
        features = tile[layer]['features']
        kept = [f for f in features if not matches_any(f['properties'], rules)]
        filtered_count += len(features) - len(kept)
        if kept:
            tile[layer] = dict(tile[layer], features=kept)
        else:
            tile.pop(layer, None)

    if not tile:
        return None, filtered_count

    formatted = [dict(value, name=name) for name, value in tile.items()]
    encoded = mapbox_vector_tile.encode(formatted)
    result = gzip.compress(encoded, 6) if is_gzipped else encoded
    return result, filtered_count


def _worker(task):
    z, x, y, data, layers_to_drop, feature_filters = task
    new_data, filtered_count = strip_layers(data, layers_to_drop, feature_filters)
    return z, x, y, new_data, filtered_count


def strip_metadata_layers(value: str, layers_to_drop: set) -> str:
    """Drop fully-removed layers from the `json` metadata's vector_layers list.
    Layers only touched by feature_filters still exist, so keep their entry."""
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value

    vector_layers = parsed.get('vector_layers')
    if not vector_layers:
        return value

    parsed['vector_layers'] = [l for l in vector_layers if l.get('id') not in layers_to_drop]
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


def strip_mbtiles(input_path: str, output_path: str, layers_to_drop: set, feature_filters: dict):
    src = sqlite3.connect(input_path)
    src_cur = src.cursor()

    dst = create_output_db(output_path)
    dst_cur = dst.cursor()

    src_cur.execute('SELECT name, value FROM metadata')
    for name, value in src_cur.fetchall():
        if name == 'json':
            value = strip_metadata_layers(value, layers_to_drop)
        dst_cur.execute('INSERT INTO metadata (name, value) VALUES (?, ?)', (name, value))
    dst.commit()

    src_cur.execute('SELECT count(*) FROM tiles')
    total = src_cur.fetchone()[0]
    filter_desc = ', '.join(f'{layer}[{len(rules)} rules]' for layer, rules in feature_filters.items())
    print(f'Dropping layers [{", ".join(sorted(layers_to_drop))}], filtering [{filter_desc}] across {total} tiles...')

    src_cur.execute('SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles')

    done = 0
    dropped_tiles = 0
    filtered_features = 0
    start = time.time()
    with multiprocessing.Pool() as pool:
        while True:
            batch = src_cur.fetchmany(BATCH_SIZE)
            if not batch:
                break

            tasks = [(z, x, y, data, layers_to_drop, feature_filters) for z, x, y, data in batch]
            for z, x, y, new_data, filtered_count in pool.imap_unordered(_worker, tasks, chunksize=32):
                filtered_features += filtered_count
                if new_data is None:
                    dropped_tiles += 1
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
    print(f'Dropped {dropped_tiles} now-empty tiles, filtered {filtered_features} individual features.')
    print(f'Done. {input_path} ({in_size / 1e6:.0f} MB) -> {output_path} ({out_size / 1e6:.0f} MB)')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('input', help='Source .mbtiles file')
    parser.add_argument('output', help='Destination .mbtiles file to write (overwritten if it exists)')
    parser.add_argument('--layer', action='append', dest='layers',
                         help='Vector source-layer to drop entirely (repeatable). Defaults to "contours".')
    args = parser.parse_args()

    layers_to_drop = set(args.layers) if args.layers else {'contours'}
    strip_mbtiles(args.input, args.output, layers_to_drop, FEATURE_FILTERS)


if __name__ == '__main__':
    main()
