/* 109_polar_bear_label.js
   Card binder polar bear label patch v0.1
*/
(function(){
  "use strict";

  var POLAR = "🐻‍❄️";

  function replaceText(root){
    if(!root) return;

    var walker=document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );

    var nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function(node){
      var t=node.nodeValue || "";
      if(t.indexOf("🐻 LOOKING BEAR") >= 0){
        node.nodeValue=t.replace(/🐻 LOOKING BEAR/g, POLAR+" LOOKING BEAR");
      }
    });

    root.querySelectorAll &&
    root.querySelectorAll(
      ".viewer-card-back-bear,.replay-back-bear"
    ).forEach(function(el){
      if((el.textContent||"").trim()==="🐻"){
        el.textContent=POLAR;
      }
      el.style.fontFamily='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    });
  }

  function run(){
    replaceText(document.body);
  }

  var obs=new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType===1) replaceText(n);
        else if(n.nodeType===3 && (n.nodeValue||"").indexOf("🐻 LOOKING BEAR")>=0){
          n.nodeValue=n.nodeValue.replace(/🐻 LOOKING BEAR/g,POLAR+" LOOKING BEAR");
        }
      });
    });
  });

  function boot(){
    run();
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    setInterval(run,900);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();
