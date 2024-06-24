#!/bin/bash

# mb-util from https://github.com/mapbox/mbutil/
mb-util --do_compression --scheme=tms --image_format=pbf --silent ./out/topo-stripped ./out/topographic-stripped.mbtiles
