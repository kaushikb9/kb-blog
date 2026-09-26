// Matchday — the site as a football programme (mockup C4, 2026-09-26). Derived,
// never stored: a post's shirt number is the order it was published (the first
// post is No. 1), its minutes are reading time, its position is its first tag,
// and the season counts the years since the first post. Same contract as every
// skin: (ctx, arg) → { title, desc?, body, progress? }; internal hrefs via ctx.u().

const THEME_SCRIPT = `const THEME_ICONS={
  auto:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'};
const THEMES=["auto","light","dark"];
const current=()=>{const t=localStorage.getItem("kb:theme");return THEMES.includes(t)?t:"auto";};
function applyTheme(){
  const t=current();
  if(t==="auto")delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=t;
  const b=document.getElementById("theme-btn");
  b.innerHTML=THEME_ICONS[t]; b.title="theme: "+t;
}
document.getElementById("theme-btn").addEventListener("click",()=>{
  const n=THEMES[(THEMES.indexOf(current())+1)%3];
  n==="auto"?localStorage.removeItem("kb:theme"):localStorage.setItem("kb:theme",n);
  applyTheme();
});
applyTheme();`;
const PREPAINT = `<script>(function(){var t=localStorage.getItem("kb:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;})();</script>`;

const shirt = (site, p) => site.posts.length - site.posts.indexOf(p);
const pos = (p) => (p.tags.slice(0, 2).join(" · ") || "writing");
const dmy = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const season = (site) => {
  const first = site.posts.length ? site.posts[site.posts.length - 1].date.getFullYear() : new Date().getFullYear();
  return { n: new Date().getFullYear() - first + 1, since: first };
};

function layout(ctx, { head, body, progress, url }) {
  const { u, site } = ctx;
  const nav = [["/", "writing"], ["/talks/", "talks"], ["/projects/", "projects"], ["/shelf/", "shelf"], ["/about/", "about"]]
    .map(([p, label]) => `<a href="${u(p)}"${p === url ? ` aria-current="page"` : ""}>${label}</a>`).join("\n      ");
  const past = ctx.history.some((x) => !x.live);
  const s = season(site);
  return `<!doctype html>
<html lang="en">
<head>
${head}
<meta name="theme-color" content="#034694">
<link rel="preload" href="${ctx.asset("fonts/big-shoulders-display.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.css}">
${PREPAINT}
</head>
<body>
${progress ? `<div id="progress"></div>` : ""}
<header class="band">
  <div class="wrap">
    <a class="wordmark" href="${u("/")}">kaushik.sh</a>
    <span class="season">SEASON ${s.n} · SINCE ${s.since}</span>
    <nav>
      ${nav}
      <button id="theme-btn" aria-label="Switch theme"></button>
    </nav>
  </div>
</header>
<main class="wrap">
${frameBanner(ctx)}${body}
</main>
<footer class="band foot">
  <div class="wrap">
    <a class="wordmark" href="${u("/")}">kaushik.sh</a>
    <nav>
      <a href="/index.xml">rss</a>${past ? `\n      <a href="/skins/">past kits</a>` : ""}
      <a href="https://github.com/kaushikb9/kb-blog" rel="noopener">source</a>
    </nav>
  </div>
</footer>
<script>
${THEME_SCRIPT}
</script>
${progress ? `<script>
const bar=document.getElementById("progress");
addEventListener("scroll",()=>{const d=document.documentElement;
bar.style.width=(d.scrollTop/(d.scrollHeight-d.clientHeight)*100)+"%"},{passive:true});
</script>` : ""}
</body>
</html>`;
}

function frameBanner(ctx) {
  const f = ctx.frame;
  if (!f) return "";
  const when = f.kind === "archive" ? `, worn ${f.from} to ${f.to}` : " (a preview, not live)";
  return `<p class="frame-banner" data-frame="${f.kind}">You're looking at the <strong>${ctx.h.esc(ctx.skin.title)}</strong> kit${when}. <a href="/">See the site as it is now →</a></p>
`;
}

const player = (ctx, p) => `<li><a class="player" href="${ctx.u(p.url)}">
    <span class="no">${shirt(ctx.site, p)}</span>
    <span class="nm"><span class="t">${ctx.h.esc(p.title)}</span><span class="pos">${ctx.h.esc(pos(p))}</span></span>
    <span class="min">${p.minutes}’</span>
  </a></li>`;
const sheet = (ctx, list) => `<ol class="sheet" style="--rows:${Math.ceil(list.length / 2)}">
  ${list.map((p) => player(ctx, p)).join("\n  ")}
</ol>`;
const row = (ctx, d, meta) => `<li><a class="row" href="${ctx.u(d.url)}"><span class="rt">${ctx.h.esc(d.title)}</span><span class="meta">${meta}</span></a></li>`;

/* ---------- home: the programme cover + team sheet ---------- */

function home(ctx) {
  const { site, h } = ctx;
  const notes = site.lede ? `<p>${h.esc(site.lede)}</p>` : site.bio;
  return {
    title: site.config.title,
    body: `
<section class="hero">
  <img src="${ctx.asset("portraits/matchday.jpg")}" alt="Kaushik on the terrace in a royal-blue shirt and scarf">
  <div class="who">
    <h1>Kaushik Bhat</h1>
    <div class="notes">
      <div><span class="eyebrow">Captain's notes</span>${notes}</div>
      ${site.now ? `<div><span class="eyebrow">Now</span><p>${h.esc(site.now)}</p></div>` : ""}
    </div>
    <p class="follow">
      <a href="https://twitter.com/kaushikb9">twitter</a>
      <a href="https://www.linkedin.com/in/kaushikbhat/">linkedin</a>
      <a href="https://github.com/kaushikb9">github</a>
      <a href="/index.xml">rss</a>
    </p>
  </div>
</section>

<section data-section="writing">
  <div class="sheet-head"><h2>Team sheet</h2><span class="key">No. = order published · 10’ = minutes to read</span></div>
  ${sheet(ctx, site.posts)}
</section>`,
  };
}

/* ---------- a post: the match report ---------- */

function post(ctx, p) {
  const { site, h, u } = ctx;
  const i = site.posts.indexOf(p);
  const prev = site.posts[i + 1], next = site.posts[i - 1];
  const fx = (d, label, cls = "") => d ? `<a class="${cls}" href="${u(d.url)}"><span class="eyebrow">${label} · No. ${shirt(site, d)}</span><span class="t">${h.esc(d.title)}</span></a>` : "<span></span>";
  return {
    title: `${p.title} · ${site.config.title}`, desc: p.description, progress: true,
    body: `<article>
  <header class="report-head">
    <span class="eyebrow">Match report · No. ${shirt(site, p)}</span>
    <h1>${h.esc(p.title)}</h1>
    ${p.description ? `<p class="dek">${h.esc(p.description)}</p>` : ""}
    <div class="stats">
      <div><b>${dmy(p.date)}</b><span>KICK-OFF</span></div>
      <div><b>${p.minutes}’</b><span>READING TIME</span></div>
      ${p.tags[0] ? `<div><b>${h.esc(p.tags[0].toUpperCase())}</b><span>POSITION</span></div>` : ""}
    </div>
  </header>
  <div class="prose">
${p.html}
  </div>
  <footer class="full-time">
    <span class="eyebrow">Full time</span>
    ${p.tags.length ? `<div class="chips">${p.tags.map((t) => `<a class="chip" href="${u(`/tags/${h.slugify(t)}/`)}">${h.esc(t)}</a>`).join(" ")}</div>` : ""}
    <nav class="fixtures" aria-label="Other posts">${fx(prev, "Previous")}${fx(next, "Next", "n")}</nav>
  </footer>
</article>`,
  };
}

const plain = (ctx, title, kick, html) => ({
  title: `${title} · ${ctx.site.config.title}`,
  body: `<article>
  <header class="page-head">${kick ? `<span class="eyebrow">${kick}</span>` : ""}<h1>${ctx.h.esc(title)}</h1></header>
  <div class="prose">
${html}
  </div>
</article>`,
});

function archive(ctx) {
  const { site } = ctx;
  const years = {};
  for (const p of site.posts) (years[p.date.getFullYear()] ||= []).push(p);
  return {
    title: `Writing · ${site.config.title}`,
    body: `<h1 class="page-title">Every match</h1>
<section data-section="writing">${Object.keys(years).sort((a, b) => b - a).map((y) => `
<h2 class="sub-head">${y}</h2>
${sheet(ctx, years[y])}`).join("")}
</section>`,
  };
}

function traces(ctx) {
  const { site, h } = ctx;
  return {
    title: `Traces · ${site.config.title}`,
    body: `<h1 class="page-title">Traces</h1>
<p class="tagline">Short, unpolished markers: sparks, reflections, peaks.</p>
<ol class="rows">
${site.traces.map((t) => row(ctx, t, `${dmy(t.date)} · ${t.kind}`)).join("\n")}
</ol>`,
  };
}
const trace = (ctx, t) => plain(ctx, t.title, `${dmy(t.date)} · ${ctx.site.TRACE_KINDS[t.kind] || "trace"}`, t.html);

function hikes(ctx) {
  const { site } = ctx;
  return {
    title: `Hikes · ${site.config.title}`,
    body: `<h1 class="page-title">Hikes</h1>
<p class="tagline">Trails walked, serendipity found.</p>
<ol class="rows">
${site.hikes.map((x) => row(ctx, x, `${dmy(x.date)} · ${x.minutes}’`)).join("\n")}
</ol>`,
  };
}
const hike = (ctx, x) => plain(ctx, x.title, `${dmy(x.date)} · hike`, x.html);
const page = (ctx, pg) => plain(ctx, pg.title, "", pg.html);

/* ---------- shelf: scouting notes ---------- */

const FILTER = `<script>
document.getElementById("shelf-filters").addEventListener("click",(e)=>{
  const b=e.target.closest("button"); if(!b) return;
  document.querySelectorAll("#shelf-filters button").forEach((x)=>{x.classList.toggle("active",x===b);x.setAttribute("aria-pressed",x===b);});
  const root=document.getElementById("shelf");
  root.querySelectorAll("li[data-kind]").forEach((li)=>{li.hidden=b.dataset.kind!=="all"&&li.dataset.kind!==b.dataset.kind;});
  root.querySelectorAll("[data-group]").forEach((g)=>{g.hidden=![...g.querySelectorAll("li[data-kind]")].some((li)=>!li.hidden);});
});
</script>`;

function shelf(ctx) {
  const { site, h } = ctx;
  const item = (d) => `<li class="report" data-kind="${d.kind}">
  <div class="pos">${[h.esc(d.kind), d.by && h.esc(d.by), d.date && dmy(d.date)].filter(Boolean).join(" · ")}</div>
  <a class="rt" href="${h.esc(d.link)}" rel="noopener">${h.esc(d.title)}</a>
  ${d.html.trim() ? `<div class="note">${d.html}</div>` : ""}
</li>`;
  const dated = site.shelf.filter((d) => d.date);
  const undated = site.shelf.filter((d) => !d.date).sort((a, b) => a.title.localeCompare(b.title));
  const kinds = site.SHELF_KINDS.filter((k) => site.shelf.some((d) => d.kind === k));
  return {
    title: `Shelf · ${site.config.title}`, desc: site.shelfIntro.excerpt,
    body: `<h1 class="page-title">Shelf</h1>
<div class="tagline">${site.shelfIntro.html}</div>
${kinds.length > 1 ? `<nav class="filters" id="shelf-filters" aria-label="Filter by kind">
  <button data-kind="all" class="active" aria-pressed="true">all</button>
  ${kinds.map((k) => `<button data-kind="${k}" aria-pressed="false">${k}</button>`).join("\n  ")}
</nav>` : ""}
<div id="shelf">
${dated.length ? `<ol class="rows">\n${dated.map(item).join("\n")}\n</ol>` : ""}
${undated.length ? `<section data-group="undated">
  <h2 class="sub-head">Undated</h2>
  <ol class="rows">\n${undated.map(item).join("\n")}\n</ol>
</section>` : ""}
</div>
${kinds.length > 1 ? FILTER : ""}`,
  };
}

/* ---------- projects: the squad ---------- */

function projects(ctx) {
  const { site, h, u } = ctx;
  const P = site.projects;
  const tile = (e) => {
    const ext = (href, text) => `<a href="${h.esc(href)}" target="_blank" rel="noopener">${h.esc(text)} ↗</a>`;
    const links = [e.url ? ext(e.url, "open") : "", e.repo ? ext(e.repo, "github") : ""].join("");
    return `<li><div class="tile">${e.image ? `<img class="shot" src="${u(`/projects/${h.esc(e.image)}`)}" alt="" loading="lazy">` : ""}
    <div class="body"><span class="rt">${h.esc(e.name)}</span>
      <span class="sub">${h.esc(e.line)}</span>
      ${links ? `<span class="lk">${links}</span>` : ""}</div></div></li>`;
  };
  const section = (label, list) => (list && list.length) ? `
<section data-section="${label}">
  <h2 class="sub-head">${label}</h2>
  <ol class="projects">${list.map(tile).join("\n")}</ol>
</section>` : "";
  return {
    title: `${P.title} · ${site.config.title}`, desc: P.tagline,
    body: `<h1 class="page-title">${h.esc(P.title)}</h1>
<p class="tagline">${h.esc(P.tagline)}</p>${section("apps", P.apps)}`,
  };
}

/* ---------- talks: a row per talk with its blurb; the page leads with the slides ---------- */

function talks(ctx) {
  const { site, h, u } = ctx;
  const item = (t) => `<li><a class="talk" href="${u(t.url)}">
  ${t.poster ? `<span class="poster"><img src="${u(t.url + t.poster)}" alt="" loading="lazy"></span>` : `<span class="poster none"></span>`}
  <span class="talk-body">
    <span class="eyebrow">${h.fmtDate(t.date)} · ${h.esc(t.where)}</span>
    <span class="rt">${h.esc(t.title)}</span>
    <span class="snip">${h.esc(t.description)}</span>
    <span class="has">${ctx.talk.has(t).join(" · ")}</span>
  </span></a></li>`;
  return {
    title: `Talks · ${site.config.title}`, desc: "Talks I've given, with the slides or the video.",
    body: `<h1 class="page-title">Talks</h1>
<p class="tagline">Away days: talks I've given. Open one for the slides or the video.</p>
<ol class="talks" data-section="talks">${site.talks.map(item).join("\n")}</ol>`,
  };
}

function talk(ctx, t) {
  const { site, h, u } = ctx;
  const photo = t.poster ? `<a class="extra" href="${u(t.url + t.poster)}"><img src="${u(t.url + t.poster)}" alt="" loading="lazy"><span><b>From the day</b><span class="sub">photo · ${h.esc(t.where)}</span></span></a>` : "";
  const video = t.video && t.slides ? `<a class="extra" href="${h.esc(t.video)}" target="_blank" rel="noopener"><span class="play-ic" aria-hidden="true">▶</span><span><b>Watch the talk</b><span class="sub">video ↗</span></span></a>` : "";
  return {
    title: `${t.title} · ${site.config.title}`, desc: t.description,
    body: `<header class="talk-head">
  <span class="eyebrow">Away day · ${h.fmtDate(t.date)} · ${h.esc(t.where)}${t.length ? ` · ${h.esc(t.length)}` : ""}</span>
  <h1 class="talk-title">${h.esc(t.title)}</h1>
  <p class="lede">${h.esc(t.description)}</p>
</header>
${t.slides ? ctx.talk.deck(t) : t.video ? ctx.talk.video(t) : t.poster ? `<img class="talk-photo" src="${u(t.url + t.poster)}" alt="">` : ""}
${t.html.trim() ? `<div class="prose">${t.html}</div>` : ""}
${video || (t.slides && photo) ? `<section class="extras">${video}${t.slides ? photo : ""}</section>` : ""}`,
  };
}

/* ---------- tags ---------- */

function tags(ctx, T) {
  const { site, h, u } = ctx;
  return {
    title: `Tags · ${site.config.title}`,
    body: `<h1 class="page-title">Tags</h1>
<div class="chips">${Object.keys(T).sort().map((s) => `<a class="chip" href="${u(`/tags/${s}/`)}">${h.esc(T[s].name)} <span>${T[s].docs.length}</span></a>`).join(" ")}</div>`,
  };
}

function tag(ctx, t) {
  const { site, h } = ctx;
  return {
    title: `#${t.name} · ${site.config.title}`,
    body: `<h1 class="page-title">#${h.esc(t.name)}</h1>
<ol class="rows">
${[...t.docs].sort((a, b) => b.date - a.date).map((d) => row(ctx, d, `${dmy(d.date)} · ${d.section}`)).join("\n")}
</ol>`,
  };
}

function notFound(ctx) {
  const { site, u } = ctx;
  return {
    title: `404 · ${site.config.title}`,
    body: `<h1 class="page-title">Offside.</h1>
<p class="tagline">That page isn't on the team sheet. <a href="${u("/")}">Back to the programme</a>, or <a href="${u("/blog/")}">every match</a>.</p>`,
  };
}

function skins(ctx) {
  const { site, h } = ctx;
  return {
    title: `Skins · ${site.config.title}`,
    body: `<h1 class="page-title">Past kits</h1>
<p class="tagline">Every look this site has worn. The old ones stay up, whole, as they were.</p>
<ol class="rows">
${[...ctx.history].reverse().map((x) => `<li><a class="row" href="${x.href}"><span class="rt">${h.esc(x.title)}</span><span class="meta">${x.live ? `since ${h.esc(x.from || "")} · live now` : `${h.esc(x.from)} to ${h.esc(x.to)}`}</span></a></li>`).join("\n")}
</ol>`,
  };
}

module.exports = { layout, home, post, archive, traces, trace, shelf, hikes, hike, page, projects, talks, talk, tags, tag, notFound, skins };
