(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const editorScreen = $('#editorScreen');
  const advancedScreen = $('#advancedScreen');
  const playerScreen = $('#playerScreen');
  const titleInput = $('#titleInput');
  const authorInput = $('#authorInput');
  const bodyInput = $('#bodyInput');
  const charCount = $('#charCount');
  const densitySelect = $('#densitySelect');
  const playerHost = $('#scenePlayer');

  let selectedTheme = 'light';
  let cinemaTone = 'dark';
  let cinemaBackgroundUrl = '';
  let player = null;
  let workingDocument = null;
  let selectedSceneIndex = 0;
  let playerReturnTarget = 'easy';

  const SAMPLE = `通りは朝から、よく整えられた録音室みたいだった。\n\n角を曲がると、声が重なった。\n\n「今日もいい天気ですね」\n\nパン屋の店主が、窯の前で。\n\n同じ音程、同じタイミング、同じ長さ。\n違う口から出ているのに、一枚の録音を街に貼り付けたみたいに、揺れない。\n\nそれでも——\n\n私は、ほんのわずかな遅れを待ってしまう。`;

  const clone = (v) => typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  function splitBody(text) { return JapaneseSceneSplitter.splitDetailed(text, { density: densitySelect.value }); }
  function makeSceneId(index) { return `s${String(index + 1).padStart(3, '0')}`; }
  function nextUniqueId() {
    const used = new Set((workingDocument?.scenes || []).map(s => s.id));
    let n = 1; while (used.has(makeSceneId(n - 1))) n += 1;
    return makeSceneId(n - 1);
  }
  function normalizeSceneIds() {
    // Existing ids stay stable; only blank/duplicate ids are repaired.
    const seen = new Set();
    workingDocument.scenes.forEach((scene, i) => {
      if (!scene.id || seen.has(scene.id)) scene.id = nextUniqueId();
      seen.add(scene.id);
    });
  }

  function buildSceneDocument() {
    const chunks = splitBody(bodyInput.value);
    const scenes = chunks.map((chunk, index) => ({
      id: makeSceneId(index), type: chunk.type || 'text', text: chunk.text,
      presentation: { display: 'stack', effect: 'auto', text: { size: 'auto' } }
    }));
    if (selectedTheme === 'cinema' && cinemaBackgroundUrl && scenes[0]) {
      scenes[0].presentation.background = { src: cinemaBackgroundUrl, transition: 'fade', dim: cinemaTone === 'dark' ? 0.48 : 0.08, fit: 'cover', position: 'center center' };
    }
    return {
      format:'scene-format', version:'1.0', language:'ja',
      title:titleInput.value.trim() || 'Untitled', author:authorInput.value.trim(), theme:selectedTheme,
      player:{ navigation:{ allowPrevious:true } }, scenes
    };
  }

  function updateCount(){ charCount.textContent = `${bodyInput.value.length.toLocaleString()}文字`; }
  function applyTheme(theme){ selectedTheme=theme; $$('.theme-card').forEach(card=>{const on=card.dataset.theme===theme;card.classList.toggle('is-selected',on);card.setAttribute('aria-pressed',on?'true':'false');}); $('#cinemaBackgroundPanel').hidden=theme!=='cinema'; }
  function updatePlayerToneClass(){ playerScreen.classList.toggle('easy-cinema-light', selectedTheme==='cinema'&&cinemaTone==='light'); playerScreen.classList.toggle('easy-cinema-dark', selectedTheme==='cinema'&&cinemaTone==='dark'); }
  function ensurePlayer(){ if(player)return player; player=new ScenePlayerCore(playerHost,{allowPrevious:true,keyboard:true,swipe:true,endOnNextAction:true,maxStackVisible:4,autoDelay:2600}); return player; }
  function setScreen(name){ editorScreen.hidden=name!=='easy'; advancedScreen.hidden=name!=='advanced'; playerScreen.hidden=name!=='player'; const open=name==='player'; document.documentElement.classList.toggle('easy-player-open',open); document.body.classList.toggle('easy-player-open',open); }
  function scrollScreenToTop(screen){
    // iOS Safari/Chrome can preserve the document scroll position when a hidden
    // Studio screen is swapped in. Reset both the page and the screen itself.
    if(screen) screen.scrollTop=0;
    const reset=()=>window.scrollTo(0,0);
    reset();
    requestAnimationFrame(()=>{ reset(); requestAnimationFrame(reset); });
  }

  function getDocumentForPlayback(){ return clone(workingDocument || buildSceneDocument()); }
  function openPlayer({from='easy', startAt=0}={}){
    if(from==='easy'){
      if(!bodyInput.value.trim()){bodyInput.focus();return;}
      workingDocument=buildSceneDocument();
    }
    if(!workingDocument?.scenes?.length)return;
    syncAdvancedFieldsToScene();
    playerReturnTarget=from;
    updatePlayerToneClass(); setScreen('player');
    ensurePlayer().load(getDocumentForPlayback(),{startAt});
  }
  function closePlayer(){ if(player){player.stopAuto();player._stopAllAudio?.(true);} setScreen(playerReturnTarget==='advanced'?'advanced':'easy'); if(playerReturnTarget==='advanced') renderAdvanced(); else window.scrollTo({top:0,left:0,behavior:'instant'}); }

  function openAdvanced(){
    if(!bodyInput.value.trim()){bodyInput.focus();return;}
    workingDocument=buildSceneDocument(); selectedSceneIndex=0; renderAdvanced(); setScreen('advanced'); scrollScreenToTop(advancedScreen);
  }
  function closeAdvanced(){ syncAdvancedFieldsToScene(); setScreen('easy'); }

  function currentScene(){ return workingDocument?.scenes?.[selectedSceneIndex] || null; }
  function ensurePresentation(scene){ scene.presentation ||= {}; scene.presentation.text ||= {}; return scene.presentation; }
  function syncAdvancedFieldsToScene(){
    const scene=currentScene(); if(!scene)return;
    scene.text=$('#sceneTextInput').value;
    const sub=$('#sceneSubTextInput').value; if(sub)scene.subText=sub; else delete scene.subText;
    scene.type=$('#sceneTypeSelect').value;
    const p=ensurePresentation(scene); p.display=$('#sceneDisplaySelect').value; p.effect=$('#sceneEffectSelect').value; p.text.size=$('#sceneSizeSelect').value;
    workingDocument.player ||= {}; workingDocument.player.navigation ||= {}; workingDocument.player.navigation.allowPrevious=$('#allowPreviousInput').checked;
  }
  function loadSceneIntoFields(){
    const scene=currentScene(); if(!scene)return;
    $('#selectedSceneNumber').textContent=`Scene ${selectedSceneIndex+1}`; $('#selectedSceneId').textContent=scene.id;
    $('#sceneTextInput').value=scene.text || ''; $('#sceneSubTextInput').value=scene.subText || '';
    $('#sceneTypeSelect').value=scene.type || 'text'; $('#sceneDisplaySelect').value=scene.presentation?.display || 'stack';
    $('#sceneEffectSelect').value=scene.presentation?.effect || 'auto'; $('#sceneSizeSelect').value=scene.presentation?.text?.size || 'auto';
    $('#moveUpButton').disabled=selectedSceneIndex===0; $('#moveDownButton').disabled=selectedSceneIndex===workingDocument.scenes.length-1;
    $('#mergePreviousButton').disabled=selectedSceneIndex===0; $('#deleteSceneButton').disabled=workingDocument.scenes.length<=1;
  }
  function scenePreviewText(scene){ const t=(scene.text||scene.subText||'(sound)').replace(/\s+/g,' ').trim(); return t.length>42?t.slice(0,42)+'…':t; }
  function renderSceneList(){
    const list=$('#sceneList'); list.innerHTML=''; $('#sceneCountLabel').textContent=`${workingDocument.scenes.length} Scenes`;
    workingDocument.scenes.forEach((scene,i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='scene-list-item'+(i===selectedSceneIndex?' is-selected':'');
      b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><div><strong>${scenePreviewText(scene)}</strong><small>${scene.type} · ${scene.presentation?.effect||'auto'}</small></div>`;
      b.addEventListener('click',()=>{syncAdvancedFieldsToScene();selectedSceneIndex=i;renderAdvanced();}); list.appendChild(b);
    });
  }
  function renderAdvanced(){
    if(!workingDocument)return; normalizeSceneIds(); selectedSceneIndex=Math.max(0,Math.min(selectedSceneIndex,workingDocument.scenes.length-1));
    $('#allowPreviousInput').checked=workingDocument.player?.navigation?.allowPrevious !== false;
    renderSceneList(); loadSceneIntoFields();
  }
  function moveScene(delta){ syncAdvancedFieldsToScene(); const ni=selectedSceneIndex+delta; if(ni<0||ni>=workingDocument.scenes.length)return; const [s]=workingDocument.scenes.splice(selectedSceneIndex,1); workingDocument.scenes.splice(ni,0,s); selectedSceneIndex=ni; renderAdvanced(); }
  function mergePrevious(){ if(selectedSceneIndex<=0)return; syncAdvancedFieldsToScene(); const prev=workingDocument.scenes[selectedSceneIndex-1], cur=workingDocument.scenes[selectedSceneIndex]; prev.text=[prev.text,cur.text].filter(Boolean).join('\n\n'); if(cur.subText&&!prev.subText)prev.subText=cur.subText; workingDocument.scenes.splice(selectedSceneIndex,1); selectedSceneIndex-=1; renderAdvanced(); }
  function splitAtCursor(){
    const input=$('#sceneTextInput'), pos=input.selectionStart; const text=input.value; if(pos<=0||pos>=text.length)return;
    syncAdvancedFieldsToScene(); const scene=currentScene(); const left=text.slice(0,pos).trimEnd(), right=text.slice(pos).trimStart(); if(!left||!right)return;
    scene.text=left; const cloneScene=clone(scene); cloneScene.id=nextUniqueId(); cloneScene.text=right; delete cloneScene.subText;
    workingDocument.scenes.splice(selectedSceneIndex+1,0,cloneScene); selectedSceneIndex+=1; renderAdvanced();
  }
  function addScene(){ syncAdvancedFieldsToScene(); const scene={id:nextUniqueId(),type:'text',text:'',presentation:{display:'stack',effect:'auto',text:{size:'auto'}}}; workingDocument.scenes.splice(selectedSceneIndex+1,0,scene); selectedSceneIndex+=1; renderAdvanced(); $('#sceneTextInput').focus(); }
  function deleteScene(){ if(workingDocument.scenes.length<=1)return; workingDocument.scenes.splice(selectedSceneIndex,1); selectedSceneIndex=Math.min(selectedSceneIndex,workingDocument.scenes.length-1); renderAdvanced(); }

  bodyInput.addEventListener('input',updateCount);
  $('#sampleButton').addEventListener('click',()=>{titleInput.value='声のそろう通り';bodyInput.value=SAMPLE;updateCount();});
  $$('.theme-card').forEach(card=>card.addEventListener('click',()=>applyTheme(card.dataset.theme)));
  $('#makeButton').addEventListener('click',()=>openPlayer({from:'easy',startAt:0}));
  $('#advancedButton').addEventListener('click',openAdvanced);
  $('#editReturnButton').addEventListener('click',closePlayer);
  $('#advancedBackButton').addEventListener('click',closeAdvanced);
  $('#advancedPreviewButton').addEventListener('click',()=>{syncAdvancedFieldsToScene();openPlayer({from:'advanced',startAt:selectedSceneIndex});});
  $('#allowPreviousInput').addEventListener('change',()=>{if(workingDocument){workingDocument.player ||= {};workingDocument.player.navigation ||= {};workingDocument.player.navigation.allowPrevious=$('#allowPreviousInput').checked;}});
  $('#moveUpButton').addEventListener('click',()=>moveScene(-1)); $('#moveDownButton').addEventListener('click',()=>moveScene(1));
  $('#mergePreviousButton').addEventListener('click',mergePrevious); $('#splitSceneButton').addEventListener('click',splitAtCursor); $('#addSceneButton').addEventListener('click',addScene); $('#deleteSceneButton').addEventListener('click',deleteScene);
  ['sceneTextInput','sceneSubTextInput','sceneTypeSelect','sceneDisplaySelect','sceneEffectSelect','sceneSizeSelect'].forEach(id=>$('#'+id).addEventListener('change',()=>{syncAdvancedFieldsToScene();renderSceneList();}));

  const cinemaInput=$('#cinemaBackgroundInput'), cinemaPreview=$('#cinemaBackgroundPreview'), cinemaClear=$('#cinemaBackgroundClear');
  cinemaInput.addEventListener('change',()=>{const file=cinemaInput.files?.[0];if(!file)return;if(cinemaBackgroundUrl)URL.revokeObjectURL(cinemaBackgroundUrl);cinemaBackgroundUrl=URL.createObjectURL(file);cinemaPreview.style.backgroundImage=`url("${cinemaBackgroundUrl}")`;cinemaPreview.hidden=false;cinemaClear.hidden=false;});
  cinemaClear.addEventListener('click',()=>{if(cinemaBackgroundUrl)URL.revokeObjectURL(cinemaBackgroundUrl);cinemaBackgroundUrl='';cinemaInput.value='';cinemaPreview.style.backgroundImage='';cinemaPreview.hidden=true;cinemaClear.hidden=true;});
  $$('.cinema-tone-button').forEach(button=>button.addEventListener('click',()=>{cinemaTone=button.dataset.tone||'dark';$$('.cinema-tone-button').forEach(b=>{const on=b.dataset.tone===cinemaTone;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',on?'true':'false');});}));

  window.SceneStudioDebug={getSceneDocument:()=>clone(workingDocument||buildSceneDocument()),getPlayer:()=>player,splitJapanese:(text,options={})=>JapaneseSceneSplitter.splitDetailed(text,options)};
  applyTheme('light'); updateCount();
})();
