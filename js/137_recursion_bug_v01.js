/* 137_recursion_bug_v01.js
   SYNTAX FRONTIER INC.
   BUG No.023 — RECURSION BUG
   ENDLESS STACK v0.1

   One board gradually absorbs several falling-puzzle rule sets.
   - Starts as an ordinary falling-block game.
   - Reaching the ceiling expands the world upward instead of ending it.
   - Completing the first line reveals hidden space to the left and right.
   - Round creatures, two-tone capsules, bombs and unknown blocks then invade.
*/
(function(){
  "use strict";

  var root=null, raf=0, state=null, audio=null;
  var keyState={left:false,right:false,down:false};
  var repeatTimer=0;
  var COLORS=["#65d7ff","#ffd65a","#ff7c9f","#8be36f","#b88cff","#ff9e59"];
  var TETROS=[
    {name:"I",cells:[[0,1],[1,1],[2,1],[3,1]],color:0},
    {name:"O",cells:[[0,0],[1,0],[0,1],[1,1]],color:1},
    {name:"T",cells:[[0,0],[1,0],[2,0],[1,1]],color:4},
    {name:"L",cells:[[0,0],[0,1],[0,2],[1,2]],color:5},
    {name:"J",cells:[[1,0],[1,1],[1,2],[0,2]],color:0},
    {name:"S",cells:[[1,0],[2,0],[0,1],[1,1]],color:3},
    {name:"Z",cells:[[0,0],[1,0],[1,1],[2,1]],color:2}
  ];

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function $(sel){return root&&root.querySelector(sel)}
  function cell(kind,color,extra){return Object.assign({kind:kind,color:color==null?0:color},extra||{})}
  function emptyBoard(w,h){var b=[];for(var y=0;y<h;y++){b[y]=Array(w).fill(null)}return b}

  function ensureStyle(){
    if(document.getElementById("recursionBugStyleV01"))return;
    var style=document.createElement("style");
    style.id="recursionBugStyleV01";
    style.textContent=`
      #recursionBugRoot{position:fixed;inset:0;z-index:2147483500;overflow:hidden;background:#080a11;color:#eef7ff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
      #recursionBugRoot *{box-sizing:border-box}
      .rb-shell{position:absolute;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 20%,rgba(91,128,255,.13),transparent 40%),#080a11}
      .rb-head{height:42px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(238,247,255,.18);font-size:10px;letter-spacing:.12em;color:rgba(238,247,255,.65)}
      .rb-close{width:38px;height:38px;border:1px solid rgba(238,247,255,.32);border-radius:6px;background:rgba(255,255,255,.06);color:#fff;font:700 22px/1 system-ui}
      .rb-main{min-height:0;display:grid;place-items:center;padding:7px 0}
      .rb-stage{position:relative;width:min(100%,520px);height:100%;max-height:720px;overflow:hidden;border:3px solid #758cff;background:#11162b;box-shadow:0 0 0 3px #232a55,0 18px 50px rgba(0,0,0,.48)}
      .rb-canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none}
      .rb-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px);mix-blend-mode:screen}
      .rb-hud{position:absolute;left:8px;right:8px;top:7px;z-index:20;display:flex;justify-content:space-between;gap:8px;font-size:10px;font-weight:800;letter-spacing:.08em;text-shadow:1px 1px 0 #000}
      .rb-status{position:absolute;left:50%;top:36px;z-index:22;transform:translateX(-50%);max-width:92%;padding:5px 8px;border:1px solid rgba(238,247,255,.32);background:rgba(8,10,17,.82);font-size:10px;font-weight:800;letter-spacing:.08em;text-align:center;opacity:0;transition:opacity .2s ease}
      .rb-status.show{opacity:1}
      .rb-title,.rb-ending{position:absolute;inset:0;z-index:50;display:grid;place-items:center;padding:28px;text-align:center;background:linear-gradient(180deg,#121733,#080a11);color:#eef7ff}
      .rb-logo{font-size:clamp(28px,8vw,52px);font-weight:1000;line-height:.95;letter-spacing:.08em;text-shadow:4px 4px 0 #39438a}
      .rb-sub{margin-top:18px;font-size:11px;font-weight:800;letter-spacing:.16em;color:#aebdff}
      .rb-copy{margin-top:18px;font-size:12px;line-height:1.8;color:rgba(238,247,255,.72)}
      .rb-start,.rb-again{margin-top:26px;padding:12px 18px;border:2px solid #eef7ff;background:transparent;color:#fff;font:800 12px/1 ui-monospace,monospace;letter-spacing:.14em}
      .rb-controls{width:min(100%,520px);margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr 1.25fr;gap:7px;padding-top:5px}
      .rb-btn{min-height:57px;border:1px solid rgba(238,247,255,.28);border-radius:8px;background:rgba(255,255,255,.06);color:#eef7ff;font:900 13px/1 ui-monospace,monospace;touch-action:none}
      .rb-btn:active{background:rgba(117,140,255,.24)}
      .rb-drop{border-color:rgba(255,214,90,.55);color:#ffe893}
      .rb-flash{position:absolute;inset:0;z-index:30;pointer-events:none;background:#fff;animation:rbFlash .28s ease-out forwards}
      @keyframes rbFlash{to{opacity:0}}
      .rb-glitch{animation:rbGlitch .28s steps(3,end)}
      @keyframes rbGlitch{0%{transform:translateX(0)}33%{transform:translateX(-5px)}66%{transform:translateX(5px)}100%{transform:translateX(0)}}
      .rb-world-label{position:absolute;right:7px;bottom:6px;z-index:20;font-size:9px;font-weight:800;letter-spacing:.08em;color:rgba(238,247,255,.58);text-shadow:1px 1px 0 #000}
    `;
    document.head.appendChild(style);
  }

  function tone(freq,dur,vol,type){
    try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio||audio.state==="closed")audio=new AC();if(audio.state==="suspended")audio.resume();var o=audio.createOscillator(),g=audio.createGain();o.type=type||"square";o.frequency.value=freq;g.gain.setValueAtTime(vol||.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}
  }

  function makeState(){
    return {mode:"title",w:10,h:18,board:emptyBoard(10,18),piece:null,next:null,last:0,dropClock:0,dropMs:660,locks:0,lines:0,score:0,verticalExpanded:false,horizontalExpanded:false,chaosLevel:0,messageTimer:0,shake:0,worldVersion:1};
  }

  function open(){
    close();ensureStyle();state=makeState();
    root=document.createElement("section");root.id="recursionBugRoot";
    root.innerHTML=`<div class="rb-shell"><header class="rb-head"><span>SYNTAX FRONTIER INC. / BUG No.023</span><button class="rb-close" type="button">×</button></header><main class="rb-main"><div class="rb-stage"><canvas class="rb-canvas"></canvas><div class="rb-scan"></div><div class="rb-title"><div><div class="rb-logo">ENDLESS<br>STACK</div><div class="rb-sub">RECURSION BUG / 199X</div><div class="rb-copy">積んで、消して、生き残る。<br>それだけのゲームです。</div><button class="rb-start" type="button">PRESS START</button></div></div></div></main><div class="rb-controls"><button class="rb-btn rb-left">◀</button><button class="rb-btn rb-rotate">ROTATE</button><button class="rb-btn rb-right">▶</button><button class="rb-btn rb-drop">DROP</button></div></div>`;
    document.body.appendChild(root);
    $(".rb-close").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();close()},true);
    $(".rb-start").addEventListener("pointerup",function(e){e.preventDefault();e.stopPropagation();start()},true);
    bindButton(".rb-left",function(){move(-1)},true);
    bindButton(".rb-right",function(){move(1)},true);
    bindButton(".rb-rotate",rotate,false);
    bindButton(".rb-drop",hardDrop,false);
    bindStageGestures();
    window.addEventListener("keydown",keyDown,true);window.addEventListener("keyup",keyUp,true);
  }

  function bindButton(sel,fn,repeat){
    var b=$(sel);var timer=0;
    b.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();fn();if(repeat)timer=setInterval(fn,110)},true);
    function up(e){if(e){e.preventDefault();e.stopPropagation()}clearInterval(timer);timer=0}
    b.addEventListener("pointerup",up,true);b.addEventListener("pointercancel",up,true);b.addEventListener("pointerleave",up,true);
  }

  function bindStageGestures(){
    var canvas=$(".rb-canvas"),sx=0,sy=0,lastX=0,moved=false;
    canvas.addEventListener("pointerdown",function(e){if(!state||state.mode!=="play")return;e.preventDefault();sx=lastX=e.clientX;sy=e.clientY;moved=false;try{canvas.setPointerCapture(e.pointerId)}catch(_){}},true);
    canvas.addEventListener("pointermove",function(e){if(!state||state.mode!=="play")return;e.preventDefault();var dx=e.clientX-lastX;if(Math.abs(dx)>22){move(dx>0?1:-1);lastX=e.clientX;moved=true}},true);
    canvas.addEventListener("pointerup",function(e){if(!state||state.mode!=="play")return;e.preventDefault();var dy=e.clientY-sy;if(dy>70)hardDrop();else if(!moved&&Math.abs(dy)<25)rotate()},true);
  }

  function keyDown(e){if(!root||!state||state.mode!=="play")return;if(e.key==="ArrowLeft"||e.key==="a")move(-1);if(e.key==="ArrowRight"||e.key==="d")move(1);if(e.key==="ArrowUp"||e.key==="w"||e.key==="x")rotate();if(e.key==="ArrowDown"||e.key==="s")keyState.down=true;if(e.key===" "||e.key==="z"){e.preventDefault();hardDrop()}if(e.key==="Escape")close()}
  function keyUp(e){if(e.key==="ArrowDown"||e.key==="s")keyState.down=false}

  function start(){
    state=makeState();state.mode="play";
    var stage=$(".rb-stage");stage.querySelector(".rb-title").remove();
    stage.insertAdjacentHTML("beforeend",`<div class="rb-hud"><span>SCORE <b class="rb-score">000000</b></span><span>LINE <b class="rb-lines">000</b></span><span>RULE <b class="rb-rule">BLOCK</b></span></div><div class="rb-status"></div><div class="rb-world-label"></div>`);
    state.next=makePiece("tetromino");spawn();resizeCanvas();tone(330,.08,.025);cancelAnimationFrame(raf);state.last=performance.now();raf=requestAnimationFrame(loop);
  }

  function chooseKind(){
    if(state.locks===4&&state.chaosLevel<1){state.chaosLevel=1;announce("UNKNOWN ROUND OBJECT DETECTED",1700);return "blob"}
    if(state.locks===8&&state.chaosLevel<2){state.chaosLevel=2;announce("DUAL-COLOR MEDICINE DETECTED",1700);return "capsule"}
    if(state.locks===12&&state.chaosLevel<3){state.chaosLevel=3;announce("EXPLOSIVE RULE ADDED",1700);return "bomb"}
    if(state.locks===16&&state.chaosLevel<4){state.chaosLevel=4;announce("UNDEFINED BLOCK DETECTED",1700);return "mystery"}
    var r=Math.random();
    if(state.chaosLevel>=4&&r<.12)return "mystery";
    if(state.chaosLevel>=3&&r<.22)return "bomb";
    if(state.chaosLevel>=2&&r<.36)return "capsule";
    if(state.chaosLevel>=1&&r<.53)return "blob";
    return "tetromino";
  }

  function makePiece(force){
    var kind=force||chooseKind();
    if(kind==="tetromino"){var t=TETROS[Math.floor(Math.random()*TETROS.length)];return {kind:kind,cells:t.cells.map(function(c){return c.slice()}),color:t.color,x:0,y:0,name:t.name}}
    if(kind==="blob")return {kind:kind,cells:[[0,0]],color:Math.floor(Math.random()*4),x:0,y:0};
    if(kind==="capsule")return {kind:kind,cells:[[0,0],[1,0]],colors:[Math.floor(Math.random()*4),Math.floor(Math.random()*4)],x:0,y:0};
    if(kind==="bomb")return {kind:kind,cells:[[0,0]],color:2,x:0,y:0};
    return {kind:"mystery",cells:[[0,0]],color:4,x:0,y:0};
  }

  function spawn(){
    state.piece=state.next||makePiece();state.next=makePiece();
    var p=state.piece;p.x=Math.floor((state.w-pieceWidth(p))/2);p.y=-pieceMinY(p)-1;
    if(collides(p,0,0))expandUp(true);
  }
  function pieceWidth(p){var xs=p.cells.map(function(c){return c[0]});return Math.max.apply(null,xs)-Math.min.apply(null,xs)+1}
  function pieceMinY(p){return Math.min.apply(null,p.cells.map(function(c){return c[1]}))}
  function cellsOf(p,dx,dy){return p.cells.map(function(c,i){return {x:p.x+c[0]+(dx||0),y:p.y+c[1]+(dy||0),i:i}})}
  function collides(p,dx,dy){var arr=cellsOf(p,dx,dy);for(var i=0;i<arr.length;i++){var q=arr[i];if(q.x<0||q.x>=state.w||q.y>=state.h)return true;if(q.y>=0&&state.board[q.y][q.x])return true}return false}
  function move(d){if(!state||state.mode!=="play"||!state.piece)return;if(!collides(state.piece,d,0)){state.piece.x+=d;tone(150,.025,.006)}}
  function rotate(){
    if(!state||state.mode!=="play"||!state.piece)return;var p=state.piece;if(p.kind==="blob"||p.kind==="bomb"||p.kind==="mystery")return;
    var old=p.cells.map(function(c){return c.slice()}),rot=p.cells.map(function(c){return [-c[1],c[0]]});var minX=Math.min.apply(null,rot.map(function(c){return c[0]})),minY=Math.min.apply(null,rot.map(function(c){return c[1]}));rot=rot.map(function(c){return [c[0]-minX,c[1]-minY]});p.cells=rot;
    if(collides(p,0,0)){if(!collides(p,-1,0))p.x--;else if(!collides(p,1,0))p.x++;else p.cells=old}else tone(440,.04,.012);
  }
  function hardDrop(){if(!state||state.mode!=="play"||!state.piece)return;var n=0;while(!collides(state.piece,0,1)){state.piece.y++;n++}state.score+=n*2;lockPiece()}

  function lockPiece(){
    var p=state.piece,arr=cellsOf(p,0,0),above=false;
    arr.forEach(function(q){if(q.y<0){above=true;return}var c;if(p.kind==="capsule")c=cell("capsule",p.colors[q.i],{link:q.i===0?"a":"b"});else c=cell(p.kind,p.color);state.board[q.y][q.x]=c});
    state.locks++;state.score+=10;
    if(above){expandUp(true);arr.forEach(function(q){if(q.y<0){var ny=q.y+6;if(ny>=0){var c=p.kind==="capsule"?cell("capsule",p.colors[q.i]):cell(p.kind,p.color);state.board[ny][q.x]=c}}})}
    resolveBoard();state.dropMs=Math.max(230,660-state.locks*13);spawn();updateHud();tone(115,.045,.013);
  }

  function resolveBoard(){
    var full=[];for(var y=0;y<state.h;y++){var ok=true;for(var x=0;x<state.w;x++){if(!state.board[y][x]){ok=false;break}}if(ok)full.push(y)}
    if(full.length&&!state.horizontalExpanded){expandSide();return}
    var marked=new Set();full.forEach(function(y){for(var x=0;x<state.w;x++)marked.add(x+","+y)});
    findColorGroups(marked);
    var bombs=[];marked.forEach(function(k){var a=k.split(","),x=+a[0],y=+a[1],c=state.board[y]&&state.board[y][x];if(c&&c.kind==="bomb")bombs.push([x,y])});
    bombs.forEach(function(b){for(var yy=b[1]-1;yy<=b[1]+1;yy++)for(var xx=b[0]-1;xx<=b[0]+1;xx++)if(xx>=0&&xx<state.w&&yy>=0&&yy<state.h)marked.add(xx+","+yy)});
    if(marked.size){marked.forEach(function(k){var a=k.split(","),x=+a[0],y=+a[1],c=state.board[y][x];if(c&&c.kind==="mystery"&&!isNearBomb(x,y,bombs))return;state.board[y][x]=null});state.lines+=full.length;state.score+=marked.size*25+full.length*300;collapse();tone(660,.09,.024);setTimeout(function(){tone(880,.08,.018)},55)}
  }
  function findColorGroups(marked){
    var seen=new Set();for(var y=0;y<state.h;y++)for(var x=0;x<state.w;x++){var c=state.board[y][x],key=x+","+y;if(!c||seen.has(key)||(c.kind!=="blob"&&c.kind!=="capsule"))continue;var q=[[x,y]],group=[],kind=c.kind,color=c.color;seen.add(key);while(q.length){var a=q.shift();group.push(a);[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var nx=a[0]+d[0],ny=a[1]+d[1],nk=nx+","+ny;if(nx<0||nx>=state.w||ny<0||ny>=state.h||seen.has(nk))return;var n=state.board[ny][nx];if(n&&n.kind===kind&&n.color===color){seen.add(nk);q.push([nx,ny])}})}if(group.length>=4)group.forEach(function(a){marked.add(a[0]+","+a[1])})}}
  function isNearBomb(x,y,bombs){return bombs.some(function(b){return Math.abs(b[0]-x)<=1&&Math.abs(b[1]-y)<=1})}
  function collapse(){for(var x=0;x<state.w;x++){var stack=[];for(var y=state.h-1;y>=0;y--)if(state.board[y][x])stack.push(state.board[y][x]);for(var yy=state.h-1;yy>=0;yy--)state.board[yy][x]=stack[state.h-1-yy]||null}}

  function expandUp(fromTop){
    var add=6,newRows=emptyBoard(state.w,add);state.board=newRows.concat(state.board);state.h+=add;state.worldVersion++;if(state.piece)state.piece.y+=add;state.verticalExpanded=true;state.shake=18;flash();announce(fromTop?"GAME OVER CANCELLED / WORLD EXPANDED ↑":"WORLD EXPANDED ↑",2100);tone(92,.25,.03,"sawtooth")
  }
  function expandSide(){
    var add=2;state.board.forEach(function(row){for(var i=0;i<add;i++){row.unshift(null);row.push(null)}});state.w+=add*2;if(state.piece)state.piece.x+=add;state.horizontalExpanded=true;state.worldVersion++;state.shake=22;flash();announce("LINE INCOMPLETE / HIDDEN AREA REVEALED ↔",2400);tone(78,.3,.035,"sawtooth")
  }
  function flash(){var stage=$(".rb-stage"),f=document.createElement("div");f.className="rb-flash";stage.appendChild(f);stage.classList.add("rb-glitch");setTimeout(function(){f.remove();stage.classList.remove("rb-glitch")},320)}
  function announce(text,ms){var el=$(".rb-status");if(!el)return;el.textContent=text;el.classList.add("show");clearTimeout(state.messageTimer);state.messageTimer=setTimeout(function(){if(el)el.classList.remove("show")},ms||1500)}

  function loop(t){if(!root||!state||state.mode!=="play")return;var dt=Math.min(50,t-state.last);state.last=t;state.dropClock+=dt;var interval=keyState.down?55:state.dropMs;if(state.dropClock>=interval){state.dropClock=0;if(!collides(state.piece,0,1))state.piece.y++;else lockPiece()}draw();raf=requestAnimationFrame(loop)}

  function resizeCanvas(){var c=$(".rb-canvas"),r=c.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.floor(r.width*dpr));c.height=Math.max(1,Math.floor(r.height*dpr));c._dpr=dpr}
  function draw(){
    var c=$(".rb-canvas");if(!c)return;var r=c.getBoundingClientRect(),dpr=c._dpr||1;if(c.width!==Math.floor(r.width*dpr)||c.height!==Math.floor(r.height*dpr))resizeCanvas();var ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
    var pad=12,top=54,bottom=12,cellSize=Math.floor(Math.min((r.width-pad*2)/state.w,(r.height-top-bottom)/state.h));cellSize=clamp(cellSize,6,28);var bw=cellSize*state.w,bh=cellSize*state.h,ox=Math.floor((r.width-bw)/2),oy=Math.floor(top+(r.height-top-bottom-bh)/2);if(state.shake>0){ox+=(Math.random()-.5)*state.shake;oy+=(Math.random()-.5)*state.shake;state.shake*=.84;if(state.shake<.5)state.shake=0}
    ctx.fillStyle="#0d1122";ctx.fillRect(ox-3,oy-3,bw+6,bh+6);ctx.strokeStyle="#758cff";ctx.lineWidth=2;ctx.strokeRect(ox-2,oy-2,bw+4,bh+4);
    ctx.strokeStyle="rgba(180,195,255,.10)";ctx.lineWidth=1;for(var x=0;x<=state.w;x++){ctx.beginPath();ctx.moveTo(ox+x*cellSize,oy);ctx.lineTo(ox+x*cellSize,oy+bh);ctx.stroke()}for(var y=0;y<=state.h;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*cellSize);ctx.lineTo(ox+bw,oy+y*cellSize);ctx.stroke()}
    for(var yy=0;yy<state.h;yy++)for(var xx=0;xx<state.w;xx++)if(state.board[yy][xx])drawCell(ctx,ox+xx*cellSize,oy+yy*cellSize,cellSize,state.board[yy][xx]);
    if(state.piece)cellsOf(state.piece,0,0).forEach(function(q){if(q.y<0)return;var cc=state.piece.kind==="capsule"?cell("capsule",state.piece.colors[q.i]):cell(state.piece.kind,state.piece.color);drawCell(ctx,ox+q.x*cellSize,oy+q.y*cellSize,cellSize,cc,true)});
    var label=$(".rb-world-label");if(label)label.textContent="WORLD "+state.w+"×"+state.h+" / v"+state.worldVersion;
  }

  function drawCell(ctx,x,y,s,c,falling){
    var m=Math.max(1,Math.floor(s*.10));ctx.save();
    if(c.kind==="blob"){
      ctx.fillStyle=COLORS[c.color%COLORS.length];ctx.beginPath();ctx.ellipse(x+s/2,y+s/2,s*.40,s*.43,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#111";var eye=Math.max(1,s*.08);ctx.beginPath();ctx.arc(x+s*.38,y+s*.42,eye,0,Math.PI*2);ctx.arc(x+s*.62,y+s*.42,eye,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.55)";ctx.stroke();
    }else if(c.kind==="capsule"){
      ctx.fillStyle=COLORS[c.color%COLORS.length];roundRect(ctx,x+m,y+m,s-2*m,s-2*m,s*.35);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=Math.max(1,s*.08);ctx.beginPath();ctx.moveTo(x+s*.18,y+s*.5);ctx.lineTo(x+s*.82,y+s*.5);ctx.stroke();
    }else if(c.kind==="bomb"){
      ctx.fillStyle="#222736";roundRect(ctx,x+m,y+m,s-2*m,s-2*m,s*.16);ctx.fill();ctx.strokeStyle="#ff667e";ctx.lineWidth=Math.max(1,s*.08);ctx.stroke();ctx.fillStyle="#ffdc62";ctx.font="900 "+Math.max(7,Math.floor(s*.48))+"px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("✦",x+s/2,y+s/2);
    }else if(c.kind==="mystery"){
      ctx.fillStyle="#151728";ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.strokeStyle="#b88cff";ctx.lineWidth=Math.max(1,s*.08);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m);ctx.fillStyle="#d9c7ff";ctx.font="900 "+Math.max(7,Math.floor(s*.55))+"px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("?",x+s/2,y+s/2);
    }else{
      ctx.fillStyle=COLORS[c.color%COLORS.length];ctx.fillRect(x+m,y+m,s-2*m,s-2*m);ctx.fillStyle="rgba(255,255,255,.25)";ctx.fillRect(x+m*1.7,y+m*1.7,s-3.4*m,Math.max(1,s*.12));ctx.strokeStyle="rgba(5,8,18,.75)";ctx.lineWidth=Math.max(1,s*.08);ctx.strokeRect(x+m,y+m,s-2*m,s-2*m);
    }
    if(falling){ctx.strokeStyle="rgba(255,255,255,.82)";ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,s-2,s-2)}ctx.restore();
  }
  function roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function updateHud(){var a=$(".rb-score"),b=$(".rb-lines"),c=$(".rb-rule");if(a)a.textContent=String(state.score).padStart(6,"0");if(b)b.textContent=String(state.lines).padStart(3,"0");if(c)c.textContent=["BLOCK","ROUND","CAPSULE","BOMB","UNDEFINED"][state.chaosLevel]||"MIXED"}

  function close(){cancelAnimationFrame(raf);raf=0;clearInterval(repeatTimer);repeatTimer=0;window.removeEventListener("keydown",keyDown,true);window.removeEventListener("keyup",keyUp,true);if(root&&root.parentNode)root.remove();root=null;state=null;try{if(audio&&audio.state!=="closed")audio.close()}catch(e){}audio=null}
  window.addEventListener("resize",function(){if(root)resizeCanvas()});
  window.MEGANE_RECURSION_BUG={version:"v0.1-endless-stack",open:open,close:close};
})();
