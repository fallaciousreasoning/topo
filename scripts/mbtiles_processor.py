#!/usr/bin/python3

import os
import sys
import sqlite3
import argparse

from typing import Callable

from collections import namedtuple

Coord = namedtuple('Coord', ['x', 'y', 'z'])

def get_tile_format(cursor: sqlite3.Cursor):
    cursor.execute("SELECT value FROM metadata WHERE name='format'")
    return cursor.fetchone()[0]


def process(db_name: str, process_row: Callable[[str, Coord, bytes], None], limit=None):
    connection = sqlite3.connect(db_name)
    cursor = connection.cursor()

    tile_format = get_tile_format(cursor)
    
    limit = '' if limit is None else f' LIMIT {limit}'
    cursor.execute(f'SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles ORDER BY zoom_level' + limit)
    for z, x, y, data in cursor:
        process_row(tile_format, Coord(x, y, z), data)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('database', type=str)
    parser.add_argument('--out', required=True, type=str)
    options = parser.parse_args()

    def dump_tile(format: str, coord: Coord, data: bytes):
        out_folder = os.path.join(options.out, str(coord.z), str(coord.x))
        os.makedirs(out_folder, exist_ok=True)
        
        with open(os.path.join(out_folder, f'{coord.y}.{format}'), 'wb') as f:
            f.write(data)

    process(options.database, dump_tile)
