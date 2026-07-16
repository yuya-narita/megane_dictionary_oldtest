/* Conference Player SOLID
   - loaded after legacy hotfixes
   - uses native <audio controls> plus custom buttons
   - keeps source in sync with selected conference
*/
(function () {
  function q(id) { return document.getElementById(id); }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function currentStory() {
    try {
      return mangaStories[mangaStoryIndex] || mangaStories[selectedMangaIndex] || mangaStories[0] || null;
    } catch (e) {
      return null;
    }
  }

  function isReader() {
    try { return appMode === "manga" && mangaState === "reader"; }
    catch(e) { return false; }
  }

  function isConferenceMediaActive() {
    var a = mainAudio();
    if (!a) return false;
    // Conference画面でConference音声が対象の時だけMediaSessionを奪う。
    // 音楽再生中にinterval/focusでConferenceへ戻る事故を防ぐ。
    if (!isReader()) return false;
    var story = currentStory();
    if (!story || !story.audio) return false;
    return true;
  }

  function mainAudio() {
    return q("confNativeAudio") || q("mangaAudio");
  }


  /* v2: Conference MediaSession - 15秒送り戻し優先 */
  function absUrlConf(src) {
    if (!src) return "";
    try { return new URL(src, location.href).href; } catch(e) { return src; }
  }

  function confArtwork(src) {
    src = absUrlConf(src || "");
    if (!src) return [];
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

  function setConfAction(name, fn) {
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;
    try { navigator.mediaSession.setActionHandler(name, fn); } catch(e) {}
  }

  function updateConfPosition() {
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;
    var a = mainAudio();
    if (!a || !a.duration || !isFinite(a.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, Number(a.duration) || 0),
        playbackRate: Number(a.playbackRate) || 1,
        position: Math.max(0, Math.min(Number(a.currentTime) || 0, Number(a.duration) || 0))
      });
    } catch(e) {}
  }

  function bindConfMediaActions() {
    if (!("mediaSession" in navigator) || !isConferenceMediaActive()) return;

    // iOSは前のMediaSession操作が残ることがあるため、Conference表示時に毎回上書きする。
    // まず曲送り系を消してから、15秒送り戻しを登録する。
    setConfAction("previoustrack", null);
    setConfAction("nexttrack", null);

    setConfAction("play", function () {
      var a = ensureAudio();
      if (!a) return;
      var p = a.play();
      if (p && p.catch) p.catch(function(){});
    });
    setConfAction("pause", function () {
      var a = mainAudio();
      if (a) a.pause();
    });
    setConfAction("seekbackward", function (e) {
      window.confPlayerJump(-((e && e.seekOffset) || 15));
    });
    setConfAction("seekforward", function (e) {
      window.confPlayerJump((e && e.seekOffset) || 15);
    });
    setConfAction("seekto", function (e) {
      var a = ensureAudio();
      if (!a || !e || typeof e.seekTime !== "number") return;
      try {
        var duration = (a.duration && isFinite(a.duration)) ? a.duration : Math.max(0, e.seekTime);
        a.currentTime = Math.max(0, Math.min(duration, e.seekTime));
        updateUI();
      } catch(_) {}
    });
  }

  function updateConfMediaSession() {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    if (!isConferenceMediaActive()) return;
    var story = currentStory();
    var a = mainAudio();
    if (!story) return;
    var img = story.playerImage || story.thumb || "images/conference/conference_room.jpg";

    try {
      bindConfMediaActions();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: story.title || "Syntax Conference",
        artist: "Syntax Conference",
        album: "未来確定プロジェクト",
        artwork: confArtwork(img)
      });
      navigator.mediaSession.playbackState = a && !a.paused ? "playing" : "paused";
      updateConfPosition();
    } catch(e) {}
  }

  function stopOtherAudioIfNeeded(a) {
    var old = q("mangaAudio");
    if (old && old !== a) {
      try { old.pause(); } catch(e) {}
    }
  }

  function ensureAudio() {
    var story = currentStory();
    var a = mainAudio();
    if (!story || !story.audio || !a) return null;

    stopOtherAudioIfNeeded(a);

    if (a.getAttribute("src") !== story.audio) {
      try { a.pause(); } catch(e) {}
      a.setAttribute("src", story.audio);
      try { a.load(); } catch(e) {}
    }
    return a;
  }

  function updateText() {
    var story = currentStory();
    var title = q("confTitle");
    var desc = q("confDesc");
    if (title && story) title.textContent = story.title || "Syntax Conference";
    if (desc && story) desc.textContent = story.desc || "Conference音声を再生できます。";
  }

  function updateUI() {
    updateText();

    
  var stage = document.querySelector(".conf-stage");
  var story = currentStory && currentStory();
  if (stage && story) {
    var img = story.playerImage || story.thumb || "images/conference/conference_room.jpg";
    stage.style.backgroundImage =
      'linear-gradient(rgba(0,0,0,.42), rgba(0,0,0,.62)), url("' + img + '")';
  }
var layer = q("confPlayerLayer");
    if (layer) layer.hidden = !isReader();

    try {
      document.body.classList.toggle("conf-player-state", isReader());
    } catch(e) {}

    var a = ensureAudio();
    var btn = q("confPlayPause");
    var seek = q("confSeek");
    var time = q("confTime");

    if (btn && a) btn.textContent = a.paused ? "▶ 再生" : "⏸ 停止";

    if (seek && a) {
      if (a.duration && isFinite(a.duration) && a.duration > 0) {
        seek.value = Math.round((a.currentTime / a.duration) * 1000);
      } else {
        seek.value = 0;
      }
    }

    if (time && a) {
      time.textContent = fmt(a.currentTime) + " / " + fmt(a.duration || 0);
    }

    updateConfMediaSession();
  }

  window.confPlayerToggle = function () {
    var a = ensureAudio();
    if (!a) {
      console.log("Conference audio missing");
      return;
    }

    if (a.paused) {
      a.play().catch(function (err) {
        console.log("Conference audio play failed:", err);
      });
    } else {
      a.pause();
    }
    setTimeout(updateUI, 80);
  };

  window.confPlayerJump = function (sec) {
    var a = ensureAudio();
    if (!a) return;
    var duration = (a.duration && isFinite(a.duration)) ? a.duration : Math.max(0, a.currentTime + sec);
    a.currentTime = Math.max(0, Math.min(duration, a.currentTime + sec));
    updateUI();
    updateConfMediaSession();
  };

  window.confPlayerSeek = function (value) {
    var a = ensureAudio();
    if (!a || !a.duration || !isFinite(a.duration)) return;
    a.currentTime = a.duration * (Number(value) / 1000);
    updateUI();
    updateConfMediaSession();
  };

  window.confPlayerBackToList = function () {
    var a = mainAudio();
    if (a) a.pause();
    try {
      mangaState = "list";
      setMode("manga");
    } catch(e) {}
    updateUI();
  };

  function bind() {
    var play = q("confPlayPause");
    var back = q("confBack15");
    var fwd = q("confForward15");
    var seek = q("confSeek");
    var list = q("confBackToList");
    var a = mainAudio();

    if (play && !play.dataset.solidBound) {
      play.dataset.solidBound = "1";
      play.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        window.confPlayerToggle();
        return false;
      };
    }
    if (back && !back.dataset.solidBound) {
      back.dataset.solidBound = "1";
      back.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        window.confPlayerJump(-15);
        return false;
      };
    }
    if (fwd && !fwd.dataset.solidBound) {
      fwd.dataset.solidBound = "1";
      fwd.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        window.confPlayerJump(15);
        return false;
      };
    }
    if (seek && !seek.dataset.solidBound) {
      seek.dataset.solidBound = "1";
      seek.oninput = function () { window.confPlayerSeek(seek.value); };
      seek.onclick = function (e) { e.stopPropagation(); };
    }
    if (list && !list.dataset.solidBound) {
      list.dataset.solidBound = "1";
      list.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        window.confPlayerBackToList();
        return false;
      };
    }

    if (a && !a.dataset.solidBound) {
      a.dataset.solidBound = "1";
      ["timeupdate", "loadedmetadata", "play", "pause", "ended", "error"].forEach(function(ev) {
        a.addEventListener(ev, updateUI);
      });
    }
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__solidConfPatched) return;
      var oldRender = render;
      render = function () {
        var result = oldRender.apply(this, arguments);
        setTimeout(function () { bind(); updateUI(); }, 0);
        return result;
      };
      render.__solidConfPatched = true;
    } catch(e) {}
  }

  function boot() {
    bind();
    patchRender();
    updateUI();
    updateConfMediaSession();
    document.addEventListener("visibilitychange", function(){ if(!document.hidden) updateConfMediaSession(); });
    window.addEventListener("focus", updateConfMediaSession);

    // keep binding after legacy scripts and state changes
    setInterval(function () {
      bind();
      updateUI();
      updateConfMediaSession();
    }, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
