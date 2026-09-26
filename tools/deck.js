#!/usr/bin/env node
// A self-contained HTML deck → the public copy a talk page embeds.
//
//   node tools/deck.js <source.html> content/talks/<slug>/slides.html [--drop 2,3,4] [--cut <regex>]…
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
// The source deck stays where it is (~/Code/me/talks/…); only the scrubbed copy
// enters this repo. check.sh re-checks the copy: no notes, no private names.
const fs = require("fs");

const [src, out, ...rest] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node tools/deck.js <source.html> <out.html> [--drop 2,3] [--cut <regex>]"); process.exit(1); }
const drop = new Set();
const cuts = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--drop") rest[++i].split(",").forEach((n) => drop.add(+n));
  else if (rest[i] === "--cut") cuts.push(new RegExp(rest[++i], "gs"));
}
const die = (msg) => { console.error(`deck.js: ${msg}`); process.exit(1); };

// A PDF deck (exported slides, often image-only) → an image deck that speaks the
// same protocol to the viewer. Only the pages named by --pages are rendered, so a
// subset is the default, and the PDF's text never ships (placeholders, notes).
//   node tools/deck.js <deck.pdf> content/talks/<slug>/slides.html --pages 1,5,6 [--titles "A|B|C"]
// Titles feed the viewer's rail; without --titles each page's first line of text is used.
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
    return { img: `${name}.jpg`, title };
  });
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
  console.log(`deck.js: pages ${pages.join(",")} of ${total} → ${out} + ${slides.length} images (${kb} KB)`);
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

// 4. renumber
let k = 0;
s = s.replace(/<section class="(slide[^"]*)" id="s\d+" data-n="\d+">([\s\S]*?)<span class="pn">\d+<\/span>/g, (m, cls, mid) => {
  const n = String(++k).padStart(2, "0");
  return `<section class="${cls}" id="s${k}" data-n="${n}">${mid}<span class="pn">${n}</span>`;
});
if (k !== total - drop.size) die(`renumbered ${k} slides but expected ${total - drop.size}`);

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
console.log(`deck.js: ${notes} notes stripped, ${drop.size} slides dropped, ${cuts.length} cuts, ${k} slides → ${out} (${Math.round(s.length / 1024)} KB)`);
