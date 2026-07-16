/* Conference Player v15: play/pause, +/-15s, seek bar, time display */
(function () {
  function q(id) {
    return document.getElementById(id);
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function isConfReader() {
    try {
      return appMode === "manga" && mangaState === "reader";
    } catch (e) {
      return false;
    }
  }

  function currentConf() {
    try {
      return mangaStories[mangaStoryIndex] || null;
    } catch (e) {
      return null;
    }
  }

  function audioEl() {
    return q("mangaAudio");
  }

  function ensureAudio() {
    var audio = audioEl();
    var story = currentConf();
    if (!audio || !story || !story.audio) return null;

    var src = story.audio;
    if (!audio.getAttribute("src") || audio.getAttribute("src") !== src) {
      audio.pause();
      audio.setAttribute("src", src);
      audio.load();
    }
    return audio;
  }

  function setPlayingLabel() {
    var btn = q("confPlayPause");
    var audio = audioEl();
    if (!btn || !audio) return;
    btn.textContent = audio.paused ? "▶ 再生" : "⏸ 停止";
  }

  function updateTimeUI() {
    var audio = audioEl();
    var seek = q("confSeek");
    var time = q("confTime");

    if (!audio) return;

    if (seek) {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
      } else {
        seek.value = 0;
      }
    }

    if (time) {
      time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration || 0);
    }

    setPlayingLabel();
  }

  function showHidePlayer() {
    var box = q("confPlayerControls");
    if (!box) return;
    var story = currentConf();
    var shouldShow = isConfReader() && story && story.type === "conference";
    box.hidden = !shouldShow;
    if (shouldShow) updateTimeUI();
  }

  function togglePlay() {
    var audio = ensureAudio();
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(function (err) {
        console.log("Conference audio play failed:", err);
      });
    } else {
      audio.pause();
    }
    setTimeout(updateTimeUI, 60);
  }

  function jump(sec) {
    var audio = ensureAudio();
    if (!audio) return;
    var duration = audio.duration && isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + sec));
    updateTimeUI();
  }

  function seekToValue(value) {
    var audio = ensureAudio();
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    var ratio = Number(value) / 1000;
    audio.currentTime = audio.duration * ratio;
    updateTimeUI();
  }

  function bindOnce() {
    var play = q("confPlayPause");
    var back = q("confBack15");
    var forward = q("confForward15");
    var seek = q("confSeek");
    var audio = audioEl();

    if (play && !play.dataset.boundConf15) {
      play.dataset.boundConf15 = "1";
      play.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
      });
    }

    if (back && !back.dataset.boundConf15) {
      back.dataset.boundConf15 = "1";
      back.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        jump(-15);
      });
    }

    if (forward && !forward.dataset.boundConf15) {
      forward.dataset.boundConf15 = "1";
      forward.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        jump(15);
      });
    }

    if (seek && !seek.dataset.boundConf15) {
      seek.dataset.boundConf15 = "1";
      seek.addEventListener("input", function () {
        seekToValue(seek.value);
      });
      seek.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    if (audio && !audio.dataset.boundConf15) {
      audio.dataset.boundConf15 = "1";
      audio.addEventListener("timeupdate", updateTimeUI);
      audio.addEventListener("loadedmetadata", updateTimeUI);
      audio.addEventListener("play", updateTimeUI);
      audio.addEventListener("pause", updateTimeUI);
      audio.addEventListener("ended", updateTimeUI);
    }
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__conf15Patched) return;
      var original = render;
      render = function () {
        var result = original.apply(this, arguments);
        setTimeout(function () {
          bindOnce();
          showHidePlayer();
        }, 0);
        return result;
      };
      render.__conf15Patched = true;
    } catch (e) {}
  }

  function patchCentralButton() {
    var mid = q("randomWord");
    if (!mid || mid.dataset.boundConf15Mid) return;
    mid.dataset.boundConf15Mid = "1";
    mid.addEventListener("click", function (e) {
      if (!isConfReader()) return;
      e.preventDefault();
      e.stopPropagation();
      togglePlay();
    }, true);
  }

  function boot() {
    bindOnce();
    patchRender();
    patchCentralButton();
    showHidePlayer();
    setInterval(function () {
      bindOnce();
      showHidePlayer();
      updateTimeUI();
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
