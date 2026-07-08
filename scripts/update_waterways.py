#!/bin/python3

"""
Fetches named rivers and streams for New Zealand from OpenStreetMap
(waterway=river, waterway=stream) via the Overpass API, and writes them out as
a GeoJSON FeatureCollection to public/data/waterways.json.

Streams vastly outnumber rivers in NZ (~23k named stream ways vs ~3.5k named
rivers) - nearly every small catchment creek has a name. Both are included
here, tagged with properties.category ('river' or 'stream') so the map layer
can gate streams behind a much higher minzoom than rivers, rather than
showing every minor creek name at the same zoom as major rivers.
"""

import json

from osm_features import bbox_clause, fetch_overpass, simplify, length_km, SIMPLIFY_TOLERANCE_DEGREES

CACHE_DIR = '.cache/waterways'

RIVER_QUERY = f"""
[out:json][timeout:180];
(
  way["waterway"="river"]["name"]({bbox_clause()});
);
out tags geom;
""".strip()

STREAM_QUERY = f"""
[out:json][timeout:400];
(
  way["waterway"="stream"]["name"]({bbox_clause()});
);
out tags geom;
""".strip()


def to_feature(element, category):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 2:
        return None

    tags = element.get('tags', {})
    raw_coordinates = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    coordinates = simplify(raw_coordinates, SIMPLIFY_TOLERANCE_DEGREES)
    if len(coordinates) < 2:
        return None

    properties = {
        'name': tags['name'],
        'category': category,
        'source': 'osm',
        'lengthKm': round(length_km(coordinates), 1),
    }
    if tags.get('name:mi'):
        properties['nameMi'] = tags['name:mi']
    if tags.get('wikidata'):
        properties['wikidata'] = tags['wikidata']

    return {
        'type': 'Feature',
        'geometry': {
            'type': 'LineString',
            'coordinates': coordinates,
        },
        'properties': properties,
    }


def download_waterways():
    print('Fetching rivers from Overpass...')
    river_data = fetch_overpass(RIVER_QUERY, CACHE_DIR, timeout=200)
    river_elements = river_data['elements']
    print(f'  {len(river_elements)} river ways returned')

    print('Fetching streams from Overpass (this is a much bigger query, may take a while)...')
    stream_data = fetch_overpass(STREAM_QUERY, CACHE_DIR, timeout=450)
    stream_elements = stream_data['elements']
    print(f'  {len(stream_elements)} stream ways returned')

    features = (
        [f for f in (to_feature(e, 'river') for e in river_elements) if f]
        + [f for f in (to_feature(e, 'stream') for e in stream_elements) if f]
    )
    print(f'  {len(features)} usable features total')

    geojson = {
        'type': 'FeatureCollection',
        'features': features,
    }

    out_path = './public/data/waterways.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(features)} features to {out_path}')


if __name__ == '__main__':
    download_waterways()
