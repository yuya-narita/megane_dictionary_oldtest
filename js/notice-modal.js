
(function(){
  const notice=window.MEGANE_NOTICE||{};
  const tutorial=window.MEGANE_TUTORIAL_NOTICE||{};
  const NOTICE_KEY='megane_notice_seen_version_v1';
  const TUTORIAL_KEY='megane_tutorial_seen_v1';
  let audio=null;
  let playing=false;

  function version(){return String(notice.version||'default');}
  function noticeSeen(){try{return localStorage.getItem(NOTICE_KEY)===version();}catch(e){return false;}}
  function tutorialSeen(){try{return localStorage.getItem(TUTORIAL_KEY)==='1';}catch(e){return false;}}
  function markNotice(){try{localStorage.setItem(NOTICE_KEY,version());}catch(e){}}
  function markTutorial(){try{localStorage.setItem(TUTORIAL_KEY,'1');}catch(e){}}

  function stopAudio(){
    try{if(audio){audio.pause();audio.currentTime=0;}}catch(e){}
    playing=false;
  }

  function play(src,btn){
    if(!src)return;
    try{
      if(!audio || audio.getAttribute('data-src')!==src){
        audio=new Audio(src);
        audio.setAttribute('data-src',src);
        audio.preload='auto';
      }
      if(playing){audio.pause();audio.currentTime=0;}
      playing=true;
      if(btn){btn.disabled=true;btn.textContent='再生中';}
      audio.currentTime=0;
      audio.play().catch(function(){
        playing=false;
        if(btn){btn.disabled=false;btn.textContent='▶ 音声';}
      });
      audio.onended=function(){
        playing=false;
        if(btn){btn.disabled=false;btn.textContent='▶ 音声';}
      };
    }catch(e){
      playing=false;
      if(btn){btn.disabled=false;btn.textContent='▶ 音声';}
    }
  }

  function removeOld(){
    const old=document.getElementById('noticeModalBg');
    if(old)old.remove();
    document.body.classList.remove('notice-open','modal-open');
  }

  function render(cfg,opts){
    opts=opts||{};
    removeOld();
    const d=document.createElement('div');
    d.id='noticeModalBg';
    const v=opts.versionText?'<div class="noticeVersion">'+opts.versionText+'</div>':'';
    d.innerHTML='<div id="noticeModalCard"><div class="ttl">'+(cfg.title||'お知らせ')+'</div><div class="txt">'+(cfg.text||'').replace(/\n/g,'<br>')+'</div>'+v+'<div class="btns"><button id="noticePlay">▶ 音声</button><button id="noticeClose">閉じる</button></div></div>';
    document.body.classList.add('notice-open','modal-open');
    document.body.appendChild(d);
    document.getElementById('noticeClose').onclick=function(){
      stopAudio();
      if(opts.onClose)opts.onClose();
      d.remove();
      document.body.classList.remove('notice-open','modal-open');
    };
    document.getElementById('noticePlay').onclick=function(){play(cfg.audio,this);};
  }

  function showVersion(){
    if(noticeSeen())return;
    render(notice,{versionText:version(),onClose:markNotice});
  }

  function showTutorialThenNotice(){
    if(tutorialSeen()){showVersion();return;}
    render(tutorial,{onClose:function(){markTutorial();setTimeout(showVersion,180);}});
  }

  window.resetMeganeNotice=function(){try{localStorage.removeItem(NOTICE_KEY);}catch(e){}};
  window.resetMeganeTutorial=function(){try{localStorage.removeItem(TUTORIAL_KEY);}catch(e){}};
  window.showMeganeNotice=showVersion;
  window.showMeganeTutorial=showTutorialThenNotice;

  window.addEventListener('load',function(){setTimeout(showTutorialThenNotice,400);});
})();
