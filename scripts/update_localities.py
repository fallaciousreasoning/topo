#!/bin/python3

"""
Fetches named localities for New Zealand from OpenStreetMap (place=locality)
via the Overpass API, and writes them out as a GeoJSON FeatureCollection to
public/data/localities.json.

"Locality" is OSM's catch-all tag for a named place with no formal
administrative status - anything from a rural settlement to a named informal
area. In particular, several named ski fields with no fixed lift
infrastructure (e.g. Mount Potts Ski Field, mapped as `place=locality` rather
than `landuse=winter_sports` since it's a heli-ski/backcountry operation with
no mappable lift/piste geometry) only show up in OSM under this tag - there's
no distinct "ski area" OSM tag or NZGB Gazetteer type to query for those
instead.

Any gazetteer "locality" entry (~4000 of them, mostly small settlements) with
no matching OSM name is added as a Point fallback feature, same approach as
update_ridges.py. Locality is deliberately excluded everywhere else in this
pipeline (see public/data/README.md's "Excluded gazetteer types") since
LINZ's own vector base map already shows administrative localities - this
script exists specifically to surface the community-mapped, non-administrative
names (ski fields and the like) that base map doesn't have.
"""

import json

from osm_features import bbox_clause, fetch_overpass, first, load_fallback_points

CACHE_DIR = '.cache/localities'
PLACES_PATH = './public/data/places.json'
FALLBACK_GAZETTEER_TYPES = {'locality'}

QUERY = f"""
[out:json][timeout:180];
node["place"="locality"]["name"]({bbox_clause()});
out body;
""".strip()


def to_feature(element):
    if element['type'] != 'node':
        return None

    tags = element.get('tags', {})
    properties = {
        'name': tags['name'],
        'type': 'locality',
        'source': 'osm',
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
            'type': 'Point',
            'coordinates': [round(element['lon'], 5), round(element['lat'], 5)],
        },
        'properties': properties,
    }


def download_localities():
    print('Fetching localities from Overpass...')
    data = fetch_overpass(QUERY, CACHE_DIR)
    elements = data['elements']
    print(f'  {len(elements)} elements returned')

    features = [f for f in (to_feature(e) for e in elements) if f]
    print(f'  {len(features)} usable OSM features')

    fallback_features = load_fallback_points(features, PLACES_PATH, FALLBACK_GAZETTEER_TYPES)
    print(f'  {len(fallback_features)} gazetteer localities with no matching OSM feature, added as points')

    geojson = {
        'type': 'FeatureCollection',
        'features': features + fallback_features,
    }

    out_path = './public/data/localities.json'
    with open(out_path, 'w') as f:
        json.dump(geojson, f)

    print(f'Wrote {len(geojson["features"])} features to {out_path}')


if __name__ == '__main__':
    download_localities()
