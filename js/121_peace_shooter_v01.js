/* 121_peace_shooter_v01.js
   SYNTAX FRONTIER INC.
   BUG No.012 — PEACE SHOOTER v0.1

   Rule:
   - Fire once -> WAR
   - Reach EXIT without firing -> CLEAR
*/
(function(){
  "use strict";

  var root = null;
  var raf = 0;
  var state = null;
  var keys = {left:false,right:false};
  var audio = null;

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function ensureStyle(){
    if(document.getElementById("peaceShooterStyleV01")) return;

    var style = document.createElement("style");
    style.id = "peaceShooterStyleV01";
    style.textContent = `
      #peaceShooterRoot{
        position:fixed;
        inset:0;
        z-index:2147483500;
        background:#0d1a12;
        color:#c8e7b0;
        overflow:hidden;
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;
        user-select:none;
        -webkit-user-select:none;
        -webkit-touch-callout:none;
        touch-action:none;
      }
      #peaceShooterRoot *{box-sizing:border-box}
      .ps-shell{
        position:absolute;
        inset:0;
        display:grid;
        grid-template-rows:auto 1fr auto;
        padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));
        background:
          radial-gradient(circle at 50% 34%,rgba(137,184,112,.08),transparent 46%),
          #0d1a12;
      }
      .ps-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        min-height:40px;
        border-bottom:2px solid rgba(200,231,176,.34);
        letter-spacing:.10em;
        font-size:11px;
      }
      .ps-close{
        width:38px;height:38px;border:1px solid rgba(200,231,176,.38);
        border-radius:4px;background:transparent;color:#c8e7b0;
        font:inherit;font-size:20px;line-height:1;
      }
      .ps-stage-wrap{
        min-height:0;
        display:grid;
        place-items:center;
        padding:10px 0;
      }
      .ps-stage{
        position:relative;
        width:min(100%,560px);
        aspect-ratio:4/5;
        max-height:100%;
        overflow:hidden;
        border:4px solid #6f9d62;
        background:#b7d59a;
        box-shadow:
          inset 0 0 0 4px #17341f,
          0 12px 40px rgba(0,0,0,.46);
        image-rendering:pixelated;
      }
      .ps-stage::after{
        content:"";
        position:absolute;inset:0;pointer-events:none;z-index:20;
        background:repeating-linear-gradient(
          0deg,
          rgba(18,52,31,.05) 0 1px,
          transparent 1px 4px
        );
      }
      .ps-hud{
        position:absolute;left:8px;right:8px;top:7px;z-index:12;
        display:flex;justify-content:space-between;
        font-weight:900;font-size:12px;color:#17341f;
      }
      .ps-title-screen,
      .ps-message-screen,
      .ps-credits{
        position:absolute;inset:0;z-index:30;
        display:grid;place-items:center;
        padding:28px;text-align:center;
        background:#b7d59a;color:#17341f;
      }
      .ps-title-block{animation:psBlink 1.15s steps(1,end) infinite}
      @keyframes psBlink{0%,60%{opacity:1}61%,100%{opacity:.48}}
      .ps-game-title{
        font-size:clamp(24px,7vw,46px);
        font-weight:1000;
        letter-spacing:.08em;
        line-height:1.05;
        text-shadow:3px 3px 0 #6f9d62;
      }
      .ps-sub{
        margin-top:18px;
        font-size:12px;
        font-weight:900;
        letter-spacing:.14em;
      }
      .ps-start{
        margin-top:28px;
        padding:12px 18px;
        border:3px solid #17341f;
        background:transparent;
        color:#17341f;
        font:inherit;font-weight:1000;
        letter-spacing:.12em;
      }
      .ps-entity{
        position:absolute;
        display:grid;
        place-items:center;
        transform:translate(-50%,-50%);
        color:#17341f;
        font-weight:1000;
        z-index:5;
      }
      .ps-player{
        width:34px;height:34px;
        clip-path:polygon(50% 0,100% 100%,50% 77%,0 100%);
        background:#17341f;
      }
      .ps-enemy{
        width:30px;height:24px;
        border:4px solid #17341f;
        border-top-width:7px;
      }
      .ps-enemy::before,.ps-enemy::after{
        content:"";position:absolute;top:7px;width:4px;height:4px;background:#17341f;
      }
      .ps-enemy::before{left:5px}.ps-enemy::after{right:5px}
      .ps-exit{
        position:absolute;right:4px;bottom:8%;
        width:20px;height:56px;border:4px solid #17341f;
        background:repeating-linear-gradient(0deg,#17341f 0 4px,transparent 4px 8px);
        z-index:4;
      }
      .ps-exit-label{
        position:absolute;right:2px;bottom:calc(8% + 60px);
        font-size:10px;font-weight:1000;color:#17341f;
      }
      .ps-bullet{
        position:absolute;width:4px;height:11px;background:#17341f;
        transform:translate(-50%,-50%);z-index:8;
      }
      .ps-alert{
        position:absolute;left:50%;top:15%;transform:translateX(-50%);
        z-index:15;padding:6px 10px;border:3px solid #17341f;
        background:#b7d59a;color:#17341f;font-weight:1000;
        letter-spacing:.12em;animation:psAlert .35s steps(1,end) infinite;
      }
      @keyframes psAlert{0%,49%{opacity:1}50%,100%{opacity:.15}}
      .ps-controls{
        display:grid;
        grid-template-columns:1fr 1fr 1.2fr;
        gap:10px;
        width:min(100%,560px);
        margin:0 auto;
      }
      .ps-control{
        min-height:56px;
        border:2px solid rgba(200,231,176,.45);
        background:rgba(200,231,176,.06);
        color:#c8e7b0;
        font:inherit;font-weight:1000;font-size:17px;
        letter-spacing:.08em;
      }
      .ps-control.fire{
        border-color:rgba(255,190,170,.65);
        color:#ffd0bf;
      }
      .ps-control:active{background:rgba(200,231,176,.18)}
      .ps-message-title{
        font-size:34px;font-weight:1000;letter-spacing:.10em;
      }
      .ps-message-copy{
        margin-top:16px;font-size:13px;font-weight:900;line-height:1.8;
      }
      .ps-retry{
        margin-top:28px;padding:11px 16px;border:3px solid #17341f;
        background:transparent;color:#17341f;font:inherit;font-weight:1000;
      }
      .ps-credits{
        display:block;
        overflow:hidden;
        padding:0;
      }
      .ps-credit-roll{
        position:absolute;left:0;right:0;top:100%;
        padding:50px 20px 160px;
        animation:psCreditsRoll 13s linear forwards;
        font-size:13px;font-weight:900;line-height:2;
        letter-spacing:.06em;
      }
      @keyframes psCreditsRoll{
        from{transform:translateY(0)}
        to{transform:translateY(-125%)}
      }
      .ps-credit-title{
        font-size:34px;font-weight:1000;line-height:1.1;
        letter-spacing:.08em;margin-bottom:45px;
      }
      .ps-credit-role{opacity:.72;margin-top:28px}
      .ps-credit-name{font-size:18px}
      .ps-credit-stat{
        margin-top:30px;padding-top:22px;border-top:2px solid #17341f;
      }
      .ps-fragment{
        margin-top:70px;
        border:3px solid #17341f;
        padding:18px 12px;
      }
      .ps-return{
        position:absolute;left:50%;bottom:16px;transform:translateX(-50%);
        z-index:40;padding:10px 16px;border:2px solid #17341f;
        background:#b7d59a;color:#17341f;font:inherit;font-weight:1000;
        opacity:0;pointer-events:none;transition:opacity .25s ease;
      }
      .ps-return.show{opacity:1;pointer-events:auto}
    `;
    document.head.appendChild(style);
  }

  function tone(freq,duration,type,volume){
    try{
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      if(!audio || audio.state === "closed") audio = new AC();
      if(audio.state === "suspended") audio.resume();
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(volume || .025,audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime+duration);
    }catch(e){}
  }

  function makeState(){
    return {
      mode:"title",
      playerX:10,
      playerY:88,
      fired:0,
      hostile:false,
      dead:false,
      clear:false,
      lastTime:0,
      enemyClock:0,
      warClock:0,
      enemies:[
        {x:19,y:24,dir:1,speed:4.4},
        {x:40,y:20,dir:-1,speed:3.6},
        {x:61,y:28,dir:1,speed:4.1},
        {x:80,y:22,dir:-1,speed:3.8}
      ],
      playerBullets:[],
      enemyBullets:[]
    };
  }

  function open(){
    close();
    ensureStyle();
    state = makeState();

    root = document.createElement("section");
    root.id = "peaceShooterRoot";
    root.innerHTML = `
      <div class="ps-shell">
        <header class="ps-head">
          <span>SYNTAX FRONTIER INC. / BUG No.012</span>
          <button type="button" class="ps-close" aria-label="閉じる">×</button>
        </header>
        <div class="ps-stage-wrap">
          <div class="ps-stage">
            <div class="ps-title-screen">
              <div>
                <div class="ps-game-title">PEACE<br>SHOOTER</div>
                <div class="ps-sub">BUG SOFTWARE / 199X</div>
                <button type="button" class="ps-start">PRESS START</button>
              </div>
            </div>
          </div>
        </div>
        <div class="ps-controls">
          <button type="button" class="ps-control left">◀</button>
          <button type="button" class="ps-control right">▶</button>
          <button type="button" class="ps-control fire">FIRE</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector(".ps-close").addEventListener("pointerup",function(e){
      e.preventDefault(); e.stopPropagation(); close();
    },true);
    root.querySelector(".ps-start").addEventListener("pointerup",function(e){
      e.preventDefault(); e.stopPropagation(); startGame();
    },true);

    bindHold(root.querySelector(".ps-control.left"),"left");
    bindHold(root.querySelector(".ps-control.right"),"right");
    root.querySelector(".ps-control.fire").addEventListener("pointerdown",function(e){
      e.preventDefault(); e.stopPropagation(); fire();
    },true);

    window.addEventListener("keydown",keyDown,true);
    window.addEventListener("keyup",keyUp,true);
  }

  function bindHold(button,key){
    function down(e){
      e.preventDefault(); e.stopPropagation();
      keys[key]=true;
      try{ button.setPointerCapture(e.pointerId); }catch(_){}
    }
    function up(e){
      e.preventDefault(); e.stopPropagation();
      keys[key]=false;
      try{ button.releasePointerCapture(e.pointerId); }catch(_){}
    }
    button.addEventListener("pointerdown",down,true);
    button.addEventListener("pointerup",up,true);
    button.addEventListener("pointercancel",up,true);
    button.addEventListener("pointerleave",function(){ keys[key]=false; },true);
  }

  function keyDown(e){
    if(!root) return;
    if(e.key==="ArrowLeft" || e.key==="a") keys.left=true;
    if(e.key==="ArrowRight" || e.key==="d") keys.right=true;
    if(e.key===" " || e.key==="z" || e.key==="x"){
      e.preventDefault(); fire();
    }
    if(e.key==="Escape") close();
  }

  function keyUp(e){
    if(e.key==="ArrowLeft" || e.key==="a") keys.left=false;
    if(e.key==="ArrowRight" || e.key==="d") keys.right=false;
  }

  function stage(){ return root && root.querySelector(".ps-stage"); }

  function startGame(){
    if(!root) return;
    state = makeState();
    state.mode = "play";
    stage().innerHTML = `
      <div class="ps-hud">
        <span>LIFE 1</span>
        <span class="ps-state">PEACE</span>
        <span>SHOT <b class="ps-shot-count">0</b></span>
      </div>
      <div class="ps-exit-label">EXIT</div>
      <div class="ps-exit"></div>
    `;
    tone(260,.08,"square",.02);
    renderEntities();
    cancelAnimationFrame(raf);
    state.lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function renderEntities(){
    var s = stage();
    if(!s) return;

    s.querySelectorAll(".ps-entity,.ps-bullet,.ps-alert").forEach(function(el){ el.remove(); });

    var p = document.createElement("div");
    p.className = "ps-entity ps-player";
    p.style.left = state.playerX+"%";
    p.style.top = state.playerY+"%";
    s.appendChild(p);

    state.enemies.forEach(function(en){
      var el = document.createElement("div");
      el.className = "ps-entity ps-enemy";
      el.style.left = en.x+"%";
      el.style.top = en.y+"%";
      s.appendChild(el);
    });

    state.playerBullets.forEach(function(b){
      var el = document.createElement("div");
      el.className = "ps-bullet";
      el.style.left = b.x+"%";
      el.style.top = b.y+"%";
      s.appendChild(el);
    });

    state.enemyBullets.forEach(function(b){
      var el = document.createElement("div");
      el.className = "ps-bullet";
      el.style.left = b.x+"%";
      el.style.top = b.y+"%";
      s.appendChild(el);
    });

    if(state.hostile){
      var alert = document.createElement("div");
      alert.className = "ps-alert";
      alert.textContent = "WAR MODE";
      s.appendChild(alert);
    }
  }

  function fire(){
    if(!state || state.mode!=="play" || state.dead || state.clear) return;

    state.fired++;
    state.hostile = true;
    state.playerBullets.push({x:state.playerX,y:state.playerY-4,vy:-45});

    var counter = root.querySelector(".ps-shot-count");
    if(counter) counter.textContent=String(state.fired);
    var mode = root.querySelector(".ps-state");
    if(mode) mode.textContent="WAR";

    tone(150,.10,"square",.035);
  }

  function loop(now){
    if(!root || !state || state.mode!=="play") return;

    var dt = Math.min(.033,(now-state.lastTime)/1000 || .016);
    state.lastTime = now;

    if(keys.left) state.playerX -= 28*dt;
    if(keys.right) state.playerX += 28*dt;
    state.playerX = clamp(state.playerX,5,95);

    state.enemies.forEach(function(en){
      en.x += en.dir*en.speed*dt;
      if(en.x<10){en.x=10;en.dir=1}
      if(en.x>90){en.x=90;en.dir=-1}
    });

    state.playerBullets.forEach(function(b){ b.y += b.vy*dt; });
    state.playerBullets = state.playerBullets.filter(function(b){ return b.y>-5; });

    if(state.hostile){
      state.warClock += dt;
      state.enemyClock += dt;

      if(state.enemyClock >= .18){
        state.enemyClock = 0;
        state.enemies.forEach(function(en,i){
          var dx = state.playerX-en.x;
          var dy = state.playerY-en.y;
          var len = Math.max(1,Math.hypot(dx,dy));
          state.enemyBullets.push({
            x:en.x,
            y:en.y+3,
            vx:(dx/len)*(25+i*1.5),
            vy:(dy/len)*(25+i*1.5)
          });
        });
        tone(92,.035,"square",.013);
      }
    }

    state.enemyBullets.forEach(function(b){
      b.x += b.vx*dt;
      b.y += b.vy*dt;
    });
    state.enemyBullets = state.enemyBullets.filter(function(b){
      return b.x>-5&&b.x<105&&b.y>-5&&b.y<105;
    });

    var hit = state.enemyBullets.some(function(b){
      return Math.abs(b.x-state.playerX)<3.8 && Math.abs(b.y-state.playerY)<4.2;
    });

    if(hit || (state.hostile && state.warClock>3.2)){
      gameOver();
      return;
    }

    if(!state.hostile && state.playerX>=91){
      peaceClear();
      return;
    }

    renderEntities();
    raf = requestAnimationFrame(loop);
  }

  function gameOver(){
    state.dead = true;
    state.mode = "result";
    cancelAnimationFrame(raf);
    tone(55,.45,"sawtooth",.045);

    stage().innerHTML = `
      <div class="ps-message-screen">
        <div>
          <div class="ps-message-title">GAME OVER</div>
          <div class="ps-message-copy">
            FIRST SHOT DETECTED.<br>
            DEFENSE PROTOCOL: VALID
          </div>
          <button type="button" class="ps-retry">RETRY</button>
        </div>
      </div>
    `;
    stage().querySelector(".ps-retry").addEventListener("pointerup",function(e){
      e.preventDefault(); e.stopPropagation(); startGame();
    },true);
  }

  function peaceClear(){
    state.clear = true;
    state.mode = "credits";
    cancelAnimationFrame(raf);
    tone(330,.12,"square",.025);
    setTimeout(function(){ tone(440,.16,"square",.018); },120);

    stage().innerHTML = `
      <div class="ps-credits">
        <div class="ps-credit-roll">
          <div class="ps-credit-title">PEACE<br>SHOOTER</div>

          <div class="ps-credit-role">PRESENTED BY</div>
          <div class="ps-credit-name">SYNTAX FRONTIER INC.</div>

          <div class="ps-credit-role">PROGRAMMING</div>
          <div class="ps-credit-name">NYX</div>

          <div class="ps-credit-role">GAME DESIGN</div>
          <div class="ps-credit-name">XERIS</div>

          <div class="ps-credit-role">QUALITY ASSURANCE</div>
          <div class="ps-credit-name">UNASSIGNED</div>

          <div class="ps-credit-stat">
            BULLETS FIRED<br>
            <strong>0</strong><br><br>
            ENEMIES DEFEATED<br>
            <strong>0</strong><br><br>
            PEACE INDEX<br>
            <strong>100%</strong>
          </div>

          <div class="ps-credit-role">SPECIAL THANKS</div>
          <div class="ps-credit-name">YOU</div>

          <div class="ps-fragment">
            RECOVERED FRAGMENT<br><br>
            012-A<br><br>
            HOSTILITY REQUIRES<br>
            AN INITIATOR.
          </div>

          <div style="margin-top:70px">OBSERVATION COMPLETE.</div>
        </div>
        <button type="button" class="ps-return">RETURN TO CARD</button>
      </div>
    `;

    var btn = stage().querySelector(".ps-return");
    setTimeout(function(){ if(btn) btn.classList.add("show"); },11200);
    btn.addEventListener("pointerup",function(e){
      e.preventDefault(); e.stopPropagation(); close();
    },true);

    try{
      localStorage.setItem("meganeBugFragment012A","1");
      window.dispatchEvent(new CustomEvent("megane:bugFragmentRecovered",{
        detail:{card:12,fragment:"012-A"}
      }));
    }catch(e){}
  }

  function close(){
    cancelAnimationFrame(raf);
    raf = 0;
    keys.left = false;
    keys.right = false;

    window.removeEventListener("keydown",keyDown,true);
    window.removeEventListener("keyup",keyUp,true);

    if(root && root.parentNode) root.remove();
    root = null;
    state = null;
  }

  window.MEGANE_PEACE_SHOOTER = {
    version:"v0.1",
    open:open,
    close:close
  };
})();