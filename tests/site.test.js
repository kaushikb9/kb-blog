// Build, then hold dist/ to the invariants in CLAUDE.md that break inbound
// links and subscribers if they drift. No network, ~1s.
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const matter = require("gray-matter");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const BASE = "https://kaushik.sh";

let files, html, exists, redirects, rss, items;
const rel = (f) => "/" + path.relative(DIST, f).split(path.sep).join("/");
const redirected = (u) => redirects.some((r) => (r.endsWith("*") ? u.startsWith(r.slice(0, -1)) : r === u));
const resolves = (u) => {
  const clean = u.split(/[?#]/)[0];
  return exists.has(clean) || exists.has(clean.replace(/\/?$/, "/") + "index.html") || redirected(clean);
};

before(() => {
  execFileSync("node", [path.join(ROOT, "build.js")], { stdio: "pipe" });
  files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      e.isDirectory() ? walk(p) : files.push(p);
    }
  })(DIST);
  exists = new Set(files.map(rel));
  html = files.filter((f) => f.endsWith(".html"));
  redirects = fs.existsSync(path.join(DIST, "_redirects"))
    ? fs.readFileSync(path.join(DIST, "_redirects"), "utf8").split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean)
    : [];
  rss = fs.readFileSync(path.join(DIST, "index.xml"), "utf8");
  items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
});

test("build emits every route the old site had", () => {
  for (const need of ["/index.html", "/index.xml", "/sitemap.xml", "/404.html", "/_redirects",
                      "/blog/index.html", "/posts/index.html", "/about/index.html", "/ideas/index.html", "/traces/index.html", "/tags/index.html"])
    assert.ok(exists.has(need), `dist${need} not emitted by build.js`);
  assert.ok(redirects.length > 0, "static/_redirects is empty — the retired Hugo routes must keep 301ing");
});

test("every internal link resolves to a file, a directory index or a redirect", () => {
  for (const f of html) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:href|src)="(\/[^"]*)"/g))
      assert.ok(resolves(m[1]), `${rel(f)} links to ${m[1]} which does not exist in dist/`);
  }
});

test("style.css?v= is the hash of the CSS that shipped", () => {
  const cssv = require("crypto").createHash("md5").update(fs.readFileSync(path.join(DIST, "style.css"))).digest("hex").slice(0, 8);
  for (const f of html) {
    const src = fs.readFileSync(f, "utf8");
    if (!src.includes("style.css")) continue; // static passthroughs (us-trip-gems) never used the blog CSS
    const m = src.match(/style\.css\?v=([0-9a-f]+)/);
    assert.ok(m, `${rel(f)} links style.css without ?v= — stale CSS can pair with fresh HTML`);
    assert.equal(m[1], cssv, `${rel(f)}: style.css?v=${m[1]} but shipped CSS hashes to ${cssv}`);
  }
});

test("RSS: every GUID is its permalink, absolute, and a real page", () => {
  assert.ok(items.length > 0, "feed has no items");
  for (const it of items) {
    const link = (it.match(/<link>(.*?)<\/link>/) || [])[1];
    const guid = (it.match(/<guid[^>]*>(.*?)<\/guid>/) || [])[1];
    assert.ok(guid, `item ${link} has no <guid>`);
    assert.equal(guid, link, `guid ${guid} != link ${link} — subscribers see re-delivery`);
    assert.ok(link.startsWith(BASE + "/"), `link ${link} is not absolute under ${BASE}`);
    assert.ok(resolves(link.slice(BASE.length)), `feed item ${link} has no page in dist/`);
  }
});

test("sitemap entries are real pages under the canonical host", () => {
  const sm = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 0, "sitemap is empty");
  for (const u of locs) {
    assert.ok(u.startsWith(BASE), `${u} is not under ${BASE}`);
    assert.ok(resolves(u.slice(BASE.length)), `${u} has no page in dist/`);
  }
});

test("tag URLs are slugified the way Hugo did", () => {
  for (const f of html) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/href="\/tags\/([^"/]+)\/"/g))
      assert.match(m[1], /^[a-z0-9-]+$/, `${rel(f)}: tag URL /tags/${m[1]}/ is not slugified`);
  }
});

test("every post and trace has a title and a date; no Hugo branch bundles", () => {
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md") && !/^(about|ideas|home)\.md$/.test(e.name)) {
        const r = path.relative(ROOT, p);
        assert.notEqual(e.name, "_index.md", `${r}: _index.md is a Hugo branch bundle — use index.md, or RSS silently drops it`);
        const g = matter(fs.readFileSync(p, "utf8"));
        assert.ok(g.data.title, `${r}: frontmatter has no title`);
        assert.ok(g.data.date && !isNaN(new Date(g.data.date)), `${r}: frontmatter date is missing or unparseable (${g.data.date})`);
      }
    }
  })(path.join(ROOT, "content"));
});
