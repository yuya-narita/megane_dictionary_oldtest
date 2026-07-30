/* 148_music_album_pinch_columns.js v1.01
   Music album shelf pinch columns:
   - Pinch out  : fewer columns (2 -> 1)
   - Pinch in   : more columns  (2 -> 3 -> 4)
   - Live pinch response + smooth FLIP reflow animation.
   - Saves the selected column count.
   - Touch-only; does not interfere with one-finger album/single reorder.
*/
(function(){
  "use strict";

  var STORAGE_KEY = "megane_music_album_columns_v1";
  var MIN_COLUMNS = 1;
  var MAX_COLUMNS = 4;
  var DEFAULT_COLUMNS = 2;
  var TRIGGER_RATIO = 0.18;
  var RESET_RATIO = 0.07;
  var observer = null;
  var toastTimer = 0;
  var gesture = null;
  var reflowToken = 0;

  function clamp(value){
    value = Number(value);
    if(!isFinite(value)) value = DEFAULT_COLUMNS;
    return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, Math.round(value)));
  }

  function loadColumns(){
    try{ return clamp(localStorage.getItem(STORAGE_KEY) || DEFAULT_COLUMNS); }
    catch(_){ return DEFAULT_COLUMNS; }
  }

  function saveColumns(value){
    try{ localStorage.setItem(STORAGE_KEY, String(clamp(value))); }catch(_){ }
  }

  function isAlbumScreen(){
    var view = document.getElementById("musicView");
    return !!(view && view.classList.contains("music-v7-albums"));
  }

  function albumGrid(){
    return isAlbumScreen() ? document.querySelector(".music-v7-album-grid-final") : null;
  }

  function cards(grid){
    return grid ? Array.prototype.slice.call(grid.children).filter(function(el){
      return el && el.nodeType === 1;
    }) : [];
  }

  function distance(t1, t2){
    var dx = t2.clientX - t1.clientX;
    var dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function midpoint(t1, t2){
    return { x:(t1.clientX + t2.clientX) / 2, y:(t1.clientY + t2.clientY) / 2 };
  }

  function injectStyle(){
    if(document.getElementById("musicAlbumPinchColumnsStyle")) return;
    var style = document.createElement("style");
    style.id = "musicAlbumPinchColumnsStyle";
    style.textContent =
      ".music-v7-album-grid-final.music-pinch-columns{transition:grid-template-columns .24s cubic-bezier(.22,.8,.24,1),gap .24s cubic-bezier(.22,.8,.24,1),max-width .24s cubic-bezier(.22,.8,.24,1)!important;transform-origin:var(--music-pinch-origin-x,50%) var(--music-pinch-origin-y,50%);will-change:transform;}"+
      ".music-v7-album-grid-final.music-pinch-live{transform:scale(var(--music-pinch-scale,1));transition:transform .06s linear!important;}"+
      ".music-v7-album-grid-final.music-pinch-settling{animation:musicPinchSettle .34s cubic-bezier(.18,.9,.25,1) both;}"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='1']{max-width:430px!important;margin-left:auto!important;margin-right:auto!important;}"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='2'],"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='3'],"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='4']{max-width:none!important;}"+
      ".music-column-toast{position:fixed;left:50%;bottom:106px;z-index:2147483005;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(13,16,26,.94);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;letter-spacing:.03em;pointer-events:none;box-shadow:0 12px 36px rgba(0,0,0,.38);animation:musicColumnToast .9s ease both;}"+
      "@keyframes musicPinchSettle{0%{transform:scale(.985)}58%{transform:scale(1.012)}100%{transform:scale(1)}}"+
      "@keyframes musicColumnToast{0%{opacity:0;transform:translate(-50%,8px) scale(.96)}18%,72%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-5px) scale(.98)}}"+
      "@media(prefers-reduced-motion:reduce){.music-v7-album-grid-final.music-pinch-columns,.music-v7-album-grid-final.music-pinch-live{transition:none!important}.music-v7-album-grid-final.music-pinch-settling{animation:none!important}}";
    document.head.appendChild(style);
  }

  function showToast(columns){
    var old = document.querySelector(".music-column-toast");
    if(old) old.remove();
    clearTimeout(toastTimer);
    var el = document.createElement("div");
    el.className = "music-column-toast";
    el.textContent = "📚 " + columns + "列表示";
    document.body.appendChild(el);
    toastTimer = setTimeout(function(){ if(el.parentNode) el.remove(); }, 940);
  }

  function setGridColumns(grid, columns){
    columns = clamp(columns);
    grid.classList.add("music-pinch-columns");
    grid.setAttribute("data-music-columns", String(columns));
    grid.style.setProperty("grid-template-columns", "repeat(" + columns + ", minmax(0, 1fr))", "important");

    var gap;
    if(columns === 1) gap = "22px";
    else if(columns === 2) gap = "18px 14px";
    else if(columns === 3) gap = "14px 10px";
    else gap = "11px 7px";
    grid.style.setProperty("gap", gap, "important");

    document.documentElement.style.setProperty("--music-album-columns", String(columns));
    saveColumns(columns);
  }

  function applyColumns(columns, announce){
    var grid = albumGrid();
    if(!grid) return false;
    setGridColumns(grid, columns);
    if(announce) showToast(clamp(columns));
    return true;
  }

  function clearLivePreview(grid){
    grid = grid || albumGrid();
    if(!grid) return;
    grid.classList.remove("music-pinch-live");
    grid.style.removeProperty("--music-pinch-scale");
  }

  function settleGrid(grid){
    if(!grid) return;
    grid.classList.remove("music-pinch-settling");
    void grid.offsetWidth;
    grid.classList.add("music-pinch-settling");
    setTimeout(function(){
      if(grid && grid.classList) grid.classList.remove("music-pinch-settling");
    }, 380);
  }

  function animateReflow(nextColumns){
    var grid = albumGrid();
    if(!grid) return false;
    var token = ++reflowToken;
    var items = cards(grid);
    var before = items.map(function(el){ return { el:el, rect:el.getBoundingClientRect() }; });

    clearLivePreview(grid);
    setGridColumns(grid, nextColumns);

    requestAnimationFrame(function(){
      if(token !== reflowToken || !document.body.contains(grid)) return;
      before.forEach(function(entry, index){
        var el = entry.el;
        if(!document.body.contains(el)) return;
        var after = el.getBoundingClientRect();
        var old = entry.rect;
        if(!after.width || !after.height || !old.width || !old.height) return;
        var dx = old.left - after.left;
        var dy = old.top - after.top;
        var sx = old.width / after.width;
        var sy = old.height / after.height;
        if(typeof el.animate === "function"){
          try{
            el.animate([
              { transform:"translate("+dx+"px,"+dy+"px) scale("+sx+","+sy+")", opacity:.92 },
              { transform:"translate(0,0) scale(1,1)", opacity:1 }
            ], {
              duration: 300 + Math.min(index, 8) * 14,
              delay: Math.min(index, 8) * 10,
              easing: "cubic-bezier(.18,.9,.25,1)",
              fill: "both"
            });
          }catch(_){ }
        }
      });
      settleGrid(grid);
    });
    return true;
  }

  function changeColumns(delta){
    var current = loadColumns();
    var next = clamp(current + delta);
    var grid = albumGrid();
    if(next === current){
      clearLivePreview(grid);
      settleGrid(grid);
      showToast(current);
      return;
    }
    animateReflow(next);
    showToast(next);
    try{ if(navigator.vibrate) navigator.vibrate(9); }catch(_){ }
  }

  function updateLivePreview(e, ratio){
    var grid = albumGrid();
    if(!grid || !e.touches || e.touches.length < 2) return;
    var point = midpoint(e.touches[0], e.touches[1]);
    var rect = grid.getBoundingClientRect();
    var ox = rect.width ? ((point.x - rect.left) / rect.width) * 100 : 50;
    var oy = rect.height ? ((point.y - rect.top) / rect.height) * 100 : 50;
    ox = Math.max(0, Math.min(100, ox));
    oy = Math.max(0, Math.min(100, oy));

    // A restrained live response: spread grows, pinch shrinks.
    var scale = 1 + (ratio - 1) * 0.20;
    scale = Math.max(.965, Math.min(1.035, scale));
    grid.style.setProperty("--music-pinch-origin-x", ox + "%");
    grid.style.setProperty("--music-pinch-origin-y", oy + "%");
    grid.style.setProperty("--music-pinch-scale", String(scale));
    grid.classList.add("music-pinch-live");
  }

  function onTouchStart(e){
    if(e.touches.length !== 2 || !albumGrid()){
      gesture = null;
      return;
    }
    gesture = {
      startDistance: distance(e.touches[0], e.touches[1]),
      lastRatio: 1,
      armed: true
    };
  }

  function onTouchMove(e){
    if(!gesture || e.touches.length !== 2 || !albumGrid()) return;
    var currentDistance = distance(e.touches[0], e.touches[1]);
    if(!gesture.startDistance) return;
    var ratio = currentDistance / gesture.startDistance;
    gesture.lastRatio = ratio;

    if(e.cancelable) e.preventDefault();
    updateLivePreview(e, ratio);

    if(gesture.armed){
      if(ratio >= 1 + TRIGGER_RATIO){
        changeColumns(-1);
        gesture.armed = false;
        gesture.startDistance = currentDistance;
      }else if(ratio <= 1 - TRIGGER_RATIO){
        changeColumns(1);
        gesture.armed = false;
        gesture.startDistance = currentDistance;
      }
    }else if(Math.abs(ratio - 1) <= RESET_RATIO){
      gesture.armed = true;
      gesture.startDistance = currentDistance;
    }
  }

  function onTouchEnd(e){
    if(!gesture) return;
    if(e.touches && e.touches.length >= 2){
      gesture.startDistance = distance(e.touches[0], e.touches[1]);
      gesture.armed = true;
    }else{
      clearLivePreview();
      gesture = null;
    }
  }

  function polish(){
    injectStyle();
    applyColumns(loadColumns(), false);
  }

  function start(){
    injectStyle();
    polish();
    document.addEventListener("touchstart", onTouchStart, {passive:true, capture:true});
    document.addEventListener("touchmove", onTouchMove, {passive:false, capture:true});
    document.addEventListener("touchend", onTouchEnd, {passive:true, capture:true});
    document.addEventListener("touchcancel", function(){ clearLivePreview(); gesture = null; }, {passive:true, capture:true});

    observer = new MutationObserver(function(){
      clearTimeout(observer._timer);
      observer._timer = setTimeout(polish, 35);
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
