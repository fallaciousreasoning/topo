# Updating Data

## `huts.json`

    python scripts/update_huts.py

## `places.json`

    python scripts/update_places.py

The official NZGB Gazetteer, pulled directly from LINZ Data Service (layer 51681, "NZ Place Names
(NZGB)") - supersedes the previous approach of `curl`ing a static snapshot from a third-party
GitHub mirror (`fallaciousreasoning/nz-place-search`).

LINZ's own `feat_type` values are lowercased and used as-is (`valley`, `bay`, `scenic reserve`,
...), except two remappings where LINZ splits a single category this app treats as one into two
very unevenly sized official types: `hill` -> `peak` (LINZ's literal `Peak` type has only 5 entries
nationwide; `Hill` - 9k+ entries - is what this app's peaks overlay has always actually meant by
"peak") and `pass` -> `saddle` (same story: LINZ's literal `Saddle` type has only 5 entries; `Pass`
- ~800 - is the real saddle/col dataset). `pass` remains available as its own distinct type too
(used only by OSM `mountain_pass=yes` features in `update_landforms.py`) - this remapping only
affects how *gazetteer* entries land, not that OSM-sourced type.

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

## `landforms.json`

    python scripts/update_landforms.py

Named cliffs, reefs, islands, bays, saddles, passes and plateaus - each has a well-established,
specific OSM tag (`natural=cliff`, `natural=reef`, `place=island`/`islet`, `natural=bay`,
`natural=saddle`, `mountain_pass=yes`, `natural=plateau`), fetched the same way as `ridges.json`,
with a gazetteer fallback per type.

Saddles are also fetched from LINZ Data Service (layer 50334, "NZ Saddle Points, Topo 1:50k") -
LINZ is preferred over OSM where both cover the same named saddle (the OSM node is dropped, see
`osm_features.remove_covered`), with OSM filling in any saddle LINZ doesn't have and the gazetteer
filling in anything neither does.

`basin`, `canyon`, `knoll`, `peninsula`, `isthmus`, `cape` and `point` gazetteer entries have no
OSM tag specific enough to query for, so they're shipped directly as Point features straight from
`places.json`, no Overpass lookup.

## `waterFeatures.json`

    python scripts/update_water_features.py

Named lakes (`natural=water`+`water=lake`, Polygon), wetlands (`natural=wetland`, Polygon),
waterfalls (`waterway=waterfall`), springs (`natural=spring`) and hot springs
(`natural=hot_spring`) from OpenStreetMap, with a gazetteer fallback per type.

`pool` and `ford` gazetteer entries have no specific OSM tag, shipped as plain Points.

## `geologicalFeatures.json`

    python scripts/update_geological_features.py

Named volcanoes (`natural=volcano`) and cave entrances (`natural=cave_entrance` - also covers the
gazetteer's `cave` type) from OpenStreetMap, with a gazetteer fallback per type.

Cave entrances are also fetched from LINZ Data Service (layer 50253, "NZ Cave Points, Topo 1:50k")
- LINZ is preferred over OSM where both cover the same named cave (the OSM node is dropped, see
`osm_features.remove_covered`), with OSM filling in any cave LINZ doesn't have and the gazetteer
filling in anything neither does.

`crater` gazetteer entries have no specific OSM tag, shipped as plain Points.

## `protectedAreas.json`

    python scripts/update_protected_areas.py

Named reserves, parks and historic sites (`boundary=protected_area`/`leisure=nature_reserve`) from
OpenStreetMap - unlike the other scripts here, this one folds a whole cluster of gazetteer types
(`scenic reserve`, `recreation reserve`, `historic site`, `government purpose reserve`, `forest`,
`historic reserve`, `scientific reserve`, `national park`, `conservation park`, `nature reserve`,
`marine reserve`, `wildlife management area`, `sanctuary area`) into one `reserve` output type,
since OSM's tagging doesn't reliably distinguish between them. Most of the largest, best-known
parks (Fiordland, Tongariro, Aoraki/Mount Cook, ...) are OSM multipolygon relations rather than
simple ways, reduced to a Point at the relation's bounding-box centre, same as `glaciers.json`.

## `peaks.json`

    python scripts/update_peaks.py

Gazetteer `peak` entries not already covered by the curated nz-mountains/climbnz dataset
`src/layers/mountains.tsx` fetches live (climbnz only documents peaks notable enough to have
climbing route info - ~1700 of the gazetteer's ~7300 named peaks). No Overpass lookup - a peak is
already exactly a point at the gazetteer's own resolution, so there's no line/polygon upgrade to
be had the way there is for the OSM-backed datasets above. `mountains.tsx` merges this file's
features in alongside the climbnz ones at render time, as plain points with no route/photo data.

## Excluded gazetteer types

The NZGB Gazetteer (`places.json`) has ~100 distinct place `type`s in total. Beyond what's listed
above, deliberately not covered: administrative places (`locality`, `suburb`, `town`, `city`,
`village`, `local authority`) and `trig station` are already shown by the LINZ vector base map
itself; infrastructure (`railway station`, `railway line`, `road`, `bridge`, `building`) is
likewise already on the base map; offshore bathymetric features (`seamount`, `guyot`, `trough`,
`bank`, `shoal`, `fracture zone`, `sea valley`) have no real relevance to a land-based hiking map
and barely any OSM coverage to query for; and generic/junk types (`site`, `place`, `area`,
`facility`, `amenity area`, `historic antarctic`) are too vague to mean anything as a distinct
overlay.

## Shared code

`update_ridges.py`, `update_glaciers.py`, `update_valleys.py`, `update_waterways.py`,
`update_landforms.py`, `update_water_features.py`, `update_geological_features.py`, and
`update_protected_areas.py` all pull their Overpass fetching, RDP line simplification, and
gazetteer-fallback logic from `scripts/osm_features.py`.

`update_places.py`, `update_landforms.py` and `update_geological_features.py` pull authoritative
LINZ Data Service layers via `scripts/linz_features.py`'s `fetch_wfs`, and use
`osm_features.remove_covered` to drop an OSM feature whenever a same-named LINZ feature already
covers it.
