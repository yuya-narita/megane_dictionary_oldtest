/* 80_favorites_singleton.js
   お気に入り機能・完全Singleton v2
   旧処理のイベント後追いを止め、保存/表示/星をこの1本に固定する
*/
(() => {
  "use strict";

  const MAIN_KEY = "meganeFavoritesV65";
  const SELF_KEY = "meganeSelfFavoritesV1";
  const DEF_KEY = "megane_user_definitions_single_by_word_v1";
  const PROFILE_KEY = "megane_user_profile_v1";

  const q = id => document.getElementById(id);
  const read = (k,d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)) || d; } catch(_) { return d; } };
  const write = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {} };
  const esc = s => String(s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const wk = w => encodeURIComponent(w || "");

  let busyStarUntil = 0;
  let swallowStarUntil = 0;
  let busyOpenUntil = 0;

  function stop(e){
    if(!e) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function getWord(){
    try { if(typeof currentWord === "function"){ const w=currentWord(); if(w && w.word) return String(w.word); } } catch(_){}
    const el=q("word"); return el ? el.textContent.trim() : "";
  }

  function getProfile(){
    const p=read(PROFILE_KEY,{});
    return {
      name:String(p.name||p.nickname||"YOU").trim()||"YOU",
      glassName:String(p.glassName||"自分メガネ").trim()||"自分メガネ"
    };
  }

  function getSelfDef(w){
    const d = read(DEF_KEY,{})[wk(w)];
    return d && d.text ? String(d.text) : "";
  }

  function isSelfCard(){
    const body=!!(document.body && document.body.classList && document.body.classList.contains("self-glass-active"));
    const g=q("glassName");
    const visible=!!(g && g.textContent.indexOf("自分メガネ") >= 0);
    return body || visible;
  }

  function load(){
    return read(MAIN_KEY, []).filter(f => f && f.key);
  }

  function save(list){
    const map = new Map();
    list.filter(f => f && f.key).forEach(f => {
      let k = f.key;
      if(f.type === "selfdict"){
        k = "selfdict_dedupe:" + (f.baseKey || ("selfdict:" + wk(f.word || f.title || ""))) + ":" + String(f.text || "").trim();
      }
      if(!map.has(k)) map.set(k, f);
    });
    write(MAIN_KEY, Array.from(map.values()));
  }

  function migrate(){
    let list = load().map(f => {
      if(!f) return f;
      const x = Object.assign({}, f);
      // 自分カードの旧keyはそのまま使うが、同一key重複は後で1件にまとめる。
      if(x.type === "dict" && !String(x.key || "").startsWith("dict:")){
        x.key = "dict:" + (x.glassId || x.glassName || "unknown") + ":" + (x.word || x.title || "");
      }
      if(x.type === "selfdict"){
        const base = "selfdict:" + wk(x.word || x.title || "");
        x.baseKey = x.baseKey || base;
        if(!String(x.key || "").startsWith("selfdict:")) x.key = base + ":" + (x.savedAt || Date.now());
        if(x.key === base) x.key = base + ":" + (x.savedAt || Date.now());
      }
      return x;
    });
    const self = read(SELF_KEY, []);
    let changed = false;

    if(Array.isArray(self) && self.length){
      self.forEach(f => {
        if(f && f.key && !list.some(x => x.key === f.key)){
          const base = f.baseKey || ("selfdict:" + wk(f.word || f.title || ""));
          const savedAt = f.savedAt || Date.now();
          list.unshift(Object.assign({}, f, { type:"selfdict", baseKey:base, key:(f.key === base ? base + ":" + savedAt : (f.key || base + ":" + savedAt)), savedAt }));
          changed = true;
        }
      });
      write(SELF_KEY, []);
    }

    const defs = read(DEF_KEY, {});
    list = list.filter(f => {
      if(f.type !== "selfdict") return true;
      const w = f.word || f.title || "";
      return !!(defs[wk(w)] || defs[w]);
    });

    if(changed) save(list);
    return list;
  }

  function currentSelfItem(){
    const w = getWord();
    const text = getSelfDef(w);
    if(!w || !text || !isSelfCard()) return null;
    const p = getProfile();
    return {
      key:"selfdict:"+wk(w)+":"+Date.now(),
      baseKey:"selfdict:"+wk(w),
      type:"selfdict",
      title:w,
      meta:p.name+"｜"+text,
      word:w,
      userName:p.name,
      text:text,
      savedAt:Date.now()
    };
  }

  function currentDictItem(){
    try{
      if(typeof appMode !== "undefined" && appMode !== "dictionary") return null;
      if(isSelfCard()) return currentSelfItem();

      const w = typeof currentWord === "function" ? currentWord() : null;
      const g = typeof currentGlass === "function" ? currentGlass() : null;
      if(!w || !g || !w.word) return null;

      let text = "";
      if(w.definitions && g.id && w.definitions[g.id]){
        const d = w.definitions[g.id];
        text = String(d.text || d.translation || d.definition || d || "");
      }
      if(!text && w.translations && g.id && w.translations[g.id]){
        const d = w.translations[g.id];
        text = String(d.text || d.translation || d.definition || d || "");
      }
      if(!text && w.glasses && g.id && w.glasses[g.id]){
        const d = w.glasses[g.id];
        text = String(d.text || d.translation || d.definition || d || "");
      }
      if(!text && g.id && w[g.id]){
        const d = w[g.id];
        text = String(d.text || d.translation || d.definition || d || "");
      }
      if(!text){
        const defEl = q("definition") || q("wordDefinition") || q("translation");
        text = defEl ? defEl.textContent.trim() : "";
      }
      if(!text) return null;

      return {
        key:"dict:"+g.id+":"+w.word,
        type:"dict",
        title:w.word,
        meta:(g.name||"辞書")+"｜"+text,
        word:w.word,
        glassId:g.id,
        glassName:g.name||"",
        savedAt:Date.now()
      };
    }catch(e){
      return null;
    }
  }

  function isOn(item){
    if(!item) return false;
    if(item.type === "selfdict"){
      const base = item.baseKey || ("selfdict:" + wk(item.word || item.title || ""));
      const text = String(item.text || "").trim();
      return load().some(f =>
        f && f.type === "selfdict" &&
        (f.baseKey === base || f.word === item.word) &&
        String(f.text || "").trim() === text
      );
    }
    return load().some(f => f.key === item.key);
  }

  function toggleCurrent(){
    const item = currentDictItem();
    if(!item) return false;
    migrate();
    let list = load();
    const wasOn = isOn(item);

    // 先に見た目を反応させる。体感遅延対策。
    const btn=q("favoriteToggle");
    if(btn){
      btn.hidden=false;
      btn.classList.toggle("active", !wasOn);
      btn.textContent = !wasOn ? "★" : "☆";
    }

    if(item.type === "selfdict"){
      const base = item.baseKey || ("selfdict:" + wk(item.word || item.title || ""));
      const text = String(item.text || "").trim();
      const sameSelf = f =>
        f && f.type === "selfdict" &&
        (f.baseKey === base || f.word === item.word) &&
        String(f.text || "").trim() === text;

      if(wasOn){
        // 自分カードはkeyが保存時刻つきなので、現在item.keyでは消せない。
        // 同じ単語＋同じ定義で削除する。
        list = list.filter(f => !sameSelf(f));
      }else{
        const savedAt = Date.now();
        list = list.filter(f => !sameSelf(f));
        list.unshift(Object.assign({}, item, { key: base + ":" + savedAt, baseKey: base, savedAt }));
      }
    }else if(wasOn){
      list = list.filter(f => f.key !== item.key);
    }else{
      list.unshift(Object.assign({}, item, { savedAt:Date.now() }));
    }
    save(list);

    // 保存・解除が完了した時点を計測。定義本文やユーザー名は送らない。
    try {
      if (typeof window.meganeTrack === "function") {
        window.meganeTrack(wasOn ? "favorite_remove" : "favorite_add", {
          word: String(item.word || item.title || ""),
          glass: item.type === "selfdict" ? "自分メガネ" : String(item.glassName || item.glassId || "")
        });
      }
    } catch (_) {}

    // モーダルが開いている時だけ再描画。普段は星だけ更新してチラつきを避ける。
    const d=q("favoriteDialog");
    if(d && d.open) renderList();
    setTimeout(updateStar, 60);
    return true;
  }

  function updateStar(){
    const btn=q("favoriteToggle");
    if(!btn) return;
    const item = currentDictItem();
    if(!item){
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    const active = isOn(item);
    btn.classList.toggle("active", active);
    btn.textContent = active ? "★" : "☆";
  }

  function sorted(){
    const map = new Map();
    migrate().forEach(f => {
      if(!f || !f.key) return;
      let k = f.key;
      if(f.type === "selfdict"){
        k = "selfdict_dedupe:" + (f.baseKey || ("selfdict:" + wk(f.word || f.title || ""))) + ":" + String(f.text || "").trim();
      }
      const old = map.get(k);
      if(!old || Number(f.savedAt || 0) > Number(old.savedAt || 0)) map.set(k, f);
    });
    return Array.from(map.values()).sort((a,b) => Number(b.savedAt||0) - Number(a.savedAt||0));
  }


  function cleanMeta(item){
    let meta = String(item.meta || "");
    if(item.type === "dict"){
      const g = String(item.glassName || "");
      const prefixes = [
        g + "｜" + g + "｜",
        g + "｜",
        "辞書｜" + g + "｜",
        "辞書｜"
      ].filter(Boolean);
      prefixes.forEach(p => {
        while(meta.indexOf(p) === 0) meta = meta.slice(p.length);
      });
      return meta;
    }
    if(item.type === "selfdict"){
      const u = String(item.userName || "YOU");
      const prefixes = [
        u + "｜" + u + "｜",
        u + "｜",
        "自分辞書｜" + u + "｜",
        "自分辞書｜"
      ];
      prefixes.forEach(p => {
        while(meta.indexOf(p) === 0) meta = meta.slice(p.length);
      });
      return meta;
    }
    return meta;
  }

  function renderList(){
    const el=q("favoriteList");
    if(!el) return;

    const list = sorted();
    el.classList.add("favorite-list");
    if(!list.length){
      el.innerHTML = '<div class="favorite-empty">まだお気に入りはありません</div>';
      return;
    }

    el.innerHTML = list.map(item => {
      const isSelf = item.type === "selfdict";
      const label = isSelf ? (item.userName || "YOU") : (item.glassName || "辞書");
      return '<button type="button" class="favorite-item fav-singleton-row" data-key="'+esc(item.key)+'" '+(isSelf?'data-selfdict="1"':'')+'>'+
        '<span class="favorite-item-title">'+esc(item.title || item.word || "Untitled")+'</span>'+
        '<span class="favorite-item-meta">'+esc(label)+'｜'+esc(cleanMeta(item))+'</span>'+
      '</button>';
    }).join("");

    bindRows(el);
  }

  function findItem(key){
    return sorted().find(f => f.key === key);
  }

  function closeDialog(){
    const d=q("favoriteDialog");
    try { if(d && d.open && d.close) d.close(); } catch(_) { if(d) d.removeAttribute("open"); }
  }

  function onCloseFavorites(e){
    const btn=e && e.target && e.target.closest ? e.target.closest("#favoriteDialogClose") : null;
    if(!btn) return;
    stop(e);
    closeDialog();
    return false;
  }

  function jump(item){
    if(!item) return;
    window.__FAV_SINGLETON_ALLOW_JUMP = Date.now() + 900;
    try{
      if(item.type === "selfdict"){
        if(typeof appMode !== "undefined") appMode = "dictionary";
        if(window.MEGANE_SELF_GLASS && typeof window.MEGANE_SELF_GLASS.openWord === "function"){
          window.MEGANE_SELF_GLASS.openWord(item.word || item.title);
        }
      }else if(item.type === "dict"){
        if(typeof appMode !== "undefined") appMode = "dictionary";
        try{
          if(window.MEGANE_SELF_GLASS && typeof window.MEGANE_SELF_GLASS.leave === "function") window.MEGANE_SELF_GLASS.leave();
          if(document.body && document.body.classList) document.body.classList.remove("self-glass-active");
          if(typeof selfActive !== "undefined") selfActive = false;
        }catch(_){}
        if(typeof data !== "undefined" && data.words && data.glasses){
          const wi=data.words.findIndex(w => w.word === item.word);
          const gi=data.glasses.findIndex(g => g.id === item.glassId || g.name === item.glassName);
          if(wi >= 0) wordIndex = wi;
          if(gi >= 0) glassIndex = gi;
        }
        if(typeof render === "function") render("flash");
      }
      closeDialog();
      setTimeout(updateStar, 0);
    }catch(e){
      console.warn("[fav singleton jump]", e);
    }
  }

  function removeKey(key){
    save(load().filter(f => f && f.key !== key));
    updateStar();

    // すぐ全体再描画すると、旧イベント/transition残りで自分カード群が一瞬全部消える。
    // まず対象行だけDOMから消し、少し遅らせて一覧を正本から描き直す。
    const el=q("favoriteList");
    let row=null;
    if(el){
      el.querySelectorAll(".fav-singleton-row").forEach(r => {
        if(r.dataset && r.dataset.key === key) row = r;
      });
    }
    if(row) row.remove();

    setTimeout(renderList, 260);
  }

  function bindRows(el){
    el.querySelectorAll(".fav-singleton-row").forEach(row => {
      if(row.dataset.singletonBound) return;
      row.dataset.singletonBound = "1";
      let timer=0, sx=0, sy=0, dx=0, dy=0, moved=false;
      const pt=e => {
        const t=e.changedTouches && e.changedTouches[0];
        return t ? {x:t.clientX,y:t.clientY} : {x:e.clientX||0,y:e.clientY||0};
      };
      let suppressUntil = 0;
      const clear=()=>{ if(timer) clearTimeout(timer); timer=0; };
      const reset=()=>{ row.style.transform=""; row.style.opacity=""; row.classList.remove("delete-armed"); };

      const start=e=>{
        const p=pt(e); sx=p.x; sy=p.y; dx=dy=0; moved=false; clear(); reset();
        timer=setTimeout(() => { if(!moved && Math.abs(dx) < 8 && Math.abs(dy) < 8) jump(findItem(row.dataset.key)); }, 520);
      };
      const move=e=>{
        const p=pt(e); dx=p.x-sx; dy=p.y-sy;
        if(Math.abs(dx)>6 || Math.abs(dy)>6){ moved=true; clear(); }
        if(dx < -24 && Math.abs(dx) > Math.abs(dy)*1.2){
          suppressUntil = Date.now() + 500;
          stop(e);
          const w = row.getBoundingClientRect().width;
          row.style.transform = "translateX(" + Math.max(dx, -(w * 0.98)) + "px)";
          row.style.opacity = String(Math.max(.55, 1 + dx/320));
          row.classList.toggle("delete-armed", Math.abs(dx) > Math.max(220, w * 0.72));
        }
      };
      const end=e=>{
        clear();
        const threshold = Math.max(280, row.getBoundingClientRect().width * 0.85);
        if(dx < -threshold){
          stop(e);
          suppressUntil = Date.now() + 900;
          const key=row.dataset.key;
          row.dataset.removing="1";
          row.style.transform="translateX(-120%)";
          row.style.opacity="0";
          setTimeout(()=>removeKey(key),180);
          return false;
        }
        reset();
        if(moved || Math.abs(dx) > 8 || Math.abs(dy) > 8 || Date.now() < suppressUntil){
          // スワイプ操作後は絶対に単語カードへ移動しない
          stop(e);
          suppressUntil = Date.now() + 500;
          return false;
        }
        // 短タップは何もしない。移動は長押しのみ。
        stop(e);
      };
      row.addEventListener("pointerdown", start, {capture:true, passive:true});
      row.addEventListener("touchstart", start, {capture:true, passive:true});
      row.addEventListener("pointermove", move, {capture:true, passive:false});
      row.addEventListener("touchmove", move, {capture:true, passive:false});
      row.addEventListener("pointerup", end, {capture:true, passive:false});
      row.addEventListener("touchend", end, {capture:true, passive:false});
      row.addEventListener("click", e => {
        stop(e);
        return false;
      }, {capture:true, passive:false});
      row.addEventListener("pointercancel", reset, {capture:true, passive:true});
      row.addEventListener("touchcancel", reset, {capture:true, passive:true});
    });
  }

  function openFavorites(e){
    stop(e);
    if(Date.now() < busyOpenUntil) return false;
    busyOpenUntil = Date.now() + 350;

    const d=q("favoriteDialog");
    if(d){
      try { if(d.showModal && !d.open) d.showModal(); else d.setAttribute("open",""); }
      catch(_) { d.setAttribute("open",""); }
    }
    // 旧処理が同時にinnerHTMLを書いても、最後に1回だけSingleton表示へ戻す。
    requestAnimationFrame(() => requestAnimationFrame(renderList));
    return false;
  }

  function onStar(e){
    const btn=e.target && e.target.closest ? e.target.closest("#favoriteToggle") : null;
    if(!btn) return;
    const item = currentDictItem();
    if(!item) return;

    stop(e);

    // iOS/PWAでpointerdownが落ちることがあるため、最初に来たイベントで確実に処理する。
    if(Date.now() < swallowStarUntil) return false;
    busyStarUntil = Date.now() + 120;
    swallowStarUntil = Date.now() + 520;
    toggleCurrent();
    return false;
  }

  function onOpen(e){
    const btn=e.target && e.target.closest ? e.target.closest("#randomWord,#randomWordFixed,#favoriteListOpen") : null;
    if(!btn) return;
    try { if(document.body.classList.contains("mode-cards")) return; } catch(_) {}

    // production143:
    // 音楽・会議では辞書お気に入りを開かず、
    // モード専用のお気に入り処理へ委譲する。
    try{
      if(typeof window.MEGANE_MODE_FAVORITES_OPEN === "function"){
        const handled = window.MEGANE_MODE_FAVORITES_OPEN(e);
        if(handled === true) return false;
      }
    }catch(_){}

    return openFavorites(e);
  }

  function overrideKnownButtons(){
    let star=q("favoriteToggle");
    if(star && !star.dataset.singletonCloned){
      const clone = star.cloneNode(true);
      clone.dataset.singletonCloned = "1";
      star.parentNode.replaceChild(clone, star);
      star = clone;
    }
    if(star && !star.dataset.singletonOverride){
      star.dataset.singletonOverride = "1";
      star.onclick = e => onStar(e);
      star.ontouchend = e => onStar(e);
      star.onpointerup = e => onStar(e);
      star.onpointerdown = e => onStar(e);
    }
    let center=q("randomWord");
    if(center && !center.dataset.singletonCloned){
      const clone = center.cloneNode(true);
      clone.dataset.singletonCloned = "1";
      center.parentNode.replaceChild(clone, center);
      center = clone;
    }
    if(center && !center.dataset.singletonOverride){
      center.dataset.singletonOverride = "1";
      center.onclick = e => onOpen(e);
      center.ontouchend = e => onOpen(e);
      center.onpointerup = e => onOpen(e);
      center.onpointerdown = e => onOpen(e);
    }

    let closeBtn=q("favoriteDialogClose");
    if(closeBtn && !closeBtn.dataset.singletonCloned){
      const clone = closeBtn.cloneNode(true);
      clone.dataset.singletonCloned = "1";
      closeBtn.parentNode.replaceChild(clone, closeBtn);
      closeBtn = clone;
    }
    if(closeBtn && !closeBtn.dataset.singletonOverride){
      closeBtn.dataset.singletonOverride = "1";
      closeBtn.onclick = e => onCloseFavorites(e);
      closeBtn.ontouchend = e => onCloseFavorites(e);
      closeBtn.onpointerup = e => onCloseFavorites(e);
      closeBtn.onpointerdown = e => onCloseFavorites(e);
    }
  }

  function cloneFavoriteListContainer(){
    const old = q("favoriteList");
    if(!old || old.dataset.singletonListCloned) return;
    const clone = old.cloneNode(false);
    clone.id = old.id;
    clone.className = old.className;
    clone.dataset.singletonListCloned = "1";
    old.parentNode.replaceChild(clone, old);
  }

  function install(){
    cloneFavoriteListContainer();
    migrate();

    window.renderFavoriteList = renderList;
    window.renderDictFavoriteList = renderList;
    window.toggleFavorite = toggleCurrent;
    window.MEGANE_FAVORITES_SINGLETON = {
      version:"v20",
      render:renderList,
      open:openFavorites,
      toggleCurrent,
      updateStar
    };

    window.addEventListener("pointerdown", onStar, true);
    window.addEventListener("touchend", onStar, {capture:true, passive:false});
    window.addEventListener("click", onStar, true);

    window.addEventListener("pointerdown", onOpen, true);
    window.addEventListener("touchend", onOpen, {capture:true, passive:false});
    window.addEventListener("click", onOpen, true);

    window.addEventListener("pointerdown", onCloseFavorites, true);
    window.addEventListener("touchend", onCloseFavorites, {capture:true, passive:false});
    window.addEventListener("click", onCloseFavorites, true);

    function hardStopFavoriteRows(e){
      const row = e.target && e.target.closest ? e.target.closest("#favoriteList .favorite-item") : null;
      if(!row) return;
      // bindRowsの長押し/スワイプ以外の旧ハンドラを止める
      if(e.type === "click"){
        stop(e);
        return false;
      }
    }
    window.addEventListener("click", hardStopFavoriteRows, true);


    overrideKnownButtons();
    setInterval(() => { overrideKnownButtons(); updateStar(); }, 1200);
    setTimeout(() => { overrideKnownButtons(); updateStar(); }, 100);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();