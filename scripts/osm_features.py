"""
Shared helpers for fetching named natural features (ridges, glaciers, valleys,
waterways, ...) from OpenStreetMap via Overpass, used by the update_*.py
scripts in this directory.
"""

import json
import math
import os
import hashlib
import requests

OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

# Mainland NZ + Chathams, Stewart Island, Ross Dependency-adjacent bbox
NZ_BBOX = (-47.9, 166.0, -34.0, 179.5)


def bbox_clause():
    """Overpass bbox filter arguments, e.g. for use inside a tag query string."""
    return ",".join(str(c) for c in NZ_BBOX)


def ensure_cache_dir(cache_dir):
    os.makedirs(cache_dir, exist_ok=True)


def fetch_overpass(query: str, cache_dir: str, timeout=200):
    ensure_cache_dir(cache_dir)
    cache_path = os.path.join(cache_dir, hashlib.md5(query.encode()).hexdigest() + '.json')
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)

    response = requests.post(
        OVERPASS_URL,
        data={'data': query},
        headers={'User-Agent': 'topos.nz-data-fetcher/1.0'},
        timeout=timeout,
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

    OSM natural-feature ways are traced in fine, jagged detail - every small
    terrain wiggle becomes a vertex. That defeats MapLibre's line-following
    text placement (its text-max-angle check rejects placement almost
    everywhere along a jagged line), so geometry is smoothed to a broad,
    label-friendly shape before being shipped.
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
# feature's overall curve, so label text still traces the real shape.
SIMPLIFY_TOLERANCE_DEGREES = 0.004


def length_km(coordinates):
    """Great-circle length of a line, used to prioritise long features over short ones."""
    R = 6371.0
    total = 0.0
    for (lon1, lat1), (lon2, lat2) in zip(coordinates, coordinates[1:]):
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
        total += 2 * R * math.asin(math.sqrt(a))
    return total


def name_variants(name):
    """OSM often names bilingual features "Māori Name / English Name" - match on either half."""
    return {part.strip() for part in name.split('/')}


def in_nz_bbox(lat, lon):
    south, west, north, east = NZ_BBOX
    return south <= lat <= north and west <= lon <= east


def load_fallback_points(osm_features, places_path, fallback_types):
    """
    Not every named gazetteer place has a matching OSM feature yet (OSM coverage
    is community-mapped, so it has gaps). For any gazetteer entry of a type in
    fallback_types with no matching OSM name, return a Point feature instead,
    so it still shows up as a label even without real line/polygon geometry.
    """
    if not os.path.exists(places_path):
        print(f'  {places_path} not found, skipping gazetteer fallback points')
        return []

    with open(places_path) as f:
        places = json.load(f)

    matched_names = set()
    for feature in osm_features:
        matched_names |= name_variants(feature['properties']['name'])

    fallback_features = []
    for place in places:
        if place.get('type') not in fallback_types:
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
