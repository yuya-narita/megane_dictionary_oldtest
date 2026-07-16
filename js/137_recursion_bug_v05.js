/* 137_recursion_bug_v05.js
   SYNTAX FRONTIER INC.
   BUG No.023 — RECURSION BUG
   ENDLESS STACK v0.5

   Stable falling-block foundation:
   - 10x20 field, seven-bag pieces, line compression, score/level/lines.
   - NEXT preview, ghost piece, pause/restart/quit.
   - Virtual three-way stick: left / soft drop / right without lifting a finger.
   - A hard-drops but starts a lock delay, allowing last-second slide/rotation.
   - No recursion corruption yet.
*/
(function(){
  "use strict";

  var root=null,raf=0,state=null,audio=null;
  var keys={left:false,right:false,down:false};
  var keyRepeat={dir:0,delay:0,clock:0};
  var stick={active:false,pointerId:null,dir:"none",repeatTimer:0,delayTimer:0};

  var COLS=10,ROWS=20;
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
    if(document.getElementById("recursionBugStyleV05"))return;
    var st=document.createElement("style");st.id="recursionBugStyleV05";
    st.textContent=`
      #recursionBugRoot{position:fixed;inset:0;z-index:2147483500;overflow:hidden;background:#070910;color:#eef6ff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
      #recursionBugRoot *{box-sizing:border-box}
      .rb-shell{position:absolute;inset:0;display:grid;grid-template-rows:44px minmax(0,1fr) 132px;padding:max(9px,env(safe-area-inset-top)) 10px max(8px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 18%,rgba(92,126,255,.14),transparent 42%),#070910}
      .rb-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(238,246,255,.18);font-size:10px;letter-spacing:.12em;color:rgba(238,246,255,.65)}
      .rb-head-actions{display:flex;gap:7px}.rb-icon{width:38px;height:38px;border:1px solid rgba(238,246,255,.3);border-radius:7px;background:rgba(255,255,255,.06);color:#fff;font:800 19px/1 system-ui;touch-action:manipulation}
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
      .rb-controls{width:min(100%,520px);margin:0 auto;display:grid;grid-template-columns:1.38fr .85fr .85fr;gap:12px;align-items:center;padding-top:8px}
      .rb-stick{position:relative;height:116px;border:1px solid rgba(238,246,255,.25);border-radius:58px;background:radial-gradient(circle at 50% 50%,rgba(120,141,255,.13),transparent 43%),rgba(255,255,255,.045);touch-action:none;overflow:hidden}
      .rb-stick-zone{position:absolute;display:grid;place-items:center;color:rgba(238,246,255,.72);font:1000 25px/1 ui-monospace,monospace}.rb-stick-left{left:0;top:0;bottom:0;width:36%}.rb-stick-right{right:0;top:0;bottom:0;width:36%}.rb-stick-down{left:34%;right:34%;top:38%;bottom:0}.rb-stick-center{position:absolute;left:50%;top:35%;width:42px;height:42px;transform:translate(-50%,-50%);border:2px solid rgba(176,190,255,.35);border-radius:50%;background:rgba(120,141,255,.08);pointer-events:none;transition:transform .08s ease,background .08s ease}.rb-stick[data-dir="left"] .rb-stick-center{transform:translate(calc(-50% - 34px),-50%);background:rgba(120,141,255,.28)}.rb-stick[data-dir="right"] .rb-stick-center{transform:translate(calc(-50% + 34px),-50%);background:rgba(120,141,255,.28)}.rb-stick[data-dir="down"] .rb-stick-center{transform:translate(-50%,calc(-50% + 34px));background:rgba(120,141,255,.28)}
      .rb-btn{height:86px;border:1px solid rgba(238,246,255,.29);border-radius:999px;background:rgba(255,255,255,.065);color:#eef6ff;font:1000 25px/1 ui-monospace,monospace;touch-action:none}.rb-btn:active{background:rgba(120,141,255,.25);transform:translateY(1px)}.rb-a{border-color:rgba(255,215,93,.62);color:#ffe888;background:rgba(255,215,93,.08)}.rb-key{display:block;font-size:9px;margin-top:7px;letter-spacing:.08em;opacity:.65}
      @media(max-height:690px){.rb-shell{grid-template-rows:42px minmax(0,1fr) 105px}.rb-stick{height:92px}.rb-btn{height:72px}.rb-controls{gap:8px}}
    `;document.head.appendChild(st);
  }

  function tone(freq,dur,vol,type){try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio||audio.state==="closed")audio=new AC();if(audio.state==="suspended")audio.resume();var o=audio.createOscillator(),g=audio.createGain();o.type=type||"square";o.frequency.value=freq;g.gain.setValueAtTime(vol||.02,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}}

  function newState(){return {mode:"title",grid:emptyBoard(),piece:null,nextType:null,bag:[],score:0,lines:0,level:1,last:0,fallClock:0,fallMs:720,grounded:false,lockClock:0,lockResets:0,hardDropped:false}}
  function nextFromBag(){if(!state.bag.length){state.bag=TYPES.slice();for(var i=state.bag.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=state.bag[i];state.bag[i]=state.bag[j];state.bag[j]=t}}return state.bag.pop()}

  function open(){
    close();ensureStyle();state=newState();
    root=document.createElement("section");root.id="recursionBugRoot";
    root.innerHTML=`<div class="rb-shell">
      <header class="rb-head"><span>SYNTAX FRONTIER INC. / BUG No.023</span><div class="rb-head-actions"><button type="button" class="rb-icon rb-pause-btn" aria-label="一時停止">Ⅱ</button><button type="button" class="rb-icon rb-close" aria-label="閉じる">×</button></div></header>
      <main class="rb-main"><div class="rb-stage"><canvas class="rb-canvas"></canvas><div class="rb-scan"></div>
        <div class="rb-hud"><span>SCORE <b class="rb-score">000000</b></span><span>LINES <b class="rb-lines">000</b></span><span>LEVEL <b class="rb-level">01</b></span></div>
        <div class="rb-next"><div class="rb-next-label">NEXT</div><canvas class="rb-next-canvas"></canvas></div><div class="rb-world-label">FIELD 10×20</div>
        <div class="rb-title"><div><div class="rb-logo">ENDLESS<br>STACK</div><div class="rb-sub">RECURSION BUG / 199X</div><div class="rb-copy">Keep stacking.<br>We'll make room.</div><button type="button" class="rb-start">PRESS START</button></div></div>
        <div class="rb-over"><div><div class="rb-over-title">GAME OVER</div><div class="rb-copy rb-result"></div><button type="button" class="rb-retry">RETRY</button></div></div>
        <div class="rb-pause"><div><div class="rb-over-title">PAUSED</div><button type="button" class="rb-menu-btn rb-resume">RESUME</button><button type="button" class="rb-menu-btn rb-restart">RESTART</button><button type="button" class="rb-menu-btn danger rb-quit">QUIT</button></div></div>
      </div></main>
      <div class="rb-controls"><div class="rb-stick" data-dir="none" aria-label="移動スティック"><div class="rb-stick-zone rb-stick-left">◀</div><div class="rb-stick-zone rb-stick-right">▶</div><div class="rb-stick-zone rb-stick-down">▼</div><div class="rb-stick-center"></div></div><button type="button" class="rb-btn rb-b">B<span class="rb-key">ROTATE</span></button><button type="button" class="rb-btn rb-a">A<span class="rb-key">DROP</span></button></div>
    </div>`;
    document.body.appendChild(root);
    $(".rb-close").addEventListener("pointerup",stopEventClose,true);$(".rb-pause-btn").addEventListener("pointerup",function(e){block(e);togglePause()},true);
    $(".rb-start").addEventListener("pointerup",function(e){block(e);start()},true);$(".rb-retry").addEventListener("pointerup",function(e){block(e);start()},true);
    $(".rb-resume").addEventListener("pointerup",function(e){block(e);resume()},true);$(".rb-restart").addEventListener("pointerup",function(e){block(e);start()},true);$(".rb-quit").addEventListener("pointerup",stopEventClose,true);
    $(".rb-b").addEventListener("pointerdown",function(e){block(e);rotate()},true);$(".rb-a").addEventListener("pointerdown",function(e){block(e);hardDrop()},true);
    bindStick();bindGestures();window.addEventListener("keydown",keydown,true);window.addEventListener("keyup",keyup,true);resize();draw();drawNext();
  }
  function block(e){if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}}
  function stopEventClose(e){block(e);close()}

  function start(){cancelAnimationFrame(raf);clearStickTimers();state=newState();state.mode="play";state.nextType=nextFromBag();$(".rb-title").style.display="none";$(".rb-over").classList.remove("show");$(".rb-pause").classList.remove("show");spawn();hud();resize();state.last=performance.now();raf=requestAnimationFrame(loop);tone(330,.08,.02)}
  function pause(){if(!state||state.mode!=="play")return;state.mode="pause";cancelAnimationFrame(raf);raf=0;keys.left=keys.right=keys.down=false;endStick();$(".rb-pause").classList.add("show")}
  function resume(){if(!state||state.mode!=="pause")return;$(".rb-pause").classList.remove("show");state.mode="play";state.last=performance.now();raf=requestAnimationFrame(loop)}
  function togglePause(){if(!state)return;if(state.mode==="play")pause();else if(state.mode==="pause")resume()}

  function bindStick(){
    var base=$(".rb-stick");
    function dirAt(e){var r=base.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if(y>.56&&x>.28&&x<.72)return "down";if(x<.48)return "left";return "right"}
    function apply(dir,initial){if(!playing())return;if(dir==="left")move(-1);else if(dir==="right")move(1);else if(dir==="down")softDrop();if(initial)tone(270,.025,.006)}
    function setDir(dir){if(stick.dir===dir)return;clearStickTimers();stick.dir=dir;base.dataset.dir=dir;apply(dir,true);stick.delayTimer=setTimeout(function(){stick.repeatTimer=setInterval(function(){apply(stick.dir,false)},stick.dir==="down"?42:82)},stick.dir==="down"?70:175)}
    base.addEventListener("pointerdown",function(e){block(e);if(!playing())return;stick.active=true;stick.pointerId=e.pointerId;try{base.setPointerCapture(e.pointerId)}catch(_){}setDir(dirAt(e))},true);
    base.addEventListener("pointermove",function(e){if(!stick.active||e.pointerId!==stick.pointerId)return;block(e);setDir(dirAt(e))},true);
    base.addEventListener("pointerup",function(e){if(stick.pointerId!==null&&e.pointerId!==stick.pointerId)return;block(e);endStick()},true);base.addEventListener("pointercancel",endStick,true);
  }
  function clearStickTimers(){if(stick.repeatTimer)clearInterval(stick.repeatTimer);if(stick.delayTimer)clearTimeout(stick.delayTimer);stick.repeatTimer=stick.delayTimer=0}
  function endStick(e){if(e)block(e);clearStickTimers();stick.active=false;stick.pointerId=null;stick.dir="none";var b=$(".rb-stick");if(b)b.dataset.dir="none"}

  function bindGestures(){var c=$(".rb-canvas"),sx=0,sy=0,lx=0,moved=false;c.addEventListener("pointerdown",function(e){if(!playing())return;block(e);sx=lx=e.clientX;sy=e.clientY;moved=false;try{c.setPointerCapture(e.pointerId)}catch(_){}},true);c.addEventListener("pointermove",function(e){if(!playing())return;block(e);var dx=e.clientX-lx;if(Math.abs(dx)>22){move(dx>0?1:-1);lx=e.clientX;moved=true}},true);c.addEventListener("pointerup",function(e){if(!playing())return;block(e);var dy=e.clientY-sy;if(dy>65)hardDrop();else if(!moved&&Math.abs(dy)<25)rotate()},true)}

  function keydown(e){if(e.key==="Escape"){if(state&&state.mode==="play")pause();else if(state&&state.mode==="pause")resume();else close();return}if(e.key==="p"){togglePause();return}if(!playing())return;if(e.key==="ArrowLeft"||e.key==="a"){if(!keys.left)move(-1);keys.left=true}if(e.key==="ArrowRight"||e.key==="d"){if(!keys.right)move(1);keys.right=true}if(e.key==="ArrowUp"||e.key==="w"||e.key==="x")rotate();if(e.key==="ArrowDown"||e.key==="s")keys.down=true;if(e.key===" "||e.key==="z"){block(e);hardDrop()}}
  function keyup(e){if(e.key==="ArrowLeft"||e.key==="a")keys.left=false;if(e.key==="ArrowRight"||e.key==="d")keys.right=false;if(e.key==="ArrowDown"||e.key==="s")keys.down=false}
  function playing(){return !!(root&&state&&state.mode==="play"&&state.piece)}

  function spawn(){var type=state.nextType||nextFromBag();state.nextType=nextFromBag();state.piece={type:type,cells:cloneCells(SHAPES[type]),x:0,y:-1};normalize(state.piece);state.piece.x=Math.floor((COLS-pieceWidth(state.piece))/2)-minX(state.piece);state.grounded=false;state.lockClock=0;state.lockResets=0;state.hardDropped=false;if(collides(state.piece,0,0))gameOver();drawNext()}
  function minX(p){return Math.min.apply(null,p.cells.map(function(c){return c[0]}))}function maxX(p){return Math.max.apply(null,p.cells.map(function(c){return c[0]}))}function minY(p){return Math.min.apply(null,p.cells.map(function(c){return c[1]}))}function pieceWidth(p){return maxX(p)-minX(p)+1}
  function normalize(p){var mx=minX(p),my=minY(p);p.cells=p.cells.map(function(c){return [c[0]-mx,c[1]-my]})}
  function absoluteCells(p,dx,dy,cells){return (cells||p.cells).map(function(c){return{x:p.x+c[0]+(dx||0),y:p.y+c[1]+(dy||0)}})}
  function collides(p,dx,dy,cells){var a=absoluteCells(p,dx,dy,cells);for(var i=0;i<a.length;i++){var q=a[i];if(q.x<0||q.x>=COLS||q.y>=ROWS)return true;if(q.y>=0&&state.grid[q.y][q.x])return true}return false}
  function resetLockAfterAction(){if(!state.grounded)return;if(state.lockResets<MAX_LOCK_RESETS){state.lockClock=0;state.lockResets++}if(!collides(state.piece,0,1)){state.grounded=false;state.lockClock=0}}
  function move(dx){if(!playing())return false;if(!collides(state.piece,dx,0)){state.piece.x+=dx;resetLockAfterAction();draw();return true}return false}
  function rotate(){if(!playing()||state.piece.type==="O")return;var old=state.piece.cells,rot=old.map(function(c){return[-c[1],c[0]]});var mx=Math.min.apply(null,rot.map(function(c){return c[0]})),my=Math.min.apply(null,rot.map(function(c){return c[1]}));rot=rot.map(function(c){return[c[0]-mx,c[1]-my]});var kicks=[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]];for(var i=0;i<kicks.length;i++)if(!collides(state.piece,kicks[i][0],kicks[i][1],rot)){state.piece.cells=rot;state.piece.x+=kicks[i][0];state.piece.y+=kicks[i][1];resetLockAfterAction();tone(440,.035,.011);draw();return}}
  function softDrop(){if(!playing())return;if(!collides(state.piece,0,1)){state.piece.y++;state.score+=1;state.fallClock=0;state.grounded=false;state.lockClock=0;hud();draw()}else{state.grounded=true}}
  function hardDrop(){if(!playing()||state.hardDropped)return;var d=0;while(!collides(state.piece,0,1)){state.piece.y++;d++}state.score+=d*2;state.hardDropped=true;state.grounded=true;state.lockClock=0;state.lockResets=0;state.fallClock=0;hud();tone(110,.045,.016);draw()}
  function lock(){if(!state.piece)return;var type=state.piece.type,a=absoluteCells(state.piece,0,0),above=false;a.forEach(function(q){if(q.y<0){above=true;return}state.grid[q.y][q.x]={type:type}});state.piece=null;if(above){gameOver();return}clearLines();spawn();hud();draw()}
  function clearLines(){var kept=[],cleared=0;for(var y=0;y<ROWS;y++){var full=true;for(var x=0;x<COLS;x++)if(!state.grid[y][x]){full=false;break}if(full)cleared++;else kept.push(state.grid[y])}while(kept.length<ROWS)kept.unshift(Array(COLS).fill(null));state.grid=kept;if(cleared){var table=[0,100,300,500,800];state.lines+=cleared;state.score+=(table[cleared]||1200)*state.level;state.level=Math.floor(state.lines/10)+1;state.fallMs=Math.max(90,720-(state.level-1)*58);tone(cleared===4?880:660,.11,.025);setTimeout(function(){tone(cleared===4?1040:760,.08,.018)},70)}}
  function gameOver(){state.mode="over";state.piece=null;cancelAnimationFrame(raf);raf=0;$(".rb-result").innerHTML="SCORE "+String(state.score).padStart(6,"0")+"<br>LINES "+String(state.lines).padStart(3,"0");$(".rb-over").classList.add("show");tone(150,.22,.028,"sawtooth");setTimeout(function(){tone(95,.35,.022,"sawtooth")},180);draw()}

  function updateKeyboardRepeat(dt){var dir=keys.left&&!keys.right?-1:(keys.right&&!keys.left?1:0);if(dir!==keyRepeat.dir){keyRepeat.dir=dir;keyRepeat.delay=0;keyRepeat.clock=0;return}if(!dir)return;keyRepeat.delay+=dt;if(keyRepeat.delay<175)return;keyRepeat.clock+=dt;if(keyRepeat.clock>=82){keyRepeat.clock=0;move(dir)}}
  function loop(t){if(!root||!state||state.mode!=="play")return;var dt=Math.min(50,t-state.last);state.last=t;updateKeyboardRepeat(dt);state.fallClock+=dt;if(keys.down&&state.fallClock>=42){state.fallClock=0;softDrop()}else if(!keys.down&&state.fallClock>=state.fallMs){state.fallClock=0;if(!collides(state.piece,0,1)){state.piece.y++;state.grounded=false;state.lockClock=0}else state.grounded=true}if(state.piece&&collides(state.piece,0,1)){state.grounded=true;state.lockClock+=dt;if(state.lockClock>=LOCK_DELAY)lock()}else if(state.piece){state.grounded=false;state.lockClock=0}draw();raf=requestAnimationFrame(loop)}

  function resize(){var c=$(".rb-canvas");if(!c)return;var r=c.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.floor(r.width*d));c.height=Math.max(1,Math.floor(r.height*d));c._d=d;var n=$(".rb-next-canvas");if(n){var nr=n.getBoundingClientRect();n.width=Math.max(1,Math.floor(nr.width*d));n.height=Math.max(1,Math.floor(nr.height*d));n._d=d}}
  function boardMetrics(r){var top=52,bottom=12,pad=12,size=Math.floor(Math.min((r.width-pad*2)/COLS,(r.height-top-bottom)/ROWS));size=clamp(size,10,30);var bw=size*COLS,bh=size*ROWS;return{size:size,bw:bw,bh:bh,ox:Math.floor((r.width-bw)/2),oy:Math.floor(top+(r.height-top-bottom-bh)/2)}}
  function ghostY(){if(!state.piece)return 0;var d=0;while(!collides(state.piece,0,d+1))d++;return state.piece.y+d}
  function draw(){var c=$(".rb-canvas");if(!c||!state)return;var r=c.getBoundingClientRect(),d=c._d||1;if(c.width!==Math.floor(r.width*d)||c.height!==Math.floor(r.height*d))resize();var ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);var m=boardMetrics(r),size=m.size,ox=m.ox,oy=m.oy,bw=m.bw,bh=m.bh;ctx.fillStyle="#0c1122";ctx.fillRect(ox-3,oy-3,bw+6,bh+6);ctx.strokeStyle="#788dff";ctx.lineWidth=2;ctx.strokeRect(ox-2,oy-2,bw+4,bh+4);ctx.strokeStyle="rgba(180,195,255,.10)";ctx.lineWidth=1;for(var x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(ox+x*size,oy);ctx.lineTo(ox+x*size,oy+bh);ctx.stroke()}for(var y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*size);ctx.lineTo(ox+bw,oy+y*size);ctx.stroke()}for(var yy=0;yy<ROWS;yy++)for(var xx=0;xx<COLS;xx++)if(state.grid[yy][xx])paint(ctx,ox+xx*size,oy+yy*size,size,state.grid[yy][xx].type,"fixed");if(state.piece){var gy=ghostY();absoluteCells({x:state.piece.x,y:gy,cells:state.piece.cells},0,0).forEach(function(q){if(q.y>=0)paint(ctx,ox+q.x*size,oy+q.y*size,size,state.piece.type,"ghost")});absoluteCells(state.piece,0,0).forEach(function(q){if(q.y>=0)paint(ctx,ox+q.x*size,oy+q.y*size,size,state.piece.type,"active")})}}
  function paint(ctx,x,y,s,type,mode){var m=Math.max(1,Math.floor(s*.09));if(mode==="ghost"){ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.strokeStyle="rgba(210,220,255,.46)";ctx.lineWidth=Math.max(1,s*.06);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m);return}ctx.fillStyle=COLORS[type];ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.fillStyle="rgba(255,255,255,.25)";ctx.fillRect(x+m*1.7,y+m*1.7,s-3.4*m,Math.max(1,s*.12));ctx.strokeStyle=mode==="active"?"rgba(255,255,255,.9)":"rgba(5,8,18,.78)";ctx.lineWidth=Math.max(1,s*.075);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m)}
  function drawNext(){var c=$(".rb-next-canvas");if(!c||!state||!state.nextType)return;var r=c.getBoundingClientRect(),d=c._d||Math.min(2,window.devicePixelRatio||1);if(c.width!==Math.floor(r.width*d)||c.height!==Math.floor(r.height*d)){c.width=Math.floor(r.width*d);c.height=Math.floor(r.height*d);c._d=d}var ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);var cells=SHAPES[state.nextType],minx=Math.min.apply(null,cells.map(function(v){return v[0]})),maxx=Math.max.apply(null,cells.map(function(v){return v[0]})),miny=Math.min.apply(null,cells.map(function(v){return v[1]})),maxy=Math.max.apply(null,cells.map(function(v){return v[1]})),w=maxx-minx+1,h=maxy-miny+1,s=Math.floor(Math.min((r.width-8)/w,(r.height-6)/h)),ox=(r.width-w*s)/2,oy=(r.height-h*s)/2;cells.forEach(function(v){paint(ctx,ox+(v[0]-minx)*s,oy+(v[1]-miny)*s,s,state.nextType,"fixed")})}
  function hud(){if(!root)return;$(".rb-score").textContent=String(state.score).padStart(6,"0");$(".rb-lines").textContent=String(state.lines).padStart(3,"0");$(".rb-level").textContent=String(state.level).padStart(2,"0");drawNext()}

  function close(){cancelAnimationFrame(raf);raf=0;clearStickTimers();keys.left=keys.right=keys.down=false;window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);if(root&&root.parentNode)root.remove();root=null;state=null;try{if(audio&&audio.state!=="closed")audio.close()}catch(e){}audio=null}
  window.addEventListener("resize",function(){if(root){resize();draw();drawNext()}});
  window.MEGANE_RECURSION_BUG={version:"v0.5-stable-controls-next-pause",open:open,close:close};
})();
