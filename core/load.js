// content/ → one plain object describing the whole site. This is the data every
// skin receives (the shape is documented in skins/README.md). It knows nothing
// about HTML beyond rendering markdown bodies, and nothing about skins.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");
const { words } = require("./util");

const SITE = {
  base: "https://kaushik.sh",
  title: "Kaushik Bhat",
  desc: "Byte-sized ramblings on engineering management, productivity and personal growth — by Kaushik Bhat",
};
const SHELF_KINDS = ["tweet", "article", "talk", "book"]; // display order; validated by check.sh
const TRACE_KINDS = { spark: "spark ✦", reflect: "reflect ☾", peak: "peak ▲" };

// a vendored deck (tools/deck.js output) → each slide's heading, for the viewer's rail
function deckTitles(dir, slides) {
  if (!slides || /^https?:/.test(slides)) return [];
  const f = path.join(dir, slides);
  if (!fs.existsSync(f)) return [];
  const src = fs.readFileSync(f, "utf8").replace(/base64,[A-Za-z0-9+/=]+/g, "");
  return [...src.matchAll(/<section class="slide[\s\S]*?<\/section>/g)].map((m) => {
    const hd = m[0].match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/) || m[0].match(/<div class="eyebrow">([\s\S]*?)<\/div>/);
    return hd ? hd[1].replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim() : "";
  });
}

function load(ROOT, opts = {}) {
  const SOURCES = {}; // url → content file, for the dev-server edit mode

  function loadDoc(file, section) {
    const g = matter(fs.readFileSync(file, "utf8"));
    const dir = path.dirname(file);
    const isBundle = path.basename(file) === "index.md";
    const slug = isBundle ? path.basename(dir) : path.basename(file, ".md");
    const external = section === "shelf"; // a shelf entry links out; it has no page of its own
    const url = external ? null : g.data.url || `/${section}/${slug}/`;
    const assets = isBundle
      ? fs.readdirSync(dir).filter((f) => !f.endsWith(".md")).map((f) => path.join(dir, f))
      : [];
    if (g.data.draft === true && !opts.drafts) return null; // drafts render in the dev preview only
    if (url) SOURCES[url] = path.relative(ROOT, file);
    const plain = g.content
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_`~-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = g.data.description ||
      plain.slice(0, 220) + (plain.length > 220 ? "…" : "");
    return {
      section, slug, url, excerpt,
      title: g.data.title || slug,
      date: g.data.date ? new Date(g.data.date) : null,
      tags: g.data.tags || [],
      kind: g.data.trace_kind || g.data.kind || null,
      link: external ? g.data.url : null,
      by: g.data.by || "",
      description: g.data.description || "",
      minutes: Math.max(1, Math.round(words(g.content) / 200)),
      html: marked.parse(g.content),
      assets,
      draft: g.data.draft === true,
      // talks only: where it was given, and what exists beside the page (each optional)
      where: g.data.where || "",
      slides: g.data.slides || "",   // a file in the bundle (slides.html) or an https URL
      video: g.data.video || "",     // an https URL; linked out, never embedded
      poster: g.data.poster || "",   // a photo or video still in the bundle
      length: g.data.length || "",   // "11 min", shown as given
      slideTitles: deckTitles(dir, g.data.slides),
    };
  }

  function loadSection(section) {
    const dir = path.join(ROOT, "content", section);
    if (!fs.existsSync(dir)) return [];
    const docs = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        const idx = path.join(dir, e.name, "index.md");
        if (fs.existsSync(idx)) docs.push(loadDoc(idx, section));
      } else if (e.name.endsWith(".md")) {
        docs.push(loadDoc(path.join(dir, e.name), section));
      }
    }
    return docs.filter(Boolean).sort((a, b) => b.date - a.date);
  }

  const C = (f) => path.join(ROOT, "content", f);
  const posts = loadSection("posts");
  const traces = loadSection("traces");
  const hikes = loadSection("hikes");
  const shelf = loadSection("shelf");
  const talks = loadSection("talks");
  const about = loadDoc(C("about.md"), "");
  const ideas = loadDoc(C("ideas.md"), "");
  const shelfIntro = loadDoc(C("shelf.md"), "");
  about.url = "/about/"; ideas.url = "/ideas/"; shelfIntro.url = "/shelf/";
  // projects: the frontmatter IS the data (apps + talks lists); the body is unused
  const projects = matter(fs.readFileSync(C("projects.md"), "utf8")).data;
  SOURCES["/projects/"] = "content/projects.md";
  const now = fs.readFileSync(C("now.txt"), "utf8").trim();
  const homeDoc = matter(fs.readFileSync(C("home.md"), "utf8"));
  const bio = marked.parse(homeDoc.content);
  const lede = homeDoc.data.lede || ""; // optional: the bio minus its greeting
  SOURCES["/"] = "content/home.md";

  return {
    config: SITE, SHELF_KINDS, TRACE_KINDS,
    posts, traces, hikes, shelf, talks, about, ideas, shelfIntro, projects, now, bio, lede,
    sources: SOURCES,
  };
}

module.exports = { load };
