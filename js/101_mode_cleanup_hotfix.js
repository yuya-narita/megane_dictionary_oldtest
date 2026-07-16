
(function(){
  "use strict";

  function modeNameFromButton(el){
    if(!el) return "";
    var txt = (el.textContent || "").trim();
    var dm = (el.dataset && el.dataset.mode) || "";
    var idc = ((el.id||"") + " " + (el.className||"") + " " + dm).toLowerCase();
    if(txt === "辞書" || idc.indexOf("dictionary") >= 0) return "dictionary";
    if(txt === "カード" || idc.indexOf("card") >= 0) return "card";
    if(txt === "音楽" || idc.indexOf("music") >= 0) return "music";
    if(txt === "会議" || txt === "conf" || idc.indexOf("conf") >= 0) return "conference";
    return "";
  }

  function hide(el){
    if(!el) return;
    el.hidden = true;
    el.classList.remove("open","active","show","visible","is-open","is-active");
    el.style.pointerEvents = "";
  }

  function safeCleanupFor(nextMode){
    [
      "#mangaChoiceLayer",
      "#mangaArchiveLayer",
      "#mangaLibraryLayer",
      "#conferenceChoiceLayer",
      "#conferenceArchiveLayer",
      ".manga-choice-layer",
      ".manga-archive-layer",
      ".conference-choice-layer",
      ".conference-archive-layer",
      ".binder-modal",
      ".binder-layer",
      ".card-binder-modal"
    ].forEach(function(sel){
      document.querySelectorAll(sel).forEach(hide);
    });

    if(nextMode !== "dictionary"){
      ["#userDefinitionDialog","#userDefinitionConfirm",".userdef-dialog",".userdef-confirm"].forEach(function(sel){
        document.querySelectorAll(sel).forEach(hide);
      });
    }

    if(nextMode !== "music"){
      [".music-v7-lyrics",".music-v7-overlay",".music-v7-choice","#musicLyricsSheet","#musicListSheet"].forEach(function(sel){
        document.querySelectorAll(sel).forEach(hide);
      });
      try{
        if(window.musicV7State){
          window.musicV7State.sheet = false;
          window.musicV7State.lyrics = false;
        }
      }catch(e){}
    }

    document.querySelectorAll(".delete-open,.delete-ready,.dragging,.removing").forEach(function(el){
      el.classList.remove("delete-open","delete-ready","dragging","removing");
      if(el.style) el.style.transform = "";
    });

    document.body.classList.remove("binder-open","modal-open","sheet-open","archive-open","choice-open","lyrics-open","is-dragging");
  }

  document.addEventListener("click", function(e){
    var el = e.target && e.target.closest ? e.target.closest("button,[data-mode],.tab,.mode-tab,.top-tab,.nav-tab") : null;
    var next = modeNameFromButton(el);
    if(!next) return;

    var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if(rect && rect.top > 180) return;

    setTimeout(function(){ safeCleanupFor(next); }, 0);
    setTimeout(function(){ safeCleanupFor(next); }, 80);
  }, true);

  window.meganeCleanupModeLayers = function(nextMode){ safeCleanupFor(nextMode || ""); };
})();
