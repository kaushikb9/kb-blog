// Regenerate showcase/light.png and dark.png (1280×800): the live skin's home
// page, built from this repo into a temp dir and served locally. The site is
// public, so its own content is the screenshot; nothing private is involved.
// Run: node showcase/shoot.mjs   (Playwright from ~/Code/node_modules)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = mkdtempSync(join(tmpdir(), "kb-blog-showcase-"));
execFileSync("node", ["build.js", "--out", out], { cwd: repo, stdio: "ignore" });

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let p = join(out, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
for (const look of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: look });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(repo, "showcase", `${look}.png`) });
  console.log(`showcase: ${look}.png`);
  await page.close();
}
await browser.close();
server.close();
