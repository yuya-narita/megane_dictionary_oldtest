/* Conference resume / now playing */
(function () {
  var KEY = "megane_current_conference_id";

  function q(id) { return document.getElementById(id); }

  function stories() {
    try { return Array.isArray(mangaStories) ? mangaStories : []; }
    catch (e) { return []; }
  }

  function getStoryById(id) {
    if (!id) return null;
    return stories().find(function (s) { return s && s.id === id; }) || null;
  }

  function getCurrentStory() {
    try { return mangaStories[mangaStoryIndex] || null; }
    catch (e) { return null; }
  }

  function getAudio() {
    return q("confNativeAudio") || q("mangaAudio");
  }

  function getPlayingId() {
    var id = "";
    try { id = localStorage.getItem(KEY) || ""; } catch (e) {}
    if (id && getStoryById(id)) return id;

    var a = getAudio();
    if (a) {
      var src = a.getAttribute("src") || "";
      var match = stories().find(function (s) {
        return s && s.audio && src.indexOf(s.audio) !== -1;
      });
      if (match) return match.id;
    }
    return "";
  }

  function setPlayingId(id) {
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function setCurrentStoryById(id) {
    var list = stories();
    var index = list.findIndex(function (s) { return s && s.id === id; });
    if (index < 0) return false;
    try {
      selectedMangaIndex = index;
      mangaStoryIndex = index;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      return true;
    } catch (e) {
      return false;
    }
  }

  function isAudioPlaying() {
    var a = getAudio();
    return !!(a && !a.paused && !a.ended);
  }

  function goNowPlayingIfAny() {
    var id = getPlayingId();
    if (!id) return false;
    if (!setCurrentStoryById(id)) return false;

    try {
      appMode = "manga";
      mangaState = "reader";
      if (typeof setMode === "function") setMode("manga");
      else if (typeof render === "function") render("flash");
    } catch (e) {}
    return true;
  }

  function decorateList() {
    var list = q("mangaListView");
    if (!list) return;

    var id = getPlayingId();
    var items = list.querySelectorAll(".manga-item");
    items.forEach(function (item) {
      item.classList.remove("conf-now-playing");
      var badge = item.querySelector(".conf-now-playing-badge");
      if (badge) badge.remove();
      var hint = item.querySelector(".conf-resume-hint");
      if (hint) hint.remove();

      var idx = Number(item.dataset.index || 0);
      var story = stories()[idx];
      if (!story || !id || story.id !== id) return;

      item.classList.add("conf-now-playing");
      var meta = item.querySelector(".manga-meta") || item;
      var b = document.createElement("div");
      b.className = "conf-now-playing-badge";
      b.textContent = isAudioPlaying() ? "▶ 再生中" : "⏸ 停止中";
      meta.insertBefore(b, meta.firstChild);

      var h = document.createElement("div");
      h.className = "conf-resume-hint";
      h.textContent = "タップで再生画面へ戻る";
      meta.appendChild(h);
    });
  }

  function bindAudioTracking() {
    var a = getAudio();
    if (!a || a.dataset.confResumeBound) return;
    a.dataset.confResumeBound = "1";

    a.addEventListener("play", function () {
      var s = getCurrentStory();
      if (s && s.id) setPlayingId(s.id);
      decorateList();
    });

    a.addEventListener("pause", decorateList);
    a.addEventListener("ended", decorateList);
  }

  function patchRenderMangaList() {
    try {
      if (typeof renderMangaList !== "function" || renderMangaList.__resumePatched) return;
      var old = renderMangaList;
      renderMangaList = function () {
        var result = old.apply(this, arguments);
        setTimeout(decorateList, 0);
        return result;
      };
      renderMangaList.__resumePatched = true;
    } catch (e) {}
  }

  function patchConfTab() {
    var btn = q("mangaMode");
    if (!btn || btn.dataset.confResumeTab) return;
    btn.dataset.confResumeTab = "1";
    btn.addEventListener("click", function (e) {
      var id = getPlayingId();
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      goNowPlayingIfAny();
      setTimeout(function () {
        bindAudioTracking();
        decorateList();
      }, 0);
    }, true);
  }

  function patchListClick() {
    var list = q("mangaListView");
    if (!list || list.dataset.confResumeList) return;
    list.dataset.confResumeList = "1";
    list.addEventListener("click", function (e) {
      var item = e.target.closest(".manga-item");
      if (!item) return;
      var idx = Number(item.dataset.index || 0);
      var story = stories()[idx];
      if (!story) return;
      selectedMangaIndex = idx;
      mangaStoryIndex = idx;
      mangaPageIndex = 0;
      setPlayingId(story.id);
    }, true);
  }

  function patchPlayButton() {
    var btn = q("confPlayPause");
    if (!btn || btn.dataset.confResumePlay) return;
    btn.dataset.confResumePlay = "1";
    btn.addEventListener("click", function () {
      var s = getCurrentStory();
      if (s && s.id) setPlayingId(s.id);
      setTimeout(decorateList, 150);
    }, true);
  }

  function boot() {
    patchRenderMangaList();
    patchConfTab();
    patchListClick();
    patchPlayButton();
    bindAudioTracking();
    decorateList();
    setInterval(function () {
      patchRenderMangaList();
      patchConfTab();
      patchListClick();
      patchPlayButton();
      bindAudioTracking();
      decorateList();
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
