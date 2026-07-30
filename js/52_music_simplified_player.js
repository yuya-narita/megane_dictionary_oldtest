/* 52_music_simplified_player.js
   MUSIC COMPLETE REBUILD V7
   MUSICだけを完全リビルド。
   - アルバム展示棚
   - Spotify寄り再生画面
   - 上スワイプ曲一覧ボトムシート
*/
(function(){
  "use strict";

  var LS = {
    album: "megane_music_v7_album",
    track: "megane_music_v7_track",
    favs: "megane_music_v7_favs",
    favOrder: "megane_music_v7_fav_order",
    repeat: "megane_music_v7_repeat",
    shuffle: "megane_music_v7_shuffle",
    pos: "megane_music_v7_pos"
  };

  var state = {
    screen: "albums",
    album: 0,
    track: 0,
    queueMode: "album",
    browsingAlbum: 0,
    browsingTrack: 0,
    sheet: false,
    lyrics: false,
    playing: false,
    repeat: localStorage.getItem("megane_music_v7_repeat") || "off",
    shuffle: localStorage.getItem("megane_music_v7_shuffle") === "1",
    touchY: 0,
    dragStartY: 0,
    sheetScrollTop: 0,
    sheetAlbumKey: "",
    favDeleteOpenId: "",
    favTouchStartX: 0,
    favTouchStartY: 0,
    favTouchMoveRow: null,
    favTouchMoved: false,
    favReorderTimer: 0,
    favReorderActive: false,
    favReorderRow: null,
    favReorderStartX: 0,
    favReorderStartY: 0,
    seeking: false
  };

  function $(id){ return document.getElementById(id); }
  function view(){ return $("musicView"); }
  function audio(){ return $("musicAudio"); }


  /* v8: MediaSession support for iPhone lock screen / Control Center */
  var mediaSessionReadyV8 = false;

  function absoluteUrlV8(src){
    if(!src) return "";
    try{ return new URL(src, location.href).href; }
    catch(e){ return src; }
  }

  function mediaArtworkV8(src){
    src = absoluteUrlV8(src || "");
    if(!src) return [];
    var type = /\.png(\?|#|$)/i.test(src) ? "image/png" : "image/jpeg";
    return [
      { src: src, sizes: "96x96", type: type },
      { src: src, sizes: "128x128", type: type },
      { src: src, sizes: "192x192", type: type },
      { src: src, sizes: "256x256", type: type },
      { src: src, sizes: "384x384", type: type },
      { src: src, sizes: "512x512", type: type }
    ];
  }

  function updateMediaSessionV8(){
    if(!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    bindMusicMediaActionsV8();
    var t = currentTrack();
    var a = visualAlbumFor(currentAlbum(), t);
    // v7.1: ロック画面/Control Centerも曲ごとのcoverを優先する。
    if(t && t.cover){
      a = Object.assign({}, a || {}, { cover: t.cover });
    }
    var info = parseTitle(t, state.track || 0);
    if(!t) return;
    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title || t.title || "MEGANE MUSIC",
        artist: (a && (a._originTitle || a.title)) || "未来確定プロジェクト",
        album: "メガネ辞書",
        artwork: mediaArtworkV8(a && a.cover)
      });
      navigator.mediaSession.playbackState = audio() && !audio().paused ? "playing" : "paused";
      updateMediaPositionV8();
    }catch(e){}
  }

  function updateMediaPositionV8(){
    if(!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;
    var a = audio();
    if(!a || !a.duration || !isFinite(a.duration)) return;
    try{
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, Number(a.duration) || 0),
        playbackRate: Number(a.playbackRate) || 1,
        position: Math.max(0, Math.min(Number(a.currentTime) || 0, Number(a.duration) || 0))
      });
    }catch(e){}
  }

  function setMediaActionV8(name, fn){
    if(!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;
    try{ navigator.mediaSession.setActionHandler(name, fn); }catch(e){}
  }

  function bindMusicMediaActionsV8(){
    // MUSICでは前後曲を優先。Conference側が15秒送り戻しを登録しても、
    // 音楽再生時に必ずこちらで上書きして戻す。
    setMediaActionV8("play", function(){
      var a = audio(); if(!a) return;
      setAudioForCurrent(false);
      var p = a.play(); if(p && p.catch) p.catch(function(){});
    });
    setMediaActionV8("pause", function(){ var a = audio(); if(a) a.pause(); });
    setMediaActionV8("previoustrack", function(){ prev(); });
    setMediaActionV8("nexttrack", function(){ next(false); });
    setMediaActionV8("seekbackward", null);
    setMediaActionV8("seekforward", null);
    setMediaActionV8("seekto", function(e){
      var a = audio(); if(!a || !e || typeof e.seekTime !== "number") return;
      try{
        a.currentTime = Math.max(0, Math.min((a.duration || 0) || 999999, e.seekTime));
        updateProgress();
        savePos();
      }catch(_){}
    });
  }

  function bindMediaSessionV8(){
    if(mediaSessionReadyV8 || !("mediaSession" in navigator)) return;
    mediaSessionReadyV8 = true;

    bindMusicMediaActionsV8();

    document.addEventListener("visibilitychange", function(){
      var a = audio();

      // Musicが実際に再生対象の時だけMediaSessionを更新する。
      // Conference再生中に外部検索へ移動した際、停止中のMusicが
      // iOSプレイヤーのメタデータと操作権を奪うのを防ぐ。
      if(a && !a.paused && !a.ended){
        updateMediaSessionV8();
      }

      // 他アプリで一時停止されたあと、戻ってきた時に一度だけ復帰を試す。
      // iOSが拒否した場合は通常の再生ボタン/ロック画面ボタンで再開する。
      if(!document.hidden && state.playing){
        if(a && a.paused){
          var p = a.play(); if(p && p.catch) p.catch(function(){});
        }
      }
    });

    window.addEventListener("focus", function(){
      var a = audio();
      if(a && !a.paused && !a.ended){
        updateMediaSessionV8();
      }
    });
  }

  function currentSheetKey(){
    return String(state.queueMode || "album") + ":" + String(state.queueMode === "favorites" ? state.album : state.browsingAlbum);
  }
  function rememberSheetScroll(){
    var el = document.querySelector(".music-v7-track-list");
    if(el){ state.sheetScrollTop = el.scrollTop || 0; state.sheetAlbumKey = currentSheetKey(); }
  }
  function restoreSheetScroll(){
    if(!state.sheet) return;
    if(state.sheetAlbumKey && state.sheetAlbumKey !== currentSheetKey()) return;
    var y = state.sheetScrollTop || 0;
    if(!y) return;
    setTimeout(function(){
      var el = document.querySelector(".music-v7-track-list");
      if(el) el.scrollTop = y;
    }, 0);
    setTimeout(function(){
      var el = document.querySelector(".music-v7-track-list");
      if(el) el.scrollTop = y;
    }, 40);
  }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); }

  function rawPlaylists(){
    try{
      if(typeof musicPlaylists !== "undefined" && Array.isArray(musicPlaylists)) return musicPlaylists;
      if(window.musicPlaylists && Array.isArray(window.musicPlaylists)) return window.musicPlaylists;
    }catch(e){}
    return [];
  }

  function normalize(){
    var arr = rawPlaylists().map(function(p, i){
      var tracks = Array.isArray(p.tracks) ? p.tracks : [];
      return {
        id: p.id || ("album_" + i),
        title: p.title || p.name || ("Album " + (i+1)),
        desc: p.desc || p.description || "",
        cover: p.cover || p.image || p.thumb || p.artwork || "",
        type: p.type || "album",
        locked: !!p.locked,
        unlockCode: p.unlockCode || "",
        lockLabel: p.lockLabel || "",
        lockHint: p.lockHint || "",
        lockMessage: p.lockMessage || "",
        unlockMessage: p.unlockMessage || "",
        failMessage: p.failMessage || "",
        unlock: p.unlock || null,
        tracks: tracks.map(function(t, ti){
          return {
            id: t.id || ("track_" + i + "_" + ti),
            title: t.title || t.name || ("Track " + (ti+1)),
            audio: t.audio || t.src || t.url || "",
            video: t.video || t.movie || t.mv || "",
            cover: t.cover || t.image || t.thumb || t.artwork || "",
            tag: t.tag || p.title || "",
            lyrics: t.lyrics || "",
            memo: t.memo || "",
            text: t.text || "",
            locked: !!t.locked,
            unlock: t.unlock || null,
            lockLabel: t.lockLabel || "",
            lockHint: t.lockHint || ""
          };
        })
      };
    });
    return arr;
  }

  function albums(){ return normalize(); }

  /* v8.5: Music unlock/event display helpers */
  function musicUnlockState(a){
    if(!a) return { unlocked:true, hidden:false, locked:false, progressText:"" };
    try{
      if(window.MEGANE_MUSIC_UNLOCK_STATE){
        return window.MEGANE_MUSIC_UNLOCK_STATE(a) || { unlocked:true, hidden:false, locked:false, progressText:"" };
      }
    }catch(e){}
    if(a.unlock){
      return {
        unlocked:false,
        locked:true,
        hidden:a.unlock.mode === "hidden",
        label:(a.unlock.label==null?"":a.unlock.label),
        hint:a.unlock.hint || "観測条件を満たすと出現",
        progressText:(a.unlock.progressLabel || "観測") + " 0/" + (a.unlock.need || "?")
      };
    }
    return { unlocked:!a.locked, locked:!!a.locked, hidden:false, label:a.lockLabel || "🚫 禁止", hint:a.lockHint || "解除コード入力", progressText:"" };
  }

  function musicAlbumLocked(a){
    var st = musicUnlockState(a);
    return !!(st && (st.locked || st.unlocked === false));
  }

  function musicUnlockOverlay(a){
    var st = musicUnlockState(a);
    if(!st || (!st.locked && st.unlocked !== false)) return "";
    var label = (st.label==null?"":st.label) || a.lockLabel || "";
    var hint = st.hint || a.lockHint || "";
    var prog = st.progressText || "";
    return '<div class="music-v7-unlock-mask"><b>'+esc(label)+'</b><span>'+esc(hint)+'</span><em>'+esc(prog)+'</em></div>';
  }

  function showMusicUnlockHint(a){
    var st = musicUnlockState(a);
    var msg = (st && (st.hint || st.progressText)) || (a && a.lockHint) || "まだ解放されていません。";
    try{
      if(window.MEGANE_TOAST) window.MEGANE_TOAST(msg);
      else alert(msg);
    }catch(e){ alert(msg); }
  }

  function musicTrackUnlockState(album, track, index){
    if(!track) return { unlocked:true, locked:false, hidden:false, progressText:"" };
    try{
      if(window.MEGANE_MUSIC_TRACK_UNLOCK_STATE){
        return window.MEGANE_MUSIC_TRACK_UNLOCK_STATE(album, track, index || 0) || { unlocked:true, locked:false, hidden:false, progressText:"" };
      }
    }catch(e){}
    if(track.unlock){
      return {
        unlocked:false,
        locked:true,
        hidden:track.unlock.mode === "hidden",
        label:track.unlock.label || "🔒 未観測",
        hint:track.unlock.hint || "観測条件を満たすと解放",
        progressText:(track.unlock.progressLabel || "観測") + " 0/" + (track.unlock.need || "?")
      };
    }
    return { unlocked:!track.locked, locked:!!track.locked, hidden:false, label:track.lockLabel || "🚫", hint:track.lockHint || "解除コード入力", progressText:"" };
  }

  function musicTrackLocked(album, track, index){
    var st = musicTrackUnlockState(album, track, index || 0);
    return !!(st && (st.locked || st.unlocked === false));
  }

  function musicAlbumTrackProgress(a){
    try{
      if(window.MEGANE_MUSIC_ALBUM_TRACK_PROGRESS){
        return window.MEGANE_MUSIC_ALBUM_TRACK_PROGRESS(a) || null;
      }
    }catch(e){}
    var total = a && a.tracks ? a.tracks.length : 0;
    return total ? { unlocked:total, total:total, text:total + "/" + total + "曲" } : null;
  }

  function musicAlbumDisplayDesc(a, ust){
    var prog = musicAlbumTrackProgress(a);
    if(prog && prog.total > 1 && a && a.unlock){
      return prog.text;
    }
    return (ust && ust.progressText) ? ust.progressText : (a.desc || ((a.tracks||[]).length+"曲"));
  }

  function showMusicTrackUnlockHint(album, track, index){
    var st = musicTrackUnlockState(album, track, index || 0);
    var msg = (st && (st.hint || st.progressText)) || "まだ解放されていません。";
    try{
      if(window.MEGANE_TOAST) window.MEGANE_TOAST(msg);
      else alert(msg);
    }catch(e){ alert(msg); }
  }

  function currentAlbum(){
    if(state.queueMode === "favorites"){
      return { id:"favorites", title:"保護しました♪", desc:"保護済み", cover:"images/music/hogo.jpg", tracks:favTracks() };
    }
    return albums()[state.album] || albums()[0] || {id:"none", title:"MUSIC", desc:"", cover:"", tracks:[]};
  }
  function currentTracks(){ return currentAlbum().tracks || []; }
  function currentTrack(){ return currentTracks()[state.track] || currentTracks()[0] || null; }

  function browseAlbum(){
    if(state.browsingAlbum === -1){
      return { id:"favorites", title:"保護しました♪", desc:"保護済み", cover:"images/music/hogo.jpg", tracks:favTracks() };
    }
    return albums()[state.browsingAlbum] || currentAlbum();
  }
  function browseTracks(){
    if(state.browsingAlbum === -1) return favTracks();
    var a = browseAlbum();
    return (a && a.tracks) || [];
  }
  function isBrowsingFavorites(){
    return state.browsingAlbum === -1;
  }
  function isFavoritesListOpen(){
    return state.browsingAlbum === -1 || state.sheetAlbumKey === "favorites" || state.screen === "favorites";
  }
  function browseTrack(){
    return browseTracks()[state.browsingTrack] || null;
  }

  function favs(){
    try{ return JSON.parse(localStorage.getItem(LS.favs) || "[]") || []; }
    catch(e){ return []; }
  }

  function saveFavs(a){
    localStorage.setItem(LS.favs, JSON.stringify(a));
  }

  function rawFavOrder(){
    try{ return JSON.parse(localStorage.getItem(LS.favOrder) || "[]") || []; }
    catch(e){ return []; }
  }

  function saveFavOrder(order){
    localStorage.setItem(LS.favOrder, JSON.stringify(order || []));
  }

  function favOrder(){
    var active = favs().filter(Boolean);
    var order = rawFavOrder().filter(function(id){
      return active.indexOf(id) >= 0;
    });

    // 既存データの初回移行：
    // favsは古い→新しいで保存されていたため、表示順は反転して新しいものを上へ。
    var missing = active.filter(function(id){
      return order.indexOf(id) < 0;
    }).reverse();

    order = missing.concat(order);

    // 重複除去
    order = order.filter(function(id,index,self){
      return !!id && self.indexOf(id) === index;
    });

    saveFavOrder(order);
    return order;
  }

  function isFav(id){
    return !!id && favs().indexOf(id) >= 0;
  }

  function toggleFav(id){
    if(!id) return;

    var active = favs();
    var order = favOrder();
    var index = active.indexOf(id);

    if(index >= 0){
      active.splice(index,1);
      order = order.filter(function(x){ return x !== id; });
    }else{
      active.push(id);

      // 新しく追加した曲は一番上。
      order = order.filter(function(x){ return x !== id; });
      order.unshift(id);
    }

    saveFavs(active);
    saveFavOrder(order);
  }

  function allTracks(){
    var out = [];
    albums().forEach(function(p, pi){
      (p.tracks || []).forEach(function(t, ti){
        out.push(Object.assign({}, t, {_album: pi, _track: ti, _albumTitle: p.title}));
      });
    });
    return out;
  }

  function absoluteMusicUrl(src){
    if(!src) return "";
    try{ return new URL(src, location.href).href; }
    catch(e){ return String(src); }
  }

  function findTrackByAudioSrc(src){
    var target = absoluteMusicUrl(src);
    if(!target) return null;

    var list = allTracks();
    for(var i=0;i<list.length;i++){
      var t = list[i];
      if(t && t.audio && absoluteMusicUrl(t.audio) === target) return t;
    }
    return null;
  }

  function actualPlayingTrack(){
    var au = audio();
    var src = au && (au.currentSrc || au.src || au.getAttribute("src"));
    return findTrackByAudioSrc(src) || currentTrack();
  }
  function favTracks(){
    var order = favOrder();
    var all = allTracks();
    var byId = {};

    all.forEach(function(t){
      if(t && t.id) byId[t.id] = t;
    });

    return order.map(function(id){
      return byId[id];
    }).filter(Boolean);
  }

  function saveState(){
    var a = currentAlbum(), t = currentTrack();
    try{
      localStorage.setItem(LS.album, a.id || "");
      localStorage.setItem(LS.track, t ? t.id : "");
      localStorage.setItem("megane_music_v7_queue_mode", state.queueMode || "album");
      localStorage.setItem(LS.repeat, state.repeat);
      localStorage.setItem(LS.shuffle, state.shuffle ? "1" : "0");
    }catch(e){}
  }
  function loadState(){
    state.queueMode = localStorage.getItem("megane_music_v7_queue_mode") || "album";
    if(state.queueMode === "favorites") state.album = -1;
    var arr = albums();
    var aid = localStorage.getItem(LS.album) || "";
    var ai = arr.findIndex(function(a){ return a.id === aid; });
    if(ai >= 0) state.album = ai;
    state.browsingAlbum = state.album;
    var tid = localStorage.getItem(LS.track) || "";
    var ti = currentTracks().findIndex(function(t){ return t.id === tid; });
    if(ti >= 0) state.track = ti;
    state.browsingTrack = state.track;
  }

  function parseTitle(t, idx){
    var raw = (t && t.title) || "仮タイトル";
    var parts = raw.split("｜");
    var base = parts[0] || raw;
    var sub = parts[1] || "";
    var no = String(idx + 1).padStart(2, "0");
    var m = base.match(/(\d{1,2})\s*$/);
    if(m) no = String(m[1]).padStart(2, "0");
    var clean = sub || base.replace(/^(詩の処方箋|H\(x\)∞|バグソング|その他)\s*\d{1,2}\s*/,"").trim() || "仮タイトル";
    return { no:no, title:clean, raw:raw };
  }

  function positions(){
    try{ return JSON.parse(localStorage.getItem(LS.pos) || "{}") || {}; }
    catch(e){ return {}; }
  }

  function savePosForId(id){
    var a = audio();
    if(!a || !id || !a.duration || !isFinite(a.duration)) return;
    var p = positions();
    p[id] = a.currentTime > a.duration - 3 ? 0 : Math.floor(a.currentTime || 0);
    localStorage.setItem(LS.pos, JSON.stringify(p));
  }

  function savePos(){
    var a = audio(), t = currentTrack();
    // state.track を切り替えた直後は、audio にはまだ旧曲が入っている。
    // その状態で currentTrack() に保存すると「01の1:05が02へ保存される」ため、
    // 実際にaudioへ読み込んだ曲IDを優先して保存する。
    var id = (a && a.dataset && a.dataset.v7TrackId) || (t && t.id);
    savePosForId(id);
  }

  function setCurrentTimeSoon(value){
    var a = audio(); if(!a) return;
    var token = String(Date.now()) + Math.random();
    a.dataset.v7SeekToken = token;
    var done = false;
    function run(){
      if(done || a.dataset.v7SeekToken !== token) return;
      done = true;
      try{ a.currentTime = value || 0; }catch(e){}
      updateProgress();
    }
    if(a.readyState >= 1) setTimeout(run, 30);
    else a.addEventListener("loadedmetadata", run, {once:true});
  }

  function restorePosSoon(id){
    var a = audio(); if(!a || !id) return;
    var pos = Number(positions()[id] || 0);
    if(!pos) return;
    var token = String(Date.now()) + Math.random();
    a.dataset.v7SeekToken = token;
    var done = false;
    function run(){
      if(done || a.dataset.v7SeekToken !== token) return;
      done = true;
      try{ if(a.duration && isFinite(a.duration)) a.currentTime = Math.min(pos, Math.max(0, a.duration - 3)); else a.currentTime = pos; }catch(e){}
      updateProgress();
    }
    if(a.readyState >= 1) setTimeout(run, 30);
    else a.addEventListener("loadedmetadata", run, {once:true});
  }

  function setAudioForCurrent(autoplay, resetToStart){
    var a = audio(), t = currentTrack();
    if(!a || !t) return;

    if(state.queueMode !== "favorites" && musicTrackLocked(currentAlbum(), t, state.track || 0)){
      showMusicTrackUnlockHint(currentAlbum(), t, state.track || 0);
      try{ a.pause(); }catch(e){}
      return;
    }

    var oldId = a.dataset ? (a.dataset.v7TrackId || "") : "";
    if(oldId && oldId !== t.id) savePosForId(oldId);

    var srcChanged = a.getAttribute("src") !== t.audio;
    if(srcChanged){
      a.src = t.audio || "";
      try{ a.load(); }catch(e){}
    }

    if(a.dataset) a.dataset.v7TrackId = t.id || "";

    updateMediaSessionV8();

    if(resetToStart){
      setCurrentTimeSoon(0);
    }else if(srcChanged || oldId !== t.id){
      restorePosSoon(t.id);
    }

    if(autoplay){
      var p = a.play();
      if(p && p.catch) p.catch(function(){});
    }
    updateMediaSessionV8();
    setTimeout(function(){ syncMusicVideo(true); }, 0);
  }

  function switchToAlbum(i){
    var lockAlbum = albums()[i];
    if(musicAlbumLocked(lockAlbum)){ showMusicUnlockHint(lockAlbum); return; }

    // production144:
    // 再生中のアルバムを開き直した時は、表示も現在再生中の曲へ同期する。
    // 別アルバムを閲覧する時だけ1曲目を表示する。
    var reopenPlayingAlbum =
      state.queueMode === "album" &&
      state.album === i;

    state.queueMode = "album";
    state.browsingAlbum = i;
    state.browsingTrack = reopenPlayingAlbum ? state.track : 0;
    state.screen = "player";
    state.sheet = false;
    state.lyrics = false;
    state.sheetScrollTop = 0;
    state.sheetAlbumKey = "";
    render();
  }

  function switchToFavorites(){
    // お気に入り曲は「閲覧」だけでは現在の再生キューを変更しない。
    // ここで queueMode="favorites" にすると、renderPlayer() 内の setAudioForCurrent(false) が走り、
    // アルバム再生中の音声が止まる/差し替わる原因になる。
    var wasAlbum = state.album;
    var wasTrack = state.track;
    var wasQueue = state.queueMode;

    state.browsingAlbum = -1;
    state.browsingTrack = 0;
    state.screen = "player";
    state.sheet = false;
    state.lyrics = false;
    state.sheetScrollTop = 0;
    state.sheetAlbumKey = "favorites";

    // 再生中の曲情報は維持する。
    state.queueMode = wasQueue || "album";
    state.album = wasAlbum;
    state.track = wasTrack;

    saveState();
    render();
  }

  function commitBrowsingToPlayback(index, autoplay, keepSheetOpen){
    if(state.browsingAlbum === -1){
      state.queueMode = "favorites";
      state.album = -1;
      state.track = typeof index === "number" ? index : state.browsingTrack;
      state.browsingTrack = state.track;
    }else{
      state.queueMode = "album";
      state.album = state.browsingAlbum;
      state.track = typeof index === "number" ? index : state.browsingTrack;
      state.browsingTrack = state.track;
    }
    // 曲一覧から曲を選んだ時は、一覧を勝手に閉じない。
    state.sheet = !!keepSheetOpen;
    state.lyrics = false;
    if(state.sheet) rememberSheetScroll();
    saveState();
    render();
    restoreSheetScroll();
    setAudioForCurrent(!!autoplay, true);
  }

  function next(auto){
    var ts = currentTracks(); if(!ts.length) return;
    if(auto && state.repeat === "one"){
      var a = audio(); if(a){ a.currentTime = 0; a.play(); }
      return;
    }
    if(state.shuffle && ts.length > 1){
      var n = state.track;
      while(n === state.track) n = Math.floor(Math.random() * ts.length);
      state.track = n;
      state.browsingTrack = state.track;
    }else{
      if(auto && state.track >= ts.length - 1 && state.repeat !== "all") return;
      state.track = (state.track + 1) % ts.length;
      state.browsingTrack = state.track;
    }
    saveState();
    render();
    setAudioForCurrent(true, true);
  }

  function prev(){
    var ts = currentTracks(); if(!ts.length) return;
    state.track = (state.track - 1 + ts.length) % ts.length;
    state.browsingTrack = state.track;
    saveState();
    render();
    setAudioForCurrent(true, true);
  }

  function seekBy(sec){
    var a = audio();
    if(!a) return;
    try{
      a.currentTime = Math.max(0, Math.min((a.duration || 0) || 999999, (a.currentTime || 0) + sec));
      updateProgress();
      updateMediaPositionV8();
      syncMusicVideo(true);
      savePos();
    }catch(e){}
  }

  function togglePlay(){
    var a = audio(); if(!a) return;
    if((state.queueMode !== "favorites" && state.album !== state.browsingAlbum) || (state.queueMode === "favorites" && state.browsingAlbum !== state.album && !state.sheet && !state.lyrics)){
      commitBrowsingToPlayback(state.browsingTrack || 0, true);
      return;
    }
    setAudioForCurrent(false);
    if(a.paused){
      var p = a.play(); if(p && p.catch) p.catch(function(){});
    }else{
      a.pause();
    }
  }

  function toggleRepeat(){
    state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
    saveState(); render();
  }

  function repeatText(){ return state.repeat === "one" ? "①" : state.repeat === "all" ? "∞" : "↻"; }

  function albumCoverHTML(a){
    if(a.cover) return '<img src="'+esc(a.cover)+'" alt="">';
    return '<span>'+esc((a.title || "?").charAt(0))+'</span>';
  }

  /* v9 test: optional silent moving jacket */
  function musicVideo(){ return $("musicV7Video"); }

  function trackJacketHTML(a, t){
    if(t && t.video){
      return '<video id="musicV7Video" data-track-id="'+esc(t.id || "")+'"'
        + ' src="'+esc(t.video)+'"'
        + ' poster="'+esc((t.cover || (a && a.cover) || ""))+'"'
        + ' muted playsinline webkit-playsinline preload="metadata"'
        + ' style="width:100%;height:100%;display:block;object-fit:cover;background:#000;"></video>';
    }
    return albumCoverHTML(a);
  }

  function syncMusicVideo(forceSeek){
    var v = musicVideo();
    var a = audio();
    if(!v || !a) return;

    var videoTrackId = (v.dataset && v.dataset.trackId) || "";
    var audioTrackId = (a.dataset && a.dataset.v7TrackId) || "";

    if(!videoTrackId || videoTrackId !== audioTrackId){
      try{ v.pause(); }catch(e){}
      return;
    }

    try{
      v.muted = true;
      v.playsInline = true;
      v.playbackRate = a.playbackRate || 1;

      if(isFinite(a.currentTime) && (forceSeek || Math.abs((v.currentTime || 0) - a.currentTime) > 0.35)){
        var target = a.currentTime || 0;
        if(v.duration && isFinite(v.duration)) target = Math.min(target, Math.max(0, v.duration - 0.05));
        v.currentTime = target;
      }

      if(a.paused || a.ended){
        v.pause();
      }else{
        var p = v.play();
        if(p && p.catch) p.catch(function(){});
      }
    }catch(e){}
  }

  function albumForTrack(t){
    var arr = albums();
    if(t && typeof t._album === "number" && arr[t._album]) return arr[t._album];
    if(t && t.tag){
      var found = arr.find(function(x){ return x && x.title === t.tag; });
      if(found) return found;
    }
    return null;
  }

  function visualAlbumFor(a, t){
    // お気に入り曲の再生画面は、仮想アルバム「お気に入り曲」ではなく、
    // その曲が所属している元アルバムのサムネを使う。
    if(state.queueMode === "favorites"){
      var origin = albumForTrack(t);
      if(origin && origin.cover){
        return Object.assign({}, a || {}, { cover: origin.cover, _originTitle: origin.title });
      }
    }
    return a;
  }

  function renderAlbums(){
    document.body.classList.add("music-v7");
    var v = view(); if(!v) return;
    v.className = "music-view music-v7-view music-v7-albums";
    var list = $("musicList"); if(!list) return;

    if(!document.getElementById("musicV7SingleStyle")){
      var st=document.createElement("style");
      st.id="musicV7SingleStyle";
      st.textContent =
        ".music-v7-singles-head{padding:18px 8px 10px;font-size:15px;font-weight:800;color:rgba(255,255,255,.72);letter-spacing:.08em}"
        +".music-v7-single-list{display:grid;gap:10px;margin:0 0 24px}"
        +".music-v7-single-card{width:100%;display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.045);color:#fff;text-align:left}"
        +".music-v7-single-thumb{width:58px;height:58px;border-radius:14px;overflow:hidden;background:#000}"
        +".music-v7-single-thumb img{width:100%;height:100%;object-fit:cover;display:block}"
        +".music-v7-single-copy{min-width:0}"
        +".music-v7-single-copy strong{display:block;font-size:16px;font-weight:900;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
        +".music-v7-single-copy span{display:block;margin-top:4px;font-size:12px;font-weight:800;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
        +".music-v7-single-card em{font-style:normal;color:#ffe88a;font-weight:900;font-size:12px;white-space:nowrap;min-width:54px;text-align:right}"
        +".music-v7-track.fav-reorder-active{position:relative;z-index:40;opacity:.94;transform:scale(1.025)!important;box-shadow:0 16px 38px rgba(0,0,0,.48);background:rgba(45,49,65,.98)!important}"
        +".music-v7-track-list.fav-reordering{overflow:hidden;touch-action:none}"
        +".music-v7-track.fav-reorder-shift{transition:transform .14s ease}"
        +".music-v7-track.locked{opacity:.45}"
        +".music-v7-track.locked strong{color:rgba(255,255,255,.62)}"
        +".music-v7-track.locked em{color:#ffe88a;font-size:12px;font-weight:900}"
        +".music-v7-playing-badge{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.72);color:#ffe88a;font-size:11px;font-weight:900;padding:4px 8px;border-radius:999px;z-index:4}"
        +".music-v7-album-art{position:relative;min-width:0}"
        +".music-v7-album-art.locked{opacity:.72}"
        +".music-v7-jacket{position:relative;overflow:hidden}"
        +".music-v7-unlock-mask{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:flex-end;padding:12px;border-radius:inherit;background:linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.78));text-align:left;pointer-events:none}"
        +".music-v7-unlock-mask b{display:inline-block;width:max-content;max-width:100%;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,.60);color:#ffe88a;font-size:12px;font-weight:900}"
        +".music-v7-unlock-mask span{margin-top:6px;color:rgba(255,255,255,.88);font-size:12px;font-weight:900}"
        +".music-v7-unlock-mask em{margin-top:3px;color:rgba(255,230,170,.92);font-size:11px;font-weight:900;font-style:normal}"
        +".music-v7-restricted-head{margin:26px 0 14px;text-align:center;color:rgba(255,224,145,.74);font-size:11px;font-weight:900;letter-spacing:.20em}"
        +".music-v7-restricted-grid{display:grid;grid-template-columns:minmax(0,320px);justify-content:center;gap:18px;margin:0 auto 34px;width:100%}"
        +".music-v7-restricted-grid .music-v7-album-art{width:100%;max-width:320px;justify-self:center}"
        +".music-v7-restricted-grid .music-v7-jacket{width:100%;aspect-ratio:1/1}"
        /* v10: restricted/locked album text sizing */
        +".music-v7-restricted-album .music-v7-unlock-mask{justify-content:center!important;align-items:flex-start!important;padding:clamp(14px,4vw,24px)!important}"
        +".music-v7-restricted-album .music-v7-unlock-mask b{display:block!important;width:auto!important;max-width:100%!important;padding:0!important;border-radius:0!important;background:transparent!important;font-size:clamp(28px,8.2vw,42px)!important;line-height:1.08!important;letter-spacing:-.045em!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:normal!important;text-align:left!important;text-wrap:balance}"
        +".music-v7-restricted-album .music-v7-unlock-mask span{margin-top:10px!important;font-size:clamp(11px,3.2vw,14px)!important;line-height:1.35!important}"
        +".music-v7-restricted-album .music-v7-unlock-mask em{margin-top:6px!important;font-size:clamp(10px,2.8vw,12px)!important;line-height:1.3!important}"
        +".music-v7-restricted-album .music-v7-unlock-mask::after{content:none!important;display:none!important}"
        +"@media(max-width:375px){"
          +".music-v7-single-card{grid-template-columns:48px minmax(0,1fr) auto;gap:9px;padding:9px 10px}"
          +".music-v7-single-thumb{width:48px;height:48px;border-radius:12px}"
          +".music-v7-single-copy strong{font-size:14px}"
          +".music-v7-single-copy span,.music-v7-single-card em{font-size:10px}"
          +".music-v7-single-card em{min-width:42px}"
          +".music-v7-restricted-grid{grid-template-columns:minmax(0,260px);margin-bottom:28px}"
          +".music-v7-restricted-grid .music-v7-album-art{max-width:260px}"
        +"}";
      document.head.appendChild(st);
    }

    function albumButtonHTML(a, i, ust, extraClass){
      var locked = musicAlbumLocked(a);
      var descText = musicAlbumDisplayDesc(a, ust);
      var lockMarkup = locked ? musicUnlockOverlay(a) : "";
      return '<button type="button" class="music-v7-album-art'+(locked?' locked':'')+(extraClass||'')+'" data-album="'+i+'" data-locked="'+(locked?'1':'0')+'">'
        + ((state.queueMode === "album" && state.album === i) ? '<div class="music-v7-playing-badge">▶ 再生中</div>' : '')
        + '<div class="music-v7-jacket">'+albumCoverHTML(a)+lockMarkup+'</div>'
        + '<div class="music-v7-album-copy"><strong>'+esc(a.title)+'</strong><span>'+esc(descText)+'</span></div>'
        + '</button>';
    }

    var musicAlbums = albums();
    var regularAlbums = [];
    var restrictedAlbums = [];
    var singles = [];

    musicAlbums.forEach(function(a, i){
      var ust = musicUnlockState(a);
      if(ust && ust.hidden && !ust.unlocked) return;

      if(a.type === "single"){
        singles.push({ album:a, index:i, unlockState:ust });
        return;
      }

      if(musicAlbumLocked(a)){
        restrictedAlbums.push({ album:a, index:i, unlockState:ust });
      }else{
        regularAlbums.push({ album:a, index:i, unlockState:ust });
      }
    });

    var html = '<div class="music-v7-shelf music-v7-shelf-row-final">';
    html += '<button type="button" class="music-v7-favline music-v7-fav-row-final" id="musicV7FavAlbum"><span>★</span><strong>保護しました♪</strong><em>'+favTracks().length+'曲</em></button>';

    html += '<div class="music-v7-singles-head">🏠すみか</div>';
    html += '<div class="music-v7-album-grid-final">';
    regularAlbums.forEach(function(x){
      html += albumButtonHTML(x.album, x.index, x.unlockState, "");
    });
    html += '</div>';

    if(singles.length){
      html += '<div class="music-v7-singles-head">🎵迷子</div>';
      html += '<div class="music-v7-single-list">';
      singles.forEach(function(x){
        var a = x.album;
        var ust = x.unlockState || musicUnlockState(a);
        var locked = musicAlbumLocked(a);
        var descText = musicAlbumDisplayDesc(a, ust) || ((ust && ust.progressText) ? ust.progressText : (a.desc || "Single"));
        html += '<button type="button" class="music-v7-single-card '+(locked?"locked":"")+'" data-album="'+x.index+'" data-locked="'+(locked?"1":"0")+'">'
          + '<div class="music-v7-single-thumb">'+albumCoverHTML(a)+'</div>'
          + '<div class="music-v7-single-copy"><strong>'+esc(a.title)+'</strong><span>'+esc(descText)+'</span></div>'
          + '<em>'+((state.queueMode === "album" && state.album === x.index) ? "▶ 再生中" : (locked ? ((ust && ust.label) || "🔒") : ""))+'</em>'
          + '</button>';
      });
      html += '</div>';
    }

    if(restrictedAlbums.length){
      html += '<div class="music-v7-restricted-head">RESTRICTED OBSERVATION</div>';
      html += '<div class="music-v7-restricted-grid">';
      restrictedAlbums.forEach(function(x){
        html += albumButtonHTML(x.album, x.index, x.unlockState, " music-v7-restricted-album");
      });
      html += '</div>';
    }

    html += '</div>';
    list.innerHTML = html;

    list.querySelectorAll("[data-album]").forEach(function(btn){
      btn.onclick = function(){
        var idx = Number(btn.dataset.album || 0);
        var a = albums()[idx];
        if(musicAlbumLocked(a)){ showMusicUnlockHint(a); return; }
        switchToAlbum(idx);
      };
    });

    var fav = $("musicV7FavAlbum");
    if(fav){
      var openFavAlbum = function(ev){
        if(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        }
        switchToFavorites();
      };
      fav.onclick = openFavAlbum;
      fav.ontouchend = openFavAlbum;
      fav.onpointerup = openFavAlbum;
    }

    var title = $("musicTitle"); if(title) title.innerHTML = "";
    var au = audio(); if(au) au.style.display = "none";
  }

  function renderPlayer(){
    document.body.classList.add("music-v7");
    var v = view(); if(!v) return;
    v.className = "music-view music-v7-view music-v7-player" + (state.sheet ? " sheet-open" : "");
    var isBrowsingOtherAlbum = (state.browsingAlbum !== state.album && !state.sheet && !state.lyrics);
    var a = isBrowsingOtherAlbum ? browseAlbum() : (state.queueMode === "favorites" ? currentAlbum() : browseAlbum());
    var t = isBrowsingOtherAlbum ? (browseTrack() || currentTrack()) : (state.queueMode === "favorites" ? currentTrack() : (browseTrack() || currentTrack()));
    var info = parseTitle(t, (isBrowsingOtherAlbum ? state.browsingTrack : (state.queueMode === "favorites" ? state.track : state.browsingTrack)));
    var va = visualAlbumFor(a, t);
    // v7.1: 曲ごとのcoverがある場合は、アルバムcoverより優先する。
    if(t && t.cover){
      va = Object.assign({}, va || {}, { cover: t.cover });
    }
    var title = $("musicTitle");
    if(title) title.innerHTML = "";
    var list = $("musicList"); if(!list) return;

    var favOn = t && isFav(t.id);
    list.innerHTML =
      '<div class="music-v7-player-bg" style="background-image:url('+esc(va.cover || "")+')"></div>'
      + '<div class="music-v7-player-main">'
      + '<div class="music-v7-toprow"><button class="music-v7-back" id="musicV7Back">⌄</button><button id="musicV7Fav" class="music-v7-plus '+(favOn?"on":"")+'">'+(favOn?"★":"＋")+'</button></div>'
      + '<div class="music-v7-player-jacket">'+trackJacketHTML(va, t)+'</div>'
      + '<div class="music-v7-now">'
      + '<div><strong>'+esc(info.title)+'</strong><span>'+esc(state.queueMode === "favorites" && va._originTitle ? va._originTitle : a.title)+'</span></div>'
      + '<button class="music-v7-more" id="musicV7More">…</button>'
      + '</div>'
      + '<div class="music-v7-progress"><input id="musicV7Seek" type="range" min="0" max="1000" value="0"><div><span id="musicV7Cur">0:00</span><span id="musicV7Dur">0:00</span></div></div>'
      + '<div class="music-v7-controls">'
      + '<button id="musicV7Shuffle" class="'+(state.shuffle?"on":"")+'">⤨</button>'
      + '<button id="musicV7Prev">-15</button>'
      + '<button id="musicV7Play" class="play">▶</button>'
      + '<button id="musicV7Next">+15</button>'
      + '<button id="musicV7Repeat" class="'+state.repeat+'">'+repeatText()+'</button>'
      + '</div>'
      + '</div>'
      + renderSheet()
      + renderLyrics();

    var au = audio(); if(au) au.style.display = "none";
    // 画面を開いただけでは音声を差し替えない。
    // 現在の再生キューと閲覧中キューが一致している時だけaudioを同期する。
    if(state.queueMode === "favorites" && state.browsingAlbum === state.album && !isBrowsingOtherAlbum){
      setAudioForCurrent(false);
    }else if(state.queueMode === "album" && state.album === state.browsingAlbum){
      setAudioForCurrent(false);
    }
    bindPlayer();
    var mv = musicVideo();
    if(mv){
      mv.addEventListener("loadedmetadata", function(){ syncMusicVideo(true); }, {once:true});
      mv.addEventListener("canplay", function(){ syncMusicVideo(false); }, {once:true});
    }
    restoreSheetScroll();
    updateProgress();
    updateMediaSessionV8();
    setTimeout(function(){ syncMusicVideo(true); }, 0);
  }

  function renderSheet(){
    var sheetUsesFavorites = (state.queueMode === "favorites" && state.browsingAlbum === state.album);
    var a = sheetUsesFavorites ? currentAlbum() : browseAlbum();
    var trackSource = sheetUsesFavorites ? currentTracks() : browseTracks();
    var prog = musicAlbumTrackProgress(a);
    var rows = trackSource.map(function(t, i){
      var info = parseTitle(t, i);
      var active = (sheetUsesFavorites ? i === state.track : (state.queueMode === "album" && state.album === state.browsingAlbum && i === state.track));
      var favMode = isFavoritesListOpen();
      var deleteOpen = favMode && state.favDeleteOpenId === t.id;
      var tst = musicTrackUnlockState(a, t, i);
      if(tst && tst.hidden && !tst.unlocked) return "";
      var locked = musicTrackLocked(a, t, i);
      var mark = locked ? (tst.label || "🔒") : (active ? "♪" : "");
      return '<button type="button" class="music-v7-track '+(active?"active":"")+' '+(favMode?"fav-mode":"")+' '+(locked?"locked":"")+'" data-track="'+i+'" data-track-id="'+esc(t.id)+'" data-locked="'+(locked?"1":"0")+'">'
        + '<span>'+esc(info.no)+'</span><strong>'+esc(info.title)+'</strong><em>'+esc(mark)+'</em><b data-fav="'+esc(t.id)+'" class="'+(isFav(t.id)?"on":"")+'">★</b>'
        + '</button>';
    }).join("");
    return '<div id="musicV7Sheet" class="music-v7-sheet">'
      + '<div class="music-v7-handle"></div>'
      + '<div class="music-v7-sheet-head"><strong>'+esc(a.title)+'</strong><small style="margin-left:10px;color:rgba(255,230,170,.72);font-weight:900;">'+esc(prog && prog.total ? prog.text : "")+'</small><button id="musicV7SheetClose">×</button></div>'
      + '<div class="music-v7-track-list">'+rows+'</div>'
      + '</div>';
  }

  function renderLyrics(){
    var isBrowsingOtherAlbum = (state.browsingAlbum !== state.album && !state.sheet && !state.lyrics);
    var a = isBrowsingOtherAlbum ? browseAlbum() : (state.queueMode === "favorites" ? currentAlbum() : browseAlbum());
    var t = isBrowsingOtherAlbum ? (browseTrack() || currentTrack()) : (state.queueMode === "favorites" ? currentTrack() : (browseTrack() || currentTrack()));
    var info = parseTitle(t, (isBrowsingOtherAlbum ? state.browsingTrack : (state.queueMode === "favorites" ? state.track : state.browsingTrack)));
    var lyric = "";
    if(t && (t.lyrics || t.memo || t.text)) lyric = t.lyrics || t.memo || t.text;
    if(!lyric){
      if((a.id || "").indexOf("hx") >= 0 || /H\(x\)/.test(a.title || "")){
        lyric = "H(x)∞\\n\\nこれは意味がない。\\nそう言った瞬間、意味が生まれる。\\n\\n同じ言葉が、違う曲として何度も戻ってくる。";
      }else{
        lyric = "歌詞はまだ登録されていません。\\n\\nここに歌詞、構文メモ、制作メモを入れられます。";
      }
    }
    return '<div id="musicV7Lyrics" class="music-v7-lyrics '+(state.lyrics?'open':'')+'">'
      + '<div class="music-v7-handle"></div>'
      + '<div class="music-v7-sheet-head"><strong>'+esc(info.title)+'</strong><button id="musicV7LyricsClose">×</button></div>'
      + '<div class="music-v7-lyrics-body">'+esc(lyric).replace(/\n/g, "<br>")+'</div>'
      + '</div>';
  }

  function bindPlayer(){
    var back = $("musicV7Back"); if(back) back.onclick = function(){ state.screen = "albums"; state.sheet = false; savePos(); render(); };
    var more = $("musicV7More"); if(more) more.onclick = function(){ state.lyrics = true; state.sheet = false; render(); };
    var prevB = $("musicV7Prev"); if(prevB) prevB.onclick = function(){ seekBy(-15); };
    var nextB = $("musicV7Next"); if(nextB) nextB.onclick = function(){ seekBy(15); };
    var playB = $("musicV7Play"); if(playB) playB.onclick = togglePlay;
    var favB = $("musicV7Fav"); if(favB) favB.onclick = function(){ var t = currentTrack(); if(t){ toggleFav(t.id); render(); } };
    var repB = $("musicV7Repeat"); if(repB) repB.onclick = toggleRepeat;
    var shB = $("musicV7Shuffle"); if(shB) shB.onclick = function(){ state.shuffle = !state.shuffle; saveState(); render(); };
    var closeB = $("musicV7SheetClose"); if(closeB) closeB.onclick = function(){ state.sheet = false; render(); };
    var closeL = $("musicV7LyricsClose"); if(closeL) closeL.onclick = function(){ state.lyrics = false; render(); };

    var seek = $("musicV7Seek");
    if(seek){
      // v7 seek guard:
      // シークバーのつまみ操作を、親の左右スワイプ曲送りとして誤判定させない。
      function startSeek(ev){
        state.seeking = true;
        if(ev && ev.stopPropagation) ev.stopPropagation();
      }
      function moveSeek(ev){
        if(ev && ev.stopPropagation) ev.stopPropagation();
      }
      function endSeek(ev){
        if(ev && ev.stopPropagation) ev.stopPropagation();
        setTimeout(function(){ state.seeking = false; }, 120);
      }

      seek.addEventListener("touchstart", startSeek, {passive:true});
      seek.addEventListener("touchmove", moveSeek, {passive:true});
      seek.addEventListener("touchend", endSeek, {passive:true});
      seek.addEventListener("touchcancel", endSeek, {passive:true});

      seek.addEventListener("pointerdown", startSeek);
      seek.addEventListener("pointermove", moveSeek);
      seek.addEventListener("pointerup", endSeek);
      seek.addEventListener("pointercancel", endSeek);

      seek.oninput = function(ev){
        if(ev && ev.stopPropagation) ev.stopPropagation();
        state.seeking = true;
        var au = audio(); if(!au || !au.duration) return;
        au.currentTime = (Number(seek.value) / 1000) * au.duration;
        updateProgress();
        updateMediaPositionV8();
        savePos();
      };

      seek.onchange = function(ev){
        if(ev && ev.stopPropagation) ev.stopPropagation();
        setTimeout(function(){ state.seeking = false; }, 120);
      };
    }

    document.querySelectorAll(".music-v7-track").forEach(function(row){
      row.onclick = function(e){
        var chosenForLock = Number(row.dataset.track || 0);
        var albumForLock = isFavoritesListOpen() ? null : browseAlbum();
        var trackForLock = isFavoritesListOpen() ? null : (browseTracks()[chosenForLock] || null);
        if(trackForLock && musicTrackLocked(albumForLock, trackForLock, chosenForLock)){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          showMusicTrackUnlockHint(albumForLock, trackForLock, chosenForLock);
          return;
        }
        if(e.target && e.target.dataset && e.target.dataset.deleteFav){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          rememberSheetScroll();
          var delId = e.target.dataset.deleteFav;
          var rowEl = e.target.closest ? e.target.closest(".music-v7-track") : null;

          function removeFavAfterAnimation(){
            toggleFav(delId);
            state.favDeleteOpenId = "";
            if(isFavoritesListOpen()){
              var nextList = favTracks();
              if(state.track >= nextList.length) state.track = Math.max(0, nextList.length - 1);
              state.browsingTrack = state.track;
              state.sheet = true;
              state.lyrics = false;
              saveState();
            }
            render();
            restoreSheetScroll();
          }

          // 削除タップ後、行を左へ流してから一覧から消す。
          if(rowEl){
            rowEl.classList.add("removing");
            setTimeout(removeFavAfterAnimation, 190);
          }else{
            removeFavAfterAnimation();
          }
          return;
        }
        if(e.target && e.target.dataset && e.target.dataset.fav){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          rememberSheetScroll();
          var favId = e.target.dataset.fav;

          // Phase1.5:
          // お気に入りプレイリスト内では、誤操作防止のため即解除しない。
          // ★タップ → 確認 → 削除。通常アルバム内の★登録/解除は従来通り。
          if(isFavoritesListOpen()){
            var ok = window.confirm("この歌を自然に帰しますか？");
            if(!ok){
              restoreSheetScroll();
              return;
            }
            toggleFav(favId);
            var nextList = favTracks();
            if(state.track >= nextList.length) state.track = Math.max(0, nextList.length - 1);
            state.browsingTrack = state.track;
            state.sheet = true;
            state.lyrics = false;
            saveState();
            render();
            restoreSheetScroll();
            return;
          }

          toggleFav(favId);
          render();
          restoreSheetScroll();
          return;
        }
        if(isFavoritesListOpen() && state.favDeleteOpenId){
          state.favDeleteOpenId = "";
          rememberSheetScroll();
          render();
          restoreSheetScroll();
          return;
        }
        if(isFavoritesListOpen() && state.favTouchMoved){
          state.favTouchMoved = false;
          return;
        }
        var chosen = Number(row.dataset.track || 0);
        if(isFavoritesListOpen()){
          state.browsingAlbum = -1;
          state.sheetAlbumKey = "favorites";
          commitBrowsingToPlayback(chosen, true, true);
        }else{
          commitBrowsingToPlayback(chosen, true, true);
        }
      };
    });

    var swipeTarget = document.querySelector(".music-v7-player-jacket");
    if(swipeTarget && !swipeTarget.dataset.v7Swipe){
      swipeTarget.dataset.v7Swipe = "1";
      swipeTarget.addEventListener("touchstart", function(e){
        state.touchY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
        state.touchX = e.touches && e.touches[0] ? e.touches[0].clientX : 0;
      }, {passive:true});
      swipeTarget.addEventListener("touchend", function(e){
        var y = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : state.touchY;
        var dy = y - state.touchY;
        var dx = 0;
        try { dx = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0) - (state.touchX || 0); } catch(_){}
        if(state.screen === "player"){
          if(state.seeking){
            setTimeout(function(){ state.seeking = false; }, 120);
            return;
          }
          if(state.lyrics) return;
          // ジャケット画像上だけ、左右スワイプで前後曲。
          // タイトル、シークバー、操作ボタン上では曲送りしない。
          if(Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)){
            if(dx < 0) next(false); else prev();
            return;
          }
          if(dy < -55 && !state.sheet){ state.sheet = true; state.lyrics = false; render(); }
        }
      }, {passive:true});
    }

    var sheet = $("musicV7Sheet");
    if(sheet){
      sheet.addEventListener("touchstart", function(e){
        state.dragStartY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
        state.dragCloseEligible = !!(e.target && e.target.closest && e.target.closest(".music-v7-handle,.music-v7-sheet-head") && !e.target.closest("button"));
      }, {passive:true});
      sheet.addEventListener("touchend", function(e){
        var y = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : state.dragStartY;
        // 一覧内スクロールを優先。ヘッダー/ハンドルから大きく下へ引いた時だけ閉じる。
        if(state.dragCloseEligible && y - state.dragStartY > 180){ state.sheet = false; render(); }
        state.dragCloseEligible = false;
      }, {passive:true});

      // Phase2.1: お気に入りプレイリスト内だけメールアプリ型の左スワイプ削除。
      // 少し左スワイプ → 削除ボタン表示 / 深く左スワイプ → そのまま削除確定。
      // 通常アルバムの★操作には影響させない。
      function removeFavoriteWithRow(row, delId){
        if(!delId) return;
        rememberSheetScroll();
        function finish(){
          toggleFav(delId);
          state.favDeleteOpenId = "";
          state.favTouchMoveRow = null;
          state.favTouchMoved = false;
          if(isFavoritesListOpen()){
            var nextList = favTracks();
            if(state.track >= nextList.length) state.track = Math.max(0, nextList.length - 1);
            state.browsingTrack = state.track;
            state.sheet = true;
            state.lyrics = false;
            saveState();
          }
          render();
          restoreSheetScroll();
        }
        if(row){
          row.classList.add("removing");
          row.style.transform = "";
          setTimeout(finish, 190);
        }else{
          finish();
        }
      }

      sheet.addEventListener("touchstart", function(e){
        if(!isFavoritesListOpen()) return;
        var row = e.target && e.target.closest ? e.target.closest(".music-v7-track.fav-mode") : null;
        if(!row) return;
        var t0 = e.touches && e.touches[0];
        state.favTouchStartX = t0 ? t0.clientX : 0;
        state.favTouchStartY = t0 ? t0.clientY : 0;
        state.favTouchMoveRow = row;
        state.favTouchMoved = false;
        row.classList.add("dragging");
      }, {passive:true});

      sheet.addEventListener("touchmove", function(e){
        if(!isFavoritesListOpen()) return;
        if(state.favReorderActive) return;
        var row = state.favTouchMoveRow;
        if(!row) return;
        var t = e.touches && e.touches[0];
        if(!t) return;
        var dx = t.clientX - (state.favTouchStartX || 0);
        var dy = t.clientY - (state.favTouchStartY || 0);

        // 縦スクロールを優先。横移動が勝った時だけ行が指に追従する。
        if(Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15){
          e.preventDefault();
          state.favTouchMoved = true;
          var maxPull = Math.min(220, Math.max(120, row.offsetWidth * 0.52));
          var pull = Math.max(-maxPull, Math.min(0, dx));
          row.style.transform = "translateX(" + pull + "px)";
          row.classList.remove("delete-open");
          if(pull < -Math.min(160, row.offsetWidth * 0.38)) row.classList.add("delete-ready"); else row.classList.remove("delete-ready");
        }
      }, {passive:false});

      sheet.addEventListener("touchend", function(e){
        if(!isFavoritesListOpen()) return;
        if(state.favReorderActive) return;
        var row = state.favTouchMoveRow || (e.target && e.target.closest ? e.target.closest(".music-v7-track.fav-mode") : null);
        if(!row) return;
        var t1 = e.changedTouches && e.changedTouches[0];
        var dx = (t1 ? t1.clientX : 0) - (state.favTouchStartX || 0);
        var dy = (t1 ? t1.clientY : 0) - (state.favTouchStartY || 0);
        row.classList.remove("dragging");

        var commitThreshold = Math.min(160, Math.max(115, row.offsetWidth * 0.38));
        if(dx < -commitThreshold && Math.abs(dx) > Math.abs(dy) * 1.1){
          e.preventDefault();
          e.stopPropagation();
          removeFavoriteWithRow(row, row.dataset.trackId || "");
          return;
        }

        row.style.transform = "";
        row.classList.remove("delete-ready");
        row.classList.remove("delete-open");
        state.favDeleteOpenId = "";
        state.favTouchMoveRow = null;
        setTimeout(function(){ state.favTouchMoved = false; }, 0);
      }, {passive:false});

      // お気に入り曲：長押しして上下ドラッグで並び替え。
      // 左スワイプ削除とは方向と開始タイミングを分離する。
      function cancelFavReorderTimer(){
        clearTimeout(state.favReorderTimer);
        state.favReorderTimer = 0;
      }

      function beginFavReorder(row){
        if(!row || !row.isConnected || !isFavoritesListOpen()) return;

        state.favReorderActive = true;
        state.favReorderRow = row;
        state.favTouchMoved = true;
        state.favTouchMoveRow = null;

        row.style.transform = "";
        row.classList.remove("delete-ready","delete-open","dragging");
        row.classList.add("fav-reorder-active");

        var list = row.closest(".music-v7-track-list");
        if(list) list.classList.add("fav-reordering");

        try{ if(navigator.vibrate) navigator.vibrate(12); }catch(_){}
      }

      function finishFavReorder(){
        cancelFavReorderTimer();

        var row = state.favReorderRow;
        var list = row && row.closest(".music-v7-track-list");

        if(row) row.classList.remove("fav-reorder-active");
        if(list) list.classList.remove("fav-reordering");

        if(list){
          var order = Array.from(list.querySelectorAll(".music-v7-track.fav-mode"))
            .map(function(el){ return el.dataset.trackId || ""; })
            .filter(Boolean);

          saveFavOrder(order);
          rememberSheetScroll();
        }

        state.favReorderActive = false;
        state.favReorderRow = null;
        state.favTouchMoveRow = null;

        setTimeout(function(){
          state.favTouchMoved = false;
        },180);
      }

      sheet.addEventListener("touchstart", function(e){
        if(!isFavoritesListOpen()) return;

        var row = e.target && e.target.closest
          ? e.target.closest(".music-v7-track.fav-mode")
          : null;
        if(!row) return;

        var touch = e.touches && e.touches[0];
        state.favReorderStartX = touch ? touch.clientX : 0;
        state.favReorderStartY = touch ? touch.clientY : 0;

        cancelFavReorderTimer();
        state.favReorderTimer = setTimeout(function(){
          beginFavReorder(row);
        },430);
      },{passive:true});

      sheet.addEventListener("touchmove", function(e){
        if(!isFavoritesListOpen()) return;

        var touch = e.touches && e.touches[0];
        if(!touch) return;

        var dx = touch.clientX - (state.favReorderStartX || 0);
        var dy = touch.clientY - (state.favReorderStartY || 0);

        if(!state.favReorderActive){
          // 長押し前に動いたら通常スクロール／左スワイプとして扱う。
          if(Math.abs(dx)>9 || Math.abs(dy)>9) cancelFavReorderTimer();
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        var row = state.favReorderRow;
        var list = row && row.closest(".music-v7-track-list");
        if(!row || !list) return;

        var target = document.elementFromPoint(touch.clientX,touch.clientY);
        var over = target && target.closest
          ? target.closest(".music-v7-track.fav-mode")
          : null;

        if(!over || over===row || over.parentNode!==list) return;

        var rect = over.getBoundingClientRect();
        if(touch.clientY < rect.top + rect.height/2){
          list.insertBefore(row,over);
        }else{
          list.insertBefore(row,over.nextSibling);
        }
      },{passive:false});

      sheet.addEventListener("touchend", function(){
        if(state.favReorderActive){
          finishFavReorder();
        }else{
          cancelFavReorderTimer();
        }
      },{passive:true});

      sheet.addEventListener("touchcancel", function(){
        if(state.favReorderActive) finishFavReorder();
        else cancelFavReorderTimer();
      },{passive:true});
    }

    var lyrics = $("musicV7Lyrics");
    if(lyrics){
      lyrics.addEventListener("touchstart", function(e){
        state.dragStartY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
        state.lyricsDragCloseEligible = !!(e.target && e.target.closest && e.target.closest(".music-v7-handle,.music-v7-sheet-head") && !e.target.closest("button"));
      }, {passive:true});
      lyrics.addEventListener("touchend", function(e){
        var y = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : state.dragStartY;
        // 歌詞本文の縦スクロールを優先。ヘッダー/ハンドルから大きく下へ引いた時だけ閉じる。
        if(state.lyricsDragCloseEligible && y - state.dragStartY > 180){ state.lyrics = false; render(); }
        state.lyricsDragCloseEligible = false;
      }, {passive:true});
    }
  }

  function fmt(sec){
    sec = Math.max(0, Math.floor(sec || 0));
    return Math.floor(sec/60) + ":" + String(sec%60).padStart(2,"0");
  }

  function updateProgress(){
    var au = audio();
    var seek = $("musicV7Seek"), cur = $("musicV7Cur"), dur = $("musicV7Dur"), playB = $("musicV7Play");
    if(!au) return;
    if(seek && au.duration && isFinite(au.duration)){
      seek.value = String(Math.floor((au.currentTime / au.duration) * 1000));
    }
    if(cur) cur.textContent = fmt(au.currentTime);
    if(dur) dur.textContent = au.duration && isFinite(au.duration) ? fmt(au.duration) : "0:00";
    if(playB) playB.textContent = au.paused ? "▶" : "Ⅱ";
    if("mediaSession" in navigator){
      try{ navigator.mediaSession.playbackState = au.paused ? "paused" : "playing"; }catch(e){}
      updateMediaPositionV8();
    }
  }

  function render(){
    if(state.screen === "albums") renderAlbums();
    else renderPlayer();
  }

  function boot(){
    loadState();
    bindMediaSessionV8();

    // Stop legacy visible controls from old music scripts.
    ["musicPlayPause","musicPrev","musicNext"].forEach(function(id){ var e=$(id); if(e) e.style.display="none"; });
    var controls = document.querySelector("#musicView .music-controls"); if(controls) controls.style.display="none";

    var au = audio();
    if(au && !au.dataset.v7Bound){
      au.dataset.v7Bound = "1";
      au.addEventListener("timeupdate", function(){ updateProgress(); syncMusicVideo(false); if(Math.floor(au.currentTime)%7===0) savePos(); });
      au.addEventListener("loadedmetadata", function(){ updateProgress(); syncMusicVideo(true); });
      au.addEventListener("play", function(){ state.playing = true; updateMediaSessionV8(); updateProgress(); syncMusicVideo(true); });
      au.addEventListener("pause", function(){ state.playing = false; savePos(); updateMediaSessionV8(); updateProgress(); syncMusicVideo(false); });
      au.addEventListener("seeking", function(){ syncMusicVideo(true); });
      au.addEventListener("seeked", function(){ syncMusicVideo(true); });
      au.addEventListener("ratechange", function(){ syncMusicVideo(false); });
      au.addEventListener("ended", function(){ var mv=musicVideo(); if(mv){ try{ mv.pause(); }catch(e){} } next(true); });
      window.addEventListener("pagehide", savePos);
      window.addEventListener("beforeunload", savePos);
    }

    var musicBtn = $("musicMode");
    if(musicBtn && !musicBtn.dataset.v7Bound){
      musicBtn.dataset.v7Bound = "1";
      musicBtn.addEventListener("click", function(){ setTimeout(function(){ state.screen = "albums"; state.sheet = false; render(); }, 0); });
    }

    if(!window.__MEGANE_MUSIC_UNLOCK_CHANGED_BOUND__){
      window.__MEGANE_MUSIC_UNLOCK_CHANGED_BOUND__ = true;
      window.addEventListener("megane:musicUnlockChanged", function(){
        try{ render(); }catch(e){}
      });
    }

    render();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MEGANE_MUSIC_V7_RENDER = render;
  window.MEGANE_MUSIC_V7_OPEN_FAVORITES = switchToFavorites;

  // production143:
  // 実際の megane_music_v7_favs を使う保護曲一覧を直接開く。
  // 再生中の album / track / queueMode は変更しない。
  window.MEGANE_MUSIC_V7_OPEN_FAVORITES_LIST = function(){
    var keepAlbum = state.album;
    var keepTrack = state.track;
    var keepQueue = state.queueMode;

    state.browsingAlbum = -1;
    state.browsingTrack = 0;
    state.screen = "player";
    state.sheet = true;
    state.lyrics = false;
    state.sheetScrollTop = 0;
    state.sheetAlbumKey = "favorites";
    state.favDeleteOpenId = "";

    state.album = keepAlbum;
    state.track = keepTrack;
    state.queueMode = keepQueue || "album";

    render();
    restoreSheetScroll();
  };

  // production144 bridge: 軽量ミニプレイヤー用の読み取り・操作API
  window.MEGANE_MUSIC_V7_NOW = function(){
    var au = audio();
    var t = actualPlayingTrack();
    var album = t && typeof t._album === "number" ? albums()[t._album] : currentAlbum();
    var index = t && typeof t._track === "number" ? t._track : (state.track || 0);
    var info = parseTitle(t, index);

    return {
      type: "music",
      id: (t && t.id) || "",
      title: info.title || (t && t.title) || "MEGANE MUSIC",
      subtitle: (album && (album._originTitle || album.title)) || "Music",
      artwork: (t && t.cover) || (album && album.cover) || "",
      src: au ? (au.currentSrc || au.src || "") : "",
      time: au ? Number(au.currentTime || 0) : 0,
      paused: au ? !!au.paused : true,
      albumIndex: t && typeof t._album === "number" ? t._album : state.album,
      trackIndex: t && typeof t._track === "number" ? t._track : state.track
    };
  };

  // 保存済みsrcと内部stateを同期する。
  window.MEGANE_MUSIC_V7_SYNC_TO_SRC = function(src){
    var t = findTrackByAudioSrc(src);
    if(!t) return false;

    state.queueMode = "album";
    state.album = t._album;
    state.track = t._track;
    state.browsingAlbum = t._album;
    state.browsingTrack = t._track;
    saveState();
    return true;
  };

  window.MEGANE_MUSIC_V7_TOGGLE_CURRENT = function(){
    var au = audio();
    if(!au) return false;
    setAudioForCurrent(false);
    try{
      if(!au.paused){
        au.pause();
      }else{
        var p = au.play();
        if(p && p.catch) p.catch(function(){});
      }
      return true;
    }catch(_){
      return false;
    }
  };

  // production6: ミニプレイヤーのお気に入りボタン用
  window.MEGANE_MUSIC_V7_IS_FAVORITE = function(trackId){
    var t = actualPlayingTrack();
    var id = trackId || (t && t.id) || "";
    return isFav(id);
  };

  window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE = function(trackId){
    var t = actualPlayingTrack();
    var id = trackId || (t && t.id) || "";
    if(!id) return false;
    toggleFav(id);
    try{ render(); }catch(_){}
    return isFav(id);
  };

  window.MEGANE_MUSIC_V7_OPEN_CURRENT = function(){
    state.browsingAlbum = state.album;
    state.browsingTrack = state.track;
    state.screen = "player";
    state.sheet = false;
    state.lyrics = false;
    render();
  };

  window.MEGANE_MUSIC_V7_OPEN_ALBUMS = function(){ state.screen = "albums"; state.sheet = false; state.lyrics = false; render(); };
})();


/* SAMPLE PATCH: type:'single' を利用したレイアウト分岐用の下準備を追加 */
