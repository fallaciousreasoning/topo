#!/bin/python3

import requests
from bs4 import BeautifulSoup
from collections import defaultdict, Counter, OrderedDict
import re
import json
import os
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

CACHE_DIR = '.cache/hunting'
BASE_URL = 'https://www.doc.govt.nz'
SITEMAP_URL = 'https://www.doc.govt.nz/sitemap.xml'
HUNTING_BASE = '/parks-and-recreation/things-to-do/hunting/where-to-hunt/'

ARCGIS_BASE = (
    'https://services1.arcgis.com/3JjYDyG3oajxU6HO/arcgis/rest/services'
    '/DOC_Recreational_Hunting_Permit_Areas/FeatureServer/0'
)

# Generic placeholder image hash used by DOC when no real image is set
PLACEHOLDER_HASHES = {'8d6c7aa9154f48d3996231cb57e7da87'}

# Blocks whose DOC URL can't be inferred from the name (e.g. Māori name dropped from slug)
MANUAL_URL_OVERRIDES = {
    ('Greymouth - Mawheranui', 'Greymouth - Mawheranui'):
        BASE_URL + HUNTING_BASE + 'west-coast/greymouth-hunting/',
    ('Franz Josef - Waiau', 'Franz Josef - Waiau'):
        BASE_URL + HUNTING_BASE + 'west-coast/franz-josef-hunting/',
    ('Buller - Kawatiri', 'Buller - Kawatiri'):
        BASE_URL + HUNTING_BASE + 'west-coast/buller-hunting/',
}

STOP_WORDS = {'the', 'of', 'and', 'in', 'a', 'to', 'at', 'by', 'for', 'with'}


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
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    content = response.text
    with open(cache_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return content


# ─── ArcGIS feature fetch ────────────────────────────────────────────────────

def fetch_arcgis_features():
    """
    Fetch all features from the DOC hunting permit areas ArcGIS Feature Service.
    Returns a list of GeoJSON features.
    """
    page_size = 100
    offset = 0
    all_features = []

    # Get total count
    r = requests.get(ARCGIS_BASE + '/query', params={
        'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'
    }, timeout=30)
    total = r.json()['count']
    print(f'  {total} features in ArcGIS service')

    while offset < total:
        cache_key = f'arcgis_page_{offset}'
        cache_path = os.path.join(CACHE_DIR, f'{cache_key}.json')

        if os.path.exists(cache_path):
            with open(cache_path) as f:
                page = json.load(f)
        else:
            print(f'  Fetching features {offset}–{offset + page_size - 1}...')
            r = requests.get(ARCGIS_BASE + '/query', params={
                'where': '1=1',
                'outFields': '*',
                'resultOffset': offset,
                'resultRecordCount': page_size,
                'f': 'geojson',
                'outSR': '4326',
            }, timeout=120)
            r.raise_for_status()
            page = r.json()
            with open(cache_path, 'w') as f:
                json.dump(page, f)

        all_features.extend(page.get('features', []))
        offset += page_size

    print(f'  Fetched {len(all_features)} features')
    return all_features


# ─── URL discovery ───────────────────────────────────────────────────────────

def to_slug(name):
    s = name.lower()
    s = re.sub(r"[''']", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def slug_tokens(slug):
    return {t for t in slug.split('-') if t and t not in STOP_WORDS}


def url_region(url):
    return url.replace(BASE_URL + HUNTING_BASE, '').rstrip('/').split('/')[0]


def url_last_slug(url):
    return url.rstrip('/').split('/')[-1]


def url_depth(url):
    path = url.replace(BASE_URL + HUNTING_BASE, '').rstrip('/')
    return len(path.split('/'))


def discover_hunt_block_urls():
    print('Fetching sitemap...')
    sitemap = fetch_cached(SITEMAP_URL, ext='xml')
    pattern = re.compile(
        r'<loc>(' + re.escape(BASE_URL + HUNTING_BASE) + r'[^<]+)</loc>'
    )
    all_urls = pattern.findall(sitemap)
    leaf_urls = [
        u for u in all_urls
        if url_depth(u) >= 2 and url_last_slug(u) != 'where-to-hunt'
    ]
    print(f'  Found {len(leaf_urls)} potential hunt block URLs in sitemap')
    return leaf_urls


def build_slug_index(leaf_urls):
    slug_to_urls = defaultdict(list)
    for u in leaf_urls:
        slug_to_urls[url_last_slug(u)].append(u)
    return dict(slug_to_urls)


# ─── Matching ────────────────────────────────────────────────────────────────

def permit_area_score(permit_area, url):
    pa_tokens = slug_tokens(to_slug(permit_area))
    path = url.replace(BASE_URL + HUNTING_BASE, '').lower()
    path_tokens = set(re.split(r'[/-]', path)) - STOP_WORDS
    return len(pa_tokens & path_tokens)


def pick_best(candidates, permit_area):
    if len(candidates) == 1:
        return candidates[0]
    return max(candidates, key=lambda u: permit_area_score(permit_area, u))


SLUG_SUFFIXES = [
    '-hunting', '-area', '-bird-hunting', '-possum-hunting-permit',
    '-hunting-area', '-scenic-reserve', '-conservation-area',
]


def slug_match(name, permit_area, slug_to_urls):
    slug = to_slug(name)
    for candidate in [slug] + [slug + s for s in SLUG_SUFFIXES]:
        hits = slug_to_urls.get(candidate, [])
        if hits:
            return pick_best(hits, permit_area)
    return None


def token_containment_match(name, permit_area, leaf_urls, pa_to_region):
    region = pa_to_region.get(permit_area)
    name_tokens = slug_tokens(to_slug(name))
    if not name_tokens:
        return None
    candidates = []
    for u in leaf_urls:
        if region and url_region(u) != region:
            continue
        url_toks = slug_tokens(url_last_slug(u))
        if name_tokens <= url_toks:
            extra = len(url_toks - name_tokens)
            candidates.append((extra, u))
    if candidates:
        candidates.sort()
        return candidates[0][1]
    return None


def fetch_title(url):
    try:
        html = fetch_cached(url)
    except Exception:
        return url, None
    soup = BeautifulSoup(html, 'html.parser')
    tag = soup.find('meta', {'property': 'og:title'})
    title = tag['content'].strip() if tag and tag.get('content') else None
    return url, title


def build_title_index(unmatched_urls):
    print(f'  Fetching titles for {len(unmatched_urls)} unmatched URLs...')
    title_index = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fetch_title, u): u for u in unmatched_urls}
        done = 0
        for future in as_completed(futures):
            url, title = future.result()
            done += 1
            if done % 100 == 0:
                print(f'    {done}/{len(unmatched_urls)}...')
            if not title:
                continue
            clean = re.sub(r'\s+hunting$', '', title, flags=re.I).strip()
            region = url_region(url)
            title_index[(region, to_slug(clean))] = url
            title_index[(region, to_slug(title))] = url
    print(f'  Built title index with {len(title_index)} entries')
    return title_index


def title_match(name, permit_area, title_index, pa_to_region):
    region = pa_to_region.get(permit_area)
    if not region:
        return None
    name_slug = to_slug(name)
    url = title_index.get((region, name_slug))
    if url:
        return url
    for suffix in SLUG_SUFFIXES:
        url = title_index.get((region, name_slug + suffix))
        if url:
            return url
    name_tokens = slug_tokens(name_slug)
    if not name_tokens:
        return None
    candidates = []
    for (r, t_slug), u in title_index.items():
        if r != region:
            continue
        t_tokens = slug_tokens(t_slug)
        if name_tokens <= t_tokens:
            extra = len(t_tokens - name_tokens)
            candidates.append((extra, u))
    if candidates:
        candidates.sort()
        return candidates[0][1]
    return None


# ─── Scraping ────────────────────────────────────────────────────────────────

IGNORE_HEADINGS = {
    'page-level feedback',
    'help us improve this webpage',
    'stay safe when crossing rivers',
    'stay safe when crossing rivers and streams',
    'pesticide information',
    'prohibited firearms',
    'wasp season',
    'wasps',
    'map',
    'maps',
    'huts',
}


def is_placeholder_image(url):
    match = re.search(r'/([a-f0-9]{32})\.(gif|aspx|jpg|png)', url, re.I)
    return match and match.group(1).lower() in PLACEHOLDER_HASHES


def section_text(heading_el):
    """Collect all text content under a heading until the next same/higher heading."""
    parts = []
    for sib in heading_el.find_next_siblings():
        if sib.name in ('h2', 'h3'):
            break
        text = sib.get_text(separator=' ', strip=True)
        if text:
            parts.append(text)
    return '\n\n'.join(parts).strip()


def scrape_hunt_block(url):
    try:
        html = fetch_cached(url)
    except Exception as e:
        print(f'  Error fetching {url}: {e}')
        return {}

    soup = BeautifulSoup(html, 'html.parser')
    result = {}

    def meta(name=None, prop=None):
        tag = soup.find('meta', {'name': name} if name else {'property': prop})
        return tag['content'].strip() if tag and tag.get('content') else None

    # Short intro from meta
    description = meta(name='Description') or meta(prop='og:description')
    if description:
        result['introduction'] = description

    # Hero image (skip generic placeholder)
    image_url = meta(prop='og:image') or meta(name='idio:IntroductionThumbnailSmall')
    if image_url and not is_placeholder_image(image_url):
        result['heroImage'] = image_url

    # Extract named sections
    about_parts = []
    for heading in soup.find_all(['h2', 'h3']):
        title = heading.get_text(strip=True)
        title_lower = title.lower()

        if not title or 'department' in title_lower or 'javascript' in title_lower:
            continue
        if title_lower in IGNORE_HEADINGS:
            continue

        content = section_text(heading)
        if not content:
            continue

        if title_lower == 'about this hunting block':
            about_parts.insert(0, content)
        elif title_lower == 'general information':
            about_parts.append(content)
        elif title_lower == 'access':
            result['access'] = content
        elif title_lower in ('landholders', 'private land access'):
            # Append landholder detail to access
            existing = result.get('access', '')
            result['access'] = (existing + '\n\n' + content).strip()
        elif title_lower == 'dogs':
            result['dogs'] = content
        elif title_lower in ('no hunting zones', 'no hunting/shooting zones'):
            result['noHuntingZones'] = content

    if about_parts:
        result['about'] = '\n\n'.join(about_parts)

    return result


# ─── Main ────────────────────────────────────────────────────────────────────

def download_hunting():
    ensure_cache_dir()

    # Step 1: fetch all features from ArcGIS
    print('Fetching features from ArcGIS...')
    features = fetch_arcgis_features()

    # Step 2: discover DOC web URLs
    leaf_urls = discover_hunt_block_urls()
    slug_to_urls = build_slug_index(leaf_urls)

    # Step 3: match each feature to a DOC web page
    unique_keys = list(OrderedDict.fromkeys(
        (f['properties']['HuntBlockName'], f['properties']['PermitArea'])
        for f in features
        if f['properties'].get('PermitArea')
    ))
    print(f'\nMatching {len(unique_keys)} unique blocks to DOC pages...')

    # Apply manual overrides first
    match_results = {}
    for key, url in MANUAL_URL_OVERRIDES.items():
        if key in dict.fromkeys(unique_keys):
            match_results[key] = url
    manual = sum(1 for v in match_results.values() if v)
    if manual:
        print(f'  Manual overrides: {manual}')

    # Pass 1: slug match
    print('  Pass 1: slug matching...')
    for name, pa in unique_keys:
        if (name, pa) not in match_results:
            match_results[(name, pa)] = slug_match(name, pa, slug_to_urls)
    p1 = sum(1 for v in match_results.values() if v)
    print(f'    {p1} matches')

    # Build PA → region map from pass-1 results
    pa_region_votes = defaultdict(list)
    for (name, pa), url in match_results.items():
        if url:
            pa_region_votes[pa].append(url_region(url))
    pa_to_region = {
        pa: Counter(rs).most_common(1)[0][0]
        for pa, rs in pa_region_votes.items()
    }

    # Pass 2: token containment
    print('  Pass 2: token-containment matching...')
    p2 = 0
    for name, pa in unique_keys:
        if match_results[(name, pa)]:
            continue
        url = token_containment_match(name, pa, leaf_urls, pa_to_region)
        if url:
            match_results[(name, pa)] = url
            p2 += 1
    print(f'    +{p2} ({p1 + p2} total)')

    # Pass 3: title match
    print('  Pass 3: title matching...')
    already_matched = set(filter(None, match_results.values()))
    unmatched_urls = [u for u in leaf_urls if u not in already_matched]
    title_index = build_title_index(unmatched_urls)
    p3 = 0
    for name, pa in unique_keys:
        if match_results[(name, pa)]:
            continue
        url = title_match(name, pa, title_index, pa_to_region)
        if url:
            match_results[(name, pa)] = url
            p3 += 1
    total_matched = sum(1 for v in match_results.values() if v)
    print(f'    +{p3} ({total_matched} total)')

    # Step 4: scrape matched pages
    print('\nScraping matched pages...')
    urls_to_scrape = sorted(set(filter(None, match_results.values())))
    scraped = {}
    for url in urls_to_scrape:
        scraped[url] = scrape_hunt_block(url)

    # Step 5: build output GeoJSON
    output_features = []
    for feat in features:
        props = feat['properties']
        name = props.get('HuntBlockName', '')
        pa = props.get('PermitArea', '')

        url = match_results.get((name, pa))
        page_data = scraped.get(url, {}) if url else {}

        output_props = {
            'name': name,
            'permitArea': pa,
            'blockId': props.get('BlockID'),
            'blockType': props.get('BlockType'),
            'status': props.get('HuntStatus'),
            'ha': props.get('Ha'),
        }

        if url:
            output_props['docUrl'] = url

        # Scraped content — prefer DOC page values over generic ArcGIS placeholders
        for field in ('introduction', 'heroImage', 'about', 'access', 'dogs', 'noHuntingZones'):
            val = page_data.get(field)
            if val:
                output_props[field] = val

        # Fall back to ArcGIS conditions only if DOC page didn't provide them
        for arcgis_key, output_key in [
            ('DateConditions', 'dateConditions'),
            ('AccessConditions', 'accessConditions'),
            ('DogConditions', 'dogConditions'),
            ('SpecialConditions', 'specialConditions'),
        ]:
            arcgis_val = props.get(arcgis_key)
            if arcgis_val and arcgis_val.lower() != 'refer to doc website':
                output_props[output_key] = arcgis_val

        output_features.append({
            'type': 'Feature',
            'geometry': feat['geometry'],
            'properties': output_props,
        })

    geojson = {
        'type': 'FeatureCollection',
        'features': output_features,
    }

    with open('./public/data/hunting.json', 'w') as f:
        json.dump(geojson, f)

    print(f'\nWrote {len(output_features)} features to public/data/hunting.json')
    unmatched = [name for (name, pa), url in match_results.items() if not url]
    if unmatched:
        print(f'{len(unmatched)} blocks with no DOC page match')


download_hunting()
