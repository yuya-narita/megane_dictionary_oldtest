/* 108_music_prohibited_stage.js
   Prohibited album stage v0.2
   - moves the Prohibited album to a centered bottom stage
   - keeps the album locked
   - uses the existing blank area intentionally
*/
(function(){
  "use strict";

  function injectStyle(){
    if(document.getElementById("musicProhibitedStageStyle")) return;
    var st=document.createElement("style");
    st.id="musicProhibitedStageStyle";
    st.textContent =
      ".music-prohibited-stage{grid-column:1/-1;width:100%;min-height:52vh;display:flex;align-items:center;justify-content:center;padding:34px 18px 90px;box-sizing:border-box}" +
      ".music-prohibited-stage-inner{width:min(250px,72vw);text-align:center;position:relative}" +
      ".music-prohibited-stage .music-v7-album-art,.music-prohibited-stage .music-v7-single-card{width:100%!important;display:block!important;position:relative!important;opacity:.88!important;transform:none!important}" +
      ".music-prohibited-stage .music-v7-album-art{background:transparent!important;border:0!important;padding:0!important}" +
      ".music-prohibited-stage .music-v7-single-card{grid-template-columns:1fr!important;background:transparent!important;border:0!important;padding:0!important}" +
      ".music-prohibited-stage .music-v7-jacket,.music-prohibited-stage .music-v7-single-thumb{width:100%!important;height:auto!important;aspect-ratio:1/1;border-radius:22px!important;overflow:hidden;background:#050507;box-shadow:0 20px 70px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.08)}" +
      ".music-prohibited-stage img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;filter:brightness(.64) saturate(.78)}" +
      ".music-prohibited-stage .music-v7-album-copy,.music-prohibited-stage .music-v7-single-copy{display:none!important}" +
      ".music-prohibited-stage strong{font-size:18px!important;letter-spacing:.06em!important;color:rgba(255,255,255,.9)!important}" +
      ".music-prohibited-stage span{font-size:12px!important;color:rgba(255,255,255,.48)!important}" +
      ".music-prohibited-stage em{display:block!important;margin-top:8px!important;color:#ffe88a!important;font-style:normal!important;font-size:12px!important}" +
      ".music-prohibited-stage .music-v7-unlock-mask{inset:0!important;justify-content:center!important;align-items:center!important;text-align:center!important;padding:18px!important;background:radial-gradient(circle,rgba(20,10,28,.18),rgba(0,0,0,.82))!important}" +
      ".music-prohibited-stage .music-v7-unlock-mask b{font-size:14px!important;background:rgba(0,0,0,.68)!important}" +
      ".music-prohibited-stage .music-v7-unlock-mask span,.music-prohibited-stage .music-v7-unlock-mask em{display:none!important}" +
      ".music-prohibited-stage .music-v7-unlock-mask::after{content:'解除コード入力';display:block;margin-top:12px;font-size:12px;font-weight:900;letter-spacing:.08em;color:rgba(255,255,255,.62)}" +
      ".music-prohibited-stage .music-v7-playing-badge{display:none!important}" +
      ".music-prohibited-stage-label{margin-bottom:14px;font-size:10px;font-weight:900;letter-spacing:.24em;color:rgba(255,232,138,.58)}";
    document.head.appendChild(st);
  }

  function isProhibited(el){
    var text=(el.textContent||"").toLowerCase();
    return text.indexOf("prohibited")>=0 || text.indexOf("禁止")>=0;
  }

  function stage(){
    var list=document.getElementById("musicList");
    if(!list) return null;

    var existing=list.querySelector(".music-prohibited-stage");
    if(existing) return existing;

    var wrap=document.createElement("section");
    wrap.className="music-prohibited-stage";
    wrap.innerHTML='<div class="music-prohibited-stage-inner"><div class="music-prohibited-stage-label">RESTRICTED OBSERVATION</div></div>';
    list.appendChild(wrap);
    return wrap;
  }

  function arrange(){
    injectStyle();

    var list=document.getElementById("musicList");
    if(!list) return;

    var cards=Array.prototype.slice.call(
      list.querySelectorAll(".music-v7-album-art[data-album],.music-v7-single-card[data-album]")
    );

    var target=cards.find(isProhibited);
    if(!target) return;

    var wrap=stage();
    var inner=wrap && wrap.querySelector(".music-prohibited-stage-inner");
    if(!inner) return;

    if(target.parentNode!==inner){
      inner.appendChild(target);
    }

    // Keep it at the absolute bottom, after all normal albums/singles.
    if(wrap.parentNode===list && list.lastElementChild!==wrap){
      list.appendChild(wrap);
    }
  }

  var observer=new MutationObserver(function(){
    clearTimeout(window.__musicProhibitedStageTimer);
    window.__musicProhibitedStageTimer=setTimeout(arrange,30);
  });

  function boot(){
    injectStyle();
    var list=document.getElementById("musicList");
    if(list){
      observer.observe(list,{childList:true,subtree:true});
      arrange();
    }
    setInterval(arrange,700);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();
