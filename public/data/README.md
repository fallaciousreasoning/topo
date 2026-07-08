# Updating Data

## `huts.json`

    python scripts/update_huts.py

## `places.json`

    curl 'https://raw.githubusercontent.com/fallaciousreasoning/nz-place-search/master/data/min_nz_places.json' > places.json

## `ridges.json`

    python scripts/update_ridges.py

Named ridge/range lines (`natural=ridge`/`natural=arete`) for NZ, fetched from OpenStreetMap via
Overpass. Many features carry a `linzPlaceId` property linking back to the same NZGB Gazetteer
entry used in `places.json`.

Requires `places.json` to already be present: any gazetteer entry of type `range` with no matching
OSM line is added as a Point feature (`properties.source: 'gazetteer'`) instead, so it still shows
up as a label even without line geometry.

## `glaciers.json`

    python scripts/update_glaciers.py

Named glaciers (`natural=glacier`) from OpenStreetMap. Single-way glaciers ship as a Polygon;
multipolygon relations are reduced to a Point at the relation's bounding-box centre. Falls back to
gazetteer `glacier` entries with no OSM match, same as `ridges.json`.

## `valleys.json`

    python scripts/update_valleys.py

Named valleys (`natural=valley`) from OpenStreetMap - a mix of Point (most of them, mapped as a
single node) and LineString (valley floor traced as a way) geometry. Falls back to gazetteer
`valley` entries with no OSM match, same as `ridges.json`.

## `waterways.json`

    python scripts/update_waterways.py

Named rivers and streams (`waterway=river`/`waterway=stream`) from OpenStreetMap, tagged with
`properties.category` so the map layer can gate the ~23k minor streams behind a much higher minzoom
than the ~3.5k rivers. No gazetteer fallback here - OSM's waterway coverage is already dense enough,
and the gazetteer's own stream count (~17k) would dwarf everything else in this dataset.

## Shared code

`update_ridges.py`, `update_glaciers.py`, `update_valleys.py`, and `update_waterways.py` all pull
their Overpass fetching, RDP line simplification, and gazetteer-fallback logic from
`scripts/osm_features.py`.
