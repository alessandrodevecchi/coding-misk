#!/bin/sh
# The Oscilloscope look's glass masks (oscilloscope-smudge D1): each source texture becomes a 512 x 512 WebP mask,
# white with the texture's grey levels as alpha, so one mask works for every hue and theme.
#
#   sh tools/make-glass-masks.sh <sources dir> [out dir]
#
# <sources dir> holds the downloaded sources, one folder each (see public/visuals/glass/manifest.json for the URLs):
#   ambientcg-<AssetId>/<AssetId>_1K-JPG_Roughness.jpg or _Opacity.jpg  (ambientCG 1K-JPG sets, CC0)
#   commons-Fingerprint-297594/Fingerprint-297594.svg                   (Wikimedia Commons, CC0)
# Needs ImageMagick 7 (magick) with WebP. The sources are not committed; the masks are.
set -eu
SRC="${1:?sources dir}"
OUT="${2:-public/visuals/glass}"
mkdir -p "$OUT"

# mask <name> <file under SRC> <level options>
mask() {
  magick "$SRC/$2" -colorspace Gray -resize '512x512!' $3 -alpha off \( +clone \) -compose CopyOpacity -composite \
    -fill white -colorize 100 -quality 82 -define webp:alpha-quality=70 "$OUT/$1.webp"
}

mask smear001 ambientcg-Smear001/Smear001_1K-JPG_Roughness.jpg "-level 5%,95%"
mask smear003 ambientcg-Smear003/Smear003_1K-JPG_Roughness.jpg "-level 10%,90%"
mask smear005 ambientcg-Smear005/Smear005_1K-JPG_Opacity.jpg "-level 5%,95%"
mask smear007 ambientcg-Smear007/Smear007_1K-JPG_Opacity.jpg "-negate -level 20%,100%"
mask smear008 ambientcg-Smear008/Smear008_1K-JPG_Roughness.jpg "-level 35%,85%"
mask fp002 ambientcg-Fingerprints002/Fingerprints002_1K-JPG_Opacity.jpg "-level 15%,95%"
mask fp008 ambientcg-Fingerprints008/Fingerprints008_1K-JPG_Opacity.jpg "-level 25%,90%"
mask si001 ambientcg-SurfaceImperfections001/SurfaceImperfections001_1K-JPG_Opacity.jpg "-level 10%,90%"
mask si003 ambientcg-SurfaceImperfections003/SurfaceImperfections003_1K-JPG_Opacity.jpg "-level 5%,60%"
mask si008 ambientcg-SurfaceImperfections008/SurfaceImperfections008_1K-JPG_Opacity.jpg "-level 40%,100%"
mask si013 ambientcg-SurfaceImperfections013/SurfaceImperfections013_1K-JPG_Opacity.jpg "-level 5%,80%"

# the CC0 vector print: rendered, its strokes as alpha, softened
magick -background none -density 60 "$SRC/commons-Fingerprint-297594/Fingerprint-297594.svg" -resize 512x512 \
  -gravity center -extent 512x512 -alpha extract -blur 0x1.2 \( +clone \) -compose CopyOpacity -composite \
  -fill white -colorize 100 -quality 82 -define webp:alpha-quality=70 "$OUT/fpvec.webp"

ls -l "$OUT"/*.webp
