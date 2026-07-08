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
