// Blur boxes on slide images, in place. Called by tools/deck.js --blur with
// [{file, rects:[{x0,y0,x1,y1}]}] where coordinates are fractions of the page.
// Headless Chromium from the shared ~/Code/node_modules/playwright: a canvas is
// the one image editor available without adding a dependency to this repo.
import fs from "fs";
import { chromium } from "playwright";
const jobs = JSON.parse(process.argv[2]);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, rects } of jobs) {
  const src = "data:image/jpeg;base64," + fs.readFileSync(file).toString("base64");
  const out = await page.evaluate(async ({ src, rects }) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    for (const r of rects) {
      const th = (r.y1 - r.y0) * img.height, px = 0.08 * th, py = 0.35 * th; // little sideways padding: never touch the next word
      const x = Math.max(0, r.x0 * img.width - px), y = Math.max(0, r.y0 * img.height - py);
      const w = Math.min(img.width - x, (r.x1 - r.x0) * img.width + 2 * px), h = Math.min(img.height - y, th + 2 * py);
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.filter = `blur(${Math.max(8, Math.round(h / 4))}px)`;
      for (let k = 0; k < 3; k++) g.drawImage(c, 0, 0); // three passes: unreadable, not just soft
      g.restore();
    }
    return c.toDataURL("image/jpeg", 0.82);
  }, { src, rects });
  fs.writeFileSync(file, Buffer.from(out.split(",")[1], "base64"));
  console.log(`  blurred ${rects.length} box(es) in ${file.split("/").pop()}`);
}
await browser.close();
