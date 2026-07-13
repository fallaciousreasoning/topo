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

import requests

PLACES_PATH = './public/data/places.json'
MOUNTAINS_URL = 'https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json'


def name_variants(name):
    """Mirrors osm_features.name_variants - bilingual/alternate names are
    sometimes written "A / B"; match on either half."""
    return {part.strip() for part in name.split('/')}


def load_climbnz_names():
    response = requests.get(MOUNTAINS_URL, timeout=60)
    response.raise_for_status()
    data = response.json()

    names = set()
    for mountain in data.values():
        if mountain.get('name'):
            names |= name_variants(mountain['name'])
    return names


def download_peaks():
    print('Loading gazetteer peaks...')
    with open(PLACES_PATH) as f:
        places = json.load(f)
    peaks = [p for p in places if p.get('type') == 'peak']
    print(f'  {len(peaks)} gazetteer peaks total')

    print('Fetching climbnz mountain names...')
    climbnz_names = load_climbnz_names()
    print(f'  {len(climbnz_names)} climbnz mountain names loaded')

    seen_coordinates = set()
    features = []
    for peak in peaks:
        if peak['name'] in climbnz_names:
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
