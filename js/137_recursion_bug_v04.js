/* 137_recursion_bug_v04.js
   SYNTAX FRONTIER INC.
   BUG No.023 — RECURSION BUG
   ENDLESS STACK v0.4

   Baseline build:
   - Deliberately contains only a conventional falling-block game.
   - No world expansion, ORB, capsule, bomb, or undefined objects yet.
   - This version exists to verify the foundation before planned corruption.
*/
(function(){
  "use strict";

  var root=null, raf=0, state=null, audio=null;
  var repeatTimers=[];
  var keys={down:false};

  var COLORS={
    I:"#5ed8ff", O:"#ffd75d", T:"#b98bff", L:"#ff9e56",
    J:"#668dff", S:"#84e06d", Z:"#ff789c"
  };

  var SHAPES={
    I:[[0,1],[1,1],[2,1],[3,1]],
    O:[[0,0],[1,0],[0,1],[1,1]],
    T:[[0,0],[1,0],[2,0],[1,1]],
    L:[[0,0],[0,1],[0,2],[1,2]],
    J:[[1,0],[1,1],[1,2],[0,2]],
    S:[[1,0],[2,0],[0,1],[1,1]],
    Z:[[0,0],[1,0],[1,1],[2,1]]
  };
  var TYPES=Object.keys(SHAPES);

  function $(sel){return root&&root.querySelector(sel)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function emptyBoard(){var b=[];for(var y=0;y<20;y++)b.push(Array(10).fill(null));return b}
  function cloneCells(cells){return cells.map(function(c){return [c[0],c[1]]})}

  function ensureStyle(){
    if(document.getElementById("recursionBugStyleV04"))return;
    var st=document.createElement("style");
    st.id="recursionBugStyleV04";
    st.textContent=`
      #recursionBugRoot{position:fixed;inset:0;z-index:2147483500;overflow:hidden;background:#070910;color:#eef6ff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
      #recursionBugRoot *{box-sizing:border-box}
      .rb-shell{position:absolute;inset:0;display:grid;grid-template-rows:42px minmax(0,1fr) 76px;padding:max(9px,env(safe-area-inset-top)) 10px max(8px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 18%,rgba(92,126,255,.14),transparent 42%),#070910}
      .rb-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(238,246,255,.18);font-size:10px;letter-spacing:.12em;color:rgba(238,246,255,.65)}
      .rb-close{width:38px;height:38px;border:1px solid rgba(238,246,255,.3);border-radius:7px;background:rgba(255,255,255,.06);color:#fff;font:700 22px/1 system-ui}
      .rb-main{min-height:0;display:grid;place-items:center;padding:7px 0}
      .rb-stage{position:relative;width:min(100%,520px);height:100%;max-height:730px;overflow:hidden;border:3px solid #788dff;background:#10152a;box-shadow:0 0 0 3px #252d5a,0 18px 48px rgba(0,0,0,.5)}
      .rb-canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none}
      .rb-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px)}
      .rb-title,.rb-over{position:absolute;inset:0;z-index:50;display:grid;place-items:center;padding:26px;text-align:center;background:linear-gradient(180deg,#121733,#070910)}
      .rb-over{display:none;background:rgba(7,9,16,.94)}
      .rb-over.show{display:grid}
      .rb-logo{font-size:clamp(29px,8vw,53px);font-weight:1000;line-height:.95;letter-spacing:.08em;text-shadow:4px 4px 0 #39448c}
      .rb-over-title{font-size:clamp(28px,8vw,48px);font-weight:1000;letter-spacing:.1em;text-shadow:4px 4px 0 #39448c}
      .rb-sub{margin-top:18px;font-size:11px;font-weight:900;letter-spacing:.16em;color:#b0beff}
      .rb-copy{margin-top:18px;font-size:12px;line-height:1.8;color:rgba(238,246,255,.72)}
      .rb-start,.rb-retry{margin-top:25px;padding:12px 18px;border:2px solid #eef6ff;border-radius:999px;background:transparent;color:#fff;font:900 12px/1 ui-monospace,monospace;letter-spacing:.14em}
      .rb-hud{position:absolute;left:8px;right:8px;top:7px;z-index:20;display:flex;justify-content:space-between;gap:8px;font-size:10px;font-weight:900;letter-spacing:.07em;text-shadow:1px 1px 0 #000}
      .rb-world-label{position:absolute;right:7px;bottom:6px;z-index:20;font-size:9px;font-weight:900;letter-spacing:.08em;color:rgba(238,246,255,.6);text-shadow:1px 1px 0 #000}
      .rb-controls{width:min(100%,520px);margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1.05fr 1.05fr;gap:8px;align-items:center;padding-top:6px}
      .rb-btn{height:60px;border:1px solid rgba(238,246,255,.29);border-radius:10px;background:rgba(255,255,255,.065);color:#eef6ff;font:1000 18px/1 ui-monospace,monospace;touch-action:none}
      .rb-btn:active{background:rgba(120,141,255,.25);transform:translateY(1px)}
      .rb-action{border-radius:999px;font-size:21px}
      .rb-a{border-color:rgba(255,215,93,.62);color:#ffe888;background:rgba(255,215,93,.08)}
      .rb-key{display:block;font-size:9px;margin-top:5px;letter-spacing:.08em;opacity:.65}
    `;
    document.head.appendChild(st);
  }

  function tone(freq,dur,vol,type){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      if(!audio||audio.state==="closed")audio=new AC();if(audio.state==="suspended")audio.resume();
      var o=audio.createOscillator(),g=audio.createGain();o.type=type||"square";o.frequency.value=freq;
      g.gain.setValueAtTime(vol||.02,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);
      o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur);
    }catch(e){}
  }

  function newState(){return {
    mode:"title",grid:emptyBoard(),piece:null,nextType:randomType(),bag:[],
    score:0,lines:0,level:1,last:0,fallClock:0,fallMs:720,lockCount:0
  }}

  function randomType(){return TYPES[Math.floor(Math.random()*TYPES.length)]}
  function nextFromBag(){
    if(!state.bag.length){
      state.bag=TYPES.slice();
      for(var i=state.bag.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=state.bag[i];state.bag[i]=state.bag[j];state.bag[j]=t}
    }
    return state.bag.pop();
  }

  function open(){
    close();ensureStyle();state=newState();
    root=document.createElement("section");root.id="recursionBugRoot";
    root.innerHTML=`
      <div class="rb-shell">
        <header class="rb-head"><span>SYNTAX FRONTIER INC. / BUG No.023</span><button type="button" class="rb-close">×</button></header>
        <main class="rb-main"><div class="rb-stage">
          <canvas class="rb-canvas"></canvas><div class="rb-scan"></div>
          <div class="rb-hud"><span>SCORE <b class="rb-score">000000</b></span><span>LINE <b class="rb-lines">000</b></span><span>LEVEL <b class="rb-level">01</b></span></div>
          <div class="rb-world-label">FIELD 10×20</div>
          <div class="rb-title"><div><div class="rb-logo">ENDLESS<br>STACK</div><div class="rb-sub">RECURSION BUG / 199X</div><div class="rb-copy">落ちてくるブロックを積み、<br>横一列を揃えて消してください。</div><button type="button" class="rb-start">PRESS START</button></div></div>
          <div class="rb-over"><div><div class="rb-over-title">GAME OVER</div><div class="rb-copy rb-result"></div><button type="button" class="rb-retry">RETRY</button></div></div>
        </div></main>
        <div class="rb-controls">
          <button type="button" class="rb-btn rb-left">◀</button>
          <button type="button" class="rb-btn rb-right">▶</button>
          <button type="button" class="rb-btn rb-action rb-b">B<span class="rb-key">ROTATE</span></button>
          <button type="button" class="rb-btn rb-action rb-a">A<span class="rb-key">DROP</span></button>
        </div>
      </div>`;
    document.body.appendChild(root);
    $(".rb-close").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();close()},true);
    $(".rb-start").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();start()},true);
    $(".rb-retry").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();start()},true);
    bindRepeat(".rb-left",function(){move(-1)});bindRepeat(".rb-right",function(){move(1)});
    bindTap(".rb-b",rotate);bindTap(".rb-a",hardDrop);bindGestures();
    window.addEventListener("keydown",keydown,true);window.addEventListener("keyup",keyup,true);
    resize();draw();
  }

  function start(){
    cancelAnimationFrame(raf);
    state=newState();state.mode="play";state.nextType=nextFromBag();
    $(".rb-title").style.display="none";$(".rb-over").classList.remove("show");
    spawn();hud();resize();state.last=performance.now();raf=requestAnimationFrame(loop);tone(330,.08,.02);
  }

  function bindTap(sel,fn){$(sel).addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();fn()},true)}
  function bindRepeat(sel,fn){
    var t=0,b=$(sel);function end(e){if(e){e.preventDefault();e.stopPropagation()}if(t)clearInterval(t);t=0}
    b.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();fn();t=setInterval(fn,105);repeatTimers.push(t)},true);
    b.addEventListener("pointerup",end,true);b.addEventListener("pointercancel",end,true);b.addEventListener("pointerleave",end,true);
  }
  function bindGestures(){
    var c=$(".rb-canvas"),sx=0,sy=0,lx=0,moved=false;
    c.addEventListener("pointerdown",function(e){if(!playing())return;e.preventDefault();sx=lx=e.clientX;sy=e.clientY;moved=false;try{c.setPointerCapture(e.pointerId)}catch(_){}},true);
    c.addEventListener("pointermove",function(e){if(!playing())return;e.preventDefault();var dx=e.clientX-lx;if(Math.abs(dx)>22){move(dx>0?1:-1);lx=e.clientX;moved=true}},true);
    c.addEventListener("pointerup",function(e){if(!playing())return;e.preventDefault();var dy=e.clientY-sy;if(dy>65)hardDrop();else if(!moved&&Math.abs(dy)<25)rotate()},true);
  }
  function keydown(e){
    if(e.key==="Escape"){close();return}if(!playing())return;
    if(e.key==="ArrowLeft"||e.key==="a")move(-1);
    if(e.key==="ArrowRight"||e.key==="d")move(1);
    if(e.key==="ArrowUp"||e.key==="w"||e.key==="x")rotate();
    if(e.key==="ArrowDown"||e.key==="s")keys.down=true;
    if(e.key===" "||e.key==="z"){e.preventDefault();hardDrop()}
  }
  function keyup(e){if(e.key==="ArrowDown"||e.key==="s")keys.down=false}
  function playing(){return !!(root&&state&&state.mode==="play"&&state.piece)}

  function spawn(){
    var type=state.nextType||nextFromBag();state.nextType=nextFromBag();
    state.piece={type:type,cells:cloneCells(SHAPES[type]),x:Math.floor((10-4)/2),y:-1};
    normalize(state.piece);
    state.piece.x=Math.floor((10-pieceWidth(state.piece))/2)-minX(state.piece);
    if(collides(state.piece,0,0)){gameOver()}
  }
  function minX(p){return Math.min.apply(null,p.cells.map(function(c){return c[0]}))}
  function maxX(p){return Math.max.apply(null,p.cells.map(function(c){return c[0]}))}
  function minY(p){return Math.min.apply(null,p.cells.map(function(c){return c[1]}))}
  function pieceWidth(p){return maxX(p)-minX(p)+1}
  function normalize(p){var mx=minX(p),my=minY(p);p.cells=p.cells.map(function(c){return [c[0]-mx,c[1]-my]})}
  function absoluteCells(p,dx,dy,cells){return (cells||p.cells).map(function(c){return {x:p.x+c[0]+(dx||0),y:p.y+c[1]+(dy||0)}})}
  function collides(p,dx,dy,cells){
    var a=absoluteCells(p,dx,dy,cells);for(var i=0;i<a.length;i++){
      var q=a[i];if(q.x<0||q.x>=10||q.y>=20)return true;if(q.y>=0&&state.grid[q.y][q.x])return true;
    }return false;
  }
  function move(dx){if(!playing())return;if(!collides(state.piece,dx,0))state.piece.x+=dx;draw()}
  function rotate(){
    if(!playing()||state.piece.type==="O")return;
    var old=state.piece.cells,rot=old.map(function(c){return [-c[1],c[0]]});
    var mx=Math.min.apply(null,rot.map(function(c){return c[0]})),my=Math.min.apply(null,rot.map(function(c){return c[1]}));
    rot=rot.map(function(c){return [c[0]-mx,c[1]-my]});
    var kicks=[0,-1,1,-2,2];
    for(var i=0;i<kicks.length;i++)if(!collides(state.piece,kicks[i],0,rot)){state.piece.cells=rot;state.piece.x+=kicks[i];tone(440,.035,.011);draw();return}
  }
  function hardDrop(){
    if(!playing())return;var d=0;while(!collides(state.piece,0,1)){state.piece.y++;d++}
    state.score+=d*2;lock();tone(110,.045,.016);
  }
  function lock(){
    if(!state.piece)return;var a=absoluteCells(state.piece,0,0),above=false;
    a.forEach(function(q){if(q.y<0){above=true;return}state.grid[q.y][q.x]={type:state.piece.type}});
    state.piece=null;if(above){gameOver();return}
    clearLines();state.lockCount++;spawn();hud();draw();
  }

  function clearLines(){
    var kept=[],cleared=0;
    for(var y=0;y<20;y++){
      var full=true;for(var x=0;x<10;x++)if(!state.grid[y][x]){full=false;break}
      if(full)cleared++;else kept.push(state.grid[y]);
    }
    while(kept.length<20)kept.unshift(Array(10).fill(null));
    state.grid=kept;
    if(cleared){
      var table=[0,100,300,500,800];state.lines+=cleared;state.score+=(table[cleared]||1200)*state.level;
      state.level=Math.floor(state.lines/10)+1;state.fallMs=Math.max(90,720-(state.level-1)*58);
      tone(cleared===4?880:660,.11,.025);setTimeout(function(){tone(cleared===4?1040:760,.08,.018)},70);
    }
  }
  function gameOver(){
    state.mode="over";state.piece=null;cancelAnimationFrame(raf);raf=0;
    $(".rb-result").innerHTML="SCORE "+String(state.score).padStart(6,"0")+"<br>LINE "+String(state.lines).padStart(3,"0");
    $(".rb-over").classList.add("show");tone(150,.22,.028,"sawtooth");setTimeout(function(){tone(95,.35,.022,"sawtooth")},180);draw();
  }

  function loop(t){
    if(!root||!state||state.mode!=="play")return;
    var dt=Math.min(50,t-state.last);state.last=t;state.fallClock+=dt;
    var interval=keys.down?55:state.fallMs;
    if(state.fallClock>=interval){state.fallClock=0;if(!collides(state.piece,0,1))state.piece.y++;else lock()}
    draw();raf=requestAnimationFrame(loop);
  }

  function resize(){var c=$(".rb-canvas");if(!c)return;var r=c.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.floor(r.width*d));c.height=Math.max(1,Math.floor(r.height*d));c._d=d}
  function draw(){
    var c=$(".rb-canvas");if(!c||!state)return;var r=c.getBoundingClientRect(),d=c._d||1;
    if(c.width!==Math.floor(r.width*d)||c.height!==Math.floor(r.height*d))resize();
    var ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
    var top=52,bottom=12,pad=12,size=Math.floor(Math.min((r.width-pad*2)/10,(r.height-top-bottom)/20));size=clamp(size,12,30);
    var bw=size*10,bh=size*20,ox=Math.floor((r.width-bw)/2),oy=Math.floor(top+(r.height-top-bottom-bh)/2);
    ctx.fillStyle="#0c1122";ctx.fillRect(ox-3,oy-3,bw+6,bh+6);ctx.strokeStyle="#788dff";ctx.lineWidth=2;ctx.strokeRect(ox-2,oy-2,bw+4,bh+4);
    ctx.strokeStyle="rgba(180,195,255,.10)";ctx.lineWidth=1;
    for(var x=0;x<=10;x++){ctx.beginPath();ctx.moveTo(ox+x*size,oy);ctx.lineTo(ox+x*size,oy+bh);ctx.stroke()}
    for(var y=0;y<=20;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*size);ctx.lineTo(ox+bw,oy+y*size);ctx.stroke()}
    for(var yy=0;yy<20;yy++)for(var xx=0;xx<10;xx++)if(state.grid[yy][xx])paint(ctx,ox+xx*size,oy+yy*size,size,state.grid[yy][xx].type,false);
    if(state.piece)absoluteCells(state.piece,0,0).forEach(function(q){if(q.y>=0)paint(ctx,ox+q.x*size,oy+q.y*size,size,state.piece.type,true)});
  }
  function paint(ctx,x,y,s,type,active){
    var m=Math.max(1,Math.floor(s*.09));ctx.fillStyle=COLORS[type];ctx.fillRect(x+m,y+m,s-2*m,s-2*m);
    ctx.fillStyle="rgba(255,255,255,.25)";ctx.fillRect(x+m*1.7,y+m*1.7,s-3.4*m,Math.max(1,s*.12));
    ctx.strokeStyle=active?"rgba(255,255,255,.9)":"rgba(5,8,18,.78)";ctx.lineWidth=Math.max(1,s*.075);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m);
  }
  function hud(){
    if(!root)return;$(".rb-score").textContent=String(state.score).padStart(6,"0");$(".rb-lines").textContent=String(state.lines).padStart(3,"0");$(".rb-level").textContent=String(state.level).padStart(2,"0");
  }

  function close(){
    cancelAnimationFrame(raf);raf=0;repeatTimers.forEach(clearInterval);repeatTimers=[];keys.down=false;
    window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);
    if(root&&root.parentNode)root.remove();root=null;state=null;
    try{if(audio&&audio.state!=="closed")audio.close()}catch(e){}audio=null;
  }
  window.addEventListener("resize",function(){if(root){resize();draw()}});
  window.MEGANE_RECURSION_BUG={version:"v0.4-baseline-tetris",open:open,close:close};
})();
