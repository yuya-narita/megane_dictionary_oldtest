/* 66_userdef_share_hint_text.js
   自分定義入力時の「保存後、自分カードで渡せます」をボタンっぽく見せない。
   機能には触らず、見た目だけ説明テキスト化。
*/
(() => {
  "use strict";

  function inject(){
    if(document.getElementById("userdefShareHintTextStyle")) return;
    const st = document.createElement("style");
    st.id = "userdefShareHintTextStyle";
    st.textContent = `
      #userDefinitionShare[disabled],
      #userDefinitionShare.disabled{
        border-color: transparent !important;
        background: transparent !important;
        box-shadow: none !important;
        color: rgba(255,255,255,.50) !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        letter-spacing: .02em !important;
        pointer-events: none !important;
        opacity: 1 !important;
        padding-left: 4px !important;
        padding-right: 4px !important;
      }
      #userDefinitionShare[disabled]::before,
      #userDefinitionShare.disabled::before{
        content: "※ ";
        opacity: .75;
      }
    `;
    document.head.appendChild(st);
  }

  function label(){
    const btn = document.getElementById("userDefinitionShare");
    if(!btn) return;
    if(btn.disabled || btn.classList.contains("disabled")){
      btn.textContent = "保存後、自分カードで渡せます";
      btn.setAttribute("aria-label", "保存後、自分カードで渡せます");
    }
  }

  function boot(){
    inject();
    label();
    document.addEventListener("click", () => setTimeout(label, 0), true);
    document.addEventListener("input", () => setTimeout(label, 0), true);
    setInterval(label, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
