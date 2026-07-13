#!/bin/python3

"""
Fetches named water and geothermal features for New Zealand from OpenStreetMap
and writes them out as a GeoJSON FeatureCollection to
public/data/waterFeatures.json.

Covers several NZGB Gazetteer place types (see public/data/places.json) that
each have a well-established, specific OSM tag:

  lake       -> natural=water + water=lake way or relation (Polygon)
  wetland    -> natural=wetland way or relation (Polygon)
  waterfall  -> waterway=waterfall node (Point)
  spring     -> natural=spring node (Point)
  hot_spring -> natural=hot_spring node (Point)

As with update_ridges.py/update_glaciers.py/update_valleys.py, any gazetteer
entry of one of these types with no matching OSM name is added as a Point
fallback feature.

Many of the largest, best-known lakes (Wānaka, Hāwea, Wakatipu, ...) are
mapped as multipolygon relations rather than a single way - their shorelines
are too complex/long for one way. Those relations' "outer" member ways are
stitched back into a real ring (see osm_features.largest_outer_ring), the
same approach update_glaciers.py uses. If a relation's members don't assemble
into a usable ring at all, it falls back to a Point at the relation's
bounding-box centre instead.

`pool` and `ford` have no OSM tag specific enough to query for, so they're
shipped directly as Point features straight from the gazetteer, no OSM lookup.
"""

import json

from osm_features import (
    bbox_clause, fetch_overpass, first, simplify, polygon_size_km,
    load_fallback_points, SIMPLIFY_TOLERANCE_DEGREES,
    largest_outer_ring, relation_bounds_point,
)

CACHE_DIR = '.cache/water_features'
PLACES_PATH = './public/data/places.json'

OSM_TYPES = {
    'lake': 'way["natural"="water"]["water"="lake"]["name"]',
    'wetland': 'way["natural"="wetland"]["name"]',
    'waterfall': 'node["waterway"="waterfall"]["name"]',
    'spring': 'node["natural"="spring"]["name"]',
    'hot_spring': 'node["natural"="hot_spring"]["name"]',
}

# Only the polygon types (lake/wetland) can plausibly be mapped as a
# multipolygon relation - waterfall/spring/hot_spring are always plain nodes.
RELATION_TYPES = {
    'lake': 'relation["natural"="water"]["water"="lake"]["name"]',
    'wetland': 'relation["natural"="wetland"]["name"]',
}

GAZETTEER_ONLY_TYPES = {'pool', 'ford'}

bbox = bbox_clause()
# The relations matched here are fetched a second time via `way(r.main)` to
# pull in every member way's full geometry (Overpass doesn't inline relation
# members' coordinates otherwise) - those come back as bare, untagged "way"
# elements alongside the real standalone lake/wetland/... ways. Same two-pass
# pattern as update_glaciers.py's QUERY.
QUERY = (
    '[out:json][timeout:180];\n(\n'
    + '\n'.join(f'  {clause}({bbox});' for clause in OSM_TYPES.values())
    + '\n'
    + '\n'.join(f'  {clause}({bbox});' for clause in RELATION_TYPES.values())
    + '\n)->.main;\n(.main;);\nout body geom;\nway(r.main);\nout geom;'
)


def infer_type(tags):
    if tags.get('natural') == 'water' and tags.get('water') == 'lake':
        return 'lake'
    if tags.get('natural') == 'wetland':
        return 'wetland'
    if tags.get('waterway') == 'waterfall':
        return 'waterfall'
    if tags.get('natural') == 'spring':
        return 'spring'
    if tags.get('natural') == 'hot_spring':
        return 'hot_spring'
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


def ring_to_polygon_feature(ring, output_type, tags):
    ring = simplify(ring, SIMPLIFY_TOLERANCE_DEGREES)
    if len(ring) < 4:
        return None

    properties = shared_properties(tags, output_type)
    properties['sizeKm'] = round(polygon_size_km(ring), 3)

    return {
        'type': 'Feature',
        'geometry': {'type': 'Polygon', 'coordinates': [ring]},
        'properties': properties,
    }


def way_to_feature(element, output_type):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 3:
        return None

    ring = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    return ring_to_polygon_feature(ring, output_type, element.get('tags', {}))


def relation_to_feature(element, output_type, ways_by_id):
    """Try to stitch the relation's "outer" member ways into a real ring;
    falls back to a Point at the relation's bounding-box centre if that
    doesn't produce a usable ring (Overpass returned an incomplete member
    set, inconsistent roles, etc.)."""
    ring = largest_outer_ring(element, ways_by_id)
    if ring:
        feature = ring_to_polygon_feature(list(ring), output_type, element.get('tags', {}))
        if feature:
            return feature

    point = relation_bounds_point(element)
    if not point:
        return None

    return {
        'type': 'Feature',
        'geometry': {'type': 'Point', 'coordinates': point},
        'properties': shared_properties(element.get('tags', {}), output_type),
    }


def to_feature(element, ways_by_id):
    output_type = infer_type(element.get('tags', {}))
    if not output_type:
        return None
    if element['type'] == 'node':
        return node_to_feature(element, output_type)
    if element['type'] == 'way':
        return way_to_feature(element, output_type)
    if element['type'] == 'relation':
        return relation_to_feature(element, output_type, ways_by_id)
    return None


def gazetteer_only_features():
    features = []
    for gazetteer_type in sorted(GAZETTEER_ONLY_TYPES):
        points = load_fallback_points([], PLACES_PATH, {gazetteer_type})
        features.extend(points)
        print(f'  {len(points)} gazetteer "{gazetteer_type}" points (no OSM tag for this type)')
    return features


def download_water_features():
    print('Fetching water/geothermal features from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    # Every way with geometry - both standalone lake/wetland ways and the
    # bare member ways fetched purely to assemble a relation's ring (see
    # largest_outer_ring) - keyed by id for relation_to_feature to look up.
    ways_by_id = {
        e['id']: [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in e['geometry']]
        for e in elements
        if e['type'] == 'way' and e.get('geometry')
    }

    results = [(e, to_feature(e, ways_by_id)) for e in elements]
    features = [f for _, f in results if f]
    relation_points = sum(1 for e, f in results if f and e['type'] == 'relation' and f['geometry']['type'] == 'Point')
    print(f'  {len(features)} usable OSM features ({relation_points} relations reduced to a point)')

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

    out_path = './public/data/waterFeatures.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_water_features()
