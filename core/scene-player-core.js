/*
 * Scene Player Core v1.1.0
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
      this.destroyed = false;
      this._bound = [];
      this.presentationTimers = [];
      this.typingState = null;

      this._buildShell();
      this._bindControls();
    }

    _buildShell() {
      this.host.classList.add('sp-core');
      this.host.innerHTML = `
        <div class="sp-background" aria-hidden="true"></div>
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
        header: q('.sp-header'),
        footer: q('.sp-footer'),
        stage: q('.sp-stage'),
        scenes: q('.sp-scenes'),
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
      this._on(this.els.prev, 'click', (e) => { e.stopPropagation(); this.previous(); });
      this._on(this.els.restart, 'click', (e) => { e.stopPropagation(); this.restart(); });
      this._on(this.els.endingRestart, 'click', () => this.restart());
      this._on(this.els.auto, 'click', (e) => { e.stopPropagation(); this.toggleAuto(); });

      this._on(this.els.stage, 'click', (e) => {
        if (e.target.closest('button')) return;
        this.next();
      });

      if (this.options.keyboard) {
        this._on(this.els.stage, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            this.next();
          } else if (this.options.allowPrevious && (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace')) {
            e.preventDefault();
            this.previous();
          }
        });
      }

      if (this.options.swipe) {
        this._on(this.els.stage, 'touchstart', (e) => {
          const t = e.changedTouches[0];
          this.touchStartY = t.clientY;
          this.touchStartX = t.clientX;
        }, { passive: true });

        this._on(this.els.stage, 'touchend', (e) => {
          if (this.touchStartY == null || this.touchStartX == null) return;
          const t = e.changedTouches[0];
          const dy = t.clientY - this.touchStartY;
          const dx = t.clientX - this.touchStartX;
          this.touchStartY = null;
          this.touchStartX = null;

          if (Math.max(Math.abs(dx), Math.abs(dy)) < this.options.swipeThreshold) return;
          if (Math.abs(dy) >= Math.abs(dx)) {
            if (dy > 0 && this.options.allowPrevious) this.previous();
            else if (dy < 0) this.next();
          } else {
            if (dx > 0 && this.options.allowPrevious) this.previous();
            else this.next();
          }
        }, { passive: true });
      }
    }

    _clearPresentationTimers() {
      this.presentationTimers.forEach((timer) => clearTimeout(timer));
      this.presentationTimers.length = 0;
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
      this.document = assertSceneDocument(doc);
      this.index = clamp(asNumber(options.startAt, this.options.startAt), 0, doc.scenes.length - 1);
      this.ended = false;

      this.host.dataset.theme = doc.theme;
      this.host.dataset.language = doc.language || '';
      this.host.dataset.preset = doc.preset || '';
      this.host.setAttribute('lang', doc.language || '');
      this.els.title.textContent = doc.title || '';
      this.els.author.textContent = doc.author || '';
      this.els.total.textContent = String(doc.scenes.length);
      this.els.endingTitle.textContent = doc.title || '読了';
      this.els.ending.hidden = true;

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
        this._render();
        emit(this.host, 'sceneplayer:scenechange', { index: this.index, scene: this.currentScene, direction: 'next' });
        return true;
      }

      if (this.options.endOnNextAction) this.finish();
      else this.finish();
      return false;
    }

    previous() {
      if (!this.document || !this.options.allowPrevious) return false;
      this._clearAutoTimer();
      this._resetPresentationRuntime();

      if (this.ended) {
        this.ended = false;
        this.els.ending.hidden = true;
        this._render();
        return true;
      }

      if (this.index <= 0) return false;
      this.index -= 1;
      this._render();
      emit(this.host, 'sceneplayer:scenechange', { index: this.index, scene: this.currentScene, direction: 'previous' });
      return true;
    }

    goTo(sceneOrIndex) {
      if (!this.document) return false;
      let nextIndex = -1;
      if (typeof sceneOrIndex === 'number') nextIndex = sceneOrIndex;
      else if (typeof sceneOrIndex === 'string') nextIndex = this.document.scenes.findIndex((s) => s.id === sceneOrIndex);
      if (nextIndex < 0 || nextIndex >= this.document.scenes.length) return false;

      this._clearAutoTimer();
      this._resetPresentationRuntime();
      this.ended = false;
      this.els.ending.hidden = true;
      this.index = nextIndex;
      this._render();
      emit(this.host, 'sceneplayer:scenechange', { index: this.index, scene: this.currentScene, direction: 'jump' });
      return true;
    }

    restart() {
      if (!this.document) return;
      this._clearAutoTimer();
      this._resetPresentationRuntime();
      this.index = 0;
      this.ended = false;
      this.els.ending.hidden = true;
      this._render();
      emit(this.host, 'sceneplayer:restart', { scene: this.currentScene });
    }

    finish() {
      if (!this.document || this.ended) return;
      this.stopAuto();
      this._resetPresentationRuntime();
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
      this.els.prev.disabled = this.index <= 0;
      this.host.dataset.display = display;
      this.host.dataset.sceneId = active.id;
      this.host.dataset.sceneType = active.type;

      this._applyCorePresentation(active);

      requestAnimationFrame(() => {
        const newest = this.els.scenes.lastElementChild;
        if (newest) {
          newest.classList.add('is-visible');
          this._activatePresentation(active, newest);
        }
        this._scheduleAuto();
        this.els.stage.scrollTop = this.els.stage.scrollHeight;
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

    _sceneNode(scene, active, age) {
      const article = document.createElement('article');
      article.className = `sp-scene sp-type-${scene.type}`;
      article.dataset.sceneId = scene.id;
      article.dataset.age = String(age);
      article.classList.toggle('is-active', active);
      if (!active) article.classList.add('is-visible');

      const presentation = scene.presentation || {};
      const effect = presentation.effect;
      if (effect && /^[a-zA-Z0-9_-]+$/.test(effect)) article.dataset.effect = effect;
      if (presentation.view && /^[a-zA-Z0-9_-]+$/.test(presentation.view)) article.dataset.view = presentation.view;

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
      this._bound.forEach(([el, event, fn, options]) => el.removeEventListener(event, fn, options));
      this._bound.length = 0;
      this.host.innerHTML = '';
      this.host.classList.remove('sp-core');
      this.destroyed = true;
    }
  }

  ScenePlayerCore.VERSION = '1.1.0';
  ScenePlayerCore.FORMAT_VERSION = '1.0';
  ScenePlayerCore.validate = assertSceneDocument;

  global.ScenePlayerCore = ScenePlayerCore;
})(typeof window !== 'undefined' ? window : globalThis);
