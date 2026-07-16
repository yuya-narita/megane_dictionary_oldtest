
(function(){
  "use strict";

  var KEY = "meganeCardDailyV92";
  var BINDER_KEY = "cardCollectionV100";
  var drawing = false;
  var lastTap = 0;

  function isCardMode(){
    try{
      return (typeof appMode !== "undefined" && appMode === "cards") ||
             window.appMode === "cards" ||
             document.body.classList.contains("mode-cards") ||
             document.body.classList.contains("mode-card");
    }catch(e){ return false; }
  }

  function todayKey(){
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
  }

  function loadDaily(){
    try{
      var s = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
      if(s.date !== todayKey()){
        s = { date: todayKey(), drawn:false, index:null };
        localStorage.setItem(KEY, JSON.stringify(s));
      }
      return s;
    }catch(e){
      return { date: todayKey(), drawn:false, index:null };
    }
  }

  function saveDaily(idx){
    try{
      localStorage.setItem(KEY, JSON.stringify({ date: todayKey(), drawn:true, index:idx }));
    }catch(e){}
  }

  function cardCount(){
    try{ if(typeof cards !== "undefined" && cards && cards.length) return cards.length; }catch(e){}
    return 0;
  }

  function currentIndex(){
    try{ if(typeof cardIndex !== "undefined") return Number(cardIndex || 0); }catch(e){}
    return 0;
  }

  function setIndex(i){
    try{ if(typeof cardIndex !== "undefined") cardIndex = i; }catch(e){}
  }

  function setFlipped(v){
    try{ if(typeof cardFlipped !== "undefined") cardFlipped = !!v; }catch(e){}
  }

  function renderSafe(anim){
    try{ if(typeof render === "function") render(anim || "flash"); }catch(e){}
    setTimeout(updateBackTexts, 0);
    setTimeout(updateBackTexts, 120);
  }

  function randomIndex(){
    var n = cardCount();
    if(n <= 1) return 0;
    var cur = currentIndex();
    var next = cur;
    var guard = 0;
    while(next === cur && guard < 30){
      next = Math.floor(Math.random() * n);
      guard++;
    }
    return next;
  }

  function addBinder(idx){
    try{
      var arr = JSON.parse(localStorage.getItem(BINDER_KEY) || "[]");
      if(!Array.isArray(arr)) arr = [];

      // v100 clean card collection:
      // カード専用履歴。重複も1枚として記録する。
      arr.push(idx);
      localStorage.setItem(BINDER_KEY, JSON.stringify(arr));

      // 既存バインダー互換用：ユニーク所持一覧もカード専用で維持。
      var ownedKey = "cardOwnedUniqueV100";
      var owned = JSON.parse(localStorage.getItem(ownedKey) || "[]");
      if(!Array.isArray(owned)) owned = [];
      if(owned.indexOf(idx) < 0){
        owned.push(idx);
        owned.sort(function(a,b){ return a-b; });
        localStorage.setItem(ownedKey, JSON.stringify(owned));
      }

      var newKey = "cardOwnedNewV100";
      var news = JSON.parse(localStorage.getItem(newKey) || "[]");
      if(!Array.isArray(news)) news = [];
      if(news.indexOf(idx) < 0){
        news.push(idx);
        localStorage.setItem(newKey, JSON.stringify(news));
      }
    }catch(e){}
  }

  function cardEl(){
    return document.getElementById("flipCard") ||
           document.querySelector(".flip-card") ||
           document.querySelector(".card-inner") ||
           document.querySelector(".card");
  }

  function updateBackTexts(){
    if(!isCardMode()) return;
    var s = loadDaily();

    // The back side should describe the new ritual, not vertical shuffle.
    ["cardCaption","cardTutorialHint","hint"].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      var t = (el.textContent || "");
      if(t.indexOf("上下") >= 0 || t.indexOf("シャッフル") >= 0 || t.indexOf("めくって") >= 0 || t.indexOf("またあした") >= 0){
        el.textContent = s.drawn ? "今日のカードは引き済み" : "タップで今日のカードを引く";
      }
    });

    var cap = document.getElementById("cardCaption");
    if(cap && !s.drawn) cap.textContent = "タップで今日のカードを引く";
    if(cap && s.drawn && (cap.textContent || "").indexOf("上下") >= 0) cap.textContent = "今日のカードは引き済み";
  }

  function drawToday(){
    if(!isCardMode() || drawing) return;
    var s = loadDaily();
    if(s.drawn){
      if(typeof s.index === "number") setIndex(s.index);
      setFlipped(false);
      renderSafe("flash");
      return;
    }

    drawing = true;
    var el = cardEl();
    if(el){
      el.classList.remove("daily-draw-ritual");
      void el.offsetWidth;
      el.classList.add("daily-draw-ritual");
    }

    setTimeout(function(){
      var idx = randomIndex();
      setIndex(idx);
      saveDaily(idx);
      addBinder(idx);
      setFlipped(false);
      renderSafe("flash");
      drawing = false;
    }, 430);
  }

  // Disable vertical shuffle in cards only. Other modes stay untouched.
  function patchMoveCard(){
    try{
      if(typeof moveCard !== "function" || moveCard.__dailyTapDraw) return;
      var original = moveCard;
      moveCard = function(step){
        if(!isCardMode()) return original.apply(this, arguments);
        // 上下スワイプでは抽選しない。未抽選なら裏面に戻すだけ。
        var s = loadDaily();
        if(s.drawn && typeof s.index === "number") setIndex(s.index);
        setFlipped(true);
        renderSafe("flash");
        return;
      };
      moveCard.__dailyTapDraw = true;
    }catch(e){}
  }

  // If today's card is already drawn, keep it locked. If not drawn, keep back side.
  function patchRender(){
    try{
      if(typeof render !== "function" || render.__dailyTapDraw) return;
      var original = render;
      render = function(){
        if(isCardMode()){
          var s = loadDaily();
          if(s.drawn && typeof s.index === "number") setIndex(s.index);
        }
        var r = original.apply(this, arguments);
        setTimeout(updateBackTexts, 0);
        return r;
      };
      render.__dailyTapDraw = true;
    }catch(e){}
  }

  // Capture tap on card back for daily draw. Stop old double-tap fullscreen from stealing this first tap.
  document.addEventListener("click", function(e){
    if(!isCardMode()) return;
    var target = e.target && e.target.closest ? e.target.closest("#flipCard,.flip-card,.card-inner,.card") : null;
    if(!target) return;

    var now = Date.now();
    if(now - lastTap < 140) return;
    lastTap = now;

    var s = loadDaily();
    var flipped = true;
    try{ if(typeof cardFlipped !== "undefined") flipped = !!cardFlipped; }catch(err){}

    if(!s.drawn && flipped){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      drawToday();
      return false;
    }
  }, true);

  function boot(){
    patchMoveCard();
    patchRender();
    updateBackTexts();
    setInterval(function(){
      patchMoveCard();
      patchRender();
      updateBackTexts();
    }, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.meganeDrawTodayCard = drawToday;
})();
