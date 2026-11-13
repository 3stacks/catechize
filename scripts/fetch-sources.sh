#!/usr/bin/env bash
# Download the upstream texts into sources/cache (gitignored), pinned to commits
# so a rebuild is reproducible. Run before `npm run data`.
set -euo pipefail
cd "$(dirname "$0")/../sources"
mkdir -p cache

CREEDS=https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/2ae21a4c5387ecc91f474c9d3d67c826d2a6b9d5/creeds
WSC_PROOFS=https://raw.githubusercontent.com/ReformedDevs/hubot-wsc/7ddc6a1dc4f81cf759b5d47a2119ad1f7310d450/lib/questions.coffee
KJV=https://raw.githubusercontent.com/scrollmapper/bible_databases/e1b254cef86d0e65b1a5d1a94b8b112d0f296a2c/formats/json/KJV.json

# The coop VM proxy stalls raw.githubusercontent.com; go direct.
get() { curl -fsSL --noproxy '*' -o "$2" "$1" && echo "  $2"; }

for f in westminster_shorter_catechism westminster_larger_catechism westminster_confession_of_faith \
  heidelberg_catechism belgic_confession_of_faith canons_of_dort athanasian_creed chalcedonian_definition; do
  get "$CREEDS/$f.json" "cache/$f.json"
done
get "$WSC_PROOFS" cache/wsc-proofs.coffee
get "$KJV" cache/kjv.json
# Schaff, The Creeds of Christendom, vol. 3 (1877). Public domain. The source of
# the English Heidelberg Catechism and Belgic Confession. Only
# scripts/extract-schaff.py reads it, and it writes sources/schaff.json.
get https://ccel.org/ccel/s/schaff/creeds3.xml cache/schaff-creeds3.xml
# Luther's Large Catechism, Bente and Dau (Triglot Concordia, 1921). Public domain.
get https://www.gutenberg.org/cache/epub/1722/pg1722.txt cache/large-catechism.txt
