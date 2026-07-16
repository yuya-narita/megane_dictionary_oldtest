/* 73_session_bugfix_20260611_j.js
   J fix:
   - Replace bottom center/right buttons with fixed IDs so old stacked handlers cannot hijack them.
   - ★ opens dictionary favorites without switching mode; tapping a favorite word opens that word.
   - ■ toggles pause/resume reliably.
*/
(function(){
  "use strict";

  var FAV_KEY = "meganeFavoritesV65";
  var lastAudio = null;
  var lastAudioId = "";
  var lastToggleAt = 0;
  var lastFavOpenAt = 0;

  function $(id){ return document.getElementById(id); }
  function stop(e){
    if(!e) return;
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch];
    });
  }
  function getMode(){
    try{
      if(document.body.classList.contains("mode-cards")) return "cards";
      if(document.body.classList.contains("mode-music")) return "music";
      if(document.body.classList.contains("mode-conf") || document.body.classList.contains("mode-manga")) return "conf";
      if(typeof appMode !== "undefined") return appMode === "manga" ? "conf" : appMode;
    }catch(_){ }
    return "dictionary";
  }
  function loadFavs(){
    try{ return JSON.parse(localStorage.getItem(FAV_KEY) || "[]") || []; }
    catch(_){ return []; }
  }
  function dictFavs(){ return loadFavs().filter(function(f){ return f && f.type === "dict"; }); }

  function closeFavoriteDialog(){
    var d=$("favoriteDialog");
    try{ if(d && d.open && typeof d.close === "function") d.close(); }
    catch(_){ if(d) d.removeAttribute("open"); }
  }
  function jumpToDictionary(item){
    if(!item) return false;
    try{
      if(typeof appMode !== "undefined") appMode = "dictionary";
      document.body.classList.remove("mode-cards","mode-music","mode-conf","mode-manga","mode-content");
      document.body.classList.add("mode-dictionary");
      document.body.setAttribute("data-mode","dictionary");
    }catch(_){ }
    try{
      if(typeof data !== "undefined" && data.words){
        var wi = data.words.findIndex(function(w){
          return String(w.word) === String(item.word || item.title) || String(w.id||"") === String(item.wordId||"");
        });
        if(wi >= 0 && typeof wordIndex !== "undefined") wordIndex = wi;
      }
      if(typeof data !== "undefined" && data.glasses){
        var gi = data.glasses.findIndex(function(g){
          return String(g.id||"") === String(item.glassId||"") || String(g.name||g.label||"") === String(item.glassName||"");
        });
        if(gi >= 0 && typeof glassIndex !== "undefined") glassIndex = gi;
      }
      if(typeof render === "function") render("flash");
    }catch(_){ }
    closeFavoriteDialog();
    return false;
  }

  function renderFavoriteWordsTap(){
    var listEl=$("favoriteList");
    if(!listEl) return;
    var list=dictFavs();
    if(!list.length){
      listEl.innerHTML='<div class="favorite-empty">まだお気に入りはありません</div>';
      return;
    }
    listEl.innerHTML=list.map(function(item){
      return '<button type="button" class="favorite-item favorite-item-tap-open" data-key="'+esc(item.key)+'">'
        + '<span class="favorite-item-title">'+esc(item.title || item.word || "Untitled")+'</span>'
        + '<span class="favorite-item-meta">辞書｜'+esc(item.meta || item.glassName || "")+'</span>'
        + '<span class="favorite-item-hint">タップで開く</span>'
        + '</button>';
    }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll(".favorite-item-tap-open"), function(el){
      el.addEventListener("click", function(e){
        stop(e);
        var key=el.getAttribute("data-key");
        var item=dictFavs().find(function(f){ return String(f.key) === String(key); });
        jumpToDictionary(item);
        return false;
      }, {capture:true, passive:false});
      el.addEventListener("touchend", function(e){
        stop(e);
        var key=el.getAttribute("data-key");
        var item=dictFavs().find(function(f){ return String(f.key) === String(key); });
        jumpToDictionary(item);
        return false;
      }, {capture:true, passive:false});
    });
  }

  function showFavoriteOverlay(e){
    stop(e);
    var n=Date.now();
    if(n-lastFavOpenAt < 260) return false;
    lastFavOpenAt=n;
    // Do not change appMode here. It only opens the overlay.
    renderFavoriteWordsTap();
    var d=$("favoriteDialog");
    if(d){
      try{ if(typeof d.showModal === "function" && !d.open) d.showModal(); else d.setAttribute("open",""); }
      catch(_){ d.setAttribute("open",""); }
    }
    return false;
  }
  window.renderDictFavoriteList = renderFavoriteWordsTap;

  function mainAudios(){
    var ids=["musicAudio","confNativeAudio","mangaAudio"];
    var out=[];
    ids.forEach(function(id){ var a=$(id); if(a) out.push(a); });
    Array.prototype.forEach.call(document.querySelectorAll("audio"), function(a){ if(out.indexOf(a)<0) out.push(a); });
    return out;
  }
  function playingAudio(){
    var arr=mainAudios();
    for(var i=0;i<arr.length;i++){
      try{ if(arr[i] && !arr[i].paused && !arr[i].ended) return arr[i]; }catch(_){ }
    }
    return null;
  }
  function remember(a){ if(a){ lastAudio=a; lastAudioId=a.id || lastAudioId; } }
  function candidateAudio(){
    return lastAudio || (lastAudioId ? $(lastAudioId) : null) || $("musicAudio") || $("confNativeAudio") || $("mangaAudio") || document.querySelector("audio");
  }
  function updateStopButton(){
    var b=$("shareCurrentFixed"); if(!b) return;
    var p=playingAudio();
    b.classList.toggle("is-playing", !!p);
    b.classList.toggle("can-resume", !p && !!candidateAudio());
    b.setAttribute("aria-label", p ? "停止" : "再開");
    b.setAttribute("title", p ? "停止" : "再開");
  }
  function toggleStopResume(e){
    stop(e);
    var n=Date.now();
    if(n-lastToggleAt < 320) return false;
    lastToggleAt=n;
    var p=playingAudio();
    if(p){
      remember(p);
      try{ p.pause(); }catch(_){ }
      try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){ }
      setTimeout(updateStopButton,80);
      return false;
    }
    var a=candidateAudio();
    if(a){
      try{
        var pr=a.play();
        if(pr && pr.catch) pr.catch(function(){});
      }catch(_){ }
    }
    setTimeout(updateStopButton,120);
    return false;
  }

  function openBinder(e){
    stop(e);
    var m=$("binderModal"); if(!m) return false;
    try{ if(typeof window.renderBinder === "function") window.renderBinder(); }catch(_){ }
    m.style.display="block";
    return false;
  }

  function replaceBottomButtons(){
    var center=$("randomWord") || $("randomWordFixed");
    if(center && center.id !== "randomWordFixed"){
      var c=center.cloneNode(false);
      c.id="randomWordFixed";
      c.type="button";
      c.className=center.className;
      c.textContent="";
      center.parentNode.replaceChild(c, center);
      center=c;
    }
    var right=$("shareCurrent") || $("shareCurrentFixed");
    if(right && right.id !== "shareCurrentFixed"){
      var r=right.cloneNode(false);
      r.id="shareCurrentFixed";
      r.type="button";
      r.className=right.className;
      r.textContent="";
      right.parentNode.replaceChild(r, right);
      right=r;
    }
    if(center && !center.dataset.jFixed){
      center.dataset.jFixed="1";
      ["pointerdown","mousedown"].forEach(function(type){ center.addEventListener(type, stop, {capture:true, passive:false}); });
      ["click","touchend"].forEach(function(type){
        center.addEventListener(type, function(e){
          return getMode()==="cards" ? openBinder(e) : showFavoriteOverlay(e);
        }, {capture:true, passive:false});
      });
    }
    if(right && !right.dataset.jFixed){
      right.dataset.jFixed="1";
      ["pointerdown","mousedown"].forEach(function(type){ right.addEventListener(type, stop, {capture:true, passive:false}); });
      ["click","touchend"].forEach(function(type){
        right.addEventListener(type, toggleStopResume, {capture:true, passive:false});
      });
    }
    var oldNext=$("nextGlass");
    if(oldNext){ oldNext.style.display="none"; oldNext.style.pointerEvents="none"; }
    updateStopButton();
  }

  function injectCss(){
    if($("sessionBugfixJStyle")) return;
    var st=document.createElement("style");
    st.id="sessionBugfixJStyle";
    st.textContent='\n'
      + '#randomWordFixed,#shareCurrentFixed{font-size:0!important;position:relative;display:grid!important;place-items:center!important;visibility:visible!important;pointer-events:auto!important;opacity:1!important;}\n'
      + '#randomWordFixed::after,#shareCurrentFixed::after{font-size:15px!important;line-height:1;letter-spacing:.04em;}\n'
      + '#randomWordFixed::after{content:"★"!important;}\n'
      + 'body.mode-cards #randomWordFixed::after,body[data-mode="cards"] #randomWordFixed::after{content:"📘"!important;}\n'
      + '#shareCurrentFixed::after{content:"▶"!important;}\n'
      + '#shareCurrentFixed.is-playing::after{content:"■"!important;}\n'
      + '.favorite-item-tap-open{width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:14px;color:inherit;padding:12px;margin:8px 0;display:grid;gap:4px;}\n'
      + '.favorite-item-tap-open .favorite-item-title{font-weight:800;}\n'
      + '.favorite-item-tap-open .favorite-item-meta,.favorite-item-tap-open .favorite-item-hint{opacity:.72;font-size:12px;}\n';
    document.head.appendChild(st);
  }

  function boot(){
    injectCss();
    replaceBottomButtons();
    ["play","pause","ended"].forEach(function(type){
      document.addEventListener(type, function(e){
        var a=e.target;
        if(a && a.tagName && String(a.tagName).toLowerCase()==="audio"){
          if(type==="play") remember(a);
          setTimeout(updateStopButton,60);
        }
      }, true);
    });
    setInterval(function(){
      window.renderDictFavoriteList = renderFavoriteWordsTap;
      replaceBottomButtons();
      updateStopButton();
    }, 500);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
