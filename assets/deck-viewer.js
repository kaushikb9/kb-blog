// The talk page's slide viewer (markup from core/talk.js). The deck itself runs
// in the iframe, same origin; tools/deck.js taught it to report each slide
// ({deck:{n,total,title}}) and to obey {deckGo:n}. This file only drives it:
// the bar under the slide, keys, full screen, and #n in the URL so a slide can be linked.
(function () {
  document.querySelectorAll("[data-deck]").forEach(function (root) {
    var frame = root.querySelector("iframe");
    var screen = root.querySelector(".screen");
    var total = +root.dataset.total;
    var num = root.querySelector("[data-deck-n]");
    var title = root.querySelector("[data-deck-title]");
    var ticks = [].slice.call(root.querySelectorAll("[data-deck-go]"));
    var start = parseInt(location.hash.slice(1), 10);
    var n = start >= 1 && start <= total ? start : 1;

    // titles come from the build (core/load.js reads each slide's heading), one per tick
    var titles = ticks.map(function (b) { return b.title.replace(/^\d+ · /, ""); });
    var want = null; // a slide we asked for and the deck has not confirmed yet
    function send(k) {
      k = Math.max(1, Math.min(total, k));
      show(k); // move now: a fast second click must not read the old position
      want = k;
      try { frame.contentWindow.postMessage({ deckGo: k }, location.origin); } catch (e) {}
    }
    function show(k) {
      n = k;
      num.textContent = String(k).padStart(2, "0");
      title.textContent = titles[k - 1] || "";
      ticks.forEach(function (b, i) { b.classList.toggle("on", i < k); b.setAttribute("aria-current", i === k - 1 ? "step" : "false"); });
      try { history.replaceState(null, "", k > 1 ? "#" + k : location.pathname + location.search); } catch (e) {}
    }
    // a linked slide (#6): the deck reads its own hash when it starts, so hand it over
    // before the (lazy) frame loads, and confirm once it has
    if (n > 1) { frame.src = frame.src.split("#")[0] + "#" + n; want = n; }
    frame.addEventListener("load", function () { if (want) send(want); });
    window.addEventListener("message", function (e) {
      if (e.source !== frame.contentWindow || !e.data || !e.data.deck) return;
      var k = e.data.deck.n;
      if (want !== null) { if (k === want) want = null; return; } // a stale reply on the way to our target
      if (k !== n) show(k); // the reader moved inside the deck (keys, swipe)
    });

    function full() {
      var fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      var req = screen.requestFullscreen || screen.webkitRequestFullscreen;
      if (req) try { Promise.resolve(req.call(screen)).catch(function () {}); } catch (e) {}
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-deck-act],[data-deck-go]");
      if (!b) return;
      if (b.dataset.deckGo) send(+b.dataset.deckGo);
      else if (b.dataset.deckAct === "prev") send(n - 1);
      else if (b.dataset.deckAct === "next") send(n + 1);
      else if (b.dataset.deckAct === "full") full();
    });
    // keys work while the reader is on the page, not only once the slide has focus
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && t.closest && t.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); send(n + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); send(n - 1); }
      else if (e.key === "f" || e.key === "F") full();
    });
    if (n > 1) show(n);
  });
})();
