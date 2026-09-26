# kb-blog

kaushik.sh (kaushikbhat.com until 2026-09-19; the old host 301s here), rebuilt hand-rolled (2026-07-25) — replaced the Hugo/PaperMod
site kb-hugo (local copy deleted 2026-07-28; repo archived 2026-08-29 at
github.com/kaushikb9/kb-hugo, its Pages project deleted the same day). Live Pages
project `kb-blog` (kb-blog-44d.pages.dev), custom domain kaushik.sh (+ www),
same Cloudflare account as antifeed.

**The site is skinned (since 2026-09-26).** Its look is a swappable skin over a
fixed core, changed every 6 to 12 months; past skins stay up at
`/skins/<name>/`. Read **`skins/README.md`** before touching any HTML or CSS.
It holds the contract every skin meets. Live skin: `outie` (C, the person
first; KB's pick 2026-09-26, wearing the sunset slice-of-life portrait in both themes). Built and
ready: `paper` (the original, archived at `/skins/paper/` once Outie ships), `manga` (C3, comic panels; posts are episodes),
`matchday` (C4, football programme; shirt number = publish order). `../brain/design-system/INVARIANTS.md` still binds every skin's
product and interaction rules. The Paper skin uses the shared tokens; other
skins keep the six token names but choose their own values.

## Run · verify · deploy

```sh
npm run build    # content/ → dist/  (node build.js)
npm run dev      # localhost:8654 preview + ✎ edit + a pill to flip between every skin, LOCAL ONLY (builds into .dev/)
./check.sh       # build, then hold dist/ to the invariants below — ~1s, offline (npm test is the same)
npm run skin -- outie   # swap the live skin (edits site.json only; the old skin moves to /skins/<old>/)
npm run deploy   # ./check.sh && wrangler pages deploy dist  (only when KB asks; refuses on red)
```

`./check.sh` is `node --test tests/*.test.js`: every route the old site had is
emitted; every internal link resolves (or is a `_redirects` source); every RSS
GUID equals its permalink and every feed/sitemap entry is a real page; the
`style.css?v=` hash matches the CSS that shipped; tag URLs are slugified;
every post/trace has a title and a parseable date and no `_index.md`; every
shelf entry has a title, an http(s) url, a known kind and (if given) a
parseable date, is linked from `/shelf/` and is absent from the feed. Then
`tests/skins.test.js` builds **every skin on disk as if it were live** and
holds each to the same contract: every route, every link, the core `<head>`,
a pre-paint theme script, nothing loaded from another host, the six shared
tokens, and the shelf and projects rules. It also builds a simulated swap,
checking that the archived skin is whole, noindex, canonical to the live URL
and absent from feed and sitemap. It builds `--preview` too, and the deployed
build must contain no previews. Hand work back only after it passes. It is safe to run while `npm run dev`
is up: dev builds into `.dev/` and never shares `dist/` with the check.
They shared it until 2026-09-26, when an estate-wide `check-all.sh`
rebuilt `dist/` under a running preview and every `/skins/<name>/` went 404.

## Why it's built this way

KB wanted the blog to stop feeling like stock PaperMod and to be a substrate
agents can edit directly. Design extends antifeed's language (warm paper /
ink / gold, same card + row grammar) — the two properties are deliberate
siblings. ~12 documents don't need a static-site generator; `build.js` IS the
generator.

On 2026-09-26 KB decided the look should be swappable: "no point in being
formal in the age of AI when you can swap in, swap out any time you like."
So `build.js` was split into a core, which owns what must never change
(URLs, GUIDs, `<head>`, feed, sitemap), and skins, which only turn data
into HTML and CSS. The split was proven by porting the existing design into
`skins/paper` with a byte-identical `dist/` before anything else changed.

## Layout

- `content/` — ALL prose is markdown + YAML frontmatter: `posts/` (page
  bundles or flat files; `draft: true` renders only in the dev preview and
  never reaches `dist/`, feed or sitemap — check.sh holds it), `traces/` (short notes, `trace_kind`:
  spark/reflect/peak — "flag" was dropped 2026-07-25, unused), `hikes/`,
  `shelf/` (links out — see below), `shelf.md` (the shelf page's intro),
  `about.md`, `ideas.md` (page exists, deliberately NOT in nav), `home.md`
  (the bio; optional frontmatter `lede` = the bio minus its greeting, for
  skins that set the greeting as a headline), `now.txt` (one plain line, the "now" pill),
  `talks/` (see "Talks" below), `projects.md` (the `/projects/` page: frontmatter `apps:` list IS the
  data, body unused; screenshots in `projects/`, 640×400 PNG, copied to `/projects/`).
  It is a two-column gallery of card tiles: screenshot on top · name · one
  line · links (`url` → "open", `repo` → "github", public repos only),
  nothing else (rows, audience chips and "since" years were built and cut on
  2026-09-19 — the tagline carries who each is for). A tile without links
  has no link row; without `image` it is text-only — a section with an
  empty list is not emitted.
- `build.js` (entry, deps: marked + gray-matter): reads `site.json`, renders the
  live skin at `/`, each past skin at `/skins/<name>/`, then the feed and
  sitemap. Flags: `--preview` (dev only: every other skin too), `--skin <name>`,
  `--config <file>`, `--out <dir>`. Also emits `.sources.json` (url → content file) for dev.js.
- `core/`: `load.js` (content → one data object), `render.js` (routes,
  `<head>`, feed, sitemap, rendering a skin under a prefix), `util.js`.
- `skins/<name>/`: `templates.js` (17 functions), `skin.json`,
  `assets/style.css` + `fonts/` + `portraits/`. Contract in `skins/README.md`.
- `site.json`: the live skin and the history of every skin worn, with dates.
  `/skins/` (the list of skins) is emitted once there is a past skin.
- `tools/skin.js` (`npm run skin -- <name>`), `tools/portraits.js`
  (`npm run portraits`: copies each skin's chosen portraits in from `~/Code/me`,
  web-sized with macOS sips. The choice lives in the skin's `skin.json`, and
  `-- --suggest` lists what `me` would change), `tools/deck.js`
  (a talk deck → its scrubbed, embeddable copy; see "Talks").
- `dev.js`: LOCAL ONLY (binds 127.0.0.1, writes files; never deploy).
  `node dev.js` → localhost:8654 builds with `--preview --out .dev` (its own
  dir, never `dist/`): ✎ edit button on
  content pages (in any skin), a skin pill bottom-left that opens the same
  page in each skin, and a watch-rebuild on `content/` and `skins/`.
- `assets/`: shared icons + manifest + `deck-viewer.js` (the CSS belongs to each skin).
  The icon is "kb" in Bricolage Grotesque 800, kept quiet (2026-09-26; a cobalt tile was
  "very in your face"): the tab icon is bare letters that turn navy or cream with the browser
  theme; favicon.ico and home-screen icons are cream on a navy tile. Made by
  `python3 tools/favicon.py` from outlines in `tools/favicon-glyphs.json` (extracted once with
  fontTools; regenerating needs only sips). A favicon can't load web fonts, hence outlines. The
  maskable icon keeps the letters inside Android's safe circle.
  `static/`: robots.txt, llms.txt, `_redirects`, us-trip-gems (passthrough).
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

### Talks (`/talks/`, added 2026-09-26)

Talks KB has given, modelled on jvns.ca/talks. One bundle per talk,
`content/talks/<slug>/`: `index.md` + `slides.html` (the scrubbed deck, plus
`slide-NN.jpg` when it came from a PDF) + `poster.jpg`. Frontmatter: `title`, `date`, `where`, `length` ("11 min"),
`description`, `slides` (a bundle file or an https URL), `video` (https,
optional), `poster` (optional), `draft`. The body is optional and short; the
slides carry the talk, so there are no long write-ups.

- **The list** (`/talks/`): one row per talk, and the whole row is the link.
  Poster · date and where · title · **the blurb** (`description`, always
  visible, on phones too) · what it has ("14 slides · video"). No CTAs on a
  row (KB, 2026-09-26: "don't give all CTAs in the main page"). The blurb is
  not optional: a title alone "is just self-show-off with no incentive for the
  reader to go check the details" (KB, same day). check.sh rejects a
  published talk whose description is under 80 characters or says "to come".
- **The page**: kicker · title · the blurb as lede, then **the slides inline**,
  then only what exists (a "Watch the talk" card if `video:`, the photo). No
  slides but a video → the video's still with a play mark leads the page and
  opens YouTube (`ctx.talk.video`; JSFoo 2014). Neither → the photo.
- **The viewer**: markup from `core/talk.js` (`ctx.talk.deck(t)`; every skin
  calls it and only styles it), behaviour in `assets/deck-viewer.js`. The deck
  runs same-origin in an iframe with its own chrome hidden; our bar under it is
  ‹ 06 / 14 ›, a rail with one tick per slide (titles read from the deck at
  build), the slide's title and full screen. Keys ← → F, swipe inside the
  deck, and `#n` in the URL links a slide. Tested by hand in a browser
  2026-09-26: deep link, rapid clicks, keys inside and outside the deck, phone.
- **Decks go through `tools/deck.js`**, never copied by hand. A PDF (often
  image-only exports) takes `--pages 1,5,6` (the subset, in order) and
  `--titles "A|B|C"` (the rail's titles; default: each page's first line of
  text): it renders only those pages to `slide-NN.jpg` and writes an image deck
  with the same viewer protocol, so a PDF's placeholders and unused pages never
  ship. For the record: Harness = Masterclass pages 1,5,6,8,9 (KB's section plus
  the cover); Scaling CX = skills-journey pages 3–6 (2 and 7 were `[XX]`
  placeholders, 1 was the Feb 2026 title). An HTML deck: it strips
  speaker notes, drops named slides (`--drop 2,3`), removes extra matches
  (`--cut <regex>`), renumbers, and adds the embed shim that talks to the
  viewer. It refuses when the deck's shape surprises it. Sources stay in
  iCloud Drive `On the Stage/` (me.json names them as `icloud:` paths). The ai-os command, for the record:
  `node tools/deck.js "$HOME/Library/Mobile Documents/com~apple~CloudDocs/On the Stage/My Creations/slash-deck-magicball-unicorn-summit.html" content/talks/ai-os/slides.html --drop 2,3,4,17 --cut '<div class="num"><div class="v">50\+</div>…'`
  (2–4 were internal chat screenshots, 17 and the "50+" were dashboard-only figures).
- **Talks are the exception to "never name the employer"** (KB, 2026-09-26):
  what was said on stage is already public, so the logo and product names
  stay. Speaker notes, internal screenshots and dashboard-only numbers never
  ship; check.sh holds the notes and the private-names list.
- A published talk needs slides **or** a video (KB, 2026-09-26); without
  either it stays `draft: true` (the Digital Native panel today). Not in RSS;
  in the sitemap. A video's poster is its public thumbnail, downloaded into the
  bundle (KB approved it for JSFoo), never hot-linked.

## Invariants (breaking these breaks inbound links/subscribers)

- URLs: `/posts/<slug>/`, `/talks/<slug>/`, `/traces/<date-prefixed-slug>/`, `/about/`,
  `/ideas/`, `/blog/`, `/tags/<slug>/` — parity with the old Hugo site.
  `/shelf/` (2026-09-20) has no per-entry pages.
- RSS `/index.xml`: GUID = full permalink (Hugo-compatible). Don't change
  GUIDs of existing entries — subscribers would see re-delivery.
- Tag URLs are SLUGIFIED (`"AI tools"` → `/tags/ai-tools/`) exactly because
  Hugo did that; raw tag names stay as display text.
- `_redirects` 301s the retired routes (/search/, /page/*, empty
  taxonomies). Keep it.

## Cross-skin invariants

- ~~Masthead geometry mirrors antifeed~~: **dropped 2026-09-26** (KB: ignore
  it). A skin sets its own masthead; antifeed keeps the shared language
  alone.
- Nav pattern in every skin: [content links] · [other property] · about ·
  theme toggle. Blog nav (since 2026-09-26, KB's order): writing · talks ·
  projects · shelf · about. Plain nouns on purpose: a verb family ("writes ·
  talks · builds · reads") was considered and not taken, because a reader
  should never have to guess what is behind a nav word.
  `projects` took the "other property" slot: antifeed was dropped from the nav
  and footer and is now a projects tile. antifeed still links back as "kb".
- Traces are unlinked, not gone: `/traces/` pages, the tag pages and the
  feed entries keep serving (URL/GUID invariants above) but nothing links
  to them from nav or home. They move to their own subdomain once the
  traces app is built (see ~/Code/traces); don't put them back in the nav.
- antifeed deliberately stays on pages.dev, NOT a kaushik.sh
  subdomain — KB may spin it out as an independent product later. Don't
  "helpfully" suggest the subdomain again.
- Stylesheet URL is content-hashed per skin (`style.css?v=<md5>`, and
  `/skins/<name>/style.css?v=` for an archived copy) so stale CSS can't pair
  with fresh HTML. Theme toggle: auto→light→dark, localStorage `kb:theme`
  (shared by every skin on the origin; an unknown value falls back to
  auto), applied pre-paint in <head>.

## Learned the hard way (skins)

- **Blog rules live in this repo; `~/Code/me` is read-only here** (KB,
  2026-09-26). An agent here re-pointed `me.json` roles and edited
  `me/AGENTS.md` to change the site's portrait. Both were reverted: "me can
  have suggestions for us but you don't go and change that yourselves."
  The blog pins its own portraits in `skin.json`; `me`'s roles are shown
  by `npm run portraits -- --suggest` and never adopted automatically.
  The same goes for any other repo this one reads from.

- **Prove a split with a byte-identical build.** Snapshot `dist/`, refactor,
  `diff -r`. Only then change anything visible. The skins split landed that
  way with zero diff, so every later diff was a decision.
- **Tests check semantic hooks, not a skin's class names.** One test looked
  for `<h3 class="section-label">apps</h3>`, which any new skin would have
  broken. It now reads `data-section="apps"`, which every skin emits.
- **Internal links go through `ctx.u()`, always.** A hard-coded `/posts/…` in
  a template works live and silently leaves the archive, and the archive
  link test catches it.
- **Retired skins stay in the tree, on purpose.** This bends "delete, don't
  park" by KB's call (2026-09-26). They are still served and still tested,
  so they are not dead code. A skin that is not live, not archived and
  nobody is trying out gets deleted.

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
- A home-page strip pointing at `/projects/` — mocked as Frame 2 on 2026-09-19,
  rejected. Home stays bio · now · writing (Outie keeps it: its hero is bio + now).
- C2 "portraits as theme presets" (mocked in the redesign canvas,
  https://claude.ai/artifact/XP5BEazapu9Ck28YwGWewo) is not built. New
  headshots are arriving in ~/Code/me/round-*; round 4 comes in light/dark
  pairs made for presets. C3/C4 post pages were built without a mockup by
  KB's call (2026-09-26): judge them in the dev preview.
- A per-skin `og:image` (the portrait as the share card).
- Projects thumbnails for kaizen and brain: KB supplies sanitised PNGs; never
  capture them from a paired session.
- Talks in the feed (a published talk as an RSS item). Out by KB's call, 2026-09-26.
- Embedding a talk video. A `video:` is linked out, never iframed (no other host).
