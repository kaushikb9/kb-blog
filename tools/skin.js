// Put on a different skin: npm run skin -- outie
// Closes the live skin's stint today (it moves to /skins/<old>/ on the next
// build) and opens one for the new skin. Only edits site.json; deploy is separate.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "site.json");
const name = process.argv[2];
const skins = fs.readdirSync(path.join(ROOT, "skins"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, "skins", e.name, "templates.js"))).map((e) => e.name);

if (!name || !skins.includes(name)) {
  console.error(`usage: npm run skin -- <name>   (skins on disk: ${skins.join(", ")})`);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(FILE, "utf8"));
if (cfg.live === name) { console.log(`${name} is already live.`); process.exit(0); }

const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
cfg.history ||= [];
const open = cfg.history.find((x) => x.skin === cfg.live && !x.to);
if (open) open.to = today;
cfg.history.push({ skin: name, from: today });
const was = cfg.live;
cfg.live = name;
fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2) + "\n");
console.log(`live skin: ${was} → ${name}. ${was} will be archived at /skins/${was}/.
next: ./check.sh, look at it with npm run dev, then npm run deploy when you want it out.`);
