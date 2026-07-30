/* 143_mode_favorites.js production2
 * mvp_last 専用・既存イベントへ正規接続版
 *
 * 80_favorites_singleton.js の onOpen から呼ばれる。
 * 独自に中央ボタンをcloneしない。
 * 独自にwindow captureでイベントを奪わない。
 */
(function(){
  "use strict";

  var CONF_KEY = "megane_conf_favorites";
  var CONF_ORDER_KEY = "megane_conf_favorite_order";
  var DIALOG_ID = "productionConfFavorites143";
  var LIST_ID = "productionConfFavorites143List";
  var STYLE_ID = "productionConfFavorites143Style";

  function q(id){ return document.getElementById(id); }

  function currentMode(){
    try{
      if(document.body.classList.contains("mode-music")) return "music";
      if(document.body.classList.contains("mode-manga") ||
         document.body.classList.contains("mode-conf")) return "conf";
    }catch(_){}
    return "";
  }

  function stop(e){
    if(!e) return;
    try{ if(e.cancelable !== false) e.preventDefault(); }catch(_){}
    try{ e.stopPropagation(); }catch(_){}
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
  }

  function readMap(){
    try{
      var value = JSON.parse(localStorage.getItem(CONF_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    }catch(_){
      return {};
    }
  }

  function writeMap(value){
    try{ localStorage.setItem(CONF_KEY,JSON.stringify(value)); }catch(_){}
  }

  function readOrder(){
    try{
      var value=JSON.parse(localStorage.getItem(CONF_ORDER_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    }catch(_){
      return [];
    }
  }

  function writeOrder(order){
    try{
      localStorage.setItem(CONF_ORDER_KEY,JSON.stringify(order || []));
    }catch(_){}
  }

  function currentConferenceOrder(map){
    var active=Object.keys(map || {}).filter(function(id){
      return !!map[id];
    });

    var order=readOrder().filter(function(id){
      return active.indexOf(id)>=0;
    });

    // Mapのキー追加順は古い→新しい。
    // 順番データにない新規項目は反転して先頭へ置く。
    var missing=active.filter(function(id){
      return order.indexOf(id)<0;
    }).reverse();

    order=missing.concat(order).filter(function(id,index,self){
      return !!id && self.indexOf(id)===index;
    });

    writeOrder(order);
    return order;
  }

  function stories(){
    try{
      if(Array.isArray(window.mangaStories)) return window.mangaStories;
      if(typeof mangaStories !== "undefined" && Array.isArray(mangaStories)) return mangaStories;
    }catch(_){}
    return [];
  }

  function esc(v){
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function conferenceNo(story,index){
    var values = [
      story && story.no,
      story && story.number,
      story && story.id
    ];

    for(var i=0;i<values.length;i++){
      var m = String(values[i] || "").match(/(\d{1,4})/);
      if(m) return String(Number(m[1])).padStart(3,"0");
    }

    return String(index + 1).padStart(3,"0");
  }

  function closeDictionaryFavorites(){
    var dlg = q("favoriteDialog");
    if(!dlg) return;

    try{
      if(dlg.open && typeof dlg.close === "function") dlg.close();
      else dlg.removeAttribute("open");
    }catch(_){
      dlg.removeAttribute("open");
    }
  }

  function ensureStyle(){
    if(q(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${DIALOG_ID}{
        width:min(92vw,560px);
        max-height:76dvh;
        padding:0;
        border:1px solid rgba(255,255,255,.16);
        border-radius:28px;
        background:rgba(13,16,26,.97);
        color:#fff;
        box-shadow:0 28px 90px rgba(0,0,0,.58);
        -webkit-backdrop-filter:blur(18px);
        backdrop-filter:blur(18px);
        overflow:hidden;
      }
      #${DIALOG_ID}::backdrop{background:rgba(0,0,0,.62)}
      .p143-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:20px 22px 14px;
      }
      .p143-head strong{font-size:23px}
      .p143-close{
        width:42px;height:42px;border:0;background:transparent;
        color:#fff;font-size:25px;font-weight:900;
      }
      #${LIST_ID}{
        display:grid;
        gap:12px;
        max-height:calc(76dvh - 82px);
        overflow:auto;
        padding:8px 20px 24px;
        -webkit-overflow-scrolling:touch;
      }
      .p143-wrap{
        position:relative;
        overflow:hidden;
        border-radius:22px;
        background:#b93643;
      }
      .p143-delete{
        position:absolute;
        right:0;top:0;bottom:0;
        width:88px;
        display:grid;
        place-items:center;
        font-size:13px;
        font-weight:900;
        opacity:0;
        pointer-events:none;
      }
      .p143-wrap.swiping .p143-delete{opacity:1}
      .p143-row{
        position:relative;
        z-index:1;
        width:100%;
        min-height:96px;
        display:grid;
        grid-template-columns:76px minmax(0,1fr);
        align-items:center;
        gap:14px;
        padding:12px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:22px;
        background:rgb(29,32,43);
        color:#fff;
        text-align:left;
        transform:translateX(0);
        transition:transform .16s ease,opacity .16s ease;
        touch-action:pan-y;
      }
      .p143-row.dragging{transition:none}
      .p143-wrap.p143-reorder-active{
        z-index:30;
        overflow:visible;
        transform:scale(1.025);
        box-shadow:0 16px 38px rgba(0,0,0,.50);
      }
      .p143-wrap.p143-reorder-active .p143-row{
        background:rgb(43,47,62);
      }
      #${LIST_ID}.p143-reordering{
        overflow:hidden;
        touch-action:none;
      }
      .p143-row.removing{transform:translateX(-120%);opacity:0}
      .p143-thumb{
        width:76px;height:76px;border-radius:15px;
        overflow:hidden;background:rgba(255,255,255,.06);
      }
      .p143-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .p143-meta{min-width:0;display:grid;gap:7px}
      .p143-title{font-size:17px;font-weight:900;line-height:1.35}
      .p143-sub{font-size:13px;font-weight:700;color:rgba(255,255,255,.58)}
      .p143-empty{
        padding:36px 14px 46px;
        text-align:center;
        color:rgba(255,255,255,.62);
        font-weight:800;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureDialog(){
    var dlg = q(DIALOG_ID);
    if(dlg) return dlg;

    dlg = document.createElement("dialog");
    dlg.id = DIALOG_ID;
    dlg.innerHTML =
      '<div class="p143-head">'+
        '<strong>お気に入り会議</strong>'+
        '<button type="button" class="p143-close">×</button>'+
      '</div>'+
      '<div id="'+LIST_ID+'"></div>';

    document.body.appendChild(dlg);

    dlg.querySelector(".p143-close").addEventListener("click",function(){
      try{ dlg.close(); }catch(_){ dlg.removeAttribute("open"); }
    });

    return dlg;
  }

  function removeConferenceFavorite(id){
    var map = readMap();
    delete map[id];
    writeMap(map);

    writeOrder(readOrder().filter(function(x){
      return x!==id;
    }));
  }

  function openConference(index){
    var data = stories();
    var story = data[index];
    if(!story) return;

    try{
      selectedMangaIndex = index;
      mangaStoryIndex = index;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      appMode = "manga";
    }catch(_){}

    try{
      if(typeof window.setMode === "function") window.setMode("manga");
      else if(typeof setMode === "function") setMode("manga");
      else if(typeof window.render === "function") window.render("flash");
      else if(typeof render === "function") render("flash");
    }catch(_){}
  }

  function bindSwipe(wrap,row,id,index){
    var sx=0;
    var sy=0;
    var dx=0;
    var horizontal=false;
    var suppress=false;
    var reorderTimer=0;
    var reorderActive=false;

    function cancelTimer(){
      clearTimeout(reorderTimer);
      reorderTimer=0;
    }

    function beginReorder(){
      if(!wrap.isConnected) return;

      reorderActive=true;
      suppress=true;
      horizontal=false;
      dx=0;

      row.style.transform="";
      row.classList.remove("dragging");
      wrap.classList.remove("swiping");
      wrap.classList.add("p143-reorder-active");

      var list=wrap.parentNode;
      if(list) list.classList.add("p143-reordering");

      try{ if(navigator.vibrate) navigator.vibrate(12); }catch(_){}
    }

    function finishReorder(){
      cancelTimer();

      var list=wrap.parentNode;
      wrap.classList.remove("p143-reorder-active");
      if(list) list.classList.remove("p143-reordering");

      if(list){
        var order=Array.from(list.querySelectorAll(".p143-wrap"))
          .map(function(item){
            var button=item.querySelector(".p143-row");
            return button ? button.dataset.id || "" : "";
          })
          .filter(Boolean);

        writeOrder(order);
      }

      reorderActive=false;
      setTimeout(function(){ suppress=false; },180);
    }

    row.addEventListener("touchstart",function(e){
      var t=e.touches && e.touches[0];
      if(!t) return;

      sx=t.clientX;
      sy=t.clientY;
      dx=0;
      horizontal=false;
      suppress=false;
      row.classList.add("dragging");

      cancelTimer();
      reorderTimer=setTimeout(beginReorder,430);
    },{passive:true});

    row.addEventListener("touchmove",function(e){
      var t=e.touches && e.touches[0];
      if(!t) return;

      var nx=t.clientX-sx;
      var ny=t.clientY-sy;

      if(reorderActive){
        e.preventDefault();
        e.stopPropagation();

        var list=wrap.parentNode;
        if(!list) return;

        var target=document.elementFromPoint(t.clientX,t.clientY);
        var over=target && target.closest
          ? target.closest(".p143-wrap")
          : null;

        if(!over || over===wrap || over.parentNode!==list) return;

        var rect=over.getBoundingClientRect();
        if(t.clientY < rect.top + rect.height/2){
          list.insertBefore(wrap,over);
        }else{
          list.insertBefore(wrap,over.nextSibling);
        }
        return;
      }

      if(Math.abs(nx)>9 || Math.abs(ny)>9) cancelTimer();

      if(!horizontal){
        horizontal=Math.abs(nx)>10 && Math.abs(nx)>Math.abs(ny)*1.15;
      }
      if(!horizontal) return;

      e.preventDefault();
      dx=Math.min(0,Math.max(-118,nx));
      suppress=Math.abs(dx)>8;
      wrap.classList.add("swiping");
      row.style.transform="translateX("+dx+"px)";
    },{passive:false});

    row.addEventListener("touchend",function(){
      row.classList.remove("dragging");

      if(reorderActive){
        finishReorder();
        return;
      }

      cancelTimer();

      if(horizontal && dx<=-80){
        row.classList.add("removing");
        setTimeout(function(){
          removeConferenceFavorite(id);
          wrap.remove();

          var list=q(LIST_ID);
          if(list && !list.querySelector(".p143-wrap")){
            list.innerHTML='<div class="p143-empty">まだお気に入り会議はありません。</div>';
          }
        },180);
      }else{
        row.style.transform="";
        wrap.classList.remove("swiping");
      }

      setTimeout(function(){
        horizontal=false;
        suppress=false;
      },180);
    },{passive:true});

    row.addEventListener("touchcancel",function(){
      row.classList.remove("dragging");
      if(reorderActive) finishReorder();
      else cancelTimer();
    },{passive:true});

    row.addEventListener("click",function(e){
      if(suppress || reorderActive){
        stop(e);
        return;
      }

      var dlg=q(DIALOG_ID);
      try{ if(dlg) dlg.close(); }catch(_){}
      openConference(index);
    });
  }

  function showConferenceFavorites(){
    closeDictionaryFavorites();

    var dlg=ensureDialog();
    var list=q(LIST_ID);
    var map=readMap();
    var data=stories();
    var rows=[];
    var byId={};

    data.forEach(function(story,index){
      if(story && story.id){
        byId[story.id]={story:story,index:index};
      }
    });

    currentConferenceOrder(map).forEach(function(id){
      if(map[id] && byId[id]) rows.push(byId[id]);
    });

    if(!rows.length){
      list.innerHTML='<div class="p143-empty">まだお気に入り会議はありません。</div>';
    }else{
      list.innerHTML=rows.map(function(item){
        var story=item.story;
        var title=String(story.title || "").replace(/^🎙️?\s*/,"");

        return ''+
          '<div class="p143-wrap">'+
            '<div class="p143-delete">削除</div>'+
            '<button class="p143-row" type="button" data-id="'+esc(story.id)+'" data-index="'+item.index+'">'+
              '<span class="p143-thumb">'+
                (story.thumb?'<img src="'+esc(story.thumb)+'" alt="">':'')+
              '</span>'+
              '<span class="p143-meta">'+
                '<span class="p143-title">🎙 '+esc(title)+'</span>'+
                '<span class="p143-sub">Syntax Conference｜#'+conferenceNo(story,item.index)+'</span>'+
              '</span>'+
            '</button>'+
          '</div>';
      }).join("");

      list.querySelectorAll(".p143-wrap").forEach(function(wrap){
        var row=wrap.querySelector(".p143-row");
        bindSwipe(
          wrap,
          row,
          row.dataset.id,
          Number(row.dataset.index || 0)
        );
      });
    }

    try{
      if(dlg.showModal && !dlg.open) dlg.showModal();
      else dlg.setAttribute("open","");
    }catch(_){
      dlg.setAttribute("open","");
    }
  }

  function showMusicFavorites(){
    closeDictionaryFavorites();

    if(typeof window.MEGANE_MUSIC_V7_OPEN_FAVORITES_LIST === "function"){
      window.MEGANE_MUSIC_V7_OPEN_FAVORITES_LIST();
      return;
    }
  }

  window.MEGANE_MODE_FAVORITES_OPEN = function(e){
    var m=currentMode();

    if(m==="music"){
      stop(e);
      showMusicFavorites();
      return true;
    }

    if(m==="conf"){
      stop(e);
      showConferenceFavorites();
      return true;
    }

    return false;
  };

  function updateLabel(){
    var btn=q("randomWord") || q("randomWordFixed");
    if(!btn) return;

    var m=currentMode();
    if(m==="music"){
      btn.textContent="★";
      btn.setAttribute("aria-label","保護した曲");
    }else if(m==="conf"){
      btn.textContent="★";
      btn.setAttribute("aria-label","お気に入り会議");
    }
  }

  function boot(){
    ensureStyle();
    ensureDialog();

    new MutationObserver(function(){
      requestAnimationFrame(updateLabel);
    }).observe(document.body,{
      attributes:true,
      attributeFilter:["class"]
    });

    updateLabel();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();
