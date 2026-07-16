/* 82_conf_blank_recovery.js
   AF FIX: 会議モードの中央コンテンツが空になる症状を復旧する最終ガード。
   - 会議タブ押下は必ずライブラリを表示
   - ライブラリ項目押下は確認画面なしで再生画面へ
   - 会議状態で中央が空になったら、直前の会議ビューを復元
   - 辞書/カード/音楽へ移動中は復元しない
*/
(function(){
  'use strict';
  var leaveUntil = 0;
  var desiredView = '';
  var desiredIndex = 0;
  var rendering = false;

  function q(id){ return document.getElementById(id); }
  function stories(){ try { return Array.isArray(window.mangaStories) ? window.mangaStories : mangaStories; } catch(e){ return []; } }
  function isLeaving(){ return Date.now() < leaveUntil; }
  function coreMode(){ try { if(typeof window.MEGANE_GET_CORE_MODE === 'function') return window.MEGANE_GET_CORE_MODE(); } catch(e){} try { return appMode || ''; } catch(e){ return ''; } }
  function confActive(){
    var b=q('mangaMode');
    return document.body.classList.contains('mode-manga') ||
           document.body.classList.contains('mode-conf') ||
           (b && b.classList.contains('active')) ||
           coreMode() === 'manga';
  }
  function visible(el){
    if(!el) return false;
    if(el.hidden) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 8;
  }
  function activateConfTab(){
    ['dictionaryMode','cardMode','musicMode','mangaMode'].forEach(function(id){
      var el=q(id); if(!el) return;
      var on = id === 'mangaMode';
      el.classList.toggle('active', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function setCoreManga(state){
    try { if(typeof appMode !== 'undefined') appMode = 'manga'; } catch(e){}
    try { if(typeof mangaState !== 'undefined') mangaState = state || 'list'; } catch(e){}
    try { window.appMode = 'manga'; window.mangaState = state || 'list'; } catch(e){}
    try {
      if(typeof window.MEGANE_FORCE_CORE_MODE === 'function') window.MEGANE_FORCE_CORE_MODE('manga');
      else if(typeof setMode === 'function') setMode('manga');
      else if(typeof render === 'function') render('flash');
    } catch(e){}
  }
  function showLayer(id, on){
    var el=q(id); if(!el) return;
    try { el.hidden = !on; } catch(e){}
    try { el.style.display = on ? '' : 'none'; } catch(e){}
    try { el.style.visibility = on ? '' : 'hidden'; } catch(e){}
    try { el.style.pointerEvents = on ? '' : 'none'; } catch(e){}
  }
  function applyListClasses(){
    document.body.classList.add('mode-manga','mode-conf','manga-list-state');
    document.body.classList.remove('mode-dictionary','mode-cards','mode-music','music-v7','manga-reader-state','manga-choice-state','conf-player-state','reader-page','reader-webtoon');
    activateConfTab();
    showLayer('mangaListLayer', true);
    showLayer('mangaChoiceLayer', false);
    showLayer('confPlayerLayer', false);
  }
  function applyPlayerClasses(){
    document.body.classList.add('mode-manga','mode-conf','manga-reader-state','conf-player-state','reader-page');
    document.body.classList.remove('mode-dictionary','mode-cards','mode-music','music-v7','manga-list-state','manga-choice-state','reader-webtoon');
    activateConfTab();
    showLayer('mangaListLayer', false);
    showLayer('mangaChoiceLayer', false);
    showLayer('confPlayerLayer', true);
  }
  function renderLibraryMarkup(){
    var list=q('mangaListView');
    if(!list || rendering) return;
    rendering = true;
    try{
      var data=stories();
      var viewed={}; var fav={};
      try{ viewed=JSON.parse(localStorage.getItem('megane_conf_viewed')||'{}')||{}; }catch(e){}
      try{ fav=JSON.parse(localStorage.getItem('megane_conf_favorites')||'{}')||{}; }catch(e){}
      var cur='';
      try{ cur=localStorage.getItem('megane_current_conference_id')||''; }catch(e){}
      list.classList.add('conf-podcast-library');
      list.innerHTML = '<div class="conf-library-head"><div class="conf-library-brand">Syntax Conference</div></div>' + data.map(function(story,index){
        var raw=(story && story.title) ? story.title : ('Conference '+(index+1));
        var title=String(raw).replace(/^🎙️?\s*/, '');
        var date=(story && (story.date||story.published||story.pubDate)) || '2026.06.11';
        var thumb=(story && story.thumb) ? '<img src="'+story.thumb+'" alt="">' : '';
        var id=(story && story.id) || String(index);
        var cls='';
        if(fav[id]) cls+=' conf-min-fav';
        if(viewed[id]) cls+=' conf-min-viewed';
        if(cur && id===cur) cls+=' conf-podcast-playing';
        var now=(cur && id===cur) ? '<div class="conf-podcast-now">▶ 再生中</div>' : '';
        return '<button type="button" class="manga-item conf-podcast-item'+cls+'" data-index="'+index+'">'+
          '<div class="manga-thumb conf-podcast-thumb">'+thumb+'</div>'+
          '<div class="manga-meta conf-podcast-meta">'+now+
            '<div class="manga-title conf-podcast-title"><span class="conf-title-mic">🎙️</span>'+title+'</div>'+
            '<div class="manga-desc conf-podcast-desc">Syntax Conference｜'+date+'</div>'+
          '</div></button>';
      }).join('');
    } finally { rendering=false; }
  }
  function openLibrary(){
    if(isLeaving()) return;
    desiredView='library';
    setCoreManga('list');
    applyListClasses();
    renderLibraryMarkup();
    setTimeout(function(){ if(!isLeaving()){ applyListClasses(); renderLibraryMarkup(); } }, 40);
    setTimeout(function(){ if(!isLeaving()){ applyListClasses(); renderLibraryMarkup(); } }, 180);
  }
  function openPlayer(idx){
    if(isLeaving()) return;
    var data=stories();
    idx = Math.max(0, Math.min(Number(idx)||0, data.length-1));
    desiredView='player'; desiredIndex=idx;
    try { if(typeof selectedMangaIndex !== 'undefined') selectedMangaIndex=idx; } catch(e){}
    try { if(typeof mangaStoryIndex !== 'undefined') mangaStoryIndex=idx; } catch(e){}
    try { if(typeof mangaPageIndex !== 'undefined') mangaPageIndex=0; } catch(e){}
    try { if(typeof mangaReadMode !== 'undefined') mangaReadMode='page'; } catch(e){}
    try { if(typeof mangaState !== 'undefined') mangaState='reader'; } catch(e){}
    try { window.selectedMangaIndex=idx; window.mangaStoryIndex=idx; window.mangaPageIndex=0; window.mangaReadMode='page'; window.mangaState='reader'; } catch(e){}
    try { if(data[idx] && data[idx].id) localStorage.setItem('megane_current_conference_id', data[idx].id); } catch(e){}
    setCoreManga('reader');
    applyPlayerClasses();
    try { if(typeof render === 'function') render('flash'); } catch(e){}
    applyPlayerClasses();
    setTimeout(function(){ if(!isLeaving()){ applyPlayerClasses(); try{ if(typeof render === 'function') render('flash'); }catch(e){} } }, 80);
    setTimeout(function(){ if(!isLeaving()){ applyPlayerClasses(); } }, 240);
  }

  function onConfTab(e){
    var tab=e.target && e.target.closest ? e.target.closest('#mangaMode') : null;
    if(!tab) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    leaveUntil=0;
    openLibrary();
    return false;
  }
  function onNonConfTab(e){
    var tab=e.target && e.target.closest ? e.target.closest('#dictionaryMode,#cardMode,#musicMode') : null;
    if(!tab) return;
    leaveUntil = Date.now() + 1600;
    desiredView='';
  }
  function onLibraryItem(e){
    if(isLeaving()) return;
    var item=e.target && e.target.closest ? e.target.closest('#mangaListView .manga-item') : null;
    if(!item || !confActive()) return;
    var idx=Number(item.dataset.index||0);
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    openPlayer(idx);
    return false;
  }
  function recovery(){
    if(isLeaving()) return;
    if(!confActive()) return;
    var listVisible=visible(q('mangaListLayer'));
    var playerVisible=visible(q('confPlayerLayer'));
    var core=coreMode();
    if(core !== 'manga'){
      // 会議タブが光っているのにcoreが辞書/カードのままなら空画面になるので復旧。
      if(desiredView === 'player') openPlayer(desiredIndex); else openLibrary();
      return;
    }
    if(!listVisible && !playerVisible){
      if(desiredView === 'player') openPlayer(desiredIndex); else openLibrary();
      return;
    }
    if(listVisible) { applyListClasses(); if(!q('mangaListView').children.length) renderLibraryMarkup(); }
    if(playerVisible) applyPlayerClasses();
  }
  function boot(){
    window.addEventListener('pointerdown', onNonConfTab, true);
    window.addEventListener('pointerdown', onConfTab, true);
    window.addEventListener('click', onConfTab, true);
    window.addEventListener('pointerdown', onLibraryItem, true);
    window.addEventListener('click', onLibraryItem, true);
    setInterval(recovery, 180);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
