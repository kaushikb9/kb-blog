# kb-blog

kaushikbhat.com, rebuilt hand-rolled (2026-07-25) — replaced the Hugo/PaperMod
site in `~/Code/kb-hugo` (kept on disk as archive; do not edit it). Live Pages
project `kb-blog` (kb-blog-44d.pages.dev), custom domain kaushikbhat.com,
same Cloudflare account as antifeed.

## Why it's built this way

KB wanted the blog to stop feeling like stock PaperMod and to be a substrate
agents can edit directly. Design extends antifeed's language (warm paper /
ink / gold, same card + row grammar) — the two properties are deliberate
siblings. ~12 documents don't need a static-site generator; `build.js` IS the
generator.

## Layout

- `content/` — ALL prose is markdown + YAML frontmatter: `posts/` (page
  bundles or flat files), `traces/` (short notes, `trace_kind`:
  spark/reflect/peak — "flag" was dropped 2026-07-25, unused), `hikes/`,
  `about.md`, `ideas.md` (page exists, deliberately NOT in nav), `home.md`
  (the bio), `now.txt` (one plain line shown in the gold "now" pill).
- `build.js` (~300 lines, deps: marked + gray-matter) — renders everything
  to `dist/`: home (bio + now + writing-by-year + traces strip), posts,
  archives (/blog/ + /posts/), traces w/ kind filter, tags, hikes, RSS,
  sitemap, 404. Also emits `.sources.json` (url → content file) for dev.js.
- `dev.js` — LOCAL ONLY (binds 127.0.0.1, writes files; never deploy).
  `node dev.js` → localhost:8654: preview + ✎ edit button on content pages
  (markdown textarea → Save & rebuild) + watch-rebuild on file changes.
- `assets/` — one CSS file + icons. `static/` — robots.txt, llms.txt,
  `_redirects`, us-trip-gems (passthrough).
- `migrate.js` — the one-time Hugo importer; historical reference only.

## Invariants (breaking these breaks inbound links/subscribers)

- URLs: `/posts/<slug>/`, `/traces/<date-prefixed-slug>/`, `/about/`,
  `/ideas/`, `/blog/`, `/tags/<slug>/` — parity with the old Hugo site.
- RSS `/index.xml`: GUID = full permalink (Hugo-compatible). Don't change
  GUIDs of existing entries — subscribers would see re-delivery.
- Tag URLs are SLUGIFIED (`"AI tools"` → `/tags/ai-tools/`) exactly because
  Hugo did that; raw tag names stay as display text.
- `_redirects` 301s the retired routes (/search/, /page/*, empty
  taxonomies). Keep it.

## Sibling-platform invariants (shared with antifeed's CLAUDE.md)

- Masthead geometry (body width/padding, wordmark size/weight) mirrors
  antifeed exactly — change in both repos or not at all.
- Nav pattern on both sites: [content links] · [other property] · about ·
  theme toggle. Blog nav: writing · traces · antifeed · about. antifeed
  links back as "kb".
- antifeed deliberately stays on pages.dev, NOT a kaushikbhat.com
  subdomain — KB may spin it out as an independent product later. Don't
  "helpfully" suggest the subdomain again.
- Stylesheet URL is content-hashed by build.js (`style.css?v=<md5>`) so
  stale CSS can't pair with fresh HTML. Theme toggle: auto→light→dark,
  localStorage `kb:theme`, applied pre-paint in <head>.

## Deploy

```sh
node build.js && npx wrangler pages deploy dist --project-name kb-blog --branch main
```

Static-only (no functions/), so no bundle gotcha here — but run from repo
root anyway. The pages.dev alias lags a deploy ~10-30s and caches hard;
cache-bust when verifying.

## History worth knowing

- Hugo-era bug: `posts/ai-inspired-shipping` used `_index.md` (branch
  bundle), which silently excluded it from RSS and made its tag pages
  render empty for the site's whole life. Fixed in migration.
- Old site's Cloudflare analytics token was a placeholder — analytics was
  never on. Deciding whether to add any is an open item.
- Images are original PNGs (8 of them); WebP conversion is a deferred nicety.
