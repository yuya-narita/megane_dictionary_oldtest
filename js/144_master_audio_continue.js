/* 144_master_audio_continue.js
 * 全モード共通ミニプレイヤー + 右下▶ Continue
 *
 * - Music / Conference の最後の再生状態を保存
 * - 外部ページから戻って停止しても、右下▶で続きから再開
 * - 下部ナビ直上に高さ60pxのミニプレイヤーを固定
 */
(() => {
  "use strict";

  const STORE_KEY = "megane_master_audio_last_v1";
  const BAR_ID = "meganeMasterPlayer144";
  const STYLE_ID = "meganeMasterPlayer144Style";

  let currentAudio = null;
  let saveTimer = 0;
  let lastAction = 0;

  function q(id){ return document.getElementById(id); }

  function audioType(a){
    if(!a) return "";
    if(a.id === "musicAudio") return "music";
    if(a.id === "confNativeAudio" || a.id === "mangaAudio") return "conference";
    return "";
  }

  function candidateAudios(){
    return [
      q("musicAudio"),
      q("confNativeAudio"),
      q("mangaAudio")
    ].filter(Boolean);
  }

  function read(){
    try{
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      return v && v.src ? v : null;
    }catch(_){ return null; }
  }

  function write(data){
    try{ localStorage.setItem(STORE_KEY,JSON.stringify(data)); }catch(_){}
  }

  function textFromSelectors(selectors){
    for(const sel of selectors){
      const el = document.querySelector(sel);
      const t = el && String(el.textContent || "").trim();
      if(t) return t;
    }
    return "";
  }

  function metaFor(a){
    const type = audioType(a);
    let title = "";
    let subtitle = "";
    let artwork = "";

    try{
      const md = navigator.mediaSession && navigator.mediaSession.metadata;
      if(md){
        title = md.title || "";
        subtitle = md.album || md.artist || "";
        if(md.artwork && md.artwork[0]) artwork = md.artwork[0].src || "";
      }
    }catch(_){}

    if(type === "music"){
      title = title || textFromSelectors([
        ".music-v7-player-title",
        ".music-v7-now strong",
        ".music-title"
      ]);
      subtitle = subtitle || textFromSelectors([
        ".music-v7-player-sub",
        ".music-v7-now span",
        ".music-label"
      ]);
      const img = document.querySelector(".music-v7-player-jacket img,.music-v7-player-jacket");
      if(!artwork && img){
        artwork = img.currentSrc || img.src || img.style.backgroundImage.replace(/^url\([\"']?|[\"']?\)$/g,"");
      }
    }else{
      title = title || textFromSelectors([
        ".conf-title",
        ".manga-title",
        "#mangaTitle",
        ".conf-stage h2"
      ]);
      subtitle = subtitle || "Syntax Conference";
      const img = document.querySelector(".conf-stage img,.manga-reader-image,.conf-cover");
      if(!artwork && img) artwork = img.currentSrc || img.src || "";
    }

    return {
      title: title || (type === "music" ? "Music" : "Syntax Conference"),
      subtitle: subtitle || (type === "music" ? "MEGANE MUSIC" : "Conference"),
      artwork
    };
  }

  function snapshot(a){
    if(!a || !a.src) return null;
    const type = audioType(a);
    if(!type) return null;
    const meta = metaFor(a);
    return {
      type,
      src:a.currentSrc || a.src || a.getAttribute("src") || "",
      time:Number(a.currentTime || 0),
      duration:Number(a.duration || 0),
      title:meta.title,
      subtitle:meta.subtitle,
      artwork:meta.artwork,
      savedAt:Date.now()
    };
  }

  function save(a){
    const data = snapshot(a);
    if(!data) return;
    write(data);
    render();
  }

  function ensureStyle(){
    if(q(STYLE_ID)) return;
    const st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      #${BAR_ID}{
        position:fixed;
        left:max(24px,env(safe-area-inset-left));
        right:max(24px,env(safe-area-inset-right));
        bottom:calc(91px + env(safe-area-inset-bottom));
        z-index:8950;
        height:60px;
        display:grid;
        grid-template-columns:44px minmax(0,1fr) 48px;
        align-items:center;
        gap:11px;
        padding:7px 9px;
        box-sizing:border-box;
        border:1px solid rgba(255,255,255,.16);
        border-radius:20px;
        background:rgba(11,14,22,.87);
        color:#fff;
        box-shadow:0 14px 42px rgba(0,0,0,.38);
        -webkit-backdrop-filter:blur(16px);
        backdrop-filter:blur(16px);
        opacity:1;
        transform:translateY(0);
        transition:opacity .18s ease,transform .18s ease;
      }
      #${BAR_ID}[hidden]{
        display:none!important;
      }
      .mp144-art{
        width:44px;
        height:44px;
        border-radius:12px;
        overflow:hidden;
        background:rgba(255,255,255,.08);
        display:grid;
        place-items:center;
        font-size:19px;
      }
      .mp144-art img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }
      .mp144-text{
        min-width:0;
        display:grid;
        gap:3px;
      }
      .mp144-title,.mp144-sub{
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .mp144-title{
        font-size:14px;
        font-weight:900;
      }
      .mp144-sub{
        font-size:11px;
        font-weight:750;
        color:rgba(255,255,255,.58);
      }
      .mp144-toggle{
        width:44px;
        height:44px;
        display:grid;
        place-items:center;
        border:0;
        border-radius:50%;
        background:rgba(255,255,255,.10);
        color:#fff;
        font-size:20px;
        font-weight:900;
      }
      body:has(#${BAR_ID}:not([hidden])) #musicView,
      body:has(#${BAR_ID}:not([hidden])) #mangaListLayer{
        padding-bottom:78px!important;
      }
    `;
    document.head.appendChild(st);
  }

  function ensureBar(){
    let bar = q(BAR_ID);
    if(bar) return bar;
    bar = document.createElement("section");
    bar.id = BAR_ID;
    bar.hidden = true;
    bar.innerHTML = `
      <div class="mp144-art">♪</div>
      <div class="mp144-text">
        <div class="mp144-title"></div>
        <div class="mp144-sub"></div>
      </div>
      <button type="button" class="mp144-toggle" aria-label="再生">▶</button>
    `;
    document.body.appendChild(bar);

    bar.querySelector(".mp144-toggle").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    bar.querySelector(".mp144-text").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    bar.querySelector(".mp144-art").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    return bar;
  }

  function activeAudio(){
    const playing = candidateAudios().find(a => a.src && !a.paused && !a.ended);
    if(playing) return playing;

    if(currentAudio && currentAudio.src) return currentAudio;

    const saved = read();
    if(saved){
      const same = candidateAudios().find(a =>
        audioType(a) === saved.type &&
        a.src &&
        (a.currentSrc === saved.src || a.src === saved.src || a.src.includes(saved.src))
      );
      if(same) return same;
    }

    return candidateAudios().find(a => a.src) || null;
  }

  async function restoreSaved(){
    const saved = read();
    if(!saved) return false;

    let a = saved.type === "music"
      ? q("musicAudio")
      : (q("confNativeAudio") || q("mangaAudio"));

    if(!a) return false;

    try{
      const current = a.currentSrc || a.src || a.getAttribute("src") || "";
      if(!current || (current !== saved.src && !current.includes(saved.src))){
        a.pause();
        a.src = saved.src;
        a.load();
        await new Promise(resolve => {
          const done = () => {
            a.removeEventListener("loadedmetadata",done);
            resolve();
          };
          a.addEventListener("loadedmetadata",done,{once:true});
          setTimeout(done,700);
        });
      }
      if(Number.isFinite(saved.time) && saved.time > 0){
        try{ a.currentTime = Math.min(saved.time, Math.max(0,(a.duration || saved.time + 1) - .15)); }catch(_){}
      }
      currentAudio = a;
      await a.play();
      return true;
    }catch(_){
      render();
      return false;
    }
  }

  async function toggle(){
    const a = activeAudio();
    if(a && a.src){
      currentAudio = a;
      if(!a.paused && !a.ended){
        try{ a.pause(); }catch(_){}
      }else{
        try{
          await a.play();
        }catch(_){
          await restoreSaved();
        }
      }
      render();
      return;
    }
    await restoreSaved();
  }

  function render(){
    const bar = ensureBar();
    const saved = read();
    const a = activeAudio();
    const data = a && a.src ? snapshot(a) : saved;

    if(!data){
      bar.hidden = true;
      return;
    }

    bar.hidden = false;
    const art = bar.querySelector(".mp144-art");
    const title = bar.querySelector(".mp144-title");
    const sub = bar.querySelector(".mp144-sub");
    const btn = bar.querySelector(".mp144-toggle");

    title.textContent = data.title || "最後の音声";
    const time = Math.max(0,Math.floor((a && a.src ? a.currentTime : data.time) || 0));
    const mm = Math.floor(time/60);
    const ss = String(time%60).padStart(2,"0");
    sub.textContent = `${data.subtitle || ""}${time ? `｜${mm}:${ss}から` : ""}`;

    if(data.artwork){
      art.innerHTML = `<img src="${String(data.artwork).replace(/"/g,"&quot;")}" alt="">`;
    }else{
      art.textContent = data.type === "conference" ? "🎙" : "♪";
    }

    const playing = !!(a && !a.paused && !a.ended);
    btn.textContent = playing ? "Ⅱ" : "▶";
    btn.setAttribute("aria-label",playing ? "一時停止" : "続きから再生");

    const right = q("shareCurrent");
    if(right){
      right.textContent = playing ? "■" : "▶";
      right.setAttribute("aria-label",playing ? "音声を停止" : "最後の音声を続きから再生");
      right.title = right.getAttribute("aria-label");
    }
  }

  function bindAudio(a){
    if(!a || a.dataset.master144Bound) return;
    const type = audioType(a);
    if(!type) return;

    a.dataset.master144Bound = "1";

    ["play","playing"].forEach(ev => a.addEventListener(ev,() => {
      currentAudio = a;
      save(a);
      render();
    }));

    ["pause","ended","loadedmetadata","durationchange"].forEach(ev => a.addEventListener(ev,() => {
      if(a.src) save(a);
      render();
    }));

    a.addEventListener("timeupdate",() => {
      currentAudio = a;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => save(a),220);
      render();
    });
  }

  function bindAll(){
    candidateAudios().forEach(bindAudio);
  }

  function interceptRight(e){
    const btn = e.target && e.target.closest ? e.target.closest("#shareCurrent") : null;
    if(!btn) return;

    const saved = read();
    const a = activeAudio();
    if(!saved && !(a && a.src)) return;

    const now = Date.now();
    if(now - lastAction < 400) return;
    lastAction = now;

    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    toggle();
    return false;
  }

  function boot(){
    ensureStyle();
    ensureBar();
    bindAll();
    render();

    window.addEventListener("pointerup",interceptRight,true);
    window.addEventListener("click",interceptRight,true);

    window.addEventListener("pageshow",() => {
      bindAll();
      render();
    });
    document.addEventListener("visibilitychange",() => {
      if(!document.hidden){
        bindAll();
        render();
      }
    });

    const obs = new MutationObserver(() => {
      bindAll();
      render();
    });
    obs.observe(document.body,{childList:true,subtree:true});

    setInterval(() => {
      bindAll();
      render();
    },1200);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();
