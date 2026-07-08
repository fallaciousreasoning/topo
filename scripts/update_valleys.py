#!/bin/python3

"""
Fetches named valleys for New Zealand from OpenStreetMap (natural=valley) via
the Overpass API, and writes them out as a GeoJSON FeatureCollection to
public/data/valleys.json.

Valleys are mapped in OSM either as a single node (most of them - a Point) or
as a way tracing the valley floor (a LineString, labelled the same way ridges
are). Any gazetteer "valley" entry with no matching OSM feature is added as a
Point fallback, same approach as update_ridges.py.
"""

import json

from osm_features import (
    bbox_clause, fetch_overpass, first, simplify, length_km,
    load_fallback_points, SIMPLIFY_TOLERANCE_DEGREES,
)

CACHE_DIR = '.cache/valleys'
PLACES_PATH = './public/data/places.json'
FALLBACK_GAZETTEER_TYPES = {'valley'}

QUERY = f"""
[out:json][timeout:180];
(
  node["natural"="valley"]["name"]({bbox_clause()});
  way["natural"="valley"]["name"]({bbox_clause()});
);
out tags geom;
""".strip()


def shared_properties(tags):
    properties = {
        'name': tags['name'],
        'type': 'valley',
        'source': 'osm',
    }
    if tags.get('name:mi'):
        properties['nameMi'] = tags['name:mi']
    if tags.get('ref:linz:place_id'):
        properties['linzPlaceId'] = first(tags['ref:linz:place_id'])
    if tags.get('wikidata'):
        properties['wikidata'] = tags['wikidata']
    return properties


def node_to_feature(element):
    return {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [round(element['lon'], 5), round(element['lat'], 5)],
        },
        'properties': shared_properties(element.get('tags', {})),
    }


def way_to_feature(element):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 2:
        return None

    raw_coordinates = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    coordinates = simplify(raw_coordinates, SIMPLIFY_TOLERANCE_DEGREES)

    properties = shared_properties(element.get('tags', {}))
    properties['lengthKm'] = round(length_km(coordinates), 1)

    return {
        'type': 'Feature',
        'geometry': {
            'type': 'LineString',
            'coordinates': coordinates,
        },
        'properties': properties,
    }


def to_feature(element):
    if element['type'] == 'node':
        return node_to_feature(element)
    if element['type'] == 'way':
        return way_to_feature(element)
    return None


def download_valleys():
    print('Fetching valleys from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM features')

    fallback_features = load_fallback_points(features, PLACES_PATH, FALLBACK_GAZETTEER_TYPES)
    print(f'  {len(fallback_features)} gazetteer valleys with no matching OSM feature, added as points')

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features,
    }

    out_path = './public/data/valleys.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_valleys()
