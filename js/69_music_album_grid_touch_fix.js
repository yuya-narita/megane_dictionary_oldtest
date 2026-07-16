/* 69_music_album_grid_touch_fix.js
   Fix MUSIC album shelf hit areas on iPhone:
   - Favorite songs becomes a normal grid card, not a wide overlay row.
   - Opening favorite songs is handled on pointer/touch start and suppresses the follow-up synthetic click,
     so the album underneath (詩の処方箋) cannot receive the same tap.
*/
(function(){
  "use strict";

  var suppressUntil = 0;
  var favOpening = false;

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function stop(e){
    if(!e) return;
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function isMusic(){
    try{
      return document.body.classList.contains("mode-music") || document.body.classList.contains("music-v7");
    }catch(_){ return false; }
  }
  function isAlbumShelf(){
    var v = document.getElementById("musicView");
    return !!(v && v.classList && v.classList.contains("music-v7-albums"));
  }
  function favTargetFromEvent(e){
    var t = e && e.target;
    if(!t || !t.closest) return null;
    return t.closest("#musicV7FavAlbum,.music-v7-favline,.music-v7-fav-card");
  }
  function albumTargetFromEvent(e){
    var t = e && e.target;
    if(!t || !t.closest) return null;
    return t.closest(".music-v7-album-art,[data-album]");
  }

  function openFavoritesOnce(e){
    var fav = favTargetFromEvent(e);
    if(!fav || !isMusic() || !isAlbumShelf()) return false;
    stop(e);
    suppressUntil = now() + 900;
    if(favOpening) return true;
    favOpening = true;
    setTimeout(function(){
      try{
        if(typeof window.MEGANE_MUSIC_V7_OPEN_FAVORITES === "function"){
          window.MEGANE_MUSIC_V7_OPEN_FAVORITES();
        }
      }catch(_){ }
      setTimeout(function(){ favOpening = false; }, 350);
    }, 0);
    return true;
  }

  function guardAlbumTap(e){
    if(!isMusic()) return;
    if(now() < suppressUntil && albumTargetFromEvent(e)){
      stop(e);
      return;
    }
    if(openFavoritesOnce(e)) return;
  }

  function polishShelf(){
    var shelf = document.querySelector(".music-v7-shelf");
    if(!shelf || !isAlbumShelf()) return;
    shelf.classList.add("music-v7-shelf-grid-fixed");
    var fav = document.getElementById("musicV7FavAlbum");
    if(fav){
      fav.classList.add("music-v7-fav-card");
      fav.style.pointerEvents = "auto";
      fav.style.touchAction = "pan-y";
      fav.style.position = "relative";
      fav.style.zIndex = "5";
      if(!fav.dataset.gridTextFixed){
        fav.dataset.gridTextFixed = "1";
        // keep original children but make it card-like through CSS
      }
    }
    shelf.querySelectorAll(".music-v7-album-art").forEach(function(btn){
      btn.style.pointerEvents = "auto";
      btn.style.touchAction = "pan-y";
      btn.style.position = "relative";
      btn.style.zIndex = "1";
    });
  }

  function boot(){
    // 縦スクロールを奪わない。アルバム操作は click 確定後だけ処理する。
    document.addEventListener("click", guardAlbumTap, {capture:true, passive:false});
    polishShelf();
    setInterval(polishShelf, 120);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
