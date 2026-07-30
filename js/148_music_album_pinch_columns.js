/* 148_music_album_pinch_columns.js v1.00
   Music album shelf pinch columns:
   - Pinch out  : fewer columns (2 -> 1)
   - Pinch in   : more columns  (2 -> 3 -> 4)
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

  function distance(t1, t2){
    var dx = t2.clientX - t1.clientX;
    var dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function injectStyle(){
    if(document.getElementById("musicAlbumPinchColumnsStyle")) return;
    var style = document.createElement("style");
    style.id = "musicAlbumPinchColumnsStyle";
    style.textContent =
      ".music-v7-album-grid-final.music-pinch-columns{transition:grid-template-columns .20s ease,gap .20s ease,max-width .20s ease!important;}"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='1']{max-width:430px!important;margin-left:auto!important;margin-right:auto!important;}"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='2'],"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='3'],"+
      ".music-v7-album-grid-final.music-pinch-columns[data-music-columns='4']{max-width:none!important;}"+
      ".music-column-toast{position:fixed;left:50%;bottom:106px;z-index:2147483005;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(13,16,26,.94);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;letter-spacing:.03em;pointer-events:none;box-shadow:0 12px 36px rgba(0,0,0,.38);animation:musicColumnToast .9s ease both;}"+
      "@keyframes musicColumnToast{0%{opacity:0;transform:translate(-50%,8px)}18%,72%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-5px)}}";
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

  function applyColumns(columns, announce){
    columns = clamp(columns);
    var grid = albumGrid();
    if(!grid) return false;

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
    if(announce) showToast(columns);
    return true;
  }

  function changeColumns(delta){
    var current = loadColumns();
    var next = clamp(current + delta);
    if(next === current){
      showToast(current);
      return;
    }
    applyColumns(next, true);
    try{ if(navigator.vibrate) navigator.vibrate(9); }catch(_){ }
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

    // Stop Safari page zoom while the gesture is over the album shelf.
    if(e.cancelable) e.preventDefault();

    if(gesture.armed){
      if(ratio >= 1 + TRIGGER_RATIO){
        // Fingers spread: make jackets larger, therefore fewer columns.
        changeColumns(-1);
        gesture.armed = false;
        gesture.startDistance = currentDistance;
      }else if(ratio <= 1 - TRIGGER_RATIO){
        // Fingers close: make jackets smaller, therefore more columns.
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
    document.addEventListener("touchcancel", function(){ gesture = null; }, {passive:true, capture:true});

    observer = new MutationObserver(function(){
      clearTimeout(observer._timer);
      observer._timer = setTimeout(polish, 35);
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
