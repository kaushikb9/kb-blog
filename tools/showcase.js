// Copy each listed app's preview in from its own repo's showcase/ folder
// (contract: ~/Code/brain/design-system/SHOWCASE.md). Run by hand when a showcase
// changes; the build never reads sibling repos.
//
// content/projects.md decides what is listed, in what order and in whose words (KB's).
// An app opts in with `showcase: <repo dir under ~/Code>`. For each one this resizes
// showcase/light.png and dark.png (macOS sips, 960×600) to content/projects/<dir>.png
// and <dir>-dark.png. The other repos are read-only here: nothing is written there,
// and showcase.json's facts are only reported where they differ from projects.md.
//
//   npm run showcase    copy every listed app's previews in, then list what differs
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const matter = require("gray-matter");

const ROOT = path.resolve(__dirname, "..");
const CODE = process.env.KB_CODE || path.join(ROOT, "..");
const OUT = path.join(ROOT, "content", "projects");
const apps = matter(fs.readFileSync(path.join(ROOT, "content", "projects.md"), "utf8")).data.apps || [];

let notes = 0;
for (const app of apps.filter((a) => a.showcase)) {
  const dir = path.join(CODE, app.showcase, "showcase");
  const sj = path.join(dir, "showcase.json");
  if (!fs.existsSync(sj)) { console.error(`${app.name}: no ${sj}`); process.exit(1); }
  const facts = JSON.parse(fs.readFileSync(sj, "utf8"));
  if (facts.public !== true) { notes++; console.log(`${app.name}: its showcase says public: ${facts.public}, but projects.md lists it`); }
  const copied = [];
  for (const [src, out] of [["light.png", `${app.showcase}.png`], ["dark.png", `${app.showcase}-dark.png`]]) {
    const from = path.join(dir, src);
    if (!fs.existsSync(from)) { if (src === "light.png") { console.error(`${app.name}: no ${from}`); process.exit(1); } continue; }
    execFileSync("sips", ["-z", "600", "960", from, "--out", path.join(OUT, out)], { stdio: "pipe" });
    copied.push(out);
  }
  console.log(`${app.name} ← ${app.showcase}/showcase (${copied.join(", ")}, updated ${facts.updated || "?"})`);
  if (app.image !== `${app.showcase}.png`) { notes++; console.log(`  projects.md image is ${app.image}; set it to ${app.showcase}.png`); }
  const dark = copied.includes(`${app.showcase}-dark.png`) ? `${app.showcase}-dark.png` : undefined;
  if (app.image_dark !== dark) { notes++; console.log(`  projects.md image_dark is ${app.image_dark}; set it to ${dark}`); }
  // KB's wording wins; these are suggestions only
  for (const k of ["line", "url", "repo"]) {
    if (k === "url" && facts.url === "https://kaushik.sh") continue; // the site itself: a link to the page you are on
    if (facts[k] && app[k] !== facts[k] && !(k === "url" && app.url && app.url.startsWith("/"))) {
      notes++; console.log(`  ${k}: projects.md has ${JSON.stringify(app[k])}; showcase has ${JSON.stringify(facts[k])}`);
    }
  }
}
console.log(notes ? `${notes} difference(s) above. projects.md is KB's; change it only if he wants the showcase's version.` : "projects.md matches every showcase");
