/* 140_world_search.js v10 safe-no-plus
 * メガネ辞書 → 外の世界へ
 *
 * - SVGアイコン（./icons/*.svg）
 * - カード外配置で音声タップ／スワイプと分離
 * - 検索ボタンと＋をカード座標へ追従
 * - メガネ色の接続アニメーション
 * - モバイルの二重発火防止
 * - 外部ページを先に確保してからアニメーション後に遷移
 */
(() => {
  "use strict";

  const BUTTON_ID = "worldSearchButton";
  const STYLE_ID = "worldSearchStyleV10";
  const ANIMATION_MS = 260;

  let lastOpenAt = 0;
  let rafId = 0;
  let animationTimer = 0;

  const TARGETS = {
    gag: {
      icon: "./icons/zurea_search.svg",
      label: "世間を見る",
      destination: "Google",
      color: "#ffd08a",
      buildUrl: word =>
        `https://www.google.com/search?q=${encodeURIComponent(word)}`
    },
    happy: {
      icon: "./icons/querina_camera.svg",
      label: "表現を見る",
      destination: "画像検索",
      color: "#ffb8d8",
      buildUrl: word =>
        `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(word)}`
    },
    math: {
      icon: "./icons/zelis_book.svg",
      label: "定義を読む",
      destination: "Wikipedia",
      color: "#9fcaff",
      buildUrl: word =>
        `https://ja.wikipedia.org/w/index.php?search=${encodeURIComponent(word)}`
    },
    hacker: {
      icon: "./icons/nyx_globe.svg",
      label: "構造を探る",
      destination: "Google",
      color: "#8fffc7",
      buildUrl: word =>
        `https://www.google.com/search?q=${encodeURIComponent(`${word} 仕組み 技術`)}`
    }
  };

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        --world-color: #ffffff;
        position: fixed;
        z-index: 2147483000;
        width: 46px;
        height: 46px;
        padding: 0;
        border: 1px solid color-mix(in srgb, var(--world-color) 28%, transparent);
        border-radius: 50%;
        display: grid;
        place-items: center;
        overflow: visible;

        background:
          radial-gradient(circle at 38% 30%,
            color-mix(in srgb, var(--world-color) 13%, transparent),
            rgba(6,8,13,.38) 66%);
        color: var(--world-color);
        box-shadow:
          0 10px 26px rgba(0,0,0,.24),
          inset 0 0 0 1px rgba(255,255,255,.025);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);

        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent;
        -webkit-user-select: none;
        user-select: none;
        cursor: pointer;
        transform: translateZ(0);
        transition:
          transform .16s cubic-bezier(.2,.8,.2,1),
          border-color .18s ease,
          box-shadow .18s ease,
          background .18s ease;
      }

      #${BUTTON_ID}[hidden] {
        display: none !important;
      }

      #${BUTTON_ID} .world-search-icon {
        width: 25px;
        height: 25px;
        display: block;
        pointer-events: none;
        object-fit: contain;
        transform-origin: 50% 50%;
        filter: drop-shadow(0 0 7px color-mix(in srgb, var(--world-color) 24%, transparent));
      }

      #${BUTTON_ID} .world-search-ring {
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        border: 1px solid transparent;
        pointer-events: none;
      }

      #${BUTTON_ID} .world-search-status {
        position: absolute;
        left: 52px;
        top: 50%;
        transform: translateY(-50%) translateX(-4px);
        width: max-content;
        max-width: 160px;
        padding: 6px 9px;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 999px;
        background: rgba(8,10,16,.78);
        color: rgba(255,255,255,.86);
        box-shadow: 0 8px 24px rgba(0,0,0,.24);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        font-size: 10px;
        font-weight: 750;
        line-height: 1;
        letter-spacing: .04em;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity .16s ease, transform .16s ease;
      }

      #${BUTTON_ID}:hover .world-search-status,
      #${BUTTON_ID}:focus-visible .world-search-status {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }

      #${BUTTON_ID}:active:not(.is-connecting) {
        transform: scale(.92);
      }

      #${BUTTON_ID}.is-connecting {
        transform: scale(.94);
        border-color: color-mix(in srgb, var(--world-color) 74%, white 8%);
        background:
          radial-gradient(circle,
            color-mix(in srgb, var(--world-color) 26%, transparent),
            rgba(6,8,13,.48) 68%);
        box-shadow:
          0 0 0 5px color-mix(in srgb, var(--world-color) 8%, transparent),
          0 0 24px color-mix(in srgb, var(--world-color) 44%, transparent),
          0 12px 30px rgba(0,0,0,.32);
      }

      #${BUTTON_ID}.is-connecting .world-search-icon {
        animation: worldIconConnect ${ANIMATION_MS}ms cubic-bezier(.2,.82,.2,1) both;
      }

      #${BUTTON_ID}.is-connecting .world-search-ring {
        animation: worldRingConnect ${ANIMATION_MS}ms ease-out both;
      }

      #${BUTTON_ID}.is-connecting .world-search-status {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
        color: var(--world-color);
      }

      @keyframes worldIconConnect {
        0%   { transform: rotate(0deg) scale(1); opacity: 1; }
        35%  { transform: rotate(-18deg) scale(.76); opacity: .72; }
        72%  { transform: rotate(300deg) scale(1.16); opacity: 1; }
        100% { transform: rotate(360deg) scale(1); opacity: 1; }
      }

      @keyframes worldRingConnect {
        0%   {
          transform: scale(.82);
          opacity: 0;
          border-color: var(--world-color);
        }
        40%  { opacity: .9; }
        100% {
          transform: scale(1.48);
          opacity: 0;
          border-color: var(--world-color);
        }
      }

      @media (max-width: 420px) {
        #${BUTTON_ID} {
          width: 43px;
          height: 43px;
        }

        #${BUTTON_ID} .world-search-icon {
          width: 23px;
          height: 23px;
        }

        #${BUTTON_ID} .world-search-status {
          left: 49px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${BUTTON_ID},
        #${BUTTON_ID} *,
        #${BUTTON_ID}::before,
        #${BUTTON_ID}::after {
          animation-duration: .01ms !important;
          transition-duration: .01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getWordText() {
    try {
      if (typeof window.currentWord === "function") {
        const word = window.currentWord();
        if (word && word.word) return String(word.word).trim();
      }
    } catch (_) {}

    const el = document.getElementById("word");
    return el ? String(el.textContent || "").trim() : "";
  }

  function getGlassId() {
    try {
      if (typeof window.currentGlass === "function") {
        const glass = window.currentGlass();
        if (glass && glass.id) return String(glass.id);
      }
    } catch (_) {}

    const themeClass = Array.from(document.body.classList)
      .find(name => name.startsWith("theme-"));

    return themeClass ? themeClass.slice(6) : "";
  }

  function isSelfGlassActive() {
    if (document.body.classList.contains("self-glass-active")) return true;

    try {
      return typeof window.MEGANE_SELF_GLASS_IS_ACTIVE === "function" &&
        Boolean(window.MEGANE_SELF_GLASS_IS_ACTIVE());
    } catch (_) {
      return false;
    }
  }

  function isDictionaryVisible() {
    return document.body.classList.contains("mode-dictionary") &&
      !isSelfGlassActive();
  }

  function getCardRect() {
    const card =
      document.getElementById("card") ||
      document.querySelector(".card");

    return card ? card.getBoundingClientRect() : null;
  }

  function positionButton() {
    const button = document.getElementById(BUTTON_ID);
    const rect = getCardRect();

    if (!button || !rect || button.hidden) return;

    const compact = window.matchMedia("(max-width: 420px)").matches;
    const size = compact ? 43 : 46;
    const insetX = compact ? 12 : 16;
    const insetY = compact ? 11 : 14;

    button.style.left = `${Math.round(rect.left + insetX)}px`;
    button.style.top = `${Math.round(rect.bottom - insetY - size)}px`;
  }

  // v10:
  // ＋ボタンには一切触れない。
  // 検索ボタンだけをカード座標へ追従させる。
  function positionAll() {
    positionButton();
  }

  function schedulePosition() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(positionAll);
  }

  function updateButton() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;

    const glassId = getGlassId();
    const target = TARGETS[glassId];
    const word = getWordText();
    const visible = Boolean(target && word && isDictionaryVisible());

    button.hidden = !visible;
    if (!visible) return;

    button.dataset.glass = glassId;
    button.dataset.label = target.label;
    button.dataset.destination = target.destination;
    button.style.setProperty("--world-color", target.color);

    const icon = button.querySelector(".world-search-icon");
    if (icon && icon.getAttribute("src") !== target.icon) {
      icon.setAttribute("src", target.icon);
    }

    const status = button.querySelector(".world-search-status");
    if (status && !button.classList.contains("is-connecting")) {
      status.textContent = target.label;
    }

    button.setAttribute(
      "aria-label",
      `${word}を${target.destination}で${target.label}`
    );
    button.title = `${word}｜${target.label}`;

    schedulePosition();
  }

  function stopEvent(event) {
    if (!event) return;

    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function triggerHaptic() {
    try {
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
    } catch (_) {}
  }

  function logAnalytics(word, glassId, destination) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "world_search", {
          search_term: word,
          glass_id: glassId,
          destination
        });
      }
    } catch (_) {}
  }

  function finishNavigation(popup, url) {
    if (popup && !popup.closed) {
      try {
        popup.location.replace(url);
        return;
      } catch (_) {
        try {
          popup.location.href = url;
          return;
        } catch (_) {}
      }
    }

    window.location.assign(url);
  }

  function openCurrentWorld(event) {
    stopEvent(event);

    const now = Date.now();
    if (now - lastOpenAt < 700) return;
    lastOpenAt = now;

    const button = document.getElementById(BUTTON_ID);
    const glassId = getGlassId();
    const word = getWordText();
    const target = TARGETS[glassId];

    if (!button || !target || !word) return;

    const url = target.buildUrl(word);

    // ユーザー操作の瞬間に外部ページ枠を確保。
    // アニメーション後の window.open がポップアップ扱いされるのを防ぐ。
    let popup = null;
    try {
      popup = window.open("about:blank", "_blank");
      if (popup) popup.opener = null;
    } catch (_) {
      popup = null;
    }

    triggerHaptic();
    logAnalytics(word, glassId, target.destination);

    clearTimeout(animationTimer);
    button.classList.remove("is-connecting");
    void button.offsetWidth;

    const status = button.querySelector(".world-search-status");
    if (status) status.textContent = "世界へ接続中";

    button.classList.add("is-connecting");

    animationTimer = window.setTimeout(() => {
      button.classList.remove("is-connecting");
      if (status) status.textContent = target.label;
      finishNavigation(popup, url);
    }, ANIMATION_MS);
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.hidden = true;

    const icon = document.createElement("img");
    icon.className = "world-search-icon";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.draggable = false;

    const ring = document.createElement("span");
    ring.className = "world-search-ring";
    ring.setAttribute("aria-hidden", "true");

    const status = document.createElement("span");
    status.className = "world-search-status";
    status.setAttribute("aria-hidden", "true");

    button.append(icon, ring, status);
    document.body.appendChild(button);

    // カード側へイベントを渡さない。
    ["pointerdown", "touchstart", "mousedown"].forEach(type => {
      button.addEventListener(type, stopEvent, {
        capture: true,
        passive: false
      });
    });

    // 最初に到達したreleaseイベントだけが実行される。
    button.addEventListener("pointerup", openCurrentWorld, {
      capture: true,
      passive: false
    });
    button.addEventListener("touchend", openCurrentWorld, {
      capture: true,
      passive: false
    });
    button.addEventListener("mouseup", openCurrentWorld, {
      capture: true,
      passive: false
    });
    button.addEventListener("click", openCurrentWorld, {
      capture: true,
      passive: false
    });

    updateButton();
  }

  function observeChanges() {
    const observer = new MutationObserver(() => {
      updateButton();
      schedulePosition();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });

    const word = document.getElementById("word");
    const glassName = document.getElementById("glassName");

    if (word) {
      observer.observe(word, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    if (glassName) {
      observer.observe(glassName, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    ["resize", "orientationchange", "scroll", "pageshow", "focus"].forEach(type => {
      window.addEventListener(type, () => {
        updateButton();
        schedulePosition();
      }, { passive: true });
    });

    // 単語・メガネ・画面サイズの変化に検索ボタンだけを再同期する。
    window.setInterval(() => {
      updateButton();
      schedulePosition();
    }, 350);
  }

  function initWorldSearch() {
    addStyle();
    createButton();
    observeChanges();
    updateButton();
    schedulePosition();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorldSearch, {
      once: true
    });
  } else {
    initWorldSearch();
  }
})();
