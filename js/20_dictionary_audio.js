/* clean dictionary audio v2: character/self voice mutex, MP3 first, TTS fallback */
(function () {
  // 音声登録は js/voice-map.js の window.MEGANE_VOICE_MAP に分離。
  // 互換用に、voice-map.js が読み込まれていない場合だけ最低限の初期値を使う。
  const fallbackVoiceMap = {
    "笑い": {
      gag: { id: "laugh_gag_01", text: "笑い？ 世界が一瞬だけバグを許した音や。" }
    }
  };

  function getVoiceMap() {
    return window.MEGANE_VOICE_MAP || fallbackVoiceMap;
  }

  const audio = new Audio();
  let sx = 0;
  let sy = 0;
  let moved = false;
  let lastPlayAt = 0;
  let longPressTimer = null;
  let longPressGuard = false;

  function isDictionary() {
    return typeof appMode !== "undefined" && appMode === "dictionary";
  }

  function currentWordText() {
    const el = document.getElementById("word");
    return el ? el.textContent.trim() : "";
  }

  function currentGlassIdSafe() {
    try {
      if (typeof currentGlass === "function") {
        const g = currentGlass();
        return g && g.id ? g.id : "";
      }
    } catch (e) {}
    return "";
  }

  function getCurrentLine() {
    const entry = getVoiceMap()[currentWordText()];
    if (!entry) return null;
    return entry[currentGlassIdSafe()] || null;
  }

  function pulse(hasLine) {
    const card = document.querySelector(".card");
    const word = document.getElementById("word");
    const translation = document.getElementById("translation");

    if (card) {
      card.classList.remove("voice-tap-feedback", "voice-no-line");
      void card.offsetWidth;
      card.classList.add(hasLine ? "voice-tap-feedback" : "voice-no-line");
    }
    if (word && hasLine) {
      word.classList.remove("voice-word-pulse", "voice-pulse");
      void word.offsetWidth;
      word.classList.add("voice-word-pulse");
    }
    if (translation && hasLine) {
      translation.classList.remove("voice-meaning-glow");
      void translation.offsetWidth;
      translation.classList.add("voice-meaning-glow");
    }
  }

  function speakFallback(text) {
    if (!text || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.93;
      u.pitch = 1.02;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function playLine() {
    if (!isDictionary()) return;
    if (window.MEGANE_SELF_GLASS_IS_ACTIVE && window.MEGANE_SELF_GLASS_IS_ACTIVE()) return;

    const now = Date.now();
    if (now - lastPlayAt < 450) return;
    lastPlayAt = now;

    const line = getCurrentLine();
    pulse(!!line);
    if (!line) return;

    // 辞書の読み上げ音声は常に最優先。
    // 自分音声が鳴っていれば停止してからキャラ音声へ切り替える。
    try {
      if (window.MEGANE_SELF_VOICE && typeof window.MEGANE_SELF_VOICE.stopPlayback === "function") {
        window.MEGANE_SELF_VOICE.stopPlayback();
      } else if (window.MEGANE_SELF_VOICE && typeof window.MEGANE_SELF_VOICE.stop === "function") {
        window.MEGANE_SELF_VOICE.stop();
      }
    } catch (e) {}

    const folderMap = {
      gag: "zurea",
      math: "xeris",
      hacker: "nyx",
      happy: "quelina",
      communication: "seno",
      science: "radek",
      medical: "milca",
      economy: "neia"
    };

    const glassId = currentGlassIdSafe();
    const folder = folderMap[glassId] || glassId || "_misc";
    const path = `audio/${folder}/${line.id}.mp3`;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    audio.pause();
    audio.currentTime = 0;
    audio.src = path;

    audio.play().catch(function () {
      // MP3が存在しない/読めない時だけTTSに戻す
      speakFallback(line.text);
    });
  }

  function bindTapAudio() {
    const card = document.getElementById("card") || document.querySelector(".card");
    if (!card || card.dataset.cleanDictionaryAudioBound) return;
    card.dataset.cleanDictionaryAudioBound = "1";

    card.addEventListener("touchstart", function (e) {
      if (!isDictionary()) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      moved = false;
      longPressGuard = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function () {
        longPressGuard = true;
      }, 500);
    }, { passive: true });

    card.addEventListener("touchmove", function (e) {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      if (Math.abs(t.clientX - sx) > 14 || Math.abs(t.clientY - sy) > 14) {
        moved = true;
        clearTimeout(longPressTimer);
        longPressGuard = false;
      }
    }, { passive: true });

    card.addEventListener("touchend", function () {
      clearTimeout(longPressTimer);
      if (!isDictionary()) return;
      if (!moved && !longPressGuard) playLine();
      setTimeout(function () { longPressGuard = false; }, 120);
    }, { passive: true });

    card.addEventListener("click", function () {
      if (!isDictionary()) return;
      if (!moved && !longPressGuard) playLine();
    });
  }

  function bindDictionaryMiddleButton() {
    const btn = document.getElementById("randomWord");
    const dialog = document.getElementById("glassDialog");
    if (!btn || btn.dataset.cleanDictionaryMiddleBound) return;
    btn.dataset.cleanDictionaryMiddleBound = "1";

    btn.addEventListener("click", function (e) {
      if (!isDictionary()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    }, true);
  }

  function guardLongPressDialog() {
    const dialog = document.getElementById("glassDialog");
    if (!dialog || dialog.dataset.cleanLongPressGuardBound) return;
    dialog.dataset.cleanLongPressGuardBound = "1";

    const originalShowModal = dialog.showModal ? dialog.showModal.bind(dialog) : null;
    if (!originalShowModal) return;

    dialog.showModal = function () {
      if (isDictionary() && longPressGuard) return;
      return originalShowModal();
    };
  }

  function fixDictionaryLabel() {
    const btn = document.getElementById("randomWord");
    if (!btn) return;
    if (isDictionary()) btn.textContent = "メガネ一覧";
  }

  function hookRenderForDictionaryAudio() {
    if (typeof render !== "function" || render.cleanDictionaryAudioHooked) return;
    const originalRender = render;
    render = function () {
      const result = originalRender.apply(this, arguments);
      fixDictionaryLabel();
      return result;
    };
    render.cleanDictionaryAudioHooked = true;
  }

  window.MEGANE_CHARACTER_VOICE = {
    version: "v2-mutex",
    stop: function(){
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
      try {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      } catch (e) {}
    },
    isPlaying: function(){
      try { return !audio.paused && !audio.ended; } catch (e) { return false; }
    }
  };

  function boot() {
    bindTapAudio();
    bindDictionaryMiddleButton();
    guardLongPressDialog();
    hookRenderForDictionaryAudio();
    fixDictionaryLabel();
    setInterval(fixDictionaryLabel, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
