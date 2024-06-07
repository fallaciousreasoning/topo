#!/bin/bash

NUM_PROCESSES="${NUM_PROCESSES:-12}";
DIR="${1:-$PWD}";
OUT="${2:-./out}";

# Ensure the out directory exists
if [ ! -d "$OUT" ]; then
  mkdir -p $OUT
fi

for f in $DIR/*.tif; do
    NO_EXT=${f%.*}
    NAME_ONLY=$(basename ${NO_EXT})

    INTERMEDIATE_FILE="$OUT/$NAME_ONLY.tmp.tif"
    RGB_FILE="$OUT/$NAME_ONLY.rgb.tif"

    if [ -f $RGB_FILE ]; then
        echo "Skipping $NAME_ONLY - looks like it's been processed"
        continue
    fi;
    
    # Step 1: Convert NODATA values to None and reproject
    gdalwarp \
        -t_srs EPSG:3857 \
        -dstnodata None \
        -novshiftgrid \
        -co TILED=YES \
        -co COMPRESS=DEFLATE  \
        -co BIGTIFF=IF_NEEDED \
        -r lanczos \
        $f \
        $INTERMEDIATE_FILE;

    # Step 2: Convert to RGB tif
    rio rgbify \
        -b -10000 \
        -i 0.1 \
        $INTERMEDIATE_FILE \
        $RGB_FILE;

    # Step 4: Remove tmp file to save space (I'm short on storage)
    rm $INTERMEDIATE_FILE

    # Step 5: Generate tiles
    gdal2tiles.py --zoom=14 --processes=$NUM_PROCESSES $RGB_FILE ./tiles
done;
