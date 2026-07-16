/* 79_conf_leave_hard_fix.js
   HARD FIX:
   会議ライブラリ/再生画面から辞書・カード・音楽へ移動した時に、
   会議(mode-manga/mode-conf)の状態・表示・activeタブが残留する問題を止める。
   ※会議以外の中身は変更しない。タブ遷移時の掃除だけ。
*/
(function(){
  'use strict';
  var leavingConfUntil = 0;
  function q(id){ return document.getElementById(id); }
  function isLeaving(){ return Date.now() < leavingConfUntil; }

  function syncPublicMode(mode){
    try { window.appMode = mode === 'cards' ? 'cards' : mode === 'music' ? 'music' : 'dictionary'; } catch(e){}
    try { window.mangaState = 'list'; } catch(e){}
    try { window.mangaReadMode = 'page'; } catch(e){}
  }

  function hideConfLayers(){
    var ids = [
      'mangaListLayer','mangaChoiceLayer','confPlayerLayer',
      'mangaOpenFullscreenButton','webtoonView','mangaView'
    ];
    ids.forEach(function(id){
      var el = q(id);
      if(!el) return;
      try{ el.hidden = true; }catch(e){}
      try{ el.style.display = 'none'; }catch(e){}
      try{ el.style.pointerEvents = 'none'; }catch(e){}
    });
  }

  function showMainCard(){
    var card = q('card');
    var content = q('content');
    if(card){
      card.hidden = false;
      card.style.display = '';
      card.style.visibility = '';
      card.style.opacity = '';
      card.style.pointerEvents = '';
    }
    if(content){
      content.hidden = false;
      content.style.display = '';
      content.style.visibility = '';
      content.style.opacity = '';
      content.style.pointerEvents = '';
      content.style.transform = '';
    }
  }

  function removeConfClasses(){
    document.body.classList.remove(
      'mode-manga','mode-conf','manga-list-state','manga-reader-state','manga-choice-state',
      'conf-player-state','reader-page','reader-webtoon','manga-page-state','manga-webtoon-state'
    );
  }

  function setActiveTab(mode){
    ['dictionaryMode','cardMode','musicMode','mangaMode'].forEach(function(id){
      var b = q(id);
      if(!b) return;
      b.classList.remove('active');
      b.setAttribute('aria-pressed','false');
    });
    var id = mode === 'cards' ? 'cardMode' : mode === 'music' ? 'musicMode' : 'dictionaryMode';
    var active = q(id);
    if(active){ active.classList.add('active'); active.setAttribute('aria-pressed','true'); }
  }

  function forceCoreMode(mode){
    // core の let appMode を更新するには setMode 経由が一番安全。
    try{
      if(typeof window.setMode === 'function'){
        window.setMode(mode === 'cards' ? 'cards' : 'dictionary');
        return;
      }
    }catch(e){}
    try{
      if(typeof setMode === 'function'){
        setMode(mode === 'cards' ? 'cards' : 'dictionary');
        return;
      }
    }catch(e){}
    try{ window.appMode = mode === 'cards' ? 'cards' : 'dictionary'; }catch(e){}
    try{ if(typeof render === 'function') render('flash'); }catch(e){}
  }

  function leaveConfTo(mode){
    leavingConfUntil = Date.now() + 1600;
    syncPublicMode(mode);

    // 先にcore modeを戻す。これをしないと78番の監視が「まだ会議」と判断して戻してくる。
    if(mode === 'dictionary' || mode === 'cards') forceCoreMode(mode);

    // 表示レイヤー掃除は複数回。iOSの遅延click/既存interval対策。
    function apply(){
      syncPublicMode(mode);
      removeConfClasses();
      if(mode === 'dictionary') document.body.classList.add('mode-dictionary');
      if(mode === 'cards') document.body.classList.add('mode-cards');
      hideConfLayers();
      showMainCard();
      setActiveTab(mode);
      if(mode === 'music'){
        // 音楽タブは既存MUSIC処理に任せる。ただし会議残留だけ消す。
        var music = q('musicMode');
        if(music) music.classList.add('active');
      }
    }
    apply();
    setTimeout(apply,0);
    setTimeout(apply,80);
    setTimeout(apply,240);
    setTimeout(apply,700);
  }



  function prepareMusicFromConf(){
    // AE FIX: 会議→音楽はMUSIC本来のクリック処理へ渡す。
    // ここでは会議の残留だけ掃除し、音楽画面の生成は64/52の既存処理に任せる。
    leavingConfUntil = Date.now() + 900;
    try { window.appMode = 'music'; } catch(e){}
    try { window.mangaState = 'list'; window.mangaReadMode = 'page'; } catch(e){}
    try{
      // core側は music を持てないので、manga だけ解除しておく。
      if(typeof window.MEGANE_FORCE_CORE_MODE === 'function') window.MEGANE_FORCE_CORE_MODE('dictionary');
    }catch(e){}

    function clean(){
      removeConfClasses();
      hideConfLayers();
      // MUSICの既存showMusicがこの後に必ず表示を作るため、ここではmusicViewを触りすぎない。
      document.body.classList.remove('mode-dictionary','mode-cards','mode-manga','mode-conf');
      document.body.classList.add('mode-music','music-v7');
      setActiveTab('music');
    }
    clean();
    setTimeout(clean,0);
    setTimeout(clean,80);
    setTimeout(clean,240);
  }

  function onTab(e){
    var tab = e.target && e.target.closest ? e.target.closest('#dictionaryMode,#cardMode,#musicMode') : null;
    if(!tab) return;
    if(!(document.body.classList.contains('mode-manga') || document.body.classList.contains('mode-conf') || document.body.classList.contains('manga-list-state') || document.body.classList.contains('conf-player-state'))) return;

    var mode = tab.id === 'cardMode' ? 'cards' : tab.id === 'musicMode' ? 'music' : 'dictionary';

    // 辞書/カードはここで確定遷移して、古い会議onclick/intervalを止める。
    if(mode !== 'music'){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      leaveConfTo(mode);
      return false;
    }

    // AE FIX: 音楽は既存のMUSICタブ処理に任せる。
    // ここで止めるとmusic側のonclick/addEventListenerが走らず、挙動が崩れる。
    prepareMusicFromConf();
    return true;
  }

  function guardConfIntervalResidue(){
    if(!isLeaving()) return;
    // 78番などが遅れて会議を再点灯させた場合、即座に戻す。
    var dictActive = q('dictionaryMode') && q('dictionaryMode').classList.contains('active');
    var cardActive = q('cardMode') && q('cardMode').classList.contains('active');
    var musicActive = q('musicMode') && q('musicMode').classList.contains('active');
    var mode = cardActive ? 'cards' : musicActive ? 'music' : 'dictionary';
    syncPublicMode(mode);
    removeConfClasses();
    hideConfLayers();
    if(mode !== 'music') showMainCard();
    setActiveTab(mode);
  }

  function boot(){
    window.addEventListener('pointerdown', onTab, true);
    window.addEventListener('click', onTab, true);
    setInterval(guardConfIntervalResidue, 120);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
