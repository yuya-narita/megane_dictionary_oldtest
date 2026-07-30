/* 147_music_single_reorder_protect.js v1
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
      ".music-v7-favline.single-protect-available{transition:transform .16s ease,box-shadow .16s ease,background .16s ease,border-color .16s ease!important;box-shadow:0 0 0 1px rgba(255,232,138,.20),0 0 28px rgba(255,220,90,.12)!important;}"+
      ".music-v7-favline.single-protect-hover{transform:scale(1.025)!important;background:rgba(255,225,110,.16)!important;border-color:rgba(255,235,150,.68)!important;box-shadow:0 0 34px rgba(255,220,90,.35)!important;}"+
      ".music-v7-favline.single-protect-success{animation:singleProtectPulse .52s ease both!important;}"+
      "@keyframes singleProtectPulse{0%{transform:scale(1)}35%{transform:scale(1.045);filter:brightness(1.35)}100%{transform:scale(1);filter:none}}"+
      ".single-protect-toast{position:fixed;left:50%;bottom:104px;z-index:2147483003;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(13,16,26,.94);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;pointer-events:none;box-shadow:0 12px 36px rgba(0,0,0,.38);animation:singleProtectToast 1.25s ease both;}"+
      "@keyframes singleProtectToast{0%{opacity:0;transform:translate(-50%,8px)}15%,72%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-5px)}}"+
      "html.single-drag-active,html.single-drag-active body{user-select:none!important;-webkit-user-select:none!important;}"+
      "@media(max-width:375px){.single-drag-ghost{grid-template-columns:48px minmax(0,1fr) auto!important;gap:9px!important;padding:9px 10px!important}.single-drag-ghost .music-v7-single-thumb{width:48px!important;height:48px!important;min-width:48px!important;border-radius:12px!important;}}";
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
    active={card:card,list:list,startX:p.x,startY:p.y,x:p.x,y:p.y,timer:0,dragging:false,ghost:null,offX:0,offY:0,width:0,height:0,overProtect:false,scrollEl:null};
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
  function startDrag(){
    if(!active || active.dragging || !document.body.contains(active.card)) return;
    var a=active,r=a.card.getBoundingClientRect();
    a.dragging=true;a.width=r.width;a.height=r.height;
    a.offX=Math.max(0,Math.min(r.width,a.x-r.left));a.offY=Math.max(0,Math.min(r.height,a.y-r.top));
    a.ghost=makeGhost(a.card,r);a.scrollEl=document.scrollingElement||document.documentElement;
    a.card.classList.add("single-reorder-source");a.list.classList.add("single-reordering");
    document.documentElement.classList.add("single-drag-active");
    var zone=favZone(); if(zone) zone.classList.add("single-protect-available");
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
      if(z) z.classList.toggle("single-protect-hover",over);
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
  function protectSingle(a){
    var x=singleInfo(a.card),t=x.track;
    if(!t||!t.id||typeof window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE!=="function") return false;
    var already=false;
    try{ already=!!(window.MEGANE_MUSIC_V7_IS_FAVORITE&&window.MEGANE_MUSIC_V7_IS_FAVORITE(t.id)); }catch(_){ }
    if(!already) window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE(t.id);
    haptic([15,30,15]);
    var z=favZone();if(z){z.classList.remove("single-protect-hover");z.classList.add("single-protect-success");setTimeout(function(){if(z)z.classList.remove("single-protect-success");},560);}
    toast(already?"すでに保護されています":"保護しました♪");
    return true;
  }
  function finish(e,cancelled){
    if(!active) return;var a=active;
    if(a.dragging){stop(e);if(!cancelled&&a.overProtect) protectSingle(a);else saveOrder(a.list);suppressClickUntil=now()+500;}
    cleanup();
  }
  function cleanup(){
    if(!active) return;var a=active;clearTimeout(a.timer);stopAutoScroll();
    if(a.ghost&&a.ghost.parentNode)a.ghost.remove();
    if(a.card)a.card.classList.remove("single-reorder-source");
    if(a.list)a.list.classList.remove("single-reordering");
    var z=favZone();if(z)z.classList.remove("single-protect-available","single-protect-hover");
    document.documentElement.classList.remove("single-drag-active");active=null;
  }
  function autoStep(){
    if(!active||!active.dragging){autoRaf=0;return;}
    var y=active.y,h=window.innerHeight||document.documentElement.clientHeight,dy=0;
    if(y<EDGE_PX)dy=-MAX_SCROLL_STEP*(1-(Math.max(0,y)/EDGE_PX));
    else if(y>h-EDGE_PX)dy=MAX_SCROLL_STEP*(1-(Math.max(0,h-y)/EDGE_PX));
    if(Math.abs(dy)>.2){window.scrollBy(0,dy);moveItem();updateZone();}
    autoRaf=requestAnimationFrame(autoStep);
  }
  function startAutoScroll(){if(!autoRaf)autoRaf=requestAnimationFrame(autoStep);}
  function stopAutoScroll(){if(autoRaf){cancelAnimationFrame(autoRaf);autoRaf=0;}}
  function bind(list){
    if(!list||list.dataset.singleReorderBound==="1") return;
    list.dataset.singleReorderBound="1";list.classList.add("single-reorder-ready");applyOrder(list);
    list.addEventListener("touchstart",function(e){var c=e.target.closest&&e.target.closest(".music-v7-single-card");if(c&&list.contains(c))begin(e,c,list);},{passive:true});
    document.addEventListener("touchmove",onMove,{passive:false,capture:true});
    document.addEventListener("touchend",function(e){finish(e,false);},{passive:false,capture:true});
    document.addEventListener("touchcancel",function(e){if(active&&active.dragging)finish(e,false);else cancelPending();},{passive:false,capture:true});
    // PC fallback: supported but mobile remains the primary target.
    list.addEventListener("mousedown",function(e){if(e.button!==0)return;var c=e.target.closest&&e.target.closest(".music-v7-single-card");if(c&&list.contains(c))begin(e,c,list);});
    document.addEventListener("mousemove",onMove,true);
    document.addEventListener("mouseup",function(e){finish(e,false);},true);
  }
  function polish(){
    injectStyle();var list=singleList();if(list){bind(list);applyOrder(list);}
  }
  document.addEventListener("click",function(e){
    if(now()<suppressClickUntil && e.target.closest && e.target.closest(".music-v7-single-card")) stop(e);
  },true);
  function start(){
    polish();
    if(observer)observer.disconnect();
    observer=new MutationObserver(function(){clearTimeout(observer._t);observer._t=setTimeout(polish,30);});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
