/* 146_music_album_reorder.js
   MUSIC album user reorder v1.12 (iPhone-first)
   - Long-press and freely reorder albums in two dimensions.
   - Uses a small cover-only floating preview, never the real album button.
   - Auto-scrolls near viewport edges.
   - Saves a unique, stable order key for every album (including Theory disc.1/2/3).
*/
(function(){
  "use strict";

  var STORAGE_KEY = "megane_music_album_order_v2";
  var OLD_STORAGE_KEY = "megane_music_album_order_v1";
  var HOLD_MS = 360;
  var MOVE_CANCEL_PX = 11;
  var EDGE_PX = 92;
  var MAX_SCROLL_STEP = 18;

  var active = null;
  var suppressClickUntil = 0;
  var observer = null;
  var polishTimer = 0;
  var autoScrollRaf = 0;
  var usePointer = typeof window.PointerEvent !== "undefined";

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function isAlbumScreen(){
    var v = document.getElementById("musicView");
    return !!(v && v.classList && v.classList.contains("music-v7-albums"));
  }
  function grid(){
    return isAlbumScreen() ? document.querySelector(".music-v7-album-grid-final") : null;
  }
  function albumDataByIndex(index){
    try{
      if(typeof musicPlaylists !== "undefined" && musicPlaylists && musicPlaylists[index]) return musicPlaylists[index];
    }catch(_){ }
    return null;
  }
  function clean(s){ return String(s == null ? "" : s).trim(); }

  function albumKey(el){
    if(!el) return "";
    var cached = el.getAttribute("data-reorder-key-v2");
    if(cached) return cached;

    var idx = Number(el.getAttribute("data-album"));
    var data = albumDataByIndex(idx) || {};
    var titleNode = el.querySelector(".music-v7-album-copy strong");
    var title = clean(data.title || (titleNode && titleNode.textContent));
    var firstTrack = data.tracks && data.tracks[0] ? data.tracks[0] : {};

    // Some albums intentionally share the same data.id (Theory disc.1/2/3),
    // so title and first-track id are included to guarantee uniqueness.
    var key = [
      clean(data.id || "album"),
      title || ("index-" + idx),
      clean(firstTrack.id || firstTrack.audio || "")
    ].join("::");

    el.setAttribute("data-reorder-key-v2", key);
    return key;
  }

  function loadOrder(){
    try{
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(Boolean) : [];
    }catch(_){ return []; }
  }
  function saveOrder(g){
    if(!g) return;
    var items = Array.prototype.slice.call(g.children).filter(function(el){
      return el.classList && el.classList.contains("music-v7-album-art");
    });
    var keys = items.map(albumKey).filter(Boolean);
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      // Remove the broken v1 order once a valid v2 order is saved.
      localStorage.removeItem(OLD_STORAGE_KEY);
    }catch(_){ }
  }
  function applySavedOrder(g){
    if(!g || g.dataset.reorderApplying === "1" || active) return;
    var children = Array.prototype.slice.call(g.children).filter(function(el){
      return el.classList && el.classList.contains("music-v7-album-art");
    });
    if(children.length < 2) return;
    children.forEach(albumKey);
    var saved = loadOrder();
    if(!saved.length) return;
    var rank = Object.create(null);
    saved.forEach(function(key, i){ if(!Object.prototype.hasOwnProperty.call(rank,key)) rank[key] = i; });
    var original = children.slice();
    children.sort(function(a,b){
      var ka = albumKey(a), kb = albumKey(b);
      var ra = Object.prototype.hasOwnProperty.call(rank,ka) ? rank[ka] : 100000 + original.indexOf(a);
      var rb = Object.prototype.hasOwnProperty.call(rank,kb) ? rank[kb] : 100000 + original.indexOf(b);
      return ra-rb;
    });
    g.dataset.reorderApplying = "1";
    children.forEach(function(el){ g.appendChild(el); });
    delete g.dataset.reorderApplying;
  }

  function injectStyle(){
    if(document.getElementById("musicAlbumReorderStyle")) return;
    var st = document.createElement("style");
    st.id = "musicAlbumReorderStyle";
    st.textContent =
      ".music-v7-album-grid-final.album-reorder-ready>.music-v7-album-art{"+
        "-webkit-user-select:none!important;user-select:none!important;"+
        "-webkit-touch-callout:none!important;touch-action:pan-y!important;"+
      "}"+
      ".music-v7-album-grid-final.album-reordering>.music-v7-album-art{transition:transform .14s ease!important}"+
      ".music-v7-album-art.album-reorder-source{opacity:.20!important;filter:saturate(.6)!important}"+
      ".album-reorder-ghost{"+
        "position:fixed!important;z-index:2147483000!important;pointer-events:none!important;"+
        "margin:0!important;padding:0!important;border:0!important;background:transparent!important;"+
        "box-sizing:border-box!important;overflow:visible!important;contain:none!important;"+
        "transform:none!important;transition:none!important;animation:none!important;"+
        "filter:drop-shadow(0 14px 22px rgba(0,0,0,.46))!important;"+
        "will-change:left,top!important;"+
      "}"+
      ".album-reorder-ghost .album-reorder-ghost-jacket{"+
        "display:block!important;width:100%!important;height:100%!important;overflow:hidden!important;"+
        "border-radius:2px!important;background:rgba(20,10,24,.94)!important;"+
      "}"+
      ".album-reorder-ghost .album-reorder-ghost-jacket img{"+
        "display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;"+
        "max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;"+
        "border:0!important;border-radius:0!important;transform:none!important;position:static!important;"+
      "}"+
      ".album-reorder-toast{position:fixed;left:50%;bottom:104px;z-index:2147483001;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(13,16,26,.92);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;letter-spacing:.03em;pointer-events:none;box-shadow:0 12px 36px rgba(0,0,0,.38);animation:albumReorderToast 1.25s ease both}"+
      "@keyframes albumReorderToast{0%{opacity:0;transform:translate(-50%,8px)}15%,72%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-5px)}}";
    document.head.appendChild(st);
  }

  function toast(text){
    var old = document.querySelector(".album-reorder-toast");
    if(old) old.remove();
    var el = document.createElement("div");
    el.className = "album-reorder-toast";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },1320);
  }
  function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms || 16); }catch(_){ } }
  function stopEvent(e){
    try{ if(e.cancelable) e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function point(e){
    var p = e.touches && e.touches[0] ? e.touches[0] :
      (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
    return {x:p.clientX,y:p.clientY};
  }

  function beginHold(e,item,g){
    if(active || !item || !g) return;
    if(e.pointerType === "mouse" && e.button !== 0) return;
    var p=point(e);
    active={
      item:item,grid:g,pointerId:e.pointerId,
      startX:p.x,startY:p.y,x:p.x,y:p.y,
      timer:0,dragging:false,ghost:null,
      offsetX:0,offsetY:0,width:0,height:0
    };
    active.timer=setTimeout(startDrag,HOLD_MS);
  }
  function cancelPending(){
    if(!active || active.dragging) return;
    clearTimeout(active.timer);
    active=null;
  }

  function createGhost(item, jacketRect){
    var ghost=document.createElement("div");
    ghost.className="album-reorder-ghost";
    var shell=document.createElement("div");
    shell.className="album-reorder-ghost-jacket";
    var sourceImg=item.querySelector(".music-v7-jacket img");
    if(sourceImg){
      var img=document.createElement("img");
      img.src=sourceImg.currentSrc || sourceImg.src;
      img.alt="";
      shell.appendChild(img);
    }else{
      var jacket=item.querySelector(".music-v7-jacket");
      if(jacket){
        var bg=getComputedStyle(jacket).backgroundImage;
        if(bg && bg!=="none") shell.style.backgroundImage=bg;
        shell.style.backgroundSize="cover";
        shell.style.backgroundPosition="center";
      }
    }
    ghost.appendChild(shell);
    ghost.style.width=jacketRect.width+"px";
    ghost.style.height=jacketRect.height+"px";
    document.body.appendChild(ghost);
    return ghost;
  }

  function startDrag(){
    if(!active || active.dragging || !document.body.contains(active.item)) return;
    var a=active;
    var jacket=a.item.querySelector(".music-v7-jacket");
    var r=(jacket || a.item).getBoundingClientRect();
    if(!r.width || !r.height){ cancelPending(); return; }

    a.dragging=true;
    a.width=r.width; a.height=r.height;
    a.offsetX=Math.max(0,Math.min(r.width,a.x-r.left));
    a.offsetY=Math.max(0,Math.min(r.height,a.y-r.top));
    a.ghost=createGhost(a.item,r);
    a.item.classList.add("album-reorder-source");
    a.grid.classList.add("album-reordering");
    document.documentElement.classList.add("album-reorder-active");

    moveGhost(a);
    vibrate(18);
    toast("そのまま上下左右に動かせます");
    startAutoScroll();
  }

  function candidates(a){
    return Array.prototype.slice.call(a.grid.children).filter(function(el){
      return el.classList && el.classList.contains("music-v7-album-art") && el!==a.item;
    });
  }
  function moveItem(a,p){
    var list=candidates(a);
    if(!list.length) return;
    var target=null,best=Infinity,targetRect=null;
    list.forEach(function(el){
      var r=el.getBoundingClientRect();
      var cx=r.left+r.width/2, cy=r.top+r.height/2;
      var dx=cx-p.x, dy=cy-p.y, d=dx*dx+dy*dy;
      if(d<best){ best=d; target=el; targetRect=r; }
    });
    if(!target || !targetRect) return;

    var before;
    if(p.y < targetRect.top) before=true;
    else if(p.y > targetRect.bottom) before=false;
    else before = p.x < targetRect.left + targetRect.width/2;

    if(before){
      if(a.item.nextSibling!==target) a.grid.insertBefore(a.item,target);
    }else{
      if(target.nextSibling!==a.item) a.grid.insertBefore(a.item,target.nextSibling);
    }
  }
  function moveGhost(a){
    if(!a || !a.ghost) return;
    var maxX=Math.max(4,window.innerWidth-a.width-4);
    var left=Math.max(4,Math.min(maxX,a.x-a.offsetX));
    var top=a.y-a.offsetY;
    a.ghost.style.left=left+"px";
    a.ghost.style.top=top+"px";
  }

  function moveDrag(e){
    if(!active) return;
    var p=point(e);
    active.x=p.x; active.y=p.y;
    if(!active.dragging){
      if(Math.hypot(p.x-active.startX,p.y-active.startY)>MOVE_CANCEL_PX) cancelPending();
      return;
    }
    stopEvent(e);
    moveGhost(active);
    moveItem(active,p);
  }

  function startAutoScroll(){
    cancelAnimationFrame(autoScrollRaf);
    function tick(){
      if(!active || !active.dragging){ autoScrollRaf=0; return; }
      var y=active.y, vh=window.innerHeight, delta=0;
      if(y<EDGE_PX) delta=-MAX_SCROLL_STEP*(1-y/EDGE_PX);
      else if(y>vh-EDGE_PX) delta=MAX_SCROLL_STEP*((y-(vh-EDGE_PX))/EDGE_PX);
      if(Math.abs(delta)>.2){
        var before=window.scrollY || document.documentElement.scrollTop || 0;
        window.scrollBy(0,delta);
        var after=window.scrollY || document.documentElement.scrollTop || 0;
        if(after!==before){ moveGhost(active); moveItem(active,{x:active.x,y:active.y}); }
      }
      autoScrollRaf=requestAnimationFrame(tick);
    }
    autoScrollRaf=requestAnimationFrame(tick);
  }

  function finishDrag(e,cancelled){
    if(!active) return;
    clearTimeout(active.timer);
    var a=active;
    if(a.dragging){
      if(e) stopEvent(e);
      suppressClickUntil=now()+850;
      cancelAnimationFrame(autoScrollRaf); autoScrollRaf=0;
      if(a.ghost && a.ghost.parentNode) a.ghost.parentNode.removeChild(a.ghost);
      a.item.classList.remove("album-reorder-source");
      a.grid.classList.remove("album-reordering");
      document.documentElement.classList.remove("album-reorder-active");
      saveOrder(a.grid);
      vibrate(10);
      if(!cancelled) toast("並び順を保存しました");
    }
    active=null;
  }

  function bindGrid(g){
    if(!g || g.dataset.albumReorderBound==="1") return;
    g.dataset.albumReorderBound="1";
    g.classList.add("album-reorder-ready");
    applySavedOrder(g);

    var downEvent=usePointer ? "pointerdown" : "touchstart";
    g.addEventListener(downEvent,function(e){
      var item=e.target && e.target.closest ? e.target.closest(".music-v7-album-art") : null;
      if(!item || item.parentNode!==g) return;
      beginHold(e,item,g);
    },{passive:true});
  }

  function polish(){
    var g=grid();
    if(g){ bindGrid(g); applySavedOrder(g); }
  }
  function clickGuard(e){
    if(now()<suppressClickUntil && e.target && e.target.closest && e.target.closest(".music-v7-album-art")) stopEvent(e);
  }
  function contextGuard(e){
    if((active && active.dragging) || (e.target && e.target.closest && e.target.closest(".music-v7-album-art"))) stopEvent(e);
  }

  function boot(){
    injectStyle();
    document.addEventListener("click",clickGuard,true);
    document.addEventListener("contextmenu",contextGuard,true);

    if(usePointer){
      document.addEventListener("pointermove",moveDrag,{passive:false,capture:true});
      document.addEventListener("pointerup",function(e){ finishDrag(e,false); },{passive:false,capture:true});
      document.addEventListener("pointercancel",function(e){ finishDrag(e,true); },{passive:false,capture:true});
    }else{
      document.addEventListener("touchmove",moveDrag,{passive:false,capture:true});
      document.addEventListener("touchend",function(e){ finishDrag(e,false); },{passive:false,capture:true});
      document.addEventListener("touchcancel",function(e){ finishDrag(e,true); },{passive:false,capture:true});
    }

    polish();
    observer=new MutationObserver(function(){
      clearTimeout(polishTimer);
      polishTimer=setTimeout(polish,25);
    });
    observer.observe(document.documentElement,{subtree:true,childList:true});
    setInterval(polish,650);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
