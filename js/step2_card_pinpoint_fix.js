
/* Step2 pinpoint card fix
   - Step1の日付修正維持
   - 「上下:カード/左右:めくる」だけ削除
   - 「自由にしていい。でも間違えないで。」は残す
   - 裏面テキストの高さは維持
*/
(function(){
  function isCardMode(){
    return document.body.classList.contains("mode-cards") ||
      !!document.querySelector("#cardTitle, #cardSubtitle, #cardCaption, .bug-card-title, .bug-card-subtitle, .bug-card-caption");
  }

  function cleanOpsText(s){
    let out = String(s || "");

    // 「 | 上下:カード/左右:めくる」だけを消す
    out = out.replace(/\s*[|｜]\s*上下[:：]カード\s*\/\s*左右[:：]めくる/g, "");

    // 文頭や単独の「上下:カード/左右:めくる」だけを消す
    out = out.replace(/^\s*上下[:：]カード\s*\/\s*左右[:：]めくる\s*$/g, "");

    // 「 | 左右:めくる」「 | 上下:カード」だけを消す
    out = out.replace(/\s*[|｜]\s*左右[:：]めくる/g, "");
    out = out.replace(/\s*[|｜]\s*上下[:：]カード/g, "");

    // 文頭・単独だけ
    out = out.replace(/^\s*左右[:：]めくる\s*$/g, "");
    out = out.replace(/^\s*上下[:：]カード\s*$/g, "");

    out = out.replace(/\s{2,}/g, " ").trim();
    return out;
  }

  function patchCardText(){
    if(!isCardMode()) return;

    const targets = [
      "#cardSubtitle",
      ".bug-card-subtitle",
      ".card-subtitle",
      ".card-meta",
      ".card-detail-meta",
      ".bug-card-meta",
      ".card-info-line",
      ".bug-card-info-line"
    ];

    targets.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        const before = el.textContent || "";
        const after = cleanOpsText(before);
        if(after !== before){
          if(after){
            el.textContent = after;
          } else {
            // 説明だけの行は高さ維持で透明化
            el.style.opacity = "0";
            el.style.visibility = "visible";
            el.style.pointerEvents = "none";
          }
        }

        el.style.width = "100%";
        el.style.maxWidth = "100%";
        el.style.textAlign = "center";
        el.style.justifyContent = "center";
        el.style.alignItems = "center";
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
        if(el.parentElement) el.parentElement.style.textAlign = "center";
      });
    });

    // 直接テキストノードを持つ要素だけ。captionなど関係ない文言は消さない。
    document.querySelectorAll("*").forEach(function(el){
      if(!el || !el.childNodes || el.childNodes.length !== 1 || el.childNodes[0].nodeType !== 3) return;
      const before = el.textContent || "";
      if(!/(上下[:：]カード|左右[:：]めくる)/.test(before)) return;

      const after = cleanOpsText(before);
      if(after !== before){
        if(after){
          el.textContent = after;
        } else {
          el.style.opacity = "0";
          el.style.visibility = "visible";
          el.style.pointerEvents = "none";
        }
      }
    });
  }

  function patchRender(){
    try{
      if(typeof render === "function" && !render.__step2PinpointCardFix){
        const old = render;
        render = function(){
          const r = old.apply(this, arguments);
          setTimeout(patchCardText, 0);
          setTimeout(patchCardText, 120);
          return r;
        };
        render.__step2PinpointCardFix = true;
      }
    }catch(e){}
  }

  function boot(){
    patchRender();
    patchCardText();
    document.addEventListener("click", function(){ setTimeout(patchCardText,80); setTimeout(patchCardText,220); }, true);
    document.addEventListener("touchend", function(){ setTimeout(patchCardText,80); }, true);
    setInterval(function(){ patchRender(); patchCardText(); }, 800);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
