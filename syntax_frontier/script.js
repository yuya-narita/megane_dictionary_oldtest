(()=>{
"use strict";

const MANIFEST=window.SHINO_SERIES||{episodes:[]};
const EPISODE_DATA=window.SHINO_EPISODES||{};
const SERIES={
  ...MANIFEST,
  episodes:(MANIFEST.episodes||[]).map(meta=>({
    ...meta,
    ...(EPISODE_DATA[meta.id]||{}),
    src:meta.src
  }))
};
const g=id=>document.getElementById(id);

const screens=[g("shelf"),g("cover"),g("player"),g("ending")];
const shelf=g("shelf"),cover=g("cover"),player=g("player"),ending=g("ending");
const episodeList=g("episodeList"),continueButton=g("continueButton");
const lines=g("lines"),stage=g("stage"),theme=g("theme"),ambience=g("ambience"),effectAudio=g("effectAudio");
const sceneBackground=g("sceneBackground");
const count=g("count"),bar=g("bar"),modeBtn=g("mode"),soundBtn=g("sound");
const gestureHint=g("gestureHint"),endingActions=g("endingActions");
const previousEpisodeButton=g("previousEpisode"),nextEpisodeButton=g("nextEpisode");

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
let effectSourceNode=null;
let themeGain=null;
let ambienceGain=null;
let effectGain=null;
let masterGain=null;
let audioGraphReady=false;
let ambienceStopTimer=null;
let ambienceUnlocked=false;
let ambiencePrimedSrc=null;
let effectPrimedSrc=null;

let playbackSession=0;
let startingEpisode=false;
const audioCleanupTimers=new Set();

const MAX_VISIBLE=4;
const AUTO_SLOW_FACTOR=1.85;
const BASE_GAP=36;
const LARGE_GAP=68;
const SOUND_GAP=80;
const SAVE_KEY="shino_scene_player_progress_v04";

// Safari shelf scroll handling
let shelfScrollPosition=0;
let initialShelfResetActive=true;
let initialShelfResetTimers=[];
try{ history.scrollRestoration="manual"; }catch{}

function stopInitialShelfReset(){
  initialShelfResetActive=false;
  initialShelfResetTimers.forEach(clearTimeout);
  initialShelfResetTimers=[];
}

function forceInitialShelfTop(){
  if(!initialShelfResetActive)return;
  shelf.scrollTop=0;
  // Safari may restore an inner scroller shortly after first paint.
  [0,60,160,320,500].forEach(delay=>{
    const id=setTimeout(()=>{
      if(initialShelfResetActive)shelf.scrollTop=0;
    },delay);
    initialShelfResetTimers.push(id);
  });
}

function rememberShelfPosition(){
  shelfScrollPosition=shelf.scrollTop||0;
}

function restoreShelfPosition(){
  const y=shelfScrollPosition;
  requestAnimationFrame(()=>requestAnimationFrame(()=>shelf.scrollTop=y));
}

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

function managedTimeout(callback,delay){
  const id=setTimeout(()=>{
    audioCleanupTimers.delete(id);
    callback();
  },delay);
  audioCleanupTimers.add(id);
  return id;
}

function clearAudioCleanupTimers(){
  for(const id of audioCleanupTimers)clearTimeout(id);
  audioCleanupTimers.clear();
}

function cancelScheduledAudio(){
  if(!audioContext)return;
  const now=audioContext.currentTime;

  for(const node of [themeGain,ambienceGain,effectGain,masterGain]){
    if(!node?.gain)continue;
    const value=Math.max(0,Number(node.gain.value)||0);
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(value,now);
  }
}

function deClickGain(node,target,durationMs=35){
  if(!node?.gain||!audioContext)return;

  const now=audioContext.currentTime;
  const current=Math.max(0.0001,Number(node.gain.value)||0.0001);
  const targetValue=Math.max(0.0001,Number(target)||0.0001);
  const end=now+Math.max(0.012,durationMs/1000);

  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(current,now);
  node.gain.linearRampToValueAtTime(targetValue,end);
}

async function softStopAudio({
  resetPosition=false,
  suspendContext=false,
  fadeMs=45
}={}){
  clearAudioCleanupTimers();
  clearTimeout(ambienceStopTimer);
  ambienceStopTimer=null;
  cancelScheduledAudio();

  if(audioContext&&audioContext.state==="suspended"){
    try{await audioContext.resume()}catch{}
  }

  deClickGain(themeGain,0.0001,fadeMs);
  deClickGain(ambienceGain,0.0001,fadeMs);
  deClickGain(effectGain,0.0001,Math.min(fadeMs,120));

  await new Promise(resolve=>setTimeout(resolve,fadeMs+18));

  try{theme.pause()}catch{}
  try{ambience.pause()}catch{}
  try{effectAudio.pause()}catch{}

  theme.playbackRate=1;
  theme.defaultPlaybackRate=1;
  ambience.playbackRate=1;
  ambience.defaultPlaybackRate=1;

  if(resetPosition){
    try{theme.currentTime=0}catch{}
    try{ambience.currentTime=0}catch{}
    try{effectAudio.currentTime=0}catch{}
  }

  if(suspendContext&&audioContext?.state==="running"){
    try{await audioContext.suspend()}catch{}
  }
}

function hardStopAudio({resetPosition=false,suspendContext=false}={}){
  clearAudioCleanupTimers();
  clearTimeout(ambienceStopTimer);
  ambienceStopTimer=null;
  cancelScheduledAudio();

  try{theme.pause()}catch{}
  try{ambience.pause()}catch{}
  try{effectAudio.pause()}catch{}

  // Defensive reset in case a browser or prior state changed the rate.
  theme.playbackRate=1;
  theme.defaultPlaybackRate=1;
  ambience.playbackRate=1;
  ambience.defaultPlaybackRate=1;

  if(themeGain&&audioContext){
    themeGain.gain.cancelScheduledValues(audioContext.currentTime);
    themeGain.gain.setValueAtTime(0,audioContext.currentTime);
  }
  if(ambienceGain&&audioContext){
    ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
    ambienceGain.gain.setValueAtTime(0,audioContext.currentTime);
  }
  if(effectGain&&audioContext){
    effectGain.gain.cancelScheduledValues(audioContext.currentTime);
    effectGain.gain.setValueAtTime(0,audioContext.currentTime);
  }

  if(resetPosition){
    try{theme.currentTime=0}catch{}
    try{ambience.currentTime=0}catch{}
    try{effectAudio.currentTime=0}catch{}
  }

  if(suspendContext&&audioContext?.state==="running"){
    audioContext.suspend().catch(()=>{});
  }
}

function clearTimers(){
  clearTimeout(timer);
  clearTimeout(endingTimer);
  clearInterval(saveAudioTimer);
  clearTimeout(ambienceStopTimer);
  clearAudioCleanupTimers();
  timer=null;
  endingTimer=null;
  saveAudioTimer=null;
  ambienceStopTimer=null;
}

function renderShelf(){
  episodeList.innerHTML="";

  SERIES.episodes.forEach((ep,index)=>{
    const button=document.createElement("button");
    button.className="episode-card";

    const episodeLabel=ep.number===0
      ?"PROLOGUE"
      :`EPISODE ${String(ep.number).padStart(2,"0")}`;

    button.innerHTML=`
      <span class="episode-index">${String(index+1).padStart(2,"0")}</span>
      <span class="episode-main">
        <span class="number">${episodeLabel}</span>
        <strong>${ep.title}</strong>
        <small>${ep.description||"観測記録を開く。"}</small>
      </span>
      <span class="arrow" aria-hidden="true">→</span>`;

    button.addEventListener("click",()=>{
      rememberShelfPosition();
      openCover(ep.id);
    });
    episodeList.appendChild(button);
  });

  const saved=savedProgress();
  const savedEpisode=saved
    ?SERIES.episodes.find(ep=>ep.id===saved.episodeId)
    :null;

  const resumable=Boolean(
    savedEpisode &&
    saved.sceneIndex>0 &&
    saved.sceneIndex<(savedEpisode.story?.length||Infinity)
  );

  continueButton.hidden=!resumable;

  const meta=g("continueMeta");
  if(meta){
    meta.textContent=resumable
      ?`${savedEpisode.number===0?"PROLOGUE":`EP.${String(savedEpisode.number).padStart(2,"0")}`}  ${savedEpisode.title}  /  SCENE ${saved.sceneIndex}`
      :"";
  }
}

function episodeIndex(){
  return SERIES.episodes.findIndex(ep=>ep.id===episode?.id);
}

function adjacentEpisode(offset){
  const index=episodeIndex();
  if(index<0)return null;
  return SERIES.episodes[index+offset]||null;
}

function openAdjacentEpisode(offset){
  const target=adjacentEpisode(offset);
  if(!target)return;

  playbackSession++;
  startingEpisode=false;
  clearTimers();
  openCover(target.id);
  softStopAudio({
    resetPosition:false,
    suspendContext:true,
    fadeMs:900
  });
}

function openCover(id){
  episode=SERIES.episodes.find(ep=>ep.id===id)||SERIES.episodes[0];
  if(!episode)return;
  story=episode.story||[];

  g("episodeNumber").textContent=episode.number===0?"PROLOGUE":`第${episode.number}話`;
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
  stopActiveTyping(false);
  clearTimers();
  i=Math.max(0,Math.min(startIndex,story.length));
  busy=false;
  queuedNext=false;
  lines.innerHTML="";
  visibleItems=[];
  applySyntaxMeters({meters:{lambda:0,jump:0,sigma:0}},0);
  progress();
}

function getGap(prevType,nextType){
  if(prevType==="sound"||nextType==="sound")return SOUND_GAP;
  if(prevType!==nextType)return LARGE_GAP;
  if(prevType==="dialogue")return 56;
  return BASE_GAP;
}

function normalizeEffectClasses(effect){
  if(!effect)return "";
  return String(effect)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(name=>{
      const raw=name.replace(/^effect-/,"");
      return [raw,`effect-${raw}`];
    })
    .join(" ");
}


const SCENE_TEXT_COLORS={
  white:"#ffffff",
  lavender:"#bda7ff",
  pink:"#f2b7cf",
  cyan:"#83e7ff",
  green:"#7fffb2",
  amber:"#ffc86b",
  red:"#ff7b8c",
  gray:"#a7a4b1"
};

function resolvePlayerTextColor(cut){
  const key=cut.textColor||"theme";
  if(key==="theme")return "";
  if(key==="custom")return cut.customColor||"#bda7ff";
  return SCENE_TEXT_COLORS[key]||"";
}

function removeVisibleNode(node){
  const index=visibleItems.findIndex(item=>item.node===node);
  if(index>=0)visibleItems.splice(index,1);
  node.remove();
  requestAnimationFrame(()=>positionLines(0));
}

function scheduleSceneDisappear(node,cut){
  const after=Math.max(0,Number(cut.disappearAfter)||0);
  if(!after)return;

  const fade=Math.max(100,Number(cut.disappearFade)||700);
  node.style.setProperty("--scene-disappear-fade",`${fade}ms`);

  managedTimeout(()=>{
    if(!node.isConnected)return;
    node.classList.add("scene-disappearing");

    managedTimeout(()=>{
      if(node.isConnected)removeVisibleNode(node);
    },fade+40);
  },after);
}

let activeTyping=null;
function stopActiveTyping(complete=false){
  if(!activeTyping)return false;
  clearInterval(activeTyping.timer);
  if(complete)activeTyping.node.textContent=activeTyping.text;
  activeTyping=null;
  return true;
}
function startTyping(node,cut){
  const mode=cut.typing||"none";
  if(mode==="none"){
    node.textContent=cut.text;
    return;
  }
  stopActiveTyping(true);
  const speeds={
    fast:24,
    slow:110,
    terminal:Number(cut.typingSpeed)||48,
    typing:Number(cut.typingSpeed)||55
  };
  const speed=Math.max(10,speeds[mode]||55);
  const cursor=cut.typingCursor??"_";
  const chars=Array.from(cut.text||"");
  let index=0;
  node.textContent=cursor;
  activeTyping={
    node,
    text:cut.text||"",
    timer:setInterval(()=>{
      index++;
      node.textContent=chars.slice(0,index).join("")+(index<chars.length?cursor:"");
      if(index>=chars.length){
        clearInterval(activeTyping.timer);
        activeTyping=null;
      }
    },speed)
  };
}

function createLine(cut){
  const node=document.createElement("div");
  const typeClass=cut.type==="ending"?"endingtype":cut.type;
  const effectClasses=normalizeEffectClasses(cut.effect);
  const view=cut.view||"world";
  const wrapClass=cut.wrap==="nowrap"?" is-nowrap":"";
  const sizeClass=cut.fontSize&&cut.fontSize!=="auto"
    ?` size-${cut.fontSize}`:"";
  node.className=
    `line ${typeClass} view-${view}${effectClasses?" "+effectClasses:""}${wrapClass}${sizeClass} entering`;
  if(cut.fontSize==="custom"&&Number(cut.fontPx)){
    node.style.fontSize=`${Number(cut.fontPx)}px`;
  }

  const resolvedColor=resolvePlayerTextColor(cut);
  if(resolvedColor)node.style.setProperty("--scene-text-color",resolvedColor);

  startTyping(node,cut);
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
  effectGain=audioContext.createGain();
  masterGain=audioContext.createGain();

  themeGain.gain.value=SERIES.defaultVolume??.24;
  ambienceGain.gain.value=0;
  effectGain.gain.value=0;
  masterGain.gain.value=1;

  themeSourceNode=audioContext.createMediaElementSource(theme);
  ambienceSourceNode=audioContext.createMediaElementSource(ambience);
  effectSourceNode=audioContext.createMediaElementSource(effectAudio);

  themeSourceNode.connect(themeGain);
  ambienceSourceNode.connect(ambienceGain);
  effectSourceNode.connect(effectGain);
  themeGain.connect(masterGain);
  ambienceGain.connect(masterGain);
  effectGain.connect(masterGain);
  masterGain.connect(audioContext.destination);

  theme.volume=1;
  ambience.volume=1;
  effectAudio.volume=1;
  effectAudio.loop=false;
  audioGraphReady=true;

  if(audioContext.state==="suspended"){
    try{await audioContext.resume()}catch{}
  }
  return true;
}


async function primeEffectTrack(src){
  if(!src)return false;
  if(!await ensureAudioGraph())return false;

  const absolute=new URL(src,location.href).href;
  if(effectAudio.src!==absolute){
    effectAudio.src=src;
    effectAudio.load();
  }

  effectPrimedSrc=src;

  try{
    const now=audioContext.currentTime;
    effectGain.gain.cancelScheduledValues(now);
    effectGain.gain.setValueAtTime(0,now);
    effectAudio.loop=false;

    // Unlock the element during the user's start gesture.
    await effectAudio.play();
    effectAudio.pause();
    effectAudio.currentTime=0;
    return true;
  }catch(error){
    console.warn("[Scene Player] effect prime failed:",src,error);
    return false;
  }
}

function firstEffectSrc(){
  for(const cut of story){
    if(cut.effectAudio?.src)return cut.effectAudio.src;
  }
  return null;
}

async function playEffect(direction){
  if(!direction?.src||musicMuted)return;
  if(!await ensureAudioGraph())return;

  const absolute=new URL(direction.src,location.href).href;
  if(effectAudio.src!==absolute){
    effectAudio.src=direction.src;
    effectAudio.load();
    effectPrimedSrc=direction.src;
  }

  try{
    effectAudio.pause();
    effectAudio.loop=false;
    effectAudio.currentTime=0;

    const now=audioContext.currentTime;
    const volume=Math.max(0,Math.min(1,Number(direction.volume??0.65)));
    effectGain.gain.cancelScheduledValues(now);
    effectGain.gain.setValueAtTime(0.0001,now);

    await effectAudio.play();
    effectGain.gain.linearRampToValueAtTime(
      Math.max(0.0001,volume),
      now+0.025
    );
  }catch(error){
    console.warn("[Scene Player] effect failed:",direction.src,error);
  }
}

async function primeAmbienceTrack(src){
  if(!src)return false;
  if(!await ensureAudioGraph())return false;

  const absolute=new URL(src,location.href).href;

  if(ambience.src!==absolute){
    ambience.src=src;
    ambience.load();
  }

  ambiencePrimedSrc=src;

  try{
    ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
    ambienceGain.gain.setValueAtTime(0,audioContext.currentTime);
    await ambience.play();
    ambienceUnlocked=true;
    return true;
  }catch{
    ambienceUnlocked=false;
    return false;
  }
}

function firstAmbienceSrc(){
  for(const ep of (SERIES.episodes||[])){
    for(const cut of (ep.story||[])){
      if(cut.ambience?.src)return cut.ambience.src;
    }
  }
  return null;
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
  console.info("[Scene Player] ambience requested:", direction.src);

  clearTimeout(ambienceStopTimer);
  ambienceStopTimer=null;

  if(!await ensureAudioGraph())return;

  const absolute=new URL(direction.src,location.href).href;

  if(ambience.src!==absolute){
    const switched=await primeAmbienceTrack(direction.src);
    if(!switched)return;
  }else if(ambience.paused){
    try{
      await ambience.play();
      ambienceUnlocked=true;
    }catch{
      return;
    }
  }

  rampGain(
    ambienceGain,
    direction.volume??.5,
    direction.fadeIn??700
  );

  if(direction.stopAfter){
    ambienceStopTimer=managedTimeout(()=>{
      rampGain(ambienceGain,0,direction.fadeOut??1200);

      // Keep the track running silently on iPhone so later scenes
      // do not need a new play() permission.
      ambienceStopTimer=managedTimeout(()=>{
        if(ambienceGain&&audioContext){
          ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
          ambienceGain.gain.setValueAtTime(0,audioContext.currentTime);
        }
      },(direction.fadeOut??1200)+40);
    },direction.stopAfter);
  }
}

function stopAmbience(fade=900){
  if(!audioGraphReady){
    return;
  }

  rampGain(ambienceGain,0,fade);

  managedTimeout(()=>{
    if(ambienceGain&&audioContext){
      ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
      ambienceGain.gain.setValueAtTime(0,audioContext.currentTime);
    }
  },fade+40);
}


function applyVisual(cut){
  const view=cut.view||"world";
  stage.dataset.view=view;

  const transition=cut.bgTransition||"fade";
  stage.classList.remove("bg-cut","bg-fade","bg-flash","bg-glitch");
  void stage.offsetWidth;
  stage.classList.add(`bg-${transition}`);

  sceneBackground.style.backgroundSize=cut.bgFit||"cover";

  if(cut.display==="solo"||cut.clear){
    lines.innerHTML="";
    visibleItems=[];
  }
  const bg=cut.background||"";
  sceneBackground.style.backgroundImage=bg?`url(${JSON.stringify(bg)})`:"";
  sceneBackground.style.opacity=String(1-Math.max(0,Math.min(.9,Number(cut.dim??.48))));
  sceneBackground.style.filter=`blur(${Math.max(0,Number(cut.blur||0))}px)`;
}

function applyMusic(cut){
  const direction=cut.music;
  if(direction){
    animateVolume(direction.volume??SERIES.defaultVolume??.24,direction.fade??800);
  }
  if(cut.ambience)playAmbience(cut.ambience);
  if(cut.effectAudio)playEffect(cut.effectAudio);
}

function clampSyntaxValue(value,fallback=0){
  const number=Number(value);
  return Number.isFinite(number)
    ?Math.max(0,Math.min(1,number))
    :fallback;
}

function inferSyntaxMeters(cut,index){
  if(cut?.meters){
    return {
      lambda:clampSyntaxValue(cut.meters.lambda,0),
      jump:clampSyntaxValue(cut.meters.jump,0),
      sigma:clampSyntaxValue(cut.meters.sigma,0)
    };
  }

  const text=String(cut?.text||"");
  const progress=Math.max(0,Math.min(1,(index+1)/Math.max(1,story.length)));

  let lambda=Math.min(.92,.18+progress*.54);
  let jump=.01;
  let sigma=Math.min(.88,progress*.46);

  if(/[？?]|なぜ|なんで|違和感|気配|圧|まだ/.test(text))lambda+=.16;
  if(/跳ね|反転|侵入|変わ|壊|遅れ|止ま/.test(text))jump+=.22;
  if(/記録|固定|痕跡|確定|永遠|戻る|午後三時/.test(text))sigma+=.24;
  if(cut?.view==="warning")jump+=.28;
  if(cut?.view==="console")lambda+=.10;
  if(cut?.type==="ending")sigma+=.24;

  return {
    lambda:clampSyntaxValue(lambda,.25),
    jump:clampSyntaxValue(jump,.01),
    sigma:clampSyntaxValue(sigma,.08)
  };
}

function applySyntaxMeters(cut,index){
  const values=inferSyntaxMeters(cut,index);
  const entries=[
    ["lambda",values.lambda],
    ["jump",values.jump],
    ["sigma",values.sigma]
  ];

  for(const [key,value] of entries){
    const bar=g(`${key}Meter`);
    const label=g(`${key}Label`);
    if(bar)bar.style.width=`${Math.round(value*100)}%`;
    if(label){
      const symbol=key==="lambda"?"λ":key==="jump"?"!":"σ";
      label.textContent=`${symbol} ${value.toFixed(2)}`;
    }
  }

  const meter=g("syntaxMeter");
  if(meter){
    meter.classList.remove("meter-pulse");
    void meter.offsetWidth;
    if(values.jump>=.35)meter.classList.add("meter-pulse");
  }
}

function tactileRelease(){
  stage.classList.remove("release-spring");
  void stage.offsetWidth;
  stage.classList.add("release-spring");
  setTimeout(()=>stage.classList.remove("release-spring"),380);
  try{navigator.vibrate?.(6)}catch{}
}

function next(){
  if(stopActiveTyping(true))return;
  if(busy){queuedNext=true;return}
  if(i>=story.length){finish();return}

  busy=true;
  queuedNext=false;
  tactileRelease();

  const cutIndex=i;
  const cut=story[i++];
  applyVisual(cut);
  applyMusic(cut);
  applySyntaxMeters(cut,cutIndex);
  const node=createLine(cut);
  visibleItems.push({node,type:cut.type||"narration"});
  removeOld();
  progress();
  saveProgress();

  requestAnimationFrame(()=>{
    breatheWhitespace(node);
    scheduleSceneDisappear(node,cut);
  });

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
  if(startingEpisode)return;

  startingEpisode=true;
  const session=++playbackSession;
  const saved=savedProgress();
  const startAt=fromSaved&&saved?.episodeId===episode.id ? saved.sceneIndex : 0;

  resetScene(startAt);
  hardStopAudio({resetPosition:false,suspendContext:false});
  show(player);

  theme.src=SERIES.themeSrc||"./audio/shino_theme.mp3";
  theme.playbackRate=1;
  theme.defaultPlaybackRate=1;
  ambience.playbackRate=1;
  ambience.defaultPlaybackRate=1;

  if(fromSaved&&saved?.episodeId===episode.id){
    musicMuted=Boolean(saved.musicMuted);
    resumeVolume=Math.max(0,Math.min(1,saved.musicVolume??(SERIES.defaultVolume??.24)));
  }else{
    musicMuted=false;
    resumeVolume=SERIES.defaultVolume??.24;
    try{theme.currentTime=0}catch{}
  }

  soundBtn.classList.toggle("muted",musicMuted);
  soundBtn.textContent=musicMuted?"♪×":"♪";

  try{
    await ensureAudioGraph();
    if(session!==playbackSession)return;

    const ambienceSrc=firstAmbienceSrc();
    if(ambienceSrc){
      await primeAmbienceTrack(ambienceSrc);
      if(session!==playbackSession)return;
    }

    const effectSrc=firstEffectSrc();
    if(effectSrc){
      await primeEffectTrack(effectSrc);
      if(session!==playbackSession)return;
    }

    await new Promise(resolve=>{
      if(theme.readyState>=1)return resolve();
      theme.addEventListener("loadedmetadata",resolve,{once:true});
      setTimeout(resolve,1200);
    });
    if(session!==playbackSession)return;

    if(fromSaved&&saved?.episodeId===episode.id&&Number.isFinite(saved.musicTime)){
      const safeTime=Math.max(
        0,
        Math.min(saved.musicTime,Number.isFinite(theme.duration)?theme.duration:saved.musicTime)
      );
      try{theme.currentTime=safeTime}catch{}
    }

    if(themeGain&&audioContext){
      const now=audioContext.currentTime;
      themeGain.gain.cancelScheduledValues(now);
      themeGain.gain.setValueAtTime(0.0001,now);
    }

    if(!musicMuted){
      await theme.play();

      if(session!==playbackSession){
        theme.pause();
        return;
      }

      // A very short fade removes the iPhone start click without
      // making the restart feel delayed.
      deClickGain(
        themeGain,
        Math.max(.0001,resumeVolume),
        fromSaved?1800:1500
      );
    }
  }catch(error){
    console.warn("[Scene Player] audio start failed",error);
  }finally{
    if(session===playbackSession)startingEpisode=false;
  }

  if(session!==playbackSession)return;

  clearInterval(saveAudioTimer);
  saveAudioTimer=setInterval(()=>{
    if(session===playbackSession&&!player.hidden)saveProgress();
  },1000);

  if(startAt>0){
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
    timer=setTimeout(()=>{
      if(session===playbackSession&&!player.hidden)next();
    },650);
  }
}

function finish(){
  playbackSession++;
  startingEpisode=false;
  clearTimers();
  localStorage.removeItem(SAVE_KEY);

  const previous=adjacentEpisode(-1);
  const nextEpisode=adjacentEpisode(1);

  previousEpisodeButton.hidden=!previous;
  nextEpisodeButton.hidden=!nextEpisode;

  if(previous){
    previousEpisodeButton.setAttribute(
      "aria-label",
      `前の話、第${previous.number}話「${previous.title}」`
    );
  }

  if(nextEpisode){
    nextEpisodeButton.setAttribute(
      "aria-label",
      `続き、第${nextEpisode.number}話「${nextEpisode.title}」`
    );
  }

  const endingTitle=ending.querySelector(".ending-card h2");
  if(endingTitle)endingTitle.textContent=episode?.ending||"CONTINUE";
  endingActions.classList.remove("is-visible");
  endingActions.hidden=true;
  show(ending);
  stopAmbience(900);
  animateVolume(.42,1800);

  // First leave only the centered end card and the theme.
  endingTimer=setTimeout(()=>{
    endingActions.hidden=false;
    requestAnimationFrame(()=>endingActions.classList.add("is-visible"));
  },3600);
}

async function backToCover(){
  saveProgress();
  playbackSession++;
  startingEpisode=false;
  clearTimers();

  // Change screen immediately, but let the audio close over a tiny
  // envelope so the waveform is not cut at a non-zero point.
  show(cover);
  await softStopAudio({
    resetPosition:false,
    suspendContext:true,
    fadeMs:900
  });
}

async function backToShelf(){
  playbackSession++;
  startingEpisode=false;
  clearTimers();

  renderShelf();
  show(shelf);
  restoreShelfPosition();

  // The UI responds immediately; BGM/ambience/SE gently leave the room.
  await softStopAudio({
    resetPosition:false,
    suspendContext:true,
    fadeMs:1200
  });
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
    const session=playbackSession;
    deClickGain(themeGain,0.0001,500);
    deClickGain(ambienceGain,0.0001,500);
    deClickGain(effectGain,0.0001,120);

    managedTimeout(()=>{
      if(session!==playbackSession)return;
      theme.pause();
      ambience.pause();
      effectAudio.pause();
    },78);
  }else{
    try{
      if(themeGain&&audioContext){
        const now=audioContext.currentTime;
        themeGain.gain.cancelScheduledValues(now);
        themeGain.gain.setValueAtTime(0.0001,now);
      }

      await theme.play();

      if(ambiencePrimedSrc){
        if(ambience.src!==new URL(ambiencePrimedSrc,location.href).href){
          ambience.src=ambiencePrimedSrc;
          ambience.load();
        }

        if(ambienceGain&&audioContext){
          ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);
          ambienceGain.gain.setValueAtTime(0.0001,audioContext.currentTime);
        }

        await ambience.play();
        ambienceUnlocked=true;
      }
    }catch{}

    deClickGain(
      themeGain,
      resumeVolume||SERIES.defaultVolume||.24,
      900
    );
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

g("coverBack").addEventListener("click",backToShelf);
g("start").addEventListener("click",()=>startEpisode(false));
g("resumeFromCover").addEventListener("click",()=>startEpisode(true));
g("back").addEventListener("click",backToCover);
g("replay").addEventListener("click",()=>{openCover(episode.id);startEpisode(false)});
previousEpisodeButton.addEventListener("click",()=>openAdjacentEpisode(-1));
nextEpisodeButton.addEventListener("click",()=>openAdjacentEpisode(1));
g("episodes").addEventListener("click",backToShelf);
continueButton.addEventListener("click",()=>{
  rememberShelfPosition();
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
document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&player&&!player.hidden){
    saveProgress();
  }
});

addEventListener("pagehide",()=>{
  playbackSession++;
  clearTimers();
  hardStopAudio({resetPosition:false,suspendContext:true});
});

addEventListener("keydown",e=>{
  if(player.hidden)return;
  if([" ","ArrowRight","Enter"].includes(e.key)){e.preventDefault();next()}
  if(e.key==="Escape")backToCover();
});

// Initial page entry/reload always starts at the launcher top.
// The first real touch immediately releases the guard so scrolling never fights the user.
shelf.addEventListener("touchstart",stopInitialShelfReset,{passive:true,once:true});
shelf.addEventListener("pointerdown",stopInitialShelfReset,{passive:true,once:true});
renderShelf();
show(shelf);
forceInitialShelfTop();
})();