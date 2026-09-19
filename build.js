// kb-blog build: content/*.md → dist/. No framework, one file.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const SITE = {
  base: "https://kaushik.sh",
  title: "Kaushik Bhat",
  desc: "Byte-sized ramblings on engineering management, productivity and personal growth — by Kaushik Bhat",
};
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
fs.rmSync(DIST, { recursive: true, force: true }); // always build clean
// content-hash the stylesheet so stale CSS can never pair with fresh HTML
const CSSV = require("crypto").createHash("md5")
  .update(fs.readFileSync(path.join(ROOT, "assets", "style.css")))
  .digest("hex").slice(0, 8);

const SOURCES = {}; // url → content file, for the dev-server edit mode

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
  SOURCES[url] = path.relative(ROOT, file);
  const plain = g.content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = g.data.description ||
    plain.slice(0, 220) + (plain.length > 220 ? "…" : "");
  return {
    section, slug, url, excerpt,
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
// lab: the frontmatter IS the data (apps + talks lists); the body is unused
const lab = matter(fs.readFileSync(path.join(ROOT, "content", "lab.md"), "utf8")).data;
SOURCES["/lab/"] = "content/lab.md";

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
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#7b2d8e">
<link rel="stylesheet" href="/style.css?v=${CSSV}">
<script>(function(){var t=localStorage.getItem("kb:theme");if(t)document.documentElement.dataset.theme=t;})();</script>
</head>
<body>
${progress ? `<div id="progress"></div>` : ""}
<header class="site-head">
  <a class="wordmark" href="/">kaushik<span>bhat</span></a>
  <nav>
    <a href="/">writing</a>
    <a href="/traces/">traces</a>
    <a href="/lab/">lab</a>
    <a href="/about/">about</a>
    <button id="theme-btn" aria-label="toggle theme"></button>
  </nav>
</header>
<main>
${body}
</main>
<footer>
  <p>© kaushik bhat · <a href="/index.xml">rss</a> · <a href="https://antifeed.pages.dev">what i read</a></p>
</footer>
<script>
document.addEventListener("click",(e)=>{
  if(e.target.closest("a, button, .expand")) return;
  const li=e.target.closest("li.exp"); if(!li) return;
  const ex=li.querySelector(".expand"); const wasOpen=!ex.hidden;
  document.querySelectorAll("li.exp .expand").forEach((x)=>x.hidden=true);
  ex.hidden=wasOpen;
});

const THEME_ICONS={
  auto:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'};
function applyTheme(){
  const t=localStorage.getItem("kb:theme")||"auto";
  if(t==="auto")delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=t;
  const b=document.getElementById("theme-btn");
  b.innerHTML=THEME_ICONS[t]; b.title="theme: "+t;
}
document.getElementById("theme-btn").addEventListener("click",()=>{
  const o=["auto","light","dark"];
  const n=o[(o.indexOf(localStorage.getItem("kb:theme")||"auto")+1)%3];
  n==="auto"?localStorage.removeItem("kb:theme"):localStorage.setItem("kb:theme",n);
  applyTheme();
});
applyTheme();
</script>
${progress ? `<script>
const bar=document.getElementById("progress");
addEventListener("scroll",()=>{const h=document.documentElement;
bar.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+"%"},{passive:true});
</script>` : ""}
</body>
</html>`;
}

const row = (d, sub, attrs = "") => `<li class="exp" ${attrs}>
  <div class="row">
    <span class="when">${d.date ? fmtDate(d.date) : ""}</span>
    <span class="t"><a class="rt" href="${d.url}">${esc(d.title)}</a>
      <span class="sub">${sub}</span></span>
  </div>
  <div class="expand" hidden>
    <article class="card mini">
      <div class="kicker">preview
        <span class="meta">${d.date ? fmtDate(d.date) : ""} · ${d.minutes} min</span></div>
      <p class="hook">${esc(d.excerpt)}</p>
      <div class="actions"><a class="go" href="${d.url}">Read it →</a></div>
    </article>
  </div>
</li>`;

/* ---------- home: bio + now + writing by year + traces strip ---------- */

const KIND_GLYPHS = { spark: "✦", reflect: "☾", peak: "▲" };
const now = fs.readFileSync(path.join(ROOT, "content", "now.txt"), "utf8").trim();
const bio = marked.parse(matter(fs.readFileSync(path.join(ROOT, "content", "home.md"), "utf8")).content);
SOURCES["/"] = "content/home.md";
const homeYears = {};
for (const p of posts) (homeYears[p.date.getFullYear()] ||= []).push(p);

out("index.html", page({
  title: SITE.title, url: "/",
  body: `
<section class="bio">
  <div class="hi">${bio}</div>
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
  <div class="post-tags">${p.tags.map((t) => `<a class="chip" href="/tags/${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/">${esc(t)}</a>`).join(" ")}</div>
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

const KINDS = { spark: "spark ✦", reflect: "reflect ☾", peak: "peak ▲" };
out("traces/index.html", page({
  title: `Traces · ${SITE.title}`, url: "/traces/",
  body: `<h1 class="page-title">traces</h1>
<p class="tagline">Short, unpolished markers — sparks, reflections, peaks, flags.</p>
<nav class="filters" id="filters">
  <button data-kind="all" class="active">all</button>
  ${Object.keys(KINDS).map((k) => `<button data-kind="${k}">${k}</button>`).join("\n")}
</nav>
<ol class="rows" id="trace-list">
  ${traces.map((t) => row(t, KINDS[t.kind] || t.kind, `data-kind="${t.kind}"`)).join("\n")}
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

/* ---------- lab: a gallery of tiles, one per app or talk ---------- */

const labRow = (e) => {
  const name = e.name || e.title;
  const line = e.line || e.where || "";
  const inner = `${e.image ? `<img class="shot" src="/lab/${esc(e.image)}" alt="" loading="lazy">` : ""}
    <span class="body"><span class="rt">${esc(name)}</span>
      <span class="sub">${esc(line)}</span>
      ${e.url ? `<span class="go">${esc(e.label || "open")} ↗</span>` : ""}</span>`;
  return e.url
    ? `<li><a class="tile" href="${esc(e.url)}" target="_blank" rel="noopener">${inner}</a></li>`
    : `<li><div class="tile">${inner}</div></li>`;
};
const labSection = (label, list) => (list && list.length) ? `
<section class="list-section">
  <h3 class="section-label">${label}</h3>
  <ol class="lab">${list.map(labRow).join("\n")}</ol>
</section>` : "";
out("lab/index.html", page({
  title: `${lab.title} · ${SITE.title}`, url: "/lab/", desc: lab.tagline,
  body: `<h1 class="page-title">${esc(lab.title)}</h1>
<p class="tagline">${esc(lab.tagline)}</p>${labSection("apps", lab.apps)}${labSection("talks", lab.talks)}`,
}));
for (const f of fs.readdirSync(path.join(ROOT, "content", "lab")))
  fs.copyFileSync(path.join(ROOT, "content", "lab", f), path.join(DIST, "lab", f));

/* ---------- tags ---------- */

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const tagMap = {}; // slug → {name, docs} — same slugs Hugo generated
for (const p of [...posts, ...traces, ...hikes])
  for (const t of p.tags) {
    const s = slugify(t);
    (tagMap[s] ||= { name: t, docs: [] }).docs.push(p);
  }
out("tags/index.html", page({
  title: `Tags · ${SITE.title}`, url: "/tags/",
  body: `<h1 class="page-title">tags</h1><div class="tag-cloud">${
    Object.keys(tagMap).sort().map((s) => `<a class="chip" href="/tags/${s}/">${esc(tagMap[s].name)} · ${tagMap[s].docs.length}</a>`).join(" ")}</div>`,
}));
for (const [s, { name, docs }] of Object.entries(tagMap))
  out(`tags/${s}/index.html`, page({
    title: `#${name} · ${SITE.title}`, url: `/tags/${s}/`,
    body: `<h1 class="page-title">#${esc(name)}</h1><ol class="rows">${
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

const urls = ["/", "/blog/", "/posts/", "/traces/", "/hikes/", "/about/", "/ideas/", "/lab/", "/tags/",
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

fs.writeFileSync(path.join(ROOT, ".sources.json"), JSON.stringify(SOURCES, null, 2));
console.log(`built: ${posts.length} posts, ${traces.length} traces, ${Object.keys(tagMap).length} tags, ${(lab.apps || []).length + (lab.talks || []).length} lab rows → dist/`);
