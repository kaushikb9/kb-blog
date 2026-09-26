#!/usr/bin/env bash
# Put a headshot into a skin, web-sized. macOS only (sips); the build never runs it.
#   tools/portrait.sh ~/Code/me/anime-headshot-moonlit-teal.png outie moonlit
# → skins/outie/assets/portraits/moonlit.jpg, 720px on the long side, JPEG q82.
# Originals stay in ~/Code/me; only the web copy is committed.
set -euo pipefail
src="$1"; skin="$2"; name="$3"; size="${4:-720}"
cd "$(dirname "$0")/.."
[ -f "$src" ] || { echo "no such image: $src" >&2; exit 1; }
[ -d "skins/$skin" ] || { echo "no such skin: skins/$skin (skins: $(ls skins | tr '\n' ' '))" >&2; exit 1; }
dst="skins/$skin/assets/portraits/$name.jpg"
mkdir -p "$(dirname "$dst")"
sips -Z "$size" -s format jpeg -s formatOptions 82 "$src" --out "$dst" >/dev/null
echo "$dst ($(du -h "$dst" | cut -f1))"
