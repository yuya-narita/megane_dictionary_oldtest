'use strict';

const OFFICIAL_LOG = {
  id: 'official-001',
  displayId: '#NXS-001',
  title: 'カップ麺の麺径と満足感の関係について',
  body: `…アクセスログ検知。\n\nsilent_packet://nxs-observe\n読み取り専用で開放する。\n\n改変は禁止。\n見るだけな。\n\nカップ麺は味で選ばれていない。\n少なくとも、\n満足感は味では決まってない。\n\n重要なのは——\n麺の太さだ。\n\n正確には、\n噛んだ瞬間の反発時間。\n\n細麺は情報量が多い。\n\nスープを持ち上げるし、\n口に入る本数も多い。\n\nだから一口目は強い。\n\nでも、\n満足は続かない。\n\n脳が\n「これは軽食だ」\nと分類するから。\n\n一方、太麺。\n\nこいつは違う。\n\n一本ごとの存在感がある。\n\n噛んだとき、\n歯が「仕事をした」と錯覚する。\n\nこの錯覚が\n満腹の前借りを起こす。\n\nつまり満足感とは、\n\n味の濃さではなく\n咀嚼の物理量\n\nで決まる。\n\nこれはもう\n料理の話じゃない。\n\nUI設計の話だ。\n\nカップ麺メーカーは\nスープを改良してるつもりでいるけど、\n\n本当は\n麺の直径を0.3mm変えた方が売上に効く。\n\n統計は取ってない。\nでも、たぶん合ってる。\n\n「満足感は味じゃない。\n歯がどれだけ\n仕事した気になるかだ。」\n\nNXS // OBSERVE LOG\nニクスのどうでもいい観測`,
  createdAt: '2026-02-04T16:26:00+09:00',
  official: true
};

const $ = (id) => document.getElementById(id);
const els = {
  screen: $('screen'), cursor: $('cursor'), viewport: $('viewport'), endLayer: $('endLayer'),
  editorLayer: $('editorLayer'), readingLayer: $('readingLayer'), titleInput: $('titleInput'), bodyInput: $('bodyInput'),
  playPause: $('playPause'), playIcon: $('playIcon'), playLabel: $('playLabel'), restart: $('restart'), editToggle: $('editToggle'),
  recordButton: $('recordButton'), saveLog: $('saveLog'), speed: $('speed'), typingSoundToggle: $('typingSoundToggle'),
  fileInput: $('fileInput'), voiceInput: $('voiceInput'), voicePlayer: $('voicePlayer'),
  officialLog: $('officialLog'), newLog: $('newLog'), myLogs: $('myLogs'),
  logsDialog: $('logsDialog'), logsList: $('logsList'), emptyLogs: $('emptyLogs'), savedCount: $('savedCount'),
  saveDialog: $('saveDialog'), writeBar: $('writeBar'), writeMessage: $('writeMessage'), writeDetail: $('writeDetail'),
  status: $('headerState'), modeReadout: $('modeReadout'), fileName: $('fileName'), voiceStatus: $('voiceStatus'), cacheStatus: $('cacheStatus'),
  viewerModeLabel: $('viewerModeLabel'), logId: $('logId'), subjectDisplay: $('subjectDisplay'), subjectRow: $('subjectRow'),
  charReadout: $('charReadout'), lineReadout: $('lineReadout'), progressBar: $('progressBar'), footerState: $('footerState'),
  recordOverlay: $('recordOverlay'), recordTimer: $('recordTimer'), packetValue: $('packetValue'), syncValue: $('syncValue'), memoryValue: $('memoryValue')
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

function setCurrentLog(log, source = 'local') {
  stopPlayback();
  closeVoiceUrl();
  currentLog = { ...log };
  charIndex = 0;
  mode = 'view';
  els.editorLayer.hidden = true;
  els.readingLayer.hidden = false;
  els.subjectRow.hidden = false;
  els.endLayer.hidden = true;
  els.screen.textContent = '';
  els.cursor.hidden = true;
  els.titleInput.value = currentLog.title || '';
  els.bodyInput.value = currentLog.body || '';
  els.subjectDisplay.textContent = currentLog.title || 'UNTITLED OBSERVATION';
  els.logId.textContent = currentLog.displayId || `#${String(currentLog.id || '').slice(-8).toUpperCase()}`;
  els.fileName.textContent = source === 'official' ? 'OFFICIAL-001' : source.toUpperCase();
  els.modeReadout.textContent = 'VIEWER';
  els.viewerModeLabel.textContent = 'OBSERVATION LOG';
  els.footerState.textContent = currentLog.official ? 'READ ONLY SESSION' : 'LOCAL LOG SESSION';
  els.editToggle.textContent = '✎ EDIT';
  els.playPause.disabled = false;
  els.restart.disabled = false;
  els.playIcon.textContent = '▶';
  els.playLabel.textContent = 'OBSERVE';
  els.saveLog.disabled = !!currentLog.official;
  recordedBlob = null;
  if (currentLog.audioId) restoreAudioForLog(currentLog.audioId);
  else setVoiceState('NO STREAM');
  updateReadout();
  els.viewport.scrollTop = 0;
}

function enterEdit(newBlank = false) {
  stopPlayback();
  mode = 'edit';
  if (newBlank) {
    currentLog = { id: uid(), displayId: '#LOCAL-NEW', title: '', body: '', createdAt: new Date().toISOString(), official: false };
    recordedBlob = null; closeVoiceUrl(); setVoiceState('NO STREAM');
  }
  els.titleInput.value = currentLog.title || '';
  els.bodyInput.value = currentLog.body || '';
  els.readingLayer.hidden = true;
  els.editorLayer.hidden = false;
  els.subjectRow.hidden = true;
  els.endLayer.hidden = true;
  els.modeReadout.textContent = 'EDITOR';
  els.viewerModeLabel.textContent = 'LOG EDITOR';
  els.logId.textContent = currentLog.displayId || '#LOCAL-NEW';
  els.editToggle.textContent = '◉ PREVIEW';
  els.playPause.disabled = true;
  els.restart.disabled = true;
  els.saveLog.disabled = false;
  els.footerState.textContent = 'WRITE ACCESS ENABLED';
  setTimeout(() => (newBlank ? els.titleInput : els.bodyInput).focus(), 80);
}

function exitEditToPreview() {
  currentLog.title = els.titleInput.value.trim() || 'UNTITLED OBSERVATION';
  currentLog.body = els.bodyInput.value;
  currentLog.official = false;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  setCurrentLog(currentLog, 'draft');
  els.saveLog.disabled = false;
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
  const speed = Number(els.speed.value) || .75;
  const base = 30 / speed;
  if (char === '\n') return base * 5.2;
  if ('。！？'.includes(char)) return base * 8;
  if ('、，,'.includes(char)) return base * 3.2;
  if ('—…'.includes(char)) return base * 4;
  return base;
}

async function ensureAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
}
function typingTick() {
  if (!typingSoundEnabled || !audioContext || audioContext.state !== 'running') return;
  if (Math.random() > .55) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'square'; osc.frequency.value = 145 + Math.random() * 55;
  gain.gain.setValueAtTime(.012, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .025);
  osc.connect(gain).connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + .028);
}

async function startPlayback() {
  if (mode !== 'view' || !currentLog.body) return;
  els.endLayer.hidden = true;
  if (charIndex >= currentLog.body.length) restartPlayback(false);
  playing = true;
  els.playIcon.textContent = 'Ⅱ'; els.playLabel.textContent = 'PAUSE';
  els.status.textContent = 'OBSERVING'; els.footerState.textContent = 'LIVE OBSERVATION'; els.cursor.hidden = false;
  try { await ensureAudioContext(); } catch {}
  if (els.voicePlayer.src) {
    try { if (els.voicePlayer.ended) els.voicePlayer.currentTime = 0; await els.voicePlayer.play(); setVoiceState('STREAM ACTIVE'); }
    catch { setVoiceState('TAP REQUIRED'); }
  }
  typeNext();
}
function typeNext() {
  if (!playing) return;
  const body = currentLog.body;
  if (charIndex >= body.length) { finishPlayback(); return; }
  const char = body[charIndex++];
  els.screen.textContent += char;
  if (char.trim()) typingTick();
  updateReadout();
  els.viewport.scrollTop = els.viewport.scrollHeight;
  typingTimer = setTimeout(typeNext, delayForChar(char));
}
function pausePlayback() {
  playing = false; clearTimeout(typingTimer); typingTimer = null;
  els.playIcon.textContent = '▶'; els.playLabel.textContent = 'RESUME'; els.status.textContent = 'PAUSED'; els.cursor.hidden = true;
  if (!els.voicePlayer.paused) els.voicePlayer.pause();
}
function stopPlayback() { playing = false; clearTimeout(typingTimer); typingTimer = null; els.voicePlayer.pause(); }
function restartPlayback(autoPlay = true) {
  stopPlayback(); charIndex = 0; els.screen.textContent = ''; els.endLayer.hidden = true; els.viewport.scrollTop = 0; updateReadout();
  els.playIcon.textContent = '▶'; els.playLabel.textContent = 'OBSERVE'; els.status.textContent = 'CONNECTED';
  if (els.voicePlayer.src) els.voicePlayer.currentTime = 0;
  if (autoPlay) startPlayback();
}
function finishPlayback() {
  stopPlayback(); els.cursor.hidden = true; els.endLayer.hidden = false;
  els.playIcon.textContent = '▶'; els.playLabel.textContent = 'REPLAY'; els.status.textContent = 'ARCHIVED'; els.footerState.textContent = 'OBSERVATION COMPLETE';
  setVoiceState(els.voicePlayer.src ? 'STREAM CLOSED' : 'NO STREAM');
}

function revealCompletedLog() {
  if (els.endLayer.hidden) return;
  els.endLayer.hidden = true;
  els.screen.textContent = currentLog.body || '';
  charIndex = currentLog.body?.length || 0;
  updateReadout();
  els.status.textContent = 'ARCHIVE VIEW';
  els.footerState.textContent = 'SCROLL REVIEW ENABLED';
  els.viewport.scrollTop = 0;
  els.viewport.focus({ preventScroll: true });
}

function setVoiceState(text) { els.voiceStatus.textContent = text; }
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
      recordingStream?.getTracks().forEach(t => t.stop()); recordingStream = null;
    };
    mediaRecorder.start(); recordStartedAt = Date.now();
    els.recordButton.classList.add('recording'); els.recordButton.textContent = '■ STOP REC'; els.recordOverlay.hidden = false;
    els.modeReadout.textContent = 'RECORDING'; setVoiceState('STREAM REC');
    recordTimerId = setInterval(updateRecordTimer,250); updateRecordTimer();
  } catch (err) { alert(`録音を開始できませんでした。\n${err.message || err}`); }
}
function updateRecordTimer(){ const sec=Math.floor((Date.now()-recordStartedAt)/1000); els.recordTimer.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function stopRecording(){ if(mediaRecorder?.state==='recording') mediaRecorder.stop(); clearInterval(recordTimerId); recordTimerId=null; els.recordButton.classList.remove('recording'); els.recordButton.textContent='● RECORD'; els.recordOverlay.hidden=true; els.modeReadout.textContent=mode==='edit'?'EDITOR':'VIEWER'; }

function openDB() {
  return new Promise((resolve,reject)=>{ const req=indexedDB.open('NyxObservationDB',1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('audio')) req.result.createObjectStore('audio'); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
}
async function putAudio(id, blob){ const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction('audio','readwrite'); tx.objectStore('audio').put(blob,id); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function getAudio(id){ const db=await openDB(); return new Promise((res,rej)=>{ const req=db.transaction('audio').objectStore('audio').get(id); req.onsuccess=()=>res(req.result||null); req.onerror=()=>rej(req.error); }); }
async function deleteAudio(id){ if(!id)return; const db=await openDB(); return new Promise((res,rej)=>{ const tx=db.transaction('audio','readwrite'); tx.objectStore('audio').delete(id); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function restoreAudioForLog(audioId){ try{ const blob=await getAudio(audioId); if(blob) attachVoiceBlob(blob,'ARCHIVE READY'); else setVoiceState('AUDIO MISSING'); }catch{ setVoiceState('AUDIO ERROR'); } }

async function saveCurrentLog() {
  if (mode === 'edit') { currentLog.title = els.titleInput.value.trim() || 'UNTITLED OBSERVATION'; currentLog.body = els.bodyInput.value; }
  if (!currentLog.body.trim()) { alert('本文が空です。'); return; }
  currentLog.official = false; currentLog.updatedAt = new Date().toISOString(); currentLog.createdAt ||= currentLog.updatedAt; currentLog.id ||= uid(); currentLog.displayId ||= `#LOCAL-${String(Date.now()).slice(-4)}`;
  if (recordedBlob) { currentLog.audioId = currentLog.audioId || `audio-${currentLog.id}`; await putAudio(currentLog.audioId, recordedBlob); }
  const logs = loadStoredLogs(); const existing = logs.findIndex(l => l.id === currentLog.id);
  const stored = { id:currentLog.id, displayId:currentLog.displayId, title:currentLog.title, body:currentLog.body, createdAt:currentLog.createdAt, updatedAt:currentLog.updatedAt, audioId:currentLog.audioId || null };
  if (existing >= 0) logs[existing] = stored; else logs.unshift(stored); saveStoredLogs(logs);
  await showSaveSequence(); setCurrentLog(stored,'archive'); els.saveLog.disabled=false;
}
function showSaveSequence(){ return new Promise(resolve=>{ els.writeMessage.textContent='WRITING LOG...'; els.writeDetail.textContent='VERIFYING DATA'; els.writeBar.style.width='0%'; els.saveDialog.showModal(); requestAnimationFrame(()=>els.writeBar.style.width='72%'); setTimeout(()=>{ els.writeMessage.textContent='LOG SAVED.'; els.writeDetail.textContent='NXS // LOCAL STORAGE'; els.writeBar.style.width='100%'; },620); setTimeout(()=>{ els.saveDialog.close(); resolve(); },1250); }); }

function renderLogs() {
  const logs = loadStoredLogs(); els.logsList.innerHTML=''; els.emptyLogs.hidden = logs.length>0;
  logs.forEach(log=>{
    const card=document.createElement('article'); card.className='log-card';
    const info=document.createElement('div'); const h=document.createElement('h3'); h.textContent=log.title; const p=document.createElement('p'); p.textContent=`${new Date(log.updatedAt||log.createdAt).toLocaleString('ja-JP')} / ${log.audioId?'VOICE ATTACHED':'TEXT ONLY'}`; info.append(h,p);
    const actions=document.createElement('div'); actions.className='card-actions';
    const open=document.createElement('button'); open.type='button'; open.textContent='OPEN'; open.onclick=()=>{ els.logsDialog.close(); setCurrentLog(log,'archive'); };
    const del=document.createElement('button'); del.type='button'; del.className='delete'; del.textContent='DELETE'; del.onclick=async()=>{ if(!confirm(`「${log.title}」を削除しますか？`))return; await deleteAudio(log.audioId); saveStoredLogs(loadStoredLogs().filter(x=>x.id!==log.id)); renderLogs(); };
    actions.append(open,del); card.append(info,actions); els.logsList.append(card);
  });
}

els.playPause.addEventListener('click',()=> playing ? pausePlayback() : startPlayback());
els.endLayer.addEventListener('click', revealCompletedLog);
els.endLayer.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealCompletedLog(); } });
els.editorLayer.addEventListener('focusout', () => setTimeout(() => {
  if (!els.editorLayer.contains(document.activeElement)) restoreMobileViewport();
}, 80));
els.restart.addEventListener('click',()=>restartPlayback(false));
els.editToggle.addEventListener('click',()=> mode==='edit' ? exitEditToPreview() : enterEdit(false));
els.newLog.addEventListener('click',()=>enterEdit(true));
els.officialLog.addEventListener('click',()=>setCurrentLog(structuredClone(OFFICIAL_LOG),'official'));
els.myLogs.addEventListener('click',()=>{renderLogs();els.logsDialog.showModal();});
els.saveLog.addEventListener('click',saveCurrentLog);
els.recordButton.addEventListener('click',()=> mediaRecorder?.state==='recording' ? stopRecording() : beginRecording());
els.typingSoundToggle.addEventListener('click',async()=>{ typingSoundEnabled=!typingSoundEnabled; els.typingSoundToggle.textContent=`TYPE SOUND ${typingSoundEnabled?'ON':'OFF'}`; els.typingSoundToggle.setAttribute('aria-pressed',String(typingSoundEnabled)); if(typingSoundEnabled)try{await ensureAudioContext()}catch{} });
els.fileInput.addEventListener('change',async e=>{ const file=e.target.files?.[0]; if(!file)return; const body=await file.text(); setCurrentLog({id:uid(),displayId:'#LOCAL-FILE',title:file.name.replace(/\.(txt|md)$/i,''),body,createdAt:new Date().toISOString(),official:false},'file'); els.saveLog.disabled=false; e.target.value=''; });
els.voiceInput.addEventListener('change',e=>{ const file=e.target.files?.[0]; if(!file)return; attachVoiceBlob(file,'LOCAL FILE READY'); els.saveLog.disabled=!!currentLog.official; e.target.value=''; });
els.bodyInput.addEventListener('input',()=>{els.saveLog.disabled=false;});
els.titleInput.addEventListener('input',()=>{els.saveLog.disabled=false;});
els.voicePlayer.addEventListener('ended',()=>setVoiceState('STREAM CLOSED'));

['dragenter','dragover'].forEach(type=>$('dropZone').addEventListener(type,e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}));
$('dropZone').addEventListener('drop',async e=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(!file)return;if(file.type.startsWith('audio/'))attachVoiceBlob(file,'LOCAL FILE READY');else{const body=await file.text();setCurrentLog({id:uid(),displayId:'#LOCAL-FILE',title:file.name.replace(/\.[^.]+$/,''),body,createdAt:new Date().toISOString(),official:false},'file');els.saveLog.disabled=false;}});

setInterval(()=>{els.packetValue.textContent=`${(Math.random()*.04).toFixed(2)}%`;els.syncValue.textContent=`${String(Math.floor(8+Math.random()*19)).padStart(3,'0')} ms`;els.memoryValue.textContent=Math.random()>.08?'STABLE':'SYNCING';},2400);

updateSavedCount();
setCurrentLog(structuredClone(OFFICIAL_LOG),'official');
