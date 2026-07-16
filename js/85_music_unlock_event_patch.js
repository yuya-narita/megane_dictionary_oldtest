/* 85_music_unlock_event_patch.js
   Music Unlock Event Patch v3

   役割：
   - 40_music_data.js の album.unlock / track.unlock を読む
   - アルバム解放 + 曲ごとの解放に対応
   - The Looking Bear みたいな段階解放で「5/12曲」表示用の状態を返す
   - Developerカード3枚/10枚/コンプテストに対応

   40_music_data.js 追記例：

   アルバム解放：
   unlock: {
     type: "cardKinds",
     need: 3,
     mode: "ghost",
     label: "👁 未観測",
     hint: "カードを3種類観測すると出現",
     progressLabel: "カード観測",
     unlockedMessage: "The Looking Bear Land が観測されました。"
   },

   曲ごと解放：
   { id:"bear_06", title:"Double Bind Bug", audio:"...",
     unlock: {
       type: "cardKinds",
       need: 10,
       label: "🔒 未観測",
       hint: "カードを10種類観測すると解放",
       progressLabel: "カード観測",
       unlockedMessage: "Looking Bear Land の奥が観測されました。"
     }
   }

   解除状態は localStorage の megane_music_event_unlocks_v1 に保存されます。
*/
(function(){
  "use strict";

  var KEY = "megane_music_event_unlocks_v1";
  var lastToast = {};

  function readJson(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }

  function saveJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  function unlocks(){ return readJson(KEY, {}); }
  function saveUnlocks(v){ saveJson(KEY, v || {}); }

  function requestMusicRefresh(){
    try{ window.dispatchEvent(new CustomEvent("megane:musicUnlockChanged")); }catch(e){}
  }

  function toast(msg){
    if(!msg) return;
    var now = Date.now();
    if(lastToast[msg] && now - lastToast[msg] < 3000) return;
    lastToast[msg] = now;

    var old = document.querySelector(".megane-unlock-toast");
    if(old) old.remove();
    var t = document.createElement("div");
    t.className = "megane-unlock-toast";
    t.textContent = msg;
    t.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:max(92px,env(safe-area-inset-bottom))",
      "transform:translateX(-50%)",
      "z-index:100050",
      "max-width:86vw",
      "padding:12px 16px",
      "border-radius:999px",
      "background:rgba(0,0,0,.78)",
      "border:1px solid rgba(255,230,170,.28)",
      "color:#fff",
      "font-weight:900",
      "font-size:13px",
      "box-shadow:0 12px 34px rgba(0,0,0,.42)"
    ].join(";");
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2200);
  }

  window.MEGANE_TOAST = window.MEGANE_TOAST || toast;

  function cardKinds(){
    var devKinds = 0;
    try{
      devKinds = Number(localStorage.getItem("megane_dev_card_kinds") || 0);
      if(localStorage.getItem("megane_dev_card_complete") === "1") devKinds = Math.max(devKinds, 25);
    }catch(e){ devKinds = 0; }

    var realKinds = 0;
    var candidates = [
      "cardOwnedUniqueV100",
      "cardCollectionV100",
      "megane_card_collection_v100"
    ];

    for(var c=0;c<candidates.length;c++){
      var raw = localStorage.getItem(candidates[c]);
      if(!raw) continue;
      try{
        var parsed = JSON.parse(raw);
        if(Array.isArray(parsed)){
          var set = {};
          parsed.forEach(function(x){
            if(x !== null && x !== undefined) set[String(x)] = true;
          });
          realKinds = Math.max(realKinds, Object.keys(set).length);
        }
        if(parsed && typeof parsed === "object"){
          realKinds = Math.max(realKinds, Object.keys(parsed).filter(function(k){
            return Number(parsed[k] || 0) > 0 || parsed[k] === true;
          }).length);
        }
      }catch(e){}
    }

    return Math.max(realKinds, devKinds);
  }

  function conditionProgress(unlock){
    if(!unlock) return { now:0, need:0, ok:true };
    var need = Number(unlock.need || 0);
    var now = 0;

    if(unlock.type === "cardKinds"){
      now = cardKinds();
    }else{
      now = 0;
    }

    return {
      now: now,
      need: need,
      ok: need > 0 ? now >= need : false
    };
  }

  function keyFor(kind, album, track){
    if(kind === "track"){
      return "track:" + (album && album.id ? album.id : "album") + ":" + (track && track.id ? track.id : "track");
    }
    return "album:" + (album && album.id ? album.id : "album");
  }

  function markUnlocked(kind, album, track, silent){
    var id = keyFor(kind, album, track);
    var u = unlocks();
    if(!u[id]){
      u[id] = {
        kind: kind,
        unlockedAt: new Date().toISOString(),
        albumId: album && album.id || "",
        albumTitle: album && album.title || "",
        trackId: track && track.id || "",
        trackTitle: track && track.title || ""
      };
      saveUnlocks(u);
      requestMusicRefresh();

      try{
        if(window.MEGANE_OBSERVE){
          window.MEGANE_OBSERVE(kind === "track" ? "unlock.track" : "unlock.album", {
            id: kind === "track" ? (track && track.id) : (album && album.id),
            title: kind === "track" ? (track && track.title) : (album && album.title),
            albumId: album && album.id,
            albumTitle: album && album.title
          });
        }
      }catch(e){}

      if(!silent){
        var msg = "";
        if(kind === "track"){
          msg = (track && track.unlock && track.unlock.unlockedMessage) || ((track && track.title || "曲") + " が観測されました。");
        }else{
          msg = (album && album.unlock && album.unlock.unlockedMessage) || ((album && album.title || "アルバム") + " が観測されました。");
        }
        toast(msg);
      }
    }
  }

  function albumState(album){
    if(!album) return { unlocked:true, locked:false, hidden:false };

    if(localStorage.getItem("megane_dev_unlock_all") === "1"){
      return { unlocked:true, locked:false, hidden:false, progressText:"DEV全解除" };
    }

    var store = unlocks();

    if(album.locked && album.unlockCode && !album.unlock){
      var legacyPasscodeKey =
        "megane_music_album_unlocked_" +
        String((album && (album.id || album.title)) || "");
      var passcodeUnlocked = false;
      try{
        passcodeUnlocked = localStorage.getItem(legacyPasscodeKey) === "1";
      }catch(e){
        passcodeUnlocked = false;
      }

      if(passcodeUnlocked){
        return {
          unlocked:true,
          locked:false,
          hidden:false,
          label:"✅ 解除済み",
          hint:"",
          progressText:"解除済み"
        };
      }

      return {
        unlocked:false,
        locked:true,
        hidden:false,
        label: album.lockLabel || "🚫 禁止",
        hint: album.lockHint || "解除コード入力",
        progressText: album.lockHint || ""
      };
    }

    if(!album.unlock){
      return { unlocked:true, locked:false, hidden:false };
    }

    if(store[keyFor("album", album)] || store[album.id]){
      return {
        unlocked:true,
        locked:false,
        hidden:false,
        label:"✅ 観測済み",
        hint:"",
        progressText:"観測済み"
      };
    }

    var prog = conditionProgress(album.unlock);
    if(prog.ok){
      markUnlocked("album", album, null, false);
      return {
        unlocked:true,
        locked:false,
        hidden:false,
        label:"✅ 観測済み",
        hint:"",
        progressText:"観測済み"
      };
    }

    var label = album.unlock.label || "👁 未観測";
    var hint = album.unlock.hint || "観測条件を満たすと出現";
    var pl = album.unlock.progressLabel || "観測";
    return {
      unlocked:false,
      locked:true,
      hidden: album.unlock.mode === "hidden",
      label: label,
      hint: hint,
      now: prog.now,
      need: prog.need,
      progressText: pl + " " + prog.now + "/" + prog.need
    };
  }

  function trackState(album, track, index){
    if(!track) return { unlocked:true, locked:false, hidden:false };

    if(localStorage.getItem("megane_dev_unlock_all") === "1"){
      return { unlocked:true, locked:false, hidden:false, progressText:"DEV全解除" };
    }

    var ast = albumState(album);
    if(ast && (ast.locked || ast.unlocked === false)){
      return {
        unlocked:false,
        locked:true,
        hidden:false,
        label:(ast.label || "👁 未観測"),
        hint:(ast.hint || "アルバムが未観測です。"),
        progressText:(ast.progressText || "")
      };
    }

    if(track.locked && track.unlockCode && !track.unlock){
      return {
        unlocked:false,
        locked:true,
        hidden:false,
        label: track.lockLabel || "🚫 禁止",
        hint: track.lockHint || "解除コード入力",
        progressText: track.lockHint || ""
      };
    }

    if(!track.unlock){
      return { unlocked:true, locked:false, hidden:false };
    }

    var store = unlocks();
    if(store[keyFor("track", album, track)]){
      return { unlocked:true, locked:false, hidden:false, label:"✅ 観測済み", hint:"", progressText:"観測済み" };
    }

    var prog = conditionProgress(track.unlock);
    if(prog.ok){
      markUnlocked("track", album, track, false);
      return { unlocked:true, locked:false, hidden:false, label:"✅ 観測済み", hint:"", progressText:"観測済み" };
    }

    var label = track.unlock.label || "🔒 未観測";
    var hint = track.unlock.hint || "観測条件を満たすと解放";
    var pl = track.unlock.progressLabel || "観測";
    return {
      unlocked:false,
      locked:true,
      hidden: track.unlock.mode === "hidden",
      label: label,
      hint: hint,
      now: prog.now,
      need: prog.need,
      progressText: pl + " " + prog.now + "/" + prog.need
    };
  }

  function albumTrackProgress(album){
    var tracks = (album && album.tracks) || [];
    var total = tracks.length || 0;
    if(!total) return { total:0, unlocked:0, text:"0/0曲" };

    var count = 0;
    tracks.forEach(function(t, i){
      var st = trackState(album, t, i);
      if(st && st.unlocked && !st.locked) count++;
    });

    return {
      total: total,
      unlocked: count,
      text: count + "/" + total + "曲"
    };
  }

  function getAlbums(){
    try{
      if(typeof musicPlaylists !== "undefined" && Array.isArray(musicPlaylists)) return musicPlaylists;
      if(window.musicPlaylists && Array.isArray(window.musicPlaylists)) return window.musicPlaylists;
    }catch(e){}
    return [];
  }

  function checkAll(){
    getAlbums().forEach(function(a){
      if(!a) return;
      if(a.unlock) albumState(a);
      ((a.tracks || [])).forEach(function(t, i){
        if(t && t.unlock) trackState(a, t, i);
      });
    });
  }

  window.MEGANE_MUSIC_UNLOCK_STATE = albumState;
  window.MEGANE_MUSIC_TRACK_UNLOCK_STATE = trackState;
  window.MEGANE_MUSIC_ALBUM_TRACK_PROGRESS = albumTrackProgress;
  window.MEGANE_MUSIC_UNLOCK_CHECK = checkAll;
  window.MEGANE_MUSIC_UNLOCK_RESET = function(id){
    var u = unlocks();
    if(id) delete u[id];
    else u = {};
    saveUnlocks(u);
    requestMusicRefresh();
  };
  window.MEGANE_MUSIC_CARD_KINDS = cardKinds;

  var checkQueued = false;
  function scheduleCheck(){
    if(checkQueued) return;
    checkQueued = true;
    setTimeout(function(){
      checkQueued = false;
      checkAll();
    }, 60);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", scheduleCheck, { once:true });
  }else{
    scheduleCheck();
  }

  // 常時ポーリングは行わず、解除状態が変わり得る場面だけ再判定する。
  window.addEventListener("megane:musicUnlockChanged", scheduleCheck);
  window.addEventListener("storage", scheduleCheck);
  window.addEventListener("focus", scheduleCheck);
  window.addEventListener("pageshow", scheduleCheck);
  document.addEventListener("visibilitychange", function(){
    if(!document.hidden) scheduleCheck();
  });
  document.addEventListener("click", function(e){
    var musicTab = e.target && e.target.closest
      ? e.target.closest("#musicMode,[data-mode='music'],.music-mode-button")
      : null;
    if(musicTab) scheduleCheck();
  }, { passive:true });
})();
