#/bin/bash
DIR="${1:-$PWD}";
OUT="${2:-./out}";
JOINED_NAME="$OUT/ele.tif"
WARPED_NAME="$OUT/ele.warped.tif"
RGB_NAME="$OUT/ele.rgb.tif"
MBTILES_NAME="$OUT/ele.mbtiles"

# Build a list of all the input TIFs
files=""
for f in $DIR/*.tif; do
    export files="$files $f"
done;

# Only merge the TIFs if we haven't already done it.
if [ ! -f $JOINED_NAME ]; then
    # Merge all the Tifs into a Mega TIF
    gdal_merge.py -of GTiff -o $JOINED_NAME $files -co BIGTIFF=YES -co COMPRESS=DEFLATE
else
    echo "Not merging. $JOINED_NAME already exists"
fi

if [ ! -f $WARPED_NAME ]; then
    # Warp to EPSG:3857
    gdalwarp \
            -t_srs EPSG:3857 \
            -dstnodata None \
            -multi \
            -novshiftgrid \
            -co TILED=YES \
            -r lanczos \
            $JOINED_NAME \
            $WARPED_NAME \
            -co COMPRESS=DEFLATE \
            -co BIGTIFF=YES;
else
    echo "Not warping. $WARPED_NAME already exists"
fi

if [ ! -f $RGB_NAME ]; then
    rio rgbify \
        -b -10000 \
        -i 0.1 \
        $WARPED_NAME \
        $RGB_NAME;
else
    echo "Not RGBifying. $RGB_NAME already exists"
fi

if [ ! -f $MBTILES_NAME ]; then
    gdal_translate -co ZOOM_LEVEL_STRATEGY=LOWER -of MBTiles $RGB_NAME $MBTILES_NAME
    gdaladdo $MBTILES_NAME 2 4 8 16 32 64 128
else
    echo "Not making MBTiles. $MBTILES_NAME already exists"
fi
