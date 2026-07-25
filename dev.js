// Local dev server: preview + in-browser markdown editing + rebuild on save.
// LOCAL ONLY — binds 127.0.0.1, never deploy this. `node dev.js` then open
// http://localhost:8654 — every content-backed page gets a floating ✎ edit
// button that opens its markdown; saving rebuilds and returns to the page.
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const PORT = 8654;
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp",
};

const sources = () => JSON.parse(fs.readFileSync(path.join(ROOT, ".sources.json"), "utf8"));

function rebuild() {
  execFileSync("node", [path.join(ROOT, "build.js")], { stdio: "inherit" });
}

let timer = null;
fs.watch(path.join(ROOT, "content"), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => { try { rebuild(); console.log("rebuilt (watch)"); } catch (e) { console.error(e.message); } }, 200);
});

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function editPage(url, file) {
  const text = fs.readFileSync(path.join(ROOT, file), "utf8");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>edit · ${esc(file)}</title><link rel="stylesheet" href="/style.css">
<style>
textarea { width: 100%; min-height: 70vh; background: var(--card); color: var(--ink);
  border: 1px solid var(--line); border-radius: 12px; padding: 1rem;
  font: 0.9rem/1.6 ui-monospace, "SF Mono", Menlo, monospace; resize: vertical; }
textarea:focus { outline: none; border-color: var(--gold); }
.bar { display: flex; gap: 0.75rem; align-items: center; margin: 1rem 0; }
</style></head><body>
<header class="site-head"><a class="wordmark" href="/">kaushik<span>bhat</span></a>
<nav><a href="${url}">← back without saving</a></nav></header>
<div class="kicker">editing <span class="meta">${esc(file)}</span></div>
<form method="POST" action="/__save">
<input type="hidden" name="url" value="${esc(url)}">
<textarea name="text">${esc(text)}</textarea>
<div class="bar"><button class="go" type="submit">Save & rebuild</button>
<span class="meta" style="color:var(--muted);font-size:0.8rem">markdown in, site out — saves straight to the file</span></div>
</form></body></html>`;
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");

  if (u.pathname === "/__edit") {
    const target = u.searchParams.get("u") || "/";
    const file = sources()[target];
    if (!file) { res.writeHead(404); return res.end("no editable source for " + target); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(editPage(target, file));
  }

  if (u.pathname === "/__save" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const p = new URLSearchParams(body);
      const target = p.get("url"), file = sources()[target];
      if (!file) { res.writeHead(400); return res.end("unknown page"); }
      fs.writeFileSync(path.join(ROOT, file), p.get("text").replace(/\r\n/g, "\n"));
      try { rebuild(); } catch (e) { res.writeHead(500); return res.end("build failed:\n" + e.message); }
      res.writeHead(302, { location: target });
      res.end();
    });
    return;
  }

  // static from dist/, with ✎ edit button injected on editable pages
  let rel = u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname;
  let file = path.join(DIST, rel);
  if (!fs.existsSync(file) && fs.existsSync(file + "/index.html")) file += "/index.html";
  if (!fs.existsSync(file)) { file = path.join(DIST, "404.html"); res.statusCode = 404; }
  const ext = path.extname(file);
  res.setHeader("content-type", MIME[ext] || "application/octet-stream");
  let data = fs.readFileSync(file);
  if (ext === ".html" && sources()[u.pathname]) {
    data = data.toString().replace("</body>", `
<a href="/__edit?u=${encodeURIComponent(u.pathname)}" title="edit this page's markdown"
   style="position:fixed;right:1rem;bottom:1rem;background:var(--card);border:1px solid var(--gold);
   color:var(--gold);border-radius:99px;padding:0.45rem 0.9rem;text-decoration:none;
   font-weight:700;font-size:0.85rem;box-shadow:0 1px 4px rgba(0,0,0,0.1)">✎ edit</a>
</body>`);
  }
  res.end(data);
}).listen(PORT, "127.0.0.1", () => console.log(`dev server → http://localhost:${PORT} (edit mode on)`));
