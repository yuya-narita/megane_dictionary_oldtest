/* 146_music_album_reorder.js
   MUSIC album user reorder v1.1 (mobile-first)
   - Long-press an album, then move it freely in two dimensions.
   - Uses the real album element + an in-grid placeholder (no Safari drag preview).
   - Auto-scrolls near the top/bottom edge while dragging.
   - Saves order locally per browser/device.
*/
(function(){
  "use strict";

  var STORAGE_KEY = "megane_music_album_order_v1";
  var HOLD_MS = 360;
  var MOVE_CANCEL_PX = 11;
  var EDGE_PX = 92;
  var MAX_SCROLL_STEP = 18;

  var active = null;
  var suppressClickUntil = 0;
  var observer = null;
  var polishTimer = 0;
  var autoScrollRaf = 0;

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
  function albumKey(el){
    if(!el) return "";
    var cached = el.getAttribute("data-reorder-key");
    if(cached) return cached;
    var idx = Number(el.getAttribute("data-album"));
    var data = albumDataByIndex(idx);
    var title = el.querySelector(".music-v7-album-copy strong");
    var key = data && data.id ? String(data.id) : (title ? "title:" + title.textContent.trim() : "album:" + idx);
    el.setAttribute("data-reorder-key", key);
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
      return el.classList && el.classList.contains("music-v7-album-art") && !el.classList.contains("album-reorder-placeholder");
    });
    var keys = items.map(albumKey).filter(Boolean);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); }catch(_){ }
  }
  function applySavedOrder(g){
    if(!g || g.dataset.reorderApplying === "1" || active) return;
    var children = Array.prototype.slice.call(g.children).filter(function(el){
      return el.classList && el.classList.contains("music-v7-album-art") && !el.classList.contains("album-reorder-placeholder");
    });
    if(children.length < 2) return;
    children.forEach(albumKey);
    var saved = loadOrder();
    if(!saved.length) return;
    var rank = Object.create(null);
    saved.forEach(function(key, i){ rank[key] = i; });
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
        "-webkit-touch-callout:none!important;"+
      "}"+
      ".music-v7-album-grid-final.album-reordering{cursor:grabbing!important}"+
      ".album-reorder-placeholder{visibility:hidden!important;pointer-events:none!important}"+
      ".music-v7-album-art.album-reorder-floating{"+
        "position:fixed!important;z-index:2147483000!important;"+
        "margin:0!important;pointer-events:none!important;"+
        "transform:scale(1.035)!important;transform-origin:center center!important;"+
        "filter:drop-shadow(0 20px 28px rgba(0,0,0,.48))!important;"+
        "opacity:.98!important;transition:none!important;animation:none!important;"+
        "overflow:hidden!important;contain:paint!important;will-change:left,top,transform!important;"+
      "}"+
      ".music-v7-album-art.album-reorder-floating *{pointer-events:none!important}"+
      ".music-v7-album-grid-final.album-reordering>.music-v7-album-art:not(.album-reorder-placeholder){transition:transform .14s ease!important}"+
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
    var p = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
    return {x:p.clientX,y:p.clientY};
  }

  function rememberInlineStyle(el){ return el.getAttribute("style"); }
  function restoreInlineStyle(el, value){
    if(value === null || typeof value === "undefined") el.removeAttribute("style");
    else el.setAttribute("style", value);
  }

  function beginHold(e,item,g){
    if(active || !item || !g) return;
    if(e.pointerType === "mouse" && e.button !== 0) return;
    var p=point(e);
    active={
      item:item,grid:g,pointerId:e.pointerId,
      startX:p.x,startY:p.y,x:p.x,y:p.y,
      timer:0,dragging:false,placeholder:null,
      offsetX:0,offsetY:0,inlineStyle:null,
      width:0,height:0,lastScrollY:window.scrollY || 0
    };
    active.timer=setTimeout(startDrag,HOLD_MS);
  }
  function cancelPending(){
    if(!active || active.dragging) return;
    clearTimeout(active.timer);
    active=null;
  }

  function startDrag(){
    if(!active || active.dragging || !document.body.contains(active.item)) return;
    var a=active;
    var r=a.item.getBoundingClientRect();
    if(!r.width || !r.height){ cancelPending(); return; }

    a.dragging=true;
    a.width=r.width; a.height=r.height;
    a.offsetX=Math.max(0,Math.min(r.width,a.x-r.left));
    a.offsetY=Math.max(0,Math.min(r.height,a.y-r.top));
    a.inlineStyle=rememberInlineStyle(a.item);

    var ph=document.createElement(a.item.tagName || "div");
    ph.className=a.item.className+" album-reorder-placeholder";
    ph.setAttribute("aria-hidden","true");
    ph.style.width=r.width+"px";
    ph.style.height=r.height+"px";
    a.grid.insertBefore(ph,a.item);
    a.placeholder=ph;

    document.body.appendChild(a.item);
    a.item.classList.add("album-reorder-floating");
    a.item.style.width=r.width+"px";
    a.item.style.height=r.height+"px";
    a.item.style.left=(a.x-a.offsetX)+"px";
    a.item.style.top=(a.y-a.offsetY)+"px";
    a.grid.classList.add("album-reordering");
    document.documentElement.classList.add("album-reorder-active");

    vibrate(18);
    toast("そのまま上下左右に動かせます");
    startAutoScroll();
  }

  function albumCandidates(a){
    return Array.prototype.slice.call(a.grid.children).filter(function(el){
      return el.classList && el.classList.contains("music-v7-album-art") && el!==a.placeholder;
    });
  }
  function movePlaceholder(a,p){
    var candidates=albumCandidates(a);
    if(!candidates.length) return;

    var target=null, best=Infinity, targetRect=null;
    candidates.forEach(function(el){
      var r=el.getBoundingClientRect();
      var cx=r.left+r.width/2, cy=r.top+r.height/2;
      var dx=cx-p.x, dy=cy-p.y;
      var d=dx*dx+dy*dy;
      if(d<best){ best=d; target=el; targetRect=r; }
    });
    if(!target || !targetRect) return;

    var centerY=targetRect.top+targetRect.height/2;
    var centerX=targetRect.left+targetRect.width/2;
    var before;
    // In a two-column grid, vertical position chooses the row first; horizontal chooses slot inside the row.
    if(p.y < targetRect.top) before=true;
    else if(p.y > targetRect.bottom) before=false;
    else before = p.x < centerX || p.y < centerY - targetRect.height*.18;

    if(before){
      if(a.placeholder.nextSibling!==target) a.grid.insertBefore(a.placeholder,target);
    }else{
      if(target.nextSibling!==a.placeholder) a.grid.insertBefore(a.placeholder,target.nextSibling);
    }
  }

  function moveFloating(a){
    if(!a || !a.item) return;
    var maxX=Math.max(4,window.innerWidth-a.width-4);
    var left=Math.max(4,Math.min(maxX,a.x-a.offsetX));
    var top=a.y-a.offsetY;
    a.item.style.left=left+"px";
    a.item.style.top=top+"px";
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
    moveFloating(active);
    movePlaceholder(active,p);
  }

  function startAutoScroll(){
    cancelAnimationFrame(autoScrollRaf);
    function tick(){
      if(!active || !active.dragging){ autoScrollRaf=0; return; }
      var y=active.y;
      var vh=window.innerHeight;
      var delta=0;
      if(y<EDGE_PX){
        delta=-MAX_SCROLL_STEP*(1-y/EDGE_PX);
      }else if(y>vh-EDGE_PX){
        delta=MAX_SCROLL_STEP*((y-(vh-EDGE_PX))/EDGE_PX);
      }
      if(Math.abs(delta)>.2){
        var before=window.scrollY || document.documentElement.scrollTop || 0;
        window.scrollBy(0,delta);
        var after=window.scrollY || document.documentElement.scrollTop || 0;
        if(after!==before){
          moveFloating(active);
          movePlaceholder(active,{x:active.x,y:active.y});
        }
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

      if(a.placeholder && a.placeholder.parentNode){
        a.grid.insertBefore(a.item,a.placeholder);
        a.placeholder.parentNode.removeChild(a.placeholder);
      }else{
        a.grid.appendChild(a.item);
      }
      a.item.classList.remove("album-reorder-floating");
      restoreInlineStyle(a.item,a.inlineStyle);
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

    g.addEventListener("pointerdown",function(e){
      var item=e.target && e.target.closest ? e.target.closest(".music-v7-album-art") : null;
      if(!item || item.parentNode!==g || item.classList.contains("album-reorder-placeholder")) return;
      beginHold(e,item,g);
    },{passive:true});
  }

  function globalMove(e){ moveDrag(e); }
  function globalEnd(e){ finishDrag(e,false); }
  function globalCancel(e){ finishDrag(e,true); }
  function globalTouchMove(e){ if(active && active.dragging) moveDrag(e); }

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
    document.addEventListener("pointermove",globalMove,{passive:false,capture:true});
    document.addEventListener("pointerup",globalEnd,{passive:false,capture:true});
    document.addEventListener("pointercancel",globalCancel,{passive:false,capture:true});
    // iOS fallback while dragging. Pointer events remain the primary path.
    document.addEventListener("touchmove",globalTouchMove,{passive:false,capture:true});
    document.addEventListener("touchend",globalEnd,{passive:false,capture:true});
    document.addEventListener("touchcancel",globalCancel,{passive:false,capture:true});

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
