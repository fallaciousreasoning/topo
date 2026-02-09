#!/bin/python3

import requests
from bs4 import BeautifulSoup
import re
import json
import os
import hashlib

CACHE_DIR = '.cache/huts'

def ensure_cache_dir():
    """Create cache directory if it doesn't exist"""
    os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_path(url: str, ext: str = 'json'):
    """Generate cache file path from URL"""
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{url_hash}.{ext}")

def make_doc_request(url: str):
    """Make DOC API request with caching"""
    cache_path = get_cache_path(url, 'json')

    # Try to load from cache
    if os.path.exists(cache_path):
        with open(cache_path, 'r') as f:
            return json.load(f)

    # Fetch from API
    response = requests.get(url, headers={
        'x-api-key': 'yNyjpuXvMJ1g2d0YEpUmW7VZhePMqbCv96GRjq8L'
    }).json()

    # Cache the response
    with open(cache_path, 'w') as f:
        json.dump(response, f, indent=2)

    return response

def scrape_hut_page(url: str):
    """Scrape hero image, webcams, and gallery from DOC hut page with caching"""
    cache_path = get_cache_path(url, 'html')

    try:
        # Try to load HTML from cache
        if os.path.exists(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
        else:
            # Fetch from web
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            html_content = response.text

            # Cache the HTML
            with open(cache_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

        soup = BeautifulSoup(html_content, 'html.parser')
        result = {}

        # Find hero image
        hero_img = soup.find('img', class_=re.compile(r'hero__image'))
        if hero_img and hero_img.get('src'):
            src = hero_img['src']
            # Convert relative URLs to absolute
            if src.startswith('/'):
                src = 'https://www.doc.govt.nz' + src
            result['heroImage'] = src

        # Find all webcams (there might be multiple)
        webcam_imgs = soup.find_all('img', src=re.compile(r'photosentinel\.com\.au'))
        if webcam_imgs:
            webcam_urls = []
            for webcam_img in webcam_imgs:
                if webcam_img.get('src'):
                    webcam_urls.append(webcam_img['src'])

            if len(webcam_urls) == 1:
                result['webcamUrl'] = webcam_urls[0]
            elif len(webcam_urls) > 1:
                result['webcamUrls'] = webcam_urls

        # Find gallery images (doc-fancy-image custom elements)
        fancy_images = soup.find_all('doc-fancy-image')
        if fancy_images:
            gallery = []
            for fancy_img in fancy_images:
                src = fancy_img.get('src')
                if src:
                    # Convert relative URLs to absolute
                    if src.startswith('/'):
                        src = 'https://www.doc.govt.nz' + src

                    image_data = {'url': src}

                    # Include caption if available
                    caption = fancy_img.get('caption')
                    if caption:
                        image_data['caption'] = caption

                    gallery.append(image_data)

            if gallery:
                result['gallery'] = gallery

        return result
    except Exception as e:
        print(f"  Error scraping page: {e}")
        return {}

def add_detail(hut):
    hut_id = hut['assetId']

    detail = make_doc_request(f"https://api.doc.govt.nz/v2/huts/{hut_id}/detail?coordinates=wgs84")

    if 'bookable' in detail and detail['bookable']:
        hut['bookable'] = True

    copy_over = [
        'facilities',
        'numberOfBunks',
        'hutCategory',
        'proximityToRoadEnd',
        'introduction',
        'introductionThumbnail',
        'staticLink',
        'place'
    ]

    for key in copy_over:
        if not key in detail: continue
        hut[key] = detail[key]

    # Scrape additional data from the DOC page
    if 'staticLink' in hut and hut['staticLink']:
        print(f"  Scraping {hut['staticLink']}")
        scraped_data = scrape_hut_page(hut['staticLink'])
        hut.update(scraped_data)


def download_huts():
    ensure_cache_dir()

    huts = make_doc_request("https://api.doc.govt.nz/v2/huts?coordinates=wgs84")

    count = len(huts)

    for i, hut in enumerate(huts):
        print(f'Processing hut {i+1} of {count} ({i/count*100:.1f}%)')
        add_detail(hut)


    with open('./public/data/huts.json', 'w') as f:
        data = json.dumps(huts, indent=2)
        f.write(data)

download_huts()
