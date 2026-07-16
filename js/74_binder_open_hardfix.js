/* v94: binder open hardfix
   - バインダー所有カードをタップしたら確実に詳細を開く
   - 既存の裏返し/スワイプ遊びをここで最低限復旧
   - 未取得????をDOM側でも統一
*/
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";
  const TOTAL = 26;

  let replayIndex = 0;
  let replayFlipped = false;
  let sx = 0, sy = 0, tracking = false;

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function save(key, val){
    try{localStorage.setItem(key, JSON.stringify(val));}catch(e){}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }
  function q(id){ return document.getElementById(id); }

  function card(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]) return cards[i];
    }catch(e){}
    return null;
  }
  function owned(){
    return load(BINDER_KEY, []).filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL);
  }
  function news(){
    return load(NEW_KEY, []).filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL);
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

  function renderReplay(){
    const e = els();
    const c = card(replayIndex);
    if(!e.viewer || !c) return;

    if(e.front){
      e.front.src = c.image || "";
      e.front.alt = c.title || "";
    }
    if(e.back){
      e.back.src = c.back || "images/cards/card_back.png";
      e.back.alt = (c.title || "カード") + " 裏面";
    }
    if(e.flip){
      e.flip.classList.toggle("flipped", replayFlipped);
    }

    if(replayFlipped){
      if(e.title) e.title.textContent = "";
      if(e.subtitle) e.subtitle.textContent = "";
      if(e.caption) e.caption.textContent = "";
      if(e.counter) e.counter.textContent = "";
    }else{
      if(e.title) e.title.textContent = c.title || "";
      if(e.subtitle) e.subtitle.textContent = clean(c.subtitle || "");
      if(e.caption) e.caption.textContent = c.caption || "";
      if(e.counter) e.counter.textContent = "No." + String(replayIndex + 1).padStart(3,"0");
    }

    if(e.text){
      e.text.innerHTML = c.detail || c.text || c.observe || fallbackText(c);
    }
  }

  function openReplay(idx){
    idx = Number(idx);
    if(!Number.isInteger(idx)) return;
    if(!owned().includes(idx)) return;
    if(!card(idx)) return;

    replayIndex = idx;
    replayFlipped = false;

    const e = els();
    if(!e.viewer) return;
    e.viewer.hidden = false;
    if(e.panel) e.panel.classList.remove("expanded");
    renderReplay();
  }

  function closeReplay(){
    const e = els();
    if(e.viewer) e.viewer.hidden = true;
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
    let pos = list.indexOf(replayIndex);
    if(pos < 0) pos = 0;
    pos = (pos + dir + list.length) % list.length;
    replayIndex = list[pos];
    replayFlipped = false;
    const e = els();
    if(e.panel) e.panel.classList.remove("expanded");
    renderReplay();
  }

  function normalizeLockedQuestionMarks(){
    document.querySelectorAll(".binder-item.binder-locked").forEach(item=>{
      item.classList.add("v94-locked");
      const mini = item.querySelector(".binder-mini-card");
      if(mini){
        mini.querySelectorAll("span:not(.binder-mini-no)").forEach(s=>s.remove());
        let label = mini.querySelector(".binder-placeholder-title");
        if(!label){
          label = document.createElement("span");
          label.className = "binder-placeholder-title";
          mini.appendChild(label);
        }
        label.textContent = "????";
      }else{
        item.querySelectorAll("span:not(.binder-mini-no)").forEach(s=>{
          s.classList.add("binder-placeholder-title");
          s.textContent = "????";
        });
      }
    });
  }

  function ensureNewBadges(){
    const ns = news();
    document.querySelectorAll(".binder-item").forEach(item=>{
      const idx = Number(item.dataset.idx);
      if(!Number.isInteger(idx)) return;
      if(ns.includes(idx) && !item.classList.contains("binder-locked")){
        item.classList.add("new-fill");
        if(!item.querySelector(".binder-new-badge")){
          const b = document.createElement("span");
          b.className = "binder-new-badge";
          b.textContent = "NEW";
          item.appendChild(b);
        }
      }
    });
  }

  function bindGridHard(){
    const grid = q("binderGrid");
    if(!grid || grid.dataset.v94HardOpen) return;
    grid.dataset.v94HardOpen = "1";

    // captureで既存処理より先に拾う
    grid.addEventListener("click", function(e){
      const item = e.target.closest(".binder-item");
      if(!item || item.classList.contains("binder-locked")) return;
      const idx = Number(item.dataset.idx);
      if(!Number.isInteger(idx)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openReplay(idx);
    }, true);
  }

  function bindReplayHard(){
    const e = els();
    if(!e.viewer || e.viewer.dataset.v94Replay) return;
    e.viewer.dataset.v94Replay = "1";

    if(e.close){
      e.close.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        closeReplay();
      });
    }

    if(e.flip){
      e.flip.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        flipReplay();
      });

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

    if(e.panel){
      e.panel.addEventListener("touchstart", function(ev){
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX; sy = t.clientY; tracking = true;
      }, {passive:true});

      e.panel.addEventListener("touchend", function(ev){
        if(!tracking) return;
        tracking = false;
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        const dy = t.clientY - sy;
        if(Math.abs(dy) > 36){
          if(dy < 0) e.panel.classList.add("expanded");
          else e.panel.classList.remove("expanded");
        }
      }, {passive:true});
    }
  }

  function patchRenderBinder(){
    try{
      if(typeof window.renderBinder !== "function" || window.renderBinder.__v94Hardfix) return;
      const old = window.renderBinder;
      window.renderBinder = function(){
        const r = old.apply(this, arguments);
        setTimeout(function(){
          normalizeLockedQuestionMarks();
          ensureNewBadges();
          bindGridHard();
        }, 0);
        return r;
      };
      window.renderBinder.__v94Hardfix = true;
    }catch(e){}
  }

  function tick(){
    patchRenderBinder();
    bindGridHard();
    bindReplayHard();
    normalizeLockedQuestionMarks();
    ensureNewBadges();
  }

  function boot(){
    tick();
    setInterval(tick, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
