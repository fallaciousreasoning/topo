#!/bin/python3

"""
Fetches named glaciers for New Zealand from OpenStreetMap (natural=glacier) via
the Overpass API, and writes them out as a GeoJSON FeatureCollection to
public/data/glaciers.json.

Glaciers mapped as a single way become a Polygon (MapLibre places the label
inside the shape automatically). Glaciers mapped as a multipolygon relation
(most of the larger, better-known ones) are reduced to a Point at the
relation's bounding-box centre instead of reassembling the full ring set -
good enough for a label anchor, much simpler than multipolygon assembly.

As with update_ridges.py, any gazetteer "glacier" entry with no matching OSM
name is added as a Point fallback feature.
"""

import json
import math

from osm_features import bbox_clause, fetch_overpass, first, simplify, load_fallback_points

CACHE_DIR = '.cache/glaciers'
PLACES_PATH = './public/data/places.json'
FALLBACK_GAZETTEER_TYPES = {'glacier'}

QUERY = f"""
[out:json][timeout:180];
(
  way["natural"="glacier"]["name"]({bbox_clause()});
  relation["natural"="glacier"]["name"]({bbox_clause()});
);
out tags geom;
""".strip()

# Lighter than the ridge/valley tolerance - polygon outlines don't need to
# survive a line-placement angle check, this is just for file size.
SIMPLIFY_TOLERANCE_DEGREES = 0.002


def shared_properties(tags):
    properties = {
        'name': tags['name'],
        'type': 'glacier',
        'source': 'osm',
    }
    if tags.get('name:mi'):
        properties['nameMi'] = tags['name:mi']
    if tags.get('ref:linz:place_id'):
        properties['linzPlaceId'] = first(tags['ref:linz:place_id'])
    if tags.get('wikidata'):
        properties['wikidata'] = tags['wikidata']
    return properties


def polygon_size_km(ring):
    """
    sqrt(bbox width * bbox height) in km - a rough "characteristic size" for the
    polygon, used to scale the label text to roughly fit inside the shape. Not
    exact (doesn't know the glyph metrics MapLibre will actually use, and an
    elongated tongue-shaped glacier isn't well summarised by one number), but
    good enough to stop long names on tiny glaciers looming way outside their
    outline.
    """
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    mid_lat = (min(lats) + max(lats)) / 2
    width_km = (max(lons) - min(lons)) * 111.32 * math.cos(math.radians(mid_lat))
    height_km = (max(lats) - min(lats)) * 110.57
    return math.sqrt(max(width_km, 0.01) * max(height_km, 0.01))


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
        'geometry': {
            'type': 'Polygon',
            'coordinates': [ring],
        },
        'properties': properties,
    }


def relation_to_feature(element):
    """
    Multipolygon relations don't carry their own geometry from Overpass without
    fetching and reassembling every member way's rings. Using the relation's
    bounding-box centre as a Point is a much simpler stand-in - good enough for
    a label anchor.
    """
    bounds = element.get('bounds')
    if not bounds:
        return None

    lon = round((bounds['minlon'] + bounds['maxlon']) / 2, 5)
    lat = round((bounds['minlat'] + bounds['maxlat']) / 2, 5)

    return {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [lon, lat],
        },
        'properties': shared_properties(element.get('tags', {})),
    }


def to_feature(element):
    if element['type'] == 'way':
        return way_to_feature(element)
    if element['type'] == 'relation':
        return relation_to_feature(element)
    return None


def download_glaciers():
    print('Fetching glaciers from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM features')

    fallback_features = load_fallback_points(features, PLACES_PATH, FALLBACK_GAZETTEER_TYPES)
    print(f'  {len(fallback_features)} gazetteer glaciers with no matching OSM feature, added as points')

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features,
    }

    out_path = './public/data/glaciers.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_glaciers()
