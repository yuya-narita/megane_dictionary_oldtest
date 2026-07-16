/* 80_conf_leave_core_bridge.js
   Fix: 会議ライブラリから辞書/カードへ戻る時に、会議のcore状態が残って戻りきれない問題を止める。
   00_core.js の MEGANE_FORCE_CORE_MODE を使って、本物の appMode を辞書/カードへ戻す。
*/
(function(){
  'use strict';
  function q(id){ return document.getElementById(id); }
  function inConf(){
    return document.body.classList.contains('mode-manga') ||
           document.body.classList.contains('mode-conf') ||
           document.body.classList.contains('manga-list-state') ||
           document.body.classList.contains('manga-reader-state') ||
           document.body.classList.contains('conf-player-state');
  }
  function hideEl(id){
    var el=q(id); if(!el) return;
    try{ el.hidden=true; }catch(e){}
    try{ el.style.display='none'; }catch(e){}
    try{ el.style.pointerEvents='none'; }catch(e){}
  }
  function showDictionaryCard(){
    ['card','content','dictionaryView'].forEach(function(id){
      var el=q(id); if(!el) return;
      try{ el.hidden=false; }catch(e){}
      try{ el.style.display=''; }catch(e){}
      try{ el.style.visibility=''; }catch(e){}
      try{ el.style.opacity=''; }catch(e){}
      try{ el.style.pointerEvents=''; }catch(e){}
      try{ el.style.transform=''; }catch(e){}
    });
  }
  function cleanConfClasses(){
    document.body.classList.remove(
      'mode-manga','mode-conf','manga-list-state','manga-reader-state','manga-choice-state',
      'conf-player-state','reader-page','reader-webtoon','manga-page-state','manga-webtoon-state'
    );
  }
  function syncPublicMode(mode){
    try { window.appMode = mode; } catch(e){}
    try { window.mangaState = 'list'; } catch(e){}
    try { window.mangaReadMode = 'page'; } catch(e){}
  }

  function activeTab(mode){
    ['dictionaryMode','cardMode','musicMode','mangaMode'].forEach(function(id){
      var b=q(id); if(!b) return;
      b.classList.remove('active');
      b.setAttribute('aria-pressed','false');
    });
    var id = mode === 'cards' ? 'cardMode' : 'dictionaryMode';
    var b=q(id); if(b){ b.classList.add('active'); b.setAttribute('aria-pressed','true'); }
  }
  function leaveTo(mode){
    syncPublicMode(mode);
    // 本物の core appMode を先に更新する。ここが抜けると78番の監視が会議へ戻してくる。
    try{
      if(typeof window.MEGANE_FORCE_CORE_MODE === 'function') window.MEGANE_FORCE_CORE_MODE(mode);
      else if(typeof setMode === 'function') setMode(mode);
    }catch(e){}

    function apply(){
      syncPublicMode(mode);
      cleanConfClasses();
      document.body.classList.toggle('mode-dictionary', mode === 'dictionary');
      document.body.classList.toggle('mode-cards', mode === 'cards');
      document.body.classList.remove('mode-content');
      hideEl('mangaListLayer');
      hideEl('mangaChoiceLayer');
      hideEl('confPlayerLayer');
      hideEl('mangaOpenFullscreenButton');
      hideEl('webtoonView');
      hideEl('mangaView');
      showDictionaryCard();
      activeTab(mode);
    }
    apply();
    setTimeout(apply, 0);
    setTimeout(apply, 60);
    setTimeout(apply, 180);
    setTimeout(apply, 520);
  }

  function onTab(e){
    var tab=e.target && e.target.closest ? e.target.closest('#dictionaryMode,#cardMode') : null;
    if(!tab || !inConf()) return;
    var mode = tab.id === 'cardMode' ? 'cards' : 'dictionary';
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    leaveTo(mode);
    return false;
  }
  window.addEventListener('pointerdown', onTab, true);
  window.addEventListener('touchstart', onTab, true);
  window.addEventListener('click', onTab, true);
})();
