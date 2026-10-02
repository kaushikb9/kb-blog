#!/usr/bin/env node
// A self-contained HTML deck → the public copy a talk page embeds.
//
//   node tools/deck.js <source.html> content/talks/<slug>/slides.html [--drop 2,3,4] [--cut <regex>]…
//       [--swap "<regex>=><text>"]… [--blur-image "<n>:<x0>,<y0>,<x1>,<y1>"]…
//   node tools/deck.js <source.pdf> … --pages 1,3 [--titles "A|B"] [--blur <regex>]… [--swap "<regex>=><text>@<font.ttf>"]…
//       [--cut-band "<n>:<y0>,<y1>"]…
// Every edit refuses when it matches nothing. The redaction recipes in use are in CLAUDE.md (Talks).
//
// What it does, in order, and it refuses (exit 1) if any step finds nothing to do
// where it expected something, so a deck with a different shape fails loudly:
//   1. strips every speaker note (<aside class="notes">…</aside>) and the notes panel
//   2. drops the slides named by --drop (numbers as presented, 1-based)
//   3. removes anything matching each --cut regex (dotall), e.g. one dashboard figure
//   4. renumbers what is left (id, data-n, the page number in the footer)
//   5. adds the embed shim: inside the talk page's viewer the deck hides its own
//      controls, fills the frame, reports every slide change to the parent
//      ({deck:{n,total,title}}) and obeys {deckGo:n}. Opened on its own it is unchanged.
// The source deck stays where it is (iCloud Drive "On the Stage/", which me.json names as icloud:…); only the scrubbed copy
// enters this repo. check.sh re-checks the copy: no notes, no private names.
const fs = require("fs");

const [src, out, ...rest] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node tools/deck.js <source.html|pdf> <out.html> [--drop 2,3] [--cut <regex>] [--swap ...] [--blur-image ...] | [--pages ...] [--titles ...] [--blur ...] (see the header)"); process.exit(1); }
const die = (msg) => { console.error(`deck.js: ${msg}`); process.exit(1); };
const drop = new Set();
const cuts = [];
const blurs = []; // PDF only: words to blur on the rendered pages (KB, 2026-10-03: product names)
const swaps = []; // both: replace matching text; on a PDF page image the line is repainted in the given font
const bands = []; // PDF only: remove a horizontal band from a page (KB, 2026-10-03: drop a line, trim a box)
const blurImages = []; // HTML only: blur a box on a slide's embedded screenshot (KB, 2026-10-03: a colleague's handle)
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--drop") rest[++i].split(",").forEach((n) => drop.add(+n));
  else if (rest[i] === "--cut") cuts.push(new RegExp(rest[++i], "gs"));
  else if (rest[i] === "--blur") blurs.push(new RegExp(rest[++i], "i"));
  else if (rest[i] === "--swap") { // "<regex>=><replacement>[@<font file>]"; the font is for PDF page images only
    const [pat, rhs] = rest[++i].split("=>"); const [to, font] = (rhs ?? "").split("@");
    if (!pat || to === undefined) die(`--swap needs "<regex>=><text>", got ${rest[i]}`);
    swaps.push({ re: new RegExp(pat, "g"), to, font: font || null });
  } else if (rest[i] === "--cut-band") { // PDF: "<slide as published>:<y0>,<y1>" fractions of the height; the band goes, what's below moves up
    const [n, box] = rest[++i].split(":"); const [y0, y1] = box.split(",").map(Number);
    if (!(y0 >= 0 && y1 > y0 && y1 <= 1)) die(`--cut-band ${rest[i]}: needs 0 <= y0 < y1 <= 1`);
    bands.push({ n: +n, y0, y1 });
  } else if (rest[i] === "--blur-image") { // HTML: "<slide as published>:<x0>,<y0>,<x1>,<y1>" as fractions of the slide's first image
    const [n, box] = rest[++i].split(":"); const [x0, y0, x1, y1] = box.split(",").map(Number);
    blurImages.push({ n: +n, rect: { x0, y0, x1, y1 } });
  }
}

// A PDF deck (exported slides, often image-only) → an image deck that speaks the
// same protocol to the viewer. Only the pages named by --pages are rendered, so a
// subset is the default, and the PDF's text never ships (placeholders, notes).
//   node tools/deck.js <deck.pdf> content/talks/<slug>/slides.html --pages 1,5,6 [--titles "A|B|C"] [--blur <regex>]…
// Titles feed the viewer's rail; without --titles each page's first line of text is used.
// --blur finds every text line on the chosen pages that matches (pdftotext -bbox-layout), blurs
// those boxes on the rendered image, and refuses if a pattern matches nothing. The blur runs in
// headless Chromium (~/Code/node_modules/playwright, shared across repos), because the image
// edit needs a canvas and nothing else here has one. Image-only pages have no text to match.
if (/\.pdf$/i.test(src)) {
  const path = require("path");
  const { execFileSync } = require("child_process");
  const i = rest.indexOf("--pages");
  if (i < 0) die("a PDF needs --pages (the subset to publish, 1-based, in order)");
  const pages = rest[i + 1].split(",").map(Number);
  const t = rest.indexOf("--titles");
  const given = t >= 0 ? rest[t + 1].split("|") : [];
  if (given.length && given.length !== pages.length) die(`--titles has ${given.length} entries for ${pages.length} pages`);
  const total = +execFileSync("pdfinfo", [src]).toString().match(/Pages:\s+(\d+)/)[1];
  for (const p of pages) if (!(p >= 1 && p <= total)) die(`--pages ${p}: the PDF has ${total} pages`);
  const dir = path.dirname(out);
  for (const f of fs.readdirSync(dir)) if (/^slide-\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(dir, f)); // a re-run replaces the set
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slides = pages.map((p, k) => {
    const name = `slide-${String(k + 1).padStart(2, "0")}`;
    execFileSync("pdftoppm", ["-f", p, "-l", p, "-jpeg", "-jpegopt", "quality=82", "-scale-to", "1600", "-singlefile", src, path.join(dir, name)].map(String));
    const text = execFileSync("pdftotext", ["-f", p, "-l", p, src, "-"].map(String)).toString().split("\n").map((x) => x.trim()).find(Boolean) || "";
    const title = given[k] || text;
    if (!title) die(`page ${p} has no text to title it; pass --titles`);
    return { img: `${name}.jpg`, title, page: p };
  });
  for (const b of bands) if (!(b.n >= 1 && b.n <= slides.length)) die(`--cut-band ${b.n}: the deck has ${slides.length} slides`);
  if (blurs.length || swaps.length || bands.length) {
    const hits = blurs.map(() => 0), shits = swaps.map(() => 0), jobs = [];
    for (const s of slides) {
      const xml = execFileSync("pdftotext", ["-bbox-layout", "-f", s.page, "-l", s.page, src, "-"].map(String)).toString();
      const pw = +xml.match(/<page width="([\d.]+)"/)[1], ph = +xml.match(/<page[^>]* height="([\d.]+)"/)[1];
      const rects = [];
      for (const line of xml.match(/<line[^>]*>[\s\S]*?<\/line>/g) || []) {
        const words = [...line.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)];
        let at = 0; const spans = words.map((w) => { const a = at; at += w[5].length + 1; return [a, a + w[5].length]; });
        const text = words.map((w) => w[5]).join(" ");
        blurs.forEach((re, b) => {
          for (const m of text.matchAll(new RegExp(re.source, "gi"))) { // only the matched words, not the whole line
            const ws = words.filter((w, k) => spans[k][0] < m.index + m[0].length && spans[k][1] > m.index);
            if (!ws.length) continue;
            hits[b]++;
            rects.push({ x0: Math.min(...ws.map((w) => +w[1])) / pw, y0: Math.min(...ws.map((w) => +w[2])) / ph,
                         x1: Math.max(...ws.map((w) => +w[3])) / pw, y1: Math.max(...ws.map((w) => +w[4])) / ph });
          }
        });
      }
      for (const line of xml.match(/<line[^>]*>[\s\S]*?<\/line>/g) || []) {
        const words = [...line.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)];
        const text = words.map((w) => w[5]).join(" ");
        swaps.forEach((sw, b) => {
          if (!new RegExp(sw.re.source).test(text)) return;
          shits[b]++; // the whole line is repainted, so text after the match never collides with a longer replacement
          rects.push({ x0: Math.min(...words.map((w) => +w[1])) / pw, y0: Math.min(...words.map((w) => +w[2])) / ph,
                       x1: Math.max(...words.map((w) => +w[3])) / pw, y1: Math.max(...words.map((w) => +w[4])) / ph,
                       text: text.replace(new RegExp(sw.re.source, "g"), sw.to), orig: text, font: sw.font });
        });
      }
      for (const b of bands) if (b.n === slides.indexOf(s) + 1) rects.push({ band: true, y0: b.y0, y1: b.y1 });
      if (rects.length) jobs.push({ file: path.join(dir, s.img), rects });
      for (const sw of swaps) s.title = s.title.replace(new RegExp(sw.re.source, "g"), sw.to);
      if (rects.length) s.title = blurs.reduce((t, re) => t.replace(new RegExp(re.source, "gi"), "…"), s.title);
    }
    blurs.forEach((re, b) => { if (!hits[b]) die(`--blur ${re.source}: matched no text on pages ${pages.join(",")}`); });
    swaps.forEach((sw, b) => { if (!shits[b]) die(`--swap ${sw.re.source}: matched no line on pages ${pages.join(",")}`); });
    const blurScript = path.join(__dirname, "deck-blur.mjs");
    execFileSync("node", [blurScript, JSON.stringify(jobs)], { stdio: "inherit" });
  }
  fs.writeFileSync(out, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(slides[0].title)}</title>
<!-- made by tools/deck.js from a PDF: pages ${pages.join(", ")} of ${total} -->
<style>
html,body{height:100%;margin:0;background:#111}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
.slide{display:none;margin:0;width:100%;height:100%;align-items:center;justify-content:center}
.slide.on{display:flex}
.slide img{max-width:100%;max-height:100%;display:block}
.slide h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.nav{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;font:14px system-ui,sans-serif;color:#ddd;background:rgba(0,0,0,.55);padding:6px 10px;border-radius:99px}
.nav button{background:none;border:1px solid #666;color:#ddd;width:30px;height:30px;border-radius:50%;cursor:pointer}
/* embedded in a talk page: the viewer's bar replaces ours */
html.embed .nav{display:none}
html.embed body{background:transparent}
</style>
</head>
<body>
<div id="stage">
${slides.map((s, k) => `<section class="slide${k ? "" : " on"}" id="s${k + 1}" data-n="${String(k + 1).padStart(2, "0")}"><h2>${esc(s.title)}</h2><img src="${s.img}" alt="Slide ${k + 1}: ${esc(s.title)}"${k ? ` loading="lazy"` : ""}></section>`).join("\n")}
</div>
<div class="nav"><button type="button" data-d="-1" aria-label="Previous slide">‹</button><span id="pn">1 / ${slides.length}</span><button type="button" data-d="1" aria-label="Next slide">›</button></div>
<script>
(function(){
  const EMB=window.self!==window.top;if(EMB)document.documentElement.classList.add('embed');
  const slides=[...document.querySelectorAll('.slide')];
  let i=Math.max(0,Math.min(slides.length-1,(parseInt(location.hash.slice(1),10)||1)-1));
  function go(n){
    i=Math.max(0,Math.min(slides.length-1,n));
    slides.forEach((s,k)=>s.classList.toggle('on',k===i));
    document.getElementById('pn').textContent=(i+1)+' / '+slides.length;
    if(!EMB){try{history.replaceState(null,'','#'+(i+1));}catch(e){}}
    if(EMB){try{parent.postMessage({deck:{n:i+1,total:slides.length,title:slides[i].querySelector('h2').textContent}},location.origin);}catch(e){}}
  }
  document.querySelector('.nav').addEventListener('click',e=>{const b=e.target.closest('button');if(b)go(i+ +b.dataset.d);});
  window.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown',' ','PageDown'].includes(e.key)){e.preventDefault();go(i+1);}else if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();go(i-1);}else if(e.key==='Home')go(0);else if(e.key==='End')go(slides.length-1);});
  let tx=null;
  addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
  addEventListener('touchend',e=>{if(tx==null)return;const d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50)go(i+(d<0?1:-1));tx=null;});
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&typeof e.data.deckGo==='number')go(e.data.deckGo-1);});
  go(i);
})();
</script>
</body>
</html>
`);
  const kb = fs.readdirSync(dir).filter((f) => /^slide-\d+\.jpg$/.test(f)).reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0) >> 10;
  console.log(`deck.js: pages ${pages.join(",")} of ${total} → ${out} + ${slides.length} images (${kb} KB)${blurs.length ? `, blurred: ${blurs.map((r) => r.source).join(" · ")}` : ""}`);
  slides.forEach((s, k) => console.log(`  ${k + 1}. ${s.title}`));
  process.exit(0);
}

let s = fs.readFileSync(src, "utf8");

// 1. speaker notes
const notes = (s.match(/<aside class="notes">[\s\S]*?<\/aside>/g) || []).length;
if (!notes) die("no <aside class=\"notes\"> found; is this the deck format tools/deck.js knows?");
s = s.replace(/\s*<aside class="notes">[\s\S]*?<\/aside>/g, "");
s = s.replace(/<div id="notepanel"[^>]*><\/div>/, `<div id="notepanel" hidden></div>`);

// 2. slides
const SLIDE = /<section class="slide[^"]*" id="s(\d+)"[\s\S]*?<\/section>\s*/g;
const total = (s.match(SLIDE) || []).length;
for (const n of drop) if (n < 1 || n > total) die(`--drop ${n}: the deck has ${total} slides`);
s = s.replace(SLIDE, (m, n) => (drop.has(+n) ? "" : m));

// 3. extra cuts
for (const re of cuts) {
  if (!re.test(s)) die(`--cut ${re.source} matched nothing`);
  s = s.replace(re, "");
}

// 3b. text swaps (the slide stays, its words change)
for (const sw of swaps) {
  if (!sw.re.test(s)) die(`--swap ${sw.re.source} matched nothing`);
  s = s.replace(sw.re, sw.to);
}

// 4. renumber
let k = 0;
s = s.replace(/<section class="(slide[^"]*)" id="s\d+" data-n="\d+">([\s\S]*?)<span class="pn">\d+<\/span>/g, (m, cls, mid) => {
  const n = String(++k).padStart(2, "0");
  return `<section class="${cls}" id="s${k}" data-n="${n}">${mid}<span class="pn">${n}</span>`;
});
if (k !== total - drop.size) die(`renumbered ${k} slides but expected ${total - drop.size}`);

// 4b. blur boxes on embedded screenshots (decoded, blurred by tools/deck-blur.mjs, re-embedded as JPEG)
for (const bi of blurImages) {
  const path = require("path"), os = require("os"), { execFileSync } = require("child_process");
  const sec = s.match(new RegExp(`<section class="slide[^"]*" id="s${bi.n}"[\\s\\S]*?</section>`));
  if (!sec) die(`--blur-image ${bi.n}: no such slide after drops`);
  const m = sec[0].match(/src="data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)"/);
  if (!m) die(`--blur-image ${bi.n}: that slide has no embedded png/jpeg`);
  const tmp = path.join(os.tmpdir(), `deck-blur-${process.pid}-${bi.n}.${m[1] === "png" ? "png" : "jpg"}`);
  fs.writeFileSync(tmp, Buffer.from(m[2], "base64"));
  execFileSync("node", [path.join(__dirname, "deck-blur.mjs"), JSON.stringify([{ file: tmp, rects: [bi.rect] }])], { stdio: "inherit" });
  const jpg = fs.readFileSync(tmp).toString("base64");
  s = s.replace(sec[0], sec[0].replace(m[0], `src="data:image/jpeg;base64,${jpg}"`));
}

// 5. embed shim
const once = (from, to, what) => {
  const n = s.split(from).length - 1;
  if (n !== 1) die(`embed shim: expected exactly one ${what}, found ${n}`);
  s = s.replace(from, to);
};
once("if(window.__deckInit)return;window.__deckInit=true;",
  "if(window.__deckInit)return;window.__deckInit=true;const EMB=window.self!==window.top;if(EMB)document.documentElement.classList.add('embed');",
  "deck init guard");
once("const w=stage.clientWidth-24,h=stage.clientHeight-24;",
  "const g=EMB?0:24,w=stage.clientWidth-g,h=stage.clientHeight-g;",
  "fit() inset");
once("showNotes();fit();\n  }",
  "showNotes();fit();\n    if(EMB){const t=slides[i].querySelector('h1,h2');try{parent.postMessage({deck:{n:i+1,total:slides.length,title:t?t.textContent.replace(/\\s+/g,' ').trim():''}},location.origin);}catch(e){}}\n  }",
  "end of go()");
once("  go(i);\n",
  "  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&typeof e.data.deckGo==='number')go(e.data.deckGo-1);});\n  go(i);\n",
  "first go(i) call");
once("</head>",
  `<style>/* embedded in a talk page (tools/deck.js) */
html.embed .foot .nav,html.embed .foot .tools,html.embed #notepanel{display:none!important}
html.embed .slide{border-radius:0!important;box-shadow:none!important}
html.embed #wrap{min-height:0!important;height:100vh!important}
html.embed #stage{padding:0!important}
html.embed body{background:var(--bg)}
</style>
</head>`, "</head>");

fs.writeFileSync(out, s);
console.log(`deck.js: ${notes} notes stripped, ${drop.size} slides dropped, ${cuts.length} cuts, ${swaps.length} swaps, ${blurImages.length} image blurs, ${k} slides → ${out} (${Math.round(s.length / 1024)} KB)`);
