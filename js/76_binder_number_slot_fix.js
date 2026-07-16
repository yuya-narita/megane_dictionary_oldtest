/* v96: binder number slot fix
   - バインダーはカード配列順ではなく、カード固有No.に合わせて格納
   - 未取得????を完全統一
   - 既存の詳細ビュー/裏返し遊びは維持しつつ、slotから実カードを引く
*/
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";
  const TOTAL = 26;

  // 現在の5枚のカード番号。後でcards側に no/cardNo/number を入れたらそちらを優先。
  const MANUAL_NO_BY_TITLE = {
    "白クマバグ": 1,
    "再帰": 3,
    "教義": 4,
    "ダブルバインド": 9,
    "H(x)バグ": 12,
    "H（x）バグ": 12
  };

  function q(id){ return document.getElementById(id); }
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
  function cardsArray(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    return [];
  }
  function getCardByIndex(i){
    const arr = cardsArray();
    return arr[i] || null;
  }
  function getCardNoFromCard(c, fallbackIndex){
    if(!c) return fallbackIndex + 1;

    const raw = c.no ?? c.number ?? c.cardNo ?? c.num ?? c.idNo;
    const n = Number(raw);
    if(Number.isInteger(n) && n >= 1 && n <= TOTAL) return n;

    const title = c.title || c.name || "";
    if(MANUAL_NO_BY_TITLE[title]) return MANUAL_NO_BY_TITLE[title];

    // image名から推定したい場合用。必要なら後で追加。
    return fallbackIndex + 1;
  }
  function slotFromCardIndex(cardIdx){
    const c = getCardByIndex(cardIdx);
    const no = getCardNoFromCard(c, cardIdx);
    return Math.max(0, Math.min(TOTAL - 1, no - 1));
  }
  function cardIndexFromSlot(slot){
    const arr = cardsArray();
    for(let i=0; i<arr.length; i++){
      if(slotFromCardIndex(i) === slot) return i;
    }
    return -1;
  }
  function cardFromSlot(slot){
    const idx = cardIndexFromSlot(slot);
    return idx >= 0 ? getCardByIndex(idx) : null;
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

  function migrateOwnedToSlots(){
    const oldOwned = load(BINDER_KEY, []);
    const oldNew = load(NEW_KEY, []);

    function normalize(list){
      const out = [];
      list.forEach(v => {
        if(!Number.isInteger(v)) return;
        if(v < 0) return;

        // cards配列のindexとして存在するなら、カードNo.のslotへ変換
        if(getCardByIndex(v)){
          out.push(slotFromCardIndex(v));
          return;
        }

        // すでにslot番号として有効なら残す
        if(v < TOTAL) out.push(v);
      });
      return Array.from(new Set(out.filter(v => v >= 0 && v < TOTAL)));
    }

    const owned = normalize(oldOwned);
    const news = normalize(oldNew);
    save(BINDER_KEY, owned);
    save(NEW_KEY, news);
    return {owned, news};
  }

  function markOwnedByCardIndex(cardIdx){
    const slot = slotFromCardIndex(cardIdx);
    let owned = load(BINDER_KEY, []);
    let news = load(NEW_KEY, []);
    owned = migrateOwnedToSlots().owned;
    news = load(NEW_KEY, []);

    if(!owned.includes(slot)){
      owned.push(slot);
      save(BINDER_KEY, Array.from(new Set(owned)));
      if(!news.includes(slot)){
        news.push(slot);
        save(NEW_KEY, Array.from(new Set(news)));
      }
      animateToBinder();
    }
  }

  function patchFlipSave(){
    try{
      if(typeof flipCurrentCard !== "function" || flipCurrentCard.__v96NumberSlotSave) return;
      const old = flipCurrentCard;
      flipCurrentCard = function(){
        const before = (typeof cardIndex !== "undefined") ? cardIndex : null;
        const r = old.apply(this, arguments);

        setTimeout(function(){
          try{
            const idx = (typeof cardIndex !== "undefined") ? cardIndex : before;
            if(Number.isInteger(idx)) markOwnedByCardIndex(idx);
          }catch(e){}
        }, 120);

        return r;
      };
      flipCurrentCard.__v96NumberSlotSave = true;
    }catch(e){}
  }

  function renderOwnedSlot(slot, isNew){
    const no = String(slot + 1).padStart(3, "0");
    const c = cardFromSlot(slot);
    const title = c ? (c.title || c.name || `CARD ${no}`) : `CARD ${no}`;
    const img = c ? (c.image || c.img || c.src || "") : "";

    return `
      <div class="binder-item binder-owned ${isNew ? "new-fill" : ""}" data-idx="${slot}" data-slot="${slot}">
        <span class="binder-mini-no">No.${no}</span>
        ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
        <div class="binder-mini-card">
          ${img ? `<img src="${esc(img)}" alt="${esc(title)}">` : `<span class="binder-mini-title fallback">${esc(title)}</span>`}
        </div>
      </div>`;
  }

  function renderLockedSlot(slot){
    const no = String(slot + 1).padStart(3, "0");
    return `
      <div class="binder-item binder-locked v96-locked" data-idx="${slot}" data-slot="${slot}">
        <span class="binder-mini-no">No.${no}</span>
        <div class="binder-mini-card placeholder-card">
          <span class="binder-placeholder-title">????</span>
        </div>
      </div>`;
  }

  window.renderBinder = function renderBinderV96(){
    const grid = q("binderGrid");
    if(!grid) return;

    const migrated = migrateOwnedToSlots();
    const owned = migrated.owned;
    const news = migrated.news;

    let html = "";
    for(let slot=0; slot<TOTAL; slot++){
      html += owned.includes(slot) ? renderOwnedSlot(slot, news.includes(slot)) : renderLockedSlot(slot);
    }
    grid.innerHTML = html;
    bindGrid();

    if(news.length){
      setTimeout(()=>save(NEW_KEY, []), 3000);
    }
  };

  let replaySlot = 0;
  let replayFlipped = false;
  let sx = 0, sy = 0, tracking = false;

  function replayEls(){
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
    const e = replayEls();
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
      if(e.counter) e.counter.textContent = "No." + String(replaySlot + 1).padStart(3,"0");
    }

    if(e.text){
      e.text.innerHTML = c.detail || c.text || c.observe || fallbackText(c);
    }
  }

  function openReplay(slot){
    const owned = migrateOwnedToSlots().owned;
    slot = Number(slot);
    if(!Number.isInteger(slot) || !owned.includes(slot)) return;
    if(!cardFromSlot(slot)) return;

    replaySlot = slot;
    replayFlipped = false;

    const e = replayEls();
    if(!e.viewer) return;
    e.viewer.hidden = false;
    if(e.panel) e.panel.classList.remove("expanded");
    renderReplay();
  }

  function flipReplay(){
    replayFlipped = !replayFlipped;
    renderReplay();
    const e = replayEls();
    if(e.flip){
      e.flip.classList.remove("flip-pop");
      void e.flip.offsetWidth;
      e.flip.classList.add("flip-pop");
    }
  }

  function moveReplay(dir){
    const owned = migrateOwnedToSlots().owned;
    if(!owned.length) return;
    let pos = owned.indexOf(replaySlot);
    if(pos < 0) pos = 0;
    pos = (pos + dir + owned.length) % owned.length;
    replaySlot = owned[pos];
    replayFlipped = false;
    const e = replayEls();
    if(e.panel) e.panel.classList.remove("expanded");
    renderReplay();
  }

  function bindGrid(){
    const grid = q("binderGrid");
    if(!grid || grid.dataset.v96NumberSlot) return;
    grid.dataset.v96NumberSlot = "1";

    grid.addEventListener("click", function(ev){
      const item = ev.target.closest(".binder-item");
      if(!item || item.classList.contains("binder-locked")) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openReplay(Number(item.dataset.slot ?? item.dataset.idx));
    }, true);
  }

  function bindReplay(){
    const e = replayEls();
    if(!e.viewer || e.viewer.dataset.v96NumberSlot) return;
    e.viewer.dataset.v96NumberSlot = "1";

    if(e.close){
      e.close.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        e.viewer.hidden = true;
      });
    }

    if(e.flip){
      e.flip.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        flipReplay();
      });

      e.flip.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX; sy = t.clientY; tracking = true;
      }, {passive:true});

      e.flip.addEventListener("touchend", ev=>{
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
      e.panel.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX; sy = t.clientY; tracking = true;
      }, {passive:true});

      e.panel.addEventListener("touchend", ev=>{
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

  function animateToBinder(){
    const img = document.querySelector("#cardImage, .flip-card img, .bug-card-image");
    const btn = q("openBinderBtn");
    if(!img || !btn) return;
    const r1 = img.getBoundingClientRect();
    const r2 = btn.getBoundingClientRect();
    if(!r1.width || !r2.width) return;

    const ghost = img.cloneNode(true);
    ghost.className = "binder-fly-ghost";
    ghost.style.left = r1.left + "px";
    ghost.style.top = r1.top + "px";
    ghost.style.width = r1.width + "px";
    ghost.style.height = r1.height + "px";
    ghost.style.setProperty("--to-x", (r2.left + r2.width/2 - r1.left - r1.width/2) + "px");
    ghost.style.setProperty("--to-y", (r2.top + r2.height/2 - r1.top - r1.height/2) + "px");
    document.body.appendChild(ghost);
    setTimeout(()=>ghost.remove(), 780);
  }

  function patchRender(){
    try{
      if(typeof render === "function" && !render.__v96NumberSlot){
        const old = render;
        render = function(){
          const r = old.apply(this, arguments);
          setTimeout(()=>{ patchFlipSave(); bindGrid(); bindReplay(); }, 0);
          return r;
        };
        render.__v96NumberSlot = true;
      }
    }catch(e){}
  }

  function boot(){
    migrateOwnedToSlots();
    patchFlipSave();
    patchRender();
    bindGrid();
    bindReplay();
    setInterval(()=>{ patchFlipSave(); patchRender(); bindGrid(); bindReplay(); }, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
