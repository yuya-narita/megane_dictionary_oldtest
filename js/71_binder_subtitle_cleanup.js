/* v90: binder subtitle cleanup
   バインダー/カード詳細の「上下:カード / 左右:めくる」系表示を消す。
*/
(function(){
  function cleanText(s){
    return String(s || "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*上下[:：]カード\s*\/\s*左右[:：]裏表/g, "")
      .replace(/　?｜?\s*上下[:：]カード/g, "")
      .replace(/　?｜?\s*左右[:：]めくる/g, "")
      .replace(/　?｜?\s*左右[:：]裏表/g, "")
      .replace(/\s+\|?\s*$/, "")
      .trim();
  }

  function cleanup(){
    var selectors = [
      "#cardSubtitle",
      ".bug-card-subtitle",
      "#binderReplaySubtitle",
      ".binder-replay-subtitle",
      ".binder-viewer-subtitle",
      ".binder-card-subtitle",
      ".binder-detail-subtitle",
      ".card-detail-subtitle"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function(el){
      var before = el.textContent || "";
      var after = cleanText(before);
      if(before !== after) el.textContent = after;
    });
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__v90BinderSubtitleCleanup) return;
      var old = render;
      render = function(){
        var r = old.apply(this, arguments);
        setTimeout(cleanup, 0);
        return r;
      };
      render.__v90BinderSubtitleCleanup = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    cleanup();
    setInterval(function(){
      patchRender();
      cleanup();
    }, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
