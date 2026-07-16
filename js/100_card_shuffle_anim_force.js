
(function(){
  "use strict";

  function isCardMode(){
    try{
      return document.body.classList.contains("mode-card") ||
             document.body.classList.contains("mode-cards") ||
             window.appMode === "card" ||
             window.appMode === "cards" ||
             (typeof appMode !== "undefined" && (appMode === "card" || appMode === "cards"));
    }catch(e){ return false; }
  }

  function targets(){
    return [
      "#cardView",
      "#cardArea",
      ".card-view",
      ".card-stage",
      ".cards-stage",
      ".card",
      ".megane-card",
      ".flip-card",
      ".binder-card"
    ].map(function(sel){ return document.querySelector(sel); }).filter(Boolean);
  }

  function pulse(){
    if(!isCardMode()) return;
    var list = targets();
    if(!list.length){
      var main = document.querySelector("main") || document.querySelector("#app") || document.body;
      list = [main];
    }
    list.forEach(function(el){
      el.classList.remove("forced-card-shuffle");
      void el.offsetWidth;
      el.classList.add("forced-card-shuffle");
    });
  }

  function looksLikeShuffle(el){
    if(!el) return false;
    var txt = (el.textContent || "").trim();
    var idc = ((el.id || "") + " " + (el.className || "") + " " + (el.getAttribute && (el.getAttribute("aria-label")||"") || "")).toLowerCase();
    return txt.indexOf("探索") >= 0 ||
           txt.indexOf("シャッフル") >= 0 ||
           txt.indexOf("めくる") >= 0 ||
           idc.indexOf("shuffle") >= 0 ||
           idc.indexOf("random") >= 0 ||
           idc.indexOf("explore") >= 0;
  }

  // シャッフル操作時に必ず見える反応を出す。
  ["pointerdown","click","touchend"].forEach(function(type){
    document.addEventListener(type, function(e){
      if(!isCardMode()) return;
      var el = e.target;
      var btn = el && el.closest ? el.closest("button,[role='button'],.bottom-btn,.nav-btn") : el;
      if(looksLikeShuffle(btn)){
        setTimeout(pulse, 20);
        setTimeout(pulse, 170);
      }
    }, true);
  });

  // カードモードに入った直後にも軽く発火。表示が固まって見える問題を軽減。
  var lastMode = "";
  setInterval(function(){
    var now = isCardMode() ? "card" : "other";
    if(now === "card" && lastMode !== "card"){
      setTimeout(pulse, 80);
    }
    lastMode = now;
  }, 350);

  window.forceCardShufflePulse = pulse;
})();
