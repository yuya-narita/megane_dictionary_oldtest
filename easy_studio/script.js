(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const editorScreen = $("#editorScreen");
  const playerScreen = $("#playerScreen");
  const titleInput = $("#titleInput");
  const authorInput = $("#authorInput");
  const bodyInput = $("#bodyInput");
  const charCount = $("#charCount");
  const densitySelect = $("#densitySelect");

  const playerTitle = $("#playerTitle");
  const playerAuthor = $("#playerAuthor");
  const playerStage = $("#playerStage");
  const sceneStack = $("#sceneStack");
  const progressText = $("#progressText");
  const progressBar = $("#progressBar");
  const autoButton = $("#autoButton");
  const playerMenu = $("#playerMenu");
  const endingScreen = $("#endingScreen");
  const endingTitle = $("#endingTitle");

  let selectedTheme = "light";
  let scenes = [];
  let current = 0;
  let autoTimer = null;
  let ended = false;
  let touchAdvancedAt = 0;
  let cinemaBackgroundUrl = "";
  let cinemaTone = "dark";

  const SAMPLE = `通りは朝から、よく整えられた録音室みたいだった。

角を曲がると、声が重なった。

「今日もいい天気ですね」

パン屋の店主が、窯の前で。

同じ音程、同じタイミング、同じ長さ。
違う口から出ているのに、一枚の録音を街に貼り付けたみたいに、揺れない。

それでも——

私は、ほんのわずかな遅れを待ってしまう。`;

  const LIMITS = { short: 42, normal: 68, long: 96 };

  function splitSentences(text){
    const result = [];
    let buffer = "";
    for(const ch of [...text]){
      buffer += ch;
      if("。！？!?".includes(ch)){
        result.push(buffer.trim());
        buffer = "";
      }
    }
    if(buffer.trim()) result.push(buffer.trim());
    return result.filter(Boolean);
  }

  function pack(paragraph, limit){
    paragraph = paragraph.trim();
    if(!paragraph) return [];
    if(paragraph.length <= limit) return [paragraph];

    const sentences = splitSentences(paragraph);
    if(sentences.length <= 1) return [paragraph];

    const out = [];
    let buffer = "";
    for(const sentence of sentences){
      const candidate = buffer ? `${buffer}\n${sentence}` : sentence;
      if(buffer && candidate.length > limit){
        out.push(buffer);
        buffer = sentence;
      }else{
        buffer = candidate;
      }
    }
    if(buffer) out.push(buffer);
    return out;
  }

  function buildScenes(text){
    const normalized = text
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if(!normalized) return [];
    const limit = LIMITS[densitySelect.value] || LIMITS.normal;

    return normalized
      .split(/\n\s*\n/)
      .flatMap((p) => pack(p, limit))
      .filter(Boolean);
  }

  function updateCount(){
    charCount.textContent = `${bodyInput.value.length.toLocaleString()}文字`;
  }

  function applyTheme(theme){
    selectedTheme = theme;
    $$(".theme-card").forEach((card) => {
      const selected = card.dataset.theme === theme;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    });

    const cinemaPanel = $("#cinemaBackgroundPanel");
    if(cinemaPanel) cinemaPanel.hidden = theme !== "cinema";
  }

  function updateProgress(){
    const total = Math.max(scenes.length, 1);
    const shown = Math.min(current, total);
    progressText.textContent = `${shown || 1} / ${total}`;
    progressBar.style.width = `${(shown / total) * 100}%`;
  }

  function stopAuto(){
    if(autoTimer) clearInterval(autoTimer);
    autoTimer = null;
    autoButton.classList.remove("is-on");
  }

  function hideOverlays(){
    playerMenu.hidden = true;
    endingScreen.hidden = true;
  }

  function resetPlayer(){
    stopAuto();
    hideOverlays();
    ended = false;
    current = 0;
    sceneStack.innerHTML = "";
    sceneStack.style.setProperty("--latest-half", "0px");
    updateProgress();
  }

  function sceneFitClass(text){
    const explicitLines = Math.max(1, text.split("\n").length);
    const chars = [...text].length;

    if(explicitLines >= 8 || chars >= 190) return "fit-tight";
    if(explicitLines >= 6 || chars >= 145) return "fit-compact";
    if(explicitLines >= 4 || chars >= 105) return "fit-medium";
    return "";
  }

  function applyCinemaBackground(){
    const bg = $("#playerBackground");
    if(!bg) return;

    playerScreen.classList.remove("cinema-tone-dark","cinema-tone-light");
    if(selectedTheme === "cinema"){
      playerScreen.classList.add(`cinema-tone-${cinemaTone}`);
    }

    if(selectedTheme === "cinema" && cinemaBackgroundUrl){
      bg.style.backgroundImage = `url("${cinemaBackgroundUrl}")`;
      bg.classList.add("has-image");
    }else{
      bg.style.backgroundImage = "";
      bg.classList.remove("has-image");
    }
  }


  function updateLatestAnchor(){
    const latest = sceneStack.lastElementChild;
    if(!latest) return;

    // Wait until font/layout has settled, then anchor newest line by its actual height.
    requestAnimationFrame(() => {
      const h = latest.getBoundingClientRect().height || 0;
      sceneStack.style.setProperty("--latest-half", `${Math.max(0, h / 2)}px`);
    });
  }

  function renderCurrent(){
    if(current >= scenes.length) return false;

    const line = document.createElement("div");
    line.className = "scene-line";
    const fitClass = sceneFitClass(scenes[current]);
    if(fitClass) line.classList.add(fitClass);
    line.textContent = scenes[current];
    sceneStack.appendChild(line);

    requestAnimationFrame(() => line.classList.add("is-visible"));

    const all = [...sceneStack.children];
    all.forEach((el, i) => {
      el.classList.remove("age-1", "age-2", "age-3");
      const age = all.length - 1 - i;
      if(age === 1) el.classList.add("age-1");
      if(age === 2) el.classList.add("age-2");
      if(age >= 3) el.classList.add("age-3");
    });

    while(sceneStack.children.length > 4){
      sceneStack.removeChild(sceneStack.firstElementChild);
    }

    updateLatestAnchor();

    current += 1;
    updateProgress();
    return true;
  }

  function showEnding(){
    if(ended) return;
    stopAuto();
    ended = true;
    playerMenu.hidden = true;
    endingTitle.textContent = titleInput.value.trim() || "読了";
    endingScreen.hidden = false;
  }

  function advance(){
    if(ended) return;

    if(current < scenes.length){
      renderCurrent();
    }else{
      // Final line gets its own reading beat.
      // The next tap opens the ending screen.
      showEnding();
    }
  }

  function openPlayer(){
    const text = bodyInput.value.trim();
    if(!text){
      bodyInput.focus();
      return;
    }

    scenes = buildScenes(text);
    if(!scenes.length) return;

    playerTitle.textContent = titleInput.value.trim() || "Untitled";
    playerAuthor.textContent = authorInput.value.trim();

    playerScreen.className = `screen player-screen theme-${selectedTheme}`;
    applyCinemaBackground();
    editorScreen.hidden = true;
    playerScreen.hidden = false;
    document.body.style.overflow = "hidden";

    resetPlayer();
    renderCurrent();
  }

  function closePlayer(){
    stopAuto();
    hideOverlays();
    playerScreen.hidden = true;
    editorScreen.hidden = false;
    document.body.style.overflow = "";
  }

  function restartReading(){
    resetPlayer();
    renderCurrent();
  }

  function startAuto(){
    if(autoTimer || ended) return;
    autoButton.classList.add("is-on");
    autoTimer = setInterval(() => {
      if(current < scenes.length){
        renderCurrent();
      }else{
        showEnding();
      }
    }, 2600);
  }

  bodyInput.addEventListener("input", updateCount);

  $("#sampleButton").addEventListener("click", () => {
    titleInput.value = "声のそろう通り";
    bodyInput.value = SAMPLE;
    updateCount();
  });

  $$(".theme-card").forEach((card) => {
    card.addEventListener("click", () => applyTheme(card.dataset.theme));
  });

  $("#makeButton").addEventListener("click", openPlayer);

  // iPhone/Safari: touchend advances immediately.
  playerStage.addEventListener("touchend", (e) => {
    if(e.target.closest("button")) return;
    touchAdvancedAt = Date.now();
    e.preventDefault();
    advance();
  }, { passive:false });

  // Desktop and browsers where click is the primary activation.
  playerStage.addEventListener("click", (e) => {
    if(e.target.closest("button")) return;
    if(Date.now() - touchAdvancedAt < 700) return; // block ghost click
    advance();
  });

  playerStage.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      advance();
    }
  });

  $("#backButton").addEventListener("click", closePlayer);

  autoButton.addEventListener("click", (e) => {
    e.stopPropagation();
    autoTimer ? stopAuto() : startAuto();
  });

  $("#menuButton").addEventListener("click", (e) => {
    e.stopPropagation();
    playerMenu.hidden = false;
  });

  $("#restartButton").addEventListener("click", restartReading);
  $("#editButton").addEventListener("click", closePlayer);
  $("#closeMenuButton").addEventListener("click", () => {
    playerMenu.hidden = true;
  });

  $("#endingRestartButton").addEventListener("click", restartReading);
  $("#endingEditButton").addEventListener("click", closePlayer);

  const cinemaInput = $("#cinemaBackgroundInput");
  const cinemaPreview = $("#cinemaBackgroundPreview");
  const cinemaClear = $("#cinemaBackgroundClear");

  if(cinemaInput){
    cinemaInput.addEventListener("change", () => {
      const file = cinemaInput.files && cinemaInput.files[0];
      if(!file) return;

      if(cinemaBackgroundUrl) URL.revokeObjectURL(cinemaBackgroundUrl);
      cinemaBackgroundUrl = URL.createObjectURL(file);

      if(cinemaPreview){
        cinemaPreview.style.backgroundImage = `url("${cinemaBackgroundUrl}")`;
        cinemaPreview.hidden = false;
      }
      if(cinemaClear) cinemaClear.hidden = false;
    });
  }

  if(cinemaClear){
    cinemaClear.addEventListener("click", () => {
      if(cinemaBackgroundUrl) URL.revokeObjectURL(cinemaBackgroundUrl);
      cinemaBackgroundUrl = "";
      if(cinemaInput) cinemaInput.value = "";
      if(cinemaPreview){
        cinemaPreview.style.backgroundImage = "";
        cinemaPreview.hidden = true;
      }
      cinemaClear.hidden = true;
      applyCinemaBackground();
    });
  }

  $$(".cinema-tone-button").forEach((button) => {
    button.addEventListener("click", () => {
      cinemaTone = button.dataset.tone || "dark";
      $$(".cinema-tone-button").forEach((b) => {
        const selected = b.dataset.tone === cinemaTone;
        b.classList.toggle("is-selected", selected);
        b.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      applyCinemaBackground();
    });
  });

  applyTheme("light");
  updateCount();
})();