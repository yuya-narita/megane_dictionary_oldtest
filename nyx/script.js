
const $ = id => document.getElementById(id);
const fileInput=$("fileInput"),dropZone=$("dropZone"),screen=$("screen"),viewport=$("viewport"),
statusEl=$("status"),fileNameEl=$("fileName"),selectedFileEl=$("selectedFile"),
bootLayer=$("bootLayer"),bootText=$("bootText"),cursor=$("cursor"),endLayer=$("endLayer"),
playPause=$("playPause"),playIcon=$("playIcon"),playLabel=$("playLabel"),restartBtn=$("restart"),
speedSelect=$("speed"),soundToggle=$("soundToggle"),exportLog=$("exportLog"),
charReadout=$("charReadout"),lineReadout=$("lineReadout"),progressBar=$("progressBar"),
footerState=$("footerState"),logId=$("logId");

let text="",fileName="",index=0,timer=null,playing=false,booting=false,soundEnabled=true;
let audioContext=null,observationNumber=Math.floor(Math.random()*899+100);

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const format=n=>String(n).padStart(6,"0");

function setStatus(v){statusEl.textContent=v;footerState.textContent=v}
function hideEndLayer(){
  endLayer.hidden=true;
  endLayer.style.display="none";
}
function showEndLayer(){
  endLayer.hidden=false;
  endLayer.style.display="flex";
}
function updateReadouts(){
  charReadout.textContent=`${format(index)} / ${format(text.length)}`;
  lineReadout.textContent=`${String(text ? (text.match(/\n/g)||[]).length+1 : 0).padStart(3,"0")} LINES`;
  progressBar.style.width=text.length?`${index/text.length*100}%`:"0%";
}
async function ensureAudio(){
  if(!audioContext){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC)audioContext=new AC();
  }
  if(audioContext && audioContext.state==="suspended"){
    try{await audioContext.resume()}catch(_){}
  }
  return audioContext;
}
async function unlockAudio(){
  const ctx=await ensureAudio();
  if(!ctx)return;
  try{
    const buffer=ctx.createBuffer(1,1,22050);
    const source=ctx.createBufferSource();
    source.buffer=buffer;
    source.connect(ctx.destination);
    source.start(0);
  }catch(_){}
}
async function tone(freq=760,duration=.025,volume=.018,type="square"){
  if(!soundEnabled)return;
  await ensureAudio(); if(!audioContext)return;
  const osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type=type;osc.frequency.value=freq;
  gain.gain.setValueAtTime(volume,audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);
  osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);
}
function bootTone(){tone(420,.06,.035,"sine");setTimeout(()=>tone(680,.07,.025,"sine"),85)}
function typeTone(ch){if(/\s/.test(ch))return;tone(720+(ch.charCodeAt(0)%150),.017,.010,"square")}
function delayFor(ch){
  const speed=Number(speedSelect.value);
  let d=34;
  if(ch==="。")d=380;
  else if(ch==="、")d=165;
  else if("！？!?".includes(ch))d=290;
  else if(ch==="\n")d=285;
  else if(ch===" "||ch==="　")d=55;
  return d/speed;
}

async function runBootSequence(){
  booting=true;playPause.disabled=true;restartBtn.disabled=true;exportLog.disabled=true;
  cursor.hidden=true;hideEndLayer();bootLayer.classList.remove("hidden");
  const steps=[
    ["LOCAL DATA DETECTED",420],["VERIFYING FILE INTEGRITY",520],["ENCODING / UTF-8",420],
    ["CONTENT ANALYSIS",350],["ANALYSIS DISABLED",550],["DISPLAYING RAW TEXT",460],
    ["OBSERVATION CHANNEL OPEN",560]
  ];
  bootTone();
  for(const [msg,wait] of steps){bootText.textContent=msg;setStatus(msg);await sleep(wait)}
  bootLayer.classList.add("hidden");setStatus("PAUSED");
  playPause.disabled=false;restartBtn.disabled=false;exportLog.disabled=false;booting=false;
  if(innerWidth<681)viewport.scrollIntoView({behavior:"smooth",block:"start"});
  startPlayback();
}
function tick(){
  if(!playing)return;
  if(index>=text.length){finishPlayback();return}
  const ch=text[index++];screen.textContent+=ch;typeTone(ch);
  cursor.hidden=false;viewport.scrollTop=viewport.scrollHeight;hideEndLayer();
updateReadouts();
  timer=setTimeout(tick,delayFor(ch));
}
function startPlayback(){
  if(!text||booting)return;
  if(index>=text.length){index=0;screen.textContent="";hideEndLayer();updateReadouts()}
  clearTimeout(timer);playing=true;setStatus("READING");
  playIcon.textContent="Ⅱ";playLabel.textContent="PAUSE";tick();
}
function pausePlayback(){
  playing=false;clearTimeout(timer);setStatus("PAUSED");
  playIcon.textContent="▶";playLabel.textContent="PLAY";
}
function finishPlayback(){
  playing=false;clearTimeout(timer);index=text.length;updateReadouts();
  setStatus("OBSERVATION COMPLETE");playIcon.textContent="▶";playLabel.textContent="REPLAY";
  cursor.hidden=false;tone(980,.08,.03,"sine");setTimeout(()=>tone(620,.11,.025,"sine"),90);
  setTimeout(()=>{
    showEndLayer();
    viewport.scrollTop=viewport.scrollHeight;
  },1100);
}
async function loadFile(file){
  if(!file)return;
  const lower=file.name.toLowerCase();
  if(!(lower.endsWith(".txt")||lower.endsWith(".md")||file.type.startsWith("text/"))){
    setStatus("UNSUPPORTED FILE");selectedFileEl.textContent="TXT OR MD REQUIRED";return;
  }
  pausePlayback();text=await file.text();fileName=file.name;index=0;screen.textContent="";
  cursor.hidden=true;hideEndLayer();fileNameEl.textContent=file.name;selectedFileEl.textContent=file.name;
  observationNumber=Math.floor(Math.random()*899+100);logId.textContent=`#${observationNumber}`;
  updateReadouts();await runBootSequence();
}


["touchstart","pointerdown","click"].forEach(evt=>{
  document.addEventListener(evt,unlockAudio,{once:true,passive:true});
});

fileInput.addEventListener("change",e=>loadFile(e.target.files[0]));
["dragenter","dragover"].forEach(type=>dropZone.addEventListener(type,e=>{e.preventDefault();dropZone.classList.add("dragover")}));
["dragleave","drop"].forEach(type=>dropZone.addEventListener(type,e=>{e.preventDefault();dropZone.classList.remove("dragover")}));
dropZone.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));

playPause.addEventListener("click",async()=>{await unlockAudio();playing?pausePlayback():startPlayback()});
restartBtn.addEventListener("click",()=>{
  pausePlayback();index=0;screen.textContent="";cursor.hidden=false;hideEndLayer();updateReadouts();setStatus("READY TO REPLAY");
});
soundToggle.addEventListener("click",()=>{
  soundEnabled=!soundEnabled;soundToggle.textContent=soundEnabled?"SOUND ON":"SOUND OFF";
  soundToggle.setAttribute("aria-pressed",String(soundEnabled));if(soundEnabled)tone(700,.06,.025,"sine");
});
exportLog.addEventListener("click",()=>{
  if(!text)return;
  const header=`NYX OBSERVATION LOG #${observationNumber}\nSOURCE: ${fileName}\nENCODING: UTF-8\nSTATUS: RAW TEXT / NO ANALYSIS\n----------------------------------------\n\n`;
  const blob=new Blob([header,text],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`NYX_OBSERVATION_${observationNumber}.txt`;a.click();URL.revokeObjectURL(url);
});
speedSelect.addEventListener("change",()=>{if(playing){clearTimeout(timer);tick()}});
endLayer.addEventListener("click",()=>{hideEndLayer()});
updateReadouts();


document.addEventListener("touchmove",e=>{
  if(innerWidth>680)return;
  const allowed=e.target.closest("#viewport, #controls, select, button, label");
  if(!allowed)e.preventDefault();
},{passive:false});
