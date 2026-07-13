#!/bin/python3

"""
Fetches named glaciers for New Zealand from OpenStreetMap (natural=glacier) via
the Overpass API, and writes them out as a GeoJSON FeatureCollection to
public/data/glaciers.json.

Glaciers mapped as a single way become either:
- a Polygon, for roughly compact shapes - MapLibre places the label inside
  the shape automatically, sized to the largest circle that actually fits
  inside it (see polygon_shape.py), or
- a LineString tracing the glacier's medial axis (its "spine"), for
  elongated tongue-shaped ones where no circle big enough for readable text
  fits - labelled the same way ridges/rivers are, following the shape's
  length instead of being crammed into a small inscribed circle.

Glaciers mapped as a multipolygon relation (most of the larger, better-known
ones) are reduced to a Point at the relation's bounding-box centre instead of
reassembling the full ring set - good enough for a label anchor, much simpler
than multipolygon assembly.

As with update_ridges.py, any gazetteer "glacier" entry with no matching OSM
name is added as a Point fallback feature.
"""

import json
import math

import polygon_shape
from osm_features import bbox_clause, fetch_overpass, first, simplify, length_km, load_fallback_points, polygon_size_km

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

# A glacier is treated as "thin" (labelled with a spine line instead of a
# point in a circle) when its widest inscribed circle's diameter is less than
# this fraction of its spine length - i.e. a long way narrower than it is long.
THIN_ASPECT_THRESHOLD = 0.35
# Below this spine length, treating it as a line isn't worth it either way.
MIN_SPINE_LENGTH_KM = 0.4


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


def path_length_km(path_xy):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path_xy, path_xy[1:]))


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

    ring_xy, lon0, lat0, cos_lat = polygon_shape.project_ring(ring)
    bbox_diag_km = math.hypot(
        max(p[0] for p in ring_xy) - min(p[0] for p in ring_xy),
        max(p[1] for p in ring_xy) - min(p[1] for p in ring_xy),
    )
    # Boundary points need to be dense relative to the shape's own scale for the
    # Voronoi-based analysis to be accurate - aim for ~25 segments around it.
    target_segment_km = max(0.03, bbox_diag_km / 25)

    graph, radii = polygon_shape.medial_axis(ring_xy, target_segment_km)
    _, radius_km = polygon_shape.largest_inscribed_circle(graph, radii, ring_xy)
    spine_xy = polygon_shape.longest_path(graph)
    spine_km = path_length_km(spine_xy) if len(spine_xy) >= 2 else 0.0

    is_thin = (
        spine_km >= MIN_SPINE_LENGTH_KM
        and radius_km > 0
        and (2 * radius_km) / spine_km < THIN_ASPECT_THRESHOLD
    )

    if is_thin:
        spine_lonlat = [polygon_shape.unproject_point(p, lon0, lat0, cos_lat) for p in spine_xy]
        spine_lonlat = simplify(spine_lonlat, SIMPLIFY_TOLERANCE_DEGREES)
        properties['shape'] = 'thin'
        properties['lengthKm'] = round(length_km(spine_lonlat), 2)
        return {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': spine_lonlat,
            },
            'properties': properties,
        }

    properties['shape'] = 'compact'
    properties['sizeKm'] = round(2 * radius_km, 3) if radius_km > 0 else round(polygon_size_km(ring), 3)
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
    thin = sum(1 for f in features if f['properties'].get('shape') == 'thin')
    print(f'  {len(features)} usable OSM features ({thin} labelled as thin/elongated)')

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
