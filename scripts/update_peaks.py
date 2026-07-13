#!/bin/python3

"""
Fetches NZGB Gazetteer peaks (see public/data/places.json) that aren't already
covered by the curated nz-mountains/climbnz dataset the Mountains overlay uses
(src/layers/mountains.tsx, fetched live from nz-mountains' mountains.json),
and writes them out as a GeoJSON FeatureCollection to public/data/peaks.json.

climbnz only documents peaks notable enough to have climbing route
information - ~1700 of them - a small fraction of the gazetteer's ~7300 named
peaks. Without this, every other named peak (anything without a climbing
route) is invisible on the Mountains overlay. mountains.tsx merges this file's
features in alongside the climbnz ones, as plain points with no route/photo
data attached (unlike the OSM-backed overlays elsewhere in this pipeline,
there's no line/polygon upgrade to be had here - a peak is already exactly a
point, at the gazetteer's own resolution).

Requires public/data/places.json to already be present.
"""

import json
import math
import re

import requests

PLACES_PATH = './public/data/places.json'
MOUNTAINS_URL = 'https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json'

# climbnz is crowd-entered and names the same peak inconsistently (its own
# entries even disagree on whether "Mt Elliot" has one or two Ls) - close
# enough to a gazetteer peak is treated as the same feature regardless of
# name.
NEARBY_METRES = 100


def name_variants(name):
    """Mirrors osm_features.name_variants - bilingual/alternate names are
    sometimes written "A / B"; match on either half."""
    return {part.strip() for part in name.split('/')}


def normalize(name):
    """climbnz abbreviates "Mount" as "Mt" and "Peak(s)" as "Pk(s)" (e.g.
    "Avalanche Pk" for the gazetteer's "Avalanche Peak") - undo that so the
    two datasets' names compare equal."""
    name = re.sub(r'^Mt\b\.?', 'Mount', name)
    name = re.sub(r'\bPks\b\.?$', 'Peaks', name)
    name = re.sub(r'\bPk\b\.?$', 'Peak', name)
    return name


def haversine_metres(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_climbnz():
    """Returns (names, points): normalized name variants for exact matching,
    and a coordinate grid (keyed by rounded lat/lon, for fast nearby lookups)
    of every climbnz peak that has a location, for proximity matching."""
    response = requests.get(MOUNTAINS_URL, timeout=60)
    response.raise_for_status()
    data = response.json()

    names = set()
    points = {}
    for mountain in data.values():
        name = mountain.get('name')
        if not name:
            continue
        names |= {normalize(variant) for variant in name_variants(name)}

        latlng = mountain.get('latlng')
        if not latlng:
            continue
        try:
            lat, lon = float(latlng[0]), float(latlng[1])
        except (TypeError, ValueError):
            continue
        points.setdefault((round(lat, 1), round(lon, 1)), []).append((lat, lon))
    return names, points


def covered_by_proximity(lat, lon, points):
    """climbnz's crowd-entered names often don't match the gazetteer's at all
    (bilingual names joined without a "/", informal names, sub-peak labels
    like "Pt 1720") even though they're the same peak - so also treat a
    gazetteer peak as covered if a climbnz peak sits within NEARBY_METRES of
    it, regardless of name."""
    base_lat, base_lon = round(lat, 1), round(lon, 1)
    for dlat in (-0.1, 0, 0.1):
        for dlon in (-0.1, 0, 0.1):
            for clat, clon in points.get((round(base_lat + dlat, 1), round(base_lon + dlon, 1)), []):
                if haversine_metres(lat, lon, clat, clon) < NEARBY_METRES:
                    return True
    return False


def download_peaks():
    print('Loading gazetteer peaks...')
    with open(PLACES_PATH) as f:
        places = json.load(f)
    peaks = [p for p in places if p.get('type') == 'peak']
    print(f'  {len(peaks)} gazetteer peaks total')

    print('Fetching climbnz mountains...')
    climbnz_names, climbnz_points = load_climbnz()
    print(f'  {len(climbnz_names)} climbnz mountain names loaded')

    seen_coordinates = set()
    features = []
    for peak in peaks:
        if normalize(peak['name']) in climbnz_names:
            continue
        if covered_by_proximity(peak['lat'], peak['lon'], climbnz_points):
            continue

        coordinates = (round(peak['lon'], 5), round(peak['lat'], 5))
        # The gazetteer sometimes carries more than one name record for the
        # same point (a current name alongside a superseded spelling) - only
        # the first becomes a fallback feature, same dedup as osm_features.py's
        # load_fallback_points.
        if coordinates in seen_coordinates:
            continue
        seen_coordinates.add(coordinates)

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': list(coordinates),
            },
            'properties': {
                'name': peak['name'],
                'type': 'peak',
                'source': 'gazetteer',
            },
        })

    print(f'  {len(features)} peaks not covered by climbnz, added as points')

    geojson = {
        'type': 'FeatureCollection',
        'features': features,
    }

    out_path = './public/data/peaks.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(features)} features to {out_path}')


if __name__ == '__main__':
    download_peaks()
