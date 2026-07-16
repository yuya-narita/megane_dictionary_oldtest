/* v93: binder stable repair
   v92の上書きはしない。
   既存バインダー/リプレイ/裏返し遊びを活かしながら、
   保存カードのズレ、26枠、????色、NEW表示だけ補修。
*/
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";
  const TOTAL = 26;

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
  function getCard(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]) return cards[i];
    }catch(e){}
    return null;
  }
  function getImage(i){
    const c = getCard(i);
    return c ? (c.image || c.img || c.src || "") : "";
  }
  function getTitle(i){
    const c = getCard(i);
    return c ? (c.title || c.name || `CARD ${String(i+1).padStart(3,"0")}`) : "????";
  }

  // 保存済みカード番号を0〜25へ正規化
  function normalizeOwned(){
    let owned = load(BINDER_KEY, []);
    owned = owned.filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL);
    save(BINDER_KEY, Array.from(new Set(owned)));
    let news = load(NEW_KEY, []);
    news = news.filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL);
    save(NEW_KEY, Array.from(new Set(news)));
  }

  // flipCurrentCardの保存先をcardIndexに補正する保険。
  // 既存のflip動作は壊さない。
  function patchFlipSave(){
    try{
      if(typeof flipCurrentCard !== "function" || flipCurrentCard.__v93CardIndexSave) return;
      const old = flipCurrentCard;
      flipCurrentCard = function(){
        const before = (typeof cardIndex !== "undefined") ? cardIndex : null;
        const wasFlipped = (typeof cardFlipped !== "undefined") ? cardFlipped : null;
        const result = old.apply(this, arguments);

        setTimeout(function(){
          try{
            // 表を見たタイミングで保存。カード番号は必ずcardIndex。
            const idx = (typeof cardIndex !== "undefined") ? cardIndex : before;
            const nowFlipped = (typeof cardFlipped !== "undefined") ? cardFlipped : null;
            if(typeof idx === "number" && idx >= 0 && idx < TOTAL){
              let owned = load(BINDER_KEY, []);
              let news = load(NEW_KEY, []);
              if(!owned.includes(idx)){
                owned.push(idx);
                save(BINDER_KEY, owned);
                if(!news.includes(idx)){
                  news.push(idx);
                  save(NEW_KEY, news);
                }
                animateToBinder();
              }
            }
          }catch(e){}
        }, 120);

        return result;
      };
      flipCurrentCard.__v93CardIndexSave = true;
    }catch(e){}
  }

  function animateToBinder(){
    // 軽い「シュッ」演出。既存演出があっても邪魔しない。
    const img = document.querySelector("#cardImage, .flip-card img, .bug-card-image");
    const btn = document.getElementById("openBinderBtn");
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

  // 既存renderBinderの後処理で、26枠に整える。クリック処理は既存のまま。
  function postProcessBinder(){
    const grid = document.getElementById("binderGrid");
    if(!grid) return;

    normalizeOwned();

    const owned = load(BINDER_KEY, []);
    const news = load(NEW_KEY, []);

    // 既存renderBinderが多すぎる場合は26以降を削除
    Array.from(grid.querySelectorAll(".binder-item")).forEach(el=>{
      const idx = Number(el.dataset.idx);
      if(Number.isInteger(idx) && idx >= TOTAL) el.remove();
    });

    // 足りない枠を追加
    for(let i=0; i<TOTAL; i++){
      if(grid.querySelector(`.binder-item[data-idx="${i}"]`)) continue;

      const no = String(i+1).padStart(3,"0");
      if(owned.includes(i)){
        const img = getImage(i);
        const title = getTitle(i);
        const div = document.createElement("div");
        div.className = "binder-item binder-owned" + (news.includes(i) ? " new-fill" : "");
        div.dataset.idx = String(i);
        div.innerHTML = `
          <span class="binder-mini-no">No.${no}</span>
          ${news.includes(i) ? '<span class="binder-new-badge">NEW</span>' : ''}
          <div class="binder-mini-card">
            ${img ? `<img src="${esc(img)}" alt="${esc(title)}">` : `<span class="binder-mini-title fallback">${esc(title)}</span>`}
          </div>`;
        grid.appendChild(div);
      }else{
        const div = document.createElement("div");
        div.className = "binder-item binder-locked";
        div.dataset.idx = String(i);
        div.innerHTML = `
          <span class="binder-mini-no">No.${no}</span>
          <div class="binder-mini-card placeholder-card">
            <span class="binder-placeholder-title">????</span>
          </div>`;
        grid.appendChild(div);
      }
    }

    // NEWバッジがDOMに無い場合も復活
    grid.querySelectorAll(".binder-item").forEach(el=>{
      const idx = Number(el.dataset.idx);
      if(news.includes(idx) && !el.querySelector(".binder-new-badge")){
        const badge = document.createElement("span");
        badge.className = "binder-new-badge";
        badge.textContent = "NEW";
        el.appendChild(badge);
        el.classList.add("new-fill");
      }
    });
  }

  function patchRenderBinder(){
    try{
      if(typeof window.renderBinder !== "function" || window.renderBinder.__v93Post) return;
      const old = window.renderBinder;
      window.renderBinder = function(){
        const r = old.apply(this, arguments);
        setTimeout(postProcessBinder, 0);
        return r;
      };
      window.renderBinder.__v93Post = true;
    }catch(e){}
  }

  function cleanReplayBackText(){
    const flip = document.getElementById("binderReplayFlipCard");
    if(!flip || !flip.classList.contains("flipped")) return;
    ["binderReplayTitle","binderReplaySubtitle","binderReplayCaption","binderReplayCounter"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.textContent = "";
    });
  }

  function boot(){
    patchFlipSave();
    patchRenderBinder();
    postProcessBinder();
    cleanReplayBackText();
    setInterval(function(){
      patchFlipSave();
      patchRenderBinder();
      cleanReplayBackText();
    }, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
