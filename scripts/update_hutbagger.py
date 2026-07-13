#!/bin/python3

import requests
import re
import json
import os
import hashlib
import math
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

CACHE_DIR = '.cache/hutbagger'
SITEMAP_URL = 'https://hutbagger.co.nz/sitemap.xml'
HUTS_JSON = './public/data/huts.json'


def ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def get_cache_path(url, ext='html'):
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{url_hash}.{ext}")


def fetch_cached(url, ext='html', timeout=30):
    cache_path = get_cache_path(url, ext)
    if os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8') as f:
            return f.read()
    response = requests.get(url, timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
    response.raise_for_status()
    content = response.text
    with open(cache_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return content


def discover_hut_urls():
    print('Fetching sitemap...')
    sitemap = fetch_cached(SITEMAP_URL, ext='xml')
    urls = re.findall(r'<loc>(https://hutbagger\.co\.nz/huts/[^<]+)</loc>', sitemap)
    print(f'  Found {len(urls)} hut URLs')
    return urls


def extract_gblhut(html):
    """The hut detail page embeds a `window.gblHut = {...};` JSON blob with
    everything the Vue frontend needs (location, amenities, photos, and a
    link back to the matching DOC page if one exists)."""
    m = re.search(r'window\.gblHut = (\{.*\});', html)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def scrape_hut(url):
    try:
        html = fetch_cached(url)
    except Exception as e:
        print(f'  Error fetching {url}: {e}')
        return None
    data = extract_gblhut(html)
    if not data:
        print(f'  No gblHut data found for {url}')
    return data


def normalize(data, url):
    loc = data.get('location') or {}

    photos = []
    for p in data.get('photos') or []:
        if not p.get('large'):
            continue
        photo = {'url': p['large']}
        if p.get('comment'):
            photo['caption'] = p['comment']
        photos.append(photo)

    return {
        'hutbaggerUrl': url,
        'hutbaggerName': data.get('name'),
        'hutbaggerPark': data.get('park'),
        'hutbaggerRegion': data.get('region'),
        'hutbaggerCategory': data.get('category'),
        'hutbaggerAmenities': data.get('amenities') or [],
        'hutbaggerWaterSource': data.get('waterSource') or None,
        'hutbaggerBunks': data.get('bunks'),
        'topo50Ref': loc.get('topo50'),
        'nztmRef': loc.get('nztm'),
        'elevationM': data.get('elevation'),
        'hutbaggerNotes': data.get('notes') or None,
        'hutbaggerPhotos': photos,
        'lat': float(loc['lat']) if loc.get('lat') else None,
        'lon': float(loc['long']) if loc.get('long') else None,
        'docHutLink': data.get('docHutLink') or None,
        'removed': bool(data.get('removed')),
    }


NEW_HUT_ONLY_KEYS = (
    'hutbaggerName', 'hutbaggerPark', 'hutbaggerRegion',
    'hutbaggerCategory', 'hutbaggerBunks', 'lat', 'lon',
)

# Some hutbagger huts correspond to an existing DOC hut but aren't linked via
# docHutLink (the site's own linking is incomplete). Fall back to matching by
# name plus close proximity so these don't get added as spurious duplicates.
NAME_MATCH_MAX_METRES = 3000


def normalize_name(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


def haversine_metres(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def find_name_match(name, lat, lon, name_index, already_matched):
    candidates = name_index.get(normalize_name(name)) or []
    best, best_dist = None, None
    for hut in candidates:
        if id(hut) in already_matched:
            continue
        dist = haversine_metres(lat, lon, hut['lat'], hut['lon'])
        if dist <= NAME_MATCH_MAX_METRES and (best_dist is None or dist < best_dist):
            best, best_dist = hut, dist
    return best


def update_huts():
    ensure_cache_dir()

    with open(HUTS_JSON) as f:
        huts = json.load(f)

    static_link_index = {h['staticLink']: h for h in huts if h.get('staticLink')}

    name_index = defaultdict(list)
    for h in huts:
        if h.get('lat') is not None and h.get('lon') is not None:
            name_index[normalize_name(h['name'])].append(h)

    urls = discover_hut_urls()

    print(f'Scraping {len(urls)} hutbagger pages...')
    results = {}
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(scrape_hut, u): u for u in urls}
        done = 0
        for future in as_completed(futures):
            url = futures[future]
            done += 1
            if done % 200 == 0:
                print(f'  {done}/{len(urls)}...')
            data = future.result()
            if data:
                results[url] = data
    print(f'  Scraped {len(results)} huts successfully')

    matched = 0
    name_matched = 0
    new_huts = []
    skipped_removed = 0
    already_matched = set()

    for url, data in results.items():
        normalized = normalize(data, url)

        if normalized.pop('removed'):
            skipped_removed += 1
            continue

        doc_link = normalized.pop('docHutLink')
        matched_hut = static_link_index.get(doc_link) if doc_link else None

        if not matched_hut and normalized.get('hutbaggerName') is not None \
                and normalized.get('lat') is not None and normalized.get('lon') is not None:
            matched_hut = find_name_match(
                normalized['hutbaggerName'], normalized['lat'], normalized['lon'],
                name_index, already_matched,
            )
            if matched_hut:
                name_matched += 1

        if matched_hut:
            already_matched.add(id(matched_hut))
            for key in NEW_HUT_ONLY_KEYS:
                normalized.pop(key, None)
            matched_hut.update({
                k: v for k, v in normalized.items()
                if v not in (None, [], '')
            })
            matched += 1
        else:
            lat = normalized.pop('lat')
            lon = normalized.pop('lon')
            if lat is None or lon is None:
                continue
            new_hut = {
                'name': normalized.pop('hutbaggerName'),
                'region': normalized.pop('hutbaggerRegion'),
                'place': normalized.pop('hutbaggerPark'),
                'hutCategory': normalized.pop('hutbaggerCategory'),
                'numberOfBunks': normalized.pop('hutbaggerBunks'),
                'lat': lat,
                'lon': lon,
                **{k: v for k, v in normalized.items() if v not in (None, [], '')}
            }
            new_huts.append(new_hut)

    # hutbagger itself occasionally carries two listings for the same physical
    # hut (e.g. an old and a re-created entry); collapse near-identical
    # name+location pairs among the new (non-DOC) huts we're about to add.
    DEDUPE_MAX_METRES = 200
    deduped = []
    for hut in new_huts:
        dupe = next((
            other for other in deduped
            if normalize_name(other['name']) == normalize_name(hut['name'])
            and haversine_metres(other['lat'], other['lon'], hut['lat'], hut['lon']) <= DEDUPE_MAX_METRES
        ), None)
        if dupe:
            if len(hut.get('hutbaggerPhotos') or []) > len(dupe.get('hutbaggerPhotos') or []):
                deduped[deduped.index(dupe)] = hut
        else:
            deduped.append(hut)
    duplicate_count = len(new_huts) - len(deduped)
    new_huts = deduped

    print(f'  Matched {matched} DOC huts with hutbagger data ({name_matched} via name+distance fallback)')
    print(f'  {len(new_huts)} new non-DOC huts to add ({duplicate_count} hutbagger-internal duplicates collapsed)')
    print(f'  Skipped {skipped_removed} removed huts')

    huts.extend(new_huts)

    with open(HUTS_JSON, 'w') as f:
        json.dump(huts, f, indent=2)

    print(f'Wrote {len(huts)} total huts to {HUTS_JSON}')


if __name__ == '__main__':
    update_huts()
