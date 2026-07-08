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
import math
import os
import hashlib
import requests

CACHE_DIR = '.cache/ridges'
OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
PLACES_PATH = './public/data/places.json'

# Mainland NZ + Chathams, Stewart Island, Ross Dependency-adjacent bbox
NZ_BBOX = (-47.9, 166.0, -34.0, 179.5)

# Gazetteer place "type"s that fall back to a Point feature when no OSM line matches.
FALLBACK_GAZETTEER_TYPES = {'range'}

QUERY = f"""
[out:json][timeout:180];
(
  way["natural"="ridge"]["name"]({",".join(str(c) for c in NZ_BBOX)});
  way["natural"="arete"]["name"]({",".join(str(c) for c in NZ_BBOX)});
);
out tags geom;
""".strip()


def ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def fetch_overpass(query: str):
    cache_path = os.path.join(CACHE_DIR, hashlib.md5(query.encode()).hexdigest() + '.json')
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)

    response = requests.post(
        OVERPASS_URL,
        data={'data': query},
        headers={'User-Agent': 'topos.nz-data-fetcher/1.0'},
        timeout=200,
    )
    response.raise_for_status()
    data = response.json()

    with open(cache_path, 'w') as f:
        json.dump(data, f)

    return data


def first(value):
    """ref:linz:place_id is sometimes a ;-separated list of ids - keep the first."""
    if not value:
        return None
    return value.split(';')[0]


def simplify(points, epsilon):
    """
    Ramer-Douglas-Peucker simplification.

    OSM ridge ways are traced in fine, jagged detail - every small terrain wiggle
    becomes a vertex. That defeats MapLibre's line-following text placement (its
    text-max-angle check rejects placement almost everywhere along a jagged line),
    so the geometry is smoothed to a broad "range scale" shape before being shipped.
    """
    if len(points) < 3:
        return points

    def perp_dist(pt, start, end):
        if start == end:
            return math.hypot(pt[0] - start[0], pt[1] - start[1])
        x1, y1 = start
        x2, y2 = end
        x0, y0 = pt
        num = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        den = math.hypot(y2 - y1, x2 - x1)
        return num / den

    dmax = 0.0
    index = 0
    for i in range(1, len(points) - 1):
        d = perp_dist(points[i], points[0], points[-1])
        if d > dmax:
            index = i
            dmax = d

    if dmax > epsilon:
        left = simplify(points[:index + 1], epsilon)
        right = simplify(points[index:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]


# ~400m at NZ latitudes - smooths fine natural jaggedness while keeping each
# range/ridge's overall curve, so label text still traces the real shape.
SIMPLIFY_TOLERANCE_DEGREES = 0.004


def length_km(coordinates):
    """Great-circle length of the line, used to prioritise long ranges over short spurs."""
    R = 6371.0
    total = 0.0
    for (lon1, lat1), (lon2, lat2) in zip(coordinates, coordinates[1:]):
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
        total += 2 * R * math.asin(math.sqrt(a))
    return total


def to_feature(element):
    geometry = element.get('geometry')
    if not geometry or len(geometry) < 2:
        return None

    tags = element.get('tags', {})
    raw_coordinates = [[round(pt['lon'], 5), round(pt['lat'], 5)] for pt in geometry]
    coordinates = simplify(raw_coordinates, SIMPLIFY_TOLERANCE_DEGREES)

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


def name_variants(name):
    """OSM often names bilingual features "Māori Name / English Name" - match on either half."""
    return {part.strip() for part in name.split('/')}


def in_nz_bbox(lat, lon):
    south, west, north, east = NZ_BBOX
    return south <= lat <= north and west <= lon <= east


def load_fallback_points(osm_features):
    if not os.path.exists(PLACES_PATH):
        print(f'  {PLACES_PATH} not found, skipping gazetteer fallback points')
        return []

    with open(PLACES_PATH) as f:
        places = json.load(f)

    matched_names = set()
    for feature in osm_features:
        matched_names |= name_variants(feature['properties']['name'])

    fallback_features = []
    for place in places:
        if place.get('type') not in FALLBACK_GAZETTEER_TYPES:
            continue
        if place['name'] in matched_names:
            continue
        if not in_nz_bbox(place['lat'], place['lon']):
            continue

        fallback_features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [round(place['lon'], 5), round(place['lat'], 5)],
            },
            'properties': {
                'name': place['name'],
                'type': place['type'],
                'source': 'gazetteer',
            },
        })

    return fallback_features


def download_ridges():
    ensure_cache_dir()

    print('Fetching ridge/range lines from Overpass...')
    data = fetch_overpass(QUERY)
    elements = data['elements']
    print(f'  {len(elements)} ways returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM line features')

    fallback_features = load_fallback_points(features)
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
