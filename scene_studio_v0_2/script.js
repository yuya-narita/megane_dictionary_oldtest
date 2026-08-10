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

  const I18N = window.SceneStudioI18n;
  const t = (key, vars={}) => I18N?.t(key, vars) ?? key;
  let uiLanguage = I18N?.getLocale?.() || 'ja';

  const UI_BINDINGS = [
    ['.intro h2','intro.title'],['.intro p','intro.body'],
    ['label.field:nth-of-type(1) .field-label','field.title'],['#titleInput','field.title.ph','placeholder'],
    ['label.field:nth-of-type(2) .field-label','field.author'],['#authorInput','field.author.ph','placeholder'],
    ['.body-field .field-label','field.body'],['#bodyInput','field.body.ph','placeholder'],['#sampleButton','body.sample'],
    ['.theme-section .section-heading span','theme.heading'],['.theme-section .section-heading small','theme.note'],
    ['.theme-card[data-theme="light"] small','theme.light'],['.theme-card[data-theme="dark"] small','theme.dark'],['.theme-card[data-theme="cinema"] small','theme.cinema'],
    ['.work-font-section .section-heading span','font.heading'],['.work-font-section .section-heading small','font.note'],
    ['.work-font-card[data-font="serif"] strong','font.serif'],['.work-font-card[data-font="serif"] small','font.serif.note'],
    ['.work-font-card[data-font="sans"] strong','font.sans'],['.work-font-card[data-font="sans"] small','font.sans.note'],
    ['.work-font-card[data-font="mono"] strong','font.mono'],['.work-font-card[data-font="mono"] small','font.mono.note'],
    ['.split-options summary','split.summary'],['.split-panel label span','split.guide'],['.split-panel p','split.note'],
    ['#densitySelect option[value="short"]','density.short'],['#densitySelect option[value="normal"]','density.normal'],['#densitySelect option[value="long"]','density.long'],
    ['.cinema-background-copy strong','cinema.bg'],['.cinema-background-copy span','cinema.bg.note'],
    ['.cinema-tone-button[data-tone="dark"]','cinema.dark'],['.cinema-tone-button[data-tone="light"]','cinema.light'],
    ['.cinema-background-button','cinema.choose'],['#cinemaBackgroundClear','cinema.remove'],
    ['#makeButton span','make'],['#makeButton small','make.note'],['#advancedButton','advanced.open'],['#projectIoTitle','io.heading'],['#exportSceneButton strong','io.export'],['label[for="importSceneInput"] strong','io.import'],['#exportPackageButton strong','io.packageExport'],['label[for="importPackageInput"] strong','io.packageImport'],['.footer-note','footer.note'],
    ['.advanced-topbar h1','advanced.title'],['#advancedPreviewButton','common.preview'],
    ['.advanced-policy strong','nav.previous.policy'],['.advanced-policy small','nav.previous.note'],
    ['#sceneTextInput','scene.text','aria-label'],['.scene-inspector > .adv-field:nth-of-type(1) > span','scene.text'],
    ['.subtext-field > span','scene.subtext'],['#sceneSubTextInput','scene.subtext.ph','placeholder'],
    ['#sceneTypeSelect','scene.type','aria-label'],['#sceneTypeSelect option[value="text"]','scene.type.text'],['#sceneTypeSelect option[value="dialogue"]','scene.type.dialogue'],['#sceneTypeSelect option[value="sound"]','scene.type.sound'],
    ['#sceneDisplaySelect option[value="stack"]','scene.display.stack'],['#sceneDisplaySelect option[value="solo"]','scene.display.solo'],
    ['#sceneEffectSelect option[value="auto"]','effect.auto'],['#sceneEffectSelect option[value="fade"]','effect.fade'],['#sceneEffectSelect option[value="pop"]','effect.pop'],['#sceneEffectSelect option[value="blur"]','effect.blur'],
    ['#sceneEffectSelect option[value="whisper"]','effect.whisper'],['#sceneEffectSelect option[value="loud"]','effect.loud'],['#sceneEffectSelect option[value="pulse"]','effect.pulse'],['#sceneEffectSelect option[value="shake"]','effect.shake'],['#sceneEffectSelect option[value="tilt"]','effect.tilt'],['#sceneEffectSelect option[value="slow"]','effect.slow'],['#sceneEffectSelect option[value="none"]','effect.none'],
    ['#sceneSizeSelect option[value="auto"]','size.auto'],['#sceneSizeSelect option[value="small"]','size.small'],['#sceneSizeSelect option[value="normal"]','size.normal'],['#sceneSizeSelect option[value="large"]','size.large'],['#sceneSizeSelect option[value="xl"]','size.xl'],
    ['#sceneFontSelect option[value="inherit"]','font.inherit'],['#sceneFontSelect option[value="serif"]','font.serif'],['#sceneFontSelect option[value="sans"]','font.sans'],['#sceneFontSelect option[value="mono"]','font.mono'],
    ['#sceneLanguageSelect option[value="auto"]','scene.language.auto'],['#sceneLanguageSelect option[value="ja"]','scene.language.ja'],['#sceneLanguageSelect option[value="en"]','scene.language.en'],['#sceneLanguageSelect option[value="custom"]','scene.language.custom'],
    ['#mergePreviousButton','edit.merge'],['#splitSceneButton','edit.split'],['#deleteSceneButton','edit.delete'],
    ['.adv-section:nth-of-type(1) summary','section.background'],['#sceneBackgroundMode option[value="inherit"]','background.inherit'],['#sceneBackgroundMode option[value="image"]','background.image'],['#sceneBackgroundMode option[value="clear"]','background.clear'],
    ['label[for="sceneBackgroundInput"]','background.choose'],['#sceneBackgroundRemoveFile','background.unselect'],['#sceneBackgroundUrlApply','asset.applyUrl'],
    ['#sceneBackgroundTransition option[value="fade"]','transition.fade'],['#sceneBackgroundTransition option[value="cut"]','transition.cut'],['#sceneBackgroundTransition option[value="flash"]','transition.flash'],['#sceneBackgroundTransition option[value="glitch"]','transition.glitch'],
    ['#sceneBackgroundFit option[value="cover"]','fit.cover'],['#sceneBackgroundFit option[value="contain"]','fit.contain'],
    ['#sceneBackgroundMotion option[value="none"]','motion.none'],['#sceneBackgroundMotion option[value="slowZoom"]','motion.slowZoom'],['#sceneBackgroundMotion option[value="breath"]','motion.breath'],['#sceneBackgroundMotion option[value="panLeft"]','motion.panLeft'],['#sceneBackgroundMotion option[value="panRight"]','motion.panRight'],['#sceneBackgroundMotion option[value="panUp"]','motion.panUp'],['#sceneBackgroundMotion option[value="panDown"]','motion.panDown'],
    ['.adv-section:nth-of-type(2) summary','section.audio'],
    ['label[for="sceneBgmInput"]','audio.chooseBgm'],['label[for="sceneAmbientInput"]','audio.chooseAmbient'],['label[for="sceneSeInput"]','audio.chooseSe'],['#sceneBgmUrlApply','asset.applyUrl'],['#sceneAmbientUrlApply','asset.applyUrl'],['#sceneSeUrlApply','asset.applyUrl'],
    ['#sceneBgmLoop + span','audio.loop'],['#sceneAmbientLoop + span','audio.loop'],['#sceneSeEnabled + span','audio.seEnable'],
    ['.audio-card:nth-child(1) .audio-card-title small','audio.bgm.note'],['.audio-card:nth-child(2) .audio-card-title small','audio.ambient.note'],['.audio-card:nth-child(3) .audio-card-title small','audio.se.note'],
    ['.advanced-hint','audio.hint'],['#editReturnButton','preview.return']
  ];

  function applyStaticUITranslations(){
    document.documentElement.lang = uiLanguage;
    UI_BINDINGS.forEach(([selector,key,attr])=>{
      const el=document.querySelector(selector); if(!el)return;
      if(attr) el.setAttribute(attr,t(key)); else el.textContent=t(key);
    });

    // Labels that repeat and are safer to bind by semantic parent.
    document.querySelectorAll('.adv-grid > .adv-field').forEach(label=>{
      const sel=label.querySelector('select');
      const head=label.querySelector(':scope > span');
      if(!sel||!head)return;
      if(sel.id==='sceneTypeSelect')head.textContent=t('scene.type');
      if(sel.id==='sceneDisplaySelect')head.textContent=t('scene.display');
      if(sel.id==='sceneEffectSelect')head.textContent=t('scene.effect');
      if(sel.id==='sceneSizeSelect')head.textContent=t('scene.size');
      if(sel.id==='sceneFontSelect')head.textContent=t('scene.font');
      if(sel.id==='sceneLanguageSelect')head.textContent=t('scene.language');
      if(sel.id==='sceneBackgroundTransition')head.textContent=t('background.transition');
      if(sel.id==='sceneBackgroundFit')head.textContent=t('background.fit');
      if(sel.id==='sceneBackgroundMotion')head.textContent=t('background.motion');
    });
    const bgModeLabel=$('#sceneBackgroundMode')?.closest('.adv-field')?.querySelector(':scope > span');
    if(bgModeLabel) bgModeLabel.textContent=t('background.mode');

    ['Bgm','Ambient'].forEach(prefix=>{
      const action=$(`#scene${prefix}Action`);
      const label=action?.closest('.adv-field')?.querySelector(':scope > span');
      if(label)label.textContent=t('audio.operation');
      if(action){
        const map={inherit:'audio.inherit',start:'audio.start',volume:'audio.volumeChange',stop:'audio.stop'};
        [...action.options].forEach(o=>{ if(map[o.value])o.textContent=t(map[o.value]); });
      }
    });

    document.querySelectorAll('[id$="Volume"],[id$="VolumeChange"]').forEach(input=>{
      const head=input.closest('.adv-field')?.querySelector(':scope > span');
      if(head && head.firstChild) head.firstChild.textContent=t('audio.volume')+' ';
    });

    const customLangLabel=$('#sceneLanguageCustomField > span');
    if(customLangLabel) customLangLabel.textContent=t('scene.language.tag');
    $$('.ui-language-switch button').forEach(b=>{
      const on=b.dataset.uiLang===uiLanguage;
      b.classList.toggle('is-selected',on); b.setAttribute('aria-pressed',on?'true':'false');
    });
  }

  function setUILanguage(language){
    uiLanguage = I18N?.setLocale?.(language) || language;
    applyStaticUITranslations();
    updateCount();
    updateAdvancedConditionalUI?.();
    if(workingDocument) renderAdvanced?.();
    if(player) player.setUILanguage?.(uiLanguage);
  }

  let selectedTheme = 'light';
  let selectedFont = 'serif';
  let cinemaTone = 'dark';
  let cinemaBackgroundUrl = '';
  let player = null;
  let workingDocument = null;
  // Once a Scene document exists it is the single source of truth.
  // Easy's textarea is only a source draft until the user edits it again.
  let easySourceDirty = true;

  // Runtime asset registry.
  // key: object URL used by Scene Format in the current browser session
  // value: Blob/File + original filename. This lets Package Export carry the
  // actual binary data instead of only the blob: reference.
  const assetRegistry = new Map();

  function registerAsset(url, blob, name='asset'){
    if(!url || !blob)return;
    assetRegistry.set(url,{blob,name:String(name||'asset')});
  }
  function unregisterAsset(url){
    if(!url)return;
    const item=assetRegistry.get(url);
    assetRegistry.delete(url);
    if(/^blob:/i.test(url)){
      try{ URL.revokeObjectURL(url); }catch(_){}
    }
    return item;
  }

  let selectedSceneIndex = 0;
  let playerReturnTarget = 'easy';

  const SAMPLE = `通りは朝から、よく整えられた録音室みたいだった。\n\n角を曲がると、声が重なった。\n\n「今日もいい天気ですね」\n\nパン屋の店主が、窯の前で。\n\n同じ音程、同じタイミング、同じ長さ。\n違う口から出ているのに、一枚の録音を街に貼り付けたみたいに、揺れない。\n\nそれでも——\n\n私は、ほんのわずかな遅れを待ってしまう。`;

  const clone = (v) => typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  function splitBody(text) { return SceneTextSplitter.splitDetailed(text, { density: densitySelect.value, language: 'auto' }); }
  function detectWorkLanguage(text = bodyInput.value) { return SceneTextSplitter.detectLanguage(text); }
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

  function refreshDocumentLanguages(){
    if(!workingDocument?.scenes?.length)return;
    const priorDefault=workingDocument.language && workingDocument.language!=='mul' && workingDocument.language!=='und' ? workingDocument.language : '';
    const langs=[];
    workingDocument.scenes.forEach(scene=>{
      let lang=SceneTextSplitter.normalizeLanguageTag?.(scene.language,'') || '';
      if(!lang || lang==='mul') lang=priorDefault || SceneTextSplitter.detectLanguage(scene.text || scene.subText || '');
      if(lang && !['mul','und'].includes(lang) && !langs.includes(lang)) langs.push(lang);
    });
    workingDocument.languages=langs;
    workingDocument.language=langs.length>1?'mul':(langs[0] || priorDefault || 'und');
    if(workingDocument.language!=='mul'){
      workingDocument.scenes.forEach(scene=>{ if(scene.language===workingDocument.language) delete scene.language; });
    } else {
      workingDocument.scenes.forEach(scene=>{
        if(!scene.language && (scene.text || scene.subText)) scene.language=SceneTextSplitter.detectLanguage(scene.text || scene.subText || '');
      });
    }
  }

  function buildSceneDocument() {
    const chunks = splitBody(bodyInput.value);
    const languageSummary = SceneTextSplitter.summarizeLanguages?.(chunks) || { language: detectWorkLanguage(), languages: [detectWorkLanguage()] };
    const scenes = chunks.map((chunk, index) => ({
      id: makeSceneId(index), type: chunk.type || 'text', text: chunk.text,
      ...(languageSummary.language === 'mul' && chunk.language ? { language: chunk.language } : {}),
      presentation: { display: 'stack', effect: 'auto', text: { size: 'auto' } }
    }));
    if (selectedTheme === 'cinema' && cinemaBackgroundUrl && scenes[0]) {
      scenes[0].presentation.background = { src: cinemaBackgroundUrl, transition: 'fade', dim: cinemaTone === 'dark' ? 0.48 : 0.72, fit: 'cover', position: 'center center' };
    }
    return {
      format:'scene-format', version:'1.0', language:languageSummary.language,
      ...(languageSummary.languages?.length ? { languages: languageSummary.languages } : {}),
      title:titleInput.value.trim() || 'Untitled', author:authorInput.value.trim(), theme:selectedTheme,
      appearance:{
        cinemaTone: selectedTheme==='cinema' ? cinemaTone : 'dark',
        typography:{ fontFamily:selectedFont }
      },
      player:{ navigation:{ allowPrevious:true } }, scenes
    };
  }


  function ensureWorkingDocumentFromEasy(){
    if(!workingDocument || easySourceDirty){
      workingDocument=buildSceneDocument();
      selectedSceneIndex=0;
      easySourceDirty=false;
    }
    return workingDocument;
  }

  function syncEasyShellToWorkingDocument(){
    if(!workingDocument)return;
    // Easy may still change work-level metadata without destroying Scene edits.
    workingDocument.title=titleInput.value.trim() || workingDocument.title || 'Untitled';
    workingDocument.author=authorInput.value.trim();
    workingDocument.theme=selectedTheme;
    workingDocument.appearance ||= {};
    workingDocument.appearance.typography ||= {};
    workingDocument.appearance.typography.fontFamily=selectedFont;
    workingDocument.appearance.cinemaTone=selectedTheme==='cinema' ? cinemaTone : (workingDocument.appearance.cinemaTone || 'dark');
  }

  function sceneDocumentForExport(){
    // If Advanced has been opened, its Scene document is authoritative.
    // Otherwise build directly from Easy Studio so a first export needs no extra step.
    if(workingDocument){
      if(!advancedScreen.hidden) syncAdvancedFieldsToScene();
      syncEasyShellToWorkingDocument();
      return clone(workingDocument);
    }
    return buildSceneDocument();
  }
  function safeFileStem(value){
    const stem=String(value||'untitled').trim()
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g,'_')
      .replace(/\s+/g,' ')
      .replace(/[. ]+$/g,'')
      .slice(0,80);
    return stem || 'untitled';
  }
  function downloadTextFile(name,text,type='application/json'){
    const blob=new Blob([text],{type:`${type};charset=utf-8`});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=name; a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function downloadBlobFile(name,blob){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=name; a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

  const ZIP_TEXT_ENCODER=new TextEncoder();
  const ZIP_TEXT_DECODER=new TextDecoder('utf-8');

  function zipU16(view,offset,value){ view.setUint16(offset,value,true); }
  function zipU32(view,offset,value){ view.setUint32(offset,value>>>0,true); }

  function crc32(bytes){
    let crc=0xFFFFFFFF;
    for(let i=0;i<bytes.length;i++){
      crc^=bytes[i];
      for(let k=0;k<8;k++) crc=(crc>>>1)^((crc&1)?0xEDB88320:0);
    }
    return (crc^0xFFFFFFFF)>>>0;
  }

  async function blobBytes(blob){
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Minimal standards-compliant ZIP writer using STORE (method 0).
  // STORE is deliberate: browser-side implementation stays dependency-free,
  // while images/audio are already compressed formats in most projects.
  async function makeStoreZip(entries){
    const locals=[];
    const centrals=[];
    let offset=0;

    for(const entry of entries){
      const nameBytes=ZIP_TEXT_ENCODER.encode(entry.name);
      const data=entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes);
      const crc=crc32(data);

      const local=new Uint8Array(30+nameBytes.length+data.length);
      const lv=new DataView(local.buffer);
      zipU32(lv,0,0x04034b50);
      zipU16(lv,4,20);
      zipU16(lv,6,0x0800); // UTF-8 names
      zipU16(lv,8,0);      // STORE
      zipU16(lv,10,0); zipU16(lv,12,0);
      zipU32(lv,14,crc);
      zipU32(lv,18,data.length);
      zipU32(lv,22,data.length);
      zipU16(lv,26,nameBytes.length);
      zipU16(lv,28,0);
      local.set(nameBytes,30);
      local.set(data,30+nameBytes.length);
      locals.push(local);

      const central=new Uint8Array(46+nameBytes.length);
      const cv=new DataView(central.buffer);
      zipU32(cv,0,0x02014b50);
      zipU16(cv,4,20);
      zipU16(cv,6,20);
      zipU16(cv,8,0x0800);
      zipU16(cv,10,0);
      zipU16(cv,12,0); zipU16(cv,14,0);
      zipU32(cv,16,crc);
      zipU32(cv,20,data.length);
      zipU32(cv,24,data.length);
      zipU16(cv,28,nameBytes.length);
      zipU16(cv,30,0); zipU16(cv,32,0);
      zipU16(cv,34,0); zipU16(cv,36,0);
      zipU32(cv,38,0);
      zipU32(cv,42,offset);
      central.set(nameBytes,46);
      centrals.push(central);

      offset+=local.length;
    }

    const centralOffset=offset;
    const centralSize=centrals.reduce((n,x)=>n+x.length,0);
    const end=new Uint8Array(22);
    const ev=new DataView(end.buffer);
    zipU32(ev,0,0x06054b50);
    zipU16(ev,4,0); zipU16(ev,6,0);
    zipU16(ev,8,entries.length);
    zipU16(ev,10,entries.length);
    zipU32(ev,12,centralSize);
    zipU32(ev,16,centralOffset);
    zipU16(ev,20,0);

    return new Blob([...locals,...centrals,end],{type:'application/zip'});
  }

  async function inflateRaw(bytes){
    if(typeof DecompressionStream!=='function') throw new Error('zip-deflate-unsupported');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // Reader supports STORE packages generated by Studio and ordinary DEFLATE
  // entries when the browser provides DecompressionStream.
  async function readZipEntries(file){
    const bytes=new Uint8Array(await file.arrayBuffer());
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const out=new Map();
    let p=0;

    while(p+4<=bytes.length){
      const sig=view.getUint32(p,true);
      if(sig===0x04034b50){
        if(p+30>bytes.length)throw new Error('zip-local-header');
        const flags=view.getUint16(p+6,true);
        const method=view.getUint16(p+8,true);
        const compSize=view.getUint32(p+18,true);
        const uncompSize=view.getUint32(p+22,true);
        const nameLen=view.getUint16(p+26,true);
        const extraLen=view.getUint16(p+28,true);
        if(flags&0x0008) throw new Error('zip-data-descriptor-unsupported');
        const nameStart=p+30;
        const dataStart=nameStart+nameLen+extraLen;
        const dataEnd=dataStart+compSize;
        if(dataEnd>bytes.length)throw new Error('zip-entry-overflow');
        const name=ZIP_TEXT_DECODER.decode(bytes.slice(nameStart,nameStart+nameLen));
        let data=bytes.slice(dataStart,dataEnd);
        if(method===8) data=await inflateRaw(data);
        else if(method!==0) throw new Error(`zip-method-${method}`);
        if(uncompSize && data.length!==uncompSize) throw new Error('zip-size');
        if(name && !name.endsWith('/')) out.set(name,data);
        p=dataEnd;
        continue;
      }
      if(sig===0x02014b50 || sig===0x06054b50) break;
      p++;
    }
    if(!out.size)throw new Error('zip-empty');
    return out;
  }

  function guessMime(name){
    const n=String(name||'').toLowerCase();
    if(/\.(jpg|jpeg)$/.test(n))return 'image/jpeg';
    if(/\.png$/.test(n))return 'image/png';
    if(/\.webp$/.test(n))return 'image/webp';
    if(/\.gif$/.test(n))return 'image/gif';
    if(/\.svg$/.test(n))return 'image/svg+xml';
    if(/\.mp3$/.test(n))return 'audio/mpeg';
    if(/\.m4a$/.test(n))return 'audio/mp4';
    if(/\.aac$/.test(n))return 'audio/aac';
    if(/\.wav$/.test(n))return 'audio/wav';
    if(/\.ogg$/.test(n))return 'audio/ogg';
    if(/\.opus$/.test(n))return 'audio/opus';
    if(/\.flac$/.test(n))return 'audio/flac';
    return 'application/octet-stream';
  }

  function assetExtension(name,mime=''){
    const m=String(name||'').match(/(\.[A-Za-z0-9]{1,8})$/);
    if(m)return m[1].toLowerCase();
    const map={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/aac':'.aac','audio/wav':'.wav','audio/ogg':'.ogg','audio/opus':'.opus','audio/flac':'.flac'};
    return map[mime]||'.bin';
  }

  function safeAssetBase(name){
    return safeFileStem(String(name||'asset').replace(/\.[^.]+$/,'')).replace(/\s+/g,'_').slice(0,48)||'asset';
  }

  async function resolveAssetBlob(src){
    const registered=assetRegistry.get(src);
    if(registered)return registered;
    if(/^blob:/i.test(src)){
      const response=await fetch(src);
      if(!response.ok)throw new Error('blob-fetch');
      const blob=await response.blob();
      return {blob,name:'asset'+assetExtension('',blob.type)};
    }
    return null;
  }

  function walkAssetRefs(doc,callback){
    (doc.scenes||[]).forEach((scene,sceneIndex)=>{
      const bg=scene?.presentation?.background;
      if(bg?.src)callback({
        kind:'background',sceneIndex,
        holder:bg,key:'src',src:bg.src,
        fileName:bg._editorFileName||''
      });

      (scene?.audio||[]).forEach((cmd,audioIndex)=>{
        if(!cmd?.src)return;
        const kind=cmd.channel==='bgm'?'bgm':cmd.channel==='ambient'?'ambient':'se';
        callback({
          kind,sceneIndex,audioIndex,
          holder:cmd,key:'src',src:cmd.src,
          fileName:cmd._editorFileName||''
        });
      });
    });
  }

  async function buildScenePackage(){
    const doc=sceneDocumentForExport();
    const packaged=clone(doc);
    const entries=[];
    const bySource=new Map();
    let assetCounter=0;

    const refs=[];
    walkAssetRefs(packaged,ref=>refs.push(ref));

    for(const ref of refs){
      // Remote/public URLs stay URLs and are not copied into the package.
      if(!/^blob:/i.test(ref.src))continue;

      let assetPath=bySource.get(ref.src);
      if(!assetPath){
        const item=await resolveAssetBlob(ref.src);
        if(!item)continue;
        assetCounter++;
        const ext=assetExtension(item.name||ref.fileName,item.blob.type);
        const base=safeAssetBase(ref.fileName||item.name||`${ref.kind}_${assetCounter}`);
        assetPath=`assets/${String(assetCounter).padStart(3,'0')}_${ref.kind}_${base}${ext}`;
        bySource.set(ref.src,assetPath);
        entries.push({name:assetPath,bytes:await blobBytes(item.blob)});
      }
      ref.holder[ref.key]=assetPath;
      ref.holder._editorFileName=ref.fileName || assetRegistry.get(ref.src)?.name || assetPath.split('/').pop();
    }

    packaged.package={
      format:'scene-package',
      version:'1.0',
      assetCount:entries.length
    };

    entries.unshift({
      name:'scene.json',
      bytes:ZIP_TEXT_ENCODER.encode(JSON.stringify(packaged,null,2))
    });

    return {doc:packaged,blob:await makeStoreZip(entries),assetCount:entries.length-1};
  }

  async function exportScenePackage(){
    try{
      if(!advancedScreen.hidden)syncAdvancedFieldsToScene();
      const result=await buildScenePackage();
      const name=`${safeFileStem(result.doc.title)}.scene.zip`;
      downloadBlobFile(name,result.blob);
      setProjectIoStatus(t('io.packageExported',{name,n:result.assetCount}));
    }catch(error){
      console.error(error);
      setProjectIoStatus(t('io.packageFailed'),{error:true});
      alert(t('io.packageFailed'));
    }
  }

  async function importScenePackage(file){
    try{
      const entries=await readZipEntries(file);
      const sceneBytes=entries.get('scene.json') || [...entries.entries()].find(([name])=>/\.scene\.json$/i.test(name))?.[1];
      if(!sceneBytes)throw new Error('scene-json-missing');

      const parsed=JSON.parse(ZIP_TEXT_DECODER.decode(sceneBytes).replace(/^\uFEFF/,''));
      const doc=validateSceneFormatV1(parsed);
      let restored=0;

      const refs=[];
      walkAssetRefs(doc,ref=>refs.push(ref));
      for(const ref of refs){
        const path=String(ref.src||'').replace(/^\.\//,'');
        if(!/^assets\//i.test(path))continue;
        const bytes=entries.get(path);
        if(!bytes)continue;
        const name=ref.fileName || path.split('/').pop() || 'asset';
        const blob=new Blob([bytes],{type:guessMime(name)});
        const url=URL.createObjectURL(blob);
        registerAsset(url,blob,name);
        ref.holder[ref.key]=url;
        ref.holder._editorFileName=name;
        restored++;
      }

      workingDocument=doc;
      easySourceDirty=false;
      selectedSceneIndex=0;
      restoreEasyStateFromDocument(doc);
      normalizeSceneIds();
      refreshDocumentLanguages();
      renderAdvanced();
      setScreen('advanced');
      scrollScreenToTop(advancedScreen);
      setProjectIoStatus(t('io.packageImported',{name:file.name||'scene.zip',n:doc.scenes.length,a:restored}));
    }catch(error){
      console.error(error);
      setProjectIoStatus(t('io.packageInvalid'),{error:true});
      alert(t('io.packageInvalid'));
    }
  }

  function validateSceneFormatV1(value){
    if(!value || typeof value!=='object') throw new Error('not-object');
    const doc=value.format==='scene-format' ? value : (value.document?.format==='scene-format' ? value.document : value.sceneFormat?.format==='scene-format' ? value.sceneFormat : null);
    if(!doc) throw new Error('format');
    if(String(doc.version||'')!=='1.0') throw new Error('version');
    if(!Array.isArray(doc.scenes) || !doc.scenes.length) throw new Error('scenes');
    if(!['light','dark','cinema'].includes(doc.theme)) throw new Error('theme');
    const seen=new Set();
    doc.scenes.forEach((scene,index)=>{
      if(!scene || typeof scene!=='object') throw new Error(`scene-${index}`);
      if(!['text','dialogue','sound'].includes(scene.type)) throw new Error(`scene-type-${index}`);
      if(scene.type!=='sound' && typeof scene.text!=='string') throw new Error(`scene-text-${index}`);
      const id=String(scene.id||'').trim();
      if(!id || seen.has(id)) throw new Error(`scene-id-${index}`);
      seen.add(id);
    });
    return clone(doc);
  }
  function countLocalAssetRefs(doc){
    let count=0;
    const visit=(value)=>{
      if(!value)return;
      if(typeof value==='string'){ if(/^blob:/i.test(value))count++; return; }
      if(Array.isArray(value)){value.forEach(visit);return;}
      if(typeof value==='object')Object.values(value).forEach(visit);
    };
    visit(doc);
    return count;
  }
  function setProjectIoStatus(message,{error=false}={}){
    const el=$('#projectIoStatus'); if(!el)return;
    el.textContent=message||''; el.classList.toggle('is-error',Boolean(error));
  }
  function restoreEasyStateFromDocument(doc){
    titleInput.value=doc.title||'';
    authorInput.value=doc.author||'';
    bodyInput.value=(doc.scenes||[]).map(scene=>scene.text||'').filter(Boolean).join('\n\n');
    updateCount();
    applyTheme(doc.theme||'light');
    applyWorkFont(doc.appearance?.typography?.fontFamily||'serif');
    cinemaTone=doc.appearance?.cinemaTone==='light'?'light':'dark';
    $$('.cinema-tone-button').forEach(b=>{
      const on=b.dataset.tone===cinemaTone;
      b.classList.toggle('is-selected',on); b.setAttribute('aria-pressed',on?'true':'false');
    });
    const firstBackground=(doc.scenes||[]).map(s=>s.presentation?.background).find(bg=>bg?.src);
    cinemaBackgroundUrl=doc.theme==='cinema' ? (firstBackground?.src||'') : '';
    const preview=$('#cinemaBackgroundPreview'), clear=$('#cinemaBackgroundClear');
    if(preview){
      preview.hidden=!cinemaBackgroundUrl;
      preview.style.backgroundImage=cinemaBackgroundUrl?`url("${cinemaBackgroundUrl}")`:'';
    }
    if(clear) clear.hidden=!cinemaBackgroundUrl;
  }
  function exportSceneDocument(){
    try{
      const doc=sceneDocumentForExport();
      const name=`${safeFileStem(doc.title)}.scene.json`;
      downloadTextFile(name,JSON.stringify(doc,null,2));
      setProjectIoStatus(t('io.exported',{name}));
    }catch(error){
      console.error(error); setProjectIoStatus(t('io.invalid'),{error:true});
    }
  }
  async function importSceneDocument(file){
    try{
      const raw=await file.text();
      const parsed=JSON.parse(raw.replace(/^\uFEFF/,''));
      const doc=validateSceneFormatV1(parsed);
      workingDocument=doc;
      easySourceDirty=false;
      selectedSceneIndex=0;
      restoreEasyStateFromDocument(doc);
      normalizeSceneIds();
      refreshDocumentLanguages();
      renderAdvanced();
      setScreen('advanced');
      scrollScreenToTop(advancedScreen);
      const localRefs=countLocalAssetRefs(doc);
      let message=t('io.imported',{name:file.name||'scene.json',n:doc.scenes.length});
      if(localRefs) message+=` ${t('io.localAssets',{n:localRefs})}`;
      setProjectIoStatus(message);
    }catch(error){
      console.error(error); setProjectIoStatus(t('io.invalid'),{error:true});
      alert(t('io.invalid'));
    }
  }

  function updateCount(){ charCount.textContent = t('body.chars',{n:bodyInput.value.length.toLocaleString(uiLanguage==='ja'?'ja-JP':'en-US')}); }
  function autoGrowSubText(){
    const el=$('#sceneSubTextInput');
    if(!el)return;
    el.style.height='auto';
    const max=150;
    el.style.height=`${Math.min(Math.max(el.scrollHeight,72),max)}px`;
    el.style.overflowY=el.scrollHeight>max?'auto':'hidden';
  }

  function applyTheme(theme){ selectedTheme=theme; if(workingDocument) workingDocument.theme=theme; $$('.theme-card').forEach(card=>{const on=card.dataset.theme===theme;card.classList.toggle('is-selected',on);card.setAttribute('aria-pressed',on?'true':'false');}); $('#cinemaBackgroundPanel').hidden=theme!=='cinema'; }
  function applyWorkFont(font){
    selectedFont=['serif','sans','mono'].includes(font)?font:'serif';
    $$('.work-font-card').forEach(card=>{
      const on=card.dataset.font===selectedFont;
      card.classList.toggle('is-selected',on);
      card.setAttribute('aria-pressed',on?'true':'false');
    });
    if(workingDocument){
      workingDocument.appearance=workingDocument.appearance||{};
      workingDocument.appearance.typography=workingDocument.appearance.typography||{};
      workingDocument.appearance.typography.fontFamily=selectedFont;
    }
  }
  function ensurePlayer(){ if(player)return player; player=new ScenePlayerCore(playerHost,{allowPrevious:true,keyboard:true,swipe:true,endOnNextAction:true,maxStackVisible:4,autoDelay:2600,uiLanguage}); return player; }
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
      if(!bodyInput.value.trim() && !workingDocument){bodyInput.focus();return;}
      ensureWorkingDocumentFromEasy();
      syncEasyShellToWorkingDocument();
    } else {
      // Advanced edits write directly into the authoritative Scene document.
      syncAdvancedFieldsToScene();
    }
    if(!workingDocument?.scenes?.length)return;
    playerReturnTarget=from;
    setScreen('player');
    const p=ensurePlayer();
    p.setUILanguage?.(uiLanguage);
    p.load(getDocumentForPlayback(),{startAt});

    // openPlayer itself is called from the author's Play/Confirm click.
    // Use that trusted gesture to unlock/arm audio AFTER load(), so Scene 1
    // BGM/Ambient/SE can begin on the first Scene instead of waiting for the
    // reader's next tap (especially important on iOS/WebKit).
    p.unlockAudio(true);
  }
  function closePlayer(){ if(player){player.stopAuto();player._stopAllAudio?.(true);} setScreen(playerReturnTarget==='advanced'?'advanced':'easy'); if(playerReturnTarget==='advanced') renderAdvanced(); else window.scrollTo({top:0,left:0,behavior:'instant'}); }

  function openAdvanced(){
    if(!bodyInput.value.trim() && !workingDocument){bodyInput.focus();return;}
    ensureWorkingDocumentFromEasy();
    syncEasyShellToWorkingDocument();
    selectedSceneIndex=Math.max(0,Math.min(selectedSceneIndex,workingDocument.scenes.length-1));
    renderAdvanced(); setScreen('advanced'); scrollScreenToTop(advancedScreen);
  }
  function closeAdvanced(){
    syncAdvancedFieldsToScene();
    restoreEasyStateFromDocument(workingDocument);
    easySourceDirty=false;
    setScreen('easy');
  }

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

  function isExternalAssetUrl(value){
    const raw=String(value||'').trim();
    if(!raw || /^javascript:/i.test(raw)) return false;
    if(/^blob:/i.test(raw)) return false;
    // Absolute http(s), data URLs, and relative paths are valid Scene Format refs.
    return /^(https?:|data:)/i.test(raw) || /^(\.\/|\.\.\/|\/)/.test(raw);
  }

  function externalAssetLabel(value){
    const raw=String(value||'').trim();
    try{
      const u=new URL(raw,location.href);
      const last=u.pathname.split('/').filter(Boolean).pop();
      return last || u.hostname || t('audio.configured');
    }catch(_){
      return raw.split('/').pop() || t('audio.configured');
    }
  }

  function setExternalAsset(inputId,urlInputId,value){
    const raw=String(value||'').trim();
    if(!isExternalAssetUrl(raw)){
      alert(t('asset.invalidUrl'));
      return false;
    }
    const current=assetFrom(inputId).src;
    if(current && assetRegistry.has(current)) unregisterAsset(current);
    setAssetField(inputId,raw,externalAssetLabel(raw));
    const field=$('#'+urlInputId); if(field)field.value=raw;
    return true;
  }

  function loadExternalUrlField(inputId,urlInputId){
    const src=assetFrom(inputId).src;
    const field=$('#'+urlInputId);
    if(field) field.value=(src && !/^blob:/i.test(src)) ? src : '';
  }

  function bindExternalAssetUrl({inputId,urlInputId,applyId,onApply}){
    const field=$('#'+urlInputId), button=$('#'+applyId);
    if(!field||!button)return;
    const commit=()=>{
      if(setExternalAsset(inputId,urlInputId,field.value)){
        onApply?.();
        updateAdvancedConditionalUI();
        syncAdvancedFieldsToScene();
        renderSceneList();
      }
    };
    button.addEventListener('click',commit);
    field.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'){ e.preventDefault(); commit(); }
    });
  }
  function updateAssetLabel(id, inputId){ const el=$('#'+id), asset=assetFrom(inputId); if(el)el.textContent=asset.name || (asset.src ? t('audio.configured') : t('audio.notSelected')); }
  function updateRangeOutput(inputId, outputId){ const input=$('#'+inputId), output=$('#'+outputId); if(input&&output) output.value=`${input.value}%`; }
  function updateAdvancedConditionalUI(){
    const bgMode=$('#sceneBackgroundMode')?.value || 'inherit';
    $('#sceneBackgroundControls').hidden=bgMode!=='image';
    const bgAsset=assetFrom('sceneBackgroundInput');
    const bgPreview=$('#sceneBackgroundPreview');
    if(bgPreview){ bgPreview.hidden=!bgAsset.src; bgPreview.style.backgroundImage=bgAsset.src?`url("${bgAsset.src}")`:''; }
    updateRangeOutput('sceneBackgroundDim','sceneBackgroundDimOutput');
    const dimLabel=$('#sceneBackgroundDimLabel');
    if(dimLabel){
      const lightCinema=workingDocument?.theme==='cinema' && workingDocument?.appearance?.cinemaTone==='light';
      dimLabel.textContent=lightCinema?t('background.thin'):t('background.dim');
    }
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
    loadExternalUrlField(`scene${prefix}Input`,`scene${prefix}UrlInput`);
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
    loadExternalUrlField('sceneBackgroundInput','sceneBackgroundUrlInput');
    $('#sceneBackgroundTransition').value=bg?.transition||'fade'; $('#sceneBackgroundFit').value=bg?.fit||'cover'; $('#sceneBackgroundMotion').value=bg?.motion?.type||'none'; $('#sceneBackgroundDim').value=Math.round((bg?.dim ?? 0.34)*100);
    loadPersistentAudio(scene,'Bgm','bgm',{volume:.5,fadeIn:800,fadeOut:800,changeVolume:.3,volumeFade:500,stopFade:800});
    loadPersistentAudio(scene,'Ambient','ambient',{volume:.35,fadeIn:600,fadeOut:600,changeVolume:.25,volumeFade:500,stopFade:600});
    const se=managedAudio(scene,'oneshot'); $('#sceneSeEnabled').checked=Boolean(se); setAssetField('sceneSeInput',se?.src||'',se?._editorFileName||''); loadExternalUrlField('sceneSeInput','sceneSeUrlInput'); $('#sceneSeVolume').value=Math.round((se?.volume ?? .8)*100); $('#sceneSeFadeIn').value=se?.fadeIn ?? 0;
    updateAdvancedConditionalUI();
  }
  function syncAdvancedFieldsToScene(){
    const scene=currentScene(); if(!scene)return;
    scene.text=$('#sceneTextInput').value;
    const sub=$('#sceneSubTextInput').value; if(sub)scene.subText=sub; else delete scene.subText;
    scene.type=$('#sceneTypeSelect').value;
    const p=ensurePresentation(scene); p.display=$('#sceneDisplaySelect').value; p.effect=$('#sceneEffectSelect').value; p.text.size=$('#sceneSizeSelect').value;
    const sceneFont=$('#sceneFontSelect').value;
    if(sceneFont && sceneFont!=='inherit') p.text.fontFamily=sceneFont;
    else delete p.text.fontFamily;
    const languageChoice=$('#sceneLanguageSelect')?.value || 'auto';
    if(languageChoice==='auto'){
      if(workingDocument?.language==='mul' && scene.text?.trim()) scene.language=SceneTextSplitter.detectLanguage(scene.text);
      else delete scene.language;
    }
    else if(languageChoice==='custom'){
      const custom=SceneTextSplitter.normalizeLanguageTag?.($('#sceneLanguageCustomInput')?.value,'') || '';
      if(custom) scene.language=custom; else delete scene.language;
    } else scene.language=languageChoice;
    syncBackgroundFields(scene); syncAudioFields(scene);
    refreshDocumentLanguages();
    workingDocument.player ||= {}; workingDocument.player.navigation ||= {}; workingDocument.player.navigation.allowPrevious=$('#allowPreviousInput').checked;
  }
  function loadSceneIntoFields(){
    const scene=currentScene(); if(!scene)return;
    $('#selectedSceneNumber').textContent=`Scene ${selectedSceneIndex+1}`; $('#selectedSceneId').textContent=scene.id;
    $('#sceneTextInput').value=scene.text || ''; $('#sceneSubTextInput').value=scene.subText || '';
    requestAnimationFrame(autoGrowSubText);
    $('#sceneTypeSelect').value=scene.type || 'text'; $('#sceneDisplaySelect').value=scene.presentation?.display || 'stack';
    $('#sceneEffectSelect').value=scene.presentation?.effect || 'auto'; $('#sceneSizeSelect').value=scene.presentation?.text?.size || 'auto';
    $('#sceneFontSelect').value=scene.presentation?.text?.fontFamily || 'inherit';
    const sceneLang=scene.language || '';
    const commonSceneLang=['ja','en'];
    $('#sceneLanguageSelect').value=!sceneLang?'auto':(commonSceneLang.includes(sceneLang)?sceneLang:'custom');
    $('#sceneLanguageCustomInput').value=commonSceneLang.includes(sceneLang)?'':sceneLang;
    $('#sceneLanguageCustomField').hidden=$('#sceneLanguageSelect').value!=='custom';
    $('#moveUpButton').disabled=selectedSceneIndex===0; $('#moveDownButton').disabled=selectedSceneIndex===workingDocument.scenes.length-1;
    $('#mergePreviousButton').disabled=selectedSceneIndex===0; $('#deleteSceneButton').disabled=workingDocument.scenes.length<=1;
    loadMediaFields(scene);
  }
  function scenePreviewText(scene){ const t=(scene.text||scene.subText||'(sound)').replace(/\s+/g,' ').trim(); return t.length>42?t.slice(0,42)+'…':t; }
  function renderSceneList(){
    const list=$('#sceneList'); list.innerHTML=''; $('#sceneCountLabel').textContent=t('scene.count',{n:workingDocument.scenes.length});
    workingDocument.scenes.forEach((scene,i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='scene-list-item'+(i===selectedSceneIndex?' is-selected':'');
      const media=[]; if(scene.presentation?.background)media.push('BG'); if((scene.audio||[]).some(c=>c.channel==='bgm'))media.push('BGM'); if((scene.audio||[]).some(c=>c.channel==='ambient'))media.push('AMB'); if((scene.audio||[]).some(c=>c.channel==='oneshot'))media.push('SE');
      const typeLabel={text:t('scene.type.text'),dialogue:t('scene.type.dialogue'),sound:t('scene.type.sound')}[scene.type]||scene.type;
      const effectLabel={auto:t('effect.auto'),fade:t('effect.fade'),pop:t('effect.pop'),blur:t('effect.blur'),whisper:t('effect.whisper'),loud:t('effect.loud'),pulse:t('effect.pulse'),shake:t('effect.shake'),tilt:t('effect.tilt'),slow:t('effect.slow'),none:t('effect.none')}[scene.presentation?.effect||'auto'] || (scene.presentation?.effect||'auto');
      const sceneLang=scene.language || (workingDocument.language==='mul'?'':workingDocument.language) || '';
      b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><div><strong>${scenePreviewText(scene)}</strong><small>${typeLabel} · ${effectLabel}${sceneLang?' · '+sceneLang.toUpperCase():''}${media.length?' · '+media.join('/') : ''}</small></div>`;
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

  bodyInput.addEventListener('input',()=>{ updateCount(); easySourceDirty=true; });
  $('#sceneSubTextInput').addEventListener('input',autoGrowSubText);
  $('#sampleButton').addEventListener('click',()=>{titleInput.value='声のそろう通り';bodyInput.value=SAMPLE;easySourceDirty=true;updateCount();});
  $$('.theme-card').forEach(card=>card.addEventListener('click',()=>applyTheme(card.dataset.theme)));
  $$('.work-font-card').forEach(card=>card.addEventListener('click',()=>applyWorkFont(card.dataset.font)));
  $('#makeButton').addEventListener('click',()=>openPlayer({from:'easy',startAt:0}));
  $('#advancedButton').addEventListener('click',openAdvanced);
  $('#exportSceneButton').addEventListener('click',exportSceneDocument);
  $('#exportPackageButton').addEventListener('click',exportScenePackage);
  $('#importSceneInput').addEventListener('change',async(event)=>{
    const file=event.target.files?.[0];
    if(file) await importSceneDocument(file);
    event.target.value='';
  });
  $('#importPackageInput').addEventListener('change',async(event)=>{
    const file=event.target.files?.[0];
    if(file) await importScenePackage(file);
    event.target.value='';
  });
  $('#editReturnButton').addEventListener('click',closePlayer);
  $('#advancedBackButton').addEventListener('click',closeAdvanced);
  $('#advancedPreviewButton').addEventListener('click',()=>{syncAdvancedFieldsToScene();openPlayer({from:'advanced',startAt:selectedSceneIndex});});
  $('#allowPreviousInput').addEventListener('change',()=>{if(workingDocument){workingDocument.player ||= {};workingDocument.player.navigation ||= {};workingDocument.player.navigation.allowPrevious=$('#allowPreviousInput').checked;}});
  $('#moveUpButton').addEventListener('click',()=>moveScene(-1)); $('#moveDownButton').addEventListener('click',()=>moveScene(1));
  $('#mergePreviousButton').addEventListener('click',mergePrevious); $('#splitSceneButton').addEventListener('click',splitAtCursor); $('#addSceneButton').addEventListener('click',addScene); $('#deleteSceneButton').addEventListener('click',deleteScene);
  ['sceneTextInput','sceneSubTextInput','sceneTypeSelect','sceneDisplaySelect','sceneEffectSelect','sceneSizeSelect','sceneFontSelect','sceneLanguageSelect','sceneLanguageCustomInput'].forEach(id=>$('#'+id).addEventListener('change',()=>{syncAdvancedFieldsToScene();renderSceneList();}));

  ['sceneBackgroundMode','sceneBackgroundTransition','sceneBackgroundFit','sceneBackgroundMotion','sceneBackgroundDim','sceneBgmAction','sceneBgmLoop','sceneBgmVolume','sceneBgmFadeIn','sceneBgmFadeOut','sceneBgmVolumeChange','sceneBgmVolumeFade','sceneBgmStopFade','sceneAmbientAction','sceneAmbientLoop','sceneAmbientVolume','sceneAmbientFadeIn','sceneAmbientFadeOut','sceneAmbientVolumeChange','sceneAmbientVolumeFade','sceneAmbientStopFade','sceneSeEnabled','sceneSeVolume','sceneSeFadeIn'].forEach(id=>{
    const el=$('#'+id); if(!el)return; const evt=el.type==='range'?'input':'change'; el.addEventListener(evt,()=>{updateAdvancedConditionalUI();syncAdvancedFieldsToScene();renderSceneList();});
  });
  function bindAssetInput(inputId,labelId,onPick){
    const input=$('#'+inputId); input.addEventListener('change',()=>{
      const file=input.files?.[0];if(!file)return;
      const isAudio=/^(sceneBgmInput|sceneAmbientInput|sceneSeInput)$/.test(inputId);
      if(isAudio){
        const name=(file.name||'').toLowerCase();
        const audioLike=(file.type||'').startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(name);
        if(!audioLike){ alert(t('alert.audio')); input.value=''; return; }
      }
      const oldUrl=assetFrom(inputId).src;
      if(oldUrl && assetRegistry.has(oldUrl)) unregisterAsset(oldUrl);
      const url=URL.createObjectURL(file);
      registerAsset(url,file,file.name);
      setAssetField(inputId,url,file.name);
      const urlFieldId=inputId.replace(/Input$/,'UrlInput');
      const urlField=$('#'+urlFieldId); if(urlField)urlField.value='';
      if(onPick)onPick();updateAdvancedConditionalUI();syncAdvancedFieldsToScene();renderSceneList(); if(labelId)updateAssetLabel(labelId,inputId);
    });
  }
  bindAssetInput('sceneBackgroundInput',null,()=>{$('#sceneBackgroundMode').value='image';});
  bindAssetInput('sceneBgmInput','sceneBgmFileLabel',()=>{$('#sceneBgmAction').value='start';});
  bindAssetInput('sceneAmbientInput','sceneAmbientFileLabel',()=>{$('#sceneAmbientAction').value='start';});
  bindAssetInput('sceneSeInput','sceneSeFileLabel',()=>{$('#sceneSeEnabled').checked=true;});

  bindExternalAssetUrl({inputId:'sceneBackgroundInput',urlInputId:'sceneBackgroundUrlInput',applyId:'sceneBackgroundUrlApply',onApply:()=>{$('#sceneBackgroundMode').value='image';}});
  bindExternalAssetUrl({inputId:'sceneBgmInput',urlInputId:'sceneBgmUrlInput',applyId:'sceneBgmUrlApply',onApply:()=>{$('#sceneBgmAction').value='start';}});
  bindExternalAssetUrl({inputId:'sceneAmbientInput',urlInputId:'sceneAmbientUrlInput',applyId:'sceneAmbientUrlApply',onApply:()=>{$('#sceneAmbientAction').value='start';}});
  bindExternalAssetUrl({inputId:'sceneSeInput',urlInputId:'sceneSeUrlInput',applyId:'sceneSeUrlApply',onApply:()=>{$('#sceneSeEnabled').checked=true;}});
  $('#sceneBackgroundRemoveFile').addEventListener('click',()=>{const oldUrl=assetFrom('sceneBackgroundInput').src;if(oldUrl&&assetRegistry.has(oldUrl))unregisterAsset(oldUrl);setAssetField('sceneBackgroundInput','','');$('#sceneBackgroundInput').value='';$('#sceneBackgroundUrlInput').value='';updateAdvancedConditionalUI();syncAdvancedFieldsToScene();renderSceneList();});

  const cinemaInput=$('#cinemaBackgroundInput'), cinemaPreview=$('#cinemaBackgroundPreview'), cinemaClear=$('#cinemaBackgroundClear');
  cinemaInput.addEventListener('change',()=>{const file=cinemaInput.files?.[0];if(!file)return;if(cinemaBackgroundUrl&&assetRegistry.has(cinemaBackgroundUrl))unregisterAsset(cinemaBackgroundUrl);cinemaBackgroundUrl=URL.createObjectURL(file);registerAsset(cinemaBackgroundUrl,file,file.name);cinemaPreview.style.backgroundImage=`url("${cinemaBackgroundUrl}")`;cinemaPreview.hidden=false;cinemaClear.hidden=false;if(workingDocument?.scenes?.[0]){const p=ensurePresentation(workingDocument.scenes[0]);p.background={src:cinemaBackgroundUrl,transition:'fade',dim:cinemaTone==='dark'?0.48:0.72,fit:'cover',position:'center center',_editorFileName:file.name,_editorManaged:true};}});
  cinemaClear.addEventListener('click',()=>{if(cinemaBackgroundUrl&&assetRegistry.has(cinemaBackgroundUrl))unregisterAsset(cinemaBackgroundUrl);cinemaBackgroundUrl='';cinemaInput.value='';cinemaPreview.style.backgroundImage='';cinemaPreview.hidden=true;cinemaClear.hidden=true;if(workingDocument?.scenes?.[0]){const p=ensurePresentation(workingDocument.scenes[0]);delete p.background;}});
  $$('.cinema-tone-button').forEach(button=>button.addEventListener('click',()=>{cinemaTone=button.dataset.tone||'dark';$$('.cinema-tone-button').forEach(b=>{const on=b.dataset.tone===cinemaTone;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',on?'true':'false');});if(workingDocument){workingDocument.appearance ||= {};workingDocument.appearance.cinemaTone=cinemaTone;}}));

  $$('.ui-language-switch button').forEach(button=>button.addEventListener('click',()=>setUILanguage(button.dataset.uiLang)));
  window.addEventListener('scene-studio:ui-language',(e)=>{
    if(e.detail?.language && e.detail.language!==uiLanguage){
      uiLanguage=e.detail.language; applyStaticUITranslations(); updateCount(); if(workingDocument)renderAdvanced(); player?.setUILanguage?.(uiLanguage);
    }
  });

  $('#sceneLanguageSelect')?.addEventListener('change',()=>{
    $('#sceneLanguageCustomField').hidden=$('#sceneLanguageSelect').value!=='custom';
  });

  async function loadSceneFormatFromUrl(url,{openPlayer=true,startAt=0}={}){
    const response=await fetch(url,{credentials:'omit'});
    if(!response.ok) throw new Error(`Scene Format fetch failed: ${response.status}`);
    const doc=validateSceneFormatV1(await response.json());
    return loadSceneFormatFromObject(doc,{openPlayer,startAt});
  }

  function loadSceneFormatFromObject(value,{openPlayer=true,startAt=0}={}){
    const doc=validateSceneFormatV1(clone(value));
    workingDocument=doc;
    easySourceDirty=false;
    selectedSceneIndex=0;
    restoreEasyStateFromDocument(doc);
    normalizeSceneIds();
    refreshDocumentLanguages();
    renderAdvanced();
    if(openPlayer){
      openPlayerScreenFromApi(startAt);
    }else{
      setScreen('advanced');
      scrollScreenToTop(advancedScreen);
    }
    return clone(doc);
  }

  function openPlayerScreenFromApi(startAt=0){
    playerReturnTarget='advanced';
    const core=ensurePlayer();
    core.load(clone(workingDocument),{startAt:Number(startAt)||0});
    core.setUILanguage?.(uiLanguage);
    setScreen('player');
    scrollScreenToTop(playerScreen);
    return core;
  }

  // Public, intentionally small integration surface.
  // Embed/API clients can pass a Scene Format object directly or fetch one.
  window.SceneStudioAPI={
    version:'0.2.12.12',
    load:loadSceneFormatFromObject,
    loadFromUrl:loadSceneFormatFromUrl,
    play:(startAt=0)=>openPlayerScreenFromApi(startAt),
    getDocument:()=>clone(workingDocument||buildSceneDocument()),
    validate:(value)=>validateSceneFormatV1(clone(value)),
    createPlayer:(host,document,options={})=>{
      const instance=new ScenePlayerCore(host,options);
      instance.load(validateSceneFormatV1(clone(document)),{startAt:options.startAt||0});
      return instance;
    }
  };

  window.SceneStudioDebug={getSceneDocument:()=>clone(workingDocument||buildSceneDocument()),validateSceneFormatV1:(value)=>validateSceneFormatV1(value),exportSceneDocument,exportScenePackage,importScenePackage,getPlayer:()=>player,splitJapanese:(text,options={})=>JapaneseSceneSplitter.splitDetailed(text,options),splitEnglish:(text,options={})=>EnglishSceneSplitter.splitDetailed(text,options),splitAuto:(text,options={})=>SceneTextSplitter.splitDetailed(text,options),splitMultilingual:(text,options={})=>SceneTextSplitter.splitMultilingualDetailed(text,options),summarizeLanguages:(chunks)=>SceneTextSplitter.summarizeLanguages(chunks),detectWorkLanguage:(text)=>SceneTextSplitter.detectLanguage(text),getUILanguage:()=>uiLanguage,setUILanguage};
  applyStaticUITranslations(); applyTheme('light'); updateCount();
})();
