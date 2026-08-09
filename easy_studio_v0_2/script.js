(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const editorScreen = $('#editorScreen');
  const playerScreen = $('#playerScreen');
  const titleInput = $('#titleInput');
  const authorInput = $('#authorInput');
  const bodyInput = $('#bodyInput');
  const charCount = $('#charCount');
  const densitySelect = $('#densitySelect');
  const playerHost = $('#scenePlayer');

  let selectedTheme = 'light';
  let cinemaTone = 'dark';
  let cinemaBackgroundUrl = '';
  let player = null;
  let lastDocument = null;

  const SAMPLE = `通りは朝から、よく整えられた録音室みたいだった。\n\n角を曲がると、声が重なった。\n\n「今日もいい天気ですね」\n\nパン屋の店主が、窯の前で。\n\n同じ音程、同じタイミング、同じ長さ。\n違う口から出ているのに、一枚の録音を街に貼り付けたみたいに、揺れない。\n\nそれでも——\n\n私は、ほんのわずかな遅れを待ってしまう。`;

  function splitBody(text) {
    return JapaneseSceneSplitter.splitDetailed(text, {
      density: densitySelect.value
    });
  }

  function makeSceneId(index) {
    return `s${String(index + 1).padStart(3, '0')}`;
  }

  function buildSceneDocument() {
    const chunks = splitBody(bodyInput.value);
    const scenes = chunks.map((chunk, index) => ({
      id: makeSceneId(index),
      type: chunk.type || 'text',
      text: chunk.text,
      presentation: {
        display: 'stack',
        effect: 'auto'
      }
    }));

    if (selectedTheme === 'cinema' && cinemaBackgroundUrl && scenes[0]) {
      scenes[0].presentation.background = {
        src: cinemaBackgroundUrl,
        transition: 'fade',
        dim: cinemaTone === 'dark' ? 0.48 : 0.08,
        fit: 'cover',
        position: 'center center'
      };
    }

    return {
      format: 'scene-format',
      version: '1.0',
      language: 'ja',
      title: titleInput.value.trim() || 'Untitled',
      author: authorInput.value.trim(),
      theme: selectedTheme,
      scenes
    };
  }

  function updateCount() {
    charCount.textContent = `${bodyInput.value.length.toLocaleString()}文字`;
  }

  function applyTheme(theme) {
    selectedTheme = theme;
    $$('.theme-card').forEach((card) => {
      const selected = card.dataset.theme === theme;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    $('#cinemaBackgroundPanel').hidden = theme !== 'cinema';
  }

  function updatePlayerToneClass() {
    playerScreen.classList.toggle('easy-cinema-light', selectedTheme === 'cinema' && cinemaTone === 'light');
    playerScreen.classList.toggle('easy-cinema-dark', selectedTheme === 'cinema' && cinemaTone === 'dark');
  }

  function ensurePlayer() {
    if (player) return player;
    player = new ScenePlayerCore(playerHost, {
      allowPrevious: true,
      keyboard: true,
      swipe: true,
      endOnNextAction: true,
      maxStackVisible: 4,
      autoDelay: 2600
    });
    return player;
  }

  function openPlayer() {
    if (!bodyInput.value.trim()) {
      bodyInput.focus();
      return;
    }
    const doc = buildSceneDocument();
    if (!doc.scenes.length) return;

    lastDocument = doc;
    updatePlayerToneClass();
    editorScreen.hidden = true;
    playerScreen.hidden = false;
    document.documentElement.classList.add('easy-player-open');
    document.body.classList.add('easy-player-open');
    ensurePlayer().load(doc);
  }

  function closePlayer() {
    if (player) {
      player.stopAuto();
      player._stopAllAudio?.(true);
    }
    playerScreen.hidden = true;
    editorScreen.hidden = false;
    document.documentElement.classList.remove('easy-player-open');
    document.body.classList.remove('easy-player-open');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  bodyInput.addEventListener('input', updateCount);

  $('#sampleButton').addEventListener('click', () => {
    titleInput.value = '声のそろう通り';
    bodyInput.value = SAMPLE;
    updateCount();
  });

  $$('.theme-card').forEach((card) => card.addEventListener('click', () => applyTheme(card.dataset.theme)));
  $('#makeButton').addEventListener('click', openPlayer);
  $('#editReturnButton').addEventListener('click', closePlayer);

  const cinemaInput = $('#cinemaBackgroundInput');
  const cinemaPreview = $('#cinemaBackgroundPreview');
  const cinemaClear = $('#cinemaBackgroundClear');

  cinemaInput.addEventListener('change', () => {
    const file = cinemaInput.files?.[0];
    if (!file) return;
    if (cinemaBackgroundUrl) URL.revokeObjectURL(cinemaBackgroundUrl);
    cinemaBackgroundUrl = URL.createObjectURL(file);
    cinemaPreview.style.backgroundImage = `url("${cinemaBackgroundUrl}")`;
    cinemaPreview.hidden = false;
    cinemaClear.hidden = false;
  });

  cinemaClear.addEventListener('click', () => {
    if (cinemaBackgroundUrl) URL.revokeObjectURL(cinemaBackgroundUrl);
    cinemaBackgroundUrl = '';
    cinemaInput.value = '';
    cinemaPreview.style.backgroundImage = '';
    cinemaPreview.hidden = true;
    cinemaClear.hidden = true;
  });

  $$('.cinema-tone-button').forEach((button) => {
    button.addEventListener('click', () => {
      cinemaTone = button.dataset.tone || 'dark';
      $$('.cinema-tone-button').forEach((b) => {
        const selected = b.dataset.tone === cinemaTone;
        b.classList.toggle('is-selected', selected);
        b.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
    });
  });

  // Useful during development without exposing JSON to normal Easy Studio users.
  window.SceneStudioDebug = {
    getSceneDocument: () => lastDocument ? structuredClone(lastDocument) : buildSceneDocument(),
    getPlayer: () => player,
    splitJapanese: (text, options = {}) => JapaneseSceneSplitter.splitDetailed(text, options)
  };

  applyTheme('light');
  updateCount();
})();
