/* 147_music_single_reorder_protect.js v1.04
   Single tracks:
   - Long-press and drag to reorder.
   - Drag onto "保護しました♪" to protect the single track.
   - Touch-first implementation for iPhone; Android vibration when supported.
*/
(function(){
  "use strict";

  var ORDER_KEY = "megane_music_single_order_v1";
  var HOLD_MS = 360;
  var CANCEL_PX = 11;
  var EDGE_PX = 92;
  var MAX_SCROLL_STEP = 22;

  var active = null;
  var suppressClickUntil = 0;
  var observer = null;
  var autoRaf = 0;
  var globalBound = false;

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function haptic(pattern){
    try{ if(navigator.vibrate) navigator.vibrate(pattern == null ? 12 : pattern); }catch(_){ }
  }
  function isAlbumScreen(){
    var v=document.getElementById("musicView");
    return !!(v && v.classList.contains("music-v7-albums"));
  }
  function singleList(){ return isAlbumScreen() ? document.querySelector(".music-v7-single-list") : null; }
  function favZone(){ return isAlbumScreen() ? document.getElementById("musicV7FavAlbum") : null; }
  function clean(v){ return String(v == null ? "" : v).trim(); }
  function albumAt(index){
    try{ return (typeof musicPlaylists !== "undefined" && musicPlaylists) ? musicPlaylists[index] : null; }
    catch(_){ return null; }
  }
  function singleInfo(el){
    var idx=Number(el && el.getAttribute("data-album"));
    var album=albumAt(idx) || {};
    var track=album.tracks && album.tracks[0] ? album.tracks[0] : null;
    return { index:idx, album:album, track:track };
  }
  function singleKey(el){
    if(!el) return "";
    var cached=el.getAttribute("data-single-reorder-key");
    if(cached) return cached;
    var x=singleInfo(el), a=x.album || {}, t=x.track || {};
    var titleNode=el.querySelector(".music-v7-single-copy strong");
    var key=[clean(a.id||"single"),clean(a.title||(titleNode&&titleNode.textContent)||("index-"+x.index)),clean(t.id||t.audio||"")].join("::");
    el.setAttribute("data-single-reorder-key",key);
    return key;
  }
  function loadOrder(){
    try{ var a=JSON.parse(localStorage.getItem(ORDER_KEY)||"[]"); return Array.isArray(a)?a.filter(Boolean):[]; }
    catch(_){ return []; }
  }
  function saveOrder(list){
    if(!list) return;
    var keys=Array.prototype.slice.call(list.children).filter(isSingle).map(singleKey).filter(Boolean);
    try{ localStorage.setItem(ORDER_KEY,JSON.stringify(keys)); }catch(_){ }
  }
  function isSingle(el){ return !!(el && el.classList && el.classList.contains("music-v7-single-card")); }
  function applyOrder(list){
    if(!list || active || list.dataset.singleOrderApplying==="1") return;
    var cards=Array.prototype.slice.call(list.children).filter(isSingle);
    if(cards.length<2) return;
    var saved=loadOrder(); if(!saved.length) return;
    var rank=Object.create(null); saved.forEach(function(k,i){ if(rank[k]===undefined) rank[k]=i; });
    var original=cards.slice();
    cards.sort(function(a,b){
      var ka=singleKey(a),kb=singleKey(b);
      var ra=rank[ka]===undefined?100000+original.indexOf(a):rank[ka];
      var rb=rank[kb]===undefined?100000+original.indexOf(b):rank[kb];
      return ra-rb;
    });
    list.dataset.singleOrderApplying="1";
    cards.forEach(function(c){ list.appendChild(c); });
    delete list.dataset.singleOrderApplying;
  }
  function injectStyle(){
    if(document.getElementById("musicSingleProtectStyle")) return;
    var st=document.createElement("style");
    st.id="musicSingleProtectStyle";
    st.textContent=
      ".music-v7-single-list.single-reorder-ready>.music-v7-single-card{"+
        "-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;touch-action:pan-y!important;}"+
      ".music-v7-single-list.single-reordering>.music-v7-single-card{transition:transform .14s ease!important;}"+
      ".music-v7-single-card.single-reorder-source{opacity:.20!important;}"+
      ".single-drag-ghost{position:fixed!important;z-index:2147483002!important;pointer-events:none!important;margin:0!important;box-sizing:border-box!important;"+
        "display:grid!important;grid-template-columns:58px minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;padding:10px 12px!important;"+
        "border:1px solid rgba(255,255,255,.22)!important;border-radius:18px!important;background:rgba(30,18,35,.96)!important;color:#fff!important;"+
        "box-shadow:0 16px 38px rgba(0,0,0,.52)!important;transform:none!important;transition:none!important;overflow:hidden!important;}"+
      ".single-drag-ghost .music-v7-single-thumb{width:58px!important;height:58px!important;min-width:58px!important;border-radius:14px!important;overflow:hidden!important;}"+
      ".single-drag-ghost .music-v7-single-thumb img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}"+
      ".single-drag-ghost .music-v7-single-copy{min-width:0!important;}"+
      ".single-drag-ghost .music-v7-single-copy strong,.single-drag-ghost .music-v7-single-copy span{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}"+
      ".music-v7-favline.single-protect-available{position:relative!important;min-height:82px!important;transform:scale(1.01)!important;transition:transform .16s ease,box-shadow .16s ease,background .16s ease,border-color .16s ease,min-height .16s ease!important;background:rgba(255,225,110,.10)!important;border:2px dashed rgba(255,235,150,.62)!important;box-shadow:0 0 0 4px rgba(255,222,100,.08),0 0 38px rgba(255,220,90,.25)!important;}"+
      ".music-v7-favline.single-protect-available::after{content:\"シングルをここへ\";position:absolute;left:50%;bottom:7px;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:900;letter-spacing:.08em;color:rgba(255,244,195,.86);pointer-events:none;}"+
      ".music-v7-favline.single-protect-hover{transform:scale(1.045)!important;background:rgba(255,225,110,.30)!important;border-style:solid!important;border-color:rgba(255,246,180,.98)!important;box-shadow:0 0 0 7px rgba(255,224,100,.15),0 0 56px rgba(255,220,90,.72)!important;filter:brightness(1.18)!important;}"+
      ".music-v7-favline.single-protect-hover::after{content:\"指を離すと全曲保護♪\";color:#fff8cf;font-size:11px;}"+
      ".music-v7-favline.single-protect-success{animation:singleProtectPulse .52s ease both!important;}"+
      "@keyframes singleProtectPulse{0%{transform:scale(1)}35%{transform:scale(1.045);filter:brightness(1.35)}100%{transform:scale(1);filter:none}}"+
      ".single-protect-toast{position:fixed;left:50%;bottom:104px;z-index:2147483003;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(13,16,26,.94);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;pointer-events:none;box-shadow:0 12px 36px rgba(0,0,0,.38);animation:singleProtectToast 1.25s ease both;}"+
      "@keyframes singleProtectToast{0%{opacity:0;transform:translate(-50%,8px)}15%,72%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-5px)}}"+
      "html.single-drag-active,html.single-drag-active body{user-select:none!important;-webkit-user-select:none!important;}"+
      "@media(max-width:375px){.single-drag-ghost{grid-template-columns:48px minmax(0,1fr) auto!important;gap:9px!important;padding:9px 10px!important}.single-drag-ghost .music-v7-single-thumb{width:48px!important;height:48px!important;min-width:48px!important;border-radius:12px!important;}body.mode-music.music-v7 #musicView.music-v7-albums .music-v7-restricted-grid{grid-template-columns:minmax(0,260px)!important;margin-bottom:28px!important;}body.mode-music.music-v7 #musicView.music-v7-albums .music-v7-restricted-grid>.music-v7-restricted-album{max-width:260px!important;}}";
    document.head.appendChild(st);
  }
  function toast(text){
    var old=document.querySelector(".single-protect-toast"); if(old) old.remove();
    var el=document.createElement("div"); el.className="single-protect-toast"; el.textContent=text; document.body.appendChild(el);
    setTimeout(function(){ if(el.parentNode) el.remove(); },1320);
  }
  function point(e){
    var p=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0])||e;
    return {x:p.clientX,y:p.clientY};
  }
  function stop(e){
    try{ if(e.cancelable) e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){ }
  }
  function begin(e,card,list){
    if(active || !card || !list || card.classList.contains("locked")) return;
    var p=point(e);
    active={card:card,list:list,startX:p.x,startY:p.y,x:p.x,y:p.y,timer:0,dragging:false,ghost:null,offX:0,offY:0,width:0,height:0,overProtect:false,scrollEl:null,zoneLabel:null};
    active.timer=setTimeout(startDrag,HOLD_MS);
  }
  function cancelPending(){ if(active&&!active.dragging){ clearTimeout(active.timer); active=null; } }
  function makeGhost(card,r){
    var ghost=card.cloneNode(true);
    ghost.className="single-drag-ghost";
    ghost.removeAttribute("id"); ghost.removeAttribute("data-album");
    ghost.style.width=r.width+"px"; ghost.style.height=r.height+"px";
    document.body.appendChild(ghost); return ghost;
  }
  function findScrollContainer(el){
    var node=el;
    while(node && node!==document.body && node!==document.documentElement){
      try{
        var cs=getComputedStyle(node);
        var oy=cs.overflowY;
        if((oy==="auto"||oy==="scroll") && node.scrollHeight>node.clientHeight+2) return node;
      }catch(_){ }
      node=node.parentElement;
    }
    return document.scrollingElement||document.documentElement;
  }
  function startDrag(){
    if(!active || active.dragging || !document.body.contains(active.card)) return;
    var a=active,r=a.card.getBoundingClientRect();
    a.dragging=true;a.width=r.width;a.height=r.height;
    a.offX=Math.max(0,Math.min(r.width,a.x-r.left));a.offY=Math.max(0,Math.min(r.height,a.y-r.top));
    a.ghost=makeGhost(a.card,r);a.scrollEl=findScrollContainer(a.list);
    a.card.classList.add("single-reorder-source");a.list.classList.add("single-reordering");
    document.documentElement.classList.add("single-drag-active");
    var zone=favZone();
    if(zone){
      var label=zone.querySelector("strong");
      a.zoneLabel=label ? label.textContent : null;
      zone.classList.add("single-protect-available");
      if(label) label.textContent="ここへ運ぶと保護♪";
    }
    moveGhost();haptic(12);toast("並べ替え・上へ運ぶと保護");startAutoScroll();
  }
  function moveGhost(){
    if(!active||!active.ghost) return;
    active.ghost.style.left=(active.x-active.offX)+"px";
    active.ghost.style.top=(active.y-active.offY)+"px";
  }
  function isOverZone(x,y){
    var z=favZone(); if(!z) return false;
    var r=z.getBoundingClientRect();
    return x>=r.left-12&&x<=r.right+12&&y>=r.top-14&&y<=r.bottom+14;
  }
  function updateZone(){
    if(!active||!active.dragging) return;
    var over=isOverZone(active.x,active.y),z=favZone();
    if(over!==active.overProtect){
      active.overProtect=over;
      if(z){
        z.classList.toggle("single-protect-hover",over);
        var label=z.querySelector("strong");
        if(label) label.textContent=over ? "ここで離すと全曲保護♪" : "ここへ運ぶと保護♪";
      }
      if(over) haptic(8);
    }
  }
  function moveItem(){
    var a=active;if(!a||!a.dragging||a.overProtect) return;
    var cards=Array.prototype.slice.call(a.list.children).filter(function(c){return isSingle(c)&&c!==a.card;});
    if(!cards.length) return;
    var best=null,bestDist=Infinity;
    cards.forEach(function(c){var r=c.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(a.x-cx,a.y-cy);if(d<bestDist){bestDist=d;best={el:c,r:r,cx:cx,cy:cy};}});
    if(!best) return;
    var before=(a.y<best.cy) || (Math.abs(a.y-best.cy)<best.r.height*.34 && a.x<best.cx);
    var ref=before?best.el:best.el.nextSibling;
    if(ref!==a.card && ref!==a.card.nextSibling){ a.list.insertBefore(a.card,ref); }
  }
  function onMove(e){
    if(!active) return;var p=point(e);active.x=p.x;active.y=p.y;
    if(!active.dragging){if(Math.hypot(p.x-active.startX,p.y-active.startY)>CANCEL_PX) cancelPending();return;}
    stop(e);moveGhost();updateZone();moveItem();
  }
  function refreshLockedAlbumEffects(){
    // Favorite toggling rebuilds the whole music list. Re-apply the custom
    // locked-album typography only after that rebuild has settled.
    try{
      document.dispatchEvent(new CustomEvent("megane:music-lock-effects-refresh"));
    }catch(_){
      try{ document.dispatchEvent(new Event("megane:music-lock-effects-refresh")); }catch(__){}
    }
    try{
      if(typeof window.MEGANE_MUSIC_REAPPLY_LOCK_EFFECTS === "function"){
        window.MEGANE_MUSIC_REAPPLY_LOCK_EFFECTS();
      }
    }catch(_){ }
    setTimeout(function(){
      try{
        if(typeof window.MEGANE_MUSIC_REAPPLY_LOCK_EFFECTS === "function"){
          window.MEGANE_MUSIC_REAPPLY_LOCK_EFFECTS();
        }
      }catch(_){ }
    },180);
  }
  function protectSingle(a){
    var x=singleInfo(a.card),album=x.album||{};
    var tracks=Array.isArray(album.tracks)?album.tracks.filter(function(t){return t&&t.id;}):[];
    if(!tracks.length||typeof window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE!=="function") return false;
    var added=0,already=0;
    tracks.forEach(function(t){
      var isAlready=false;
      try{ isAlready=!!(window.MEGANE_MUSIC_V7_IS_FAVORITE&&window.MEGANE_MUSIC_V7_IS_FAVORITE(t.id)); }catch(_){ }
      if(isAlready){ already++; return; }
      try{ window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE(t.id); added++; }catch(_){ }
    });
    haptic([15,30,15]);
    var z=favZone();
    if(z){
      z.classList.remove("single-protect-hover");
      z.classList.add("single-protect-success");
      setTimeout(function(){var current=favZone();if(current)current.classList.remove("single-protect-success");},560);
    }
    if(added>0) toast(tracks.length>1 ? tracks.length+"曲まとめて保護しました♪" : "保護しました♪");
    else toast("すべて保護済みです");
    refreshLockedAlbumEffects();
    return true;
  }
  function finish(e,cancelled){
    if(!active){ removeStaleGhosts(); return; }
    var a=active;
    var shouldProtect=!!(a.dragging&&!cancelled&&a.overProtect);
    if(a.dragging){ stop(e); suppressClickUntil=now()+500; }
    // DOMの再描画より先にドラッグ表示を必ず片付ける。
    cleanup(a);
    if(!a.dragging) return;
    if(shouldProtect) protectSingle(a);
    else if(!cancelled) saveOrder(a.list);
  }
  function removeStaleGhosts(){
    Array.prototype.slice.call(document.querySelectorAll(".single-drag-ghost")).forEach(function(el){try{el.remove();}catch(_){}});
    document.documentElement.classList.remove("single-drag-active");
    var z=favZone();
    if(z) z.classList.remove("single-protect-available","single-protect-hover");
  }
  function cleanup(a){
    a=a||active;
    if(!a){ removeStaleGhosts(); return; }
    clearTimeout(a.timer);stopAutoScroll();
    if(a.ghost&&a.ghost.parentNode)a.ghost.remove();
    if(a.card)a.card.classList.remove("single-reorder-source");
    if(a.list)a.list.classList.remove("single-reordering");
    var z=favZone();
    if(z){
      z.classList.remove("single-protect-available","single-protect-hover");
      var label=z.querySelector("strong");
      if(label&&a.zoneLabel!=null) label.textContent=a.zoneLabel;
    }
    document.documentElement.classList.remove("single-drag-active");
    if(active===a) active=null;
    removeStaleGhosts();
  }
  function autoStep(){
    if(!active||!active.dragging){autoRaf=0;return;}
    var sc=active.scrollEl || findScrollContainer(active.list);
    var top=0,bottom=(window.innerHeight||document.documentElement.clientHeight);
    var isPage=(sc===document.body||sc===document.documentElement||sc===document.scrollingElement);
    if(!isPage){
      var sr=sc.getBoundingClientRect();
      top=sr.top;
      bottom=sr.bottom;
    }
    var y=active.y,dy=0;
    if(y<top+EDGE_PX){
      dy=-MAX_SCROLL_STEP*(1-(Math.max(0,y-top)/EDGE_PX));
    }else if(y>bottom-EDGE_PX){
      dy=MAX_SCROLL_STEP*(1-(Math.max(0,bottom-y)/EDGE_PX));
    }
    if(Math.abs(dy)>.2){
      if(isPage) window.scrollBy(0,dy);
      else sc.scrollTop+=dy;
      moveItem();
      updateZone();
    }
    autoRaf=requestAnimationFrame(autoStep);
  }
  function startAutoScroll(){if(!autoRaf)autoRaf=requestAnimationFrame(autoStep);}
  function stopAutoScroll(){if(autoRaf){cancelAnimationFrame(autoRaf);autoRaf=0;}}
  function bind(list){
    if(!list||list.dataset.singleReorderBound==="1") return;
    list.dataset.singleReorderBound="1";list.classList.add("single-reorder-ready");applyOrder(list);
    list.addEventListener("touchstart",function(e){var c=e.target.closest&&e.target.closest(".music-v7-single-card");if(c&&list.contains(c))begin(e,c,list);},{passive:true});
    // PC fallback: supported but mobile remains the primary target.
    list.addEventListener("mousedown",function(e){if(e.button!==0)return;var c=e.target.closest&&e.target.closest(".music-v7-single-card");if(c&&list.contains(c))begin(e,c,list);});
  }
  function bindGlobal(){
    if(globalBound) return; globalBound=true;
    document.addEventListener("touchmove",onMove,{passive:false,capture:true});
    document.addEventListener("touchend",function(e){finish(e,false);},{passive:false,capture:true});
    document.addEventListener("touchcancel",function(e){if(active&&active.dragging)finish(e,true);else cancelPending();removeStaleGhosts();},{passive:false,capture:true});
    document.addEventListener("mousemove",onMove,true);
    document.addEventListener("mouseup",function(e){finish(e,false);},true);
    window.addEventListener("blur",function(){if(active)finish({cancelable:false,stopPropagation:function(){}},true);else removeStaleGhosts();});
    document.addEventListener("visibilitychange",function(){if(document.hidden){if(active)finish({cancelable:false,stopPropagation:function(){}},true);else removeStaleGhosts();}});
  }
  function polish(){
    injectStyle();var list=singleList();if(list){bind(list);applyOrder(list);}
  }
  document.addEventListener("click",function(e){
    if(now()<suppressClickUntil && e.target.closest && e.target.closest(".music-v7-single-card")) stop(e);
  },true);
  function start(){
    bindGlobal();
    removeStaleGhosts();
    polish();
    if(observer)observer.disconnect();
    observer=new MutationObserver(function(){clearTimeout(observer._t);observer._t=setTimeout(polish,30);});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
