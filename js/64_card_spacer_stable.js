/* v84 stable spacer
   前の安定版をベースに、カード本体は触らない。
   表裏の高さ差は「空の固定テキストスペース」で吸収する。
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function getMode(){
    try { return appMode; } catch(e){ return ""; }
  }

  function isBack(){
    var flip = q("flipCard");
    if(!flip) return false;
    return flip.classList.contains("flipped") ||
      flip.classList.contains("is-flipped") ||
      flip.getAttribute("aria-pressed") === "true";
  }

  function ensureSpacer(){
    if(getMode() !== "cards") return;

    var flip = q("flipCard");
    if(!flip) return;

    var spacer = q("cardStableSpacer");
    if(!spacer){
      spacer = document.createElement("div");
      spacer.id = "cardStableSpacer";
      spacer.className = "card-stable-spacer";

      // cardCaption の後に入れる。なければ flipCard の後。
      var cap = q("cardCaption");
      if(cap && cap.parentNode){
        cap.insertAdjacentElement("afterend", spacer);
      }else{
        flip.insertAdjacentElement("afterend", spacer);
      }
    }

    document.body.classList.toggle("card-is-back", isBack());

    ["hint","counter"].forEach(function(id){
      var el = q(id);
      if(el) el.textContent = "";
    });

    if(isBack()){
      ["cardTitle","cardSubtitle","cardCaption"].forEach(function(id){
        var el = q(id);
        if(el) el.classList.add("card-text-hidden-stable");
      });
      spacer.classList.add("active");
    }else{
      ["cardTitle","cardSubtitle","cardCaption"].forEach(function(id){
        var el = q(id);
        if(el) el.classList.remove("card-text-hidden-stable");
      });
      spacer.classList.remove("active");
    }
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__cardSpacerStable) return;
      var old = render;
      render = function(){
        var result = old.apply(this, arguments);
        setTimeout(ensureSpacer, 0);
        return result;
      };
      render.__cardSpacerStable = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    ensureSpacer();
    setInterval(function(){
      patchRender();
      ensureSpacer();
    }, 600);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
