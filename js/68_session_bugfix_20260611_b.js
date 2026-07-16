/* 68_session_bugfix_20260611_b.js
   Additional fixes:
   - Top header/tab layer must not move during vertical swipe/scroll in MUSIC.
   - Bottom ★ opens dictionary favorite list as an overlay only; it does not force dictionary mode.
   - Favorite words jump to dictionary only by long-press via renderDictFavoriteList.
   - MUSIC album shelf favorite row captures touch/click before album cards underneath.
*/
(function(){
  "use strict";
  function q(id){ return document.getElementById(id); }
  function stop(e){
    if(!e) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  }
  function mode(){
    try{
      if(document.body.classList.contains("mode-cards")) return "cards";
      if(document.body.classList.contains("mode-music")) return "music";
      if(document.body.classList.contains("mode-manga") || document.body.classList.contains("mode-conf")) return "conf";
      if(typeof appMode !== "undefined") return appMode === "manga" ? "conf" : appMode;
    }catch(_){ }
    return "dictionary";
  }
  function openDictFavoritesOverlay(e){
    stop(e);
    try{
      if(typeof window.renderDictFavoriteList === "function") window.renderDictFavoriteList();
      else if(typeof renderFavoriteList === "function") renderFavoriteList();
    }catch(_){ }
    var d = q("favoriteDialog");
    if(d){
      try{ if(typeof d.showModal === "function" && !d.open) d.showModal(); else d.setAttribute("open", ""); }
      catch(_){ d.setAttribute("open", ""); }
    }
    // Do NOT change appMode/body class here. Long-press inside renderDictFavoriteList is the only jump.
  }
  function openBinder(e){
    stop(e);
    var m=q("binderModal"); if(!m) return;
    try{ if(typeof window.renderBinder === "function") window.renderBinder(); }catch(_){ }
    m.style.display="block";
  }
  function openExplore(e){
    stop(e);
    var d=q("glassDialog");
    if(d){ try{ if(d.showModal && !d.open) d.showModal(); else d.setAttribute("open",""); }catch(_){ d.setAttribute("open",""); } }
  }
  function stopAudio(e){
    stop(e);
    if(typeof window.MEGANE_TOGGLE_MAIN_AUDIO === "function") return window.MEGANE_TOGGLE_MAIN_AUDIO();
    try{ document.querySelectorAll("audio").forEach(function(a){ try{ a.pause(); }catch(_){ } }); }catch(_){ }
    try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){ }
  }
  function normalizeBottom(){
    var left=q("prevGlass"), center=q("randomWord"), right=q("shareCurrent"), old=q("nextGlass");
    if(old){ old.style.display="none"; old.style.pointerEvents="none"; }
    [left,center,right].forEach(function(b){ if(!b) return; b.style.display="grid"; b.style.placeItems="center"; b.style.visibility="visible"; b.style.opacity="1"; b.style.pointerEvents="auto"; });
    if(left){ left.textContent="👓"; left.onclick=openExplore; }
    if(center){
      var cards = mode()==="cards";
      center.textContent = cards ? "📘" : "★";
      center.setAttribute("aria-label", cards ? "バインダー" : "辞書お気に入り");
      center.onclick = cards ? openBinder : openDictFavoritesOverlay;
    }
    if(right){ right.textContent="▶"; right.onclick=stopAudio; }
    var btn=q("openBinderBtn");
    if(btn){ var show=mode()==="cards"; btn.style.display=show?"block":"none"; btn.style.visibility=show?"visible":"hidden"; btn.style.pointerEvents=show?"auto":"none"; }
  }
  function captureBottom(e){
    var t=e.target; if(!t || !t.closest) return;
    var b=t.closest("#prevGlass,#randomWord,#shareCurrent");
    if(!b) return;
    if(b.id==="prevGlass") return openExplore(e);
    if(b.id==="shareCurrent") return stopAudio(e);
    if(b.id==="randomWord") return mode()==="cards" ? openBinder(e) : openDictFavoritesOverlay(e);
  }
  function captureMusicFavAlbum(e){
    var t=e.target; if(!t || !t.closest) return;
    var fav=t.closest("#musicV7FavAlbum,.music-v7-favline");
    if(!fav) return;
    if(mode()!=="music") return;
    stop(e);
    try{ if(typeof window.MEGANE_MUSIC_V7_OPEN_FAVORITES === "function") window.MEGANE_MUSIC_V7_OPEN_FAVORITES(); }
    catch(_){ }
  }
  function boot(){
    document.addEventListener("click", captureBottom, true);
    document.addEventListener("touchend", captureBottom, {capture:true, passive:false});
    document.addEventListener("pointerup", captureBottom, true);
    document.addEventListener("click", captureMusicFavAlbum, true);
    document.addEventListener("touchend", captureMusicFavAlbum, {capture:true, passive:false});
    document.addEventListener("pointerup", captureMusicFavAlbum, true);
    normalizeBottom();
    setInterval(normalizeBottom, 160);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
