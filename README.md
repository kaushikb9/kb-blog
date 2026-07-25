# kb-blog

kaushikbhat.com rebuilt hand-rolled — no framework, no Hugo. Sibling design
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
node build.js                        # → dist/
python3 -m http.server -d dist 8654  # preview
```

## Verified parity with the live Hugo site

- Every content URL from the old sitemap resolves (posts, traces, hike,
  about, ideas, blog, tags, us-trip-gems)
- RSS GUIDs byte-identical for all dated content; ai-inspired-shipping now
  included (Hugo's `_index.md` bug had excluded it); undated about/ideas
  dropped from feed
- Deliberately dropped: /search/ (12 documents), /page/2/ (no pagination),
  /categories/ /series/ /social/ (empty taxonomies), 4 stale empty tag pages
  that were already contentless on the old site

## Not yet done (pre-publish checklist)

- Decision to publish at all (this is a local rebuild for evaluation)
- Cloudflare Pages project in the account that owns kaushikbhat.com + cutover
- `_redirects` for /search/ and /page/2/ → /blog/
- Image WebP conversion (8 PNGs served as-is for now)
- Analytics (old site's token was a broken placeholder — decide if wanted)
