// Every skin on disk, rendered as if it were live, holds the same contract —
// so a skin that is not live today cannot quietly rot. Then the archive and
// preview frames: an old skin at /skins/<name>/ is whole, noindexed, and
// never competes with the live site in the feed or the sitemap.
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const lib = require("./lib");

const { ROOT, BASE, ROUTES } = lib;
const SHARED_TOKENS = ["--bg", "--card", "--ink", "--muted", "--line", "--gold", "--gold-soft"];
const shelfUrls = () => fs.readdirSync(path.join(ROOT, "content", "shelf")).filter((f) => f.endsWith(".md"))
  .map((f) => matter(fs.readFileSync(path.join(ROOT, "content", "shelf", f), "utf8")).data.url);

for (const skin of lib.skinsOnDisk()) {
  describe(`skin "${skin}"`, () => {
    let d;
    before(() => { d = lib.build(["--skin", skin], lib.tmpOut(skin)); });

    test("renders every route", () => {
      for (const r of ROUTES) assert.ok(d.exists.has(r), `skins/${skin} did not emit ${r}`);
    });

    test("every internal link and image resolves", () => {
      for (const f of d.html)
        for (const m of d.read(d.rel(f)).matchAll(/(?:href|src)="(\/[^"]*)"/g))
          assert.ok(d.resolves(m[1]), `skins/${skin}: ${d.rel(f)} links to ${m[1]}, which is not in the build`);
    });

    test("every page carries the core <head> and a pre-paint theme script", () => {
      for (const f of d.html) {
        const src = d.read(d.rel(f));
        if (!src.includes("style.css")) continue; // static passthroughs
        const headEl = src.slice(0, src.indexOf("</head>"));
        for (const need of [`rel="canonical" href="${BASE}`, `property="og:url"`, `type="application/rss+xml"`, `name="viewport"`, "<title>"])
          assert.ok(headEl.includes(need), `skins/${skin}: ${d.rel(f)} <head> lacks ${need} — layout() must print ${"${head}"}`);
        assert.match(headEl, /<script>[^<]*kb:theme/, `skins/${skin}: ${d.rel(f)} applies no theme before paint (flash of the wrong theme)`);
      }
    });

    test("loads nothing from another host (no CDNs, fonts self-hosted)", () => {
      for (const f of d.html) {
        const src = d.read(d.rel(f));
        if (!src.includes("style.css")) continue; // static passthroughs (us-trip-gems) are not skin output
        for (const m of src.matchAll(/<(?:script|link|img)[^>]+(?:src|href)="(https?:[^"]+)"/g))
          if (!/rel="(canonical|alternate)"/.test(m[0]))
            assert.fail(`skins/${skin}: ${d.rel(f)} loads ${m[1]} — vendor it into skins/${skin}/assets/`);
      }
      const css = fs.readFileSync(path.join(ROOT, "skins", skin, "assets", "style.css"), "utf8");
      assert.ok(!/url\(\s*["']?https?:/.test(css) && !/@import/.test(css), `skins/${skin}/assets/style.css pulls from another host`);
    });

    test("defines the six shared theme tokens", () => {
      const css = fs.readFileSync(path.join(ROOT, "skins", skin, "assets", "style.css"), "utf8");
      for (const t of SHARED_TOKENS) assert.ok(css.includes(`${t}:`), `skins/${skin}/assets/style.css never sets ${t} — dev.js's editor and shared snippets rely on it`);
    });

    test("stylesheet hash matches the file", () => {
      const src = d.read("/index.html");
      const m = src.match(/href="(\/style\.css)\?v=([0-9a-f]+)"/);
      assert.ok(m, `skins/${skin}: home links no hashed /style.css`);
      assert.equal(m[2], d.md5(m[1]));
    });

    test("shelf links every entry; projects emits only non-empty sections", () => {
      const shelf = d.read("/shelf/index.html");
      for (const u of shelfUrls()) assert.ok(shelf.includes(`href="${u.replace(/&/g, "&amp;")}"`), `skins/${skin}: /shelf/ does not link ${u}`);
      const P = matter(fs.readFileSync(path.join(ROOT, "content", "projects.md"), "utf8")).data;
      const pj = d.read("/projects/index.html");
      assert.equal(pj.includes(`data-section="apps"`), (P.apps || []).length > 0, `skins/${skin}: /projects/ apps section vs ${(P.apps || []).length} rows — never pad a section`);
    });

    test("talks: the list links every talk with its blurb; a talk page leads with the viewer", () => {
      const list = d.read("/talks/index.html");
      assert.ok(list.includes(`data-section="talks"`), `skins/${skin}: /talks/ has no data-section="talks" list`);
      for (const t of lib.talksOnDisk()) {
        assert.ok(list.includes(`href="${t.url}"`), `skins/${skin}: /talks/ does not link ${t.url}`);
        const blurb = t.fm.description.replace(/&/g, "&amp;").replace(/"/g, "&quot;").slice(0, 40);
        assert.ok(list.includes(blurb), `skins/${skin}: /talks/ shows no blurb for ${t.url} — a title alone gives a reader no reason to open it`);
        const pg = d.read(t.url + "index.html");
        if (t.fm.slides && !/^https?:/.test(t.fm.slides)) {
          assert.ok(pg.includes("data-deck"), `skins/${skin}: ${t.url} has slides but no viewer (ctx.talk.deck)`);
          assert.ok(pg.includes(`src="${t.url}${t.fm.slides}"`), `skins/${skin}: ${t.url} viewer does not load ${t.fm.slides}`);
        }
        if (t.fm.video) assert.ok(pg.includes(`href="${t.fm.video}"`), `skins/${skin}: ${t.url} has a video but does not link it`);
        if (t.fm.video && !t.fm.slides) assert.ok(pg.includes("deck-video"), `skins/${skin}: ${t.url} is video-only but does not lead with the video (ctx.talk.video)`);
      }
    });
  });
}

describe("archive: a past skin stays up, whole, at /skins/<name>/", () => {
  let d, cfg;
  before(() => {
    cfg = path.join(lib.tmpOut("cfg"), "site.json");
    fs.writeFileSync(cfg, JSON.stringify({ live: "outie", history: [
      { skin: "paper", from: "2026-07-25", to: "2026-10-01" },
      { skin: "outie", from: "2026-10-01" },
    ] }));
    d = lib.build(["--config", cfg], lib.tmpOut("archive"));
  });

  test("the past skin renders every route under its prefix, with a banner", () => {
    for (const r of ROUTES) assert.ok(d.exists.has(`/skins/paper${r}`), `archived paper lacks ${r}`);
    for (const f of d.html.filter((f) => d.rel(f).startsWith("/skins/paper/")))
      if (d.read(d.rel(f)).includes("style.css")) // a vendored talk deck is content, not a page the skin drew
        assert.ok(d.read(d.rel(f)).includes(`data-frame="archive"`), `${d.rel(f)} has no archive banner`);
  });

  test("archived pages are noindex and canonical to the live URL; live pages are not noindex", () => {
    for (const f of d.html) {
      const r = d.rel(f), src = d.read(r);
      if (!src.includes("style.css")) continue;
      if (r.startsWith("/skins/paper/")) {
        assert.ok(src.includes(`<meta name="robots" content="noindex">`), `${r} is indexable — it would compete with the live page`);
        const live = r.slice("/skins/paper".length).replace(/index\.html$/, "");
        assert.ok(src.includes(`<link rel="canonical" href="${BASE}${live}">`), `${r}: canonical should be ${BASE}${live}`);
      } else {
        assert.ok(!src.includes(`content="noindex"`), `live page ${r} is noindex`);
      }
    }
  });

  test("every link in the archive resolves", () => {
    for (const f of d.html)
      for (const m of d.read(d.rel(f)).matchAll(/(?:href|src)="(\/[^"]*)"/g))
        assert.ok(d.resolves(m[1]), `${d.rel(f)} links to ${m[1]}, which is not in the build`);
  });

  test("/skins/ lists every skin; feed and sitemap never point into an archive", () => {
    const idx = d.read("/skins/index.html");
    assert.ok(idx.includes(`href="/skins/paper/"`) && idx.includes(`href="/"`), "/skins/ must link the past skin and the live site");
    const sm = d.read("/sitemap.xml");
    assert.ok(!sm.includes("/skins/paper"), "sitemap lists archived pages");
    for (const it of d.items) assert.ok(!it.includes("/skins/"), "feed item points into /skins/");
  });

  test("the live site links to /skins/ once there is a past skin", () => {
    assert.ok(d.read("/index.html").includes(`href="/skins/"`), "live home has no link to past skins");
  });
});

describe("preview: every other skin at /skins/<name>/, dev only", () => {
  let d;
  before(() => { d = lib.build(["--preview"], lib.tmpOut("preview")); });

  test("each non-live skin is previewed under its prefix", () => {
    const live = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8")).live;
    for (const s of lib.skinsOnDisk().filter((s) => s !== live)) {
      assert.ok(d.exists.has(`/skins/${s}/index.html`), `--preview did not render ${s}`);
      assert.ok(d.read(`/skins/${s}/index.html`).includes(`data-frame="preview"`), `/skins/${s}/ has no preview banner`);
    }
  });

  test("previews stay out of the sitemap", () => {
    assert.ok(!d.read("/sitemap.xml").includes("/skins/"), "sitemap lists preview pages");
  });
});
