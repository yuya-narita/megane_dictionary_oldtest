/* v99: binder replay z-index fix
   詳細画面がバインダー裏に出る問題を修正。
   開いた瞬間にbody直下へ移動し、最前面z-indexにする。
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function bringReplayToFront(){
    const viewer = q("binderReplayViewer");
    if(!viewer) return;

    if(viewer.parentElement !== document.body){
      document.body.appendChild(viewer);
    }

    viewer.classList.add("binder-replay-frontmost");
  }

  function showReplayForce(){
    const viewer = q("binderReplayViewer");
    if(!viewer) return;

    bringReplayToFront();

    if(!viewer.hidden){
      viewer.style.display = "block";
      viewer.style.visibility = "visible";
      viewer.style.opacity = "1";
      viewer.style.pointerEvents = "auto";
    }
  }

  function patchOpenHooks(){
    // 既存のopen系関数がある場合は、呼ばれた直後に最前面へ
    ["openBinderReplay","openReplay","openBinderCard","openBinderDetail","openCardReplay"].forEach(function(name){
      try{
        if(typeof window[name] === "function" && !window[name].__v99ZFix){
          const old = window[name];
          window[name] = function(){
            const r = old.apply(this, arguments);
            setTimeout(showReplayForce, 0);
            setTimeout(showReplayForce, 80);
            return r;
          };
          window[name].__v99ZFix = true;
        }
      }catch(e){}
    });
  }

  function bindBinderCardClick(){
    const grid = q("binderGrid");
    if(!grid || grid.dataset.v99ZFix) return;
    grid.dataset.v99ZFix = "1";

    ["pointerup","click","touchend"].forEach(function(type){
      grid.addEventListener(type, function(){
        setTimeout(showReplayForce, 0);
        setTimeout(showReplayForce, 120);
      }, true);
    });
  }

  function bindClose(){
    const close = q("binderReplayClose");
    const viewer = q("binderReplayViewer");
    if(!close || !viewer || close.dataset.v99ZFix) return;
    close.dataset.v99ZFix = "1";

    close.addEventListener("click", function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      viewer.hidden = true;
      viewer.style.display = "";
    }, true);

    close.addEventListener("pointerup", function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      viewer.hidden = true;
      viewer.style.display = "";
    }, true);
  }

  function tick(){
    patchOpenHooks();
    bindBinderCardClick();
    bindClose();

    const viewer = q("binderReplayViewer");
    if(viewer && !viewer.hidden){
      showReplayForce();
    }
  }

  function boot(){
    bringReplayToFront();
    tick();
    setInterval(tick, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
