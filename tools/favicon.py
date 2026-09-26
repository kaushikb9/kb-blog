#!/usr/bin/env python3
"""The site icon: "kb" in Bricolage Grotesque 800 (Outie's heading face), kept quiet.

The tab icon (icon.svg) is the bare letters, no tile: navy in a light browser, cream in a dark
one (a prefers-color-scheme rule inside the SVG). KB, 2026-09-26: a cobalt tile was "very in
your face". Everything that must have a background (favicon.ico for browsers that skip SVG,
the home-screen icons) is cream letters on a navy tile, the quietest version with a ground.

    python3 tools/favicon.py      → assets/icon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png

A favicon can't load a web font, so the letters are outlines: tools/favicon-glyphs.json holds
"k", "b" and "." extracted once with fontTools at weight 800 and optical size 12 (the small-text
cut: wider, more open, which is what survives 16px). Regenerating needs no fontTools, only
macOS sips. Tuned per use: tabs get the biggest letters, the maskable icon keeps them in
Android's safe circle, apple-touch is full-bleed because iOS rounds the corners itself.
"""
import json, os, struct, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = json.load(open(os.path.join(ROOT, "tools", "favicon-glyphs.json")))["glyphs"]
INK, PAPER = "#10173a", "#f1ead8"   # Outie's ink, and its dark-theme type

def svg(height, rx, track=-30, size=64, bare=False):
    k, b = G["k"], G["b"]
    s = height / 734.0                       # ascender (720) to overshoot (-14)
    bx = k["adv"] + track
    x0, x1 = k["bounds"][0], bx + b["bounds"][2]
    tx = (size - (x1 - x0) * s) / 2 - x0 * s
    ty = (size + height) / 2 - 14 * s
    g = lambda d, dx: f'<path transform="translate({tx + dx*s:.2f} {ty:.2f}) scale({s:.5f} {-s:.5f})" d="{d}"/>'
    if bare:  # letters only; colour follows the browser's theme
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}"><style>path{{fill:{INK}}}'
                f'@media (prefers-color-scheme:dark){{path{{fill:{PAPER}}}}}</style>{g(k["d"], 0)}{g(b["d"], bx)}</svg>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" rx="{rx}" fill="{INK}"/><g fill="{PAPER}">{g(k["d"], 0)}{g(b["d"], bx)}</g></svg>')

def png(svg_text, px, out):
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f: f.write(svg_text)
    subprocess.run(["sips", "-s", "format", "png", "-z", str(px), str(px), f.name, "--out", out], check=True, capture_output=True)
    os.unlink(f.name)

A = lambda n: os.path.join(ROOT, "assets", n)
tab, tile, large, apple, mask = svg(38, 0, bare=True), svg(34, 14), svg(30, 14), svg(30, 0), svg(24, 0)
open(A("icon.svg"), "w").write(tab)
png(apple, 180, A("apple-touch-icon.png"))
png(large, 192, A("icon-192.png")); png(large, 512, A("icon-512.png"))
png(mask, 512, A("icon-maskable-512.png"))
pngs = []
for px in (16, 32, 48):
    p = os.path.join(tempfile.gettempdir(), f"kb-ico-{px}.png"); png(tile, px, p); pngs.append((px, open(p, "rb").read()))
off, dirs, body = 6 + 16 * len(pngs), b"", b""
for px, data in pngs:
    dirs += struct.pack("<BBBBHHII", px, px, 0, 0, 1, 32, len(data), off + len(body)); body += data
open(A("favicon.ico"), "wb").write(struct.pack("<HHH", 0, 1, len(pngs)) + dirs + body)
print("assets/: icon.svg, favicon.ico (16/32/48), apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png")
