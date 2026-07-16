/* 142_dictionary_plus_align.js
 * 辞書モード専用：＋ボタン位置調整
 *
 * - #userDefinitionPlus だけを操作
 * - 辞書モード中だけカード右下へ追従
 * - カード／音楽／会議へ移動したら付与した位置指定を解除
 * - setInterval不使用
 * - World Searchとは完全分離
 */
(() => {
  "use strict";

  const PLUS_ID = "userDefinitionPlus";
  const PATCH_MARK = "dictionaryPlusAlign142";
  const DESKTOP_MAX = 420;

  let rafId = 0;
  let observer = null;
  let resizeBound = false;

  function isDictionaryMode() {
    return document.body.classList.contains("mode-dictionary");
  }

  function isVisible(el) {
    if (!el || el.hidden) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0";
  }

  function getDictionaryCard() {
    if (!isDictionaryMode()) return null;

    return (
      document.getElementById("card") ||
      document.querySelector("body.mode-dictionary .card")
    );
  }

  function clearPlusPosition() {
    const plus = document.getElementById(PLUS_ID);
    if (!plus || plus.dataset[PATCH_MARK] !== "1") return;

    [
      "position",
      "left",
      "top",
      "right",
      "bottom",
      "transform",
      "margin",
      "z-index"
    ].forEach(property => {
      plus.style.removeProperty(property);
    });

    delete plus.dataset[PATCH_MARK];
  }

  function alignPlus() {
    cancelAnimationFrame(rafId);
    rafId = 0;

    if (!isDictionaryMode()) {
      clearPlusPosition();
      return;
    }

    const plus = document.getElementById(PLUS_ID);
    const card = getDictionaryCard();

    if (!plus || !card || !isVisible(plus) || !isVisible(card)) return;

    const cardRect = card.getBoundingClientRect();
    const plusRect = plus.getBoundingClientRect();

    const compact = window.matchMedia(`(max-width:${DESKTOP_MAX}px)`).matches;

    // 見た目基準のカード内余白
    const rightInset = compact ? 18 : 22;
    const bottomInset = compact ? 18 : 22;

    // 実寸がまだ取れない初回描画向けの保険
    const width = plusRect.width || 44;
    const height = plusRect.height || 44;

    const left = Math.round(cardRect.right - rightInset - width);
    const top = Math.round(cardRect.bottom - bottomInset - height);

    plus.dataset[PATCH_MARK] = "1";

    plus.style.setProperty("position", "fixed", "important");
    plus.style.setProperty("left", `${left}px`, "important");
    plus.style.setProperty("top", `${top}px`, "important");
    plus.style.setProperty("right", "auto", "important");
    plus.style.setProperty("bottom", "auto", "important");
    plus.style.setProperty("transform", "none", "important");
    plus.style.setProperty("margin", "0", "important");
    plus.style.setProperty("z-index", "2147482999", "important");
  }

  function scheduleAlign() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(alignPlus);
  }

  function handleModeChange() {
    if (!isDictionaryMode()) {
      clearPlusPosition();
      return;
    }

    // モード切替直後は既存描画が少し遅れることがある
    scheduleAlign();
    window.setTimeout(scheduleAlign, 80);
  }

  function boot() {
    observer = new MutationObserver(handleModeChange);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });

    // ＋が後から生成・再描画される場合だけ追従
    const appRoot =
      document.getElementById("app") ||
      document.body;

    new MutationObserver(() => {
      if (isDictionaryMode()) scheduleAlign();
    }).observe(appRoot, {
      childList: true,
      subtree: true
    });

    if (!resizeBound) {
      resizeBound = true;

      ["resize", "orientationchange", "pageshow"].forEach(type => {
        window.addEventListener(type, () => {
          if (isDictionaryMode()) scheduleAlign();
          else clearPlusPosition();
        }, { passive: true });
      });
    }

    handleModeChange();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
