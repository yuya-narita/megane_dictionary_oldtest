/* 128_story_bug_v01.js
   SYNTAX FRONTIER INC.
   No.017 — STORY BUG v0.1

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
        z-index:90;width:44px;height:44px;border:1px solid rgba(255,255,255,.22);
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
        margin-top:18px;font:900 clamp(34px,9vw,62px)/1 ui-monospace,monospace;
        letter-spacing:.06em;color:#ffc15d;
        text-shadow:0 0 14px rgba(255,155,53,.34),4px 4px 0 #6c3213;
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
        display:none;grid-template-rows:auto 1fr auto;
        padding:max(14px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom));
        background:#030205;
      }
      .sb-game.show{display:grid}
      .sb-header{
        min-height:42px;display:flex;align-items:center;
        padding:0 58px 0 8px;border-bottom:1px solid rgba(255,255,255,.14);
        font:700 10px/1 ui-monospace,monospace;letter-spacing:.15em;
        color:rgba(255,255,255,.54);
      }
      .sb-battle{
        min-height:0;display:grid;grid-template-rows:1fr auto;
        width:min(100%,620px);margin:0 auto;
        border:2px solid #a78cc7;
        box-shadow:0 0 0 3px #18101f,0 0 34px rgba(85,43,125,.35);
        background:#000;
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
        position:absolute;left:50%;bottom:13%;width:65%;aspect-ratio:2.7/1;
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
        animation:sbFlame .48s steps(3,end) infinite;
      }
      .sb-flame::after{
        width:14px;height:38px;background:linear-gradient(#fff6a6,#68e4ff 52%,#8e70ff);
        animation:sbFlame .38s steps(2,end) infinite reverse;
      }
      @keyframes sbFlame{
        0%{transform:translateX(-50%) scaleX(.84) skewX(-4deg)}
        100%{transform:translateX(-50%) scaleX(1.08) skewX(5deg)}
      }
      .sb-demon-wrap{
        position:absolute;left:50%;top:47%;width:196px;height:214px;
        transform:translate(-50%,-50%);
        animation:sbBreathe 2.8s ease-in-out infinite;
        filter:drop-shadow(0 18px 18px rgba(0,0,0,.92));
      }
      @keyframes sbBreathe{
        0%,100%{transform:translate(-50%,-50%) translateY(2px) scale(1)}
        50%{transform:translate(-50%,-50%) translateY(-3px) scale(1.012)}
      }
      .sb-aura{
        position:absolute;inset:15px 9px 8px;border-radius:50%;
        background:radial-gradient(circle,rgba(141,62,212,.27),rgba(76,21,110,.06) 57%,transparent 72%);
        filter:blur(6px);animation:sbAura 2s ease-in-out infinite;
      }
      @keyframes sbAura{50%{transform:scale(1.08);opacity:.7}}
      .sb-wing{
        position:absolute;top:69px;width:78px;height:111px;
        background:linear-gradient(135deg,#561b70,#1d0928 68%);
        border:3px solid #a564ca;
        box-shadow:inset 0 0 18px #0d0312;
      }
      .sb-wing.left{left:2px;clip-path:polygon(100% 10%,66% 0,48% 23%,6% 10%,23% 46%,0 63%,43% 70%,36% 100%,78% 75%);transform:rotate(-8deg)}
      .sb-wing.right{right:2px;clip-path:polygon(0 10%,34% 0,52% 23%,94% 10%,77% 46%,100% 63%,57% 70%,64% 100%,22% 75%);transform:rotate(8deg)}
      .sb-cape{
        position:absolute;left:39px;right:39px;top:88px;bottom:5px;
        background:linear-gradient(90deg,#210726,#6e1f65 50%,#210726);
        border:4px solid #b26bb5;
        clip-path:polygon(18% 0,82% 0,100% 100%,72% 86%,50% 100%,28% 86%,0 100%);
      }
      .sb-body{
        position:absolute;left:55px;top:56px;width:86px;height:102px;
        border:5px solid #e0a95b;border-radius:34% 34% 24% 24%;
        background:linear-gradient(90deg,#38104f,#792c88 48%,#38104f);
        box-shadow:inset 0 0 0 6px #16051d,inset 0 0 20px #b85cd5;
      }
      .sb-armor{
        position:absolute;left:63px;top:95px;width:70px;height:68px;
        background:linear-gradient(135deg,#d29b4b,#774718 42%,#e9bd69 57%,#704014);
        border:4px solid #ffe19b;clip-path:polygon(50% 0,100% 22%,82% 100%,50% 84%,18% 100%,0 22%);
      }
      .sb-head{
        position:absolute;left:66px;top:24px;width:64px;height:68px;
        border:4px solid #efc26f;border-radius:44% 44% 38% 38%;
        background:linear-gradient(135deg,#60317a,#1c0926 65%);
        box-shadow:inset 0 0 15px #ad5cdb;
      }
      .sb-horn{
        position:absolute;top:3px;width:29px;height:54px;background:linear-gradient(#ffe6a1,#9c6625);
        border:3px solid #f0c36e;
      }
      .sb-horn.left{left:54px;clip-path:polygon(92% 100%,0 21%,35% 0,100% 86%);transform:rotate(-16deg)}
      .sb-horn.right{right:54px;clip-path:polygon(8% 100%,100% 21%,65% 0,0 86%);transform:rotate(16deg)}
      .sb-crown{
        position:absolute;left:69px;top:7px;width:58px;height:28px;
        background:linear-gradient(#ffe578,#a96a18);
        border:3px solid #fff0a8;
        clip-path:polygon(0 100%,0 38%,18% 66%,31% 0,50% 62%,69% 0,82% 66%,100% 38%,100% 100%);
      }
      .sb-eye{
        position:absolute;top:50px;width:12px;height:7px;background:#ff564f;
        box-shadow:0 0 7px #ff2828,0 0 15px rgba(255,51,39,.9);
        animation:sbEye 3.7s steps(1,end) infinite;
      }
      .sb-eye.left{left:79px}.sb-eye.right{right:79px}
      @keyframes sbEye{0%,94%,100%{transform:scaleY(1)}95%,98%{transform:scaleY(.1)}}
      .sb-gem{
        position:absolute;left:50%;top:111px;transform:translateX(-50%) rotate(45deg);
        width:17px;height:17px;background:#69e6ff;border:3px solid #fff;
        box-shadow:0 0 12px #54d8ff,0 0 28px rgba(66,188,255,.72);
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
        min-height:126px;border:3px solid #fff;border-radius:7px;
        box-shadow:inset 0 0 0 3px #333,0 0 0 2px #000;
        background:#050505;color:#fff;padding:12px;
      }
      .sb-status{font:700 14px/1.75 ui-monospace,monospace}
      .sb-status strong{color:#ffd36a}
      .sb-command-window{
        position:relative;height:126px;overflow:hidden;
      }
      .sb-command-list{
        display:flex;flex-direction:column;gap:2px;
        font:800 16px/1.5 ui-monospace,monospace;
      }
      .sb-command{
        display:flex;align-items:center;min-height:24px;color:#fff;
      }
      .sb-command.active::before{content:"▶";width:25px;color:#ffdc6d}
      .sb-command:not(.active)::before{content:"";width:25px}
      .sb-log{
        grid-column:1/-1;min-height:72px;border:3px solid #fff;border-radius:7px;
        box-shadow:inset 0 0 0 3px #333,0 0 0 2px #000;
        background:#050505;padding:11px 13px;
        font:700 14px/1.6 ui-monospace,monospace;white-space:pre-line;
      }
      .sb-pad{
        width:min(100%,620px);margin:10px auto 0;
        display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:9px;
      }
      .sb-btn{
        min-height:52px;border:1px solid rgba(255,255,255,.28);
        border-radius:9px;background:rgba(255,255,255,.07);color:#fff;
        font:800 15px/1 ui-monospace,monospace;
      }
      .sb-btn.ok{border-color:rgba(255,207,96,.66);color:#ffe297}
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
    var seq=[55,65.4,73.4,55,49,58.3,65.4,43.7];
    function tick(){
      var ctx=ensureAudio();
      if(!ctx||phase!=="battle")return;
      var now=ctx.currentTime+.02;
      var f=seq[bgmStep%seq.length];
      note(f,.38,.020,"sawtooth",now);
      note(f*2,.19,.007,"square",now+.04);
      if(bgmStep%4===0)note(164.8,.5,.004,"triangle",now+.08);
      bgmStep++;
    }
    tick();
    bgmTimer=setInterval(tick,430);
  }

  function stopBgm(){
    if(bgmTimer)clearInterval(bgmTimer);
    bgmTimer=0;bgmStep=0;
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
            <div class="sb-rom">ROM 017 / STORY BUG / v0.1</div>
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
              <div class="sb-demon-name">魔王　HP <span class="sb-demon-hp">99999999</span></div>
              <div class="sb-magic-circle"></div>
              <div class="sb-flame left"></div>
              <div class="sb-flame right"></div>

              <div class="sb-demon-wrap">
                <div class="sb-aura"></div>
                <div class="sb-wing left"></div>
                <div class="sb-wing right"></div>
                <div class="sb-cape"></div>
                <div class="sb-body"></div>
                <div class="sb-armor"></div>
                <div class="sb-head"></div>
                <div class="sb-horn left"></div>
                <div class="sb-horn right"></div>
                <div class="sb-crown"></div>
                <div class="sb-eye left"></div>
                <div class="sb-eye right"></div>
                <div class="sb-gem"></div>
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

    root.querySelector(".sb-close").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();close();
    },true);

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
    phase="battle";
    root.querySelector(".sb-loading").style.display="none";
    root.querySelector(".sb-game").classList.add("show");
    renderCommands();
    setLog("魔王が　あらわれた！\n\nしかし　ここへ来た理由は　思い出せない。");
    startBgm();
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
    stopBgm();
    window.removeEventListener("keydown",keyDown,true);
    if(root&&root.parentNode)root.remove();
    root=null;phase="closed";
  }

  window.MEGANE_STORY_BUG={
    version:"v0.1",
    open:open,
    close:close
  };
})();