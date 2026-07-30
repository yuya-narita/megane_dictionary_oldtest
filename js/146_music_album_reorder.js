/* 146_music_album_reorder.js
   MUSIC album user reorder v1
   - Long-press an album jacket, then drag to reorder.
   - Order is stored locally per browser/device.
   - Newly added official albums are appended without disturbing saved order.
*/
(function(){
  "use strict";

  var STORAGE_KEY = "megane_music_album_order_v1";
  var HOLD_MS = 430;
  var active = null;
  var suppressClickUntil = 0;
  var observer = null;
  var polishTimer = 0;

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
    var keys = Array.prototype.map.call(g.children, albumKey).filter(Boolean);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); }catch(_){ }
  }
  function applySavedOrder(g){
    if(!g || g.dataset.reorderApplying === "1") return;
    var children = Array.prototype.slice.call(g.children).filter(function(el){
      return el.classList && el.classList.contains("music-v7-album-art");
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
      ".music-v7-album-grid-final.album-reorder-ready>.music-v7-album-art{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}"+
      ".music-v7-album-grid-final.album-reordering{touch-action:none!important}"+
      ".music-v7-album-art.album-reorder-held{opacity:.22!important;transform:scale(.96)!important}"+
      ".album-reorder-ghost{position:fixed!important;z-index:2147483000!important;margin:0!important;pointer-events:none!important;opacity:.96!important;transform:scale(1.04) rotate(-1deg)!important;box-shadow:0 24px 60px rgba(0,0,0,.58)!important;transition:none!important}"+
      ".album-reorder-toast{position:fixed;left:50%;bottom:104px;z-index:2147483001;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(13,16,26,.92);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;letter-spacing:.03em;pointer-events:none;box-shadow:0 12px 36px rgba(0,0,0,.38);animation:albumReorderToast 1.3s ease both}"+
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
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },1400);
  }
  function vibrate(){ try{ if(navigator.vibrate) navigator.vibrate(18); }catch(_){ } }
  function stopEvent(e){
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function point(e){
    var p = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
    return {x:p.clientX,y:p.clientY};
  }
  function beginHold(e, item, g){
    if(active || !item || !g) return;
    if(e.pointerType === "mouse" && e.button !== 0) return;
    var p = point(e);
    active = {
      item:item, grid:g, pointerId:e.pointerId,
      startX:p.x, startY:p.y, x:p.x, y:p.y,
      timer:0, dragging:false, ghost:null, offsetX:0, offsetY:0
    };
    active.timer = setTimeout(function(){ startDrag(e); }, HOLD_MS);
  }
  function cancelHold(){
    if(!active) return;
    clearTimeout(active.timer);
    if(!active.dragging) active = null;
  }
  function startDrag(e){
    if(!active || active.dragging || !document.body.contains(active.item)) return;
    var a = active;
    var r = a.item.getBoundingClientRect();
    a.dragging = true;
    a.offsetX = a.x-r.left;
    a.offsetY = a.y-r.top;
    a.item.classList.add("album-reorder-held");
    a.grid.classList.add("album-reordering");

    var ghost = a.item.cloneNode(true);
    ghost.classList.add("album-reorder-ghost");
    ghost.classList.remove("album-reorder-held");
    ghost.style.width = r.width+"px";
    ghost.style.height = r.height+"px";
    ghost.style.left = (a.x-a.offsetX)+"px";
    ghost.style.top = (a.y-a.offsetY)+"px";
    document.body.appendChild(ghost);
    a.ghost = ghost;
    vibrate();
    toast("そのまま動かして並べ替え");
  }
  function moveDrag(e){
    if(!active) return;
    var p = point(e);
    active.x=p.x; active.y=p.y;
    if(!active.dragging){
      if(Math.abs(p.x-active.startX)>10 || Math.abs(p.y-active.startY)>10) cancelHold();
      return;
    }
    stopEvent(e);
    var a=active;
    if(a.ghost){
      a.ghost.style.left=(p.x-a.offsetX)+"px";
      a.ghost.style.top=(p.y-a.offsetY)+"px";
    }
    var candidates = Array.prototype.slice.call(a.grid.children).filter(function(el){ return el!==a.item && el.classList.contains("music-v7-album-art"); });
    var target = null;
    var best = Infinity;
    candidates.forEach(function(el){
      var r=el.getBoundingClientRect();
      var cx=r.left+r.width/2, cy=r.top+r.height/2;
      var d=(cx-p.x)*(cx-p.x)+(cy-p.y)*(cy-p.y);
      if(d<best){best=d;target=el;}
    });
    if(!target) return;
    var tr=target.getBoundingClientRect();
    var before = p.y < tr.top+tr.height/2 || (Math.abs(p.y-(tr.top+tr.height/2))<tr.height*.24 && p.x<tr.left+tr.width/2);
    if(before) a.grid.insertBefore(a.item,target);
    else a.grid.insertBefore(a.item,target.nextSibling);
  }
  function endDrag(e){
    if(!active) return;
    clearTimeout(active.timer);
    var a=active;
    if(a.dragging){
      stopEvent(e);
      suppressClickUntil=now()+900;
      a.item.classList.remove("album-reorder-held");
      a.grid.classList.remove("album-reordering");
      if(a.ghost && a.ghost.parentNode) a.ghost.parentNode.removeChild(a.ghost);
      saveOrder(a.grid);
      toast("並び順を保存しました");
    }
    active=null;
  }
  function bindGrid(g){
    if(!g || g.dataset.albumReorderBound === "1") return;
    g.dataset.albumReorderBound="1";
    g.classList.add("album-reorder-ready");
    applySavedOrder(g);

    g.addEventListener("pointerdown",function(e){
      var item=e.target && e.target.closest ? e.target.closest(".music-v7-album-art") : null;
      if(!item || item.parentNode!==g) return;
      beginHold(e,item,g);
      try{ item.setPointerCapture && item.setPointerCapture(e.pointerId); }catch(_){ }
    },{passive:true});
    g.addEventListener("pointermove",moveDrag,{passive:false});
    g.addEventListener("pointerup",endDrag,{passive:false});
    g.addEventListener("pointercancel",endDrag,{passive:false});
  }
  function polish(){
    var g=grid();
    if(g){
      bindGrid(g);
      applySavedOrder(g);
    }
  }
  function clickGuard(e){
    if(now()<suppressClickUntil && e.target && e.target.closest && e.target.closest(".music-v7-album-art")) stopEvent(e);
  }
  function boot(){
    injectStyle();
    document.addEventListener("click",clickGuard,true);
    polish();
    observer=new MutationObserver(function(){
      clearTimeout(polishTimer);
      polishTimer=setTimeout(polish,20);
    });
    observer.observe(document.documentElement,{subtree:true,childList:true});
    setInterval(polish,500);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
