/* 145_analytics_events.js
 * MEGANE DICTIONARY / GA4 minimal interaction events
 *
 * Sends only event names and coarse UI categories.
 * User-entered definitions, word text, profile data, and localStorage content
 * are never included in Analytics parameters.
 */
(() => {
  "use strict";

  const TRACKED_FLAG = "__meganeAnalytics145Loaded";
  if (window[TRACKED_FLAG]) return;
  window[TRACKED_FLAG] = true;

  /**
   * Safe GA4 event sender.
   * Keeping this wrapper in one place makes it easy to disable or replace later.
   */
  function track(eventName, params = {}) {
    if (!eventName || typeof eventName !== "string") return;

    const cleanParams = {
      app_area: "megane_dictionary",
      ...params
    };

    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, cleanParams);
      }
    } catch (error) {
      console.warn("[analytics] event was not sent:", eventName, error);
    }
  }

  // Expose one shared function for future features.
  window.meganeTrack = track;

  function closest(target, selector) {
    return target && typeof target.closest === "function"
      ? target.closest(selector)
      : null;
  }

  function bindClickTracking() {
    document.addEventListener("click", (event) => {
      const target = event.target;

      // Share entry points and the final share actions in both preview dialogs.
      if (closest(target, "#shareCurrent, .self-share-preview-share, .char-share-preview-share")) {
        let source = "dictionary";
        if (closest(target, ".self-share-preview-share")) source = "self_definition";
        else if (closest(target, ".char-share-preview-share")) source = "character_definition";
        track("share", { source });
        return;
      }

      // Opening the BUG CARD area.
      if (closest(target, "#cardMode, .collection-item[data-mode='cards']")) {
        track("card_open", { source: "navigation" });
        return;
      }

    }, true);
  }

  function bindAudioTracking() {
    const conferenceIds = ["confNativeAudio", "mangaAudio"];

    conferenceIds.forEach((id) => {
      const audio = document.getElementById(id);
      if (!audio || audio.dataset.analytics145Bound === "1") return;
      audio.dataset.analytics145Bound = "1";
      audio.addEventListener("play", () => {
        track("conference_play", { player: id });
      });
    });

    const musicAudio = document.getElementById("musicAudio");
    if (musicAudio && musicAudio.dataset.analytics145Bound !== "1") {
      musicAudio.dataset.analytics145Bound = "1";
      musicAudio.addEventListener("play", () => {
        track("music_play", { player: "musicAudio" });
      });
    }
  }

  function init() {
    // One event per actual page load. GA4's automatic page_view remains unchanged.
    track("app_open", { launch_type: "page_load" });
    bindClickTracking();
    bindAudioTracking();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
