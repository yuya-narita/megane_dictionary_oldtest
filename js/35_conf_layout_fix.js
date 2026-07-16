/* Conference layout final fix */
(function(){
  function q(id){ return document.getElementById(id); }

  function fixNav(){
    var row = q("confNavRow");
    var back = q("confBackToList");
    if(!row || !back) return;

    row.classList.add("conf-nav-row");
    // backがrow外に出ていたら中央に戻す
    if(back.parentNode !== row){
      var nextBtn = null;
      var btns = row.querySelectorAll("button");
      if(btns.length >= 2) nextBtn = btns[1];
      row.innerHTML = "";
      var prev = document.createElement("button");
      prev.className = "conf-nav-btn";
      prev.textContent = "← 前";
      var next = document.createElement("button");
      next.className = "conf-nav-btn";
      next.textContent = "次 →";
      row.appendChild(prev);
      row.appendChild(back);
      row.appendChild(next);
    }
  }

  function boot(){
    fixNav();
    setInterval(fixNav, 1000);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
