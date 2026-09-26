// kb-blog build: content/*.md → dist/, in the skin site.json names. No framework.
//
//   node build.js                     live skin at /, past skins at /skins/<name>/
//   node build.js --preview           also every other skin on disk at /skins/<name>/ (dev only; never deploy)
//   node build.js --skin outie        render a different skin as live (tests, trying one out)
//   node build.js --config f --out d  another site.json / output dir (tests)
//
// core/ owns URLs, <head>, feed and sitemap; skins/<name>/ owns the HTML and CSS.
const fs = require("fs");
const path = require("path");
const { load } = require("./core/load");
const R = require("./core/render");

const ROOT = __dirname;

function build(opts = {}) {
  const out = opts.out || path.join(ROOT, "dist");
  const cfg = JSON.parse(fs.readFileSync(opts.config || path.join(ROOT, "site.json"), "utf8"));
  const live = opts.skin || cfg.live;
  const site = load(ROOT, { drafts: opts.preview }); // --preview is dev-only, so a draft never deploys
  const tags = R.tagMap(site);

  // history is what /skins/ shows: every skin that has been live, oldest first
  let history = (cfg.history || []).map((x) => ({ ...x, live: x.skin === live && !x.to }));
  if (!history.some((x) => x.live)) history = [...history.filter((x) => x.skin !== live), { skin: live, from: null, live: true }];
  for (const x of history) {
    x.title = R.loadSkin(ROOT, x.skin).meta.title;
    x.href = x.skin === live ? "/" : `/skins/${x.skin}/`; // an earlier stint of today's skin is just the live site
  }

  // one archive per past skin (a skin worn twice shows its latest stint); the live skin is never also archived
  const framed = [];
  for (const x of [...history].reverse())
    if (!x.live && x.skin !== live && !framed.some((y) => y.skin === x.skin))
      framed.push({ skin: x.skin, frame: { kind: "archive", from: x.from, to: x.to } });
  if (opts.preview)
    for (const name of R.listSkins(ROOT))
      if (name !== live && !framed.some((x) => x.skin === name)) framed.push({ skin: name, frame: { kind: "preview" } });
  // load (and so validate) every skin BEFORE clearing out/: a broken skin fails
  // the build and leaves the last good dist/ serving, instead of an empty one
  const liveSkin = R.loadSkin(ROOT, live);
  for (const x of framed) x.loaded = R.loadSkin(ROOT, x.skin);

  fs.rmSync(out, { recursive: true, force: true }); // always build clean
  // static passthrough + shared assets (icons, manifest) first; skins add their own on top
  R.copyDir(path.join(ROOT, "static"), out);
  R.copyDir(path.join(ROOT, "assets"), out);

  const common = { ROOT, site, tags, history, out };
  let pages = R.renderSkin({ ...common, skin: liveSkin, prefix: "", frame: null });
  for (const x of framed)
    pages += R.renderSkin({ ...common, skin: x.loaded, prefix: `/skins/${x.skin}`, frame: x.frame });

  R.feedAndSitemap({ site, tags, out, withSkinsIndex: history.some((x) => !x.live) });
  // dev.js's editor map; same for every skin, so the dev build (--preview --out .dev) writes it too
  if (!opts.out || opts.preview) fs.writeFileSync(path.join(ROOT, ".sources.json"), JSON.stringify(site.sources, null, 2));

  const also = framed.length ? ` + ${framed.map((x) => `${x.skin} (${x.frame.kind})`).join(", ")}` : "";
  console.log(`built: ${live} skin${also} · ${site.posts.length} posts, ${site.traces.length} traces, ${site.shelf.length} shelf, ${Object.keys(tags).length} tags, ${(site.projects.apps || []).length + (site.projects.talks || []).length} projects tiles · ${pages} pages → ${path.relative(ROOT, out) || out}/`);
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  build({ preview: a.includes("--preview"), skin: val("--skin"), config: val("--config"), out: val("--out") && path.resolve(val("--out")) });
}

module.exports = { build };
