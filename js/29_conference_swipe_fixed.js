/* Conference Swipe Fixed
   conf再生画面で横スワイプ:
   左へ → 次のConference
   右へ → 前のConference
   ※ audio / input / button 上の操作は邪魔しない
*/
(function () {
  function q(id) { return document.getElementById(id); }

  function stories() {
    try { return Array.isArray(mangaStories) ? mangaStories : []; }
    catch (e) { return []; }
  }

  function isConfReader() {
    try { return appMode === "manga" && mangaState === "reader"; }
    catch (e) { return false; }
  }

  function audio() {
    return q("confNativeAudio") || q("mangaAudio");
  }

  function isControlTarget(el) {
    if (!el) return false;
    var tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "audio" || tag === "input" || tag === "button" || tag === "select" || tag === "textarea") return true;
    if (el.closest && el.closest("audio,input,button,select,textarea")) return true;
    return false;
  }

  function stopAudio() {
    var a = audio();
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {}
  }

  function applyConference(index, direction) {
    var list = stories();
    if (!list.length) return;

    index = (index + list.length) % list.length;

    stopAudio();

    try {
      selectedMangaIndex = index;
      mangaStoryIndex = index;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      appMode = "manga";
    } catch (e) {}

    try {
      localStorage.setItem("megane_current_conference_id", list[index].id || "");
    } catch (e) {}

    if (typeof render === "function") {
      render(direction > 0 ? "slide-left" : "slide-right");
    }

    setTimeout(function () {
      var stage = getStage();
      if (!stage) return;
      stage.classList.remove("conf-slide-next", "conf-slide-prev");
      void stage.offsetWidth;
      stage.classList.add(direction > 0 ? "conf-slide-next" : "conf-slide-prev");
    }, 50);
  }

  function move(step) {
    try { applyConference(mangaStoryIndex + step, step); } catch (e) {}
  }

  function getStage() {
    var layer = q("confPlayerLayer");
    if (!layer) return null;
    return layer.querySelector(".conf-stage") || layer;
  }

  function ensureHint() {
    var stage = getStage();
    if (!stage || stage.querySelector(".conf-swipe-hint-fixed")) return;
    var h = document.createElement("div");
    h.className = "conf-swipe-hint-fixed";
    h.textContent = "左右スワイプで前後のConference";
    stage.appendChild(h);
  }

  function bindTouch() {
    var stage = getStage();
    if (!stage || stage.dataset.confSwipeFixed) return;
    stage.dataset.confSwipeFixed = "1";

    var sx = 0, sy = 0, tracking = false;

    stage.addEventListener("touchstart", function (e) {
      if (!isConfReader()) return;
      if (isControlTarget(e.target)) return;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      tracking = true;
    }, { passive: true });

    stage.addEventListener("touchend", function (e) {
      if (!tracking || !isConfReader()) return;
      tracking = false;
      if (isControlTarget(e.target)) return;

      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;

      var dx = t.clientX - sx;
      var dy = t.clientY - sy;

      if (Math.abs(dx) < 55) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.15) return;

      e.preventDefault();
      e.stopPropagation();

      move(dx < 0 ? 1 : -1);
    }, { passive: false });

    // PC / pointer対応
    var psx = 0, psy = 0, ptr = false;

    stage.addEventListener("pointerdown", function (e) {
      if (!isConfReader()) return;
      if (isControlTarget(e.target)) return;
      psx = e.clientX;
      psy = e.clientY;
      ptr = true;
    });

    stage.addEventListener("pointerup", function (e) {
      if (!ptr || !isConfReader()) return;
      ptr = false;
      if (isControlTarget(e.target)) return;

      var dx = e.clientX - psx;
      var dy = e.clientY - psy;

      if (Math.abs(dx) < 70) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.15) return;

      e.preventDefault();
      e.stopPropagation();

      move(dx < 0 ? 1 : -1);
    });
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__confSwipeFixedPatched) return;
      var old = render;
      render = function () {
        var result = old.apply(this, arguments);
        setTimeout(function () {
          ensureHint();
          bindTouch();
        }, 0);
        return result;
      };
      render.__confSwipeFixedPatched = true;
    } catch (e) {}
  }

  function boot() {
    patchRender();
    ensureHint();
    bindTouch();

    setInterval(function () {
      ensureHint();
      bindTouch();
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
