/* v89 final cleanup
   - 辞書説明/カウンターを消す
   - バインダー裏面の？？？や説明文を消す
   - カード本体の高さ修正は維持
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function hideDictionaryNoise(){
    try{
      var hint = q("hint");
      var counter = q("counter");
      if(hint) hint.textContent = "";
      if(counter) counter.textContent = "";
    }catch(e){}
  }

  function cleanBinderBackText(){
    // バインダー/カード詳細系で表示される裏面の不要テキストを直接消す
    var selectors = [
      "#binderReplayTitle",
      "#binderReplaySubtitle",
      "#binderReplayCaption",
      ".binder-replay-title",
      ".binder-replay-subtitle",
      ".binder-replay-caption",
      ".binder-viewer-title",
      ".binder-viewer-subtitle",
      ".binder-viewer-caption",
      ".binder-card-title",
      ".binder-card-subtitle",
      ".binder-card-caption"
    ];

    var backLike = false;
    var backEls = document.querySelectorAll(
      ".binder-replay-flip-card.flipped, .binder-viewer-card.flipped, .binder-detail-card.flipped, .fullscreen-card.flipped"
    );
    if(backEls.length) backLike = true;

    // テキストそのものでも判定
    document.querySelectorAll(selectors.join(",")).forEach(function(el){
      var t = (el.textContent || "").trim();
      if(t === "？？？" || t.indexOf("裏面") >= 0 || t.indexOf("カードをめくる") >= 0 || t.indexOf("上下:カード") >= 0){
        el.textContent = "";
        el.classList.add("v89-hidden-text-slot");
      }else if(backLike && el.closest(".binder-replay-viewer, .binder-viewer, .binder-detail, .fullscreen-overlay")){
        // 裏面表示中の説明類は空にする
        el.textContent = "";
        el.classList.add("v89-hidden-text-slot");
      }
    });
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__v89FinalCleanup) return;
      var old = render;
      render = function(){
        var r = old.apply(this, arguments);
        setTimeout(function(){
          hideDictionaryNoise();
          cleanBinderBackText();
        }, 0);
        return r;
      };
      render.__v89FinalCleanup = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    hideDictionaryNoise();
    cleanBinderBackText();
    setInterval(function(){
      patchRender();
      hideDictionaryNoise();
      cleanBinderBackText();
    }, 500);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
