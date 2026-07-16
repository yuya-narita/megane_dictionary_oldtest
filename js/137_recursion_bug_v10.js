/* 137_recursion_bug_v10.js
   SYNTAX FRONTIER INC.
   BUG No.023 — RECURSION BUG
   ENDLESS STACK v1.0 / PHASE 4 + DEVELOPER TEST PANEL

   Stable falling-block foundation:
   - 10x20 field, seven-bag pieces, line compression, score/level/lines.
   - NEXT preview, ghost piece, pause/restart/quit.
   - Virtual three-way stick: left / soft drop / right without lifting a finger.
   - A hard-drops with a lock delay; pressing A again confirms the lock.
   - Upward field swipe swaps the active piece with NEXT once per piece.
   - Narrower down-stick zone reduces accidental soft drops.
   - Phase 3: top-out expands upward; first completed lines after each vertical expansion reveal hidden side columns.
   - Expansion sequence: 10x20 -> 10x28 -> 14x28 -> 14x40 -> 20x40.
   - Core controls and normal falling-block rules remain unchanged.
   - 30 lines expands to 28x56; 60 lines expands to 40x80.
   - Final top-out at 40x80 triggers a retro pixel zoom-out ending.
   - The ending resolves on: THE FIELD HAS NO END.
*/
(function(){
  "use strict";

  var root=null,raf=0,state=null,audio=null;
  var viewportMeta=null,savedViewportContent=null;
  var zoomGuardHandlers=null;
  var keys={left:false,right:false,down:false};
  var keyRepeat={dir:0,delay:0,clock:0};
  var stick={active:false,pointerId:null,dir:"none",repeatTimer:0,delayTimer:0};
  var devPressTimer=0;
  var devReturnMode="play";

  var START_COLS=10,START_ROWS=20;
  var COLS=START_COLS,ROWS=START_ROWS;
  var LOCK_DELAY=620;
  var MAX_LOCK_RESETS=12;
  var COLORS={I:"#5ed8ff",O:"#ffd75d",T:"#b98bff",L:"#ff9e56",J:"#668dff",S:"#84e06d",Z:"#ff789c"};
  var SHAPES={
    I:[[0,1],[1,1],[2,1],[3,1]], O:[[0,0],[1,0],[0,1],[1,1]],
    T:[[0,0],[1,0],[2,0],[1,1]], L:[[0,0],[0,1],[0,2],[1,2]],
    J:[[1,0],[1,1],[1,2],[0,2]], S:[[1,0],[2,0],[0,1],[1,1]],
    Z:[[0,0],[1,0],[1,1],[2,1]]
  };
  var TYPES=Object.keys(SHAPES);

  function $(sel){return root&&root.querySelector(sel)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function emptyBoard(){var b=[];for(var y=0;y<ROWS;y++)b.push(Array(COLS).fill(null));return b}
  function cloneCells(c){return c.map(function(v){return [v[0],v[1]]})}

  function ensureStyle(){
    if(document.getElementById("recursionBugStyleV10"))return;
    var st=document.createElement("style");st.id="recursionBugStyleV10";
    st.textContent=`
      #recursionBugRoot{position:fixed;inset:0;z-index:2147483500;overflow:hidden;background:#070910;color:#eef6ff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
      #recursionBugRoot *{box-sizing:border-box;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}\n      html:has(#recursionBugRoot),body:has(#recursionBugRoot){overscroll-behavior:none}
      .rb-shell{position:absolute;inset:0;display:grid;grid-template-rows:44px minmax(0,1fr) 132px;padding:max(9px,env(safe-area-inset-top)) 10px max(8px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 18%,rgba(92,126,255,.14),transparent 42%),#070910}
      .rb-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(238,246,255,.18);font-size:10px;letter-spacing:.12em;color:rgba(238,246,255,.65)}
      .rb-head-actions{display:flex;gap:7px}.rb-icon{width:38px;height:38px;border:1px solid rgba(238,246,255,.3);border-radius:7px;background:rgba(255,255,255,.06);color:#fff;font:800 19px/1 system-ui;touch-action:none}
      .rb-main{min-height:0;display:grid;place-items:center;padding:7px 0}
      .rb-stage{position:relative;width:min(100%,520px);height:100%;max-height:720px;overflow:hidden;border:3px solid #788dff;background:#10152a;box-shadow:0 0 0 3px #252d5a,0 18px 48px rgba(0,0,0,.5)}
      .rb-canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none}.rb-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px)}
      .rb-title,.rb-over,.rb-pause{position:absolute;inset:0;z-index:60;display:grid;place-items:center;padding:26px;text-align:center;background:linear-gradient(180deg,#121733,#070910)}
      .rb-over,.rb-pause{display:none;background:rgba(7,9,16,.95)}.rb-over.show,.rb-pause.show{display:grid}
      .rb-logo{font-size:clamp(29px,8vw,53px);font-weight:1000;line-height:.95;letter-spacing:.08em;text-shadow:4px 4px 0 #39448c}.rb-over-title{font-size:clamp(28px,8vw,48px);font-weight:1000;letter-spacing:.1em;text-shadow:4px 4px 0 #39448c}
      .rb-sub{margin-top:18px;font-size:11px;font-weight:900;letter-spacing:.16em;color:#b0beff}.rb-copy{margin-top:18px;font-size:12px;line-height:1.8;color:rgba(238,246,255,.72)}
      .rb-start,.rb-retry,.rb-menu-btn{margin-top:19px;padding:12px 18px;border:2px solid #eef6ff;border-radius:999px;background:transparent;color:#fff;font:900 12px/1 ui-monospace,monospace;letter-spacing:.14em}.rb-menu-btn{display:block;width:210px;margin-left:auto;margin-right:auto}.rb-menu-btn.danger{border-color:#ff8799;color:#ffb5c0}
      .rb-hud{position:absolute;left:8px;right:8px;top:7px;z-index:20;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;font-weight:900;letter-spacing:.07em;text-shadow:1px 1px 0 #000}.rb-hud span:nth-child(2){text-align:center}.rb-hud span:nth-child(3){text-align:right}
      .rb-next{position:absolute;right:8px;top:29px;z-index:20;width:70px;height:66px;border:1px solid rgba(176,190,255,.28);background:rgba(7,9,16,.55);padding:4px}.rb-next-label{font-size:8px;font-weight:900;letter-spacing:.12em;color:#b0beff}.rb-next-canvas{display:block;width:100%;height:46px;image-rendering:pixelated}
      .rb-world-label{position:absolute;right:7px;bottom:6px;z-index:20;font-size:9px;font-weight:900;letter-spacing:.08em;color:rgba(238,246,255,.6);text-shadow:1px 1px 0 #000}
      .rb-event{position:absolute;inset:0;z-index:55;display:none;place-items:center;padding:24px;text-align:center;background:rgba(7,9,16,.72);backdrop-filter:blur(1px)}.rb-event.show{display:grid}.rb-event-panel{min-width:min(82%,360px);padding:18px 20px;border:1px solid rgba(195,206,255,.46);background:rgba(8,11,24,.94);box-shadow:0 0 0 3px rgba(73,88,175,.34),0 18px 50px rgba(0,0,0,.48)}.rb-event-title{font-size:13px;font-weight:1000;line-height:1.55;letter-spacing:.11em;white-space:pre-line}.rb-event-copy{margin-top:11px;font-size:10px;font-weight:900;line-height:1.6;letter-spacing:.1em;color:#b8c4ff;white-space:pre-line}.rb-stage.rb-shake{animation:rbShake .46s steps(2,end)}@keyframes rbShake{0%,100%{transform:translate(0)}20%{transform:translate(-3px,1px)}40%{transform:translate(4px,-1px)}60%{transform:translate(-2px,-1px)}80%{transform:translate(2px,1px)}}
      .rb-controls{width:min(100%,520px);margin:0 auto;display:grid;grid-template-columns:1.42fr .78fr .78fr;gap:13px;align-items:center;padding:10px 3px 0;position:relative}
      .rb-stick{position:relative;height:116px;border:2px solid rgba(159,176,255,.38);border-radius:34px;background:linear-gradient(145deg,rgba(42,50,87,.95),rgba(12,16,31,.96));box-shadow:inset 2px 2px 0 rgba(255,255,255,.07),inset -5px -6px 12px rgba(0,0,0,.38),0 8px 18px rgba(0,0,0,.30);touch-action:none;overflow:hidden}
      .rb-stick::before,.rb-stick::after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:linear-gradient(145deg,#303a67,#171d39);border:1px solid rgba(172,187,255,.22);box-shadow:inset 1px 1px 0 rgba(255,255,255,.06)}.rb-stick::before{width:77%;height:38px;border-radius:9px}.rb-stick::after{width:38px;height:77%;border-radius:9px}
      .rb-stick-zone{position:absolute;z-index:3;display:grid;place-items:center;color:rgba(238,246,255,.78);font:1000 23px/1 ui-monospace,monospace;text-shadow:0 2px 0 #080b17}.rb-stick-left{left:0;top:0;bottom:0;width:38%}.rb-stick-right{right:0;top:0;bottom:0;width:38%}.rb-stick-down{left:38%;right:38%;top:56%;bottom:0}.rb-stick-center{position:absolute;z-index:4;left:50%;top:50%;width:34px;height:34px;transform:translate(-50%,-50%);border:2px solid rgba(187,199,255,.34);border-radius:50%;background:radial-gradient(circle at 35% 30%,#586597,#252d58 48%,#151a34 72%);box-shadow:0 4px 8px rgba(0,0,0,.38),inset 1px 1px 0 rgba(255,255,255,.11);pointer-events:none;transition:transform .07s ease,filter .07s ease}.rb-stick[data-dir="left"] .rb-stick-center{transform:translate(calc(-50% - 35px),-50%);filter:brightness(1.22)}.rb-stick[data-dir="right"] .rb-stick-center{transform:translate(calc(-50% + 35px),-50%);filter:brightness(1.22)}.rb-stick[data-dir="down"] .rb-stick-center{transform:translate(-50%,calc(-50% + 34px));filter:brightness(1.22)}
      .rb-btn{height:82px;border:2px solid rgba(193,203,255,.35);border-radius:50%;background:radial-gradient(circle at 34% 28%,#414a75,#1d233f 58%,#101426 80%);color:#eef6ff;font:1000 25px/1 ui-monospace,monospace;touch-action:none;box-shadow:inset 2px 2px 0 rgba(255,255,255,.10),inset -5px -6px 12px rgba(0,0,0,.36),0 8px 16px rgba(0,0,0,.32);transform:rotate(-7deg)}.rb-a{transform:rotate(7deg);border-color:rgba(255,216,103,.60);color:#ffe888;background:radial-gradient(circle at 34% 28%,#706233,#332d19 58%,#17140c 82%)}.rb-btn:active{filter:brightness(1.26);transform:rotate(-7deg) translateY(2px) scale(.97)}.rb-a:active{transform:rotate(7deg) translateY(2px) scale(.97)}.rb-key{display:block;font-size:8px;margin-top:7px;letter-spacing:.09em;opacity:.67}
      .rb-dev{position:absolute;inset:0;z-index:140;display:none;overflow:auto;padding:max(18px,env(safe-area-inset-top)) 14px max(24px,env(safe-area-inset-bottom));background:rgba(3,5,11,.97);color:#eef6ff;touch-action:none}
      .rb-dev.show{display:block}.rb-dev-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:2;padding:7px 0 12px;background:rgba(3,5,11,.97);border-bottom:1px solid rgba(176,190,255,.28)}
      .rb-dev-title{font-size:15px;font-weight:1000;letter-spacing:.12em}.rb-dev-close{width:42px;height:38px;border:1px solid rgba(238,246,255,.35);border-radius:8px;background:#11172d;color:#fff;font:900 20px/1 system-ui}
      .rb-dev-status{margin:12px 0;padding:11px;border:1px solid rgba(120,141,255,.38);background:#0c1122;font-size:10px;line-height:1.65;letter-spacing:.07em;white-space:pre-line}
      .rb-dev-section{margin-top:15px}.rb-dev-label{margin-bottom:7px;font-size:10px;font-weight:1000;letter-spacing:.14em;color:#b0beff}
      .rb-dev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.rb-dev-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.rb-dev-grid.seven{grid-template-columns:repeat(4,minmax(0,1fr))}
      .rb-dev-btn{min-height:42px;padding:8px 6px;border:1px solid rgba(176,190,255,.32);border-radius:7px;background:linear-gradient(180deg,#171e3a,#0c1122);color:#eef6ff;font:900 10px/1.25 ui-monospace,monospace;letter-spacing:.04em}
      .rb-dev-btn:active{filter:brightness(1.35);transform:translateY(1px)}.rb-dev-btn.hot{border-color:#ffe47a;color:#ffe47a}.rb-dev-btn.danger{border-color:#ff8096;color:#ffb0bd}
      .rb-dev-note{margin-top:14px;font-size:9px;line-height:1.6;color:rgba(238,246,255,.48)}
      .rb-cosmos{position:absolute;inset:0;z-index:58;display:none;overflow:hidden;background:#03050a;pointer-events:none}.rb-cosmos.show{display:block}.rb-stars{position:absolute;inset:-20%;opacity:0;background-image:radial-gradient(circle,#fff 0 1px,transparent 1.5px),radial-gradient(circle,#a8c9ff 0 1px,transparent 1.5px);background-size:43px 47px,71px 67px;background-position:0 0,19px 23px;animation:rbStarsIn 2.3s ease 3.1s forwards}.rb-land{position:absolute;left:50%;top:50%;width:150%;height:150%;transform:translate(-50%,-50%) scale(.82);opacity:0;background:radial-gradient(ellipse at 50% 52%,#5d7b3c 0 20%,#8f7b48 21% 31%,#2f5d7a 32% 49%,#1b2b45 50% 100%);image-rendering:pixelated;animation:rbLandIn 2.4s steps(10,end) .65s forwards}.rb-clouds{position:absolute;inset:-10%;opacity:0;background:radial-gradient(ellipse at 25% 43%,rgba(235,243,255,.72) 0 5%,transparent 6%),radial-gradient(ellipse at 64% 35%,rgba(235,243,255,.66) 0 6%,transparent 7%),radial-gradient(ellipse at 79% 61%,rgba(235,243,255,.62) 0 5%,transparent 6%);animation:rbCloudPass 2.3s ease 1.25s forwards}.rb-earth{position:absolute;left:50%;top:50%;width:min(76vw,420px);aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%) scale(2.8) rotate(-8deg);opacity:0;background:radial-gradient(circle at 38% 34%,#9fd8ff 0 9%,#4ea1d0 10% 54%,#16324d 55% 100%);box-shadow:inset -32px -26px 0 rgba(0,0,0,.28),0 0 55px rgba(92,172,255,.3);overflow:hidden;image-rendering:pixelated;animation:rbEarthIn 3s cubic-bezier(.14,.78,.18,1) 2.45s forwards,rbEarthTurn 8s linear 5.4s infinite}.rb-earth::before{content:"";position:absolute;inset:12%;background:#6f9c4d;clip-path:polygon(8% 19%,27% 6%,44% 16%,49% 31%,65% 35%,82% 51%,69% 69%,47% 62%,31% 78%,12% 66%,20% 47%);box-shadow:70px 46px 0 #8d814e,-45px 77px 0 #6a8e45}.rb-earth::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 2px,transparent 2px 7px)}.rb-field-dot{position:absolute;left:61%;top:42%;width:8px;height:8px;border-radius:2px;background:#fff9a5;box-shadow:0 0 8px #fff,0 0 18px #ffd85b;opacity:0;animation:rbDotBlink .7s steps(1,end) 5.7s infinite}.rb-current{position:absolute;left:50%;top:72%;transform:translateX(-50%);font-size:10px;font-weight:1000;letter-spacing:.16em;color:#d9e6ff;opacity:0;animation:rbTextIn .8s ease 5.6s forwards}.rb-ending-title{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;font-size:clamp(34px,10vw,76px);font-weight:1000;line-height:1.06;letter-spacing:.08em;color:#fff;opacity:0;background:rgba(1,2,6,.86);text-shadow:5px 5px 0 #283461;animation:rbFinalIn 1.8s ease 8.2s forwards}.rb-ending-return{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:70;opacity:0;pointer-events:none;padding:11px 18px;border:2px solid rgba(255,255,255,.7);border-radius:999px;background:rgba(7,9,16,.78);color:#fff;font:900 11px/1 ui-monospace,monospace;letter-spacing:.12em}.rb-ending-return.show{opacity:1;pointer-events:auto}.rb-stage.rb-ending .rb-canvas{transform-origin:50% 50%;animation:rbBoardAway 5.2s cubic-bezier(.12,.78,.18,1) forwards}.rb-stage.rb-ending .rb-hud,.rb-stage.rb-ending .rb-next,.rb-stage.rb-ending .rb-world-label,.rb-stage.rb-ending .rb-scan{animation:rbHudOut .8s ease forwards}.rb-stage.rb-ending{animation:rbFinalShake .75s steps(3,end)}@keyframes rbBoardAway{0%{transform:scale(1) rotate(0);filter:brightness(1)}18%{transform:scale(.72) rotate(-1deg)}48%{transform:scale(.18) rotate(-3deg);filter:brightness(1.15)}72%{transform:scale(.045) rotate(-5deg);filter:brightness(1.5)}100%{transform:scale(.012) rotate(-7deg);filter:brightness(2)}}@keyframes rbHudOut{to{opacity:0}}@keyframes rbFinalShake{0%,100%{transform:none}25%{transform:translate(-3px,2px)}50%{transform:translate(4px,-2px)}75%{transform:translate(-2px,-1px)}}@keyframes rbLandIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.82)}40%{opacity:1}100%{opacity:.45;transform:translate(-50%,-50%) scale(.14)}}@keyframes rbCloudPass{0%{opacity:0;transform:translateX(-8%)}25%{opacity:.8}100%{opacity:0;transform:translateX(18%) scale(.62)}}@keyframes rbStarsIn{to{opacity:1;transform:scale(.92)}}@keyframes rbEarthIn{0%{opacity:0;transform:translate(-50%,-50%) scale(2.8) rotate(-8deg)}30%{opacity:1}100%{opacity:1;transform:translate(-50%,-50%) scale(.58) rotate(-12deg)}}@keyframes rbEarthTurn{to{transform:translate(-50%,-50%) scale(.58) rotate(348deg)}}@keyframes rbDotBlink{0%,49%{opacity:1}50%,100%{opacity:.12}}@keyframes rbTextIn{to{opacity:1}}@keyframes rbFinalIn{0%{opacity:0;letter-spacing:.28em}100%{opacity:1;letter-spacing:.08em}}
      @media(max-height:690px){.rb-shell{grid-template-rows:42px minmax(0,1fr) 105px}.rb-stick{height:92px}.rb-btn{height:70px}.rb-controls{gap:9px}}
    `;document.head.appendChild(st);
  }

  function tone(freq,dur,vol,type){try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio||audio.state==="closed")audio=new AC();if(audio.state==="suspended")audio.resume();var o=audio.createOscillator(),g=audio.createGain();o.type=type||"square";o.frequency.value=freq;g.gain.setValueAtTime(vol||.02,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}}

  function newState(){COLS=START_COLS;ROWS=START_ROWS;return {mode:"title",grid:emptyBoard(),piece:null,nextType:null,bag:[],score:0,lines:0,level:1,last:0,fallClock:0,fallMs:720,grounded:false,lockClock:0,lockResets:0,hardDropped:false,swapUsed:false,verticalExpansions:0,horizontalExpansions:0,pendingSpawnType:null,eventTimer:0,lineExpansion30:false,lineExpansion60:false,endingTimer:0,debugFrozen:false,debugSpeed:1}}

  function installZoomGuard(){
    if(!root)return;
    viewportMeta=document.querySelector('meta[name="viewport"]');
    if(!viewportMeta){
      viewportMeta=document.createElement("meta");
      viewportMeta.name="viewport";
      document.head.appendChild(viewportMeta);
      savedViewportContent=null;
    }else{
      savedViewportContent=viewportMeta.getAttribute("content");
    }
    var current=savedViewportContent||"width=device-width, initial-scale=1";
    var parts=current.split(",").map(function(v){return v.trim()}).filter(Boolean);
    parts=parts.filter(function(v){return !/^(maximum-scale|minimum-scale|user-scalable)\s*=/.test(v)});
    parts.push("maximum-scale=1","minimum-scale=1","user-scalable=no");
    viewportMeta.setAttribute("content",parts.join(", "));

    function inside(e){return !!(root&&e.target&&root.contains(e.target))}
    function stopNativeZoom(e){if(inside(e)){e.preventDefault()}}
    function stopDoubleTap(e){if(inside(e)){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}}
    zoomGuardHandlers={stopNativeZoom:stopNativeZoom,stopDoubleTap:stopDoubleTap};
    document.addEventListener("gesturestart",stopNativeZoom,{capture:true,passive:false});
    document.addEventListener("gesturechange",stopNativeZoom,{capture:true,passive:false});
    document.addEventListener("gestureend",stopNativeZoom,{capture:true,passive:false});
    document.addEventListener("dblclick",stopDoubleTap,true);
    root.addEventListener("touchstart",stopNativeZoom,{capture:true,passive:false});
    root.addEventListener("touchmove",stopNativeZoom,{capture:true,passive:false});
    root.addEventListener("touchend",stopNativeZoom,{capture:true,passive:false});
  }

  function removeZoomGuard(){
    if(zoomGuardHandlers){
      document.removeEventListener("gesturestart",zoomGuardHandlers.stopNativeZoom,true);
      document.removeEventListener("gesturechange",zoomGuardHandlers.stopNativeZoom,true);
      document.removeEventListener("gestureend",zoomGuardHandlers.stopNativeZoom,true);
      document.removeEventListener("dblclick",zoomGuardHandlers.stopDoubleTap,true);
      zoomGuardHandlers=null;
    }
    if(viewportMeta){
      if(savedViewportContent==null){
        if(viewportMeta.parentNode)viewportMeta.remove();
      }else{
        viewportMeta.setAttribute("content",savedViewportContent);
      }
    }
    viewportMeta=null;savedViewportContent=null;
  }

  function nextFromBag(){if(!state.bag.length){state.bag=TYPES.slice();for(var i=state.bag.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=state.bag[i];state.bag[i]=state.bag[j];state.bag[j]=t}}return state.bag.pop()}

  function open(){
    close();ensureStyle();state=newState();
    root=document.createElement("section");root.id="recursionBugRoot";
    root.innerHTML=`<div class="rb-shell">
      <header class="rb-head"><span>SYNTAX FRONTIER INC. / BUG No.023</span><div class="rb-head-actions"><button type="button" class="rb-icon rb-pause-btn" aria-label="一時停止">Ⅱ</button><button type="button" class="rb-icon rb-close" aria-label="閉じる">×</button></div></header>
      <main class="rb-main"><div class="rb-stage"><canvas class="rb-canvas"></canvas><div class="rb-scan"></div>
        <div class="rb-hud"><span>SCORE <b class="rb-score">000000</b></span><span>LINES <b class="rb-lines">000</b></span><span>LEVEL <b class="rb-level">01</b></span></div>
        <div class="rb-next"><div class="rb-next-label">NEXT</div><canvas class="rb-next-canvas"></canvas></div><div class="rb-world-label">FIELD 10×20</div><div class="rb-event"><div class="rb-event-panel"><div class="rb-event-title"></div><div class="rb-event-copy"></div></div></div><div class="rb-cosmos"><div class="rb-stars"></div><div class="rb-land"></div><div class="rb-clouds"></div><div class="rb-earth"><i class="rb-field-dot"></i></div><div class="rb-current">CURRENT FIELD</div><div class="rb-ending-title">THE FIELD<br>HAS NO END.</div><button type="button" class="rb-ending-return">RETURN</button></div>
        <div class="rb-dev">
          <div class="rb-dev-head"><div class="rb-dev-title">FIELD TEST / DEV</div><button type="button" class="rb-dev-close">×</button></div>
          <div class="rb-dev-status"></div>
          <div class="rb-dev-section"><div class="rb-dev-label">FIELD JUMP</div><div class="rb-dev-grid">
            <button class="rb-dev-btn" data-dev-field="10x20">10×20</button><button class="rb-dev-btn" data-dev-field="10x28">10×28</button>
            <button class="rb-dev-btn" data-dev-field="14x28">14×28</button><button class="rb-dev-btn" data-dev-field="14x40">14×40</button>
            <button class="rb-dev-btn" data-dev-field="20x40">20×40</button><button class="rb-dev-btn" data-dev-field="28x56">28×56 / 30L</button>
            <button class="rb-dev-btn" data-dev-field="40x80">40×80 / 60L</button><button class="rb-dev-btn hot" data-dev-action="final-ready">FINAL READY</button>
          </div></div>
          <div class="rb-dev-section"><div class="rb-dev-label">LINE TEST</div><div class="rb-dev-grid three">
            <button class="rb-dev-btn" data-dev-lines="1">+1</button><button class="rb-dev-btn" data-dev-lines="5">+5</button><button class="rb-dev-btn" data-dev-lines="10">+10</button>
            <button class="rb-dev-btn" data-dev-set-lines="29">SET 29</button><button class="rb-dev-btn" data-dev-set-lines="59">SET 59</button><button class="rb-dev-btn" data-dev-set-lines="0">RESET</button>
          </div></div>
          <div class="rb-dev-section"><div class="rb-dev-label">EVENT TEST</div><div class="rb-dev-grid">
            <button class="rb-dev-btn" data-dev-action="top-expand">TOP EXPAND</button><button class="rb-dev-btn" data-dev-action="side-expand">SIDE EXPAND</button>
            <button class="rb-dev-btn" data-dev-action="expand-30">30L EXPAND</button><button class="rb-dev-btn" data-dev-action="expand-60">60L EXPAND</button>
            <button class="rb-dev-btn hot" data-dev-action="final-zoom">FINAL ZOOM</button><button class="rb-dev-btn hot" data-dev-action="ending-text">ENDING TEXT</button>
          </div></div>
          <div class="rb-dev-section"><div class="rb-dev-label">BLOCK TEST</div><div class="rb-dev-grid seven">
            <button class="rb-dev-btn" data-dev-block="I">I</button><button class="rb-dev-btn" data-dev-block="O">O</button><button class="rb-dev-btn" data-dev-block="T">T</button><button class="rb-dev-btn" data-dev-block="S">S</button>
            <button class="rb-dev-btn" data-dev-block="Z">Z</button><button class="rb-dev-btn" data-dev-block="J">J</button><button class="rb-dev-btn" data-dev-block="L">L</button>
          </div></div>
          <div class="rb-dev-section"><div class="rb-dev-label">SPEED / FREEZE</div><div class="rb-dev-grid three">
            <button class="rb-dev-btn" data-dev-speed="0.25">0.25×</button><button class="rb-dev-btn" data-dev-speed="0.5">0.5×</button><button class="rb-dev-btn" data-dev-speed="1">1×</button>
            <button class="rb-dev-btn" data-dev-speed="2">2×</button><button class="rb-dev-btn" data-dev-speed="4">4×</button><button class="rb-dev-btn" data-dev-action="freeze">FREEZE</button>
          </div></div>
          <div class="rb-dev-note">OPEN: “SYNTAX FRONTIER INC.” long press / keyboard F2</div>
        </div>
        <div class="rb-title"><div><div class="rb-logo">ENDLESS<br>STACK</div><div class="rb-sub">RECURSION BUG / 199X</div><div class="rb-copy">Keep stacking.<br>We'll make room.</div><button type="button" class="rb-start">PRESS START</button></div></div>
        <div class="rb-over"><div><div class="rb-over-title">GAME OVER</div><div class="rb-copy rb-result"></div><button type="button" class="rb-retry">RETRY</button></div></div>
        <div class="rb-pause"><div><div class="rb-over-title">PAUSED</div><button type="button" class="rb-menu-btn rb-resume">RESUME</button><button type="button" class="rb-menu-btn rb-restart">RESTART</button><button type="button" class="rb-menu-btn danger rb-quit">QUIT</button></div></div>
      </div></main>
      <div class="rb-controls"><div class="rb-stick" data-dir="none" aria-label="移動スティック"><div class="rb-stick-zone rb-stick-left">◀</div><div class="rb-stick-zone rb-stick-right">▶</div><div class="rb-stick-zone rb-stick-down">▼</div><div class="rb-stick-center"></div></div><button type="button" class="rb-btn rb-b">B<span class="rb-key">ROTATE</span></button><button type="button" class="rb-btn rb-a">A<span class="rb-key">DROP</span></button></div>
    </div>`;
    document.body.appendChild(root);
    installZoomGuard();
    $(".rb-close").addEventListener("pointerup",stopEventClose,true);$(".rb-pause-btn").addEventListener("pointerup",function(e){block(e);togglePause()},true);
    $(".rb-start").addEventListener("pointerup",function(e){block(e);start()},true);$(".rb-retry").addEventListener("pointerup",function(e){block(e);start()},true);
    $(".rb-resume").addEventListener("pointerup",function(e){block(e);resume()},true);$(".rb-restart").addEventListener("pointerup",function(e){block(e);start()},true);$(".rb-quit").addEventListener("pointerup",stopEventClose,true);$(".rb-ending-return").addEventListener("pointerup",stopEventClose,true);
    $(".rb-b").addEventListener("pointerdown",function(e){block(e);rotate()},true);$(".rb-a").addEventListener("pointerdown",function(e){block(e);hardDrop()},true);
    bindDeveloperPanel();
    bindStick();bindGestures();window.addEventListener("keydown",keydown,true);window.addEventListener("keyup",keyup,true);resize();draw();drawNext();
  }
  function block(e){if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}}
  function stopEventClose(e){block(e);close()}

  function bindDeveloperPanel(){
    var header=root.querySelector(".rb-head > span"),panel=$(".rb-dev");
    function cancelPress(){if(devPressTimer)clearTimeout(devPressTimer);devPressTimer=0}
    header.addEventListener("pointerdown",function(e){block(e);cancelPress();devPressTimer=setTimeout(openDeveloper,760)},true);
    header.addEventListener("pointerup",function(e){block(e);cancelPress()},true);
    header.addEventListener("pointercancel",cancelPress,true);
    $(".rb-dev-close").addEventListener("pointerup",function(e){block(e);closeDeveloper()},true);
    panel.addEventListener("pointerdown",function(e){block(e)},true);
    panel.addEventListener("click",function(e){
      var b=e.target.closest(".rb-dev-btn");if(!b)return;block(e);
      if(b.dataset.devField)debugFieldJump(b.dataset.devField);
      else if(b.dataset.devLines)debugSetLines(state.lines+Number(b.dataset.devLines));
      else if(b.dataset.devSetLines!=null)debugSetLines(Number(b.dataset.devSetLines));
      else if(b.dataset.devBlock)debugForceBlock(b.dataset.devBlock);
      else if(b.dataset.devSpeed)debugSpeed(Number(b.dataset.devSpeed));
      else if(b.dataset.devAction)debugAction(b.dataset.devAction);
      updateDeveloperStatus();
    },true);
  }
  function openDeveloper(){
    if(!root||!state)return;
    cancelAnimationFrame(raf);raf=0;clearStickTimers();keys.left=keys.right=keys.down=false;
    devReturnMode=state.mode==="play"?"play":state.mode;state.mode="debug";
    $(".rb-dev").classList.add("show");updateDeveloperStatus();tone(520,.05,.012);
  }
  function closeDeveloper(){
    if(!root||!state)return;$(".rb-dev").classList.remove("show");
    state.mode=devReturnMode==="play"?"play":devReturnMode;
    if(state.mode==="play"){state.last=performance.now();raf=requestAnimationFrame(loop)}
  }
  function updateDeveloperStatus(){
    var el=$(".rb-dev-status");if(!el||!state)return;
    el.textContent="FIELD "+COLS+"×"+ROWS+"   LINES "+state.lines+"\nMODE "+state.mode+"   SPEED "+state.debugSpeed+"×   FREEZE "+(state.debugFrozen?"ON":"OFF")+"\nNEXT EVENT "+debugNextEvent();
  }
  function debugNextEvent(){
    if(COLS===10&&ROWS===20)return "TOP → 10×28";
    if(COLS===10&&ROWS===28)return "LINE → 14×28";
    if(COLS===14&&ROWS===28)return "TOP → 14×40";
    if(COLS===14&&ROWS===40)return "LINE → 20×40";
    if(COLS===20&&ROWS===40)return "30 LINES → 28×56";
    if(COLS===28&&ROWS===56)return "60 LINES → 40×80";
    if(COLS===40&&ROWS===80)return "TOP OUT → FINAL ZOOM";
    return "UNDEFINED";
  }
  function debugGrid(cols,rows){
    COLS=cols;ROWS=rows;state.grid=emptyBoard();
    var floor=Math.min(4,ROWS),gap=Math.floor(COLS/2);
    for(var y=ROWS-floor;y<ROWS;y++)for(var x=0;x<COLS;x++){
      if(x===gap||x===gap-1)continue;
      if((x+y)%5!==0)state.grid[y][x]={type:TYPES[(x+y)%TYPES.length]};
    }
    state.piece=null;state.bag=[];state.nextType=nextFromBag();
    state.grounded=false;state.lockClock=0;state.hardDropped=false;state.swapUsed=false;
  }
  function debugFieldJump(code){
    var map={"10x20":[10,20,0,0,0,false,false],"10x28":[10,28,1,0,0,false,false],"14x28":[14,28,1,1,0,false,false],"14x40":[14,40,2,1,0,false,false],"20x40":[20,40,2,2,0,false,false],"28x56":[28,56,2,2,30,true,false],"40x80":[40,80,2,2,60,true,true]};
    var v=map[code];if(!v)return;debugGrid(v[0],v[1]);
    state.verticalExpansions=v[2];state.horizontalExpansions=v[3];state.lines=v[4];
    state.lineExpansion30=v[5];state.lineExpansion60=v[6];
    state.level=Math.floor(state.lines/10)+1;state.fallMs=Math.max(90,720-(state.level-1)*58);
    spawn();hud();resize();draw();
  }
  function debugSetLines(n){state.lines=Math.max(0,Math.floor(n));state.level=Math.floor(state.lines/10)+1;state.fallMs=Math.max(90,720-(state.level-1)*58);hud()}
  function debugForceBlock(type){
    state.nextType=type;
    if(state.piece){state.piece={type:type,cells:cloneCells(SHAPES[type]),x:0,y:-1};normalize(state.piece);state.piece.x=Math.floor((COLS-pieceWidth(state.piece))/2);state.grounded=false;state.hardDropped=false;state.lockClock=0}
    drawNext();draw();
  }
  function debugSpeed(v){state.debugSpeed=v}
  function debugAction(action){
    if(action==="freeze"){state.debugFrozen=!state.debugFrozen;return}
    if(action==="final-ready"){debugFieldJump("40x80");for(var y=0;y<5;y++)for(var x=0;x<COLS;x++)if(x<Math.floor(COLS/2)-2||x>Math.floor(COLS/2)+2)state.grid[y][x]={type:TYPES[(x+y)%TYPES.length]};draw();return}
    closeDeveloper();
    setTimeout(function(){
      if(!root||!state)return;
      if(action==="top-expand"){if(ROWS>=40)debugFieldJump("10x20");state.mode="play";expandVertical(state.piece&&state.piece.type)}
      else if(action==="side-expand"){if(!(COLS===10&&ROWS===28))debugFieldJump("10x28");state.mode="play";state.piece=null;expandHorizontal()}
      else if(action==="expand-30"){if(!(COLS===20&&ROWS===40))debugFieldJump("20x40");state.mode="play";state.piece=null;state.lines=30;state.lineExpansion30=true;expandTo(28,56,"30 LINES",function(){spawn()})}
      else if(action==="expand-60"){if(!(COLS===28&&ROWS===56))debugFieldJump("28x56");state.mode="play";state.piece=null;state.lines=60;state.lineExpansion60=true;expandTo(40,80,"60 LINES",function(){spawn()})}
      else if(action==="final-zoom"){if(!(COLS===40&&ROWS===80))debugFieldJump("40x80");startEnding()}
      else if(action==="ending-text"){if(!(COLS===40&&ROWS===80))debugFieldJump("40x80");startEnding();var title=$(".rb-ending-title");if(title){title.style.animation="none";title.style.opacity="1"}}
    },40);
  }

  function start(){cancelAnimationFrame(raf);clearStickTimers();state=newState();state.mode="play";state.nextType=nextFromBag();$(".rb-title").style.display="none";$(".rb-over").classList.remove("show");$(".rb-pause").classList.remove("show");spawn();hud();resize();state.last=performance.now();raf=requestAnimationFrame(loop);tone(330,.08,.02)}
  function pause(){if(!state||state.mode!=="play")return;state.mode="pause";cancelAnimationFrame(raf);raf=0;keys.left=keys.right=keys.down=false;endStick();$(".rb-pause").classList.add("show")}
  function resume(){if(!state||state.mode!=="pause")return;$(".rb-pause").classList.remove("show");state.mode="play";state.last=performance.now();raf=requestAnimationFrame(loop)}
  function togglePause(){if(!state)return;if(state.mode==="play")pause();else if(state.mode==="pause")resume()}

  function bindStick(){
    var base=$(".rb-stick");
    function dirAt(e){var r=base.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if(y>.66&&x>.40&&x<.60)return "down";if(x<.50)return "left";return "right"}
    function apply(dir,initial){if(!playing())return;if(dir==="left")move(-1);else if(dir==="right")move(1);else if(dir==="down")softDrop();if(initial)tone(270,.025,.006)}
    function setDir(dir){if(stick.dir===dir)return;clearStickTimers();stick.dir=dir;base.dataset.dir=dir;apply(dir,true);stick.delayTimer=setTimeout(function(){stick.repeatTimer=setInterval(function(){apply(stick.dir,false)},stick.dir==="down"?42:82)},stick.dir==="down"?70:175)}
    base.addEventListener("pointerdown",function(e){block(e);if(!playing())return;stick.active=true;stick.pointerId=e.pointerId;try{base.setPointerCapture(e.pointerId)}catch(_){}setDir(dirAt(e))},true);
    base.addEventListener("pointermove",function(e){if(!stick.active||e.pointerId!==stick.pointerId)return;block(e);setDir(dirAt(e))},true);
    base.addEventListener("pointerup",function(e){if(stick.pointerId!==null&&e.pointerId!==stick.pointerId)return;block(e);endStick()},true);base.addEventListener("pointercancel",endStick,true);
  }
  function clearStickTimers(){if(stick.repeatTimer)clearInterval(stick.repeatTimer);if(stick.delayTimer)clearTimeout(stick.delayTimer);stick.repeatTimer=stick.delayTimer=0}
  function endStick(e){if(e)block(e);clearStickTimers();stick.active=false;stick.pointerId=null;stick.dir="none";var b=$(".rb-stick");if(b)b.dataset.dir="none"}

  function bindGestures(){var c=$(".rb-canvas"),sx=0,sy=0,lx=0,moved=false;c.addEventListener("pointerdown",function(e){if(!playing())return;block(e);sx=lx=e.clientX;sy=e.clientY;moved=false;try{c.setPointerCapture(e.pointerId)}catch(_){}},true);c.addEventListener("pointermove",function(e){if(!playing())return;block(e);var dx=e.clientX-lx;if(Math.abs(dx)>22){move(dx>0?1:-1);lx=e.clientX;moved=true}},true);c.addEventListener("pointerup",function(e){if(!playing())return;block(e);var dy=e.clientY-sy,dx=e.clientX-sx;if(dy<-65&&Math.abs(dy)>Math.abs(dx)*1.15)swapWithNext();else if(dy>65&&Math.abs(dy)>Math.abs(dx)*1.05)hardDrop();else if(!moved&&Math.abs(dy)<25)rotate()},true)}

  function keydown(e){if(e.key==="F2"){block(e);if(state&&state.mode==="debug")closeDeveloper();else openDeveloper();return}if(e.key==="Escape"){if(state&&state.mode==="play")pause();else if(state&&state.mode==="pause")resume();else close();return}if(e.key==="p"){togglePause();return}if(!playing())return;if(e.key==="ArrowLeft"||e.key==="a"){if(!keys.left)move(-1);keys.left=true}if(e.key==="ArrowRight"||e.key==="d"){if(!keys.right)move(1);keys.right=true}if(e.key==="ArrowUp"||e.key==="w"||e.key==="x")rotate();if(e.key==="ArrowDown"||e.key==="s")keys.down=true;if(e.key===" "||e.key==="z"){block(e);hardDrop()}}
  function keyup(e){if(e.key==="ArrowLeft"||e.key==="a")keys.left=false;if(e.key==="ArrowRight"||e.key==="d")keys.right=false;if(e.key==="ArrowDown"||e.key==="s")keys.down=false}
  function playing(){return !!(root&&state&&state.mode==="play"&&state.piece)}

  function updateFieldLabel(){var el=$(".rb-world-label");if(el)el.textContent="FIELD "+COLS+"×"+ROWS}
  function showEvent(title,copy,duration,done){if(!root||!state)return;cancelAnimationFrame(raf);raf=0;state.mode="event";keys.left=keys.right=keys.down=false;endStick();var box=$(".rb-event"),stageEl=$(".rb-stage");$(".rb-event-title").textContent=title;$(".rb-event-copy").textContent=copy||"";box.classList.add("show");stageEl.classList.remove("rb-shake");void stageEl.offsetWidth;stageEl.classList.add("rb-shake");tone(105,.18,.025,"sawtooth");setTimeout(function(){tone(165,.15,.018,"square")},180);clearTimeout(state.eventTimer);state.eventTimer=setTimeout(function(){if(!root||!state)return;box.classList.remove("show");stageEl.classList.remove("rb-shake");if(done)done();if(state&&state.mode==="event"){state.mode="play";state.last=performance.now();raf=requestAnimationFrame(loop)}},duration||1050)}
  function expandVertical(type){var oldRows=ROWS,add=state.verticalExpansions===0?8:12;ROWS+=add;for(var i=0;i<add;i++)state.grid.unshift(Array(COLS).fill(null));state.verticalExpansions++;state.pendingSpawnType=type||null;updateFieldLabel();showEvent("NO SPACE\nGAME OVER CANCELLED","FIELD "+COLS+"×"+oldRows+"  →  "+COLS+"×"+ROWS+"\nWE'LL MAKE ROOM.",1180,function(){var t=state.pendingSpawnType;state.pendingSpawnType=null;if(t)spawn(t);else if(!state.piece)spawn();hud();draw()})}
  function expandHorizontal(){var oldCols=COLS,addEach=state.horizontalExpansions===0?2:3;COLS+=addEach*2;state.grid=state.grid.map(function(row){return Array(addEach).fill(null).concat(row,Array(addEach).fill(null))});state.horizontalExpansions++;updateFieldLabel();showEvent("LINE COMPLETE\nFIELD LIMIT INCORRECT","FIELD "+oldCols+"×"+ROWS+"  →  "+COLS+"×"+ROWS+"\nHIDDEN AREA FOUND",1250,function(){spawn();hud();draw()})}
  function expandTo(targetCols,targetRows,label,done){var oldCols=COLS,oldRows=ROWS,addTop=Math.max(0,targetRows-ROWS),addTotal=Math.max(0,targetCols-COLS),addLeft=Math.floor(addTotal/2),addRight=addTotal-addLeft;for(var i=0;i<addTop;i++)state.grid.unshift(Array(COLS).fill(null));if(addTotal){state.grid=state.grid.map(function(row){return Array(addLeft).fill(null).concat(row,Array(addRight).fill(null))})}COLS=targetCols;ROWS=targetRows;updateFieldLabel();showEvent("FIELD EXPANDED",label+"\n"+oldCols+"×"+oldRows+"  →  "+COLS+"×"+ROWS,1450,function(){if(done)done();hud();draw()})}
  function mayExpandHorizontal(cleared){return cleared>0&&state.verticalExpansions>state.horizontalExpansions&&state.horizontalExpansions<2}
  function thresholdExpansion(previousLines){if(COLS===20&&ROWS===40&&!state.lineExpansion30&&previousLines<30&&state.lines>=30){state.lineExpansion30=true;expandTo(28,56,"30 LINES",function(){spawn()});return true}if(COLS===28&&ROWS===56&&!state.lineExpansion60&&previousLines<60&&state.lines>=60){state.lineExpansion60=true;expandTo(40,80,"60 LINES",function(){spawn()});return true}return false}
  function startEnding(){if(!root||!state||state.mode==="ending")return;cancelAnimationFrame(raf);raf=0;state.mode="ending";state.piece=null;keys.left=keys.right=keys.down=false;endStick();var stageEl=$(".rb-stage"),cosmos=$(".rb-cosmos");stageEl.classList.add("rb-ending");cosmos.classList.add("show");tone(90,.35,.028,"sawtooth");setTimeout(function(){tone(135,.45,.022,"triangle")},300);setTimeout(function(){tone(220,.9,.016,"sine")},900);setTimeout(function(){try{if(audio&&audio.state!=="closed")audio.suspend()}catch(e){}},4300);clearTimeout(state.endingTimer);state.endingTimer=setTimeout(function(){var b=$(".rb-ending-return");if(b)b.classList.add("show")},10400)}

  function spawn(forcedType){var type=forcedType||state.nextType||nextFromBag();if(!forcedType)state.nextType=nextFromBag();state.piece={type:type,cells:cloneCells(SHAPES[type]),x:0,y:-1};normalize(state.piece);state.piece.x=Math.floor((COLS-pieceWidth(state.piece))/2)-minX(state.piece);state.grounded=false;state.lockClock=0;state.lockResets=0;state.hardDropped=false;state.swapUsed=false;if(collides(state.piece,0,0)){if(COLS===40&&ROWS===80){state.piece=null;startEnding();return}if(state.verticalExpansions<2){state.piece=null;expandVertical(type);return}else gameOver()}drawNext()}
  function minX(p){return Math.min.apply(null,p.cells.map(function(c){return c[0]}))}function maxX(p){return Math.max.apply(null,p.cells.map(function(c){return c[0]}))}function minY(p){return Math.min.apply(null,p.cells.map(function(c){return c[1]}))}function pieceWidth(p){return maxX(p)-minX(p)+1}
  function normalize(p){var mx=minX(p),my=minY(p);p.cells=p.cells.map(function(c){return [c[0]-mx,c[1]-my]})}
  function absoluteCells(p,dx,dy,cells){return (cells||p.cells).map(function(c){return{x:p.x+c[0]+(dx||0),y:p.y+c[1]+(dy||0)}})}
  function collides(p,dx,dy,cells){var a=absoluteCells(p,dx,dy,cells);for(var i=0;i<a.length;i++){var q=a[i];if(q.x<0||q.x>=COLS||q.y>=ROWS)return true;if(q.y>=0&&state.grid[q.y][q.x])return true}return false}
  function resetLockAfterAction(){if(!state.grounded)return;if(state.lockResets<MAX_LOCK_RESETS){state.lockClock=0;state.lockResets++}if(!collides(state.piece,0,1)){state.grounded=false;state.lockClock=0}}
  function move(dx){if(!playing())return false;if(!collides(state.piece,dx,0)){state.piece.x+=dx;resetLockAfterAction();draw();return true}return false}
  function rotate(){if(!playing()||state.piece.type==="O")return;var old=state.piece.cells,rot=old.map(function(c){return[-c[1],c[0]]});var mx=Math.min.apply(null,rot.map(function(c){return c[0]})),my=Math.min.apply(null,rot.map(function(c){return c[1]}));rot=rot.map(function(c){return[c[0]-mx,c[1]-my]});var kicks=[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]];for(var i=0;i<kicks.length;i++)if(!collides(state.piece,kicks[i][0],kicks[i][1],rot)){state.piece.cells=rot;state.piece.x+=kicks[i][0];state.piece.y+=kicks[i][1];resetLockAfterAction();tone(440,.035,.011);draw();return}}
  function softDrop(){if(!playing())return;if(!collides(state.piece,0,1)){state.piece.y++;state.score+=1;state.fallClock=0;state.grounded=false;state.lockClock=0;hud();draw()}else{state.grounded=true}}
  function hardDrop(){if(!playing())return;if(state.hardDropped){if(state.grounded||collides(state.piece,0,1)){tone(82,.035,.02);lock()}return}var d=0;while(!collides(state.piece,0,1)){state.piece.y++;d++}state.score+=d*2;state.hardDropped=true;state.grounded=true;state.lockClock=0;state.lockResets=0;state.fallClock=0;hud();tone(110,.045,.016);draw()}
  function swapWithNext(){if(!playing()||state.swapUsed||!state.nextType)return false;var current=state.piece.type,next=state.nextType;state.nextType=current;state.piece={type:next,cells:cloneCells(SHAPES[next]),x:0,y:-1};normalize(state.piece);state.piece.x=Math.floor((COLS-pieceWidth(state.piece))/2)-minX(state.piece);state.grounded=false;state.lockClock=0;state.lockResets=0;state.hardDropped=false;state.swapUsed=true;state.fallClock=0;if(collides(state.piece,0,0)){gameOver();return false}tone(520,.05,.014);setTimeout(function(){tone(690,.04,.01)},45);drawNext();draw();return true}
  function lock(){if(!state.piece)return;var type=state.piece.type,a=absoluteCells(state.piece,0,0),above=false;a.forEach(function(q){if(q.y<0){above=true;return}state.grid[q.y][q.x]={type:type}});state.piece=null;if(above){if(COLS===40&&ROWS===80){startEnding();return}if(state.verticalExpansions<2){expandVertical(type);return}gameOver();return}var result=clearLines();if(result.expanded)return;spawn();hud();draw()}
  function clearLines(){var kept=[],cleared=0;for(var y=0;y<ROWS;y++){var full=true;for(var x=0;x<COLS;x++)if(!state.grid[y][x]){full=false;break}if(full)cleared++;else kept.push(state.grid[y])}if(mayExpandHorizontal(cleared)){expandHorizontal();return{cleared:0,expanded:true}}while(kept.length<ROWS)kept.unshift(Array(COLS).fill(null));state.grid=kept;if(cleared){var previousLines=state.lines,table=[0,100,300,500,800];state.lines+=cleared;state.score+=(table[cleared]||1200)*state.level;state.level=Math.floor(state.lines/10)+1;state.fallMs=Math.max(90,720-(state.level-1)*58);tone(cleared===4?880:660,.11,.025);setTimeout(function(){tone(cleared===4?1040:760,.08,.018)},70);hud();draw();if(thresholdExpansion(previousLines))return{cleared:cleared,expanded:true}}return{cleared:cleared,expanded:false}}
  function gameOver(){if(COLS===40&&ROWS===80){startEnding();return}if(state.verticalExpansions<2){var t=state.piece&&state.piece.type;state.piece=null;expandVertical(t);return}state.mode="over";state.piece=null;cancelAnimationFrame(raf);raf=0;$(".rb-result").innerHTML="SCORE "+String(state.score).padStart(6,"0")+"<br>LINES "+String(state.lines).padStart(3,"0");$(".rb-over").classList.add("show");tone(150,.22,.028,"sawtooth");setTimeout(function(){tone(95,.35,.022,"sawtooth")},180);draw()}

  function updateKeyboardRepeat(dt){var dir=keys.left&&!keys.right?-1:(keys.right&&!keys.left?1:0);if(dir!==keyRepeat.dir){keyRepeat.dir=dir;keyRepeat.delay=0;keyRepeat.clock=0;return}if(!dir)return;keyRepeat.delay+=dt;if(keyRepeat.delay<175)return;keyRepeat.clock+=dt;if(keyRepeat.clock>=82){keyRepeat.clock=0;move(dir)}}
  function loop(t){if(!root||!state||state.mode!=="play")return;var dt=Math.min(50,t-state.last);state.last=t;if(state.debugFrozen){draw();raf=requestAnimationFrame(loop);return}dt*=state.debugSpeed||1;updateKeyboardRepeat(dt);state.fallClock+=dt;if(keys.down&&state.fallClock>=42){state.fallClock=0;softDrop()}else if(!keys.down&&state.fallClock>=state.fallMs){state.fallClock=0;if(!collides(state.piece,0,1)){state.piece.y++;state.grounded=false;state.lockClock=0}else state.grounded=true}if(state.piece&&collides(state.piece,0,1)){state.grounded=true;state.lockClock+=dt;if(state.lockClock>=LOCK_DELAY)lock()}else if(state.piece){state.grounded=false;state.lockClock=0}draw();raf=requestAnimationFrame(loop)}

  function resize(){var c=$(".rb-canvas");if(!c)return;var r=c.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.floor(r.width*d));c.height=Math.max(1,Math.floor(r.height*d));c._d=d;var n=$(".rb-next-canvas");if(n){var nr=n.getBoundingClientRect();n.width=Math.max(1,Math.floor(nr.width*d));n.height=Math.max(1,Math.floor(nr.height*d));n._d=d}}
  function boardMetrics(r){var top=52,bottom=12,pad=12,size=Math.floor(Math.min((r.width-pad*2)/COLS,(r.height-top-bottom)/ROWS));size=clamp(size,10,30);var bw=size*COLS,bh=size*ROWS;return{size:size,bw:bw,bh:bh,ox:Math.floor((r.width-bw)/2),oy:Math.floor(top+(r.height-top-bottom-bh)/2)}}
  function ghostY(){if(!state.piece)return 0;var d=0;while(!collides(state.piece,0,d+1))d++;return state.piece.y+d}
  function draw(){var c=$(".rb-canvas");if(!c||!state)return;var r=c.getBoundingClientRect(),d=c._d||1;if(c.width!==Math.floor(r.width*d)||c.height!==Math.floor(r.height*d))resize();var ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);var m=boardMetrics(r),size=m.size,ox=m.ox,oy=m.oy,bw=m.bw,bh=m.bh;ctx.fillStyle="#0c1122";ctx.fillRect(ox-3,oy-3,bw+6,bh+6);ctx.strokeStyle="#788dff";ctx.lineWidth=2;ctx.strokeRect(ox-2,oy-2,bw+4,bh+4);ctx.strokeStyle="rgba(180,195,255,.10)";ctx.lineWidth=1;for(var x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(ox+x*size,oy);ctx.lineTo(ox+x*size,oy+bh);ctx.stroke()}for(var y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*size);ctx.lineTo(ox+bw,oy+y*size);ctx.stroke()}for(var yy=0;yy<ROWS;yy++)for(var xx=0;xx<COLS;xx++)if(state.grid[yy][xx])paint(ctx,ox+xx*size,oy+yy*size,size,state.grid[yy][xx].type,"fixed");if(state.piece){var gy=ghostY();absoluteCells({x:state.piece.x,y:gy,cells:state.piece.cells},0,0).forEach(function(q){if(q.y>=0)paint(ctx,ox+q.x*size,oy+q.y*size,size,state.piece.type,"ghost")});absoluteCells(state.piece,0,0).forEach(function(q){if(q.y>=0)paint(ctx,ox+q.x*size,oy+q.y*size,size,state.piece.type,"active")})}}
  function paint(ctx,x,y,s,type,mode){var m=Math.max(1,Math.floor(s*.09));if(mode==="ghost"){ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.strokeStyle="rgba(210,220,255,.46)";ctx.lineWidth=Math.max(1,s*.06);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m);return}ctx.fillStyle=COLORS[type];ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.fillStyle="rgba(255,255,255,.25)";ctx.fillRect(x+m*1.7,y+m*1.7,s-3.4*m,Math.max(1,s*.12));ctx.strokeStyle=mode==="active"?"rgba(255,255,255,.9)":"rgba(5,8,18,.78)";ctx.lineWidth=Math.max(1,s*.075);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m)}
  function drawNext(){var c=$(".rb-next-canvas");if(!c||!state||!state.nextType)return;var r=c.getBoundingClientRect(),d=c._d||Math.min(2,window.devicePixelRatio||1);if(c.width!==Math.floor(r.width*d)||c.height!==Math.floor(r.height*d)){c.width=Math.floor(r.width*d);c.height=Math.floor(r.height*d);c._d=d}var ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);var cells=SHAPES[state.nextType],minx=Math.min.apply(null,cells.map(function(v){return v[0]})),maxx=Math.max.apply(null,cells.map(function(v){return v[0]})),miny=Math.min.apply(null,cells.map(function(v){return v[1]})),maxy=Math.max.apply(null,cells.map(function(v){return v[1]})),w=maxx-minx+1,h=maxy-miny+1,s=Math.floor(Math.min((r.width-8)/w,(r.height-6)/h)),ox=(r.width-w*s)/2,oy=(r.height-h*s)/2;cells.forEach(function(v){paint(ctx,ox+(v[0]-minx)*s,oy+(v[1]-miny)*s,s,state.nextType,"fixed")})}
  function hud(){if(!root)return;$(".rb-score").textContent=String(state.score).padStart(6,"0");$(".rb-lines").textContent=String(state.lines).padStart(3,"0");$(".rb-level").textContent=String(state.level).padStart(2,"0");updateFieldLabel();drawNext()}

  function close(){removeZoomGuard();if(devPressTimer)clearTimeout(devPressTimer);devPressTimer=0;cancelAnimationFrame(raf);raf=0;if(state&&state.eventTimer)clearTimeout(state.eventTimer);if(state&&state.endingTimer)clearTimeout(state.endingTimer);clearStickTimers();keys.left=keys.right=keys.down=false;window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);if(root&&root.parentNode)root.remove();root=null;state=null;try{if(audio&&audio.state!=="closed")audio.close()}catch(e){}audio=null}
  window.addEventListener("resize",function(){if(root){resize();draw();drawNext()}});
  window.MEGANE_RECURSION_BUG={version:"v1.0-phase4-developer-panel",open:open,close:close};
})();
