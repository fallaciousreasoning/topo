#!/bin/python3

"""
Fetches NZ Land District boundary polygons (LINZ Data Service layer 50785,
"NZ Land Districts") and writes them out as a GeoJSON FeatureCollection to
public/data/regions.json.

The 12 land districts (North Auckland, South Auckland, Gisborne, Hawkes Bay,
Taranaki, Wellington, Nelson, Marlborough, Westland, Canterbury, Otago,
Southland) are an old property-registration division, not the modern 16
regional council areas - but they're the broadest polygon layer confirmed
available via this repo's existing LDS key, and they tile the *entire*
country with no gaps (confirmed directly: a point in the middle of
Aoraki/Mount Cook National Park, nowhere near any named settlement, still
resolves to "Canterbury" here).

Used by src/search/regions.ts's findContainingRegion to annotate a place
with the region it falls within (see SearchSection.tsx/LocationSection.tsx).
Deliberately *not* wired into src/search/places.ts's getPlaces()/closestPlace
at all - a whole land district is far too coarse a shape to be a search
result, a long-press match, or a selected-shape outline in its own right.

Only 12 features, so simplification matters less than it would for a much
larger dataset, but each is a whole land district's worth of coastline -
simplified at a coarser tolerance than a small-area dataset would need,
since "which land district" doesn't need anywhere near that precision.
"""

import json

from linz_features import fetch_wfs
from osm_features import simplify

CACHE_DIR = '.cache/regions'
LAYER_ID = 50785

SIMPLIFY_TOLERANCE_DEGREES = 0.002


def simplify_ring(ring):
    points = [tuple(p) for p in ring]
    simplified = simplify(points, SIMPLIFY_TOLERANCE_DEGREES)
    if simplified[0] != simplified[-1]:
        simplified = simplified + [simplified[0]]
    return [[round(x, 5), round(y, 5)] for x, y in simplified]


def to_feature(feature):
    name = feature['properties'].get('name')
    if not name:
        return None

    geometry = feature['geometry']
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    simplified_polygons = [[simplify_ring(ring) for ring in polygon] for polygon in polygons]

    return {
        'type': 'Feature',
        'geometry': {
            'type': 'MultiPolygon',
            'coordinates': simplified_polygons,
        },
        'properties': {
            'name': name,
            'type': 'region',
        },
    }


def download_regions():
    print('Fetching NZ Land Districts from LINZ Data Service...')
    data = fetch_wfs(LAYER_ID, CACHE_DIR)
    features = data['features']
    print(f'  {len(features)} land districts returned')

    output_features = [f for f in (to_feature(f) for f in features) if f]

    geojson = {
        'type': 'FeatureCollection',
        'features': output_features,
    }

    out_path = './public/data/regions.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(output_features)} features to {out_path}')


if __name__ == '__main__':
    download_regions()
