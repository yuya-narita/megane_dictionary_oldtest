/* 81_conf_stale_mode_guard.js
   AC FIX: 会議から辞書/カードへ戻った後、window.appMode の古い "manga" が残って
   78番の会議監視が会議タブをチラつかせる問題への最終ガード。
*/
(function(){
  'use strict';
  function q(id){ return document.getElementById(id); }
  function coreMode(){ try { if(typeof window.MEGANE_GET_CORE_MODE === 'function') return window.MEGANE_GET_CORE_MODE(); } catch(e){} return ''; }
  function visibleNonConfMode(){
    var b=document.body;
    if(b.classList.contains('mode-dictionary')) return 'dictionary';
    if(b.classList.contains('mode-cards')) return 'cards';
    if(b.classList.contains('mode-music')) return 'music';
    var dict=q('dictionaryMode'), card=q('cardMode'), music=q('musicMode');
    if(dict && dict.classList.contains('active')) return 'dictionary';
    if(card && card.classList.contains('active')) return 'cards';
    if(music && music.classList.contains('active')) return 'music';
    return '';
  }
  function forceTab(mode){
    ['dictionaryMode','cardMode','musicMode','mangaMode'].forEach(function(id){
      var el=q(id); if(!el) return;
      var on = (mode==='dictionary' && id==='dictionaryMode') || (mode==='cards' && id==='cardMode') || (mode==='music' && id==='musicMode');
      el.classList.toggle('active', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function hideConfLayers(){
    ['mangaListLayer','mangaChoiceLayer','confPlayerLayer','mangaOpenFullscreenButton','webtoonView','mangaView'].forEach(function(id){
      var el=q(id); if(!el) return;
      try{ el.hidden=true; }catch(e){}
      try{ el.style.display='none'; }catch(e){}
      try{ el.style.pointerEvents='none'; }catch(e){}
    });
  }
  function showMain(){
    ['card','content'].forEach(function(id){
      var el=q(id); if(!el) return;
      try{ el.hidden=false; }catch(e){}
      try{ el.style.display=''; }catch(e){}
      try{ el.style.visibility=''; }catch(e){}
      try{ el.style.opacity=''; }catch(e){}
      try{ el.style.pointerEvents=''; }catch(e){}
    });
  }
  function cleanIfNeeded(){
    var cm=coreMode();
    var non=visibleNonConfMode();
    if(cm === 'manga') return;
    if(!non) return;
    try{ window.appMode = non; window.mangaState='list'; window.mangaReadMode='page'; }catch(e){}
    document.body.classList.remove('mode-manga','mode-conf','manga-list-state','manga-reader-state','manga-choice-state','conf-player-state','reader-page','reader-webtoon','manga-page-state','manga-webtoon-state');
    if(non==='dictionary') document.body.classList.add('mode-dictionary');
    if(non==='cards') document.body.classList.add('mode-cards');
    hideConfLayers();
    if(non!=='music') showMain();
    forceTab(non);
  }
  setInterval(cleanIfNeeded, 160);
})();
