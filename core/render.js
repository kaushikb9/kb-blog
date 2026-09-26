// The part that never changes between skins: which pages exist, at which URLs,
// what goes in every <head>, the feed, the sitemap and the static passthrough.
// A skin only turns data into HTML; it cannot move a URL or a GUID.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const h = require("./util");
const T = require("./talk");

// every skin's templates.js must export all of these (tests/skins.test.js holds it)
const TEMPLATES = ["layout", "home", "post", "archive", "traces", "trace", "shelf",
  "hikes", "hike", "page", "projects", "talks", "talk", "tags", "tag", "notFound", "skins"];

function loadSkin(ROOT, name) {
  const dir = path.join(ROOT, "skins", name);
  if (!fs.existsSync(path.join(dir, "templates.js")))
    throw new Error(`skin "${name}": skins/${name}/templates.js not found — skins on disk: ${listSkins(ROOT).join(", ")}`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "skin.json"), "utf8"));
  const templates = require(path.join(dir, "templates.js"));
  for (const t of TEMPLATES)
    if (typeof templates[t] !== "function")
      throw new Error(`skin "${name}": templates.js does not export ${t}() — every skin renders every page (see skins/README.md)`);
  return { name, dir, meta, templates };
}

const listSkins = (ROOT) => fs.readdirSync(path.join(ROOT, "skins"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, "skins", e.name, "templates.js")))
  .map((e) => e.name).sort();

// tags are URL-bearing, so the core owns them: slug → {name, docs}, same slugs Hugo generated
function tagMap(site) {
  const m = {};
  for (const p of [...site.posts, ...site.traces, ...site.hikes])
    for (const t of p.tags) (m[h.slugify(t)] ||= { name: t, docs: [] }).docs.push(p);
  return m;
}

function routes(site, tags) {
  const r = [{ file: "index.html", url: "/", tpl: "home" }];
  for (const p of site.posts) r.push({ file: path.join(p.url.slice(1), "index.html"), url: p.url, tpl: "post", arg: p });
  for (const u of ["/blog/", "/posts/"]) r.push({ file: u.slice(1) + "index.html", url: u, tpl: "archive" });
  r.push({ file: "traces/index.html", url: "/traces/", tpl: "traces" });
  for (const t of site.traces) r.push({ file: path.join(t.url.slice(1), "index.html"), url: t.url, tpl: "trace", arg: t });
  r.push({ file: "shelf/index.html", url: "/shelf/", tpl: "shelf" });
  r.push({ file: "hikes/index.html", url: "/hikes/", tpl: "hikes" });
  for (const x of site.hikes) r.push({ file: path.join(x.url.slice(1), "index.html"), url: x.url, tpl: "hike", arg: x });
  for (const pg of [site.about, site.ideas]) r.push({ file: path.join(pg.url.slice(1), "index.html"), url: pg.url, tpl: "page", arg: pg });
  r.push({ file: "projects/index.html", url: "/projects/", tpl: "projects" });
  r.push({ file: "talks/index.html", url: "/talks/", tpl: "talks" });
  for (const t of site.talks) r.push({ file: path.join(t.url.slice(1), "index.html"), url: t.url, tpl: "talk", arg: t });
  r.push({ file: "tags/index.html", url: "/tags/", tpl: "tags", arg: tags });
  for (const [slug, t] of Object.entries(tags))
    r.push({ file: `tags/${slug}/index.html`, url: `/tags/${slug}/`, tpl: "tag", arg: { slug, ...t } });
  r.push({ file: "404.html", url: "/404.html", tpl: "notFound" });
  return r;
}

// The <head> lines every page carries whatever the skin. Canonical always points
// at the live URL, so an archived copy never competes with the real page.
function head(site, pg, url, archived) {
  const S = site.config;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h.esc(pg.title)}</title>
<meta name="description" content="${h.esc(pg.desc || S.desc)}">
<meta property="og:title" content="${h.esc(pg.title)}">
<meta property="og:description" content="${h.esc(pg.desc || S.desc)}">
<meta property="og:url" content="${S.base}${url}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${S.base}${url}">
<link rel="alternate" type="application/rss+xml" title="${h.esc(S.title)}" href="/index.xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">${archived ? `
<meta name="robots" content="noindex">` : ""}`;
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Render one skin into out/<prefix>. prefix "" is the live site; "/skins/<name>"
// is an archived (or, in dev, previewed) copy of the whole site in that skin.
function renderSkin({ ROOT, site, tags, skin, prefix, frame, history, out }) {
  const write = (rel, html) => {
    const f = path.join(out, prefix, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, html);
  };
  const cssFile = path.join(skin.dir, "assets", "style.css");
  const cssv = crypto.createHash("md5").update(fs.readFileSync(cssFile)).digest("hex").slice(0, 8);
  const ctx = {
    site, h, tags, history,
    skin: { name: skin.name, ...skin.meta },
    frame,                                   // null live; {kind:"archive"|"preview", from, to} otherwise
    u: (p) => prefix + p,                    // every internal href goes through this
    asset: (p) => `${prefix}/${p}`,          // a file from skins/<name>/assets/
    css: `${prefix}/style.css?v=${cssv}`,
  };
  ctx.talk = { has: T.has, deck: (t) => T.deck(ctx, t), video: (t) => T.video(ctx, t) }; // shared by every skin: see core/talk.js
  const pages = routes(site, tags);
  if (history.some((x) => !x.live)) pages.push({ file: "skins/index.html", url: "/skins/", tpl: "skins" });
  for (const r of pages) {
    if (prefix && r.tpl === "skins") continue; // one skins index, on the live site
    const pg = skin.templates[r.tpl](ctx, r.arg);
    const html = skin.templates.layout(ctx, { ...pg, url: r.url, head: head(site, pg, r.url, !!frame) });
    write(r.file, html);
  }
  // page-bundle images sit beside their page, so every copy of the page gets them
  for (const d of [...site.posts, ...site.hikes, ...site.talks])
    for (const a of d.assets) {
      const f = path.join(out, prefix, d.url.slice(1), path.basename(a));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.copyFileSync(a, f);
    }
  copyDir(path.join(ROOT, "content", "projects"), path.join(out, prefix, "projects"));
  copyDir(path.join(skin.dir, "assets"), path.join(out, prefix));
  return pages.length;
}

function feedAndSitemap({ site, tags, out, withSkinsIndex }) {
  const S = site.config;
  const feedDocs = [...site.posts, ...site.traces, ...site.hikes, site.about, site.ideas]
    .filter((d) => d.date).sort((a, b) => b.date - a.date);
  fs.writeFileSync(path.join(out, "index.xml"), `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${h.esc(S.title)}</title>
  <link>${S.base}/</link>
  <description>${h.esc(S.desc)}</description>
  <atom:link href="${S.base}/index.xml" rel="self" type="application/rss+xml"/>
${feedDocs.map((d) => `  <item>
    <title>${h.esc(d.title)}</title>
    <link>${S.base}${d.url}</link>
    <pubDate>${d.date.toUTCString()}</pubDate>
    <guid>${S.base}${d.url}</guid>
    <description>${h.esc(d.description || d.title)}</description>
  </item>`).join("\n")}
</channel>
</rss>`);
  const urls = ["/", "/blog/", "/posts/", "/traces/", "/shelf/", "/hikes/", "/about/", "/ideas/", "/projects/", "/talks/", "/tags/",
    ...site.posts.map((p) => p.url), ...site.traces.map((t) => t.url), ...site.hikes.map((x) => x.url),
    ...site.talks.map((t) => t.url), ...Object.keys(tags).map((t) => `/tags/${t}/`), "/us-trip-gems/", ...(withSkinsIndex ? ["/skins/"] : [])];
  fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${S.base}${u}</loc></url>`).join("\n")}
</urlset>`);
}

module.exports = { TEMPLATES, loadSkin, listSkins, tagMap, renderSkin, feedAndSitemap, copyDir };
