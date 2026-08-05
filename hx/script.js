
const DATA=window.HX_INFINITY_DATA;
const $=id=>document.getElementById(id);

const archive=$("archive");
const player=$("player");
const ending=$("ending");
const music=$("music");
const voice=$("voice");

let currentTrack=null;
let playing=false;
let timer=null;
let currentSegmentIndex=0;
let segmentStopTimer=null;
let lastSegment=-1;
let audioReady=false;
let autoMode=false;
let autoTimer=null;

const SAVE_KEY="hx_infinity_player_progress_v01";

function show(screen){
  [archive,player,ending].forEach(el=>el.hidden=el!==screen);
}

function fmt(sec){
  sec=Math.max(0,Number(sec)||0);
  const m=Math.floor(sec/60);
  const s=Math.floor(sec%60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function saveProgress(){
  if(!currentTrack)return;
  localStorage.setItem(SAVE_KEY,JSON.stringify({
    trackId:currentTrack.id,
    time:voice.currentTime||music.currentTime||0
  }));
}

function loadProgress(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY)||"null")}catch{return null}
}

function renderArchive(){
  $("archiveLogo").src=DATA.logoSrc||"./images/logo.svg";
  const list=$("trackList");
  list.innerHTML="";
  DATA.tracks.forEach(track=>{
    const button=document.createElement("button");
    button.className="track-card";
    button.innerHTML=`
      <span class="num">${String(track.number).padStart(2,"0")}</span>
      <span><strong>${track.title}</strong><small>${track.subtitle||""}</small></span>
      <span class="arrow">›</span>`;
    button.addEventListener("click",()=>openTrack(track.id,0));
    list.appendChild(button);
  });

  const progress=loadProgress();
  if(progress){
    const track=DATA.tracks.find(t=>t.id===progress.trackId);
    if(track){
      $("resumeButton").hidden=false;
      $("resumeMeta").textContent=`REPORT ${String(track.number).padStart(2,"0")} / ${track.title} / ${fmt(progress.time)}`;
      $("resumeButton").onclick=()=>openTrack(track.id,progress.time);
    }
  }
}

function openTrack(id,startAt=0){
  currentTrack=DATA.tracks.find(t=>t.id===id);
  if(!currentTrack)return;

  $("playerTitle").textContent=`REPORT ${String(currentTrack.number).padStart(2,"0")} / ${currentTrack.title}`;
  $("reportNumber").textContent=`REPORT ${String(currentTrack.number).padStart(2,"0")}`;
  $("trackTitle").textContent=currentTrack.title;
  $("trackSubtitle").textContent=currentTrack.subtitle||"";
  $("currentLine").textContent="ACCESSING...";
  $("previousLine").textContent="";
  $("reportState").textContent="ANALYSIS READY";
  document.querySelector(".stage")?.classList.remove("is-reading","is-finale");
  lastSegment=-1;

  music.src=currentTrack.musicSrc;
  voice.src=currentTrack.voiceSrc;
  music.loop=true;
  music.volume=.68;
  voice.volume=1;

  const setTime=()=>{
    try{music.currentTime=startAt;voice.currentTime=startAt}catch{}
  };
  music.addEventListener("loadedmetadata",setTime,{once:true});
  voice.addEventListener("loadedmetadata",setTime,{once:true});

  currentSegmentIndex=0;
  clearTimeout(autoTimer);
  autoTimer=null;
  $("sceneCount").textContent=`1 / ${Math.max(1,currentTrack.segments?.length||1)}`;
  $("storyProgress").style.width=`${100/Math.max(1,currentTrack.segments?.length||1)}%`;
  show(player);
  startMusic(startAt);
  showSegment(0,false);
}

async function startMusic(startAt=0){
  try{
    if(Number.isFinite(startAt)&&music.readyState>0){
      music.currentTime=startAt;
    }
    await music.play();
    playing=true;
    $("playPause").textContent="Ⅱ";
    $("reportState").textContent="OBSERVING";
    startTick();
  }catch(err){
    console.warn(err);
  }
}

function stopSegmentVoice(fadeMs=120){
  clearTimeout(segmentStopTimer);
  segmentStopTimer=null;

  if(voice.paused)return;

  const startVolume=voice.volume;
  const started=performance.now();

  const tick=()=>{
    const p=Math.min(1,(performance.now()-started)/fadeMs);
    voice.volume=startVolume*(1-p);
    if(p<1){
      requestAnimationFrame(tick);
    }else{
      voice.pause();
      voice.volume=1;
    }
  };
  tick();
}

async function playCurrentSegmentVoice(){
  if(!currentTrack)return;
  const segments=currentTrack.segments||[];
  const segment=segments[currentSegmentIndex];
  if(!segment)return;

  clearTimeout(segmentStopTimer);
  stopSegmentVoice(90);

  try{
    voice.currentTime=Math.max(0,Number(segment.time)||0);
    voice.volume=1;
    await voice.play();

    const next=segments[currentSegmentIndex+1];
    if(next){
      const length=Math.max(180,((Number(next.time)||0)-(Number(segment.time)||0))*1000-80);
      segmentStopTimer=setTimeout(()=>stopSegmentVoice(160),length);
    }
  }catch(err){
    console.warn("[H(x) Player] voice segment playback failed:",err);
  }
}

function showSegment(index,playVoice=true){
  const segments=currentTrack?.segments||[];
  if(!segments.length)return;

  currentSegmentIndex=Math.max(0,Math.min(index,segments.length-1));

  const stage=document.querySelector(".stage");
  const isIntro=currentSegmentIndex===0;
  const isFinale=currentSegmentIndex===segments.length-1;
  stage?.classList.toggle("is-reading",!isIntro&&!isFinale);
  stage?.classList.toggle("is-finale",isFinale);

  const segment=segments[currentSegmentIndex];
  const previous=$("previousLine");
  const current=$("currentLine");

  previous.textContent=currentSegmentIndex>0?segments[currentSegmentIndex-1].text:"";
  previous.className="scene-line previous-line visible";

  current.textContent=segment.text;
  current.className="scene-line current-line entering";
  void current.offsetWidth;
  current.classList.add("visible");
  current.classList.remove("entering");

  if(/BUG|H\(x\)|最悪|壊|侵入|反転/.test(segment.text)){
    current.classList.add("glitch");
  }

  $("sceneCount").textContent=`${currentSegmentIndex+1} / ${segments.length}`;
  $("storyProgress").style.width=`${((currentSegmentIndex+1)/segments.length)*100}%`;

  if(playVoice)playCurrentSegmentVoice();
  scheduleAutoAdvance();
}

function scheduleAutoAdvance(){
  clearTimeout(autoTimer);
  autoTimer=null;
  if(!autoMode||!currentTrack)return;

  const segments=currentTrack.segments||[];
  const current=segments[currentSegmentIndex];
  const next=segments[currentSegmentIndex+1];
  let delay=2800;

  if(next&&Number.isFinite(Number(next.time))&&Number.isFinite(Number(current?.time))){
    delay=Math.max(1600,Math.min(9000,(Number(next.time)-Number(current.time))*1000));
  }else{
    delay=Math.max(2200,Math.min(7500,(String(current?.text||"").length*95)+1200));
  }
  autoTimer=setTimeout(()=>advanceSegment(),delay);
}

function toggleAuto(){
  autoMode=!autoMode;
  $("autoButton").classList.toggle("is-active",autoMode);
  $("autoButton").textContent=autoMode?"AUTO ON":"AUTO";
  scheduleAutoAdvance();
}

function advanceSegment(){
  const segments=currentTrack?.segments||[];
  if(!segments.length)return;

  if(currentSegmentIndex>=segments.length-1){
    finishTrack();
    return;
  }

  showSegment(currentSegmentIndex+1,true);
}

function pausePlayback(){
  music.pause();voice.pause();playing=false;$("playPause").textContent="▶";
}

function startTick(){
  clearInterval(timer);
  timer=setInterval(()=>{
    if(!currentTrack)return;
    saveProgress();
    if(music.ended)finishTrack();
  },250);
}


async function fadeAudio(target=0,duration=1200){
  const startMusic=music.volume;
  const startVoice=voice.volume;
  const started=performance.now();
  return new Promise(resolve=>{
    const tick=()=>{
      const p=Math.min(1,(performance.now()-started)/duration);
      music.volume=startMusic+(target-startMusic)*p;
      voice.volume=startVoice+(target-startVoice)*p;
      if(p<1)requestAnimationFrame(tick);
      else resolve();
    };
    tick();
  });
}

async function closeToArchive(){
  clearTimeout(segmentStopTimer);
  segmentStopTimer=null;
  await fadeAudio(0,1200);
  pausePlayback();
  music.currentTime=0;voice.currentTime=0;
  music.volume=.68;voice.volume=1;
  renderArchive();
  show(archive);
}

function finishTrack(){
  clearTimeout(autoTimer);
  autoTimer=null;
  clearInterval(timer);
  clearTimeout(segmentStopTimer);
  segmentStopTimer=null;
  stopSegmentVoice(220);
  music.pause();
  playing=false;
  $("playPause").textContent="▶";
  show(ending);
}

$("backButton").addEventListener("click",closeToArchive);
$("backArchive").addEventListener("click",closeToArchive);
$("playPause").addEventListener("click",()=>{
  if(playing)pausePlayback();
  else startMusic();
});
document.querySelector(".stage").addEventListener("click",event=>{
  if(event.target.closest("button,input,a"))return;
  advanceSegment();
});

$("autoButton").addEventListener("click",toggleAuto);
$("soundButton").addEventListener("click",()=>{
  const muted=!music.muted;
  music.muted=muted;voice.muted=muted;
  $("soundButton").textContent=muted?"×":"♪";
});
$("nextTrack").addEventListener("click",()=>{
  const index=DATA.tracks.findIndex(t=>t.id===currentTrack.id);
  const next=DATA.tracks[index+1];
  if(next)openTrack(next.id,0);
  else closeToArchive();
});
window.addEventListener("pagehide",saveProgress);

renderArchive();
show(archive);
