# Skins

kaushik.sh changes its look every 6 to 12 months. A **skin** is that look:
templates that turn the site's data into HTML, one stylesheet, fonts and
portraits. Everything a skin cannot be trusted to keep stable (URLs, RSS
GUIDs, the `<head>`, the sitemap, redirects) lives in `core/` and never
changes when the skin does.

```
site.json                 { "live": "paper", "history": [ {skin, from, to?}, … ] }
core/load.js              content/ → the data object below (knows nothing of HTML)
core/render.js            routes, <head>, feed, sitemap; renders a skin into dist/<prefix>
skins/<name>/
  skin.json               { "title": "Outie", "description": "…" }
  templates.js            the 17 functions below
  assets/style.css        must set the six shared tokens (see "Rules")
  assets/fonts/*.woff2    self-hosted, never a CDN
  assets/portraits/*.jpg  web-sized copies (tools/portrait.sh), originals stay in ~/Code/me
```

## Commands

```sh
npm run dev               # every skin, one pill to flip the page you're on between them
npm run skin -- outie     # put outie on: closes paper's stint today, archives it at /skins/paper/
./check.sh                # builds every skin as if live + the archive and preview frames
tools/portrait.sh ~/Code/me/<file>.png <skin> <name>   # add a portrait to a skin
```

The live skin renders at `/`. Every skin that has been live renders again,
whole, at `/skins/<name>/`, with a banner, `noindex` and a canonical tag
pointing at the live URL, and it stays out of the feed and sitemap.
`/skins/` lists them all, and appears once there is a past skin. In dev
(`build.js --preview`) every other skin on disk is also at
`/skins/<name>/`, marked as a preview. The deployed build never has previews,
and `./check.sh` fails if it does.

## Making a new skin

1. Mock the home page and a post page first (KB signs off; `~/.claude/CLAUDE.md`).
2. `cp -R skins/paper skins/<name>`, rename in `skin.json`.
3. Rewrite `templates.js` and `assets/style.css`. `outie`, `manga` and
   `matchday` are examples of skins that change layout, not just colour.
   `manga` and `matchday` show derived numbering: episode and shirt number
   are publish order, and nothing is stored.
4. `npm run dev`, flip to it with the pill, check phone and dark. Build a
   new skin somewhere else first (a copy of the repo, or a folder outside
   `skins/`) and move it in once `./check.sh` passes there. The dev
   watcher rebuilds on every save, and a half-written skin fails that build.
   `build.js` validates every skin before clearing `dist/`, so the last good
   build keeps serving.
5. `./check.sh`. Every skin must pass every rule, live or not.

## The templates

Each function takes `(ctx, arg)` and returns `{ title, desc?, body, progress? }`,
except `layout`, which gets that object plus `url` and `head` and returns the
whole page.

| function | page | arg |
|---|---|---|
| `layout(ctx, {head, body, url, progress})` | the shell: print `${head}` first in `<head>` | |
| `home` | `/` | |
| `post` | `/posts/<slug>/` | a post |
| `archive` | `/blog/` and `/posts/` | |
| `traces`, `trace` | `/traces/`, each trace (served, unlinked) | —, a trace |
| `shelf` | `/shelf/` | |
| `hikes`, `hike` | `/hikes/`, each hike | —, a hike |
| `page` | `/about/`, `/ideas/` | the page |
| `projects` | `/projects/` | |
| `talks`, `talk` | `/talks/`, each talk | —, a talk |
| `tags`, `tag` | `/tags/`, `/tags/<slug>/` | the tag map, `{slug, name, docs}` |
| `notFound` | `/404.html` | |
| `skins` | `/skins/` (only when a past skin exists) | |

## What a skin receives: `ctx`

- `ctx.site`: the data (from `core/load.js`)
  - `config` `{base, title, desc}`, `bio` (html), `lede` (the bio without its
    greeting; may be empty), `now` (one line; may be empty)
  - `posts`, `traces`, `hikes`: newest first; each `{title, url, date, tags,
    description, excerpt, minutes, html, kind, section}`
  - `shelf`: `{title, link, by, kind, date|null, html}`; `SHELF_KINDS`, `TRACE_KINDS`
  - `talks`: newest first; each `{title, url, date, where, length, description, slides, slideTitles, video, poster, html, draft}`
  - `about`, `ideas`, `shelfIntro`: `{title, html, excerpt}`; `projects`: `{title, tagline, apps}`
- `ctx.talk`: `has(t)` (what a talk has, e.g. `["14 slides", "video"]`) and
  `deck(t)` (the slide viewer's markup; call it, style `.deck` and its parts,
  never re-implement it: `assets/deck-viewer.js` drives it on every skin)
- `ctx.u(path)`: **every internal href goes through this** (it adds `/skins/<name>` when archived)
- `ctx.asset(file)`: a file from this skin's `assets/`; `ctx.css`: the hashed stylesheet URL
- `ctx.h`: `esc`, `fmtDate`, `slugify`. Escape every data-derived string.
- `ctx.frame`: `null` when live, else `{kind: "archive"|"preview", from, to}`. Render a banner with `data-frame="<kind>"`.
- `ctx.history`: `[{skin, title, from, to, live, href}]`, for `/skins/` and a "past skins" footer link
- `ctx.skin`: `{name, title, description}`

## Rules (tested in tests/skins.test.js)

- Emit every route. A skin may leave a feature out (Outie has no traces
  filter) but never a page.
- Content is skin-neutral. A skin may **derive** things from the data (a post
  number is publish order) and **rename labels** ("Writing", "Team sheet").
  It never invents facts. A skin that needs new content adds an optional
  field that other skins ignore and that degrades to nothing when empty (see
  `lede` in `content/home.md`).
- Emit the semantic hooks the tests read: `data-section="apps"` on the
  projects section, `data-section="talks"` on the talks list (each row shows
  the talk's `description`), `<button data-kind>` for the shelf filter,
  `data-frame` on the banner. Tests read these hooks, never a skin's class names.
- Set the six shared tokens `--bg --card --ink --muted --line --gold --gold-soft`
  in `style.css` (dev.js's editor styles itself from them). A skin may add
  its own hues; say what jobs each one has at the top of the CSS.
- Apply the saved theme in `<head>` before paint (`kb:theme`: auto/light/dark).
  If you add presets, treat an unknown stored value as auto.
- Nothing from another host: fonts, scripts and images are vendored.
- Retired skins stay in the tree. They are still served at `/skins/<name>/`
  and still tested, which is why this is not parking (INVARIANTS, 2026-09-26).
