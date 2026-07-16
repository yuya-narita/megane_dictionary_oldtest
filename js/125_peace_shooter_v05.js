/* 125_peace_shooter_v05.js
   SYNTAX FRONTIER INC.
   BUG No.012 — PEACE SHOOTER v0.5

   Vertical scrolling edition:
   - The player appears to fly forward while the world descends.
   - Five neutral craft pass through the route.
   - Destroying the first craft starts WAR.
   - Destroying all five summons an invincible boss.
   - Firing at the boss increases its HP.
*/
(function(){
  "use strict";

  var root=null;
  var raf=0;
  var state=null;
  var audio=null;
  var keys={left:false,right:false,up:false,down:false};

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function ensureStyle(){
    if(document.getElementById("peaceShooterStyleV05")) return;

    var style=document.createElement("style");
    style.id="peaceShooterStyleV05";
    style.textContent=`
      #peaceShooterRoot{
        position:fixed;inset:0;z-index:2147483500;
        overflow:hidden;background:#0c1a10;color:#cae7ad;
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;
        user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;
      }
      #peaceShooterRoot *{box-sizing:border-box}
      .ps-shell{
        position:absolute;inset:0;
        display:grid;grid-template-rows:auto 1fr auto;
        padding:max(12px,env(safe-area-inset-top)) 12px max(10px,env(safe-area-inset-bottom));
        background:radial-gradient(circle at 50% 32%,rgba(137,184,112,.08),transparent 48%),#0c1a10;
      }
      .ps-head{
        min-height:40px;display:flex;align-items:center;justify-content:space-between;
        border-bottom:2px solid rgba(202,231,173,.34);
        font-size:11px;letter-spacing:.1em;
      }
      .ps-close{
        width:38px;height:38px;border:1px solid rgba(202,231,173,.38);
        border-radius:4px;background:transparent;color:#cae7ad;
        font:inherit;font-size:20px;
      }
      .ps-stage-wrap{min-height:0;display:grid;place-items:center;padding:9px 0}
      .ps-stage{
        position:relative;width:min(100%,560px);aspect-ratio:4/5;max-height:100%;
        overflow:hidden;border:5px solid #6f9d62;background:#b7d59a;
        box-shadow:inset 0 0 0 4px #17341f,0 12px 40px rgba(0,0,0,.46);
        image-rendering:pixelated;
      }
      .ps-stage::after{
        content:"";position:absolute;inset:0;z-index:80;pointer-events:none;
        background:repeating-linear-gradient(0deg,rgba(18,52,31,.045) 0 1px,transparent 1px 4px);
      }
      .ps-world{
        position:absolute;inset:0;z-index:0;
        background-color:#b7d59a;
        background-image:
          linear-gradient(90deg,transparent 0 12%,rgba(23,52,31,.12) 12% 13%,transparent 13% 87%,rgba(23,52,31,.12) 87% 88%,transparent 88%),
          repeating-linear-gradient(0deg,rgba(23,52,31,.13) 0 3px,transparent 3px 27px),
          repeating-linear-gradient(90deg,rgba(23,52,31,.08) 0 2px,transparent 2px 34px);
      }
      .ps-road{
        position:absolute;left:27%;right:27%;top:-15%;bottom:-15%;z-index:1;
        border-left:4px solid rgba(23,52,31,.38);
        border-right:4px solid rgba(23,52,31,.38);
        background:
          repeating-linear-gradient(0deg,transparent 0 28px,rgba(23,52,31,.22) 28px 34px);
      }
      .ps-scenery{position:absolute;z-index:2;color:#17341f;opacity:.52}
      .ps-tree{
        width:26px;height:31px;background:#789f68;
        clip-path:polygon(50% 0,100% 72%,67% 72%,67% 100%,33% 100%,33% 72%,0 72%);
      }
      .ps-rock{width:30px;height:18px;background:#789f68;clip-path:polygon(12% 100%,0 54%,26% 8%,76% 0,100% 58%,88% 100%)}
      .ps-hud{
        position:absolute;left:8px;right:8px;top:7px;z-index:40;
        display:flex;justify-content:space-between;color:#17341f;
        font-size:12px;font-weight:1000;
      }
      .ps-title-screen,.ps-message-screen,.ps-credits{
        position:absolute;inset:0;z-index:100;
        display:grid;place-items:center;padding:28px;text-align:center;
        background:#b7d59a;color:#17341f;
      }
      .ps-logo{width:150px;height:70px;margin:0 auto 16px;position:relative}
      .ps-logo::before{
        content:"";position:absolute;left:14px;right:14px;top:20px;height:26px;
        border:5px solid #17341f;border-radius:50% 50% 30% 30%;
        box-shadow:inset 0 -8px 0 #6f9d62;
      }
      .ps-logo::after{
        content:"";position:absolute;left:68px;top:0;width:16px;height:40px;
        background:#17341f;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%);
      }
      .ps-game-title{
        font-size:clamp(24px,7vw,46px);font-weight:1000;line-height:1.05;
        letter-spacing:.08em;text-shadow:3px 3px 0 #6f9d62;
      }
      .ps-sub{margin-top:18px;font-size:12px;font-weight:1000;letter-spacing:.14em}
      .ps-start,.ps-retry{
        margin-top:28px;padding:12px 18px;border:3px solid #17341f;
        background:transparent;color:#17341f;font:inherit;font-weight:1000;letter-spacing:.12em;
      }
      .ps-entity{position:absolute;transform:translate(-50%,-50%);z-index:20}
      .ps-player{
        width:30px;height:37px;background:#17341f;
        clip-path:polygon(50% 0,66% 23%,86% 35%,72% 58%,100% 100%,58% 79%,50% 100%,42% 79%,0 100%,28% 58%,14% 35%,34% 23%);
        filter:drop-shadow(3px 3px 0 #6f9d62);
      }
      .ps-enemy{
        width:38px;height:31px;border:4px solid #17341f;border-radius:4px;
        background:#9cbe80;box-shadow:inset 0 0 0 3px #b7d59a,3px 3px 0 #6f9d62;
      }
      .ps-enemy::before,.ps-enemy::after{
        content:"";position:absolute;top:8px;width:5px;height:5px;background:#17341f;
      }
      .ps-enemy::before{left:7px}.ps-enemy::after{right:7px}
      .ps-enemy .mouth{position:absolute;left:9px;right:9px;bottom:5px;height:3px;background:#17341f}
      .ps-enemy.hostile{animation:psEnemyShake .15s steps(2,end) infinite}
      @keyframes psEnemyShake{0%{margin-left:-1px}100%{margin-left:1px}}
      .ps-gate{
        width:92px;height:42px;border:5px solid #17341f;background:#8daf74;
        box-shadow:inset 0 0 0 4px #b7d59a,4px 4px 0 #6f9d62;
      }
      .ps-gate::before{
        content:"PEACE GATE";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        width:100%;font-size:10px;font-weight:1000;text-align:center;letter-spacing:.06em;
      }
      .ps-bullet{
        position:absolute;width:5px;height:12px;background:#17341f;
        transform:translate(-50%,-50%);z-index:28;
      }
      .ps-alert{
        position:absolute;left:50%;top:14%;transform:translateX(-50%);
        z-index:60;padding:6px 10px;border:3px solid #17341f;
        background:#b7d59a;color:#17341f;font-size:12px;font-weight:1000;
        letter-spacing:.1em;animation:psAlert .35s steps(1,end) infinite;
      }
      @keyframes psAlert{0%,49%{opacity:1}50%,100%{opacity:.18}}
      .ps-boss{
        width:112px;height:70px;border:6px solid #17341f;border-radius:8px;
        background:#8daf74;box-shadow:inset 0 0 0 4px #b7d59a,5px 5px 0 #6f9d62;
      }
      .ps-boss::before,.ps-boss::after{
        content:"";position:absolute;top:18px;width:15px;height:15px;background:#17341f;
      }
      .ps-boss::before{left:20px}.ps-boss::after{right:20px}
      .ps-boss-core{
        position:absolute;left:50%;bottom:11px;transform:translateX(-50%);
        width:38px;height:9px;background:#17341f;
      }
      .ps-boss-hp{
        position:absolute;left:50%;top:7%;transform:translateX(-50%);
        z-index:62;padding:5px 8px;border:3px solid #17341f;
        background:#b7d59a;color:#17341f;font-size:11px;font-weight:1000;
      }
      .ps-controls{
        display:grid;grid-template-columns:132px 1fr;gap:14px;
        width:min(100%,560px);margin:0 auto;align-items:center;
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
        background:rgba(255,190,170,.06);color:#ffd0bf;
        font:inherit;font-size:18px;font-weight:1000;letter-spacing:.08em;
      }
      .ps-control:active,.ps-fire:active{background:rgba(202,231,173,.18)}
      .ps-message-title{font-size:34px;font-weight:1000;letter-spacing:.1em}
      .ps-message-copy{margin-top:16px;font-size:13px;font-weight:1000;line-height:1.8}
      .ps-credits{display:block;overflow:hidden;padding:0}
      .ps-credit-roll{
        position:absolute;left:0;right:0;top:100%;padding:50px 20px 160px;
        animation:psCreditsRoll 13s linear forwards;
        font-size:13px;font-weight:1000;line-height:2;letter-spacing:.06em;
      }
      @keyframes psCreditsRoll{from{transform:translateY(0)}to{transform:translateY(-125%)}}
      .ps-credit-title{font-size:34px;font-weight:1000;line-height:1.1;letter-spacing:.08em;margin-bottom:45px}
      .ps-credit-role{opacity:.72;margin-top:28px}.ps-credit-name{font-size:18px}
      .ps-credit-stat{margin-top:30px;padding-top:22px;border-top:2px solid #17341f}
      .ps-fragment{margin-top:70px;border:3px solid #17341f;padding:18px 12px}
      .ps-return{
        position:absolute;left:50%;bottom:16px;transform:translateX(-50%);
        z-index:110;padding:10px 16px;border:2px solid #17341f;
        background:#b7d59a;color:#17341f;font:inherit;font-weight:1000;
        opacity:0;pointer-events:none;transition:opacity .25s ease;
      }
      .ps-return.show{opacity:1;pointer-events:auto}
    `;
    document.head.appendChild(style);
  }

  function tone(freq,duration,type,volume){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!audio||audio.state==="closed")audio=new AC();
      if(audio.state==="suspended")audio.resume();
      var o=audio.createOscillator(),g=audio.createGain();
      o.type=type||"square";
      o.frequency.value=freq;
      g.gain.setValueAtTime(volume||.025,audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
      o.connect(g);g.connect(audio.destination);
      o.start();o.stop(audio.currentTime+duration);
    }catch(e){}
  }

  function makeState(){
    return {
      mode:"title",
      playerX:50,playerY:82,
      fired:0,kills:0,hostile:false,
      dead:false,clear:false,lastTime:0,
      scroll:0,worldDistance:0,
      enemyClock:0,
      gateSpawned:false,gateY:-12,
      boss:false,bossY:-15,bossHP:9999,bossClock:0,bossSurvive:0,bossIntro:0,
      enemies:[
        {x:22,y:-8, drift: 6, alive:true,passed:false},
        {x:69,y:-31,drift:-7, alive:true,passed:false},
        {x:42,y:-54,drift: 5, alive:true,passed:false},
        {x:80,y:-77,drift:-5, alive:true,passed:false},
        {x:30,y:-100,drift:7, alive:true,passed:false}
      ],
      scenery:[
        {type:"tree",x:12,y:-4},{type:"rock",x:87,y:-22},
        {type:"tree",x:91,y:-45},{type:"rock",x:9,y:-66},
        {type:"tree",x:16,y:-88},{type:"rock",x:84,y:-109},
        {type:"tree",x:8,y:-132},{type:"tree",x:92,y:-151}
      ],
      playerBullets:[],
      enemyBullets:[]
    };
  }

  function open(){
    close();
    ensureStyle();
    state=makeState();

    root=document.createElement("section");
    root.id="peaceShooterRoot";
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
                <div class="ps-sub">VERTICAL BUG / 199X</div>
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
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector(".ps-close").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();close();
    },true);
    root.querySelector(".ps-start").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();startGame();
    },true);

    ["left","right","up","down"].forEach(function(k){
      bindHold(root.querySelector(".ps-control."+k),k);
    });

    root.querySelector(".ps-fire").addEventListener("pointerdown",function(e){
      e.preventDefault();e.stopPropagation();fire();
    },true);

    window.addEventListener("keydown",keyDown,true);
    window.addEventListener("keyup",keyUp,true);
  }

  function bindHold(button,key){
    function down(e){
      e.preventDefault();e.stopPropagation();keys[key]=true;
      try{button.setPointerCapture(e.pointerId)}catch(_){}
    }
    function up(e){
      e.preventDefault();e.stopPropagation();keys[key]=false;
      try{button.releasePointerCapture(e.pointerId)}catch(_){}
    }
    button.addEventListener("pointerdown",down,true);
    button.addEventListener("pointerup",up,true);
    button.addEventListener("pointercancel",up,true);
    button.addEventListener("pointerleave",function(){keys[key]=false},true);
  }

  function keyDown(e){
    if(!root)return;
    if(e.key==="ArrowLeft"||e.key==="a")keys.left=true;
    if(e.key==="ArrowRight"||e.key==="d")keys.right=true;
    if(e.key==="ArrowUp"||e.key==="w")keys.up=true;
    if(e.key==="ArrowDown"||e.key==="s")keys.down=true;
    if(e.key===" "||e.key==="z"||e.key==="x"){e.preventDefault();fire()}
    if(e.key==="Escape")close();
  }

  function keyUp(e){
    if(e.key==="ArrowLeft"||e.key==="a")keys.left=false;
    if(e.key==="ArrowRight"||e.key==="d")keys.right=false;
    if(e.key==="ArrowUp"||e.key==="w")keys.up=false;
    if(e.key==="ArrowDown"||e.key==="s")keys.down=false;
  }

  function stage(){return root&&root.querySelector(".ps-stage")}

  function startGame(){
    state=makeState();
    state.mode="play";

    stage().innerHTML=`
      <div class="ps-world"></div>
      <div class="ps-road"></div>
      <div class="ps-hud">
        <span>LIFE 1</span>
        <span class="ps-state">PEACE</span>
        <span>SHOT <b class="ps-shot-count">0</b></span>
      </div>
    `;

    tone(260,.08,"square",.02);
    render();
    cancelAnimationFrame(raf);
    state.lastTime=performance.now();
    raf=requestAnimationFrame(loop);
  }

  function render(){
    var s=stage();
    if(!s)return;

    s.querySelectorAll(".ps-entity,.ps-bullet,.ps-alert,.ps-boss-hp,.ps-scenery").forEach(function(el){el.remove()});

    var world=s.querySelector(".ps-world");
    var road=s.querySelector(".ps-road");
    if(world)world.style.backgroundPosition="0 "+(state.scroll%108)+"px,0 "+(state.scroll%54)+"px,0 "+(state.scroll%68)+"px";
    if(road)road.style.backgroundPosition="0 "+(state.scroll%62)+"px";

    state.scenery.forEach(function(o){
      if(o.y<-12||o.y>108)return;
      var el=document.createElement("div");
      el.className="ps-scenery ps-"+o.type;
      el.style.left=o.x+"%";
      el.style.top=o.y+"%";
      s.appendChild(el);
    });

    var p=document.createElement("div");
    p.className="ps-entity ps-player";
    p.style.left=state.playerX+"%";
    p.style.top=state.playerY+"%";
    s.appendChild(p);

    state.enemies.forEach(function(en){
      if(!en.alive||en.y<-12||en.y>108)return;
      var el=document.createElement("div");
      el.className="ps-entity ps-enemy "+(state.hostile?"hostile":"");
      el.style.left=en.x+"%";
      el.style.top=en.y+"%";
      el.innerHTML='<span class="mouth"></span>';
      s.appendChild(el);
    });

    if(state.gateSpawned&&!state.boss&&state.gateY>-15&&state.gateY<110){
      var gate=document.createElement("div");
      gate.className="ps-entity ps-gate";
      gate.style.left="50%";
      gate.style.top=state.gateY+"%";
      s.appendChild(gate);
    }

    if(state.boss){
      var boss=document.createElement("div");
      boss.className="ps-entity ps-boss";
      boss.style.left="50%";
      boss.style.top=state.bossY+"%";
      boss.innerHTML='<span class="ps-boss-core"></span>';
      s.appendChild(boss);

      var hp=document.createElement("div");
      hp.className="ps-boss-hp";
      hp.textContent="BOSS HP "+state.bossHP;
      s.appendChild(hp);
    }

    state.playerBullets.forEach(function(b){
      var el=document.createElement("div");
      el.className="ps-bullet";
      el.style.left=b.x+"%";
      el.style.top=b.y+"%";
      s.appendChild(el);
    });

    state.enemyBullets.forEach(function(b){
      var el=document.createElement("div");
      el.className="ps-bullet";
      el.style.left=b.x+"%";
      el.style.top=b.y+"%";
      s.appendChild(el);
    });

    if(state.hostile&&!state.boss){
      var alert=document.createElement("div");
      alert.className="ps-alert";
      alert.textContent="HOSTILITY DETECTED";
      s.appendChild(alert);
    }

    if(state.boss&&state.bossIntro>0){
      var alert2=document.createElement("div");
      alert2.className="ps-alert";
      alert2.textContent="BOSS APPROACH";
      s.appendChild(alert2);
    }
  }

  function fire(){
    if(!state||state.mode!=="play"||state.dead||state.clear)return;

    state.fired++;
    state.playerBullets.push({x:state.playerX,y:state.playerY-4,vy:-58});

    var counter=root.querySelector(".ps-shot-count");
    if(counter)counter.textContent=String(state.fired);

    tone(150,.1,"square",.035);
  }

  function triggerWar(){
    if(state.hostile)return;
    state.hostile=true;
    var mode=root.querySelector(".ps-state");
    if(mode)mode.textContent="WAR";
    tone(72,.28,"sawtooth",.05);
  }

  function spawnBoss(){
    state.boss=true;
    state.hostile=true;
    state.bossY=-15;
    state.bossIntro=1.8;
    state.enemyBullets=[];
    state.playerBullets=[];
    state.gateSpawned=false;

    var mode=root.querySelector(".ps-state");
    if(mode)mode.textContent="WAR∞";

    tone(48,.55,"sawtooth",.065);
  }

  function loop(now){
    if(!root||!state||state.mode!=="play")return;

    var dt=Math.min(.033,(now-state.lastTime)/1000||.016);
    state.lastTime=now;

    if(keys.left)state.playerX-=29*dt;
    if(keys.right)state.playerX+=29*dt;
    if(keys.up)state.playerY-=25*dt;
    if(keys.down)state.playerY+=25*dt;

    state.playerX=clamp(state.playerX,5,95);
    state.playerY=clamp(state.playerY,48,92);

    var scrollSpeed=10.2;
    state.scroll+=scrollSpeed*dt*5;
    state.worldDistance+=scrollSpeed*dt;

    state.scenery.forEach(function(o){
      o.y+=scrollSpeed*dt;
      if(o.y>112)o.y-=165;
    });

    state.enemies.forEach(function(en){
      if(!en.alive||en.passed)return;
      en.y+=scrollSpeed*dt;
      en.x+=Math.sin((state.worldDistance+en.y)*.055)*en.drift*dt;
      en.x=clamp(en.x,8,92);
      if(en.y>110)en.passed=true;
    });

    if(!state.gateSpawned&&!state.boss&&state.worldDistance>=150){
      state.gateSpawned=true;
      state.gateY=-12;
      tone(360,.12,"square",.018);
    }

    if(state.gateSpawned&&!state.boss){
      state.gateY+=scrollSpeed*dt;
      if(state.gateY>112){
        state.gateSpawned=false;
        state.worldDistance=132;
      }
    }

    if(state.boss){
      if(state.bossY<21)state.bossY+=8*dt;
      state.bossClock+=dt;
      state.bossSurvive+=dt;
      if(state.bossIntro>0)state.bossIntro=Math.max(0,state.bossIntro-dt);
    }

    state.playerBullets.forEach(function(b){b.y+=b.vy*dt});
    state.playerBullets=state.playerBullets.filter(function(b){return b.y>-8&&!b.dead});

    if(!state.boss){
      state.playerBullets.forEach(function(b){
        state.enemies.forEach(function(en){
          if(!en.alive||en.passed)return;
          if(Math.abs(b.x-en.x)<4.7&&Math.abs(b.y-en.y)<4.8){
            en.alive=false;
            b.dead=true;
            state.kills++;
            tone(220,.1,"square",.028);

            if(state.kills===1)triggerWar();
            if(state.kills===5)spawnBoss();
          }
        });
      });
    }else if(state.bossY>=15){
      state.playerBullets.forEach(function(b){
        if(Math.abs(b.x-50)<12&&Math.abs(b.y-state.bossY)<8){
          b.dead=true;
          state.bossHP++;
          tone(95,.06,"square",.02);
        }
      });
    }

    state.playerBullets=state.playerBullets.filter(function(b){return !b.dead&&b.y>-8});

    if(state.boss&&state.bossY>=18){
      if(state.bossClock>=.25){
        state.bossClock=0;
        [-1.08,-.78,-.48,-.18,.18,.48,.78,1.08].forEach(function(a){
          state.enemyBullets.push({
            x:50,y:state.bossY+7,
            vx:Math.sin(a)*19,
            vy:Math.cos(a)*23
          });
        });
        tone(62,.04,"square",.01);
      }

      if(state.bossSurvive>=30){
        unresolvedEnding();
        return;
      }
    }else if(state.hostile){
      state.enemyClock+=dt;
      if(state.enemyClock>=.34){
        state.enemyClock=0;

        state.enemies.forEach(function(en,i){
          if(!en.alive||en.passed||en.y<2||en.y>72)return;
          var dx=state.playerX-en.x;
          var dy=state.playerY-en.y;
          var len=Math.max(1,Math.hypot(dx,dy));
          state.enemyBullets.push({
            x:en.x,y:en.y+3,
            vx:(dx/len)*(16+i),
            vy:(dy/len)*(18+i)
          });
        });

        tone(92,.035,"square",.011);
      }
    }

    state.enemyBullets.forEach(function(b){
      b.x+=b.vx*dt;
      b.y+=b.vy*dt;
    });

    state.enemyBullets=state.enemyBullets.filter(function(b){
      return b.x>-6&&b.x<106&&b.y>-8&&b.y<108;
    });

    var hit=state.enemyBullets.some(function(b){
      return Math.abs(b.x-state.playerX)<3.7&&Math.abs(b.y-state.playerY)<4.4;
    });

    if(hit){
      gameOver();
      return;
    }

    if(state.gateSpawned&&!state.boss){
      if(Math.abs(state.playerX-50)<10&&Math.abs(state.playerY-state.gateY)<7){
        clearGame();
        return;
      }
    }

    render();
    raf=requestAnimationFrame(loop);
  }

  function gameOver(){
    state.dead=true;
    state.mode="result";
    cancelAnimationFrame(raf);
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
      </div>
    `;

    stage().querySelector(".ps-retry").addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();startGame();
    },true);
  }

  function unresolvedEnding(){
    state.clear=true;
    state.mode="credits";
    cancelAnimationFrame(raf);

    stage().innerHTML=`
      <div class="ps-credits">
        <div class="ps-credit-roll">
          <div class="ps-credit-title">PEACE<br>SHOOTER</div>

          <div class="ps-credit-role">ENDING</div>
          <div class="ps-credit-name">UNRESOLVED WAR</div>

          <div class="ps-credit-role">BOSS DEFEATED</div>
          <div class="ps-credit-name">0</div>

          <div class="ps-credit-role">PLAYER DEFEATED</div>
          <div class="ps-credit-name">0</div>

          <div class="ps-credit-role">CONFLICT STATUS</div>
          <div class="ps-credit-name">ONGOING</div>

          <div class="ps-credit-role">PROGRAMMING</div>
          <div class="ps-credit-name">NYX</div>

          <div class="ps-credit-role">GAME DESIGN</div>
          <div class="ps-credit-name">XERIS</div>

          <div class="ps-fragment">
            RECOVERED FRAGMENT<br><br>
            012-B<br><br>
            VICTORY CONDITION<br>
            NOT FOUND.
          </div>

          <div style="margin-top:70px">OBSERVATION COMPLETE.</div>
        </div>
        <button type="button" class="ps-return">RETURN TO CARD</button>
      </div>
    `;

    bindReturn("meganeBugFragment012B");
  }

  function clearGame(){
    state.clear=true;
    state.mode="credits";
    cancelAnimationFrame(raf);

    var peace=Math.max(0,100-state.kills*20);

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
      </div>
    `;

    bindReturn("meganeBugFragment012A");
  }

  function bindReturn(storageKey){
    var btn=stage().querySelector(".ps-return");
    setTimeout(function(){if(btn)btn.classList.add("show")},11200);

    btn.addEventListener("pointerup",function(e){
      e.preventDefault();e.stopPropagation();close();
    },true);

    try{localStorage.setItem(storageKey,"1")}catch(e){}
  }

  function close(){
    cancelAnimationFrame(raf);
    raf=0;
    keys.left=keys.right=keys.up=keys.down=false;

    window.removeEventListener("keydown",keyDown,true);
    window.removeEventListener("keyup",keyUp,true);

    if(root&&root.parentNode)root.remove();
    root=null;
    state=null;
  }

  window.MEGANE_PEACE_SHOOTER={
    version:"v0.5-vertical-scroll",
    open:open,
    close:close
  };
})();