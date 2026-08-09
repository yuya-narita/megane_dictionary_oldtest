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
      appearance:{ cinemaTone: selectedTheme==='cinema' ? cinemaTone : 'dark' },
      player:{ navigation:{ allowPrevious:true } }, scenes
    };
  }

  function updateCount(){ charCount.textContent = `${bodyInput.value.length.toLocaleString()}文字`; }
  function applyTheme(theme){ selectedTheme=theme; $$('.theme-card').forEach(card=>{const on=card.dataset.theme===theme;card.classList.toggle('is-selected',on);card.setAttribute('aria-pressed',on?'true':'false');}); $('#cinemaBackgroundPanel').hidden=theme!=='cinema'; }
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
    } else {
      // Advanced fields are authoritative only while opening from Advanced.
      // Calling this after a fresh Easy build used stale hidden editor fields
      // and could erase Scene 1's CINEMA background/media.
      syncAdvancedFieldsToScene();
    }
    if(!workingDocument?.scenes?.length)return;
    playerReturnTarget=from;
    setScreen('player');
    const p=ensurePlayer();
    p.load(getDocumentForPlayback(),{startAt});

    // openPlayer itself is called from the author's Play/Confirm click.
    // Use that trusted gesture to unlock/arm audio AFTER load(), so Scene 1
    // BGM/Ambient/SE can begin on the first Scene instead of waiting for the
    // reader's next tap (especially important on iOS/WebKit).
    p.unlockAudio(true);
  }
  function closePlayer(){ if(player){player.stopAuto();player._stopAllAudio?.(true);} setScreen(playerReturnTarget==='advanced'?'advanced':'easy'); if(playerReturnTarget==='advanced') renderAdvanced(); else window.scrollTo({top:0,left:0,behavior:'instant'}); }

  function openAdvanced(){
    if(!bodyInput.value.trim()){bodyInput.focus();return;}
    workingDocument=buildSceneDocument(); selectedSceneIndex=0; renderAdvanced(); setScreen('advanced'); scrollScreenToTop(advancedScreen);
  }
  function closeAdvanced(){ syncAdvancedFieldsToScene(); setScreen('easy'); }

  function currentScene(){ return workingDocument?.scenes?.[selectedSceneIndex] || null; }
  function ensurePresentation(scene){ scene.presentation ||= {}; scene.presentation.text ||= {}; return scene.presentation; }

  const pct = (value, fallback=0) => Math.max(0, Math.min(100, Number(value ?? fallback))) / 100;
  const ms = (value, fallback=0) => Math.max(0, Number(value ?? fallback) || 0);
  function managedAudio(scene, channel){ return (scene.audio || []).find(c => c?._editorManaged && c.channel === channel) || null; }
  function setManagedAudio(scene, channel, command){
    const rest=(scene.audio || []).filter(c => !(c?._editorManaged && c.channel === channel));
    if(command) rest.push({...command, _editorManaged:true});
    if(rest.length) scene.audio=rest; else delete scene.audio;
  }
  function setAssetField(id, url='', name=''){
    const el=$('#'+id); if(!el)return; el.dataset.assetUrl=url||''; el.dataset.assetName=name||'';
  }
  function assetFrom(id){ const el=$('#'+id); return {src:el?.dataset.assetUrl||'', name:el?.dataset.assetName||''}; }
  function updateAssetLabel(id, inputId){ const el=$('#'+id), asset=assetFrom(inputId); if(el)el.textContent=asset.name || (asset.src ? '設定済み' : '未選択'); }
  function updateRangeOutput(inputId, outputId){ const input=$('#'+inputId), output=$('#'+outputId); if(input&&output) output.value=`${input.value}%`; }
  function updateAdvancedConditionalUI(){
    const bgMode=$('#sceneBackgroundMode')?.value || 'inherit';
    $('#sceneBackgroundControls').hidden=bgMode!=='image';
    const bgAsset=assetFrom('sceneBackgroundInput');
    const bgPreview=$('#sceneBackgroundPreview');
    if(bgPreview){ bgPreview.hidden=!bgAsset.src; bgPreview.style.backgroundImage=bgAsset.src?`url("${bgAsset.src}")`:''; }
    updateRangeOutput('sceneBackgroundDim','sceneBackgroundDimOutput');
    ['Bgm','Ambient'].forEach(prefix=>{
      const action=$(`#scene${prefix}Action`).value;
      $(`#scene${prefix}StartFields`).hidden=action!=='start';
      $(`#scene${prefix}VolumeFields`).hidden=action!=='volume';
      $(`#scene${prefix}StopFields`).hidden=action!=='stop';
      updateAssetLabel(`scene${prefix}FileLabel`,`scene${prefix}Input`);
      updateRangeOutput(`scene${prefix}Volume`,`scene${prefix}VolumeOutput`);
      updateRangeOutput(`scene${prefix}VolumeChange`,`scene${prefix}VolumeChangeOutput`);
    });
    $('#sceneSeFields').hidden=!$('#sceneSeEnabled').checked;
    updateAssetLabel('sceneSeFileLabel','sceneSeInput');
    updateRangeOutput('sceneSeVolume','sceneSeVolumeOutput');
  }
  function syncBackgroundFields(scene){
    const p=ensurePresentation(scene), mode=$('#sceneBackgroundMode').value;
    if(mode==='inherit') delete p.background;
    else if(mode==='clear') p.background={src:'',transition:'fade',_editorManaged:true};
    else {
      const asset=assetFrom('sceneBackgroundInput');
      const bg=p.background && typeof p.background==='object' ? {...p.background} : {};
      bg.src=asset.src || bg.src || '';
      bg._editorFileName=asset.name || bg._editorFileName || '';
      bg._editorManaged=true;
      bg.transition=$('#sceneBackgroundTransition').value;
      bg.fit=$('#sceneBackgroundFit').value;
      bg.dim=pct($('#sceneBackgroundDim').value,34);
      const motion=$('#sceneBackgroundMotion').value;
      if(motion==='none') delete bg.motion; else bg.motion={type:motion,duration:12000};
      p.background=bg;
    }
  }
  function syncPersistentAudio(scene, prefix, channel){
    const action=$(`#scene${prefix}Action`).value;
    if(action==='inherit'){ setManagedAudio(scene,channel,null); return; }
    if(action==='start'){
      const asset=assetFrom(`scene${prefix}Input`); const existing=managedAudio(scene,channel);
      const src=asset.src || (existing?.action==='start'?existing.src:'');
      if(!src){ setManagedAudio(scene,channel,null); return; }
      setManagedAudio(scene,channel,{channel,action:'start',src,volume:pct($(`#scene${prefix}Volume`).value,50),fadeIn:ms($(`#scene${prefix}FadeIn`).value),fadeOut:ms($(`#scene${prefix}FadeOut`).value),loop:$(`#scene${prefix}Loop`).checked,restart:true,_editorFileName:asset.name||existing?._editorFileName||''});
    } else if(action==='volume'){
      setManagedAudio(scene,channel,{channel,action:'volume',volume:pct($(`#scene${prefix}VolumeChange`).value,30),fade:ms($(`#scene${prefix}VolumeFade`).value)});
    } else if(action==='stop'){
      setManagedAudio(scene,channel,{channel,action:'stop',fadeOut:ms($(`#scene${prefix}StopFade`).value,600)});
    }
  }
  function syncAudioFields(scene){
    syncPersistentAudio(scene,'Bgm','bgm');
    syncPersistentAudio(scene,'Ambient','ambient');
    if(!$('#sceneSeEnabled').checked){ setManagedAudio(scene,'oneshot',null); return; }
    const asset=assetFrom('sceneSeInput'), existing=managedAudio(scene,'oneshot'); const src=asset.src || existing?.src || '';
    if(!src){ setManagedAudio(scene,'oneshot',null); return; }
    setManagedAudio(scene,'oneshot',{channel:'oneshot',role:'se',action:'play',src,volume:pct($('#sceneSeVolume').value,80),fadeIn:ms($('#sceneSeFadeIn').value),_editorFileName:asset.name||existing?._editorFileName||''});
  }
  function loadPersistentAudio(scene,prefix,channel,defaults){
    const cmd=managedAudio(scene,channel); const action=cmd?.action || 'inherit'; $(`#scene${prefix}Action`).value=action;
    setAssetField(`scene${prefix}Input`,cmd?.src||'',cmd?._editorFileName||'');
    $(`#scene${prefix}Loop`).checked=cmd?.loop!==false;
    $(`#scene${prefix}Volume`).value=Math.round((cmd?.action==='start'?cmd.volume:defaults.volume)*100);
    $(`#scene${prefix}FadeIn`).value=cmd?.fadeIn ?? defaults.fadeIn; $(`#scene${prefix}FadeOut`).value=cmd?.fadeOut ?? defaults.fadeOut;
    $(`#scene${prefix}VolumeChange`).value=Math.round((cmd?.action==='volume'?cmd.volume:defaults.changeVolume)*100); $(`#scene${prefix}VolumeFade`).value=cmd?.fade ?? defaults.volumeFade;
    $(`#scene${prefix}StopFade`).value=cmd?.fadeOut ?? defaults.stopFade;
  }
  function loadMediaFields(scene){
    const bg=scene.presentation?.background;
    let mode='inherit'; if(bg && typeof bg==='object') mode=bg.src ? 'image' : 'clear';
    $('#sceneBackgroundMode').value=mode;
    setAssetField('sceneBackgroundInput',bg?.src||'',bg?._editorFileName||'');
    $('#sceneBackgroundTransition').value=bg?.transition||'fade'; $('#sceneBackgroundFit').value=bg?.fit||'cover'; $('#sceneBackgroundMotion').value=bg?.motion?.type||'none'; $('#sceneBackgroundDim').value=Math.round((bg?.dim ?? 0.34)*100);
    loadPersistentAudio(scene,'Bgm','bgm',{volume:.5,fadeIn:800,fadeOut:800,changeVolume:.3,volumeFade:500,stopFade:800});
    loadPersistentAudio(scene,'Ambient','ambient',{volume:.35,fadeIn:600,fadeOut:600,changeVolume:.25,volumeFade:500,stopFade:600});
    const se=managedAudio(scene,'oneshot'); $('#sceneSeEnabled').checked=Boolean(se); setAssetField('sceneSeInput',se?.src||'',se?._editorFileName||''); $('#sceneSeVolume').value=Math.round((se?.volume ?? .8)*100); $('#sceneSeFadeIn').value=se?.fadeIn ?? 0;
    updateAdvancedConditionalUI();
  }
  function syncAdvancedFieldsToScene(){
    const scene=currentScene(); if(!scene)return;
    scene.text=$('#sceneTextInput').value;
    const sub=$('#sceneSubTextInput').value; if(sub)scene.subText=sub; else delete scene.subText;
    scene.type=$('#sceneTypeSelect').value;
    const p=ensurePresentation(scene); p.display=$('#sceneDisplaySelect').value; p.effect=$('#sceneEffectSelect').value; p.text.size=$('#sceneSizeSelect').value;
    syncBackgroundFields(scene); syncAudioFields(scene);
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
    loadMediaFields(scene);
  }
  function scenePreviewText(scene){ const t=(scene.text||scene.subText||'(sound)').replace(/\s+/g,' ').trim(); return t.length>42?t.slice(0,42)+'…':t; }
  function renderSceneList(){
    const list=$('#sceneList'); list.innerHTML=''; $('#sceneCountLabel').textContent=`${workingDocument.scenes.length} Scenes`;
    workingDocument.scenes.forEach((scene,i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='scene-list-item'+(i===selectedSceneIndex?' is-selected':'');
      const media=[]; if(scene.presentation?.background)media.push('BG'); if((scene.audio||[]).some(c=>c.channel==='bgm'))media.push('BGM'); if((scene.audio||[]).some(c=>c.channel==='ambient'))media.push('AMB'); if((scene.audio||[]).some(c=>c.channel==='oneshot'))media.push('SE');
      b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><div><strong>${scenePreviewText(scene)}</strong><small>${scene.type} · ${scene.presentation?.effect||'auto'}${media.length?' · '+media.join('/') : ''}</small></div>`;
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
    scene.text=left; const cloneScene=clone(scene); cloneScene.id=nextUniqueId(); cloneScene.text=right; delete cloneScene.subText; delete cloneScene.audio; if(cloneScene.presentation)delete cloneScene.presentation.background;
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

  ['sceneBackgroundMode','sceneBackgroundTransition','sceneBackgroundFit','sceneBackgroundMotion','sceneBackgroundDim','sceneBgmAction','sceneBgmLoop','sceneBgmVolume','sceneBgmFadeIn','sceneBgmFadeOut','sceneBgmVolumeChange','sceneBgmVolumeFade','sceneBgmStopFade','sceneAmbientAction','sceneAmbientLoop','sceneAmbientVolume','sceneAmbientFadeIn','sceneAmbientFadeOut','sceneAmbientVolumeChange','sceneAmbientVolumeFade','sceneAmbientStopFade','sceneSeEnabled','sceneSeVolume','sceneSeFadeIn'].forEach(id=>{
    const el=$('#'+id); if(!el)return; const evt=el.type==='range'?'input':'change'; el.addEventListener(evt,()=>{updateAdvancedConditionalUI();syncAdvancedFieldsToScene();renderSceneList();});
  });
  function bindAssetInput(inputId,labelId,onPick){
    const input=$('#'+inputId); input.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return; const url=URL.createObjectURL(file);setAssetField(inputId,url,file.name);if(onPick)onPick();updateAdvancedConditionalUI();syncAdvancedFieldsToScene();renderSceneList(); if(labelId)updateAssetLabel(labelId,inputId);});
  }
  bindAssetInput('sceneBackgroundInput',null,()=>{$('#sceneBackgroundMode').value='image';});
  bindAssetInput('sceneBgmInput','sceneBgmFileLabel',()=>{$('#sceneBgmAction').value='start';});
  bindAssetInput('sceneAmbientInput','sceneAmbientFileLabel',()=>{$('#sceneAmbientAction').value='start';});
  bindAssetInput('sceneSeInput','sceneSeFileLabel',()=>{$('#sceneSeEnabled').checked=true;});
  $('#sceneBackgroundRemoveFile').addEventListener('click',()=>{setAssetField('sceneBackgroundInput','','');$('#sceneBackgroundInput').value='';updateAdvancedConditionalUI();syncAdvancedFieldsToScene();renderSceneList();});

  const cinemaInput=$('#cinemaBackgroundInput'), cinemaPreview=$('#cinemaBackgroundPreview'), cinemaClear=$('#cinemaBackgroundClear');
  cinemaInput.addEventListener('change',()=>{const file=cinemaInput.files?.[0];if(!file)return;if(cinemaBackgroundUrl)URL.revokeObjectURL(cinemaBackgroundUrl);cinemaBackgroundUrl=URL.createObjectURL(file);cinemaPreview.style.backgroundImage=`url("${cinemaBackgroundUrl}")`;cinemaPreview.hidden=false;cinemaClear.hidden=false;});
  cinemaClear.addEventListener('click',()=>{if(cinemaBackgroundUrl)URL.revokeObjectURL(cinemaBackgroundUrl);cinemaBackgroundUrl='';cinemaInput.value='';cinemaPreview.style.backgroundImage='';cinemaPreview.hidden=true;cinemaClear.hidden=true;});
  $$('.cinema-tone-button').forEach(button=>button.addEventListener('click',()=>{cinemaTone=button.dataset.tone||'dark';$$('.cinema-tone-button').forEach(b=>{const on=b.dataset.tone===cinemaTone;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',on?'true':'false');});}));

  window.SceneStudioDebug={getSceneDocument:()=>clone(workingDocument||buildSceneDocument()),getPlayer:()=>player,splitJapanese:(text,options={})=>JapaneseSceneSplitter.splitDetailed(text,options)};
  applyTheme('light'); updateCount();
})();
