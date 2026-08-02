(()=>{
"use strict";

const SERIES=window.SHINO_SERIES||{episodes:[]};
const g=id=>document.getElementById(id);

const screens=[g("shelf"),g("cover"),g("player"),g("ending")];
const shelf=g("shelf"),cover=g("cover"),player=g("player"),ending=g("ending");
const episodeList=g("episodeList"),continueButton=g("continueButton");
const lines=g("lines"),stage=g("stage"),theme=g("theme"),ambience=g("ambience");
const count=g("count"),bar=g("bar"),modeBtn=g("mode"),soundBtn=g("sound");
const gestureHint=g("gestureHint"),endingText=g("endingText"),endingActions=g("endingActions");

let episode=null;
let story=[];
let i=0;
let auto=false;
let timer=null;
let busy=false;
let queuedNext=false;
let down=null;
let scrollHintShown=false;
let visibleItems=[];
let musicMuted=false;
let resumeVolume=SERIES.defaultVolume??.24;
let endingTimer=null;
let saveAudioTimer=null;
let lastViewport={w:innerWidth,h:innerHeight};

let audioContext=null;
let themeSourceNode=null;
let ambienceSourceNode=null;
let themeGain=null;
let ambienceGain=null;
let masterGain=null;
let audioGraphReady=false;
let ambienceStopTimer=null;

const MAX_VISIBLE=4;
const AUTO_SLOW_FACTOR=1.85;
const BASE_GAP=36;
const LARGE_GAP=68;
const SOUND_GAP=80;
const SAVE_KEY="shino_scene_player_progress_v04";

function show(target){
  screens.forEach(node=>node.hidden=node!==target);
}

function savedProgress(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY)||"null")}catch{return null}
}

function saveProgress(){
  if(!episode)return;
  localStorage.setItem(SAVE_KEY,JSON.stringify({
    episodeId:episode.id,
    sceneIndex:i,
    musicTime:Number.isFinite(theme.currentTime)?theme.currentTime:0,
    musicVolume:musicMuted?0:resumeVolume,
    musicMuted,
    updatedAt:Date.now()
  }));
}

function clearTimers(){
  clearTimeout(timer);
  clearTimeout(endingTimer);
  clearInterval(saveAudioTimer);
  clearTimeout(ambienceStopTimer);
  timer=null;
  endingTimer=null;
  saveAudioTimer=null;
  ambienceStopTimer=null;
}

function renderShelf(){
  episodeList.innerHTML="";
  SERIES.episodes.forEach(ep=>{
    const button=document.createElement("button");
    button.className="episode-card";
    button.innerHTML=`
      <span class="number">EP.${String(ep.number).padStart(2,"0")}</span>
      <span><strong>${ep.title}</strong><small>${ep.description||""}</small></span>
      <span class="arrow">›</span>`;
    button.addEventListener("click",()=>openCover(ep.id));
    episodeList.appendChild(button);
  });

  const saved=savedProgress();
  const resumable=saved&&SERIES.episodes.some(ep=>ep.id===saved.episodeId)&&saved.sceneIndex>0;
  continueButton.hidden=!resumable;
}

function openCover(id){
  episode=SERIES.episodes.find(ep=>ep.id===id)||SERIES.episodes[0];
  if(!episode)return;
  story=episode.story||[];

  g("episodeNumber").textContent=`第${episode.number}話`;
  g("episodeTitle").textContent=`「${episode.title}」`;
  g("playerEpisode").textContent=`第${episode.number}話「${episode.title}」`;

  const saved=savedProgress();
  g("resumeFromCover").hidden=!(saved&&saved.episodeId===episode.id&&saved.sceneIndex>0&&saved.sceneIndex<story.length);
  show(cover);
}

function progress(){
  count.textContent=`${Math.min(i,story.length)} / ${story.length}`;
  bar.style.width=`${story.length?i/story.length*100:0}%`;
}

function resetScene(startIndex=0){
  clearTimers();
  i=Math.max(0,Math.min(startIndex,story.length));
  busy=false;
  queuedNext=false;
  lines.innerHTML="";
  visibleItems=[];
  progress();
}

function getGap(prevType,nextType){
  if(prevType==="sound"||nextType==="sound")return SOUND_GAP;
  if(prevType!==nextType)return LARGE_GAP;
  if(prevType==="dialogue")return 56;
  return BASE_GAP;
}

function createLine(cut){
  const node=document.createElement("div");
  const typeClass=cut.type==="ending"?"endingtype":cut.type;
  node.className=`line ${typeClass}${cut.effect?" "+cut.effect:""} entering`;
  node.textContent=cut.text;
  node.dataset.type=cut.type||"narration";
  lines.appendChild(node);
  node.getBoundingClientRect();
  return node;
}

function updateLineAges(){
  visibleItems.forEach((item,index)=>{
    item.node.classList.remove("age-1","age-2","age-3","newest");
    const d=(visibleItems.length-1)-index;
    item.node.classList.add(d===0?"newest":d===1?"age-1":d===2?"age-2":"age-3");
  });
}

function measureLayout(extraGap=0){
  const stageHeight=stage.clientHeight;
  const focusY=stageHeight*(innerWidth<=600?.46:.48);
  const items=visibleItems.map(item=>({...item,height:item.node.getBoundingClientRect().height}));
  if(!items.length)return [];

  const newest=items.at(-1);
  let newestTop=focusY-newest.height/2;
  if(newest.type==="dialogue"||newest.type==="ending")newestTop-=12;

  const positions=new Array(items.length);
  positions[items.length-1]=newestTop;

  for(let idx=items.length-2;idx>=0;idx--){
    const current=items[idx],next=items[idx+1];
    positions[idx]=positions[idx+1]-getGap(current.type,next.type)-extraGap-current.height;
  }
  return items.map((item,idx)=>({...item,y:positions[idx]}));
}

function positionLines(extraGap=0){
  updateLineAges();
  measureLayout(extraGap).forEach(item=>{
    item.node.style.transform=`translate3d(0,${Math.round(item.y)}px,0)`;
  });
}

function breatheWhitespace(newNode){
  stage.classList.add("whitespace-inhale");
  positionLines(9);

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      stage.classList.remove("whitespace-inhale");
      stage.classList.add("whitespace-exhale");
      positionLines(0);
      newNode.classList.remove("entering");
      newNode.classList.add("visible");
      setTimeout(()=>stage.classList.remove("whitespace-exhale"),820);
    });
  });
}

function removeOld(){
  while(visibleItems.length>MAX_VISIBLE){
    const old=visibleItems.shift();
    old.node.classList.add("leaving");
    setTimeout(()=>old.node.remove(),390);
  }
}

async function ensureAudioGraph(){
  if(audioGraphReady){
    if(audioContext?.state==="suspended"){
      try{await audioContext.resume()}catch{}
    }
    return true;
  }

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return false;

  audioContext=new AudioCtx();
  themeGain=audioContext.createGain();
  ambienceGain=audioContext.createGain();
  masterGain=audioContext.createGain();

  themeGain.gain.value=SERIES.defaultVolume??.24;
  ambienceGain.gain.value=0;
  masterGain.gain.value=1;

  themeSourceNode=audioContext.createMediaElementSource(theme);
  ambienceSourceNode=audioContext.createMediaElementSource(ambience);

  themeSourceNode.connect(themeGain);
  ambienceSourceNode.connect(ambienceGain);
  themeGain.connect(masterGain);
  ambienceGain.connect(masterGain);
  masterGain.connect(audioContext.destination);

  theme.volume=1;
  ambience.volume=1;
  audioGraphReady=true;

  if(audioContext.state==="suspended"){
    try{await audioContext.resume()}catch{}
  }
  return true;
}

function rampGain(node,target,duration=800){
  if(!node||!audioContext)return;
  const now=audioContext.currentTime;
  const to=Math.max(0,Math.min(1,Number(target)||0));
  const end=now+Math.max(.02,Number(duration||0)/1000);
  const current=Math.max(.0001,node.gain.value||.0001);

  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(current,now);
  node.gain.exponentialRampToValueAtTime(Math.max(.0001,to),end);
  if(to===0)node.gain.setValueAtTime(0,end+.01);
}

function animateVolume(target,duration=800){
  resumeVolume=Math.max(0,Math.min(1,target));
  if(musicMuted)return;
  rampGain(themeGain,resumeVolume,duration);
}

async function playAmbience(direction){
  if(!direction?.src)return;
  clearTimeout(ambienceStopTimer);

  if(!await ensureAudioGraph())return;

  const absolute=new URL(direction.src,location.href).href;
  if(ambience.src!==absolute){
    ambience.src=direction.src;
    try{ambience.currentTime=0}catch{}
  }

  try{await ambience.play()}catch{return}

  ambienceGain.gain.setValueAtTime(.0001,audioContext.currentTime);
  rampGain(ambienceGain,direction.volume??.5,direction.fadeIn??700);

  if(direction.stopAfter){
    ambienceStopTimer=setTimeout(()=>{
      rampGain(ambienceGain,0,direction.fadeOut??1200);
      setTimeout(()=>{
        ambience.pause();
        try{ambience.currentTime=0}catch{}
      },(direction.fadeOut??1200)+80);
    },direction.stopAfter);
  }
}

function stopAmbience(fade=900){
  if(!audioGraphReady){
    ambience.pause();
    return;
  }
  rampGain(ambienceGain,0,fade);
  setTimeout(()=>{
    ambience.pause();
    try{ambience.currentTime=0}catch{}
  },fade+80);
}

function applyMusic(cut){
  const direction=cut.music;
  if(direction){
    animateVolume(direction.volume??SERIES.defaultVolume??.24,direction.fade??800);
  }
  if(cut.ambience)playAmbience(cut.ambience);
}

function tactileRelease(){
  stage.classList.remove("release-spring");
  void stage.offsetWidth;
  stage.classList.add("release-spring");
  setTimeout(()=>stage.classList.remove("release-spring"),380);
  try{navigator.vibrate?.(6)}catch{}
}

function next(){
  if(busy){queuedNext=true;return}
  if(i>=story.length){finish();return}

  busy=true;
  queuedNext=false;
  tactileRelease();

  const cut=story[i++];
  applyMusic(cut);
  const node=createLine(cut);
  visibleItems.push({node,type:cut.type||"narration"});
  removeOld();
  progress();
  saveProgress();

  requestAnimationFrame(()=>breatheWhitespace(node));

  const hold=cut.music?.hold||0;
  setTimeout(()=>{
    busy=false;
    if(queuedNext){queuedNext=false;next();return}
    if(auto){
      const wait=Math.max(1800,(cut.pause||1300)*AUTO_SLOW_FACTOR+hold);
      timer=setTimeout(next,wait);
    }
  },560+hold);
}

async function startEpisode(fromSaved=false){
  const saved=savedProgress();
  const startAt=fromSaved&&saved?.episodeId===episode.id ? saved.sceneIndex : 0;
  resetScene(startAt);
  show(player);

  theme.src=SERIES.themeSrc||"./audio/shino_theme.mp3";

  if(fromSaved&&saved?.episodeId===episode.id){
    musicMuted=Boolean(saved.musicMuted);
    resumeVolume=Math.max(0,Math.min(1,saved.musicVolume??(SERIES.defaultVolume??.24)));
  }else{
    musicMuted=false;
    resumeVolume=SERIES.defaultVolume??.24;
  }

  soundBtn.classList.toggle("muted",musicMuted);
  soundBtn.textContent=musicMuted?"♪×":"♪";

  try{
    await ensureAudioGraph();

    await new Promise(resolve=>{
      if(theme.readyState>=1)return resolve();
      theme.addEventListener("loadedmetadata",resolve,{once:true});
      setTimeout(resolve,1200);
    });

    if(fromSaved&&saved?.episodeId===episode.id&&Number.isFinite(saved.musicTime)){
      const safeTime=Math.max(
        0,
        Math.min(saved.musicTime,Number.isFinite(theme.duration)?theme.duration:saved.musicTime)
      );
      try{theme.currentTime=safeTime}catch{}
    }

    if(themeGain&&audioContext){
      themeGain.gain.cancelScheduledValues(audioContext.currentTime);
      themeGain.gain.setValueAtTime(
        musicMuted?0:Math.max(.0001,resumeVolume),
        audioContext.currentTime
      );
    }

    if(!musicMuted)await theme.play();
  }catch{}

  saveAudioTimer=setInterval(saveProgress,1000);

  if(startAt>0){
    // Rebuild recent context without animation.
    const begin=Math.max(0,startAt-MAX_VISIBLE);
    visibleItems=[];
    lines.innerHTML="";
    for(let idx=begin;idx<startAt;idx++){
      const cut=story[idx];
      const node=createLine(cut);
      node.classList.remove("entering");
      node.classList.add("visible");
      visibleItems.push({node,type:cut.type||"narration"});
    }
    positionLines(0);
    progress();
  }else{
    setTimeout(next,650);
  }
}

function finish(){
  clearTimers();
  localStorage.removeItem(SAVE_KEY);

  const final=story.at(-1);
  endingText.innerHTML="";
  String(final?.text||"").split("\n").filter(Boolean).forEach((text,index)=>{
    const p=document.createElement("p");
    p.textContent=text;
    if(index===String(final?.text||"").split("\n").filter(Boolean).length-1)p.className="strong";
    endingText.appendChild(p);
  });

  endingActions.hidden=true;
  show(ending);
  stopAmbience(900);
  animateVolume(.42,1800);
  endingTimer=setTimeout(()=>endingActions.hidden=false,4200);
}

function backToCover(){
  saveProgress();
  clearTimers();
  theme.pause();
  stopAmbience(280);
  show(cover);
}

function toggleAuto(){
  auto=!auto;
  modeBtn.textContent=auto?"MAN":"AUTO";
  clearTimeout(timer);
  if(auto&&i>0)timer=setTimeout(next,1700);
}

async function toggleSound(){
  musicMuted=!musicMuted;
  soundBtn.classList.toggle("muted",musicMuted);
  soundBtn.textContent=musicMuted?"♪×":"♪";

  await ensureAudioGraph();

  if(musicMuted){
    rampGain(themeGain,0,260);
    rampGain(ambienceGain,0,260);
    setTimeout(()=>{
      theme.pause();
      ambience.pause();
    },300);
  }else{
    try{
      await theme.play();
      if(ambience.src&&ambience.currentTime>0){
        await ambience.play().catch(()=>{});
      }
    }catch{}
    rampGain(themeGain,resumeVolume||SERIES.defaultVolume||.24,700);
  }

  saveProgress();
}

function rebuildVisibleContext(){
  if(!episode||player.hidden)return;

  const start=Math.max(0,i-MAX_VISIBLE);
  visibleItems=[];
  lines.innerHTML="";

  for(let idx=start;idx<i;idx++){
    const cut=story[idx];
    const node=createLine(cut);
    node.classList.remove("entering");
    node.classList.add("visible");
    node.style.fontSize="";
    node.style.lineHeight="";
    visibleItems.push({node,type:cut.type||"narration"});
  }

  void document.documentElement.offsetWidth;
  requestAnimationFrame(()=>positionLines(0));
}

function handleViewportChange(){
  const changedOrientation=
    Math.abs(innerWidth-lastViewport.w)>80 ||
    Math.abs(innerHeight-lastViewport.h)>80;

  lastViewport={w:innerWidth,h:innerHeight};

  if(changedOrientation){
    document.documentElement.style.webkitTextSizeAdjust="100%";
    document.body.style.webkitTextSizeAdjust="100%";
    setTimeout(rebuildVisibleContext,120);
    setTimeout(rebuildVisibleContext,360);
  }else{
    requestAnimationFrame(()=>positionLines(0));
  }
}

function showScrollHint(){
  if(scrollHintShown)return;
  scrollHintShown=true;
  gestureHint.hidden=false;
  setTimeout(()=>gestureHint.hidden=true,1650);
}

g("coverBack").addEventListener("click",()=>{renderShelf();show(shelf)});
g("start").addEventListener("click",()=>startEpisode(false));
g("resumeFromCover").addEventListener("click",()=>startEpisode(true));
g("back").addEventListener("click",backToCover);
g("replay").addEventListener("click",()=>{openCover(episode.id);startEpisode(false)});
g("episodes").addEventListener("click",()=>{renderShelf();show(shelf)});
continueButton.addEventListener("click",()=>{
  const saved=savedProgress();
  if(saved){openCover(saved.episodeId);startEpisode(true)}
});
modeBtn.addEventListener("click",toggleAuto);
soundBtn.addEventListener("click",toggleSound);

stage.addEventListener("pointerdown",e=>{
  ensureAudioGraph();
  down={x:e.clientX,y:e.clientY,t:Date.now()};
  stage.classList.add("is-pressed");
});
stage.addEventListener("pointermove",e=>{
  if(!down)return;
  const dx=e.clientX-down.x,dy=e.clientY-down.y;
  if(Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx))showScrollHint();
});
stage.addEventListener("pointerup",e=>{
  stage.classList.remove("is-pressed");
  if(!down)return;
  const distance=Math.hypot(e.clientX-down.x,e.clientY-down.y);
  const elapsed=Date.now()-down.t;
  down=null;
  if(distance<18&&elapsed<700)next();
});
stage.addEventListener("pointercancel",()=>{down=null;stage.classList.remove("is-pressed")});
stage.addEventListener("touchmove",e=>e.preventDefault(),{passive:false});

let lastTouchEnd=0;
document.addEventListener("touchend",e=>{
  const now=Date.now();
  if(now-lastTouchEnd<=320){
    e.preventDefault();
  }
  lastTouchEnd=now;
},{passive:false});

document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});
document.addEventListener("gesturechange",e=>e.preventDefault(),{passive:false});
document.addEventListener("gestureend",e=>e.preventDefault(),{passive:false});
document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false});
addEventListener("resize",handleViewportChange);
addEventListener("orientationchange",()=>{
  setTimeout(handleViewportChange,180);
  setTimeout(handleViewportChange,520);
});
addEventListener("keydown",e=>{
  if(player.hidden)return;
  if([" ","ArrowRight","Enter"].includes(e.key)){e.preventDefault();next()}
  if(e.key==="Escape")backToCover();
});

renderShelf();
show(shelf);
})();