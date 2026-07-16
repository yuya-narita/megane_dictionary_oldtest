/* v138: iPhone performance guard
   Old hotfixes used many permanent short setInterval rebinding loops.
   On iPhone Safari/PWA they keep running during dictionary swipes and gradually slow gestures.
   This wrapper auto-stops short maintenance intervals after a small number of runs.
*/
(function(){
  if (window.__meganeIntervalGuardV138) return;
  window.__meganeIntervalGuardV138 = true;

  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);

  window.setInterval = function(fn, delay, ...args){
    const ms = Number(delay) || 0;

    // Only guard short UI maintenance loops. Long timers keep normal behavior.
    if (ms > 0 && ms <= 1000) {
      let count = 0;
      let id = 0;
      const maxRuns = ms <= 300 ? 20 : 18;

      id = nativeSetInterval(function(){
        count++;
        try {
          if (typeof fn === "function") fn(...args);
          else (new Function(String(fn)))();
        } finally {
          if (count >= maxRuns) nativeClearInterval(id);
        }
      }, ms);

      return id;
    }

    return nativeSetInterval(fn, delay, ...args);
  };
})();

/* v64: robust resume last dictionary state */
(function () {
  const STORAGE_KEY = "meganeDictionaryResumeV64";
  let restored = false;

  function getDataSafe() {
    try {
      if (typeof data !== "undefined") return data;
    } catch (e) {}
    return null;
  }

  function getCurrentState() {
    const wordEl = document.getElementById("word");
    let word = wordEl ? wordEl.textContent.trim() : "";

    let glassId = "";
    let glassName = "";

    try {
      if (typeof currentGlass === "function") {
        const g = currentGlass();
        if (g) {
          glassId = g.id || "";
          glassName = g.name || "";
        }
      }
    } catch (e) {}

    return { word, glassId, glassName };
  }

  function saveResumeState() {
    try {
      if (typeof appMode !== "undefined" && appMode !== "dictionary") return;

      const state = getCurrentState();
      if (!state.word && !state.glassId) return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        word: state.word,
        glassId: state.glassId,
        glassName: state.glassName,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function restoreResumeState() {
    if (restored) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);
      const d = getDataSafe();
      if (!d || !Array.isArray(d.words) || !Array.isArray(d.glasses)) return;

      // Restore glassIndex / wordIndex directly if those globals exist.
      const gi = d.glasses.findIndex(g =>
        g.id === saved.glassId || g.name === saved.glassName
      );

      const wi = d.words.findIndex(w =>
        w.word === saved.word
      );

      if (gi >= 0 && typeof glassIndex !== "undefined") {
        glassIndex = gi;
      }

      if (wi >= 0 && typeof wordIndex !== "undefined") {
        wordIndex = wi;
      }

      restored = true;

      if (typeof render === "function") {
        render("flash");
      }
    } catch (e) {}
  }

  function hookRenderForResume() {
    if (typeof render !== "function" || render.__resumeHookedV64) return;

    const originalRender = render;
    window.render = function () {
      const result = originalRender.apply(this, arguments);
      saveResumeState();
      return result;
    };
    window.render.__resumeHookedV64 = true;
  }

  function bindResumeSavers() {
    // renderが呼ばれない場面でも保存する保険
    ["pointerup", "touchend", "click", "keydown"].forEach(type => {
      document.addEventListener(type, () => {
        setTimeout(saveResumeState, 80);
      }, { passive: true });
    });

    window.addEventListener("pagehide", saveResumeState);
    window.addEventListener("beforeunload", saveResumeState);
  }

  function bootResume() {
    // 初期render後に復元するため少し遅延
    setTimeout(() => {
      restoreResumeState();
      hookRenderForResume();
      bindResumeSavers();
      saveResumeState();
    }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootResume);
  } else {
    bootResume();
  }
})();



/* v19: legacy favorite IIFE removed */


/* v68 safe explore bar */
(function(){
  function m(){return typeof appMode!=="undefined"?appMode:"dictionary";}
  function rr(){if(typeof render==="function") render("flash");}
  function stop(e){if(e){e.preventDefault();e.stopImmediatePropagation();}}

  function explore(e){
    stop(e);
    const d=document.getElementById("glassDialog");
    if(m()==="dictionary" && d && d.showModal){d.showModal();return;}
    try{appMode="dictionary";rr();}catch(_){}
  }
  function fav(e){
    stop(e);
    const d=document.getElementById("favoriteDialog");
    if(!d) return;
    try{ if(typeof renderFavoriteList==="function") renderFavoriteList(); }catch(_){}
    if(d.showModal) d.showModal();
  }
  function collection(e){
    stop(e);
    const d=document.getElementById("collectionDialog");
    if(d && d.showModal) d.showModal();
  }
  function closeCollection(){
    const d=document.getElementById("collectionDialog");
    if(d && d.open) d.close();
  }
  function switchMode(mode){
    try{
      if(mode==="manga"){appMode="manga"; if(typeof mangaState!=="undefined") mangaState="list";}
      else if(mode==="cards"){appMode="cards";}
      else{appMode="dictionary";}
      closeCollection(); rr();
    }catch(_){}
  }
  async function share(e){
    stop(e);
    const url=location.href.split("#")[0];
    try{
      if(navigator.share) await navigator.share({title:"MEGANE DICTIONARY",url});
      else if(navigator.clipboard){await navigator.clipboard.writeText(url); alert("リンクをコピーしました");}
      else prompt("リンクをコピーしてください",url);
    }catch(_){}
  }
  function bind(){
    const a=document.getElementById("prevGlass");
    const b=document.getElementById("randomWord");
    const c=document.getElementById("nextGlass");
    const s=document.getElementById("shareCurrent");
    const x=document.getElementById("collectionDialogClose");
    if(a){a.onclick=explore; if(!a.dataset.v68){a.dataset.v68=1;a.addEventListener("click",explore,true);}}
    if(b){b.onclick=fav; if(!b.dataset.v68){b.dataset.v68=1;b.addEventListener("click",fav,true);}}
    if(c){c.onclick=collection; if(!c.dataset.v68){c.dataset.v68=1;c.addEventListener("click",collection,true);}}
    if(s){s.onclick=share; if(!s.dataset.v68){s.dataset.v68=1;s.addEventListener("click",share,true);}}
    if(x && !x.dataset.v68){x.dataset.v68=1;x.addEventListener("click",closeCollection);}
    document.querySelectorAll(".collection-item[data-mode]").forEach(btn=>{
      if(btn.dataset.v68) return;
      btn.dataset.v68=1;
      btn.addEventListener("click",()=>switchMode(btn.dataset.mode));
    });
  }
  function labels(){
    const map={prevGlass:"探索",randomWord:"★",nextGlass:"コレクション",shareCurrent:"シェア"};
    Object.entries(map).forEach(([id,t])=>{const el=document.getElementById(id); if(el && el.textContent!==t) el.textContent=t;});
  }
  function hook(){
    if(typeof render!=="function" || render.__v68) return;
    const old=render;
    render=function(){const r=old.apply(this,arguments); setTimeout(()=>{bind();labels();},0); return r;};
    render.__v68=true;
  }
  function boot(){bind();hook();labels();setInterval(()=>{bind();labels();},500);}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();


/* v70: safe clean bar override */
(function () {
  function mode() {
    return typeof appMode !== "undefined" ? appMode : "dictionary";
  }

  function safeRender() {
    if (typeof render === "function") render("flash");
  }

  function stop(e) {
    if (!e) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function openExplore(e) {
    stop(e);
    const dialog = document.getElementById("glassDialog");

    if (mode() === "dictionary" && dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }

    try {
      appMode = "dictionary";
      safeRender();
    } catch (err) {}
  }

  function openFavorites(e) {
    stop(e);
    const dialog = document.getElementById("favoriteDialog");
    if (!dialog) return;

    try {
      if (typeof renderFavoriteList === "function") renderFavoriteList();
    } catch (err) {}

    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  async function shareCurrent(e) {
    stop(e);
    const url = location.href.split("#")[0];

    try {
      if (navigator.share) {
        await navigator.share({
          title: "MEGANE DICTIONARY",
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("リンクをコピーしました");
      } else {
        prompt("リンクをコピーしてください", url);
      }
    } catch (err) {}
  }

  function bindV70Bar() {
    const explore = document.getElementById("prevGlass");
    const fav = document.getElementById("randomWord");
    const nextHidden = document.getElementById("nextGlass");
    const share = document.getElementById("shareCurrent");

    if (explore) {
      explore.onclick = openExplore;
      if (!explore.dataset.v70) {
        explore.dataset.v70 = "1";
        explore.addEventListener("click", openExplore, true);
      }
    }

    if (fav) {
      fav.onclick = openFavorites;
      if (!fav.dataset.v70) {
        fav.dataset.v70 = "1";
        fav.addEventListener("click", openFavorites, true);
      }
    }

    // Keep old nextGlass harmless if any code calls it.
    if (nextHidden) {
      nextHidden.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
    }

    if (share) {
      share.onclick = shareCurrent;
      if (!share.dataset.v70) {
        share.dataset.v70 = "1";
        share.addEventListener("click", shareCurrent, true);
      }
    }
  }

  function forceLabels() {
    const labels = {
      prevGlass: "探索",
      randomWord: "★",
      shareCurrent: "シェア"
    };

    Object.entries(labels).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== text) el.textContent = text;
    });
  }

  function hookRender() {
    if (typeof render !== "function" || render.__v70Hooked) return;

    const original = render;
    render = function () {
      const result = original.apply(this, arguments);
      setTimeout(() => {
        bindV70Bar();
        forceLabels();
      }, 0);
      return result;
    };

    render.__v70Hooked = true;
  }

  function boot() {
    bindV70Bar();
    hookRender();
    forceLabels();

    // Light safety label refresh. Does not mutate structure.
    setInterval(() => {
      bindV70Bar();
      forceLabels();
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* v71: fix randomWord hijack */

(function(){

  function disableOriginalRandomWord(){
    const btn = document.getElementById("randomWord");
    if(!btn) return;

    btn.onclick = null;

    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);

    clone.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopImmediatePropagation();

      const dialog = document.getElementById("favoriteDialog");
      if(!dialog) return;

      if(typeof renderFavoriteList === "function"){
        renderFavoriteList();
      }

      if(dialog.showModal){
        dialog.showModal();
      }
    });

  }

  function fix(){
    disableOriginalRandomWord();

    const map = {
      prevGlass: "探索",
      randomWord: "★",
      shareCurrent: "シェア"
    };

    Object.entries(map).forEach(([id, text])=>{
      const el = document.getElementById(id);
      if(el) el.textContent = text;
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", fix);
  } else {
    fix();
  }

  if(typeof render === "function"){
    const original = render;
    window.render = function(){
      const r = original.apply(this, arguments);
      setTimeout(fix, 0);
      return r;
    }
  }

})();

/* v72: explore overlay (no mode change) */
(function(){

  function overrideExplore(){
    const btn = document.getElementById("prevGlass");
    if(!btn) return;

    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);

    clone.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopImmediatePropagation();

      const dialog = document.getElementById("glassDialog");
      if(dialog && dialog.showModal){
        dialog.showModal();
      }
    });
  }

  function apply(){
    overrideExplore();

    const map = {
      prevGlass: "探索",
      randomWord: "★",
      shareCurrent: "シェア"
    };

    Object.entries(map).forEach(([id, text])=>{
      const el = document.getElementById(id);
      if(el) el.textContent = text;
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  if(typeof render === "function"){
    const original = render;
    window.render = function(){
      const r = original.apply(this, arguments);
      setTimeout(apply, 0);
      return r;
    }
  }

})();


/* v19: legacy favorite IIFE removed */




/* v19: legacy favorite IIFE removed */




/* v19: legacy favorite IIFE removed */




/* v19: legacy favorite IIFE removed */



/* v19: legacy favorite IIFE removed */



/* v82: right swipe share fix */
(function () {
  const FAV_KEY = "meganeFavoritesV65";

  const load = () => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch(e) { return []; }
  };
  const save = (list) => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch(e) {}
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));

  function jump(item) {
    try {
      appMode = "dictionary";
      if (typeof data !== "undefined") {
        const wi = data.words.findIndex(w => w.word === item.word);
        const gi = data.glasses.findIndex(g => g.id === item.glassId || g.name === item.glassName);
        if (wi >= 0 && typeof wordIndex !== "undefined") wordIndex = wi;
        if (gi >= 0 && typeof glassIndex !== "undefined") glassIndex = gi;
      }
      if (typeof render === "function") render("flash");
    } catch(e) {}
    const dialog = document.getElementById("favoriteDialog");
    if (dialog && dialog.open) dialog.close();
  }

  function remove(item) {
    save(load().filter(f => f.key !== item.key));
    try { if (typeof updateFavoriteToggle === "function") updateFavoriteToggle(); } catch(e) {}
  }

  async function share(item) {
    const text = `${item.title || ""}｜${item.meta || ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MEGANE DICTIONARY", text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("コピーしました");
      } else {
        prompt("コピーしてください", text);
      }
    } catch(e) {}
  }

  function bindSwipe(el, item) {
    if (!el || !item || el.dataset.v82Bound) return;
    el.dataset.v82Bound = "1";

    let sx = 0, sy = 0, dx = 0;
    let dragging = false, moved = false, pid = null;
    let lp = null, opened = false, sharing = false;

    const threshold = () => window.innerWidth * 0.5;

    function clearLP() {
      clearTimeout(lp);
      lp = null;
      el.classList.remove("longpress-ready", "longpress-charging");
    }

    function start(x, y, pointerId) {
      if (sharing) return;
      sx = x; sy = y; dx = 0;
      dragging = true; moved = false; opened = false; pid = pointerId ?? null;

      el.classList.remove("share-resetting", "swiping-left", "swiping-right", "longpress-ready", "longpress-charging");
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "translate3d(0,0,0)";

      clearLP();
      el.classList.add("longpress-charging");

      lp = setTimeout(() => {
        if (dragging && !moved) {
          opened = true;
          if (navigator.vibrate) navigator.vibrate(18);
          el.classList.remove("longpress-charging");
          el.classList.add("longpress-ready");
          setTimeout(() => jump(item), 90);
        }
      }, 620);
    }

    function move(x, y, e) {
      if (!dragging || opened || sharing) return;

      const ndx = x - sx;
      const dy = y - sy;

      if (!moved) {
        if (Math.abs(dy) > 8) clearLP();
        if (Math.abs(ndx) < 12) return;
        if (Math.abs(dy) > Math.abs(ndx) * 1.15) return;

        moved = true;
        clearLP();
      }

      dx = ndx;
      if (e && e.cancelable) e.preventDefault();

      el.style.transition = "none";
      el.style.transform = `translate3d(${dx}px,0,0)`;
      el.classList.toggle("swiping-left", dx < 0);
      el.classList.toggle("swiping-right", dx > 0);
    }

    function reset() {
      el.classList.remove("swiping-left", "swiping-right", "longpress-ready", "longpress-charging");
      el.style.transition = "transform .36s cubic-bezier(.2,1.55,.5,1)";
      el.style.transform = "translate3d(0,0,0)";
    }

    function end(e) {
      if (!dragging) return;
      dragging = false;
      clearLP();
      el.classList.remove("swiping-left", "swiping-right");

      if (opened || !moved || Math.abs(dx) < 10) {
        reset();
        dx = 0; pid = null;
        return;
      }

      if (dx < -threshold()) {
        el.style.transition = "transform .22s ease, opacity .22s ease";
        el.style.transform = "translate3d(-110%,0,0)";
        el.style.opacity = "0";
        setTimeout(() => {
          remove(item);
          window.renderDictFavoriteListLegacyV75 && window.renderDictFavoriteListLegacyV75();
        }, 220);
      } else if (dx > threshold()) {
        // v82: 先にカードを戻してから共有を開く。PWA/iOSでの挙動崩れを防ぐ。
        sharing = true;
        el.classList.add("share-resetting");
        el.classList.remove("swiping-right", "swiping-left", "longpress-ready", "longpress-charging");
        el.style.transform = "translate3d(0,0,0)";

        setTimeout(() => {
          sharing = false;
          el.classList.remove("share-resetting");
          share(item);
        }, 180);
      } else {
        reset();
      }

      dx = 0; pid = null;
    }

    el.addEventListener("pointerdown", e => {
      pid = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch(_) {}
      start(e.clientX, e.clientY, e.pointerId);
    });

    el.addEventListener("pointermove", e => {
      if (pid !== null && e.pointerId !== pid) return;
      move(e.clientX, e.clientY, e);
    });

    el.addEventListener("pointerup", e => {
      if (pid !== null && e.pointerId !== pid) return;
      try { el.releasePointerCapture(e.pointerId); } catch(_) {}
      end(e);
    });

    el.addEventListener("pointercancel", e => {
      clearLP();
      try { el.releasePointerCapture(e.pointerId); } catch(_) {}
      reset();
      dragging = false; pid = null; dx = 0;
    });
  }

  window.renderDictFavoriteList = function () {
    const listEl = document.getElementById("favoriteList");
    if (!listEl) return;

    const list = load().filter(f => f.type === "dict");

    if (!list.length) {
      listEl.innerHTML = `<div class="favorite-empty">まだお気に入りはありません</div>`;
      return;
    }

    listEl.innerHTML = list.map(item => `
      <div class="favorite-item" role="button" tabindex="0" data-key="${esc(item.key)}">
        <span class="favorite-item-title">${esc(item.title || "Untitled")}</span>
        <span class="favorite-item-meta">辞書｜${esc(item.meta || "")}</span>
      </div>
    `).join("");

    listEl.querySelectorAll(".favorite-item").forEach(el => {
      const item = list.find(f => f.key === el.dataset.key);
      bindSwipe(el, item);
    });
  };

  function bindOpen() {
    const favBar = document.getElementById("randomWord");
    const dialog = document.getElementById("favoriteDialog");
    if (!favBar || favBar.dataset.v82OpenBound) return;
    favBar.dataset.v82OpenBound = "1";

    favBar.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.renderDictFavoriteListLegacyV75 && window.renderDictFavoriteListLegacyV75();
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    }, true);
  }

  function boot() {
    bindOpen();
    window.renderDictFavoriteListLegacyV75 && window.renderDictFavoriteListLegacyV75();
    setInterval(bindOpen, 600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();



/* v19: legacy favorite IIFE removed */


/* v84: apply glass theme */
(function(){
  function applyGlassTheme(){
    try{
      if(typeof currentGlass !== "function") return;
      const g = currentGlass();
      if(!g) return;

      const id = g.id || "default";
      document.body.dataset.glass = id;
    }catch(e){}
  }

  function hookRenderV84(){
    if(typeof render !== "function" || render.__v84Hooked) return;

    const original = render;
    render = function(){
      const res = original.apply(this, arguments);
      setTimeout(applyGlassTheme,0);
      return res;
    };
    render.__v84Hooked = true;
  }

  function bootV84(){
    hookRenderV84();
    setInterval(applyGlassTheme, 500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bootV84);
  }else{
    bootV84();
  }
})();


/* v85: robust glass theme mapping */
(function(){
  function normalizeGlassTheme(g){
    if(!g) return "default";

    const raw = [
      g.id || "",
      g.name || "",
      g.label || "",
      g.title || ""
    ].join(" ").toLowerCase();

    const jp = [
      g.id || "",
      g.name || "",
      g.label || "",
      g.title || ""
    ].join(" ");

    if(raw.includes("hack") || jp.includes("ハッカー") || jp.includes("ニクス") || jp.includes("NIX") || jp.includes("NXS")) return "hacker";
    if(raw.includes("gag") || raw.includes("funny") || jp.includes("ギャグ") || jp.includes("ズレア")) return "gag";
    if(raw.includes("math") || raw.includes("logic") || jp.includes("数学") || jp.includes("論理") || jp.includes("ゼリス")) return "math";
    if(raw.includes("happy") || jp.includes("ハッピー") || jp.includes("クエリナ")) return "happy";

    return "default";
  }

  function applyGlassThemeV85(){
    try{
      if(typeof currentGlass !== "function") {
        document.body.dataset.glassTheme = "default";
        return;
      }

      const g = currentGlass();
      const theme = normalizeGlassTheme(g);
      document.body.dataset.glassTheme = theme;
      document.body.dataset.glass = g && g.id ? g.id : "default";
    }catch(e){
      document.body.dataset.glassTheme = "default";
    }
  }

  function hookRenderV85(){
    if(typeof render !== "function" || render.__v85Hooked) return;

    const original = render;
    render = function(){
      const res = original.apply(this, arguments);
      setTimeout(applyGlassThemeV85, 0);
      return res;
    };

    render.__v85Hooked = true;
  }

  function bootV85(){
    hookRenderV85();
    applyGlassThemeV85();
    setInterval(applyGlassThemeV85, 400);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bootV85);
  }else{
    bootV85();
  }
})();

/* v86 draw logic removed in v87 */




/* v92: hard daily card lock */
(function () {
  const KEY = "meganeCardDailyV92";
  let sx = 0;
  let sy = 0;
  let horizontal = false;

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (s.date !== todayKey()) {
        const fresh = { date: todayKey(), drawn: false, index: null };
        localStorage.setItem(KEY, JSON.stringify(fresh));
        return fresh;
      }
      return s;
    } catch (e) {
      return { date: todayKey(), drawn: false, index: null };
    }
  }

  function saveState(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e) {}
  }

  function isCardMode() {
    return typeof appMode !== "undefined" && appMode === "cards";
  }

  function currentIndex() {
    try {
      if (typeof cardIndex !== "undefined") return cardIndex;
    } catch(e) {}
    return 0;
  }

  function setIndex(idx) {
    try {
      if (typeof cardIndex !== "undefined" && typeof idx === "number") {
        cardIndex = idx;
      }
    } catch(e) {}
  }

  function renderSafe(anim = "flash") {
    if (typeof render === "function") render(anim);
  }

  function flipPop() {
    try {
      if (typeof els !== "undefined" && els.flipCard) {
        els.flipCard.classList.remove("flip-pop");
        void els.flipCard.offsetWidth;
        els.flipCard.classList.add("flip-pop");
      }
    } catch(e) {}
  }

  function getSurface() {
    return document.querySelector(".card img") ||
           document.querySelector(".card-face") ||
           document.querySelector(".card-inner") ||
           document.querySelector(".card");
  }

  function pageTurn(direction) {
    const surface = getSurface();
    if (!surface) return;
    const cls = direction === "left" ? "card-page-turn-left" : "card-page-turn-right";
    surface.classList.remove("card-page-turn-left", "card-page-turn-right");
    void surface.offsetWidth;
    surface.classList.add(cls);
    setTimeout(() => surface.classList.remove(cls), 380);
  }

  function getHint() {
    return document.getElementById("cardTutorialHint");
  }

  function showHint(text, mode) {
    const el = getHint();
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    el.classList.add("show");
    el.classList.toggle("card-waiting", mode === "waiting");
    el.classList.toggle("card-back-message", mode === "back");
  }

  function hideHint() {
    const el = getHint();
    if (!el) return;
    el.classList.remove("show", "card-waiting", "card-back-message");
    setTimeout(() => {
      if (!el.classList.contains("show")) el.hidden = true;
    }, 360);
  }

  function updateHint() {
    if (!isCardMode()) {
      hideHint();
      return;
    }

    const s = loadState();

    if (!s.drawn) {
      showHint("めくってみて", "waiting");
      return;
    }

    // 観覧の邪魔にならないよう、裏面の時だけ「またあした」
    try {
      if (typeof cardFlipped !== "undefined" && cardFlipped) {
        showHint("またあした", "back");
      } else {
        hideHint();
      }
    } catch(e) {
      showHint("またあした", "back");
    }
  }

  function lockToToday() {
    if (!isCardMode()) return;
    const s = loadState();
    if (s.drawn && typeof s.index === "number") {
      setIndex(s.index);
    }
  }

  function markDrawnIfNeeded() {
    const s = loadState();
    if (s.drawn) {
      lockToToday();
      return false;
    }

    const idx = currentIndex();
    const next = { date: todayKey(), drawn: true, index: idx };
    saveState(next);
    return true;
  }

  // 既存関数をカードモードだけ上書きする
  function overrideCardFunctions() {
    if (typeof moveCard === "function" && !moveCard.__v92) {
      const originalMoveCard = moveCard;
      moveCard = function(step) {
        if (!isCardMode()) return originalMoveCard(step);

        const s = loadState();

        if (s.drawn) {
          setIndex(s.index);
          try { cardFlipped = true; } catch(e) {}
          renderSafe("flash");
          updateHint();
          return;
        }

        // 引く前だけ上下シャッフル許可
        originalMoveCard(step);
        setTimeout(updateHint, 260);
      };
      moveCard.__v92 = true;
    }

    if (typeof flipCurrentCard === "function" && !flipCurrentCard.__v92) {
      const originalFlip = flipCurrentCard;
      flipCurrentCard = function() {
        if (!isCardMode()) return originalFlip();

        const s = loadState();

        if (s.drawn && typeof s.index === "number") {
          setIndex(s.index);
        }

        // 既存の表裏めくりを使う
        originalFlip();

        // 初めて表にした時点で今日の1枚として固定
        const justMarked = markDrawnIfNeeded();

        if (justMarked) {
          // 初回確定時は現在のカードを保持
          setTimeout(() => {
            lockToToday();
            updateHint();
          }, 0);
        } else {
          setTimeout(() => {
            lockToToday();
            updateHint();
          }, 0);
        }
      };
      flipCurrentCard.__v92 = true;
    }

    if (typeof randomWord === "function" && !randomWord.__v92) {
      const originalRandom = randomWord;
      randomWord = function() {
        if (!isCardMode()) return originalRandom();

        const s = loadState();
        if (s.drawn) {
          setIndex(s.index);
          renderSafe("flash");
          updateHint();
          return;
        }

        originalRandom();
        updateHint();
      };
      randomWord.__v92 = true;
    }
  }

  function bindGestureForPageTurn() {
    document.addEventListener("touchstart", e => {
      if (!isCardMode()) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      horizontal = false;
    }, { passive: true });

    document.addEventListener("touchmove", e => {
      if (!isCardMode()) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        horizontal = true;
      }
    }, { passive: true });

    document.addEventListener("touchend", e => {
      if (!isCardMode() || !horizontal) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        pageTurn(dx < 0 ? "left" : "right");
        setTimeout(updateHint, 120);
      }
      horizontal = false;
    }, { passive: true });
  }

  function hookRender() {
    if (typeof render !== "function" || render.__v92Hooked) return;
    const originalRender = render;
    render = function() {
      lockToToday();
      const res = originalRender.apply(this, arguments);
      setTimeout(() => {
        lockToToday();
        updateHint();
      }, 0);
      return res;
    };
    render.__v92Hooked = true;
  }

  function boot() {
    overrideCardFunctions();
    bindGestureForPageTurn();
    hookRender();
    setTimeout(() => {
      lockToToday();
      updateHint();
    }, 250);
    setInterval(() => {
      overrideCardFunctions();
      lockToToday();
      updateHint();
    }, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* v98 binder logic */
(function(){
 const KEY="binderV98";

 function load(){
  try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return []}
 }
 function save(arr){
  localStorage.setItem(KEY,JSON.stringify(arr))
 }

 function addCard(idx){
  const arr=load();
  if(!arr.includes(idx)){
    arr.push(idx);
    save(arr);
  }
 }

 // hook daily card save
 if(typeof flipCurrentCard==="function" && !flipCurrentCard.__binder){
  const orig=flipCurrentCard;
  flipCurrentCard=function(){
    orig();
    try{
      if(typeof wordIndex!=="undefined"){
        addCard(wordIndex);
      }
    }catch(e){}
  }
  flipCurrentCard.__binder=true;
 }

 function renderBinder(){
  const grid=document.getElementById("binderGrid");
  if(!grid)return;
  const owned=load();
  let html="";
  const total=60; // 仮
  for(let i=0;i<total;i++){
    const has=owned.includes(i);
    html+=`
    <div class="binder-item ${has?"":"binder-locked"}">
      ${has?("No."+String(i+1).padStart(3,"0")):"???"}
    </div>`;
  }
  grid.innerHTML=html;
 }

 function bind(){
  const btn=document.getElementById("openBinderBtn");
  const modal=document.getElementById("binderModal");
  if(!btn||btn.dataset.v98)return;
  btn.dataset.v98=1;

  btn.onclick=()=>{
    modal.style.display="block";
    renderBinder();
  }

  modal.onclick=()=>{
    modal.style.display="none";
  }
 }

 function boot(){
  bind();
  setInterval(bind,500);
 }

 if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",boot);
 }else{boot()}
})();

/* v99 binder fill animation logic */
(function(){
 const KEY="binderV98";

 function load(){
  try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return []}
 }

 function animateFill(idx){
  setTimeout(()=>{
    const el=document.querySelector(`.binder-item[data-idx="${idx}"]`);
    if(el){
      el.classList.add("filled");
    }
  },50);
 }

 function renderBinderAnim(){
  const grid=document.getElementById("binderGrid");
  if(!grid)return;
  const owned=load();
  let html="";
  const total=60;
  for(let i=0;i<total;i++){
    const has=owned.includes(i);
    html+=`
    <div class="binder-item ${has?"":"binder-locked"}" data-idx="${i}">
      ${has?("No."+String(i+1).padStart(3,"0")):"???"}
    </div>`;
  }
  grid.innerHTML=html;

  // animate newly filled
  owned.forEach(i=>animateFill(i));
 }

 // override renderBinder
 window.renderBinder=renderBinderAnim;
})();

/* v100 binder mini card + new badge */
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function save(key, val){
    try{localStorage.setItem(key, JSON.stringify(val));}catch(e){}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }
  function getTitle(i){
    try{
      if(typeof data !== "undefined" && data.words && data.words[i]){
        return data.words[i].word || data.words[i].title || ("CARD " + (i+1));
      }
    }catch(e){}
    return "CARD " + (i+1);
  }

  // 既存addCardを補強：新規取得だけNEW記録
  window.addBinderCardV100 = function(idx){
    const owned = load(BINDER_KEY, []);
    const newOnes = load(NEW_KEY, []);
    if(!owned.includes(idx)){
      owned.push(idx);
      save(BINDER_KEY, owned);
      if(!newOnes.includes(idx)){
        newOnes.push(idx);
        save(NEW_KEY, newOnes);
      }
    }
  };

  // flip時の既存binder追加より後に効くよう保険を追加
  if(typeof flipCurrentCard === "function" && !flipCurrentCard.__v100Binder){
    const orig = flipCurrentCard;
    flipCurrentCard = function(){
      const before = (()=>{try{return typeof wordIndex !== "undefined" ? wordIndex : null}catch(e){return null}})();
      orig.apply(this, arguments);
      setTimeout(()=>{
        try{
          const idx = typeof wordIndex !== "undefined" ? wordIndex : before;
          if(typeof idx === "number") window.addBinderCardV100(idx);
        }catch(e){}
      }, 80);
    };
    flipCurrentCard.__v100Binder = true;
  }

  window.renderBinder = function renderBinderV100(){
    const grid = document.getElementById("binderGrid");
    if(!grid) return;

    const owned = load(BINDER_KEY, []);
    const newOnes = load(NEW_KEY, []);
    const total = 60;

    let html = "";
    for(let i=0;i<total;i++){
      const has = owned.includes(i);
      const isNew = newOnes.includes(i);
      const no = String(i+1).padStart(3,"0");
      const title = getTitle(i);

      if(has){
        html += `
          <div class="binder-item ${isNew ? "new-fill" : ""}" data-idx="${i}">
            <span class="binder-mini-no">No.${no}</span>
            ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
            <div class="binder-mini-card">
              <span class="binder-mini-title">${esc(title)}</span>
            </div>
          </div>`;
      }else{
        html += `
          <div class="binder-item binder-locked" data-idx="${i}">
            <span class="binder-mini-no">No.${no}</span>
            <span>???</span>
          </div>`;
      }
    }

    grid.innerHTML = html;

    // NEWは一度見たら消す。ただしアニメが見えるよう少し遅らせる。
    if(newOnes.length){
      setTimeout(()=>save(NEW_KEY, []), 1200);
    }
  };

  function bindBinderOpenV100(){
    const btn = document.getElementById("openBinderBtn");
    const modal = document.getElementById("binderModal");
    if(!btn || !modal || btn.dataset.v100) return;
    btn.dataset.v100 = "1";

    btn.onclick = () => {
      modal.style.display = "block";
      window.renderBinder();
    };

    modal.onclick = (e) => {
      if(e.target === modal) modal.style.display = "none";
    };
  }

  function boot(){
    bindBinderOpenV100();
    setInterval(bindBinderOpenV100, 600);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* v101: binder close + safer card display */
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function save(key, val){
    try{localStorage.setItem(key, JSON.stringify(val));}catch(e){}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCardData(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]){
        return cards[i];
      }
    }catch(e){}
    try{
      if(typeof data !== "undefined" && Array.isArray(data.words) && data.words[i]){
        return data.words[i];
      }
    }catch(e){}
    return null;
  }

  function getCardTitle(i){
    const c = getCardData(i);
    if(!c) return "CARD " + String(i+1).padStart(3,"0");
    return c.title || c.word || c.name || c.label || ("CARD " + String(i+1).padStart(3,"0"));
  }

  function getTotal(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return Math.max(cards.length, 1);
    }catch(e){}
    try{
      if(typeof data !== "undefined" && Array.isArray(data.words)) return Math.max(data.words.length, 1);
    }catch(e){}
    return 60;
  }

  // 今日カードや既存処理がbinderV98に入れているindexをそのまま使う
  window.renderBinder = function renderBinderV101(){
    const grid = document.getElementById("binderGrid");
    if(!grid) return;

    const owned = load(BINDER_KEY, []);
    const newOnes = load(NEW_KEY, []);
    const total = Math.max(getTotal(), 60);

    let html = "";

    for(let i=0;i<total;i++){
      const has = owned.includes(i);
      const isNew = newOnes.includes(i);
      const no = String(i+1).padStart(3,"0");
      const title = getCardTitle(i);

      if(has){
        html += `
          <div class="binder-item ${isNew ? "new-fill" : ""}" data-idx="${i}">
            <span class="binder-mini-no">No.${no}</span>
            ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
            <div class="binder-mini-card">
              <span class="binder-mini-title">${esc(title)}</span>
            </div>
          </div>`;
      }else{
        html += `
          <div class="binder-item binder-locked" data-idx="${i}">
            <span class="binder-mini-no">No.${no}</span>
            <span>???</span>
          </div>`;
      }
    }

    grid.innerHTML = html;

    if(newOnes.length){
      setTimeout(()=>save(NEW_KEY, []), 1400);
    }
  };

  function openBinder(){
    const modal = document.getElementById("binderModal");
    if(!modal) return;
    modal.style.display = "block";
    window.renderBinder();
  }

  function closeBinder(){
    const modal = document.getElementById("binderModal");
    if(!modal) return;
    modal.style.display = "none";
  }

  function bindBinderV101(){
    const btn = document.getElementById("openBinderBtn");
    const modal = document.getElementById("binderModal");
    const close = document.getElementById("binderCloseBtn");

    if(btn && !btn.dataset.v101){
      btn.dataset.v101 = "1";
      btn.onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        openBinder();
      };
    }

    if(close && !close.dataset.v101){
      close.dataset.v101 = "1";
      close.onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        closeBinder();
      };
    }

    if(modal && !modal.dataset.v101){
      modal.dataset.v101 = "1";
      modal.addEventListener("click", (e)=>{
        // 背景タップだけ閉じる。中身タップでは閉じない。
        if(e.target === modal) closeBinder();
      });
    }

    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape") closeBinder();
    }, { once: false });
  }

  function boot(){
    bindBinderV101();
    setInterval(bindBinderV101, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* v102: binder uses card data only */
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function save(key,val){
    try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCardArray(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards.length) return cards;
    }catch(e){}
    return [];
  }

  function getCard(i){
    const arr=getCardArray();
    return arr[i] || null;
  }

  function getCardTitle(i){
    const c=getCard(i);
    if(!c) return "CARD " + String(i+1).padStart(3,"0");
    return c.title || c.name || c.label || c.id || ("CARD " + String(i+1).padStart(3,"0"));
  }

  function getCardImage(i){
    const c=getCard(i);
    if(!c) return "";
    return c.image || c.img || c.src || c.url || c.front || c.frontImage || c.cardImage || "";
  }

  function getTotal(){
    const arr=getCardArray();
    return Math.max(arr.length || 0, 60);
  }

  function renderOwnedCard(i, isNew){
    const no=String(i+1).padStart(3,"0");
    const title=getCardTitle(i);
    const img=getCardImage(i);

    return `
      <div class="binder-item ${isNew ? "new-fill" : ""}" data-idx="${i}">
        <span class="binder-mini-no">No.${no}</span>
        ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
        <div class="binder-mini-card">
          ${img ? `<img src="${esc(img)}" alt="${esc(title)}">` : `<span class="binder-mini-title fallback">${esc(title)}</span>`}
        </div>
      </div>`;
  }

  function renderLocked(i){
    const no=String(i+1).padStart(3,"0");
    return `
      <div class="binder-item binder-locked" data-idx="${i}">
        <span class="binder-mini-no">No.${no}</span>
        <span>???</span>
      </div>`;
  }

  window.renderBinder = function renderBinderV102(){
    const grid=document.getElementById("binderGrid");
    if(!grid) return;

    const owned=load(BINDER_KEY, []);
    const newOnes=load(NEW_KEY, []);
    const total=getTotal();

    let html="";
    for(let i=0;i<total;i++){
      const has=owned.includes(i);
      const isNew=newOnes.includes(i);

      html += has ? renderOwnedCard(i,isNew) : renderLocked(i);
    }

    grid.innerHTML=html;

    if(newOnes.length){
      setTimeout(()=>save(NEW_KEY, []), 1400);
    }
  };

  function bindBinderOpenV102(){
    const btn=document.getElementById("openBinderBtn");
    const modal=document.getElementById("binderModal");
    const close=document.getElementById("binderCloseBtn");

    if(btn && !btn.dataset.v102){
      btn.dataset.v102="1";
      btn.onclick=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        modal.style.display="block";
        window.renderBinder();
      };
    }

    if(close && !close.dataset.v102){
      close.dataset.v102="1";
      close.onclick=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        modal.style.display="none";
      };
    }
  }

  function boot(){
    bindBinderOpenV102();
    setInterval(bindBinderOpenV102,700);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();


/* v103: binder visible fallback + card-mode-only button */
(function(){
  const BINDER_KEY = "binderV98";
  const NEW_KEY = "binderNewV100";

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }
  function save(key,val){
    try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}
  }
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getMode(){
    try{
      if(typeof appMode !== "undefined") return appMode;
    }catch(e){}
    return "";
  }

  function updateBinderButtonVisibility(){
    const btn=document.getElementById("openBinderBtn");
    if(!btn) return;
    const isCards = getMode() === "cards";
    btn.style.display = isCards ? "block" : "none";
  }

  function getCardTitle(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]){
        const c=cards[i];
        return c.title || c.name || c.label || c.id || ("CARD " + String(i+1).padStart(3,"0"));
      }
    }catch(e){}
    return "CARD " + String(i+1).padStart(3,"0");
  }

  function getCardImageFromKnownData(i){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[i]){
        const c=cards[i];
        return c.image || c.img || c.src || c.url || c.front || c.frontImage || c.cardImage || "";
      }
    }catch(e){}
    return "";
  }

  function getCurrentCardImageFromDOM(){
    const img =
      document.querySelector(".card img") ||
      document.querySelector(".flip-card img") ||
      document.querySelector(".card-face img") ||
      document.querySelector(".card-inner img");

    return img ? (img.getAttribute("src") || img.src || "") : "";
  }

  function getTotal(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards.length) return Math.max(cards.length,60);
    }catch(e){}
    return 60;
  }

  function renderOwnedCard(i,isNew){
    const no=String(i+1).padStart(3,"0");
    const title=getCardTitle(i);
    let img=getCardImageFromKnownData(i);

    // 画像がcards配列に無い場合でも、現在表示中カードならDOMから拾う
    try{
      if(!img && typeof cardIndex !== "undefined" && cardIndex === i){
        img = getCurrentCardImageFromDOM();
      }
    }catch(e){}

    const cardBody = img
      ? `<div class="binder-mini-card"><img src="${esc(img)}" alt="${esc(title)}"></div>`
      : `<div class="binder-mini-card placeholder-card"><span class="binder-placeholder-title">${esc(title)}</span></div>`;

    return `
      <div class="binder-item ${isNew ? "new-fill" : ""}" data-idx="${i}">
        <span class="binder-mini-no">No.${no}</span>
        ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
        ${cardBody}
      </div>`;
  }

  function renderLocked(i){
    const no=String(i+1).padStart(3,"0");
    return `
      <div class="binder-item binder-locked" data-idx="${i}">
        <span class="binder-mini-no">No.${no}</span>
        <span>???</span>
      </div>`;
  }

  window.renderBinder = function renderBinderV103(){
    const grid=document.getElementById("binderGrid");
    if(!grid) return;

    const owned=load(BINDER_KEY, []);
    const newOnes=load(NEW_KEY, []);
    const total=getTotal();

    let html="";
    for(let i=0;i<total;i++){
      const has=owned.includes(i);
      html += has ? renderOwnedCard(i,newOnes.includes(i)) : renderLocked(i);
    }

    grid.innerHTML=html;

    if(newOnes.length){
      setTimeout(()=>save(NEW_KEY, []), 1400);
    }
  };

  function bindBinderV103(){
    const btn=document.getElementById("openBinderBtn");
    const modal=document.getElementById("binderModal");
    const close=document.getElementById("binderCloseBtn");

    if(btn && !btn.dataset.v103){
      btn.dataset.v103="1";
      btn.onclick=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(!modal) return;
        modal.style.display="block";
        window.renderBinder();
      };
    }

    if(close && !close.dataset.v103){
      close.dataset.v103="1";
      close.onclick=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(modal) modal.style.display="none";
      };
    }

    if(modal && !modal.dataset.v103){
      modal.dataset.v103="1";
      modal.addEventListener("click",(e)=>{
        if(e.target===modal) modal.style.display="none";
      });
    }
  }

  function hookRenderV103(){
    if(typeof render !== "function" || render.__v103Hooked) return;
    const orig=render;
    render=function(){
      const r=orig.apply(this,arguments);
      setTimeout(updateBinderButtonVisibility,0);
      return r;
    };
    render.__v103Hooked=true;
  }

  function boot(){
    bindBinderV103();
    hookRenderV103();
    updateBinderButtonVisibility();
    setInterval(()=>{
      bindBinderV103();
      updateBinderButtonVisibility();
    },700);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();


/* v104: binder card-only storage + tap to open */
(function(){
  const BINDER_KEY = "binderCardsV104";
  const NEW_KEY = "binderCardsNewV104";
  const DAILY_KEYS = [
    "meganeCardDailyV92",
    "meganeCardDailyV91",
    "meganeCardDailyV90",
    "meganeCardDailyV89"
  ];

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }

  function save(key,val){
    try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCards(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    return [];
  }

  function validCardIndex(idx){
    const arr = getCards();
    return typeof idx === "number" && idx >= 0 && idx < arr.length;
  }

  function getCard(idx){
    const arr = getCards();
    return validCardIndex(idx) ? arr[idx] : null;
  }

  function getCardTitle(idx){
    const c = getCard(idx);
    if(!c) return "CARD " + String(idx+1).padStart(3,"0");
    return c.title || c.name || c.label || c.id || ("CARD " + String(idx+1).padStart(3,"0"));
  }

  function getCardImage(idx){
    const c = getCard(idx);
    if(!c) return "";
    return c.image || c.img || c.src || c.url || c.front || c.frontImage || c.cardImage || "";
  }

  function romanToNumber(s){
    const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
    let total = 0, prev = 0;
    String(s || "").toUpperCase().split("").reverse().forEach(ch=>{
      const val = map[ch] || 0;
      if(val < prev) total -= val;
      else { total += val; prev = val; }
    });
    return total || null;
  }

  function getFixedSlotNumber(idx){
    const c = getCard(idx);
    if(!c) return idx + 1;

    // 明示番号が後から追加されたら最優先
    const explicit = c.slot || c.slotNo || c.no || c.number || c.cardNo || c.collectionNo || c.binderNo;
    if(explicit){
      const n = Number(String(explicit).replace(/[^0-9]/g, ""));
      if(n > 0) return n;
    }

    // 現在の5枚はカード画像内のローマ数字に合わせて固定
    const key = String(c.id || c.title || c.name || c.image || "").toLowerCase();
    const fixedByName = {
      "白クマバグ": 1,
      "white_bear_bug": 1,
      "再帰": 23,
      "recursion": 23,
      "ダブルバインド": 9,
      "double_bind": 9,
      "教義": 21,
      "doctrine": 21,
      "h(x)バグ": 12,
      "hx_bug": 12
    };

    for(const k in fixedByName){
      if(key.includes(String(k).toLowerCase())) return fixedByName[k];
    }

    // subtitleなどにローマ数字を入れた場合の保険
    const maybeRoman = c.roman || c.cardRoman || c.arcana || "";
    const rn = romanToNumber(maybeRoman);
    if(rn) return rn;

    // 何もなければ従来通り配列順
    return idx + 1;
  }

  function getCardIndexForSlot(slotIndex, owned){
    const targetNo = slotIndex + 1;
    for(const idx of owned){
      if(getFixedSlotNumber(idx) === targetNo) return idx;
    }
    return -1;
  }


  function addBinderCard(idx){
    if(!validCardIndex(idx)) return;

    const owned = load(BINDER_KEY, []);
    const news = load(NEW_KEY, []);

    if(!owned.includes(idx)){
      owned.push(idx);
      owned.sort((a,b)=>a-b);
      save(BINDER_KEY, owned);

      if(!news.includes(idx)){
        news.push(idx);
        save(NEW_KEY, news);
      }
    }
  }

  function syncDailyToBinder(){
    for(const key of DAILY_KEYS){
      const s = load(key, null);
      if(s && s.drawn && validCardIndex(s.index)){
        addBinderCard(s.index);
        return;
      }
    }

    // 保険：カードモードで表が見えているなら現在カードも登録
    try{
      if(typeof appMode !== "undefined" && appMode === "cards" &&
         typeof cardIndex !== "undefined" && typeof cardFlipped !== "undefined" &&
         cardFlipped === false){
        addBinderCard(cardIndex);
      }
    }catch(e){}
  }

  // これ以降、古いbinderV98は読まない。辞書index混入を遮断。
  window.renderBinder = function renderBinderV104(){
    syncDailyToBinder();

    const grid = document.getElementById("binderGrid");
    if(!grid) return;

    const arr = getCards();
    const total = Math.max(arr.length, 100);
    const owned = load(BINDER_KEY, []).filter(validCardIndex);
    const news = load(NEW_KEY, []).filter(validCardIndex);

    // 不正indexを整理して保存
    save(BINDER_KEY, owned);
    save(NEW_KEY, news);

    let html = "";

    for(let i=0;i<total;i++){
      const cardIdx = getCardIndexForSlot(i, owned);
      const has = cardIdx >= 0;
      const isNew = has && news.includes(cardIdx);
      const no = String(i+1).padStart(3,"0");
      const title = has ? getCardTitle(cardIdx) : ("CARD " + no);
      const img = has ? getCardImage(cardIdx) : "";

      if(has){
        html += `
          <div class="binder-item owned-card ${isNew ? "new-fill" : ""}" data-card-index="${cardIdx}">
            <span class="binder-mini-no">No.${no}</span>
            ${isNew ? `<span class="binder-new-badge">NEW</span>` : ""}
            <div class="binder-mini-card">
              ${img ? `<img src="${esc(img)}" alt="${esc(title)}">` : `<span class="binder-placeholder-title">${esc(title)}</span>`}
            </div>
            <span class="binder-open-hint">tap</span>
          </div>`;
      }else{
        html += `
          <div class="binder-item binder-locked" data-card-index="${i}">
            <span class="binder-mini-no">No.${no}</span>
            <span>???</span>
          </div>`;
      }
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".owned-card").forEach(el=>{
      el.addEventListener("click", e=>{
        e.preventDefault();
        e.stopPropagation();

        const idx = Number(el.dataset.cardIndex);
        if(!validCardIndex(idx)) return;

        try{
          appMode = "cards";
          cardIndex = idx;
          cardFlipped = false;
          const modal = document.getElementById("binderModal");
          if(modal) modal.style.display = "none";
          if(typeof render === "function") render("flash");
        }catch(err){}
      });
    });

    if(news.length){
      setTimeout(()=>save(NEW_KEY, []), 1400);
    }
  };

  function hookFlipForBinder(){
    if(typeof flipCurrentCard !== "function" || flipCurrentCard.__v104Binder) return;

    const orig = flipCurrentCard;
    flipCurrentCard = function(){
      const r = orig.apply(this, arguments);

      setTimeout(()=>{
        try{
          if(typeof appMode !== "undefined" && appMode === "cards" &&
             typeof cardIndex !== "undefined" &&
             typeof cardFlipped !== "undefined" &&
             cardFlipped === false){
            addBinderCard(cardIndex);
          }
        }catch(e){}
      }, 120);

      return r;
    };

    flipCurrentCard.__v104Binder = true;
  }

  function bindBinderOpenV104(){
    const btn = document.getElementById("openBinderBtn");
    const modal = document.getElementById("binderModal");
    const close = document.getElementById("binderCloseBtn");

    if(btn && !btn.dataset.v104){
      btn.dataset.v104 = "1";
      btn.onclick = e=>{
        e.preventDefault();
        e.stopPropagation();
        if(!modal) return;
        modal.style.display = "block";
        window.renderBinder();
      };
    }

    if(close && !close.dataset.v104){
      close.dataset.v104 = "1";
      close.onclick = e=>{
        e.preventDefault();
        e.stopPropagation();
        if(modal) modal.style.display = "none";
      };
    }

    if(modal && !modal.dataset.v104){
      modal.dataset.v104 = "1";
      modal.addEventListener("click", e=>{
        if(e.target === modal) modal.style.display = "none";
      });
    }
  }

  function updateBinderButtonVisibilityV104(){
    const btn = document.getElementById("openBinderBtn");
    if(!btn) return;

    let isCards = false;
    try{ isCards = typeof appMode !== "undefined" && appMode === "cards"; }catch(e){}
    btn.style.display = isCards ? "block" : "none";
  }

  function hookRenderV104(){
    if(typeof render !== "function" || render.__v104BinderHook) return;
    const orig = render;
    render = function(){
      const r = orig.apply(this, arguments);
      setTimeout(updateBinderButtonVisibilityV104, 0);
      return r;
    };
    render.__v104BinderHook = true;
  }

  function boot(){
    hookFlipForBinder();
    bindBinderOpenV104();
    hookRenderV104();
    updateBinderButtonVisibilityV104();
    setInterval(()=>{
      hookFlipForBinder();
      bindBinderOpenV104();
      updateBinderButtonVisibilityV104();
    }, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* v105: binder book polish */
(function(){
  function polishBinderButton(){
    const btn = document.getElementById("openBinderBtn");
    if(!btn || btn.dataset.v105Polished) return;
    btn.dataset.v105Polished = "1";
    btn.title = "バインダー";
    btn.setAttribute("aria-label", "バインダーを開く");
  }

  function bootV105(){
    polishBinderButton();
    setInterval(polishBinderButton, 800);
  }

  if(document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootV105);
  } else {
    bootV105();
  }
})();


/* v106: binder internal swipe viewer */
(function(){
  const BINDER_KEY = "binderCardsV104";

  let owned = [];
  let viewerPos = 0;
  let sx = 0;
  let sy = 0;
  let tracking = false;

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCards(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    return [];
  }

  function validIndex(idx){
    const arr=getCards();
    return typeof idx === "number" && idx >= 0 && idx < arr.length;
  }

  function getCard(idx){
    const arr=getCards();
    return validIndex(idx) ? arr[idx] : null;
  }

  function getCardTitle(idx){
    const c=getCard(idx);
    if(!c) return "CARD " + String(idx+1).padStart(3,"0");
    return c.title || c.name || c.label || c.id || ("CARD " + String(idx+1).padStart(3,"0"));
  }

  function getCardImage(idx){
    const c=getCard(idx);
    if(!c) return "";
    return c.image || c.img || c.src || c.url || c.front || c.frontImage || c.cardImage || "";
  }

  function reloadOwned(){
    owned = load(BINDER_KEY, []).filter(validIndex).sort((a,b)=>a-b);
  }

  function viewerEls(){
    return {
      root: document.getElementById("binderViewer"),
      card: document.getElementById("binderViewerCard"),
      title: document.getElementById("binderViewerTitle"),
      counter: document.getElementById("binderViewerCounter"),
      close: document.getElementById("binderViewerClose")
    };
  }

  function renderViewer(anim){
    const {card,title,counter} = viewerEls();
    if(!card || !title || !counter) return;

    const idx = owned[viewerPos];
    const cardTitle = getCardTitle(idx);
    const img = getCardImage(idx);
    const no = String(idx+1).padStart(3,"0");

    card.classList.remove("slide-left","slide-right");
    card.innerHTML = img
      ? `<img src="${esc(img)}" alt="${esc(cardTitle)}">`
      : `<div class="viewer-placeholder">No.${no}<br>${esc(cardTitle)}</div>`;

    title.textContent = cardTitle;
    counter.textContent = `${viewerPos+1} / ${owned.length}　No.${no}`;

    if(anim){
      void card.offsetWidth;
      card.classList.add(anim === "next" ? "slide-left" : "slide-right");
    }
  }

  function openViewerByIndex(idx){
    reloadOwned();
    if(!owned.length) return;

    const pos = owned.indexOf(idx);
    viewerPos = pos >= 0 ? pos : 0;

    const {root} = viewerEls();
    if(!root) return;

    root.hidden = false;
    renderViewer();
  }

  function closeViewer(){
    const {root} = viewerEls();
    if(root) root.hidden = true;
  }

  function moveViewer(dir){
    if(!owned.length) return;

    viewerPos += dir;

    if(viewerPos < 0) viewerPos = owned.length - 1;
    if(viewerPos >= owned.length) viewerPos = 0;

    renderViewer(dir > 0 ? "next" : "prev");
  }

  function bindViewerSwipe(){
    const {root,close} = viewerEls();
    if(!root || root.dataset.v106Bound) return;
    root.dataset.v106Bound = "1";

    if(close && !close.dataset.v106Bound){
      close.dataset.v106Bound = "1";
      close.addEventListener("click", e=>{
        e.preventDefault();
        e.stopPropagation();
        closeViewer();
      });
    }

    root.addEventListener("click", e=>{
      if(e.target === root) closeViewer();
    });

    root.addEventListener("touchstart", e=>{
      const t=e.changedTouches && e.changedTouches[0];
      if(!t) return;
      sx=t.clientX;
      sy=t.clientY;
      tracking=true;
    }, {passive:true});

    root.addEventListener("touchend", e=>{
      if(!tracking) return;
      tracking=false;

      const t=e.changedTouches && e.changedTouches[0];
      if(!t) return;

      const dx=t.clientX-sx;
      const dy=t.clientY-sy;

      if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.25){
        // 左スワイプで次、右スワイプで前
        moveViewer(dx < 0 ? 1 : -1);
      }
    }, {passive:true});

    // PC fallback
    let down=false;
    root.addEventListener("pointerdown", e=>{
      if(e.pointerType === "touch") return;
      down=true;
      sx=e.clientX;
      sy=e.clientY;
    });

    root.addEventListener("pointerup", e=>{
      if(e.pointerType === "touch" || !down) return;
      down=false;
      const dx=e.clientX-sx;
      const dy=e.clientY-sy;
      if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.25){
        moveViewer(dx < 0 ? 1 : -1);
      }
    });
  }

  // renderBinderの後に取得済みカードへviewer起動を追加
  function hookBinderRender(){
    if(typeof window.renderBinder !== "function" || window.renderBinder.__v106Hooked) return;

    const original = window.renderBinder;
    window.renderBinder = function(){
      original.apply(this, arguments);

      setTimeout(()=>{
        bindViewerSwipe();

        document.querySelectorAll(".binder-item.owned-card").forEach(el=>{
          if(el.dataset.v106Viewer) return;
          el.dataset.v106Viewer = "1";

          el.addEventListener("click", e=>{
            e.preventDefault();
            e.stopPropagation();

            const idx = Number(el.dataset.cardIndex ?? el.dataset.idx);
            if(Number.isFinite(idx)){
              openViewerByIndex(idx);
            }
          }, true);
        });
      },0);
    };

    window.renderBinder.__v106Hooked = true;
  }

  function boot(){
    bindViewerSwipe();
    hookBinderRender();
    setInterval(()=>{
      bindViewerSwipe();
      hookBinderRender();
    },700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* v107: text panel interaction */
(function(){
  const TEXT_KEY = "binderTextDataV107";

  let sx=0, sy=0, tracking=false;
  let panel, inner;
  let expanded=false;

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCardText(idx){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards) && cards[idx]){
        const c=cards[idx];
        return c.text || c.description || c.body || c.content || "・・・";
      }
    }catch(e){}
    return "・・・";
  }

  function renderText(idx){
    if(!inner) return;
    const txt = getCardText(idx);
    inner.innerHTML = esc(txt).replace(/\n/g,"<br>");
  }

  function hookViewer(){
    const viewer = document.getElementById("binderViewer");
    panel = document.getElementById("binderViewerTextPanel");
    inner = document.getElementById("binderViewerTextInner");
    if(!viewer || !panel || viewer.dataset.v107Bound) return;

    viewer.dataset.v107Bound = "1";

    viewer.addEventListener("touchstart", e=>{
      const t=e.changedTouches && e.changedTouches[0];
      if(!t) return;
      sx=t.clientX; sy=t.clientY;
      tracking=true;
    }, {passive:true});

    viewer.addEventListener("touchend", e=>{
      if(!tracking) return;
      tracking=false;
      const t=e.changedTouches && e.changedTouches[0];
      if(!t) return;
      const dx=t.clientX-sx;
      const dy=t.clientY-sy;

      if(Math.abs(dy)>48 && Math.abs(dy)>Math.abs(dx)){
        if(dy < 0){
          panel.classList.add("expanded");
          expanded=true;
        }else{
          panel.classList.remove("expanded");
          expanded=false;
        }
      }else if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)){
        // 左右でカード移動
        if(typeof moveViewer === "function"){
          moveViewer(dx<0 ? 1 : -1);
          panel.classList.remove("expanded");
          expanded=false;
        }
      }
    }, {passive:true});
  }

  function hookRender(){
    if(typeof renderViewer !== "function" || renderViewer.__v107) return;
    const orig = renderViewer;
    renderViewer = function(anim){
      const r = orig.apply(this, arguments);
      try{
        if(typeof viewerPos !== "undefined" && typeof owned !== "undefined"){
          const idx = owned[viewerPos];
          renderText(idx);
        }
      }catch(e){}
      return r;
    };
    renderViewer.__v107=true;
  }

  function boot(){
    hookViewer();
    hookRender();
    setInterval(()=>{
      hookViewer();
      hookRender();
    },700);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();


/* v108: binder viewer flip + guaranteed sample text */
(function(){
  const BINDER_KEY = "binderCardsV104";

  let owned = [];
  let pos = 0;
  let face = "front";
  let sx = 0;
  let sy = 0;
  let tracking = false;

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCards(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    return [];
  }

  function validIndex(idx){
    const arr = getCards();
    return typeof idx === "number" && idx >= 0 && idx < arr.length;
  }

  function getCard(idx){
    const arr = getCards();
    return validIndex(idx) ? arr[idx] : null;
  }

  function getTitle(idx){
    const c = getCard(idx);
    if(!c) return "CARD " + String(idx+1).padStart(3,"0");
    return c.title || c.name || c.label || c.word || c.id || ("CARD " + String(idx+1).padStart(3,"0"));
  }

  function getSub(idx){
    const c = getCard(idx);
    if(!c) return "";
    return c.subtitle || c.en || c.keyword || c.type || "";
  }

  function getImage(idx){
    const c = getCard(idx);
    if(!c) return "";
    return c.image || c.img || c.src || c.url || c.front || c.frontImage || c.cardImage || "";
  }

  function getSampleText(idx){
    const c = getCard(idx);
    const title = getTitle(idx);
    const sub = getSub(idx);

    function cardLine(s){
      return String(s == null ? "" : s)
        .replace(/[&<>"']/g, ch => ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#039;"
        }[ch]))
        .replace(/\n/g, "<br>");
    }

    if(c && (c.observe || c.bug || c.lookback || c.lookBack || c.lookbear || c.lookBear)){
      return `
<h3>${esc(title)}</h3>
${sub ? `<div class="lead">${esc(sub)}</div>` : `<div class="lead">カードを引いた瞬間、意味が少しだけ形になる。</div>`}

${c.observe ? `<div class="section">
<h3>OBSERVE</h3>
${cardLine(c.observe)}
</div>` : ""}

${c.bug ? `<div class="section">
<h3>BUG</h3>
${cardLine(c.bug)}
</div>` : ""}

${c.lookback || c.lookBack ? `<div class="section">
<h3>LOOK BACK</h3>
${cardLine(c.lookback || c.lookBack)}
</div>` : ""}

${c.lookbear || c.lookBear ? `<div class="section">
<h3>🐻 LOOK BEAR</h3>
${cardLine(c.lookbear || c.lookBear)}
</div>` : ""}`;
    }

    const real = c && (c.text || c.description || c.body || c.content || c.story);
    if(real) return String(real);

    return `
<h3>${esc(title)}</h3>
${sub ? `<div class="lead">${esc(sub)}</div>` : `<div class="lead">カードを引いた瞬間、意味が少しだけ形になる。</div>`}

<div class="section">
<h3>OBSERVE</h3>
人は、何かを見た瞬間に、それをただの情報としてではなく、自分の中の記憶や感情と結びつけて読む。
</div>

<div class="section">
<h3>BUG</h3>
意味は、対象そのものだけでは決まらない。見るタイミング、気分、場所によって、同じカードでも違うものに見えてしまう。
</div>

<div class="section">
<h3>SCENE</h3>
・会議<br>
・SNS<br>
・深夜の思考<br>
・言えなかった一言<br>
・なんとなく気になる沈黙
</div>

<div class="section">
<h3>LOOK BACK</h3>
それは本当にそこにあったのか。<br>
それとも、見た瞬間に生まれてしまったのか。
</div>

<div class="section">
<h3>🐻 LOOK BEAR</h3>
「もう一回見ると、ちょっと違って見えるよね。」
</div>`;
  }

  function els(){
    return {
      root: document.getElementById("binderViewer"),
      card: document.getElementById("binderViewerCard"),
      title: document.getElementById("binderViewerTitle"),
      counter: document.getElementById("binderViewerCounter"),
      text: document.getElementById("binderViewerTextPanel"),
      inner: document.getElementById("binderViewerTextInner"),
      close: document.getElementById("binderViewerClose")
    };
  }

  function reloadOwned(){
    owned = load(BINDER_KEY, []).filter(validIndex).sort((a,b)=>a-b);
  }

  function renderCard(anim){
    const e = els();
    if(!e.card || !e.title || !e.counter || !e.inner) return;
    const idx = owned[pos];
    const title = getTitle(idx);
    const img = getImage(idx);
    const no = String(idx+1).padStart(3,"0");

    e.card.classList.remove("flip-view", "slide-left", "slide-right");

    if(face === "front"){
      e.card.innerHTML = img
        ? `<img src="${esc(img)}" alt="${esc(title)}">`
        : `<div class="viewer-placeholder">No.${no}<br>${esc(title)}</div>`;
    }else{
      e.card.innerHTML = `
        <div class="viewer-card-back">
          <div>
            <div class="viewer-card-back-title">${esc(title)}</div>
            <div class="viewer-card-back-sub">No.${no} / THE LOOKING BEAR</div>
          </div>
        </div>`;
    }

    e.title.textContent = title;
    e.counter.textContent = `${pos+1} / ${owned.length}　No.${no}`;

    e.inner.innerHTML = getSampleText(idx);

    if(anim === "flip"){
      void e.card.offsetWidth;
      e.card.classList.add("flip-view");
    }else if(anim){
      void e.card.offsetWidth;
      e.card.classList.add(anim === "next" ? "slide-left" : "slide-right");
    }
  }

  function open(idx){
    reloadOwned();
    if(!owned.length) return;
    const found = owned.indexOf(idx);
    pos = found >= 0 ? found : 0;
    face = "front";

    const e = els();
    if(!e.root) return;
    e.root.hidden = false;

    if(e.text){
      /* BINDER_NO_SWIPE_CLOSE: disabled */
    }

    renderCard();
  }

  function close(){
    const e = els();
    if(e.root) e.root.hidden = true;
  }

  function move(dir){
    if(!owned.length) return;
    pos += dir;
    if(pos < 0) pos = owned.length - 1;
    if(pos >= owned.length) pos = 0;
    face = "front";
    const e = els();
    if(e.text) /* BINDER_NO_SWIPE_CLOSE: disabled */
    renderCard(dir > 0 ? "next" : "prev");
  }

  function flip(){
    face = face === "front" ? "back" : "front";
    renderCard("flip");
  }

  function bindViewer(){
    const e = els();
    if(!e.root || e.root.dataset.v108Bound) return;
    e.root.dataset.v108Bound = "1";

    if(e.close){
      e.close.onclick = (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        close();
      };
    }

    if(e.card){
      e.card.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        flip();
      });
    }

    if(e.text){
      e.text.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX;
        sy = t.clientY;
        tracking = true;
      }, {passive:true});

      e.text.addEventListener("touchend", ev=>{
        if(!tracking) return;
        tracking = false;

        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;

        const dx = t.clientX - sx;
        const dy = t.clientY - sy;

        if(Math.abs(dy) > 46 && Math.abs(dy) > Math.abs(dx)){
          if(dy < 0) e.text.classList.add("expanded");
          else { /* BINDER_NO_SWIPE_CLOSE: close by downward swipe disabled */ return; }
          return;
        }

        if(Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2){
          move(dx < 0 ? 1 : -1);
        }
      }, {passive:true});
    }

    e.root.addEventListener("click", ev=>{
      if(ev.target === e.root) close();
    });
  }

  function hookBinder(){
    if(typeof window.renderBinder !== "function" || window.renderBinder.__v108Hooked) return;

    const orig = window.renderBinder;
    window.renderBinder = function(){
      orig.apply(this, arguments);

      setTimeout(()=>{
        bindViewer();

        document.querySelectorAll(".binder-item.owned-card").forEach(el=>{
          el.onclick = null;
          el.addEventListener("click", ev=>{
            ev.preventDefault();
            ev.stopPropagation();
            const idx = Number(el.dataset.cardIndex ?? el.dataset.idx);
            if(Number.isFinite(idx)) open(idx);
          }, true);
        });
      },0);
    };

    window.renderBinder.__v108Hooked = true;
  }

  function boot(){
    bindViewer();
    hookBinder();
    setInterval(()=>{
      bindViewer();
      hookBinder();
    },700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* v109: binder viewer card swipe flip */
(function(){
  let sx = 0;
  let sy = 0;
  let tracking = false;

  function getEls(){
    return {
      card: document.getElementById("binderViewerCard"),
      text: document.getElementById("binderViewerTextPanel")
    };
  }

  function currentFaceCard(){
    const card = document.getElementById("binderViewerCard");
    if(!card) return null;
    return card;
  }

  function callExistingFlip(direction){
    // v108内のflip関数は閉じたスコープなので直接呼べない場合がある。
    // そのためカードをクリックさせて既存の表裏切替を発火させる。
    const card = currentFaceCard();
    if(!card) return;

    card.classList.remove("viewer-flip-left", "viewer-flip-right", "flip-view");
    void card.offsetWidth;

    card.classList.add(direction === "left" ? "viewer-flip-left" : "viewer-flip-right");

    setTimeout(()=>{
      card.click();
    }, 120);

    setTimeout(()=>{
      card.classList.remove("viewer-flip-left", "viewer-flip-right");
    }, 520);
  }

  function bindCardSwipeFlip(){
    const {card, text} = getEls();
    if(!card || card.dataset.v109Swipe) return;
    card.dataset.v109Swipe = "1";

    card.addEventListener("touchstart", e=>{
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      sx = t.clientX;
      sy = t.clientY;
      tracking = true;
    }, {passive:true});

    card.addEventListener("touchend", e=>{
      if(!tracking) return;
      tracking = false;

      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;

      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      if(Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.18){
        e.preventDefault?.();
        e.stopPropagation?.();

        // 左スワイプ：右端からめくる / 右スワイプ：左端からめくる
        callExistingFlip(dx < 0 ? "left" : "right");
      }
    }, {passive:false});

    // PC fallback
    let down = false;
    card.addEventListener("pointerdown", e=>{
      if(e.pointerType === "touch") return;
      down = true;
      sx = e.clientX;
      sy = e.clientY;
    });

    card.addEventListener("pointerup", e=>{
      if(e.pointerType === "touch" || !down) return;
      down = false;

      const dx = e.clientX - sx;
      const dy = e.clientY - sy;

      if(Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.18){
        callExistingFlip(dx < 0 ? "left" : "right");
      }
    });
  }

  function hookViewerRender(){
    // v108でカード中身が再描画されても、外側の#binderViewerCardは残るので基本一回でOK。
    bindCardSwipeFlip();
  }

  function boot(){
    hookViewerRender();
    setInterval(hookViewerRender, 700);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();


/* v110: binder viewer card-mode style helper */
(function(){
  function forceTextPanelInitial(){
    const panel = document.getElementById("binderViewerTextPanel");
    if(!panel) return;
    // 開いた直後は下に少しだけ見える状態
    if(!panel.classList.contains("expanded")){
      panel.style.transform = "";
    }
  }

  function bindV110(){
    const viewer = document.getElementById("binderViewer");
    if(!viewer || viewer.dataset.v110Bound) return;
    viewer.dataset.v110Bound = "1";

    const observer = new MutationObserver(()=>{
      if(!viewer.hidden){
        setTimeout(forceTextPanelInitial, 50);
      }
    });

    observer.observe(viewer, { attributes:true, attributeFilter:["hidden"] });
  }

  function boot(){
    bindV110();
    setInterval(bindV110, 800);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();


/* v111: binder back is card-back, text stays in lower panel */
(function(){
  function patchRenderCard(){
    // v108/v109のrenderCardは閉じたスコープなので直接上書きしにくい。
    // ここではカード裏が描画された直後にDOMを書き換える。
    const card = document.getElementById("binderViewerCard");
    if(!card || card.dataset.v111Observer) return;
    card.dataset.v111Observer = "1";

    const obs = new MutationObserver(()=>{
      const back = card.querySelector(".viewer-card-back");
      if(!back || back.dataset.v111Fixed) return;

      const title = back.querySelector(".viewer-card-back-title")?.textContent || "";
      const sub = back.querySelector(".viewer-card-back-sub")?.textContent || "THE LOOKING BEAR";

      back.dataset.v111Fixed = "1";
      back.innerHTML = `
        <div class="viewer-card-back-symbol">
          <div class="viewer-card-back-bear">🐻</div>
          <div class="viewer-card-back-title">${title}</div>
          <div class="viewer-card-back-sub">${sub}</div>
        </div>`;
    });

    obs.observe(card, {childList:true, subtree:true});
  }

  function boot(){
    patchRenderCard();
    setInterval(patchRenderCard, 700);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();


/* v112: binder viewer replays card-mode back and card-style text */
(function(){
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCards(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    return [];
  }

  function getCard(idx){
    const arr=getCards();
    return typeof idx === "number" && idx >= 0 && idx < arr.length ? arr[idx] : null;
  }

  function getBackImage(){
    // カードモードの裏面画像をDOMから拾う
    const selectors = [
      ".card-back img",
      ".back img",
      ".card.is-back img",
      ".flip-card-back img",
      ".card-back",
      ".back"
    ];
    for(const sel of selectors){
      const el=document.querySelector(sel);
      if(!el) continue;
      if(el.tagName === "IMG"){
        const src = el.getAttribute("src") || el.src;
        if(src) return src;
      }
      const bg = getComputedStyle(el).backgroundImage;
      const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      if(m && m[1]) return m[1];
    }
    return "";
  }

  function getCardTitle(idx){
    const c=getCard(idx);
    if(!c) return "CARD";
    return c.title || c.name || c.label || c.word || c.id || "CARD";
  }

  function getCardSub(idx){
    const c=getCard(idx);
    if(!c) return "";
    return c.subtitle || c.en || c.keyword || c.type || "";
  }

  function makeBackHTML(idx){
    const title=esc(getCardTitle(idx));
    const no=String((idx ?? 0)+1).padStart(3,"0");
    const backImg=getBackImage();

    if(backImg){
      return `<div class="viewer-card-back"><img src="${esc(backImg)}" alt="card back"></div>`;
    }

    return `
      <div class="viewer-card-back">
        <div class="replay-back-placeholder">
          <div class="replay-back-mark">
            <div class="replay-back-bear">🐻</div>
            <div class="replay-back-title">${title}</div>
            <div class="replay-back-sub">No.${no} / THE LOOKING BEAR</div>
          </div>
        </div>
      </div>`;
  }

  function detectViewerIndex(){
    // counterのNo.からindexを推定
    const counter=document.getElementById("binderViewerCounter");
    if(counter){
      const m=counter.textContent.match(/No\.(\d+)/);
      if(m) return Number(m[1])-1;
    }
    return 0;
  }

  function patchBackCard(){
    const card=document.getElementById("binderViewerCard");
    if(!card) return;

    const back=card.querySelector(".viewer-card-back");
    if(!back || back.dataset.v112Fixed) return;

    const idx=detectViewerIndex();
    const html=makeBackHTML(idx);
    card.innerHTML=html;
    const fixed=card.querySelector(".viewer-card-back");
    if(fixed) fixed.dataset.v112Fixed="1";
  }

  function patchTextHeader(){
    const inner=document.getElementById("binderViewerTextInner");
    if(!inner || inner.dataset.v112Patched) return;

    // 既にテキストがある時、カードモードっぽくタイトルが上に来るよう補正
    inner.dataset.v112Patched="1";
  }

  function observeViewer(){
    const card=document.getElementById("binderViewerCard");
    if(card && !card.dataset.v112Observer){
      card.dataset.v112Observer="1";
      const obs=new MutationObserver(()=>{
        // 裏面が出た時だけカード裏風に差し替え
        setTimeout(patchBackCard,0);
      });
      obs.observe(card,{childList:true,subtree:true});
    }

    const viewer=document.getElementById("binderViewer");
    if(viewer && !viewer.dataset.v112TextInit){
      viewer.dataset.v112TextInit="1";
      const obs2=new MutationObserver(()=>{
        if(!viewer.hidden){
          const panel=document.getElementById("binderViewerTextPanel");
          if(panel) panel.classList.remove("expanded");
        }
      });
      obs2.observe(viewer,{attributes:true,attributeFilter:["hidden"]});
    }
  }

  function boot(){
    observeViewer();
    patchBackCard();
    patchTextHeader();
    setInterval(()=>{
      observeViewer();
      patchBackCard();
      patchTextHeader();
    },700);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();


/* v113: clean binder replay viewer using card-mode structure */
(function(){
  const BINDER_KEY = "binderCardsV104";
  let owned = [];
  let pos = 0;
  let flipped = false;
  let sx = 0;
  let sy = 0;
  let tracking = false;

  function load(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch(e){return fallback;}
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,ch=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function getCards(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    return [];
  }

  function validIndex(idx){
    const arr=getCards();
    return typeof idx === "number" && idx >= 0 && idx < arr.length;
  }

  function getCard(idx){
    const arr=getCards();
    return validIndex(idx) ? arr[idx] : null;
  }

  function reloadOwned(){
    owned = load(BINDER_KEY, []).filter(validIndex).sort((a,b)=>a-b);
  }

  function getSampleText(c){
    if(!c) return "";

    function line(s){
      return String(s == null ? "" : s)
        .replace(/[&<>"']/g, ch => ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#039;"
        }[ch]))
        .replace(/\n/g, "<br>");
    }

    if(c.observe || c.bug || c.lookback || c.lookBack || c.lookbear || c.lookBear){
      return `
<h3>${esc(c.title || "CARD")}</h3>
<div class="lead">${esc(c.subtitle || c.caption || "")}</div>

${c.observe ? `<div class="section">
<h3>OBSERVE</h3>
${line(c.observe)}
</div>` : ""}

${c.bug ? `<div class="section">
<h3>BUG</h3>
${line(c.bug)}
</div>` : ""}

${c.lookback || c.lookBack ? `<div class="section">
<h3>LOOK BACK</h3>
${line(c.lookback || c.lookBack)}
</div>` : ""}

${c.lookbear || c.lookBear ? `<div class="section">
<h3>🐻 LOOK BEAR</h3>
${line(c.lookbear || c.lookBear)}
</div>` : ""}`;
    }

    const real = c.text || c.description || c.body || c.content || c.story;
    if(real) return String(real);

    return `
<h3>${esc(c.title || "CARD")}</h3>
<div class="lead">${esc(c.subtitle || c.caption || "")}</div>

<div class="section">
<h3>OBSERVE</h3>
人は、何かを見た瞬間に、それをただの情報としてではなく、自分の中の記憶や感情と結びつけて読む。
</div>

<div class="section">
<h3>BUG</h3>
意味は、対象そのものだけでは決まらない。見るタイミング、気分、場所によって、同じカードでも違うものに見えてしまう。
</div>

<div class="section">
<h3>LOOK BACK</h3>
それは本当にそこにあったのか。<br>
それとも、見た瞬間に生まれてしまったのか。
</div>

<div class="section">
<h3>🐻 LOOK BEAR</h3>
「もう一回見ると、ちょっと違って見えるよね。」
</div>`;
  }

  function els(){
    return {
      root: document.getElementById("binderReplayViewer"),
      close: document.getElementById("binderReplayClose"),
      flip: document.getElementById("binderReplayFlipCard"),
      front: document.getElementById("binderReplayFront"),
      back: document.getElementById("binderReplayBack"),
      title: document.getElementById("binderReplayTitle"),
      subtitle: document.getElementById("binderReplaySubtitle"),
      caption: document.getElementById("binderReplayCaption"),
      counter: document.getElementById("binderReplayCounter"),
      panel: document.getElementById("binderReplayTextPanel"),
      text: document.getElementById("binderReplayTextInner")
    };
  }

  function renderReplay(){
    const e = els();
    if(!e.root || !owned.length) return;

    const idx = owned[pos];
    const c = getCard(idx);
    if(!c) return;

    e.front.src = c.image || "";
    e.front.alt = c.title || "";
    e.back.src = c.back || "images/cards/card_back.png";
    e.back.alt = `${c.title || "カード"} 裏面`;

    e.flip.classList.toggle("flipped", flipped);

    if(flipped){
      e.title.textContent = "？？？";
      e.subtitle.textContent = "裏面｜左右でめくる";
      e.caption.textContent = "カードをめくると内容が現れる";
    }else{
      e.title.textContent = c.title || "";
      e.subtitle.textContent = c.subtitle || "";
      e.caption.textContent = c.caption || "";
    }

    e.counter.textContent = `${pos + 1} / ${owned.length}　No.${String(idx+1).padStart(3,"0")}`;
    e.text.innerHTML = getSampleText(c);
  }

  function openReplay(idx){
    reloadOwned();
    if(!owned.length) return;

    const found = owned.indexOf(idx);
    pos = found >= 0 ? found : 0;
    flipped = false;

    const e = els();
    if(!e.root) return;

    e.root.hidden = false;
    if(e.panel) e.panel.classList.remove("expanded");

    renderReplay();
  }

  function closeReplay(){
    const e = els();
    if(e.root) e.root.hidden = true;
  }

  function flipReplay(){
    const e = els();
    flipped = !flipped;
    renderReplay();

    if(e.flip){
      e.flip.classList.remove("flip-pop");
      void e.flip.offsetWidth;
      e.flip.classList.add("flip-pop");
    }
  }

  function moveReplay(dir){
    if(!owned.length) return;
    pos += dir;
    if(pos < 0) pos = owned.length - 1;
    if(pos >= owned.length) pos = 0;
    flipped = false;
    const e = els();
    if(e.panel) e.panel.classList.remove("expanded");
    renderReplay();
  }

  function bindReplay(){
    const e = els();
    if(!e.root || e.root.dataset.v113Bound) return;
    e.root.dataset.v113Bound = "1";

    if(e.close){
      e.close.onclick = (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        closeReplay();
      };
    }

    if(e.flip){
      e.flip.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        flipReplay();
      });

      e.flip.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX;
        sy = t.clientY;
        tracking = true;
      }, {passive:true});

      e.flip.addEventListener("touchend", ev=>{
        if(!tracking) return;
        tracking = false;
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;

        const dx = t.clientX - sx;
        const dy = t.clientY - sy;

        if(Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.18){
          ev.preventDefault();
          ev.stopPropagation();
          flipReplay();
        }
      }, {passive:false});
    }

    if(e.panel){
      e.panel.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX;
        sy = t.clientY;
        tracking = true;
      }, {passive:true});

      e.panel.addEventListener("touchend", ev=>{
        if(!tracking) return;
        tracking = false;
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;

        const dx = t.clientX - sx;
        const dy = t.clientY - sy;

        // BINDER_PANEL_IDEAL_TOGGLE_V1
        // 上にスワイプ: タブを引き上げて内容を読む
        // 下にスワイプ: パネル上部タブ周辺から始まった時だけ下げてカードに戻る
        const panelRect = e.panel.getBoundingClientRect();
        const startedOnTabArea = sy <= panelRect.top + 96;

        if(Math.abs(dy) > 46 && Math.abs(dy) > Math.abs(dx)){
          if(dy < 0){
            e.panel.classList.add("expanded");
          }else if(e.panel.classList.contains("expanded") && startedOnTabArea && Math.abs(dy) > 70){
            e.panel.classList.remove("expanded");
          }
          return;
        }

        if(Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2){
          moveReplay(dx < 0 ? 1 : -1);
        }
      }, {passive:true});
    }

    e.root.addEventListener("click", ev=>{
      if(ev.target === e.root) closeReplay();
    });
  }

  function hookBinderCards(){
    if(typeof window.renderBinder !== "function" || window.renderBinder.__v113Replay) return;

    const orig = window.renderBinder;
    window.renderBinder = function(){
      orig.apply(this, arguments);

      setTimeout(()=>{
        bindReplay();

        document.querySelectorAll(".binder-item.owned-card").forEach(el=>{
          const clone = el.cloneNode(true);
          el.parentNode.replaceChild(clone, el);

          clone.addEventListener("click", ev=>{
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();

            const idx = Number(clone.dataset.cardIndex ?? clone.dataset.idx);
            if(Number.isFinite(idx)) openReplay(idx);
          }, true);
        });
      },0);
    };

    window.renderBinder.__v113Replay = true;
  }

  function boot(){
    bindReplay();
    hookBinderCards();
    setInterval(()=>{
      bindReplay();
      hookBinderCards();
    },700);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();


/* v114: binder replay double tap fullscreen */
(function(){
  let lastTap = 0;
  let tapTimer = null;
  let sx = 0;
  let sy = 0;
  let movedRecently = false;
  let visualFlipped = false;

  function els(){
    return {
      root: document.getElementById("binderReplayViewer"),
      card: document.getElementById("binderReplayFlipCard"),
      panel: document.getElementById("binderReplayTextPanel")
    };
  }

  function pulse(card){
    if(!card) return;
    card.classList.remove("fullscreen-pulse");
    void card.offsetWidth;
    card.classList.add("fullscreen-pulse");
    setTimeout(()=>card.classList.remove("fullscreen-pulse"), 280);
  }

  function toggleFullscreen(){
    const {root, card} = els();
    if(!root || !card) return;
    root.classList.toggle("replay-fullscreen");
    pulse(card);
  }

  function visualFlip(){
    const {card} = els();
    if(!card) return;
    visualFlipped = !visualFlipped;
    card.classList.toggle("flipped", visualFlipped);
    card.classList.remove("flip-pop");
    void card.offsetWidth;
    card.classList.add("flip-pop");
  }

  function bindDoubleTap(){
    const {root, card} = els();
    if(!root || !card || card.dataset.v114DoubleTap) return;
    card.dataset.v114DoubleTap = "1";

    card.addEventListener("touchstart", e=>{
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      sx = t.clientX;
      sy = t.clientY;
      movedRecently = false;
    }, {passive:true, capture:true});

    card.addEventListener("touchmove", e=>{
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if(Math.abs(dx) > 14 || Math.abs(dy) > 14){
        movedRecently = true;
      }
    }, {passive:true, capture:true});

    // 既存のclick flipと衝突しないよう、clickをcaptureで握る。
    card.addEventListener("click", e=>{
      if(root.hidden) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if(movedRecently){
        movedRecently = false;
        return;
      }

      const now = Date.now();
      const isDouble = now - lastTap < 320;
      lastTap = now;

      clearTimeout(tapTimer);

      if(isDouble){
        toggleFullscreen();
        return;
      }

      tapTimer = setTimeout(()=>{
        visualFlip();
      }, 230);
    }, true);

    // 全画面中に背景ダブルタップっぽくなっても暴発しないよう初期化
    root.addEventListener("transitionend", ()=>{
      movedRecently = false;
    });
  }

  function hookOpenReset(){
    const {root} = els();
    if(!root || root.dataset.v114OpenReset) return;
    root.dataset.v114OpenReset = "1";

    const obs = new MutationObserver(()=>{
      if(!root.hidden){
        root.classList.remove("replay-fullscreen");
        visualFlipped = false;
        const {card} = els();
        if(card) card.classList.remove("flipped");
      }
    });
    obs.observe(root, {attributes:true, attributeFilter:["hidden"]});
  }

  function boot(){
    bindDoubleTap();
    hookOpenReset();
    setInterval(()=>{
      bindDoubleTap();
      hookOpenReset();
    }, 700);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();

/* v115: long press to open text panel (avoid iOS swipe conflict) */
(function(){
  let pressTimer = null;
  let startX=0,startY=0;

  function els(){
    return {
      card: document.getElementById("binderReplayFlipCard"),
      panel: document.getElementById("binderReplayTextPanel")
    };
  }

  function openPanel(){
    const {panel} = els();
    if(panel) panel.classList.add("expanded");
  }

  function closePanel(){
    const {panel} = els();
    if(panel) panel.classList.remove("expanded");
  }

  function bindLongPress(){
    const {card, panel} = els();
    if(!card || card.dataset.v115LongPress) return;
    card.dataset.v115LongPress="1";

    card.addEventListener("touchstart", e=>{
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      startX=t.clientX;
      startY=t.clientY;

      clearTimeout(pressTimer);
      pressTimer=setTimeout(()=>{
        openPanel();
      }, 420); // 長押し判定
    }, {passive:true});

    card.addEventListener("touchmove", e=>{
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      const dx = Math.abs(t.clientX-startX);
      const dy = Math.abs(t.clientY-startY);
      if(dx>12 || dy>12){
        clearTimeout(pressTimer);
      }
    }, {passive:true});

    card.addEventListener("touchend", ()=>{
      clearTimeout(pressTimer);
    });

    // パネル側タップで閉じる
    if(panel){
      panel.addEventListener("click", e=>{
        if(e.target===panel){
          closePanel();
        }
      });
    }
  }

  function boot(){
    bindLongPress();
    setInterval(bindLongPress,700);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();



/* v127: clean content mode, no flicker interval */
(function(){
  const ITEMS = [
    ["構文的イグノーベル賞","音声化予定","IG","くだらないけど深い観測シリーズ","rgba(255,210,90,.42)"],
    ["細胞が綴る詩","音声化済み","CELL","生命・記憶・再生の詩的ログ","rgba(120,220,190,.38)"],
    ["syntax frontier","音声化済み","SF","構文モデル×人工構文体の長編","rgba(100,160,255,.42)"],
    ["syntax MBA","音声化済み","MBA","経営をλ→!→σ→Tで読む講義","rgba(255,150,90,.38)"],
    ["詩の処方箋","音声化済み","POEM","言葉で状態を変える朗読シリーズ","rgba(210,140,255,.40)"],
    ["H(x)∞origin","音声・マンガ化済み","H∞","意味バグの起源を観測する","rgba(255,230,120,.46)"],
    ["貧乏メガネのシノ","テキストのみ","¥","貧しさと意味のズレを読む物語","rgba(150,210,120,.36)"],
    ["syntax resonance","音声・マンガ化製作中","♪","音楽×言葉×構文バトル","rgba(255,100,170,.42)"],
    ["ニクスのどうでもいい観測","音声化進行中","NXS","意味の手前の違和感を記録する","rgba(130,150,255,.40)"],
    ["跳ねる前のこの感じ","音声作品製作中","!","発火直前の空気を聴く作品","rgba(255,180,80,.42)"],
    ["ぴょこん日和","音声／紙芝居動画","PY","ゆるい音声と紙芝居的動画","rgba(110,230,255,.38)"]
  ];

  let rendered = false;

  function renderContent(){
    const screen = document.getElementById("contentScreenV127");
    if(!screen || rendered) return;

    screen.innerHTML = `
      <div class="content-hero-v127">
        <div class="hero-title-v127">H(x)∞origin</div>
        <div class="hero-meta-v127">音声・マンガ化済み</div>
        <div class="hero-copy-v127">意味が生まれる瞬間を、カード・音声・マンガで観測する。</div>
      </div>

      <div class="content-section-head-v127">
        <span>作品一覧</span>
        <span>${ITEMS.length}作品</span>
      </div>

      <div class="content-grid-v127">
        ${ITEMS.map(([title,status,mark,desc,accent],i)=>`
          <div class="content-card-v127" data-index="${i}">
            <div class="content-thumb-v127" data-mark="${mark}" style="--accent:${accent}"></div>
            <div class="content-info-v127">
              <div class="content-title-v127">${title}</div>
              <div class="content-status-v127">${status}</div>
              <div class="content-desc-v127">${desc}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    screen.querySelectorAll(".content-card-v127").forEach(el=>{
      el.onclick = () => {
        const [title,status] = ITEMS[Number(el.dataset.index)];
        alert(`${title}\n${status}\n\n次：作品詳細画面を接続`);
      };
    });

    rendered = true;
  }

  function showContent(ev){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
    }

    renderContent();

    try { appMode = "content"; } catch(e) {}
    document.body.classList.add("mode-content");
    document.body.dataset.mode = "content";

    const screen = document.getElementById("contentScreenV127");
    if(screen) screen.hidden = false;
  }

  function hideContent(nextMode){
    document.body.classList.remove("mode-content");
    if(document.body.dataset.mode === "content") document.body.dataset.mode = "";
    const screen = document.getElementById("contentScreenV127");
    if(screen) screen.hidden = true;

    if(nextMode){
      try {
        appMode = nextMode;
        if(typeof render === "function") render("flash");
      } catch(e){}
    }
  }

  function getTopModeButtons(){
    return Array.from(document.querySelectorAll("button"))
      .filter(b=>{
        const t=(b.textContent||"").replace(/\s+/g,"").trim();
        return ["辞書","カード","マンガ","コンテンツ"].includes(t);
      })
      .filter(b=>b.offsetParent !== null)
      .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top || a.getBoundingClientRect().left-b.getBoundingClientRect().left)
      .slice(0,3);
  }

  function bindOnce(){
    const btns = getTopModeButtons();
    if(btns.length < 3) return false;

    const [dict, card, content] = btns;

    dict.textContent = "辞書";
    card.textContent = "カード";
    content.textContent = "コンテンツ";

    if(!content.dataset.v127){
      content.dataset.v127 = "1";
      const h = ev => showContent(ev);
      content.addEventListener("touchstart", h, {capture:true, passive:false});
      content.addEventListener("click", h, true);
    }

    if(!dict.dataset.v127){
      dict.dataset.v127 = "1";
      dict.addEventListener("click", ()=>hideContent("dictionary"), true);
      dict.addEventListener("touchstart", ()=>hideContent("dictionary"), {capture:true, passive:true});
    }

    if(!card.dataset.v127){
      card.dataset.v127 = "1";
      card.addEventListener("click", ()=>hideContent("cards"), true);
      card.addEventListener("touchstart", ()=>hideContent("cards"), {capture:true, passive:true});
    }

    return true;
  }

  function stopGestures(ev){
    if(!document.body.classList.contains("mode-content")) return;

    const screen = document.getElementById("contentScreenV127");
    const path = ev.composedPath ? ev.composedPath() : [];

    if(screen && path.includes(screen)) return;

    const onTopButton = path.some(el=>{
      if(!el || el.tagName !== "BUTTON") return false;
      const t=(el.textContent||"").replace(/\s+/g,"").trim();
      return ["辞書","カード","コンテンツ"].includes(t);
    });

    if(onTopButton) return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation?.();
  }

  function boot(){
    renderContent();

    let tries = 0;
    const timer = setInterval(()=>{
      tries++;
      if(bindOnce() || tries > 12) clearInterval(timer);
    }, 250);

    bindOnce();

    document.addEventListener("touchmove", stopGestures, {capture:true, passive:false});
    document.addEventListener("touchstart", stopGestures, {capture:true, passive:false});
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();



/* v130: stable in-frame content interactions */
(function(){
  function isContentMode(){
    return document.body.classList.contains("mode-content") || document.body.dataset.mode === "content";
  }

  function getScreen(){
    return document.getElementById("contentScreenV127");
  }

  function ensureCardsClickable(){
    const screen = getScreen();
    if(!screen) return;

    screen.querySelectorAll(".content-card-v127").forEach(el=>{
      if(el.dataset.v130Click) return;
      el.dataset.v130Click = "1";

      const open = ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        const title = el.querySelector(".content-title-v127")?.textContent || "作品";
        const status = el.querySelector(".content-status-v127")?.textContent || "";
        alert(`${title}\n${status}\n\n次：作品詳細画面を接続`);
      };

      el.addEventListener("click", open, true);
      el.addEventListener("touchend", open, {capture:true, passive:false});
    });
  }

  function showContentFix(){
    const screen = getScreen();
    if(!screen) return;

    screen.hidden = false;
    screen.style.display = "block";
    screen.style.transform = "none";
    screen.style.overflowX = "hidden";
    ensureCardsClickable();
  }

  function resetUnderlyingTransform(){
    if(!isContentMode()) return;
    const content = document.getElementById("content") || document.querySelector(".content");
    if(content){
      content.style.transform = "none";
      content.classList.remove("dragging", "snap-back");
    }
  }

  function stopUnderlyingGestures(ev){
    if(!isContentMode()) return;

    const screen = getScreen();
    const path = ev.composedPath ? ev.composedPath() : [];

    if(screen && path.includes(screen)){
      // コンテンツ内の縦スクロールは許可。ただし親へは流さない。
      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
      return;
    }

    const onTopButton = path.some(el=>{
      if(!el || el.tagName !== "BUTTON") return false;
      const t=(el.textContent||"").replace(/\s+/g,"").trim();
      return ["辞書","カード","コンテンツ"].includes(t);
    });

    if(onTopButton) return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation?.();
  }

  function bindTopContent(){
    const buttons = Array.from(document.querySelectorAll("button")).filter(b=>{
      const t=(b.textContent||"").replace(/\s+/g,"").trim();
      return ["辞書","カード","コンテンツ"].includes(t);
    });

    buttons.forEach(btn=>{
      const t=(btn.textContent||"").replace(/\s+/g,"").trim();

      if(t === "コンテンツ" && !btn.dataset.v130){
        btn.dataset.v130 = "1";
        const h = ev=>{
          setTimeout(()=>{
            document.body.classList.add("mode-content");
            document.body.dataset.mode = "content";
            showContentFix();
            resetUnderlyingTransform();
          }, 0);
        };
        btn.addEventListener("touchstart", h, {capture:true, passive:true});
        btn.addEventListener("click", h, true);
      }

      if((t === "辞書" || t === "カード") && !btn.dataset.v130Leave){
        btn.dataset.v130Leave = "1";
        const h = ()=>{
          const screen = getScreen();
          if(screen) screen.hidden = true;
          document.body.classList.remove("mode-content");
          if(document.body.dataset.mode === "content") document.body.dataset.mode = "";
        };
        btn.addEventListener("touchstart", h, {capture:true, passive:true});
        btn.addEventListener("click", h, true);
      }
    });
  }

  function boot(){
    bindTopContent();
    ensureCardsClickable();

    document.addEventListener("touchstart", stopUnderlyingGestures, {capture:true, passive:false});
    document.addEventListener("touchmove", stopUnderlyingGestures, {capture:true, passive:false});
    document.addEventListener("pointerdown", stopUnderlyingGestures, true);
    document.addEventListener("click", stopUnderlyingGestures, true);

    // 初期バインドのみ短時間
    let count = 0;
    const timer = setInterval(()=>{
      count++;
      bindTopContent();
      ensureCardsClickable();
      resetUnderlyingTransform();
      if(count > 10) clearInterval(timer);
    }, 300);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();



/* v131: prevent accidental title tap while scrolling content */
(function(){
  let startX = 0;
  let startY = 0;
  let moved = false;
  let scrolling = false;
  let scrollTimer = null;

  function isContentMode(){
    return document.body.classList.contains("mode-content") || document.body.dataset.mode === "content";
  }

  function getScreen(){
    return document.getElementById("contentScreenV127");
  }

  function bindCardsSafely(){
    const screen = getScreen();
    if(!screen) return;

    screen.querySelectorAll(".content-card-v127").forEach(el=>{
      if(el.dataset.v131SafeTap) return;
      el.dataset.v131SafeTap = "1";

      // 既存onclickを無効化して、移動量判定付きに差し替え
      el.onclick = null;

      el.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        startX = t.clientX;
        startY = t.clientY;
        moved = false;
        el.classList.remove("scrolling");
      }, {capture:true, passive:true});

      el.addEventListener("touchmove", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        const dx = Math.abs(t.clientX - startX);
        const dy = Math.abs(t.clientY - startY);
        if(dx > 8 || dy > 8){
          moved = true;
          scrolling = true;
          el.classList.add("scrolling");
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(()=>{ scrolling = false; }, 180);
        }
      }, {capture:true, passive:true});

      el.addEventListener("touchend", ev=>{
        if(moved || scrolling){
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation?.();
          el.classList.remove("scrolling");
          moved = false;
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        const title = el.querySelector(".content-title-v127")?.textContent || "作品";
        const status = el.querySelector(".content-status-v127")?.textContent || "";
        alert(`${title}\n${status}\n\n次：作品詳細画面を接続`);
      }, {capture:true, passive:false});

      el.addEventListener("click", ev=>{
        if(moved || scrolling){
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation?.();
          moved = false;
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        const title = el.querySelector(".content-title-v127")?.textContent || "作品";
        const status = el.querySelector(".content-status-v127")?.textContent || "";
        alert(`${title}\n${status}\n\n次：作品詳細画面を接続`);
      }, true);
    });
  }

  function patchContentScroll(){
    const screen = getScreen();
    if(!screen || screen.dataset.v131Scroll) return;
    screen.dataset.v131Scroll = "1";

    screen.addEventListener("touchstart", ev=>{
      const t = ev.changedTouches && ev.changedTouches[0];
      if(!t) return;
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
    }, {capture:true, passive:true});

    screen.addEventListener("touchmove", ev=>{
      const t = ev.changedTouches && ev.changedTouches[0];
      if(!t) return;

      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);

      // 横移動は裏のカード操作に渡さず、縦スクロールだけ許可
      if(dx > dy && dx > 10){
        ev.preventDefault();
      }

      if(dy > 8){
        moved = true;
        scrolling = true;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(()=>{ scrolling = false; }, 180);
      }

      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
    }, {capture:true, passive:false});

    screen.addEventListener("scroll", ()=>{
      scrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(()=>{ scrolling = false; }, 220);
    }, {passive:true});
  }

  function stopUnderlyingGestures(ev){
    if(!isContentMode()) return;

    const screen = getScreen();
    const path = ev.composedPath ? ev.composedPath() : [];

    if(screen && path.includes(screen)){
      // コンテンツ内は許可。ただし裏へ流さない。
      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
      return;
    }

    const onTopButton = path.some(el=>{
      if(!el || el.tagName !== "BUTTON") return false;
      const t=(el.textContent||"").replace(/\s+/g,"").trim();
      return ["辞書","カード","コンテンツ"].includes(t);
    });

    if(onTopButton) return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation?.();
  }

  function ensureContentLayout(){
    if(!isContentMode()) return;

    const content = document.getElementById("content") || document.querySelector(".content");
    if(content){
      content.style.transform = "none";
      content.classList.remove("dragging", "snap-back");
    }

    const screen = getScreen();
    if(screen){
      screen.hidden = false;
      screen.style.display = "block";
      screen.style.transform = "none";
    }
  }

  function boot(){
    bindCardsSafely();
    patchContentScroll();

    document.addEventListener("touchstart", stopUnderlyingGestures, {capture:true, passive:false});
    document.addEventListener("touchmove", stopUnderlyingGestures, {capture:true, passive:false});
    document.addEventListener("pointerdown", stopUnderlyingGestures, true);

    let count = 0;
    const timer = setInterval(()=>{
      count++;
      bindCardsSafely();
      patchContentScroll();
      ensureContentLayout();
      if(count > 12) clearInterval(timer);
    }, 250);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();



/* v134: recover from v133, safer content card tap */
(function(){
  let sx = 0;
  let sy = 0;
  let moved = false;
  let scrolling = false;
  let scrollTimer = null;

  function isContentMode(){
    return document.body.classList.contains("mode-content") || document.body.dataset.mode === "content";
  }

  function screen(){
    return document.getElementById("contentScreenV127");
  }

  function topButtons(){
    return Array.from(document.querySelectorAll("button"))
      .filter(b=>{
        const t=(b.textContent||"").replace(/\s+/g,"").trim();
        return ["辞書","カード","コンテンツ"].includes(t);
      })
      .filter(b=>b.offsetParent !== null)
      .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top || a.getBoundingClientRect().left-b.getBoundingClientRect().left)
      .slice(0,3);
  }

  function markContentActive(){
    const btns = topButtons();
    btns.forEach(b=>b.classList.remove("mode-content-tab-v134"));
    if(isContentMode() && btns[2]){
      btns[2].classList.add("mode-content-tab-v134");
      btns[0]?.classList.remove("active");
      btns[1]?.classList.remove("active");
    }
  }

  function openDetail(el){
    const title = el.querySelector(".content-title-v127")?.textContent || "作品";
    const status = el.querySelector(".content-status-v127")?.textContent || "";
    alert(`${title}\n${status}\n\n次：作品詳細画面を接続`);
  }

  function bindCards(){
    const s = screen();
    if(!s) return;

    s.querySelectorAll(".content-card-v127").forEach(el=>{
      if(el.dataset.v134Bound) return;
      el.dataset.v134Bound = "1";

      // 既存clickを殺して安全なtapだけ通す
      el.onclick = null;

      el.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX;
        sy = t.clientY;
        moved = false;
      }, {capture:true, passive:true});

      el.addEventListener("touchmove", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        const dx = Math.abs(t.clientX - sx);
        const dy = Math.abs(t.clientY - sy);
        if(dx > 14 || dy > 14){
          moved = true;
          scrolling = true;
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(()=>{ scrolling = false; }, 300);
        }
      }, {capture:true, passive:true});

      el.addEventListener("touchend", ev=>{
        if(moved || scrolling){
          moved = false;
          return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
        openDetail(el);
      }, {capture:true, passive:false});

      el.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
      }, true);
    });
  }

  function bindTop(){
    const btns = topButtons();
    if(btns.length < 3) return;

    const dict = btns[0];
    const card = btns[1];
    const content = btns[2];

    if(!content.dataset.v134Content){
      content.dataset.v134Content = "1";
      const h = ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        document.body.classList.add("mode-content");
        document.body.dataset.mode = "content";
        const s = screen();
        if(s){
          s.hidden = false;
          s.style.display = "block";
        }
        setTimeout(()=>{
          markContentActive();
          bindCards();
        }, 0);
      };
      content.addEventListener("touchstart", h, {capture:true, passive:false});
      content.addEventListener("click", h, true);
    }

    if(!dict.dataset.v134Leave){
      dict.dataset.v134Leave = "1";
      const h = ()=>{
        document.body.classList.remove("mode-content");
        if(document.body.dataset.mode === "content") document.body.dataset.mode = "";
        const s = screen();
        if(s) s.hidden = true;
        try { appMode = "dictionary"; if(typeof render === "function") render("flash"); } catch(e){}
      };
      dict.addEventListener("touchstart", h, {capture:true, passive:true});
      dict.addEventListener("click", h, true);
    }

    if(!card.dataset.v134Leave){
      card.dataset.v134Leave = "1";
      const h = ()=>{
        document.body.classList.remove("mode-content");
        if(document.body.dataset.mode === "content") document.body.dataset.mode = "";
        const s = screen();
        if(s) s.hidden = true;
        try { appMode = "cards"; if(typeof render === "function") render("flash"); } catch(e){}
      };
      card.addEventListener("touchstart", h, {capture:true, passive:true});
      card.addEventListener("click", h, true);
    }
  }

  function bindScroll(){
    const s = screen();
    if(!s || s.dataset.v134Scroll) return;
    s.dataset.v134Scroll = "1";
    s.addEventListener("scroll", ()=>{
      scrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(()=>{ scrolling = false; }, 320);
    }, {passive:true});
  }

  function boot(){
    bindTop();
    bindCards();
    bindScroll();
    markContentActive();

    let n = 0;
    const timer = setInterval(()=>{
      n++;
      bindTop();
      bindCards();
      bindScroll();
      markContentActive();
      if(n > 10) clearInterval(timer);
    }, 250);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();



/* v135: safer content tap + active content tab + hide binder leftovers */
(function(){
  let sx = 0;
  let sy = 0;
  let startTime = 0;
  let moved = false;
  let scrolling = false;
  let scrollTimer = null;
  let lastScrollAt = 0;

  function isContentMode(){
    return document.body.classList.contains("mode-content") || document.body.dataset.mode === "content";
  }

  function screen(){
    return document.getElementById("contentScreenV127");
  }

  function topButtons(){
    return Array.from(document.querySelectorAll("button"))
      .filter(b=>{
        const t=(b.textContent||"").replace(/\s+/g,"").trim();
        return ["辞書","カード","コンテンツ"].includes(t);
      })
      .filter(b=>b.offsetParent !== null)
      .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top || a.getBoundingClientRect().left-b.getBoundingClientRect().left)
      .slice(0,3);
  }

  function markTabs(){
    const btns = topButtons();
    if(btns.length < 3) return;
    const [dict, card, content] = btns;

    dict.classList.add("dict-tab-v135");
    card.classList.add("card-tab-v135");
    content.classList.add("content-tab-v135");

    dict.textContent = "辞書";
    card.textContent = "カード";
    content.textContent = "コンテンツ";

    if(isContentMode()){
      dict.classList.remove("active");
      card.classList.remove("active");
      content.classList.add("active");
      dict.setAttribute("aria-pressed","false");
      card.setAttribute("aria-pressed","false");
      content.setAttribute("aria-pressed","true");
    }else{
      content.classList.remove("active");
    }
  }

  function hideLeftovers(){
    if(!isContentMode()) return;

    Array.from(document.querySelectorAll("button,div,span,p")).forEach(el=>{
      if(el.closest("#contentScreenV127")) return;
      if(el.classList.contains("dict-tab-v135") || el.classList.contains("card-tab-v135") || el.classList.contains("content-tab-v135")) return;

      const txt = (el.textContent||"").trim();
      const label = (el.getAttribute("aria-label")||"").toLowerCase();
      const id = (el.id||"").toLowerCase();
      const cls = (el.className||"").toString().toLowerCase();

      const looksPager = /^(\d+\/\d+\s*[・•]\s*)?\d+\/\d+$/.test(txt) || /^\d+\/\d+\s*[・•]\s*\d+\/\d+$/.test(txt);
      const looksBinder = txt === "📘" || label.includes("binder") || label.includes("バインダー") || id.includes("binder") || cls.includes("binder");

      if(looksPager || looksBinder){
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
    });
  }

  function openDetail(el){
    const title = el.querySelector(".content-title-v127")?.textContent || "作品";
    const status = el.querySelector(".content-status-v127")?.textContent || "";
    alert(`${title}\n${status}\n\n次：作品詳細画面を接続`);
  }

  function bindCards(){
    const s = screen();
    if(!s) return;

    s.querySelectorAll(".content-card-v127").forEach(old=>{
      if(old.dataset.v135Bound) return;

      const el = old.cloneNode(true);
      old.parentNode.replaceChild(el, old);
      el.dataset.v135Bound = "1";
      el.onclick = null;

      el.addEventListener("touchstart", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX;
        sy = t.clientY;
        startTime = Date.now();
        moved = false;
      }, {capture:true, passive:true});

      el.addEventListener("touchmove", ev=>{
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        const dx = Math.abs(t.clientX - sx);
        const dy = Math.abs(t.clientY - sy);
        if(dx > 8 || dy > 8){
          moved = true;
          scrolling = true;
          lastScrollAt = Date.now();
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(()=>{ scrolling = false; }, 450);
        }
      }, {capture:true, passive:true});

      el.addEventListener("touchend", ev=>{
        const duration = Date.now() - startTime;
        const sinceScroll = Date.now() - lastScrollAt;

        if(moved || scrolling || duration < 140 || duration > 650 || sinceScroll < 420){
          moved = false;
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
        openDetail(el);
      }, {capture:true, passive:false});

      el.addEventListener("click", ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
      }, true);
    });
  }

  function bindScroll(){
    const s = screen();
    if(!s || s.dataset.v135Scroll) return;
    s.dataset.v135Scroll = "1";

    s.addEventListener("scroll", ()=>{
      scrolling = true;
      lastScrollAt = Date.now();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(()=>{ scrolling = false; }, 450);
    }, {passive:true});

    s.addEventListener("touchmove", ev=>{
      ev.stopPropagation();
      ev.stopImmediatePropagation?.();
    }, {capture:true, passive:true});
  }

  function bindTop(){
    const btns = topButtons();
    if(btns.length < 3) return;
    const [dict, card, content] = btns;

    if(!content.dataset.v135Content){
      content.dataset.v135Content = "1";
      const h = ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        document.body.classList.add("mode-content");
        document.body.dataset.mode = "content";

        const s = screen();
        if(s){
          s.hidden = false;
          s.style.display = "block";
        }

        setTimeout(()=>{
          markTabs();
          hideLeftovers();
          bindCards();
          bindScroll();
        }, 0);
      };
      content.addEventListener("touchstart", h, {capture:true, passive:false});
      content.addEventListener("click", h, true);
    }

    if(!dict.dataset.v135Leave){
      dict.dataset.v135Leave = "1";
      const h = ()=>{
        document.body.classList.remove("mode-content");
        if(document.body.dataset.mode === "content") document.body.dataset.mode = "";
        const s = screen();
        if(s) s.hidden = true;
        try { appMode = "dictionary"; if(typeof render === "function") render("flash"); } catch(e){}
        setTimeout(markTabs, 0);
      };
      dict.addEventListener("touchstart", h, {capture:true, passive:true});
      dict.addEventListener("click", h, true);
    }

    if(!card.dataset.v135Leave){
      card.dataset.v135Leave = "1";
      const h = ()=>{
        document.body.classList.remove("mode-content");
        if(document.body.dataset.mode === "content") document.body.dataset.mode = "";
        const s = screen();
        if(s) s.hidden = true;
        try { appMode = "cards"; if(typeof render === "function") render("flash"); } catch(e){}
        setTimeout(markTabs, 0);
      };
      card.addEventListener("touchstart", h, {capture:true, passive:true});
      card.addEventListener("click", h, true);
    }
  }

  function boot(){
    bindTop();
    bindCards();
    bindScroll();
    markTabs();
    hideLeftovers();

    let n = 0;
    const timer = setInterval(()=>{
      n++;
      bindTop();
      bindCards();
      bindScroll();
      markTabs();
      hideLeftovers();
      if(n > 12) clearInterval(timer);
    }, 300);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();

/* v136: minimal hotfix - card center binder + content tap select only */
(function(){
  let selectedContentIndexV136 = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let didMove = false;

  function isCardMode(){
    try { return appMode === "cards" || document.body.classList.contains("mode-cards") || document.body.dataset.mode === "cards"; }
    catch(e){ return document.body.classList.contains("mode-cards") || document.body.dataset.mode === "cards"; }
  }

  function isContentMode(){
    return document.body.classList.contains("mode-content") || document.body.dataset.mode === "content";
  }

  function openBinderV136(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    }

    const modal = document.getElementById("binderModal");
    if(!modal) return;

    try {
      if(typeof window.renderBinder === "function") window.renderBinder();
    } catch(_) {}

    modal.style.display = "block";
  }

  function bindCardCenterBinder(){
    const btn = document.getElementById("randomWord");
    if(!btn || !isCardMode()) return;

    if(!btn.dataset.v136CardBinder){
      const clone = btn.cloneNode(true);
      clone.id = "randomWord";
      clone.dataset.v136CardBinder = "1";
      clone.textContent = "📘";
      clone.setAttribute("aria-label", "バインダーを開く");
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener("click", openBinderV136, true);
      clone.addEventListener("touchend", openBinderV136, {capture:true, passive:false});
      return;
    }

    if(btn.textContent !== "📘") btn.textContent = "📘";
    btn.onclick = openBinderV136;
  }

  function selectContentCard(card){
    if(!card) return;
    const screen = document.getElementById("contentScreenV127");
    selectedContentIndexV136 = Number(card.dataset.index || 0);
    window.selectedContentIndex = selectedContentIndexV136;

    if(screen){
      screen.querySelectorAll(".content-card-v127").forEach(el=>{
        el.classList.toggle("selected-v136", el === card);
        el.setAttribute("aria-selected", el === card ? "true" : "false");
      });
    }
  }

  function bindContentTapSelect(){
    const screen = document.getElementById("contentScreenV127");
    if(!screen || screen.dataset.v136ContentSelect) return;
    screen.dataset.v136ContentSelect = "1";

    screen.addEventListener("pointerdown", e=>{
      if(!isContentMode() || !e.target.closest(".content-card-v127")) return;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      didMove = false;
    }, true);

    screen.addEventListener("pointermove", e=>{
      if(!isContentMode()) return;
      if(Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) didMove = true;
    }, true);

    screen.addEventListener("pointerup", e=>{
      if(!isContentMode()) return;
      const card = e.target.closest(".content-card-v127");
      if(!card) return;

      const duration = Date.now() - startTime;
      if(didMove || duration > 700) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      selectContentCard(card);
    }, true);

    screen.addEventListener("click", e=>{
      if(!isContentMode()) return;
      const card = e.target.closest(".content-card-v127");
      if(!card) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      selectContentCard(card);
    }, true);
  }

  function apply(){
    bindCardCenterBinder();
    bindContentTapSelect();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();

  let __applyRuns = 0;
  const __applyTimer = setInterval(() => {
    __applyRuns++;
    apply();
    if (__applyRuns >= 12) clearInterval(__applyTimer);
  }, 250);

  if(typeof render === "function" && !render.__v136MinimalHotfix){
    const originalRender = render;
    render = function(){
      const result = originalRender.apply(this, arguments);
      setTimeout(apply, 0);
      return result;
    };
    render.__v136MinimalHotfix = true;
  }
})();

/* v137: fix card-mode 📘 center button + temporary content tap popup */
(function(){
  let sx = 0;
  let sy = 0;
  let moved = false;
  let startedAt = 0;
  let lastPopupAt = 0;

  function isCardMode(){
    try { return appMode === "cards" || document.body.classList.contains("mode-cards") || document.body.dataset.mode === "cards"; }
    catch(_) { return document.body.classList.contains("mode-cards") || document.body.dataset.mode === "cards"; }
  }

  function isContentMode(){
    return document.body.classList.contains("mode-content") || document.body.dataset.mode === "content";
  }

  function openBinderV137(ev){
    if(!isCardMode()) return;
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    const modal = document.getElementById("binderModal");
    if(!modal) return;
    try { if(typeof window.renderBinder === "function") window.renderBinder(); } catch(_) {}
    modal.style.display = "block";
  }

  function fixCardCenterButton(){
    const btn = document.getElementById("randomWord");
    if(!btn || !isCardMode()) return;
    btn.textContent = "📘";
    btn.setAttribute("aria-label", "バインダーを開く");
    btn.dataset.v137Binder = "1";
    if(!btn.__v137BinderClick){
      btn.addEventListener("click", openBinderV137, true);
      btn.addEventListener("touchend", openBinderV137, {capture:true, passive:false});
      btn.__v137BinderClick = true;
    }
  }

  function contentTitle(card){
    return card.querySelector(".content-title-v127")?.textContent?.trim() ||
      card.querySelector("h2,h3,strong")?.textContent?.trim() ||
      "コンテンツカード";
  }

  function selectAndPopup(card, ev){
    if(!card || !isContentMode()) return;
    const now = Date.now();
    if(now - lastPopupAt < 450) return;
    lastPopupAt = now;

    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }

    const screen = document.getElementById("contentScreenV127");
    if(screen){
      screen.querySelectorAll(".content-card-v127").forEach(el=>{
        const selected = el === card;
        el.classList.toggle("selected-v136", selected);
        el.classList.toggle("selected-v137", selected);
        el.setAttribute("aria-selected", selected ? "true" : "false");
      });
    }

    const idx = Number(card.dataset.index || 0);
    window.selectedContentIndex = idx;
    window.selectedContentCard = card;

    alert("コンテンツカードを選択しました\n" + contentTitle(card));
  }

  function bindContentCards(){
    const screen = document.getElementById("contentScreenV127");
    if(!screen) return;

    screen.querySelectorAll(".content-card-v127").forEach(card=>{
      if(card.__v137ContentPopup) return;
      card.__v137ContentPopup = true;

      card.addEventListener("touchstart", ev=>{
        if(!isContentMode()) return;
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        sx = t.clientX;
        sy = t.clientY;
        moved = false;
        startedAt = Date.now();
      }, {capture:true, passive:true});

      card.addEventListener("touchmove", ev=>{
        if(!isContentMode()) return;
        const t = ev.changedTouches && ev.changedTouches[0];
        if(!t) return;
        if(Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) moved = true;
      }, {capture:true, passive:true});

      card.addEventListener("touchend", ev=>{
        if(!isContentMode()) return;
        const duration = Date.now() - startedAt;
        if(moved || duration > 700) return;
        selectAndPopup(card, ev);
      }, {capture:true, passive:false});

      card.addEventListener("pointerdown", ev=>{
        if(!isContentMode()) return;
        sx = ev.clientX;
        sy = ev.clientY;
        moved = false;
        startedAt = Date.now();
      }, true);

      card.addEventListener("pointermove", ev=>{
        if(!isContentMode()) return;
        if(Math.abs(ev.clientX - sx) > 10 || Math.abs(ev.clientY - sy) > 10) moved = true;
      }, true);

      card.addEventListener("pointerup", ev=>{
        if(!isContentMode()) return;
        const duration = Date.now() - startedAt;
        if(moved || duration > 700) return;
        selectAndPopup(card, ev);
      }, true);

      card.addEventListener("click", ev=>{
        if(!isContentMode()) return;
        selectAndPopup(card, ev);
      }, true);
    });
  }

  function apply(){
    fixCardCenterButton();
    bindContentCards();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();

  let __applyRuns = 0;
  const __applyTimer = setInterval(() => {
    __applyRuns++;
    apply();
    if (__applyRuns >= 12) clearInterval(__applyTimer);
  }, 250);

  if(typeof render === "function" && !render.__v137Fix){
    const originalRender = render;
    render = function(){
      const result = originalRender.apply(this, arguments);
      setTimeout(apply, 0);
      setTimeout(apply, 80);
      return result;
    };
    render.__v137Fix = true;
  }
})();


/* v19: legacy favorite IIFE removed */




/* v19: legacy favorite IIFE removed */




/* v19: legacy favorite IIFE removed */




/* v19: legacy favorite IIFE removed */




/* v139: restore conference after external link return */
(function(){
  if(window.__meganeExternalReturnV139) return;
  window.__meganeExternalReturnV139 = true;

  const KEY = "megane_external_return_state_v139";
  const MAX_AGE = 1000 * 60 * 20; // 20分以内だけ復帰対象

  function saveState(reason){
    try{
      const state = {
        reason: reason || "external-link",
        savedAt: Date.now(),
        appMode: (typeof appMode !== "undefined" ? appMode : ""),
        mangaState: (typeof mangaState !== "undefined" ? mangaState : ""),
        mangaReadMode: (typeof mangaReadMode !== "undefined" ? mangaReadMode : ""),
        mangaStoryIndex: (typeof mangaStoryIndex !== "undefined" ? mangaStoryIndex : 0),
        selectedMangaIndex: (typeof selectedMangaIndex !== "undefined" ? selectedMangaIndex : 0),
        mangaPageIndex: (typeof mangaPageIndex !== "undefined" ? mangaPageIndex : 0)
      };

      // 今回は会議室復帰が目的。会議再生画面以外では強制しない。
      if(state.appMode !== "manga" || state.mangaState !== "reader") return;

      localStorage.setItem(KEY, JSON.stringify(state));
    }catch(e){}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      const s = JSON.parse(raw);
      if(!s || !s.savedAt || Date.now() - s.savedAt > MAX_AGE){
        localStorage.removeItem(KEY);
        return null;
      }
      return s;
    }catch(e){
      return null;
    }
  }

  function restoreState(){
    try{
      const s = loadState();
      if(!s) return;

      // すでに会議室なら何もしない。
      if(typeof appMode !== "undefined" && appMode === "manga" &&
         typeof mangaState !== "undefined" && mangaState === "reader"){
        return;
      }

      if(typeof appMode !== "undefined") appMode = "manga";
      if(typeof mangaState !== "undefined") mangaState = "reader";
      if(typeof mangaReadMode !== "undefined") mangaReadMode = s.mangaReadMode || "page";
      if(typeof mangaStoryIndex !== "undefined") mangaStoryIndex = Number(s.mangaStoryIndex || 0);
      if(typeof selectedMangaIndex !== "undefined") selectedMangaIndex = Number(s.selectedMangaIndex || s.mangaStoryIndex || 0);
      if(typeof mangaPageIndex !== "undefined") mangaPageIndex = Number(s.mangaPageIndex || 0);

      if(typeof render === "function") render("flash");

      // 復帰に成功したら一回で消す。次回起動で会議へ固定される事故を防ぐ。
      setTimeout(()=>{ try{ localStorage.removeItem(KEY); }catch(e){} }, 400);
    }catch(e){}
  }

  function isExternalAnchor(a){
    if(!a || !a.href) return false;
    try{
      const u = new URL(a.href, location.href);
      if(u.protocol !== "http:" && u.protocol !== "https:") return false;
      return u.origin !== location.origin || a.target === "_blank";
    }catch(e){
      return false;
    }
  }

  function bindExternalSaver(){
    document.addEventListener("click", function(e){
      const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if(isExternalAnchor(a)) saveState("external-anchor-click");
    }, true);

    window.addEventListener("pagehide", function(){ saveState("pagehide"); });
    window.addEventListener("blur", function(){ saveState("blur"); });
  }

  function boot(){
    bindExternalSaver();

    // 初期化・復帰の両方に対応。iOSの戻り方に合わせて複数回軽く試す。
    setTimeout(restoreState, 120);
    setTimeout(restoreState, 450);
    setTimeout(restoreState, 1000);

    window.addEventListener("pageshow", function(){ setTimeout(restoreState, 80); });
    window.addEventListener("focus", function(){ setTimeout(restoreState, 120); });
    document.addEventListener("visibilitychange", function(){
      if(!document.hidden) setTimeout(restoreState, 120);
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
