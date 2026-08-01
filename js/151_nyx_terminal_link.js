/* MEGANE DICTIONARY -> NYX OBSERVATION TERMINAL
   Long-press the "ハッカーメガネ：ニクス" item in the glass chooser.
*/
(function () {
  "use strict";

  const HOLD_MS = 720;
  const RETURN_DIALOG_KEY = "megane_nyx_return_glass_dialog_v1";
  let holdTimer = 0;
  let activeItem = null;
  let suppressClickUntil = 0;
  let navigating = false;

  function isNyxItem(node) {
    const item = node && node.closest ? node.closest(".glass-item") : null;
    if (!item || item.id === "selfGlassToggleButton") return null;
    const text = String(item.textContent || "").replace(/\s+/g, " ");
    return /ハッカーメガネ/.test(text) && /ニクス/.test(text) ? item : null;
  }

  function ensureOverlay() {
    let overlay = document.getElementById("nyxTerminalLinkOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "nyxTerminalLinkOverlay";
    overlay.className = "nyx-terminal-link-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="nyx-link-core" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<strong>HOST LINK</strong>' +
      '<span>NXS OBSERVATION TERMINAL</span>' +
      '<small>接続中...</small>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = 0;
    if (activeItem) activeItem.classList.remove("nyx-hold-active");
    activeItem = null;
  }

  function openNyxTerminal(item) {
    if (navigating) return;
    navigating = true;
    suppressClickUntil = Date.now() + 1400;
    item.classList.remove("nyx-hold-active");
    item.classList.add("nyx-link-acquired");

    try {
      if (navigator.vibrate) navigator.vibrate(28);
    } catch (_) {}

    try {
      sessionStorage.setItem(RETURN_DIALOG_KEY, "1");
    } catch (_) {}

    const dialog = document.getElementById("glassDialog");
    try {
      if (dialog && dialog.open) dialog.close();
    } catch (_) {}

    const overlay = ensureOverlay();
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-visible"));

    setTimeout(function () {
      // Same-tab navigation keeps browser history, so the terminal's ◎ HOST
      // and downward storage gesture can return with history.back().
      window.location.href = "./nyx/";
    }, 620);
  }

  function startHold(event) {
    if (navigating) return;
    const item = isNyxItem(event.target);
    if (!item) return;

    cancelHold();
    activeItem = item;
    item.classList.add("nyx-hold-active");

    holdTimer = window.setTimeout(function () {
      holdTimer = 0;
      openNyxTerminal(item);
    }, HOLD_MS);
  }

  function onMove(event) {
    if (!activeItem) return;
    if (event.pointerType === "mouse" && event.buttons === 0) cancelHold();
  }

  document.addEventListener("pointerdown", startHold, true);
  document.addEventListener("pointerup", cancelHold, true);
  document.addEventListener("pointercancel", cancelHold, true);
  document.addEventListener("pointermove", onMove, true);
  document.addEventListener("scroll", cancelHold, true);

  // Prevent iOS long-press menu only on the NYX item.
  document.addEventListener("contextmenu", function (event) {
    if (isNyxItem(event.target)) event.preventDefault();
  }, true);

  // Discard the click generated after a successful long press.
  document.addEventListener("click", function (event) {
    if (Date.now() < suppressClickUntil && isNyxItem(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function restoreGlassDialogAfterHostReturn() {
    let shouldRestore = false;
    try {
      shouldRestore = sessionStorage.getItem(RETURN_DIALOG_KEY) === "1";
      if (shouldRestore) sessionStorage.removeItem(RETURN_DIALOG_KEY);
    } catch (_) {}
    if (!shouldRestore) return;

    const overlay = document.getElementById("nyxTerminalLinkOverlay");
    if (overlay) {
      overlay.classList.remove("is-visible");
      overlay.hidden = true;
    }
    navigating = false;

    // Allow the existing app and the self-glass patch to finish rebuilding.
    setTimeout(function () {
      try {
        if (typeof window.buildGlassList === "function") window.buildGlassList();
      } catch (_) {}
      const dialog = document.getElementById("glassDialog");
      if (dialog && !dialog.open && typeof dialog.showModal === "function") {
        try { dialog.showModal(); } catch (_) {}
      }
    }, 90);
  }

  window.addEventListener("pageshow", restoreGlassDialogAfterHostReturn);
})();
