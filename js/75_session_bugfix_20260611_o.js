/* 75_session_bugfix_20260611_o.js
   O fix:
   - When dictionary favorite overlay is opened from MUSIC album shelf via bottom ★,
     closing the overlay must return to the album shelf, not the last album/player screen.
   - Stops close-button touch/click from leaking to MUSIC controls underneath.
*/
(function(){
  'use strict';
  var openedFromMusicAlbums = false;
  var closeLockUntil = 0;

  function $(id){ return document.getElementById(id); }
  function isMusicMode(){
    try{ return document.body.classList.contains('mode-music') || document.body.getAttribute('data-mode') === 'music'; }
    catch(_){ return false; }
  }
  function isMusicAlbums(){
    var v = $('musicView');
    return !!(v && v.classList && v.classList.contains('music-v7-albums'));
  }
  function stop(e){
    if(!e) return;
    try{ if(e.cancelable !== false) e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function markIfBottomStar(e){
    var t = e && e.target;
    if(!t || !t.closest) return;
    var b = t.closest('#randomWord,#randomWordFixed');
    if(!b) return;
    if(isMusicMode() && isMusicAlbums()){
      openedFromMusicAlbums = true;
      try{ window.__MEGANE_RETURN_MUSIC_ALBUMS_AFTER_FAV = true; }catch(_){ }
    }
  }
  function returnMusicAlbumsSoon(){
    if(!openedFromMusicAlbums && !window.__MEGANE_RETURN_MUSIC_ALBUMS_AFTER_FAV) return;
    openedFromMusicAlbums = false;
    try{ window.__MEGANE_RETURN_MUSIC_ALBUMS_AFTER_FAV = false; }catch(_){ }
    closeLockUntil = Date.now() + 700;
    setTimeout(function(){
      try{
        if(isMusicMode() && typeof window.MEGANE_MUSIC_V7_OPEN_ALBUMS === 'function'){
          window.MEGANE_MUSIC_V7_OPEN_ALBUMS();
        }
      }catch(_){ }
    }, 40);
  }
  function closeFavoriteDialog(e){
    var t = e && e.target;
    if(!t || !t.closest) return;
    var close = t.closest('#favoriteDialogClose, [data-favorite-close]');
    if(!close) return;
    stop(e);
    var d = $('favoriteDialog');
    try{ if(d && d.open && typeof d.close === 'function') d.close(); }
    catch(_){ if(d) d.removeAttribute('open'); }
    returnMusicAlbumsSoon();
    return false;
  }
  function blockMusicLeak(e){
    if(Date.now() > closeLockUntil) return;
    var t = e && e.target;
    if(!t || !t.closest) return;
    if(t.closest('#musicView, #musicList, #musicV7FavAlbum, .music-v7-album-art, .music-v7-favline')){
      stop(e);
      return false;
    }
  }
  function bindDialogCloseEvent(){
    var d = $('favoriteDialog');
    if(d && !d.dataset.oReturnBound){
      d.dataset.oReturnBound = '1';
      d.addEventListener('close', returnMusicAlbumsSoon, true);
      d.addEventListener('cancel', returnMusicAlbumsSoon, true);
    }
  }
  function boot(){
    ['pointerdown','touchstart','mousedown','click'].forEach(function(type){
      window.addEventListener(type, markIfBottomStar, {capture:true, passive:true});
    });
    ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click'].forEach(function(type){
      window.addEventListener(type, closeFavoriteDialog, {capture:true, passive:false});
      window.addEventListener(type, blockMusicLeak, {capture:true, passive:false});
    });
    bindDialogCloseEvent();
    setInterval(bindDialogCloseEvent, 600);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
