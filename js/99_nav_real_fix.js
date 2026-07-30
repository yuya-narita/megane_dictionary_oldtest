
/* NAV_REAL_FIX_V6_CLEAN */
(function(){
  function q(id){ return document.getElementById(id); }

  function mode(){
    try{
      if(document.body.classList.contains("mode-cards")) return "cards";
      if(document.body.classList.contains("mode-music")) return "music";
      if(document.body.classList.contains("mode-manga") || document.body.classList.contains("mode-conf")) return "conf";
      if(typeof appMode !== "undefined" && appMode === "cards") return "cards";
      if(typeof appMode !== "undefined" && appMode === "manga") return "conf";
    }catch(e){}
    return "dictionary";
  }

  function stopEvent(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }

  function openFavorites(e){
    stopEvent(e);
    if(window.MEGANE_FAVORITES_SINGLETON && typeof window.MEGANE_FAVORITES_SINGLETON.open === "function"){
      return window.MEGANE_FAVORITES_SINGLETON.open(e);
    }
    try{
      if(typeof window.renderDictFavoriteList === "function") window.renderDictFavoriteList();
      else if(typeof renderFavoriteList === "function") renderFavoriteList();
    }catch(_){}
    const d=q("favoriteDialog");
    if(d){ try{ if(d.showModal && !d.open) d.showModal(); else d.setAttribute("open",""); }catch(_){ d.setAttribute("open",""); } }
  }

  function openBinder(e){
    stopEvent(e);
    const m=q("binderModal");
    if(!m) return;
    try{ if(typeof window.renderBinder === "function") window.renderBinder(); }catch(_){}
    m.style.display="block";
  }

  function openExplore(e){
    stopEvent(e);
    const d=q("glassDialog");
    if(d && d.showModal) d.showModal();
  }

  function stopAudio(e){
    // production144:
    // 短押し/長押し判定は144側が担当。
    // 144が処理した時は旧「全audio停止」へ進まない。
    try{
      if(typeof window.MEGANE_AUDIO_CONTINUE_BUTTON === "function"){
        var handled = window.MEGANE_AUDIO_CONTINUE_BUTTON(e);
        if(handled === true) return false;
      }
    }catch(_){}

    stopEvent(e);
    if(typeof window.MEGANE_TOGGLE_MAIN_AUDIO === "function") return window.MEGANE_TOGGLE_MAIN_AUDIO();
    try{ document.querySelectorAll("audio").forEach(a=>{ try{ a.pause(); }catch(_){} }); }catch(_){}
    try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(_){}
  }

  function setBtn(el){
    if(!el) return;
    el.style.opacity="1";
    el.style.filter="none";
    el.style.visibility="visible";
    el.style.pointerEvents="auto";
    el.style.display="grid";
    el.style.placeItems="center";
    el.style.textAlign="center";
    el.style.color="rgba(255,255,255,.94)";
    el.style.fontWeight="800";
  }

  function bind(el,fn,key){
    if(!el) return;
    el.onclick=fn;
    if(!el.dataset[key]){
      el.dataset[key]="1";
      el.addEventListener("click",fn,true);
      el.addEventListener("touchend",fn,{capture:true,passive:false});
    }
  }

  function bottomNav(){
    const footer=document.querySelector("footer.controls");
    const left=q("prevGlass");
    const center=q("randomWord");
    const oldMiddle=q("nextGlass");
    const right=q("shareCurrent");

    if(footer){
      footer.style.display="grid";
      footer.style.gridTemplateColumns="1fr 1fr 1fr";
      footer.style.gap="14px";
      footer.style.position="fixed";
      footer.style.left="max(20px, env(safe-area-inset-left))";
      footer.style.right="max(20px, env(safe-area-inset-right))";
      footer.style.bottom="calc(18px + env(safe-area-inset-bottom))";
      footer.style.width="auto";
      footer.style.margin="0";
      footer.style.zIndex="9000";
      footer.style.visibility="visible";
      footer.style.pointerEvents="auto";
    }

    if(oldMiddle){
      oldMiddle.style.display="none";
      oldMiddle.style.visibility="hidden";
      oldMiddle.style.pointerEvents="none";
    }

    [left,center,right].forEach(setBtn);

    if(left){
      left.textContent="👓";
      left.setAttribute("aria-label","探索");
      bind(left,openExplore,"v6Explore");
    }

    if(center){
      if(mode()==="cards"){
        center.textContent="📘";
        center.setAttribute("aria-label","バインダー");
        bind(center,openBinder,"v6Binder");
      }else{
        center.textContent="★";
        center.setAttribute("aria-label","お気に入り");
        bind(center,openFavorites,"v6Favorite");
      }
    }

    if(right){
      right.textContent="▶";
      right.setAttribute("aria-label","停止");
      bind(right,stopAudio,"v6Stop");
    }
  }

  function clearCircle(el){
    if(!el) return;
    el.style.background="transparent";
    el.style.backgroundColor="transparent";
    el.style.boxShadow="none";
    el.style.borderColor="transparent";
    el.style.outline="0";
    el.style.filter="none";
    el.style.webkitFilter="none";
    el.style.backdropFilter="none";
    el.style.webkitBackdropFilter="none";
  }

  function actions(){
    const fav=q("favoriteToggle");
    const plus=q("userDefinitionPlus");

    if(mode()==="dictionary"){
      if(fav){
        fav.style.right="38px";
        fav.style.transform="none";
      }
      if(plus){
        plus.style.right="34px";
        plus.style.transform="none";
      }
    }

    if(mode()==="conf" && fav){
      clearCircle(fav);
      fav.style.border="0";
      fav.style.borderRadius="0";
      fav.style.overflow="visible";
      fav.querySelectorAll("*").forEach(clearCircle);

      // parent candidates
      let p=fav.parentElement;
      for(let i=0;p && i<5;i++,p=p.parentElement){
        const r=p.getBoundingClientRect();
        if(r.width<=140 && r.height<=140){
          clearCircle(p);
          p.style.border="0";
          p.style.borderRadius="0";
          p.style.overflow="visible";
        }
      }
    }

    [plus,q("favoriteDialogClose"),q("userDefinitionClose"),q("binderCloseBtn"),q("binderViewerClose"),q("binderReplayClose")].forEach(clearCircle);
  }

  function apply(){
    bottomNav();
    actions();
  }

  function patchRender(){
    try{
      if(typeof render==="function" && !render.__navV6Clean){
        const old=render;
        render=function(){
          const r=old.apply(this,arguments);
          setTimeout(apply,0);
          setTimeout(apply,120);
          return r;
        };
        render.__navV6Clean=true;
      }
    }catch(_){}
  }

  function boot(){
    patchRender();
    apply();
    document.addEventListener("click",()=>setTimeout(apply,80),true);
    document.addEventListener("touchend",()=>setTimeout(apply,80),true);
    setInterval(apply,450);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();



/* NAV_REAL_FIX_V7 */
(function(){
  function q(id){ return document.getElementById(id); }

  function mode(){
    try{
      if(document.body.classList.contains("mode-music")) return "music";
      if(document.body.classList.contains("mode-cards")) return "cards";
      if(document.body.classList.contains("mode-manga") || document.body.classList.contains("mode-conf")) return "conf";
      if(typeof appMode !== "undefined" && appMode === "music") return "music";
      if(typeof appMode !== "undefined" && appMode === "cards") return "cards";
      if(typeof appMode !== "undefined" && appMode === "manga") return "conf";
    }catch(e){}
    return "dictionary";
  }

  function clearStarCircle(){
    const layer = q("favoriteLayer");
    const fav = q("favoriteToggle");
    if(layer){
      layer.style.right = "38px";
      layer.style.pointerEvents = "none";
    }
    if(fav){
      fav.style.pointerEvents = "auto";
      fav.style.background = "transparent";
      fav.style.backgroundColor = "transparent";
      fav.style.border = "0";
      fav.style.boxShadow = "none";
      fav.style.outline = "0";
      fav.style.backdropFilter = "none";
      fav.style.webkitBackdropFilter = "none";
      fav.style.borderRadius = "0";
      fav.style.overflow = "visible";
      fav.querySelectorAll("*").forEach(el=>{
        el.style.background = "transparent";
        el.style.backgroundColor = "transparent";
        el.style.border = "0";
        el.style.boxShadow = "none";
      });
    }
  }

  function alignPlus(){
    const plus = q("userDefinitionPlus");
    if(plus){
      plus.style.right = "34px";
      plus.style.transform = "none";
      plus.style.background = "transparent";
      plus.style.backgroundColor = "transparent";
      plus.style.borderColor = "transparent";
      plus.style.boxShadow = "none";
      plus.style.outline = "0";
    }
  }

  function fixFullscreenClose(){
    const ids = ["fullscreenClose","binderViewerClose","binderReplayClose"];
    ids.forEach(id=>{
      const b = q(id);
      if(!b) return;
      b.style.width = "32px";
      b.style.height = "32px";
      b.style.fontSize = "22px";
      b.style.top = "18px";
      b.style.right = "18px";
      b.style.transform = "translate(18px,-18px)";
      b.style.background = "transparent";
      b.style.backgroundColor = "transparent";
      b.style.border = "0";
      b.style.boxShadow = "none";
      b.style.zIndex = "10050";
    });
    document.querySelectorAll("#fullscreenOverlay .close,#fullscreenOverlay button.close").forEach(b=>{
      b.style.width = "32px";
      b.style.height = "32px";
      b.style.fontSize = "22px";
      b.style.top = "18px";
      b.style.right = "18px";
      b.style.transform = "translate(18px,-18px)";
      b.style.background = "transparent";
      b.style.backgroundColor = "transparent";
      b.style.border = "0";
      b.style.boxShadow = "none";
      b.style.zIndex = "10050";
    });
  }

  function fixMusicTab(){
    const tabs = ["dictionaryMode","cardMode","musicMode","mangaMode"].map(q).filter(Boolean);
    const m = mode();
    tabs.forEach(t=>t.classList.remove("active"));
    if(m === "music" && q("musicMode")) q("musicMode").classList.add("active");
    else if(m === "cards" && q("cardMode")) q("cardMode").classList.add("active");
    else if(m === "conf" && q("mangaMode")) q("mangaMode").classList.add("active");
    else if(q("dictionaryMode")) q("dictionaryMode").classList.add("active");
  }

  function apply(){
    clearStarCircle();
    alignPlus();
    fixFullscreenClose();
    fixMusicTab();
  }

  function boot(){
    apply();
    document.addEventListener("click",()=>setTimeout(apply,80),true);
    document.addEventListener("touchend",()=>setTimeout(apply,80),true);
    setInterval(apply,400);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();



/* NAV_REAL_FIX_V8 */
(function(){
  function q(id){ return document.getElementById(id); }
  function isConf(){
    return document.body.classList.contains("mode-manga") ||
      document.body.classList.contains("mode-conf") ||
      (typeof appMode !== "undefined" && appMode === "manga");
  }

  function removeConfStarHalo(){
    const layer = q("favoriteLayer");
    const fav = q("favoriteToggle");
    if(isConf()){
      if(layer){
        layer.style.width = "auto";
        layer.style.height = "auto";
        layer.style.padding = "0";
        layer.style.background = "transparent";
        layer.style.boxShadow = "none";
        layer.style.border = "0";
        layer.style.borderRadius = "0";
        layer.style.overflow = "visible";
      }
      if(fav){
        fav.style.width = "auto";
        fav.style.height = "auto";
        fav.style.minWidth = "0";
        fav.style.minHeight = "0";
        fav.style.padding = "0";
        fav.style.margin = "0";
        fav.style.background = "transparent";
        fav.style.backgroundColor = "transparent";
        fav.style.border = "0";
        fav.style.boxShadow = "none";
        fav.style.textShadow = "none";
        fav.style.filter = "none";
        fav.style.webkitFilter = "none";
        fav.style.backdropFilter = "none";
        fav.style.webkitBackdropFilter = "none";
        fav.style.borderRadius = "0";
        fav.style.overflow = "visible";
        fav.style.transform = "none";
      }
    }
  }

  function liftPlus(){
    const plus = q("userDefinitionPlus");
    if(plus){
      plus.style.bottom = "calc(108px + env(safe-area-inset-bottom))";
    }
  }

  function moveBinderClose(){
    ["binderViewerClose","binderReplayClose","fullscreenClose"].forEach(id=>{
      const b = q(id);
      if(!b) return;
      b.style.top = "18px";
      b.style.right = "26px";
      b.style.transform = "none";
    });
    document.querySelectorAll("#fullscreenOverlay .close,#fullscreenOverlay button.close").forEach(b=>{
      b.style.top = "18px";
      b.style.right = "26px";
      b.style.transform = "none";
    });
  }

  function apply(){
    removeConfStarHalo();
    liftPlus();
    moveBinderClose();
  }

  function boot(){
    apply();
    document.addEventListener("click",()=>setTimeout(apply,80),true);
    document.addEventListener("touchend",()=>setTimeout(apply,80),true);
    setInterval(apply,400);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();



/* NAV_REAL_FIX_V9_REAL */
(function(){
  function q(id){ return document.getElementById(id); }

  function isConf(){
    return document.body.classList.contains("mode-manga") ||
      document.body.classList.contains("mode-conf") ||
      (typeof appMode !== "undefined" && appMode === "manga");
  }

  function killCircle(el){
    if(!el) return;
    el.style.background = "transparent";
    el.style.backgroundColor = "transparent";
    el.style.border = "0";
    el.style.boxShadow = "none";
    el.style.outline = "0";
    el.style.backdropFilter = "none";
    el.style.webkitBackdropFilter = "none";
    el.style.textShadow = "none";
    el.style.filter = "none";
    el.style.webkitFilter = "none";
  }

  function fixPlus(){
    const plus = q("userDefinitionPlus");
    if(plus){
      plus.style.right = "34px"; // 少し右へ
    }
  }

  function fixFavoriteCircle(){
    const layer = q("favoriteLayer");
    const fav = q("favoriteToggle");

    killCircle(layer);
    killCircle(fav);

    if(layer){
      layer.style.borderRadius = "0";
      layer.style.overflow = "visible";
    }

    if(fav){
      fav.style.borderRadius = "0";
      fav.style.overflow = "visible";
      fav.style.transform = "none";
      fav.querySelectorAll("*").forEach(killCircle);
    }

    if(isConf()){
      if(layer){
        layer.style.width = "auto";
        layer.style.height = "auto";
        layer.style.padding = "0";
      }
      if(fav){
        fav.style.width = "auto";
        fav.style.height = "auto";
        fav.style.minWidth = "0";
        fav.style.minHeight = "0";
        fav.style.padding = "0";
        fav.style.margin = "0";
        fav.style.lineHeight = "1";
      }

      // Confで残る円が親側なら、近い親だけ潰す
      /* parent cleanup runs in fixFavoriteParents */
    }
  }

  // PythonのNoneが入らないように親探索は別定義
  function fixFavoriteParents(){
    if(!isConf()) return;
    const fav = q("favoriteToggle");
    if(!fav) return;
    let p = fav.parentElement;
    for(let i=0; p && i<4; i++, p=p.parentElement){
      const r = p.getBoundingClientRect();
      if(r.width <= 160 && r.height <= 160){
        killCircle(p);
        p.style.borderRadius = "0";
        p.style.overflow = "visible";
      }
    }
  }

  function apply(){
    fixPlus();
    fixFavoriteCircle();
    fixFavoriteParents();
  }

  function boot(){
    apply();
    document.addEventListener("click",()=>setTimeout(apply,80),true);
    document.addEventListener("touchend",()=>setTimeout(apply,80),true);
    setInterval(apply,350);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();



/* NAV_REAL_FIX_V10 */
(function(){
  function apply(){
    var b = document.getElementById("confTopFav");
    if(b){
      b.style.background = "transparent";
      b.style.backgroundColor = "transparent";
      b.style.border = "0";
      b.style.boxShadow = "none";
      b.style.outline = "0";
      b.style.backdropFilter = "none";
      b.style.webkitBackdropFilter = "none";
      b.style.borderRadius = "0";
      b.style.width = "auto";
      b.style.height = "auto";
      b.style.minWidth = "0";
      b.style.minHeight = "0";
      b.style.padding = "0";
      b.style.margin = "0";
      b.style.lineHeight = "1";
      b.style.textShadow = "none";
      b.style.filter = "none";
      b.style.webkitFilter = "none";
    }
    var plus = document.getElementById("userDefinitionPlus");
    if(plus){
      plus.style.right = "30px";
    }
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
  document.addEventListener("click", function(){ setTimeout(apply, 80); }, true);
  document.addEventListener("touchend", function(){ setTimeout(apply, 80); }, true);
  setInterval(apply, 350);
})();
