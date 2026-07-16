/* Conference Player FIXED: independent from old manga viewer */
(function () {
  function q(id) { return document.getElementById(id); }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function isConfMode() {
    try { return appMode === "manga"; } catch (e) { return false; }
  }

  function currentConf() {
    try { return mangaStories[mangaStoryIndex] || mangaStories[0] || null; }
    catch (e) { return null; }
  }

  function audio() { return q("mangaAudio"); }

  function ensureAudio() {
    var a = audio();
    var s = currentConf();
    if (!a || !s || !s.audio) return null;

    if (a.getAttribute("src") !== s.audio) {
      a.pause();
      a.setAttribute("src", s.audio);
      a.load();
    }
    return a;
  }

  function updateLabels() {
    var s = currentConf();
    var title = q("confTitle");
    var desc = q("confDesc");
    if (title && s) title.textContent = s.title || "Syntax Conference";
    if (desc && s) desc.textContent = s.desc || "Conference音声を再生できます。";

    var a = audio();
    var btn = q("confPlayPause");
    if (btn && a) btn.textContent = a.paused ? "▶ 再生" : "⏸ 停止";

    var seek = q("confSeek");
    var time = q("confTime");
    if (a && seek) {
      if (a.duration && isFinite(a.duration) && a.duration > 0) {
        seek.value = Math.round((a.currentTime / a.duration) * 1000);
      } else {
        seek.value = 0;
      }
    }
    if (a && time) time.textContent = fmt(a.currentTime) + " / " + fmt(a.duration || 0);
  }

  function showPlayer() {
    var layer = q("confPlayerLayer");
    if (!layer) return;
    var show = false;
    try { show = appMode === "manga" && mangaState === "reader"; } catch(e) {}
    layer.hidden = !show;
    if (show) updateLabels();
  }

  function togglePlay() {
    var a = ensureAudio();
    if (!a) {
      console.log("conference audio not found");
      return;
    }
    if (a.paused) {
      a.play().catch(function(err){ console.log("conf play failed:", err); });
    } else {
      a.pause();
    }
    setTimeout(updateLabels, 80);
  }

  function jump(sec) {
    var a = ensureAudio();
    if (!a) return;
    var max = a.duration && isFinite(a.duration) ? a.duration : Math.max(0, a.currentTime + sec);
    a.currentTime = Math.max(0, Math.min(max, a.currentTime + sec));
    updateLabels();
  }

  function seek(v) {
    var a = ensureAudio();
    if (!a || !a.duration || !isFinite(a.duration)) return;
    a.currentTime = a.duration * (Number(v) / 1000);
    updateLabels();
  }

  function bindButtons() {
    var play = q("confPlayPause");
    var back = q("confBack15");
    var fwd = q("confForward15");
    var bar = q("confSeek");
    var backList = q("confBackToList");
    var a = audio();

    if (play && !play.dataset.confFixed) {
      play.dataset.confFixed = "1";
      play.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); togglePlay(); });
    }
    if (back && !back.dataset.confFixed) {
      back.dataset.confFixed = "1";
      back.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); jump(-15); });
    }
    if (fwd && !fwd.dataset.confFixed) {
      fwd.dataset.confFixed = "1";
      fwd.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); jump(15); });
    }
    if (bar && !bar.dataset.confFixed) {
      bar.dataset.confFixed = "1";
      bar.addEventListener("input", function(){ seek(bar.value); });
      bar.addEventListener("click", function(e){ e.stopPropagation(); });
    }
    if (backList && !backList.dataset.confFixed) {
      backList.dataset.confFixed = "1";
      backList.addEventListener("click", function(e){
        e.preventDefault(); e.stopPropagation();
        if (a) a.pause();
        try { mangaState = "list"; setMode("manga"); } catch(err) {}
      });
    }
    if (a && !a.dataset.confFixed) {
      a.dataset.confFixed = "1";
      ["timeupdate","loadedmetadata","play","pause","ended"].forEach(function(ev){
        a.addEventListener(ev, updateLabels);
      });
    }
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__confFixed) return;
      var original = render;
      render = function () {
        var result = original.apply(this, arguments);
        setTimeout(function(){
          bindButtons();
          showPlayer();
        }, 0);
        return result;
      };
      render.__confFixed = true;
    } catch(e) {}
  }

  function patchStartReader() {
    try {
      if (typeof startMangaReader !== "function" || startMangaReader.__confFixed) return;
      var original = startMangaReader;
      startMangaReader = function(mode) {
        var result = original.call(this, "page");
        try { mangaState = "reader"; } catch(e) {}
        setTimeout(function(){
          bindButtons();
          showPlayer();
          updateLabels();
        }, 0);
        return result;
      };
      startMangaReader.__confFixed = true;
    } catch(e) {}
  }

  function boot() {
    bindButtons();
    patchRender();
    patchStartReader();
    showPlayer();
    setInterval(function(){
      bindButtons();
      showPlayer();
      updateLabels();
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
