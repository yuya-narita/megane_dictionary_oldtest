/* 72_session_bugfix_20260611_i.js
   I fix:
   - Bottom ★ must ONLY open dictionary favorite overlay. It must not switch to dictionary mode.
   - Favorite words still open dictionary by long-press only.
   - Right bottom stop button toggles pause/resume for the last main audio.
*/
(function(){
  "use strict";
  var lastAudio = null;
  var lastAudioId = "";
  var lastStarAt = 0;

  function q(id){ return document.getElementById(id); }
  function stop(e){
    if(!e) return;
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
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
  function mainAudios(){
    var arr=[];
    ["musicAudio","confNativeAudio","mangaAudio"].forEach(function(id){ var a=q(id); if(a) arr.push(a); });
    Array.prototype.forEach.call(document.querySelectorAll("audio"), function(a){ if(arr.indexOf(a)<0) arr.push(a); });
    return arr;
  }
  function playingAudio(){
    var list=mainAudios();
    for(var i=0;i<list.length;i++){
      var a=list[i];
      try{ if(a && !a.paused && !a.ended) return a; }catch(_){ }
    }
    return null;
  }
  function remember(a){
    if(!a) return;
    lastAudio=a;
    lastAudioId=a.id||"";
  }
  function updateStopLabel(){
    var b=q("shareCurrent"); if(!b) return;
    var p=playingAudio();
    b.textContent = p ? "■" : "▶";
    b.setAttribute("aria-label", p ? "停止" : "再開");
    b.setAttribute("title", p ? "停止" : "再開");
    b.classList.toggle("is-playing", !!p);
    b.classList.toggle("can-resume", !p && !!(lastAudio || lastAudioId));
  }
  function toggleMainAudio(e){
    stop(e);
    var p=playingAudio();
    if(p){
      remember(p);
      try{ p.pause(); }catch(_){ }
      try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){ }
      setTimeout(updateStopLabel,50);
      return false;
    }
    var a=lastAudio || (lastAudioId ? q(lastAudioId) : null) || q("musicAudio") || q("confNativeAudio") || q("mangaAudio");
    if(a){
      try{
        var pr=a.play();
        if(pr && pr.catch) pr.catch(function(){});
      }catch(_){ }
    }
    setTimeout(updateStopLabel,100);
    return false;
  }
  window.MEGANE_TOGGLE_MAIN_AUDIO = toggleMainAudio;

  function openExplore(e){
    stop(e);
    var d=q("glassDialog");
    if(d){ try{ if(d.showModal && !d.open) d.showModal(); else d.setAttribute("open",""); }catch(_){ d.setAttribute("open",""); } }
  }
  function openBinder(e){
    stop(e);
    var m=q("binderModal"); if(!m) return false;
    try{ if(typeof window.renderBinder==="function") window.renderBinder(); }catch(_){ }
    m.style.display="block";
    return false;
  }
  function openDictFavoritesOverlay(e){
    stop(e);
    var t=Date.now();
    if(t-lastStarAt < 220) return false;
    lastStarAt=t;
    // Important: no appMode/body class change here.
    try{
      if(typeof window.renderDictFavoriteList === "function") window.renderDictFavoriteList();
      else if(typeof renderFavoriteList === "function") renderFavoriteList();
    }catch(_){ }
    var d=q("favoriteDialog");
    if(d){
      try{ if(d.showModal && !d.open) d.showModal(); else d.setAttribute("open",""); }
      catch(_){ d.setAttribute("open",""); }
    }
    return false;
  }

  function handleBottom(e){
    var t=e.target;
    if(!t || !t.closest) return;
    var btn=t.closest("#prevGlass,#randomWord,#shareCurrent");
    if(!btn) return;
    if(btn.id==="prevGlass") return openExplore(e);
    if(btn.id==="shareCurrent") return toggleMainAudio(e);
    if(btn.id==="randomWord"){
      return mode()==="cards" ? openBinder(e) : openDictFavoritesOverlay(e);
    }
  }

  function normalize(){
    var left=q("prevGlass"), center=q("randomWord"), right=q("shareCurrent"), old=q("nextGlass");
    if(old){ old.style.display="none"; old.style.pointerEvents="none"; old.style.visibility="hidden"; }
    [left,center,right].forEach(function(b){
      if(!b) return;
      b.style.display="grid";
      b.style.placeItems="center";
      b.style.visibility="visible";
      b.style.pointerEvents="auto";
      b.style.opacity="1";
    });
    if(left){ left.textContent="👓"; left.setAttribute("aria-label","探索"); left.onclick=openExplore; }
    if(center){
      var cards=mode()==="cards";
      center.textContent=cards?"📘":"★";
      center.setAttribute("aria-label",cards?"バインダー":"辞書お気に入り");
      center.onclick=cards?openBinder:openDictFavoritesOverlay;
    }
    if(right){ right.onclick=toggleMainAudio; }
    updateStopLabel();
  }

  function boot(){
    // Window capture is earliest. This blocks all old document/button handlers below it.
    ["touchstart","touchend","pointerdown","pointerup","mousedown","mouseup","click"].forEach(function(type){
      window.addEventListener(type, handleBottom, {capture:true, passive:false});
    });
    ["play","pause","ended"].forEach(function(type){
      document.addEventListener(type, function(e){
        var a=e.target;
        if(a && a.tagName && String(a.tagName).toLowerCase()==="audio"){
          if(type==="play") remember(a);
          setTimeout(updateStopLabel,40);
        }
      }, true);
    });
    normalize();
    setInterval(normalize,120);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
