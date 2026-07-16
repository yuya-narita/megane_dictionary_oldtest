/* 140_world_search.js v13 dictionary-only animation-plus
 * 辞書モード専用・完全隔離版
 *
 * - 辞書モード中だけボタンをDOMへ追加
 * - カード／音楽／会議へ移動したらボタンをDOMから完全削除
 * - setInterval不使用
 * - ＋ボタンには一切触れない
 * - カードモード中はカード座標も取得しない
 */
(() => {
  "use strict";

  const BUTTON_ID = "worldSearchButton";
  const STYLE_ID = "worldSearchStyleV13";
  const ANIMATION_MS = 440;

  const TARGETS = {
    gag: {
      icon: "./icons/zurea_search.svg",
      color: "#ffd08a",
      label: "世間を見る",
      destination: "Google",
      url(word) {
        return `https://www.google.com/search?q=${encodeURIComponent(word)}`;
      }
    },
    happy: {
      icon: "./icons/querina_camera.svg",
      color: "#ffb8d8",
      label: "表現を見る",
      destination: "画像検索",
      url(word) {
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(word)}`;
      }
    },
    math: {
      icon: "./icons/zelis_book.svg",
      color: "#9fcaff",
      label: "定義を読む",
      destination: "Wikipedia",
      url(word) {
        return `https://ja.wikipedia.org/w/index.php?search=${encodeURIComponent(word)}`;
      }
    },
    hacker: {
      icon: "./icons/nyx_globe.svg",
      color: "#8fffc7",
      label: "構造を探る",
      destination: "Google",
      url(word) {
        return `https://www.google.com/search?q=${encodeURIComponent(`${word} 仕組み 技術`)}`;
      }
    }
  };

  let resizeBound = false;
  let raf = 0;
  let lastOpen = 0;

  function isDictionaryMode() {
    return document.body.classList.contains("mode-dictionary") &&
      !document.body.classList.contains("self-glass-active");
  }

  function glassId() {
    const cls = Array.from(document.body.classList)
      .find(name => name.startsWith("theme-"));
    return cls ? cls.slice(6) : "";
  }

  function wordText() {
    const word = document.getElementById("word");
    return word ? String(word.textContent || "").trim() : "";
  }

  function cardRect() {
    // この関数は辞書モード中にしか呼ばない。
    const card = document.getElementById("card");
    return card ? card.getBoundingClientRect() : null;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{
        --world-color:#fff;
        position:fixed;
        z-index:2147483000;
        width:43px;
        height:43px;
        padding:0;
        margin:0;
        display:grid;
        place-items:center;
        overflow:visible;
        border:1px solid color-mix(in srgb,var(--world-color) 32%,transparent);
        border-radius:50%;
        background:radial-gradient(
          circle at 38% 30%,
          color-mix(in srgb,var(--world-color) 14%,transparent),
          rgba(6,8,13,.42) 68%
        );
        color:var(--world-color);
        box-shadow:
          0 10px 26px rgba(0,0,0,.24),
          0 0 15px color-mix(in srgb,var(--world-color) 13%,transparent);
        -webkit-backdrop-filter:blur(9px);
        backdrop-filter:blur(9px);
        touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
        cursor:pointer;
        transform:translateZ(0);
      }

      #${BUTTON_ID}::before,
      #${BUTTON_ID}::after{
        content:"";
        position:absolute;
        inset:-2px;
        border-radius:50%;
        border:1px solid var(--world-color);
        opacity:0;
        pointer-events:none;
      }

      #${BUTTON_ID} img{
        display:block;
        width:23px;
        height:23px;
        object-fit:contain;
        pointer-events:none;
        filter:drop-shadow(0 0 5px color-mix(in srgb,var(--world-color) 36%,transparent));
      }

      #${BUTTON_ID} .world-search-launch{
        position:absolute;
        left:52px;
        top:50%;
        transform:translateY(-50%) translateX(-5px);
        width:max-content;
        padding:6px 10px;
        border:1px solid color-mix(in srgb,var(--world-color) 26%,transparent);
        border-radius:999px;
        background:rgba(8,10,16,.82);
        color:var(--world-color);
        font-size:10px;
        font-weight:850;
        letter-spacing:.08em;
        white-space:nowrap;
        opacity:0;
        pointer-events:none;
        box-shadow:0 8px 24px rgba(0,0,0,.28);
        -webkit-backdrop-filter:blur(8px);
        backdrop-filter:blur(8px);
      }

      #${BUTTON_ID}.connecting{
        animation:worldButtonPulse ${ANIMATION_MS}ms cubic-bezier(.18,.9,.2,1) both;
      }

      #${BUTTON_ID}.connecting::before{
        animation:worldRingBurst ${ANIMATION_MS}ms ease-out both;
      }

      #${BUTTON_ID}.connecting::after{
        animation:worldRingBurst2 ${ANIMATION_MS}ms ease-out both;
      }

      #${BUTTON_ID}.connecting img{
        animation:worldIconSpin ${ANIMATION_MS}ms cubic-bezier(.16,.84,.22,1) both;
      }

      #${BUTTON_ID}.connecting .world-search-launch{
        animation:worldLaunchText ${ANIMATION_MS}ms ease-out both;
      }

      @keyframes worldButtonPulse{
        0%{
          transform:scale(1);
          filter:brightness(1);
          box-shadow:0 10px 26px rgba(0,0,0,.24);
        }
        24%{
          transform:scale(.82);
          filter:brightness(1.28);
          box-shadow:0 0 12px var(--world-color);
        }
        58%{
          transform:scale(1.14);
          filter:brightness(1.48);
          box-shadow:
            0 0 0 6px color-mix(in srgb,var(--world-color) 12%,transparent),
            0 0 34px var(--world-color);
        }
        100%{
          transform:scale(1);
          filter:brightness(1);
          box-shadow:0 10px 26px rgba(0,0,0,.24);
        }
      }

      @keyframes worldIconSpin{
        0%{transform:rotate(0deg) scale(1);opacity:1}
        22%{transform:rotate(-28deg) scale(.66);opacity:.62}
        64%{transform:rotate(330deg) scale(1.26);opacity:1}
        100%{transform:rotate(360deg) scale(1);opacity:1}
      }

      @keyframes worldRingBurst{
        0%{transform:scale(.7);opacity:0}
        22%{opacity:.95}
        100%{transform:scale(1.75);opacity:0}
      }

      @keyframes worldRingBurst2{
        0%{transform:scale(.84);opacity:0}
        38%{opacity:.62}
        100%{transform:scale(2.25);opacity:0}
      }

      @keyframes worldLaunchText{
        0%,12%{opacity:0;transform:translateY(-50%) translateX(-8px)}
        30%,72%{opacity:1;transform:translateY(-50%) translateX(0)}
        100%{opacity:0;transform:translateY(-50%) translateX(5px)}
      }

      @media(prefers-reduced-motion:reduce){
        #${BUTTON_ID},
        #${BUTTON_ID} img{animation-duration:.01ms!important}
      }
    `;
    document.head.appendChild(style);
  }

  function removeButton() {
    cancelAnimationFrame(raf);
    raf = 0;

    const button = document.getElementById(BUTTON_ID);
    if (button) button.remove();
  }

  function positionButton() {
    if (!isDictionaryMode()) {
      removeButton();
      return;
    }

    const button = document.getElementById(BUTTON_ID);
    const rect = cardRect();
    if (!button || !rect) return;

    const size = 43;
    const leftInset = 12;
    const bottomInset = 19;

    button.style.left = `${Math.round(rect.left + leftInset)}px`;
    button.style.top = `${Math.round(rect.bottom - bottomInset - size)}px`;
  }

  function schedulePosition() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(positionButton);
  }

  function stopStartPropagation(event) {
    // 開始イベントで preventDefault() すると、iPhone Safariでは
    // 後続のclick自体が生成されないことがある。
    // ここではカード側への伝播だけを止める。
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function stopActivation(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }

  function openWorld(event) {
    stopActivation(event);

    const now = Date.now();
    if (now - lastOpen < 700) return;
    lastOpen = now;

    if (!isDictionaryMode()) return;

    const id = glassId();
    const target = TARGETS[id];
    const word = wordText();
    const button = document.getElementById(BUTTON_ID);

    if (!target || !word || !button) return;

    let popup = null;
    try {
      popup = window.open("about:blank", "_blank");
      if (popup) popup.opener = null;
    } catch (_) {}

    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (_) {}

    try {
      if (window.gtag) {
        window.gtag("event", "world_search", {
          search_term: word,
          glass_id: id,
          destination: target.destination
        });
      }
    } catch (_) {}

    button.classList.remove("connecting");
    void button.offsetWidth;
    button.classList.add("connecting");

    const url = target.url(word);

    window.setTimeout(() => {
      if (popup && !popup.closed) {
        try {
          popup.location.replace(url);
          return;
        } catch (_) {}
      }
      window.location.assign(url);
    }, ANIMATION_MS);
  }

  function createOrUpdateButton() {
    if (!isDictionaryMode()) {
      removeButton();
      return;
    }

    const id = glassId();
    const target = TARGETS[id];
    const word = wordText();

    if (!target || !word) {
      removeButton();
      return;
    }

    let button = document.getElementById(BUTTON_ID);

    if (!button) {
      button = document.createElement("button");
      button.id = BUTTON_ID;
      button.type = "button";

      const img = document.createElement("img");
      img.alt = "";
      img.draggable = false;
      img.setAttribute("aria-hidden", "true");

      const launch = document.createElement("span");
      launch.className = "world-search-launch";
      launch.textContent = "世界へ";

      button.append(img, launch);

      // 開始時は伝播だけ止める。preventDefaultはしない。
      // 実際の検索実行はclickだけに統一し、二重発火を防ぐ。
      ["pointerdown", "touchstart", "mousedown"].forEach(type => {
        button.addEventListener(type, stopStartPropagation, {
          capture: true,
          passive: true
        });
      });

      button.addEventListener("click", openWorld, {
        capture: true,
        passive: false
      });

      document.body.appendChild(button);
    }

    const img = button.querySelector("img");
    if (img && img.getAttribute("src") !== target.icon) {
      img.setAttribute("src", target.icon);
    }

    button.style.setProperty("--world-color", target.color);
    button.title = `${word}｜${target.label}`;
    button.setAttribute(
      "aria-label",
      `${word}を${target.destination}で${target.label}`
    );

    schedulePosition();
  }

  function handlePossibleModeChange() {
    // body class変化時だけ確認。
    // カードモード中に座標取得や描画監視は行わない。
    if (!isDictionaryMode()) {
      removeButton();
      return;
    }
    createOrUpdateButton();
  }

  function bind() {
    ensureStyle();

    const bodyObserver = new MutationObserver(handlePossibleModeChange);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });

    const word = document.getElementById("word");
    const glassName = document.getElementById("glassName");

    if (word) {
      new MutationObserver(() => {
        if (isDictionaryMode()) createOrUpdateButton();
      }).observe(word, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    if (glassName) {
      new MutationObserver(() => {
        if (isDictionaryMode()) createOrUpdateButton();
      }).observe(glassName, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener("resize", () => {
        if (isDictionaryMode()) schedulePosition();
      }, { passive: true });

      window.addEventListener("orientationchange", () => {
        if (isDictionaryMode()) schedulePosition();
      }, { passive: true });

      window.addEventListener("pageshow", () => {
        if (isDictionaryMode()) createOrUpdateButton();
      }, { passive: true });
    }

    createOrUpdateButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
