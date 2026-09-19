# kb-blog

kaushik.sh (formerly kaushikbhat.com) rebuilt hand-rolled — no framework, no Hugo. Sibling design
language to antifeed (warm paper / ink / gold).

- `content/` — markdown with YAML frontmatter (migrated from kb-hugo,
  frontmatter normalized, one tweet shortcode replaced with a blockquote)
- `build.js` — the entire "static site generator" (~250 lines):
  markdown → HTML, home + archives + traces (kind filter) + tags + about/
  ideas + hikes, RSS with GUIDs identical to the Hugo feed, sitemap, 404
- `assets/` — one CSS file, icons
- `static/` — robots.txt, llms.txt, us-trip-gems (passthrough)
- `migrate.js` — one-time importer from ../kb-hugo (kept for reference)

```sh
node dev.js      # preview at localhost:8654 with in-browser editing:
                 #   ✎ edit button on every content page → markdown textarea
                 #   → Save & rebuild. Direct file edits auto-rebuild too.
node build.js    # plain one-shot build → dist/
```

Everything readable is markdown in `content/` — posts, traces, about,
ideas, the home bio (`home.md`), the "now" line (`now.txt`). `dev.js` is
LOCAL ONLY (binds 127.0.0.1, writes files) — never deploy it; production
is just the static `dist/`.

## Verified parity with the live Hugo site

- Every content URL from the old sitemap resolves (posts, traces, hike,
  about, ideas, blog, tags, us-trip-gems)
- RSS GUIDs byte-identical for all dated content; ai-inspired-shipping now
  included (Hugo's `_index.md` bug had excluded it); undated about/ideas
  dropped from feed
- Deliberately dropped: /search/ (12 documents), /page/2/ (no pagination),
  /categories/ /series/ /social/ (empty taxonomies), 4 stale empty tag pages
  that were already contentless on the old site

## Status

Published: Cloudflare Pages project `kb-blog`, serving kaushik.sh (kaushikbhat.com 301s to it since 2026-09-19).
`_redirects` covers retired routes. Still open, someday: image WebP
conversion (8 PNGs served as-is), analytics (old site's token was a broken
placeholder — decide if wanted at all).
