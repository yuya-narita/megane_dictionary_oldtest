/* v95: binder caption + ???? final fix
   - バインダー詳細の一行定義(caption)を必ず表示
   - 未取得????をDOM側で1つに統一し、茶色表示に固定
*/
(function(){
  const BINDER_KEY = "binderV98";
  const TOTAL = 26;

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
  function clean(s){
    return String(s || "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]裏表/g, "")
      .replace(/　?｜?\s*カードをめくると内容が現れる/g, "")
      .replace(/　?｜?\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード/g, "")
      .trim();
  }
  function card(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]) return cards[i];
    }catch(e){}
    return null;
  }
  function findReplayIndex(){
    const front = q("binderReplayFront");
    if(front){
      const src = front.getAttribute("src") || "";
      try{
        if(typeof cards !== "undefined" && Array.isArray(cards)){
          const idx = cards.findIndex(c => c && (c.image || "") === src);
          if(idx >= 0) return idx;
        }
      }catch(e){}
    }

    const counter = q("binderReplayCounter");
    if(counter){
      const m = (counter.textContent || "").match(/No\.(\d+)/);
      if(m){
        const idx = Number(m[1]) - 1;
        if(idx >= 0 && idx < TOTAL) return idx;
      }
    }
    return -1;
  }

  function restoreReplayCaption(){
    const flip = q("binderReplayFlipCard");
    const title = q("binderReplayTitle");
    const subtitle = q("binderReplaySubtitle");
    const caption = q("binderReplayCaption");
    const counter = q("binderReplayCounter");
    if(!caption && !title && !subtitle) return;

    const isBack = !!(flip && flip.classList.contains("flipped"));
    if(isBack){
      if(title) title.textContent = "";
      if(subtitle) subtitle.textContent = "";
      if(caption) caption.textContent = "";
      if(counter) counter.textContent = "";
      return;
    }

    const idx = findReplayIndex();
    if(idx < 0) return;
    const c = card(idx);
    if(!c) return;

    if(title) {
      title.textContent = c.title || "";
      title.classList.remove("v89-hidden-text-slot");
      title.style.opacity = "";
      title.style.visibility = "";
    }
    if(subtitle) {
      subtitle.textContent = clean(c.subtitle || "");
      subtitle.classList.remove("v89-hidden-text-slot");
      subtitle.style.opacity = "";
      subtitle.style.visibility = "";
    }
    if(caption) {
      caption.textContent = c.caption || "";
      caption.classList.remove("v89-hidden-text-slot");
      caption.style.display = "block";
      caption.style.opacity = "1";
      caption.style.visibility = "visible";
    }
  }

  function normalizeQuestionMarks(){
    document.querySelectorAll(".binder-item.binder-locked").forEach(item => {
      item.classList.add("v95-locked");

      // No.表記以外の直下テキスト/余計な????を消す
      Array.from(item.childNodes).forEach(node => {
        if(node.nodeType === 3 && node.textContent.trim()) node.textContent = "";
      });
      item.querySelectorAll("span").forEach(span => {
        if(span.classList.contains("binder-mini-no")) return;
        if(span.classList.contains("binder-placeholder-title")) return;
        span.remove();
      });

      let mini = item.querySelector(".binder-mini-card");
      if(!mini){
        mini = document.createElement("div");
        mini.className = "binder-mini-card placeholder-card";
        item.appendChild(mini);
      }
      mini.classList.add("placeholder-card");

      // mini内もNo以外はplaceholder 1個に統一
      mini.querySelectorAll("span").forEach(span => {
        if(!span.classList.contains("binder-placeholder-title")) span.remove();
      });
      mini.querySelectorAll("*").forEach(el => {
        if(el.tagName === "SPAN" && el.classList.contains("binder-placeholder-title")) return;
      });

      let label = mini.querySelector(".binder-placeholder-title");
      if(!label){
        label = document.createElement("span");
        label.className = "binder-placeholder-title";
        mini.innerHTML = "";
        mini.appendChild(label);
      }
      label.textContent = "????";
      label.style.color = "#c09162";
    });
  }

  function patchRender(){
    try{
      if(typeof render !== "function" && typeof window.renderBinder !== "function") return;
      if(typeof render === "function" && !render.__v95CaptionQuestionFix){
        const oldRender = render;
        render = function(){
          const r = oldRender.apply(this, arguments);
          setTimeout(function(){
            restoreReplayCaption();
            normalizeQuestionMarks();
          }, 0);
          return r;
        };
        render.__v95CaptionQuestionFix = true;
      }
      if(typeof window.renderBinder === "function" && !window.renderBinder.__v95CaptionQuestionFix){
        const oldBinder = window.renderBinder;
        window.renderBinder = function(){
          const r = oldBinder.apply(this, arguments);
          setTimeout(function(){
            normalizeQuestionMarks();
            restoreReplayCaption();
          }, 0);
          return r;
        };
        window.renderBinder.__v95CaptionQuestionFix = true;
      }
    }catch(e){}
  }

  function boot(){
    patchRender();
    restoreReplayCaption();
    normalizeQuestionMarks();
    setInterval(function(){
      patchRender();
      restoreReplayCaption();
      normalizeQuestionMarks();
    }, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
