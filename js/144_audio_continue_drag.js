/* 144_audio_continue_drag.js production9
 * mvp_last + production143 専用
 *
 * 右下▶
 * - 短押し: 現在/最後の音楽・Conferenceを再生/一時停止
 * - 長押し: ミニプレイヤー表示
 *
 * ミニプレイヤー
 * - ドラッグで自由移動
 * - 素早く上下へフリックで非表示
 * - 位置・表示状態をlocalStorageへ保存
 * - 再起動／外部検索からの復帰でも再表示
 * - ドラッグ位置をそのまま自由保存（吸着なし）
 *
 * 軽量設計
 * - MutationObserverなし
 * - setIntervalなし
 * - DOM再帰renderなし
 */
(function(){
  "use strict";

  var BAR_ID = "meganeMiniPlayer144";
  var STYLE_ID = "meganeMiniPlayer144Style";
  var STORE = "megane_audio_continue_144_v1";
  var UI_STORE = "megane_audio_continue_144_ui_v2";
  var LONG_MS = 520;
  var EDGE_MARGIN = 12;

  var activeAudio = null;
  var activeType = "";
  var pressTimer = 0;
  var longFired = false;
  var suppressClickUntil = 0;
  var rightPressStartedAt = 0;
  var rightPressActive = false;
  var saveAt = 0;
  var resumeWanted = false;
  var autoResumeBusy = false;
  var hasGoneBackground = false;

  function q(id){ return document.getElementById(id); }

  function musicAudio(){ return q("musicAudio"); }
  function confAudio(){
    return q("confNativeAudio") || q("mangaAudio");
  }

  function audioTypeOf(a){
    if(!a) return "";
    if(a.id==="musicAudio") return "music";
    if(a.id==="confNativeAudio" || a.id==="mangaAudio") return "conference";
    return "";
  }

  function supportedAudio(a){
    return !!audioTypeOf(a);
  }

  function absUrl(src){
    if(!src) return "";
    try{ return new URL(src,location.href).href; }catch(_){ return String(src); }
  }

  function conferenceStories(){
    try{
      if(Array.isArray(window.mangaStories)) return window.mangaStories;
      if(typeof mangaStories!=="undefined" && Array.isArray(mangaStories)) return mangaStories;
    }catch(_){}
    return [];
  }

  function conferenceStoryForAudio(a){
    var list=conferenceStories();
    var src=absUrl(
      (a && (a.currentSrc || a.src || a.getAttribute("src"))) || ""
    );

    if(src){
      for(var i=0;i<list.length;i++){
        var story=list[i];
        if(story && story.audio && absUrl(story.audio)===src) return {story:story,index:i};
      }
    }

    try{
      if(typeof mangaStoryIndex!=="undefined" && list[mangaStoryIndex]){
        return {story:list[mangaStoryIndex],index:Number(mangaStoryIndex)};
      }
      if(typeof selectedMangaIndex!=="undefined" && list[selectedMangaIndex]){
        return {story:list[selectedMangaIndex],index:Number(selectedMangaIndex)};
      }
    }catch(_){}

    return null;
  }

  function setConferenceStoryById(id){
    if(!id) return false;
    var list=conferenceStories();
    var index=list.findIndex(function(story){
      return story && story.id===id;
    });
    if(index<0) return false;

    try{
      window.selectedMangaIndex=index;
      window.mangaStoryIndex=index;
      window.mangaPageIndex=0;
    }catch(_){}
    try{ if(typeof selectedMangaIndex!=="undefined") selectedMangaIndex=index; }catch(_){}
    try{ if(typeof mangaStoryIndex!=="undefined") mangaStoryIndex=index; }catch(_){}
    try{ if(typeof mangaPageIndex!=="undefined") mangaPageIndex=0; }catch(_){}

    try{ localStorage.setItem("megane_current_conference_id",id); }catch(_){}
    return true;
  }

  function conferenceNo(story,index){
    var values=[
      story && story.no,
      story && story.number,
      story && story.id
    ];
    for(var i=0;i<values.length;i++){
      var m=String(values[i] || "").match(/(\d{1,4})/);
      if(m) return String(Number(m[1])).padStart(3,"0");
    }
    return String((Number(index)||0)+1).padStart(3,"0");
  }

  function readJSON(key,fallback){
    try{
      var v=JSON.parse(localStorage.getItem(key) || "");
      return v && typeof v==="object" ? v : fallback;
    }catch(_){ return fallback; }
  }

  function writeJSON(key,value){
    try{ localStorage.setItem(key,JSON.stringify(value)); }catch(_){}
  }

  function readUI(){
    var state=readJSON(UI_STORE,null);
    if(!state){
      return {
        visible:false,
        xRatio:null,
        yRatio:null,
        snapX:"left",
        snapY:""
      };
    }
    return {
      visible:state.visible===true,
      xRatio:Number.isFinite(Number(state.xRatio)) ? Number(state.xRatio) : null,
      yRatio:Number.isFinite(Number(state.yRatio)) ? Number(state.yRatio) : null,
      snapX:state.snapX==="right" ? "right" : "left",
      snapY:state.snapY==="top" || state.snapY==="bottom" ? state.snapY : ""
    };
  }

  function writeUI(patch){
    var state=readUI();
    Object.keys(patch || {}).forEach(function(key){ state[key]=patch[key]; });
    writeJSON(UI_STORE,state);
  }

  function isAudioUsable(a){
    return !!(a && (a.currentSrc || a.src || a.getAttribute("src")));
  }

  function playingAudio(){
    var ma=musicAudio();
    var ca=confAudio();

    if(activeAudio && isAudioUsable(activeAudio) && !activeAudio.paused && !activeAudio.ended){
      return {audio:activeAudio,type:activeType || audioTypeOf(activeAudio)};
    }
    if(isAudioUsable(ma) && !ma.paused && !ma.ended){
      return {audio:ma,type:"music"};
    }
    if(isAudioUsable(ca) && !ca.paused && !ca.ended){
      return {audio:ca,type:"conference"};
    }
    return null;
  }

  function detectAudio(){
    // 鳴っているものがある時だけDOM側を採用。
    // 停止中は常に保存済みownerを正とする。
    return playingAudio();
  }

  function mediaMeta(type){
    var title="";
    var subtitle="";
    var artwork="";
    var itemId="";
    var storyId="";

    if(type==="music" && typeof window.MEGANE_MUSIC_V7_NOW==="function"){
      try{
        var m=window.MEGANE_MUSIC_V7_NOW();
        if(m){
          itemId=m.id || "";
          title=m.title || "";
          subtitle=m.subtitle || "";
          artwork=m.artwork || "";
        }
      }catch(_){}
    }

    try{
      var md=navigator.mediaSession && navigator.mediaSession.metadata;
      if(md){
        title=title || md.title || "";
        subtitle=subtitle || md.album || md.artist || "";
        if(!artwork && md.artwork && md.artwork[0]) artwork=md.artwork[0].src || "";
      }
    }catch(_){}

    if(type==="conference"){
      var info=conferenceStoryForAudio(activeAudio || confAudio());
      if(info && info.story){
        var story=info.story;
        storyId=story.id || "";
        itemId=storyId;
        title=story.title || title || "Syntax Conference";
        subtitle="Syntax Conference｜#"+conferenceNo(story,info.index);
        artwork=story.playerImage || story.thumb || artwork || "";
      }else{
        title=
          textOf("#confTitle") ||
          textOf(".conf-title") ||
          textOf(".manga-title") ||
          textOf("#mangaTitle") ||
          title ||
          "Syntax Conference";
        subtitle=subtitle || "Syntax Conference";

        if(!artwork){
          var img=document.querySelector(
            ".conf-stage img,.manga-reader-image,.conf-cover"
          );
          if(img) artwork=img.currentSrc || img.src || "";
        }
      }
    }

    return {
      id:itemId,
      storyId:storyId,
      title:title || (type==="music" ? "MEGANE MUSIC" : "Syntax Conference"),
      subtitle:subtitle || (type==="music" ? "Music" : "Conference"),
      artwork:artwork
    };
  }

  function textOf(sel){
    var el=document.querySelector(sel);
    return el ? String(el.textContent || "").trim() : "";
  }

  function snapshot(a,type){
    if(!isAudioUsable(a)) return null;
    var previousActive=activeAudio;
    if(type==="conference") activeAudio=a;
    var meta=mediaMeta(type);
    if(type==="conference" && previousActive && previousActive!==a && !a){
      activeAudio=previousActive;
    }
    return {
      type:type,
      id:meta.id || "",
      storyId:meta.storyId || "",
      src:a.currentSrc || a.src || a.getAttribute("src") || "",
      time:Number(a.currentTime || 0),
      title:meta.title,
      subtitle:meta.subtitle,
      artwork:meta.artwork,
      resumeWanted:resumeWanted === true,
      savedAt:Date.now()
    };
  }

  function save(a,type,force){
    var now=Date.now();
    if(!force && now-saveAt<2500) return;
    saveAt=now;
    var data=snapshot(a,type);
    if(data) writeJSON(STORE,data);
  }

  function ensureStyle(){
    if(q(STYLE_ID)) return;
    var st=document.createElement("style");
    st.id=STYLE_ID;
    st.textContent=`
      #${BAR_ID}{
        position:fixed;
        left:46px;
        top:calc(100dvh - 230px);
        z-index:2147483000 !important;
        isolation:isolate;
        width:min(86vw,390px);
        height:62px;
        box-sizing:border-box;
        display:grid;
        grid-template-columns:46px minmax(0,1fr) 36px 48px;
        align-items:center;
        column-gap:8px;
        padding:8px 9px;
        border:1px solid rgba(255,255,255,.16);
        border-radius:21px;
        background:rgba(10,13,22,.93);
        color:#fff;
        box-shadow:0 16px 45px rgba(0,0,0,.46);
        -webkit-backdrop-filter:blur(16px);
        backdrop-filter:blur(16px);
        touch-action:none;
        user-select:none;
        -webkit-user-select:none;
        transform:translate3d(0,0,0);
      }
      #${BAR_ID}[hidden]{display:none!important}
      .mp144-art{
        width:46px;height:46px;border-radius:13px;overflow:hidden;
        background:rgba(255,255,255,.08);
        display:grid;place-items:center;font-size:19px;
      }
      .mp144-art img{width:100%;height:100%;display:block;object-fit:cover;pointer-events:none}
      .mp144-text{min-width:0;display:grid;gap:3px;pointer-events:none}
      .mp144-title,.mp144-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mp144-title{font-size:14px;font-weight:900}
      .mp144-sub{font-size:11px;font-weight:750;color:rgba(255,255,255,.58)}
      .mp144-fav{
        width:36px;
        height:44px;
        padding:0;
        margin:0;
        border:0;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        align-self:center;
        justify-self:center;
        background:transparent;
        color:rgba(255,255,255,.58);
        font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
        font-size:25px;
        font-weight:700;
        line-height:1;
        transform:translateY(-1px);
        touch-action:manipulation;
        -webkit-appearance:none;
        appearance:none;
      }
      .mp144-fav.on{
        color:#ffe76a;
        text-shadow:0 0 13px rgba(255,229,88,.78);
      }
      .mp144-toggle{
        width:44px;height:44px;border:0;border-radius:50%;
        display:grid;place-items:center;
        background:rgba(255,255,255,.10);color:#fff;
        font-size:20px;font-weight:900;
        touch-action:manipulation;
      }
      #${BAR_ID}.mp144-dragging{transition:none}
      #${BAR_ID}.mp144-hide{
        transition:opacity .16s ease,transform .16s ease;
        opacity:0;
        transform:translate3d(0,35px,0) scale(.94);
      }
    `;
    document.head.appendChild(st);
  }

  function ensureBar(){
    var bar=q(BAR_ID);
    if(bar) return bar;

    bar=document.createElement("section");
    bar.id=BAR_ID;
    bar.hidden=true;
    bar.innerHTML=
      '<div class="mp144-art">♪</div>'+
      '<div class="mp144-text">'+
        '<div class="mp144-title">最後の音声</div>'+
        '<div class="mp144-sub">長押しで呼び出しました</div>'+
      '</div>'+
      '<button type="button" class="mp144-fav" aria-label="お気に入り">☆</button>'+
      '<button type="button" class="mp144-toggle" aria-label="再生">▶</button>';

    document.body.appendChild(bar);

    // 音楽モードの上部ナビ／プレイヤーが高いstacking layerを持つため、
    // inline styleでも最前面を保証する。
    bar.style.setProperty("z-index","2147483000","important");
    bar.style.setProperty("isolation","isolate");

    var fav=bar.querySelector(".mp144-fav");
    var favHandledAt=0;

    function activateFavorite(e){
      var now=Date.now();
      if(now-favHandledAt<450){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        return;
      }
      favHandledAt=now;
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      toggleFavorite();
      renderBar();
    }

    fav.addEventListener("pointerdown",function(e){
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    },true);
    fav.addEventListener("touchend",activateFavorite,{capture:true,passive:false});
    fav.addEventListener("click",activateFavorite,true);

    var toggle=bar.querySelector(".mp144-toggle");
    toggle.addEventListener("pointerdown",function(e){ e.stopPropagation(); },true);
    toggle.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      toggleAudio();
    },true);

    bindDrag(bar);
    restorePosition(bar);
    return bar;
  }

  function viewportBounds(bar){
    var w=bar.offsetWidth || 330;
    var h=bar.offsetHeight || 62;
    var vv=window.visualViewport;
    var viewW=vv ? vv.width : window.innerWidth;
    var viewH=vv ? vv.height : window.innerHeight;
    var offsetX=vv ? vv.offsetLeft : 0;
    var offsetY=vv ? vv.offsetTop : 0;

    return {
      minX:offsetX+EDGE_MARGIN,
      maxX:Math.max(offsetX+EDGE_MARGIN,offsetX+viewW-w-EDGE_MARGIN),
      minY:offsetY+EDGE_MARGIN,
      maxY:Math.max(offsetY+EDGE_MARGIN,offsetY+viewH-h-92)
    };
  }

  function clampPosition(bar,x,y){
    var b=viewportBounds(bar);
    return {
      x:Math.max(b.minX,Math.min(b.maxX,x)),
      y:Math.max(b.minY,Math.min(b.maxY,y))
    };
  }

  function positionFromState(bar,state){
    var b=viewportBounds(bar);
    var rangeX=Math.max(1,b.maxX-b.minX);
    var rangeY=Math.max(1,b.maxY-b.minY);

    var x;
    if(state.xRatio!==null){
      x=b.minX+rangeX*Math.max(0,Math.min(1,Number(state.xRatio)));
    }else if(state.snapX==="right"){
      x=b.maxX;
    }else{
      x=b.minX;
    }

    var y;
    if(state.snapY==="top") y=b.minY;
    else if(state.snapY==="bottom") y=b.maxY;
    else if(state.yRatio!==null) y=b.minY+rangeY*Math.max(0,Math.min(1,Number(state.yRatio)));
    else y=b.maxY;

    return clampPosition(bar,x,y);
  }

  function restorePosition(bar){
    var state=readUI();
    requestAnimationFrame(function(){
      var c=positionFromState(bar,state);
      bar.style.left=c.x+"px";
      bar.style.top=c.y+"px";
    });
  }

  function savePosition(bar,extra){
    var r=bar.getBoundingClientRect();
    var b=viewportBounds(bar);
    var rangeX=Math.max(1,b.maxX-b.minX);
    var rangeY=Math.max(1,b.maxY-b.minY);

    writeUI(Object.assign({
      xRatio:Math.max(0,Math.min(1,(r.left-b.minX)/rangeX)),
      yRatio:Math.max(0,Math.min(1,(r.top-b.minY)/rangeY))
    },extra || {}));
  }

  function finishFreePosition(bar){
    // 指を離した位置をそのまま保存する。
    // 画面外へ出た分だけclampするが、中央配置を含め吸着はしない。
    var r=bar.getBoundingClientRect();
    var c=clampPosition(bar,r.left,r.top);

    bar.style.left=c.x+"px";
    bar.style.top=c.y+"px";

    var b=viewportBounds(bar);
    var rangeX=Math.max(1,b.maxX-b.minX);
    var rangeY=Math.max(1,b.maxY-b.minY);

    writeUI({
      visible:true,
      snapX:"",
      snapY:"",
      xRatio:Math.max(0,Math.min(1,(c.x-b.minX)/rangeX)),
      yRatio:Math.max(0,Math.min(1,(c.y-b.minY)/rangeY))
    });
  }

  function bindDrag(bar){
    var dragging=false;
    var sx=0,sy=0,startLeft=0,startTop=0,startTime=0,lastY=0,lastTime=0;
    var moved=false;

    bar.addEventListener("pointerdown",function(e){
      if(e.target.closest(".mp144-toggle,.mp144-fav")) return;
      dragging=true;
      moved=false;
      sx=e.clientX; sy=e.clientY;
      var r=bar.getBoundingClientRect();
      startLeft=r.left; startTop=r.top;
      startTime=Date.now();
      lastY=e.clientY; lastTime=startTime;
      bar.classList.add("mp144-dragging");
      try{ bar.setPointerCapture(e.pointerId); }catch(_){}
      e.preventDefault();
    });

    bar.addEventListener("pointermove",function(e){
      if(!dragging) return;
      var dx=e.clientX-sx;
      var dy=e.clientY-sy;
      if(Math.abs(dx)>4 || Math.abs(dy)>4) moved=true;

      var c=clampPosition(bar,startLeft+dx,startTop+dy);
      bar.style.left=c.x+"px";
      bar.style.top=c.y+"px";
      lastY=e.clientY;
      lastTime=Date.now();
      e.preventDefault();
    });

    function end(e){
      if(!dragging) return;
      dragging=false;
      bar.classList.remove("mp144-dragging");

      var totalY=e.clientY-sy;
      var elapsed=Math.max(1,Date.now()-startTime);
      var velocity=Math.abs(totalY)/elapsed;

      // 素早い上下フリックだけ収納。通常ドラッグは位置移動。
      if(moved && Math.abs(totalY)>=78 && velocity>=0.48){
        hideBar();
      }else{
        finishFreePosition(bar);
      }

      try{ bar.releasePointerCapture(e.pointerId); }catch(_){}
      e.preventDefault();
    }

    bar.addEventListener("pointerup",end);
    bar.addEventListener("pointercancel",end);
  }

  function readFavoriteState(data){
    if(!data) return false;

    if(data.type==="music"){
      try{
        if(typeof window.MEGANE_MUSIC_V7_IS_FAVORITE==="function"){
          return !!window.MEGANE_MUSIC_V7_IS_FAVORITE(data.id || "");
        }
      }catch(_){}
      try{
        var musicFavs=JSON.parse(localStorage.getItem("megane_music_v7_favs") || "[]") || [];
        return musicFavs.indexOf(data.id || "")>=0;
      }catch(_){ return false; }
    }

    if(data.type==="conference"){
      try{
        var confFavs=JSON.parse(localStorage.getItem("megane_conf_favorites") || "{}") || {};
        return !!confFavs[data.storyId || data.id || ""];
      }catch(_){ return false; }
    }

    return false;
  }

  function toggleFavorite(){
    var saved=readJSON(STORE,null);
    var playing=playingAudio();
    var data=playing ? snapshot(playing.audio,playing.type) : saved;
    if(!data) return false;

    if(data.type==="music"){
      try{
        if(typeof window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE==="function"){
          return window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE(data.id || "");
        }
      }catch(_){}

      try{
        var list=JSON.parse(localStorage.getItem("megane_music_v7_favs") || "[]") || [];
        var id=data.id || "";
        if(!id) return false;
        var at=list.indexOf(id);
        if(at>=0) list.splice(at,1);
        else list.push(id);
        localStorage.setItem("megane_music_v7_favs",JSON.stringify(list));
        return at<0;
      }catch(_){ return false; }
    }

    if(data.type==="conference"){
      try{
        var map=JSON.parse(localStorage.getItem("megane_conf_favorites") || "{}") || {};
        var storyId=data.storyId || data.id || "";
        if(!storyId) return false;
        map[storyId]=!map[storyId];
        localStorage.setItem("megane_conf_favorites",JSON.stringify(map));
        return !!map[storyId];
      }catch(_){ return false; }
    }

    return false;
  }

  function renderBar(){
    var bar=ensureBar();
    var playing=playingAudio();
    var saved=readJSON(STORE,null);
    var data=playing ? snapshot(playing.audio,playing.type) : saved;
    var isPlaying=!!playing;

    if(!data) return false;

    var art=bar.querySelector(".mp144-art");
    var title=bar.querySelector(".mp144-title");
    var sub=bar.querySelector(".mp144-sub");
    var fav=bar.querySelector(".mp144-fav");
    var btn=bar.querySelector(".mp144-toggle");

    title.textContent=data.title || "最後の音声";
    sub.textContent=data.subtitle || (data.type==="music" ? "Music" : "Conference");
    btn.textContent=isPlaying ? "Ⅱ" : "▶";
    btn.setAttribute("aria-label",isPlaying ? "一時停止" : "続きから再生");

    var favoriteOn=readFavoriteState(data);
    fav.textContent=favoriteOn ? "★" : "☆";
    fav.classList.toggle("on",favoriteOn);
    fav.setAttribute("aria-label",favoriteOn ? "お気に入り解除" : "お気に入りに追加");

    if(data.artwork){
      art.innerHTML='<img src="'+String(data.artwork).replace(/"/g,"&quot;")+'" alt="">';
    }else{
      art.textContent=data.type==="conference" ? "🎙" : "♪";
    }

    return true;
  }

  function showBar(options){
    var bar=ensureBar();
    if(!renderBar()) return false;

    writeUI({visible:true});
    bar.style.setProperty("z-index","2147483000","important");
    bar.style.setProperty("isolation","isolate");
    bar.classList.remove("mp144-hide");
    bar.hidden=false;
    restorePosition(bar);

    if(options && options.pulse){
      bar.animate(
        [
          {transform:"scale(.97)",opacity:.72},
          {transform:"scale(1.015)",opacity:1},
          {transform:"scale(1)",opacity:1}
        ],
        {duration:220,easing:"cubic-bezier(.2,.8,.2,1)"}
      );
    }
    return true;
  }

  function hideBar(){
    var bar=ensureBar();
    writeUI({visible:false});
    bar.classList.add("mp144-hide");
    setTimeout(function(){
      bar.hidden=true;
      bar.classList.remove("mp144-hide");
    },170);
  }

  function restoreVisibility(){
    var state=readUI();
    if(!state.visible) return false;
    return showBar();
  }

  function restoreSaved(){
    var saved=readJSON(STORE,null);
    if(!saved) return false;

    var a=saved.type==="music" ? musicAudio() : confAudio();
    if(!a) return false;

    activeAudio=a;
    activeType=saved.type;
    resumeWanted=true;

    if(saved.type==="conference"){
      // 25_conference_player_solid.js の700ms同期にsrcを戻されないよう、
      // 先に選択中Conferenceを保存済み回へ合わせる。
      setConferenceStoryById(saved.storyId || saved.id || "");
    }else if(saved.type==="music"){
      // 音だけ保存曲、表示だけ別曲になるのを防ぐ。
      try{
        if(typeof window.MEGANE_MUSIC_V7_SYNC_TO_SRC==="function"){
          window.MEGANE_MUSIC_V7_SYNC_TO_SRC(saved.src || "");
        }
      }catch(_){}
    }

    try{
      var current=absUrl(a.currentSrc || a.src || a.getAttribute("src") || "");
      var target=absUrl(saved.src || "");

      if(target && current!==target){
        try{ a.pause(); }catch(_){}
        a.setAttribute("src",saved.src);
        try{ a.load(); }catch(_){}
      }

      var applied=false;
      var applyPositionAndPlay=function(){
        if(applied) return;

        try{
          var duration=Number(a.duration || 0);
          var wanted=Math.max(0,Number(saved.time || 0));
          if(duration>0 && isFinite(duration)){
            wanted=Math.min(wanted,Math.max(0,duration-.2));
          }

          if(wanted>0 && Math.abs(Number(a.currentTime || 0)-wanted)>.5){
            a.currentTime=wanted;
          }
        }catch(_){}

        applied=true;

        try{
          var p=a.play();
          if(p && p.catch) p.catch(function(){});
        }catch(_){}

        setTimeout(renderBar,50);
      };

      if(a.readyState>=1){
        applyPositionAndPlay();
      }else{
        a.addEventListener("loadedmetadata",applyPositionAndPlay,{once:true});
        setTimeout(applyPositionAndPlay,1200);
      }

      return true;
    }catch(_){
      return false;
    }
  }

  function toggleConference(a){
    if(!a) return false;

    try{
      if(!a.paused){
        a.pause();
      }else{
        var p=a.play();
        if(p && p.catch){
          p.catch(function(){ restoreSaved(); });
        }
      }
      setTimeout(renderBar,40);
      return true;
    }catch(_){
      return restoreSaved();
    }
  }

  function toggleAudio(){
    var playing=playingAudio();

    if(!playing){
      resumeWanted=true;
      return restoreSaved();
    }

    activeAudio=playing.audio;
    activeType=playing.type;

    // ミニプレイヤーから明示的に止めた場合は自動再開しない。
    resumeWanted=false;

    if(playing.type==="music" &&
       typeof window.MEGANE_MUSIC_V7_TOGGLE_CURRENT==="function"){
      var ok=window.MEGANE_MUSIC_V7_TOGGLE_CURRENT();
      setTimeout(renderBar,40);
      return ok;
    }

    if(playing.type==="conference"){
      return toggleConference(playing.audio);
    }

    try{
      playing.audio.pause();
      setTimeout(renderBar,40);
      return true;
    }catch(_){
      return false;
    }
  }

  function bindAudio(a,type){
    if(!a || !supportedAudio(a) || a.dataset.mini144Bound==="1") return;
    type=type || audioTypeOf(a);
    a.dataset.mini144Bound="1";

    ["play","playing"].forEach(function(ev){
      a.addEventListener(ev,function(){
        activeAudio=a;
        activeType=type;
        resumeWanted=true;
        save(a,type,true);
        var bar=q(BAR_ID); if(bar && !bar.hidden) renderBar();
      });
    });

    a.addEventListener("timeupdate",function(){
      if(a.paused || a.ended) return;
      activeAudio=a;
      activeType=type;
      save(a,type,false);
    });

    ["pause","ended"].forEach(function(ev){
      a.addEventListener(ev,function(){
        if(activeAudio===a && isAudioUsable(a)){
          if(!document.hidden) resumeWanted=false;
          save(a,type,true);
        }
        var bar=q(BAR_ID); if(bar && !bar.hidden) renderBar();
      });
    });

    a.addEventListener("loadedmetadata",function(){
      // 読み込まれただけのConferenceはownerにしない。
      var bar=q(BAR_ID);
      if(bar && !bar.hidden) renderBar();
    });
  }

  function bindAudios(){
    bindAudio(musicAudio(),"music");
    bindAudio(q("confNativeAudio"),"conference");
    bindAudio(q("mangaAudio"),"conference");
  }

  function captureAudioEvent(e){
    var a=e && e.target;
    if(!supportedAudio(a)) return;

    var type=audioTypeOf(a);
    bindAudio(a,type);

    if(e.type==="play" || e.type==="playing"){
      activeAudio=a;
      activeType=type;
      save(a,type,true);
    }else if((e.type==="pause" || e.type==="ended") && activeAudio===a){
      if(!document.hidden) resumeWanted=false;
      if(isAudioUsable(a)) save(a,type,true);
    }

    var bar=q(BAR_ID);
    if(bar && !bar.hidden) renderBar();
  }

  function isRightButtonEvent(e){
    return !!(e && e.target && e.target.closest && e.target.closest("#shareCurrent"));
  }

  function fireLongPress(){
    if(!rightPressActive || longFired) return;
    longFired=true;
    suppressClickUntil=Date.now()+1200;

    // 表示だけ行う。audio.play / pause / src / loadには一切触れない。
    showBar({pulse:true});

    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(_){}
  }

  function beginRightPress(e){
    if(!isRightButtonEvent(e)) return;

    rightPressStartedAt=Date.now();
    rightPressActive=true;
    longFired=false;

    clearTimeout(pressTimer);
    pressTimer=setTimeout(fireLongPress,LONG_MS);
  }

  function finishRightPress(e){
    if(!isRightButtonEvent(e)) return;

    var held=Date.now()-rightPressStartedAt;
    clearTimeout(pressTimer);

    // iOSでは99_nav_real_fixのtouchendが短押し処理を先に走らせるため、
    // 長押し相当ならwindow capture段階で完全に遮断する。
    if(longFired || held>=LONG_MS-35){
      if(!longFired) fireLongPress();
      suppressClickUntil=Date.now()+1200;
      stopEvent(e);
    }

    rightPressActive=false;
  }

  function cancelRightPress(e){
    if(e && !isRightButtonEvent(e)) return;
    clearTimeout(pressTimer);
    rightPressActive=false;
  }

  function blockGhostActivation(e){
    if(!isRightButtonEvent(e)) return;
    if(longFired || Date.now()<suppressClickUntil){
      stopEvent(e);
    }
  }

  // 99_nav_real_fix.jsから短押しclick時に呼ばれる。
  window.MEGANE_AUDIO_CONTINUE_BUTTON=function(e){
    if(longFired || Date.now()<suppressClickUntil){
      stopEvent(e);
      return true;
    }

    stopEvent(e);
    toggleAudio();
    return true;
  };

  function stopEvent(e){
    if(!e) return;
    try{ if(e.cancelable!==false) e.preventDefault(); }catch(_){}
    try{ e.stopPropagation(); }catch(_){}
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
  }

  function boot(){
    ensureStyle();
    ensureBar();
    bindAudios();

    // 後から生成／差し替えされたConference audioも即座に共通レイヤーへ登録。
    ["play","playing","pause","ended","loadedmetadata"].forEach(function(type){
      document.addEventListener(type,captureAudioEvent,true);
    });

    window.addEventListener("pointerdown",beginRightPress,true);
    window.addEventListener("pointerup",finishRightPress,true);
    window.addEventListener("pointercancel",cancelRightPress,true);

    // iPhone Safari/PWAではtouchend経路が別に走るため両方捕捉する。
    window.addEventListener("touchstart",beginRightPress,{capture:true,passive:true});
    window.addEventListener("touchend",finishRightPress,{capture:true,passive:false});
    window.addEventListener("touchcancel",cancelRightPress,{capture:true,passive:true});

    // 長押し後に生成されるghost click / 99側の重複clickを遮断。
    window.addEventListener("click",blockGhostActivation,true);

    function tryAutoResume(){
      if(!hasGoneBackground || autoResumeBusy) return false;

      var saved=readJSON(STORE,null);
      if(!saved || saved.resumeWanted!==true) return false;

      var playing=playingAudio();
      if(playing) return true;

      autoResumeBusy=true;
      resumeWanted=true;

      var ok=false;
      try{
        ok=restoreSaved();
      }catch(_){
        ok=false;
      }

      // iOSが自動再生を拒否した場合も、▶の手動Continueはそのまま残す。
      setTimeout(function(){
        autoResumeBusy=false;
        renderBar();
      },900);

      return ok;
    }

    function saveBeforeBackground(){
      hasGoneBackground=true;

      // 外へ出る直前に「再生中だったか」を保存する。
      var playing=playingAudio();
      if(playing){
        resumeWanted=true;
        activeAudio=playing.audio;
        activeType=playing.type;
      }

      // 実際に最後に鳴っていたownerだけ保存する。
      if(activeAudio && isAudioUsable(activeAudio)){
        save(activeAudio,activeType || audioTypeOf(activeAudio),true);
      }
    }

    function resumeUI(){
      bindAudios();

      // 保存済みownerを表示するだけ。
      // 停止中のConference audioを推測採用しない。
      var saved=readJSON(STORE,null);
      if(saved){
        activeType=saved.type;
        activeAudio=null;
      }

      if(readUI().visible){
        requestAnimationFrame(function(){ restoreVisibility(); });
        setTimeout(restoreVisibility,120);
      }

      // 検索へ出る直前に再生中だった場合だけ、自動Resumeを試す。
      requestAnimationFrame(tryAutoResume);
      setTimeout(tryAutoResume,160);
      setTimeout(tryAutoResume,520);
    }

    window.addEventListener("pagehide",saveBeforeBackground);
    window.addEventListener("blur",saveBeforeBackground);
    window.addEventListener("pageshow",resumeUI);
    window.addEventListener("focus",resumeUI);

    document.addEventListener("visibilitychange",function(){
      if(document.hidden) saveBeforeBackground();
      else resumeUI();
    });

    if(window.visualViewport){
      window.visualViewport.addEventListener("resize",function(){
        var bar=q(BAR_ID);
        if(!bar || bar.hidden) return;
        restorePosition(bar);
      },{passive:true});
    }

    // アプリ再起動時も、前回表示中なら同じ位置へ戻す。
    requestAnimationFrame(restoreVisibility);
    setTimeout(restoreVisibility,180);
    setTimeout(restoreVisibility,700);

    // 後からaudioが生成される構成への限定リトライ。常時監視ではない。
    setTimeout(bindAudios,300);
    setTimeout(bindAudios,900);
    setTimeout(bindAudios,1800);
    setTimeout(bindAudios,3200);
  }

  window.MEGANE_AUDIO_LAYER_144={
    show:showBar,
    hide:hideBar,
    toggle:toggleAudio,
    current:function(){
      var found=detectAudio();
      if(!found) return readJSON(STORE,null);
      return snapshot(found.audio,found.type);
    }
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();