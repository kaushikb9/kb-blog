// One-time migration: kb-hugo/content → content/, normalizing all frontmatter
// to YAML and fixing known anomalies. Safe to re-run (overwrites).
const fs = require("fs");
const path = require("path");
const toml = require("toml");

const SRC = "/Users/kb/Code/kb-hugo/content";
const DST = path.join(__dirname, "content");

function parseFront(raw) {
  if (raw.startsWith("+++")) {
    const end = raw.indexOf("\n+++", 3);
    return { data: toml.parse(raw.slice(3, end)), body: raw.slice(end + 4) };
  }
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    // frontmatter here is simple key: value / arrays — defer real parsing to
    // gray-matter at build time; just pass through unchanged
    return { yaml: raw.slice(3, end).trim(), body: raw.slice(end + 4) };
  }
  return { yaml: "", body: raw };
}

function toYaml(data) {
  const lines = [];
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`);
    else if (v instanceof Date) lines.push(`${k}: ${v.toISOString()}`);
    else if (typeof v === "string") lines.push(`${k}: ${JSON.stringify(v)}`);
    else lines.push(`${k}: ${v}`);
  }
  return lines.join("\n");
}

function migrateFile(src, dst) {
  const raw = fs.readFileSync(src, "utf8");
  const p = parseFront(raw);
  let body = p.body;
  // the one shortcode in all content: a tweet embed → plain blockquote + link
  body = body.replace(
    /{{<\s*x\s+user="([^"]+)"\s+id="([^"]+)"\s*>}}/g,
    (_, user, id) =>
      `> — [@${user} on X](https://twitter.com/${user}/status/${id})`
  );
  const front = p.yaml !== undefined ? p.yaml : toYaml(p.data);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, `---\n${front}\n---\n${body}`);
  console.log("md ", path.relative(DST, dst));
}

function copyAsset(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log("bin", path.relative(DST, dst));
}

fs.rmSync(DST, { recursive: true, force: true });

(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, e.name);
    const rel = path.relative(SRC, src);
    if (e.isDirectory()) { walk(src); continue; }
    // drop Hugo scaffolding with no content value
    if (["blog.md", "search.md", "hikes/_index.md", "traces/_index.md"].includes(rel)) continue;
    let outRel = rel;
    if (rel === "posts/ai-inspired-shipping/_index.md")
      outRel = "posts/ai-inspired-shipping/index.md"; // branch-bundle anomaly
    const dst = path.join(DST, outRel);
    if (e.name.endsWith(".md")) migrateFile(src, dst);
    else copyAsset(src, dst);
  }
})(SRC);

// static passthroughs worth keeping
const S = "/Users/kb/Code/kb-hugo/static";
for (const f of ["robots.txt", "llms.txt"]) {
  if (fs.existsSync(path.join(S, f)))
    copyAsset(path.join(S, f), path.join(__dirname, "static", f));
}
if (fs.existsSync(path.join(S, "us-trip-gems/index.html")))
  copyAsset(path.join(S, "us-trip-gems/index.html"),
    path.join(__dirname, "static", "us-trip-gems/index.html"));
console.log("done");
