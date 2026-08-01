'use strict';

const NYX_ARCHIVES = Array.isArray(window.NYX_ARCHIVES)
  ? window.NYX_ARCHIVES
  : [];

const OFFICIAL_LOGS = Array.isArray(window.NYX_OFFICIAL_LOGS)
  ? window.NYX_OFFICIAL_LOGS
  : [];

const OFFICIAL_LOG = OFFICIAL_LOGS[0] || {
  id: 'official-empty',
  displayId: '#NXS-000',
  title: 'NO OFFICIAL LOG',
  body: '',
  createdAt: new Date().toISOString(),
  official: true
};
function normalizeOfficialLog(log){
 const normalized={...log};
 if(Array.isArray(normalized.segments)&&normalized.segments.length){
  normalized.segments=normalized.segments.map(segment=>({
   time:Number(segment.time)||0,
   text:String(segment.text??'')
  })).sort((a,b)=>a.time-b.time);
  if(!String(normalized.body||'').trim()){
   normalized.body=normalized.segments.map(segment=>segment.text).join('\n\n');
  }
 }else{
  normalized.segments=[];
  normalized.body=String(normalized.body||'');
 }
 normalized.official=normalized.official!==false;
 normalized.createdAt||=new Date().toISOString();
 return normalized;
}
for(let i=0;i<OFFICIAL_LOGS.length;i++)OFFICIAL_LOGS[i]=normalizeOfficialLog(OFFICIAL_LOGS[i]);


const $ = (id) => document.getElementById(id);
const els = {
  screen: $('screen'), cursor: $('cursor'), viewport: $('viewport'), endLayer: $('endLayer'), noTargetLayer: $('noTargetLayer'), standbyLayer: $('standbyLayer'), standbyTarget: $('standbyTarget'), standbyTitle: $('standbyTitle'), standbyId: $('standbyId'), standbyVoice: $('standbyVoice'), standbyLength: $('standbyLength'), cinematicSequence: $('cinematicSequence'), sequenceText: $('sequenceText'),
  editorLayer: $('editorLayer'), readingLayer: $('readingLayer'), titleInput: $('titleInput'), bodyInput: $('bodyInput'),
  editToggle: $('editToggle'),
  recordButton: $('recordButton'), speed: $('speed'), typingSoundToggle: $('typingSoundToggle'),
  fileInput: $('fileInput'), voiceInput: $('voiceInput'), voicePlayer: $('voicePlayer'),
  officialLog: $('officialLog'), officialDialog: $('officialDialog'), officialList: $('officialList'), officialCount: $('officialCount'), newLog: $('newLog'), myLogs: $('myLogs'),
  logsDialog: $('logsDialog'), logsList: $('logsList'), emptyLogs: $('emptyLogs'), savedCount: $('savedCount'),
  saveDialog: $('saveDialog'), writeBar: $('writeBar'), writeMessage: $('writeMessage'), writeDetail: $('writeDetail'),
  status: $('headerState'), modeReadout: $('modeReadout'), fileName: $('fileName'), voiceStatus: $('voiceStatus'), cacheStatus: $('cacheStatus'),
  viewerModeLabel: $('viewerModeLabel'), logId: $('logId'), subjectDisplay: $('subjectDisplay'), subjectRow: $('subjectRow'),
  charReadout: $('charReadout'), lineReadout: $('lineReadout'), progressBar: $('progressBar'), footerState: $('footerState'),
  recordOverlay: $('recordOverlay'), recordTimer: $('recordTimer'), packetValue: $('packetValue'), syncValue: $('syncValue'), memoryValue: $('memoryValue'),
  hostReturn: $('hostReturn'), hostTransition: $('hostTransition'), hostTransitionText: $('hostTransitionText'), hostTransitionSub: $('hostTransitionSub'), returnHint: $('returnHint')
};

let currentLog = structuredClone(OFFICIAL_LOG);
let mode = 'view';
let charIndex = 0;
let playing = false;
let typingTimer = null;
let typingSoundEnabled = true;
let audioContext = null;
let voiceUrl = '';
let recordedBlob = null;
let mediaRecorder = null;
let recordingStream = null;
let recordedChunks = [];
let recordStartedAt = 0;
let recordTimerId = null;
let sequenceTimer = null;
let reviewMode = false;
let tapStart = null;
let editingOfficial = false;
let returningToHost = false;
let activeArchiveType = null;
let activeArchiveIndex = -1;
let gestureMessageTimer = null;
let pinchState = null;
let horizontalTouch = null;
let autosaveTimer = null;
let autosaveDirty = false;
let autosaveInFlight = false;
let autosaveFirstCommitShown = false;
let typingSoundCounter = 0;
let syncMode=false;
let lastSyncedSegmentIndex=-1;
let voiceTimeHandler=null;
let modalReleaseLockTimer = null;
let suppressGhostInputUntil = 0;

const LOGS_KEY = 'nyxObservationLogsV05';

function loadStoredLogs() {
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); }
  catch { return []; }
}
function saveStoredLogs(logs) { localStorage.setItem(LOGS_KEY, JSON.stringify(logs)); updateSavedCount(); }
function updateSavedCount() { els.savedCount.textContent = `${loadStoredLogs().length} LOGS SAVED`; }
function uid() { return `nxs-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function formatNumber(n, len=6) { return String(n).padStart(len, '0'); }
function sanitizeFilename(name) { return (name || 'untitled').replace(/[\\/:*?"<>|]/g, '_').slice(0,80); }

function setNoTarget() {
  stopPlayback();
  closeVoiceUrl();
  currentLog = { id:'', displayId:'#UNASSIGNED', title:'', body:'', official:false };
  mode = 'view';
  reviewMode = false;
  charIndex = 0;
  editingOfficial = false;
  activeArchiveType = null;
  activeArchiveIndex = -1;
  autosaveDirty = false;
  clearTimeout(autosaveTimer);
  markAutosaveState('idle');
  els.noTargetLayer.hidden = false;
  els.standbyLayer.hidden = true;
  els.cinematicSequence.hidden = true;
  els.readingLayer.hidden = true;
  els.editorLayer.hidden = true;
  els.endLayer.hidden = true;
  els.subjectRow.hidden = true;
  els.screen.textContent = '';
  els.cursor.hidden = true;
  els.status.textContent = 'CONNECTED';
  els.modeReadout.textContent = 'STANDBY';
  els.fileName.textContent = 'NO TARGET';
  els.viewerModeLabel.textContent = 'OBSERVATION NODE';
  els.logId.textContent = '#UNASSIGNED';
  els.footerState.textContent = 'SELECT ARCHIVE';
  setVoiceState('NO STREAM');
  updateReadout();
}

function setCurrentLog(log, source = 'local') {
  stopPlayback();
  closeVoiceUrl();
  currentLog = { ...log };
  charIndex = 0;
  mode = 'view';
  reviewMode = false;
  recordedBlob = null;
  autosaveFirstCommitShown = !currentLog.official && !!currentLog.id;
  autosaveDirty = false;
  markAutosaveState('idle');

  els.editorLayer.hidden = true;
  els.noTargetLayer.hidden = true;
  els.readingLayer.hidden = true;
  els.standbyLayer.hidden = false;
  els.cinematicSequence.hidden = true;
  els.endLayer.hidden = true;
  els.subjectRow.hidden = false;
  els.screen.textContent = '';
  els.cursor.hidden = true;
  document.querySelector('.terminal-shell')?.classList.remove('cinematic-active', 'resetting');

  els.standbyTitle.textContent = currentLog.title || 'UNTITLED OBSERVATION';
  els.standbyId.textContent = currentLog.displayId || '#LOCAL';
  els.standbyLength.textContent = `${String((currentLog.body || '').length).padStart(4,'0')} CHARS`;
  els.standbyVoice.textContent = currentLog.audioId ? 'ARCHIVE READY' : 'NO STREAM';
  els.titleInput.value = currentLog.title || '';
  els.bodyInput.value = currentLog.body || '';
  els.subjectDisplay.textContent = currentLog.title || 'UNTITLED OBSERVATION';
  els.logId.textContent = currentLog.displayId || `#${String(currentLog.id || '').slice(-8).toUpperCase()}`;
  els.fileName.textContent = source === 'official' ? 'OFFICIAL-001' : source.toUpperCase();
  els.modeReadout.textContent = 'VIEWER';
  els.viewerModeLabel.textContent = 'OBSERVATION LOG';
  els.footerState.textContent = currentLog.official ? 'READ ONLY SESSION' : 'LOCAL LOG SESSION';
  els.editToggle.textContent = '✎ EDIT';
  els.status.textContent = 'LOCKED';

  if (currentLog.voiceSrc) {
    closeVoiceUrl();
    els.voicePlayer.src = currentLog.voiceSrc;
    els.voicePlayer.load();
    setVoiceState('OFFICIAL STREAM READY');
  } else if (currentLog.audioId) {
    restoreAudioForLog(currentLog.audioId);
  } else {
    setVoiceState('NO STREAM');
  }
  updateReadout();
  els.viewport.scrollTop = 0;
}
function enterEdit(newBlank = false) {
  stopPlayback();
  document.querySelector('.terminal-shell')?.classList.add('cinematic-active');
  editingOfficial = !!currentLog.official;
  mode = 'edit';
  if (newBlank) {
    autosaveFirstCommitShown = false;
    autosaveDirty = false;
    currentLog = { id: uid(), displayId: '#LOCAL-NEW', title: '', body: '', createdAt: new Date().toISOString(), official: false };
    recordedBlob = null; closeVoiceUrl(); setVoiceState('NO STREAM');
  }
  els.titleInput.value = currentLog.title || '';
  els.bodyInput.value = currentLog.body || '';
  els.readingLayer.hidden = true;
  els.noTargetLayer.hidden = true;
  els.standbyLayer.hidden = true;
  els.cinematicSequence.hidden = true;
  els.editorLayer.hidden = false;
  els.subjectRow.hidden = true;
  els.endLayer.hidden = true;
  els.modeReadout.textContent = 'EDITOR';
  els.viewerModeLabel.textContent = 'LOG EDITOR';
  els.logId.textContent = currentLog.displayId || '#LOCAL-NEW';
  els.editToggle.textContent = '◉ PREVIEW';
  els.footerState.textContent = 'WRITE ACCESS ENABLED';
  setTimeout(() => (newBlank ? els.titleInput : els.bodyInput).focus(), 80);
}

function exitEditToPreview() {
  currentLog.title = els.titleInput.value.trim() || 'UNTITLED OBSERVATION';
  currentLog.body = els.bodyInput.value;
  currentLog.official = false;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  setCurrentLog(currentLog, 'draft');
  restoreMobileViewport();
}

function restoreMobileViewport() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    els.viewport.scrollTop = 0;
    document.documentElement.style.removeProperty('--keyboard-height');
  });
  setTimeout(() => window.scrollTo(0, 0), 180);
}

function updateReadout() {
  const total = currentLog.body?.length || 0;
  const lines = total ? currentLog.body.split('\n').length : 0;
  els.charReadout.textContent = `${formatNumber(charIndex)} / ${formatNumber(total)}`;
  els.lineReadout.textContent = `${formatNumber(lines,3)} LINES`;
  els.progressBar.style.width = total ? `${(charIndex / total) * 100}%` : '0%';
}

function delayForChar(char) {
  const speed = Number(els.speed.value) || .5;
  const base = 34 / speed;
  if (char === '\n') return base * 6.4;
  if ('。！？'.includes(char)) return base * 10;
  if ('、，,'.includes(char)) return base * 4.1;
  if ('—…'.includes(char)) return base * 6.5;
  if ('」』）)'.includes(char)) return base * 2.2;
  return base;
}

async function ensureAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
}
function playHudTone({
  start = 820,
  end = 430,
  duration = .05,
  volume = .006,
  type = 'sine',
  filterStart = 1700,
  filterEnd = 620
} = {}) {
  if (!typingSoundEnabled || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40,end), now + duration);
  filter.type = 'lowpass';
  filter.Q.value = .7;
  filter.frequency.setValueAtTime(filterStart, now);
  filter.frequency.exponentialRampToValueAtTime(filterEnd, now + duration);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  osc.connect(filter).connect(gain).connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration + .01);
}

function playDataAirPulse(duration = .045, volume = .0045) {
  if (!typingSoundEnabled || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1,length,audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  filter.type='bandpass';
  filter.frequency.value=1350 + Math.random()*450;
  filter.Q.value=1.8;
  gain.gain.setValueAtTime(volume,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.buffer=buffer;
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(now);
}

function typingTick(char = '') {
  if (!typingSoundEnabled || !audioContext || audioContext.state !== 'running') return;
  typingSoundCounter += 1;
  if (char === '\n') {
    playHudTone({start:540,end:105,duration:.13,volume:.006,type:'sine',filterStart:1100,filterEnd:180});
    return;
  }
  if (!char.trim()) return;
  // Sparse data-stream pulses rather than one game-like beep per character.
  if (typingSoundCounter % 7 === 0 || Math.random() < .055) {
    playDataAirPulse(.028 + Math.random()*.025,.0033 + Math.random()*.0018);
  }
  if (/[。！？—…]/.test(char)) {
    playHudTone({start:680,end:270,duration:.075,volume:.0055,type:'sine'});
  }
}

function playLockTone() {
  if (!audioContext || audioContext.state !== 'running') return;
  playHudTone({start:240,end:690,duration:.11,volume:.011,type:'sine',filterStart:1000,filterEnd:1800});
  setTimeout(()=>playDataAirPulse(.06,.005),75);
}

function playObserveTone() {
  if (!audioContext || audioContext.state !== 'running') return;
  playHudTone({start:105,end:520,duration:.22,volume:.014,type:'sine',filterStart:420,filterEnd:1600});
  setTimeout(()=>playDataAirPulse(.09,.006),135);
}

function playSaveTone() {
  if (!audioContext || audioContext.state !== 'running') return;
  playHudTone({start:190,end:720,duration:.18,volume:.012,type:'sine',filterStart:560,filterEnd:1900});
  setTimeout(()=>playHudTone({start:920,end:610,duration:.09,volume:.007,type:'sine'}),140);
}


function detachVoiceSync(){
 if(voiceTimeHandler){
  els.voicePlayer.removeEventListener('timeupdate',voiceTimeHandler);
  els.voicePlayer.removeEventListener('seeked',voiceTimeHandler);
  voiceTimeHandler=null;
 }
 syncMode=false;
 lastSyncedSegmentIndex=-1;
}
function getVisibleSegmentIndex(time){
 const segments=currentLog.segments||[];
 let index=-1;
 for(let i=0;i<segments.length;i++){
  if(segments[i].time<=time+0.04)index=i;
  else break;
 }
 return index;
}
function renderSyncedSegments(force=false){
 if(!syncMode||!Array.isArray(currentLog.segments))return;
 const nextIndex=getVisibleSegmentIndex(els.voicePlayer.currentTime||0);
 if(!force&&nextIndex===lastSyncedSegmentIndex)return;
 lastSyncedSegmentIndex=nextIndex;
 const visible=nextIndex>=0
  ?currentLog.segments.slice(0,nextIndex+1).map(segment=>segment.text).join('\n\n')
  :'';
 els.screen.textContent=visible;
 charIndex=visible.length;
 els.cursor.hidden=false;
 updateReadout();
 els.viewport.scrollTop=els.viewport.scrollHeight;
}
function enableVoiceSegmentSync(){
 detachVoiceSync();
 if(!currentLog.voiceSrc||!Array.isArray(currentLog.segments)||!currentLog.segments.length)return false;
 syncMode=true;
 voiceTimeHandler=()=>renderSyncedSegments();
 els.voicePlayer.addEventListener('timeupdate',voiceTimeHandler);
 els.voicePlayer.addEventListener('seeked',voiceTimeHandler);
 els.screen.textContent='';
 charIndex=0;
 renderSyncedSegments(true);
 return true;
}
async function startPlayback(){
 if(mode!=='view'||!currentLog.body||playing)return;
 els.endLayer.hidden=true;
 if(charIndex>=currentLog.body.length)resetToStandby(false);
 playing=true;
 els.status.textContent='LINKING';
 els.footerState.textContent='OPENING OBSERVATION SPACE';
 els.standbyLayer.hidden=true;
 els.readingLayer.hidden=true;
 els.cinematicSequence.hidden=false;
 document.querySelector('.terminal-shell')?.classList.add('cinematic-active');
 try{await ensureAudioContext();playObserveTone();}catch{}
 const hasVoiceSync=enableVoiceSegmentSync();
 if(els.voicePlayer.src){
  try{
   if(els.voicePlayer.ended)els.voicePlayer.currentTime=0;
   await els.voicePlayer.play();
   setVoiceState('STREAM ACTIVE');
  }catch{setVoiceState('TAP REQUIRED');}
 }
 const steps=['ESTABLISHING DATA LINK','VOICE CHANNEL VERIFIED','問題ない。','EXPANDING OBSERVATION FIELD'];
 let step=0;
 els.sequenceText.textContent=steps[0];
 clearInterval(sequenceTimer);
 sequenceTimer=setInterval(()=>{
  step+=1;
  if(step<steps.length)els.sequenceText.textContent=steps[step];
 },230);
 setTimeout(()=>{
  clearInterval(sequenceTimer);sequenceTimer=null;
  if(!playing)return;
  els.cinematicSequence.hidden=true;
  els.readingLayer.hidden=false;
  els.status.textContent='OBSERVING';
  els.footerState.textContent=hasVoiceSync?'VOICE SYNCHRONIZED':'LIVE OBSERVATION';
  els.cursor.hidden=false;
  if(!hasVoiceSync)typeNext();
 },760);
}
function typeNext() {
  if (!playing) return;
  const body = currentLog.body;
  if (charIndex >= body.length) { finishPlayback(); return; }
  const char = body[charIndex++];
  els.screen.textContent += char;
  typingTick(char);
  updateReadout();
  els.viewport.scrollTop = els.viewport.scrollHeight;
  typingTimer = setTimeout(typeNext, delayForChar(char));
}
function pausePlayback(){
 playing=false;
 clearTimeout(typingTimer);typingTimer=null;
 clearInterval(sequenceTimer);sequenceTimer=null;
 els.status.textContent='PAUSED';
 els.footerState.textContent=syncMode?'VOICE SYNCHRONIZED / PAUSED':'TOUCH FIELD TO RESUME';
 els.cursor.hidden=true;
 if(!els.voicePlayer.paused)els.voicePlayer.pause();
}
async function resumePlayback(){
 if(mode!=='view'||playing||charIndex<0||charIndex>=(currentLog.body?.length||0))return;
 playing=true;
 els.status.textContent='OBSERVING';
 els.footerState.textContent=syncMode?'VOICE SYNCHRONIZED':'LIVE OBSERVATION';
 els.cursor.hidden=false;
 try{await ensureAudioContext();}catch{}
 if(els.voicePlayer.src){
  try{await els.voicePlayer.play();setVoiceState('STREAM ACTIVE');}
  catch{setVoiceState('TAP REQUIRED');}
 }
 if(!syncMode)typeNext();
}
function stopPlayback(){
 playing=false;
 clearTimeout(typingTimer);typingTimer=null;
 clearInterval(sequenceTimer);sequenceTimer=null;
 try{els.voicePlayer.pause();}catch{}
 detachVoiceSync();
}
function resetToStandby(animate = true) {
  stopPlayback();
  reviewMode = false;
  charIndex = 0;
  els.screen.textContent = '';
  els.endLayer.hidden = true;
  els.readingLayer.hidden = true;
  els.viewport.scrollTop = 0;
  updateReadout();
  if (els.voicePlayer.src) els.voicePlayer.currentTime = 0;

  const shell = document.querySelector('.terminal-shell');
  const finishReset = () => {
    els.cinematicSequence.hidden = true;
    els.standbyLayer.hidden = false;
    shell?.classList.remove('cinematic-active', 'resetting');
    els.status.textContent = 'LOCKED';
    els.footerState.textContent = currentLog.official ? 'READ ONLY SESSION' : 'LOCAL LOG SESSION';
  };

  if (!animate) { finishReset(); return; }
  els.standbyLayer.hidden = true;
  els.cinematicSequence.hidden = false;
  shell?.classList.add('resetting');
  const steps = ['CLEARING LIVE BUFFER','RECALIBRATING TARGET','TARGET LOCK RESTORED'];
  let step = 0;
  els.sequenceText.textContent = steps[0];
  clearInterval(sequenceTimer);
  sequenceTimer = setInterval(() => {
    step += 1;
    if (step < steps.length) els.sequenceText.textContent = steps[step];
  }, 230);
  setTimeout(() => {
    clearInterval(sequenceTimer); sequenceTimer = null;
    finishReset();
  }, 760);
}
function finishPlayback() {
  stopPlayback(); els.cursor.hidden = true; els.readingLayer.hidden = false; els.standbyLayer.hidden = true; els.cinematicSequence.hidden = true; els.endLayer.hidden = false;
  reviewMode = false; els.status.textContent = 'ARCHIVED'; els.footerState.textContent = 'OBSERVATION COMPLETE';
  setVoiceState(els.voicePlayer.src ? 'STREAM CLOSED' : 'NO STREAM');
}

function revealCompletedLog() {
  if (els.endLayer.hidden) return;
  els.endLayer.hidden = true;
  els.readingLayer.hidden = false;
  els.standbyLayer.hidden = true;
  els.screen.textContent = currentLog.body || '';
  charIndex = currentLog.body?.length || 0;
  updateReadout();
  reviewMode = true;
  els.status.textContent = 'ARCHIVE VIEW';
  els.footerState.textContent = 'SUBJECT TAP / RESET TARGET';
  els.viewport.scrollTop = 0;
  els.viewport.focus({ preventScroll: true });
}

function setVoiceState(text) { els.voiceStatus.textContent = text; if (els.standbyVoice) els.standbyVoice.textContent = text; }
function closeVoiceUrl() { if (voiceUrl) URL.revokeObjectURL(voiceUrl); voiceUrl = ''; els.voicePlayer.removeAttribute('src'); els.voicePlayer.load(); }
function attachVoiceBlob(blob, label='LOCAL VOICE') {
  closeVoiceUrl(); voiceUrl = URL.createObjectURL(blob); els.voicePlayer.src = voiceUrl; recordedBlob = blob; setVoiceState(label);
}

async function beginRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    alert('このブラウザでは録音機能を利用できません。HTTPS環境のSafari / Chromeで試してください。'); return;
  }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeCandidates = ['audio/mp4','audio/webm;codecs=opus','audio/webm'];
    const mimeType = mimeCandidates.find(t => MediaRecorder.isTypeSupported?.(t)) || '';
    mediaRecorder = mimeType ? new MediaRecorder(recordingStream,{mimeType}) : new MediaRecorder(recordingStream);
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      attachVoiceBlob(blob, 'RECORDED / READY');
      autosaveDirty = true;
      flushAutosave({cinematic:true});
      recordingStream?.getTracks().forEach(t => t.stop()); recordingStream = null;
    };
    mediaRecorder.start(); recordStartedAt = Date.now();
    els.recordButton.classList.remove('record-ready'); els.recordButton.classList.add('recording'); els.recordButton.innerHTML = '<span class="record-stop" aria-hidden="true">■</span><span class="record-label">STOP REC</span>'; els.recordOverlay.hidden = false;
    els.modeReadout.textContent = 'RECORDING'; setVoiceState('STREAM REC');
    recordTimerId = setInterval(updateRecordTimer,250); updateRecordTimer();
  } catch (err) { alert(`録音を開始できませんでした。\n${err.message || err}`); }
}
function updateRecordTimer(){ const sec=Math.floor((Date.now()-recordStartedAt)/1000); els.recordTimer.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function stopRecording(){ if(mediaRecorder?.state==='recording') mediaRecorder.stop(); clearInterval(recordTimerId); recordTimerId=null; els.recordButton.classList.remove('recording'); els.recordButton.classList.add('record-ready'); els.recordButton.innerHTML='<span class="record-dot" aria-hidden="true">●</span><span class="record-label">RECORD</span>'; els.recordOverlay.hidden=true; els.modeReadout.textContent=mode==='edit'?'EDITOR':'VIEWER'; }

function openDB() {
  return new Promise((resolve,reject)=>{ const req=indexedDB.open('NyxObservationDB',1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('audio')) req.result.createObjectStore('audio'); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
}
async function putAudio(id, blob){ const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction('audio','readwrite'); tx.objectStore('audio').put(blob,id); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function getAudio(id){ const db=await openDB(); return new Promise((res,rej)=>{ const req=db.transaction('audio').objectStore('audio').get(id); req.onsuccess=()=>res(req.result||null); req.onerror=()=>rej(req.error); }); }
async function deleteAudio(id){ if(!id)return; const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction('audio','readwrite'); tx.objectStore('audio').delete(id); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function restoreAudioForLog(audioId){ try{ const blob=await getAudio(audioId); if(blob) attachVoiceBlob(blob,'ARCHIVE READY'); else setVoiceState('AUDIO MISSING'); }catch{ setVoiceState('AUDIO ERROR'); } }

function hasMeaningfulDraft() {
  const title = mode === 'edit' ? els.titleInput.value.trim() : (currentLog.title || '').trim();
  const body = mode === 'edit' ? els.bodyInput.value.trim() : (currentLog.body || '').trim();
  return Boolean(title || body || recordedBlob || currentLog.audioId);
}

function markAutosaveState(state) {
  const label = state === 'syncing' ? 'SYNCING' : state === 'synced' ? 'SYNCED' : 'LOCAL OK';
  els.cacheStatus.textContent = label;
  els.memoryValue.textContent = state === 'syncing' ? 'SYNCING' : state === 'synced' ? 'SYNCED' : 'STABLE';
  els.cacheStatus.classList.toggle('syncing',state==='syncing');
  els.cacheStatus.classList.toggle('synced',state==='synced');
  els.memoryValue.classList.toggle('syncing',state==='syncing');
  els.memoryValue.classList.toggle('synced',state==='synced');
}

function scheduleAutosave({ cinematic = false, delay = 760 } = {}) {
  autosaveDirty = true;
  markAutosaveState('syncing');
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => autosaveCurrentLog({ cinematic }), delay);
}

async function autosaveCurrentLog({ cinematic = false, force = false } = {}) {
  if (autosaveInFlight) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
  if (!hasMeaningfulDraft()) {
    autosaveDirty = false;
    markAutosaveState('idle');
    return;
  }
  if (!autosaveDirty && !force) return;
  autosaveInFlight = true;
  try {
    if (mode === 'edit') {
      currentLog.title = els.titleInput.value.trim() || 'UNTITLED OBSERVATION';
      currentLog.body = els.bodyInput.value;
    }
    if (editingOfficial) {
      localStorage.setItem('nyxOfficialModificationPending','1');
      currentLog = {
        ...currentLog,
        segments: [],
        voiceSrc: null,
        id:uid(),
        displayId:`#LOCAL-${String(Date.now()).slice(-4)}`,
        official:false,
        sourceOfficialId:currentLog.displayId || '#NXS-001',
        createdAt:new Date().toISOString()
      };
      editingOfficial = false;
    }
    currentLog.official = false;
    currentLog.updatedAt = new Date().toISOString();
    currentLog.createdAt ||= currentLog.updatedAt;
    currentLog.id ||= uid();
    currentLog.displayId ||= `#LOCAL-${String(Date.now()).slice(-4)}`;

    if (recordedBlob) {
      currentLog.audioId = currentLog.audioId || `audio-${currentLog.id}`;
      await putAudio(currentLog.audioId,recordedBlob);
      recordedBlob = null;
    }

    const logs = loadStoredLogs();
    const existing = logs.findIndex(l => l.id === currentLog.id);
    const stored = {
      id:currentLog.id,
      displayId:currentLog.displayId,
      title:currentLog.title,
      body:currentLog.body,
      createdAt:currentLog.createdAt,
      updatedAt:currentLog.updatedAt,
      audioId:currentLog.audioId || null,
      sourceOfficialId:currentLog.sourceOfficialId || null
    };
    if (existing >= 0) logs[existing] = stored;
    else logs.unshift(stored);
    saveStoredLogs(logs);
    currentLog = {...stored};
    autosaveDirty = false;
    markAutosaveState('synced');

    const shouldShow = cinematic;
    if (shouldShow) {
      autosaveFirstCommitShown = true;
      await showSaveSequence();
      try { await ensureAudioContext(); playSaveTone(); } catch {}
    }
  } finally {
    autosaveInFlight = false;
  }
}

async function flushAutosave({ cinematic = false } = {}) {
  clearTimeout(autosaveTimer);
  if (autosaveDirty || recordedBlob || (cinematic && hasMeaningfulDraft())) {
    await autosaveCurrentLog({ cinematic, force:true });
  }
}
function showSaveSequence(){ return new Promise(resolve=>{ els.writeMessage.textContent='WRITING LOG...'; els.writeDetail.textContent='VERIFYING DATA'; els.writeBar.style.width='0%'; els.saveDialog.showModal(); requestAnimationFrame(()=>els.writeBar.style.width='72%'); setTimeout(()=>{ els.writeMessage.textContent='LOG SAVED.'; els.writeDetail.textContent='NXS // LOCAL STORAGE'; els.writeBar.style.width='100%'; },620); setTimeout(()=>{ els.saveDialog.close(); resolve(); },1250); }); }


function getArchiveLogs(type = activeArchiveType) {
  if (type === 'official') return OFFICIAL_LOGS.map(log => structuredClone(log));
  if (type === 'my') return loadStoredLogs();
  return [];
}

function setArchiveContext(type, index) {
  activeArchiveType = type;
  activeArchiveIndex = index;
}

function showGestureMessage(title, detail = '', duration = 720) {
  let node = document.getElementById('gestureMessage');
  if (!node) {
    node = document.createElement('div');
    node.id = 'gestureMessage';
    node.className = 'gesture-message';
    node.innerHTML = '<strong></strong><small></small>';
    document.querySelector('.terminal-shell')?.append(node);
  }
  node.querySelector('strong').textContent = title;
  node.querySelector('small').textContent = detail;
  node.querySelector('small').hidden = !detail;
  clearTimeout(gestureMessageTimer);
  requestAnimationFrame(() => node.classList.add('visible'));
  gestureMessageTimer = setTimeout(() => node.classList.remove('visible'), duration);
}

async function retargetLog(direction) {
  if (els.standbyLayer.hidden || mode !== 'view') return false;
  const logs = getArchiveLogs();
  if (!logs.length || activeArchiveIndex < 0) return false;
  if (logs.length === 1) {
    showGestureMessage('NO ADJACENT TARGET', 'このアーカイブには1件だけだ。');
    return true;
  }
  activeArchiveIndex = (activeArchiveIndex + direction + logs.length) % logs.length;
  const nextLog = logs[activeArchiveIndex];
  const shell = document.querySelector('.terminal-shell');
  shell?.style.setProperty('--retarget-shift', `${direction > 0 ? 24 : -24}px`);
  shell?.classList.remove('retargeting');
  void shell?.offsetWidth;
  shell?.classList.add('retargeting');
  try { await ensureAudioContext(); playLockTone(); } catch {}
  setCurrentLog(nextLog, nextLog.official ? 'official' : 'archive');
  setTimeout(() => shell?.classList.remove('retargeting'), 460);
  showGestureMessage('TARGET UPDATED', nextLog.displayId || 'LOCAL ARCHIVE', 560);
  return true;
}

function expandCompleteLogByGesture() {
  if (!currentLog.body || mode !== 'view') return;
  stopPlayback();
  els.endLayer.hidden = true;
  els.cinematicSequence.hidden = true;
  els.standbyLayer.hidden = true;
  els.readingLayer.hidden = false;
  els.screen.textContent = currentLog.body;
  charIndex = currentLog.body.length;
  reviewMode = true;
  updateReadout();
  els.cursor.hidden = true;
  els.status.textContent = 'ARCHIVE VIEW';
  els.footerState.textContent = 'PINCH IN / COLLAPSE TARGET';
  els.viewport.scrollTop = 0;
  const shell = document.querySelector('.terminal-shell');
  shell?.classList.add('full-log-mode');
  setTimeout(()=>shell?.classList.remove('full-log-mode'),380);
  showGestureMessage('COMPLETE LOG EXPANDED', '全文表示。縦スクロール可能。', 820);
}

function collapseToTargetByGesture() {
  if (!currentLog.body || mode !== 'view' || !els.standbyLayer.hidden) return;
  resetToStandby(true);
  showGestureMessage('OBSERVATION FIELD COLLAPSED', 'TARGET LOCKED', 700);
}

function denyHorizontalDuringObservation() {
  showGestureMessage('ACCESS DENIED', '観測中だ。', 620);
}

async function deleteLocalLogNative(log) {
  const title = log.title || 'UNTITLED OBSERVATION';
  const approved = window.confirm(`「${title}」\nを削除しますか？`);
  if (!approved) return;
  await deleteAudio(log.audioId);
  saveStoredLogs(loadStoredLogs().filter(x => x.id !== log.id));
  renderLogs();
  showGestureMessage('LOG REMOVED.', '', 520);
}

function lockUnderlyingTerminalAfterDialog(ms = 520) {
  suppressGhostInputUntil = Date.now() + ms;
  document.body.classList.add('modal-release-lock');
  clearTimeout(modalReleaseLockTimer);
  modalReleaseLockTimer = setTimeout(() => {
    document.body.classList.remove('modal-release-lock');
  }, ms);
}

// iOS may dispatch a delayed synthetic click at the position where a modal card
// was tapped, after the dialog has already disappeared. Capture and discard it.
['click','pointerup','touchend'].forEach(type => {
  document.addEventListener(type, event => {
    if (Date.now() >= suppressGhostInputUntil) return;
    const dialog = event.target.closest?.('dialog');
    if (dialog?.open) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture:true, passive:false });
});

function makeArchiveCard(log, { deletable = false, archiveType = null, archiveIndex = -1 } = {}) {
  const isOfficial = archiveType === 'official' || !!log.official;
  const card = document.createElement('article');
  card.className = `log-card tappable-card archive-swipe-card${deletable ? ' local-card' : ' official-card'}`;
  card.tabIndex = 0;
  card.setAttribute('role','button');

  const openUnderlay = document.createElement('div');
  openUnderlay.className = 'swipe-open-underlay';
  openUnderlay.textContent = 'OPEN  ›';

  const leftUnderlay = document.createElement('div');
  leftUnderlay.className = isOfficial ? 'swipe-lock-underlay' : 'swipe-delete-underlay';
  leftUnderlay.textContent = isOfficial ? 'WRITE PROTECTED' : '削除';

  const content = document.createElement('div');
  content.className = 'swipe-card-content';

  const h = document.createElement('h3');
  h.textContent = log.title || 'UNTITLED OBSERVATION';

  const p = document.createElement('p');
  const stamp = new Date(log.updatedAt || log.createdAt).toLocaleString('ja-JP');
  const mediaState = log.voiceSrc || log.audioId
    ? 'VOICE ATTACHED'
    : (isOfficial ? 'NXS OFFICIAL' : 'TEXT ONLY');
  p.textContent = `${stamp} / ${mediaState}`;

  const arrow = document.createElement('span');
  arrow.className = 'archive-arrow';
  arrow.textContent = 'OPEN  ›';

  content.append(h,p,arrow);
  card.append(openUnderlay,leftUnderlay,content);

  const openLog = ({ gesture = false } = {}) => {
    lockUnderlyingTerminalAfterDialog();
    if (gesture) {
      card.classList.add('opening');
      showGestureMessage('TARGET ACQUIRED', log.displayId || 'LOCAL LOG', 430);
    }
    const finish = () => {
      els.logsDialog.open && els.logsDialog.close();
      els.officialDialog.open && els.officialDialog.close();
      if (archiveType) setArchiveContext(archiveType, archiveIndex);
      setCurrentLog(log, isOfficial ? 'official' : 'archive');
      showGestureMessage('OBSERVATION TARGET LOCKED', log.displayId || 'LOCAL LOG', 640);
      ensureAudioContext().then(playLockTone).catch(()=>{});
      card.classList.remove('opening');
    };
    gesture ? setTimeout(finish, 170) : finish();
  };

  let touch = null;
  let ignoreClickUntil = 0;

  content.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touch = { x:t.clientX, y:t.clientY, dx:0, dy:0 };
    card.classList.add('swiping');
  }, { passive:true });

  content.addEventListener('touchmove', e => {
    if (!touch || e.touches.length !== 1) return;
    const t = e.touches[0];
    touch.dx = t.clientX - touch.x;
    touch.dy = t.clientY - touch.y;
    if (Math.abs(touch.dx) > 8 && Math.abs(touch.dx) > Math.abs(touch.dy) * 1.18) {
      e.preventDefault();
      const amount = Math.max(-116, Math.min(116, touch.dx));
      content.style.transform = `translateX(${amount}px)`;
      card.classList.toggle('open-armed', amount > 78);
      card.classList.toggle('left-armed', amount < -78);
    }
  }, { passive:false });

  content.addEventListener('touchend', event => {
    if (!touch) return;
    const { dx,dy } = touch;
    touch = null;
    card.classList.remove('swiping');
    content.style.transform = '';
    card.classList.remove('open-armed','left-armed');
    ignoreClickUntil = Date.now() + 450;

    if (dx > 78 && Math.abs(dx) > Math.abs(dy) * 1.18) {
      event.preventDefault();
      event.stopPropagation();
      openLog({ gesture:true });
      return;
    }

    if (dx < -78 && Math.abs(dx) > Math.abs(dy) * 1.18) {
      event.preventDefault();
      event.stopPropagation();
      if (isOfficial) {
        showGestureMessage('WRITE PROTECTED', '改変は禁止。', 720);
        ensureAudioContext().then(() => playHudTone({
          start:310,end:175,duration:.095,volume:.007,type:'sine',
          filterStart:760,filterEnd:240
        })).catch(()=>{});
      } else {
        deleteLocalLogNative(log);
      }
      return;
    }

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      event.preventDefault();
      event.stopPropagation();
      openLog();
    }
  }, { passive:false });

  content.addEventListener('touchcancel', () => {
    touch = null;
    card.classList.remove('swiping','open-armed','left-armed');
    content.style.transform = '';
  }, { passive:true });

  content.addEventListener('click', e => {
    if (Date.now() < ignoreClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!('ontouchstart' in window)) openLog();
  });

  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLog();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isOfficial) {
      e.preventDefault();
      deleteLocalLogNative(log);
    }
  });

  return card;
}
function renderOfficialLogs() {
  els.officialList.innerHTML = '';

  const archives = NYX_ARCHIVES.length
    ? NYX_ARCHIVES
    : [{
        id:'legacy',
        protocol:'silent_packet://nxs-observe',
        title:'OFFICIAL LOGS',
        description:'LEGACY ARCHIVE',
        logs:OFFICIAL_LOGS
      }];

  archives.forEach((archive, archiveIndex) => {
    const section = document.createElement('section');
    section.className = 'official-archive-group';
    section.dataset.archiveId = archive.id || `archive-${archiveIndex}`;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'official-archive-header';
    header.setAttribute('aria-expanded', archiveIndex === 0 ? 'true' : 'false');

    const headerText = document.createElement('span');
    headerText.className = 'official-archive-header-text';

    const protocol = document.createElement('small');
    protocol.textContent = archive.protocol || 'silent_packet://unknown';

    const title = document.createElement('strong');
    title.textContent = archive.title || 'UNTITLED ARCHIVE';

    const meta = document.createElement('em');
    meta.textContent = `${String((archive.logs || []).length).padStart(2,'0')} LOGS / ${archive.description || 'NXS STORAGE'}`;

    const chevron = document.createElement('b');
    chevron.className = 'official-archive-chevron';
    chevron.textContent = archiveIndex === 0 ? '−' : '+';

    headerText.append(protocol,title,meta);
    header.append(headerText,chevron);

    const body = document.createElement('div');
    body.className = 'official-archive-body';
    body.hidden = archiveIndex !== 0;

    const logs = Array.isArray(archive.logs) ? archive.logs : [];

    logs.forEach((rawLog,index) => {
      const log = normalizeOfficialLog({
        ...rawLog,
        archiveId: rawLog.archiveId || archive.id,
        archiveProtocol: archive.protocol,
        archiveTitle: archive.title
      });

      body.append(
        makeArchiveCard(log,{
          archiveType:'official',
          archiveIndex:OFFICIAL_LOGS.findIndex(item => item.id === log.id)
        })
      );
    });

    header.addEventListener('click',() => {
      const willOpen = body.hidden;
      body.hidden = !willOpen;
      header.setAttribute('aria-expanded',String(willOpen));
      chevron.textContent = willOpen ? '−' : '+';
    });

    section.append(header,body);
    els.officialList.append(section);
  });
}

function renderLogs() {
  const logs = loadStoredLogs(); els.logsList.innerHTML=''; els.emptyLogs.hidden = logs.length>0;
  logs.forEach((log,index) => els.logsList.append(makeArchiveCard(log,{deletable:true,archiveType:'my',archiveIndex:index})));
}


els.standbyTarget.addEventListener('click', startPlayback);
els.endLayer.addEventListener('click', revealCompletedLog);
els.endLayer.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealCompletedLog(); } });
els.editorLayer.addEventListener('focusout', () => setTimeout(() => {
  if (!els.editorLayer.contains(document.activeElement)) restoreMobileViewport();
}, 80));
els.editToggle.addEventListener('click',async()=>{
  if(mode==='edit'){
    await flushAutosave({cinematic:true});
    exitEditToPreview();
  }else enterEdit(false);
});
els.newLog.addEventListener('click',()=>enterEdit(true));
els.officialLog.addEventListener('click',()=>{renderOfficialLogs();els.officialDialog.showModal();});
els.myLogs.addEventListener('click',()=>{renderLogs();els.logsDialog.showModal();});
els.recordButton.addEventListener('click',()=> mediaRecorder?.state==='recording' ? stopRecording() : beginRecording());
els.typingSoundToggle.addEventListener('click',async()=>{ typingSoundEnabled=!typingSoundEnabled; els.typingSoundToggle.textContent=`TYPE SOUND ${typingSoundEnabled?'ON':'OFF'}`; els.typingSoundToggle.setAttribute('aria-pressed',String(typingSoundEnabled)); if(typingSoundEnabled)try{await ensureAudioContext()}catch{} });
els.fileInput.addEventListener('change',async e=>{ const file=e.target.files?.[0]; if(!file)return; const body=await file.text(); setCurrentLog({id:uid(),displayId:'#LOCAL-FILE',title:file.name.replace(/\.(txt|md)$/i,''),body,createdAt:new Date().toISOString(),official:false},'file');  e.target.value=''; });
els.voiceInput.addEventListener('change',e=>{ const file=e.target.files?.[0]; if(!file)return; attachVoiceBlob(file,'LOCAL FILE READY');  e.target.value=''; });
els.bodyInput.addEventListener('input',()=>scheduleAutosave({delay:850}));
els.titleInput.addEventListener('input',()=>scheduleAutosave({delay:850}));

els.viewport.addEventListener('pointerdown', e => {
  if (mode !== 'view' || !els.endLayer.hidden || !els.editorLayer.hidden) return;
  tapStart = { x:e.clientX, y:e.clientY, t:Date.now() };
});
els.viewport.addEventListener('pointerup', e => {
  if (!tapStart || mode !== 'view' || !els.endLayer.hidden || !els.editorLayer.hidden) { tapStart = null; return; }
  const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
  const elapsed = Date.now() - tapStart.t;
  tapStart = null;
  if (moved > 12 || elapsed > 650 || !els.standbyLayer.hidden || !els.cinematicSequence.hidden || reviewMode) return;
  if (playing) pausePlayback(); else if (charIndex > 0 && charIndex < (currentLog.body?.length || 0)) resumePlayback();
});
els.subjectRow.addEventListener('click', () => { if (reviewMode) resetToStandby(true); });
els.voicePlayer.addEventListener('ended',()=>{
 if(syncMode&&currentLog.segments?.length){
  els.screen.textContent=currentLog.segments.map(segment=>segment.text).join('\n\n');
  charIndex=els.screen.textContent.length;
  updateReadout();
 }
 setVoiceState('STREAM CLOSED');
 if(playing)finishPlayback();
});

['dragenter','dragover'].forEach(type=>$('dropZone').addEventListener(type,e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}));
$('dropZone').addEventListener('drop',async e=>{
  e.preventDefault();
  const file=e.dataTransfer.files?.[0]; if(!file)return;
  if(file.type.startsWith('audio/')){
    attachVoiceBlob(file,'LOCAL FILE READY');
  }else{
    const body=await file.text();
    setCurrentLog({id:uid(),displayId:'#LOCAL-FILE',title:file.name.replace(/\.[^.]+$/,''),body,createdAt:new Date().toISOString(),official:false},'file');
  }
  autosaveDirty=true;
  await flushAutosave({cinematic:true});
});


/* v1.0.6.1 TARGET / PLAYBACK GESTURES */
function distanceBetweenTouches(touches) {
  const a = touches[0], b = touches[1];
  return Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
}

els.viewport.addEventListener('touchstart', e => {
  if (mode !== 'view' || document.querySelector('dialog[open]')) return;
  if (e.touches.length === 2) {
    pinchState = {
      start:distanceBetweenTouches(e.touches),
      last:distanceBetweenTouches(e.touches)
    };
    horizontalTouch = null;
    return;
  }
  if (e.touches.length !== 1) return;
  const t=e.touches[0];
  horizontalTouch={x:t.clientX,y:t.clientY,dx:0,dy:0};
},{passive:true});

els.viewport.addEventListener('touchmove', e => {
  if (pinchState && e.touches.length === 2) {
    pinchState.last=distanceBetweenTouches(e.touches);
    if (Math.abs(pinchState.last-pinchState.start)>12) e.preventDefault();
    return;
  }
  if (!horizontalTouch || e.touches.length !== 1) return;
  const t=e.touches[0];
  horizontalTouch.dx=t.clientX-horizontalTouch.x;
  horizontalTouch.dy=t.clientY-horizontalTouch.y;
  if (Math.abs(horizontalTouch.dx)>18 && Math.abs(horizontalTouch.dx)>Math.abs(horizontalTouch.dy)*1.25) {
    e.preventDefault();
    if (!els.standbyLayer.hidden) {
      els.standbyTarget.classList.add('swipe-ready');
      const shell=document.querySelector('.terminal-shell');
      shell?.style.setProperty('--retarget-shift',`${horizontalTouch.dx*.08}px`);
    }
  }
},{passive:false});

els.viewport.addEventListener('touchend', async e => {
  if (pinchState && e.touches.length < 2) {
    const ratio=pinchState.start ? pinchState.last/pinchState.start : 1;
    pinchState=null;
    if (ratio>1.18) expandCompleteLogByGesture();
    else if (ratio<.82) collapseToTargetByGesture();
    return;
  }
  if (!horizontalTouch) return;
  const {dx,dy}=horizontalTouch;
  horizontalTouch=null;
  els.standbyTarget.classList.remove('swipe-ready');
  if (Math.abs(dx)<68 || Math.abs(dx)<Math.abs(dy)*1.25) return;
  if (!els.standbyLayer.hidden) {
    await retargetLog(dx<0 ? 1 : -1);
    return;
  }
  if (playing || (!els.readingLayer.hidden && !reviewMode)) {
    denyHorizontalDuringObservation();
  }
},{passive:true});

els.viewport.addEventListener('touchcancel',()=>{
  pinchState=null;
  horizontalTouch=null;
  els.standbyTarget.classList.remove('swipe-ready');
},{passive:true});

setInterval(()=>{
  els.packetValue.textContent=`${(Math.random()*.04).toFixed(2)}%`;
  els.syncValue.textContent=`${String(Math.floor(8+Math.random()*19)).padStart(3,'0')} ms`;
  if(!autosaveDirty && !autosaveInFlight && !els.memoryValue.classList.contains('synced')){
    els.memoryValue.textContent=Math.random()>.08?'STABLE':'SYNCING';
  }
},2400);

updateSavedCount();
renderOfficialLogs();
initializeV08();


/* v0.8 HOST LINK / GESTURE INTERFACE */
function playHostStoreSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = audioContext || new Ctx();
    audioContext = ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + .48);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + .48);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.055, now + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .5);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + .52);
  } catch {}
}

function resolveHostDestination() {
  const params = new URLSearchParams(location.search);
  return params.get('host') || document.body.dataset.hostUrl || '';
}

function navigateToHost() {
  const destination = resolveHostDestination();
  try { window.parent?.postMessage({ type:'NYX_RETURN_TO_HOST', source:'nyx-observation-terminal-v1.0.6.1' }, '*'); } catch {}
  if (destination) { location.href = destination; return; }
  if (history.length > 1) { history.back(); return; }
  // Standalone preview fallback: return to idle terminal instead of trapping the user.
  returningToHost = false;
  els.hostTransition.hidden = true;
  document.querySelector('.terminal-shell')?.classList.remove('host-returning');
  document.querySelector('.terminal-shell').style.removeProperty('transform');
  document.querySelector('.terminal-shell').style.removeProperty('opacity');
  setNoTarget();
}

async function returnToHost(source = 'button') {
  if (returningToHost) return;
  returningToHost = true;
  stopPlayback();
  if (mediaRecorder?.state === 'recording') stopRecording();
  await flushAutosave({cinematic:false});
  els.status.textContent = 'ARCHIVING';
  els.footerState.textContent = source === 'gesture' ? 'GESTURE LINK / HOST' : 'HOST LINK / RETURN';
  els.hostTransitionText.textContent = source === 'gesture' ? 'HOST LINK RESTORED...' : 'RETURNING TO HOST...';
  els.hostTransitionSub.textContent = source === 'gesture' ? 'また来い。' : '観測終了。';
  els.hostTransition.hidden = false;
  playHostStoreSound();
  const shell = document.querySelector('.terminal-shell');
  shell.style.removeProperty('transform');
  shell.classList.remove('host-dragging');
  shell.classList.add('host-returning');
  localStorage.setItem('nyxHostGestureSeen', '1');
  setTimeout(navigateToHost, 560);
}

els.hostReturn.addEventListener('click', () => returnToHost('button'));

let hostTouch = null;
const shell = document.querySelector('.terminal-shell');
function viewportIsAtTop() { return els.viewport.hidden || els.viewport.scrollTop <= 2; }
shell.addEventListener('touchstart', e => {
  if (returningToHost || e.touches.length !== 1 || mode === 'edit' || document.querySelector('dialog[open]')) return;
  const t = e.touches[0];
  hostTouch = { x:t.clientX, y:t.clientY, dy:0, active:false };
}, { passive:true });
shell.addEventListener('touchmove', e => {
  if (!hostTouch || e.touches.length !== 1 || returningToHost) return;
  const t = e.touches[0];
  const dx = t.clientX - hostTouch.x;
  const dy = t.clientY - hostTouch.y;
  if (dy <= 0 || Math.abs(dx) > Math.abs(dy) * .72 || !viewportIsAtTop()) return;
  if (dy > 14) hostTouch.active = true;
  if (!hostTouch.active) return;
  e.preventDefault();
  hostTouch.dy = Math.min(dy, 180);
  shell.classList.add('host-dragging');
  const progress = Math.min(hostTouch.dy / 130, 1);
  shell.style.transform = `translateY(${hostTouch.dy * .42}px) scale(${1 - progress * .035})`;
  shell.style.opacity = String(1 - progress * .16);
  if (hostTouch.dy > 28) els.returnHint.classList.add('visible');
  if (hostTouch.dy > 108) els.returnHint.innerHTML = '<span>↓</span> RELEASE TO HOST';
  else els.returnHint.innerHTML = '<span>↓</span> RETURN TO HOST';
}, { passive:false });
shell.addEventListener('touchend', () => {
  if (!hostTouch) return;
  const trigger = hostTouch.active && hostTouch.dy > 108;
  hostTouch = null;
  els.returnHint.classList.remove('visible');
  if (trigger) { returnToHost('gesture'); return; }
  shell.classList.remove('host-dragging');
  shell.style.removeProperty('transform');
  shell.style.removeProperty('opacity');
}, { passive:true });
shell.addEventListener('touchcancel', () => {
  hostTouch = null;
  els.returnHint.classList.remove('visible');
  shell.classList.remove('host-dragging');
  shell.style.removeProperty('transform');
  shell.style.removeProperty('opacity');
}, { passive:true });

function showFirstGestureHint() {
  if (localStorage.getItem('nyxHostGestureSeen')) return;
  setTimeout(() => {
    if (returningToHost) return;
    els.returnHint.innerHTML = '<span>↓</span> SWIPE DOWN TO HOST';
    els.returnHint.classList.add('visible');
    setTimeout(() => els.returnHint.classList.remove('visible'), 2300);
  }, 1500);
}

function showOfficialRecoveryIfNeeded() {
  if (!localStorage.getItem('nyxOfficialModificationPending')) return;
  localStorage.removeItem('nyxOfficialModificationPending');
  els.hostTransitionText.textContent = 'UNAUTHORIZED MODIFICATION DETECTED';
  els.hostTransitionSub.textContent = 'RESTORING OFFICIAL ARCHIVE...';
  els.hostTransition.hidden = false;
  setTimeout(() => { els.hostTransitionText.textContent = 'RESTORE COMPLETE.'; els.hostTransitionSub.textContent = '改変は禁止。'; }, 850);
  setTimeout(() => { els.hostTransition.hidden = true; }, 1650);
}

function initializeV08() {
  setNoTarget();
  showOfficialRecoveryIfNeeded();
  showFirstGestureHint();
}
