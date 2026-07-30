/* 149_music_audio_plus.js v1.00
 * Music mode: ＋から端末内の音声ファイルを「迷子」へ追加。
 * - audio file only
 * - IndexedDB persistence (Blob included)
 * - imported item is rendered as a single
 * - iPhone / Android compatible file picker
 */
(function(){
  "use strict";

  var DB_NAME = "megane_music_user_audio_v1";
  var DB_VERSION = 1;
  var STORE = "audioSingles";
  var BUTTON_ID = "musicAudioPlus149";
  var INPUT_ID = "musicAudioFile149";
  var STYLE_ID = "musicAudioPlusStyle149";
  var USER_MARK = "_meganeUserAudio149";
  var objectUrls = Object.create(null);
  var loadedIds = Object.create(null);
  var busy = false;

  function q(id){ return document.getElementById(id); }
  function isMusic(){ return document.body.classList.contains("mode-music"); }
  function isAlbumShelf(){
    var v=q("musicView");
    return !!(isMusic() && v && v.classList.contains("music-v7-albums"));
  }
  function playlists(){
    try{
      if(Array.isArray(window.musicPlaylists)) return window.musicPlaylists;
      if(typeof musicPlaylists !== "undefined" && Array.isArray(musicPlaylists)) return musicPlaylists;
    }catch(_){ }
    return null;
  }
  function render(){
    try{ if(typeof window.MEGANE_MUSIC_V7_RENDER === "function") window.MEGANE_MUSIC_V7_RENDER(); }catch(_){ }
  }
  function uid(){
    try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(_){ }
    return Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10);
  }
  function baseName(name){
    return String(name||"音声ファイル").replace(/\.[^.]+$/," ").trim() || "音声ファイル";
  }
  function safeText(s){ return String(s||"").replace(/[<>&\"']/g,""); }
  function coverData(title){
    var t=safeText(title).slice(0,18);
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><defs><radialGradient id="g" cx="32%" cy="22%" r="95%"><stop offset="0" stop-color="#70485d"/><stop offset=".48" stop-color="#331426"/><stop offset="1" stop-color="#100811"/></radialGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="345" r="164" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3"/><circle cx="400" cy="345" r="58" fill="none" stroke="rgba(255,238,166,.58)" stroke-width="7"/><text x="400" y="392" text-anchor="middle" font-size="170" fill="#fff2b2" font-family="-apple-system,BlinkMacSystemFont,sans-serif">♪</text><text x="400" y="610" text-anchor="middle" font-size="42" font-weight="800" fill="white" font-family="-apple-system,BlinkMacSystemFont,sans-serif">MY AUDIO</text><text x="400" y="674" text-anchor="middle" font-size="30" fill="rgba(255,255,255,.72)" font-family="-apple-system,BlinkMacSystemFont,sans-serif">'+t+'</text></svg>';
    return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
  }

  function openDB(){
    return new Promise(function(resolve,reject){
      if(!window.indexedDB){ reject(new Error("IndexedDB unavailable")); return; }
      var req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=function(){
        var db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:"id"});
      };
      req.onsuccess=function(){ resolve(req.result); };
      req.onerror=function(){ reject(req.error||new Error("DB open failed")); };
    });
  }
  function dbPut(row){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).put(row);
        tx.oncomplete=function(){ db.close(); resolve(row); };
        tx.onerror=function(){ var e=tx.error; db.close(); reject(e||new Error("DB write failed")); };
      });
    });
  }
  function dbAll(){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx=db.transaction(STORE,"readonly");
        var req=tx.objectStore(STORE).getAll();
        req.onsuccess=function(){ resolve(Array.isArray(req.result)?req.result:[]); };
        req.onerror=function(){ reject(req.error||new Error("DB read failed")); };
        tx.oncomplete=function(){ db.close(); };
      });
    });
  }

  function albumFromRow(row){
    if(!row || !row.id || !row.blob) return null;
    if(objectUrls[row.id]){
      try{ URL.revokeObjectURL(objectUrls[row.id]); }catch(_){ }
    }
    var src=URL.createObjectURL(row.blob);
    objectUrls[row.id]=src;
    var title=String(row.title||row.fileName||"音声ファイル");
    var cover=row.cover || coverData(title);
    return {
      id:"user_audio_album_"+row.id,
      type:"single",
      title:title,
      desc:"追加した音声",
      cover:cover,
      createdAt:Number(row.createdAt||Date.now()),
      _meganeUserAudio149:true,
      tracks:[{
        id:"user_audio_track_"+row.id,
        title:title,
        audio:src,
        cover:cover,
        tag:title,
        _meganeUserAudio149:true,
        _userAudioId:row.id
      }]
    };
  }
  function insertAlbum(album){
    var arr=playlists();
    if(!arr || !album) return false;
    var id=album.id;
    var old=arr.findIndex(function(a){ return a && a.id===id; });
    if(old>=0) arr.splice(old,1);
    arr.push(album);
    loadedIds[id]=1;
    return true;
  }
  function loadSaved(){
    return dbAll().then(function(rows){
      rows.sort(function(a,b){ return Number(a.createdAt||0)-Number(b.createdAt||0); });
      var changed=false;
      rows.forEach(function(row){ var a=albumFromRow(row); if(a && insertAlbum(a)) changed=true; });
      if(changed) render();
    }).catch(function(err){ console.warn("[149] saved audio load failed",err); });
  }

  function toast(text){
    var old=q("musicAudioToast149"); if(old) old.remove();
    var el=document.createElement("div");
    el.id="musicAudioToast149"; el.className="music-audio-toast149"; el.textContent=text;
    document.body.appendChild(el);
    setTimeout(function(){ if(el.parentNode) el.remove(); },1500);
  }
  function setBusy(on){
    busy=!!on;
    var b=q(BUTTON_ID);
    if(b){ b.disabled=busy; b.classList.toggle("busy",busy); b.textContent=busy?"…":"＋"; }
  }
  function chooseTitle(file){
    var initial=baseName(file && file.name);
    var title=initial;
    try{
      var entered=window.prompt("曲名を入力してください",initial);
      if(entered===null) return null;
      title=String(entered).trim() || initial;
    }catch(_){ }
    return title.slice(0,80);
  }
  function addFile(file){
    if(!file || busy) return;
    var type=String(file.type||"");
    var ext=String(file.name||"").toLowerCase();
    if(type.indexOf("audio/")!==0 && !/\.(mp3|m4a|aac|wav|ogg|oga|flac|opus)$/i.test(ext)){
      toast("音声ファイルを選んでください"); return;
    }
    var title=chooseTitle(file);
    if(title===null) return;
    setBusy(true);
    var row={
      id:uid(), title:title, fileName:file.name||title,
      mime:file.type||"application/octet-stream", size:Number(file.size||0),
      blob:file, createdAt:Date.now(), cover:coverData(title)
    };
    dbPut(row).then(function(){
      var album=albumFromRow(row);
      insertAlbum(album);
      render();
      toast("迷子に追加しました♪");
      try{ if(navigator.vibrate) navigator.vibrate([12,28,12]); }catch(_){ }
    }).catch(function(err){
      console.error("[149] audio save failed",err);
      toast("保存できませんでした");
    }).finally(function(){ setBusy(false); syncButton(); });
  }

  function injectStyle(){
    if(q(STYLE_ID)) return;
    var st=document.createElement("style"); st.id=STYLE_ID;
    st.textContent=
      "#"+BUTTON_ID+"{position:fixed;right:max(22px,env(safe-area-inset-right));bottom:calc(92px + env(safe-area-inset-bottom));z-index:2147482900;width:52px;height:52px;border-radius:999px;border:1px solid rgba(255,255,255,.30);background:rgba(55,27,48,.64);color:#fff;font:300 34px/1 -apple-system,BlinkMacSystemFont,sans-serif;display:grid;place-items:center;padding:0;box-shadow:0 13px 34px rgba(0,0,0,.40),inset 0 0 0 1px rgba(255,255,255,.05);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .16s ease,opacity .16s ease,background .16s ease;touch-action:manipulation}"+
      "#"+BUTTON_ID+":active{transform:scale(.90)}#"+BUTTON_ID+".busy{opacity:.72;animation:musicAudioPlusPulse149 .75s ease-in-out infinite alternate}"+
      "#"+BUTTON_ID+"[hidden]{display:none!important}#"+INPUT_ID+"{display:none!important}"+
      ".music-audio-toast149{position:fixed;left:50%;bottom:calc(158px + env(safe-area-inset-bottom));z-index:2147483003;transform:translateX(-50%);padding:10px 15px;border-radius:999px;background:rgba(14,10,17,.94);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;white-space:nowrap;pointer-events:none;box-shadow:0 14px 38px rgba(0,0,0,.42);animation:musicAudioToast149 1.5s ease both}"+
      "@keyframes musicAudioToast149{0%{opacity:0;transform:translate(-50%,9px)}14%,76%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}@keyframes musicAudioPlusPulse149{to{transform:scale(.94);opacity:.55}}";
    document.head.appendChild(st);
  }
  function ensureUI(){
    injectStyle();
    var input=q(INPUT_ID);
    if(!input){
      input=document.createElement("input"); input.id=INPUT_ID; input.type="file";
      input.accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus";
      input.addEventListener("change",function(){ var f=input.files&&input.files[0]; input.value=""; if(f) addFile(f); });
      document.body.appendChild(input);
    }
    var b=q(BUTTON_ID);
    if(!b){
      b=document.createElement("button"); b.id=BUTTON_ID; b.type="button"; b.textContent="＋";
      b.title="音声ファイルを追加"; b.setAttribute("aria-label","音声ファイルを追加");
      b.addEventListener("click",function(e){
        e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        if(busy) return;
        var f=q(INPUT_ID); if(f) f.click();
      },true);
      document.body.appendChild(b);
    }
    syncButton();
  }
  function syncButton(){
    var b=q(BUTTON_ID); if(!b) return;
    b.hidden=!isAlbumShelf();
  }
  function boot(){
    ensureUI();
    loadSaved();
    var obs=new MutationObserver(function(){ syncButton(); });
    obs.observe(document.body,{attributes:true,attributeFilter:["class"],childList:true,subtree:true});
    ["pageshow","resize","orientationchange"].forEach(function(t){ window.addEventListener(t,syncButton,{passive:true}); });
    document.addEventListener("click",function(){ setTimeout(syncButton,20); },true);
  }
  window.addEventListener("pagehide",function(){
    Object.keys(objectUrls).forEach(function(k){ try{URL.revokeObjectURL(objectUrls[k]);}catch(_){ } });
  });
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
