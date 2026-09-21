# kb-blog

kaushik.sh (kaushikbhat.com until 2026-09-19; the old host 301s here), rebuilt hand-rolled (2026-07-25) — replaced the Hugo/PaperMod
site kb-hugo (local copy deleted 2026-07-28; repo archived 2026-08-29 at
github.com/kaushikb9/kb-hugo, its Pages project deleted the same day). Live Pages
project `kb-blog` (kb-blog-44d.pages.dev), custom domain kaushik.sh (+ www),
same Cloudflare account as antifeed.

Design language: **`../brain/design-system/`** is canonical for tokens, type scale,
theme presets and the cross-app invariants — read `INVARIANTS.md` before
touching type, colour or interaction.

## Run · verify · deploy

```sh
npm run build    # content/ → dist/  (node build.js)
npm run dev      # localhost:8654 preview + ✎ edit, LOCAL ONLY
./check.sh       # build, then hold dist/ to the invariants below — ~1s, offline (npm test is the same)
npm run deploy   # ./check.sh && wrangler pages deploy dist  (only when KB asks; refuses on red)
```

`./check.sh` is `node --test tests/*.test.js`: every route the old site had is
emitted; every internal link resolves (or is a `_redirects` source); every RSS
GUID equals its permalink and every feed/sitemap entry is a real page; the
`style.css?v=` hash matches the CSS that shipped; tag URLs are slugified;
every post/trace has a title and a parseable date and no `_index.md`; every
shelf entry has a title, an http(s) url, a known kind and (if given) a
parseable date, is linked from `/shelf/` and is absent from the feed. Hand
work back only after it passes. Don't run it while `npm run dev` is up —
the watch-rebuild races the test build and produces phantom failures.

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
  `shelf/` (links out — see below), `shelf.md` (the shelf page's intro),
  `about.md`, `ideas.md` (page exists, deliberately NOT in nav), `home.md`
  (the bio), `now.txt` (one plain line shown in the gold "now" pill),
  `lab.md` (the `/lab/` page: frontmatter `apps:` and `talks:` lists ARE the
  data, body unused; screenshots in `lab/`, 640×400 PNG, copied to `/lab/`).
  It is a two-column gallery of card tiles: screenshot on top · name · one
  line · links (`url` → "open", `repo` → "github", public repos only),
  nothing else (rows, audience chips and "since" years were built and cut on
  2026-09-19 — the tagline carries who each is for). A tile without links
  has no link row; without `image` it is text-only — a section with an
  empty list is not emitted.
- `build.js` (~370 lines, deps: marked + gray-matter) — renders everything
  to `dist/`: home (bio + now + writing-by-year), posts,
  archives (/blog/ + /posts/), traces w/ kind filter, shelf, lab, tags, hikes,
  RSS, sitemap, 404. Also emits `.sources.json` (url → content file) for dev.js.
- `dev.js` — LOCAL ONLY (binds 127.0.0.1, writes files; never deploy).
  `node dev.js` → localhost:8654: preview + ✎ edit button on content pages
  (markdown textarea → Save & rebuild) + watch-rebuild on file changes.
- `assets/` — one CSS file + icons. `static/` — robots.txt, llms.txt,
  `_redirects`, us-trip-gems (passthrough).
- `migrate.js` — the one-time Hugo importer; historical reference only.

### The shelf (`/shelf/`, added 2026-09-20)

Tweets, articles, talks and books that got KB thinking, each with the date
he found it and a note on why — a journal of taste, not a bookmarks dump.
One file per entry, `content/shelf/<slug>.md` (no date prefix; the date is
frontmatter because it gets filled in later):

```yaml
---
title: "Build a great product and get users and win"
url: https://x.com/sama/status/630869612536725504   # links OUT; no page of its own
by: Sam Altman
kind: tweet          # tweet | article | talk | book — check.sh rejects anything else
date: 2026-09-20     # the day KB found it. OMIT if unknown — never guess a date
---
The note, in KB's words. Markdown. Empty is allowed (the row just has no note).
```

Rendering: dated entries newest-first, then an "undated" group (by title)
for ones found before he kept dates — those move up once he backdates
them from Slack/email. Kind filter only offers kinds that occur. Notes are
always visible, never behind a tap. Deliberately NOT in RSS (link notes
would spam subscribers). The intro is `content/shelf.md`.

## Invariants (breaking these breaks inbound links/subscribers)

- URLs: `/posts/<slug>/`, `/traces/<date-prefixed-slug>/`, `/about/`,
  `/ideas/`, `/blog/`, `/tags/<slug>/` — parity with the old Hugo site.
  `/shelf/` (2026-09-20) has no per-entry pages.
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
  theme toggle. Blog nav (since 2026-09-20): writing · shelf · lab · about.
  `lab` took the "other property" slot: antifeed was dropped from the nav
  and footer and is now a lab tile. antifeed still links back as "kb".
- Traces are unlinked, not gone: `/traces/` pages, the tag pages and the
  feed entries keep serving (URL/GUID invariants above) but nothing links
  to them from nav or home. They move to their own subdomain once the
  traces app is built (see ~/Code/traces); don't put them back in the nav.
- antifeed deliberately stays on pages.dev, NOT a kaushik.sh
  subdomain — KB may spin it out as an independent product later. Don't
  "helpfully" suggest the subdomain again.
- Stylesheet URL is content-hashed by build.js (`style.css?v=<md5>`) so
  stale CSS can't pair with fresh HTML. Theme toggle: auto→light→dark,
  localStorage `kb:theme`, applied pre-paint in <head>.

## Deploy

```sh
npm run deploy   # = ./check.sh && npx wrangler pages deploy dist --project-name kb-blog --branch main
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

## Deferred — don't build unless asked

- Analytics of any kind (open item, not a yes).
- WebP conversion of the eight PNGs.
- A search page, a newsletter, comments. The blog is ~12 documents; it does
  not need a system.
- Shelf extras: per-entry pages, a shelf-only feed, theme grouping, and an
  antifeed → shelf hand-off. KB mentioned the last one as "maybe later";
  it is not a yes.
- A home-page strip pointing at `/lab/` — mocked as Frame 2 on 2026-09-19,
  rejected. Home stays bio · now · writing.
- Lab thumbnails for kaizen and brain: KB supplies sanitised PNGs; never
  capture them from a paired session. Talks render when `talks:` has an
  entry — KB owes the list.
