// Small pure helpers shared by the core and every skin. A skin gets these as
// ctx.h so no skin re-derives date formats, escaping or tag slugs.
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// tag URLs are slugified exactly the way Hugo did (/tags/ai-tools/) — a URL invariant
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const words = (md) => md.split(/\s+/).filter(Boolean).length;

module.exports = { fmtDate, esc, slugify, words };
