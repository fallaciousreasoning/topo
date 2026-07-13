"""
Shared helpers for fetching named natural features (ridges, glaciers, valleys,
waterways, ...) from OpenStreetMap via Overpass, used by the update_*.py
scripts in this directory.
"""

import json
import math
import os
import hashlib
import unicodedata
import requests

OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

# Mainland NZ + Chathams, Stewart Island, Ross Dependency-adjacent bbox
NZ_BBOX = (-47.9, 166.0, -34.0, 179.5)

# How close a gazetteer point needs to be to a same-named OSM feature (using
# the OSM feature's bbox centre, see representative_point) to be treated as
# the same real-world thing rather than a same-named-but-different feature
# elsewhere in the country - generous enough to cover a large polygon's bbox
# centre sitting a bit off from where the gazetteer pinned the name, tight
# enough to reject genuinely distinct features (see load_fallback_points).
COVERAGE_RADIUS_METRES = 5000


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


CARDINAL_DIRECTIONS = {
    'n': 0, 'north': 0,
    'ne': 45, 'northeast': 45, 'north-east': 45,
    'e': 90, 'east': 90,
    'se': 135, 'southeast': 135, 'south-east': 135,
    's': 180, 'south': 180,
    'sw': 225, 'southwest': 225, 'south-west': 225,
    'w': 270, 'west': 270,
    'nw': 315, 'northwest': 315, 'north-west': 315,
}


def parse_direction(value):
    """
    Parse OSM's direction=* tag into a compass bearing in degrees (0-359).
    Accepts a plain bearing ("119"), a ;-separated list (takes the first, same
    as ref:linz:place_id), or a cardinal/intercardinal name ("north-west").
    Returns None if the value can't be parsed.
    """
    value = first(value)
    if not value:
        return None
    value = value.strip().lower()
    if value in CARDINAL_DIRECTIONS:
        return CARDINAL_DIRECTIONS[value]
    try:
        return round(float(value)) % 360
    except ValueError:
        return None


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


def polygon_size_km(ring):
    """"Characteristic size" (sqrt of bbox width * height) of a lon/lat ring - a
    cheap stand-in for true shape size, used to scale polygon labels."""
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    mid_lat = (min(lats) + max(lats)) / 2
    width_km = (max(lons) - min(lons)) * 111.32 * math.cos(math.radians(mid_lat))
    height_km = (max(lats) - min(lats)) * 110.57
    return math.sqrt(max(width_km, 0.01) * max(height_km, 0.01))


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


def haversine_metres(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def representative_point(geometry):
    """A cheap stand-in point for an arbitrary OSM geometry (bbox centre),
    just precise enough to tell "this is roughly the same real-world feature
    as that gazetteer point" from "coincidentally the same name, a different
    feature entirely" - see load_fallback_points."""
    if geometry['type'] == 'Point':
        return geometry['coordinates']
    ring = geometry['coordinates'][0] if geometry['type'] == 'Polygon' else geometry['coordinates']
    lons = [c[0] for c in ring]
    lats = [c[1] for c in ring]
    return [(min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2]


def strip_diacritics(name):
    """OSM and the gazetteer don't consistently agree on whether a name
    carries macrons (e.g. OSM's "Pākihi Swamp" vs the gazetteer's "Pakihi
    Swamp") - matching needs to be accent-insensitive or the same feature
    shows up twice, once from each source."""
    return ''.join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn')


def in_nz_bbox(lat, lon):
    south, west, north, east = NZ_BBOX
    return south <= lat <= north and west <= lon <= east


def assemble_rings(paths):
    """
    Stitch open paths (each a list of [lon, lat], as returned by Overpass for
    one member way) that share endpoints into closed rings. A multipolygon's
    outer boundary is often split across many ways (see Hooker Glacier: 30
    "outer" segments) rather than one single closed way, so they need to be
    chained end-to-end - reversing a segment where necessary - before they're
    usable as a polygon ring.
    """
    segments = [list(p) for p in paths if len(p) >= 2]
    rings = []
    while segments:
        ring = segments.pop(0)
        changed = True
        while changed and ring[0] != ring[-1]:
            changed = False
            for i, seg in enumerate(segments):
                if seg[0] == ring[-1]:
                    ring.extend(seg[1:])
                elif seg[-1] == ring[-1]:
                    ring.extend(reversed(seg[:-1]))
                elif seg[-1] == ring[0]:
                    ring[0:0] = seg[:-1]
                elif seg[0] == ring[0]:
                    ring[0:0] = list(reversed(seg[1:]))
                else:
                    continue
                segments.pop(i)
                changed = True
                break
        rings.append(ring)
    return rings


def largest_outer_ring(relation, ways_by_id):
    """
    Assemble a relation's "outer" member ways into one or more closed rings
    and return the largest (by point count - a cheap proxy for extent, good
    enough to pick the main body over a stray disconnected fragment). Returns
    None if the members don't assemble into any usable closed ring at all.
    """
    outer_paths = [
        ways_by_id[member['ref']]
        for member in relation.get('members', [])
        if member.get('role') == 'outer' and member.get('type') == 'way' and member['ref'] in ways_by_id
    ]
    if not outer_paths:
        return None

    rings = [r for r in assemble_rings(outer_paths) if len(r) >= 4 and r[0] == r[-1]]
    if not rings:
        return None

    return max(rings, key=len)


def relation_bounds_point(element):
    """Bounding-box centre of a relation, from Overpass's own `bounds` field -
    used as a last-resort Point fallback when a relation's members don't
    assemble into a usable ring at all."""
    bounds = element.get('bounds')
    if not bounds:
        return None
    return [
        round((bounds['minlon'] + bounds['maxlon']) / 2, 5),
        round((bounds['minlat'] + bounds['maxlat']) / 2, 5),
    ]


def point_in_ring(lat, lon, ring):
    """Standard ray-casting point-in-polygon test on a lon/lat ring."""
    inside = False
    x1, y1 = ring[-1]
    for x2, y2 in ring:
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            inside = not inside
        x1, y1 = x2, y2
    return inside


def geometry_covers_point(geometry, lat, lon):
    """Whether a gazetteer point at (lat, lon) should be considered "inside"
    an OSM geometry of the same name - true polygon containment for
    Polygon/MultiPolygon (a large lake's bbox centre can be many km from
    where the gazetteer happens to have pinned its name, e.g. a bay or
    township on its shore, so containment is checked directly rather than
    only via distance to representative_point), otherwise proximity to
    representative_point within COVERAGE_RADIUS_METRES."""
    if geometry['type'] == 'Polygon' and point_in_ring(lat, lon, geometry['coordinates'][0]):
        return True
    if geometry['type'] == 'MultiPolygon' and any(
        point_in_ring(lat, lon, ring[0]) for ring in geometry['coordinates']
    ):
        return True
    point_lon, point_lat = representative_point(geometry)
    return haversine_metres(lat, lon, point_lat, point_lon) < COVERAGE_RADIUS_METRES


def load_fallback_points(osm_features, places_path, fallback_types):
    """
    Not every named gazetteer place has a matching OSM feature yet (OSM coverage
    is community-mapped, so it has gaps). For any gazetteer entry of a type in
    fallback_types with no matching OSM name, return a Point feature instead,
    so it still shows up as a label even without real line/polygon geometry.

    The gazetteer itself sometimes carries more than one name record for the
    same real-world feature at the exact same coordinates - typically a
    current official name alongside a superseded older spelling (e.g. "Naumann
    Range" / "Neumann Range"). Matching is therefore done per-coordinate, not
    just per-name: if any name recorded at a given point matches an OSM
    feature, every other name at that same point is treated as already covered
    too, rather than being added as a duplicate point label.

    A name match alone isn't enough, though - generic names like "Pakihi
    Swamp" or "Black Peak" recur many times across the country for unrelated
    features, so a gazetteer point is only "covered" by an OSM feature of the
    same name if it's also inside its polygon (or, for non-polygon geometry,
    within COVERAGE_RADIUS_METRES of it) - see geometry_covers_point.
    """
    if not os.path.exists(places_path):
        print(f'  {places_path} not found, skipping gazetteer fallback points')
        return []

    with open(places_path) as f:
        places = json.load(f)

    matched_geometries = {}
    for feature in osm_features:
        for variant in name_variants(feature['properties']['name']):
            matched_geometries.setdefault(strip_diacritics(variant), []).append(feature['geometry'])

    candidates = [
        place for place in places
        if place.get('type') in fallback_types and in_nz_bbox(place['lat'], place['lon'])
    ]

    def is_covered(place):
        geometries = matched_geometries.get(strip_diacritics(place['name']))
        if not geometries:
            return False
        return any(geometry_covers_point(g, place['lat'], place['lon']) for g in geometries)

    covered_coordinates = {
        (round(place['lon'], 5), round(place['lat'], 5))
        for place in candidates
        if is_covered(place)
    }

    fallback_features = []
    seen_coordinates = set()
    for place in candidates:
        coordinates = (round(place['lon'], 5), round(place['lat'], 5))
        if coordinates in covered_coordinates:
            continue
        # Also collapse duplicate gazetteer name records for the same feature
        # that *aren't* covered by OSM - only the first name at a given point
        # becomes a fallback label, not one per alternate spelling.
        if coordinates in seen_coordinates:
            continue
        seen_coordinates.add(coordinates)

        fallback_features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': list(coordinates),
            },
            'properties': {
                'name': place['name'],
                'type': place['type'],
                'source': 'gazetteer',
            },
        })

    return fallback_features
