// Shared by the test files: build into a directory, then index what came out.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BASE = "https://kaushik.sh";

// node build.js <args> → the output dir, indexed
function build(args = [], out = path.join(ROOT, "dist")) {
  const a = out === path.join(ROOT, "dist") ? args : [...args, "--out", out];
  execFileSync("node", [path.join(ROOT, "build.js"), ...a], { stdio: "pipe" });
  return scan(out);
}
const tmpOut = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `kb-blog-${name}-`));

function scan(DIST) {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      e.isDirectory() ? walk(p) : files.push(p);
    }
  })(DIST);
  const rel = (f) => "/" + path.relative(DIST, f).split(path.sep).join("/");
  const exists = new Set(files.map(rel));
  const html = files.filter((f) => f.endsWith(".html"));
  const redirects = fs.existsSync(path.join(DIST, "_redirects"))
    ? fs.readFileSync(path.join(DIST, "_redirects"), "utf8").split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean)
    : [];
  const redirected = (u) => redirects.some((r) => (r.endsWith("*") ? u.startsWith(r.slice(0, -1)) : r === u));
  const resolves = (u) => {
    const clean = u.split(/[?#]/)[0];
    return exists.has(clean) || exists.has(clean.replace(/\/?$/, "/") + "index.html") || redirected(clean);
  };
  const read = (r) => fs.readFileSync(path.join(DIST, r), "utf8");
  const rss = exists.has("/index.xml") ? read("/index.xml") : "";
  const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const md5 = (r) => crypto.createHash("md5").update(fs.readFileSync(path.join(DIST, r))).digest("hex").slice(0, 8);
  return { DIST, files, rel, exists, html, redirects, resolves, read, rss, items, md5 };
}

// the routes every skin must emit, live or archived (URL parity with the old site)
const ROUTES = ["/index.html", "/404.html", "/blog/index.html", "/posts/index.html", "/about/index.html",
  "/ideas/index.html", "/traces/index.html", "/shelf/index.html", "/hikes/index.html", "/projects/index.html", "/talks/index.html", "/tags/index.html"];

const skinsOnDisk = () => fs.readdirSync(path.join(ROOT, "skins"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, "skins", e.name, "templates.js"))).map((e) => e.name);

// content/talks/<slug>/index.md → {slug, url, dir, fm}; published ones only unless asked
const matter = require("gray-matter");
const talksOnDisk = (all = false) => {
  const dir = path.join(ROOT, "content", "talks");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "index.md")))
    .map((e) => ({ slug: e.name, url: `/talks/${e.name}/`, dir: path.join(dir, e.name),
      fm: matter(fs.readFileSync(path.join(dir, e.name, "index.md"), "utf8")).data }))
    .filter((t) => all || t.fm.draft !== true);
};

module.exports = { ROOT, BASE, build, tmpOut, scan, ROUTES, skinsOnDisk, talksOnDisk };
