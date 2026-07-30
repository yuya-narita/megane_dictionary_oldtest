/* v1.08: user video artwork + source-file safety notice */
/* v1.07: user artwork image editing */
/* v1.06.1: memo viewer + iPhone keyboard layout hotfix */
/* v1.06: user audio lyrics / memo editing */
/* v1.05: user audio title editing */
/* v1.04.2 UI spacing hotfix: independent bottom buttons preserved */
/* 149_music_audio_plus.js v1.06
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
  var artworkUrls = Object.create(null);
  var videoUrls = Object.create(null);
  var ARTWORK_SIZE = 1200;
  var SOURCE_NOTICE_KEY = "megane_media_source_notice_v108";
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



  function sourceFileNoticeV108(){
    try{ if(localStorage.getItem(SOURCE_NOTICE_KEY)==="1") return true; }catch(_){ }
    var ok=window.confirm(
      "ここは保管庫ではありません。\n\n追加した音声・画像・動画は、端末やブラウザの状態によって失われる可能性があります。\n\n元のファイルは削除せず、端末やクラウドにも残しておいてください。"
    );
    if(ok){ try{ localStorage.setItem(SOURCE_NOTICE_KEY,"1"); }catch(_){ } }
    return !!ok;
  }
  window.MEGANE_MEDIA_SOURCE_NOTICE_V108=sourceFileNoticeV108;

  function formatBytesV108(n){
    n=Number(n||0);
    if(n<1024) return n+" B";
    if(n<1024*1024) return (n/1024).toFixed(1)+" KB";
    if(n<1024*1024*1024) return (n/1024/1024).toFixed(1)+" MB";
    return (n/1024/1024/1024).toFixed(2)+" GB";
  }

  function legacyCoverData(title){
    var t=safeText(title).slice(0,18);
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200"><defs><radialGradient id="g" cx="32%" cy="22%" r="95%"><stop offset="0" stop-color="#70485d"/><stop offset=".48" stop-color="#331426"/><stop offset="1" stop-color="#100811"/></radialGradient></defs><rect width="1200" height="1200" fill="url(#g)"/><circle cx="600" cy="518" r="246" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="5"/><circle cx="600" cy="518" r="87" fill="none" stroke="rgba(255,238,166,.58)" stroke-width="11"/><text x="600" y="570" text-anchor="middle" font-size="260" fill="#fff2b2" font-family="-apple-system,BlinkMacSystemFont,sans-serif">♪</text><text x="600" y="914" text-anchor="middle" font-size="64" font-weight="800" fill="white" font-family="-apple-system,BlinkMacSystemFont,sans-serif">MY AUDIO</text><text x="600" y="1005" text-anchor="middle" font-size="44" fill="rgba(255,255,255,.72)" font-family="-apple-system,BlinkMacSystemFont,sans-serif">'+t+'</text></svg>';
    return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
  }

  function canvasToPngBlob(canvas){
    return new Promise(function(resolve,reject){
      if(!canvas || !canvas.toBlob){ reject(new Error("Canvas PNG unavailable")); return; }
      canvas.toBlob(function(blob){
        if(blob) resolve(blob); else reject(new Error("Artwork encode failed"));
      },"image/png",0.92);
    });
  }

  function defaultArtworkBlob(title){
    var canvas=document.createElement("canvas");
    canvas.width=ARTWORK_SIZE; canvas.height=ARTWORK_SIZE;
    var ctx=canvas.getContext("2d");
    var g=ctx.createRadialGradient(384,264,20,600,600,1120);
    g.addColorStop(0,"#70485d"); g.addColorStop(.48,"#331426"); g.addColorStop(1,"#100811");
    ctx.fillStyle=g; ctx.fillRect(0,0,ARTWORK_SIZE,ARTWORK_SIZE);
    ctx.strokeStyle="rgba(255,255,255,.18)"; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(600,518,246,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(255,238,166,.58)"; ctx.lineWidth=11;
    ctx.beginPath(); ctx.arc(600,518,87,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#fff2b2"; ctx.font="260px -apple-system,BlinkMacSystemFont,sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("♪",600,570);
    ctx.fillStyle="#fff"; ctx.font="800 64px -apple-system,BlinkMacSystemFont,sans-serif";
    ctx.fillText("MY AUDIO",600,914);
    ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="44px -apple-system,BlinkMacSystemFont,sans-serif";
    var t=safeText(title).slice(0,18); ctx.fillText(t,600,1005);
    return canvasToPngBlob(canvas);
  }

  function loadImageFromBlob(blob){
    return new Promise(function(resolve,reject){
      var url=URL.createObjectURL(blob);
      var img=new Image();
      img.onload=function(){ URL.revokeObjectURL(url); resolve(img); };
      img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error("Artwork image load failed")); };
      img.src=url;
    });
  }

  function normalizeArtworkBlob(blob){
    if(!blob || !String(blob.type||"").match(/^image\//)) return Promise.reject(new Error("Image file required"));
    return loadImageFromBlob(blob).then(function(img){
      var canvas=document.createElement("canvas");
      canvas.width=ARTWORK_SIZE; canvas.height=ARTWORK_SIZE;
      var ctx=canvas.getContext("2d");
      var sw=img.naturalWidth||img.width, sh=img.naturalHeight||img.height;
      if(!sw || !sh) throw new Error("Invalid artwork size");
      var side=Math.min(sw,sh);
      var sx=(sw-side)/2, sy=(sh-side)/2;
      ctx.drawImage(img,sx,sy,side,side,0,0,ARTWORK_SIZE,ARTWORK_SIZE);
      return canvasToPngBlob(canvas);
    });
  }

  function posterFromVideoBlobV108(blob){
    if(!blob || !String(blob.type||"").match(/^video\//)) return Promise.reject(new Error("Video file required"));
    return new Promise(function(resolve,reject){
      var url=URL.createObjectURL(blob);
      var v=document.createElement("video");
      var finished=false;
      function cleanup(){ try{ v.pause(); }catch(_){ } try{ URL.revokeObjectURL(url); }catch(_){ } }
      function fail(err){ if(finished) return; finished=true; cleanup(); reject(err instanceof Error?err:new Error("Video preview failed")); }
      function capture(){
        if(finished) return;
        try{
          var sw=v.videoWidth||0, sh=v.videoHeight||0;
          if(!sw || !sh) throw new Error("Invalid video size");
          var canvas=document.createElement("canvas");
          canvas.width=ARTWORK_SIZE; canvas.height=ARTWORK_SIZE;
          var ctx=canvas.getContext("2d");
          var side=Math.min(sw,sh), sx=(sw-side)/2, sy=(sh-side)/2;
          ctx.drawImage(v,sx,sy,side,side,0,0,ARTWORK_SIZE,ARTWORK_SIZE);
          canvasToPngBlob(canvas).then(function(poster){
            if(finished) return; finished=true; cleanup(); resolve(poster);
          }).catch(fail);
        }catch(e){ fail(e); }
      }
      v.muted=true; v.playsInline=true; v.preload="auto";
      v.onerror=function(){ fail(new Error("この動画を読み込めませんでした")); };
      v.onloadeddata=function(){
        try{
          var target=(isFinite(v.duration)&&v.duration>0.2)?Math.min(0.25,v.duration/3):0;
          if(target>0.01){ v.currentTime=target; } else { capture(); }
        }catch(_){ capture(); }
      };
      v.onseeked=capture;
      v.src=url;
      try{ v.load(); }catch(e){ fail(e); }
      setTimeout(function(){ if(!finished && v.readyState>=2) capture(); },2500);
      setTimeout(function(){ if(!finished) fail(new Error("動画の静止画を作成できませんでした")); },12000);
    });
  }

  // v1.03 shared artwork pipeline. Future jacket editing should call this.
  window.MEGANE_MUSIC_NORMALIZE_ARTWORK_V103=function(fileOrBlob,title){
    if(fileOrBlob && String(fileOrBlob.type||"").match(/^image\//)) return normalizeArtworkBlob(fileOrBlob);
    return defaultArtworkBlob(title||"MY AUDIO");
  };

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

  function dbGet(id){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx=db.transaction(STORE,"readonly");
        var req=tx.objectStore(STORE).get(id);
        req.onsuccess=function(){ resolve(req.result || null); };
        req.onerror=function(){ reject(req.error||new Error("DB read failed")); };
        tx.oncomplete=function(){ db.close(); };
      });
    });
  }

  function dbDelete(id){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete=function(){ db.close(); resolve(true); };
        tx.onerror=function(){ var e=tx.error; db.close(); reject(e||new Error("DB delete failed")); };
      });
    });
  }

  function removeAlbumByUserAudioId(id){
    var arr=playlists();
    if(!arr) return;
    var albumId="user_audio_album_"+id;
    for(var i=arr.length-1;i>=0;i--){
      if(arr[i] && arr[i].id===albumId) arr.splice(i,1);
    }
    delete loadedIds[albumId];
  }

  function updateLoadedAlbumTitleV105(id,row){
    var arr=playlists();
    if(!arr) return;
    var albumId="user_audio_album_"+id;
    var album=arr.find(function(a){ return a && a.id===albumId; });
    if(!album) return;
    var title=String(row.title||row.fileName||"音声ファイル");
    album.title=title;
    if(album.tracks && album.tracks[0]){
      album.tracks[0].title=title;
      album.tracks[0].tag=title;
      album.tracks[0].memo=String(row.memo||row.lyrics||row.text||"");
    }
    if(row.artworkBlob){
      if(artworkUrls[id]){ try{ URL.revokeObjectURL(artworkUrls[id]); }catch(_){ } }
      var cover=URL.createObjectURL(row.artworkBlob);
      artworkUrls[id]=cover;
      album.cover=cover;
      if(album.tracks && album.tracks[0]) album.tracks[0].cover=cover;
    }
    if(videoUrls[id]){ try{ URL.revokeObjectURL(videoUrls[id]); }catch(_){ } delete videoUrls[id]; }
    if(album.tracks && album.tracks[0]){
      album.tracks[0].video="";
      album.tracks[0].videoLoop=false;
      album.tracks[0].artworkType=row.artworkType||"image";
      if(row.videoBlob){
        var videoUrl=URL.createObjectURL(row.videoBlob);
        videoUrls[id]=videoUrl;
        album.tracks[0].video=videoUrl;
        album.tracks[0].videoLoop=row.videoLoop!==false;
        album.tracks[0].artworkType="video";
      }
    }
  }

  // v1.05: ID・音声Blob・お気に入りを変えず、表示名だけ安全に更新する。
  window.MEGANE_USER_AUDIO_RENAME_V105=function(id,newTitle){
    id=String(id||"");
    newTitle=String(newTitle||"").trim().slice(0,80);
    if(!id) return Promise.reject(new Error("User audio id required"));
    if(!newTitle) return Promise.reject(new Error("Title required"));
    return dbGet(id).then(function(row){
      if(!row) throw new Error("Audio data not found");
      row.title=newTitle;
      // 現時点のユーザー音声は自動生成ジャケット。将来ユーザー画像を設定した行は
      // artworkAuto=false にすることで、曲名変更時にも画像を保持できる。
      if(row.artworkAuto===false){
        return dbPut(row);
      }
      return defaultArtworkBlob(newTitle).then(function(blob){
        row.artworkBlob=blob;
        row.artworkMime=blob.type||"image/png";
        row.artworkWidth=ARTWORK_SIZE;
        row.artworkHeight=ARTWORK_SIZE;
        row.artworkAuto=true;
        row.cover="";
        return dbPut(row);
      }).catch(function(){ return dbPut(row); });
    }).then(function(row){
      updateLoadedAlbumTitleV105(id,row);
      render();
      return row;
    });
  };

  function updateLoadedAlbumMemoV106(id,row){
    var arr=playlists();
    if(!arr) return;
    var albumId="user_audio_album_"+id;
    var album=arr.find(function(a){ return a && a.id===albumId; });
    if(!album || !album.tracks || !album.tracks[0]) return;
    album.tracks[0].memo=String(row.memo||"");
  }

  window.MEGANE_USER_AUDIO_MEMO_SAVE_V106=function(id,memo){
    id=String(id||"");
    memo=String(memo==null?"":memo).replace(/\r\n?/g,"\n").slice(0,30000);
    if(!id) return Promise.reject(new Error("User audio id required"));
    return dbGet(id).then(function(row){
      if(!row) throw new Error("Audio data not found");
      row.memo=memo;
      return dbPut(row);
    }).then(function(row){
      updateLoadedAlbumMemoV106(id,row);
      render();
      return row;
    });
  };


  // v1.07: user-selected image only updates artwork fields. Audio Blob and track ID stay untouched.
  window.MEGANE_USER_AUDIO_ARTWORK_SAVE_V107=function(id,fileOrBlob){
    id=String(id||"");
    if(!id) return Promise.reject(new Error("User audio id required"));
    if(!fileOrBlob || !String(fileOrBlob.type||"").match(/^image\//)) return Promise.reject(new Error("Image file required"));
    return normalizeArtworkBlob(fileOrBlob).then(function(blob){
      return dbGet(id).then(function(row){
        if(!row) throw new Error("Audio data not found");
        row.artworkBlob=blob;
        row.artworkMime=blob.type||"image/png";
        row.artworkWidth=ARTWORK_SIZE;
        row.artworkHeight=ARTWORK_SIZE;
        row.artworkVersion=108;
        row.artworkAuto=false;
        row.artworkType="image";
        row.videoBlob=null;
        row.videoMime="";
        row.videoSize=0;
        row.videoLoop=false;
        row.cover="";
        return dbPut(row);
      });
    }).then(function(row){
      updateLoadedAlbumTitleV105(id,row);
      render();
      return row;
    });
  };

  window.MEGANE_USER_AUDIO_ARTWORK_RESET_V107=function(id){
    id=String(id||"");
    if(!id) return Promise.reject(new Error("User audio id required"));
    return dbGet(id).then(function(row){
      if(!row) throw new Error("Audio data not found");
      return defaultArtworkBlob(row.title||row.fileName||"MY AUDIO").then(function(blob){
        row.artworkBlob=blob;
        row.artworkMime=blob.type||"image/png";
        row.artworkWidth=ARTWORK_SIZE;
        row.artworkHeight=ARTWORK_SIZE;
        row.artworkVersion=108;
        row.artworkAuto=true;
        row.artworkType="image";
        row.videoBlob=null;
        row.videoMime="";
        row.videoSize=0;
        row.videoLoop=false;
        row.cover="";
        return dbPut(row);
      });
    }).then(function(row){
      updateLoadedAlbumTitleV105(id,row);
      render();
      return row;
    });
  };

  window.MEGANE_USER_AUDIO_VIDEO_SAVE_V108=function(id,fileOrBlob){
    id=String(id||"");
    if(!id) return Promise.reject(new Error("User audio id required"));
    if(!fileOrBlob || !String(fileOrBlob.type||"").match(/^video\//)) return Promise.reject(new Error("Video file required"));
    return posterFromVideoBlobV108(fileOrBlob).then(function(poster){
      return dbGet(id).then(function(row){
        if(!row) throw new Error("Audio data not found");
        row.artworkBlob=poster;
        row.artworkMime=poster.type||"image/png";
        row.artworkWidth=ARTWORK_SIZE;
        row.artworkHeight=ARTWORK_SIZE;
        row.artworkVersion=108;
        row.artworkAuto=false;
        row.artworkType="video";
        row.videoBlob=fileOrBlob;
        row.videoMime=fileOrBlob.type||"video/mp4";
        row.videoSize=Number(fileOrBlob.size||0);
        row.videoLoop=true;
        row.cover="";
        return dbPut(row);
      });
    }).then(function(row){
      updateLoadedAlbumTitleV105(id,row);
      render();
      return row;
    });
  };

  // v1.04: 曲編集ボトムシートから呼ぶ安全な削除API。
  // IndexedDBの対象1件だけを削除し、他の保存曲には触れない。
  window.MEGANE_USER_AUDIO_DELETE_V104=function(id){
    id=String(id||"");
    if(!id) return Promise.reject(new Error("User audio id required"));
    return dbDelete(id).then(function(){
      removeAlbumByUserAudioId(id);
      if(objectUrls[id]){ try{ URL.revokeObjectURL(objectUrls[id]); }catch(_){ } delete objectUrls[id]; }
      if(artworkUrls[id]){ try{ URL.revokeObjectURL(artworkUrls[id]); }catch(_){ } delete artworkUrls[id]; }
      if(videoUrls[id]){ try{ URL.revokeObjectURL(videoUrls[id]); }catch(_){ } delete videoUrls[id]; }
      render();
      return true;
    });
  };

  function albumFromRow(row){
    if(!row || !row.id || !row.blob) return null;
    if(objectUrls[row.id]){
      try{ URL.revokeObjectURL(objectUrls[row.id]); }catch(_){ }
    }
    var src=URL.createObjectURL(row.blob);
    objectUrls[row.id]=src;
    var title=String(row.title||row.fileName||"音声ファイル");
    if(artworkUrls[row.id]){ try{ URL.revokeObjectURL(artworkUrls[row.id]); }catch(_){ } }
    var artworkBlob=row.artworkBlob || null;
    var cover=artworkBlob ? URL.createObjectURL(artworkBlob) : (row.cover || legacyCoverData(title));
    if(artworkBlob) artworkUrls[row.id]=cover;
    if(videoUrls[row.id]){ try{ URL.revokeObjectURL(videoUrls[row.id]); }catch(_){ } delete videoUrls[row.id]; }
    var video="";
    if(row.videoBlob){ video=URL.createObjectURL(row.videoBlob); videoUrls[row.id]=video; }
    return {
      id:"user_audio_album_"+row.id,
      type:"single",
      title:title,
      desc:"追加した音声",
      cover:cover,
      createdAt:Number(row.createdAt||Date.now()),
      _meganeUserAudio149:true,
      artworkMime: artworkBlob ? (artworkBlob.type || "image/png") : "",
      artworkType: row.artworkType || (row.videoBlob?"video":"image"),
      tracks:[{
        id:"user_audio_track_"+row.id,
        title:title,
        audio:src,
        cover:cover,
        video:video,
        videoLoop:!!video && row.videoLoop!==false,
        artworkType: row.artworkType || (video?"video":"image"),
        artworkMime: artworkBlob ? (artworkBlob.type || "image/png") : "",
        memo:String(row.memo||row.lyrics||row.text||""),
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

      // 最優先で既存曲を復元する。PNG移行に失敗しても曲と＋ボタンは消さない。
      var changed=false;
      rows.forEach(function(row){
        var a=albumFromRow(row);
        if(a && insertAlbum(a)) changed=true;
      });
      if(changed) render();

      // 旧SVGジャケットの1200px PNG化はバックグラウンドで1件ずつ実行。
      rows.forEach(function(row){
        if(row.artworkBlob) return;
        defaultArtworkBlob(row.title||row.fileName||"MY AUDIO").then(function(blob){
          row.artworkBlob=blob; row.artworkVersion=103; row.cover="";
          return dbPut(row);
        }).then(function(){
          var a=albumFromRow(row);
          if(a && insertAlbum(a)) render();
        }).catch(function(err){
          console.warn("[149] artwork migration skipped",row && row.id,err);
        });
      });
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
    defaultArtworkBlob(title).then(function(artworkBlob){
      var row={
        id:uid(), title:title, fileName:file.name||title,
        mime:file.type||"application/octet-stream", size:Number(file.size||0),
        blob:file, createdAt:Date.now(), artworkBlob:artworkBlob, artworkVersion:108, artworkAuto:true, artworkType:"image", videoBlob:null, videoLoop:false, cover:"", memo:""
      };
      return dbPut(row).then(function(){
      var album=albumFromRow(row);
      insertAlbum(album);
      render();
      toast("迷子に追加しました♪");
      try{ if(navigator.vibrate) navigator.vibrate([12,28,12]); }catch(_){ }
      });
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
      input.accept=".mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus";
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
        if(!sourceFileNoticeV108()) return;
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
    Object.keys(artworkUrls).forEach(function(k){ try{URL.revokeObjectURL(artworkUrls[k]);}catch(_){ } });
    Object.keys(videoUrls).forEach(function(k){ try{URL.revokeObjectURL(videoUrls[k]);}catch(_){ } });
  });
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
