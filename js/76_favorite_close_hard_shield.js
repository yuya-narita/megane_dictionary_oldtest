/* 76_favorite_close_hard_shield.js
   Hard fix for iOS tap-through when closing dictionary favorite dialog.
   Base: N/P line. Purpose: only prevent the close tap from reaching MUSIC favorite playlist/album area.
*/
(function(){
  'use strict';

  var suppressUntil = 0;
  var shieldEl = null;
  var closeLockUntil = 0;

  function now(){ return Date.now(); }
  function q(id){ return document.getElementById(id); }
  function stop(e){
    if(!e) return;
    try{ if(e.cancelable !== false) e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function isCloseTarget(t){
    return !!(t && t.closest && t.closest('#favoriteDialogClose'));
  }
  function isFavDialogOpen(){
    var d = q('favoriteDialog');
    return !!(d && (d.open || d.hasAttribute('open')));
  }
  function hardShield(ms){
    suppressUntil = Math.max(suppressUntil, now() + (ms || 1200));
    window.__favoriteCloseSuppressUntil = suppressUntil;

    if(!shieldEl){
      shieldEl = document.createElement('div');
      shieldEl.id = 'favoriteCloseTapShield';
      shieldEl.setAttribute('aria-hidden','true');
      shieldEl.style.cssText = [
        'position:fixed','inset:0','z-index:2147483647',
        'background:transparent','pointer-events:auto','touch-action:none'
      ].join(';');
      ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click'].forEach(function(type){
        shieldEl.addEventListener(type, function(e){ stop(e); }, {capture:true, passive:false});
      });
    }
    if(!shieldEl.parentNode) document.documentElement.appendChild(shieldEl);

    setTimeout(function(){
      if(now() >= suppressUntil){
        try{ if(shieldEl && shieldEl.parentNode) shieldEl.parentNode.removeChild(shieldEl); }catch(_){ }
      }
    }, ms || 1200);
  }
  function closeDialogOnly(){
    var d = q('favoriteDialog');
    if(!d) return;
    try{
      if(typeof d.close === 'function' && (d.open || d.hasAttribute('open'))) d.close();
      else d.removeAttribute('open');
    }catch(_){
      try{ d.removeAttribute('open'); }catch(__){}
    }
  }

  function closeFromX(e){
    stop(e);
    var t = now();
    if(t < closeLockUntil) return false;
    closeLockUntil = t + 350;

    hardShield(1300);
    closeDialogOnly();
    return false;
  }

  // Earliest possible interception: window capture runs before document/target handlers.
  function windowGuard(e){
    var t = now();

    if(t < suppressUntil){
      stop(e);
      return false;
    }

    if(isCloseTarget(e.target)){
      return closeFromX(e);
    }

    // While dialog is open, do not allow outside taps to pass through to MUSIC.
    if(isFavDialogOpen()){
      var d = q('favoriteDialog');
      if(d && e.target && !d.contains(e.target)){
        stop(e);
        return false;
      }
    }
  }

  function bindCloseDirect(){
    var btn = q('favoriteDialogClose');
    if(!btn) return;
    btn.style.touchAction = 'none';
    btn.style.webkitTapHighlightColor = 'transparent';
    if(btn.__v76HardClose) return;
    btn.__v76HardClose = true;
    ['pointerdown','touchstart','mousedown','pointerup','touchend','mouseup','click'].forEach(function(type){
      btn.addEventListener(type, closeFromX, {capture:true, passive:false});
    });
  }

  // Extra guard: if a delayed event still reaches MUSIC favorite row/card, kill it.
  function musicGuard(e){
    if(now() >= suppressUntil) return;
    var t = e.target;
    if(t && t.closest && t.closest('#musicV7FavAlbum,.music-v7-favline,.music-v7-fav-card,.music-v7-album-grid,.music-v7-album-art,[data-album]')){
      stop(e);
      return false;
    }
  }

  function boot(){
    ['pointerdown','touchstart','mousedown','pointerup','touchend','mouseup','click'].forEach(function(type){
      window.addEventListener(type, windowGuard, {capture:true, passive:false});
      document.addEventListener(type, musicGuard, {capture:true, passive:false});
    });
    bindCloseDirect();
    setInterval(bindCloseDirect, 250);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
