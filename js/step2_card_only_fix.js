
/* Step2 card-only fix from Step1-fixed-date base
   - 辞書の日付修正は触らない
   - カードのメタ/サブタイトルを中央寄せ
   - 「またあした」は高さを壊さないよう透明化
*/
(function(){
  function isCardMode(){
    return document.body.classList.contains("mode-cards") ||
           document.querySelector(".card-mode, .bug-card, #cardTitle, #cardSubtitle");
  }

  function centerCardMeta(){
    if(!isCardMode()) return;

    const selectors = [
      "#cardSubtitle",
      ".card-subtitle",
      ".bug-card-subtitle",
      ".card-meta",
      ".card-detail-meta",
      ".bug-card-meta",
      ".card-info-line",
      ".bug-card-info-line"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function(el){
      el.style.width = "100%";
      el.style.maxWidth = "100%";
      el.style.display = "block";
      el.style.textAlign = "center";
      el.style.justifyContent = "center";
      el.style.alignItems = "center";
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
      if(el.parentElement) el.parentElement.style.textAlign = "center";
    });

    // 実テキストから直接探す。DOUBLE BIND｜命令→矛盾 など
    document.querySelectorAll("*").forEach(function(el){
      if(!el || el.children.length > 2) return;
      const t = (el.textContent || "").trim();
      if(t.length > 0 && t.length < 80 && /^[A-Z0-9()∞\s-]+[|｜]\s*.+/.test(t)){
        el.style.width = "100%";
        el.style.display = "block";
        el.style.textAlign = "center";
        el.style.justifyContent = "center";
        el.style.alignItems = "center";
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
        if(el.parentElement) el.parentElement.style.textAlign = "center";
      }
    });
  }

  function hideMataAshitaPreserveHeight(){
    if(!isCardMode()) return;
    document.querySelectorAll("*").forEach(function(el){
      const t = (el.textContent || "").trim();
      if(t === "またあした"){
        el.style.opacity = "0";
        el.style.visibility = "visible";
        el.style.pointerEvents = "none";
      }
    });
  }

  function patch(){
    centerCardMeta();
    hideMataAshitaPreserveHeight();
  }

  function patchRender(){
    try{
      if(typeof render === "function" && !render.__step2CardOnlyFix){
        const old = render;
        render = function(){
          const r = old.apply(this, arguments);
          setTimeout(patch, 0);
          setTimeout(patch, 120);
          return r;
        };
        render.__step2CardOnlyFix = true;
      }
    }catch(e){}
  }

  function boot(){
    patchRender();
    patch();
    document.addEventListener("click", function(){ setTimeout(patch, 80); setTimeout(patch, 240); }, true);
    document.addEventListener("touchend", function(){ setTimeout(patch, 80); }, true);
    setInterval(function(){ patchRender(); patch(); }, 800);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
