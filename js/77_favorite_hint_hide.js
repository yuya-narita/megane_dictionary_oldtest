(function(){
  'use strict';
  function hideHints(){
    try{
      document.querySelectorAll('#favoriteList .favorite-item-hint').forEach(function(el){
        el.remove();
      });
    }catch(_){ }
  }

  var css = document.createElement('style');
  css.textContent = '#favoriteList .favorite-item-hint{display:none!important;}';
  document.head.appendChild(css);

  var mo = null;
  function start(){
    hideHints();
    var list = document.getElementById('favoriteList');
    if(list && !mo){
      mo = new MutationObserver(hideHints);
      mo.observe(list, {childList:true, subtree:true});
    }
  }
  document.addEventListener('DOMContentLoaded', start);
  setInterval(start, 700);
})();
