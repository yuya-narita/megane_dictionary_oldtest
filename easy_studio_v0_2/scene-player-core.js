/*
 * Scene Player Core v1.6.0
 * Runtime for Scene Format v1.0
 * No splitter / studio authoring logic lives here.
 */
(function (global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    autoDelay: 2600,
    transitionMs: 420,
    maxStackVisible: 8,
    startAt: 0,
    showHeader: true,
    showFooter: true,
    allowPrevious: true,
    keyboard: true,
    swipe: true,
    swipeThreshold: 44,
    endOnNextAction: true
  });

  const THEMES = new Set(['light', 'dark', 'cinema']);
  const TYPES = new Set(['text', 'dialogue', 'sound']);

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function asNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function emit(host, name, detail) {
    host.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function assertSceneDocument(doc) {
    if (!doc || typeof doc !== 'object') throw new TypeError('Scene document must be an object.');
    if (doc.format !== 'scene-format') throw new Error('Unsupported document: format must be "scene-format".');
    if (doc.version !== '1.0') throw new Error(`Unsupported Scene Format version: ${doc.version ?? '(missing)'}`);
    if (!THEMES.has(doc.theme)) throw new Error(`Unsupported theme: ${doc.theme}`);
    if (!Array.isArray(doc.scenes) || doc.scenes.length === 0) throw new Error('Scene document must contain at least one scene.');

    const ids = new Set();
    doc.scenes.forEach((scene, index) => {
      if (!scene || typeof scene !== 'object') throw new Error(`Scene ${index + 1} must be an object.`);
      if (!scene.id || typeof scene.id !== 'string') throw new Error(`Scene ${index + 1} is missing a stable id.`);
      if (ids.has(scene.id)) throw new Error(`Duplicate scene id: ${scene.id}`);
      ids.add(scene.id);
      if (!TYPES.has(scene.type)) throw new Error(`Unsupported scene type at ${scene.id}: ${scene.type}`);
      if ((scene.type === 'text' || scene.type === 'dialogue') && typeof scene.text !== 'string') {
        throw new Error(`Scene ${scene.id} requires text.`);
      }
    });
    return doc;
  }

  class ScenePlayerCore {
    constructor(host, options = {}) {
      if (typeof host === 'string') host = document.querySelector(host);
      if (!(host instanceof HTMLElement)) throw new TypeError('ScenePlayerCore requires a host HTMLElement.');

      this.host = host;
      this.options = { ...DEFAULTS, ...options };
      this.document = null;
      this.index = -1;
      this.auto = false;
      this.ended = false;
      this.autoTimer = null;
      this.touchStartY = null;
      this.touchStartX = null;
      this.suppressNextClick = false;
      this.maxVisitedIndex = -1;
      this.historyOpen = false;
      this.historyScrollRaf = 0;
      this.destroyed = false;
      this._bound = [];
      this.presentationTimers = [];
      this.typingState = null;
      this.backgroundState = null;
      this.backgroundLayerIndex = 0;
      this.backgroundTimers = [];
      this.audioUnlocked = false;
      // AudioContext unlock and story playback are separate states.
      // A restarted story must wait for the reader's next stage gesture even
      // when the AudioContext itself is already unlocked.
      this.audioPlaybackArmed = false;
      this.audioPending = [];
      this.audioContext = null;
      this.audioGainNodes = new Map();
      this.audioSourceNodes = new Map();
      this.audioTimers = [];
      this.audioFadeFrames = new Map();
      this.audioState = { bgm: null, ambient: null };
      this.audioEls = {
        bgm: this._createAudioElement('bgm'),
        ambient: this._createAudioElement('ambient')
      };
      this.oneshots = new Set();
      this._audioRenderMode = 'restore';

      this._buildShell();
      this._bindControls();
    }

    _buildShell() {
      this.host.classList.add('sp-core');
      this.host.innerHTML = `
        <div class="sp-background" aria-hidden="true">
          <div class="sp-bg-layer sp-bg-a"></div>
          <div class="sp-bg-layer sp-bg-b"></div>
        </div>
        <div class="sp-bg-textures" aria-hidden="true"></div>
        <div class="sp-bg-flash" aria-hidden="true"></div>
        <div class="sp-veil" aria-hidden="true"></div>
        <header class="sp-header">
          <button class="sp-button sp-prev" type="button" aria-label="Previous scene">‹</button>
          <div class="sp-meta">
            <span class="sp-author"></span>
            <strong class="sp-title"></strong>
          </div>
          <button class="sp-button sp-restart" type="button" aria-label="Restart">↺</button>
        </header>
        <main class="sp-stage" tabindex="0" aria-live="polite">
          <div class="sp-scenes"></div>
          <span class="sp-tap-hint">TAP</span>
        </main>
        <section class="sp-history" hidden aria-label="Past scenes">
          <div class="sp-history-top">
            <span class="sp-history-kicker">PAST</span>
            <span class="sp-history-help">過去Sceneをスクロール</span>
            <button class="sp-history-close" type="button" aria-label="Close history">×</button>
          </div>
          <div class="sp-history-scroll">
            <div class="sp-history-list"></div>
          </div>
        </section>
        <footer class="sp-footer">
          <div class="sp-progress-label"><span class="sp-progress-current">0</span><span> / </span><span class="sp-progress-total">0</span></div>
          <div class="sp-progress-track" aria-hidden="true"><div class="sp-progress-bar"></div></div>
          <button class="sp-auto" type="button" aria-pressed="false">AUTO</button>
        </footer>
        <section class="sp-ending" hidden>
          <div class="sp-ending-copy">
            <span class="sp-ending-kicker">END</span>
            <strong class="sp-ending-title">読了</strong>
            <p class="sp-ending-text">最後まで読みました。</p>
          </div>
          <button class="sp-ending-restart" type="button">最初から読む</button>
        </section>
      `;

      const q = (s) => this.host.querySelector(s);
      this.els = {
        background: q('.sp-background'),
        bgA: q('.sp-bg-a'),
        bgB: q('.sp-bg-b'),
        bgTextures: q('.sp-bg-textures'),
        bgFlash: q('.sp-bg-flash'),
        veil: q('.sp-veil'),
        header: q('.sp-header'),
        footer: q('.sp-footer'),
        stage: q('.sp-stage'),
        scenes: q('.sp-scenes'),
        history: q('.sp-history'),
        historyScroll: q('.sp-history-scroll'),
        historyList: q('.sp-history-list'),
        historyClose: q('.sp-history-close'),
        title: q('.sp-title'),
        author: q('.sp-author'),
        prev: q('.sp-prev'),
        restart: q('.sp-restart'),
        auto: q('.sp-auto'),
        current: q('.sp-progress-current'),
        total: q('.sp-progress-total'),
        bar: q('.sp-progress-bar'),
        ending: q('.sp-ending'),
        endingTitle: q('.sp-ending-title'),
        endingRestart: q('.sp-ending-restart')
      };

      this.host.classList.toggle('sp-no-header', !this.options.showHeader);
      this.host.classList.toggle('sp-no-footer', !this.options.showFooter);
      this.els.prev.hidden = !this.options.allowPrevious;
    }

    _on(el, event, fn, options) {
      el.addEventListener(event, fn, options);
      this._bound.push([el, event, fn, options]);
    }


    _bindControls() {
      // iOS/WebKit: the reading gesture unlocks Web Audio and arms playback.
      const armFromStageGesture = () => this.unlockAudio(true);
      if ('PointerEvent' in global) this._on(this.els.stage, 'pointerdown', armFromStageGesture, { passive: true });
      else this._on(this.els.stage, 'touchstart', armFromStageGesture, { passive: true });

      // Previous is no longer a one-scene step. It opens the continuous History Scroll.
      this._on(this.els.prev, 'click', (e) => {
        e.stopPropagation();
        this.openHistory();
      });
      this._on(this.els.restart, 'click', (e) => { e.stopPropagation(); this.restart(); });
      this._on(this.els.endingRestart, 'click', () => this.restart());
      this._on(this.els.auto, 'click', (e) => {
        e.stopPropagation();
        this.unlockAudio(true);
        this.toggleAuto();
      });

      this._on(this.els.historyClose, 'click', (e) => {
        e.stopPropagation();
        this.closeHistory();
      });
      this._on(this.els.historyList, 'click', (e) => {
        const item = e.target.closest('.sp-history-item');
        if (!item) return;
        const nextIndex = Number(item.dataset.index);
        if (!Number.isInteger(nextIndex)) return;
        this.closeHistory({ keepVisualState: true });
        this.goToVisited(nextIndex);
      });
      this._on(this.els.historyScroll, 'scroll', () => this._scheduleHistoryDepth(), { passive: true });

      this._on(this.els.stage, 'click', (e) => {
        if (e.target.closest('button')) return;
        if (this.suppressNextClick) {
          this.suppressNextClick = false;
          return;
        }
        this.next();
      });

      if (this.options.keyboard) {
        this._on(this.els.stage, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            this.unlockAudio(true);
            this.next();
          } else if (this.options.allowPrevious && (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace')) {
            e.preventDefault();
            this.openHistory();
          }
        });
      }

      // Desktop/trackpad: scrolling upward opens History. Downward scrolling keeps
      // the future discrete, so it never reveals an unread Scene.
      this._on(this.els.stage, 'wheel', (e) => {
        if (!this.options.allowPrevious || this.historyOpen) return;
        if (e.deltaY < -8) {
          e.preventDefault();
          this.openHistory({ wheelDelta: e.deltaY });
        }
      }, { passive: false });

      if (this.options.swipe) {
        this._on(this.els.stage, 'touchstart', (e) => {
          const t = e.changedTouches[0];
          this.touchStartY = t.clientY;
          this.touchStartX = t.clientX;
        }, { passive: true });

        this._on(this.els.stage, 'touchmove', (e) => {
          // Keep the page itself fixed. History has its own native momentum scroller.
          if (e.cancelable) e.preventDefault();
        }, { passive: false });

        this._on(this.els.stage, 'touchend', (e) => {
          if (this.touchStartY == null || this.touchStartX == null) return;
          const t = e.changedTouches[0];
          const dy = t.clientY - this.touchStartY;
          const dx = t.clientX - this.touchStartX;
          this.touchStartY = null;
          this.touchStartX = null;

          if (Math.max(Math.abs(dx), Math.abs(dy)) < this.options.swipeThreshold) return;
          this.suppressNextClick = true;

          // Pulling down/right enters History Scroll. Pushing up/left still advances
          // only one unread Scene at a time.
          if (Math.abs(dy) >= Math.abs(dx)) {
            if (dy > 0 && this.options.allowPrevious) this.openHistory({ dragDistance: dy });
            else if (dy < 0) this.next();
          } else {
            if (dx > 0 && this.options.allowPrevious) this.openHistory({ dragDistance: dx });
            else this.next();
          }
        }, { passive: true });
      }
    }

    _createAudioElement(channel) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.dataset.scenePlayerChannel = channel;
      audio.playsInline = true;
      audio.addEventListener('error', () => {
        emit(this.host, 'sceneplayer:audioerror', {
          channel,
          src: audio.currentSrc || audio.src || '',
          error: audio.error || null
        });
      });
      audio.addEventListener('timeupdate', () => {
        const state = this.audioState[channel];
        if (!state || state.stopAt == null) return;
        if (audio.currentTime >= state.stopAt) this._stopPersistentChannel(channel, state.fadeOut || 0);
      });
      return audio;
    }

    _ensureAudioContext() {
      if (this.audioContext) return this.audioContext;
      const AudioContextClass = global.AudioContext || global.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        this.audioContext = new AudioContextClass();
      } catch (_) {
        this.audioContext = null;
      }
      return this.audioContext;
    }

    _ensureAudioNode(audio) {
      if (!audio) return null;
      if (this.audioGainNodes.has(audio)) return this.audioGainNodes.get(audio);
      const ctx = this._ensureAudioContext();
      // Important on first iPhone playback: do not route a media element into
      // a suspended AudioContext. WebKit can report media playback as active
      // while the graph is still silent. Let the media element start first,
      // then attach it once the context is actually running.
      if (!ctx || ctx.state !== 'running') return null;
      try {
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        gain.gain.value = Number.isFinite(audio.__spGainValue) ? audio.__spGainValue : 1;
        source.connect(gain);
        gain.connect(ctx.destination);
        this.audioSourceNodes.set(audio, source);
        this.audioGainNodes.set(audio, gain);
        // Once routed through Web Audio, leave HTMLMediaElement volume at unity.
        // GainNode becomes the single source of truth for volume/fades.
        try { audio.volume = 1; } catch (_) {}
        return gain;
      } catch (error) {
        emit(this.host, 'sceneplayer:audiographerror', { error });
        return null;
      }
    }

    _setAudioVolume(audio, value) {
      const target = clamp(asNumber(value, 1), 0, 1);
      audio.__spGainValue = target;
      const gain = this._ensureAudioNode(audio);
      if (gain && this.audioContext) {
        try { gain.gain.setValueAtTime(target, this.audioContext.currentTime); } catch (_) { gain.gain.value = target; }
      } else {
        // Desktop fallback only. iOS may ignore element.volume, but the stored
        // gain value is applied immediately after the Web Audio graph attaches.
        try { audio.volume = target; } catch (_) {}
      }
    }

    _getAudioVolume(audio) {
      if (Number.isFinite(audio?.__spGainValue)) return audio.__spGainValue;
      return clamp(asNumber(audio?.volume, 1), 0, 1);
    }

    _primeAudioContext(ctx) {
      if (!ctx) return;
      try {
        // iOS/WebKit can report a resumed context while the output path is not
        // yet producing audio. Starting a one-sample silent buffer inside the
        // same user gesture explicitly primes the Web Audio render path.
        const buffer = ctx.createBuffer(1, 1, Math.max(8000, ctx.sampleRate || 44100));
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (_) {}
    }

    _flushPendingAudio() {
      if (!this.audioUnlocked || !this.audioPlaybackArmed) return;
      const pending = this.audioPending.splice(0);
      pending.forEach((fn) => {
        try { fn(); } catch (_) {}
      });
    }

    unlockAudio(armPlayback = false) {
      const ctx = this._ensureAudioContext();
      this.audioUnlocked = true;
      if (armPlayback) this.audioPlaybackArmed = true;

      // Keep the call to resume inside the trusted reading gesture, but do not
      // pre-connect media elements while the context is suspended.
      this._primeAudioContext(ctx);
      if (ctx && ctx.state === 'suspended') {
        try {
          const resumed = ctx.resume();
          if (resumed && typeof resumed.then === 'function') {
            resumed.then(() => {
              // Any media that started directly during the gesture is routed
              // through GainNode only after Web Audio is genuinely running.
              Object.values(this.audioEls || {}).forEach((audio) => {
                const gain = this._ensureAudioNode(audio);
                if (gain) this._setAudioVolume(audio, this._getAudioVolume(audio));
                try { audio.muted = false; } catch (_) {}
              });
            }).catch(() => {});
          }
        } catch (_) {}
      }

      // Flush now so HTMLMediaElement.play() itself is still called from the
      // user's gesture. _safePlay handles delayed graph attachment.
      this._flushPendingAudio();

      emit(this.host, 'sceneplayer:audiounlock', {
        webAudio: !!ctx,
        armed: this.audioPlaybackArmed,
        contextState: ctx?.state || 'unavailable'
      });
      return true;
    }

    _queueAudio(fn) {
      if (this.audioUnlocked && this.audioPlaybackArmed) return fn();
      this.audioPending.push(fn);
      emit(this.host, 'sceneplayer:audiopending', { count: this.audioPending.length });
      return false;
    }

    _clearAudioTimers() {
      this.audioTimers.forEach((timer) => clearTimeout(timer));
      this.audioTimers.length = 0;
      this.audioFadeFrames.forEach((frame) => cancelAnimationFrame(frame));
      this.audioFadeFrames.clear();
    }

    _audioTimeout(fn, delay) {
      const timer = setTimeout(() => {
        const i = this.audioTimers.indexOf(timer);
        if (i >= 0) this.audioTimers.splice(i, 1);
        fn();
      }, Math.max(0, delay));
      this.audioTimers.push(timer);
      return timer;
    }

    _fadeVolume(audio, target, duration, key, done) {
      target = clamp(asNumber(target, this._getAudioVolume(audio)), 0, 1);
      duration = Math.max(0, asNumber(duration, 0));
      const previous = this.audioFadeFrames.get(key);
      if (previous) cancelAnimationFrame(previous);

      const gain = this._ensureAudioNode(audio);
      const ctx = this.audioContext;
      const from = this._getAudioVolume(audio);
      audio.__spGainValue = target;

      // Web Audio path: reliable gain automation on iOS/WebKit.
      if (gain && ctx) {
        try {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(from, now);
          if (!duration) {
            gain.gain.setValueAtTime(target, now);
            if (done) done();
          } else {
            gain.gain.linearRampToValueAtTime(target, now + duration / 1000);
            this._audioTimeout(() => { if (done) done(); }, duration);
          }
          return;
        } catch (_) {
          // Fall through to HTMLMediaElement/rAF fallback.
        }
      }

      if (!duration) {
        try { audio.volume = target; } catch (_) {}
        this.audioFadeFrames.delete(key);
        if (done) done();
        return;
      }
      const start = performance.now();
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const value = from + (target - from) * t;
        try { audio.volume = value; } catch (_) {}
        if (t < 1) this.audioFadeFrames.set(key, requestAnimationFrame(step));
        else {
          this.audioFadeFrames.delete(key);
          if (done) done();
        }
      };
      this.audioFadeFrames.set(key, requestAnimationFrame(step));
    }

    _safePlay(audio, detail, onStarted) {
      const play = () => {
        const ctx = this._ensureAudioContext();
        let startedCallbackDone = false;
        const finishStart = () => {
          if (startedCallbackDone) return;
          startedCallbackDone = true;
          const attach = () => {
            const gain = this._ensureAudioNode(audio);
            if (gain) this._setAudioVolume(audio, this._getAudioVolume(audio));
            try { audio.muted = false; } catch (_) {}
            if (onStarted) onStarted();
          };
          if (!ctx || ctx.state === 'running') attach();
          else {
            try {
              const r = ctx.resume();
              if (r && typeof r.then === 'function') r.then(attach).catch(attach);
              else attach();
            } catch (_) { attach(); }
          }
        };

        // On first iPhone playback, call media.play() before connecting the
        // element to a suspended Web Audio graph. This preserves the trusted
        // user activation that WebKit requires for media start.
        if (ctx && ctx.state !== 'running' && !this.audioGainNodes.has(audio)) {
          try { audio.muted = true; } catch (_) {}
        }
        let promise;
        try { promise = audio.play(); }
        catch (error) {
          this.audioPlaybackArmed = false;
          this.audioPending.push(() => this._safePlay(audio, detail, onStarted));
          emit(this.host, 'sceneplayer:audioblocked', { ...detail, error });
          return;
        }
        if (promise && typeof promise.then === 'function') {
          promise.then(finishStart).catch((error) => {
            this.audioPlaybackArmed = false;
            this.audioPending.push(() => this._safePlay(audio, detail, onStarted));
            emit(this.host, 'sceneplayer:audioblocked', { ...detail, error });
          });
        } else finishStart();
      };
      this._queueAudio(play);
    }

    _stopPersistentChannel(channel, fadeOut = 0) {
      const audio = this.audioEls[channel];
      if (!audio) return;
      const finish = () => {
        audio.pause();
        try { audio.currentTime = 0; } catch (_) {}
        this.audioState[channel] = null;
        emit(this.host, 'sceneplayer:audiostop', { channel });
      };
      if (fadeOut > 0 && !audio.paused) this._fadeVolume(audio, 0, fadeOut, channel, finish);
      else finish();
    }

    _startPersistentChannel(channel, command, reconstruct = false) {
      const audio = this.audioEls[channel];
      if (!audio || !command.src) return;
      const sameSrc = this.audioState[channel]?.src === command.src;
      // History reconstruction should not rewind a BGM/Ambient that is already
      // the correct persistent source. Forward Scene commands can still request restart.
      const shouldSeek = !sameSrc || (!reconstruct && command.restart === true);
      const targetVolume = clamp(asNumber(command.volume, 1), 0, 1);
      const startAt = Math.max(0, asNumber(command.startAt, 0));

      if (!sameSrc) audio.src = command.src;
      audio.loop = command.loop !== false;
      if (shouldSeek) {
        try { audio.currentTime = startAt; } catch (_) {
          audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = startAt; } catch (_) {} }, { once: true });
        }
      }
      const fadeIn = reconstruct ? 0 : Math.max(0, asNumber(command.fadeIn, 0));
      this._setAudioVolume(audio, fadeIn > 0 ? 0 : targetVolume);
      this.audioState[channel] = {
        src: command.src,
        volume: targetVolume,
        loop: command.loop !== false,
        startAt,
        stopAt: command.stopAt == null ? null : Math.max(0, asNumber(command.stopAt, 0)),
        fadeOut: Math.max(0, asNumber(command.fadeOut, 0))
      };
      this._safePlay(audio, { channel, action: 'start', src: command.src }, () => {
        if (fadeIn > 0) this._fadeVolume(audio, targetVolume, fadeIn, channel);
        const stopAfter = Math.max(0, asNumber(command.stopAfter, 0));
        if (stopAfter > 0) this._audioTimeout(() => this._stopPersistentChannel(channel, command.fadeOut || 0), stopAfter);
      });
      emit(this.host, 'sceneplayer:audiostart', { channel, command, reconstruct });
    }

    _volumePersistentChannel(channel, command) {
      const audio = this.audioEls[channel];
      if (!audio || !this.audioState[channel]) return;
      const target = clamp(asNumber(command.volume, this.audioState[channel].volume), 0, 1);
      this.audioState[channel].volume = target;
      this._fadeVolume(audio, target, Math.max(0, asNumber(command.fade, 0)), channel);
      emit(this.host, 'sceneplayer:audiovolume', { channel, volume: target });
    }

    _duckPersistentChannel(channel, command) {
      const audio = this.audioEls[channel];
      const state = this.audioState[channel];
      if (!audio || !state) return;
      const restore = state.volume;
      const target = clamp(asNumber(command.volume, 0.22), 0, 1);
      const fade = Math.max(0, asNumber(command.fade, 250));
      const hold = Math.max(0, asNumber(command.hold, 1200));
      this._fadeVolume(audio, target, fade, channel);
      this._audioTimeout(() => this._fadeVolume(audio, restore, fade, channel), fade + hold);
      emit(this.host, 'sceneplayer:audioduck', { channel, volume: target, hold });
    }

    _playOneShot(command) {
      if (!command.src) return;
      const audio = new Audio(command.src);
      audio.preload = 'auto';
      audio.playsInline = true;
      audio.loop = command.loop === true;
      const targetVolume = clamp(asNumber(command.volume, 1), 0, 1);
      const fadeIn = Math.max(0, asNumber(command.fadeIn, 0));
      this._setAudioVolume(audio, fadeIn > 0 ? 0 : targetVolume);
      const startAt = Math.max(0, asNumber(command.startAt, 0));
      if (startAt > 0) {
        audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = startAt; } catch (_) {} }, { once: true });
      }
      const cleanup = () => {
        this.oneshots.delete(audio);
        audio.removeEventListener('ended', cleanup);
      };
      audio.addEventListener('ended', cleanup);
      this.oneshots.add(audio);
      const fadeKey = `oneshot:${Date.now()}:${Math.random()}`;
      this._safePlay(audio, { channel: 'oneshot', role: command.role || 'se', action: 'play', src: command.src }, () => {
        if (fadeIn > 0) this._fadeVolume(audio, targetVolume, fadeIn, fadeKey);
        const stopAfter = Math.max(0, asNumber(command.stopAfter, 0));
        if (stopAfter > 0) this._audioTimeout(() => { audio.pause(); cleanup(); }, stopAfter);
      });
      if (command.stopAt != null) {
        const stopAt = Math.max(0, asNumber(command.stopAt, 0));
        const onTime = () => {
          if (audio.currentTime >= stopAt) { audio.pause(); audio.removeEventListener('timeupdate', onTime); cleanup(); }
        };
        audio.addEventListener('timeupdate', onTime);
      }
      emit(this.host, 'sceneplayer:oneshot', { command });
    }

    _applyAudioCommand(command, reconstruct = false) {
      if (!command || typeof command !== 'object') return;
      const channel = command.channel;
      const action = command.action;
      if (channel === 'oneshot') {
        // One-shots represent an event, so history reconstruction never replays them.
        if (!reconstruct && (action === 'play' || action === 'start')) this._playOneShot(command);
        return;
      }
      if (!(channel === 'bgm' || channel === 'ambient')) return;
      if (action === 'start' || action === 'play') this._startPersistentChannel(channel, command, reconstruct);
      else if (action === 'stop') this._stopPersistentChannel(channel, reconstruct ? 0 : Math.max(0, asNumber(command.fadeOut ?? command.fade, 0)));
      else if (action === 'volume') this._volumePersistentChannel(channel, command);
      else if (action === 'duck' && !reconstruct) this._duckPersistentChannel(channel, command);
    }

    _applySceneAudio(scene, reconstruct = false) {
      if (!Array.isArray(scene?.audio)) return;
      scene.audio.forEach((command) => this._applyAudioCommand(command, reconstruct));
    }

    _queueInitialOneShots(scene) {
      if (!Array.isArray(scene?.audio)) return;
      scene.audio.forEach((command) => {
        if (command?.channel === 'oneshot' && (command.action === 'play' || command.action === 'start')) {
          this._queueAudio(() => this._playOneShot(command));
        }
      });
    }

    _stopOneShots() {
      this.oneshots.forEach((audio) => { try { audio.pause(); } catch (_) {} });
      this.oneshots.clear();
    }

    _derivePersistentAudioState(index) {
      const result = { bgm: null, ambient: null };
      if (!this.document) return result;
      for (let i = 0; i <= index; i += 1) {
        const commands = this.document.scenes[i]?.audio;
        if (!Array.isArray(commands)) continue;
        for (const cmd of commands) {
          if (!(cmd?.channel === 'bgm' || cmd?.channel === 'ambient')) continue;
          const ch = cmd.channel;
          if (cmd.action === 'start' || cmd.action === 'play') {
            result[ch] = {
              src: cmd.src,
              volume: clamp(asNumber(cmd.volume, 1), 0, 1),
              loop: cmd.loop !== false,
              startAt: Math.max(0, asNumber(cmd.startAt, 0)),
              stopAt: cmd.stopAt == null ? null : Math.max(0, asNumber(cmd.stopAt, 0)),
              fadeOut: Math.max(0, asNumber(cmd.fadeOut, 0)),
              restart: true
            };
          } else if (cmd.action === 'stop') result[ch] = null;
          else if (cmd.action === 'volume' && result[ch]) result[ch].volume = clamp(asNumber(cmd.volume, result[ch].volume), 0, 1);
          // duck is transient and deliberately not part of reconstructed state.
        }
      }
      return result;
    }

    _restoreAudioForIndex(index) {
      this._clearAudioTimers();
      this._stopOneShots();
      const desired = this._derivePersistentAudioState(index);
      ['bgm', 'ambient'].forEach((channel) => {
        const state = desired[channel];
        if (!state) this._stopPersistentChannel(channel, 0);
        else this._startPersistentChannel(channel, state, true);
      });
    }

    _stopAllAudio(resetPending = true) {
      this._clearAudioTimers();
      ['bgm', 'ambient'].forEach((channel) => this._stopPersistentChannel(channel, 0));
      this.oneshots.forEach((audio) => { try { audio.pause(); } catch (_) {} });
      this.oneshots.clear();
      if (resetPending) this.audioPending.length = 0;
    }

    _clearPresentationTimers() {
      this.presentationTimers.forEach((timer) => clearTimeout(timer));
      this.presentationTimers.length = 0;
    }

    _clearBackgroundTimers() {
      this.backgroundTimers.forEach((timer) => clearTimeout(timer));
      this.backgroundTimers.length = 0;
    }

    _backgroundTimeout(fn, delay) {
      const timer = setTimeout(() => {
        const i = this.backgroundTimers.indexOf(timer);
        if (i >= 0) this.backgroundTimers.splice(i, 1);
        fn();
      }, Math.max(0, delay));
      this.backgroundTimers.push(timer);
      return timer;
    }

    _stopTyping(complete = false) {
      const state = this.typingState;
      if (!state) return false;
      clearInterval(state.timer);
      if (complete && state.node?.isConnected) {
        state.node.textContent = state.text;
        state.node.classList.remove('is-typing');
      }
      this.typingState = null;
      return true;
    }

    _resetPresentationRuntime() {
      this._clearPresentationTimers();
      this._stopTyping(false);
    }

    _resetBackgroundRuntime() {
      this._clearBackgroundTimers();
      this.els?.bgFlash?.classList.remove('is-active');
      this.host?.classList.remove('sp-bg-glitching');
    }

    _presentationTimeout(fn, delay) {
      const timer = setTimeout(() => {
        const i = this.presentationTimers.indexOf(timer);
        if (i >= 0) this.presentationTimers.splice(i, 1);
        fn();
      }, Math.max(0, delay));
      this.presentationTimers.push(timer);
      return timer;
    }

    load(doc, options = {}) {
      if (this.destroyed) throw new Error('ScenePlayerCore has been destroyed.');
      this.stopAuto();
      this._resetPresentationRuntime();
      this._resetBackgroundRuntime();
      this._stopAllAudio(true);
      this.audioPlaybackArmed = false;
      this.document = assertSceneDocument(doc);

      // Scene Format v1: author-level navigation policy.
      // Constructor options remain the fallback for older documents.
      const authorAllowPrevious = doc.player?.navigation?.allowPrevious;
      if (typeof authorAllowPrevious === 'boolean') this.options.allowPrevious = authorAllowPrevious;
      this.els.prev.hidden = !this.options.allowPrevious;
      this.host.classList.toggle('sp-no-previous', !this.options.allowPrevious);

      this.index = clamp(asNumber(options.startAt, this.options.startAt), 0, doc.scenes.length - 1);
      this.maxVisitedIndex = this.index;
      this.historyOpen = false;
      this.els.history.hidden = true;
      this.host.classList.remove('sp-history-open');
      this.ended = false;

      this.host.dataset.theme = doc.theme;
      this.host.dataset.cinemaTone = doc.theme === 'cinema' ? (doc.appearance?.cinemaTone === 'light' ? 'light' : 'dark') : '';
      this.host.dataset.language = doc.language || '';
      this.host.dataset.preset = doc.preset || '';
      this.host.setAttribute('lang', doc.language || '');
      this.els.title.textContent = doc.title || '';
      this.els.author.textContent = doc.author || '';
      this.els.total.textContent = String(doc.scenes.length);
      this.els.endingTitle.textContent = doc.title || '読了';
      this.els.ending.hidden = true;
      this.backgroundState = null;
      this.backgroundLayerIndex = 0;
      this._resetBackgroundLayers();
      this._audioRenderMode = 'load';

      this._render();
      emit(this.host, 'sceneplayer:load', { document: doc, index: this.index });
      return this;
    }

    get currentScene() {
      return this.document?.scenes?.[this.index] || null;
    }

    get progress() {
      if (!this.document) return 0;
      return (this.index + 1) / this.document.scenes.length;
    }

    next() {
      if (!this.document || this.ended) return false;
      if (this._stopTyping(true)) {
        emit(this.host, 'sceneplayer:typingend', { index: this.index, scene: this.currentScene, skipped: true });
        this._scheduleAuto();
        return true;
      }
      this._clearAutoTimer();
      this._clearPresentationTimers();

      if (this.index < this.document.scenes.length - 1) {
        this.index += 1;
        this.maxVisitedIndex = Math.max(this.maxVisitedIndex, this.index);
        this._audioRenderMode = 'advance';
        this._render();
        emit(this.host, 'sceneplayer:scenechange', { index: this.index, scene: this.currentScene, direction: 'next' });
        return true;
      }

      if (this.options.endOnNextAction) this.finish();
      else this.finish();
      return false;
    }


    previous() {
      // Kept for API compatibility. "Previous" now means entering History,
      // not stepping backward one Scene.
      return this.openHistory();
    }

    openHistory(options = {}) {
      if (!this.document || !this.options.allowPrevious || this.maxVisitedIndex <= 0) return false;
      this.stopAuto();
      this._clearPresentationTimers();
      this.historyOpen = true;
      this.host.classList.add('sp-history-open');
      this.els.history.hidden = false;
      this._renderHistory();

      requestAnimationFrame(() => {
        const current = this.els.historyList.querySelector(`.sp-history-item[data-index="${this.index}"]`);
        if (current) {
          const box = current.getBoundingClientRect();
          const viewport = this.els.historyScroll.getBoundingClientRect();
          const target = this.els.historyScroll.scrollTop
            + (box.top - viewport.top)
            - ((viewport.height - box.height) / 2);
          this.els.historyScroll.scrollTop = Math.max(0, target);

          // A pull gesture should feel like grabbing the drum and moving into the past.
          // Give it a small initial offset while preserving native momentum afterwards.
          const drag = Math.abs(asNumber(options.dragDistance, 0));
          const wheel = Math.abs(asNumber(options.wheelDelta, 0));
          if (drag > 0 || wheel > 0) {
            this.els.historyScroll.scrollTop = Math.max(
              0,
              this.els.historyScroll.scrollTop - clamp((drag || wheel) * 0.7, 18, 110)
            );
          }
        }
        this._updateHistoryDepth();
      });

      emit(this.host, 'sceneplayer:historyopen', {
        index: this.index,
        maxVisitedIndex: this.maxVisitedIndex
      });
      return true;
    }

    closeHistory(options = {}) {
      if (!this.historyOpen) return false;
      this.historyOpen = false;
      this.host.classList.remove('sp-history-open');
      this.els.history.hidden = true;
      if (!options.keepVisualState) this.els.stage.focus({ preventScroll: true });
      emit(this.host, 'sceneplayer:historyclose', {
        index: this.index,
        maxVisitedIndex: this.maxVisitedIndex
      });
      return true;
    }

    _renderHistory() {
      if (!this.document) return;
      const fragment = document.createDocumentFragment();
      this.els.historyList.innerHTML = '';

      for (let i = 0; i <= this.maxVisitedIndex; i += 1) {
        const scene = this.document.scenes[i];
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'sp-history-item';
        item.dataset.index = String(i);
        item.dataset.sceneId = scene.id;
        if (i === this.index) item.classList.add('is-current');

        const num = document.createElement('span');
        num.className = 'sp-history-number';
        num.textContent = `${i + 1} / ${this.document.scenes.length}`;

        const body = document.createElement('span');
        body.className = 'sp-history-body';

        if (scene.type === 'sound' && !scene.text) {
          const mark = document.createElement('span');
          mark.className = 'sp-history-text';
          mark.textContent = '♪';
          body.appendChild(mark);
        } else {
          const text = document.createElement('span');
          text.className = 'sp-history-text';
          text.textContent = scene.text || '';
          body.appendChild(text);
        }

        if (scene.subText) {
          const sub = document.createElement('span');
          sub.className = 'sp-history-subtext';
          sub.textContent = scene.subText;
          body.appendChild(sub);
        }

        item.append(num, body);
        fragment.appendChild(item);
      }
      this.els.historyList.appendChild(fragment);
    }

    _scheduleHistoryDepth() {
      if (this.historyScrollRaf) return;
      this.historyScrollRaf = requestAnimationFrame(() => {
        this.historyScrollRaf = 0;
        this._updateHistoryDepth();
      });
    }

    _updateHistoryDepth() {
      if (!this.historyOpen) return;
      const viewport = this.els.historyScroll.getBoundingClientRect();
      const center = viewport.top + viewport.height / 2;
      let nearest = null;
      let nearestDistance = Infinity;

      this.els.historyList.querySelectorAll('.sp-history-item').forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenter - center);
        const normalized = clamp(distance / Math.max(1, viewport.height * 0.58), 0, 1);
        item.style.setProperty('--sp-history-depth', String(normalized));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = item;
        }
      });

      this.els.historyList.querySelectorAll('.is-nearest').forEach((el) => el.classList.remove('is-nearest'));
      if (nearest) nearest.classList.add('is-nearest');
    }

    goToVisited(sceneOrIndex) {
      if (!this.document) return false;
      let nextIndex = -1;
      if (typeof sceneOrIndex === 'number') nextIndex = sceneOrIndex;
      else if (typeof sceneOrIndex === 'string') nextIndex = this.document.scenes.findIndex((s) => s.id === sceneOrIndex);
      if (nextIndex < 0 || nextIndex > this.maxVisitedIndex) return false;
      return this.goTo(nextIndex, { audioMode: 'history' });
    }

    goTo(sceneOrIndex, options = {}) {
      if (!this.document) return false;
      let nextIndex = -1;
      if (typeof sceneOrIndex === 'number') nextIndex = sceneOrIndex;
      else if (typeof sceneOrIndex === 'string') nextIndex = this.document.scenes.findIndex((s) => s.id === sceneOrIndex);
      if (nextIndex < 0 || nextIndex >= this.document.scenes.length) return false;

      this._clearAutoTimer();
      this._resetPresentationRuntime();
      this._resetBackgroundRuntime();
      this.ended = false;
      this.els.ending.hidden = true;
      this.index = nextIndex;
      this._audioRenderMode = options.audioMode === 'history' ? 'history' : 'restore';
      this._render();
      emit(this.host, 'sceneplayer:scenechange', { index: this.index, scene: this.currentScene, direction: 'jump' });
      return true;
    }

    restart() {
      if (!this.document) return;
      this._clearAutoTimer();
      this._resetPresentationRuntime();
      this._resetBackgroundRuntime();

      // Restart means a fresh reading session, not an immediate audio restart.
      // Stop current audio, clear old queued work, disarm playback, then rebuild
      // scene-1 audio as pending until the reader taps the stage again.
      this._stopAllAudio(true);
      this.audioPlaybackArmed = false;

      this.index = 0;
      this.maxVisitedIndex = 0;
      this.closeHistory({ keepVisualState: true });
      this.ended = false;
      this.els.ending.hidden = true;
      this._audioRenderMode = 'restore';
      this._render();
      emit(this.host, 'sceneplayer:restart', { scene: this.currentScene });
    }

    finish() {
      if (!this.document || this.ended) return;
      this.stopAuto();
      this._resetPresentationRuntime();
      this._resetBackgroundRuntime();
      this.ended = true;
      this.els.ending.hidden = false;
      emit(this.host, 'sceneplayer:end', { document: this.document, index: this.index });
    }

    startAuto() {
      if (!this.document || this.ended || this.auto) return;
      this.auto = true;
      this.els.auto.classList.add('is-on');
      this.els.auto.setAttribute('aria-pressed', 'true');
      this._scheduleAuto();
      emit(this.host, 'sceneplayer:autochange', { auto: true });
    }

    stopAuto() {
      this.auto = false;
      this._clearAutoTimer();
      if (this.els?.auto) {
        this.els.auto.classList.remove('is-on');
        this.els.auto.setAttribute('aria-pressed', 'false');
      }
      if (this.host) emit(this.host, 'sceneplayer:autochange', { auto: false });
    }

    toggleAuto() {
      this.auto ? this.stopAuto() : this.startAuto();
    }

    _clearAutoTimer() {
      if (this.autoTimer) clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }

    _scheduleAuto() {
      if (!this.auto || this.ended || !this.currentScene || this.typingState) return;
      this._clearAutoTimer();
      const delay = Math.max(0, asNumber(this.currentScene.pause, this.options.autoDelay));
      this.autoTimer = setTimeout(() => {
        this.autoTimer = null;
        if (this.index >= this.document.scenes.length - 1) this.finish();
        else this.next();
      }, delay);
    }

    _render() {
      if (!this.document) return;
      this._resetPresentationRuntime();
      const scenes = this.document.scenes;
      const active = scenes[this.index];
      const display = active?.presentation?.display || 'stack';
      const visible = this._visibleScenes(display);

      this.els.scenes.innerHTML = '';
      visible.forEach(({ scene, index }) => {
        const node = this._sceneNode(scene, index === this.index, this.index - index);
        this.els.scenes.appendChild(node);
      });

      this.els.current.textContent = String(this.index + 1);
      this.els.bar.style.width = `${this.progress * 100}%`;
      this.els.prev.disabled = !this.options.allowPrevious || this.maxVisitedIndex <= 0;
      this.host.dataset.display = display;
      this.host.dataset.sceneId = active.id;
      this.host.dataset.sceneType = active.type;

      this._applyCorePresentation(active);
      this._applyBackgroundForIndex(this.index);
      if (this._audioRenderMode === 'advance') {
        this._applySceneAudio(active, false);
      } else {
        const mode = this._audioRenderMode;
        this._restoreAudioForIndex(this.index);
        // One-shots do not fire while browsing History, but do replay when the
        // reader explicitly lands on a visited Scene. This recreates that Scene.
        if (mode === 'load' || mode === 'history') this._queueInitialOneShots(active);
      }
      this._audioRenderMode = 'advance';

      requestAnimationFrame(() => {
        const newest = this.els.scenes.lastElementChild;
        if (newest) {
          // Anchor the newest Scene's CENTER to the Stage center.
          // This recreates the v0.1 reading rhythm without Studio-specific layout code.
          const latestHalf = Math.max(0, newest.getBoundingClientRect().height / 2);
          this.els.scenes.style.setProperty('--sp-latest-half', `${latestHalf}px`);
          newest.classList.add('is-visible');
          this._activatePresentation(active, newest);
        } else {
          this.els.scenes.style.setProperty('--sp-latest-half', '0px');
        }
        this._scheduleAuto();
      });
    }

    _visibleScenes(display) {
      const scenes = this.document.scenes;
      if (display === 'solo') return [{ scene: scenes[this.index], index: this.index }];

      // A previous solo scene is a visual barrier: stack starts after it.
      let start = 0;
      for (let i = this.index - 1; i >= 0; i -= 1) {
        if ((scenes[i].presentation?.display || 'stack') === 'solo') {
          start = i + 1;
          break;
        }
      }
      start = Math.max(start, this.index - this.options.maxStackVisible + 1);
      return scenes.slice(start, this.index + 1).map((scene, offset) => ({ scene, index: start + offset }));
    }


    _resetBackgroundLayers() {
      if (!this.els?.bgA || !this.els?.bgB) return;
      [this.els.bgA, this.els.bgB].forEach((layer) => {
        layer.className = layer.classList.contains('sp-bg-a') ? 'sp-bg-layer sp-bg-a' : 'sp-bg-layer sp-bg-b';
        layer.removeAttribute('style');
      });
      this.els.bgA.classList.add('is-current');
      this.els.bgB.classList.remove('is-current');
      if (this.els.veil) this.els.veil.removeAttribute('style');
      if (this.els.bgTextures) {
        this.els.bgTextures.removeAttribute('style');
        this.els.bgTextures.dataset.texture = '';
      }
      this.host.classList.remove('sp-has-background','sp-bg-glitching');
    }

    _backgroundStateAt(index) {
      const state = {
        src: '',
        transition: 'fade',
        dim: null,
        blur: 0,
        fit: 'cover',
        position: 'center center',
        reveal: null,
        motion: null,
        textures: null
      };
      for (let i = 0; i <= index; i += 1) {
        const bg = this.document?.scenes?.[i]?.presentation?.background;
        if (!bg || typeof bg !== 'object') continue;
        Object.keys(bg).forEach((key) => {
          const value = bg[key];
          if (value !== undefined) state[key] = (value && typeof value === 'object' && !Array.isArray(value))
            ? { ...(state[key] && typeof state[key] === 'object' ? state[key] : {}), ...value }
            : value;
        });
      }
      return state;
    }

    _applyBackgroundForIndex(index) {
      const next = this._backgroundStateAt(index);
      const previous = this.backgroundState;
      const sceneBg = this.document?.scenes?.[index]?.presentation?.background || null;
      const transition = sceneBg?.transition || next.transition || 'fade';
      const srcChanged = !previous || previous.src !== next.src;

      this._resetBackgroundRuntime();
      this.backgroundState = next;
      this.host.classList.toggle('sp-has-background', Boolean(next.src));

      if (srcChanged) this._swapBackground(next, transition);
      else this._styleCurrentBackground(next, Boolean(sceneBg?.motion));

      this._applyBackgroundOverlays(next);
      this._runBackgroundReveal(sceneBg?.reveal, transition);
      emit(this.host, 'sceneplayer:backgroundchange', { index, scene: this.currentScene, background: { ...next }, srcChanged });
    }

    _currentBackgroundLayer() {
      return this.backgroundLayerIndex === 0 ? this.els.bgA : this.els.bgB;
    }

    _nextBackgroundLayer() {
      return this.backgroundLayerIndex === 0 ? this.els.bgB : this.els.bgA;
    }

    _swapBackground(state, transition) {
      const current = this._currentBackgroundLayer();
      const incoming = this._nextBackgroundLayer();
      this._prepareBackgroundLayer(incoming, state);

      const mode = ['fade','cut','flash','glitch'].includes(transition) ? transition : 'fade';
      this.host.dataset.bgTransition = mode;
      incoming.classList.add('is-current');
      current.classList.remove('is-current');

      if (mode === 'cut') {
        incoming.classList.add('sp-bg-cut');
        requestAnimationFrame(() => incoming.classList.remove('sp-bg-cut'));
      } else if (mode === 'flash') {
        this.els.bgFlash.classList.remove('is-active');
        void this.els.bgFlash.offsetWidth;
        this.els.bgFlash.classList.add('is-active');
        this._backgroundTimeout(() => this.els.bgFlash.classList.remove('is-active'), 520);
      } else if (mode === 'glitch') {
        this.host.classList.add('sp-bg-glitching');
        this._backgroundTimeout(() => this.host.classList.remove('sp-bg-glitching'), 560);
      }

      this.backgroundLayerIndex = this.backgroundLayerIndex === 0 ? 1 : 0;
      this._styleCurrentBackground(state, true);
      this._backgroundTimeout(() => {
        current.style.backgroundImage = '';
        current.className = current.classList.contains('sp-bg-a') ? 'sp-bg-layer sp-bg-a' : 'sp-bg-layer sp-bg-b';
      }, mode === 'cut' ? 20 : 900);
    }

    _prepareBackgroundLayer(layer, state) {
      layer.className = layer.classList.contains('sp-bg-a') ? 'sp-bg-layer sp-bg-a' : 'sp-bg-layer sp-bg-b';
      layer.style.backgroundImage = state.src ? `url("${String(state.src).replace(/"/g, '\"')}")` : 'none';
      layer.style.backgroundSize = state.fit === 'contain' ? 'contain' : 'cover';
      layer.style.backgroundPosition = state.position || 'center center';
      layer.style.filter = state.blur > 0 ? `blur(${state.blur}px)` : '';
      this._applyBackgroundMotion(layer, state.motion);
    }

    _styleCurrentBackground(state, resetMotion) {
      const layer = this._currentBackgroundLayer();
      if (!layer) return;
      layer.style.backgroundSize = state.fit === 'contain' ? 'contain' : 'cover';
      layer.style.backgroundPosition = state.position || 'center center';
      layer.style.filter = state.blur > 0 ? `blur(${state.blur}px)` : '';
      if (resetMotion) this._applyBackgroundMotion(layer, state.motion);
    }

    _applyBackgroundMotion(layer, motion) {
      layer.classList.remove('sp-motion-parallax','sp-motion-breath','sp-motion-slowZoom','sp-motion-panLeft','sp-motion-panRight','sp-motion-panUp','sp-motion-panDown');
      layer.style.removeProperty('--sp-bg-duration');
      layer.style.removeProperty('--sp-bg-scale-from');
      layer.style.removeProperty('--sp-bg-scale-to');
      layer.style.removeProperty('--sp-bg-pan');
      if (!motion || !motion.type || motion.type === 'none') return;
      const type = ['parallax','breath','slowZoom','panLeft','panRight','panUp','panDown'].includes(motion.type) ? motion.type : null;
      if (!type) return;
      layer.classList.add(`sp-motion-${type}`);
      layer.style.setProperty('--sp-bg-duration', `${Math.max(250, asNumber(motion.duration, 12000))}ms`);
      layer.style.setProperty('--sp-bg-scale-from', String(asNumber(motion.scaleFrom, 1)));
      layer.style.setProperty('--sp-bg-scale-to', String(asNumber(motion.scaleTo, type === 'slowZoom' ? 1.08 : 1.04)));
      layer.style.setProperty('--sp-bg-pan', `${asNumber(motion.pan, 4)}%`);
    }

    _applyBackgroundOverlays(state) {
      const isCinemaLight = this.document?.theme === 'cinema' && this.document?.appearance?.cinemaTone === 'light';
      const themeDefaultDim = this.document?.theme === 'cinema' ? (isCinemaLight ? 0.72 : 0.34) : 0;
      const dim = clamp(asNumber(state.dim, themeDefaultDim), 0, 1);
      // CINEMA dark dims the image; CINEMA light washes it toward paper so
      // black typography remains readable over photography.
      this.els.veil.style.background = isCinemaLight
        ? `rgba(250,247,240,${dim})`
        : `rgba(0,0,0,${dim})`;

      const textures = state.textures || {};
      const grain = clamp(asNumber(textures.grain, 0), 0, 1);
      const scanline = clamp(asNumber(textures.scanline, 0), 0, 1);
      const vignette = clamp(asNumber(textures.vignette, 0), 0, 1);
      const monochrome = clamp(asNumber(textures.monochrome, 0), 0, 1);
      const glitch = clamp(asNumber(textures.glitch, 0), 0, 1);
      const blurTexture = clamp(asNumber(textures.blur, 0), 0, 1);
      this.els.bgTextures.style.setProperty('--sp-grain', grain);
      this.els.bgTextures.style.setProperty('--sp-scanline', scanline);
      this.els.bgTextures.style.setProperty('--sp-vignette', vignette);
      this.els.bgTextures.style.setProperty('--sp-texture-glitch', glitch);
      this.els.bgTextures.style.opacity = String(Math.max(grain, scanline, vignette, glitch, blurTexture));
      this.els.bgTextures.classList.toggle('has-texture-glitch', glitch > 0);
      this.els.bgTextures.style.backdropFilter = blurTexture > 0 ? `blur(${blurTexture * 4}px) grayscale(${monochrome})` : `grayscale(${monochrome})`;
      this.els.bgTextures.style.webkitBackdropFilter = this.els.bgTextures.style.backdropFilter;
    }

    _runBackgroundReveal(reveal, fallbackTransition) {
      if (!reveal || !reveal.type || reveal.type === 'none' || reveal.type === 'still') return;
      const type = ['intro','memory','ghost','flash'].includes(reveal.type) ? reveal.type : null;
      if (!type) return;
      const layer = this._currentBackgroundLayer();
      const duration = Math.max(0, asNumber(reveal.duration, 1000));
      const hold = Math.max(0, asNumber(reveal.hold, 0));
      const opacity = clamp(asNumber(reveal.opacity, 1), 0, 1);
      layer.style.setProperty('--sp-reveal-duration', `${duration}ms`);
      layer.style.setProperty('--sp-reveal-opacity', opacity);
      layer.classList.remove('sp-reveal-intro','sp-reveal-memory','sp-reveal-ghost','sp-reveal-flash');
      void layer.offsetWidth;
      layer.classList.add(`sp-reveal-${type}`);
      this._backgroundTimeout(() => layer.classList.remove(`sp-reveal-${type}`), duration + hold + 80);
      if (type === 'flash' && fallbackTransition !== 'flash') {
        this.els.bgFlash.classList.add('is-active');
        this._backgroundTimeout(() => this.els.bgFlash.classList.remove('is-active'), Math.min(520, duration || 520));
      }
    }

    _sceneNode(scene, active, age) {
      const article = document.createElement('article');
      article.className = `sp-scene sp-type-${scene.type}`;
      article.dataset.sceneId = scene.id;
      article.dataset.age = String(age);
      article.classList.toggle('is-active', active);
      if (!active) article.classList.add('is-visible');

      const presentation = scene.presentation || {};
      const effect = this._resolveSceneEffect(scene, presentation.effect);
      if (effect && /^[a-zA-Z0-9_-]+$/.test(effect)) article.dataset.effect = effect;
      if (presentation.view && /^[a-zA-Z0-9_-]+$/.test(presentation.view)) article.dataset.view = presentation.view;
      article.dataset.fit = this._resolveAutoFit(scene, presentation.text || {});

      if (typeof scene.text === 'string' && scene.text.length) {
        const text = document.createElement('div');
        text.className = 'sp-text';
        text.textContent = scene.text;
        this._applyTextStyle(text, presentation.text || {}, false);
        article.appendChild(text);
      }

      if (typeof scene.subText === 'string' && scene.subText.length) {
        const sub = document.createElement('div');
        sub.className = 'sp-subtext';
        sub.textContent = scene.subText;
        this._applyTextStyle(sub, presentation.subText || {}, true);
        article.appendChild(sub);
      }

      if (scene.type === 'sound' && !scene.text && !scene.subText) {
        const mark = document.createElement('span');
        mark.className = 'sp-sound-mark';
        mark.setAttribute('aria-label', 'Sound scene');
        mark.textContent = '♪';
        article.appendChild(mark);
      }

      return article;
    }

    _resolveAutoFit(scene, textStyle = {}) {
      // Explicit pixel/token sizes are an author override. Auto Fit only owns the default size.
      if (textStyle && textStyle.size && textStyle.size !== 'auto') return 'manual';
      const text = String(scene?.text || '');
      const chars = Array.from(text).length;
      const lines = text ? text.split('\n').length : 0;
      // Preserve v0.1's useful behavior: multi-line/list blocks shrink before they overflow.
      if (lines >= 8 || chars >= 190) return 'tight';
      if (lines >= 6 || chars >= 145) return 'compact';
      if (lines >= 4 || chars >= 105) return 'medium';
      // A smaller viewport-safe tier for dense 3-line prose.
      if (lines >= 3 && chars >= 78) return 'soft';
      return 'normal';
    }

    _resolveSceneEffect(scene, requested) {
      if (requested && requested !== 'auto') return requested;
      const text = String(scene?.text || '').trim();
      if (!text) return 'fade';
      const chars = Array.from(text).length;
      const lines = text.split('\n').filter(Boolean).length;
      if (scene?.type === 'dialogue') return 'softRise';
      if (lines >= 4) return 'settle';
      if (chars <= 28 && /(?:——|――|…|\.\.\.|。|！|？|!|\?)$/.test(text)) return 'whisperIn';
      if (chars <= 34 && /[！!？?]$/.test(text)) return 'emphasis';
      if (chars <= 46 && lines === 1) return 'softRise';
      return 'fadeRise';
    }

    _applyTextStyle(node, style, isSubText) {
      if (!style || typeof style !== 'object') return;
      if (style.color) node.style.color = String(style.color);

      const size = style.size;
      const tokenSizes = isSubText
        ? { small: '11px', normal: '14px', large: '17px', xl: '20px' }
        : { small: 'clamp(17px,3.8vw,24px)', normal: 'clamp(21px,4.8vw,34px)', large: 'clamp(26px,5.8vw,42px)', xl: 'clamp(32px,7vw,54px)' };
      if (typeof size === 'number' && Number.isFinite(size) && size > 0) node.style.fontSize = `${size}px`;
      else if (typeof size === 'string' && size !== 'auto' && tokenSizes[size]) node.style.fontSize = tokenSizes[size];

      if (style.wrap === 'nowrap') {
        node.style.whiteSpace = 'nowrap';
        node.style.overflowWrap = 'normal';
      }
    }

    _applyCorePresentation(scene) {
      const view = scene.presentation?.view || 'world';
      this.host.dataset.view = view;
    }

    _activatePresentation(scene, article) {
      const presentation = scene.presentation || {};
      const textNode = article.querySelector('.sp-text');
      const typing = presentation.typing;

      if (textNode && typing?.enabled && typeof scene.text === 'string' && scene.text.length) {
        this._startTyping(scene, textNode, typing);
      }

      const disappear = presentation.disappear;
      const after = asNumber(disappear?.after, 0);
      if (after > 0) {
        const fade = Math.max(100, asNumber(disappear?.fade, 700));
        article.style.setProperty('--sp-disappear-fade', `${fade}ms`);
        this._presentationTimeout(() => {
          if (!article.isConnected) return;
          article.classList.add('is-disappearing');
          emit(this.host, 'sceneplayer:disappear', { index: this.index, scene, phase: 'start' });
          this._presentationTimeout(() => {
            if (!article.isConnected) return;
            article.classList.add('is-disappeared');
            emit(this.host, 'sceneplayer:disappear', { index: this.index, scene, phase: 'end' });
          }, fade);
        }, after);
      }
    }

    _startTyping(scene, node, typing) {
      this._stopTyping(true);
      const chars = Array.from(scene.text || '');
      const speed = Math.max(10, asNumber(typing.speed, 55));
      const cursor = typing.cursor === false ? '' : '▍';
      let position = 0;

      node.classList.add('is-typing');
      node.textContent = cursor;
      emit(this.host, 'sceneplayer:typingstart', { index: this.index, scene });

      const timer = setInterval(() => {
        position += 1;
        node.textContent = chars.slice(0, position).join('') + (position < chars.length ? cursor : '');
        if (position >= chars.length) {
          clearInterval(timer);
          if (this.typingState?.timer === timer) this.typingState = null;
          node.classList.remove('is-typing');
          emit(this.host, 'sceneplayer:typingend', { index: this.index, scene, skipped: false });
          this._scheduleAuto();
        }
      }, speed);

      this.typingState = { timer, node, text: scene.text, sceneId: scene.id };
    }

    destroy() {
      if (this.destroyed) return;
      this.stopAuto();
      this._resetPresentationRuntime();
      this._resetBackgroundRuntime();
      this._stopAllAudio(true);
      if (this.audioContext && typeof this.audioContext.close === 'function') {
        try { this.audioContext.close(); } catch (_) {}
      }
      this.audioGainNodes.clear();
      this.audioSourceNodes.clear();
      this._bound.forEach(([el, event, fn, options]) => el.removeEventListener(event, fn, options));
      this._bound.length = 0;
      this.host.innerHTML = '';
      this.host.classList.remove('sp-core');
      this.destroyed = true;
    }
  }

  ScenePlayerCore.VERSION = '1.4.1';
  ScenePlayerCore.FORMAT_VERSION = '1.0';
  ScenePlayerCore.validate = assertSceneDocument;

  global.ScenePlayerCore = ScenePlayerCore;
})(typeof window !== 'undefined' ? window : globalThis);
