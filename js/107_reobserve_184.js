/* 107_reobserve_184.js
   Disabled: functionality moved into 61_self_glass_cards.js v32.
*/
(function(){
  "use strict";
  function cleanup(){
    ["reobserve184Button","reobserve184Overlay","reobserve184Style"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.remove();
    });
    document.querySelectorAll(".reobserve184-btn,.reobserve184-overlay").forEach(el=>el.remove());
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",cleanup);
  else cleanup();
})();
