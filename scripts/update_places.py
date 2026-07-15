#!/bin/python3

"""
Fetches the official NZGB Gazetteer (LINZ Data Service layer 51681, "NZ
Place Names (NZGB)") and writes it out as public/data/places.json, in the
same {name, type, lat, lon} shape osm_features.load_fallback_points and the
other update_*.py scripts already expect.

Supersedes the old approach (curl'ing a static snapshot from a third-party
GitHub mirror, fallaciousreasoning/nz-place-search) with a live pull straight
from the source LINZ itself mirrors that data from.

LINZ's own feat_type taxonomy is lowercased and used directly (matching what
this app's other scripts already expect: 'valley', 'bay', 'scenic reserve',
...), except two deliberate remappings where LINZ splits a single category
this app treats as one into two very unevenly sized official types:

  hill -> peak    LINZ's literal "Peak" type has only 5 entries nationwide;
                  "Hill" (9k+ entries) is what this app's peaks overlay has
                  always actually meant by "peak".
  pass -> saddle  Same story: LINZ's literal "Saddle" type has only 5
                  entries; "Pass" (~800) is the real saddle/col dataset.

'pass' remains available as its own distinct type too (used only by OSM
mountain_pass=yes features in update_landforms.py) - this remapping only
affects how *gazetteer* entries land, not that OSM-sourced type.
"""

import json

from linz_features import fetch_wfs

CACHE_DIR = '.cache/places'
LAYER_ID = 51681

TYPE_OVERRIDES = {
    'hill': 'peak',
    'pass': 'saddle',
}


def to_record(feature):
    properties = feature['properties']
    name = properties.get('name')
    feat_type = properties.get('feat_type')
    lat = properties.get('crd_latitude')
    lon = properties.get('crd_longitude')
    if not name or not feat_type or lat is None or lon is None:
        return None

    output_type = feat_type.lower()
    output_type = TYPE_OVERRIDES.get(output_type, output_type)

    return {'name': name, 'lat': lat, 'lon': lon, 'type': output_type}


def download_places():
    print('Fetching NZ Place Names (NZGB) from LINZ Data Service...')
    data = fetch_wfs(LAYER_ID, CACHE_DIR)
    features = data['features']
    print(f'  {len(features)} gazetteer entries returned')

    places = [r for r in (to_record(f) for f in features) if r]
    print(f'  {len(places)} usable records (missing name/type/coordinates dropped)')

    out_path = './public/data/places.json'
    with open(out_path, 'w') as f:
        json.dump(places, f)

    print(f'Wrote {len(places)} places to {out_path}')


if __name__ == '__main__':
    download_places()
