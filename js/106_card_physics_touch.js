/* 106_card_physics_touch.js
   Card Physics Touch v17 common-longpress-bridge
   - 4場面を同じ3D物理で処理
   - startでは止めない。動いた時だけ古い処理を止める
   - バインダー詳細のダブルタップ全画面を106側で復活
   - 長押し判定は120_card_longpress.jsへ委譲
*/
(function(){
  "use strict";

  var CFG = {
    visualDirection: -1,
    maxRotateY: 88,
    maxRotateX: 38,
    followX: 0.13,
    followY: 0.08,
    snapMs: 300,
    activeDistance: 7,
    flipThreshold: 68,
    tapDistance: 13,
    doubleTapMs: 310,
    fullscreenScaleBoost: 1.015
  };

  var st = {
    active:false,
    moved:false,
    vertical:false,
    sx:0, sy:0, dx:0, dy:0,
    surface:null,
    suppressClickUntil:0,
    lastTouchTime:0,
    replayLastTap:0,
    replayTapTimer:null,
    verticalLocked:false
  };

  function $(id){ return document.getElementById(id); }
  function visible(el){
    if(!el || el.hidden) return false;
    var cs = window.getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  }
  function isCardMode(){
    try{
      return (typeof appMode !== "undefined" && appMode === "cards") ||
        window.appMode === "cards" ||
        document.body.classList.contains("mode-cards") ||
        document.body.classList.contains("mode-card");
    }catch(e){ return false; }
  }
  function getFlipped(){ try{ if(typeof cardFlipped !== "undefined") return !!cardFlipped; }catch(e){} return false; }
  function setFlipped(v){ try{ if(typeof cardFlipped !== "undefined") cardFlipped = !!v; }catch(e){} }
  function callRender(anim){ try{ if(typeof render === "function") render(anim || "flash"); }catch(e){} }
  function syncFS(){ try{ if(typeof syncFullscreenCard === "function") syncFullscreenCard(); }catch(e){} }

  function getSurfaceFromTarget(target){
    if(!target || !target.closest) return null;

    // バインダー一覧の小さいカードは「開く」ためのタップ領域。
    // ここを物理エンジンが拾うと click が不安定になるので除外する。
    if(target.closest("#binderModal #binderGrid,.binder-item,.owned-card,.binder-locked,.binder-infinity-slot")){
      return null;
    }

    var replayRoot = $("binderReplayViewer");
    var replayCard = target.closest("#binderReplayFlipCard");
    if(replayCard && visible(replayRoot)){
      return { el: replayCard, kind:"binderReplay", fullscreen: replayRoot.classList.contains("replay-fullscreen") };
    }

    var viewerRoot = $("binderViewer");
    var viewerCard = target.closest("#binderViewerCard");
    if(viewerCard && visible(viewerRoot)){
      return { el: viewerCard, kind:"binderViewer", fullscreen:false };
    }

    var fsRoot = $("fullscreenOverlay");
    var fsCard = target.closest("#fullscreenCard,.fullscreen-card");
    if(fsCard && visible(fsRoot)){
      return { el: fsCard, kind:"fullscreen", fullscreen:true };
    }

    // 通常カードは中の img / face / inner がイベントtargetになることがある。
    // ここは必ず本体 #flipCard に寄せる。
    var mainHit = target.closest("#flipCard,.flip-card,.card-inner,.megane-card,.card,.card-face,.flip-front,.flip-back,img");
    var mainCard = $("flipCard") || (mainHit && mainHit.closest ? mainHit.closest("#flipCard") : null) || mainHit;
    if(mainHit && mainCard && isCardMode()){
      return { el: mainCard, kind:"main", fullscreen:false };
    }

    return null;
  }

  function currentSurface(){
    if(st.surface && st.surface.el) return st.surface;
    var replayRoot = $("binderReplayViewer");
    if(visible(replayRoot) && $("binderReplayFlipCard")) return { el:$("binderReplayFlipCard"), kind:"binderReplay", fullscreen: replayRoot.classList.contains("replay-fullscreen") };
    var viewerRoot = $("binderViewer");
    if(visible(viewerRoot) && $("binderViewerCard")) return { el:$("binderViewerCard"), kind:"binderViewer", fullscreen:false };
    var fsRoot = $("fullscreenOverlay");
    if(visible(fsRoot) && $("fullscreenCard")) return { el:$("fullscreenCard"), kind:"fullscreen", fullscreen:true };
    if(isCardMode() && $("flipCard")) return { el:$("flipCard"), kind:"main", fullscreen:false };
    return null;
  }

  function ensureStyle(){
    if($("cardPhysicsTouchStyleV9")) return;
    var css = [
      "#flipCard,#fullscreenCard,#binderReplayFlipCard,#binderViewerCard{",
        "transform-style:preserve-3d;",
        "will-change:transform,filter,opacity;",
        "touch-action:none;",
        "-webkit-user-select:none;user-select:none;",
      "}",
      "#flipCard .flip-inner,#binderReplayFlipCard .flip-inner,#fullscreenFlipInner{transform-style:preserve-3d;}",
      ".ce-physics-active{",
        "transition:none!important;",
        "filter:drop-shadow(var(--ce-phys-shadow-x,0px) var(--ce-phys-shadow-y,24px) var(--ce-phys-shadow-blur,38px) rgba(0,0,0,.46));",
      "}",
      ".ce-physics-snap{",
        "transition:transform " + CFG.snapMs + "ms cubic-bezier(.18,.92,.2,1.05), filter " + CFG.snapMs + "ms ease, opacity " + CFG.snapMs + "ms ease!important;",
      "}",
      ".ce-physics-peek:after{",
        "content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;",
        "background:linear-gradient(90deg,rgba(255,236,170,.24),transparent 20%,transparent 80%,rgba(255,236,170,.22));",
        "mix-blend-mode:screen;opacity:.72;",
      "}",
      "body.ce-card-gesture-active #binderReplayTextPanel{transform:translateY(calc(86% - 30px)) !important;}",
      ".ce-physics-pop-left{animation:cePhysicsPopLeft .36s cubic-bezier(.18,.88,.2,1) both!important;}",
      ".ce-physics-pop-right{animation:cePhysicsPopRight .36s cubic-bezier(.18,.88,.2,1) both!important;}",
      "@keyframes cePhysicsPopLeft{0%{transform:perspective(950px) rotateY(76deg) translateX(18px) scale(.985)}58%{transform:perspective(950px) rotateY(-8deg) translateX(-4px) scale(1.018)}100%{transform:perspective(950px) rotateY(0) translateX(0) scale(1)}}",
      ".ce-draw-locked-nudge{animation:ceDrawLockedNudge .24s ease-out both!important;}",
      "@keyframes ceDrawLockedNudge{0%{transform:translateY(0)}36%{transform:translateY(-7px)}72%{transform:translateY(4px)}100%{transform:translateY(0)}}",
      "@keyframes cePhysicsPopRight{0%{transform:perspective(950px) rotateY(-76deg) translateX(-18px) scale(.985)}58%{transform:perspective(950px) rotateY(8deg) translateX(4px) scale(1.018)}100%{transform:perspective(950px) rotateY(0) translateX(0) scale(1)}}"
    ].join("");
    var stEl = document.createElement("style");
    stEl.id = "cardPhysicsTouchStyleV9";
    stEl.textContent = css;
    document.head.appendChild(stEl);
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function killOldClasses(el){
    if(!el) return;
    el.classList.remove("ce-touching-v6","ce-return-v6","ce-flip-right-v6","ce-flip-left-v6","flip-pop");
  }

  function apply(dx, dy){
    var s = currentSurface();
    if(!s || !s.el) return;
    var el = s.el;
    killOldClasses(el);
    var fs = !!s.fullscreen || s.kind === "fullscreen";

    var rotY = clamp(dx * (fs ? 0.55 : 0.50) * (CFG.visualDirection || 1), -CFG.maxRotateY, CFG.maxRotateY);
    var rotX = clamp(-dy * (fs ? 0.30 : 0.26), -CFG.maxRotateX, CFG.maxRotateX);
    var tx = clamp(dx * (fs ? CFG.followX * 1.25 : CFG.followX), -42, 42);
    var ty = clamp(dy * (fs ? CFG.followY * 1.25 : CFG.followY), -28, 28);
    var edge = Math.abs(rotY) / CFG.maxRotateY;
    var lift = Math.min(1, Math.max(Math.abs(dx), Math.abs(dy)) / 150);
    var scale = (fs ? CFG.fullscreenScaleBoost : 1) - Math.min(.028, Math.max(Math.abs(dx), Math.abs(dy)) / 7000);
    var z = edge > .62 ? 36 * edge : 10 * edge;

    el.style.setProperty("--ce-phys-shadow-x", clamp(dx*.09, -18, 18) + "px");
    el.style.setProperty("--ce-phys-shadow-y", (20 + lift*18) + "px");
    el.style.setProperty("--ce-phys-shadow-blur", (30 + lift*26) + "px");
    el.classList.add("ce-physics-active");
    el.classList.remove("ce-physics-snap","ce-physics-pop-left","ce-physics-pop-right");
    el.classList.toggle("ce-physics-peek", edge > .66);

    el.style.transformOrigin = dx >= 0 ? "82% 50%" : "18% 50%";
    el.style.opacity = String(clamp(1 - Math.max(0, edge - .74) * .36, .82, 1));
    el.style.transform = "perspective(950px) translate3d("+tx+"px,"+ty+"px,"+z+"px) rotateX("+rotX+"deg) rotateY("+rotY+"deg) rotateZ("+(dx*.004)+"deg) scale("+scale+")";
  }

  function reset(surface){
    var s = surface || currentSurface();
    if(!s || !s.el) return;
    var el = s.el;
    killOldClasses(el);
    el.classList.remove("ce-physics-active","ce-physics-peek");
    el.classList.add("ce-physics-snap");
    el.style.transform = "";
    el.style.opacity = "";
    el.style.transformOrigin = "";
    el.style.removeProperty("--ce-phys-shadow-x");
    el.style.removeProperty("--ce-phys-shadow-y");
    el.style.removeProperty("--ce-phys-shadow-blur");
    setTimeout(function(){ try{ el.classList.remove("ce-physics-snap"); }catch(e){} }, CFG.snapMs + 80);
  }

  function pop(dir, surface){
    var s = surface || currentSurface();
    if(!s || !s.el) return;
    var el = s.el;
    killOldClasses(el);
    var cls = dir >= 0 ? "ce-physics-pop-right" : "ce-physics-pop-left";
    el.classList.remove("ce-physics-pop-left","ce-physics-pop-right");
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function(){ try{ el.classList.remove(cls); }catch(e){} }, 430);
  }

  function doFlip(dir){
    var s = currentSurface();
    if(!s) return false;
    reset(s);

    if(s.kind === "fullscreen"){
      setFlipped(!getFlipped());
      syncFS();
      setTimeout(function(){ pop(dir, {el:$("fullscreenCard"), kind:"fullscreen", fullscreen:true}); }, 20);
      return true;
    }
    if(s.kind === "main"){
      // v13: 未確定の裏面カードは、左右スワイプで裏返した時点で「今日の1枚」として確定する。
      // ここで単に cardFlipped だけ変えると、見た目は表になるのに daily.drawn が立たず、
      // 上下シャッフルが止まらない。抽選・保存・バインダー登録は105の drawToday() に任せる。
      if(!isDailyDrawn() && getFlipped()){
        drawTodayFromPhysics();
        setTimeout(function(){ pop(dir, {el:$("flipCard"), kind:"main"}); }, 520);
        return true;
      }
      setFlipped(!getFlipped());
      callRender("flash");
      setTimeout(function(){ pop(dir, {el:$("flipCard"), kind:"main"}); }, 30);
      return true;
    }
    if(s.kind === "binderReplay"){
      // v14: バインダー詳細では、左右スワイプは「表裏めくり」ではなく
      // コレクション内の前後カード送りに戻す。表裏はタップで切り替える。
      navigateBinderReplay(dir < 0 ? 1 : -1);
      return true;
    }
    if(s.kind === "binderViewer"){
      setTimeout(function(){ pop(dir, s); }, 20);
      return true;
    }
    return false;
  }

  function shouldFlip(dx, dy){ return Math.abs(dx) >= CFG.flipThreshold && Math.abs(dx) > Math.abs(dy) * 1.18; }
  function isDailyDrawn(){
    try{
      if(window.MEGANE_CARD_ENGINE && typeof window.MEGANE_CARD_ENGINE.loadDaily === "function"){
        var s = window.MEGANE_CARD_ENGINE.loadDaily();
        return !!(s && s.drawn);
      }
    }catch(e){}
    return false;
  }

  function drawTodayFromPhysics(){
    try{
      if(window.MEGANE_CARD_ENGINE && typeof window.MEGANE_CARD_ENGINE.drawToday === "function"){
        window.MEGANE_CARD_ENGINE.drawToday();
        return true;
      }
    }catch(e){}
    try{
      if(typeof window.meganeDrawTodayCard === "function"){
        window.meganeDrawTodayCard();
        return true;
      }
    }catch(e){}
    return false;
  }

  function showDrawLockedHint(){
    try{
      var cap = $("cardCaption");
      if(cap) cap.textContent = "今日のカードは引き済み";
    }catch(e){}
    try{
      var el = $("flipCard");
      if(!el) return;
      cleanForVerticalDeal(el);
      el.classList.remove("ce-draw-locked-nudge");
      void el.offsetWidth;
      el.classList.add("ce-draw-locked-nudge");
      setTimeout(function(){ try{ el.classList.remove("ce-draw-locked-nudge"); }catch(_){} }, 260);
    }catch(e){}
  }
  function shouldVerticalShuffle(surface, dx, dy){
    return surface && surface.kind === "main" && !surface.fullscreen && !isDailyDrawn() && Math.abs(dy) >= 26 && Math.abs(dy) > Math.abs(dx) * 0.82;
  }
  function cleanForVerticalDeal(el){
    if(!el) return;
    el.classList.remove(
      "ce-physics-active","ce-physics-peek","ce-physics-snap",
      "ce-physics-pop-left","ce-physics-pop-right",
      "ce-touching-v6","ce-return-v6","ce-flip-right-v6","ce-flip-left-v6"
    );
    el.style.transform = "";
    el.style.opacity = "";
    el.style.transformOrigin = "";
    el.style.removeProperty("--ce-phys-shadow-x");
    el.style.removeProperty("--ce-phys-shadow-y");
    el.style.removeProperty("--ce-phys-shadow-blur");
  }
  function doVerticalShuffle(dy){
    var step = dy < 0 ? 1 : -1;
    var el = $("flipCard");
    cleanForVerticalDeal(el);

    // v11: 上下スワイプは「配る演出だけ」に戻す。
    // moveCard() を呼ぶと 00_core 側の旧カード送りが走り、
    // 今日の1枚ロック・バインダー登録をすり抜けて何回でも引ける状態になる。
    // 抽選・保存・バインダー登録は105の drawToday() だけに任せる。
    try{
      if(window.MEGANE_CARD_ENGINE && typeof window.MEGANE_CARD_ENGINE.flyDeck === "function"){
        window.MEGANE_CARD_ENGINE.flyDeck(step);
        return true;
      }
    }catch(e){}

    // 保険：105が無い環境でも最低限、見た目だけ飛ばす。
    try{
      if(el){
        el.classList.remove("ce-fly-up","ce-fly-down","ce-return-deck");
        void el.offsetWidth;
        el.classList.add(step > 0 ? "ce-fly-up" : "ce-fly-down");
        setTimeout(function(){
          try{
            el.classList.remove("ce-fly-up","ce-fly-down");
            void el.offsetWidth;
            el.classList.add("ce-return-deck");
            setTimeout(function(){ try{ el.classList.remove("ce-return-deck"); }catch(_){} }, 320);
          }catch(_){}
        }, 560);
        return true;
      }
    }catch(e){}
    return false;
  }
  function pointFromEvent(e){ if(e.changedTouches && e.changedTouches[0]) return e.changedTouches[0]; if(e.touches && e.touches[0]) return e.touches[0]; return e; }
  function stop(e, hard){ try{ e.preventDefault(); e.stopPropagation(); if(hard && e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){} }


  function surfaceFrontIsVisible(surface){
    if(!surface || !surface.el) return false;

    // 通常カードと通常全画面は共通のcardFlippedを使う。
    if(surface.kind === "main" || surface.kind === "fullscreen"){
      return !getFlipped();
    }

    // バインダー詳細系はflippedクラスが裏面。
    return !surface.el.classList.contains("flipped");
  }

  function longPressApi(){
    return window.MEGANE_CARD_LONGPRESS || null;
  }

  function start(e){
    var p = pointFromEvent(e);
    var s = getSurfaceFromTarget(e.target);
    if(!s) return;
    if(e.type.indexOf("pointer") === 0 && Date.now() - st.lastTouchTime < 520) return;
    if(e.type.indexOf("touch") === 0) st.lastTouchTime = Date.now();
    st.active = true; st.moved = false; st.vertical = false; st.verticalLocked = false;
    st.sx = p.clientX; st.sy = p.clientY;
    st.dx = 0; st.dy = 0; st.surface = s;
    if(s.kind === "binderReplay"){
      document.body.classList.add("ce-card-gesture-active");
      var panel = $("binderReplayTextPanel");
      if(panel) panel.classList.remove("expanded");
    }
    // ここでは止めない。止めるとダブルタップ/通常タップが死ぬ。
    var lp = longPressApi();
    if(lp && typeof lp.begin === "function"){
      lp.begin({
        surface:s,
        front:surfaceFrontIsVisible(s)
      }, p);
    }
  }

  function isVerticalIntent(surface, dx, dy){
    return surface && surface.kind === "main" && !surface.fullscreen && Math.abs(dy) >= 22 && Math.abs(dy) > Math.abs(dx) * 1.12;
  }

  function move(e){
    if(!st.active) return;
    var p = pointFromEvent(e);
    st.dx = p.clientX - st.sx; st.dy = p.clientY - st.sy;
    var lp = longPressApi();
    if(lp && typeof lp.move === "function") lp.move(p);
    var dist = Math.max(Math.abs(st.dx), Math.abs(st.dy));
    if(dist < CFG.activeDistance) return;
    st.moved = true;

    // v10: 通常カードの上下スワイプは3Dめくりに食わせない。
    // ここではカード画像を動かさず、endで既存の「配る」演出へ橋渡しする。
    if(isVerticalIntent(st.surface, st.dx, st.dy)){
      if(isDailyDrawn()){
        st.verticalLocked = true;
        reset(st.surface);
        stop(e, true);
        return;
      }
      st.vertical = true;
      reset(st.surface);
      stop(e, true);
      return;
    }

    apply(st.dx, st.dy);
    stop(e, true);
  }

  function end(e){
    if(!st.active) return;
    var p = pointFromEvent(e);

    var lp = longPressApi();
    if(lp && typeof lp.end === "function" && lp.end(p)){
      var heldSurface = st.surface;
      reset(heldSurface);
      st.active = false;
      st.moved = false;
      st.vertical = false;
      st.verticalLocked = false;
      if(heldSurface && heldSurface.kind === "binderReplay"){
        document.body.classList.remove("ce-card-gesture-active");
        var heldPanel = $("binderReplayTextPanel");
        if(heldPanel) heldPanel.classList.remove("expanded");
      }
      st.surface = null;
      st.suppressClickUntil = Date.now() + 700;
      stop(e, true);
      return false;
    }

    var dx = ((p && p.clientX) || st.sx) - st.sx;
    var dy = ((p && p.clientY) || st.sy) - st.sy;
    var dist = Math.max(Math.abs(dx), Math.abs(dy));
    var moved = st.moved;
    var surface = st.surface;

    if(!moved || dist < CFG.tapDistance){
      reset(surface);
      st.active = false;
      if(surface && surface.kind === "binderReplay"){
        document.body.classList.remove("ce-card-gesture-active");
        var panel = $("binderReplayTextPanel"); if(panel) panel.classList.remove("expanded");
      }
      st.surface = null; st.vertical = false; st.verticalLocked = false;
      return;
    }

    st.active = false;
    if(surface && surface.kind === "binderReplay"){
      document.body.classList.remove("ce-card-gesture-active");
      var panel = $("binderReplayTextPanel"); if(panel) panel.classList.remove("expanded");
    }
    if(st.verticalLocked){
      showDrawLockedHint();
      st.suppressClickUntil = Date.now() + 220;
      st.surface = null; st.vertical = false; st.verticalLocked = false; st.verticalLocked = false;
      stop(e, true);
      return false;
    }
    if(st.vertical || shouldVerticalShuffle(surface, dx, dy)){
      doVerticalShuffle(dy);
      st.suppressClickUntil = Date.now() + 260;
      st.surface = null; st.vertical = false; st.verticalLocked = false;
      stop(e, true);
      return false;
    }
    if(shouldFlip(dx, dy)){
      var dir = dx >= 0 ? 1 : -1;
      doFlip(dir);
      st.suppressClickUntil = Date.now() + 420;
      st.surface = null; st.vertical = false; st.verticalLocked = false;
      stop(e, true);
      return false;
    }
    reset(surface);
    if(surface && surface.kind === "binderReplay"){
      document.body.classList.remove("ce-card-gesture-active");
      var panel = $("binderReplayTextPanel"); if(panel) panel.classList.remove("expanded");
    }
    st.surface = null; st.vertical = false; st.verticalLocked = false;
    stop(e, true);
    return false;
  }

  function cancel(){
    var lp = longPressApi();
    if(lp && typeof lp.cancel === "function") lp.cancel();
    if(!st.active) return;
    var s = st.surface;
    st.active = false;
    st.vertical = false;
    st.verticalLocked = false;
    if(s && s.kind === "binderReplay"){
      document.body.classList.remove("ce-card-gesture-active");
      var panel=$("binderReplayTextPanel");
      if(panel) panel.classList.remove("expanded");
    }
    st.surface = null;
    reset(s);
  }

  function replaySingleTap(){
    var card = $("binderReplayFlipCard");
    if(!card) return;
    card.classList.toggle("flipped");
    pop(1, {el:card, kind:"binderReplay", fullscreen: false});
  }
  function replayDoubleTap(){
    var root = $("binderReplayViewer");
    var card = $("binderReplayFlipCard");
    if(!root || !card) return;
    root.classList.toggle("replay-fullscreen");
    reset({el:card, kind:"binderReplay"});
    setTimeout(function(){ pop(1, {el:card, kind:"binderReplay", fullscreen:root.classList.contains("replay-fullscreen")}); }, 40);
  }


  // v9: バインダー一覧タップ救出。
  // 既存の openReplay は 30_features 内のローカル関数なので、106 側にも最小実装を持たせる。
  var binderRescue = { last:0, pos:0, owned:[], flipped:false };
  function loadJsonSafe(key, fallback){ try{ var v=JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback)); return v==null?fallback:v; }catch(e){ return fallback; } }
  function getCardsSafe(){ try{ if(typeof cards !== "undefined" && Array.isArray(cards)) return cards; }catch(e){} try{ if(window.cards && Array.isArray(window.cards)) return window.cards; }catch(e){} return []; }
  function validCardIndex(i){ var a=getCardsSafe(); i=Number(i); return isFinite(i) && i>=0 && i<a.length; }
  function escHtml(v){ return String(v == null ? "" : v).replace(/[&<>"']/g,function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]; }); }
  function cardOf(i){ var a=getCardsSafe(); return validCardIndex(i) ? a[Number(i)] : null; }
  function cardTitle(c,i){ return (c && (c.title||c.name||c.label||c.word||c.id)) || ("CARD "+String(Number(i)+1).padStart(3,"0")); }
  function cardSub(c){ return (c && (c.subtitle||c.en||c.keyword||c.type||c.caption)) || ""; }
  function cardImg(c){ return (c && (c.image||c.img||c.src||c.url||c.front||c.frontImage||c.cardImage)) || ""; }
  function cardBack(c){ return (c && (c.back||c.backImage||c.reverse||c.reverseImage)) || "images/cards/card_back.png"; }
  function buildOwnedFromDom(){
    var out=[];
    document.querySelectorAll("#binderGrid .binder-item.owned-card,#binderGrid .binder-item.binder-owned,#binderGrid .binder-infinity-slot.complete").forEach(function(el){
      var n = Number(el.dataset.cardIndex != null ? el.dataset.cardIndex : (el.dataset.slot != null ? el.dataset.slot : el.dataset.idx));
      if(validCardIndex(n) && out.indexOf(n)<0) out.push(n);
    });
    if(out.length) return out.sort(function(a,b){return a-b;});
    var keys=["binderCardsV104","cardOwnedUniqueV100","cardCollectionV100"];
    keys.forEach(function(k){
      loadJsonSafe(k,[]).forEach(function(v){ var n=Number(v); if(validCardIndex(n) && out.indexOf(n)<0) out.push(n); });
    });
    return out.sort(function(a,b){return a-b;});
  }
  function sampleText(c){
    if(!c) return "";
    function line(v){ return escHtml(v).replace(/\n/g,"<br>"); }
    var title=cardTitle(c,0), sub=cardSub(c);
    if(c.observe || c.bug || c.lookback || c.lookBack || c.lookbear || c.lookBear){
      return '<h3>'+escHtml(title)+'</h3>'+(sub?'<div class="lead">'+escHtml(sub)+'</div>':'')+
        (c.observe?'<div class="section"><h3>OBSERVE</h3>'+line(c.observe)+'</div>':'')+
        (c.bug?'<div class="section"><h3>BUG</h3>'+line(c.bug)+'</div>':'')+
        ((c.lookback||c.lookBack)?'<div class="section"><h3>LOOK BACK</h3>'+line(c.lookback||c.lookBack)+'</div>':'')+
        ((c.lookbear||c.lookBear)?'<div class="section"><h3>🐻 LOOK BEAR</h3>'+line(c.lookbear||c.lookBear)+'</div>':'');
    }
    var real = c.text || c.description || c.body || c.content || c.story;
    if(real) return line(real);
    return '<h3>'+escHtml(title)+'</h3><div class="lead">'+escHtml(sub || 'カードを引いた瞬間、意味が少しだけ形になる。')+'</div>'+
      '<div class="section"><h3>OBSERVE</h3>自分を見ると、見られる自分も生まれる。</div>'+
      '<div class="section"><h3>BUG</h3>自己観測はもう一人の自分を作り出す。</div>'+
      '<div class="section"><h3>LOOK BACK</h3>今見ているのは本当に自分？<br>それとも観測者の自分？</div>';
  }
  function navigateBinderReplay(step){
    var root = $("binderReplayViewer");
    if(!visible(root)) return false;
    if(!binderRescue.owned || !binderRescue.owned.length){
      binderRescue.owned = buildOwnedFromDom();
      binderRescue.pos = 0;
    }
    if(!binderRescue.owned.length) return false;
    binderRescue.pos = (binderRescue.pos + Number(step || 0) + binderRescue.owned.length) % binderRescue.owned.length;
    binderRescue.flipped = false;
    renderBinderReplayRescue();
    var card = $("binderReplayFlipCard");
    if(card){
      pop(step >= 0 ? -1 : 1, {el:card, kind:"binderReplay", fullscreen: root && root.classList.contains("replay-fullscreen")});
    }
    return true;
  }

  function renderBinderReplayRescue(){
    var root=$("binderReplayViewer"), flip=$("binderReplayFlipCard"), front=$("binderReplayFront"), back=$("binderReplayBack"), title=$("binderReplayTitle"), sub=$("binderReplaySubtitle"), cap=$("binderReplayCaption"), counter=$("binderReplayCounter"), panel=$("binderReplayTextPanel"), text=$("binderReplayTextInner");
    if(!root || !flip || !binderRescue.owned.length) return;
    var idx=binderRescue.owned[binderRescue.pos] || 0, c=cardOf(idx);
    if(front){ front.src=cardImg(c); front.alt=cardTitle(c,idx); }
    if(back){ back.src=cardBack(c); back.alt=cardTitle(c,idx)+" 裏面"; }
    flip.classList.toggle("flipped", !!binderRescue.flipped);
    if(binderRescue.flipped){
      if(title) title.textContent="？？？";
      if(sub) sub.textContent="裏面｜左右でめくる";
      if(cap) cap.textContent="カードをめくると内容が現れる";
    }else{
      if(title) title.textContent=cardTitle(c,idx);
      if(sub) sub.textContent=cardSub(c);
      if(cap) cap.textContent=(c && c.caption) || "";
    }
    if(counter) counter.textContent=(binderRescue.pos+1)+" / "+binderRescue.owned.length+"　No."+String(idx+1).padStart(3,"0");
    if(text) text.innerHTML=sampleText(c);
    if(panel) panel.classList.remove("expanded");
  }
  function openBinderReplayRescue(idx){
    var root=$("binderReplayViewer");
    if(!root || !validCardIndex(idx)) return false;
    binderRescue.owned=buildOwnedFromDom();
    if(binderRescue.owned.indexOf(Number(idx))<0) binderRescue.owned.push(Number(idx));
    binderRescue.owned=binderRescue.owned.filter(validCardIndex).sort(function(a,b){return a-b;});
    binderRescue.pos=Math.max(0,binderRescue.owned.indexOf(Number(idx)));
    binderRescue.flipped=false;
    root.hidden=false;
    root.classList.remove("replay-fullscreen");
    renderBinderReplayRescue();
    return true;
  }
  function bindBinderOpenRescue(){
    // v16: バインダー一覧を縦スクロール中に誤タップで開かないようにする。
    // 「押して、ほぼ動かず離した」時だけカード詳細を開く。
    var tap = {active:false, sx:0, sy:0, moved:false, item:null, blockClickUntil:0};

    function itemFrom(e){
      return e.target && e.target.closest ? e.target.closest("#binderGrid .binder-item.owned-card,#binderGrid .binder-item.binder-owned,#binderGrid .binder-infinity-slot.complete") : null;
    }
    function pnt(e){ return pointFromEvent(e); }

    function onDown(e){
      var item = itemFrom(e);
      if(!item) return;
      var p = pnt(e); if(!p) return;
      tap.active = true;
      tap.sx = p.clientX;
      tap.sy = p.clientY;
      tap.moved = false;
      tap.item = item;
    }

    function onMove(e){
      if(!tap.active) return;
      var p = pnt(e); if(!p) return;
      var dx = p.clientX - tap.sx;
      var dy = p.clientY - tap.sy;
      // 縦スクロールはかなり早めに「タップではない」と判定する。
      if(Math.abs(dy) > 9 || Math.abs(dx) > 14){
        tap.moved = true;
        tap.blockClickUntil = Date.now() + 420;
      }
    }

    function onCancel(){
      tap.active = false;
      tap.item = null;
      tap.moved = false;
    }

    function handler(e){
      var item = itemFrom(e);
      if(!item) return;

      var p = pnt(e);
      var dx = p ? p.clientX - tap.sx : 999;
      var dy = p ? p.clientY - tap.sy : 999;
      var scrolled = tap.moved || Math.abs(dy) > 9 || Math.abs(dx) > 14 || Date.now() < tap.blockClickUntil;

      // スクロール由来の pointerup/touchend/click はここで殺す。
      if(scrolled){
        tap.active = false;
        tap.item = null;
        tap.moved = false;
        tap.blockClickUntil = Date.now() + 360;
        stop(e,true);
        return false;
      }

      // down と up/click の対象がズレた場合も開かない。
      if(tap.item && tap.item !== item){
        tap.active = false;
        tap.item = null;
        stop(e,true);
        return false;
      }

      var now=Date.now();
      if(now-binderRescue.last<260){ stop(e,true); return false; }
      var idx=Number(item.dataset.cardIndex != null ? item.dataset.cardIndex : (item.dataset.slot != null ? item.dataset.slot : item.dataset.idx));
      if(!validCardIndex(idx)) return;

      tap.active = false;
      tap.item = null;
      tap.moved = false;
      binderRescue.last=now;
      if(openBinderReplayRescue(idx)){ stop(e,true); return false; }
    }

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointercancel", onCancel, true);
    document.addEventListener("touchstart", onDown, {capture:true, passive:true});
    document.addEventListener("touchmove", onMove, {capture:true, passive:true});
    document.addEventListener("touchcancel", onCancel, {capture:true, passive:true});

    document.addEventListener("pointerup", handler, true);
    document.addEventListener("click", handler, true);
    document.addEventListener("touchend", handler, {capture:true, passive:false});
  }

  function bindReplayPanelSwipeNext(){
    if(document.documentElement.dataset.cardPhysicsReplayPanelSwipeV14 === "1") return;
    document.documentElement.dataset.cardPhysicsReplayPanelSwipeV14 = "1";
    var psx = 0, psy = 0, tracking = false;
    function pnt(e){ return pointFromEvent(e); }
    function onStart(e){
      var panel = e.target && e.target.closest ? e.target.closest("#binderReplayTextPanel") : null;
      if(!panel || !visible($("binderReplayViewer"))) return;
      var p = pnt(e); if(!p) return;
      psx = p.clientX; psy = p.clientY; tracking = true;
    }
    function onEnd(e){
      if(!tracking) return;
      tracking = false;
      var panel = e.target && e.target.closest ? e.target.closest("#binderReplayTextPanel") : null;
      if(!panel || !visible($("binderReplayViewer"))) return;
      var p = pnt(e); if(!p) return;
      var dx = p.clientX - psx, dy = p.clientY - psy;
      // パネル内の横スワイプだけカード送りにする。縦の開閉は既存処理に任せる。
      if(Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.18){
        navigateBinderReplay(dx < 0 ? 1 : -1);
        st.suppressClickUntil = Date.now() + 260;
        stop(e, true);
        return false;
      }
    }
    document.addEventListener("touchstart", onStart, {capture:true, passive:true});
    document.addEventListener("touchend", onEnd, {capture:true, passive:false});
    document.addEventListener("pointerdown", onStart, true);
    document.addEventListener("pointerup", onEnd, true);
  }

  function bindReplayTapReplacement(){
    document.addEventListener("click", function(e){
      var s = getSurfaceFromTarget(e.target);
      if(!s || s.kind !== "binderReplay") return;
      if(Date.now() < st.suppressClickUntil){ stop(e, true); return false; }

      stop(e, true);
      var now = Date.now();
      var isDouble = now - st.replayLastTap < CFG.doubleTapMs;
      st.replayLastTap = now;
      clearTimeout(st.replayTapTimer);
      if(isDouble){
        st.replayLastTap = 0;
        replayDoubleTap();
      }else{
        st.replayTapTimer = setTimeout(function(){ replaySingleTap(); }, 220);
      }
      return false;
    }, true);
  }

  function bind(){
    if(document.documentElement.dataset.cardPhysicsTouchV9 === "1") return;
    document.documentElement.dataset.cardPhysicsTouchV9 = "1";
    ensureStyle();

    document.addEventListener("pointerdown", start, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("touchstart", start, {capture:true, passive:false});
    document.addEventListener("touchmove", move, {capture:true, passive:false});
    document.addEventListener("touchend", end, {capture:true, passive:false});
    document.addEventListener("touchcancel", cancel, {capture:true, passive:false});

    bindBinderOpenRescue();
    bindReplayPanelSwipeNext();
    bindReplayTapReplacement();

    document.addEventListener("click", function(e){
      if(Date.now() < st.suppressClickUntil && getSurfaceFromTarget(e.target)){
        stop(e, true);
        return false;
      }
    }, true);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.MEGANE_CARD_PHYSICS_TOUCH = { version:"v17_common_longpress_bridge", reset:reset, config:CFG };
})();
