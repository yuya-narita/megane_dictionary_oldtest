/* 71_session_bugfix_20260611_h.js
   H fix:
   - MUSIC track list bottom sheet must be fully hidden when closed; no header leaking above bottom nav.
   - Bottom nav ★ opens dictionary favorite overlay without changing current mode.
   - Favorite word opens dictionary only by long press. Normal tap does nothing.
*/
(function(){
  "use strict";

  var FAV_KEY = "meganeFavoritesV65";
  var lastOpenAt = 0;

  function $(id){ return document.getElementById(id); }
  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
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
  function loadFavs(){
    try{ return JSON.parse(localStorage.getItem(FAV_KEY) || "[]") || []; }
    catch(_){ return []; }
  }
  function saveFavs(list){
    try{ localStorage.setItem(FAV_KEY, JSON.stringify(list || [])); }catch(_){ }
  }
  function dictFavs(){ return loadFavs().filter(function(f){ return f && f.type === "dict"; }); }

  function jumpToDictionary(item){
    if(!item) return;
    try{
      if(typeof appMode !== "undefined") appMode = "dictionary";
      if(typeof data !== "undefined" && data.words){
        var wi = data.words.findIndex(function(w){ return w.word === item.word || w.word === item.title || w.id === item.wordId; });
        if(wi >= 0 && typeof wordIndex !== "undefined") wordIndex = wi;
      }
      if(typeof data !== "undefined" && data.glasses){
        var gi = data.glasses.findIndex(function(g){ return g.id === item.glassId || g.name === item.glassName || g.label === item.glassName; });
        if(gi >= 0 && typeof glassIndex !== "undefined") glassIndex = gi;
      }
      if(typeof render === "function") render("flash");
    }catch(_){ }
    var d = $("favoriteDialog");
    try{ if(d && d.open && typeof d.close === "function") d.close(); }catch(_){ }
  }

  function removeFavorite(item){
    if(!item) return;
    saveFavs(loadFavs().filter(function(f){ return f.key !== item.key; }));
    try{ if(typeof updateFavoriteToggle === "function") updateFavoriteToggle(); }catch(_){ }
    renderDictFavoriteListStable();
  }

  function renderDictFavoriteListStable(){
    var listEl = $("favoriteList");
    if(!listEl) return;
    var list = dictFavs();
    if(!list.length){
      listEl.innerHTML = '<div class="favorite-empty">まだお気に入りはありません</div>';
      return;
    }
    listEl.innerHTML = list.map(function(item){
      return '<div class="favorite-item favorite-item-longpress-only" role="button" tabindex="0" data-key="'+esc(item.key)+'">'
        + '<span class="favorite-item-title">'+esc(item.title || item.word || "Untitled")+'</span>'
        + '<span class="favorite-item-meta">辞書｜'+esc(item.meta || item.glassName || "")+'</span>'
        + '<span class="favorite-item-hint">長押しで開く</span>'
        + '</div>';
    }).join("");

    Array.prototype.forEach.call(listEl.querySelectorAll(".favorite-item"), function(el){
      var item = list.find(function(f){ return String(f.key) === String(el.dataset.key); });
      bindLongPressOnly(el, item);
    });
  }

  function bindLongPressOnly(el, item){
    if(!el || !item) return;
    var timer = null;
    var sx = 0, sy = 0, moved = false, active = false;

    function clear(){
      if(timer) clearTimeout(timer);
      timer = null;
      active = false;
      el.classList.remove("longpress-charging", "longpress-ready");
      el.style.transform = "";
      el.style.opacity = "";
    }
    function start(x,y){
      clear();
      sx = x; sy = y; moved = false; active = true;
      el.classList.add("longpress-charging");
      timer = setTimeout(function(){
        if(!active || moved) return;
        el.classList.remove("longpress-charging");
        el.classList.add("longpress-ready");
        try{ if(navigator.vibrate) navigator.vibrate(18); }catch(_){ }
        setTimeout(function(){ jumpToDictionary(item); }, 60);
      }, 680);
    }
    function move(x,y){
      if(!active) return;
      if(Math.abs(x - sx) > 14 || Math.abs(y - sy) > 14){ moved = true; clear(); }
    }

    el.addEventListener("pointerdown", function(e){ start(e.clientX, e.clientY); }, {passive:true});
    el.addEventListener("pointermove", function(e){ move(e.clientX, e.clientY); }, {passive:true});
    el.addEventListener("pointerup", clear, {passive:true});
    el.addEventListener("pointercancel", clear, {passive:true});

    el.addEventListener("touchstart", function(e){
      var t = e.touches && e.touches[0]; if(t) start(t.clientX, t.clientY);
    }, {passive:true});
    el.addEventListener("touchmove", function(e){
      var t = e.touches && e.touches[0]; if(t) move(t.clientX, t.clientY);
    }, {passive:true});
    el.addEventListener("touchend", clear, {passive:true});
    el.addEventListener("touchcancel", clear, {passive:true});

    // Normal tap/click must not jump to dictionary.
    el.addEventListener("click", function(e){ stop(e); }, true);
    el.addEventListener("dblclick", function(e){ stop(e); }, true);

    // Keep old swipe-left delete behavior by providing a small explicit delete affordance on long press only is too hidden,
    // so allow horizontal drag left beyond half screen for removal.
    var dragX = 0, dragStartX = 0, dragStartY = 0, dragging = false;
    el.addEventListener("pointerdown", function(e){ dragStartX = e.clientX; dragStartY = e.clientY; dragX = 0; dragging = true; }, true);
    el.addEventListener("pointermove", function(e){
      if(!dragging) return;
      var dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
      if(Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.2){
        dragX = dx;
        if(dx < 0){
          stop(e);
          el.style.transform = "translate3d("+dx+"px,0,0)";
          el.style.opacity = String(Math.max(.35, 1 - Math.abs(dx)/window.innerWidth));
        }
      }
    }, true);
    el.addEventListener("pointerup", function(e){
      if(!dragging) return;
      dragging = false;
      if(dragX < -window.innerWidth * .5){ stop(e); removeFavorite(item); return; }
      el.style.transition = "transform .22s ease, opacity .22s ease";
      el.style.transform = "translate3d(0,0,0)";
      el.style.opacity = "1";
      setTimeout(function(){ el.style.transition = ""; }, 240);
    }, true);
  }

  function openFavoriteOverlay(e){
    stop(e);
    if(now() - lastOpenAt < 250) return;
    lastOpenAt = now();
    renderDictFavoriteListStable();
    var d = $("favoriteDialog");
    if(d){
      try{ if(typeof d.showModal === "function" && !d.open) d.showModal(); else d.setAttribute("open", ""); }
      catch(_){ d.setAttribute("open", ""); }
    }
  }

  // Window capture runs before the older document capture handlers that changed appMode to dictionary.
  function interceptBottomStar(e){
    var t = e.target;
    if(!t || !t.closest) return;
    var btn = t.closest("#randomWord");
    if(!btn) return;
    var isCards = false;
    try{ isCards = document.body.classList.contains("mode-cards") || (typeof appMode !== "undefined" && appMode === "cards"); }catch(_){ }
    if(isCards) return; // keep binder behavior in card mode
    openFavoriteOverlay(e);
  }

  function keepBottomStarLabel(){
    var btn = $("randomWord");
    if(!btn) return;
    var isCards = false;
    try{ isCards = document.body.classList.contains("mode-cards") || (typeof appMode !== "undefined" && appMode === "cards"); }catch(_){ }
    if(!isCards){ btn.textContent = "★"; btn.setAttribute("aria-label", "辞書お気に入り"); }
  }

  function boot(){
    window.renderDictFavoriteList = renderDictFavoriteListStable;
    ["touchstart","touchend","pointerdown","pointerup","mousedown","mouseup","click"].forEach(function(type){
      window.addEventListener(type, interceptBottomStar, {capture:true, passive:false});
    });
    keepBottomStarLabel();
    setInterval(function(){
      window.renderDictFavoriteList = renderDictFavoriteListStable;
      keepBottomStarLabel();
    }, 120);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
