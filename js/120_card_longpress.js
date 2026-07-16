/* 120_card_longpress.js
   MEGANE DICTIONARY v1.031 — IOS IMAGE DRAG FIX

   重要:
   - 長押し成立時には画面を開かない。
   - 指 / マウスを離した時にだけPLAYGROUNDを開く。
   - 既存のpointer captureやカード物理と競合しない。
*/
(function(){
  "use strict";

  var HOLD_MS = 2400;
  var MOVE_CANCEL = 13;

  var state = {
    active:false,
    armed:false,
    timer:0,
    startX:0,
    startY:0,
    context:null,
    effectLayer:null,
    effectCard:null,
    audioCtx:null,
    audioGain:null,
    audioOsc1:null,
    audioOsc2:null,
    audioStarted:false,
    audioDelayTimer:0
  };

  function cardsSafe(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    try{
      if(window.cards && Array.isArray(window.cards)) return window.cards;
    }catch(e){}
    return [];
  }

  function normalizePath(value){
    try{
      var url = new URL(String(value || ""), location.href);
      return decodeURIComponent(url.pathname).replace(/\\/g,"/").toLowerCase();
    }catch(e){
      return decodeURIComponent(String(value || "")).replace(/\\/g,"/").toLowerCase();
    }
  }

  function cardImage(card){
    return card && (
      card.image || card.img || card.src || card.url ||
      card.front || card.frontImage || card.cardImage
    ) || "";
  }

  function resolveIndex(context){
    var list = cardsSafe();
    var surface = context && context.surface;
    if(!surface || !surface.el || !list.length) return -1;

    // 通常カード / 通常全画面は現在のcardIndexが正解。
    if(surface.kind === "main" || surface.kind === "fullscreen"){
      try{
        if(typeof cardIndex !== "undefined" && isFinite(Number(cardIndex))){
          return Number(cardIndex);
        }
      }catch(e){}
      try{
        if(isFinite(Number(window.cardIndex))) return Number(window.cardIndex);
      }catch(e){}
    }

    // バインダー詳細 / バインダー全画面は表示中の表画像で照合。
    var visiblePaths = [];
    try{
      surface.el.querySelectorAll("img").forEach(function(img){
        var raw = img.currentSrc || img.getAttribute("src") || img.src || "";
        var path = normalizePath(raw);
        if(path) visiblePaths.push(path);
      });
    }catch(e){}

    for(var i=0;i<list.length;i++){
      var expected = normalizePath(cardImage(list[i]));
      if(!expected) continue;
      for(var j=0;j<visiblePaths.length;j++){
        if(visiblePaths[j].endsWith(expected) || visiblePaths[j].indexOf(expected) >= 0){
          return i;
        }
      }
    }

    // カウンター表示を最後の保険にする。
    var counterIds = ["binderReplayCounter","binderViewerCounter"];
    for(var k=0;k<counterIds.length;k++){
      var el = document.getElementById(counterIds[k]);
      var text = el ? String(el.textContent || "") : "";
      var match = text.match(/(?:No\.)?\s*(\d{1,3})/i);
      if(match){
        var n = Number(match[1]) - 1;
        if(n >= 0 && n < list.length) return n;
      }
    }

    return -1;
  }

  function ensureEntryEffectStyle(){
    if(document.getElementById("cardEntryEffectStyleV129")) return;

    var style=document.createElement("style");
    style.id="cardEntryEffectStyleV129";
    style.textContent=`
      #flipCard,
      #fullscreenCard,
      #binderViewerCard,
      #binderReplayFlipCard,
      #flipCard img,
      #fullscreenCard img,
      #binderViewerCard img,
      #binderReplayFlipCard img{
        -webkit-touch-callout:none !important;
        -webkit-user-select:none !important;
        user-select:none !important;
        -webkit-user-drag:none !important;
      }

      #flipCard img,
      #fullscreenCard img,
      #binderViewerCard img,
      #binderReplayFlipCard img{
        pointer-events:none !important;
      }

      #cardEntryEffectLayer{
        position:fixed;
        inset:0;
        z-index:2147483200;
        pointer-events:none;
        overflow:hidden;
        opacity:0;
        background:
          radial-gradient(circle at var(--entry-x,50%) var(--entry-y,50%),
            rgba(255,245,220,.035) 0 10%,
            rgba(0,0,0,.10) 30%,
            rgba(0,0,0,.48) 68%,
            rgba(0,0,0,.84) 100%);
        transition:opacity .32s ease;
      }
      #cardEntryEffectLayer.show{opacity:1}

      #cardEntryEffectLayer .ce-entry-label{
        position:absolute;
        top:max(18px,env(safe-area-inset-top));
        right:18px;
        padding:7px 9px;
        border:1px solid rgba(255,255,255,.10);
        border-radius:8px;
        background:rgba(0,0,0,.28);
        color:rgba(255,255,255,.42);
        font-size:9px;
        font-weight:900;
        letter-spacing:.16em;
        line-height:1.45;
        opacity:0;
        transform:translateY(-4px);
      }
      #cardEntryEffectLayer.charging .ce-entry-label{
        animation:ceEntryLabel 2.4s steps(1,end) forwards;
      }
      @keyframes ceEntryLabel{
        0%,47%{opacity:0}
        48%,100%{opacity:1;transform:translateY(0)}
      }

      #cardEntryEffectLayer .ce-entry-scan{
        position:absolute;
        inset:-10%;
        opacity:0;
        background:
          repeating-linear-gradient(
            0deg,
            rgba(255,255,255,.050) 0 1px,
            rgba(0,0,0,.018) 1px 2px, transparent 2px 5px
          ),
          linear-gradient(
            90deg,
            transparent 0 14%,
            rgba(255,255,255,.018) 14% 15%,
            transparent 15% 68%,
            rgba(255,255,255,.014) 68% 69%,
            transparent 69% 100%
          );
        mix-blend-mode:screen;
      }
      #cardEntryEffectLayer.charging .ce-entry-scan{
        animation:ceEntryScan 2.4s steps(4,end) forwards;
      }
      @keyframes ceEntryScan{
        0%,42%{opacity:0;transform:translate3d(0,0,0)}
        56%{opacity:.16;transform:translate3d(-.4%,.3%,0)}
        70%{opacity:.24;transform:translate3d(.6%,-.4%,0)}
        84%{opacity:.34;transform:translate3d(-.7%,.5%,0)}
        100%{opacity:.42;transform:translate3d(.3%,-.2%,0)}
      }

      #cardEntryEffectLayer .ce-entry-edge{
        position:absolute;
        inset:-6%;
        opacity:0;
        box-shadow:
          inset 0 0 90px rgba(0,0,0,.32),
          inset 0 0 180px rgba(0,0,0,.66);
      }
      #cardEntryEffectLayer.charging .ce-entry-edge{
        animation:ceEntryEdge 2.4s ease forwards;
      }
      @keyframes ceEntryEdge{
        0%{opacity:0}
        36%{opacity:.12}
        64%{opacity:.36}
        82%{opacity:.62}
        100%{opacity:.86}
      }

      #cardEntryEffectLayer .ce-entry-breath{
        position:absolute;
        inset:0;
        opacity:0;
        background:rgba(0,0,0,.12);
      }
      #cardEntryEffectLayer.charging .ce-entry-breath{
        animation:ceEntryBreath 1.15s ease-in-out 2;
      }
      @keyframes ceEntryBreath{
        0%,100%{opacity:.05}
        50%{opacity:.22}
      }

      #cardEntryEffectLayer .ce-entry-observed{
        position:absolute;
        left:50%;
        top:48%;
        transform:translate(-50%,-50%);
        font-size:11px;
        font-weight:900;
        letter-spacing:.18em;
        color:rgba(255,255,255,.78);
        opacity:0;
        white-space:nowrap;
      }
      #cardEntryEffectLayer.armed .ce-entry-observed{
        animation:ceObservedFlash .22s steps(1,end) forwards;
      }
      @keyframes ceObservedFlash{
        0%{opacity:0}
        18%,78%{opacity:1}
        79%,100%{opacity:0}
      }

      #cardEntryEffectLayer::before{
        content:"";
        position:absolute;
        left:var(--entry-x,50%);
        top:var(--entry-y,50%);
        width:22px;
        height:22px;
        border-radius:50%;
        transform:translate(-50%,-50%) scale(.18);
        background:#000;
        opacity:0;
        box-shadow:
          0 0 0 1px rgba(255,255,255,.06),
          0 0 34px rgba(255,255,255,.025);
      }
      #cardEntryEffectLayer.armed::before{
        animation:ceWorldHole .54s cubic-bezier(.16,.84,.24,1) forwards;
      }
      @keyframes ceWorldHole{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}
        18%{opacity:1;transform:translate(-50%,-50%) scale(.75)}
        100%{opacity:1;transform:translate(-50%,-50%) scale(48)}
      }

      #cardEntryEffectLayer.armed{
        animation:ceWorldBreak .54s steps(3,end) forwards;
      }
      @keyframes ceWorldBreak{
        0%{filter:none}
        20%{filter:contrast(1.05) brightness(.92)}
        42%{filter:contrast(1.18) brightness(.72)}
        68%{filter:contrast(1.08) brightness(.46)}
        100%{filter:brightness(.08)}
      }

      /* 下層DOMにはfilterを掛けない。PNG透過部分の白化を防ぐ。 */
      #cardEntryEffectLayer .ce-entry-corrupt{
        position:absolute; inset:0; opacity:0; pointer-events:none;
        background:
          linear-gradient(90deg,
            transparent 0 7%,
            rgba(255,0,0,.035) 7% 8%,
            transparent 8% 52%,
            rgba(0,190,255,.035) 52% 53%,
            transparent 53% 100%);
        mix-blend-mode:screen;
      }
      #cardEntryEffectLayer.charging .ce-entry-corrupt{
        animation:ceEntryCorrupt 2.4s steps(5,end) forwards;
      }
      @keyframes ceEntryCorrupt{
        0%,40%{opacity:0;transform:translate3d(0,0,0)}
        52%{opacity:.16;transform:translate3d(-1px,0,0)}
        64%{opacity:.22;transform:translate3d(1px,0,0)}
        76%{opacity:.28;transform:translate3d(-2px,1px,0)}
        88%{opacity:.34;transform:translate3d(2px,-1px,0)}
        100%{opacity:.40;transform:translate3d(0,0,0)}
      }
      #cardEntryEffectLayer .ce-entry-flicker{
        position:absolute; inset:0; opacity:0; pointer-events:none;
        background:repeating-linear-gradient(
          0deg,
          rgba(255,255,255,.050) 0 1px,
          rgba(0,0,0,.020) 1px 2px,
          transparent 2px 5px
        );
        mix-blend-mode:overlay;
      }
      #cardEntryEffectLayer.charging .ce-entry-flicker{
        animation:ceEntryFlicker 2.4s steps(6,end) forwards;
      }
      @keyframes ceEntryFlicker{
        0%,45%{opacity:0}
        54%{opacity:.10}
        63%{opacity:.18}
        72%{opacity:.12}
        81%{opacity:.24}
        90%{opacity:.16}
        100%{opacity:.30}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureAudioContext(){
    try{
      if(state.audioCtx && state.audioCtx.state !== "closed") return state.audioCtx;
      var AC=window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      state.audioCtx=new AC();
      return state.audioCtx;
    }catch(e){
      return null;
    }
  }

  function stopEntryTone(immediate){
    var ctx=state.audioCtx;
    var gain=state.audioGain;
    var osc1=state.audioOsc1;
    var osc2=state.audioOsc2;

    state.audioGain=null;
    state.audioOsc1=null;
    state.audioOsc2=null;
    state.audioStarted=false;

    if(!ctx) return;

    try{
      var now=ctx.currentTime;
      if(gain){
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(.0001,gain.gain.value||.01),now);
        gain.gain.exponentialRampToValueAtTime(.0001,now+(immediate?.02:.13));
      }
      var stopAt=now+(immediate?.03:.15);
      if(osc1) osc1.stop(stopAt);
      if(osc2) osc2.stop(stopAt);
    }catch(e){}
  }

  function startEntryTone(){
    var ctx=ensureAudioContext();
    if(!ctx) return;

    try{
      var resumePromise=ctx.resume();
      if(resumePromise && resumePromise.catch) resumePromise.catch(function(){});
    }catch(e){}

    stopEntryTone(true);

    try{
      var gain=ctx.createGain();
      var osc1=ctx.createOscillator();
      var osc2=ctx.createOscillator();

      // スマホスピーカーでも聞こえやすい帯域。
      osc1.type="sine";
      osc2.type="sawtooth";
      osc1.frequency.setValueAtTime(176,ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(118,ctx.currentTime+2.35);
      osc2.frequency.setValueAtTime(91,ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(68,ctx.currentTime+2.35);

      gain.gain.setValueAtTime(.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.018,ctx.currentTime+.28);
      gain.gain.exponentialRampToValueAtTime(.050,ctx.currentTime+2.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      state.audioGain=gain;
      state.audioOsc1=osc1;
      state.audioOsc2=osc2;
      state.audioStarted=true;
    }catch(e){}
  }

  function armEntryTone(){
    var ctx=state.audioCtx;
    var gain=state.audioGain;
    if(!ctx || !gain) return;

    try{
      var now=ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(.001,gain.gain.value||.025),now);
      gain.gain.exponentialRampToValueAtTime(.085,now+.15);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.48);

      if(state.audioOsc1){
        state.audioOsc1.frequency.cancelScheduledValues(now);
        state.audioOsc1.frequency.setValueAtTime(118,now);
        state.audioOsc1.frequency.exponentialRampToValueAtTime(74,now+.42);
      }
      if(state.audioOsc2){
        state.audioOsc2.frequency.cancelScheduledValues(now);
        state.audioOsc2.frequency.setValueAtTime(68,now);
        state.audioOsc2.frequency.exponentialRampToValueAtTime(44,now+.42);
      }
    }catch(e){}
  }

  function removeEntryEffect(){
    if(state.audioDelayTimer) clearTimeout(state.audioDelayTimer);
    state.audioDelayTimer=0;
    var layer=state.effectLayer || document.getElementById("cardEntryEffectLayer");
    if(layer) layer.remove();
    state.effectLayer=null;
    state.effectCard=null;
    document.body.classList.remove("card-entry-effect-active","card-entry-effect-armed");
    stopEntryTone(false);
  }

  function startEntryEffect(context,point){
    ensureEntryEffectStyle();
    removeEntryEffect();

    var layer=document.createElement("div");
    layer.id="cardEntryEffectLayer";
    layer.style.setProperty("--entry-x",Number(point.clientX||window.innerWidth/2)+"px");
    layer.style.setProperty("--entry-y",Number(point.clientY||window.innerHeight/2)+"px");
    layer.innerHTML=
      '<div class="ce-entry-label">BUG PLAYGROUND<br>ENTERING...</div>'+
      '<div class="ce-entry-scan"></div>'+
      '<div class="ce-entry-edge"></div>'+
      '<div class="ce-entry-breath"></div>'+
      '<div class="ce-entry-corrupt"></div>'+
      '<div class="ce-entry-flicker"></div>'+
      '<div class="ce-entry-observed">YOU ARE BEING OBSERVED.</div>';

    document.body.appendChild(layer);
    state.effectLayer=layer;
    document.body.classList.add("card-entry-effect-active");

    requestAnimationFrame(function(){
      if(!layer.isConnected) return;
      layer.classList.add("show","charging");
    });

    if(state.audioDelayTimer) clearTimeout(state.audioDelayTimer);
    state.audioDelayTimer=setTimeout(function(){
      state.audioDelayTimer=0;
      if(state.active && state.effectLayer && state.effectLayer.isConnected){
        startEntryTone();
      }
    },1100);
  }

  function armEntryEffect(){
    var layer=state.effectLayer;
    document.body.classList.add("card-entry-effect-armed");
    if(layer) layer.classList.add("armed");
    armEntryTone();
  }

  function clearTimer(){
    if(state.timer) clearTimeout(state.timer);
    state.timer = 0;
  }

  function reset(){
    clearTimer();
    state.active = false;
    state.armed = false;
    state.context = null;
    removeEntryEffect();
  }

  function begin(context, point){
    reset();

    // 裏面では長押しを開始しない。
    if(!context || context.front !== true) return false;
    if(!point) return false;

    state.active = true;
    state.startX = Number(point.clientX || 0);
    state.startY = Number(point.clientY || 0);
    state.context = context;

    startEntryEffect(context,point);

    state.timer = setTimeout(function(){
      if(!state.active) return;
      state.armed = true;

      // 長押し成立。
      // ここではPLAYGROUNDを開かず、吸い込み演出だけ開始する。
      armEntryEffect();
    }, HOLD_MS);

    return true;
  }

  function move(point){
    if(!state.active || !point) return;
    var dx = Number(point.clientX || 0) - state.startX;
    var dy = Number(point.clientY || 0) - state.startY;
    if(Math.max(Math.abs(dx),Math.abs(dy)) >= MOVE_CANCEL){
      reset();
    }
  }

  function end(point){
    clearTimer();

    if(!state.active || !state.armed || !state.context){
      reset();
      return false;
    }

    var context = state.context;
    var index = resolveIndex(context);

    clearTimer();
    state.active=false;
    state.armed=false;
    state.context=null;

    if(index < 0){
      removeEntryEffect();
      return false;
    }

    // 吸い込み演出を少し見せてからPLAYGROUNDへ入る。
    setTimeout(function(){
      try{
        if(window.MEGANE_BUG_PLAYGROUND &&
           typeof window.MEGANE_BUG_PLAYGROUND.open === "function"){
          window.MEGANE_BUG_PLAYGROUND.open(index);
        }
      }catch(e){
        console.error("[CARD LONGPRESS] playground open failed",e);
      }

      setTimeout(removeEntryEffect,90);
    },420);

    return true;
  }

  function isManagedCardTarget(target){
    if(!target || !target.closest) return false;
    return !!target.closest(
      "#flipCard,#fullscreenCard,#binderViewerCard,#binderReplayFlipCard"
    );
  }

  // iPhone Safariの画像長押し選択・ドラッグプレビューを禁止。
  document.addEventListener("dragstart",function(e){
    if(!isManagedCardTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  },true);

  document.addEventListener("contextmenu",function(e){
    if(!isManagedCardTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  },true);

  document.addEventListener("selectstart",function(e){
    if(!isManagedCardTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  },true);

  window.MEGANE_CARD_LONGPRESS = {
    version:"v1.031-ios-image-drag-fix",
    begin:begin,
    move:move,
    end:end,
    cancel:reset,
    resolveIndex:resolveIndex
  };
})();