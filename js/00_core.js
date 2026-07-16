const cards = window.cards || [];
const mangaStories = window.mangaStories || [];

let appMode = "dictionary"; let mangaState = "list";
let mangaReadMode = "page";
let selectedMangaIndex = 0;
let cardIndex = 0;
let mangaStoryIndex = 0;
let mangaPageIndex = 0;
let cardFlipped = true;
let wordIndex = 0;
let glassIndex = 0;
let pressTimer = null;
const content = document.getElementById("content");

const els = {
  body: document.body,
  card: document.getElementById("card"),
  glassName: document.getElementById("glassName"),
  character: document.getElementById("character"),
  word: document.getElementById("word"),
  translation: document.getElementById("translation"),
  counter: document.getElementById("counter"),
  hint: document.getElementById("hint"),
  dictionaryView: document.getElementById("dictionaryView"),
  bugCardView: document.getElementById("bugCardView"),
  cardImage: document.getElementById("cardImage"),
  cardBackImage: document.getElementById("cardBackImage"),
  flipCard: document.getElementById("flipCard"),
  flowCard: document.getElementById("flowCard"),
  cardTitle: document.getElementById("cardTitle"),
  cardSubtitle: document.getElementById("cardSubtitle"),
  cardCaption: document.getElementById("cardCaption"),
  dictionaryMode: document.getElementById("dictionaryMode"),
  cardMode: document.getElementById("cardMode"),
  mangaMode: document.getElementById("mangaMode"),
  mangaListLayer: document.getElementById("mangaListLayer"),
  mangaChoiceLayer: document.getElementById("mangaChoiceLayer"),
  mangaChoiceTitle: document.getElementById("mangaChoiceTitle"),
  mangaBackToList: document.getElementById("mangaBackToList"),
  readPageMode: document.getElementById("readPageMode"),
  readWebtoonMode: document.getElementById("readWebtoonMode"),
  mangaReaderBack: document.getElementById("mangaReaderBack"),
  webtoonView: document.getElementById("webtoonView"),
  webtoonStrip: document.getElementById("webtoonStrip"),
  mangaAudio: document.getElementById("mangaAudio"),
  mangaFullscreenOverlay: document.getElementById("mangaFullscreenOverlay"),
  mangaFullscreenImage: document.getElementById("mangaFullscreenImage"),
  mangaFullscreenWebtoon: document.getElementById("mangaFullscreenWebtoon"),
  mangaView: document.getElementById("mangaView"),
  mangaPage: document.getElementById("mangaPage"),
  mangaImage: document.getElementById("mangaImage"),
  mangaIncomingImage: document.getElementById("mangaIncomingImage"),
  mangaTitle: document.getElementById("mangaTitle"),
  mangaCaption: document.getElementById("mangaCaption"),
  mangaText: document.getElementById("mangaText"),
  fullscreenOverlay: document.getElementById("fullscreenOverlay"),
  fullscreenCard: document.getElementById("fullscreenCard"),
  fullscreenFrontImage: document.getElementById("fullscreenFrontImage"),
  fullscreenBackImage: document.getElementById("fullscreenBackImage"),
  fullscreenFlowCard: document.getElementById("fullscreenFlowCard"),
  dialog: document.getElementById("glassDialog"),
  glassList: document.getElementById("glassList"),
};


function preloadCardImages() {
  cards.forEach(card => {
    const front = new Image();
    front.src = card.image;
    const back = new Image();
    back.src = card.back || "images/cards/card_back.png";
  });
}


function preloadMangaImages() {
  mangaStories.forEach(story => {
    if (story.thumb) {
      const t = new Image();
      t.src = story.thumb;
    }
    story.pages.forEach(page => {
      if (page.image) {
        const img = new Image();
        img.src = page.image;
      }
    });
  });
}


function init() {
  preloadCardImages();
  renderMangaList();
preloadMangaImages();
  renderMangaList();
  render();
  buildGlassList();
  bind();
}

function currentWord() { return data.words[wordIndex]; }
function currentGlass() { return data.glasses[glassIndex]; }


function renderMangaList() {
  const list = document.getElementById("mangaListView");
  if (!list) return;

  list.innerHTML = mangaStories.map((story, index) => {
    const thumb = story.thumb ? `<img src="${story.thumb}" alt="${story.title}">` : "";
    return `
      <button type="button" class="manga-item" data-index="${index}">
        <div class="manga-thumb">${thumb}</div>
        <div class="manga-meta">
          <div class="manga-title">${story.title}</div>
          <div class="manga-desc">${story.desc || ""}</div>
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll(".manga-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedMangaIndex = Number(item.dataset.index || 0);
      mangaStoryIndex = selectedMangaIndex;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      setMode("manga");
    });

    item.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedMangaIndex = Number(item.dataset.index || 0);
      mangaStoryIndex = selectedMangaIndex;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      setMode("manga");
    });
  });
}


function getCurrentMangaStory() {
  return mangaStories[mangaStoryIndex] || mangaStories[0];
}

function getStoryPagesAsImages(story) {
  if (Array.isArray(story.webtoon) && story.webtoon.length > 0) {
    return story.webtoon;
  }
  if (Array.isArray(story.pages)) {
    return story.pages
      .map(page => page.image)
      .filter(Boolean);
  }
  return [];
}

function renderWebtoon(story) {
  if (!els.webtoonStrip) return;

  const imagePages = getStoryPagesAsImages(story);

  if (!imagePages.length) {
    els.webtoonStrip.innerHTML = `
      <div style="padding:24px; color:rgba(255,255,255,.7); line-height:1.8;">
        Webtoon画像がまだ登録されていません。
      </div>
    `;
    return;
  }

  els.webtoonStrip.innerHTML = imagePages
    .map((src, index) => `<img src="${src}" alt="${story.title} ${index + 1}">`)
    .join("");

  if (els.webtoonView) {
    els.webtoonView.scrollTop = 0;
  }
}

function startMangaReader(mode) {
  mangaStoryIndex = selectedMangaIndex;
  mangaPageIndex = 0;
  mangaReadMode = mode;
  mangaState = "reader";

  const story = getCurrentMangaStory();
  if (mode === "webtoon") {
    renderWebtoon(story);
  }

  setMode("manga");
}

function backToMangaChoice() {
  // Choice/detail screen is disabled for MVP because it can trap users.
  mangaState = "list";
  setMode("manga");
}

function backToMangaList() {
  mangaState = "list";
  setMode("manga");
}

function toggleMangaAudio() {
  if (!els.mangaAudio) return;
  const story = getCurrentMangaStory();
  if (!story.audio) {
    render("flash");
    return;
  }
  if (els.mangaAudio.src !== story.audio) {
    els.mangaAudio.src = story.audio;
  }
  if (els.mangaAudio.paused) {
    els.mangaAudio.play().catch(() => {});
  } else {
    els.mangaAudio.pause();
  }
}



function updateControlLabels() {
  const prev = document.getElementById("prevGlass");
  const mid = document.getElementById("randomWord");
  const next = document.getElementById("nextGlass");
  if (!prev || !mid || !next) return;

  if (appMode === "manga" && mangaState === "reader") {
    prev.textContent = mangaReadMode === "page" ? "前ページ" : "上へ";
    mid.textContent = "再生/停止";
    next.textContent = mangaReadMode === "page" ? "次ページ" : "下へ";
  } else {
    prev.textContent = "前のメガネ";
    mid.textContent = "ランダム";
    next.textContent = "次のメガネ";
  }
}


function render(animationClass = "flash") {
  els.body.classList.toggle("mode-cards", appMode === "cards");
  els.body.classList.toggle("mode-dictionary", appMode === "dictionary");
  els.body.classList.toggle("mode-manga", appMode === "manga");
  els.body.classList.toggle("manga-list-state", appMode === "manga" && mangaState === "list");
  els.body.classList.toggle("manga-reader-state", appMode === "manga" && mangaState === "reader");
  els.body.classList.toggle("manga-choice-state", appMode === "manga" && mangaState === "choice");
  els.body.classList.toggle("conf-player-state", appMode === "manga" && mangaState === "reader");
  els.body.classList.toggle("reader-page", appMode === "manga" && mangaState === "reader" && mangaReadMode === "page");
  els.body.classList.toggle("reader-webtoon", appMode === "manga" && mangaState === "reader" && mangaReadMode === "webtoon");
  if (els.mangaListLayer) {
    els.mangaListLayer.hidden = !(appMode === "manga" && mangaState === "list");
  }
  if (els.mangaChoiceLayer) {
    els.mangaChoiceLayer.hidden = !(appMode === "manga" && mangaState === "choice");
  }
  if (els.mangaReaderBack) {
    els.mangaReaderBack.hidden = !(appMode === "manga" && mangaState === "reader");
  }

  if (els.dictionaryMode && els.cardMode) {
    els.dictionaryMode.classList.toggle("active", appMode === "dictionary");
    els.cardMode.classList.toggle("active", appMode === "cards");
    if (els.mangaMode) els.mangaMode.classList.toggle("active", appMode === "manga");
  }

  if (appMode === "cards") {
    const c = cards[cardIndex];
    els.cardImage.src = c.image;
    els.cardImage.alt = c.title;
    if (els.cardBackImage) {
      els.cardBackImage.src = c.back || "images/cards/card_back.png";
      els.cardBackImage.alt = `${c.title} 裏面`;
    }
    if (els.flipCard) {
      els.flipCard.classList.toggle("flipped", cardFlipped);
    }
    if (cardFlipped) {
      els.cardTitle.textContent = "？？？";
      els.cardSubtitle.textContent = "裏面｜左右でめくる";
      els.cardCaption.textContent = "タップで今日のカードを引く";
    } else {
      els.cardTitle.textContent = c.title;
      els.cardSubtitle.textContent = c.subtitle;
      els.cardCaption.textContent = c.caption;
    }
    els.counter.textContent = `${cardIndex + 1} / ${cards.length}`;
    if (els.hint) els.hint.textContent = "左右：めくる / タップ：今日のカード";
  } else if (appMode === "manga") {
    // MVP safety: never show the old choice/detail screen.
    // Past log items open the Conference player directly.
    if (mangaState === "choice") {
      mangaStoryIndex = selectedMangaIndex;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
    }
    if (mangaState === "list") {
      els.counter.textContent = `${mangaStories.length} conferences`;
      if (els.hint) els.hint.textContent = "Conferenceを選ぶ";
    } else if (mangaState === "choice") {
      const story = mangaStories[selectedMangaIndex];
      if (els.mangaChoiceTitle) els.mangaChoiceTitle.textContent = story.title;
      els.counter.textContent = "conference";
      if (els.hint) els.hint.textContent = "再生画面へ";
    } else {
      const story = mangaStories[mangaStoryIndex];
      if (mangaReadMode === "webtoon") {
        renderWebtoon(story);
        els.counter.textContent = "Webtoon";
        if (els.hint) els.hint.textContent = "縦スクロール / 戻るボタン";
      } else {
        const page = story.pages[mangaPageIndex];
        const isImagePage = !!page.image;
        if (els.mangaPage) els.mangaPage.classList.toggle("image-page", isImagePage);
        if (els.mangaImage) {
          if (isImagePage) {
            els.mangaImage.src = page.image;
            els.mangaImage.alt = `${story.title} ${mangaPageIndex + 1}`;
            els.mangaImage.hidden = false;
          } else {
            els.mangaImage.hidden = true;
            els.mangaImage.removeAttribute("src");
          }
        }
        els.mangaTitle.textContent = story.title;
        els.mangaCaption.textContent = page.caption || "";
        els.mangaText.textContent = page.text || "";
        els.counter.textContent = `${mangaPageIndex + 1} / ${story.pages.length}`;
        if (els.hint) els.hint.textContent = "中央ボタン：再生/停止";
      }
    }
  } else {
    const w = currentWord();
    const g = currentGlass();

    [...els.body.classList].forEach(cls => {
      if (cls.startsWith("theme-")) els.body.classList.remove(cls);
    });
    els.body.classList.add(`theme-${g.id}`);

    els.glassName.textContent = g.name;
    els.character.textContent = `${g.character}｜${g.tagline}`;
    els.word.textContent = w.word;

    // v-word-fit: 長い単語だけ自動で少し縮める
    // 例：メロンパンが「メロンパ / ン」に割れるのを防ぐ
    if (els.word) {
      const wordLen = String(w.word || "").length;
      els.word.classList.remove("word-fit-long", "word-fit-xlong", "word-fit-xxlong");
      if (wordLen >= 9) {
        els.word.classList.add("word-fit-xxlong");
      } else if (wordLen >= 7) {
        els.word.classList.add("word-fit-xlong");
      } else if (wordLen >= 5) {
        els.word.classList.add("word-fit-long");
      }
    }

    els.translation.textContent = w.translations[g.id] || "このメガネでは、まだ翻訳されていない。";
    els.counter.textContent = `${wordIndex + 1} / ${data.words.length}　・　${glassIndex + 1} / ${data.glasses.length}`;
    if (els.hint) els.hint.textContent = "左右：単語 / 上下：メガネ / 長押し：一覧";
  }

  updateControlLabels();

  if (content) {
    content.style.transform = "";
    content.classList.remove("dragging", "snap-back");
  }
  els.card.style.transform = "";
  els.card.classList.remove("flash", "slide-left", "slide-right", "slide-up", "slide-down", "peek-left", "peek-right", "peek-up", "peek-down", "snap-back");
  void els.card.offsetWidth;
  els.card.classList.add(animationClass);
  if (els.fullscreenOverlay && !els.fullscreenOverlay.hidden) {
    syncFullscreenCard();
  }
}
function moveWord(step) {
  wordIndex = (wordIndex + step + data.words.length) % data.words.length;
  render(step > 0 ? "slide-left" : "slide-right");
}

function moveGlass(step) {
  glassIndex = (glassIndex + step + data.glasses.length) % data.glasses.length;
  render(step > 0 ? "slide-up" : "slide-down");
}

function moveCard(step) {
  // シャッフル時は必ず裏面に戻す。表は絶対に見せない。
  cardFlipped = true;
  render(step > 0 ? "slide-up" : "slide-down");

  if (els.flipCard) {
    els.flipCard.classList.remove(
      "shuffle-next", "shuffle-prev", "deal-next", "deal-prev", "shuffling",
      "flow-up", "flow-down", "flow-in",
      "flow-up-safe", "flow-down-safe", "flowing"
    );
    void els.flipCard.offsetWidth;

    // 演出用の裏面カードだけを流す
    els.flipCard.classList.add("flowing");
    els.flipCard.classList.add(step > 0 ? "flow-up-safe" : "flow-down-safe");
  }

  // 流れている途中で中身だけ入れ替え。画面上は裏面なので表は見えない。
  setTimeout(() => {
    cardIndex = (cardIndex + step + cards.length) % cards.length;
    cardFlipped = true;
    render(step > 0 ? "slide-up" : "slide-down");
  }, 230);

  setTimeout(() => {
    if (els.flipCard) {
      els.flipCard.classList.remove("flow-up-safe", "flow-down-safe", "flowing");
    }
  }, 520);
}

function moveMangaPage(step) {
  const story = mangaStories[mangaStoryIndex];
  mangaPageIndex = (mangaPageIndex + step + story.pages.length) % story.pages.length;
  render(step > 0 ? "slide-left" : "slide-right");
}

function flipCurrentCard() {
  if (appMode !== "cards") return;
  cardFlipped = !cardFlipped; // 左右スワイプで表裏を切り替えて保持
  if (els.flipCard) {
    els.flipCard.classList.remove("flip-pop");
    void els.flipCard.offsetWidth;
    els.flipCard.classList.add("flip-pop");
  }
  render("flash");
}

function randomWord() {
  if (appMode === "cards") {
    cardIndex = Math.floor(Math.random() * cards.length);
    cardFlipped = true;
  } else if (appMode === "manga") {
    const story = mangaStories[mangaStoryIndex];
    mangaPageIndex = Math.floor(Math.random() * story.pages.length);
  } else {
    wordIndex = Math.floor(Math.random() * data.words.length);
  }
  render("flash");
}

function setMode(mode) {
  appMode = mode;
  if (mode === "cards") cardFlipped = true;
  if (mode === "manga" && mangaState !== "reader" && mangaState !== "choice") mangaState = "list";
  render("flash");
}

function syncFullscreenCard() {
  if (!els.fullscreenCard || !els.fullscreenFrontImage || !els.fullscreenBackImage) return;
  const c = cards[cardIndex];
  els.fullscreenFrontImage.src = c.image;
  els.fullscreenFrontImage.alt = c.title;
  els.fullscreenBackImage.src = c.back || "images/cards/card_back.png";
  els.fullscreenBackImage.alt = `${c.title} 裏面`;
  els.fullscreenCard.classList.toggle("flipped", cardFlipped);
}

function openFullscreenCard() {
  if (appMode !== "cards" || !els.fullscreenOverlay) return;
  syncFullscreenCard();
  els.fullscreenOverlay.hidden = false;
}

function closeFullscreenCard() {
  if (els.fullscreenOverlay) els.fullscreenOverlay.hidden = true;
}

function flipFullscreenCard() {
  cardFlipped = !cardFlipped;
  syncFullscreenCard();
  if (els.fullscreenCard) {
    els.fullscreenCard.classList.remove("flip-pop");
    void els.fullscreenCard.offsetWidth;
    els.fullscreenCard.classList.add("flip-pop");
  }
  render("flash");
}

function moveFullscreenCard(step) {
  cardFlipped = true;
  syncFullscreenCard();

  if (els.fullscreenCard) {
    els.fullscreenCard.classList.remove("flow-up-safe", "flow-down-safe", "flowing");
    void els.fullscreenCard.offsetWidth;
    els.fullscreenCard.classList.add("flowing");
    els.fullscreenCard.classList.add(step > 0 ? "flow-up-safe" : "flow-down-safe");
  }

  setTimeout(() => {
    cardIndex = (cardIndex + step + cards.length) % cards.length;
    cardFlipped = true;
    syncFullscreenCard();
    render(step > 0 ? "slide-up" : "slide-down");
  }, 230);

  setTimeout(() => {
    if (els.fullscreenCard) {
      els.fullscreenCard.classList.remove("flow-up-safe", "flow-down-safe", "flowing");
    }
  }, 540);
}


function buildGlassList() {
  els.glassList.innerHTML = "";
  data.glasses.forEach((g, i) => {
    const btn = document.createElement("button");
    btn.className = "glass-item";
    btn.innerHTML = `<strong>${g.name}：${g.character}</strong><span>${g.tagline}</span>`;
    btn.addEventListener("click", () => {
      glassIndex = i;
      els.dialog.close();
      render();
    });
    els.glassList.appendChild(btn);
  });
}


function openMangaFullscreen(src, alt = "") {
  if (!els.mangaFullscreenOverlay || !els.mangaFullscreenImage || !src) return;
  els.mangaFullscreenImage.src = src;
  els.mangaFullscreenImage.alt = alt;
  els.mangaFullscreenOverlay.hidden = false;
}

function closeMangaFullscreen() {
  if (els.mangaFullscreenOverlay) els.mangaFullscreenOverlay.hidden = true;
}



function bind() {
  
  
  document.getElementById("prevWord").onclick = () => moveWord(-1);
  document.getElementById("nextWord").onclick = () => moveWord(1);
  document.getElementById("prevGlass").onclick = () => {
    if (appMode === "manga" && mangaState === "reader" && mangaReadMode === "page") {
      moveMangaPage(-1);
    } else if (appMode === "manga" && mangaState === "reader" && mangaReadMode === "webtoon" && els.webtoonView) {
      els.webtoonView.scrollBy({ top: -Math.floor(els.webtoonView.clientHeight * 0.85), behavior: "smooth" });
    } else {
      moveGlass(-1);
    }
  };
  document.getElementById("nextGlass").onclick = () => {
    if (appMode === "manga" && mangaState === "reader" && mangaReadMode === "page") {
      moveMangaPage(1);
    } else if (appMode === "manga" && mangaState === "reader" && mangaReadMode === "webtoon" && els.webtoonView) {
      els.webtoonView.scrollBy({ top: Math.floor(els.webtoonView.clientHeight * 0.85), behavior: "smooth" });
    } else {
      moveGlass(1);
    }
  };
  document.getElementById("randomWord").onclick = () => {
    if (appMode === "manga" && mangaState === "reader") {
      toggleMangaAudio();
    } else {
      randomWord();
    }
  };
  if (els.dictionaryMode) els.dictionaryMode.onclick = () => setMode("dictionary");
  if (els.cardMode) els.cardMode.onclick = () => setMode("cards");
  if (els.mangaMode) els.mangaMode.onclick = () => {
    mangaState = "list";
    setMode("manga");
  };

  if (els.mangaBackToList) els.mangaBackToList.onclick = backToMangaList;
  if (els.mangaReaderBack) els.mangaReaderBack.onclick = backToMangaChoice;
  if (els.readPageMode) els.readPageMode.onclick = () => startMangaReader("page");
  if (els.readWebtoonMode) els.readWebtoonMode.onclick = () => startMangaReader("webtoon");


  const mangaListView = document.getElementById("mangaListView");
  if (mangaListView && !mangaListView.dataset.bound) {
    mangaListView.dataset.bound = "1";
    mangaListView.addEventListener("click", (e) => {
      const item = e.target.closest(".manga-item");
      if (!item) return;

      selectedMangaIndex = Number(item.dataset.index || 0);
      mangaStoryIndex = selectedMangaIndex;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      setMode("manga");
    });
  }

  document.getElementById("closeDialog").onclick = () => els.dialog.close();

  // v24: 長押しでブラウザのテキスト選択/メニューを出さない
  els.card.addEventListener("contextmenu", (e) => e.preventDefault());
  els.card.addEventListener("selectstart", (e) => e.preventDefault());
  if (els.fullscreenOverlay) {
    let fsStartX = 0, fsStartY = 0, fsMoved = false;

    els.fullscreenOverlay.addEventListener("pointerdown", (e) => {
      fsStartX = e.clientX;
      fsStartY = e.clientY;
      fsMoved = false;
    });

    let fsLastTap = 0;

    els.fullscreenOverlay.addEventListener("pointerup", (e) => {
      const dx = e.clientX - fsStartX;
      const dy = e.clientY - fsStartY;
      const distance = Math.max(Math.abs(dx), Math.abs(dy));

      const now = Date.now();

      // ダブルタップで閉じる
      if (distance < 20) {
        if (now - fsLastTap < 300) {
          closeFullscreenCard();
          fsLastTap = 0;
          return;
        } else {
          fsLastTap = now;
          return;
        }
      }

      if (Math.abs(dy) > Math.abs(dx)) {
        moveFullscreenCard(dy < 0 ? 1 : -1);
      } else {
        flipFullscreenCard();
      }
    });
  }

  let lastTapTime = 0;
  els.card.addEventListener("click", () => {
    if (appMode !== "cards") return;
    const now = Date.now();
    if (now - lastTapTime < 320) {
      openFullscreenCard();
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  });

  let startX = 0, startY = 0, isDragging = false, lastDx = 0, lastDy = 0, lockedDirection = null;

  els.card.addEventListener("pointerdown", (e) => {
    // v36: マンガ画像タップは親カードのスワイプ処理に渡さない
    if (
      appMode === "manga" &&
      mangaState === "reader" &&
      e.target &&
      e.target.tagName === "IMG" &&
      (e.target.classList.contains("manga-image") || e.target.closest(".webtoon-strip"))
    ) {
      return;
    }

    startX = e.clientX;
    startY = e.clientY;
    lastDx = 0;
    lastDy = 0;
    lockedDirection = null;
    isDragging = true;
    els.card.setPointerCapture(e.pointerId);
    if (content) {
      content.classList.remove("snap-back");
      content.style.transform = "";
    }
    pressTimer = setTimeout(() => {
      if (appMode !== "dictionary") return; // 長押し一覧は辞書モードだけ
      isDragging = false;
      lockedDirection = null;
      els.card.classList.remove("dragging", "peek-left", "peek-right", "peek-up", "peek-down");
      if (content) {
        content.classList.remove("dragging");
        content.style.transform = "";
      }
      els.dialog.showModal();
    }, 550);
  });

  els.card.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    lastDx = dx;
    lastDy = dy;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));

    if (appMode !== "dictionary") {
      clearTimeout(pressTimer);
    }

    if (distance > 10) {
      clearTimeout(pressTimer);
      els.card.classList.add("dragging");
      if (content) content.classList.add("dragging");
    }

    els.card.classList.remove("peek-left", "peek-right", "peek-up", "peek-down");

    if (distance > 18) {
      if (Math.abs(dx) > Math.abs(dy)) {
        els.card.classList.add(dx < 0 ? "peek-left" : "peek-right");
      } else {
        els.card.classList.add(dy < 0 ? "peek-up" : "peek-down");
      }
    }

    if (content) {
      // v8: 斜めブレ防止。一定距離を超えたら方向をロック
      if (!lockedDirection && distance > 16) {
        lockedDirection = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }

      let followX = 0;
      let followY = 0;

      if (lockedDirection === "x") {
        followX = Math.max(-76, Math.min(76, dx * 0.38));
      } else if (lockedDirection === "y") {
        // iPhone縦スクロール時に上部ボタン層まで動いて見えるため、
        // 縦方向の追従アニメは無効化。判定自体は pointerup 側で維持。
        followY = 0;
      }

      const scale = 1 - Math.min(distance, 150) / 5200;
      content.style.transform = `translate(${followX}px, ${followY}px) scale(${scale})`;
    }
  });

  els.card.addEventListener("pointerup", (e) => {
    clearTimeout(pressTimer);
    if (!isDragging) return;
    isDragging = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));

    els.card.classList.remove("dragging", "peek-left", "peek-right", "peek-up", "peek-down");
    if (content) content.classList.remove("dragging");

    if (distance < 58) {
      if (content) {
        let followX = 0;
        let followY = 0;

        if (lockedDirection === "x") {
          followX = Math.max(-76, Math.min(76, lastDx * 0.38));
        } else if (lockedDirection === "y") {
          followY = 0;
        }

        const scale = 1 - Math.min(distance, 150) / 5200;

        content.style.setProperty(
          "--release-transform",
          `translate(${followX}px, ${followY}px) scale(${scale})`
        );

        content.style.transform = "";
        content.classList.remove("snap-back");
        void content.offsetWidth;
        content.classList.add("snap-back");
      }
      lockedDirection = null;
      return;
    }

    lockedDirection = null;
    if (content) content.style.transform = "";

    if (appMode === "manga") {
      if (mangaState === "reader" && mangaReadMode === "page") {
        if (Math.abs(dx) >= Math.abs(dy)) {
          moveMangaPage(dx < 0 ? 1 : -1);
        } else {
          render("flash");
        }
      } else {
        render("flash");
      }
    } else if (appMode === "cards") {
      if (Math.abs(dy) > Math.abs(dx)) {
        moveCard(dy < 0 ? 1 : -1); // 上下はカード切替。移動後は裏面。
      } else {
        flipCurrentCard(); // 左右は表裏切替。勝手には戻らない。
      }
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        moveWord(dx < 0 ? 1 : -1);
      } else {
        moveGlass(dy < 0 ? 1 : -1);
      }
    }
  });

  els.card.addEventListener("pointercancel", () => {
    clearTimeout(pressTimer);
    isDragging = false;
    lockedDirection = null;
    els.card.classList.remove("dragging", "peek-left", "peek-right", "peek-up", "peek-down");
    if (content) {
      content.classList.remove("dragging");
      content.style.transform = "";
      content.classList.remove("snap-back");
      void content.offsetWidth;
      content.classList.add("snap-back");
    }
  });

  window.addEventListener("keydown", (e) => {
    if (appMode === "manga") {
      if (mangaState === "reader" && mangaReadMode === "page") {
        if (e.key === "ArrowRight") moveMangaPage(1);
        if (e.key === "ArrowLeft") moveMangaPage(-1);
      }
    } else if (appMode === "cards") {
      if (e.key === "ArrowUp") moveCard(1);
      if (e.key === "ArrowDown") moveCard(-1);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        flipCurrentCard();
      }
    } else {
      if (e.key === "ArrowRight") moveWord(1);
      if (e.key === "ArrowLeft") moveWord(-1);
      if (e.key === "ArrowUp") moveGlass(1);
      if (e.key === "ArrowDown") moveGlass(-1);
    }
  });
}

init();
