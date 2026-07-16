/* 133_story_bug_v06.js
   SYNTAX FRONTIER INC.
   No.017 — STORY BUG v0.6

   Prototype target:
   - Long-press route opens a short NOW LOADING sequence.
   - Then the FINAL BATTLE starts immediately.
   - Color 16-bit-era RPG presentation with a black battle background.
   - The Demon King is intentionally overproduced.
   - v0.1 does not yet expose the hidden TALK command.
*/
(function(){
  "use strict";

  var root=null;
  var audio=null;
  var bgmTimer=0;
  var bgmStep=0;
  var battleBgmActive=false;
  var bgmSource=null;
  var bgmGain=null;
  var introRaf=0;
  var selected=0;
  var heroHP=28;
  var demonHP=99999999;
  var phase="loading";
  var commands=["たたかう","まほう","にげる","ぼうぎょ"];

  function ensureStyle(){
    if(document.getElementById("storyBugStyleV01")) return;

    var style=document.createElement("style");
    style.id="storyBugStyleV01";
    style.textContent=`
      #storyBugRoot{
        position:fixed;inset:0;z-index:2147483500;
        background:#050308;color:#fff;overflow:hidden;
        font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",system-ui,sans-serif;
        user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
        touch-action:none;
      }
      #storyBugRoot *{box-sizing:border-box}
      .sb-shell{
        position:absolute;inset:0;
        padding:max(14px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom));
        background:
          radial-gradient(circle at 50% 25%,rgba(104,47,163,.13),transparent 42%),
          #050308;
      }
      .sb-close{
        position:absolute;right:16px;top:max(16px,env(safe-area-inset-top));
        z-index:2147483600;
        pointer-events:auto;touch-action:manipulation;width:44px;height:44px;border:1px solid rgba(255,255,255,.22);
        border-radius:8px;background:rgba(255,255,255,.07);color:#fff;
        font:700 24px/1 system-ui;
      }
      .sb-loading{
        position:absolute;inset:0;z-index:80;
        display:grid;place-items:center;
        background:
          radial-gradient(circle at 50% 30%,rgba(92,41,142,.22),transparent 38%),
          linear-gradient(180deg,#080511,#020104 72%);
        overflow:hidden;
      }
      .sb-loading::before{
        content:"";
        position:absolute;inset:0;
        background:
          linear-gradient(180deg,transparent 55%,rgba(0,0,0,.72)),
          radial-gradient(circle at 16% 24%,rgba(247,166,72,.16),transparent 13%),
          radial-gradient(circle at 78% 30%,rgba(102,149,255,.13),transparent 17%);
      }
      .sb-loading-castle{
        position:absolute;left:5%;right:5%;bottom:18%;height:35%;
        opacity:.36;filter:blur(.2px);
        background:
          linear-gradient(90deg,transparent 0 8%,#171026 8% 16%,transparent 16% 24%,#171026 24% 34%,transparent 34% 62%,#171026 62% 76%,transparent 76% 85%,#171026 85% 93%,transparent 93%),
          linear-gradient(180deg,transparent 0 30%,#171026 30% 100%);
        clip-path:polygon(0 100%,0 52%,8% 52%,8% 23%,14% 6%,20% 23%,20% 48%,31% 48%,31% 33%,38% 17%,45% 33%,45% 55%,59% 55%,59% 38%,68% 20%,76% 38%,76% 50%,86% 50%,86% 27%,92% 10%,98% 27%,98% 100%);
      }
      .sb-loading-panel{
        position:relative;z-index:3;width:min(88vw,520px);
        padding:28px 22px;text-align:center;
        border-top:1px solid rgba(255,194,93,.36);
        border-bottom:1px solid rgba(255,194,93,.36);
        background:rgba(3,2,8,.60);
        box-shadow:0 24px 80px rgba(0,0,0,.65);
      }
      .sb-rom{font:700 11px/1.4 ui-monospace,monospace;letter-spacing:.18em;color:rgba(255,255,255,.62)}
      .sb-now{
        margin-top:18px;
        font:900 clamp(25px,7.6vw,56px)/1 ui-monospace,monospace;
        letter-spacing:.035em;
        color:#ffc15d;
        text-shadow:0 0 14px rgba(255,155,53,.34),4px 4px 0 #6c3213;
        white-space:nowrap;
      }
      .sb-load-sub{margin-top:14px;font:700 12px/1.5 ui-monospace,monospace;letter-spacing:.1em;color:#c9bbd7}
      .sb-orbs{display:flex;justify-content:center;gap:13px;margin-top:24px}
      .sb-orb{
        width:18px;height:18px;border-radius:50%;
        border:2px solid rgba(255,194,93,.42);
        background:transparent;box-shadow:0 0 0 rgba(95,174,255,0);
        transition:.22s ease;
      }
      .sb-orb.on{
        background:#83d9ff;border-color:#b7efff;
        box-shadow:0 0 12px #4ba7ff,0 0 26px rgba(70,141,255,.72);
      }
      .sb-copyright{
        position:absolute;left:0;right:0;bottom:7%;
        z-index:3;text-align:center;font:600 10px/1.4 ui-monospace,monospace;
        color:rgba(255,255,255,.40);
      }
      .sb-game{
        position:absolute;inset:0;
        display:none;
        flex-direction:column;
        gap:8px;
        padding:max(10px,env(safe-area-inset-top)) 12px max(8px,env(safe-area-inset-bottom));
        background:#030205;
        overflow:hidden;
      }
      .sb-game.show{display:flex}
      .sb-header{
        flex:0 0 42px;min-height:42px;display:flex;align-items:center;
        padding:0 58px 0 8px;border-bottom:1px solid rgba(255,255,255,.14);
        font:700 10px/1 ui-monospace,monospace;letter-spacing:.15em;
        color:rgba(255,255,255,.54);
      }
      .sb-battle{
        flex:1 1 auto;
        min-height:0;height:auto;
        display:grid;grid-template-rows:minmax(180px,1fr) auto;
        width:min(100%,620px);margin:0 auto;
        border:2px solid #a78cc7;
        box-shadow:0 0 0 3px #18101f,0 0 34px rgba(85,43,125,.35);
        background:#000;
        overflow:hidden;
      }
      .sb-scene{
        position:relative;min-height:0;overflow:hidden;background:#000;
      }
      .sb-scene::before{
        content:"";position:absolute;left:0;right:0;bottom:0;height:43%;
        background:
          radial-gradient(ellipse at 50% 100%,rgba(96,31,138,.46),transparent 58%),
          repeating-radial-gradient(ellipse at 50% 120%,rgba(89,41,112,.28) 0 2px,transparent 3px 18px);
        opacity:.82;
      }
      .sb-magic-circle{
        position:absolute;left:50%;bottom:9%;width:72%;aspect-ratio:2.8/1;
        transform:translateX(-50%);border:2px solid rgba(148,82,212,.43);
        border-radius:50%;box-shadow:0 0 23px rgba(115,57,180,.38),inset 0 0 25px rgba(115,57,180,.30);
        animation:sbCircle 8s linear infinite;
      }
      .sb-magic-circle::before,.sb-magic-circle::after{
        content:"";position:absolute;border:1px solid rgba(168,97,226,.36);border-radius:50%;
      }
      .sb-magic-circle::before{inset:14%}
      .sb-magic-circle::after{inset:31%}
      @keyframes sbCircle{
        0%{transform:translateX(-50%) rotate(0deg)}
        100%{transform:translateX(-50%) rotate(360deg)}
      }
      .sb-flame{
        position:absolute;bottom:13%;width:32px;height:66px;
        filter:drop-shadow(0 0 10px rgba(150,75,255,.65));
      }
      .sb-flame.left{left:13%}.sb-flame.right{right:13%}
      .sb-flame::before,.sb-flame::after{
        content:"";position:absolute;left:50%;bottom:0;transform:translateX(-50%);
        clip-path:polygon(50% 0,70% 31%,92% 51%,75% 100%,25% 100%,8% 51%,30% 31%);
      }
      .sb-flame::before{
        width:31px;height:65px;background:linear-gradient(#86d2ff,#6a4cff 50%,#2e156f);
        animation:sbFlame .42s steps(2,end) infinite;
      }
      .sb-flame::after{
        width:14px;height:38px;background:linear-gradient(#fff6a6,#68e4ff 52%,#8e70ff);
        animation:sbFlame .34s steps(2,end) infinite reverse;
      }
      @keyframes sbFlame{
        0%{transform:translateX(-50%) scaleX(.84) skewX(-4deg)}
        100%{transform:translateX(-50%) scaleX(1.08) skewX(5deg)}
      }
      .sb-demon-wrap{
        position:absolute;
        left:50%;
        top:48%;
        width:min(58vw,310px);
        height:min(58vw,310px);
        max-width:310px;
        max-height:310px;
        transform:translate(-50%,-50%);
        animation:sbSpriteBreathe 1.45s steps(2,end) infinite;
        image-rendering:pixelated;
        filter:
          drop-shadow(0 14px 0 rgba(0,0,0,.68))
          drop-shadow(0 0 12px rgba(127,52,218,.28));
      }
      @keyframes sbSpriteBreathe{
        0%,100%{transform:translate(-50%,-50%) translateY(2px)}
        50%{transform:translate(-50%,-50%) translateY(-2px)}
      }
      .sb-demon-sprite{
        width:100%;
        height:100%;
        object-fit:contain;
        image-rendering:pixelated;
        image-rendering:crisp-edges;
        transform:translateZ(0);
        pointer-events:none;
      }
      .sb-demon-glow{
        position:absolute;
        left:50%;top:50%;
        width:72%;height:72%;
        transform:translate(-50%,-50%);
        border-radius:50%;
        background:radial-gradient(circle,rgba(117,43,192,.17),transparent 68%);
        filter:blur(4px);
        animation:sbSpriteGlow 2.2s steps(2,end) infinite;
        pointer-events:none;
      }
      @keyframes sbSpriteGlow{
        0%,100%{opacity:.62}
        50%{opacity:.92}
      }
      .sb-demon-name{
        position:absolute;left:0;right:0;top:12px;text-align:center;
        font:800 13px/1 ui-monospace,monospace;letter-spacing:.14em;color:#e8ccff;
        text-shadow:0 0 8px rgba(169,99,255,.65);
      }
      .sb-windows{
        display:grid;grid-template-columns:1fr 1.25fr;gap:7px;
        padding:7px;background:#08060a;border-top:2px solid #a78cc7;
      }
      .sb-window{
        min-height:112px;border:3px solid #fff;border-radius:7px;
        box-shadow:inset 0 0 0 3px #333,0 0 0 2px #000;
        background:#050505;color:#fff;padding:12px;
      }
      .sb-status{font:700 14px/1.62 ui-monospace,monospace}
      .sb-status strong{color:#ffd36a}
      .sb-command-window{
        position:relative;
        height:112px;
        overflow:hidden;
        padding:7px 10px;
      }
      .sb-command-list{
        display:flex;
        flex-direction:column;
        gap:0;
        font:800 15px/1.25 ui-monospace,monospace;
      }
      .sb-command{
        display:flex;
        align-items:center;
        min-height:23px;
        color:#fff;
      }
      .sb-command.active::before{content:"▶";width:25px;color:#ffdc6d}
      .sb-command:not(.active)::before{content:"";width:25px}
      .sb-log{
        grid-column:1/-1;min-height:62px;border:3px solid #fff;border-radius:7px;
        box-shadow:inset 0 0 0 3px #333,0 0 0 2px #000;
        background:#050505;padding:11px 13px;
        font:700 14px/1.6 ui-monospace,monospace;white-space:pre-line;
      }
      .sb-pad{
        flex:0 0 64px;
        width:min(100%,620px);height:64px;margin:0 auto;
        display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:9px;
        position:relative;z-index:95;
      }
      .sb-btn{
        min-height:54px;height:100%;border:1px solid rgba(255,255,255,.28);
        border-radius:9px;background:rgba(255,255,255,.07);color:#fff;
        font:800 15px/1 ui-monospace,monospace;
      }
      .sb-btn.ok{border-color:rgba(255,207,96,.66);color:#ffe297}

      .sb-summon{
        position:absolute;inset:0;z-index:72;
        display:none;overflow:hidden;background:#000;
        pointer-events:none;
      }
      .sb-summon.show{display:block}
      .sb-summon-canvas{
        position:absolute;inset:0;width:100%;height:100%;
        image-rendering:pixelated;
      }
      .sb-summon-label{
        position:absolute;left:0;right:0;bottom:9%;
        text-align:center;
        font:800 12px/1.5 ui-monospace,monospace;
        letter-spacing:.13em;color:#d9b8ff;
        opacity:0;
        animation:sbSummonLabel .9s steps(2,end) .45s forwards;
      }
      @keyframes sbSummonLabel{to{opacity:1}}
      .sb-demon-wrap.intro-hidden{opacity:0}
      .sb-demon-wrap.intro-reveal{
        animation:
          sbDemonMaterialize .72s steps(7,end) forwards,
          sbSpriteBreathe 1.45s steps(2,end) .72s infinite;
      }
      @keyframes sbDemonMaterialize{
        0%{opacity:0;filter:brightness(2.2) contrast(1.7);clip-path:inset(48% 0 48% 0)}
        18%{opacity:.32;clip-path:inset(40% 0 38% 0)}
        36%{opacity:.52;clip-path:inset(31% 0 28% 0)}
        54%{opacity:.68;clip-path:inset(22% 0 18% 0)}
        72%{opacity:.82;clip-path:inset(12% 0 8% 0)}
        86%{opacity:.94;clip-path:inset(4% 0 2% 0)}
        100%{opacity:1;filter:brightness(1) contrast(1);clip-path:inset(0)}
      }
      .sb-flash{
        position:absolute;inset:0;z-index:60;background:#fff;
        animation:sbFlash .18s steps(2,end) forwards;pointer-events:none;
      }
      @keyframes sbFlash{to{opacity:0}}
      .sb-damage{
        position:absolute;left:50%;top:38%;z-index:65;
        transform:translate(-50%,-50%);
        font:900 34px/1 ui-monospace,monospace;color:#ffdc6c;
        text-shadow:3px 3px 0 #851c16;
        animation:sbDamage .8s ease-out forwards;
      }
      @keyframes sbDamage{
        0%{opacity:0;transform:translate(-50%,-30%) scale(.65)}
        30%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}
        100%{opacity:0;transform:translate(-50%,-90%) scale(.9)}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureAudio(){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      if(!audio||audio.state==="closed")audio=new AC();
      if(audio.state==="suspended")audio.resume();
      return audio;
    }catch(e){return null}
  }

  function note(freq,dur,vol,type,when){
    var ctx=ensureAudio();
    if(!ctx)return;
    var o=ctx.createOscillator();
    var g=ctx.createGain();
    o.type=type||"square";
    o.frequency.setValueAtTime(freq,when||ctx.currentTime);
    g.gain.setValueAtTime(.0001,when||ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol||.018,(when||ctx.currentTime)+.01);
    g.gain.exponentialRampToValueAtTime(.0001,(when||ctx.currentTime)+dur);
    o.connect(g);g.connect(ctx.destination);
    o.start(when||ctx.currentTime);
    o.stop((when||ctx.currentTime)+dur+.02);
  }

  function startBgm(){
    stopBgm();
    var ctx=ensureAudio();
    if(!ctx)return;

    battleBgmActive=true;

    var sampleRate=ctx.sampleRate;
    var beat=.215;
    var sequence=[55,65.4,73.4,55,49,58.3,65.4,43.7];
    var totalDuration=beat*sequence.length*2;
    var frameCount=Math.floor(sampleRate*totalDuration);
    var buffer=ctx.createBuffer(1,frameCount,sampleRate);
    var data=buffer.getChannelData(0);

    for(var i=0;i<frameCount;i++){
      var t=i/sampleRate;
      var step=Math.floor(t/beat)%sequence.length;
      var local=t%beat;
      var freq=sequence[step];

      var env=Math.max(0,1-local/beat);
      var square=(Math.sin(2*Math.PI*freq*t)>=0?1:-1);
      var octave=(Math.sin(2*Math.PI*freq*2*t)>=0?1:-1);
      var drone=Math.sin(2*Math.PI*(freq/2)*t);

      var pulse=(local<.075?1:0);
      data[i]=(
        square*.105*env +
        octave*.035*env +
        drone*.035 +
        pulse*Math.sin(2*Math.PI*164.8*t)*.025
      )*.42;
    }

    bgmGain=ctx.createGain();
    bgmGain.gain.value=.72;

    bgmSource=ctx.createBufferSource();
    bgmSource.buffer=buffer;
    bgmSource.loop=true;
    bgmSource.connect(bgmGain);
    bgmGain.connect(ctx.destination);
    bgmSource.start();
  }

  function stopBgm(){
    battleBgmActive=false;
    if(bgmTimer)clearInterval(bgmTimer);
    bgmTimer=0;
    bgmStep=0;

    if(bgmSource){
      try{bgmSource.stop()}catch(e){}
      try{bgmSource.disconnect()}catch(e){}
      bgmSource=null;
    }
    if(bgmGain){
      try{bgmGain.disconnect()}catch(e){}
      bgmGain=null;
    }
  }

  function playSummonSE(){
    var ctx=ensureAudio();
    if(!ctx)return;
    var notes=[196,247,294,392,494,587,784,988];
    notes.forEach(function(freq,index){
      var t=ctx.currentTime+.03+index*.085;
      note(freq,.13,.020,index%2?"square":"triangle",t);
      note(freq*1.5,.08,.006,"sine",t+.018);
    });
  }

  function open(){
    close();
    ensureStyle();
    selected=0;heroHP=28;demonHP=99999999;phase="loading";

    root=document.createElement("section");
    root.id="storyBugRoot";
    root.innerHTML=`
      <div class="sb-shell">
        <button type="button" class="sb-close" aria-label="閉じる">×</button>

        <div class="sb-loading">
          <div class="sb-loading-castle"></div>
          <div class="sb-loading-panel">
            <div class="sb-rom">ROM 017 / STORY BUG / v0.6</div>
            <div class="sb-now">NOW LOADING...</div>
            <div class="sb-load-sub">LOADING FINAL BATTLE</div>
            <div class="sb-orbs">
              <i class="sb-orb"></i><i class="sb-orb"></i><i class="sb-orb"></i>
              <i class="sb-orb"></i><i class="sb-orb"></i><i class="sb-orb"></i>
            </div>
          </div>
          <div class="sb-copyright">© SYNTAX FRONTIER INC.</div>
        </div>

        <div class="sb-game">
          <div class="sb-header">SYNTAX FRONTIER INC. / BUG No.017 / FINAL BATTLE</div>

          <div class="sb-battle">
            <div class="sb-scene">
              <div class="sb-summon">
                <canvas class="sb-summon-canvas"></canvas>
                <div class="sb-summon-label">A PRESENCE IS FORMING...</div>
              </div>
              <div class="sb-demon-name">魔王　HP <span class="sb-demon-hp">99999999</span></div>
              <div class="sb-magic-circle"></div>
              <div class="sb-flame left"></div>
              <div class="sb-flame right"></div>

              <div class="sb-demon-wrap intro-hidden">
                <div class="sb-demon-glow"></div>
                <img
                  class="sb-demon-sprite"
                  src="./assets/story_bug/demon_king_v04.png"
                  alt="魔王"
                  draggable="false"
                >
              </div>
            </div>

            <div class="sb-windows">
              <div class="sb-window sb-status">
                勇者　<strong>Lv.1</strong><br>
                HP　<span class="sb-hero-hp">28</span> / 28<br>
                MP　0 / 0
              </div>

              <div class="sb-window sb-command-window">
                <div class="sb-command-list"></div>
              </div>

              <div class="sb-log">魔王が　あらわれた！</div>
            </div>
          </div>

          <div class="sb-pad">
            <button type="button" class="sb-btn prev">▲</button>
            <button type="button" class="sb-btn next">▼</button>
            <button type="button" class="sb-btn ok">決定</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.addEventListener("pointerdown",function(){
      var ctx=ensureAudio();
      if(ctx&&ctx.state==="suspended"){
        ctx.resume().catch(function(){});
      }
    },true);

    var closeButton=root.querySelector(".sb-close");
    function handleClose(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof e.stopImmediatePropagation==="function")e.stopImmediatePropagation();
      }
      close();
    }
    closeButton.addEventListener("pointerdown",handleClose,true);
    closeButton.addEventListener("click",handleClose,true);

    root.querySelector(".sb-btn.prev").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();move(-1);
    },true);
    root.querySelector(".sb-btn.next").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();move(1);
    },true);
    root.querySelector(".sb-btn.ok").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();choose();
    },true);

    window.addEventListener("keydown",keyDown,true);
    runLoading();
  }

  function runLoading(){
    var orbs=[].slice.call(root.querySelectorAll(".sb-orb"));
    var step=0;
    var timer=setInterval(function(){
      if(!root){clearInterval(timer);return}
      if(step<orbs.length){
        orbs[step].classList.add("on");
        note(220+step*34,.10,.012,"triangle");
        step++;
        return;
      }
      clearInterval(timer);
      setTimeout(startBattle,360);
    },260);
  }

  function startBattle(){
    if(!root)return;
    phase="summon";
    root.querySelector(".sb-loading").style.display="none";
    root.querySelector(".sb-game").classList.add("show");
    renderCommands();
    setLog("………………");
    runSummonSequence();
  }

  function runSummonSequence(){
    var scene=root.querySelector(".sb-scene");
    var overlay=root.querySelector(".sb-summon");
    var canvas=root.querySelector(".sb-summon-canvas");
    var demon=root.querySelector(".sb-demon-wrap");
    if(!scene||!overlay||!canvas||!demon)return;

    overlay.classList.add("show");
    demon.classList.add("intro-hidden");
    playSummonSE();

    var rect=scene.getBoundingClientRect();
    var dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.max(1,Math.floor(rect.width*dpr));
    canvas.height=Math.max(1,Math.floor(rect.height*dpr));
    var ctx=canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled=false;

    var particles=[];
    var count=150;
    for(var i=0;i<count;i++){
      particles.push({
        a:Math.random()*Math.PI*2,
        r:Math.max(rect.width,rect.height)*(.42+Math.random()*.36),
        speed:.045+Math.random()*.055,
        size:1+Math.floor(Math.random()*3),
        light:Math.random()
      });
    }

    var start=performance.now();
    cancelAnimationFrame(introRaf);

    function frame(now){
      if(!root)return;
      var elapsed=(now-start)/1000;
      ctx.clearRect(0,0,rect.width,rect.height);
      ctx.fillStyle="#000";
      ctx.fillRect(0,0,rect.width,rect.height);

      var cx=rect.width/2;
      var cy=rect.height*.49;
      var pull=Math.min(1,elapsed/2.15);

      particles.forEach(function(p,index){
        p.a+=p.speed*(1+pull*4);
        var radius=p.r*(1-pull*.93);
        var wobble=Math.sin(p.a*3+index)*7*(1-pull);
        var x=cx+Math.cos(p.a)*radius;
        var y=cy+Math.sin(p.a)*radius*.58+wobble;
        var alpha=.25+.75*(1-radius/(Math.max(rect.width,rect.height)*.8));
        ctx.fillStyle=p.light>.72
          ?"rgba(226,176,255,"+alpha+")"
          :"rgba(123,45,220,"+alpha+")";
        ctx.fillRect(Math.round(x),Math.round(y),p.size,p.size);
      });

      if(elapsed<2.25){
        introRaf=requestAnimationFrame(frame);
        return;
      }

      overlay.classList.remove("show");
      demon.classList.remove("intro-hidden");
      demon.classList.add("intro-reveal");
      setLog("魔王が　あらわれた！\n\nしかし　ここへ来た理由は　思い出せない。");
      phase="battle";
      startBgm();
    }

    introRaf=requestAnimationFrame(frame);
  }

  function renderCommands(){
    var list=root.querySelector(".sb-command-list");
    list.innerHTML="";
    commands.forEach(function(label,index){
      var row=document.createElement("div");
      row.className="sb-command"+(index===selected?" active":"");
      row.textContent=label;
      list.appendChild(row);
    });
  }

  function move(dir){
    if(phase!=="battle")return;
    ensureAudio();
    selected=(selected+dir+commands.length)%commands.length;
    note(330,.06,.012,"square");
    renderCommands();
  }

  function setLog(text){
    var el=root&&root.querySelector(".sb-log");
    if(el)el.textContent=text;
  }

  function choose(){
    if(phase!=="battle")return;
    ensureAudio();
    note(440,.08,.015,"square");

    if(selected===0)attack();
    else if(selected===1){
      setLog("MPが　たりない！");
    }else if(selected===2){
      setLog("しかし　まわりこまれてしまった！");
    }else{
      setLog("勇者は　みをまもっている。\n\n魔王は　まだ攻撃してこない。");
    }
  }

  function attack(){
    phase="action";
    var damage=Math.floor(Math.random()*2)+1;
    demonHP-=damage;

    setLog("勇者の　こうげき！");

    setTimeout(function(){
      if(!root)return;
      var scene=root.querySelector(".sb-scene");
      var flash=document.createElement("div");
      flash.className="sb-flash";
      scene.appendChild(flash);

      var dmg=document.createElement("div");
      dmg.className="sb-damage";
      dmg.textContent=damage;
      scene.appendChild(dmg);

      note(95,.15,.028,"sawtooth");
      setTimeout(function(){flash.remove()},220);
      setTimeout(function(){dmg.remove()},850);

      root.querySelector(".sb-demon-hp").textContent=String(demonHP);
      setLog(damage+"ダメージを　あたえた！\n\n魔王は　こちらを見ている。");

      setTimeout(function(){
        if(!root)return;
        phase="battle";
      },700);
    },430);
  }

  function keyDown(e){
    if(!root)return;
    if(e.key==="Escape"){e.preventDefault();close();return}
    if(phase!=="battle")return;

    if(e.key==="ArrowUp"){
      e.preventDefault();move(-1);
    }else if(e.key==="ArrowDown"){
      e.preventDefault();move(1);
    }else if(e.key==="Enter"||e.key===" "||e.key==="z"){
      e.preventDefault();choose();
    }
  }

  function close(){
    cancelAnimationFrame(introRaf);
    introRaf=0;
    stopBgm();
    window.removeEventListener("keydown",keyDown,true);
    if(root&&root.parentNode)root.remove();
    root=null;phase="closed";
  }

  window.MEGANE_STORY_BUG={
    version:"v0.6",
    open:open,
    close:close
  };
})();