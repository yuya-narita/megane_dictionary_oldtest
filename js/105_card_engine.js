/* 105_card_engine.js
   MEGANE Card Engine v6
   - Daily Draw / Binder / Collection / Shuffle / Random Test を一本化
   - このファイルを使う場合は 63/99/100/102/103/104 のカード系パッチを外す
   - 読み込み順: card_data.js -> 00_core.js -> 105_card_engine.js
*/
(function(){
  "use strict";

  var ENGINE_VERSION = "CardEngineV6";
  var KEYS = {
    daily: "meganeCardDailyV92",
    history: "cardCollectionV100",
    unique: "cardOwnedUniqueV100",
    newer: "cardOwnedNewV100",
    recorded: "cardCollectionDailyRecordedV100",
    completeShown: "bugCollectionCompleteEventShownV106"
  };
  var state = { drawing:false, lastTap:0, patched:false };

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g,function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]; }); }
  function loadJson(key, fallback){ try{ var v=JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback)); return v==null?fallback:v; }catch(e){ return fallback; } }
  function saveJson(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function getCards(){ try{ if(typeof cards!=="undefined" && Array.isArray(cards)) return cards; }catch(e){} try{ if(window.cards && Array.isArray(window.cards)) return window.cards; }catch(e){} return []; }
  function validIndex(idx){ idx=Number(idx); var arr=getCards(); return isFinite(idx)&&idx>=0&&idx<arr.length; }
  function todayKey(){ var d=new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
  function isCardMode(){ try{ return (typeof appMode!=="undefined"&&appMode==="cards")||window.appMode==="cards"||document.body.classList.contains("mode-cards")||document.body.classList.contains("mode-card"); }catch(e){ return false; } }
  function getCardIndex(){ try{ if(typeof cardIndex!=="undefined") return Number(cardIndex); }catch(e){} return 0; }
  function setCardIndex(i){ try{ if(typeof cardIndex!=="undefined") cardIndex=Number(i); }catch(e){} }
  function getFlipped(){ try{ if(typeof cardFlipped!=="undefined") return !!cardFlipped; }catch(e){} return true; }
  function setFlipped(v){ try{ if(typeof cardFlipped!=="undefined") cardFlipped=!!v; }catch(e){} }
  function renderSafe(anim){ try{ if(typeof render==="function") render(anim||"flash"); }catch(e){} setTimeout(updateBackTexts,0); setTimeout(updateDeckStyle,20); setTimeout(updateBackTexts,120); setTimeout(updateDeckStyle,140); }
  function cardEl(){ return $("flipCard")||document.querySelector(".flip-card")||document.querySelector(".card-inner")||document.querySelector(".megane-card")||document.querySelector(".card"); }

  function ensureCardEngineStyle(){
    if($("cardEngineV4Style")) return;
    var st=document.createElement("style");
    st.id="cardEngineV4Style";
    st.textContent=''
      + '@keyframes ceFlyUp{0%{transform:translate3d(0,0,0) rotate(0) scale(1);opacity:1}35%{transform:translate3d(0,-34px,0) rotate(-5deg) scale(1.025);opacity:1}100%{transform:translate3d(0,-118vh,0) rotate(-18deg) scale(.92);opacity:.15}}'
      + '@keyframes ceFlyDown{0%{transform:translate3d(0,0,0) rotate(0) scale(1);opacity:1}35%{transform:translate3d(0,34px,0) rotate(5deg) scale(1.025);opacity:1}100%{transform:translate3d(0,118vh,0) rotate(18deg) scale(.92);opacity:.15}}'
      + '@keyframes ceReturnDeck{0%{transform:translate3d(0,18px,0) rotate(2deg) scale(.985);opacity:.2}100%{transform:translate3d(0,0,0) rotate(0) scale(1);opacity:1}}'
      + '@keyframes ceDrawLift{0%{transform:translateY(0) rotate(0) scale(1)}40%{transform:translateY(-28px) rotate(-3.5deg) scale(1.035)}70%{transform:translateY(-14px) rotate(5deg) scale(1.02)}100%{transform:translateY(0) rotateY(78deg) scale(1)}}'
      + '@keyframes ceRevealPop{0%{transform:rotateY(-75deg) translateY(-10px) scale(.98);filter:brightness(1.08)}60%{transform:rotateY(7deg) translateY(-4px) scale(1.02);filter:brightness(1.12)}100%{transform:rotateY(0) translateY(0) scale(1);filter:brightness(1)}}'
      + '@keyframes ceDeckBreath{0%,100%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(0,-2px,0) rotate(.4deg)}}'
      + '.ce-stack-shadow{position:relative;animation:ceDeckBreath 2.8s ease-in-out infinite;will-change:transform}'
      + '.ce-stack-shadow:before,.ce-stack-shadow:after{content:"";position:absolute;inset:0;border-radius:inherit;background:inherit;border:inherit;box-shadow:inherit;pointer-events:none;z-index:-1;opacity:.55}'
      + '.ce-stack-shadow:before{transform:translate(12px,10px) rotate(2.4deg)}'
      + '.ce-stack-shadow:after{transform:translate(-10px,13px) rotate(-2deg);opacity:.35}'
      + '.ce-fly-up{animation:ceFlyUp .58s cubic-bezier(.15,.78,.22,1) forwards;will-change:transform,opacity}'
      + '.ce-fly-down{animation:ceFlyDown .58s cubic-bezier(.15,.78,.22,1) forwards;will-change:transform,opacity}'
      + '.ce-return-deck{animation:ceReturnDeck .28s cubic-bezier(.2,.8,.2,1);will-change:transform,opacity}'
      + '.ce-draw-lift{animation:ceDrawLift .44s cubic-bezier(.16,.84,.24,1) forwards;will-change:transform}'
      + '.ce-reveal-pop{animation:ceRevealPop .38s cubic-bezier(.18,.9,.24,1);will-change:transform,filter}.ce-drawing .flip-front,.ce-drawing .flip-face,.ce-drawing .card-front{visibility:hidden!important;opacity:0!important}'
    document.head.appendChild(st);
  }

  function updateDeckStyle(){
    ensureCardEngineStyle();
    var el=cardEl(); if(!el) return;
    var s=loadDaily();
    if(isCardMode() && !s.drawn && getFlipped() && !state.drawing){ el.classList.add("ce-stack-shadow"); }
    else { el.classList.remove("ce-stack-shadow"); }
  }

  function flyDeck(step, done){
    ensureCardEngineStyle();
    var el=cardEl();
    if(!el){ if(done) done(); return; }
    el.classList.remove("ce-fly-up","ce-fly-down","ce-return-deck","ce-draw-lift","ce-reveal-pop");
    void el.offsetWidth;
    el.classList.add(step>0?"ce-fly-up":"ce-fly-down");
    setTimeout(function(){
      if(done) done();
      try{
        el.classList.remove("ce-fly-up","ce-fly-down");
        void el.offsetWidth;
        el.classList.add("ce-return-deck");
        setTimeout(function(){ el.classList.remove("ce-return-deck"); updateDeckStyle(); },320);
      }catch(e){}
    },560);
  }

  function drawLift(done){
    ensureCardEngineStyle();
    var el=cardEl(); if(!el){ done(); return; }
    el.classList.add("ce-drawing");
    el.classList.remove("ce-draw-lift","ce-reveal-pop");
    void el.offsetWidth;
    el.classList.add("ce-draw-lift");
    setTimeout(function(){ 
      try{ el.classList.remove("ce-draw-lift"); }catch(e){}
      try{ el.classList.remove("ce-drawing"); }catch(e){}
      done();
      setTimeout(function(){ try{ el.classList.add("ce-reveal-pop"); setTimeout(function(){ el.classList.remove("ce-reveal-pop"); },460); }catch(e){} },30); },440);
  }

  function devCompleteOn(){ return localStorage.getItem("megane_dev_card_complete")==="1" || localStorage.getItem("megane_dev_unlock_all")==="1"; }

  function ensureV6TouchStyle(){
    if($("cardEngineV6TouchStyle")) return;
    var st = document.createElement("style");
    st.id = "cardEngineV6TouchStyle";
    st.textContent = ''
      + '.ce-touching-v6{transition:none!important;will-change:transform,filter;filter:drop-shadow(var(--ce-shadow-x,0px) var(--ce-shadow-y,18px) var(--ce-shadow-blur,28px) rgba(0,0,0,.38))}'
      + '.ce-return-v6{transition:transform .32s cubic-bezier(.18,.92,.18,1.04),filter .32s ease!important}'
      + '.ce-flip-right-v6{animation:ceFlipRightV6 .42s cubic-bezier(.18,.88,.22,1) both}'
      + '.ce-flip-left-v6{animation:ceFlipLeftV6 .42s cubic-bezier(.18,.88,.22,1) both}'
      + '@keyframes ceFlipRightV6{0%{transform:perspective(900px) rotateY(-62deg) translateX(-18px) scale(.985);filter:brightness(1.05)}58%{transform:perspective(900px) rotateY(8deg) translateX(4px) scale(1.018);filter:brightness(1.10)}100%{transform:perspective(900px) rotateY(0) translateX(0) scale(1);filter:brightness(1)}}'
      + '@keyframes ceFlipLeftV6{0%{transform:perspective(900px) rotateY(62deg) translateX(18px) scale(.985);filter:brightness(1.05)}58%{transform:perspective(900px) rotateY(-8deg) translateX(-4px) scale(1.018);filter:brightness(1.10)}100%{transform:perspective(900px) rotateY(0) translateX(0) scale(1);filter:brightness(1)}}';
    document.head.appendChild(st);
  }

  function applyTouchFeelV6(dx, dy){
    return; // v6: disabled; 106_card_physics_touch owns transform
    ensureV6TouchStyle();
    var el = cardEl();
    if(!el) return;

    var tx = Math.max(-48, Math.min(48, dx * .28));
    var ty = Math.max(-34, Math.min(34, dy * .18));
    var rot = Math.max(-7, Math.min(7, dx * .032)) + Math.max(-3, Math.min(3, dy * .010));
    var scale = 1 - Math.min(.022, Math.max(Math.abs(dx), Math.abs(dy)) / 5600);
    var lift = Math.min(1, Math.max(Math.abs(dx), Math.abs(dy)) / 120);

    el.style.setProperty("--ce-shadow-x", String(Math.max(-12, Math.min(12, dx * .07))) + "px");
    el.style.setProperty("--ce-shadow-y", String(18 + lift * 11) + "px");
    el.style.setProperty("--ce-shadow-blur", String(26 + lift * 18) + "px");

    el.classList.add("ce-touching-v6");
    el.classList.remove("ce-return-v6");
    el.style.transform = "translate3d("+tx+"px,"+ty+"px,0) rotate("+rot+"deg) scale("+scale+")";
  }

  function resetTouchFeelV6(){
    return; // v6: disabled; 106_card_physics_touch owns transform
    var el = cardEl();
    if(!el) return;
    el.classList.remove("ce-touching-v6");
    el.classList.add("ce-return-v6");
    el.style.transform = "";
    el.style.removeProperty("--ce-shadow-x");
    el.style.removeProperty("--ce-shadow-y");
    el.style.removeProperty("--ce-shadow-blur");
    setTimeout(function(){ try{ el.classList.remove("ce-return-v6"); }catch(e){} }, 360);
  }

  function playFlipVisualV6(dir){
    return; // v6: disabled; 106_card_physics_touch owns transform
    ensureV6TouchStyle();
    var el = cardEl();
    if(!el) return;
    var cls = dir > 0 ? "ce-flip-right-v6" : "ce-flip-left-v6";
    el.classList.remove("ce-flip-right-v6","ce-flip-left-v6");
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function(){ try{ el.classList.remove(cls); }catch(e){} }, 460);
  }

  function installSafeTouchFeelV6(){
    if(document.documentElement.dataset.cardEngineV6Touch === "1") return;
    document.documentElement.dataset.cardEngineV6Touch = "1";
    ensureV6TouchStyle();

    var startX = 0;
    var startY = 0;
    var active = false;
    var moved = false;

    document.addEventListener("pointerdown", function(e){
      if(!isCardMode()) return;
      var target = e.target && e.target.closest ? e.target.closest("#flipCard,.flip-card,.card-inner,.card,.megane-card") : null;
      if(!target) return;
      active = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
    }, true);

    document.addEventListener("pointermove", function(e){
      if(!active || !isCardMode()) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var dist = Math.max(Math.abs(dx), Math.abs(dy));
      if(dist > 9){
        moved = true;
        applyTouchFeelV6(dx, dy);
      }
    }, true);

    document.addEventListener("pointerup", function(e){
      if(!active) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      active = false;
      resetTouchFeelV6();

      // ここでは状態変更しない。
      // Daily Draw / flip / shuffle の判定は v4 の既存処理に任せる。
      // 方向に合った視覚演出だけ足す。
      if(isCardMode() && moved && Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.08){
        playFlipVisualV6(dx > 0 ? 1 : -1);
      }
    }, true);

    document.addEventListener("pointercancel", function(){
      active = false;
      resetTouchFeelV6();
    }, true);
  }


  function cardCount(){ return getCards().length||0; }

  function drawCardCount(){
    // 最後の No.∞ / THE LOOKING BEAR はコンプリート報酬扱い。
    // 通常抽選・ランダム検査からは除外する。
    var n = cardCount();
    return n > 1 ? n - 1 : n;
  }
  function randomIndexRaw(){ var n=drawCardCount(); return n?Math.floor(Math.random()*n):0; }
  function randomIndexAvoidCurrent(){ var n=drawCardCount(); if(n<=1) return 0; var cur=getCardIndex(), next=cur, guard=0; while(next===cur&&guard<50){ next=Math.floor(Math.random()*n); guard++; } return validIndex(next)?next:0; }

  function loadDaily(){ var key=todayKey(); var s=loadJson(KEYS.daily,{}); if(!s||s.date!==key){ s={date:key,drawn:false,index:null}; saveJson(KEYS.daily,s); } return s; }
  function saveDaily(idx){ saveJson(KEYS.daily,{date:todayKey(),drawn:true,index:Number(idx)}); }

  function normalizeHistory(){ var arr=loadJson(KEYS.history,[]); if(!Array.isArray(arr)) arr=[]; arr=arr.map(function(x){return Number(x);}).filter(validIndex); saveJson(KEYS.history,arr); var unique=Array.from(new Set(arr)).sort(function(a,b){return a-b;}); saveJson(KEYS.unique,unique); return arr; }
  function recordIndexOncePerDay(idx,dateKey){
    idx=Number(idx); if(!validIndex(idx)) return false; dateKey=dateKey||todayKey();
    var recorded=loadJson(KEYS.recorded,{}); if(!recorded||typeof recorded!=="object"||Array.isArray(recorded)) recorded={};
    if(recorded[dateKey]!==undefined) return false;
    var arr=normalizeHistory(); arr.push(idx); saveJson(KEYS.history,arr);
    var unique=Array.from(new Set(arr)).sort(function(a,b){return a-b;}); saveJson(KEYS.unique,unique);
    var news=loadJson(KEYS.newer,[]); if(!Array.isArray(news)) news=[]; if(news.indexOf(idx)<0){ news.push(idx); saveJson(KEYS.newer,news); }
    recorded[dateKey]=idx; saveJson(KEYS.recorded,recorded);
    try{ if(window.MEGANE_OBSERVE) window.MEGANE_OBSERVE("card.draw",{index:idx,date:dateKey}); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent("megane:cardCollectionChanged",{detail:{index:idx,date:dateKey}})); }catch(e){}
    return true;
  }
  function syncDailyToCollection(){ var s=loadDaily(); if(s&&s.drawn&&validIndex(Number(s.index))) recordIndexOncePerDay(Number(s.index),s.date||todayKey()); }

  function pulse(){
    if(!isCardMode()) return;
    var list=["#cardView","#cardArea",".card-view",".card-stage",".cards-stage",".card",".megane-card",".flip-card",".binder-card"].map(function(sel){return document.querySelector(sel);}).filter(Boolean);
    if(!list.length){ var main=document.querySelector("main")||document.querySelector("#app")||document.body; list=[main]; }
    list.forEach(function(el){ el.classList.remove("forced-card-shuffle","card-shuffle-pulse","daily-draw-ritual"); void el.offsetWidth; el.classList.add("forced-card-shuffle"); el.classList.add("card-shuffle-pulse"); });
  }

  function updateBackTexts(){
    if(!isCardMode()) return; var s=loadDaily();
    ["cardCaption","cardTutorialHint","hint"].forEach(function(id){ var el=$(id); if(!el) return; var t=el.textContent||""; if(t.indexOf("上下")>=0||t.indexOf("シャッフル")>=0||t.indexOf("めくって")>=0||t.indexOf("またあした")>=0){ el.textContent=s.drawn?"今日のカードは引き済み":"タップで今日のカードを引く"; } });
    var cap=$("cardCaption"); if(cap&&!s.drawn) cap.textContent="タップで今日のカードを引く"; if(cap&&s.drawn&&(cap.textContent||"").indexOf("上下")>=0) cap.textContent="今日のカードは引き済み";
  }

  function drawToday(){
    if(!isCardMode()||state.drawing) return; var s=loadDaily();
    if(s.drawn&&validIndex(Number(s.index))){ setCardIndex(Number(s.index)); setFlipped(false); renderSafe("flash"); syncDailyToCollection(); return; }
    state.drawing=true;
    drawLift(function(){
      var idx=randomIndexAvoidCurrent();
      setCardIndex(idx); saveDaily(idx); recordIndexOncePerDay(idx,todayKey());
      setFlipped(false); renderSafe("flash"); state.drawing=false;
    });
  }
  function shuffleBackOnly(step){
    if(!isCardMode()) return;
    var s=loadDaily();
    if(s.drawn&&validIndex(Number(s.index))) setCardIndex(Number(s.index));
    else setCardIndex(randomIndexAvoidCurrent());
    setFlipped(true);
    renderSafe(step>0?"slide-up":"slide-down");
    flyDeck(step||1);
  }

  function patchCore(){
    if(state.patched) return; state.patched=true;
    try{ if(typeof moveCard==="function"){ moveCard=function(step){ shuffleBackOnly(Number(step||1)); return; }; moveCard.__cardEngine=ENGINE_VERSION; } }catch(e){}
    try{ if(typeof randomWord==="function"){ var originalRandomWord=randomWord; randomWord=function(){ if(isCardMode()){ var s=loadDaily(); if(s.drawn&&validIndex(Number(s.index))){ setCardIndex(Number(s.index)); setFlipped(true); } else { setFlipped(true); } renderSafe("flash"); pulse(); return; } return originalRandomWord.apply(this,arguments); }; randomWord.__cardEngine=ENGINE_VERSION; } }catch(e){}
    try{ if(typeof render==="function"){ var originalRender=render; render=function(){ if(isCardMode()){ var s=loadDaily(); if(s.drawn&&validIndex(Number(s.index))) setCardIndex(Number(s.index)); } var r=originalRender.apply(this,arguments); setTimeout(updateBackTexts,0); return r; }; render.__cardEngine=ENGINE_VERSION; } }catch(e){}
  }

  function bindDailyDraw(){
    if(document.documentElement.dataset.cardEngineDailyBound==="1") return; document.documentElement.dataset.cardEngineDailyBound="1";
    document.addEventListener("click",function(e){ if(!isCardMode()) return; var target=e.target&&e.target.closest?e.target.closest("#flipCard,.flip-card,.card-inner,.card,.megane-card"):null; if(!target) return; var now=Date.now(); if(now-state.lastTap<140) return; state.lastTap=now; var s=loadDaily(); if(!s.drawn&&getFlipped()){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); drawToday(); return false; } },true);
  }

  function getTitle(idx){ var c=getCards()[idx]; if(!c) return "CARD "+String(idx+1).padStart(3,"0"); return c.title||c.name||c.label||c.id||("CARD "+String(idx+1).padStart(3,"0")); }
  function getImage(idx){ var c=getCards()[idx]; if(!c) return ""; return c.image||c.img||c.src||c.url||c.front||c.frontImage||c.cardImage||""; }
  function countMap(){ var arr=normalizeHistory(), map={}; arr.forEach(function(idx){ map[idx]=(map[idx]||0)+1; }); return map; }
  function summary(counts){ var totalKinds=getCards().length||0; var normalKinds=Math.max(0,totalKinds-1); var ownedKinds=Object.keys(counts||{}).filter(function(k){return Number(k)<normalKinds&&counts[k]>0;}).length; var totalOwned=Object.keys(counts||{}).reduce(function(sum,k){return sum+Number(counts[k]||0);},0); if(devCompleteOn()){ ownedKinds=normalKinds; totalOwned=Math.max(totalOwned,normalKinds); } var percent=normalKinds?Math.round((ownedKinds/normalKinds)*100):0; return {totalKinds:normalKinds,ownedKinds:ownedKinds,totalOwned:totalOwned,percent:percent}; }
  function renderOwned(idx,count,isNew){ var no=String(idx+1).padStart(3,"0"), title=getTitle(idx), img=getImage(idx); return '<div class="binder-item owned-card card-count-owned-inline" data-card-index="'+idx+'" style="position:relative;box-sizing:border-box;aspect-ratio:1/1.42;overflow:hidden;border-radius:18px;border:1px solid rgba(255,210,120,.44);background:rgba(255,255,255,.055);display:flex;align-items:center;justify-content:center;padding:5px;"><span class="binder-mini-no" style="position:absolute;left:8px;top:7px;z-index:5;font-size:11px;opacity:.7;">No.'+no+'</span>'+(isNew?'<span style="position:absolute;right:9px;top:7px;z-index:9;padding:2px 7px;border-radius:999px;background:rgba(255,221,82,.92);color:#241600;font-size:9px;font-weight:900;letter-spacing:.06em;box-shadow:0 0 14px rgba(255,220,90,.45);">NEW</span>':'')+'<span class="binder-count-badge" style="position:absolute;right:9px;top:'+(isNew?'30px':'8px')+';z-index:8;min-width:28px;height:21px;padding:0 7px;border-radius:999px;display:inline-grid;place-items:center;font-size:12px;font-weight:900;line-height:1;background:rgba(255,255,255,.88);color:rgba(10,12,18,.92);box-shadow:0 5px 14px rgba(0,0,0,.28);">×'+count+'</span><div style="width:88%;aspect-ratio:.68/1;overflow:hidden;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.30);background:rgba(0,0,0,.22);">'+(img?'<img src="'+esc(img)+'" alt="'+esc(title)+'" style="display:block;width:100%;height:100%;object-fit:contain;border-radius:10px;">':'<span style="display:grid;place-items:center;width:100%;height:100%;font-size:11px;font-weight:800;color:rgba(255,255,255,.72);text-align:center;">'+esc(title)+'</span>')+'</div><span style="position:absolute;left:9px;bottom:7px;font-size:10px;opacity:.52;">tap</span></div>'; }
  function renderLocked(idx){ var no=String(idx+1).padStart(3,"0"); return '<div class="binder-item binder-locked card-count-locked-inline" data-card-index="'+idx+'" style="position:relative;box-sizing:border-box;aspect-ratio:1/1.42;overflow:hidden;border-radius:18px;border:1px dashed rgba(255,210,120,.18);background:rgba(0,0,0,.20);display:flex;align-items:center;justify-content:center;padding:8px;opacity:.62;"><span class="binder-mini-no" style="position:absolute;left:8px;top:7px;z-index:5;font-size:11px;opacity:.58;">No.'+no+'</span><span style="position:absolute;right:7px;top:8px;z-index:8;min-width:30px;height:22px;padding:0 8px;border-radius:999px;display:inline-grid;place-items:center;font-size:12px;font-weight:900;line-height:1;background:rgba(255,255,255,.08);color:rgba(255,255,255,.34);border:1px solid rgba(255,255,255,.08);">×0</span><span style="font-size:18px;font-weight:900;letter-spacing:.08em;opacity:.48;">???</span></div>'; }
  function renderObserverStart(){ return '<div class="binder-observer-start" style="grid-column:1/-1;position:relative;box-sizing:border-box;border-radius:22px;border:1px solid rgba(255,210,120,.38);background:linear-gradient(145deg,rgba(255,210,120,.08),rgba(0,0,0,.18));min-height:260px;padding:18px 16px 22px;display:grid;grid-template-columns:1fr;gap:14px;align-items:center;justify-items:center;overflow:hidden;text-align:center;"><div style="position:relative;width:min(62vw,240px);aspect-ratio:.68/1;border-radius:14px;border:1px solid rgba(255,210,120,.32);background:radial-gradient(circle at 50% 28%,rgba(255,220,130,.16),transparent 42%),rgba(0,0,0,.32);display:grid;place-items:center;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.34);"><img src="images/cards/000_observer.png" alt="THE OBSERVER" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;grid&quot;;"><div style="display:none;place-items:center;width:100%;height:100%;padding:16px;text-align:center;color:rgba(255,230,170,.82);font-weight:900;letter-spacing:.08em;">0<br><br>THE<br>OBSERVER</div></div><div class="binder-observer-copy" style="color:rgba(255,235,205,.88);line-height:1.95;font-size:16px;font-weight:900;"><div style="font-size:25px;letter-spacing:.06em;margin-bottom:8px;color:rgba(255,245,225,.94);">No.000</div><div>あなたがカードを見た。</div><div style="height:1px;background:rgba(255,222,164,.18);margin:14px auto;width:88%;"></div><div>その瞬間</div><div>カードもあなたを見た。</div></div></div>'; }
  function isComplete(counts){ if(devCompleteOn()) return true; var arr=getCards(); if(!arr.length) return false; var target=Math.max(0,arr.length-1); return Object.keys(counts||{}).filter(function(k){return Number(k)<target&&counts[k]>0;}).length>=target; }
  function renderInfinitySlot(finalIdx,complete){ var label=complete?"No.∞":"No.???", title=complete?"THE LOOKING BEAR":"???", img=complete?"images/cards/no_infinity.png":""; var text=complete?'<div style="font-size:18px;font-weight:900;color:rgba(255,225,160,.96);letter-spacing:.08em;">BUG COLLECTION</div><div style="margin-top:4px;font-size:28px;font-weight:900;color:rgba(255,255,255,.92);">Complete</div><div style="height:1px;background:rgba(255,222,164,.18);margin:14px auto;width:88%;"></div><div>新しいバインダーが解放されました。</div>':''; return '<div class="binder-infinity-slot '+(complete?'complete':'locked')+'" data-card-index="'+finalIdx+'" style="grid-column:1/-1;position:relative;box-sizing:border-box;min-height:260px;border-radius:22px;border:'+(complete?'1px solid rgba(255,221,130,.62)':'1px dashed rgba(255,210,120,.22)')+';background:'+(complete?'linear-gradient(145deg,rgba(255,221,130,.12),rgba(0,0,0,.22))':'rgba(0,0,0,.18)')+';display:grid;grid-template-columns:1fr;gap:14px;align-items:center;justify-items:center;padding:18px 16px 22px;overflow:hidden;opacity:'+(complete?'1':'.82')+';text-align:center;"><span style="position:absolute;left:18px;top:16px;z-index:5;font-size:18px;font-weight:900;color:rgba(255,222,164,.88);">'+label+'</span><div style="width:min(62vw,240px);aspect-ratio:.68/1;border-radius:14px;border:1px solid rgba(255,210,120,.32);background:radial-gradient(circle at 50% 35%,rgba(255,210,120,.14),transparent 46%),rgba(0,0,0,.28);display:grid;place-items:center;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.28);">'+(complete&&img?'<img src="'+esc(img)+'" alt="'+esc(title)+'" style="width:100%;height:100%;object-fit:contain;display:block;">':'<span style="font-size:28px;font-weight:900;letter-spacing:.08em;color:rgba(255,222,164,.50);">???</span>')+'</div><div style="color:rgba(255,222,164,.82);line-height:1.7;font-size:16px;font-weight:900;">'+text+'</div></div>'; }

  function openCard(idx){ if(!validIndex(idx)) return; try{ appMode="cards"; setCardIndex(idx); setFlipped(false); var modal=$("binderModal"); if(modal) modal.style.display="none"; renderSafe("flash"); }catch(e){} }
  function maybeShowCompleteEvent(counts){ try{ if(!isComplete(counts)) return; if(localStorage.getItem(KEYS.completeShown)==="1") return; localStorage.setItem(KEYS.completeShown,"1"); }catch(e){} }
  function renderBinder(){ syncDailyToCollection(); var grid=$("binderGrid"); if(!grid) return; var arr=getCards(), counts=countMap(), news=loadJson(KEYS.newer,[]); if(!Array.isArray(news)) news=[]; news=news.map(function(x){return Number(x);}).filter(validIndex); if(devCompleteOn()){ for(var dk=0; dk<Math.max(0,arr.length-1); dk++){ if(!counts[dk]) counts[dk]=1; } } var s=summary(counts), complete=isComplete(counts), finalIdx=arr.length?arr.length-1:-1, normalLimit=Math.max(0,arr.length-1); var html='<div class="binder-count-summary"><div class="binder-count-main">コンプリート '+s.ownedKinds+' / '+s.totalKinds+'</div><div class="binder-count-meter"><span style="width:'+s.percent+'%"></span></div><div class="binder-count-subline">総所持 '+s.totalOwned+'枚　'+s.percent+'%</div></div>'+renderObserverStart(); for(var i=0;i<normalLimit;i++){ var count=counts[i]||0; html+=count>0?renderOwned(i,count,news.indexOf(i)>=0):renderLocked(i); } if(finalIdx>=0) html+=renderInfinitySlot(finalIdx,complete); grid.innerHTML=html; grid.querySelectorAll(".owned-card").forEach(function(el){ el.addEventListener("click",function(e){ e.preventDefault(); e.stopPropagation(); openCard(Number(el.dataset.cardIndex)); }); }); grid.querySelectorAll(".binder-infinity-slot.complete").forEach(function(el){ el.addEventListener("click",function(e){ e.preventDefault(); e.stopPropagation(); openCard(Number(el.dataset.cardIndex)); }); }); maybeShowCompleteEvent(counts); if(news.length) setTimeout(function(){ saveJson(KEYS.newer,[]); },1400); }
  function bindBinderOpen(){ var btn=$("openBinderBtn"), modal=$("binderModal"), close=$("binderCloseBtn"); if(btn&&!btn.dataset.cardEngineBinder){ btn.dataset.cardEngineBinder="1"; btn.onclick=function(e){ e.preventDefault(); e.stopPropagation(); if(!modal) return; modal.style.display="block"; renderBinder(); setTimeout(renderBinder,180); }; } if(close&&!close.dataset.cardEngineBinderClose){ close.dataset.cardEngineBinderClose="1"; close.onclick=function(e){ e.preventDefault(); e.stopPropagation(); if(modal) modal.style.display="none"; }; } }

  function ensureRandomPanelStyle(){ if($("cardEngineRandomStyle")) return; var st=document.createElement("style"); st.id="cardEngineRandomStyle"; st.textContent='#cardRandomTestButton{position:fixed;right:14px;bottom:max(88px,env(safe-area-inset-bottom));z-index:99980;width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,220,150,.32);background:rgba(0,0,0,.48);color:#fff;font-size:18px;font-weight:900;box-shadow:0 10px 28px rgba(0,0,0,.35)}#cardRandomTestPanel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99990;width:min(92vw,460px);max-height:78vh;overflow:auto;border-radius:24px;border:1px solid rgba(255,220,150,.28);background:rgba(16,14,20,.96);color:#fff;padding:16px;display:none;box-shadow:0 24px 80px rgba(0,0,0,.60)}#cardRandomTestPanel .crt-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}#cardRandomTestPanel button{border-radius:12px;padding:8px 10px;font-weight:900}#cardRandomTestPanel .crt-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}#cardRandomTestOutput{white-space:pre-wrap;font-size:12px;line-height:1.5;color:rgba(255,255,255,.82);background:rgba(0,0,0,.24);border-radius:14px;padding:12px;max-height:48vh;overflow:auto}'; document.head.appendChild(st); }
  function sampleRandom(times){ var n=drawCardCount(), rows=[], counts={}; for(var i=0;i<times;i++){ var idx=randomIndexRaw(); counts[idx]=(counts[idx]||0)+1; if(times<=20) rows.push("No."+String(idx+1).padStart(3,"0")+"　"+getTitle(idx)); } var ranked=Object.keys(counts).map(function(k){return {idx:Number(k),count:counts[k]};}).sort(function(a,b){return b.count!==a.count?b.count-a.count:a.idx-b.idx;}); return {n:n,rows:rows,summary:ranked.map(function(r){return "No."+String(r.idx+1).padStart(3,"0")+"　×"+r.count+"　"+getTitle(r.idx);}),counts:counts}; }
  function renderRandomResult(times){ var out=$("cardRandomTestOutput"); if(!out) return; var r=sampleRandom(times), text=""; text+="抽選回数: "+times+"\n"; text+="カード数: "+r.n+"\n"; text+="抽選対象: "+drawCardCount()+"枚（No.∞除外）\n\n"; if(times<=20) text+="結果:\n"+r.rows.join("\n")+"\n\n"; text+="集計:\n"+r.summary.join("\n"); out.textContent=text; try{ console.log("[MEGANE CardEngine random test]",r); }catch(e){} }
  function ensureRandomPanel(){ ensureRandomPanelStyle(); var panel=$("cardRandomTestPanel"); if(panel) return panel; panel=document.createElement("div"); panel.id="cardRandomTestPanel"; panel.innerHTML='<div class="crt-head"><strong>🎲 ランダム検査</strong><button type="button" id="cardRandomTestClose">×</button></div><div class="crt-actions"><button type="button" id="cardRandomTest10">10回</button><button type="button" id="cardRandomTest1000">1000回</button></div><pre id="cardRandomTestOutput">カード画面でテストできます。</pre>'; document.body.appendChild(panel); $("cardRandomTestClose").onclick=function(){ panel.style.display="none"; }; $("cardRandomTest10").onclick=function(){ renderRandomResult(10); }; $("cardRandomTest1000").onclick=function(){ renderRandomResult(1000); }; return panel; }
  function showRandomPanel(){ var p=ensureRandomPanel(); p.style.display="block"; renderRandomResult(10); }
  function randomTestEnabled(){ return localStorage.getItem("megane_developer_mode_v1")==="1" && localStorage.getItem("megane_dev_random_test")==="1"; }
  function ensureRandomButton(){ ensureRandomPanelStyle(); var visible=(isCardMode() && randomTestEnabled()); var panel=$("cardRandomTestPanel"); if(panel && !visible) panel.style.display="none"; var btn=$("cardRandomTestButton"); if(btn){ btn.style.display=visible?"block":"none"; return; } btn=document.createElement("button"); btn.id="cardRandomTestButton"; btn.type="button"; btn.textContent="🎲"; btn.title="ランダム検査"; btn.onclick=function(e){ e.preventDefault(); e.stopPropagation(); if(!randomTestEnabled()){ btn.style.display="none"; return; } showRandomPanel(); }; document.body.appendChild(btn); btn.style.display=visible?"block":"none"; }

  function boot(){ /* v6: old 2D touch disabled; 106 owns all card physics */ ensureCardEngineStyle(); patchCore(); bindDailyDraw(); bindBinderOpen(); normalizeHistory(); syncDailyToCollection(); updateBackTexts(); updateDeckStyle(); ensureRandomButton(); setInterval(function(){ patchCore(); bindBinderOpen(); updateBackTexts(); updateDeckStyle(); ensureRandomButton(); },900); ["click","touchend","pointerup"].forEach(function(type){ document.addEventListener(type,function(){ setTimeout(syncDailyToCollection,520); },true); }); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();

  window.MEGANE_CARD_ENGINE={ version:ENGINE_VERSION, drawToday:drawToday, loadDaily:loadDaily, syncDailyToCollection:syncDailyToCollection, renderBinder:renderBinder, countMap:countMap, normalizeHistory:normalizeHistory, sampleRandom:sampleRandom, showRandomPanel:showRandomPanel, pulse:pulse, playFlipVisualV6:playFlipVisualV6, resetTouchFeelV6:resetTouchFeelV6, flyDeck:flyDeck, updateDeckStyle:updateDeckStyle, resetToday:function(){ localStorage.removeItem(KEYS.daily); localStorage.removeItem(KEYS.recorded); renderSafe("flash"); }, resetCollection:function(){ localStorage.removeItem(KEYS.history); localStorage.removeItem(KEYS.unique); localStorage.removeItem(KEYS.newer); localStorage.removeItem(KEYS.recorded); localStorage.removeItem(KEYS.completeShown); renderBinder(); }, forceAdd:function(idx){ recordIndexOncePerDay(Number(idx),"dev-"+Date.now()); renderBinder(); } };
  window.renderBinder=renderBinder;
  window.meganeDrawTodayCard=drawToday;
})();
