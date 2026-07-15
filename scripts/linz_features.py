"""
Shared helpers for fetching authoritative NZ vector features from LINZ Data
Service (LDS) via WFS, used by the update_*.py scripts in this directory that
prefer official LINZ data over OpenStreetMap/gazetteer-mirror data where LDS
has a suitable bulk layer.

LDS layers are identified by a numeric id (e.g. "NZ Saddle Points (Topo,
1:50k)" is layer 50334) - see https://data.linz.govt.nz/layer/<id>-<slug>/.
Confirmed available via this repo's LDS key (2026-07-15): 51681 (NZ Place
Names, NZGB), 50334 (Saddle Points), 50253 (Cave Points).
"""

import hashlib
import json
import os

import requests

# Same LDS key already used client-side for point-elevation lookups, see
# src/search/height.ts - LINZ API keys aren't treated as secrets in this repo
# (LINZ_BASEMAPS_KEY in src/layers/config.ts is shipped in the client bundle
# the same way).
LDS_KEY = 'fcac9d10d1c84527bd2a1ca2a35681d8'
WFS_URL = f'https://data.linz.govt.nz/services;key={LDS_KEY}/wfs'


def ensure_cache_dir(cache_dir):
    os.makedirs(cache_dir, exist_ok=True)


def fetch_wfs(layer_id: int, cache_dir: str, cql_filter: str = None, timeout=200) -> dict:
    """
    GET a full LDS layer as a GeoJSON FeatureCollection via WFS GetFeature,
    forced to WGS84 lon/lat regardless of the layer's native CRS (LDS's WFS
    defaults to each layer's native projection, e.g. NZTM2000, even for
    outputFormat=json - GeoJSON's own lon/lat-only spec is not enough to get
    that for free), and disk-cached like osm_features.fetch_overpass.
    """
    params = {
        'service': 'WFS',
        'version': '2.0.0',
        'request': 'GetFeature',
        'typeNames': f'data.linz.govt.nz:layer-{layer_id}',
        'outputFormat': 'json',
        'srsName': 'EPSG:4326',
    }
    if cql_filter:
        params['cql_filter'] = cql_filter

    ensure_cache_dir(cache_dir)
    cache_key = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()
    cache_path = os.path.join(cache_dir, f'layer-{layer_id}-{cache_key}.json')
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)

    response = requests.get(WFS_URL, params=params, timeout=timeout)
    response.raise_for_status()
    data = response.json()

    with open(cache_path, 'w') as f:
        json.dump(data, f)

    return data
