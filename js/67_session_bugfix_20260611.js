/* 67_session_bugfix_20260611.js
   Fixes from dev session:
   1) bottom nav ★ must always open dictionary favorites, never card binder/music favorite
   2) binder floating button only appears in cards mode
   3) music favorite/albums state cleanup support
   4) avoid leftover music/card mode layers when moving to dictionary favorites
*/
(function(){
  "use strict";

  function q(id){ return document.getElementById(id); }

  function currentMode(){
    try{
      if(document.body.classList.contains("mode-music")) return "music";
      if(document.body.classList.contains("mode-cards")) return "cards";
      if(document.body.classList.contains("mode-manga") || document.body.classList.contains("mode-conf")) return "conf";
      if(typeof appMode !== "undefined"){
        if(appMode === "music") return "music";
        if(appMode === "cards") return "cards";
        if(appMode === "manga") return "conf";
      }
    }catch(_){ }
    return "dictionary";
  }

  function hardStop(e){
    if(!e) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function enterDictionary(){
    try{ if(typeof savePos === "function") savePos(); }catch(_){ }

    document.body.classList.remove(
      "mode-music", "music-v7", "mode-cards", "mode-manga", "mode-conf",
      "manga-list-state", "manga-reader-state", "manga-choice-state", "conf-player-state"
    );
    document.body.classList.add("mode-dictionary");
    if(document.body.dataset && document.body.dataset.mode !== "content") document.body.dataset.mode = "";

    var music = q("musicView");
    if(music){ music.hidden = true; music.style.display = "none"; }

    var card = q("card");
    var content = q("content");
    if(card){ card.hidden = false; card.style.display = ""; card.style.visibility = ""; }
    if(content){ content.hidden = false; content.style.display = ""; content.style.visibility = ""; content.style.transform = ""; }

    try{
      appMode = "dictionary";
      if(typeof render === "function") render("flash");
    }catch(_){
      try{ if(typeof window.setMode === "function") window.setMode("dictionary"); }catch(__){ }
    }

    ["dictionaryMode","cardMode","musicMode","mangaMode"].forEach(function(id){
      var b = q(id);
      if(b) b.classList.toggle("active", id === "dictionaryMode");
    });
  }

  function openDictionaryFavorites(e){
    hardStop(e);
    setTimeout(function(){
      try{
        if(typeof window.renderDictFavoriteList === "function") window.renderDictFavoriteList();
        else if(typeof renderFavoriteList === "function") renderFavoriteList();
      }catch(_){ }
      var d = q("favoriteDialog");
      if(d){
        try{ if(typeof d.showModal === "function" && !d.open) d.showModal(); else d.setAttribute("open", ""); }
        catch(_){ d.setAttribute("open", ""); }
      }
    }, 0);
  }

  function openBinder(e){
    hardStop(e);
    var m = q("binderModal");
    if(!m) return;
    try{ if(typeof window.renderBinder === "function") window.renderBinder(); }catch(_){ }
    m.style.display = "block";
  }

  function openExplore(e){
    hardStop(e);
    var d = q("glassDialog");
    if(d){
      try{ if(typeof d.showModal === "function" && !d.open) d.showModal(); else d.setAttribute("open", ""); }
      catch(_){ d.setAttribute("open", ""); }
    }
  }

  function stopAllAudio(e){
    hardStop(e);
    if(typeof window.MEGANE_TOGGLE_MAIN_AUDIO === "function") return window.MEGANE_TOGGLE_MAIN_AUDIO();
    try{ document.querySelectorAll("audio").forEach(function(a){ try{ a.pause(); }catch(_){ } }); }catch(_){ }
    try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){ }
  }

  function normalizeBottomNav(){
    var footer = document.querySelector("footer.controls");
    if(footer){
      footer.style.display = "grid";
      footer.style.gridTemplateColumns = "1fr 1fr 1fr";
      footer.style.gap = "14px";
      footer.style.position = "fixed";
      footer.style.left = "max(20px, env(safe-area-inset-left))";
      footer.style.right = "max(20px, env(safe-area-inset-right))";
      footer.style.bottom = "calc(18px + env(safe-area-inset-bottom))";
      footer.style.zIndex = "9000";
      footer.style.pointerEvents = "auto";
    }

    var left = q("prevGlass"), center = q("randomWord"), old = q("nextGlass"), right = q("shareCurrent");
    if(old){ old.style.display = "none"; old.style.pointerEvents = "none"; }

    [left, center, right].forEach(function(b){
      if(!b) return;
      b.style.display = "grid";
      b.style.placeItems = "center";
      b.style.visibility = "visible";
      b.style.pointerEvents = "auto";
      b.style.opacity = "1";
      b.style.filter = "none";
    });

    if(left){ left.textContent = "👓"; left.setAttribute("aria-label", "探索"); left.onclick = openExplore; }
    if(center){
      var isCards = currentMode() === "cards";
      center.textContent = isCards ? "📘" : "★";
      center.setAttribute("aria-label", isCards ? "バインダー" : "辞書お気に入り");
      center.onclick = isCards ? openBinder : openDictionaryFavorites;
    }
    if(right){ right.textContent = "▶"; right.setAttribute("aria-label", "停止"); right.onclick = stopAllAudio; }
  }

  function updateBinderVisibility(){
    var btn = q("openBinderBtn");
    if(!btn) return;
    var show = currentMode() === "cards";
    btn.style.display = show ? "block" : "none";
    btn.style.visibility = show ? "visible" : "hidden";
    btn.style.pointerEvents = show ? "auto" : "none";
  }

  // Document capture runs before old target handlers, so stale 📘/music handlers cannot fire.
  function captureBottomNav(e){
    var target = e.target;
    if(!target || !target.closest) return;
    var btn = target.closest("#prevGlass,#randomWord,#shareCurrent");
    if(!btn) return;
    if(btn.id === "prevGlass") return openExplore(e);
    if(btn.id === "shareCurrent") return stopAllAudio(e);
    if(btn.id === "randomWord"){
      if(currentMode() === "cards") return openBinder(e);
      return openDictionaryFavorites(e);
    }
  }

  function captureFloatingBinder(e){
    var target = e.target;
    if(!target || !target.closest) return;
    var btn = target.closest("#openBinderBtn");
    if(!btn) return;
    if(currentMode() !== "cards") return hardStop(e);
  }

  function apply(){
    normalizeBottomNav();
    updateBinderVisibility();
  }

  function boot(){
    document.addEventListener("click", captureBottomNav, true);
    document.addEventListener("touchend", captureBottomNav, {capture:true, passive:false});
    document.addEventListener("click", captureFloatingBinder, true);
    document.addEventListener("touchend", captureFloatingBinder, {capture:true, passive:false});
    apply();
    setInterval(apply, 180);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
