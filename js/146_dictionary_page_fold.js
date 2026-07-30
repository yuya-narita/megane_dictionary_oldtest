/* 146_dictionary_page_fold.js
   v1: 辞書カード右上の「お気に入り」をページの折り目で表示する。
   保存ロジックは既存の 80_favorites_singleton.js をそのまま利用。
*/
(() => {
  "use strict";

  const STYLE_ID = "megane-dictionary-page-fold-style";

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* 辞書モードだけ星を折り目へ置き換える */
      body.mode-dictionary #favoriteLayer{
        right:0 !important;
        top:0 !important;
        width:48px !important;
        height:48px !important;
        padding:0 !important;
        margin:0 !important;
        overflow:visible !important;
        pointer-events:auto !important;
        z-index:80 !important;
      }

      body.mode-dictionary #favoriteToggle{
        position:relative !important;
        display:block !important;
        width:48px !important;
        height:48px !important;
        min-width:48px !important;
        min-height:48px !important;
        padding:0 !important;
        margin:0 !important;
        border:0 !important;
        border-radius:0 !important;
        background:transparent !important;
        box-shadow:none !important;
        color:transparent !important;
        font-size:0 !important;
        line-height:0 !important;
        overflow:visible !important;
        -webkit-tap-highlight-color:transparent !important;
        touch-action:manipulation !important;
      }

      /* 未保存：折れる場所だけを薄い斜線で示す */
      body.mode-dictionary #favoriteToggle::before{
        content:"" !important;
        display:block !important;
        position:absolute !important;
        top:7px !important;
        right:7px !important;
        width:20px !important;
        height:20px !important;
        border-top:1px solid rgba(255,255,255,.34) !important;
        border-right:1px solid rgba(255,255,255,.34) !important;
        background:linear-gradient(45deg,
          transparent 47%,
          rgba(255,255,255,.30) 48%,
          rgba(255,255,255,.30) 52%,
          transparent 53%) !important;
        box-shadow:none !important;
        opacity:.72 !important;
        transform:none !important;
        transition:opacity .16s ease, transform .16s ease !important;
        pointer-events:none !important;
      }

      body.mode-dictionary #favoriteToggle::after{
        content:"" !important;
        display:none !important;
        pointer-events:none !important;
      }

      /* 保存済み：ページ右上が実際に折れた状態 */
      body.mode-dictionary #favoriteToggle.active::before{
        top:0 !important;
        right:0 !important;
        width:0 !important;
        height:0 !important;
        border-top:0 !important;
        border-right:0 !important;
        border-left:25px solid transparent !important;
        border-bottom:25px solid rgba(238,231,208,.96) !important;
        background:none !important;
        opacity:1 !important;
        filter:drop-shadow(-2px 3px 3px rgba(0,0,0,.28)) !important;
        transform:none !important;
      }

      body.mode-dictionary #favoriteToggle.active::after{
        content:"" !important;
        display:block !important;
        position:absolute !important;
        top:0 !important;
        right:0 !important;
        width:25px !important;
        height:25px !important;
        background:linear-gradient(225deg,
          rgba(255,255,255,.52) 0%,
          rgba(222,211,180,.88) 54%,
          rgba(150,134,96,.72) 100%) !important;
        clip-path:polygon(100% 0, 0 0, 100% 100%) !important;
        box-shadow:inset -1px 1px 0 rgba(255,255,255,.32) !important;
        pointer-events:none !important;
      }

      body.mode-dictionary #favoriteToggle:active::before{
        opacity:1 !important;
        transform:scale(.94) !important;
      }

      body.mode-dictionary #favoriteToggle.active:active::before{
        transform:scale(.94) !important;
        transform-origin:top right !important;
      }

      @media (prefers-reduced-motion: reduce){
        body.mode-dictionary #favoriteToggle::before{
          transition:none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncAccessibility(){
    const button = document.getElementById("favoriteToggle");
    if(!button) return;
    const isDictionary = document.body.classList.contains("mode-dictionary");
    if(!isDictionary) return;
    const active = button.classList.contains("active");
    const label = active ? "折り目を戻す" : "このページを折る";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function install(){
    installStyle();
    syncAccessibility();

    const button = document.getElementById("favoriteToggle");
    if(button){
      const observer = new MutationObserver(syncAccessibility);
      observer.observe(button, {
        attributes:true,
        attributeFilter:["class", "hidden"]
      });
    }

    const bodyObserver = new MutationObserver(syncAccessibility);
    bodyObserver.observe(document.body, {
      attributes:true,
      attributeFilter:["class", "data-mode"]
    });

    window.addEventListener("pageshow", syncAccessibility);
    setInterval(syncAccessibility, 1200);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", install, {once:true});
  }else{
    install();
  }
})();
