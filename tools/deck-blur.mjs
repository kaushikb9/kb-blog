// Edit boxes on slide images, in place. Called by tools/deck.js with
// [{file, rects:[{x0,y0,x1,y1, text?, font?}]}], coordinates as fractions of the image.
//   no text → blur the box (--blur, --blur-image)
//   band    → remove the horizontal band y0..y1: everything below moves up, and the freed
//             strip at the bottom takes the colour of the bottom row (--cut-band). Bands run last,
//             bottom-most first, so earlier coordinates stay valid.
//   text    → repaint the line: cover it with the background sampled beside it, then
//             draw the replacement in the ink colour sampled inside it, in `font` (a
//             .ttf/.otf path), sized so the ORIGINAL line set in that font would span the
//             same width (--swap). Office's bundled fonts have scrambled cmaps: don't use them.
// Headless Chromium from the shared ~/Code/node_modules/playwright: a canvas is the one
// image editor available without adding a dependency to this repo.
import fs from "fs";
import { chromium } from "playwright";

const jobs = JSON.parse(process.argv[2]);
const fonts = {};
for (const j of jobs) for (const r of j.rects) if (r.font && !fonts[r.font]) {
  if (!fs.existsSync(r.font)) { console.error(`deck-blur: font ${r.font} not found`); process.exit(1); }
  fonts[r.font] = fs.readFileSync(r.font).toString("base64");
}
const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, rects } of jobs) {
  const type = file.endsWith(".png") ? "png" : "jpeg";
  const src = `data:image/${type};base64,` + fs.readFileSync(file).toString("base64");
  const out = await page.evaluate(async ({ src, rects, fonts }) => {
    const faces = {};
    for (const [p, b64] of Object.entries(fonts)) {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const f = new FontFace("swap" + Object.keys(faces).length, bytes); await f.load(); document.fonts.add(f); faces[p] = f.family;
    }
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3));
    const order = [...rects.filter((r) => !r.band), ...rects.filter((r) => r.band).sort((a, b) => b.y0 - a.y0)];
    for (const r of order) {
      if (r.band) {
        const Y0 = Math.round(r.y0 * img.height), Y1 = Math.round(r.y1 * img.height), H = img.height;
        const below = g.getImageData(0, Y1, img.width, H - Y1);
        const fill = px(2, H - 2);
        g.putImageData(below, 0, Y0);
        g.fillStyle = `rgb(${fill})`; g.fillRect(0, H - (Y1 - Y0), img.width, Y1 - Y0);
        continue;
      }
      const X0 = r.x0 * img.width, Y0 = r.y0 * img.height, X1 = r.x1 * img.width, Y1 = r.y1 * img.height, th = Y1 - Y0;
      if (r.text === undefined) {
        const padX = 0.08 * th, padY = 0.35 * th; // little sideways padding: never touch the next word
        const x = Math.max(0, X0 - padX), y = Math.max(0, Y0 - padY);
        const w = Math.min(img.width - x, X1 - X0 + 2 * padX), h = Math.min(img.height - y, th + 2 * padY);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        g.filter = `blur(${Math.max(8, Math.round(h / 4))}px)`;
        for (let k = 0; k < 3; k++) g.drawImage(c, 0, 0); // three passes: unreadable, not just soft
        g.restore();
        continue;
      }
      const bg = px(Math.max(0, X0 - 0.25 * th), (Y0 + Y1) / 2);
      // ink: the median of the pixels that differ most from the background, which is right for
      // neutral ink (white titles); for coloured ink, the most saturated strong pixel (2026-10-03:
      // single-pixel picks came out grey on small text and tinted on large)
      const samples = [];
      for (let x = X0; x < X1; x += 1) for (let y = Y0; y < Y1; y += 1) {
        const p = px(x, y); samples.push([p, Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2])]);
      }
      const far = Math.max(...samples.map((q) => q[1]));
      const strong = samples.filter((q) => q[1] >= 0.93 * far).map((q) => q[0]);
      const med = (k) => strong.map((p) => p[k]).sort((a, b) => a - b)[strong.length >> 1];
      const chroma = (p) => Math.max(...p) - Math.min(...p);
      let ink = [med(0), med(1), med(2)];
      if (chroma(ink) > 40) // coloured ink: its truest pixel is the most saturated one, not a dark JPEG edge
        ink = samples.filter((q) => q[1] >= 0.5 * far).reduce((a, q) => (chroma(q[0]) > chroma(a) ? q[0] : a), ink);
      g.fillStyle = `rgb(${bg})`;
      g.fillRect(X0 - 0.05 * th, Y0 - 0.1 * th, (X1 - X0) + 0.1 * th, th * 1.2);
      const fam = r.font ? `"${faces[r.font]}"` : "sans-serif";
      // size from the original line's width: the old words, set in this font, must span X0..X1
      g.font = `100px ${fam}`;
      const size = r.orig ? 100 * (X1 - X0) / g.measureText(r.orig).width : th * 0.82;
      g.font = `${size.toFixed(1)}px ${fam}`;
      g.fillStyle = `rgb(${ink})`; g.textBaseline = "alphabetic";
      g.fillText(r.text, X0, Y0 + th * 0.78);
    }
    return c.toDataURL("image/jpeg", 0.82);
  }, { src, rects, fonts });
  fs.writeFileSync(file, Buffer.from(out.split(",")[1], "base64"));
  const nb = rects.filter((r) => r.band).length, nt = rects.filter((r) => r.text !== undefined).length, n = rects.length - nb - nt;
  console.log(`  ${file.split("/").pop()}: ${[n && `blurred ${n}`, nt && `repainted ${nt}`, nb && `cut ${nb} band(s)`].filter(Boolean).join(", ")}`);
}
await browser.close();
