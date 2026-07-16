/* 75_favorite_close_tap_leak_fix.js
   Based on N version.
   Fix only: closing the dictionary favorite dialog from MUSIC must not leak the same tap
   to the album/favorite-songs area underneath.
*/
(function(){
  'use strict';

  var suppressUntil = 0;
  var lastCloseAt = 0;

  function q(id){ return document.getElementById(id); }
  function stop(e){
    if(!e) return;
    try{ if(e.cancelable !== false) e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function isInsideFavoriteDialog(target){
    var d = q('favoriteDialog');
    return !!(d && target && d.contains && d.contains(target));
  }
  function isCloseButton(target){
    return !!(target && target.closest && target.closest('#favoriteDialogClose'));
  }
  function closeFavoriteDialog(e){
    stop(e);
    var now = Date.now();
    if(now - lastCloseAt < 180) return false;
    lastCloseAt = now;

    // iOS can dispatch a synthetic click after touchend/pointerup at the same coordinates.
    // Keep blocking underlying MUSIC album/favorite-row taps for a short moment after close.
    suppressUntil = now + 850;

    var d = q('favoriteDialog');
    if(d){
      try{ if(d.open && typeof d.close === 'function') d.close(); }
      catch(_){ try{ d.removeAttribute('open'); }catch(__){} }
    }
    return false;
  }

  function bindCloseButton(){
    var btn = q('favoriteDialogClose');
    if(!btn || btn.dataset.closeLeakFixed === '1') return;
    btn.dataset.closeLeakFixed = '1';
    btn.style.touchAction = 'manipulation';
    btn.style.webkitTapHighlightColor = 'transparent';

    // Close on the earliest reliable gesture end, and eat every related event.
    ['pointerdown','touchstart','mousedown'].forEach(function(type){
      btn.addEventListener(type, function(e){ stop(e); suppressUntil = Date.now() + 850; }, {capture:true, passive:false});
    });
    ['pointerup','touchend','mouseup','click'].forEach(function(type){
      btn.addEventListener(type, closeFavoriteDialog, {capture:true, passive:false});
    });
  }

  function documentShield(e){
    var d = q('favoriteDialog');
    var now = Date.now();

    // While the dialog is open, do not allow taps outside/through the dialog to reach MUSIC.
    if(d && d.open){
      if(isCloseButton(e.target)) return; // button has its own handler
      if(!isInsideFavoriteDialog(e.target)){
        stop(e);
        return false;
      }
      return;
    }

    // After closing, swallow delayed synthetic events that otherwise open the underlying
    // favorite songs playlist or album card.
    if(now < suppressUntil){
      stop(e);
      return false;
    }
  }

  function boot(){
    bindCloseButton();
    ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click'].forEach(function(type){
      document.addEventListener(type, documentShield, {capture:true, passive:false});
    });
    setInterval(bindCloseButton, 500);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
