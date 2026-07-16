/* 74_session_bugfix_20260611_l.js
   L fix:
   - Favorite dictionary list returns to the intended gesture model:
     normal tap = no open, long press = open exact word, left swipe = delete.
   - Removes the K/J tap-to-open capture behavior that caused accidental dictionary jumps.
   - Parses old keys like dict:<glassId>:<word> so long-press opens the exact word + glasses pair.
*/
(function(){
  'use strict';

  var FAV_KEY = 'meganeFavoritesV65';
  var LONG_PRESS_MS = 680;
  var MOVE_CANCEL_PX = 10;
  var SWIPE_DELETE_RATIO = 0.42;
  var lastOpenAt = 0;

  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }
  function norm(s){ return String(s == null ? '' : s).normalize('NFKC').trim(); }
  function stop(e){
    if(!e) return;
    try{ if(e.cancelable !== false) e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function load(){
    try{ return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') || []; }
    catch(_){ return []; }
  }
  function save(list){
    try{ localStorage.setItem(FAV_KEY, JSON.stringify(list || [])); }catch(_){ }
  }
  function dictFavs(){ return load().filter(function(f){ return f && f.type === 'dict'; }); }
  function parseKey(item){
    var key = String(item && item.key || '');
    if(key.indexOf('dict:') !== 0) return { glassId:'', word:'' };
    var rest = key.slice(5);
    var p = rest.indexOf(':');
    if(p < 0) return { glassId:rest, word:'' };
    return { glassId:rest.slice(0,p), word:rest.slice(p+1) };
  }
  function itemFromEl(el){
    var key = el && el.getAttribute('data-key') || '';
    var item = dictFavs().find(function(f){ return String(f.key) === String(key); });
    if(item) return item;
    return { key:key, type:'dict', title: el ? (el.getAttribute('data-word') || '') : '' };
  }
  function findWordIndex(item){
    var parsed = parseKey(item || {});
    var targets = [item && item.word, item && item.wordId, item && item.title, parsed.word]
      .map(norm).filter(Boolean);
    try{
      if(typeof data === 'undefined' || !data.words) return -1;
      for(var i=0;i<data.words.length;i++){
        var w = data.words[i] || {};
        var candidates = [w.word, w.id, w.title, w.name].map(norm);
        for(var t=0;t<targets.length;t++) if(candidates.indexOf(targets[t]) >= 0) return i;
      }
    }catch(_){ }
    return -1;
  }
  function findGlassIndex(item){
    var parsed = parseKey(item || {});
    var targets = [item && item.glassId, parsed.glassId, item && item.glassName, item && item.meta]
      .map(norm).filter(Boolean);
    try{
      if(typeof data === 'undefined' || !data.glasses) return -1;
      for(var i=0;i<data.glasses.length;i++){
        var g = data.glasses[i] || {};
        var candidates = [g.id, g.name, g.label, g.character].map(norm).filter(Boolean);
        for(var t=0;t<targets.length;t++){
          if(candidates.indexOf(targets[t]) >= 0) return i;
          for(var c=0;c<candidates.length;c++){
            if(candidates[c] && targets[t].indexOf(candidates[c]) >= 0) return i;
          }
        }
      }
    }catch(_){ }
    return -1;
  }
  function closeDialog(){
    var d = $('favoriteDialog');
    try{ if(d && d.open && typeof d.close === 'function') d.close(); }
    catch(_){ if(d) d.removeAttribute('open'); }
  }
  function openExact(item){
    var now = Date.now();
    if(now - lastOpenAt < 420) return;
    lastOpenAt = now;
    if(!item) return;
    var wi = findWordIndex(item);
    var gi = findGlassIndex(item);
    try{
      if(wi >= 0) wordIndex = wi;
      if(gi >= 0) glassIndex = gi;
      appMode = 'dictionary';
      document.body.classList.remove('mode-cards','mode-music','mode-conf','mode-manga','mode-content');
      document.body.classList.add('mode-dictionary');
      document.body.setAttribute('data-mode','dictionary');
      if(typeof render === 'function') render('flash');
      if(typeof updateFavoriteToggle === 'function') setTimeout(updateFavoriteToggle, 60);
    }catch(_){ }
    closeDialog();
  }
  function removeItem(item){
    if(!item) return;
    save(load().filter(function(f){ return String(f.key) !== String(item.key); }));
    try{ if(typeof updateFavoriteToggle === 'function') updateFavoriteToggle(); }catch(_){ }
  }
  function resetEl(el){
    if(!el) return;
    el.classList.remove('swiping-left','swiping-right','longpress-charging','longpress-ready');
    el.style.transition = 'transform .28s cubic-bezier(.2,1.25,.35,1), opacity .22s ease';
    el.style.transform = 'translate3d(0,0,0)';
    el.style.opacity = '1';
  }
  function bindGesture(el, item){
    if(!el || el.dataset.lGestureBound) return;
    el.dataset.lGestureBound = '1';
    var sx=0, sy=0, dx=0, dy=0, pid=null, down=false, moved=false, opened=false, timer=null;

    function clearTimer(){
      if(timer) clearTimeout(timer);
      timer = null;
      el.classList.remove('longpress-charging');
    }
    function start(e){
      stop(e);
      var p = e;
      sx = p.clientX || 0; sy = p.clientY || 0; dx=0; dy=0;
      pid = e.pointerId || null; down=true; moved=false; opened=false;
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'translate3d(0,0,0)';
      el.classList.remove('swiping-left','swiping-right','longpress-ready');
      el.classList.add('longpress-charging');
      try{ if(e.pointerId != null) el.setPointerCapture(e.pointerId); }catch(_){ }
      timer = setTimeout(function(){
        if(!down || moved) return;
        opened = true;
        el.classList.remove('longpress-charging');
        el.classList.add('longpress-ready');
        try{ if(navigator.vibrate) navigator.vibrate(18); }catch(_){ }
        openExact(itemFromEl(el));
      }, LONG_PRESS_MS);
    }
    function move(e){
      if(!down || opened) return;
      if(pid !== null && e.pointerId !== pid) return;
      dx = (e.clientX || 0) - sx;
      dy = (e.clientY || 0) - sy;
      if(!moved){
        if(Math.abs(dx) < MOVE_CANCEL_PX && Math.abs(dy) < MOVE_CANCEL_PX) return;
        if(Math.abs(dy) > Math.abs(dx) * 1.15){
          clearTimer();
          return;
        }
        moved = true;
        clearTimer();
      }
      stop(e);
      var visualX = dx > 0 ? dx * 0.18 : dx;
      el.style.transition = 'none';
      el.style.transform = 'translate3d(' + visualX + 'px,0,0)';
      el.classList.toggle('swiping-left', visualX < 0);
      el.classList.toggle('swiping-right', false);
    }
    function end(e){
      if(!down) return;
      stop(e);
      if(pid !== null && e && e.pointerId !== pid) return;
      try{ if(e && e.pointerId != null) el.releasePointerCapture(e.pointerId); }catch(_){ }
      down=false; clearTimer();
      if(opened){ resetEl(el); return; }
      var threshold = Math.max(96, window.innerWidth * SWIPE_DELETE_RATIO);
      if(moved && dx < -threshold){
        el.style.transition = 'transform .20s ease, opacity .20s ease';
        el.style.transform = 'translate3d(-115%,0,0)';
        el.style.opacity = '0';
        setTimeout(function(){ removeItem(itemFromEl(el)); renderFavoriteWordsL(); }, 210);
      }else{
        // short tap does nothing; it must not jump to dictionary.
        resetEl(el);
      }
      dx=0; dy=0; pid=null; moved=false; opened=false;
    }
    el.addEventListener('pointerdown', start, {capture:true, passive:false});
    el.addEventListener('pointermove', move, {capture:true, passive:false});
    el.addEventListener('pointerup', end, {capture:true, passive:false});
    el.addEventListener('pointercancel', end, {capture:true, passive:false});
    ['click','touchend','mouseup'].forEach(function(type){
      el.addEventListener(type, function(e){ stop(e); return false; }, {capture:true, passive:false});
    });
  }

  function renderFavoriteWordsL(){
    var listEl = $('favoriteList');
    if(!listEl) return;
    var list = dictFavs();
    if(!list.length){
      listEl.innerHTML = '<div class="favorite-empty">まだお気に入りはありません</div>';
      return;
    }
    listEl.innerHTML = list.map(function(item){
      var parsed = parseKey(item);
      var word = item.word || item.title || parsed.word || 'Untitled';
      var glass = item.glassName || parsed.glassId || '';
      return '<div class="favorite-item favorite-item-l" role="button" tabindex="0" data-key="'+esc(item.key)+'" data-word="'+esc(word)+'" data-glass="'+esc(item.glassId || parsed.glassId)+'">'
        + '<span class="favorite-item-title">'+esc(word)+'</span>'
        + '<span class="favorite-item-meta">辞書｜'+esc(item.meta || glass)+'</span>'
        + '<span class="favorite-item-hint">長押しで開く / 左スワイプで削除</span>'
        + '</div>';
    }).join('');
    Array.prototype.forEach.call(listEl.querySelectorAll('.favorite-item-l'), function(el){ bindGesture(el, itemFromEl(el)); });
  }

  function blockOldTapOpen(e){
    var t = e.target;
    if(!t || !t.closest) return;
    var el = t.closest('#favoriteList .favorite-item');
    if(!el) return;
    // This capture blocker prevents stacked J/K tap handlers from opening on a light touch.
    // Long-press opening is handled by bindGesture's timer above.
    if(e.type === 'click' || e.type === 'touchend' || e.type === 'mouseup') stop(e);
  }

  function boot(){
    window.renderDictFavoriteList = renderFavoriteWordsL;
    document.addEventListener('click', blockOldTapOpen, true);
    document.addEventListener('touchend', blockOldTapOpen, {capture:true, passive:false});
    document.addEventListener('mouseup', blockOldTapOpen, true);
    setInterval(function(){
      window.renderDictFavoriteList = renderFavoriteWordsL;
      var d = $('favoriteDialog');
      if(d && d.open) renderFavoriteWordsL();
    }, 500);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
