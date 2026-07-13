#!/bin/python3

"""
Fetches named reserves, parks and other protected areas for New Zealand from
OpenStreetMap and writes them out as a GeoJSON FeatureCollection to
public/data/protectedAreas.json.

Unlike the other update_*.py scripts, this one covers a whole cluster of
NZGB Gazetteer place types at once - scenic reserve, recreation reserve,
historic site, government purpose reserve, forest, historic reserve,
scientific reserve, national park, conservation park, nature reserve, marine
reserve, wildlife management area, sanctuary area - rather than one type per
script. OSM's boundary=protected_area/leisure=nature_reserve tags don't carry
enough of a reliable subtype signal to map back onto NZ's specific Reserves
Act/Conservation Act classifications, so every OSM match is shipped as a
single unified "reserve" type; gazetteer-only fallback points keep their
original, more specific gazetteer type (e.g. "scenic reserve").

  reserve -> boundary=protected_area way, or leisure=nature_reserve way
             (Polygon)

As with update_ridges.py/update_glaciers.py/update_valleys.py, any gazetteer
entry of one of the covered types with no matching OSM name is added as a
Point fallback feature.
"""

import json

from osm_features import (
    bbox_clause, fetch_overpass, first, simplify, polygon_size_km,
    load_fallback_points, SIMPLIFY_TOLERANCE_DEGREES,
)

CACHE_DIR = '.cache/protected_areas'
PLACES_PATH = './public/data/places.json'

FALLBACK_GAZETTEER_TYPES = {
    'scenic reserve', 'recreation reserve', 'historic site',
    'government purpose reserve', 'forest', 'historic reserve',
    'scientific reserve', 'national park', 'conservation park',
    'nature reserve', 'marine reserve', 'wildlife management area',
    'sanctuary area',
}

bbox = bbox_clause()
QUERY = f"""
[out:json][timeout:180];
(
  way["boundary"="protected_area"]["name"]({bbox});
  way["leisure"="nature_reserve"]["name"]({bbox});
  relation["boundary"="protected_area"]["name"]({bbox});
  relation["leisure"="nature_reserve"]["name"]({bbox});
);
out tags geom;
""".strip()


def shared_properties(tags):
    properties = {
        'name': tags['name'],
        'type': 'reserve',
        'source': 'osm',
    }
    if tags.get('name:mi'):
        properties['nameMi'] = tags['name:mi']
    if tags.get('ref:linz:place_id'):
        properties['linzPlaceId'] = first(tags['ref:linz:place_id'])
    if tags.get('wikidata'):
        properties['wikidata'] = tags['wikidata']
    return properties


def relation_to_feature(element):
    """
    Most of the largest, best-known parks (Fiordland, Tongariro, Aoraki/Mount
    Cook, ...) are mapped as multipolygon relations, not simple ways. As with
    update_glaciers.py, these are reduced to a Point at the relation's
    bounding-box centre rather than reassembling the full ring set - good
    enough for a label anchor, much simpler than multipolygon assembly.
    """
    bounds = element.get('bounds')
    if not bounds:
        return None

    lon = round((bounds['minlon'] + bounds['maxlon']) / 2, 5)
    lat = round((bounds['minlat'] + bounds['maxlat']) / 2, 5)

    return {
        'type': 'Feature',
        'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
        'properties': shared_properties(element.get('tags', {})),
    }


def way_to_feature(element):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 3:
        return None

    ring = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    ring = simplify(ring, SIMPLIFY_TOLERANCE_DEGREES)
    if len(ring) < 4:
        return None

    properties = shared_properties(element.get('tags', {}))
    properties['sizeKm'] = round(polygon_size_km(ring), 3)

    return {
        'type': 'Feature',
        'geometry': {'type': 'Polygon', 'coordinates': [ring]},
        'properties': properties,
    }


def to_feature(element):
    if element['type'] == 'way':
        return way_to_feature(element)
    if element['type'] == 'relation':
        return relation_to_feature(element)
    return None


def download_protected_areas():
    print('Fetching reserves/parks from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    polygons = sum(1 for f in features if f['geometry']['type'] == 'Polygon')
    print(f'  {len(features)} usable OSM features ({polygons} polygons, {len(features) - polygons} relations reduced to points)')

    fallback_features = load_fallback_points(features, PLACES_PATH, FALLBACK_GAZETTEER_TYPES)
    print(f'  {len(fallback_features)} gazetteer reserve/park entries with no matching OSM polygon, added as points')

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features,
    }

    out_path = './public/data/protectedAreas.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_protected_areas()
