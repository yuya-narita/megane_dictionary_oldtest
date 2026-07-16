/* v91: collection 26 + definition restore
   - バインダーはNo.001〜No.026まで表示
   - 未取得は???枠
   - 表面/詳細には一行定義(caption)を戻す
   - 操作説明は消す
*/
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";
  const TOTAL = 26;

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function save(key,val){
    try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }
  function card(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]) return cards[i];
    }catch(e){}
    return null;
  }
  function title(i){
    const c = card(i);
    return c ? (c.title || c.name || `CARD ${String(i+1).padStart(3,"0")}`) : "????";
  }
  function subtitle(i){
    const c = card(i);
    return c ? clean(c.subtitle || "") : "";
  }
  function caption(i){
    const c = card(i);
    return c ? (c.caption || "") : "";
  }
  function image(i){
    const c = card(i);
    return c ? (c.image || c.img || c.src || "") : "";
  }
  function back(i){
    const c = card(i);
    return c ? (c.back || "images/cards/card_back.png") : "images/cards/card_back.png";
  }
  function clean(s){
    return String(s || "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]裏表/g, "")
      .replace(/　?｜?\s*カードをめくると内容が現れる/g, "")
      .replace(/　?｜?\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード/g, "")
      .replace(/\s+$/g, "")
      .trim();
  }

  function renderOwned(i, isNew){
    const no = String(i+1).padStart(3,"0");
    const img = image(i);
    const t = title(i);
    return `
      <div class="binder-item ${isNew ? "new-fill" : ""}" data-idx="${i}">
        <span class="binder-mini-no">No.${no}</span>
        ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
        <div class="binder-mini-card">
          ${img ? `<img src="${esc(img)}" alt="${esc(t)}">` : `<span class="binder-mini-title fallback">${esc(t)}</span>`}
        </div>
      </div>`;
  }
  function renderLocked(i){
    const no = String(i+1).padStart(3,"0");
    return `
      <div class="binder-item binder-locked" data-idx="${i}">
        <span class="binder-mini-no">No.${no}</span>
        <div class="binder-mini-card placeholder-card">
          <span class="binder-placeholder-title">????</span>
        </div>
      </div>`;
  }

  window.renderBinder = function renderBinderV91(){
    const grid = document.getElementById("binderGrid");
    if(!grid) return;

    const owned = load(BINDER_KEY, []).filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL);
    const newOnes = load(NEW_KEY, []).filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL);

    let html = "";
    for(let i=0; i<TOTAL; i++){
      html += owned.includes(i) ? renderOwned(i, newOnes.includes(i)) : renderLocked(i);
    }
    grid.innerHTML = html;

    if(newOnes.length) setTimeout(()=>save(NEW_KEY, []), 1400);
  };

  function fixReplayTexts(){
    const front = document.getElementById("binderReplayFront");
    const backImg = document.getElementById("binderReplayBack");
    const flip = document.getElementById("binderReplayFlipCard");
    const titleEl = document.getElementById("binderReplayTitle");
    const subEl = document.getElementById("binderReplaySubtitle");
    const capEl = document.getElementById("binderReplayCaption");
    const counter = document.getElementById("binderReplayCounter");
    if(!flip || !titleEl || !subEl || !capEl) return;

    const isBack = flip.classList.contains("flipped");
    let idx = -1;

    try{
      if(front){
        const src = front.getAttribute("src") || "";
        if(typeof cards !== "undefined" && Array.isArray(cards)){
          idx = cards.findIndex(c => c && (c.image || "") === src);
        }
      }
    }catch(e){}

    if(isBack){
      titleEl.textContent = "";
      subEl.textContent = "";
      capEl.textContent = "";
      if(counter) counter.textContent = "";
      return;
    }

    if(idx >= 0){
      titleEl.textContent = title(idx);
      subEl.textContent = subtitle(idx);
      capEl.textContent = caption(idx);
    }else{
      subEl.textContent = clean(subEl.textContent || "");
    }
  }

  function fixCardSubtitleAndCaption(){
    const sub = document.getElementById("cardSubtitle");
    if(sub) sub.textContent = clean(sub.textContent || "");
    const hint = document.getElementById("hint");
    const counter = document.getElementById("counter");
    if(hint) hint.textContent = "";
    if(counter) counter.textContent = "";
  }

  function bindBinderClicks(){
    const grid = document.getElementById("binderGrid");
    if(!grid || grid.dataset.v91click) return;
    grid.dataset.v91click = "1";
    grid.addEventListener("click", function(e){
      const item = e.target.closest(".binder-item");
      if(!item || item.classList.contains("binder-locked")) return;
      const idx = Number(item.dataset.idx || 0);
      // 既存のリプレイ起動処理があれば使わせる。無い場合は何もしない。
      setTimeout(fixReplayTexts, 80);
    });
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__v91Collection26) return;
      const old = render;
      render = function(){
        const r = old.apply(this, arguments);
        setTimeout(function(){
          fixCardSubtitleAndCaption();
          fixReplayTexts();
        }, 0);
        return r;
      };
      render.__v91Collection26 = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    bindBinderClicks();
    fixCardSubtitleAndCaption();
    fixReplayTexts();
    setInterval(function(){
      patchRender();
      bindBinderClicks();
      fixCardSubtitleAndCaption();
      fixReplayTexts();
    }, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
