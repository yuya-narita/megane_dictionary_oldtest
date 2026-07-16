/* Conference iOS Swipe
   iPhone Safari用。audio controls周辺ではなく、専用スワイプゾーンで確実に前後移動。
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

  function getAudio() {
    return q("confNativeAudio") || q("mangaAudio");
  }

  function getStage() {
    var layer = q("confPlayerLayer");
    return layer ? layer.querySelector(".conf-stage") : null;
  }

  function stopAudio() {
    var a = getAudio();
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {}
  }

  function moveConf(step) {
    var list = stories();
    if (!list.length) return;

    var next = 0;
    try {
      next = (mangaStoryIndex + step + list.length) % list.length;
    } catch (e) {
      next = 0;
    }

    stopAudio();

    try {
      selectedMangaIndex = next;
      mangaStoryIndex = next;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      appMode = "manga";
      localStorage.setItem("megane_current_conference_id", list[next].id || "");
    } catch (e) {}

    if (typeof render === "function") {
      render(step > 0 ? "slide-left" : "slide-right");
    }

    setTimeout(function () {
      var stage = getStage();
      if (!stage) return;
      stage.style.transition = "transform .18s ease-out, opacity .18s ease-out";
      stage.style.transform = step > 0 ? "translateX(18px)" : "translateX(-18px)";
      stage.style.opacity = ".72";
      setTimeout(function () {
        stage.style.transform = "";
        stage.style.opacity = "";
      }, 60);
    }, 30);
  }

  function ensureSwipeZone() {
    var stage = getStage();
    if (!stage || q("confIosSwipeZone")) return;

    var zone = document.createElement("div");
    zone.id = "confIosSwipeZone";
    zone.className = "conf-ios-swipe-zone";
    zone.textContent = "← 前のConference　｜　次のConference →";

    // 一覧へ戻るボタンの直前に置く
    var back = q("confBackToList");
    if (back && back.parentNode === stage) {
      stage.insertBefore(zone, back);
    } else {
      stage.appendChild(zone);
    }
  }

  function bindZone() {
    var zone = q("confIosSwipeZone");
    if (!zone || zone.dataset.iosSwipeBound) return;
    zone.dataset.iosSwipeBound = "1";

    var sx = 0;
    var sy = 0;
    var active = false;

    zone.addEventListener("touchstart", function (e) {
      if (!isConfReader()) return;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      active = true;
    }, { passive: true });

    zone.addEventListener("touchmove", function (e) {
      if (!active) return;
      // Safariの横スワイプ戻る・スクロールを抑える
      e.preventDefault();
    }, { passive: false });

    zone.addEventListener("touchend", function (e) {
      if (!active || !isConfReader()) return;
      active = false;

      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;

      var dx = t.clientX - sx;
      var dy = t.clientY - sy;

      if (Math.abs(dx) < 42) return;
      if (Math.abs(dx) < Math.abs(dy)) return;

      e.preventDefault();
      e.stopPropagation();

      moveConf(dx < 0 ? 1 : -1);
    }, { passive: false });

    // PCテスト用
    var down = false, px = 0, py = 0;
    zone.addEventListener("pointerdown", function (e) {
      if (!isConfReader()) return;
      down = true; px = e.clientX; py = e.clientY;
    });
    zone.addEventListener("pointerup", function (e) {
      if (!down || !isConfReader()) return;
      down = false;
      var dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;
      moveConf(dx < 0 ? 1 : -1);
    });
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__iosSwipePatched) return;
      var old = render;
      render = function () {
        var result = old.apply(this, arguments);
        setTimeout(function () {
          ensureSwipeZone();
          bindZone();
        }, 0);
        return result;
      };
      render.__iosSwipePatched = true;
    } catch (e) {}
  }

  function boot() {
    patchRender();
    ensureSwipeZone();
    bindZone();

    setInterval(function () {
      ensureSwipeZone();
      bindZone();
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
