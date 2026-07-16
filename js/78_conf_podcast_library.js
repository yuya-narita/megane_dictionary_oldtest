/* CONF PODCAST LIBRARY v3
   - confタブの初期画面を再生画面ではなくライブラリに固定
   - 一覧の項目タップで確認画面を挟まず再生画面へ直接移動
   - ライブラリをポッドキャスト風のタイトル重視リストへ変更
   - 再生中に別Conferenceを選んだ時は、新しいConferenceへ再生を引き継ぐ
   ※辞書・カード・MUSICには触らない
*/
(function(){
  var INSTALLED = false;
  var VIEWED_KEY = "megane_conf_viewed";
  var FAV_KEY = "megane_conf_favorites";

  function q(id){ return document.getElementById(id); }
  function stories(){ try { return Array.isArray(window.mangaStories) ? window.mangaStories : mangaStories; } catch(e){ return []; } }
  function readMap(key){ try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch(e){ return {}; } }
  function isConfList(){ return document.body.classList.contains("mode-manga") && document.body.classList.contains("manga-list-state"); }
  function confAudio(){ return q("confNativeAudio") || q("mangaAudio"); }
  function currentPlayingId(){
    try{
      var id = localStorage.getItem("megane_current_conference_id") || "";
      var a = confAudio();
      if(a && a.src){
        var found = stories().find(function(st){ return st && st.audio && a.src.indexOf(st.audio) !== -1; });
        if(found && found.id) id = found.id;
      }
      return id;
    }catch(e){ return ""; }
  }
  function confIsActuallyPlaying(){
    var a = confAudio();
    return !!(a && !a.paused && !a.ended && a.currentTime >= 0);
  }

  function autoplayConfIfWasPlaying(wasPlaying, idx){
    if(!wasPlaying) return;
    var data = stories();
    var story = data[idx];
    var a = confAudio();
    if(!story || !story.audio || !a) return;
    try {
      if(a.getAttribute("src") !== story.audio){
        a.pause();
        a.setAttribute("src", story.audio);
        a.load();
      }
      a.play().catch(function(){});
      if(story.id) localStorage.setItem("megane_current_conference_id", story.id);
    } catch(e){}
  }

  function isCoreConfMode(){
    /* AC FIX: window.appMode は過去のhotfixで stale な "manga" が残ることがある。
       ここを信用すると、辞書/カードへ戻った後も会議監視が再点灯する。
       本物のcore状態を優先し、window.appModeは判定に使わない。 */
    try {
      if (typeof window.MEGANE_GET_CORE_MODE === "function") {
        return window.MEGANE_GET_CORE_MODE() === "manga";
      }
    } catch(e){}
    try { if(typeof appMode !== "undefined" && appMode === "manga") return true; } catch(e){}
    return false;
  }

  function cleanupConfResidue(){
    try {
      if(isCoreConfMode()) return;
      document.body.classList.remove(
        "mode-manga", "mode-conf", "manga-list-state", "manga-reader-state",
        "manga-choice-state", "conf-player-state", "reader-page", "reader-webtoon"
      );
      var mangaBtn = q("mangaMode");
      if(mangaBtn){ mangaBtn.classList.remove("active"); mangaBtn.setAttribute("aria-pressed", "false"); }
      var list = q("mangaListLayer");
      if(list) list.hidden = true;
      var choice = q("mangaChoiceLayer");
      if(choice) choice.hidden = true;
    } catch(e){}
  }

  function leaveMusicOnly(){
    try { if(typeof window.MEGANE_MUSIC_LEAVE === "function") window.MEGANE_MUSIC_LEAVE(); } catch(e){}
    try { document.body.classList.remove("mode-music", "music-v7"); } catch(e){}
    try {
      var music = q("musicView");
      if(music){
        music.hidden = true;
        music.style.display = "none";
        music.style.visibility = "";
        music.style.opacity = "";
        music.classList.remove("music-home", "music-tracks", "music-v7-player", "playlist-open", "sheet-open");
      }
    } catch(e){}
  }

  function enterConfMode(){
    leaveMusicOnly();
    try { document.body.classList.add("mode-manga", "mode-conf"); } catch(e){}
    try { var mangaBtn = q("mangaMode"); if(mangaBtn){ mangaBtn.classList.add("active"); mangaBtn.setAttribute("aria-pressed", "true"); } } catch(e){}
  }

  function forceLeaveMusicForConf(){
    enterConfMode();
  }

  function renderConfLibrary(){
    var list = q("mangaListView");
    if(!list) return;
    var data = stories();
    var viewed = readMap(VIEWED_KEY);
    var fav = readMap(FAV_KEY);
    var playingId = currentPlayingId();
    var playing = confIsActuallyPlaying();

    list.classList.add("conf-podcast-library");
    var header = ''+
      '<div class="conf-library-head">'+
        '<div class="conf-library-brand">Syntax Conference</div>'+
      '</div>';

    list.innerHTML = header + data.map(function(story, index){
      var thumb = story.thumb ? '<img src="' + story.thumb + '" alt="">' : '';
      var rawTitle = story.title || ("Conference " + (index + 1));
      var title = rawTitle.replace(/^🎙️?\s*/, "");
      var date = story.date || story.published || story.pubDate || "2026.06.11";
      var favCls = fav[story.id] ? " conf-min-fav" : "";
      var viewedCls = viewed[story.id] ? " conf-min-viewed" : "";
      var playingCls = (playing && playingId && story.id === playingId) ? " conf-podcast-playing" : "";
      var now = playingCls ? '<div class="conf-podcast-now">▶ 再生中</div>' : '';
      var meta = "Syntax Conference｜" + date;
      var safeLabel = title.replace(/"/g, '&quot;');
      return ''+
        '<button type="button" class="manga-item conf-podcast-item' + favCls + viewedCls + playingCls + '" data-index="' + index + '" aria-label="' + safeLabel + '">'+
          '<div class="manga-thumb conf-podcast-thumb">' + thumb + '</div>'+
          '<div class="manga-meta conf-podcast-meta">'+
            now+
            '<div class="manga-title conf-podcast-title"><span class="conf-title-mic">🎙️</span>' + title + '</div>'+
            '<div class="manga-desc conf-podcast-desc">' + meta + '</div>'+
          '</div>'+
        '</button>';
    }).join("");
  }

  function openConfLibrary(){
    forceLeaveMusicForConf();
    try{
      window.mangaState = "list";
      window.appMode = "manga";
    }catch(e){}
    try { if(typeof mangaState !== "undefined") mangaState = "list"; } catch(e){}
    try { if(typeof appMode !== "undefined") appMode = "manga"; } catch(e){}
    try{
      if(typeof window.setMode === "function") window.setMode("manga");
      else if(typeof setMode === "function") setMode("manga");
      else if(typeof window.render === "function") window.render("flash");
      else if(typeof render === "function") render("flash");
    }catch(e){}
    forceLeaveMusicForConf();
    setTimeout(function(){ forceLeaveMusicForConf(); renderConfLibrary(); }, 0);
    setTimeout(function(){ forceLeaveMusicForConf(); renderConfLibrary(); }, 80);
  }

  function openConfPlayerByIndex(idx){
    var wasPlaying = confIsActuallyPlaying();
    forceLeaveMusicForConf();
    var data = stories();
    if(!data[idx]) return;
    try{
      window.selectedMangaIndex = idx;
      window.mangaStoryIndex = idx;
      window.mangaPageIndex = 0;
      window.mangaReadMode = "page";
      window.mangaState = "reader";
    }catch(e){}
    try { if(typeof selectedMangaIndex !== "undefined") selectedMangaIndex = idx; } catch(e){}
    try { if(typeof mangaStoryIndex !== "undefined") mangaStoryIndex = idx; } catch(e){}
    try { if(typeof mangaPageIndex !== "undefined") mangaPageIndex = 0; } catch(e){}
    try { if(typeof mangaReadMode !== "undefined") mangaReadMode = "page"; } catch(e){}
    try { if(typeof mangaState !== "undefined") mangaState = "reader"; } catch(e){}
    try { localStorage.setItem("megane_current_conference_id", data[idx].id || ""); } catch(e){}

    try{
      if(typeof window.setMode === "function") window.setMode("manga");
      else if(typeof setMode === "function") setMode("manga");
      else if(typeof window.render === "function") window.render("flash");
      else if(typeof render === "function") render("flash");
    }catch(e){}
    forceLeaveMusicForConf();
    autoplayConfIfWasPlaying(wasPlaying, idx);
    setTimeout(function(){ autoplayConfIfWasPlaying(wasPlaying, idx); }, 80);
    setTimeout(function(){ autoplayConfIfWasPlaying(wasPlaying, idx); }, 240);
  }

  function interceptConfTab(e){
    var tab = e.target && e.target.closest ? e.target.closest("#mangaMode") : null;
    if(!tab) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    openConfLibrary();
    return false;
  }

  function interceptListOpen(e){
    var item = e.target && e.target.closest ? e.target.closest("#mangaListView .manga-item") : null;
    if(!item || !isConfList()) return;
    var idx = Number(item.dataset.index || 0);
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    openConfPlayerByIndex(idx);
    return false;
  }

  function patchRenderMangaList(){
    try{
      if(typeof window.renderMangaList === "function" && !window.renderMangaList.__confPodcastPatched){
        var old = window.renderMangaList;
        window.renderMangaList = function(){
          var r = old.apply(this, arguments);
          if(isCoreConfMode()){ enterConfMode(); setTimeout(function(){ if(isConfList()) renderConfLibrary(); }, 0); }
          return r;
        };
        window.renderMangaList.__confPodcastPatched = true;
      } else if(typeof renderMangaList === "function" && !renderMangaList.__confPodcastPatched){
        var old2 = renderMangaList;
        renderMangaList = function(){
          var r2 = old2.apply(this, arguments);
          if(isCoreConfMode()){ enterConfMode(); setTimeout(function(){ if(isConfList()) renderConfLibrary(); }, 0); }
          return r2;
        };
        renderMangaList.__confPodcastPatched = true;
      }
    }catch(e){}
  }

  function patchRender(){
    try{
      if(typeof window.render === "function" && !window.render.__confPodcastPatched){
        var old = window.render;
        window.render = function(){
          var r = old.apply(this, arguments);
          setTimeout(function(){ if(isConfList()) renderConfLibrary(); }, 0);
          return r;
        };
        window.render.__confPodcastPatched = true;
      } else if(typeof render === "function" && !render.__confPodcastPatched){
        var old2 = render;
        render = function(){
          var r2 = old2.apply(this, arguments);
          setTimeout(function(){ if(isConfList()) renderConfLibrary(); }, 0);
          return r2;
        };
        render.__confPodcastPatched = true;
      }
    }catch(e){}
  }


  function installConfMusicIsolationStyle(){
    if(document.getElementById("confMusicIsolationStyle")) return;
    var st=document.createElement("style");
    st.id="confMusicIsolationStyle";
    st.textContent='body.mode-manga:not(.mode-music) #musicView{display:none!important;visibility:hidden!important;pointer-events:none!important;} body.mode-conf:not(.mode-music) #musicView{display:none!important;visibility:hidden!important;pointer-events:none!important;}';
    document.head.appendChild(st);
  }

  function hideChoiceLayer(){
    var choice = q("mangaChoiceLayer");
    if(choice) choice.hidden = true;
    document.body.classList.remove("manga-choice-state");
  }

  function interceptNonConfTab(e){
    var t = e.target && e.target.closest ? e.target.closest("#dictionaryMode,#cardMode,#musicMode") : null;
    if(!t) return;
    // 他タブへ移動する時、会議ライブラリの後処理が残って会議タブを再点灯させるのを防ぐ
    setTimeout(cleanupConfResidue, 0);
    setTimeout(cleanupConfResidue, 80);
    setTimeout(cleanupConfResidue, 240);
  }

  function boot(){
    if(INSTALLED) return;
    INSTALLED = true;
    installConfMusicIsolationStyle();
    patchRenderMangaList();
    patchRender();
    window.addEventListener("click", interceptNonConfTab, true);
    window.addEventListener("click", interceptConfTab, true);
    window.addEventListener("pointerup", interceptListOpen, true);
    window.addEventListener("click", interceptListOpen, true);
    setInterval(function(){
      patchRenderMangaList();
      patchRender();
      if(isCoreConfMode()){
        enterConfMode();
        if(isConfList()) renderConfLibrary();
        hideChoiceLayer();
      } else {
        cleanupConfResidue();
      }
    }, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
