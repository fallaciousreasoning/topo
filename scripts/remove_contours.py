from mbtiles_processor import Coord, process
import zlib
import os
import zlib
import subprocess
import mapbox_vector_tile
import json

def parse_tile(format, coord: Coord, data: bytes):
    folder = os.path.join('./out/topo', str(coord.z), str(coord.x))
    os.makedirs(folder, exist_ok=True)

    file_path = os.path.join(folder, f'{coord.y}.pbf')
    file_path_gz = file_path + '.gz'
    with open(file_path_gz, 'wb') as f:
        f.write(data)

    subprocess.run(['gzip', '-f', '-d', file_path_gz])

    strip_contours(file_path, coord)

def strip_contours(path, coord):
    folder = os.path.join('./out/topo-stripped', str(coord.z), str(coord.x))
    os.makedirs(folder, exist_ok=True)

    out_path = os.path.join(folder, f'{coord.y}.pbf')
    with open(path, 'rb') as f:
        tile = mapbox_vector_tile.decode(f.read())

        # Life would be too easy if this format round tripped - dict is
        # converted to a list with a name property for the key.
        formatted = []
        for key, value in tile.items():
            # In future we probably want to be a bit more surgical - it'd be
            # nice to keep peaks
            if key == 'contours': continue

            value.update({'name': key})
            formatted.append(value)

        with open(out_path, 'wb') as out_f:
            result = mapbox_vector_tile.encode(formatted)
            out_f.write(result)

        # subprocess.run(['gzip', '--keep', '--force', out_path])


if __name__ == '__main__':
    # strip_contours('./out/topo/13/8026/2991.pbf')
    process('/home/jay/Downloads/topographic.mbtiles', parse_tile)
