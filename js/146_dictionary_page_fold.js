/* 146_dictionary_page_fold.js
   v1.02: 折り目の見た目は維持し、タップ領域をカード内側へ大幅拡張。
   お気に入りの保存ロジックは既存の 80_favorites_singleton.js をそのまま利用する。
*/
(() => {
  "use strict";

  const STYLE_ID = "megane-dictionary-page-fold-v101-style";
  const OVERLAY_ID = "dictionaryPageFoldOverlay";
  let rafId = 0;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* 元の星は文字だけ消し、既存クリック処理は透明ボタンとして残す */
      body.mode-dictionary #favoriteLayer {
        position: fixed !important;
        inset: auto !important;
        width: 112px !important;
        height: 104px !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        pointer-events: auto !important;
        z-index: 8602 !important;
      }

      body.mode-dictionary #favoriteToggle,
      body.mode-dictionary #favoriteToggle.favorite-button {
        position: absolute !important;
        inset: 0 !important;
        width: 112px !important;
        height: 104px !important;
        min-width: 112px !important;
        min-height: 104px !important;
        padding: 0 !important;
        margin: 0 !important;
        color: transparent !important;
        font-size: 0 !important;
        line-height: 0 !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
        overflow: visible !important;
        -webkit-tap-highlight-color: transparent !important;
        touch-action: manipulation !important;
        cursor: pointer !important;
      }

      body.mode-dictionary #favoriteToggle::before,
      body.mode-dictionary #favoriteToggle::after {
        content: none !important;
        display: none !important;
      }

      /* カードの角に重ねる専用レイヤー。位置はJSでカードへ追従 */
      #${OVERLAY_ID} {
        position: fixed;
        width: 58px;
        height: 58px;
        pointer-events: none;
        z-index: 8601;
        opacity: 0;
        transition: opacity .14s ease;
        contain: layout style paint;
      }

      body.mode-dictionary #${OVERLAY_ID} {
        opacity: 1;
      }

      #${OVERLAY_ID} .fold-idle-crease,
      #${OVERLAY_ID} .fold-cutout,
      #${OVERLAY_ID} .fold-paper,
      #${OVERLAY_ID} .fold-shadow {
        position: absolute;
        top: 0;
        right: 0;
        pointer-events: none;
      }

      /* 未保護：角の一部にごく薄い折り位置だけを示す */
      #${OVERLAY_ID} .fold-idle-crease {
        width: 21px;
        height: 21px;
        opacity: .32;
        background:
          linear-gradient(225deg,
            transparent 47%,
            rgba(255,255,255,.62) 49%,
            rgba(255,255,255,.62) 51%,
            transparent 53%);
        transition: opacity .15s ease;
      }

      /* 保護時：実際にカード右上を欠き取る背景三角 */
      #${OVERLAY_ID} .fold-cutout {
        width: 42px;
        height: 42px;
        clip-path: polygon(100% 0, 0 0, 100% 100%);
        -webkit-clip-path: polygon(100% 0, 0 0, 100% 100%);
        opacity: 0;
        transition: opacity .16s ease;
      }

      /* 折り返した紙の裏面。カード内側へ残る三角形 */
      #${OVERLAY_ID} .fold-paper {
        width: 42px;
        height: 42px;
        clip-path: polygon(0 0, 100% 100%, 0 100%);
        -webkit-clip-path: polygon(0 0, 100% 100%, 0 100%);
        background:
          linear-gradient(135deg,
            rgba(255,255,255,.92) 0%,
            rgba(235,229,210,.94) 38%,
            rgba(184,170,137,.92) 100%);
        border-left: 1px solid rgba(255,255,255,.42);
        border-bottom: 1px solid rgba(90,70,45,.30);
        opacity: 0;
        transform-origin: 100% 0;
        transform: scale(.72);
        transition: opacity .16s ease, transform .18s cubic-bezier(.2,.8,.2,1);
      }

      /* 折り線の影 */
      #${OVERLAY_ID} .fold-shadow {
        width: 46px;
        height: 46px;
        opacity: 0;
        background:
          linear-gradient(225deg,
            transparent 47%,
            rgba(0,0,0,.42) 49%,
            rgba(255,255,255,.20) 51%,
            transparent 54%);
        filter: blur(.15px);
        transition: opacity .16s ease;
      }

      #${OVERLAY_ID}.is-folded .fold-idle-crease {
        opacity: 0;
      }

      #${OVERLAY_ID}.is-folded .fold-cutout,
      #${OVERLAY_ID}.is-folded .fold-paper,
      #${OVERLAY_ID}.is-folded .fold-shadow {
        opacity: 1;
      }

      #${OVERLAY_ID}.is-folded .fold-paper {
        transform: scale(1);
      }

      /* タップ時は角が少し沈む */
      body.mode-dictionary #favoriteLayer:active + #${OVERLAY_ID} .fold-paper,
      #${OVERLAY_ID}.is-pressed .fold-paper {
        transform: scale(.94);
      }

      @media (prefers-reduced-motion: reduce) {
        #${OVERLAY_ID},
        #${OVERLAY_ID} * {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <span class="fold-idle-crease"></span>
      <span class="fold-cutout"></span>
      <span class="fold-paper"></span>
      <span class="fold-shadow"></span>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function bodyBackgroundForCutout() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const cutout = overlay.querySelector(".fold-cutout");
    if (!cutout) return;

    const bodyStyle = getComputedStyle(document.body);
    cutout.style.backgroundImage = bodyStyle.backgroundImage;
    cutout.style.backgroundColor = bodyStyle.backgroundColor;
    cutout.style.backgroundSize = bodyStyle.backgroundSize;
    cutout.style.backgroundRepeat = bodyStyle.backgroundRepeat;
    cutout.style.backgroundPosition = "0 0";
    cutout.style.backgroundAttachment = "fixed";
  }

  function isDictionaryMode() {
    return document.body.classList.contains("mode-dictionary");
  }

  function positionFold() {
    rafId = 0;
    const card = document.getElementById("card");
    const layer = document.getElementById("favoriteLayer");
    const overlay = document.getElementById(OVERLAY_ID);
    if (!card || !layer || !overlay || !isDictionaryMode()) return;

    const rect = card.getBoundingClientRect();
    const visualSize = 58;
    const hitWidth = 112;
    const hitHeight = 104;

    /* 見た目は角に置き、透明タップ領域はカード内側へ広げる */
    const overlayLeft = Math.round(rect.right - visualSize);
    const overlayTop = Math.round(rect.top);
    const layerLeft = Math.round(rect.right - hitWidth);
    const layerTop = Math.round(rect.top);

    layer.style.left = `${layerLeft}px`;
    layer.style.top = `${layerTop}px`;
    layer.style.right = "auto";
    layer.style.bottom = "auto";

    overlay.style.left = `${overlayLeft}px`;
    overlay.style.top = `${overlayTop}px`;

    bodyBackgroundForCutout();
  }

  function schedulePosition() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(positionFold);
  }

  function syncState() {
    const button = document.getElementById("favoriteToggle");
    const overlay = createOverlay();
    if (!button || !overlay) return;

    const active = button.classList.contains("active");
    overlay.classList.toggle("is-folded", active);

    if (isDictionaryMode()) {
      const label = active ? "折り目を戻す" : "このページの角を折る";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }

    schedulePosition();
  }

  function installPressFeedback(button, overlay) {
    const down = () => overlay.classList.add("is-pressed");
    const up = () => overlay.classList.remove("is-pressed");
    button.addEventListener("pointerdown", down, { passive: true });
    button.addEventListener("pointerup", up, { passive: true });
    button.addEventListener("pointercancel", up, { passive: true });
    button.addEventListener("pointerleave", up, { passive: true });
    button.addEventListener("touchend", up, { passive: true });
  }

  function install() {
    installStyle();
    const overlay = createOverlay();
    const button = document.getElementById("favoriteToggle");
    const card = document.getElementById("card");

    syncState();

    if (button) {
      const buttonObserver = new MutationObserver(syncState);
      buttonObserver.observe(button, {
        attributes: true,
        attributeFilter: ["class", "hidden", "style"]
      });
      installPressFeedback(button, overlay);
    }

    const bodyObserver = new MutationObserver(() => {
      syncState();
      bodyBackgroundForCutout();
    });
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-mode", "style"]
    });

    if (card && "ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(schedulePosition);
      resizeObserver.observe(card);
    }

    window.addEventListener("resize", schedulePosition, { passive: true });
    window.addEventListener("orientationchange", schedulePosition, { passive: true });
    window.addEventListener("pageshow", syncState);
    document.addEventListener("visibilitychange", schedulePosition);

    /* スワイプ中もカード角へ追従させる */
    let framesLeft = 0;
    const followAnimation = () => {
      if (framesLeft <= 0) return;
      positionFold();
      framesLeft -= 1;
      requestAnimationFrame(followAnimation);
    };
    ["pointerdown", "touchstart", "transitionstart", "animationstart"].forEach(type => {
      card?.addEventListener(type, () => {
        framesLeft = 28;
        requestAnimationFrame(followAnimation);
      }, { passive: true });
    });

    setTimeout(syncState, 150);
    setTimeout(syncState, 650);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
