
(function(){
  "use strict";
  function isCardMode(){
    return document.body.classList.contains("mode-cards") ||
           document.body.classList.contains("mode-card") ||
           window.appMode === "cards" || window.appMode === "card";
  }
  function pulse(){
    if(!isCardMode()) return;
    [".card-stage",".card-view","#cardView","#cardArea",".megane-card"].forEach(function(sel){
      var el=document.querySelector(sel);
      if(el){ el.classList.remove("card-shuffle-pulse"); void el.offsetWidth; el.classList.add("card-shuffle-pulse"); }
    });
  }
  document.addEventListener("click", function(e){
    var el=e.target; if(!el) return;
    var txt=(el.textContent||"").trim();
    var idc=((el.id||"")+" "+(el.className||"")).toLowerCase();
    if(txt.indexOf("探索")>=0 || txt.indexOf("シャッフル")>=0 || idc.indexOf("shuffle")>=0 || idc.indexOf("random")>=0){
      setTimeout(pulse,30); setTimeout(pulse,180);
    }
  }, true);
})();
