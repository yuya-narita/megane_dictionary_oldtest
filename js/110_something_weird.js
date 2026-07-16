/* 110_something_weird.js
   MEGANE DICTIONARY v1.014 — DICTIONARY VOICE MUTEX
   自分カードに、その端末だけの声を残す。
   - MediaRecorderで録音
   - IndexedDBへBlob保存
   - 自分カード表示中だけUIを生成
   - カードタップで再生
*/
(function(){
  "use strict";

  var DB_NAME = "megane_self_voice_v1";
  var DB_VERSION = 1;
  var STORE = "voices";
  var MAX_SECONDS = 60;

  var current = {
    word: "",
    wordKey: "",
    mounted: false,
    hasVoice: false,
    recording: false,
    playing: false,
    playingWordKey: "",
    recorder: null,
    stream: null,
    chunks: [],
    startedAt: 0,
    timer: 0,
    maxTimer: 0,
    audio: null,
    objectUrl: "",
    pressTimer: 0,
    longPressed: false,
    pointerStartX: 0,
    pointerStartY: 0,
    pointerMoved: false
  };

  function q(id){ return document.getElementById(id); }

  function toast(message){
    try{
      if(window.MEGANE_TOAST){
        window.MEGANE_TOAST(message);
        return;
      }
    }catch(_){}
    console.log("[SELF VOICE]", message);
  }

  function openDb(){
    return new Promise(function(resolve, reject){
      if(!window.indexedDB){
        reject(new Error("IndexedDB is not available"));
        return;
      }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function(){
        var db = request.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE, { keyPath:"wordKey" });
        }
      };
      request.onsuccess = function(){ resolve(request.result); };
      request.onerror = function(){ reject(request.error || new Error("IndexedDB open failed")); };
    });
  }

  async function dbGet(wordKey){
    var db = await openDb();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).get(wordKey);
      req.onsuccess = function(){ resolve(req.result || null); };
      req.onerror = function(){ reject(req.error); };
      tx.oncomplete = function(){ db.close(); };
    });
  }

  async function dbPut(record){
    var db = await openDb();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = function(){ db.close(); resolve(); };
      tx.onerror = function(){ db.close(); reject(tx.error); };
    });
  }

  async function dbDelete(wordKey){
    var db = await openDb();
    return new Promise(function(resolve, reject){
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(wordKey);
      tx.oncomplete = function(){ db.close(); resolve(); };
      tx.onerror = function(){ db.close(); reject(tx.error); };
    });
  }

  function ensureStyle(){
    if(q("selfVoiceStyleV101")) return;
    var style = document.createElement("style");
    style.id = "selfVoiceStyleV101";
    style.textContent = `
      .self-voice-btn{
        position:absolute;
        left:50%;
        bottom:58px;
        z-index:31;
        transform:translateX(-50%);
        min-width:112px;
        padding:8px 13px;
        border:1px solid rgba(255,255,255,.18);
        border-radius:999px;
        background:rgba(8,11,17,.78);
        color:rgba(255,255,255,.88);
        font-size:11px;
        font-weight:900;
        letter-spacing:.04em;
        white-space:nowrap;
        box-shadow:0 8px 24px rgba(0,0,0,.28);
        backdrop-filter:blur(9px);
        -webkit-backdrop-filter:blur(9px);
        touch-action:manipulation;
      }
      .self-voice-btn.saved{
        color:#bdefff;
        border-color:rgba(150,225,255,.42);
        background:rgba(10,30,40,.82);
      }
      .self-voice-btn.recording{
        color:#ffb9b9;
        border-color:rgba(255,105,105,.58);
        background:rgba(52,8,14,.88);
        box-shadow:0 0 0 1px rgba(255,80,80,.12) inset,0 8px 24px rgba(0,0,0,.28);
      }
      .self-voice-btn.playing{
        color:#ffe88a;
        border-color:rgba(255,232,138,.52);
        background:rgba(42,34,12,.86);
      }
      .self-voice-menu{
        position:fixed;
        inset:0;
        z-index:2147483300;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        padding:22px;
        background:rgba(0,0,0,.62);
      }
      .self-voice-menu-panel{
        width:min(390px,100%);
        padding:18px;
        border:1px solid rgba(255,255,255,.13);
        border-radius:22px;
        background:#111318;
        color:#fff;
        box-shadow:0 24px 80px rgba(0,0,0,.55);
      }
      .self-voice-menu-title{
        margin:0 0 12px;
        font-size:14px;
        font-weight:900;
        color:rgba(255,255,255,.76);
      }
      .self-voice-menu-actions{
        display:grid;
        gap:9px;
      }
      .self-voice-menu-actions button{
        min-height:48px;
        border:0;
        border-radius:15px;
        background:rgba(255,255,255,.08);
        color:#fff;
        font-weight:900;
      }
      .self-voice-menu-actions .danger{
        color:#ffb4b4;
      }
      .self-voice-menu-note{
        margin-top:12px;
        font-size:11px;
        line-height:1.6;
        color:rgba(255,255,255,.42);
      }
    `;
    document.head.appendChild(style);
  }

  function isSelfCardVisible(){
    var body = document.body;
    var dictionary = q("dictionaryMode");
    var glass = q("glassName");
    var character = q("character");
    return !!(
      current.mounted &&
      body &&
      body.classList.contains("self-glass-active") &&
      (!dictionary || dictionary.classList.contains("active")) &&
      glass &&
      String(glass.textContent || "").indexOf("自分メガネ") >= 0 &&
      character &&
      String(character.textContent || "").indexOf("自分の言葉で世界を見る視点") >= 0
    );
  }

  function formatTime(seconds){
    seconds = Math.max(0, Math.floor(seconds || 0));
    return String(Math.floor(seconds / 60)).padStart(2,"0") + ":" + String(seconds % 60).padStart(2,"0");
  }

  function stopOtherMedia(){
    document.querySelectorAll("audio,video").forEach(function(media){
      try{ media.pause(); }catch(_){}
    });
    try{
      if(current.audio) current.audio.pause();
    }catch(_){}
  }

  function revokeAudioUrl(){
    if(current.objectUrl){
      try{ URL.revokeObjectURL(current.objectUrl); }catch(_){}
      current.objectUrl = "";
    }
  }

  function clearRecordingTimers(){
    if(current.timer) clearInterval(current.timer);
    if(current.maxTimer) clearTimeout(current.maxTimer);
    current.timer = 0;
    current.maxTimer = 0;
  }

  function button(){
    return q("selfVoiceButton");
  }

  function renderButton(){
    var btn = button();
    if(!btn) return;

    btn.classList.toggle("saved", current.hasVoice && !current.recording && !current.playing);
    btn.classList.toggle("recording", current.recording);
    btn.classList.toggle("playing", current.playing);

    if(current.recording){
      var elapsed = (Date.now() - current.startedAt) / 1000;
      btn.textContent = "■ STOP  " + formatTime(elapsed);
      btn.title = "録音を停止して保存";
    }else if(current.playing){
      btn.textContent = "■ STOP";
      btn.title = "再生を停止";
    }else if(current.hasVoice){
      btn.textContent = "▶ VOICE";
      btn.title = "再生／長押しで録り直し・削除";
    }else{
      btn.textContent = "● REC";
      btn.title = "自分の声を録音";
    }
  }

  function preferredMime(){
    if(!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") return "";
    var types = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];
    for(var i=0;i<types.length;i++){
      if(MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "";
  }

  async function refreshVoiceState(){
    if(!current.wordKey) return;
    try{
      var record = await dbGet(current.wordKey);
      if(!current.mounted) return;
      current.hasVoice = !!(record && record.blob && record.blob.size);
    }catch(error){
      console.warn("[SELF VOICE] state read failed", error);
      current.hasVoice = false;
    }
    renderButton();
  }

  async function startRecording(){
    if(!isSelfCardVisible() || current.recording) return;

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
      alert("このブラウザでは音声録音を利用できません。");
      return;
    }

    stopPlayback();
    // 録音時だけは、マイクへの混入防止のため背景音を停止する。
    stopOtherMedia();

    try{
      var stream = await navigator.mediaDevices.getUserMedia({
        audio:{
          echoCancellation:true,
          noiseSuppression:true,
          autoGainControl:true
        }
      });

      if(!isSelfCardVisible()){
        stream.getTracks().forEach(function(track){ track.stop(); });
        return;
      }

      var mime = preferredMime();
      var options = mime ? { mimeType:mime } : undefined;
      var recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);

      current.stream = stream;
      current.recorder = recorder;
      current.chunks = [];
      current.recording = true;
      current.startedAt = Date.now();

      recorder.ondataavailable = function(event){
        if(event.data && event.data.size) current.chunks.push(event.data);
      };

      recorder.onerror = function(event){
        console.warn("[SELF VOICE] recorder error", event.error || event);
        finishRecording(false);
      };

      recorder.onstop = function(){
        finishRecording(true);
      };

      recorder.start(250);
      renderButton();

      current.timer = setInterval(renderButton, 250);
      current.maxTimer = setTimeout(function(){
        if(current.recording) stopRecording();
      }, MAX_SECONDS * 1000);

      toast("録音を開始しました。最大60秒です。");
    }catch(error){
      console.warn("[SELF VOICE] microphone denied or failed", error);
      alert("マイクを使用できませんでした。\nブラウザのマイク許可を確認してください。");
    }
  }

  function stopRecording(){
    if(!current.recording || !current.recorder) return;
    try{
      if(current.recorder.state !== "inactive") current.recorder.stop();
    }catch(_){
      finishRecording(false);
    }
  }

  async function finishRecording(save){
    var recorder = current.recorder;
    var stream = current.stream;
    var chunks = current.chunks.slice();
    var word = current.word;
    var wordKey = current.wordKey;
    var durationMs = Math.max(0, Date.now() - current.startedAt);

    clearRecordingTimers();
    current.recording = false;
    current.recorder = null;
    current.stream = null;
    current.chunks = [];
    current.startedAt = 0;

    if(stream){
      stream.getTracks().forEach(function(track){
        try{ track.stop(); }catch(_){}
      });
    }

    if(save && chunks.length && wordKey){
      try{
        var type = (recorder && recorder.mimeType) || (chunks[0] && chunks[0].type) || "audio/webm";
        var blob = new Blob(chunks, { type:type });
        if(blob.size > 0){
          await dbPut({
            wordKey:wordKey,
            word:word,
            blob:blob,
            mimeType:type,
            durationMs:durationMs,
            savedAt:new Date().toISOString()
          });
          current.hasVoice = true;
          toast("この端末に声を残しました。");
        }
      }catch(error){
        console.error("[SELF VOICE] save failed", error);
        alert("録音の保存に失敗しました。");
      }
    }

    renderButton();
  }

  async function playVoice(){
    if(!current.wordKey || current.recording) return;

    var requestedWordKey = current.wordKey;

    // 同じ自分音声をもう一度押した時だけ停止。
    // 別の自分カードなら、前の音声を止めてそのまま新しい音声を再生する。
    if(current.playing && current.playingWordKey === requestedWordKey){
      stopPlayback();
      return;
    }
    if(current.playing){
      stopPlayback();
    }

    try{
      // 自分音声も辞書音声枠。キャラ音声/TTSを止めてから再生する。
      try{
        if(window.MEGANE_CHARACTER_VOICE && typeof window.MEGANE_CHARACTER_VOICE.stop === "function"){
          window.MEGANE_CHARACTER_VOICE.stop();
        }
      }catch(_){}
      try{
        if("speechSynthesis" in window) window.speechSynthesis.cancel();
      }catch(_){}

      var record = await dbGet(requestedWordKey);
      if(!record || !record.blob){
        current.hasVoice = false;
        renderButton();
        return;
      }

      // 再生時は音楽・Conferenceを止めない。
      // 自分音声を前景音としてBGMへ重ねる。
      revokeAudioUrl();

      current.objectUrl = URL.createObjectURL(record.blob);
      current.audio = new Audio(current.objectUrl);
      current.playing = true;
      current.playingWordKey = requestedWordKey;
      renderButton();

      current.audio.onended = stopPlayback;
      current.audio.onerror = function(){
        stopPlayback();
        alert("録音音声を再生できませんでした。");
      };

      var promise = current.audio.play();
      if(promise && promise.catch){
        promise.catch(function(error){
          console.warn("[SELF VOICE] play failed", error);
          stopPlayback();
        });
      }
    }catch(error){
      console.error("[SELF VOICE] read failed", error);
    }
  }

  function stopPlayback(){
    if(current.audio){
      try{
        current.audio.pause();
        current.audio.currentTime = 0;
      }catch(_){}
      current.audio.onended = null;
      current.audio.onerror = null;
      current.audio = null;
    }
    current.playing = false;
    current.playingWordKey = "";
    revokeAudioUrl();
    renderButton();
  }

  async function deleteVoice(){
    if(!current.wordKey) return;
    try{
      stopPlayback();
      await dbDelete(current.wordKey);
      current.hasVoice = false;
      renderButton();
      toast("録音を削除しました。");
    }catch(error){
      console.error("[SELF VOICE] delete failed", error);
      alert("録音を削除できませんでした。");
    }
  }

  function closeMenu(){
    var menu = q("selfVoiceMenu");
    if(menu) menu.remove();
  }

  function openVoiceMenu(){
    if(!current.hasVoice || current.recording) return;
    closeMenu();

    var overlay = document.createElement("div");
    overlay.id = "selfVoiceMenu";
    overlay.className = "self-voice-menu";
    overlay.innerHTML = `
      <div class="self-voice-menu-panel">
        <div class="self-voice-menu-title">【${String(current.word || "")}】の声</div>
        <div class="self-voice-menu-actions">
          <button type="button" id="selfVoiceMenuRerecord">● 録り直す</button>
          <button type="button" id="selfVoiceMenuDelete" class="danger">録音を削除</button>
          <button type="button" id="selfVoiceMenuClose">閉じる</button>
        </div>
        <div class="self-voice-menu-note">録音はこの端末のブラウザ内だけに保存されます。ブラウザデータを消すと録音も消えます。</div>
      </div>
    `;
    document.body.appendChild(overlay);

    q("selfVoiceMenuRerecord").onclick = function(){
      closeMenu();
      startRecording();
    };
    q("selfVoiceMenuDelete").onclick = async function(){
      if(!confirm("この単語の録音を削除しますか？")) return;
      closeMenu();
      await deleteVoice();
    };
    q("selfVoiceMenuClose").onclick = closeMenu;
    overlay.addEventListener("click", function(event){
      if(event.target === overlay) closeMenu();
    });
  }

  function createButton(){
    removeButton();
    if(!isSelfCardVisible()) return;

    ensureStyle();

    var card = q("card");
    if(!card) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "selfVoiceButton";
    btn.className = "self-voice-btn";

    btn.addEventListener("pointerdown", function(event){
      event.preventDefault();
      event.stopPropagation();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();

      current.longPressed = false;
      current.pressTimer = setTimeout(function(){
        current.longPressed = true;
        if(current.hasVoice) openVoiceMenu();
      }, 650);
    }, true);

    btn.addEventListener("pointerup", function(event){
      event.preventDefault();
      event.stopPropagation();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      if(current.pressTimer) clearTimeout(current.pressTimer);
      current.pressTimer = 0;

      if(current.longPressed){
        current.longPressed = false;
        return;
      }

      if(current.recording) stopRecording();
      else if(current.hasVoice) playVoice();
      else startRecording();
    }, true);

    btn.addEventListener("pointercancel", function(){
      if(current.pressTimer) clearTimeout(current.pressTimer);
      current.pressTimer = 0;
      current.longPressed = false;
    }, true);

    btn.addEventListener("contextmenu", function(event){
      event.preventDefault();
      if(current.hasVoice) openVoiceMenu();
    });

    card.appendChild(btn);
    renderButton();
    refreshVoiceState();
  }

  function removeButton(){
    var btn = button();
    if(btn) btn.remove();
    if(current.pressTimer) clearTimeout(current.pressTimer);
    current.pressTimer = 0;
    current.longPressed = false;
    closeMenu();
  }

  function mount(detail){
    if(!detail || !detail.word) return;

    var nextWordKey = String(detail.wordKey || encodeURIComponent(detail.word));
    var changed = current.wordKey && current.wordKey !== nextWordKey;

    if(changed && current.recording){
      stopRecording();
    }

    // 再生中の自分音声は、別カードへ移動しても継続する。
    current.word = String(detail.word);
    current.wordKey = nextWordKey;
    current.mounted = true;
    current.hasVoice = false;

    setTimeout(createButton, 0);
  }

  function unmount(){
    current.mounted = false;
    if(current.recording) stopRecording();
    // キャラ音声と同様、カード移動だけでは再生を止めない。
    removeButton();
    current.word = "";
    current.wordKey = "";
    current.hasVoice = false;
  }

  function bindCardTap(){
    var card = q("card");
    if(!card || card.dataset.selfVoiceTapBound === "1") return;
    card.dataset.selfVoiceTapBound = "1";

    card.addEventListener("pointerdown", function(event){
      current.pointerStartX = event.clientX || 0;
      current.pointerStartY = event.clientY || 0;
      current.pointerMoved = false;
    }, true);

    card.addEventListener("pointermove", function(event){
      var dx = (event.clientX || 0) - current.pointerStartX;
      var dy = (event.clientY || 0) - current.pointerStartY;
      if(Math.max(Math.abs(dx), Math.abs(dy)) > 12) current.pointerMoved = true;
    }, true);

    card.addEventListener("click", function(event){
      if(!isSelfCardVisible() || !current.hasVoice || current.recording || current.pointerMoved) return;
      if(event.target && event.target.closest && event.target.closest("button,a,input,textarea,select")) return;

      event.preventDefault();
      event.stopPropagation();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      playVoice();
    }, true);
  }

  function boot(){
    ensureStyle();
    bindCardTap();

    window.addEventListener("megane:self-card-rendered", function(event){
      mount(event.detail || {});
    });

    window.addEventListener("megane:self-card-cleared", unmount);

    ["cardMode","musicMode","mangaMode"].forEach(function(id){
      var tab = q(id);
      if(!tab) return;
      tab.addEventListener("pointerdown", unmount, true);
    });

    document.addEventListener("visibilitychange", function(){
      if(document.hidden){
        if(current.recording) stopRecording();
        stopPlayback();
      }
    });

    // 110が61より後に読み込まれた場合の初回復旧。
    setTimeout(function(){
      var body = document.body;
      var glass = q("glassName");
      var word = q("word");
      if(body && body.classList.contains("self-glass-active") && glass && word){
        mount({
          word:String(word.textContent || "").trim(),
          wordKey:encodeURIComponent(String(word.textContent || "").trim())
        });
      }
    }, 180);

    window.MEGANE_SELF_VOICE = {
      version:"v1.014",
      play:playVoice,
      stopPlayback:stopPlayback,
      stop:function(){
        if(current.recording) stopRecording();
        stopPlayback();
      },
      remove:deleteVoice,
      refresh:refreshVoiceState
    };
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();