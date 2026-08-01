(()=>{
"use strict";

const S=window.SHINO_STORY||[];
const g=id=>document.getElementById(id);

const cover=g("cover");
const player=g("player");
const ending=g("ending");
const lines=g("lines");
const count=g("count");
const bar=g("bar");
const theme=g("theme");
const modeBtn=g("mode");
const modeLabel=g("modeLabel");
const stage=g("stage");
const gestureHint=g("gestureHint");

let i=0;
let auto=false;
let timer=null;
let busy=false;
let queuedNext=false;
let down=null;
let scrollHintShown=false;
let visibleItems=[];

const MAX_VISIBLE=4;
const AUTO_SLOW_FACTOR=1.65;
const BASE_GAP=34;
const LARGE_GAP=62;
const SOUND_GAP=72;

function show(x){
  [cover,player,ending].forEach(n=>n.hidden=n!==x);
}

function prog(){
  count.textContent=`${Math.min(i,S.length)} / ${S.length}`;
  bar.style.width=`${S.length?i/S.length*100:0}%`;
}

function reset(){
  clearTimeout(timer);
  timer=null;
  i=0;
  busy=false;
  queuedNext=false;
  lines.innerHTML="";
  visibleItems=[];
  prog();
}

function getGap(prevType,nextType){
  if(prevType==="sound"||nextType==="sound") return SOUND_GAP;
  if(prevType!==nextType) return LARGE_GAP;
  if(prevType==="dialogue") return 52;
  return BASE_GAP;
}

function createLine(cut){
  const node=document.createElement("div");
  const typeClass=cut.type==="ending"?"endingtype":cut.type;
  node.className=`line ${typeClass}${cut.effect?" "+cut.effect:""} entering`;
  node.textContent=cut.text;
  node.dataset.type=cut.type||"narration";
  lines.appendChild(node);

  // Force layout so the entering state is committed before movement.
  node.getBoundingClientRect();
  return node;
}

function updateLineAges(){
  visibleItems.forEach((item,index)=>{
    item.node.classList.remove("age-1","age-2","age-3","newest");
    const distance=(visibleItems.length-1)-index;
    if(distance===0)item.node.classList.add("newest");
    else if(distance===1)item.node.classList.add("age-1");
    else if(distance===2)item.node.classList.add("age-2");
    else item.node.classList.add("age-3");
  });
}

function tactilePulse(){
  stage.classList.remove("scene-breathe");
  void stage.offsetWidth;
  stage.classList.add("scene-breathe");
  setTimeout(()=>stage.classList.remove("scene-breathe"),450);
  try{if(navigator.vibrate)navigator.vibrate(6)}catch{}
}

function measureLayout(){
  const stageHeight=stage.clientHeight;
  const focusY=stageHeight*(window.innerWidth<=600?0.46:0.48);
  const items=visibleItems.map(item=>({
    ...item,
    height:item.node.getBoundingClientRect().height
  }));

  if(!items.length) return [];

  // Newest text sits at the visual focus, slightly above center.
  const newest=items[items.length-1];
  let newestTop=focusY-(newest.height/2);

  // Long dialogue is placed a little higher so the thumb never covers it.
  if(newest.type==="dialogue"||newest.type==="ending"){
    newestTop-=12;
  }

  const positions=new Array(items.length);
  positions[items.length-1]=newestTop;

  for(let idx=items.length-2;idx>=0;idx--){
    const current=items[idx];
    const next=items[idx+1];
    const gap=getGap(current.type,next.type);
    positions[idx]=positions[idx+1]-gap-current.height;
  }

  return items.map((item,idx)=>({...item,y:positions[idx]}));
}

function applyLayout(newNode){
  updateLineAges();
  const layout=measureLayout();

  layout.forEach(item=>{
    item.node.style.transform=`translate3d(0,${Math.round(item.y)}px,0)`;
    item.node.classList.remove("entering");
    item.node.classList.add("visible");
  });

  if(newNode){
    // A tiny delayed reveal prevents the perceived "snap".
    requestAnimationFrame(()=>{
      newNode.classList.remove("entering");
      newNode.classList.add("visible");
    });
  }
}

function removeOldestIfNeeded(){
  while(visibleItems.length>MAX_VISIBLE){
    const old=visibleItems.shift();
    old.node.classList.add("leaving");
    old.node.style.transform=`${old.node.style.transform} translateY(-10px)`;
    setTimeout(()=>old.node.remove(),360);
  }
}

function next(){
  if(busy){
    queuedNext=true;
    return;
  }

  if(i>=S.length){
    clearTimeout(timer);
    show(ending);
    theme.volume=Math.min(1,(theme.volume||.28)+.18);
    return;
  }

  busy=true;
  queuedNext=false;
  tactilePulse();

  const cut=S[i++];
  const node=createLine(cut);

  visibleItems.push({
    node,
    type:cut.type||"narration"
  });

  removeOldestIfNeeded();

  requestAnimationFrame(()=>{
    applyLayout(node);
    prog();
  });

  setTimeout(()=>{
    busy=false;

    if(queuedNext){
      queuedNext=false;
      next();
      return;
    }

    if(auto){
      const wait=Math.max(1650,(cut.pause||1300)*AUTO_SLOW_FACTOR);
      timer=setTimeout(next,wait);
    }
  },390);
}

async function start(){
  reset();
  show(player);

  try{
    theme.volume=.28;
    await theme.play();
  }catch{}

  setTimeout(next,650);
}

function back(){
  clearTimeout(timer);
  timer=null;
  theme.pause();
  theme.currentTime=0;
  show(cover);
  reset();
}

function toggleAuto(event){
  event.stopPropagation();
  auto=!auto;
  modeBtn.textContent=auto?"MAN":"AUTO";
  modeLabel.textContent=auto?"AUTO":"MANUAL";
  clearTimeout(timer);

  if(auto&&i>0){
    timer=setTimeout(next,1500);
  }
}

function showScrollHint(){
  if(scrollHintShown)return;
  scrollHintShown=true;
  gestureHint.hidden=false;
  setTimeout(()=>gestureHint.hidden=true,1650);
}

g("start").addEventListener("click",start);
g("replay").addEventListener("click",start);
g("back").addEventListener("click",back);
modeBtn.addEventListener("click",toggleAuto);

stage.addEventListener("pointerdown",e=>{
  down={x:e.clientX,y:e.clientY,t:Date.now()};
  stage.classList.add("is-pressed");
});

stage.addEventListener("pointermove",e=>{
  if(!down)return;
  const dy=e.clientY-down.y;
  const dx=e.clientX-down.x;
  if(Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){
    showScrollHint();
  }
});

stage.addEventListener("pointerup",e=>{
  stage.classList.remove("is-pressed");
  if(!down)return;
  const dx=e.clientX-down.x;
  const dy=e.clientY-down.y;
  const distance=Math.hypot(dx,dy);
  const elapsed=Date.now()-down.t;
  down=null;

  if(distance<18&&elapsed<700) next();
});

stage.addEventListener("touchmove",e=>{
  e.preventDefault();
},{passive:false});

stage.addEventListener("pointercancel",()=>{
  down=null;
  stage.classList.remove("is-pressed");
});

stage.addEventListener("pointerleave",()=>{
  stage.classList.remove("is-pressed");
});

window.addEventListener("resize",()=>{
  requestAnimationFrame(()=>applyLayout());
});

addEventListener("keydown",e=>{
  if(player.hidden)return;
  if([" ","ArrowRight","Enter"].includes(e.key)){
    e.preventDefault();
    next();
  }
  if(e.key==="Escape")back();
});

prog();
})();