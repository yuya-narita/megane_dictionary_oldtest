
/* BINDER_PANEL_NO_SWIPE_CLOSE
   Expanded detail panel should not close from accidental downward swipe.
   Close viewer with ×. Panel itself stays expanded unless explicitly toggled elsewhere.
*/
(function(){
  var sx = 0, sy = 0, tracking = false;

  function panel(){
    return document.getElementById("binderViewerTextPanel");
  }

  function onStart(ev){
    var p = panel();
    if(!p || ev.target !== p && !p.contains(ev.target)) return;
    var t = ev.changedTouches && ev.changedTouches[0];
    if(!t) return;
    sx = t.clientX;
    sy = t.clientY;
    tracking = true;
  }

  function onEnd(ev){
    var p = panel();
    if(!p || ev.target !== p && !p.contains(ev.target) || !tracking) return;
    tracking = false;

    var t = ev.changedTouches && ev.changedTouches[0];
    if(!t) return;

    var dx = t.clientX - sx;
    var dy = t.clientY - sy;

    // 下方向スワイプは古い閉じ処理へ届かせない。
    // ただし上方向は従来通り開くため通す。
    if(p.classList.contains("expanded") && dy > 30 && Math.abs(dy) > Math.abs(dx)){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      p.classList.add("expanded");
      return false;
    }
  }

  document.addEventListener("touchstart", onStart, true);
  document.addEventListener("touchend", onEnd, true);
})();
