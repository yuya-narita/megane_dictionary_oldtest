/* v98: binder pointer open fix
   clickが拾えない環境用。
   pointerup/touchend/clickの3系統で所有カードを開く。
*/
(function(){
  const BINDER_KEY = "binderV98";
  const TOTAL = 26;

  const MANUAL_NO_BY_TITLE = {
    "白クマバグ": 1,
    "再帰": 3,
    "教義": 4,
    "ダブルバインド": 9,
    "H(x)バグ": 12,
    "H（x）バグ": 12
  };

  let replaySlot = 0;
  let replayFlipped = false;
  let sx = 0, sy = 0, tracking = false;

  function q(id){ return document.getElementById(id); }
  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }
  function arr(){
    try{ if(typeof cards !== "undefined" && Array.isArray(cards)) return cards; }catch(e){}
    return [];
  }
  function cardByIndex(i){ return arr()[i] || null; }
  function cardNo(c, fallbackIndex){
    if(!c) return fallbackIndex + 1;
    const raw = c.no ?? c.number ?? c.cardNo ?? c.num ?? c.idNo;
    const n = Number(raw);
    if(Number.isInteger(n) && n >= 1 && n <= TOTAL) return n;
    const t = c.title || c.name || "";
    if(MANUAL_NO_BY_TITLE[t]) return MANUAL_NO_BY_TITLE[t];
    return fallbackIndex + 1;
  }
  function slotFromCardIndex(i){
    const c = cardByIndex(i);
    return Math.max(0, Math.min(TOTAL - 1, cardNo(c, i) - 1));
  }
  function cardIndexFromSlot(slot){
    const a = arr();
    for(let i=0;i<a.length;i++){
      if(slotFromCardIndex(i) === slot) return i;
    }
    return -1;
  }
  function cardFromSlot(slot){
    const idx = cardIndexFromSlot(slot);
    return idx >= 0 ? cardByIndex(idx) : null;
  }
  function clean(s){
    return String(s || "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]裏表/g, "")
      .replace(/　?｜?\s*カードをめくると内容が現れる/g, "")
      .replace(/　?｜?\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード/g, "")
      .trim();
  }
  function owned(){
    return load(BINDER_KEY, []).filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL && !!cardFromSlot(n));
  }

  function els(){
    return {
      viewer:q("binderReplayViewer"),
      close:q("binderReplayClose"),
      flip:q("binderReplayFlipCard"),
      front:q("binderReplayFront"),
      back:q("binderReplayBack"),
      title:q("binderReplayTitle"),
      subtitle:q("binderReplaySubtitle"),
      caption:q("binderReplayCaption"),
      counter:q("binderReplayCounter"),
      panel:q("binderReplayTextPanel"),
      text:q("binderReplayTextInner")
    };
  }

  function fallbackText(c){
    const cap = c && c.caption ? esc(c.caption) : "このカードの観測ログは準備中です。";
    return `
      <h3>OBSERVE</h3>
      <p>${cap}</p>
      <h3>BUG</h3>
      <p>意味は、対象そのものだけでは決まらない。見るタイミング、気分、場所によって、同じカードでも違うものに見えてしまう。</p>
      <h3>LOOK BACK</h3>
      <p>このカードを引いた瞬間、何が少しだけ引っかかったのかを観測する。</p>
    `;
  }

  function renderReplay(){
    const e = els();
    const c = cardFromSlot(replaySlot);
    if(!e.viewer || !c) return;

    if(e.front){
      e.front.src = c.image || "";
      e.front.alt = c.title || "";
    }
    if(e.back){
      e.back.src = c.back || "images/cards/card_back.png";
      e.back.alt = (c.title || "カード") + " 裏面";
    }
    if(e.flip) e.flip.classList.toggle("flipped", replayFlipped);

    if(replayFlipped){
      if(e.title) e.title.textContent = "";
      if(e.subtitle) e.subtitle.textContent = "";
      if(e.caption) e.caption.textContent = "";
      if(e.counter) e.counter.textContent = "";
    }else{
      if(e.title) e.title.textContent = c.title || "";
      if(e.subtitle) e.subtitle.textContent = clean(c.subtitle || "");
      if(e.caption) e.caption.textContent = c.caption || "";
      if(e.counter) e.counter.textContent = "No." + String(replaySlot + 1).padStart(3,"0");
    }

    if(e.text) e.text.innerHTML = c.detail || c.text || c.observe || fallbackText(c);
  }

  function openReplay(slot){
    slot = Number(slot);
    if(!Number.isInteger(slot)) return;
    if(!owned().includes(slot)) return;

    replaySlot = slot;
    replayFlipped = false;

    const e = els();
    if(!e.viewer) return;

    e.viewer.hidden = false;
    e.viewer.removeAttribute("hidden");
    e.viewer.style.display = "block";
    e.viewer.style.visibility = "visible";
    e.viewer.style.opacity = "1";
    if(e.panel) e.panel.classList.remove("expanded");

    renderReplay();
  }

  function flipReplay(){
    replayFlipped = !replayFlipped;
    renderReplay();
    const e = els();
    if(e.flip){
      e.flip.classList.remove("flip-pop");
      void e.flip.offsetWidth;
      e.flip.classList.add("flip-pop");
    }
  }

  function moveReplay(dir){
    const list = owned();
    if(!list.length) return;
    let pos = list.indexOf(replaySlot);
    if(pos < 0) pos = 0;
    pos = (pos + dir + list.length) % list.length;
    replaySlot = list[pos];
    replayFlipped = false;
    const e = els();
    if(e.panel) e.panel.classList.remove("expanded");
    renderReplay();
  }

  function handleBinderPress(ev){
    const item = ev.target && ev.target.closest ? ev.target.closest(".binder-item") : null;
    if(!item || item.classList.contains("binder-locked")) return;

    const slot = Number(item.dataset.slot ?? item.dataset.idx);
    if(!Number.isInteger(slot)) return;

    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();

    openReplay(slot);
  }

  function bindGrid(){
    const grid = q("binderGrid");
    if(!grid || grid.dataset.v98PointerOpen) return;
    grid.dataset.v98PointerOpen = "1";

    grid.addEventListener("pointerup", handleBinderPress, true);
    grid.addEventListener("click", handleBinderPress, true);
    grid.addEventListener("touchend", handleBinderPress, {capture:true, passive:false});
  }

  function bindReplay(){
    const e = els();
    if(!e.viewer || e.viewer.dataset.v98PointerOpen) return;
    e.viewer.dataset.v98PointerOpen = "1";

    if(e.close){
      e.close.addEventListener("pointerup", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        e.viewer.hidden = true;
        e.viewer.style.display = "";
      }, true);
    }

    if(e.flip){
      e.flip.addEventListener("pointerup", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        flipReplay();
      }, true);

      e.flip.addEventListener("touchstart", function(ev){
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX; sy = t.clientY; tracking = true;
      }, {passive:true});

      e.flip.addEventListener("touchend", function(ev){
        if(!tracking) return;
        tracking = false;
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if(Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.15){
          ev.preventDefault();
          ev.stopPropagation();
          flipReplay();
        }else if(Math.abs(dy) > 52 && Math.abs(dy) > Math.abs(dx) * 1.15){
          ev.preventDefault();
          ev.stopPropagation();
          moveReplay(dy < 0 ? 1 : -1);
        }
      }, {passive:false});
    }
  }

  function patchBinderRender(){
    try{
      if(typeof window.renderBinder === "function" && !window.renderBinder.__v98PointerOpen){
        const old = window.renderBinder;
        window.renderBinder = function(){
          const r = old.apply(this, arguments);
          setTimeout(bindGrid, 0);
          return r;
        };
        window.renderBinder.__v98PointerOpen = true;
      }
    }catch(e){}
  }

  function boot(){
    patchBinderRender();
    bindGrid();
    bindReplay();
    setInterval(function(){
      patchBinderRender();
      bindGrid();
      bindReplay();
    }, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
