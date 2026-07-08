#!/bin/python3

"""
Fetches named ridge/range lines for New Zealand from OpenStreetMap (natural=ridge,
natural=arete) via the Overpass API, and writes them out as a GeoJSON
FeatureCollection to public/data/ridges.json.

Many of these ways carry a ref:linz:place_id tag, linking them back to the same
NZGB Gazetteer entries used elsewhere in this app (see public/data/places.json).

Not every named range in the gazetteer has a traced OSM ridge line yet (OSM
coverage is community-mapped, so it has gaps - notably in Antarctica, but also
a couple dozen NZ mainland ranges). For any gazetteer "range" entry with no
matching OSM line, a Point fallback feature is added instead, so it still
shows up as a label even without line geometry to curve text along.
"""

import json

from osm_features import (
    bbox_clause, fetch_overpass, first, simplify, length_km,
    load_fallback_points, SIMPLIFY_TOLERANCE_DEGREES,
)

CACHE_DIR = '.cache/ridges'
PLACES_PATH = './public/data/places.json'

# Gazetteer place "type"s that fall back to a Point feature when no OSM line matches.
FALLBACK_GAZETTEER_TYPES = {'range'}

QUERY = f"""
[out:json][timeout:180];
(
  way["natural"="ridge"]["name"]({bbox_clause()});
  way["natural"="arete"]["name"]({bbox_clause()});
);
out tags geom;
""".strip()



# Only the Southern Alps (234km raw) is long enough to need this - the next
# longest named ridge in the dataset is Coromandel Range at 136.8km, still a
# substantial real range that deserves its full shape at the base tolerance.
# Anything past this threshold is only ever shown at a wide, zoomed-out view,
# where a few km of positional wiggle is invisible - but at the base tolerance
# it keeps enough fine jaggedness to fail MapLibre's line-placement angle
# check at that zoom, the same problem the base tolerance was originally
# introduced to fix, just recurring at a coarser scale.
LONG_OUTLIER_THRESHOLD_KM = 180


def adaptive_tolerance(raw_coordinates):
    raw_length_km = length_km(raw_coordinates)
    if raw_length_km <= LONG_OUTLIER_THRESHOLD_KM:
        return SIMPLIFY_TOLERANCE_DEGREES
    return SIMPLIFY_TOLERANCE_DEGREES * (raw_length_km / 5)


def to_feature(element):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 2:
        return None

    tags = element.get('tags', {})
    raw_coordinates = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    coordinates = simplify(raw_coordinates, adaptive_tolerance(raw_coordinates))

    properties = {
        'name': tags['name'],
        'type': tags.get('natural'),
        'source': 'osm',
        'lengthKm': round(length_km(coordinates), 1),
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
            'type': 'LineString',
            'coordinates': coordinates,
        },
        'properties': properties,
    }


def download_ridges():
    print('Fetching ridge/range lines from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} ways returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM line features')

    fallback_features = load_fallback_points(features, PLACES_PATH, FALLBACK_GAZETTEER_TYPES)
    print(f'  {len(fallback_features)} gazetteer ranges with no matching OSM line, added as points')

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features,
    }

    out_path = './public/data/ridges.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_ridges()
