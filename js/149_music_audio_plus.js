/* v1.12.2: long-title guard + pencil edit icon + album title counter */
/* v1.12.4: fixed album editor footer + inherit album artwork for auto-art tracks */
/* v1.10: custom album detail + add tracks from 持ち物 */
/* v1.09: custom album creation + 持ち物 label */
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
  var ALBUM_IMAGE_INPUT_ID = "musicAlbumImage109";
  var PLUS_MENU_ID = "musicPlusMenu109";
  var ALBUM_SHEET_ID = "musicAlbumCreate109";
  var ALBUM_DETAIL_ID = "musicAlbumDetail110";
  var ALBUM_PICKER_ID = "musicAlbumPicker110";
  var ALBUM_EDIT_ID = "musicAlbumEdit112";
  var ALBUM_EDIT_IMAGE_INPUT_ID = "musicAlbumEditImage112";
  var STYLE_ID = "musicAudioPlusStyle149";
  var USER_MARK = "_meganeUserAudio149";
  var objectUrls = Object.create(null);
  var artworkUrls = Object.create(null);
  var videoUrls = Object.create(null);
  var customAlbumArtworkUrls = Object.create(null);
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

  function defaultAlbumArtworkBlobV109(title){
    var canvas=document.createElement("canvas");
    canvas.width=ARTWORK_SIZE; canvas.height=ARTWORK_SIZE;
    var ctx=canvas.getContext("2d");
    var g=ctx.createLinearGradient(0,0,ARTWORK_SIZE,ARTWORK_SIZE);
    g.addColorStop(0,"#553448"); g.addColorStop(.5,"#241522"); g.addColorStop(1,"#0c080d");
    ctx.fillStyle=g; ctx.fillRect(0,0,ARTWORK_SIZE,ARTWORK_SIZE);
    ctx.strokeStyle="rgba(255,238,166,.58)"; ctx.lineWidth=9;
    ctx.strokeRect(260,300,680,500);
    ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(300,340,600,420);
    ctx.fillStyle="#fff2b2"; ctx.font="190px -apple-system,BlinkMacSystemFont,sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("♪",600,520);
    ctx.fillStyle="#fff"; ctx.font="800 58px -apple-system,BlinkMacSystemFont,sans-serif";
    ctx.fillText("CUSTOM ALBUM",600,900);
    ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="42px -apple-system,BlinkMacSystemFont,sans-serif";
    ctx.fillText(safeText(title).slice(0,20),600,985);
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

  function customAlbumFromRowV109(row){
    if(!row || row.recordType!=="customAlbum" || !row.id) return null;
    if(customAlbumArtworkUrls[row.id]){ try{ URL.revokeObjectURL(customAlbumArtworkUrls[row.id]); }catch(_){ } }
    var cover="";
    if(row.artworkBlob){ cover=URL.createObjectURL(row.artworkBlob); customAlbumArtworkUrls[row.id]=cover; }
    return {
      id:"user_custom_album_"+row.id,
      type:"album",
      title:String(row.title||"新しいアルバム"),
      desc:String((row.trackIds||[]).length)+"曲",
      cover:cover,
      tracks:[],
      createdAt:Number(row.createdAt||Date.now()),
      _meganeCustomAlbum109:true,
      _meganeCustomAlbum110:true,
      _userCustomAlbumId:row.id,
      _trackIds:Array.isArray(row.trackIds)?row.trackIds.slice():[]
    };
  }

  window.MEGANE_CUSTOM_ALBUM_CREATE_V109=function(title,imageBlob){
    title=String(title||"").trim().slice(0,80);
    if(!title) return Promise.reject(new Error("Album title required"));
    var artPromise=imageBlob ? normalizeArtworkBlob(imageBlob) : defaultAlbumArtworkBlobV109(title);
    return artPromise.then(function(artworkBlob){
      var row={recordType:"customAlbum",id:uid(),title:title,createdAt:Date.now(),artworkBlob:artworkBlob,artworkAuto:!imageBlob,trackIds:[]};
      return dbPut(row).then(function(){
        var album=customAlbumFromRowV109(row);
        insertAlbum(album); render(); return row;
      });
    });
  };


  function userAudioIdFromAlbumV110(album){
    if(!album) return "";
    if(album._meganeUserAudio149 && album.tracks && album.tracks[0] && album.tracks[0]._userAudioId) return String(album.tracks[0]._userAudioId);
    var m=String(album.id||"").match(/^user_audio_album_(.+)$/);
    return m?m[1]:"";
  }

  function availableSinglesV110(){
    var arr=playlists()||[];
    return arr.filter(function(a){ return a && a.type==="single" && userAudioIdFromAlbumV110(a); });
  }

  function syncOneCustomAlbumTracksV110(album){
    if(!album || !album._meganeCustomAlbum109) return album;
    var ids=Array.isArray(album._trackIds)?album._trackIds:[];
    var singles=availableSinglesV110();
    var byId=Object.create(null);
    singles.forEach(function(a){ var id=userAudioIdFromAlbumV110(a); if(id && a.tracks && a.tracks[0]) byId[id]=a.tracks[0]; });
    album.tracks=ids.map(function(id){
      var source=byId[String(id)]||null;
      if(!source) return null;
      // Do not mutate the original single in 持ち物. A custom album receives
      // its own lightweight runtime copy so album-context artwork can differ.
      var t=Object.assign({},source);
      var hasOwnArtwork=(source.artworkAuto===false) || source.artworkType==="video" || !!source.video;
      if(!hasOwnArtwork && album.cover){
        t.cover=album.cover;
        t.artworkMime=album.artworkMime||t.artworkMime||"image/png";
        t._albumArtworkInheritedV1124=true;
      }
      return t;
    }).filter(Boolean);
    album.desc=album.tracks.length+"曲";
    return album;
  }

  function syncAllCustomAlbumTracksV110(){
    (playlists()||[]).forEach(syncOneCustomAlbumTracksV110);
  }

  function customAlbumRuntimeByIdV110(id){
    return (playlists()||[]).find(function(a){ return a && a._meganeCustomAlbum109 && String(a._userCustomAlbumId)===String(id); })||null;
  }

  window.MEGANE_CUSTOM_ALBUM_SET_TRACKS_V110=function(id,trackIds){
    id=String(id||"");
    trackIds=Array.isArray(trackIds)?trackIds.map(String).filter(Boolean):[];
    return dbGet(id).then(function(row){
      if(!row || row.recordType!=="customAlbum") throw new Error("Custom album not found");
      row.trackIds=trackIds;
      row.updatedAt=Date.now();
      return dbPut(row).then(function(){
        var album=customAlbumRuntimeByIdV110(id);
        if(album){ album._trackIds=trackIds.slice(); syncOneCustomAlbumTracksV110(album); }
        render();
        return row;
      });
    });
  };

  function refreshCustomAlbumRuntimeV112(row){
    var old=customAlbumRuntimeByIdV110(row.id);
    var fresh=customAlbumFromRowV109(row);
    if(old && fresh){
      Object.keys(old).forEach(function(k){ delete old[k]; });
      Object.keys(fresh).forEach(function(k){ old[k]=fresh[k]; });
      syncOneCustomAlbumTracksV110(old);
      return old;
    }
    if(fresh){ insertAlbum(fresh); syncOneCustomAlbumTracksV110(fresh); }
    return fresh;
  }

  window.MEGANE_CUSTOM_ALBUM_UPDATE_V112=function(id,changes){
    id=String(id||""); changes=changes||{};
    return dbGet(id).then(function(row){
      if(!row || row.recordType!=="customAlbum") throw new Error("Custom album not found");
      var nextTitle=String(changes.title==null?row.title:changes.title).trim().slice(0,80);
      if(!nextTitle) throw new Error("Album title required");
      var artPromise=Promise.resolve(row.artworkBlob);
      if(changes.artworkBlob) artPromise=normalizeArtworkBlob(changes.artworkBlob);
      else if(changes.resetArtwork || (row.artworkAuto && nextTitle!==row.title)) artPromise=defaultAlbumArtworkBlobV109(nextTitle);
      return artPromise.then(function(blob){
        row.title=nextTitle;
        if(blob) row.artworkBlob=blob;
        if(changes.artworkBlob) row.artworkAuto=false;
        if(changes.resetArtwork) row.artworkAuto=true;
        if(Array.isArray(changes.trackIds)) row.trackIds=changes.trackIds.map(String).filter(Boolean);
        row.updatedAt=Date.now();
        return dbPut(row).then(function(){ refreshCustomAlbumRuntimeV112(row); render(); return row; });
      });
    });
  };

  window.MEGANE_CUSTOM_ALBUM_DELETE_V112=function(id){
    id=String(id||"");
    return dbGet(id).then(function(row){
      if(!row || row.recordType!=="customAlbum") throw new Error("Custom album not found");
      return dbDelete(id).then(function(){
        var arr=playlists()||[];
        for(var i=arr.length-1;i>=0;i--){ if(arr[i] && arr[i]._meganeCustomAlbum109 && String(arr[i]._userCustomAlbumId)===id) arr.splice(i,1); }
        if(customAlbumArtworkUrls[id]){ try{URL.revokeObjectURL(customAlbumArtworkUrls[id]);}catch(_){ } delete customAlbumArtworkUrls[id]; }
        render(); return true;
      });
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
      artworkAuto: row.artworkAuto!==false,
      tracks:[{
        id:"user_audio_track_"+row.id,
        title:title,
        audio:src,
        cover:cover,
        video:video,
        videoLoop:!!video && row.videoLoop!==false,
        artworkType: row.artworkType || (video?"video":"image"),
        artworkAuto: row.artworkAuto!==false,
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

      // カスタムアルバムと既存曲を同じDBから安全に復元する。
      var changed=false;
      rows.filter(function(row){ return row && row.recordType==="customAlbum"; }).forEach(function(row){
        var ca=customAlbumFromRowV109(row);
        if(ca && insertAlbum(ca)) changed=true;
      });
      rows.filter(function(row){ return !row || row.recordType!=="customAlbum"; }).forEach(function(row){
        var a=albumFromRow(row);
        if(a && insertAlbum(a)) changed=true;
      });
      syncAllCustomAlbumTracksV110();
      if(changed) render();

      // 旧SVGジャケットの1200px PNG化はバックグラウンドで1件ずつ実行。
      rows.forEach(function(row){
        if(row && row.recordType==="customAlbum") return;
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
  function ensureAlbumEditImageInputV112(){
    var editAlbumImage=q(ALBUM_EDIT_IMAGE_INPUT_ID);
    if(editAlbumImage) return editAlbumImage;
    editAlbumImage=document.createElement("input");
    editAlbumImage.id=ALBUM_EDIT_IMAGE_INPUT_ID;
    editAlbumImage.type="file";
    editAlbumImage.accept="image/*";
    editAlbumImage.addEventListener("change",function(){
      var f=editAlbumImage.files&&editAlbumImage.files[0];
      editAlbumImage.value="";
      if(!f) return;
      pendingAlbumEditImageV112=f;
      if(pendingAlbumEditImageUrlV112){ try{URL.revokeObjectURL(pendingAlbumEditImageUrlV112);}catch(_){ } }
      pendingAlbumEditImageUrlV112=URL.createObjectURL(f);
      var pv=q("musicAlbumEditPreview112");
      if(pv) pv.src=pendingAlbumEditImageUrlV112;
    });
    document.body.appendChild(editAlbumImage);
    return editAlbumImage;
  }
  function setBusy(on){
    busy=!!on;
    ensureAlbumEditImageInputV112();
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
      syncAllCustomAlbumTracksV110();
      render();
      toast("持ち物に追加しました♪");
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
      "#"+BUTTON_ID+"[hidden]{display:none!important}#"+INPUT_ID+",#"+ALBUM_IMAGE_INPUT_ID+",#"+ALBUM_EDIT_IMAGE_INPUT_ID+"{display:none!important}"+
      ".music-plus-mask109{position:fixed;inset:0;z-index:2147482990;background:rgba(0,0,0,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}"+
      ".music-plus-sheet109{position:fixed;left:14px;right:14px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147482991;padding:12px;border-radius:24px;background:rgba(26,18,28,.97);border:1px solid rgba(255,255,255,.16);box-shadow:0 22px 60px rgba(0,0,0,.55)}"+
      ".music-plus-sheet109 button{width:100%;border:0;border-radius:16px;padding:16px 14px;margin:4px 0;background:rgba(255,255,255,.07);color:#fff;text-align:left;font-size:16px;font-weight:900}"+
      ".music-album-create109{position:fixed;left:14px;right:14px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147483000;padding:18px;border-radius:26px;background:rgba(26,18,28,.985);border:1px solid rgba(255,255,255,.16);box-shadow:0 22px 60px rgba(0,0,0,.58)}"+
      ".music-album-create109 h3{margin:0 0 14px;color:#fff;font-size:19px}.music-album-create109 input[type=text]{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(255,255,255,.07);color:#fff;font-size:16px;padding:13px 14px;outline:none}"+
      ".music-album-create109 .album109-preview{width:112px;height:112px;margin:14px auto;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.06);display:grid;place-items:center;color:rgba(255,255,255,.55);font-weight:900}.music-album-create109 .album109-preview img{width:100%;height:100%;object-fit:cover}"+
      ".music-album-create109 .album109-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.music-album-create109 button{border:0;border-radius:14px;padding:13px;background:rgba(255,255,255,.08);color:#fff;font-weight:900}.music-album-create109 button.primary{background:#fff;color:#251522}.music-album-create109 small{display:block;margin-top:11px;color:rgba(255,255,255,.55);line-height:1.45}"+
      ".music-album-detail110{position:fixed;inset:calc(92px + env(safe-area-inset-top)) 12px calc(86px + env(safe-area-inset-bottom));z-index:2147483000;overflow:auto;-webkit-overflow-scrolling:touch;padding:18px;border-radius:27px;background:rgba(24,15,26,.985);border:1px solid rgba(255,255,255,.15);box-shadow:0 24px 70px rgba(0,0,0,.62);color:#fff}"+
      ".music-album-detail110 .head110{display:flex;align-items:center;gap:13px}.music-album-detail110 .cover110{width:74px;height:74px;border-radius:15px;object-fit:cover;background:#100b12}.music-album-detail110 .copy110{min-width:0;flex:1}.music-album-detail110 h3{margin:0;font-size:21px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.music-album-detail110 .count110{margin-top:5px;color:rgba(255,255,255,.58);font-size:12px;font-weight:850}.music-album-detail110 .close110{width:42px;height:42px;border:0;background:transparent;color:#fff;font-size:29px}"+
      ".music-album-detail110 .empty110{margin:25px 0;padding:28px 14px;border:1px dashed rgba(255,255,255,.16);border-radius:18px;color:rgba(255,255,255,.55);text-align:center;font-weight:850;line-height:1.6}.music-album-detail110 .tracks110{display:grid;gap:9px;margin:18px 0}.music-album-detail110 .track110{display:grid;grid-template-columns:46px minmax(0,1fr);align-items:center;gap:11px;padding:9px;border-radius:15px;background:rgba(255,255,255,.055)}.music-album-detail110 .track110 img{width:46px;height:46px;border-radius:11px;object-fit:cover}.music-album-detail110 .track110 strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
      ".music-album-detail110 .add110{width:100%;min-height:54px;border:1px solid rgba(255,232,138,.28);border-radius:16px;background:rgba(255,232,138,.11);color:#ffe88a;font-size:16px;font-weight:900}.music-album-picker110{position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:2147483010;max-height:70dvh;overflow:auto;padding:17px;border-radius:25px;background:rgba(24,15,26,.995);border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 70px rgba(0,0,0,.66);color:#fff}.music-album-picker110 h3{margin:0 0 12px}.music-album-picker110 label{display:grid;grid-template-columns:24px 48px minmax(0,1fr);align-items:center;gap:10px;padding:9px 3px;border-bottom:1px solid rgba(255,255,255,.07)}.music-album-picker110 label img{width:48px;height:48px;border-radius:11px;object-fit:cover}.music-album-picker110 label strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.music-album-picker110 .actions110{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.music-album-picker110 button{min-height:48px;border:0;border-radius:14px;background:rgba(255,255,255,.08);color:#fff;font-weight:900}.music-album-picker110 button.primary{background:#fff;color:#251522}"+
      ".music-album-edit112{position:fixed;inset:calc(82px + env(safe-area-inset-top)) 12px calc(76px + env(safe-area-inset-bottom));z-index:2147483020;overflow:hidden;padding:18px;border-radius:27px;background:rgba(24,15,26,.992);border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 70px rgba(0,0,0,.66);color:#fff;display:flex;flex-direction:column;box-sizing:border-box}.music-album-edit112 .head112{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.music-album-edit112 .head112 strong{font-size:21px}.music-album-edit112 .head112 button{width:42px;height:42px;border:0;background:transparent;color:#fff;font-size:29px}.music-album-edit112 .art112{display:grid;grid-template-columns:108px minmax(0,1fr);gap:14px;align-items:center}.music-album-edit112 .art112 img{width:108px;height:108px;border-radius:18px;object-fit:cover;background:#100b12}.music-album-edit112 .art112 div{display:grid;gap:9px}.music-album-edit112 button{border:0;border-radius:14px;min-height:46px;padding:10px 13px;background:rgba(255,255,255,.08);color:#fff;font-weight:900}.music-album-edit112 .title112{display:grid;gap:7px;margin:17px 0;color:rgba(255,255,255,.68);font-size:12px;font-weight:900}.music-album-edit112 .title112 input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(255,255,255,.07);color:#fff;font-size:16px;padding:13px 14px;outline:none}.music-album-edit112 .title-meta1122{display:flex;justify-content:space-between;gap:12px;margin-top:1px;font-size:11px}.music-album-edit112 .title-count1122{color:rgba(255,255,255,.46);white-space:nowrap}.music-album-edit112 .title-warn1122{color:rgba(255,232,138,.78);opacity:0;transition:opacity .15s}.music-album-edit112 .title-warn1122.show{opacity:1}.music-album-edit112 .section112{display:flex;flex-direction:column;min-height:0;flex:1}.music-album-edit112 .section112>strong{display:block;margin:8px 0 8px;flex:0 0 auto}.music-album-edit112 .trackpick112{min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding-right:2px;overscroll-behavior:contain}.music-album-edit112 .trackpick112 label{display:grid;grid-template-columns:24px 48px minmax(0,1fr);align-items:center;gap:10px;padding:9px 3px;border-bottom:1px solid rgba(255,255,255,.07)}.music-album-edit112 .trackpick112 img{width:48px;height:48px;border-radius:11px;object-fit:cover}.music-album-edit112 .trackpick112 strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.music-album-edit112 .footer1124{flex:0 0 auto;padding-top:12px;background:linear-gradient(to bottom,rgba(24,15,26,0),rgba(24,15,26,.992) 12px)}.music-album-edit112 .save112{width:100%;margin-top:0;background:#fff;color:#251522}.music-album-edit112 .delete112{width:100%;margin-top:9px;min-height:42px;background:rgba(255,75,91,.12);color:#ff8e99;border:1px solid rgba(255,75,91,.28)}.music-album-edit112 .notice112{display:block;margin-top:6px;color:rgba(255,255,255,.48);font-size:10px;line-height:1.35;text-align:center}"+
      ".music-audio-toast149{position:fixed;left:50%;bottom:calc(158px + env(safe-area-inset-bottom));z-index:2147483003;transform:translateX(-50%);padding:10px 15px;border-radius:999px;background:rgba(14,10,17,.94);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;white-space:nowrap;pointer-events:none;box-shadow:0 14px 38px rgba(0,0,0,.42);animation:musicAudioToast149 1.5s ease both}"+
      "@keyframes musicAudioToast149{0%{opacity:0;transform:translate(-50%,9px)}14%,76%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}@keyframes musicAudioPlusPulse149{to{transform:scale(.94);opacity:.55}}";
    document.head.appendChild(st);
  }
  var pendingAlbumImageV109=null;
  var pendingAlbumImageUrlV109="";
  function closeOverlayV109(){
    [PLUS_MENU_ID,ALBUM_SHEET_ID,ALBUM_DETAIL_ID,ALBUM_PICKER_ID,ALBUM_EDIT_ID,"musicPlusMask109"].forEach(function(id){ var el=q(id); if(el) el.remove(); });
    if(pendingAlbumImageUrlV109){ try{URL.revokeObjectURL(pendingAlbumImageUrlV109);}catch(_){ } pendingAlbumImageUrlV109=""; }
    pendingAlbumImageV109=null;
  }
  function openPlusMenuV109(){
    closeOverlayV109();
    var mask=document.createElement("div"); mask.id="musicPlusMask109"; mask.className="music-plus-mask109"; mask.onclick=closeOverlayV109;
    var sh=document.createElement("div"); sh.id=PLUS_MENU_ID; sh.className="music-plus-sheet109";
    sh.innerHTML='<button type="button" data-act="audio">🎵 音声ファイルを追加</button><button type="button" data-act="album">📀 アルバムを作る</button>';
    sh.onclick=function(e){ e.stopPropagation(); var act=e.target&&e.target.dataset&&e.target.dataset.act; if(act==="audio"){ closeOverlayV109(); if(!sourceFileNoticeV108()) return; var f=q(INPUT_ID); if(f) f.click(); } if(act==="album"){ closeOverlayV109(); openAlbumCreateV109(); } };
    document.body.appendChild(mask); document.body.appendChild(sh);
  }
  function openAlbumCreateV109(){
    closeOverlayV109();
    var mask=document.createElement("div"); mask.id="musicPlusMask109"; mask.className="music-plus-mask109"; mask.onclick=closeOverlayV109;
    var sh=document.createElement("div"); sh.id=ALBUM_SHEET_ID; sh.className="music-album-create109";
    sh.innerHTML='<h3>新しいアルバム</h3><input id="musicAlbumTitle109" type="text" maxlength="80" placeholder="アルバム名"><div class="album-title-meta109"><span id="musicAlbumTitleWarn109" style="color:rgba(255,232,138,.78);opacity:0;">一覧では2行で省略表示されます。</span><span id="musicAlbumTitleCount109" style="margin-left:auto;color:rgba(255,255,255,.46);">0 / 80</span></div><div class="album109-preview" id="musicAlbumPreview109">CUSTOM<br>ALBUM</div><div class="album109-actions"><button type="button" id="musicAlbumImageBtn109">画像を選ぶ</button><button type="button" class="primary" id="musicAlbumCreateBtn109">作成</button></div><small>曲は次の段階で追加できます。元の画像ファイルは削除せず保管してください。</small>';
    sh.onclick=function(e){ e.stopPropagation(); };
    document.body.appendChild(mask); document.body.appendChild(sh);
    var titleInput109=q("musicAlbumTitle109"), titleCount109=q("musicAlbumTitleCount109"), titleWarn109=q("musicAlbumTitleWarn109");
    function updateTitleMeta109(){ var n=String((titleInput109||{}).value||"").length; if(titleCount109) titleCount109.textContent=n+" / 80"; if(titleWarn109) titleWarn109.style.opacity=n>32?"1":"0"; }
    if(titleInput109) titleInput109.addEventListener("input",updateTitleMeta109); updateTitleMeta109();
    setTimeout(function(){ var t=q("musicAlbumTitle109"); if(t) t.focus(); },50);
    q("musicAlbumImageBtn109").onclick=function(){ if(!sourceFileNoticeV108()) return; var inp=q(ALBUM_IMAGE_INPUT_ID); if(inp) inp.click(); };
    q("musicAlbumCreateBtn109").onclick=function(){
      var title=String((q("musicAlbumTitle109")||{}).value||"").trim();
      if(!title){ toast("アルバム名を入力してください"); return; }
      setBusy(true);
      window.MEGANE_CUSTOM_ALBUM_CREATE_V109(title,pendingAlbumImageV109).then(function(){ closeOverlayV109(); toast("アルバムを作りました♪"); }).catch(function(err){ console.error("[149] album create failed",err); toast("アルバムを作れませんでした"); }).finally(function(){ setBusy(false); syncButton(); });
    };
  }


  function escAttrV110(s){ return String(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function escHtmlV110(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

  function openCustomAlbumDetailV110(album){
    if(!album || !album._meganeCustomAlbum109) return;
    closeOverlayV109();
    syncOneCustomAlbumTracksV110(album);
    var mask=document.createElement("div"); mask.id="musicPlusMask109"; mask.className="music-plus-mask109"; mask.onclick=closeOverlayV109;
    var sh=document.createElement("div"); sh.id=ALBUM_DETAIL_ID; sh.className="music-album-detail110";
    var tracks=album.tracks||[];
    var rows=tracks.map(function(t){ return '<div class="track110"><img src="'+escAttrV110(t.cover||album.cover||'')+'" alt=""><strong>'+escHtmlV110(t.title||'音声ファイル')+'</strong></div>'; }).join("");
    sh.innerHTML='<div class="head110"><img class="cover110" src="'+escAttrV110(album.cover||'')+'" alt=""><div class="copy110"><h3>'+escHtmlV110(album.title||'カスタムアルバム')+'</h3><div class="count110">'+tracks.length+'曲</div></div><button type="button" class="close110">×</button></div>'+(tracks.length?'<div class="tracks110">'+rows+'</div>':'<div class="empty110">まだ曲がありません。<br>持ち物から曲を追加できます。</div>')+'<button type="button" class="add110">＋ 持ち物から追加</button>';
    sh.onclick=function(e){ e.stopPropagation(); };
    sh.querySelector('.close110').onclick=closeOverlayV109;
    sh.querySelector('.add110').onclick=function(){ openCustomAlbumPickerV110(album); };
    document.body.appendChild(mask); document.body.appendChild(sh);
  }

  function openCustomAlbumPickerV110(album){
    var old=q(ALBUM_PICKER_ID); if(old) old.remove();
    var singles=availableSinglesV110();
    var selected=Object.create(null); (album._trackIds||[]).forEach(function(id){selected[String(id)]=1;});
    var sh=document.createElement("div"); sh.id=ALBUM_PICKER_ID; sh.className="music-album-picker110";
    var rows=singles.map(function(a){ var id=userAudioIdFromAlbumV110(a),t=a.tracks&&a.tracks[0]; return '<label><input type="checkbox" data-track-id="'+escAttrV110(id)+'" '+(selected[id]?'checked':'')+'><img src="'+escAttrV110((t&&t.cover)||a.cover||'')+'" alt=""><strong>'+escHtmlV110((t&&t.title)||a.title||'音声ファイル')+'</strong></label>'; }).join('');
    sh.innerHTML='<h3>🎒 持ち物から追加</h3>'+(rows||'<div class="empty110">持ち物がまだありません。</div>')+'<div class="actions110"><button type="button" data-act="cancel">戻る</button><button type="button" class="primary" data-act="save">追加</button></div>';
    sh.onclick=function(e){ e.stopPropagation(); var act=e.target&&e.target.dataset&&e.target.dataset.act; if(act==='cancel'){ sh.remove(); } if(act==='save'){ var ids=Array.prototype.slice.call(sh.querySelectorAll('input[data-track-id]:checked')).map(function(x){return x.dataset.trackId;}); var b=e.target; b.disabled=true; window.MEGANE_CUSTOM_ALBUM_SET_TRACKS_V110(album._userCustomAlbumId,ids).then(function(){ toast('アルバムを更新しました♪'); var fresh=customAlbumRuntimeByIdV110(album._userCustomAlbumId)||album; openCustomAlbumDetailV110(fresh); }).catch(function(err){ console.error('[149] album tracks save failed',err); toast('追加できませんでした'); b.disabled=false; }); } };
    document.body.appendChild(sh);
  }

  // v1.12: 一覧上の「…」は廃止。長押しは並び替え専用。
  // プレイヤーの曲一覧ヘッダーにある「編集」からアルバム編集を開く。
  var pendingAlbumEditImageV112=null;
  var pendingAlbumEditImageUrlV112="";

  function clearPendingAlbumEditImageV112(){
    if(pendingAlbumEditImageUrlV112){ try{URL.revokeObjectURL(pendingAlbumEditImageUrlV112);}catch(_){ } }
    pendingAlbumEditImageUrlV112=""; pendingAlbumEditImageV112=null;
  }

  function openCustomAlbumEditV112(albumOrId){
    var album=typeof albumOrId==="string" ? customAlbumRuntimeByIdV110(albumOrId) : albumOrId;
    if(!album || !album._meganeCustomAlbum109) return;
    closeOverlayV109(); clearPendingAlbumEditImageV112(); syncOneCustomAlbumTracksV110(album);
    var mask=document.createElement("div"); mask.id="musicPlusMask109"; mask.className="music-plus-mask109";
    var sh=document.createElement("div"); sh.id=ALBUM_EDIT_ID; sh.className="music-album-edit112";
    var singles=availableSinglesV110();
    var selected=Object.create(null); (album._trackIds||[]).forEach(function(id){ selected[String(id)]=1; });
    var rows=singles.map(function(a){
      var id=userAudioIdFromAlbumV110(a),t=a.tracks&&a.tracks[0];
      return '<label><input type="checkbox" data-track-id="'+escAttrV110(id)+'" '+(selected[id]?'checked':'')+'><img src="'+escAttrV110((t&&t.cover)||a.cover||'')+'" alt=""><strong>'+escHtmlV110((t&&t.title)||a.title||'音声ファイル')+'</strong></label>';
    }).join('');
    sh.innerHTML='<div class="head112"><strong>アルバムを編集</strong><button type="button" data-act="close">×</button></div>'+
      '<div class="art112"><img id="musicAlbumEditPreview112" src="'+escAttrV110(album.cover||'')+'" alt=""><div><button type="button" data-act="image">画像を選ぶ</button><button type="button" data-act="reset">デフォルトに戻す</button></div></div>'+
      '<label class="title112">アルバム名<input id="musicAlbumEditTitle112" type="text" maxlength="80" value="'+escAttrV110(album.title||'')+'"><span class="title-meta1122"><span id="musicAlbumEditWarn1122" class="title-warn1122">一覧では2行で省略表示されます。</span><span id="musicAlbumEditCount1122" class="title-count1122">0 / 80</span></span></label>'+
      '<div class="section112"><strong>曲を追加・解除</strong><div class="trackpick112">'+(rows||'<div class="empty110">持ち物がまだありません。</div>')+'</div></div>'+
      '<div class="footer1124"><button type="button" class="save112" data-act="save">変更を保存</button>'+
      '<button type="button" class="delete112" data-act="delete">このアルバムを削除</button>'+
      '<small class="notice112">アルバムを削除しても、中の曲は「🎒 持ち物」に残ります。</small></div>';
    var titleInput1122=sh.querySelector('#musicAlbumEditTitle112'), titleCount1122=sh.querySelector('#musicAlbumEditCount1122'), titleWarn1122=sh.querySelector('#musicAlbumEditWarn1122');
    function updateTitleMeta1122(){ var n=String((titleInput1122||{}).value||'').length; if(titleCount1122) titleCount1122.textContent=n+' / 80'; if(titleWarn1122) titleWarn1122.classList.toggle('show',n>32); }
    if(titleInput1122) titleInput1122.addEventListener('input',updateTitleMeta1122); updateTitleMeta1122();
    function close(){ clearPendingAlbumEditImageV112(); closeOverlayV109(); }
    mask.onclick=close;
    sh.onclick=function(e){
      e.stopPropagation();
      var act=e.target&&e.target.dataset&&e.target.dataset.act;
      if(act==='close'){ close(); return; }
      if(act==='image'){ if(!sourceFileNoticeV108()) return; var inp=ensureAlbumEditImageInputV112(); if(inp) inp.click(); return; }
      if(act==='reset'){
        pendingAlbumEditImageV112={_reset:true};
        defaultAlbumArtworkBlobV109(String((q('musicAlbumEditTitle112')||{}).value||album.title)).then(function(blob){
          if(pendingAlbumEditImageUrlV112){ try{URL.revokeObjectURL(pendingAlbumEditImageUrlV112);}catch(_){ } }
          pendingAlbumEditImageUrlV112=URL.createObjectURL(blob);
          var pv=q('musicAlbumEditPreview112'); if(pv) pv.src=pendingAlbumEditImageUrlV112;
        });
        return;
      }
      if(act==='save'){
        var title=String((q('musicAlbumEditTitle112')||{}).value||'').trim();
        if(!title){ toast('アルバム名を入力してください'); return; }
        var ids=Array.prototype.slice.call(sh.querySelectorAll('input[data-track-id]:checked')).map(function(x){return x.dataset.trackId;});
        var b=e.target; b.disabled=true;
        var changes={title:title,trackIds:ids};
        if(pendingAlbumEditImageV112 && pendingAlbumEditImageV112._reset) changes.resetArtwork=true;
        else if(pendingAlbumEditImageV112) changes.artworkBlob=pendingAlbumEditImageV112;
        window.MEGANE_CUSTOM_ALBUM_UPDATE_V112(album._userCustomAlbumId,changes).then(function(){ close(); toast('アルバムを更新しました♪'); }).catch(function(err){ console.error('[149] album update failed',err); toast('更新できませんでした'); b.disabled=false; });
        return;
      }
      if(act==='delete'){
        var name=album.title||'このアルバム';
        var ok=window.confirm('「'+name+'」を削除しますか？\n\nアルバムだけ削除されます。\n中の曲は「🎒 持ち物」に残ります。');
        if(!ok) return;
        e.target.disabled=true;
        window.MEGANE_CUSTOM_ALBUM_DELETE_V112(album._userCustomAlbumId).then(function(){ close(); toast('アルバムを削除しました'); try{ if(typeof window.MEGANE_MUSIC_V7_OPEN_ALBUMS==='function') window.MEGANE_MUSIC_V7_OPEN_ALBUMS(); }catch(_){ } }).catch(function(err){ console.error('[149] album delete failed',err); toast('削除できませんでした'); e.target.disabled=false; });
      }
    };
    document.body.appendChild(mask); document.body.appendChild(sh);
  }
  window.MEGANE_CUSTOM_ALBUM_OPEN_EDIT_V112=function(id){ openCustomAlbumEditV112(String(id||'')); };

  document.addEventListener("click",function(e){
    var btn=e.target&&e.target.closest&&e.target.closest("[data-album]");
    if(!btn || !isAlbumShelf()) return;
    var idx=Number(btn.dataset.album||0), album=(playlists()||[])[idx];
    if(!album || !album._meganeCustomAlbum109) return;
    syncOneCustomAlbumTracksV110(album);
    if(!(album.tracks||[]).length){
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      openCustomAlbumDetailV110(album);
    }
  },true);

  function ensureUI(){
    injectStyle();
    var input=q(INPUT_ID);
    if(!input){
      input=document.createElement("input"); input.id=INPUT_ID; input.type="file";
      input.accept=".mp3,.m4a,.aac,.wav,.ogg,.oga,.flac,.opus";
      input.addEventListener("change",function(){ var f=input.files&&input.files[0]; input.value=""; if(f) addFile(f); });
      document.body.appendChild(input);
    }
    ensureAlbumEditImageInputV112();
    var albumImage=q(ALBUM_IMAGE_INPUT_ID);
    if(!albumImage){
      albumImage=document.createElement("input"); albumImage.id=ALBUM_IMAGE_INPUT_ID; albumImage.type="file"; albumImage.accept="image/*";
      albumImage.addEventListener("change",function(){
        var f=albumImage.files&&albumImage.files[0]; albumImage.value=""; if(!f) return;
        pendingAlbumImageV109=f;
        if(pendingAlbumImageUrlV109){ try{URL.revokeObjectURL(pendingAlbumImageUrlV109);}catch(_){ } }
        pendingAlbumImageUrlV109=URL.createObjectURL(f);
        var pv=q("musicAlbumPreview109"); if(pv) pv.innerHTML='<img src="'+pendingAlbumImageUrlV109+'" alt="">';
      });
      document.body.appendChild(albumImage);
    }
    var b=q(BUTTON_ID);
    if(!b){
      b=document.createElement("button"); b.id=BUTTON_ID; b.type="button"; b.textContent="＋";
      b.title="音声ファイルを追加"; b.setAttribute("aria-label","音声ファイルを追加");
      b.addEventListener("click",function(e){
        e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        if(busy) return;
        openPlusMenuV109();
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
    var decorateTimer111=0;
    var obs=new MutationObserver(function(){
      syncButton();
      clearTimeout(decorateTimer111);
      decorateTimer111=setTimeout(decorateCustomAlbums111,30);
    });
    obs.observe(document.body,{attributes:true,attributeFilter:["class"],childList:true,subtree:true});
    ["pageshow","resize","orientationchange"].forEach(function(t){ window.addEventListener(t,syncButton,{passive:true}); });
    document.addEventListener("click",function(){ setTimeout(function(){ syncButton();  },20); },true);
  }
  window.addEventListener("pagehide",function(){
    Object.keys(objectUrls).forEach(function(k){ try{URL.revokeObjectURL(objectUrls[k]);}catch(_){ } });
    Object.keys(artworkUrls).forEach(function(k){ try{URL.revokeObjectURL(artworkUrls[k]);}catch(_){ } });
    Object.keys(videoUrls).forEach(function(k){ try{URL.revokeObjectURL(videoUrls[k]);}catch(_){ } });
    Object.keys(customAlbumArtworkUrls).forEach(function(k){ try{URL.revokeObjectURL(customAlbumArtworkUrls[k]);}catch(_){ } });
  });
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
