/* 70_music_favorites_row_final_fix.js
   Final MUSIC album shelf fix:
   - Keep 「お気に入り曲」 as a wide row.
   - Keep normal albums in a 2-column grid below it.
   - On iPhone, decide favorite-row taps by screen coordinates, not event target,
     so the first album (詩の処方箋) cannot steal the tap/click.
*/
(function(){
  "use strict";

  var opening = false;
  var blockAlbumUntil = 0;

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function q(sel){ return document.querySelector(sel); }
  function stop(e){
    if(!e) return;
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function isMusicAlbums(){
    var v = document.getElementById("musicView");
    return !!(v && v.classList && v.classList.contains("music-v7-albums"));
  }
  function point(e){
    var p = e;
    if(e && e.changedTouches && e.changedTouches[0]) p = e.changedTouches[0];
    else if(e && e.touches && e.touches[0]) p = e.touches[0];
    return {x:(p && typeof p.clientX === "number") ? p.clientX : -9999,
            y:(p && typeof p.clientY === "number") ? p.clientY : -9999};
  }
  function isInsideFavRowByPoint(e){
    if(!isMusicAlbums()) return false;
    var fav = document.getElementById("musicV7FavAlbum");
    if(!fav) return false;
    var r = fav.getBoundingClientRect();
    var p = point(e);
    // Slightly generous edge, but only around the visible favorite row.
    return p.x >= r.left - 8 && p.x <= r.right + 8 && p.y >= r.top - 8 && p.y <= r.bottom + 8;
  }
  function openFavorites(){
    if(opening) return;
    opening = true;
    blockAlbumUntil = now() + 1000;
    setTimeout(function(){
      try{
        if(typeof window.MEGANE_MUSIC_V7_OPEN_FAVORITES === "function"){
          window.MEGANE_MUSIC_V7_OPEN_FAVORITES();
        }
      }catch(_){ }
      setTimeout(function(){ opening = false; }, 450);
    }, 0);
  }

  function guard(e){
    if(!isMusicAlbums()) return;
    var t = e.target;
    var inFavByTarget = !!(t && t.closest && t.closest("#musicV7FavAlbum"));
    if(inFavByTarget || isInsideFavRowByPoint(e)){
      stop(e);
      openFavorites();
      return;
    }
    // Suppress the synthetic click/touchend that may arrive on the first album after opening favorites.
    if(now() < blockAlbumUntil && t && t.closest && t.closest(".music-v7-album-art,[data-album]")){
      stop(e);
    }
  }

  function layout(){
    if(!isMusicAlbums()) return;
    var shelf = q("#musicView .music-v7-shelf");
    var fav = document.getElementById("musicV7FavAlbum");
    if(!shelf || !fav) return;

    shelf.classList.add("music-v7-shelf-row-final");
    fav.classList.remove("music-v7-fav-card");
    fav.classList.add("music-v7-fav-row-final");
    fav.style.pointerEvents = "auto";
    fav.style.touchAction = "pan-y";

    var grid = shelf.querySelector(":scope > .music-v7-album-grid-final");
    if(!grid){
      grid = document.createElement("div");
      grid.className = "music-v7-album-grid-final";
      var albums = Array.prototype.slice.call(shelf.querySelectorAll(":scope > .music-v7-album-art"));
      if(albums.length){
        shelf.appendChild(grid);
        albums.forEach(function(a){ grid.appendChild(a); });
      }
    }
  }

  function boot(){
    // touchstart / pointerdown では止めない。
    // iPhoneの縦スワイプをブラウザへ渡し、短いタップが click になった時だけ開く。
    document.addEventListener("click", guard, {capture:true, passive:false});
    layout();
    setInterval(layout, 120);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
