/* v76 polish fix */
(function(){
  function q(id){ return document.getElementById(id); }

  function bindConferenceScrollGuard(){
    var list = q("mangaListView");
    if(!list || list.dataset.scrollGuardV76) return;
    list.dataset.scrollGuardV76 = "1";

    var sx = 0, sy = 0, moved = false, downTime = 0;

    list.addEventListener("pointerdown", function(e){
      sx = e.clientX;
      sy = e.clientY;
      moved = false;
      downTime = Date.now();
    }, true);

    list.addEventListener("pointermove", function(e){
      var dx = Math.abs(e.clientX - sx);
      var dy = Math.abs(e.clientY - sy);
      if(dx > 10 || dy > 10) moved = true;
    }, true);

    ["pointerup","click"].forEach(function(type){
      list.addEventListener(type, function(e){
        var dx = Math.abs((e.clientX || sx) - sx);
        var dy = Math.abs((e.clientY || sy) - sy);
        var longish = Date.now() - downTime > 260;
        if(moved || dx > 10 || dy > 10 || longish){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }, true);
    });
  }

  function bindCardSwipeFix(){
    var card = q("card");
    if(!card || card.dataset.cardSwipeFixV76) return;
    card.dataset.cardSwipeFixV76 = "1";

    var sx = 0, sy = 0, active = false;

    card.addEventListener("pointerdown", function(e){
      var mode = "";
      try { mode = appMode; } catch(err){}
      if(mode !== "cards") return;
      sx = e.clientX;
      sy = e.clientY;
      active = true;
    }, true);

    card.addEventListener("pointerup", function(e){
      var mode = "";
      try { mode = appMode; } catch(err){}
      if(!active || mode !== "cards") return;
      active = false;

      var dx = e.clientX - sx;
      var dy = e.clientY - sy;

      if(Math.abs(dy) > 64 && Math.abs(dy) > Math.abs(dx) * 1.15){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if(typeof moveCard === "function"){
          moveCard(dy < 0 ? 1 : -1);
        }
        return false;
      }
    }, true);
  }

  function stopAudio(a){
    if(!a) return;
    try { if(!a.paused) a.pause(); } catch(e){}
  }

  function emergencyStop(){
    ["musicAudio","confNativeAudio","mangaAudio"].forEach(function(id){
      stopAudio(q(id));
    });
    document.querySelectorAll("audio").forEach(stopAudio);
    try { if(window.speechSynthesis) window.speechSynthesis.cancel(); } catch(e){}

    var btn = q("shareCurrent");
    if(btn){
      btn.classList.add("stop-active");
      setTimeout(function(){ btn.classList.remove("stop-active"); }, 450);
    }
  }

  function bindStop(){
    var btn = q("shareCurrent");
    if(!btn || btn.dataset.stopV76) return;
    btn.dataset.stopV76 = "1";
    btn.setAttribute("title","緊急停止");
    btn.setAttribute("aria-label","緊急停止");

    ["pointerdown","click","touchend"].forEach(function(type){
      btn.addEventListener(type, function(e){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        emergencyStop();
        return false;
      }, {capture:true, passive:false});
    });
  }

  function boot(){
    bindConferenceScrollGuard();
    bindCardSwipeFix();
    bindStop();
    setInterval(function(){
      bindConferenceScrollGuard();
      bindCardSwipeFix();
      bindStop();
    }, 1000);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
