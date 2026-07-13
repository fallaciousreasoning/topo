#!/bin/python3

"""
Fetches named landform features for New Zealand from OpenStreetMap and writes
them out as a GeoJSON FeatureCollection to public/data/landforms.json.

Covers several NZGB Gazetteer place types (see public/data/places.json) that
each have a well-established, specific OSM tag:

  cliff     -> natural=cliff way (LineString, edge of the cliff)
  reef      -> natural=reef node/way (Point/Polygon)
  island    -> place=island/islet node/way (Point/Polygon)
  bay       -> natural=bay node (Point)
  saddle    -> natural=saddle node (Point)
  pass      -> mountain_pass=yes node (Point)
  plateau   -> natural=plateau way (Polygon)

As with update_ridges.py/update_glaciers.py/update_valleys.py, any gazetteer
entry of one of these types with no matching OSM name is added as a Point
fallback feature.

The remaining gazetteer landform types here have no OSM tag specific enough to
query for (a "basin" or "point" isn't tagged as such in any consistent way) -
those are shipped directly as Point features straight from the gazetteer,
with no OSM lookup at all: basin, canyon, knoll, peninsula, isthmus, cape,
point.
"""

import json

from osm_features import (
    bbox_clause, fetch_overpass, first, simplify, length_km, polygon_size_km,
    load_fallback_points, SIMPLIFY_TOLERANCE_DEGREES,
)

CACHE_DIR = '.cache/landforms'
PLACES_PATH = './public/data/places.json'

# gazetteer type -> Overpass tag clause. Each clause's matches are tagged with
# this same type string in the output, so gazetteer- and OSM-sourced features
# for a given type are indistinguishable to the map layer.
OSM_TYPES = {
    'cliff': 'way["natural"="cliff"]["name"]',
    'reef': ['node["natural"="reef"]["name"]', 'way["natural"="reef"]["name"]'],
    'island': [
        'node["place"="island"]["name"]', 'way["place"="island"]["name"]',
        'node["place"="islet"]["name"]', 'way["place"="islet"]["name"]',
    ],
    'bay': 'node["natural"="bay"]["name"]',
    'saddle': 'node["natural"="saddle"]["name"]',
    'pass': 'node["mountain_pass"="yes"]["name"]',
    'plateau': 'way["natural"="plateau"]["name"]',
}

# Gazetteer types with no specific OSM tag - shipped as Point features
# straight from the gazetteer, no Overpass lookup.
GAZETTEER_ONLY_TYPES = {'basin', 'canyon', 'knoll', 'peninsula', 'isthmus', 'cape', 'point'}

bbox = bbox_clause()
QUERY = '[out:json][timeout:180];\n(\n' + '\n'.join(
    f'  {clause}({bbox});'
    for clauses in OSM_TYPES.values()
    for clause in ([clauses] if isinstance(clauses, str) else clauses)
) + '\n);\nout tags geom;'


def infer_type(tags):
    if tags.get('natural') == 'cliff':
        return 'cliff'
    if tags.get('natural') == 'reef':
        return 'reef'
    if tags.get('place') in ('island', 'islet'):
        return 'island'
    if tags.get('natural') == 'bay':
        return 'bay'
    if tags.get('natural') == 'saddle':
        return 'saddle'
    if tags.get('mountain_pass') == 'yes':
        return 'pass'
    if tags.get('natural') == 'plateau':
        return 'plateau'
    return None


def shared_properties(tags, output_type):
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
    return properties


def node_to_feature(element, output_type):
    return {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [round(element['lon'], 5), round(element['lat'], 5)],
        },
        'properties': shared_properties(element.get('tags', {}), output_type),
    }


def way_to_feature(element, output_type):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 2:
        return None

    raw_coordinates = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    is_closed = len(raw_coordinates) >= 4 and raw_coordinates[0] == raw_coordinates[-1]
    properties = shared_properties(element.get('tags', {}), output_type)

    if is_closed:
        ring = simplify(raw_coordinates, SIMPLIFY_TOLERANCE_DEGREES)
        if len(ring) < 4:
            return None
        properties['sizeKm'] = round(polygon_size_km(ring), 3)
        return {
            'type': 'Feature',
            'geometry': {'type': 'Polygon', 'coordinates': [ring]},
            'properties': properties,
        }

    coordinates = simplify(raw_coordinates, SIMPLIFY_TOLERANCE_DEGREES)
    properties['lengthKm'] = round(length_km(coordinates), 2)
    return {
        'type': 'Feature',
        'geometry': {'type': 'LineString', 'coordinates': coordinates},
        'properties': properties,
    }


def to_feature(element):
    output_type = infer_type(element.get('tags', {}))
    if not output_type:
        return None
    if element['type'] == 'node':
        return node_to_feature(element, output_type)
    if element['type'] == 'way':
        return way_to_feature(element, output_type)
    return None


def gazetteer_only_features():
    """Ship every gazetteer entry of a type with no OSM tag directly as a Point -
    reuses load_fallback_points' own-coordinate dedup logic by passing it no OSM
    features to match against, so every candidate is treated as unmatched."""
    features = []
    for gazetteer_type in sorted(GAZETTEER_ONLY_TYPES):
        points = load_fallback_points([], PLACES_PATH, {gazetteer_type})
        features.extend(points)
        print(f'  {len(points)} gazetteer "{gazetteer_type}" points (no OSM tag for this type)')
    return features


def download_landforms():
    print('Fetching landform features from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM features')

    fallback_features = []
    for gazetteer_type in sorted(OSM_TYPES.keys()):
        type_features = [f for f in features if f['properties']['type'] == gazetteer_type]
        points = load_fallback_points(type_features, PLACES_PATH, {gazetteer_type})
        fallback_features.extend(points)
        print(f'  {len(points)} gazetteer "{gazetteer_type}" entries with no matching OSM feature, added as points')

    gazetteer_features = gazetteer_only_features()

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features + gazetteer_features,
    }

    out_path = './public/data/landforms.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_landforms()
