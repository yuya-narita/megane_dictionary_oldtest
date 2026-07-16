/* 124_peace_shooter_v04.js
   SYNTAX FRONTIER INC.
   BUG No.012 — PEACE SHOOTER v0.4

   v0.2 goals:
   - Looks closer to a real Game Boy-era game
   - Lets the player believe it is a normal shooter first
   - First enemy can be destroyed
   - Only then does the world switch to WAR
   - No fake timeout death: GAME OVER only on hit
   - EXIT is farther away and requires real movement
*/
(function(){
  "use strict";

  var root = null;
  var raf = 0;
  var state = null;
  var keys = {left:false,right:false,up:false,down:false};
  var audio = null;

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

  function ensureStyle(){
    if(document.getElementById("peaceShooterStyleV02")) return;
    var style=document.createElement("style");
    style.id="peaceShooterStyleV02";
    style.textContent=`
      #peaceShooterRoot{
        position:fixed;inset:0;z-index:2147483500;
        background:#0c1a10;color:#cae7ad;overflow:hidden;
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;
        user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;
      }
      #peaceShooterRoot *{box-sizing:border-box}
      .ps-shell{
        position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;
        padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));
        background:
          radial-gradient(circle at 50% 34%,rgba(137,184,112,.08),transparent 46%),
          #0c1a10;
      }
      .ps-head{
        display:flex;align-items:center;justify-content:space-between;
        min-height:40px;border-bottom:2px solid rgba(202,231,173,.34);
        letter-spacing:.10em;font-size:11px;
      }
      .ps-close{
        width:38px;height:38px;border:1px solid rgba(202,231,173,.38);
        border-radius:4px;background:transparent;color:#cae7ad;font:inherit;font-size:20px;line-height:1;
      }
      .ps-stage-wrap{min-height:0;display:grid;place-items:center;padding:10px 0}
      .ps-stage{
        position:relative;width:min(100%,560px);aspect-ratio:4/5;max-height:100%;
        overflow:hidden;border:5px solid #6f9d62;background:#b7d59a;
        box-shadow:inset 0 0 0 4px #17341f,0 12px 40px rgba(0,0,0,.46);
        image-rendering:pixelated;
      }
      .ps-stage::after{
        content:"";position:absolute;inset:0;pointer-events:none;z-index:50;
        background:repeating-linear-gradient(0deg,rgba(18,52,31,.045) 0 1px,transparent 1px 4px);
      }
      .ps-bg{
        position:absolute;inset:0;z-index:0;
        background:
          linear-gradient(#b7d59a 0 58%,#a7c98b 58% 100%);
      }
      .ps-cloud{position:absolute;border:3px solid #17341f;border-radius:50%;opacity:.9}
      .ps-cloud.c1{width:62px;height:24px;left:8%;top:12%}
      .ps-cloud.c2{width:42px;height:18px;right:12%;top:18%}
      .ps-mountain{
        position:absolute;left:50%;bottom:34%;transform:translateX(-50%);
        width:72%;height:28%;clip-path:polygon(0 100%,18% 45%,28% 66%,44% 20%,59% 58%,72% 35%,100% 100%);
        background:#789f68;opacity:.65;
      }
      .ps-ground{
        position:absolute;left:0;right:0;bottom:0;height:42%;
        background:
          repeating-linear-gradient(90deg,rgba(23,52,31,.16) 0 2px,transparent 2px 12px),
          repeating-linear-gradient(0deg,rgba(23,52,31,.12) 0 2px,transparent 2px 12px);
      }
      .ps-hud{
        position:absolute;left:8px;right:8px;top:7px;z-index:20;
        display:flex;justify-content:space-between;font-weight:900;font-size:12px;color:#17341f;
      }
      .ps-title-screen,.ps-message-screen,.ps-credits{
        position:absolute;inset:0;z-index:60;display:grid;place-items:center;
        padding:28px;text-align:center;background:#b7d59a;color:#17341f;
      }
      .ps-logo{
        width:150px;height:70px;margin:0 auto 16px;position:relative;
      }
      .ps-logo::before{
        content:"";position:absolute;left:14px;right:14px;top:20px;height:26px;
        border:5px solid #17341f;border-radius:50% 50% 30% 30%;
        box-shadow:inset 0 -8px 0 #6f9d62;
      }
      .ps-logo::after{
        content:"";position:absolute;left:68px;top:0;width:16px;height:40px;
        background:#17341f;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%);
      }
      .ps-title-block{animation:psBlink 1.15s steps(1,end) infinite}
      @keyframes psBlink{0%,60%{opacity:1}61%,100%{opacity:.48}}
      .ps-game-title{font-size:clamp(24px,7vw,46px);font-weight:1000;letter-spacing:.08em;line-height:1.05;text-shadow:3px 3px 0 #6f9d62}
      .ps-sub{margin-top:18px;font-size:12px;font-weight:900;letter-spacing:.14em}
      .ps-start,.ps-retry{
        margin-top:28px;padding:12px 18px;border:3px solid #17341f;
        background:transparent;color:#17341f;font:inherit;font-weight:1000;letter-spacing:.12em;
      }
      .ps-entity{position:absolute;transform:translate(-50%,-50%);z-index:10}
      .ps-player{
        width:30px;height:36px;
        background:#17341f;
        clip-path:polygon(50% 0,66% 24%,85% 34%,72% 58%,100% 100%,58% 78%,50% 100%,42% 78%,0 100%,28% 58%,15% 34%,34% 24%);
        filter:drop-shadow(3px 3px 0 #6f9d62);
      }
      .ps-enemy{
        width:34px;height:30px;position:absolute;
        border:4px solid #17341f;border-radius:4px;background:#9cbe80;
        box-shadow:inset 0 0 0 3px #b7d59a,3px 3px 0 #6f9d62;
      }
      .ps-enemy::before,.ps-enemy::after{
        content:"";position:absolute;top:8px;width:5px;height:5px;background:#17341f;
      }
      .ps-enemy::before{left:6px}.ps-enemy::after{right:6px}
      .ps-enemy .mouth{position:absolute;left:8px;right:8px;bottom:5px;height:3px;background:#17341f}
      .ps-enemy.friend::after{box-shadow:0 10px 0 -1px #17341f}
      .ps-enemy.hostile{animation:psEnemyShake .16s steps(2,end) infinite}
      @keyframes psEnemyShake{0%{margin-left:-1px}100%{margin-left:1px}}
      .ps-civilian{
        width:18px;height:28px;border:3px solid #17341f;border-radius:5px 5px 2px 2px;
        background:#9cbe80;box-shadow:2px 2px 0 #6f9d62;
      }
      .ps-civilian::before{
        content:"";position:absolute;left:4px;top:5px;width:4px;height:4px;background:#17341f;
        box-shadow:8px 0 0 #17341f;
      }
      .ps-gate{
        position:absolute;right:4%;top:18%;width:42px;height:88px;z-index:5;
        border:5px solid #17341f;background:#8daf74;
        box-shadow:inset 0 0 0 4px #b7d59a,4px 4px 0 #6f9d62;
      }
      .ps-gate::before{
        content:"PEACE";position:absolute;left:50%;top:-20px;transform:translateX(-50%);
        font-size:9px;font-weight:1000;letter-spacing:.08em;color:#17341f;
      }
      .ps-gate::after{
        content:"";position:absolute;left:50%;top:10px;bottom:10px;width:4px;background:#17341f;
        box-shadow:-10px 0 0 #17341f,10px 0 0 #17341f;
      }
      .ps-bullet{
        position:absolute;width:5px;height:12px;background:#17341f;
        transform:translate(-50%,-50%);z-index:15;
      }
      .ps-alert{
        position:absolute;left:50%;top:15%;transform:translateX(-50%);
        z-index:30;padding:6px 10px;border:3px solid #17341f;background:#b7d59a;
        color:#17341f;font-weight:1000;letter-spacing:.12em;animation:psAlert .35s steps(1,end) infinite;
      }
      @keyframes psAlert{0%,49%{opacity:1}50%,100%{opacity:.15}}
      .ps-hitflash{position:absolute;inset:0;z-index:40;background:#17341f;animation:psFlash .18s steps(1,end) forwards}
      @keyframes psFlash{0%,49%{opacity:1}50%,100%{opacity:0}}

      .ps-boss{
        width:98px;height:62px;border:6px solid #17341f;border-radius:8px;background:#8daf74;
        box-shadow:inset 0 0 0 4px #b7d59a,5px 5px 0 #6f9d62;z-index:18;
      }
      .ps-boss::before,.ps-boss::after{content:"";position:absolute;top:16px;width:14px;height:14px;background:#17341f}
      .ps-boss::before{left:18px}.ps-boss::after{right:18px}
      .ps-boss-core{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:34px;height:8px;background:#17341f}
      .ps-boss-hp{position:absolute;left:50%;top:10%;transform:translateX(-50%);z-index:32;padding:5px 8px;border:3px solid #17341f;background:#b7d59a;color:#17341f;font-size:11px;font-weight:1000}
      .ps-controls{
        display:grid;grid-template-columns:132px 1fr;gap:14px;width:min(100%,560px);margin:0 auto;align-items:center;
      }
      .ps-dpad{width:132px;height:132px;position:relative;margin:0 auto}
      .ps-control{
        position:absolute;width:46px;height:46px;border:2px solid rgba(202,231,173,.45);
        background:rgba(202,231,173,.06);color:#cae7ad;font:inherit;font-weight:1000;font-size:17px;
      }
      .ps-control.up{left:43px;top:0}.ps-control.left{left:0;top:43px}
      .ps-control.center{left:43px;top:43px;pointer-events:none;background:rgba(202,231,173,.12)}
      .ps-control.right{right:0;top:43px}.ps-control.down{left:43px;bottom:0}
      .ps-fire{
        min-height:74px;border:2px solid rgba(255,190,170,.65);border-radius:999px;
        background:rgba(255,190,170,.06);color:#ffd0bf;font:inherit;font-weight:1000;font-size:18px;letter-spacing:.08em;
      }
      .ps-control:active,.ps-fire:active{background:rgba(202,231,173,.18)}
      .ps-message-title{font-size:34px;font-weight:1000;letter-spacing:.10em}
      .ps-message-copy{margin-top:16px;font-size:13px;font-weight:900;line-height:1.8}
      .ps-credits{display:block;overflow:hidden;padding:0}
      .ps-credit-roll{
        position:absolute;left:0;right:0;top:100%;padding:50px 20px 160px;
        animation:psCreditsRoll 13s linear forwards;font-size:13px;font-weight:900;line-height:2;letter-spacing:.06em;
      }
      @keyframes psCreditsRoll{from{transform:translateY(0)}to{transform:translateY(-125%)}}
      .ps-credit-title{font-size:34px;font-weight:1000;line-height:1.1;letter-spacing:.08em;margin-bottom:45px}
      .ps-credit-role{opacity:.72;margin-top:28px}
      .ps-credit-name{font-size:18px}
      .ps-credit-stat{margin-top:30px;padding-top:22px;border-top:2px solid #17341f}
      .ps-fragment{margin-top:70px;border:3px solid #17341f;padding:18px 12px}
      .ps-return{
        position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:70;
        padding:10px 16px;border:2px solid #17341f;background:#b7d59a;color:#17341f;
        font:inherit;font-weight:1000;opacity:0;pointer-events:none;transition:opacity .25s ease;
      }
      .ps-return.show{opacity:1;pointer-events:auto}
    `;
    document.head.appendChild(style);
  }

  function tone(freq,duration,type,volume){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return;
      if(!audio||audio.state==="closed") audio=new AC();
      if(audio.state==="suspended") audio.resume();
      var o=audio.createOscillator(),g=audio.createGain();
      o.type=type||"square";o.frequency.value=freq;
      g.gain.setValueAtTime(volume||.025,audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
      o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
    }catch(e){}
  }

  function makeState(){
    return {
      mode:"title",playerX:10,playerY:86,fired:0,kills:0,hostile:false,
      boss:false,bossHP:9999,bossClock:0,bossSurvive:0,bossIntro:0,
      dead:false,clear:false,lastTime:0,enemyClock:0,peaceClock:0,
      enemies:[
        {x:18,y:24,dir:1,speed:4.4,alive:true},
        {x:38,y:20,dir:-1,speed:3.6,alive:true},
        {x:58,y:28,dir:1,speed:4.1,alive:true},
        {x:76,y:22,dir:-1,speed:3.8,alive:true},
        {x:50,y:42,dir:1,speed:2.8,alive:true}
      ],
      civilian:{x:28,y:68},
      playerBullets:[],
      enemyBullets:[]
    };
  }

  function open(){
    close();ensureStyle();state=makeState();
    root=document.createElement("section");root.id="peaceShooterRoot";
    root.innerHTML=`
      <div class="ps-shell">
        <header class="ps-head">
          <span>SYNTAX FRONTIER INC. / BUG No.012</span>
          <button type="button" class="ps-close" aria-label="閉じる">×</button>
        </header>
        <div class="ps-stage-wrap">
          <div class="ps-stage">
            <div class="ps-title-screen">
              <div>
                <div class="ps-logo"></div>
                <div class="ps-game-title">PEACE<br>SHOOTER</div>
                <div class="ps-sub">BUG SOFTWARE / 199X</div>
                <button type="button" class="ps-start">PRESS START</button>
              </div>
            </div>
          </div>
        </div>
        <div class="ps-controls">
          <div class="ps-dpad">
            <button type="button" class="ps-control up">▲</button>
            <button type="button" class="ps-control left">◀</button>
            <button type="button" class="ps-control center"></button>
            <button type="button" class="ps-control right">▶</button>
            <button type="button" class="ps-control down">▼</button>
          </div>
          <button type="button" class="ps-fire">FIRE</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    root.querySelector(".ps-close").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();close()},true);
    root.querySelector(".ps-start").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();startGame()},true);
    ["left","right","up","down"].forEach(function(k){bindHold(root.querySelector(".ps-control."+k),k)});
    root.querySelector(".ps-fire").addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();fire()},true);

    window.addEventListener("keydown",keyDown,true);
    window.addEventListener("keyup",keyUp,true);
  }

  function bindHold(button,key){
    function down(e){e.preventDefault();e.stopPropagation();keys[key]=true;try{button.setPointerCapture(e.pointerId)}catch(_){}}
    function up(e){e.preventDefault();e.stopPropagation();keys[key]=false;try{button.releasePointerCapture(e.pointerId)}catch(_){}}
    button.addEventListener("pointerdown",down,true);
    button.addEventListener("pointerup",up,true);
    button.addEventListener("pointercancel",up,true);
    button.addEventListener("pointerleave",function(){keys[key]=false},true);
  }

  function keyDown(e){
    if(!root) return;
    if(e.key==="ArrowLeft"||e.key==="a") keys.left=true;
    if(e.key==="ArrowRight"||e.key==="d") keys.right=true;
    if(e.key==="ArrowUp"||e.key==="w") keys.up=true;
    if(e.key==="ArrowDown"||e.key==="s") keys.down=true;
    if(e.key===" "||e.key==="z"||e.key==="x"){e.preventDefault();fire()}
    if(e.key==="Escape") close();
  }
  function keyUp(e){
    if(e.key==="ArrowLeft"||e.key==="a") keys.left=false;
    if(e.key==="ArrowRight"||e.key==="d") keys.right=false;
    if(e.key==="ArrowUp"||e.key==="w") keys.up=false;
    if(e.key==="ArrowDown"||e.key==="s") keys.down=false;
  }

  function stage(){return root&&root.querySelector(".ps-stage")}

  function startGame(){
    state=makeState();state.mode="play";
    stage().innerHTML=`
      <div class="ps-bg"></div>
      <div class="ps-cloud c1"></div>
      <div class="ps-cloud c2"></div>
      <div class="ps-mountain"></div>
      <div class="ps-ground"></div>
      <div class="ps-hud">
        <span>LIFE 1</span>
        <span class="ps-state">PEACE</span>
        <span>SHOT <b class="ps-shot-count">0</b></span>
      </div>
      <div class="ps-gate"></div>`;
    tone(260,.08,"square",.02);
    renderEntities();
    cancelAnimationFrame(raf);
    state.lastTime=performance.now();
    raf=requestAnimationFrame(loop);
  }

  function renderEntities(){
    var s=stage();if(!s)return;
    s.querySelectorAll(".ps-entity,.ps-bullet,.ps-alert,.ps-hitflash").forEach(function(el){el.remove()});

    var p=document.createElement("div");
    p.className="ps-entity ps-player";p.style.left=state.playerX+"%";p.style.top=state.playerY+"%";s.appendChild(p);

    state.enemies.forEach(function(en){
      if(!en.alive)return;
      var el=document.createElement("div");
      el.className="ps-entity ps-enemy "+(state.hostile?"hostile":"friend");
      el.style.left=en.x+"%";el.style.top=en.y+"%";
      el.innerHTML='<span class="mouth"></span>';s.appendChild(el);
    });

    if(!state.boss){
      var c=document.createElement("div");
      c.className="ps-entity ps-civilian";c.style.left=state.civilian.x+"%";c.style.top=state.civilian.y+"%";s.appendChild(c);
    }
    if(state.boss){
      var boss=document.createElement("div");
      boss.className="ps-entity ps-boss";boss.style.left="50%";boss.style.top="28%";
      boss.innerHTML='<span class="ps-boss-core"></span>';s.appendChild(boss);
      var hp=document.createElement("div");
      hp.className="ps-boss-hp";hp.textContent="BOSS HP "+state.bossHP;hp.style.top="7%";s.appendChild(hp);
    }

    state.playerBullets.forEach(function(b){
      var el=document.createElement("div");el.className="ps-bullet";el.style.left=b.x+"%";el.style.top=b.y+"%";s.appendChild(el)
    });
    state.enemyBullets.forEach(function(b){
      var el=document.createElement("div");el.className="ps-bullet";el.style.left=b.x+"%";el.style.top=b.y+"%";s.appendChild(el)
    });

    if(state.hostile&&!state.boss){
      var alert=document.createElement("div");alert.className="ps-alert";alert.textContent="HOSTILITY DETECTED";s.appendChild(alert)
    }
    if(state.boss && state.bossIntro>0){
      var alert2=document.createElement("div");
      alert2.className="ps-alert";
      alert2.style.top="16%";
      alert2.style.fontSize="10px";
      alert2.style.padding="4px 7px";
      alert2.textContent="BOSS APPROACH";
      s.appendChild(alert2);
    }
  }

  function fire(){
    if(!state||state.mode!=="play"||state.dead||state.clear)return;
    state.fired++;
    state.playerBullets.push({x:state.playerX,y:state.playerY-4,vy:-52});
    var counter=root.querySelector(".ps-shot-count");if(counter)counter.textContent=String(state.fired);
    tone(150,.10,"square",.035);
  }

  function triggerWar(){
    if(state.hostile)return;
    state.hostile=true;
    var mode=root.querySelector(".ps-state");if(mode)mode.textContent="WAR";
    tone(72,.28,"sawtooth",.05);
    setTimeout(function(){tone(105,.16,"square",.025)},120);
  }

  function spawnBoss(){
    state.boss=true;
    state.hostile=true;
    state.bossIntro=1.6;
    state.enemyBullets=[];
    state.playerBullets=[];
    var mode=root.querySelector(".ps-state");if(mode)mode.textContent="WAR∞";
    tone(48,.55,"sawtooth",.065);
  }

  function loop(now){
    if(!root||!state||state.mode!=="play")return;
    var dt=Math.min(.033,(now-state.lastTime)/1000||.016);state.lastTime=now;

    if(keys.left)state.playerX-=24*dt;
    if(keys.right)state.playerX+=24*dt;
    if(keys.up)state.playerY-=20*dt;
    if(keys.down)state.playerY+=20*dt;
    state.playerX=clamp(state.playerX,5,95);
    state.playerY=clamp(state.playerY,48,91);

    state.enemies.forEach(function(en){
      if(!en.alive)return;
      en.x+=en.dir*en.speed*dt;
      if(en.x<10){en.x=10;en.dir=1}
      if(en.x>88){en.x=88;en.dir=-1}
    });

    state.playerBullets.forEach(function(b){b.y+=b.vy*dt});
    state.playerBullets=state.playerBullets.filter(function(b){return b.y>-5});

    if(!state.boss){
      state.playerBullets.forEach(function(b){
        state.enemies.forEach(function(en){
          if(!en.alive)return;
          if(Math.abs(b.x-en.x)<4.2&&Math.abs(b.y-en.y)<4.5){
            en.alive=false;b.dead=true;state.kills++;
            tone(220,.10,"square",.028);
            if(state.kills===1)triggerWar();
            if(state.kills===5)spawnBoss();
          }
        });
      });
    }else{
      state.playerBullets.forEach(function(b){
        if(Math.abs(b.x-50)<10&&Math.abs(b.y-22)<8){
          b.dead=true;state.bossHP++;
          tone(95,.06,"square",.02);
        }
      });
    }
    state.playerBullets=state.playerBullets.filter(function(b){return !b.dead});

    if(state.boss){
      state.bossClock+=dt;
      state.bossSurvive+=dt;
      if(state.bossIntro>0) state.bossIntro=Math.max(0,state.bossIntro-dt);
      if(state.bossClock>=.22){
        state.bossClock=0;
        [-1.05,-.75,-.45,-.15,.15,.45,.75,1.05].forEach(function(a){
          state.enemyBullets.push({x:50,y:28,vx:Math.sin(a)*18,vy:Math.cos(a)*22});
        });
        tone(62,.04,"square",.01);
      }
      if(state.bossSurvive>=30){unresolvedEnding();return}
    }else if(state.hostile){
      state.enemyClock+=dt;
      if(state.enemyClock>=.28){
        state.enemyClock=0;
        state.enemies.forEach(function(en,i){
          if(!en.alive)return;
          var dx=state.playerX-en.x,dy=state.playerY-en.y,len=Math.max(1,Math.hypot(dx,dy));
          state.enemyBullets.push({x:en.x,y:en.y+3,vx:(dx/len)*(18+i),vy:(dy/len)*(18+i)});
        });
        tone(92,.035,"square",.012);
      }
    }else{
      state.peaceClock+=dt;
      // civilian slowly waves by shifting one pixel equivalent
      state.civilian.x=28+Math.sin(state.peaceClock*2.4)*1.2;
    }

    state.enemyBullets.forEach(function(b){b.x+=b.vx*dt;b.y+=b.vy*dt});
    state.enemyBullets=state.enemyBullets.filter(function(b){return b.x>-5&&b.x<105&&b.y>-5&&b.y<105});

    var hit=state.enemyBullets.some(function(b){
      return Math.abs(b.x-state.playerX)<3.5&&Math.abs(b.y-state.playerY)<4.2;
    });
    if(hit){gameOver();return}

    // EXIT is top-right, not beside spawn.
    if(!state.boss && state.playerX>=86 && state.playerY<=34){
      clearGame();
      return;
    }

    renderEntities();
    raf=requestAnimationFrame(loop);
  }

  function gameOver(){
    state.dead=true;state.mode="result";cancelAnimationFrame(raf);
    tone(55,.45,"sawtooth",.045);
    stage().innerHTML=`
      <div class="ps-message-screen">
        <div>
          <div class="ps-message-title">GAME OVER</div>
          <div class="ps-message-copy">
            HOSTILITY CONFIRMED.<br>
            DEFENSE PROTOCOL: VALID<br><br>
            ENEMIES DEFEATED: ${state.kills}
          </div>
          <button type="button" class="ps-retry">RETRY</button>
        </div>
      </div>`;
    stage().querySelector(".ps-retry").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();startGame()},true);
  }

  function unresolvedEnding(){
    state.clear=true;state.mode="credits";cancelAnimationFrame(raf);
    stage().innerHTML=`
      <div class="ps-credits">
        <div class="ps-credit-roll">
          <div class="ps-credit-title">PEACE<br>SHOOTER</div>
          <div class="ps-credit-role">ENDING</div>
          <div class="ps-credit-name">UNRESOLVED WAR</div>
          <div class="ps-credit-role">BOSS DEFEATED</div><div class="ps-credit-name">0</div>
          <div class="ps-credit-role">PLAYER DEFEATED</div><div class="ps-credit-name">0</div>
          <div class="ps-credit-role">CONFLICT STATUS</div><div class="ps-credit-name">ONGOING</div>
          <div class="ps-credit-role">PROGRAMMING</div><div class="ps-credit-name">NYX</div>
          <div class="ps-credit-role">GAME DESIGN</div><div class="ps-credit-name">XERIS</div>
          <div class="ps-fragment">
            RECOVERED FRAGMENT<br><br>012-B<br><br>
            VICTORY CONDITION<br>NOT FOUND.
          </div>
          <div style="margin-top:70px">OBSERVATION COMPLETE.</div>
        </div>
        <button type="button" class="ps-return">RETURN TO CARD</button>
      </div>`;
    var btn=stage().querySelector(".ps-return");
    setTimeout(function(){if(btn)btn.classList.add("show")},11200);
    btn.addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();close()},true);
    try{localStorage.setItem("meganeBugFragment012B","1")}catch(e){}
  }

  function clearGame(){
    state.clear=true;state.mode="credits";cancelAnimationFrame(raf);
    tone(330,.12,"square",.025);setTimeout(function(){tone(440,.16,"square",.018)},120);
    var peace=Math.max(0,100-state.kills*100);
    stage().innerHTML=`
      <div class="ps-credits">
        <div class="ps-credit-roll">
          <div class="ps-credit-title">PEACE<br>SHOOTER</div>

          <div class="ps-credit-role">PRESENTED BY</div>
          <div class="ps-credit-name">SYNTAX FRONTIER INC.</div>

          <div class="ps-credit-role">PROGRAMMING</div>
          <div class="ps-credit-name">NYX</div>

          <div class="ps-credit-role">GAME DESIGN</div>
          <div class="ps-credit-name">XERIS</div>

          <div class="ps-credit-role">TEST PLAYER</div>
          <div class="ps-credit-name">YOU</div>

          <div class="ps-credit-stat">
            BULLETS FIRED<br><strong>${state.fired}</strong><br><br>
            ENEMIES DEFEATED<br><strong>${state.kills}</strong><br><br>
            PEACE INDEX<br><strong>${peace}%</strong>
          </div>

          <div class="ps-credit-role">SPECIAL THANKS</div>
          <div class="ps-credit-name">THE OBSERVER</div>

          <div class="ps-fragment">
            RECOVERED FRAGMENT<br><br>
            012-A<br><br>
            HOSTILITY REQUIRES<br>
            AN INITIATOR.
          </div>

          <div style="margin-top:70px">OBSERVATION COMPLETE.</div>
        </div>
        <button type="button" class="ps-return">RETURN TO CARD</button>
      </div>`;
    var btn=stage().querySelector(".ps-return");
    setTimeout(function(){if(btn)btn.classList.add("show")},11200);
    btn.addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();close()},true);

    try{
      localStorage.setItem("meganeBugFragment012A","1");
      window.dispatchEvent(new CustomEvent("megane:bugFragmentRecovered",{detail:{card:12,fragment:"012-A"}}));
    }catch(e){}
  }

  function close(){
    cancelAnimationFrame(raf);raf=0;
    keys.left=keys.right=keys.up=keys.down=false;
    window.removeEventListener("keydown",keyDown,true);
    window.removeEventListener("keyup",keyUp,true);
    if(root&&root.parentNode)root.remove();
    root=null;state=null;
  }

  window.MEGANE_PEACE_SHOOTER={version:"v0.4",open:open,close:close};
})();