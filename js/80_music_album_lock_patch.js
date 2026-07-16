/* 80_music_album_lock_patch.js
   v2: MUSIC album lock patch
   locked:true / unlockCode:"LOOK BACK" を付けたアルバムをロック。
   DOM再描画後もMutationObserverとクリック捕獲でロックを維持します。
*/
(function(){
  "use strict";

  var LONG_PRESS_MS = 850;
  var PATCHED = "musicAlbumLockPatchV2";
  var OBSERVER_READY = false;

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#39;"}[m];
    });
  }

  function playlists(){
    try{
      if(typeof musicPlaylists !== "undefined" && Array.isArray(musicPlaylists)) return musicPlaylists;
      if(window.musicPlaylists && Array.isArray(window.musicPlaylists)) return window.musicPlaylists;
    }catch(e){}
    return [];
  }

  function keyFor(album){
    return "megane_music_album_unlocked_" + String((album && (album.id || album.title)) || "");
  }

  function unlocked(album){
    if(!album || !album.locked) return true;
    try{ return localStorage.getItem(keyFor(album)) === "1"; }
    catch(e){ return false; }
  }

  function isLocked(album){
    return !!(album && album.locked && !unlocked(album));
  }

  function codeOf(album){
    return String((album && (album.unlockCode || album.code)) || "LOOK BACK").trim().toUpperCase().replace(/\s+/g, " ");
  }

  function albumFromButton(btn){
    if(!btn || !btn.dataset) return null;
    var arr = playlists();
    return arr[Number(btn.dataset.album || 0)] || null;
  }

  function ensureStyle(){
    if(document.getElementById("musicAlbumLockPatchStyleV2")) return;
    var st = document.createElement("style");
    st.id = "musicAlbumLockPatchStyleV2";
    st.textContent = [
      ".music-album-locked{position:relative!important;overflow:hidden!important;filter:grayscale(.25) brightness(.68)!important;}",
      ".music-album-locked::after{content:'';position:absolute;inset:0;background:linear-gradient(145deg,rgba(0,0,0,.16),rgba(0,0,0,.56));pointer-events:none;z-index:5;}",
      ".music-album-lock-badge{position:absolute;left:10px;top:10px;z-index:9;padding:6px 9px;border-radius:999px;border:1px solid rgba(255,120,120,.32);background:rgba(0,0,0,.72);color:rgba(255,220,220,.96);font-size:11px;font-weight:900;letter-spacing:.05em;pointer-events:none;}",
      ".music-album-lock-copy{position:absolute;left:10px;right:10px;bottom:10px;z-index:9;padding:8px 9px;border-radius:12px;background:rgba(0,0,0,.66);color:rgba(255,255,255,.82);font-size:11px;line-height:1.45;font-weight:800;text-align:left;pointer-events:none;}",
      "#musicAlbumLockModal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:max(20px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom));background:rgba(0,0,0,.76);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}",
      "#musicAlbumLockModal[hidden]{display:none!important;}",
      ".music-lock-card{width:min(90vw,420px);border-radius:26px;border:1px solid rgba(255,100,100,.28);background:linear-gradient(145deg,rgba(95,12,20,.92),rgba(10,10,16,.96));color:#fff;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.62);text-align:center;}",
      ".music-lock-title{font-size:20px;font-weight:900;letter-spacing:.08em;margin-bottom:8px;}",
      ".music-lock-sub{color:rgba(255,255,255,.68);font-size:13px;line-height:1.65;margin-bottom:18px;}",
      ".music-lock-input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.20);border-radius:16px;background:rgba(0,0,0,.28);color:#fff;padding:14px 15px;font-size:16px;font-weight:800;text-align:center;outline:none;letter-spacing:.08em;}",
      ".music-lock-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;}",
      ".music-lock-actions button{border-radius:999px;padding:11px 12px;font-weight:900;}",
      ".music-lock-message{min-height:1.4em;margin-top:12px;color:rgba(255,220,120,.92);font-size:13px;font-weight:900;}",
      ".music-lock-granted{color:rgba(170,255,190,.95)!important;}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function makeModal(){
    ensureStyle();
    var m = document.getElementById("musicAlbumLockModal");
    if(m) return m;
    m = document.createElement("div");
    m.id = "musicAlbumLockModal";
    m.hidden = true;
    m.innerHTML = ''
      + '<div class="music-lock-card">'
      + '<div class="music-lock-title">🚫 ACCESS DENIED</div>'
      + '<div class="music-lock-sub" id="musicLockSub">このアルバムは封印されています。<br>解除コードを入力してください。</div>'
      + '<input class="music-lock-input" id="musicLockInput" autocomplete="off" placeholder="解除コード">'
      + '<div class="music-lock-actions"><button type="button" id="musicLockCancel">閉じる</button><button type="button" id="musicLockSubmit">解除</button></div>'
      + '<div class="music-lock-message" id="musicLockMessage"></div>'
      + '</div>';
    document.body.appendChild(m);
    document.getElementById("musicLockCancel").onclick = function(){ m.hidden = true; };
    m.addEventListener("click", function(e){ if(e.target === m) m.hidden = true; });
    return m;
  }

  function openDialog(album){
    if(!album) return;
    var m = makeModal();
    var input = document.getElementById("musicLockInput");
    var msg = document.getElementById("musicLockMessage");
    var sub = document.getElementById("musicLockSub");
    var submit = document.getElementById("musicLockSubmit");

    sub.innerHTML = esc(album.lockMessage || "このアルバムは封印されています。") + "<br>解除コードを入力してください。";
    input.value = "";
    msg.textContent = "";
    msg.className = "music-lock-message";
    m.hidden = false;
    setTimeout(function(){ try{ input.focus(); }catch(e){} }, 80);

    submit.onclick = function(){
      var typed = String(input.value || "").trim().toUpperCase().replace(/\s+/g, " ");
      if(typed !== codeOf(album)){
        msg.textContent = album.failMessage || "解除失敗";
        msg.className = "music-lock-message";
        return;
      }
      try{ localStorage.setItem(keyFor(album), "1"); }catch(e){}
      try{ window.dispatchEvent(new CustomEvent("megane:musicUnlockChanged")); }catch(e){}
      msg.textContent = album.unlockMessage || "ACCESS GRANTED";
      msg.className = "music-lock-message music-lock-granted";
      setTimeout(function(){
        m.hidden = true;
        patch();
        if(window.MEGANE_MUSIC_V7_RENDER) window.MEGANE_MUSIC_V7_RENDER();
      }, 520);
    };

    input.onkeydown = function(e){
      if(e.key === "Enter") submit.click();
      if(e.key === "Escape") m.hidden = true;
    };
  }

  function decorate(btn, album){
    if(!btn || !album || !album.locked) return;

    if(unlocked(album)){
      btn.classList.remove("music-album-locked");
      btn.dataset.albumLockPatch = "";
      var oldB = btn.querySelector(".music-album-lock-badge");
      var oldC = btn.querySelector(".music-album-lock-copy");
      if(oldB) oldB.remove();
      if(oldC) oldC.remove();
      return;
    }

    btn.classList.add("music-album-locked");

    if(!btn.querySelector(".music-album-lock-badge")){
      var b = document.createElement("div");
      b.className = "music-album-lock-badge";
      b.textContent = album.lockLabel || "🚫 禁止";
      btn.appendChild(b);
    }
    if(!btn.querySelector(".music-album-lock-copy")){
      var c = document.createElement("div");
      c.className = "music-album-lock-copy";
      c.textContent = album.lockHint || "解除コード入力";
      btn.appendChild(c);
    }

    if(btn.dataset.albumLockPatch === PATCHED) return;
    btn.dataset.albumLockPatch = PATCHED;

    var timer = null, longPressed = false;
    function start(){
      if(!isLocked(album)) return;
      longPressed = false;
      clearTimeout(timer);
      timer = setTimeout(function(){
        longPressed = true;
        openDialog(album);
      }, LONG_PRESS_MS);
    }
    function end(){ clearTimeout(timer); timer = null; }

    btn.addEventListener("pointerdown", start, true);
    btn.addEventListener("pointerup", end, true);
    btn.addEventListener("pointerleave", end, true);
    btn.addEventListener("pointercancel", end, true);
    btn.addEventListener("touchstart", start, true);
    btn.addEventListener("touchend", end, true);
    btn.addEventListener("touchcancel", end, true);

    btn.addEventListener("click", function(e){
      if(!isLocked(album)) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      if(!longPressed) openDialog(album);
      return false;
    }, true);
  }

  function patch(){
    ensureStyle();
    var arr = playlists();
    if(!arr.length) return;
    document.querySelectorAll(".music-v7-album-art[data-album], .music-v7-single-card[data-album]").forEach(function(btn){
      decorate(btn, albumFromButton(btn));
    });
  }

  function installGlobalGuard(){
    if(document.documentElement.dataset.musicAlbumLockGlobalGuardV2 === "1") return;
    document.documentElement.dataset.musicAlbumLockGlobalGuardV2 = "1";
    document.addEventListener("click", function(e){
      var btn = e.target && e.target.closest ? e.target.closest(".music-v7-album-art[data-album], .music-v7-single-card[data-album]") : null;
      if(!btn) return;
      var album = albumFromButton(btn);
      if(!isLocked(album)) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      decorate(btn, album);
      openDialog(album);
      return false;
    }, true);
  }

  function installObserver(){
    if(OBSERVER_READY) return;
    OBSERVER_READY = true;
    try{
      var obs = new MutationObserver(function(){
        clearTimeout(window.__musicAlbumLockPatchTimerV2);
        window.__musicAlbumLockPatchTimerV2 = setTimeout(patch, 0);
      });
      obs.observe(document.body, { childList:true, subtree:true });
    }catch(e){}
  }

  function boot(){
    ensureStyle();
    installGlobalGuard();
    installObserver();
    patch();
    setInterval(patch, 400);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MEGANE_MUSIC_ALBUM_LOCK_PATCH = {
    patch: patch,
    isUnlocked: unlocked,
    lockKey: keyFor,
    reset: function(albumId){
      try{ localStorage.removeItem("megane_music_album_unlocked_" + String(albumId)); }catch(e){}
      patch();
    }
  };
})();
