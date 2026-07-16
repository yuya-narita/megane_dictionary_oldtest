/* Conference Features FIXED
   - 個別サムネ対応: story.thumb
   - 視聴済み表示: ended / 85%以上再生で保存
   - Conferenceお気に入り
   - 再生中表示
   - 一覧でのチラつき防止: setIntervalでDOM再生成しない
   - 停止中バッジは表示しない
*/
(function () {
  var VIEWED_KEY = "megane_conf_viewed";
  var FAV_KEY = "megane_conf_favorites";
  var PLAYING_KEY = "megane_current_conference_id";

  function q(id) { return document.getElementById(id); }

  function readMap(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function writeMap(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function stories() {
    try { return Array.isArray(mangaStories) ? mangaStories : []; }
    catch (e) { return []; }
  }

  function audio() {
    return q("confNativeAudio") || q("mangaAudio");
  }

  function currentStory() {
    try { return mangaStories[mangaStoryIndex] || mangaStories[selectedMangaIndex] || null; }
    catch (e) { return null; }
  }

  function currentPlayingId() {
    try {
      var id = localStorage.getItem(PLAYING_KEY) || "";
      if (id) return id;
    } catch (e) {}

    var a = audio();
    var src = a ? (a.getAttribute("src") || "") : "";
    var s = stories().find(function (x) {
      return x && x.audio && src.indexOf(x.audio) !== -1;
    });
    return s ? s.id : "";
  }

  function setPlaying(id) {
    try {
      if (id) localStorage.setItem(PLAYING_KEY, id);
      else localStorage.removeItem(PLAYING_KEY);
    } catch (e) {}
  }

  function isViewed(id) {
    return !!readMap(VIEWED_KEY)[id];
  }

  function markViewed(id) {
    if (!id) return;
    var m = readMap(VIEWED_KEY);
    if (m[id]) return;
    m[id] = true;
    writeMap(VIEWED_KEY, m);
  }

  function isFav(id) {
    return !!readMap(FAV_KEY)[id];
  }

  function toggleFav(id) {
    if (!id) return;
    var m = readMap(FAV_KEY);
    m[id] = !m[id];
    writeMap(FAV_KEY, m);
    decorateList();
    updatePlayerFav();
  }

  function ensurePlayerFavButton() {
    var stage = q("confPlayerLayer") ? q("confPlayerLayer").querySelector(".conf-stage") : null;
    if (!stage || q("confPlayerFav")) return;

    var back = q("confBackToList");
    var btn = document.createElement("button");
    btn.id = "confPlayerFav";
    btn.type = "button";
    btn.className = "conf-player-fav";
    btn.textContent = "☆ お気に入り";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var s = currentStory();
      if (s && s.id) toggleFav(s.id);
    });

    if (back && back.parentNode === stage) stage.insertBefore(btn, back);
    else stage.appendChild(btn);
  }

  function updatePlayerFav() {
    var btn = q("confPlayerFav");
    var s = currentStory();
    if (!btn || !s) return;

    var active = isFav(s.id);
    btn.classList.toggle("active", active);
    btn.textContent = active ? "★ お気に入り" : "☆ お気に入り";
  }

  function makeBadge(cls, text) {
    var b = document.createElement("span");
    b.className = "conf-badge " + cls;
    b.textContent = text;
    return b;
  }

  function decorateList() {
    var list = q("mangaListView");
    if (!list) return;

    var playingId = currentPlayingId();
    var a = audio();
    var isActuallyPlaying = !!(a && !a.paused && !a.ended);

    list.querySelectorAll(".manga-item").forEach(function (item) {
      var idx = Number(item.dataset.index || 0);
      var s = stories()[idx];
      if (!s) return;

      item.classList.toggle("conf-now-playing", s.id === playingId && isActuallyPlaying);
      item.classList.toggle("conf-viewed", isViewed(s.id));
      item.classList.toggle("conf-favorited", isFav(s.id));

      var meta = item.querySelector(".manga-meta") || item;

      var row = meta.querySelector(".conf-badge-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "conf-badge-row";
        if (meta.firstChild && meta.firstChild.parentNode === meta) meta.insertBefore(row, meta.firstChild); else meta.appendChild(row);
      }
      row.innerHTML = "";

      if (s.id === playingId && isActuallyPlaying) {
        row.appendChild(makeBadge("now", "▶ 再生中"));
      }
      if (isViewed(s.id)) {
        row.appendChild(makeBadge("viewed", "✓ 視聴済み"));
      }
      if (isFav(s.id)) {
        row.appendChild(makeBadge("fav", "★ お気に入り"));
      }

      row.hidden = row.children.length === 0;

      var fav = meta.querySelector(".conf-fav-button");
      if (!fav) {
        fav = document.createElement("button");
        fav.type = "button";
        fav.className = "conf-fav-button";
        fav.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggleFav(s.id);
        });
        meta.appendChild(fav);
      }

      var active = isFav(s.id);
      fav.classList.toggle("active", active);
      fav.textContent = active ? "★ お気に入り" : "☆ お気に入り";
    });
  }

  function bindAudio() {
    var a = audio();
    if (!a || a.dataset.confFeaturesFixedBound) return;
    a.dataset.confFeaturesFixedBound = "1";

    a.addEventListener("play", function () {
      var s = currentStory();
      if (s && s.id) setPlaying(s.id);
      decorateList();
      updatePlayerFav();
    });

    a.addEventListener("pause", function () {
      decorateList();
      updatePlayerFav();
    });

    a.addEventListener("timeupdate", function () {
      var s = currentStory();
      if (!s || !a.duration || !isFinite(a.duration)) return;
      if (a.currentTime > 20 && a.currentTime / a.duration > 0.85) {
        markViewed(s.id);
        decorateList();
      }
    });

    a.addEventListener("ended", function () {
      var s = currentStory();
      if (s && s.id) markViewed(s.id);
      decorateList();
      updatePlayerFav();
    });
  }

  function patchRenderMangaList() {
    try {
      if (typeof renderMangaList !== "function" || renderMangaList.__confFeaturesFixedPatched) return;
      var old = renderMangaList;
      renderMangaList = function () {
        var result = old.apply(this, arguments);
        setTimeout(function () {
          decorateList();
          bindAudio();
        }, 0);
        return result;
      };
      renderMangaList.__confFeaturesFixedPatched = true;
    } catch (e) {}
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__confFeaturesFixedPatched) return;
      var old = render;
      render = function () {
        var result = old.apply(this, arguments);
        setTimeout(function () {
          ensurePlayerFavButton();
          updatePlayerFav();
          bindAudio();
          decorateList();
        }, 0);
        return result;
      };
      render.__confFeaturesFixedPatched = true;
    } catch (e) {}
  }

  function patchListClick() {
    var list = q("mangaListView");
    if (!list || list.dataset.confFeaturesFixedList) return;
    list.dataset.confFeaturesFixedList = "1";

    list.addEventListener("click", function (e) {
      var item = e.target.closest(".manga-item");
      if (!item) return;
      var idx = Number(item.dataset.index || 0);
      var s = stories()[idx];
      if (s && s.id) setPlaying(s.id);
    }, true);
  }

  function boot() {
    patchRenderMangaList();
    patchRender();
    patchListClick();
    ensurePlayerFavButton();
    updatePlayerFav();
    bindAudio();
    decorateList();

    // setIntervalでDOMを再生成しない。再バインドだけ軽く保険で実行。
    setTimeout(function () {
      patchRenderMangaList();
      patchRender();
      patchListClick();
      bindAudio();
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
