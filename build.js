// kb-blog build: content/*.md → dist/. No framework, one file.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const SITE = {
  base: "https://kaushikbhat.com",
  title: "Kaushik Bhat",
  desc: "Byte-sized ramblings on engineering management, productivity and personal growth — by Kaushik Bhat",
};
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const words = (md) => md.split(/\s+/).filter(Boolean).length;

function out(rel, html) {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

/* ---------- load content ---------- */

function loadDoc(file, section) {
  const g = matter(fs.readFileSync(file, "utf8"));
  const dir = path.dirname(file);
  const isBundle = path.basename(file) === "index.md";
  const slug = isBundle ? path.basename(dir) : path.basename(file, ".md");
  const url = g.data.url || `/${section}/${slug}/`;
  const assets = isBundle
    ? fs.readdirSync(dir).filter((f) => !f.endsWith(".md")).map((f) => path.join(dir, f))
    : [];
  return {
    section, slug, url,
    title: g.data.title || slug,
    date: g.data.date ? new Date(g.data.date) : null,
    tags: g.data.tags || [],
    kind: g.data.trace_kind || null,
    description: g.data.description || "",
    minutes: Math.max(1, Math.round(words(g.content) / 200)),
    html: marked.parse(g.content),
    assets,
  };
}

function loadSection(section) {
  const dir = path.join(ROOT, "content", section);
  if (!fs.existsSync(dir)) return [];
  const docs = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const idx = path.join(dir, e.name, "index.md");
      if (fs.existsSync(idx)) docs.push(loadDoc(idx, section));
    } else if (e.name.endsWith(".md")) {
      docs.push(loadDoc(path.join(dir, e.name), section));
    }
  }
  return docs.sort((a, b) => b.date - a.date);
}

const posts = loadSection("posts");
const traces = loadSection("traces");
const hikes = loadSection("hikes");
const about = loadDoc(path.join(ROOT, "content", "about.md"), "");
const ideas = loadDoc(path.join(ROOT, "content", "ideas.md"), "");
about.url = "/about/"; ideas.url = "/ideas/";

/* ---------- layout ---------- */

function page({ title, desc, url, body, progress = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || SITE.desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc || SITE.desc)}">
<meta property="og:url" content="${SITE.base}${url}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${SITE.base}${url}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.title)}" href="/index.xml">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css">
</head>
<body>
${progress ? `<div id="progress"></div>` : ""}
<header class="site-head">
  <a class="wordmark" href="/">kaushik<span>bhat</span></a>
  <nav>
    <a href="/">writing</a>
    <a href="/traces/">traces</a>
    <a href="/ideas/">ideas</a>
    <a href="/about/">about</a>
  </nav>
</header>
<main>
${body}
</main>
<footer>
  <p>© kaushik bhat · <a href="/index.xml">rss</a> · <a href="https://antifeed.pages.dev">what i read</a></p>
</footer>
${progress ? `<script>
const bar=document.getElementById("progress");
addEventListener("scroll",()=>{const h=document.documentElement;
bar.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+"%"},{passive:true});
</script>` : ""}
</body>
</html>`;
}

const row = (d, sub) => `<li>
  <a class="row" href="${d.url}">
    <span class="when">${d.date ? fmtDate(d.date) : ""}</span>
    <span class="t"><span class="rt">${esc(d.title)}</span>
      <span class="sub">${sub}</span></span>
  </a>
</li>`;

/* ---------- home: bio + now + writing by year + traces strip ---------- */

const KIND_GLYPHS = { spark: "✦", reflect: "☾", peak: "▲", flag: "⚑" };
const now = fs.readFileSync(path.join(ROOT, "content", "now.txt"), "utf8").trim();
const homeYears = {};
for (const p of posts) (homeYears[p.date.getFullYear()] ||= []).push(p);

out("index.html", page({
  title: SITE.title, url: "/",
  body: `
<section class="bio">
  <p class="hi">Hi there 👋🏼 — I'm Kaushik. I lead engineering teams, build
  personal AI agents, and write byte-sized ramblings on both.</p>
  <p class="social">
    <a href="https://twitter.com/kaushikb9">twitter</a> ·
    <a href="https://www.linkedin.com/in/kaushikbhat/">linkedin</a> ·
    <a href="https://github.com/kaushikb9">github</a> ·
    <a href="/index.xml">rss</a>
  </p>
  <p class="now"><span class="now-label">now</span> ${esc(now)}</p>
</section>

<section class="list-section">
  <h3 class="section-label">writing</h3>
  ${Object.keys(homeYears).sort((a, b) => b - a).map((y) => `
  <h4 class="year">${y}</h4>
  <ol class="rows">${homeYears[y].map((p) => row(p, `${p.minutes} min · ${p.tags.slice(0, 3).join(" · ")}`)).join("\n")}</ol>`).join("\n")}
</section>

<section class="list-section">
  <h3 class="section-label">traces</h3>
  <ol class="rows">
    ${traces.slice(0, 2).map((t) => row(t, `${KIND_GLYPHS[t.kind] || ""} ${t.kind}`)).join("\n")}
  </ol>
  <p class="more-link"><a href="/traces/">all traces →</a></p>
</section>`,
}));

/* ---------- posts ---------- */

for (const p of posts) {
  out(path.join(p.url.slice(1), "index.html"), page({
    title: `${p.title} · ${SITE.title}`, desc: p.description, url: p.url, progress: true,
    body: `<article class="prose">
  <div class="kicker">${fmtDate(p.date)} · ${p.minutes} min read</div>
  <h1>${esc(p.title)}</h1>
  ${p.html}
  <div class="post-tags">${p.tags.map((t) => `<a class="chip" href="/tags/${t}/">${esc(t)}</a>`).join(" ")}</div>
</article>`,
  }));
  for (const a of p.assets)
    fs.copyFileSync(a, path.join(DIST, p.url.slice(1), path.basename(a)));
}

/* ---------- blog + posts archives (URL parity) ---------- */

const byYear = {};
for (const p of posts) (byYear[p.date.getFullYear()] ||= []).push(p);
const archive = Object.keys(byYear).sort((a, b) => b - a).map((y) => `
<h3 class="section-label">${y}</h3>
<ol class="rows">${byYear[y].map((p) => row(p, `${p.minutes} min`)).join("\n")}</ol>`).join("\n");
for (const u of ["blog/index.html", "posts/index.html"])
  out(u, page({ title: `Writing · ${SITE.title}`, url: "/" + path.dirname(u) + "/", body: `<h1 class="page-title">writing</h1>${archive}` }));

/* ---------- traces ---------- */

const KINDS = { spark: "spark ✦", reflect: "reflect ☾", peak: "peak ▲", flag: "flag ⚑" };
out("traces/index.html", page({
  title: `Traces · ${SITE.title}`, url: "/traces/",
  body: `<h1 class="page-title">traces</h1>
<p class="tagline">Short, unpolished markers — sparks, reflections, peaks, flags.</p>
<nav class="filters" id="filters">
  <button data-kind="all" class="active">all</button>
  ${Object.keys(KINDS).map((k) => `<button data-kind="${k}">${k}</button>`).join("\n")}
</nav>
<ol class="rows" id="trace-list">
  ${traces.map((t) => `<li data-kind="${t.kind}">
    <a class="row" href="${t.url}">
      <span class="when">${fmtDate(t.date)}</span>
      <span class="t"><span class="rt">${esc(t.title)}</span>
        <span class="sub">${KINDS[t.kind] || t.kind}</span></span>
    </a>
  </li>`).join("\n")}
</ol>
<script>
document.getElementById("filters").addEventListener("click",(e)=>{
  const b=e.target.closest("button"); if(!b) return;
  document.querySelectorAll("#filters button").forEach((x)=>x.classList.toggle("active",x===b));
  document.querySelectorAll("#trace-list li").forEach((li)=>{
    li.hidden = b.dataset.kind!=="all" && li.dataset.kind!==b.dataset.kind;
  });
});
</script>`,
}));
for (const t of traces) {
  out(path.join(t.url.slice(1), "index.html"), page({
    title: `${t.title} · ${SITE.title}`, url: t.url,
    body: `<article class="prose">
  <div class="kicker">${fmtDate(t.date)} · ${KINDS[t.kind] || "trace"}</div>
  <h1>${esc(t.title)}</h1>
  ${t.html}
</article>`,
  }));
}

/* ---------- hikes, about, ideas ---------- */

out("hikes/index.html", page({
  title: `Hikes · ${SITE.title}`, url: "/hikes/",
  body: `<h1 class="page-title">hikes</h1>
<p class="tagline">Trails walked, serendipity found.</p>
<ol class="rows">${hikes.map((h) => row(h, `${h.minutes} min`)).join("\n")}</ol>`,
}));
for (const h of hikes) {
  out(path.join(h.url.slice(1), "index.html"), page({
    title: `${h.title} · ${SITE.title}`, url: h.url,
    body: `<article class="prose"><div class="kicker">${fmtDate(h.date)} · hike</div><h1>${esc(h.title)}</h1>${h.html}</article>`,
  }));
  for (const a of h.assets)
    fs.copyFileSync(a, path.join(DIST, h.url.slice(1), path.basename(a)));
}
for (const pg of [about, ideas])
  out(path.join(pg.url.slice(1), "index.html"), page({
    title: `${pg.title} · ${SITE.title}`, url: pg.url,
    body: `<article class="prose"><h1>${esc(pg.title)}</h1>${pg.html}</article>`,
  }));

/* ---------- tags ---------- */

const tagMap = {};
for (const p of [...posts, ...traces]) for (const t of p.tags) (tagMap[t] ||= []).push(p);
out("tags/index.html", page({
  title: `Tags · ${SITE.title}`, url: "/tags/",
  body: `<h1 class="page-title">tags</h1><div class="tag-cloud">${
    Object.keys(tagMap).sort().map((t) => `<a class="chip" href="/tags/${t}/">${esc(t)} · ${tagMap[t].length}</a>`).join(" ")}</div>`,
}));
for (const [t, docs] of Object.entries(tagMap))
  out(`tags/${t}/index.html`, page({
    title: `#${t} · ${SITE.title}`, url: `/tags/${t}/`,
    body: `<h1 class="page-title">#${esc(t)}</h1><ol class="rows">${
      docs.sort((a, b) => b.date - a.date).map((d) => row(d, d.section)).join("\n")}</ol>`,
  }));

/* ---------- 404, RSS, sitemap, statics ---------- */

out("404.html", page({
  title: `404 · ${SITE.title}`, url: "/404.html",
  body: `<article class="prose"><h1>404</h1><p>That page wandered off. <a href="/">Head home</a> or browse the <a href="/blog/">archive</a>.</p></article>`,
}));

const feedDocs = [...posts, ...traces, ...hikes, about, ideas]
  .filter((d) => d.date).sort((a, b) => b.date - a.date);
out("index.xml", `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE.title)}</title>
  <link>${SITE.base}/</link>
  <description>${esc(SITE.desc)}</description>
  <atom:link href="${SITE.base}/index.xml" rel="self" type="application/rss+xml"/>
${feedDocs.map((d) => `  <item>
    <title>${esc(d.title)}</title>
    <link>${SITE.base}${d.url}</link>
    <pubDate>${d.date.toUTCString()}</pubDate>
    <guid>${SITE.base}${d.url}</guid>
    <description>${esc(d.description || d.title)}</description>
  </item>`).join("\n")}
</channel>
</rss>`);

const urls = ["/", "/blog/", "/posts/", "/traces/", "/hikes/", "/about/", "/ideas/", "/tags/",
  ...posts.map((p) => p.url), ...traces.map((t) => t.url), ...hikes.map((h) => h.url),
  ...Object.keys(tagMap).map((t) => `/tags/${t}/`), "/us-trip-gems/"];
out("sitemap.xml", `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE.base}${u}</loc></url>`).join("\n")}
</urlset>`);

// static passthrough + shared assets
(function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); }
    else fs.copyFileSync(s, d);
  }
})(path.join(ROOT, "static"), DIST);
for (const f of fs.readdirSync(path.join(ROOT, "assets")))
  fs.copyFileSync(path.join(ROOT, "assets", f), path.join(DIST, f));

console.log(`built: ${posts.length} posts, ${traces.length} traces, ${Object.keys(tagMap).length} tags → dist/`);
