// Copy each skin's portraits in from ~/Code/me. The BLOG decides which portrait
// goes where: skin.json → "portraits": { "<slot>": "<me item id>" }, e.g.
// { "day": "canon/sunset-slice-of-life" }. This resizes that item's original
// (macOS sips, 720px, JPEG q82) to skins/<skin>/assets/portraits/<slot>.jpg.
// A slot can also crop first, for a small avatar out of a tall scene:
// { "id": "keepers/terrace-light", "crop": [cx, cy, side], "px": 240 } where cx, cy
// are the square's centre and side its width, all as fractions of the image width/height.
//
// ~/Code/me is a read-only source (KB, 2026-09-26): this never writes there, and
// its me.json "roles" are only suggestions. --suggest lists where a role there
// differs from what a skin wears; adopting one is a skin.json edit, made here.
//
//   npm run portraits                 copy every skin's chosen portraits in
//   npm run portraits -- --suggest    what me.json's roles would change (never fails, never writes)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ME = process.env.KB_ME || path.join(ROOT, "..", "me");
const suggest = process.argv.includes("--suggest");

const manifest = path.join(ME, "me.json");
if (!fs.existsSync(manifest)) { console.error(`no ${manifest} — set KB_ME to the me repo`); process.exit(1); }
const me = JSON.parse(fs.readFileSync(manifest, "utf8")).portraits;
const items = Object.fromEntries(me.items.map((x) => [x.id, x]));

let suggestions = 0;
for (const name of fs.readdirSync(path.join(ROOT, "skins")).sort()) {
  const sj = path.join(ROOT, "skins", name, "skin.json");
  if (!fs.existsSync(sj)) continue;
  const slots = JSON.parse(fs.readFileSync(sj, "utf8")).portraits || {};
  for (const [slot, v] of Object.entries(slots)) {
    const { id, crop, px = 720 } = typeof v === "string" ? { id: v } : v;
    if (suggest) {
      const role = me.roles[slot];
      if (role && role !== id) { suggestions++; console.log(`skins/${name} ${slot}: wears ${id}; me suggests ${role}`); }
      continue;
    }
    if (!items[id]) { console.error(`skins/${name}/skin.json: ${slot} = "${id}", which is not in ${manifest} (pick one of its portraits.items)`); process.exit(1); }
    const out = path.join(ROOT, "skins", name, "assets", "portraits", `${slot}.jpg`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    let src = path.join(ME, items[id].file);
    if (crop) {
      const dim = (k) => +execFileSync("sips", ["-g", k, src]).toString().match(/: (\d+)/)[1];
      const W = dim("pixelWidth"), H = dim("pixelHeight"), [cx, cy, side] = crop;
      const S = Math.round(side * W), x = Math.round(cx * W - S / 2), y = Math.round(cy * H - S / 2);
      if (x < 0 || y < 0 || x + S > W || y + S > H) { console.error(`skins/${name} ${slot}: crop ${JSON.stringify(crop)} falls outside the ${W}×${H} image`); process.exit(1); }
      const tmp = path.join(require("os").tmpdir(), `kb-portrait-${name}-${slot}.png`);
      execFileSync("sips", ["-c", String(S), String(S), "--cropOffset", String(y), String(x), src, "--out", tmp], { stdio: "pipe" });
      src = tmp;
    }
    execFileSync("sips", ["-Z", String(px), "-s", "format", "jpeg", "-s", "formatOptions", "82", src, "--out", out], { stdio: "pipe" });
    console.log(`skins/${name} ${slot} ← ${id}${crop ? " (cropped)" : ""} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  }
}
if (suggest) console.log(suggestions ? `${suggestions} suggestion(s) from me. To take one, edit that skin's skin.json, then npm run portraits.` : "no suggestions: every skin wears what me would suggest");
