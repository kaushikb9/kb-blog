# kb-blog

kaushik.sh (kaushikbhat.com until 2026-09-19; the old host 301s here), rebuilt hand-rolled (2026-07-25) — replaced the Hugo/PaperMod
site kb-hugo (local copy deleted 2026-07-28; repo archived 2026-08-29 at
github.com/kaushikb9/kb-hugo, its Pages project deleted the same day). Live Pages
project `kb-blog` (kb-blog-44d.pages.dev), custom domain kaushik.sh (+ www),
same Cloudflare account as antifeed.

**The site is skinned (since 2026-09-26).** Its look is a swappable skin over a
fixed core, changed every 6 to 12 months; past skins stay up at
`/skins/<name>/`, reached from the "skins for this site" tile on `/projects/` (not the footer). Read **`skins/README.md`** before touching any HTML or CSS.
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
  data, body unused; screenshots in `projects/`, 960×600 PNG plus an optional `image_dark` twin shown when the site is dark, copied to `/projects/`).
  In Outie it borrows the site's own grammar (2026-10-03; the card grid "felt forced"): apps
  with a screenshot read like the talks list (framed still · name · one line · links), the
  rest like the writing rows under a "smaller ones" pill. Links: `url` → "open", `repo` →
  "github", public repos only; nothing else (audience chips and "since" years were built and
  cut on 2026-09-19 — the tagline carries who each is for). A section with an
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
  `-- --suggest` lists what `me` would change), `tools/showcase.js` (`npm run showcase`:
  copies each projects.md app's `showcase:` repo previews, `~/Code/<repo>/showcase/light.png` and
  `dark.png`, to content/projects/<repo>.png and -dark.png at 960×600 with sips, and lists where
  that repo's showcase.json differs from projects.md. Contract: ~/Code/brain/design-system/SHOWCASE.md.
  The repos are read-only and the build never reads them; KB's wording and order in projects.md win), `tools/deck.js`
  (a talk deck → its scrubbed, embeddable copy; see "Talks").
- `dev.js`: LOCAL ONLY (binds 127.0.0.1, writes files; never deploy).
  `node dev.js` → localhost:8654 builds with `--preview --out .dev` (its own
  dir, never `dist/`): ✎ edit button on
  content pages (in any skin), a skin pill bottom-left that opens the same
  page in each skin, and a watch-rebuild on `content/` and `skins/`.
- `assets/share.png`: the 1200×630 share card every page names as `og:image` (X shows it as a
  large card). Drawn from the live skin's hero, lede and day portrait by `node tools/share-card.js`
  (headless Chromium, as `deck-blur.mjs`); rerun it after a skin swap or a new lede.
- `assets/`: shared icons + manifest + `deck-viewer.js` (the CSS belongs to each skin).
  The icon is "kb" in Bricolage Grotesque 800, kept quiet: the tab icon is a tile that inverts with
  the browser theme (cream on navy when light, navy on cream when dark); favicon.ico and home-screen
  icons are cream on navy. A cobalt tile was "very in your face" (2026-09-26); bare letters with no
  tile were "hard to read" at 16px (2026-10-03). Made by
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
  then only what exists (a "Watch the talk" card if `video:`). The "From the day" photo
  card shows only in the dev preview (`ctx.mine`, KB 2026-10-03: the photo already leads the
  /talks/ row, so on the page it was a keepsake for him, not the reader). check.sh holds it.
  Talk photos ship as thumbnails only: at most 400px wide, metadata stripped (KB 2026-10-03,
  privacy from bots and agents; `convert in.jpg -resize 400x -strip -quality 82`). The full
  photo never goes in the bundle. check.sh holds both. No
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
  the cover); Scaling CX = skills-journey pages 1,3–6 (2 and 7 are `[XX]`
  placeholders; KB added the title page, 1, on 2026-10-03). An HTML deck: it strips
  speaker notes, drops named slides (`--drop 2,3`), removes extra matches
  (`--cut <regex>`), renumbers, and adds the embed shim that talks to the
  viewer. It refuses when the deck's shape surprises it, and when any edit below matches nothing.
  Sources stay in iCloud Drive `On the Stage/` (me.json names them as `icloud:` paths).
- **Redactions also go through `tools/deck.js`** (KB's sensitive pass, 2026-10-03), so a rebuild
  keeps them. Image edits run in `tools/deck-blur.mjs` (headless Chromium from the shared
  `~/Code/node_modules/playwright`: a canvas is the only image editor here without a new dependency).
  - `--blur <regex>` (PDF): blurs just the matching words, found with `pdftotext -bbox-layout`.
  - `--swap "<regex>=><text>@<font.ttf>"` (PDF): repaints the whole matching line on the page
    image in that font, sized so the original line would span the same width, in the background
    and ink colours sampled from the slide. Use system fonts: Office's bundled Calibri has a
    scrambled cmap and drops letters. (HTML: `--swap "<regex>=><text>"` is a plain text replace.)
  - `--blur-image "<n>:<x0>,<y0>,<x1>,<y1>"` (HTML): blurs a box, in fractions, on published slide
    n's embedded screenshot.
  - `--cut-band "<n>:<y0>,<y1>"` (PDF): removes a full-width band (fractions of the height) from
    published slide n; everything below moves up. It drops a line and trims the boxes around it in
    one cut, as long as the band holds only that line and plain fill. Take y from
    `pdftotext -bbox-layout` and look at the result.
  - Names: the support AI is called **Agentic CX** on the site, never its internal name (KB,
    2026-10-03: "remove the word … from everywhere"). Product names are blurred; a colleague's
    GitHub handle is blurred; other teams' agent names are replaced by one chip, "50 other agents built org-wide".
- **The two rebuild commands, exactly** (`I` = "$HOME/Library/Mobile Documents/com~apple~CloudDocs/On the Stage/My Creations", `T` = /System/Library/Fonts/Supplemental):
  - ai-os: `node tools/deck.js "$I/slash-deck-magicball-unicorn-summit.html" content/talks/ai-os/slides.html --drop 2,3,4,17 --cut '<div class="num"><div class="v">50\+</div><div class="l">agents created across teams</div></div>' --swap '<span class="chip">Blash</span>[\s\S]*?<span class="chip wide">Security Reviewer</span>=><span class="chip wide">50 other agents built org-wide</span>' --blur-image '6:0.126,0.050,0.210,0.070'`
    (2–4 were internal chat screenshots, 17 was dashboard-only; slide 6 is a real PR, its merger's handle blurred; slide 13's agent names are one chip in KB's words, "50 other agents built org-wide", 2026-10-03).
  - scaling-cx: `node tools/deck.js "$I/<the skills-journey PDF, see me.json>" content/talks/scaling-cx/slides.html --pages 1,3,4,5,6 --titles "Agentic CX: The AI Journey|The Evolution — 5 Phases, 1 Destination|Skills Architecture — How It Works|Horizontal vs Vertical Skills|The Replicable Playbook" --blur "Settlements? (On-Hold|Status|Config|Recon)" --blur "Refund Processing" --blur "Payments" --swap "<internal name>: The AI Journey=>Agentic CX: The AI Journey@$T/Trebuchet MS Bold.ttf" --cut-band "4:0.850,0.931" --cut-band "5:0.172,0.230"`
    (the internal name is the PDF's own word; it is kept out of this file on purpose. Read it from the PDF's title page.
    The bands: slide 4 loses both "Owned by" lines and its cards end after the last row; slide 5 loses its subtitle and goes straight to the steps.)
- **Talks, and the About page, are the exceptions to "never name the employer"** (KB, 2026-09-26; About since 2026-10-02, "fix it" when asked whether it should match the talks):
  what was said on stage is already public, so the logo and product names
  stay. Speaker notes, internal screenshots and dashboard-only numbers never
  ship; check.sh holds the notes and the private-names list.
- A published talk needs slides **or** a video (KB, 2026-09-26); without
  either it stays `draft: true` (the Digital Native panel was one; KB dropped it 2026-10-03 as not
  worthwhile). Not in RSS;
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
root anyway. Verify on `https://kaushik.sh/...?cb=<n>`: since 2026-10-03
pages.dev and the per-deploy preview addresses 301 to kaushik.sh (below),
and the live site lags a deploy ~10-30s and caches hard.

### Cloudflare settings that live outside this repo (applied by KB, 2026-10-03)

Both are dashboard settings; nothing in the code sets them. Both domains are on
the Free plan, which has what these need.

- **WAF custom rule** (zone kaushik.sh → Security → WAF → Custom rules), named
  `talks: block AI bots`, action **Block**:
  `(starts_with(http.request.uri.path, "/talks")) and (cf.verified_bot_category in {"AI Crawler" "AI Assistant" "AI Search"})`.
  Why: KB doesn't want the talks scraped by AI crawlers. Until 2026-10-03 it was a
  Managed Challenge on everyone but search and link previews; KB saw the "Verify you are
  human" box on every visit (in-app browsers drop the clearance cookie), and so would
  anyone tapping a talk from a tweet. Now people never see a challenge.
- **Challenge Passage** (Security → Settings): 30 days, for any challenge Cloudflare
  still decides to show. **Block AI bots** stays off on purpose: it is
  site-wide and also writes AI-crawler blocks into the served robots.txt, while the rest
  of the site invites AI readers (llms.txt, `Allow: /`). Only `/talks` is kept from them.
- **Bulk Redirect** (account → Bulk Redirects), list `pagesdev`:
  `kb-blog-44d.pages.dev/` → `https://kaushik.sh/`, 301, with preserve query string,
  include subdomains, subpath matching and preserve path suffix, plus a Bulk
  Redirect Rule using that list. Why: the pages.dev address skips the zone WAF.

Expected from outside: `curl -sI https://kaushik.sh/talks/` → `200`, and the same with
`-A GPTBot` → `200` too (a borrowed user agent is not a *verified* bot; only the real
crawlers, from their own IPs, match the rule); the home page, posts and `/index.xml` → `200`;
`kb-blog-44d.pages.dev/<path>?q` → `301` to the same path on kaushik.sh. If an agent's
browser ever gets a "Verify you are human" box, it must never solve it: check talks in
`npm run dev` and leave the live look to KB.

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
- A per-skin or per-post `og:image`. One site-wide card exists since 2026-10-03 (see `assets/share.png`).
- Projects thumbnails for kaizen and brain: KB supplies sanitised PNGs; never
  capture them from a paired session.
- Talks in the feed (a published talk as an RSS item). Out by KB's call, 2026-09-26.
- Embedding a talk video. A `video:` is linked out, never iframed (no other host).
