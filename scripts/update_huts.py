#!/bin/python3

import requests

def make_doc_request(url: str):
    return requests.get(url, headers={
        'x-api-key': 'yNyjpuXvMJ1g2d0YEpUmW7VZhePMqbCv96GRjq8L'
    }).json()

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


def download_huts():
    huts = make_doc_request("https://api.doc.govt.nz/v2/huts?coordinates=wgs84")

    count = len(huts)

    for i, hut in enumerate(huts):
        print(f'Processing hut {i+1} of {count} ({i/count*100}%)')
        add_detail(hut)


    with open('./public/data/huts.json', 'w') as f:
        import json
        data = json.dumps(huts)
        f.write(data)

download_huts()
