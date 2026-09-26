// Paper — the warm paper / ink / gold skin, live 2026-07-25 onwards. Sibling of
// antifeed's language (card + row grammar). Every template takes (ctx, arg) and
// returns { title, desc?, body, progress? }; layout() wraps it in the page shell.
// Internal hrefs always go through ctx.u() so the same skin can render archived.

function layout(ctx, { head, body, progress }) {
  const { u } = ctx;
  return `<!doctype html>
<html lang="en">
<head>
${head}
<meta name="theme-color" content="#faf8f4">
<link rel="stylesheet" href="${ctx.css}">
<script>(function(){var t=localStorage.getItem("kb:theme");if(t)document.documentElement.dataset.theme=t;})();</script>
</head>
<body>
${progress ? `<div id="progress"></div>` : ""}${frameBanner(ctx)}
<header class="site-head">
  <a class="wordmark" href="${u("/")}">kaushik<span>bhat</span></a>
  <nav>
    <a href="${u("/")}">writing</a>
    <a href="${u("/talks/")}">talks</a>
    <a href="${u("/projects/")}">projects</a>
    <a href="${u("/shelf/")}">shelf</a>
    <a href="${u("/about/")}">about</a>
    <button id="theme-btn" aria-label="toggle theme"></button>
  </nav>
</header>
<main>
${body}
</main>
<footer>
  <p>© kaushik bhat · <a href="/index.xml">rss</a>${ctx.history.some((x) => !x.live) ? ` · <a href="/skins/">past skins</a>` : ""}</p>
</footer>
<script>
document.addEventListener("click",(e)=>{
  if(e.target.closest("a, button, .expand")) return;
  const li=e.target.closest("li.exp"); if(!li) return;
  const ex=li.querySelector(".expand"); const wasOpen=!ex.hidden;
  document.querySelectorAll("li.exp .expand").forEach((x)=>x.hidden=true);
  ex.hidden=wasOpen;
});

const THEME_ICONS={
  auto:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'};
function applyTheme(){
  const t=localStorage.getItem("kb:theme")||"auto";
  if(t==="auto")delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=t;
  const b=document.getElementById("theme-btn");
  b.innerHTML=THEME_ICONS[t]; b.title="theme: "+t;
}
document.getElementById("theme-btn").addEventListener("click",()=>{
  const o=["auto","light","dark"];
  const n=o[(o.indexOf(localStorage.getItem("kb:theme")||"auto")+1)%3];
  n==="auto"?localStorage.removeItem("kb:theme"):localStorage.setItem("kb:theme",n);
  applyTheme();
});
applyTheme();
</script>
${progress ? `<script>
const bar=document.getElementById("progress");
addEventListener("scroll",()=>{const h=document.documentElement;
bar.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+"%"},{passive:true});
</script>` : ""}
</body>
</html>`;
}

// an archived or previewed copy says so, and links to the same page as it is now
function frameBanner(ctx) {
  const f = ctx.frame;
  if (!f) return "";
  const when = f.kind === "archive" ? `, ${f.from} to ${f.to}` : " (preview, not live)";
  return `
<p class="frame-banner" data-frame="${f.kind}">You're looking at the <strong>${ctx.h.esc(ctx.skin.title)}</strong> skin${when}. <a href="/">See the site as it is now →</a></p>`;
}

const row = (ctx, d, sub, attrs = "") => {
  const { h, u } = ctx;
  return `<li class="exp" ${attrs}>
  <div class="row">
    <span class="when">${d.date ? h.fmtDate(d.date) : ""}</span>
    <span class="t"><a class="rt" href="${u(d.url)}">${h.esc(d.title)}</a>
      <span class="sub">${sub}</span></span>
  </div>
  <div class="expand" hidden>
    <article class="card mini">
      <div class="kicker">preview
        <span class="meta">${d.date ? h.fmtDate(d.date) : ""} · ${d.minutes} min</span></div>
      <p class="hook">${h.esc(d.excerpt)}</p>
      <div class="actions"><a class="go" href="${u(d.url)}">Read it →</a></div>
    </article>
  </div>
</li>`;
};

// kind filter for a list page: buttons in #navId, li[data-kind] under #listId;
// a [data-group] wrapper (e.g. the undated shelf) hides when none of its rows show
const filterScript = (navId, listId) => `<script>
document.getElementById("${navId}").addEventListener("click",(e)=>{
  const b=e.target.closest("button"); if(!b) return;
  document.querySelectorAll("#${navId} button").forEach((x)=>x.classList.toggle("active",x===b));
  const root=document.getElementById("${listId}");
  root.querySelectorAll("li[data-kind]").forEach((li)=>{
    li.hidden = b.dataset.kind!=="all" && li.dataset.kind!==b.dataset.kind;
  });
  root.querySelectorAll("[data-group]").forEach((g)=>{
    g.hidden = ![...g.querySelectorAll("li[data-kind]")].some((li)=>!li.hidden);
  });
});
</script>`;

const byYear = (docs) => {
  const y = {};
  for (const p of docs) (y[p.date.getFullYear()] ||= []).push(p);
  return y;
};

/* ---------- home: bio + now + writing by year ---------- */

function home(ctx) {
  const { site, h } = ctx;
  const homeYears = byYear(site.posts);
  return {
    title: site.config.title,
    body: `
<section class="bio">
  <div class="hi">${site.bio}</div>
  <p class="social">
    <a href="https://twitter.com/kaushikb9">twitter</a> ·
    <a href="https://www.linkedin.com/in/kaushikbhat/">linkedin</a> ·
    <a href="https://github.com/kaushikb9">github</a> ·
    <a href="/index.xml">rss</a>
  </p>
  <p class="now"><span class="now-label">now</span> ${h.esc(site.now)}</p>
</section>

<section class="list-section">
  <h3 class="section-label">writing</h3>
  ${Object.keys(homeYears).sort((a, b) => b - a).map((y) => `
  <h4 class="year">${y}</h4>
  <ol class="rows">${homeYears[y].map((p) => row(ctx, p, `${p.minutes} min · ${p.tags.slice(0, 3).join(" · ")}`)).join("\n")}</ol>`).join("\n")}
</section>`,
  };
}

/* ---------- posts ---------- */

function post(ctx, p) {
  const { site, h, u } = ctx;
  return {
    title: `${p.title} · ${site.config.title}`, desc: p.description, progress: true,
    body: `<article class="prose">
  <div class="kicker">${h.fmtDate(p.date)} · ${p.minutes} min read</div>
  <h1>${h.esc(p.title)}</h1>
  ${p.html}
  <div class="post-tags">${p.tags.map((t) => `<a class="chip" href="${u(`/tags/${h.slugify(t)}/`)}">${h.esc(t)}</a>`).join(" ")}</div>
</article>`,
  };
}

/* ---------- blog + posts archives (URL parity) ---------- */

function archive(ctx) {
  const { site } = ctx;
  const y = byYear(site.posts);
  const list = Object.keys(y).sort((a, b) => b - a).map((yr) => `
<h3 class="section-label">${yr}</h3>
<ol class="rows">${y[yr].map((p) => row(ctx, p, `${p.minutes} min`)).join("\n")}</ol>`).join("\n");
  return { title: `Writing · ${site.config.title}`, body: `<h1 class="page-title">writing</h1>${list}` };
}

/* ---------- traces ---------- */

function traces(ctx) {
  const { site } = ctx;
  const K = site.TRACE_KINDS;
  return {
    title: `Traces · ${site.config.title}`,
    body: `<h1 class="page-title">traces</h1>
<p class="tagline">Short, unpolished markers — sparks, reflections, peaks, flags.</p>
<nav class="filters" id="filters">
  <button data-kind="all" class="active">all</button>
  ${Object.keys(K).map((k) => `<button data-kind="${k}">${k}</button>`).join("\n")}
</nav>
<ol class="rows" id="trace-list">
  ${site.traces.map((t) => row(ctx, t, K[t.kind] || t.kind, `data-kind="${t.kind}"`)).join("\n")}
</ol>
${filterScript("filters", "trace-list")}`,
  };
}

function trace(ctx, t) {
  const { site, h } = ctx;
  return {
    title: `${t.title} · ${site.config.title}`,
    body: `<article class="prose">
  <div class="kicker">${h.fmtDate(t.date)} · ${site.TRACE_KINDS[t.kind] || "trace"}</div>
  <h1>${h.esc(t.title)}</h1>
  ${t.html}
</article>`,
  };
}

/* ---------- shelf: links out, dated the day KB found them ---------- */

function shelf(ctx) {
  const { site, h } = ctx;
  const shelfRow = (d) => `<li data-kind="${d.kind}">
  <div class="row">
    <span class="when">${d.date ? h.fmtDate(d.date) : ""}</span>
    <div class="t"><a class="rt ext" href="${h.esc(d.link)}" rel="noopener">${h.esc(d.title)}</a>
      <span class="sub">${h.esc(d.by)}${d.by ? " · " : ""}${h.esc(d.kind)}</span>
      ${d.html.trim() ? `<div class="note prose">${d.html}</div>` : ""}</div>
  </div>
</li>`;
  const shelfList = (docs) => `<ol class="rows">\n${docs.map(shelfRow).join("\n")}\n</ol>`;
  const dated = site.shelf.filter((d) => d.date);       // already newest-first
  const undated = site.shelf.filter((d) => !d.date)     // found before dates were kept: by title
    .sort((a, b) => a.title.localeCompare(b.title));
  const kinds = site.SHELF_KINDS.filter((k) => site.shelf.some((d) => d.kind === k));
  return {
    title: `Shelf · ${site.config.title}`, desc: site.shelfIntro.excerpt,
    body: `<h1 class="page-title">shelf</h1>
<div class="prose intro">${site.shelfIntro.html}</div>
${kinds.length > 1 ? `<nav class="filters" id="shelf-filters">
  <button data-kind="all" class="active">all</button>
  ${kinds.map((k) => `<button data-kind="${k}">${k}</button>`).join("\n  ")}
</nav>` : ""}
<div id="shelf">
${dated.length ? shelfList(dated) : ""}
${undated.length ? `<section data-group="undated">
  <h3 class="section-label">undated</h3>
  ${shelfList(undated)}
</section>` : ""}
</div>
${kinds.length > 1 ? filterScript("shelf-filters", "shelf") : ""}`,
  };
}

/* ---------- hikes, about, ideas ---------- */

function hikes(ctx) {
  const { site } = ctx;
  return {
    title: `Hikes · ${site.config.title}`,
    body: `<h1 class="page-title">hikes</h1>
<p class="tagline">Trails walked, serendipity found.</p>
<ol class="rows">${site.hikes.map((x) => row(ctx, x, `${x.minutes} min`)).join("\n")}</ol>`,
  };
}

function hike(ctx, x) {
  const { site, h } = ctx;
  return {
    title: `${x.title} · ${site.config.title}`,
    body: `<article class="prose"><div class="kicker">${h.fmtDate(x.date)} · hike</div><h1>${h.esc(x.title)}</h1>${x.html}</article>`,
  };
}

function page(ctx, pg) {
  const { site, h } = ctx;
  return {
    title: `${pg.title} · ${site.config.title}`,
    body: `<article class="prose"><h1>${h.esc(pg.title)}</h1>${pg.html}</article>`,
  };
}

/* ---------- projects: a gallery of tiles, one per app ---------- */

function projects(ctx) {
  const { site, h, u } = ctx;
  const P = site.projects;
  const tile = (e) => {
    const ext = (href, text) => `<a class="go" href="${h.esc(href)}" target="_blank" rel="noopener">${h.esc(text)} ↗</a>`;
    const links = [e.url ? ext(e.url, "open") : "", e.repo ? ext(e.repo, "github") : ""].join("");
    return `<li><div class="tile">${e.image ? `<img class="shot" src="${u(`/projects/${h.esc(e.image)}`)}" alt="" loading="lazy">` : ""}
    <span class="body"><span class="rt">${h.esc(e.name)}</span>
      <span class="sub">${h.esc(e.line)}</span>
      ${links ? `<span class="links">${links}</span>` : ""}</span></div></li>`;
  };
  const section = (label, list) => (list && list.length) ? `
<section class="list-section" data-section="${label}">
  <h3 class="section-label">${label}</h3>
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
    <span class="kicker">${h.fmtDate(t.date)} · ${h.esc(t.where)}</span>
    <span class="rt">${h.esc(t.title)}</span>
    <span class="snip">${h.esc(t.description)}</span>
    <span class="has">${ctx.talk.has(t).join(" · ")}</span>
  </span></a></li>`;
  return {
    title: `Talks · ${site.config.title}`, desc: "Talks I've given, with the slides or the video.",
    body: `<h1 class="page-title">talks</h1>
<p class="tagline">Talks I've given. Open one for the slides or the video.</p>
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
  <div class="kicker">${h.fmtDate(t.date)} · ${h.esc(t.where)}${t.length ? ` · ${h.esc(t.length)}` : ""}</div>
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
    body: `<h1 class="page-title">tags</h1><div class="tag-cloud">${
      Object.keys(T).sort().map((s) => `<a class="chip" href="${u(`/tags/${s}/`)}">${h.esc(T[s].name)} · ${T[s].docs.length}</a>`).join(" ")}</div>`,
  };
}

function tag(ctx, t) {
  const { site, h } = ctx;
  return {
    title: `#${t.name} · ${site.config.title}`,
    body: `<h1 class="page-title">#${h.esc(t.name)}</h1><ol class="rows">${
      t.docs.sort((a, b) => b.date - a.date).map((d) => row(ctx, d, d.section)).join("\n")}</ol>`,
  };
}

function notFound(ctx) {
  const { site, u } = ctx;
  return {
    title: `404 · ${site.config.title}`,
    body: `<article class="prose"><h1>404</h1><p>That page wandered off. <a href="${u("/")}">Head home</a> or browse the <a href="${u("/blog/")}">archive</a>.</p></article>`,
  };
}

/* ---------- /skins/: every skin this site has worn ---------- */

function skins(ctx) {
  const { site, h } = ctx;
  return {
    title: `Skins · ${site.config.title}`,
    body: `<h1 class="page-title">skins</h1>
<p class="tagline">Every look this site has had. Old ones stay up, whole, as they were.</p>
<ol class="rows">${[...ctx.history].reverse().map((x) => `<li>
  <div class="row">
    <span class="when">${x.from ? h.esc(x.from) : ""}</span>
    <span class="t"><a class="rt" href="${x.href}">${h.esc(x.title)}</a>
      <span class="sub">${x.live ? "live now" : `until ${h.esc(x.to)}`}</span></span>
  </div>
</li>`).join("\n")}</ol>`,
  };
}

module.exports = { layout, home, post, archive, traces, trace, shelf, hikes, hike, page, projects, talks, talk, tags, tag, notFound, skins };
