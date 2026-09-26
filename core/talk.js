// Talks: the parts every skin shares. The slide viewer's markup and behaviour
// are the same everywhere (assets/deck-viewer.js drives any [data-deck]); a skin
// only styles it, through the classes below and its own tokens.
const h = require("./util");

const pad = (n) => String(n).padStart(2, "0");

// what a talk has beyond its page, in the order a reader cares about
function has(t) {
  const out = t.draft ? ["draft"] : []; // drafts only render in the dev preview
  if (t.slides) out.push(t.slideTitles.length ? `${t.slideTitles.length} slides` : "slides");
  if (t.video) out.push("video");
  if (t.poster && !t.slides && !t.video) out.push("photos"); // a video's poster is its still, not a photo
  return out;
}

// the inline viewer for a vendored deck; an external deck (https) is a link instead
function deck(ctx, t) {
  if (!t.slides) return "";
  if (/^https?:/.test(t.slides))
    return `<p class="deck-out"><a href="${h.esc(t.slides)}" target="_blank" rel="noopener">Open the slides ↗</a></p>`;
  const titles = t.slideTitles;
  const n = titles.length;
  const src = ctx.u(`${t.url}${t.slides}`);
  return `<figure class="deck" data-deck data-total="${n}" tabindex="-1">
  <div class="screen"><iframe src="${src}" title="Slides: ${h.esc(t.title)}" allow="fullscreen" loading="lazy"></iframe></div>
  <figcaption class="bar">
    <span class="count"><button type="button" class="arrow" data-deck-act="prev" aria-label="Previous slide">‹</button><span class="num"><b data-deck-n>01</b> / ${pad(n)}</span><button type="button" class="arrow" data-deck-act="next" aria-label="Next slide">›</button></span>
    <span class="rail">${titles.map((x, i) => `<button type="button" class="tick${i === 0 ? " on" : ""}" data-deck-go="${i + 1}" title="${pad(i + 1)} · ${h.esc(x)}" aria-label="Slide ${i + 1}: ${h.esc(x)}"></button>`).join("")}</span>
    <button type="button" class="full" data-deck-act="full" aria-label="Full screen" title="Full screen (F)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
    <span class="now-title" data-deck-title>${h.esc(titles[0] || "")}</span>
  </figcaption>
</figure>
<script src="/deck-viewer.js" defer></script>`;
}

// a talk with a video and no slides leads with the video's still; the play mark
// opens it where it lives (nothing from another host loads on this page)
function video(ctx, t) {
  if (!t.video) return "";
  const img = t.poster ? `<img src="${ctx.u(t.url + t.poster)}" alt="">` : "";
  return `<a class="deck-video" href="${h.esc(t.video)}" target="_blank" rel="noopener" aria-label="Watch the talk (opens the video)">${img}<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span class="watch">Watch the talk${t.length ? ` · ${h.esc(t.length)}` : ""} ↗</span></a>`;
}

module.exports = { has, deck, video, pad };
