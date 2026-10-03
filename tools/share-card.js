#!/usr/bin/env node
// The share card: the 1200×630 image X, LinkedIn and Slack show when someone
// posts a kaushik.sh link (og:image / twitter:image, printed by core/render.js).
// One card for the whole site, drawn like the live skin's home hero: the
// greeting, the lede, the day portrait. Rerun after a skin swap or a new lede:
//
//   node tools/share-card.js            → assets/share.png
//
// Headless Chromium from the shared ~/Code/node_modules/playwright, like
// tools/deck-blur.mjs (set PLAYWRIGHT=<path> to use another copy).
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
const skinDir = path.join(ROOT, "skins", site.live, "assets");
const lede = matter(fs.readFileSync(path.join(ROOT, "content/home.md"), "utf8")).data.lede || "";
const b64 = (f) => fs.readFileSync(path.join(skinDir, f)).toString("base64");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const html = `<!doctype html><html><head><style>
@font-face { font-family: B; src: url(data:font/woff2;base64,${b64("fonts/bricolage-grotesque.woff2")}) format("woff2"); font-weight: 200 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #1d3ec4; color: #fff; font-family: B, sans-serif;
  display: grid; grid-template-columns: 1fr 400px; gap: 56px; align-items: center; padding: 0 80px; }
h1 { font-size: 112px; font-weight: 800; line-height: 0.92; letter-spacing: -0.045em; }
h1 em { font-style: normal; color: #ffcf33; display: block; }
p { margin-top: 30px; font-size: 32px; line-height: 1.3; color: #e6ebff; max-width: 600px; }
.url { margin-top: 34px; display: inline-block; background: #ffcf33; color: #10173a; font-weight: 700;
  font-size: 28px; padding: 8px 22px; border-radius: 999px; }
img { width: 400px; height: 400px; object-fit: cover; border-radius: 34px; border: 5px solid #10173a; }
</style></head><body>
<div><h1>Hi, I'm <em>Kaushik.</em></h1><p>${esc(lede)}</p><span class="url">kaushik.sh</span></div>
<img src="data:image/jpeg;base64,${b64("portraits/day.jpg")}">
</body></html>`;

(async () => {
  const pw = process.env.PLAYWRIGHT || path.join(process.env.HOME, "Code/node_modules/playwright");
  const { chromium } = require(pw);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, "assets/share.png");
  await p.screenshot({ path: out });
  await b.close();
  console.log(`wrote ${path.relative(ROOT, out)}`);
})();
