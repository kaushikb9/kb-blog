// Build, then hold dist/ to the invariants in CLAUDE.md that break inbound
// links and subscribers if they drift. No network, ~1s.
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const lib = require("./lib");

const { ROOT, BASE } = lib;
const DIST = path.join(ROOT, "dist");

let files, html, exists, redirects, rss, items, rel, resolves, md5;

before(() => {
  ({ files, html, exists, redirects, rss, items, rel, resolves, md5 } = lib.build());
});

test("build emits every route the old site had", () => {
  for (const need of ["/index.html", "/index.xml", "/sitemap.xml", "/404.html", "/_redirects",
                      "/blog/index.html", "/posts/index.html", "/about/index.html", "/ideas/index.html", "/traces/index.html", "/shelf/index.html", "/projects/index.html", "/talks/index.html", "/tags/index.html"])
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

test("style.css?v= is the hash of the CSS that shipped beside it", () => {
  for (const f of html) {
    const src = fs.readFileSync(f, "utf8");
    if (!src.includes("style.css")) continue; // static passthroughs (us-trip-gems) never used the blog CSS
    const m = src.match(/href="((?:\/skins\/[a-z0-9-]+)?\/style\.css)\?v=([0-9a-f]+)"/);
    assert.ok(m, `${rel(f)} links style.css without ?v= — stale CSS can pair with fresh HTML`);
    assert.equal(m[2], md5(m[1]), `${rel(f)}: ${m[1]}?v=${m[2]} but that file hashes to ${md5(m[1])}`);
  }
});

test("the deployed build carries no preview skins (those are dev-only)", () => {
  for (const f of html)
    assert.ok(!fs.readFileSync(f, "utf8").includes(`data-frame="preview"`), `${rel(f)} is a preview page — build.js --preview must never deploy`);
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

test("every post, trace and hike has a title and a date; no Hugo branch bundles", () => {
  for (const section of ["posts", "traces", "hikes"]) (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) {
        const r = path.relative(ROOT, p);
        assert.notEqual(e.name, "_index.md", `${r}: _index.md is a Hugo branch bundle — use index.md, or RSS silently drops it`);
        const g = matter(fs.readFileSync(p, "utf8"));
        assert.ok(g.data.title, `${r}: frontmatter has no title`);
        assert.ok(g.data.date && !isNaN(new Date(g.data.date)), `${r}: frontmatter date is missing or unparseable (${g.data.date})`);
      }
    }
  })(path.join(ROOT, "content", section));
});

const SHELF_KINDS = ["tweet", "article", "talk", "book"];
const shelfEntries = () => fs.readdirSync(path.join(ROOT, "content", "shelf")).filter((f) => f.endsWith(".md"))
  .map((f) => ({ file: `content/shelf/${f}`, ...matter(fs.readFileSync(path.join(ROOT, "content", "shelf", f), "utf8")).data }));

test("every shelf entry has a title, an http(s) url and a known kind; a date, if given, parses", () => {
  const entries = shelfEntries();
  assert.ok(entries.length > 0, "content/shelf/ has no entries");
  for (const e of entries) {
    assert.ok(e.title, `${e.file}: frontmatter has no title`);
    assert.match(String(e.url || ""), /^https?:\/\//, `${e.file}: url must be an absolute http(s) link (got ${e.url})`);
    assert.ok(SHELF_KINDS.includes(e.kind), `${e.file}: kind "${e.kind}" is not one of ${SHELF_KINDS.join("|")}`);
    if (e.date !== undefined)
      assert.ok(!isNaN(new Date(e.date)), `${e.file}: date is unparseable (${e.date}) — omit it if unknown, never guess`);
  }
});

test("shelf page links every entry; shelf is never in the feed", () => {
  const src = fs.readFileSync(path.join(DIST, "shelf", "index.html"), "utf8");
  for (const e of shelfEntries())
    assert.ok(src.includes(`href="${e.url.replace(/&/g, "&amp;")}"`), `${e.file}: ${e.url} is not linked from /shelf/`);
  for (const it of items) {
    const link = (it.match(/<link>(.*?)<\/link>/) || [])[1];
    assert.ok(!link.startsWith(BASE + "/shelf/"), `feed item ${link} — shelf entries are not feed items by design`);
  }
});

test("shelf filter only offers kinds that have entries", () => {
  const src = fs.readFileSync(path.join(DIST, "shelf", "index.html"), "utf8");
  const present = new Set(shelfEntries().map((e) => e.kind));
  for (const m of src.matchAll(/<button data-kind="([a-z]+)"/g))
    assert.ok(m[1] === "all" || present.has(m[1]), `/shelf/ offers a "${m[1]}" filter but no entry has that kind`);
});

test("projects.md: every row has a name and a line; links are https; images exist", () => {
  const projects = matter(fs.readFileSync(path.join(ROOT, "content", "projects.md"), "utf8")).data;
  assert.ok(Array.isArray(projects.apps) && projects.apps.length > 0, "content/projects.md: apps is empty — the page would render with no rows");
  for (const e of projects.apps) {
    const who = `content/projects.md app "${e.name || "?"}"`;
    assert.ok(e.name, `${who}: no name`);
    assert.ok(e.line, `${who}: no line — say what it is in one sentence`);
    if (e.url) assert.match(e.url, /^https:\/\//, `${who}: url must be absolute https, got ${e.url}`);
    if (e.repo) assert.match(e.repo, /^https:\/\/github\.com\//, `${who}: repo must be a github.com URL, got ${e.repo}`);
    if (e.image) assert.ok(fs.existsSync(path.join(ROOT, "content", "projects", e.image)), `${who}: image content/projects/${e.image} does not exist`);
  }
  assert.ok(!("talks" in projects), "content/projects.md has talks: — talks live in content/talks/<slug>/ since 2026-09-26");
});

test("projects page emits a section only for a non-empty list", () => {
  const projects = matter(fs.readFileSync(path.join(ROOT, "content", "projects.md"), "utf8")).data;
  const src = fs.readFileSync(path.join(DIST, "projects", "index.html"), "utf8");
  for (const [key, label] of [["apps", "apps"]]) {
    const has = src.includes(`data-section="${label}"`); // a semantic hook every skin emits, not a skin's class name
    const want = (projects[key] || []).length > 0;
    assert.equal(has, want, `/projects/: "${label}" section ${has ? "rendered" : "missing"} but ${key} has ${(projects[key] || []).length} rows — never pad a section`);
  }
});

test("a draft (draft: true) never ships: no page, no feed entry, no sitemap line", () => {
  const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  for (const section of ["posts", "traces", "hikes", "talks"]) {
    const dir = path.join(ROOT, "content", section);
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = e.isDirectory() ? path.join(dir, e.name, "index.md") : path.join(dir, e.name);
      if (!file.endsWith(".md") || !fs.existsSync(file)) continue;
      const fm = matter(fs.readFileSync(file, "utf8")).data;
      if (fm.draft !== true) continue;
      const url = fm.url || `/${section}/${e.isDirectory() ? e.name : e.name.replace(/\.md$/, "")}/`;
      assert.ok(!exists.has(url + "index.html"), `draft ${path.relative(ROOT, file)} was built at ${url}`);
      assert.ok(!rss.includes(BASE + url), `draft ${url} is in the feed`);
      assert.ok(!sitemap.includes(BASE + url), `draft ${url} is in the sitemap`);
    }
  }
});

// ---- talks (/talks/, since 2026-09-26): a list with a blurb per talk, a page led by the slides ----

test("every published talk has a title, date, where, a real blurb, and slides or a video", () => {
  for (const t of lib.talksOnDisk()) {
    const who = `content/talks/${t.slug}`;
    const fm = t.fm;
    assert.ok(fm.title, `${who}: no title`);
    assert.ok(fm.date && !isNaN(new Date(fm.date)), `${who}: no parseable date`);
    assert.ok(fm.where, `${who}: no where — say where the talk was given`);
    assert.ok(fm.description && fm.description.length >= 80 && !/to come/i.test(fm.description),
      `${who}: description is the blurb a reader decides on; write two or three sentences on what the talk covers (KB, 2026-09-26: a title alone is show-off with no reason to click)`);
    assert.ok(fm.slides || fm.video, `${who}: a published talk needs slides (a file in the bundle or an https URL) or a video; keep it draft: true until it has one`);
    if (fm.slides && !/^https:\/\//.test(fm.slides))
      assert.ok(fs.existsSync(path.join(t.dir, fm.slides)), `${who}: slides ${fm.slides} is not in the bundle`);
    if (fm.poster) assert.ok(fs.existsSync(path.join(t.dir, fm.poster)), `${who}: poster ${fm.poster} is not in the bundle`);
    if (fm.video) assert.match(fm.video, /^https:\/\//, `${who}: video must be an https URL (linked out, never embedded)`);
  }
});

test("every vendored deck is the scrubbed copy: no speaker notes, no private names", () => {
  const denyFile = path.join(require("os").homedir(), ".config", "kb", "private-names.txt");
  const deny = fs.existsSync(denyFile)
    ? fs.readFileSync(denyFile, "utf8").split("\n").map((x) => x.trim()).filter((x) => x && !x.startsWith("#")) : [];
  for (const t of lib.talksOnDisk(true)) {
    for (const f of fs.readdirSync(t.dir).filter((f) => f.endsWith(".html"))) {
      const src = fs.readFileSync(path.join(t.dir, f), "utf8");
      assert.ok(!/<aside class="notes"/.test(src), `content/talks/${t.slug}/${f} still has speaker notes — run it through tools/deck.js`);
      assert.ok(src.includes("html.embed"), `content/talks/${t.slug}/${f} has no embed shim — run it through tools/deck.js`);
      for (const n of deny)
        assert.ok(!src.toLowerCase().includes(n.toLowerCase()), `content/talks/${t.slug}/${f} contains a name from ~/.config/kb/private-names.txt`);
    }
  }
});

test("/talks/ links every published talk; talks stay out of the feed and in the sitemap", () => {
  const list = fs.readFileSync(path.join(DIST, "talks", "index.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  for (const t of lib.talksOnDisk()) {
    assert.ok(list.includes(`href="${t.url}"`), `/talks/ does not link ${t.url}`);
    assert.ok(exists.has(t.url + "index.html"), `${t.url} was not built`);
    assert.ok(!rss.includes(BASE + t.url), `${t.url} is in the feed — talks are deliberately not`);
    assert.ok(sitemap.includes(`<loc>${BASE}${t.url}</loc>`), `${t.url} is missing from the sitemap`);
  }
});
