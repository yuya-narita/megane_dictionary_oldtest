/* 138_loop_bug_v01.js
   LOOKING BEAR No.010 — LOOP BUG
   DELIVERY BEAR v0.1 / PLAYABLE FOUNDATION

   - Image-free pixel-art town rendered on Canvas
   - Top-down scooter delivery
   - Fixed ring-road course, river, bridge, traffic, roadwork, puddles
   - 90-second delivery, reward and hearts
   - v0.1 intentionally behaves as a straightforward delivery game
*/
(function(){
  "use strict";

  var API_KEY="MEGANE_LOOP_BUG";
  if(window[API_KEY] && window[API_KEY].version==="v0.1-delivery-foundation") return;

  var root=null,canvas=null,ctx=null,mapCanvas=null,mapCtx=null,raf=0;
  var state=null,keys={left:false,right:false,up:false,down:false};
  var stick={active:false,id:null,dir:"none",repeat:0};
  var audio=null;
  var oldViewport=null;
  var WORLD={w:2048,h:1152,tile:32};
  var ROAD={left:128,right:1920,top:152,bottom:1000,width:126};
  var SHOP={x:1770,y:850,w:118,h:116};
  var GOAL={x:1615,y:850,w:122,h:116};
  var START={x:1815,y:820};
  var routePoints=[
    {x:1815,y:820},{x:1815,y:215},{x:1500,y:215},{x:1125,y:215},
    {x:900,y:215},{x:535,y:215},{x:205,y:215},{x:205,y:520},
    {x:205,y:910},{x:560,y:910},{x:900,y:910},{x:1190,y:910},
    {x:1510,y:910},{x:1615,y:885}
  ];

  function $(q){return root&&root.querySelector(q)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function block(e){if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}}
  function now(){return performance.now()}
  function rectsHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function dist(ax,ay,bx,by){var dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy)}

  function ensureStyle(){
    if(document.getElementById("loopBugStyleV01"))return;
    var s=document.createElement("style");
    s.id="loopBugStyleV01";
    s.textContent=`
      #loopBugRoot,#loopBugRoot *{box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
      #loopBugRoot{
        position:fixed;inset:0;z-index:2147483500;background:#05080d;color:#fff;
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Courier New",monospace;
        overflow:hidden;touch-action:none;
      }
      #loopBugRoot .lb-shell{position:absolute;inset:0;display:flex;flex-direction:column;background:linear-gradient(#07101a,#030507)}
      #loopBugRoot .lb-head{
        flex:0 0 auto;min-height:70px;padding:max(12px,env(safe-area-inset-top)) 14px 10px;
        display:flex;align-items:flex-end;justify-content:space-between;gap:10px;
        border-bottom:1px solid rgba(255,255,255,.14);letter-spacing:.13em;color:rgba(240,246,255,.72);
        font-size:11px;font-weight:900;
      }
      #loopBugRoot .lb-head-actions{display:flex;gap:8px}
      #loopBugRoot .lb-icon{
        width:48px;height:48px;border:1px solid rgba(255,255,255,.28);border-radius:9px;
        background:rgba(255,255,255,.055);color:#fff;font:900 23px/1 system-ui;
      }
      #loopBugRoot .lb-stage{position:relative;flex:1 1 auto;min-height:0;margin:8px 12px 0;border:4px solid #d8b54e;background:#101614;overflow:hidden}
      #loopBugRoot canvas{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;background:#142319}
      #loopBugRoot .lb-hud{
        position:absolute;left:8px;right:8px;top:7px;z-index:8;display:flex;justify-content:space-between;gap:8px;
        font-size:11px;font-weight:1000;letter-spacing:.08em;text-shadow:2px 2px 0 #000;
      }
      #loopBugRoot .lb-hud span{padding:5px 7px;border:1px solid rgba(255,255,255,.26);background:rgba(0,0,0,.57)}
      #loopBugRoot .lb-route{
        position:absolute;right:9px;top:48px;z-index:8;max-width:178px;padding:8px 9px;border:2px solid #eee;
        border-radius:5px;background:rgba(0,0,0,.77);font-size:9px;line-height:1.5;letter-spacing:.04em;
      }
      #loopBugRoot .lb-route b{display:block;color:#ffe070;font-size:10px;margin-bottom:4px}
      #loopBugRoot .lb-message{
        position:absolute;left:50%;bottom:12px;z-index:12;transform:translateX(-50%);
        width:min(92%,480px);padding:11px 13px;border:3px solid #fff;border-radius:5px;
        background:#050505;color:#fff;font-size:12px;line-height:1.55;font-weight:900;
        opacity:0;pointer-events:none;
      }
      #loopBugRoot .lb-message.show{opacity:1}
      #loopBugRoot .lb-title,#loopBugRoot .lb-brief,#loopBugRoot .lb-result,#loopBugRoot .lb-pause{
        position:absolute;inset:0;z-index:30;display:none;place-items:center;padding:24px;text-align:center;
        background:rgba(3,6,8,.94);
      }
      #loopBugRoot .lb-title.show,#loopBugRoot .lb-brief.show,#loopBugRoot .lb-result.show,#loopBugRoot .lb-pause.show{display:grid}
      #loopBugRoot .lb-logo{font-size:clamp(35px,10vw,70px);line-height:.92;font-weight:1000;letter-spacing:.04em;text-shadow:5px 5px 0 #6b4117}
      #loopBugRoot .lb-sub{margin-top:16px;color:#ffe070;font-size:11px;letter-spacing:.15em}
      #loopBugRoot .lb-copy{margin:24px auto;max-width:330px;font-size:12px;line-height:1.8;color:rgba(255,255,255,.76)}
      #loopBugRoot .lb-card{width:min(94%,390px);padding:18px;border:3px solid #fff;background:#050505;text-align:left}
      #loopBugRoot .lb-card h2{margin:0 0 15px;font-size:19px;letter-spacing:.08em}
      #loopBugRoot .lb-card .row{display:flex;justify-content:space-between;gap:15px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.18);font-size:12px}
      #loopBugRoot .lb-card .row strong{color:#ffe070}
      #loopBugRoot .lb-btn{
        min-width:180px;padding:13px 22px;border:3px solid #fff;border-radius:999px;background:#080808;color:#fff;
        font:1000 12px/1 ui-monospace,monospace;letter-spacing:.15em;
      }
      #loopBugRoot .lb-btn:active{transform:translateY(2px)}
      #loopBugRoot .lb-controls{
        flex:0 0 auto;min-height:190px;padding:12px 18px max(15px,env(safe-area-inset-bottom));
        display:flex;align-items:center;justify-content:space-between;gap:18px;background:#04070b;
      }
      #loopBugRoot .lb-pad{
        position:relative;width:162px;height:162px;border:2px solid #52617a;border-radius:42%;
        background:radial-gradient(circle at 50% 48%,#24314a 0 22%,#101827 23% 100%);
        box-shadow:inset 0 0 25px rgba(150,175,255,.16);
      }
      #loopBugRoot .lb-pad button{
        position:absolute;width:55px;height:55px;border:1px solid #60708e;border-radius:10px;background:#151e30;color:#eaf0ff;
        font-size:24px;font-weight:1000;touch-action:none;
      }
      #loopBugRoot .lb-up{left:53px;top:5px}#loopBugRoot .lb-down{left:53px;bottom:5px}
      #loopBugRoot .lb-left{left:5px;top:53px}#loopBugRoot .lb-right{right:5px;top:53px}
      #loopBugRoot .lb-actions{display:flex;gap:15px;transform:rotate(-7deg)}
      #loopBugRoot .lb-action{
        width:92px;height:92px;border-radius:50%;border:3px solid #ddbd5d;background:radial-gradient(circle at 38% 32%,#88702d,#1d190d 72%);
        color:#fff3b0;font:1000 27px/1 system-ui;box-shadow:inset 0 0 18px rgba(255,229,117,.25);
      }
      #loopBugRoot .lb-action small{display:block;margin-top:8px;font:900 9px/1 ui-monospace,monospace;letter-spacing:.08em}
      #loopBugRoot .lb-b{border-color:#6d7ca7;background:radial-gradient(circle at 38% 32%,#35466d,#101626 72%);color:#e8edff}
      @media(max-width:430px){
        #loopBugRoot .lb-controls{min-height:178px;padding-left:14px;padding-right:14px}
        #loopBugRoot .lb-pad{width:148px;height:148px}
        #loopBugRoot .lb-pad button{width:50px;height:50px}
        #loopBugRoot .lb-up{left:49px}.lb-down{left:49px!important}.lb-left{top:49px!important}.lb-right{top:49px!important}
        #loopBugRoot .lb-action{width:82px;height:82px}
        #loopBugRoot .lb-actions{gap:10px}
      }
    `;
    document.head.appendChild(s);
  }

  function setViewport(lock){
    var vp=document.querySelector('meta[name="viewport"]');
    if(!vp)return;
    if(lock){
      oldViewport=vp.getAttribute("content");
      vp.setAttribute("content","width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");
    }else if(oldViewport!=null){
      vp.setAttribute("content",oldViewport);
      oldViewport=null;
    }
  }

  function tone(freq,dur,vol,type){
    try{
      if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==="suspended")audio.resume();
      var o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
      o.type=type||"square";o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(vol||.025,t);g.gain.exponentialRampToValueAtTime(.0001,t+(dur||.08));
      o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+(dur||.08));
    }catch(e){}
  }

  function build(){
    ensureStyle();setViewport(true);
    root=document.createElement("div");root.id="loopBugRoot";
    root.innerHTML=`
      <div class="lb-shell">
        <header class="lb-head">
          <span>SYNTAX FRONTIER INC. / BUG No.010</span>
          <div class="lb-head-actions">
            <button class="lb-icon lb-pause-btn" type="button">Ⅱ</button>
            <button class="lb-icon lb-close" type="button">×</button>
          </div>
        </header>
        <main class="lb-stage">
          <canvas class="lb-canvas"></canvas>
          <div class="lb-hud"><span class="lb-time">TIME 90</span><span class="lb-money">¥000000</span><span class="lb-hearts">♥♥♥</span></div>
          <div class="lb-route"><b>配達ルート</b>左折 → 右折 → 右折 → 橋を渡る → さらに右折</div>
          <div class="lb-message"></div>
          <div class="lb-title show"><div>
            <div class="lb-logo">DELIVERY<br>BEAR</div>
            <div class="lb-sub">LOOP BUG / 199X</div>
            <div class="lb-copy">The noodles are getting cold.<br>The city is larger than it looks.</div>
            <button class="lb-btn lb-start">PRESS START</button>
          </div></div>
          <div class="lb-brief"><div class="lb-card">
            <h2>配達　1件目</h2>
            <div class="row"><span>お届け先</span><strong>山田さん宅</strong></div>
            <div class="row"><span>報酬</span><strong>300円</strong></div>
            <div class="row"><span>制限時間</span><strong>90秒</strong></div>
            <p style="line-height:1.75;margin:16px 0;color:#ddd">そば一丁！<br>冷める前に届けてクマー！</p>
            <button class="lb-btn lb-go">START DELIVERY</button>
          </div></div>
          <div class="lb-result"><div>
            <div class="lb-logo lb-result-title" style="font-size:44px">DELIVERED</div>
            <div class="lb-copy lb-result-copy"></div>
            <button class="lb-btn lb-again">DELIVER AGAIN</button>
          </div></div>
          <div class="lb-pause"><div>
            <div class="lb-logo" style="font-size:46px">PAUSED</div>
            <div style="height:24px"></div>
            <button class="lb-btn lb-resume">RESUME</button><br><br>
            <button class="lb-btn lb-restart">RESTART</button>
          </div></div>
        </main>
        <footer class="lb-controls">
          <div class="lb-pad">
            <button class="lb-up" data-dir="up">▲</button>
            <button class="lb-left" data-dir="left">◀</button>
            <button class="lb-right" data-dir="right">▶</button>
            <button class="lb-down" data-dir="down">▼</button>
          </div>
          <div class="lb-actions">
            <button class="lb-action lb-b">B<small>BRAKE</small></button>
            <button class="lb-action lb-a">A<small>BOOST</small></button>
          </div>
        </footer>
      </div>`;
    document.body.appendChild(root);
    canvas=$(".lb-canvas");ctx=canvas.getContext("2d");
    buildMap();
    bind();
    resize();
    state=newState();
    draw();
  }

  function newState(){
    return{
      mode:"title",x:START.x,y:START.y,vx:0,vy:0,angle:-Math.PI/2,
      speed:0,maxSpeed:245,boost:false,brake:false,time:90,money:0,hearts:3,
      last:0,hitCooldown:0,cameraX:START.x,cameraY:START.y,messageTimer:0,
      obstacles:createObstacles(),cars:createCars(),routeIndex:0,delivered:false
    };
  }

  function createObstacles(){
    return[
      {type:"cone",x:1490,y:870,w:30,h:30},{type:"cone",x:1532,y:870,w:30,h:30},
      {type:"cone",x:1574,y:870,w:30,h:30},{type:"barrier",x:1510,y:900,w:120,h:28},
      {type:"puddle",x:545,y:192,w:76,h:46},{type:"puddle",x:830,y:890,w:88,h:42},
      {type:"dog",x:340,y:860,w:37,h:32,phase:0},{type:"dog",x:1360,y:195,w:37,h:32,phase:2.1}
    ];
  }
  function createCars(){
    return[
      {x:680,y:195,w:66,h:34,axis:"x",speed:75,min:310,max:1650,dir:1,color:"#5574a7"},
      {x:1230,y:890,w:66,h:34,axis:"x",speed:92,min:310,max:1670,dir:-1,color:"#b55345"},
      {x:1840,y:460,w:34,h:66,axis:"y",speed:70,min:260,max:830,dir:1,color:"#d0a63e"},
      {x:180,y:620,w:34,h:66,axis:"y",speed:85,min:280,max:820,dir:-1,color:"#5b8d6a"}
    ];
  }

  function resize(){
    if(!root||!canvas)return;
    var r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));
    ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false;
    draw();
  }

  function buildMap(){
    mapCanvas=document.createElement("canvas");mapCanvas.width=WORLD.w;mapCanvas.height=WORLD.h;
    mapCtx=mapCanvas.getContext("2d");mapCtx.imageSmoothingEnabled=false;
    drawWorld(mapCtx);
  }

  function drawWorld(g){
    g.fillStyle="#294827";g.fillRect(0,0,WORLD.w,WORLD.h);
    // grass dithering
    g.fillStyle="rgba(104,145,74,.18)";
    for(var y=8;y<WORLD.h;y+=23)for(var x=(y%46);x<WORLD.w;x+=31)g.fillRect(x,y,3,3);

    // river
    g.fillStyle="#215c7a";g.fillRect(960,0,170,WORLD.h);
    g.fillStyle="#327b9c";
    for(y=8;y<WORLD.h;y+=18){g.fillRect(973,y,65,3);g.fillRect(1050,y+7,55,3)}
    // roads ring
    g.fillStyle="#57595b";
    g.fillRect(ROAD.left,ROAD.top,ROAD.right-ROAD.left,ROAD.width);
    g.fillRect(ROAD.left,ROAD.bottom-ROAD.width,ROAD.right-ROAD.left,ROAD.width);
    g.fillRect(ROAD.left,ROAD.top,ROAD.width,ROAD.bottom-ROAD.top);
    g.fillRect(ROAD.right-ROAD.width,ROAD.top,ROAD.width,ROAD.bottom-ROAD.top);
    // bridge sections
    g.fillStyle="#7a6a51";g.fillRect(930,ROAD.top,230,ROAD.width);g.fillRect(930,ROAD.bottom-ROAD.width,230,ROAD.width);
    g.strokeStyle="#c6a773";g.lineWidth=4;
    for(x=942;x<1150;x+=18){g.beginPath();g.moveTo(x,ROAD.top);g.lineTo(x,ROAD.top+ROAD.width);g.stroke();
      g.beginPath();g.moveTo(x,ROAD.bottom-ROAD.width);g.lineTo(x,ROAD.bottom);g.stroke()}
    // lane markings
    g.strokeStyle="#ded6b0";g.lineWidth=4;g.setLineDash([26,22]);
    g.beginPath();g.moveTo(ROAD.left+10,ROAD.top+ROAD.width/2);g.lineTo(ROAD.right-10,ROAD.top+ROAD.width/2);g.stroke();
    g.beginPath();g.moveTo(ROAD.left+10,ROAD.bottom-ROAD.width/2);g.lineTo(ROAD.right-10,ROAD.bottom-ROAD.width/2);g.stroke();
    g.beginPath();g.moveTo(ROAD.left+ROAD.width/2,ROAD.top+10);g.lineTo(ROAD.left+ROAD.width/2,ROAD.bottom-10);g.stroke();
    g.beginPath();g.moveTo(ROAD.right-ROAD.width/2,ROAD.top+10);g.lineTo(ROAD.right-ROAD.width/2,ROAD.bottom-10);g.stroke();
    g.setLineDash([]);

    // neighborhood blocks and trees
    var houses=[
      [300,330,"#795035"],[520,350,"#8c6345"],[760,330,"#6f5261"],[1210,335,"#6e5642"],[1460,325,"#7b4e3f"],
      [350,610,"#6b5b43"],[620,590,"#87624a"],[1240,590,"#77543d"],[1450,620,"#5f6752"]
    ];
    houses.forEach(function(h){drawHouse(g,h[0],h[1],126,102,h[2],false)});
    for(var tx=280;tx<1760;tx+=175){drawTree(g,tx,505+(tx%3)*22);drawTree(g,tx+58,510+((tx+1)%4)*18)}
    drawShop(g,SHOP.x,SHOP.y);
    drawHouse(g,GOAL.x,GOAL.y,122,116,"#6e5238",true);
    // labels
    g.fillStyle="#15100a";g.fillRect(SHOP.x-2,SHOP.y-28,SHOP.w+4,24);
    g.fillStyle="#ffe270";g.font="bold 14px monospace";g.fillText("そば屋 いちまん",SHOP.x+4,SHOP.y-11);
  }

  function drawHouse(g,x,y,w,h,color,goal){
    g.fillStyle="#3c3027";g.fillRect(x+7,y+20,w-14,h-20);
    g.fillStyle=color;g.fillRect(x+14,y+33,w-28,h-35);
    g.fillStyle="#292321";g.beginPath();g.moveTo(x,y+28);g.lineTo(x+w/2,y);g.lineTo(x+w,y+28);g.closePath();g.fill();
    g.fillStyle="#a18d68";g.fillRect(x+21,y+48,27,24);g.fillRect(x+w-48,y+48,27,24);
    g.fillStyle="#211915";g.fillRect(x+w/2-13,y+h-38,26,38);
    if(goal){g.strokeStyle="#ffe16d";g.lineWidth=5;g.strokeRect(x-4,y-4,w+8,h+8)}
  }
  function drawShop(g,x,y){
    drawHouse(g,x,y,SHOP.w,SHOP.h,"#684128",false);
    g.fillStyle="#16375b";g.fillRect(x+3,y+36,SHOP.w-6,20);
    g.fillStyle="#fff";g.font="bold 12px monospace";g.fillText("そ ば",x+34,y+50);
    g.fillStyle="#d8a037";g.fillRect(x+70,y+60,31,42);
  }
  function drawTree(g,x,y){
    g.fillStyle="#3f2a1d";g.fillRect(x+13,y+22,10,22);
    g.fillStyle="#173c23";g.fillRect(x+2,y+7,34,28);g.fillStyle="#275d2c";g.fillRect(x+8,y,25,24);g.fillStyle="#3d7b39";g.fillRect(x+14,y+4,12,12);
  }

  function draw(){
    if(!root||!ctx||!state)return;
    var r=canvas.getBoundingClientRect(),w=r.width,h=r.height;
    ctx.clearRect(0,0,w,h);
    var viewW=Math.min(820,w*1.8),viewH=Math.min(620,h*1.55);
    var scale=Math.max(w/viewW,h/viewH);
    var camX=clamp(state.cameraX,viewW/2,WORLD.w-viewW/2);
    var camY=clamp(state.cameraY,viewH/2,WORLD.h-viewH/2);
    ctx.save();ctx.scale(scale,scale);
    var dw=w/scale,dh=h/scale;
    ctx.drawImage(mapCanvas,camX-dw/2,camY-dh/2,dw,dh,0,0,dw,dh);
    ctx.translate(-(camX-dw/2),-(camY-dh/2));

    state.obstacles.forEach(function(o){drawObstacle(ctx,o)});
    state.cars.forEach(function(c){drawCar(ctx,c)});
    drawRouteArrow(ctx);
    drawBearScooter(ctx,state.x,state.y,state.angle);
    ctx.restore();

    $(".lb-time").textContent="TIME "+String(Math.max(0,Math.ceil(state.time))).padStart(2,"0");
    $(".lb-money").textContent="¥"+String(state.money).padStart(6,"0");
    $(".lb-hearts").textContent="♥".repeat(state.hearts)+"♡".repeat(3-state.hearts);
  }

  function drawRouteArrow(g){
    if(state.mode!=="play"||state.delivered)return;
    var p=routePoints[Math.min(routePoints.length-1,state.routeIndex+1)];
    if(!p)return;
    g.save();g.translate(p.x,p.y);g.fillStyle="#ffe15a";g.strokeStyle="#15100a";g.lineWidth=3;
    g.beginPath();g.moveTo(0,-23);g.lineTo(15,3);g.lineTo(6,3);g.lineTo(6,20);g.lineTo(-6,20);g.lineTo(-6,3);g.lineTo(-15,3);g.closePath();g.fill();g.stroke();g.restore();
  }
  function drawObstacle(g,o){
    if(o.type==="cone"){
      g.fillStyle="#e86a1c";g.beginPath();g.moveTo(o.x+o.w/2,o.y);g.lineTo(o.x+o.w,o.y+o.h);g.lineTo(o.x,o.y+o.h);g.closePath();g.fill();
      g.fillStyle="#fff";g.fillRect(o.x+7,o.y+15,o.w-14,5);
    }else if(o.type==="barrier"){
      g.fillStyle="#d8482f";g.fillRect(o.x,o.y+6,o.w,o.h-12);g.fillStyle="#fff";
      for(var x=o.x+8;x<o.x+o.w;x+=26)g.fillRect(x,o.y+6,13,o.h-12);
    }else if(o.type==="puddle"){
      g.fillStyle="rgba(61,145,190,.68)";g.beginPath();g.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);g.fill();
    }else if(o.type==="dog"){
      var bob=Math.sin((now()/250)+o.phase)*3;
      g.fillStyle="#9c6d3f";g.fillRect(o.x,o.y+bob+8,31,20);g.fillRect(o.x+24,o.y+bob,13,15);
      g.fillStyle="#16120f";g.fillRect(o.x+31,o.y+bob+4,3,3);
    }
  }
  function drawCar(g,c){
    g.fillStyle="#161616";g.fillRect(c.x-3,c.y+4,c.w+6,c.h-8);
    g.fillStyle=c.color;g.fillRect(c.x,c.y,c.w,c.h);
    g.fillStyle="#a7d8e8";
    if(c.axis==="x"){g.fillRect(c.x+15,c.y+5,c.w-30,c.h-10)}
    else{g.fillRect(c.x+5,c.y+15,c.w-10,c.h-30)}
  }
  function drawBearScooter(g,x,y,a){
    g.save();g.translate(x,y);g.rotate(a+Math.PI/2);
    // shadow
    g.fillStyle="rgba(0,0,0,.28)";g.beginPath();g.ellipse(0,13,20,10,0,0,Math.PI*2);g.fill();
    // scooter
    g.fillStyle="#d93b23";g.fillRect(-12,1,24,20);g.fillRect(-7,-10,14,22);
    g.fillStyle="#151515";g.fillRect(-16,9,6,13);g.fillRect(10,9,6,13);
    // bear body/head
    g.fillStyle="#f3f3ed";g.fillRect(-10,-22,20,22);g.fillRect(-13,-39,26,22);
    g.fillRect(-15,-41,8,8);g.fillRect(7,-41,8,8);
    g.fillStyle="#202020";g.fillRect(-7,-31,3,3);g.fillRect(4,-31,3,3);g.fillRect(-2,-26,4,3);
    g.restore();
  }

  function bind(){
    $(".lb-close").addEventListener("pointerdown",function(e){block(e);close()},true);
    $(".lb-pause-btn").addEventListener("pointerdown",function(e){block(e);togglePause()},true);
    $(".lb-start").addEventListener("pointerdown",function(e){block(e);showBrief()},true);
    $(".lb-go").addEventListener("pointerdown",function(e){block(e);startGame()},true);
    $(".lb-again").addEventListener("pointerdown",function(e){block(e);showBrief()},true);
    $(".lb-resume").addEventListener("pointerdown",function(e){block(e);resume()},true);
    $(".lb-restart").addEventListener("pointerdown",function(e){block(e);startGame()},true);

    root.querySelectorAll("[data-dir]").forEach(function(b){
      b.addEventListener("pointerdown",function(e){block(e);b.setPointerCapture&&b.setPointerCapture(e.pointerId);setDir(b.dataset.dir,true)},true);
      b.addEventListener("pointerup",function(e){block(e);setDir(b.dataset.dir,false)},true);
      b.addEventListener("pointercancel",function(){setDir(b.dataset.dir,false)},true);
    });
    $(".lb-a").addEventListener("pointerdown",function(e){block(e);state.boost=true;tone(520,.05,.02)},true);
    $(".lb-a").addEventListener("pointerup",function(e){block(e);state.boost=false},true);
    $(".lb-a").addEventListener("pointercancel",function(){state.boost=false},true);
    $(".lb-b").addEventListener("pointerdown",function(e){block(e);state.brake=true},true);
    $(".lb-b").addEventListener("pointerup",function(e){block(e);state.brake=false},true);
    $(".lb-b").addEventListener("pointercancel",function(){state.brake=false},true);

    window.addEventListener("resize",resize);
    window.addEventListener("keydown",keydown,true);
    window.addEventListener("keyup",keyup,true);
    root.addEventListener("touchmove",function(e){e.preventDefault()},{passive:false});
  }
  function setDir(d,on){keys[d]=on}
  function keydown(e){
    if(!root)return;
    if(e.key==="Escape"){block(e);close();return}
    if(e.key==="ArrowLeft"||e.key==="a")keys.left=true;
    if(e.key==="ArrowRight"||e.key==="d")keys.right=true;
    if(e.key==="ArrowUp"||e.key==="w")keys.up=true;
    if(e.key==="ArrowDown"||e.key==="s")keys.down=true;
    if(e.key===" ")state.boost=true;
  }
  function keyup(e){
    if(e.key==="ArrowLeft"||e.key==="a")keys.left=false;
    if(e.key==="ArrowRight"||e.key==="d")keys.right=false;
    if(e.key==="ArrowUp"||e.key==="w")keys.up=false;
    if(e.key==="ArrowDown"||e.key==="s")keys.down=false;
    if(e.key===" ")state.boost=false;
  }

  function showBrief(){
    state=newState();state.mode="brief";
    $(".lb-title").classList.remove("show");$(".lb-result").classList.remove("show");$(".lb-brief").classList.add("show");draw();
  }
  function startGame(){
    cancelAnimationFrame(raf);state=newState();state.mode="play";
    $(".lb-title").classList.remove("show");$(".lb-brief").classList.remove("show");$(".lb-result").classList.remove("show");$(".lb-pause").classList.remove("show");
    showMessage("そば一丁！　いってくるクマー！",1450);
    state.last=now();raf=requestAnimationFrame(loop);tone(330,.08,.025);
  }
  function togglePause(){
    if(!state)return;
    if(state.mode==="play"){state.mode="pause";cancelAnimationFrame(raf);$(".lb-pause").classList.add("show")}
    else if(state.mode==="pause")resume();
  }
  function resume(){
    if(!state||state.mode!=="pause")return;
    $(".lb-pause").classList.remove("show");state.mode="play";state.last=now();raf=requestAnimationFrame(loop);
  }
  function showMessage(t,ms){
    var m=$(".lb-message");m.textContent=t;m.classList.add("show");
    clearTimeout(state.messageTimer);state.messageTimer=setTimeout(function(){if(m)m.classList.remove("show")},ms||1200);
  }

  function loop(t){
    if(!root||!state||state.mode!=="play")return;
    var dt=Math.min(.04,(t-state.last)/1000);state.last=t;
    update(dt);draw();raf=requestAnimationFrame(loop);
  }

  function update(dt){
    state.time-=dt;if(state.time<=0){state.time=0;finish(false);return}
    if(state.hitCooldown>0)state.hitCooldown-=dt;

    var ax=(keys.right?1:0)-(keys.left?1:0);
    var ay=(keys.down?1:0)-(keys.up?1:0);
    var len=Math.sqrt(ax*ax+ay*ay);if(len>0){ax/=len;ay/=len}
    var target=state.maxSpeed*(state.boost?1.36:1)*(state.brake?.35:1);
    if(len>0){
      state.vx+=(ax*target-state.vx)*Math.min(1,dt*8);
      state.vy+=(ay*target-state.vy)*Math.min(1,dt*8);
      state.angle=Math.atan2(state.vy,state.vx);
    }else{
      state.vx*=Math.pow(.002,dt);state.vy*=Math.pow(.002,dt);
    }
    var ox=state.x,oy=state.y;
    state.x+=state.vx*dt;state.y+=state.vy*dt;
    state.x=clamp(state.x,25,WORLD.w-25);state.y=clamp(state.y,25,WORLD.h-25);

    if(!onRoad(state.x,state.y)){state.x=ox;state.y=oy;state.vx*=-.25;state.vy*=-.25;hit("道を外れた！",false)}
    updateCars(dt);updateDogs(dt);checkHits();
    updateRoute();
    if(dist(state.x,state.y,GOAL.x+GOAL.w/2,GOAL.y+GOAL.h/2)<70){finish(true);return}

    state.cameraX+=(state.x-state.cameraX)*Math.min(1,dt*5.5);
    state.cameraY+=(state.y-state.cameraY)*Math.min(1,dt*5.5);
  }

  function onRoad(x,y){
    var top=x>=ROAD.left&&x<=ROAD.right&&y>=ROAD.top&&y<=ROAD.top+ROAD.width;
    var bottom=x>=ROAD.left&&x<=ROAD.right&&y>=ROAD.bottom-ROAD.width&&y<=ROAD.bottom;
    var left=x>=ROAD.left&&x<=ROAD.left+ROAD.width&&y>=ROAD.top&&y<=ROAD.bottom;
    var right=x>=ROAD.right-ROAD.width&&x<=ROAD.right&&y>=ROAD.top&&y<=ROAD.bottom;
    return top||bottom||left||right||rectsHit({x:x-15,y:y-15,w:30,h:30},{x:930,y:ROAD.top,w:230,h:ROAD.width})||rectsHit({x:x-15,y:y-15,w:30,h:30},{x:930,y:ROAD.bottom-ROAD.width,w:230,h:ROAD.width});
  }

  function updateCars(dt){
    state.cars.forEach(function(c){
      if(c.axis==="x"){c.x+=c.speed*c.dir*dt;if(c.x<c.min||c.x>c.max)c.dir*=-1}
      else{c.y+=c.speed*c.dir*dt;if(c.y<c.min||c.y>c.max)c.dir*=-1}
    })
  }
  function updateDogs(dt){
    state.obstacles.forEach(function(o){
      if(o.type!=="dog")return;
      o.x+=Math.sin(now()/650+o.phase)*10*dt;
    })
  }
  function checkHits(){
    var p={x:state.x-14,y:state.y-17,w:28,h:34};
    state.cars.forEach(function(c){if(rectsHit(p,c))hit("車にぶつかった！",true)});
    state.obstacles.forEach(function(o){
      if(rectsHit(p,o)){
        if(o.type==="puddle"){state.vx*=.75;state.vy*=.75}
        else hit(o.type==="dog"?"犬だ！":"工事中！",true);
      }
    })
  }
  function hit(msg,damage){
    if(state.hitCooldown>0)return;
    state.hitCooldown=1.05;state.vx*=-.45;state.vy*=-.45;
    if(damage){state.hearts--;tone(92,.18,.035,"sawtooth");showMessage(msg,900);if(state.hearts<=0){finish(false)}}
  }
  function updateRoute(){
    var next=routePoints[Math.min(routePoints.length-1,state.routeIndex+1)];
    if(next&&dist(state.x,state.y,next.x,next.y)<95){state.routeIndex=Math.min(routePoints.length-1,state.routeIndex+1);tone(660,.04,.012)}
  }

  function finish(ok){
    if(state.mode!=="play")return;
    state.mode="result";cancelAnimationFrame(raf);
    state.delivered=ok;
    if(ok){state.money=300;$(".lb-result-title").textContent="DELIVERED";$(".lb-result-copy").innerHTML="山田さん宅へ配達完了。<br>報酬 300円<br><br>どうも！";tone(660,.12,.03);setTimeout(function(){tone(880,.18,.025)},140)}
    else{$(".lb-result-title").textContent="DELIVERY FAILED";$(".lb-result-copy").innerHTML="そばが冷めてしまった。<br><br>もう一度、配達します。";tone(110,.32,.035,"sawtooth")}
    draw();$(".lb-result").classList.add("show");
  }

  function close(){
    cancelAnimationFrame(raf);raf=0;setViewport(false);
    window.removeEventListener("resize",resize);window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);
    if(root)root.remove();root=null;canvas=null;ctx=null;state=null;
  }

  function open(){if(root)return;build()}
  window[API_KEY]={version:"v0.1-delivery-foundation",open:open,close:close};
})();