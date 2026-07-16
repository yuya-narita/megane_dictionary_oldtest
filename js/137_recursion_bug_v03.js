/* 137_recursion_bug_v03.js
   SYNTAX FRONTIER INC.
   BUG No.023 — RECURSION BUG
   ENDLESS STACK v0.3

   Sequence:
   1) Ordinary falling-block game.
   2) Top-out expands the world upward instead of ending.
   3) The next completed line reveals hidden space left and right.
   4) Familiar puzzle rules invade one at a time.
*/
(function(){
  "use strict";

  var root=null, raf=0, state=null, audio=null;
  var keys={down:false};
  var COLORS=["#5ed8ff","#ffd75d","#ff789c","#84e06d","#b98bff","#ff9e56"];
  var TETROS=[
    {name:"I",cells:[[0,1],[1,1],[2,1],[3,1]],color:0},
    {name:"O",cells:[[0,0],[1,0],[0,1],[1,1]],color:1},
    {name:"T",cells:[[0,0],[1,0],[2,0],[1,1]],color:4},
    {name:"L",cells:[[0,0],[0,1],[0,2],[1,2]],color:5},
    {name:"J",cells:[[1,0],[1,1],[1,2],[0,2]],color:0},
    {name:"S",cells:[[1,0],[2,0],[0,1],[1,1]],color:3},
    {name:"Z",cells:[[0,0],[1,0],[1,1],[2,1]],color:2}
  ];

  function $(s){return root&&root.querySelector(s)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function board(w,h){var out=[];for(var y=0;y<h;y++)out.push(Array(w).fill(null));return out}
  function block(kind,color,extra){return Object.assign({kind:kind,color:color||0},extra||{})}
  function copyCells(a){return a.map(function(c){return c.slice()})}

  function ensureStyle(){
    if(document.getElementById("recursionBugStyleV03"))return;
    var st=document.createElement("style");st.id="recursionBugStyleV03";st.textContent=`
      #recursionBugRoot{position:fixed;inset:0;z-index:2147483500;overflow:hidden;background:#070910;color:#eef6ff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
      #recursionBugRoot *{box-sizing:border-box}
      .rb-shell{position:absolute;inset:0;display:grid;grid-template-rows:42px minmax(0,1fr) 76px;padding:max(9px,env(safe-area-inset-top)) 10px max(8px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 18%,rgba(92,126,255,.14),transparent 42%),#070910}
      .rb-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(238,246,255,.18);font-size:10px;letter-spacing:.12em;color:rgba(238,246,255,.65)}
      .rb-close{width:38px;height:38px;border:1px solid rgba(238,246,255,.3);border-radius:7px;background:rgba(255,255,255,.06);color:#fff;font:700 22px/1 system-ui}
      .rb-main{min-height:0;display:grid;place-items:center;padding:7px 0}
      .rb-stage{position:relative;width:min(100%,520px);height:100%;max-height:730px;overflow:hidden;border:3px solid #788dff;background:#10152a;box-shadow:0 0 0 3px #252d5a,0 18px 48px rgba(0,0,0,.5)}
      .rb-canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none}
      .rb-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px)}
      .rb-title{position:absolute;inset:0;z-index:50;display:grid;place-items:center;padding:26px;text-align:center;background:linear-gradient(180deg,#121733,#070910)}
      .rb-logo{font-size:clamp(29px,8vw,53px);font-weight:1000;line-height:.95;letter-spacing:.08em;text-shadow:4px 4px 0 #39448c}
      .rb-sub{margin-top:18px;font-size:11px;font-weight:900;letter-spacing:.16em;color:#b0beff}
      .rb-copy{margin-top:18px;font-size:12px;line-height:1.8;color:rgba(238,246,255,.72)}
      .rb-start{margin-top:25px;padding:12px 18px;border:2px solid #eef6ff;background:transparent;color:#fff;font:900 12px/1 ui-monospace,monospace;letter-spacing:.14em}
      .rb-hud{position:absolute;left:8px;right:8px;top:7px;z-index:20;display:flex;justify-content:space-between;gap:8px;font-size:10px;font-weight:900;letter-spacing:.07em;text-shadow:1px 1px 0 #000}
      .rb-status{position:absolute;left:50%;top:35px;z-index:24;transform:translateX(-50%);width:max-content;max-width:92%;padding:6px 9px;border:1px solid rgba(238,246,255,.36);background:rgba(7,9,16,.9);font-size:10px;font-weight:900;letter-spacing:.08em;text-align:center;opacity:0;transition:opacity .18s ease;white-space:pre-line}
      .rb-status.show{opacity:1}
      .rb-world-label{position:absolute;right:7px;bottom:6px;z-index:20;font-size:9px;font-weight:900;letter-spacing:.08em;color:rgba(238,246,255,.6);text-shadow:1px 1px 0 #000}
      .rb-controls{width:min(100%,520px);margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1.05fr 1.05fr;gap:8px;align-items:center;padding-top:6px}
      .rb-btn{height:60px;border:1px solid rgba(238,246,255,.29);border-radius:10px;background:rgba(255,255,255,.065);color:#eef6ff;font:1000 18px/1 ui-monospace,monospace;touch-action:none}
      .rb-btn:active{background:rgba(120,141,255,.25);transform:translateY(1px)}
      .rb-action{border-radius:999px;font-size:21px}
      .rb-a{border-color:rgba(255,215,93,.62);color:#ffe888;background:rgba(255,215,93,.08)}
      .rb-key{display:block;font-size:9px;margin-top:5px;letter-spacing:.08em;opacity:.65}
      .rb-flash{position:absolute;inset:0;z-index:31;pointer-events:none;background:#fff;animation:rbFlash .3s ease-out forwards}
      @keyframes rbFlash{to{opacity:0}}
      .rb-glitch{animation:rbGlitch .42s steps(5,end)}
      @keyframes rbGlitch{0%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}100%{transform:translateX(0)}}
    `;document.head.appendChild(st);
  }

  function tone(freq,dur,vol,type){try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio||audio.state==="closed")audio=new AC();if(audio.state==="suspended")audio.resume();var o=audio.createOscillator(),g=audio.createGain();o.type=type||"square";o.frequency.value=freq;g.gain.setValueAtTime(vol||.02,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}}

  function initialState(){return {
    mode:"title",w:10,h:20,grid:board(10,20),piece:null,next:null,last:0,fallClock:0,fallMs:700,
    score:0,lines:0,locks:0,phase:0,postSideLocks:0,world:1,shake:0,msgTimer:0,resolving:false
  }}

  function open(){
    close();ensureStyle();state=initialState();
    root=document.createElement("section");root.id="recursionBugRoot";root.innerHTML=`
      <div class="rb-shell">
        <header class="rb-head"><span>SYNTAX FRONTIER INC. / BUG No.023</span><button type="button" class="rb-close">×</button></header>
        <main class="rb-main"><div class="rb-stage"><canvas class="rb-canvas"></canvas><div class="rb-scan"></div><div class="rb-title"><div><div class="rb-logo">ENDLESS<br>STACK</div><div class="rb-sub">RECURSION BUG / 199X</div><div class="rb-copy">積んで、消して、生き残る。<br>それだけのゲームです。</div><button type="button" class="rb-start">PRESS START</button></div></div></div></main>
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
    bindRepeat(".rb-left",function(){move(-1)});bindRepeat(".rb-right",function(){move(1)});
    bindTap(".rb-b",rotate);bindTap(".rb-a",hardDrop);bindGestures();
    window.addEventListener("keydown",keydown,true);window.addEventListener("keyup",keyup,true);
  }

  function bindTap(sel,fn){$(sel).addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();fn()},true)}
  function bindRepeat(sel,fn){var t=0,b=$(sel);b.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();fn();t=setInterval(fn,105)},true);function end(e){if(e){e.preventDefault();e.stopPropagation()}clearInterval(t);t=0}b.addEventListener("pointerup",end,true);b.addEventListener("pointercancel",end,true);b.addEventListener("pointerleave",end,true)}
  function bindGestures(){var c=$(".rb-canvas"),sx=0,sy=0,lx=0,moved=false;c.addEventListener("pointerdown",function(e){if(!playing())return;e.preventDefault();sx=lx=e.clientX;sy=e.clientY;moved=false;try{c.setPointerCapture(e.pointerId)}catch(_){}},true);c.addEventListener("pointermove",function(e){if(!playing())return;e.preventDefault();var dx=e.clientX-lx;if(Math.abs(dx)>22){move(dx>0?1:-1);lx=e.clientX;moved=true}},true);c.addEventListener("pointerup",function(e){if(!playing())return;e.preventDefault();var dy=e.clientY-sy;if(dy>65)hardDrop();else if(!moved&&Math.abs(dy)<25)rotate()},true)}
  function keydown(e){if(!playing())return;if(e.key==="ArrowLeft"||e.key==="a")move(-1);if(e.key==="ArrowRight"||e.key==="d")move(1);if(e.key==="ArrowUp"||e.key==="w"||e.key==="x")rotate();if(e.key==="ArrowDown"||e.key==="s")keys.down=true;if(e.key===" "||e.key==="z"){e.preventDefault();hardDrop()}if(e.key==="Escape")close()}
  function keyup(e){if(e.key==="ArrowDown"||e.key==="s")keys.down=false}
  function playing(){return !!(root&&state&&state.mode==="play"&&!state.resolving)}

  function start(){state=initialState();state.mode="play";var stage=$(".rb-stage");stage.querySelector(".rb-title").remove();stage.insertAdjacentHTML("beforeend",`<div class="rb-hud"><span>SCORE <b class="rb-score">000000</b></span><span>LINE <b class="rb-lines">000</b></span><span>RULE <b class="rb-rule">BLOCK</b></span></div><div class="rb-status"></div><div class="rb-world-label"></div>`);state.next=makePiece("tetromino");spawn();resize();tone(330,.08,.025);state.last=performance.now();raf=requestAnimationFrame(loop)}

  function phaseKind(){
    if(state.phase<2)return "tetromino";
    var r=Math.random();
    if(state.phase===2)return r<.28?"orb":"tetromino";
    if(state.phase===3)return r<.22?"orb":(r<.36?"capsule":"tetromino");
    if(state.phase===4)return r<.2?"orb":(r<.34?"capsule":(r<.43?"bomb":"tetromino"));
    return r<.19?"orb":(r<.32?"capsule":(r<.41?"bomb":(r<.48?"mystery":"tetromino")));
  }
  function makePiece(kind){
    if(kind==="tetromino"){var t=TETROS[Math.floor(Math.random()*TETROS.length)];return {kind:kind,cells:copyCells(t.cells),color:t.color,x:0,y:-3}}
    if(kind==="orb")return {kind:kind,cells:[[0,0],[0,1]],colors:[Math.floor(Math.random()*4),Math.floor(Math.random()*4)],x:0,y:-2,rotation:0};
    if(kind==="capsule")return {kind:kind,cells:[[0,0],[1,0]],colors:[Math.floor(Math.random()*4),Math.floor(Math.random()*4)],x:0,y:-2,rotation:1};
    return {kind:kind,cells:[[0,0]],color:kind==="bomb"?1:4,x:0,y:-1};
  }
  function spawn(){var kind=state.next?state.next.kind:phaseKind();state.piece=state.next||makePiece(kind);state.next=makePiece(phaseKind());state.piece.x=Math.floor(state.w/2)-1;state.piece.y=-3;if(collides(state.piece,0,0))expandUpAndRescue()}
  function cells(p,dx,dy){return p.cells.map(function(c,i){return {x:p.x+c[0]+(dx||0),y:p.y+c[1]+(dy||0),i:i}})}
  function collides(p,dx,dy){var a=cells(p,dx,dy);for(var i=0;i<a.length;i++){var q=a[i];if(q.x<0||q.x>=state.w||q.y>=state.h)return true;if(q.y>=0&&state.grid[q.y][q.x])return true}return false}
  function move(d){if(!playing()||!state.piece)return;if(!collides(state.piece,d,0)){state.piece.x+=d;tone(150,.025,.006)}}
  function rotate(){
    if(!playing()||!state.piece||state.piece.kind==="bomb"||state.piece.kind==="mystery")return;
    var p=state.piece,old=copyCells(p.cells),rot=p.cells.map(function(c){return [-c[1],c[0]]});
    var minX=Math.min.apply(null,rot.map(function(c){return c[0]})),minY=Math.min.apply(null,rot.map(function(c){return c[1]}));rot=rot.map(function(c){return [c[0]-minX,c[1]-minY]});p.cells=rot;
    if(collides(p,0,0)){if(!collides(p,-1,0))p.x--;else if(!collides(p,1,0))p.x++;else p.cells=old}else tone(440,.04,.012)
  }
  function hardDrop(){if(!playing()||!state.piece)return;var n=0;while(!collides(state.piece,0,1)){state.piece.y++;n++}state.score+=n*2;lock()}

  function lock(){
    if(!state.piece)return;var p=state.piece,a=cells(p,0,0),above=a.some(function(q){return q.y<0});
    if(above){expandUpAndRescue();a=cells(p,0,0)}
    a.forEach(function(q){if(q.y<0||q.y>=state.h)return;var c;if(p.kind==="orb")c=block("orb",p.colors[q.i]);else if(p.kind==="capsule")c=block("capsule",p.colors[q.i],{pair:state.locks+1,half:q.i});else c=block(p.kind,p.color);state.grid[q.y][q.x]=c});
    state.locks++;state.score+=10;if(state.phase>=2)state.postSideLocks++;
    state.piece=null;resolve(function(){advanceInvasion();state.fallMs=Math.max(240,700-state.locks*12);spawn();hud()});tone(112,.05,.014)
  }

  function expandUpAndRescue(){
    var add=8;state.grid=board(state.w,add).concat(state.grid);state.h+=add;state.world++;if(state.piece)state.piece.y+=add;state.phase=Math.max(state.phase,1);state.shake=20;eventFx("NO SPACE\nGAME OVER CANCELLED\nWORLD EXPANDED ↑",2500);tone(82,.32,.034,"sawtooth")
  }
  function expandSide(){
    var add=2;state.grid.forEach(function(r){for(var i=0;i<add;i++){r.unshift(null);r.push(null)}});state.w+=add*2;if(state.piece)state.piece.x+=add;state.world++;state.phase=2;state.postSideLocks=0;state.shake=23;eventFx("LINE COMPLETE\nHIDDEN AREA FOUND\nWORLD EXPANDED ↔",2700);tone(72,.34,.036,"sawtooth")
  }
  function eventFx(msg,ms){var stage=$(".rb-stage"),f=document.createElement("div");f.className="rb-flash";stage.appendChild(f);stage.classList.add("rb-glitch");announce(msg,ms);setTimeout(function(){f.remove();stage.classList.remove("rb-glitch")},440)}
  function announce(msg,ms){var e=$(".rb-status");if(!e)return;e.textContent=msg;e.classList.add("show");clearTimeout(state.msgTimer);state.msgTimer=setTimeout(function(){if(e)e.classList.remove("show")},ms||1700)}

  function advanceInvasion(){
    if(state.phase===2&&state.postSideLocks>=5){state.phase=3;state.postSideLocks=0;announce("SYSTEM UPDATE\nROUND OBJECT LIBRARY CONNECTED",2200);tone(570,.14,.02);return}
    if(state.phase===3&&state.postSideLocks>=8){state.phase=4;state.postSideLocks=0;announce("SYSTEM UPDATE\nTWO-TONE CAPSULE LIBRARY CONNECTED",2400);tone(520,.14,.02);return}
    if(state.phase===4&&state.postSideLocks>=9){state.phase=5;state.postSideLocks=0;announce("SYSTEM UPDATE\nEXPLOSIVE BLOCK LIBRARY CONNECTED",2300);tone(170,.22,.025,"sawtooth");return}
    if(state.phase===5&&state.postSideLocks>=10){state.phase=6;state.postSideLocks=0;announce("RULE UPDATE\nUNDEFINED OBJECT DETECTED",2300);tone(95,.28,.03,"sawtooth")}
  }

  function resolve(done){
    state.resolving=true;var first=true,chain=0;
    function step(){
      applyGravity();
      var marks=new Set(),full=fullRows();
      if(full.length&&state.phase===1){state.resolving=false;expandSide();done();return}
      full.forEach(function(y){for(var x=0;x<state.w;x++)marks.add(x+","+y)});
      markOrbGroups(marks);markCapsuleLines(marks);
      var bombs=[];marks.forEach(function(k){var p=k.split(","),x=+p[0],y=+p[1],c=state.grid[y]&&state.grid[y][x];if(c&&c.kind==="bomb")bombs.push([x,y])});
      bombs.forEach(function(b){for(var yy=b[1]-1;yy<=b[1]+1;yy++)for(var xx=b[0]-1;xx<=b[0]+1;xx++)if(xx>=0&&xx<state.w&&yy>=0&&yy<state.h)marks.add(xx+","+yy)});
      if(!marks.size){state.resolving=false;done();return}
      chain++;marks.forEach(function(k){var p=k.split(","),x=+p[0],y=+p[1],c=state.grid[y][x];if(c&&c.kind==="mystery"&&!nearBomb(x,y,bombs))return;state.grid[y][x]=null});state.lines+=full.length;state.score+=marks.size*25+full.length*300+chain*100;tone(chain>1?880:660,.09,.023);draw();setTimeout(step,chain>1?190:135)
    }
    setTimeout(step,first?60:0)
  }
  function fullRows(){var out=[];for(var y=0;y<state.h;y++){var ok=true;for(var x=0;x<state.w;x++)if(!state.grid[y][x]){ok=false;break}if(ok)out.push(y)}return out}
  function applyGravity(){
    var moved=true,guard=0;while(moved&&guard++<state.h){moved=false;for(var y=state.h-2;y>=0;y--)for(var x=0;x<state.w;x++){var c=state.grid[y][x];if(!c||c.kind==="tetromino"||c.kind==="bomb"||c.kind==="mystery")continue;if(!state.grid[y+1][x]){state.grid[y+1][x]=c;state.grid[y][x]=null;moved=true}}}
  }
  function markOrbGroups(marks){var seen=new Set();for(var y=0;y<state.h;y++)for(var x=0;x<state.w;x++){var c=state.grid[y][x],k=x+","+y;if(!c||c.kind!=="orb"||seen.has(k))continue;var q=[[x,y]],g=[];seen.add(k);while(q.length){var a=q.shift();g.push(a);[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var nx=a[0]+d[0],ny=a[1]+d[1],nk=nx+","+ny,n=state.grid[ny]&&state.grid[ny][nx];if(n&&n.kind==="orb"&&n.color===c.color&&!seen.has(nk)){seen.add(nk);q.push([nx,ny])}})}if(g.length>=4)g.forEach(function(a){marks.add(a[0]+","+a[1])})}}
  function markCapsuleLines(marks){
    function scan(dx,dy){for(var y=0;y<state.h;y++)for(var x=0;x<state.w;x++){var c=state.grid[y][x];if(!c||c.kind!=="capsule")continue;var px=x-dx,py=y-dy,prev=state.grid[py]&&state.grid[py][px];if(prev&&prev.kind==="capsule"&&prev.color===c.color)continue;var run=[],nx=x,ny=y;while(nx>=0&&nx<state.w&&ny>=0&&ny<state.h){var n=state.grid[ny][nx];if(!n||n.kind!=="capsule"||n.color!==c.color)break;run.push([nx,ny]);nx+=dx;ny+=dy}if(run.length>=4)run.forEach(function(a){marks.add(a[0]+","+a[1])})}}
    scan(1,0);scan(0,1)
  }
  function nearBomb(x,y,b){return b.some(function(p){return Math.abs(p[0]-x)<=1&&Math.abs(p[1]-y)<=1})}

  function loop(t){if(!root||!state||state.mode!=="play")return;var dt=Math.min(50,t-state.last);state.last=t;if(!state.resolving&&state.piece){state.fallClock+=dt;var interval=keys.down?55:state.fallMs;if(state.fallClock>=interval){state.fallClock=0;if(!collides(state.piece,0,1))state.piece.y++;else lock()}}draw();raf=requestAnimationFrame(loop)}
  function resize(){var c=$(".rb-canvas"),r=c.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.floor(r.width*d));c.height=Math.max(1,Math.floor(r.height*d));c._d=d}
  function draw(){
    var c=$(".rb-canvas");if(!c||!state)return;var r=c.getBoundingClientRect(),d=c._d||1;if(c.width!==Math.floor(r.width*d)||c.height!==Math.floor(r.height*d))resize();var ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
    var pad=12,top=53,bottom=12,size=Math.floor(Math.min((r.width-pad*2)/state.w,(r.height-top-bottom)/state.h));size=clamp(size,5,28);var bw=size*state.w,bh=size*state.h,ox=Math.floor((r.width-bw)/2),oy=Math.floor(top+(r.height-top-bottom-bh)/2);if(state.shake>.4){ox+=(Math.random()-.5)*state.shake;oy+=(Math.random()-.5)*state.shake;state.shake*=.84}
    ctx.fillStyle="#0c1122";ctx.fillRect(ox-3,oy-3,bw+6,bh+6);ctx.strokeStyle="#788dff";ctx.lineWidth=2;ctx.strokeRect(ox-2,oy-2,bw+4,bh+4);ctx.strokeStyle="rgba(180,195,255,.10)";ctx.lineWidth=1;for(var x=0;x<=state.w;x++){ctx.beginPath();ctx.moveTo(ox+x*size,oy);ctx.lineTo(ox+x*size,oy+bh);ctx.stroke()}for(var y=0;y<=state.h;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*size);ctx.lineTo(ox+bw,oy+y*size);ctx.stroke()}
    for(var yy=0;yy<state.h;yy++)for(var xx=0;xx<state.w;xx++)if(state.grid[yy][xx])paint(ctx,ox+xx*size,oy+yy*size,size,state.grid[yy][xx]);
    if(state.piece)cells(state.piece,0,0).forEach(function(q){if(q.y<0)return;var c;if(state.piece.kind==="orb"||state.piece.kind==="capsule")c=block(state.piece.kind,state.piece.colors[q.i]);else c=block(state.piece.kind,state.piece.color);paint(ctx,ox+q.x*size,oy+q.y*size,size,c,true)});
    var label=$(".rb-world-label");if(label)label.textContent="WORLD "+state.w+"×"+state.h+" / v"+state.world
  }
  function paint(ctx,x,y,s,c,active){var m=Math.max(1,Math.floor(s*.1));ctx.save();if(c.kind==="orb"){ctx.fillStyle=COLORS[c.color%4];ctx.beginPath();ctx.ellipse(x+s/2,y+s/2,s*.4,s*.43,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#10131e";var e=Math.max(1,s*.075);ctx.beginPath();ctx.arc(x+s*.39,y+s*.42,e,0,Math.PI*2);ctx.arc(x+s*.61,y+s*.42,e,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.5)";ctx.stroke()}else if(c.kind==="capsule"){ctx.fillStyle=COLORS[c.color%4];round(ctx,x+m,y+m,s-2*m,s-2*m,s*.38);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=Math.max(1,s*.07);ctx.beginPath();ctx.moveTo(x+s*.18,y+s*.5);ctx.lineTo(x+s*.82,y+s*.5);ctx.stroke()}else if(c.kind==="bomb"){ctx.fillStyle="#222635";round(ctx,x+m,y+m,s-2*m,s-2*m,s*.16);ctx.fill();ctx.strokeStyle="#ff607a";ctx.lineWidth=Math.max(1,s*.08);ctx.stroke();ctx.fillStyle="#ffe064";ctx.font="900 "+Math.max(7,Math.floor(s*.48))+"px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("✦",x+s/2,y+s/2)}else if(c.kind==="mystery"){ctx.fillStyle="#151827";ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.strokeStyle="#bd8dff";ctx.lineWidth=Math.max(1,s*.08);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m);ctx.fillStyle="#e2d4ff";ctx.font="900 "+Math.max(7,Math.floor(s*.55))+"px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("?",x+s/2,y+s/2)}else{ctx.fillStyle=COLORS[c.color%COLORS.length];ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.fillStyle="rgba(255,255,255,.24)";ctx.fillRect(x+m*1.7,y+m*1.7,s-3.4*m,Math.max(1,s*.12));ctx.strokeStyle="rgba(5,8,18,.75)";ctx.lineWidth=Math.max(1,s*.08);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m)}if(active){ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,s-2,s-2)}ctx.restore()}
  function round(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function hud(){var a=$(".rb-score"),b=$(".rb-lines"),c=$(".rb-rule");if(a)a.textContent=String(state.score).padStart(6,"0");if(b)b.textContent=String(state.lines).padStart(3,"0");if(c)c.textContent=["BLOCK","BLOCK","ROUND","CAPSULE","BOMB","UNDEFINED","MIXED"][state.phase]||"MIXED"}

  function close(){cancelAnimationFrame(raf);raf=0;window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);if(root&&root.parentNode)root.remove();root=null;state=null;try{if(audio&&audio.state!=="closed")audio.close()}catch(e){}audio=null}
  window.addEventListener("resize",function(){if(root)resize()});
  window.MEGANE_RECURSION_BUG={version:"v0.3-endless-stack",open:open,close:close};
})();
