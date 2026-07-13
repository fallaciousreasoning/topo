#!/bin/python3

"""
Fetches named geological point features for New Zealand from OpenStreetMap
and writes them out as a GeoJSON FeatureCollection to
public/data/geologicalFeatures.json.

Covers two NZGB Gazetteer place types (see public/data/places.json) with a
well-established, specific OSM tag:

  volcano       -> natural=volcano node (Point)
  cave_entrance -> natural=cave_entrance node (Point) - also covers the
                   gazetteer's "cave" type, which the gazetteer generally uses
                   for the same real-world feature as "cave_entrance"

As with update_ridges.py/update_glaciers.py/update_valleys.py, any gazetteer
entry with no matching OSM name is added as a Point fallback feature.

`crater` has no OSM tag specific enough to query for, so it's shipped directly
as Point features straight from the gazetteer, no OSM lookup.
"""

import json

from osm_features import bbox_clause, fetch_overpass, first, load_fallback_points

CACHE_DIR = '.cache/geological_features'
PLACES_PATH = './public/data/places.json'

OSM_TYPES = {
    'volcano': 'node["natural"="volcano"]["name"]',
    'cave_entrance': 'node["natural"="cave_entrance"]["name"]',
}

# Gazetteer types that fall back to a Point when no OSM feature of the given
# OSM_TYPES key matches by name - "cave" folds into cave_entrance's matching,
# since the gazetteer uses both names for the same kind of feature.
FALLBACK_GAZETTEER_TYPES = {
    'volcano': {'volcano'},
    'cave_entrance': {'cave_entrance', 'cave'},
}

GAZETTEER_ONLY_TYPES = {'crater'}

bbox = bbox_clause()
QUERY = '[out:json][timeout:180];\n(\n' + '\n'.join(
    f'  {clause}({bbox});' for clause in OSM_TYPES.values()
) + '\n);\nout tags geom;'


def infer_type(tags):
    if tags.get('natural') == 'volcano':
        return 'volcano'
    if tags.get('natural') == 'cave_entrance':
        return 'cave_entrance'
    return None


def to_feature(element):
    output_type = infer_type(element.get('tags', {}))
    if not output_type or element['type'] != 'node':
        return None

    tags = element.get('tags', {})
    properties = {
        'name': tags['name'],
        'type': output_type,
        'source': 'osm',
    }
    if tags.get('name:mi'):
        properties['nameMi'] = tags['name:mi']
    if tags.get('ref:linz:place_id'):
        properties['linzPlaceId'] = first(tags['ref:linz:place_id'])
    if tags.get('wikidata'):
        properties['wikidata'] = tags['wikidata']

    return {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [round(element['lon'], 5), round(element['lat'], 5)],
        },
        'properties': properties,
    }


def gazetteer_only_features():
    features = []
    for gazetteer_type in sorted(GAZETTEER_ONLY_TYPES):
        points = load_fallback_points([], PLACES_PATH, {gazetteer_type})
        features.extend(points)
        print(f'  {len(points)} gazetteer "{gazetteer_type}" points (no OSM tag for this type)')
    return features


def download_geological_features():
    print('Fetching geological point features from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM features')

    fallback_features = []
    for output_type, gazetteer_types in FALLBACK_GAZETTEER_TYPES.items():
        type_features = [f for f in features if f['properties']['type'] == output_type]
        points = load_fallback_points(type_features, PLACES_PATH, gazetteer_types)
        fallback_features.extend(points)
        print(f'  {len(points)} gazetteer {sorted(gazetteer_types)} entries with no matching OSM feature, added as points')

    gazetteer_features = gazetteer_only_features()

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features + gazetteer_features,
    }

    out_path = './public/data/geologicalFeatures.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_geological_features()
