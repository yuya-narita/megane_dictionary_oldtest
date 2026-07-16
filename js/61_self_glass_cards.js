/* 61_self_glass_cards.js
   自分メガネ v35 + 184日後再観測 + 自分音声連携
   - ユーザー専用テーマ固定
   - 自分カードタップでキャラ音声が鳴る問題を抑制
   - メガネ選択内の自分メガネを通常タブ幅に統一
   - ニックネーム変更ボタン追加
   - 再観測タイムカプセルを自分カード描画へ直接統合
   - 110_something_weird.jsへ自分カードの表示・終了を通知
*/
(function(){
  "use strict";

  const DEF_KEY = "megane_user_definitions_single_by_word_v1";
  const PROFILE_KEY = "megane_user_profile_v1";
  const ENABLE_KEY = "megane_user_glass_enabled_v1";
  const SELF_FAV_KEY = "meganeSelfFavoritesV1";
  const REOBSERVE_KEY = "megane_reobserve_capsules_v2";
  const REOBSERVE_DAYS = 184;
  const REOBSERVE_DAY = 24 * 60 * 60 * 1000;
  const reobserveDismissed = new Set();
  let reobserveShowing = false;

  const q = (id) => document.getElementById(id);
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) || fallback) : fallback;
    } catch(e) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
  };
  const wk = (w) => encodeURIComponent(w || "");

  let selfActive = false;
  let lastKnownDefCount = 0;
  function isDictionary(){
    try { return typeof appMode !== "undefined" && appMode === "dictionary"; } catch(e) { return false; }
  }
  function getWords(){
    try { return (typeof data !== "undefined" && Array.isArray(data.words)) ? data.words : []; } catch(e) { return []; }
  }
  function getGlasses(){
    try { return (typeof data !== "undefined" && Array.isArray(data.glasses)) ? data.glasses : []; } catch(e) { return []; }
  }
  function getWordIndex(){ try { return Number(wordIndex || 0); } catch(e) { return 0; } }
  function setWordIndex(i){ try { wordIndex = Number(i); } catch(e) {} }
  function getGlassIndex(){ try { return Number(glassIndex || 0); } catch(e) { return 0; } }
  function setGlassIndex(i){ try { glassIndex = Number(i); } catch(e) {} }

  function currentWordText(){
    const words = getWords();
    const w = words[getWordIndex()];
    return w && w.word ? String(w.word) : (q("word") ? q("word").textContent.trim() : "");
  }
  function defs(){ return read(DEF_KEY, {}); }
  function getDef(word){ return defs()[wk(word)] || null; }
  function hasDef(word){
    const d = getDef(word);
    return !!(d && String(d.text || "").trim());
  }
  function defCount(){
    const d = defs();
    return Object.keys(d).filter(k => d[k] && String(d[k].text || "").trim()).length;
  }


  function reobserveItems(){ return read(REOBSERVE_KEY, []); }
  function saveReobserveItems(list){ write(REOBSERVE_KEY, list); }

  function activeReobserveFor(word){
    const key = wk(word);
    return reobserveItems().find(item =>
      item &&
      item.wordKey === key &&
      item.status === "waiting"
    ) || null;
  }

  function removeReobserveFor(word){
    const key = wk(word);
    saveReobserveItems(reobserveItems().filter(item => !(item && item.wordKey === key && item.status === "waiting")));
  }

  function ensureReobserveStyle(){
    if(q("selfReobserveStyleV32")) return;
    const st = document.createElement("style");
    st.id = "selfReobserveStyleV32";
    st.textContent = `
      .self-reobserve-btn{
        position:absolute;
        left:50%;
        bottom:18px;
        z-index:30;
        transform:translateX(-50%);
        padding:8px 12px;
        border:1px solid rgba(255,255,255,.18);
        border-radius:999px;
        background:rgba(10,12,18,.74);
        color:rgba(255,255,255,.84);
        font-size:11px;
        font-weight:900;
        white-space:nowrap;
        box-shadow:0 8px 24px rgba(0,0,0,.28);
      }
      .self-reobserve-btn.active{
        color:#ffe88a;
        border-color:rgba(255,232,138,.48);
        background:rgba(38,31,18,.82);
      }
      .self-reobserve-overlay{
        position:fixed;
        inset:0;
        z-index:2147483200;
        background:rgba(0,0,0,.78);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:22px;
      }
      .self-reobserve-panel{
        width:min(390px,100%);
        max-height:82vh;
        overflow:auto;
        border:1px solid rgba(255,255,255,.14);
        border-radius:24px;
        background:#101114;
        color:#fff;
        padding:24px;
        box-shadow:0 24px 80px rgba(0,0,0,.55);
      }
      .self-reobserve-kicker{font-size:11px;font-weight:900;letter-spacing:.18em;color:#ffe88a}
      .self-reobserve-title{font-size:25px;font-weight:900;margin:10px 0 5px}
      .self-reobserve-date{font-size:12px;color:rgba(255,255,255,.48);margin-bottom:18px}
      .self-reobserve-old{padding:18px;border-radius:18px;background:rgba(255,255,255,.06);font-size:18px;line-height:1.65;white-space:pre-wrap}
      .self-reobserve-gone{margin-top:10px;font-size:12px;color:rgba(255,255,255,.48)}
      .self-reobserve-question{font-size:15px;font-weight:900;margin:20px 0 10px}
      .self-reobserve-text{box-sizing:border-box;width:100%;min-height:105px;border:1px solid rgba(255,255,255,.15);border-radius:16px;background:#08090b;color:#fff;padding:14px;font:inherit;resize:vertical}
      .self-reobserve-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
      .self-reobserve-actions button{min-height:44px;border:0;border-radius:14px;font-weight:900}
      .self-reobserve-save{background:#fff;color:#111}
      .self-reobserve-later{background:rgba(255,255,255,.09);color:#fff}
      .self-reobserve-delete{grid-column:1/-1;background:transparent!important;color:rgba(255,255,255,.45)!important;font-size:11px}
      .self-reobserve-note{margin-top:12px;font-size:11px;line-height:1.5;color:rgba(255,255,255,.38)}
    `;
    document.head.appendChild(st);
  }

  function removeReobserveButton(){
    const b = q("selfReobserveButton");
    if(b) b.remove();
  }

  function isActualSelfDictionaryScreen(){
    const dictionaryTab = q("dictionaryMode");
    const cardTab = q("cardMode");
    const musicTab = q("musicMode");
    const mangaTab = q("mangaMode");

    if(cardTab && cardTab.classList.contains("active")) return false;
    if(musicTab && musicTab.classList.contains("active")) return false;
    if(mangaTab && mangaTab.classList.contains("active")) return false;
    if(dictionaryTab && !dictionaryTab.classList.contains("active")) return false;

    if(!isDictionary() || !selfActive) return false;
    if(!document.body.classList.contains("self-glass-active")) return false;

    const glassName = q("glassName");
    const character = q("character");
    const glassText = glassName ? String(glassName.textContent || "").trim() : "";
    const characterText = character ? String(character.textContent || "").trim() : "";

    return glassText.indexOf("自分メガネ") >= 0 &&
      (characterText.indexOf("｜自分の言葉で世界を見る視点") >= 0 ||
       characterText.indexOf("YOU｜") === 0);
  }

  function renderReobserveButton(word){
    removeReobserveButton();
    if(!isActualSelfDictionaryScreen() || !hasDef(word)) return;

    const card = q("card");
    const d = getDef(word);
    if(!card || !d) return;

    ensureReobserveStyle();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "selfReobserveButton";
    btn.className = "self-reobserve-btn";

    const refresh = () => {
      const active = !!activeReobserveFor(word);
      btn.classList.toggle("active", active);
      btn.textContent = active ? "◷ 再観測待ち" : "◷ 184日後に再観測";
    };

    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);

    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();

      const currentWord = currentWordText();
      if(!isActualSelfDictionaryScreen() || currentWord !== word) return;

      const existing = activeReobserveFor(word);
      if(existing){
        if(window.confirm("再観測から外しますか？")){
          removeReobserveFor(word);
          refresh();
        }
        return;
      }

      const currentDef = getDef(word);
      if(!currentDef || !String(currentDef.text || "").trim()) return;

      const now = Date.now();
      const list = reobserveItems().filter(item => !(item && item.wordKey === wk(word) && item.status === "waiting"));
      list.push({
        id: "reobserve_" + now + "_" + Math.random().toString(36).slice(2,8),
        word,
        wordKey: wk(word),
        text: String(currentDef.text || ""),
        createdAt: new Date(now).toISOString(),
        dueAt: new Date(now + REOBSERVE_DAYS * REOBSERVE_DAY).toISOString(),
        status: "waiting",
        lastShownAt: null,
        completedAt: null,
        newText: ""
      });
      saveReobserveItems(list);
      refresh();
      try{
        if(window.MEGANE_TOAST) window.MEGANE_TOAST("184日後、もう一度観測します。");
      }catch(_){}
    }, true);

    refresh();
    card.appendChild(btn);
  }

  function dueReobserve(){
    const now = Date.now();
    return reobserveItems()
      .filter(item =>
        item &&
        item.status === "waiting" &&
        !reobserveDismissed.has(item.id) &&
        Date.parse(item.dueAt || "") <= now
      )
      .sort((a,b) => Date.parse(a.dueAt || 0) - Date.parse(b.dueAt || 0))[0] || null;
  }

  function updateReobserveItem(id, patch){
    const list = reobserveItems();
    const item = list.find(x => x && x.id === id);
    if(!item) return;
    Object.keys(patch).forEach(k => item[k] = patch[k]);
    saveReobserveItems(list);
  }

  function canShowReobserve(){
    if(reobserveShowing || !isDictionary()) return false;
    if(document.querySelector("dialog[open]")) return false;

    const blockers = ["binderModal","binderViewer","binderReplayViewer","fullscreenOverlay","mangaFullscreenOverlay","confPlayerLayer","mangaListLayer","mangaChoiceLayer"];
    for(const id of blockers){
      const el = q(id);
      if(!el) continue;
      let display = "";
      try { display = getComputedStyle(el).display; } catch(_) {}
      if(id === "binderModal" && display !== "none") return false;
      if(el.hidden === false && display !== "none") return false;
    }
    return true;
  }

  function saveReobservedDefinition(item, text){
    const all = defs();
    const key = item.wordKey || wk(item.word);
    const current = all[key] || {};
    all[key] = {
      id: current.id || ("userdef_" + Date.now()),
      word: item.word,
      text,
      createdAt: current.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    write(DEF_KEY, all);
  }

  function showReobserve(item){
    if(!item || !canShowReobserve()) return;
    reobserveShowing = true;
    ensureReobserveStyle();
    updateReobserveItem(item.id, { lastShownAt:new Date().toISOString() });

    const existsNow = hasDef(item.word);
    const overlay = document.createElement("div");
    overlay.id = "selfReobserveOverlay";
    overlay.className = "self-reobserve-overlay";
    overlay.innerHTML = `
      <div class="self-reobserve-panel">
        <div class="self-reobserve-kicker">REOBSERVATION</div>
        <div class="self-reobserve-title">【${String(item.word || "")}】</div>
        <div class="self-reobserve-date">184日前、あなたはこう定義しました。</div>
        <div class="self-reobserve-old"></div>
        ${existsNow ? "" : '<div class="self-reobserve-gone">この定義は現在の辞書には残っていません。</div>'}
        <div class="self-reobserve-question">今のあなたなら？</div>
        <textarea id="selfReobserveText" class="self-reobserve-text" maxlength="100" placeholder="今の定義を残す"></textarea>
        <div class="self-reobserve-actions">
          <button type="button" id="selfReobserveSave" class="self-reobserve-save">今を残す</button>
          <button type="button" id="selfReobserveLater" class="self-reobserve-later">今回は閉じる</button>
          <button type="button" id="selfReobserveDelete" class="self-reobserve-delete">再観測から削除</button>
        </div>
        <div class="self-reobserve-note">通常の「あなたの定義」を削除していても、再観測に残した文章はここへ届きます。</div>
      </div>
    `;
    const old = overlay.querySelector(".self-reobserve-old");
    if(old) old.textContent = String(item.text || "");
    document.body.appendChild(overlay);

    q("selfReobserveLater").onclick = () => {
      reobserveDismissed.add(item.id);
      overlay.remove();
      reobserveShowing = false;
    };

    q("selfReobserveDelete").onclick = () => {
      if(!window.confirm("この再観測を完全に削除しますか？")) return;
      saveReobserveItems(reobserveItems().filter(x => !(x && x.id === item.id)));
      overlay.remove();
      reobserveShowing = false;
      if(selfActive) renderReobserveButton(currentWordText());
    };

    q("selfReobserveSave").onclick = () => {
      const ta = q("selfReobserveText");
      const text = ta ? String(ta.value || "").trim() : "";
      if(!text){
        if(ta) ta.focus();
        return;
      }

      saveReobservedDefinition(item, text);
      updateReobserveItem(item.id, {
        status:"done",
        completedAt:new Date().toISOString(),
        newText:text
      });

      overlay.remove();
      reobserveShowing = false;

      if(typeof render === "function") render("flash");
      try{
        if(window.MEGANE_TOAST) window.MEGANE_TOAST("今の定義を残しました。");
      }catch(_){}
    };
  }

  function checkReobserveDue(){
    if(!canShowReobserve()) return;
    const item = dueReobserve();
    if(item) showReobserve(item);
  }

  function selfEnabled(){ return localStorage.getItem(ENABLE_KEY) === "1"; }
  function setSelfEnabled(v){ localStorage.setItem(ENABLE_KEY, v ? "1" : "0"); }

  function getProfile(){
    const p = read(PROFILE_KEY, {});
    return {
      name: String(p.name || p.nickname || "YOU").trim() || "YOU",
      glassName: String(p.glassName || "自分メガネ").trim() || "自分メガネ"
    };
  }
  function saveProfileName(name){
    const p = getProfile();
    p.name = String(name || "").trim() || "YOU";
    write(PROFILE_KEY, p);
  }
  function askProfileName(force){
    const old = getProfile();
    if(!force){
      const raw = read(PROFILE_KEY, null);
      if(raw && (raw.name || raw.nickname)) return old;
    }
    const name = window.prompt("あなたの名前を教えてください\nニックネームでもOKです", old.name || "YOU");
    if(name !== null) saveProfileName(name || "YOU");
    return getProfile();
  }

  function ensureStyle(){
    if(q("selfGlassCardsStyleV15")) return;
    const st = document.createElement("style");
    st.id = "selfGlassCardsStyleV15";
    st.textContent = [
      "body.self-glass-active{--self-glass-bg-a:rgba(40,31,66,.72);--self-glass-bg-b:rgba(8,35,33,.64);--self-glass-accent:#ffe3a0;}",
      "body.self-glass-active #card{background:linear-gradient(145deg,var(--self-glass-bg-a),rgba(18,20,30,.88) 48%,var(--self-glass-bg-b))!important;}",
      "body.self-glass-active #card:before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(circle at 24% 22%,rgba(255,230,160,.10),transparent 28%),radial-gradient(circle at 76% 78%,rgba(110,255,220,.08),transparent 34%);opacity:.9;}",
      "body.self-glass-active #userDefinitionList{display:none!important;}",
      "body.self-glass-active #glassName{color:var(--self-glass-accent)!important;text-shadow:0 0 18px rgba(255,220,120,.22);}",
      "body.self-glass-active #character{color:rgba(255,255,255,.62)!important;}",
      "body.self-glass-active #translation{white-space:pre-line;}",
      ".self-glass-toggle{margin-top:14px;border-top:1px solid rgba(255,255,255,.10);padding-top:14px;display:flex;flex-direction:column;gap:12px;}",
      ".self-glass-toggle .glass-item{position:relative;width:100%;min-height:86px;text-align:left;box-sizing:border-box;}",
      ".self-glass-toggle .self-state{position:absolute;right:18px;top:18px;font-size:12px;font-weight:900;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.10);color:rgba(255,255,255,.78);}",
      ".self-glass-toggle .self-state.on{background:rgba(255,214,112,.18);color:#ffe2a0;border:1px solid rgba(255,214,112,.28);}",
      ".self-glass-toggle .self-profile-edit{width:100%;min-height:54px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:rgba(255,255,255,.82);font-weight:900;font-size:14px;}",
      ".self-glass-toggle .self-profile-edit:active{transform:scale(.985);}",
      ".self-name-mini{font-weight:900;letter-spacing:.04em;}"
    ].join("");
    document.head.appendChild(st);
  }

  function applySelfCard(animationClass){
    if(!isDictionary()) return false;
    if(!selfEnabled()) { selfActive = false; return false; }

    const word = currentWordText();
    const d = getDef(word);
    if(!d || !String(d.text || "").trim()){
      selfActive = false;
      return false;
    }

    ensureStyle();
    const profile = getProfile();
    const body = document.body;
    [...body.classList].forEach(cls => { if(cls.startsWith("theme-")) body.classList.remove(cls); });
    body.classList.add("theme-user", "self-glass-active");

    const glassName = q("glassName");
    const character = q("character");
    const wordEl = q("word");
    const translation = q("translation");
    const counter = q("counter");
    const hint = q("hint");
    const card = q("card");
    const content = q("content");

    if(glassName) glassName.textContent = profile.glassName;
    if(character) character.textContent = profile.name + "｜自分の言葉で世界を見る視点";
    if(wordEl){
      wordEl.textContent = word;
      wordEl.classList.remove("word-fit-long", "word-fit-xlong", "word-fit-xxlong");
      const len = String(word || "").length;
      if(len >= 9) wordEl.classList.add("word-fit-xxlong");
      else if(len >= 7) wordEl.classList.add("word-fit-xlong");
      else if(len >= 5) wordEl.classList.add("word-fit-long");
    }
    if(translation) translation.textContent = String(d.text || "");
    if(counter) counter.textContent = `${getWordIndex() + 1} / ${getWords().length}　・　あなた`;
    if(hint) hint.textContent = "左右：定義済み単語 / 上下：メガネ / ＋：編集";
    if(content){
      content.style.transform = "";
      content.classList.remove("dragging", "snap-back");
    }
    if(card){
      card.style.transform = "";
      card.classList.remove("flash", "slide-left", "slide-right", "slide-up", "slide-down", "peek-left", "peek-right", "peek-up", "peek-down", "snap-back");
      void card.offsetWidth;
      card.classList.add(animationClass || "flash");
    }
    renderReobserveButton(word);
    try{
      window.dispatchEvent(new CustomEvent("megane:self-card-rendered", {
        detail: {
          word: word,
          wordKey: wk(word),
          definition: String(d.text || "")
        }
      }));
    }catch(_){}
    return true;
  }

  function clearSelfClass(){
    document.body.classList.remove("self-glass-active");
    removeReobserveButton();
    try{
      window.dispatchEvent(new CustomEvent("megane:self-card-cleared"));
    }catch(_){}
  }

  function renderAfterBase(animationClass){
    if(selfActive && selfEnabled() && hasDef(currentWordText())){
      applySelfCard(animationClass || "flash");
      setTimeout(selfFavUpdateButton,0);
    }else{
      selfActive = false;
      clearSelfClass();
    }
    refreshSelfToggle();
  }

  function findNextDefined(start, step){
    const words = getWords();
    if(!words.length) return -1;
    let i = start;
    for(let guard=0; guard<words.length; guard++){
      i = (i + step + words.length) % words.length;
      const w = words[i];
      // 自分定義が1件しかない場合は、同じ単語へ戻らず通常送りへフォールバックする。
      if(i !== start && w && hasDef(w.word)) return i;
    }
    return -1;
  }

  function selfMoveWord(step){
    const next = findNextDefined(getWordIndex(), step);
    if(next >= 0){
      setWordIndex(next);
      if(typeof render === "function") render(step > 0 ? "slide-left" : "slide-right");
      return true;
    }
    // 自分定義が他に無い時は通常の単語送りへ戻す。
    selfActive = false;
    return false;
  }

  function selfMoveGlass(step){
    const glasses = getGlasses();
    if(!glasses.length) return false;

    if(selfActive){
      selfActive = false;
      setGlassIndex(step > 0 ? 0 : glasses.length - 1);
      if(typeof render === "function") render(step > 0 ? "slide-up" : "slide-down");
      return true;
    }

    if(!selfEnabled() || !hasDef(currentWordText())) return false;

    const gi = getGlassIndex();
    if(step > 0 && gi >= glasses.length - 1){
      selfActive = true;
      if(typeof render === "function") render("slide-up");
      return true;
    }
    if(step < 0 && gi <= 0){
      selfActive = true;
      if(typeof render === "function") render("slide-down");
      return true;
    }
    return false;
  }

  function appendSelfToggle(){
    const list = q("glassList");
    if(!list) return;
    if(q("selfGlassToggleWrap")) {
      refreshSelfToggle();
      return;
    }

    const wrap = document.createElement("div");
    wrap.id = "selfGlassToggleWrap";
    wrap.className = "self-glass-toggle";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "selfGlassToggleButton";
    btn.className = "glass-item";
    btn.innerHTML = '<strong>自分メガネ</strong><span>書いた定義だけ、カードとして並びます</span><em class="self-state">OFF</em>';
    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();

      const next = !selfEnabled();
      if(next) askProfileName(false);
      setSelfEnabled(next);

      if(next && hasDef(currentWordText())){
        selfActive = true;
        try { if(q("glassDialog") && q("glassDialog").close) q("glassDialog").close(); } catch(_){}
        if(typeof render === "function") render("flash");
      }else{
        selfActive = false;
        if(typeof render === "function") render("flash");
      }
      refreshSelfToggle();
    }, true);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.id = "selfGlassProfileEdit";
    edit.className = "self-profile-edit";
    edit.textContent = "名前を変更";
    edit.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      askProfileName(true);
      if(selfActive && typeof render === "function") render("flash");
      refreshSelfToggle();
    }, true);

    wrap.appendChild(btn);
    wrap.appendChild(edit);
    list.appendChild(wrap);
    refreshSelfToggle();
  }

  function refreshSelfToggle(){
    const btn = q("selfGlassToggleButton");
    if(!btn) return;
    const st = btn.querySelector(".self-state");
    const on = selfEnabled();
    const profile = getProfile();
    if(st){
      st.textContent = on ? "ON" : "OFF";
      st.classList.toggle("on", on);
    }
    const strong = btn.querySelector("strong");
    if(strong) strong.textContent = "自分メガネ：" + profile.name;
    const span = btn.querySelector("span");
    if(span) span.textContent = on ? "書いた定義だけ、カードとして並びます" : "キャラの定義だけ表示します";
  }

  function hookCore(){
    if(typeof render === "function" && !render.__selfGlassV15){
      const baseRender = render;
      render = function(animationClass){
        const r = baseRender.apply(this, arguments);
        setTimeout(function(){ renderAfterBase(animationClass || "flash"); }, 0);
        return r;
      };
      render.__selfGlassV15 = true;
    }

    if(typeof moveGlass === "function" && !moveGlass.__selfGlassV15){
      const baseMoveGlass = moveGlass;
      moveGlass = function(step){
        if(isDictionary() && selfMoveGlass(Number(step || 1))) return;
        selfActive = false;
        return baseMoveGlass.apply(this, arguments);
      };
      moveGlass.__selfGlassV15 = true;
    }

    if(typeof moveWord === "function" && !moveWord.__selfGlassV15){
      const baseMoveWord = moveWord;
      moveWord = function(step){
        if(isDictionary() && selfActive && selfEnabled()){
          if(selfMoveWord(Number(step || 1))) return;
        }
        selfActive = false;
        return baseMoveWord.apply(this, arguments);
      };
      moveWord.__selfGlassV15 = true;
    }

    if(typeof buildGlassList === "function" && !buildGlassList.__selfGlassV15){
      const baseBuild = buildGlassList;
      buildGlassList = function(){
        const r = baseBuild.apply(this, arguments);
        setTimeout(appendSelfToggle, 0);
        return r;
      };
      buildGlassList.__selfGlassV15 = true;
    }
  }


  function isSelfScreenForFavorite(){
    const bodyActive = !!(document.body && document.body.classList && document.body.classList.contains("self-glass-active"));
    const visibleSelf = !!(q("glassName") && q("glassName").textContent.indexOf("自分メガネ") >= 0);
    return !!(isDictionary() && selfEnabled() && hasDef(currentWordText()) && (selfActive || bodyActive || visibleSelf));
  }

  function favLoad(){
    try { return JSON.parse(localStorage.getItem("meganeFavoritesV65") || "[]") || []; } catch(e) { return []; }
  }
  function favSave(list){
    try { localStorage.setItem("meganeFavoritesV65", JSON.stringify(list)); } catch(e) {}
  }
  function selfFavLoad(){
    try { return JSON.parse(localStorage.getItem(SELF_FAV_KEY) || "[]") || []; } catch(e) { return []; }
  }
  function selfFavSave(list){
    try { localStorage.setItem(SELF_FAV_KEY, JSON.stringify(list)); } catch(e) {}
  }
  function allFavLoad(){
    const map = new Map();
    favLoad().forEach(f => { if(f && f.key) map.set(f.key, f); });
    selfFavLoad().forEach(f => { if(f && f.key) map.set(f.key, f); });
    return Array.from(map.values());
  }
  function selfFavoriteItem(){
    if(!isSelfScreenForFavorite()) return null;
    const profile = getProfile();
    const word = currentWordText();
    const d = getDef(word);
    return {
      key: "selfdict:" + wk(word),
      type: "selfdict",
      title: word,
      meta: profile.name + "｜" + String(d && d.text || ""),
      word: word,
      userName: profile.name,
      text: String(d && d.text || ""),
      savedAt: Date.now()
    };
  }

  window.MEGANE_SELF_GLASS_GET_FAVORITE_ITEM = selfFavoriteItem;
  function selfFavIsOn(){
    const item = selfFavoriteItem();
    if(!item) return false;
    return selfFavLoad().some(f => f.key === item.key) || favLoad().some(f => f.key === item.key && f.type === "selfdict");
  }
  function selfFavUpdateButton(){
    const btn = q("favoriteToggle");
    if(!btn || !selfActive) return;
    const item = selfFavoriteItem();
    if(!item) return;
    const active = selfFavIsOn();
    btn.hidden = false;
    btn.classList.toggle("active", active);
    btn.textContent = active ? "★" : "☆";
  }
  function selfFavToggle(){
    if(window.MEGANE_FAVORITES_SINGLETON && typeof window.MEGANE_FAVORITES_SINGLETON.toggleCurrent === "function"){
      window.MEGANE_FAVORITES_SINGLETON.toggleCurrent();
      return true;
    }
    return false;
  }
  function bindSelfFavorite(){
    // singleton版では旧self favoriteのdocumentハンドラを一切張らない
    return;
  }

  function hookUserDefButtons(){
    document.addEventListener("click", function(e){
      const plus = e.target && e.target.closest ? e.target.closest("#userDefinitionPlus") : null;
      if(plus && isDictionary()){
        askProfileName(false);
      }
    }, true);

    document.addEventListener("click", function(e){
      const save = e.target && e.target.closest ? e.target.closest("#userDefinitionSave") : null;
      if(!save || !isDictionary()) return;
      askProfileName(false);
      const before = defCount();
      setTimeout(function(){
        const after = defCount();
        if(after >= before){
          setSelfEnabled(true);
          selfActive = true;
          if(typeof render === "function") render("flash");
        }
      }, 160);
    }, true);

    document.addEventListener("click", function(e){
      const share = e.target && e.target.closest ? e.target.closest("#userDefinitionShare") : null;
      if(!share || !isDictionary()) return;

      const ta = q("userDefinitionText");
      const txt = ta ? ta.value.trim() : "";
      if(!txt) return;

      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();

      const profile = getProfile();
      const word = currentWordText();
      const url = location && location.href ? location.href.split("#")[0] : "";
      const payload = {
        title: "メガネ辞書｜" + profile.name + "の定義",
        text:
          "【" + word + "｜" + profile.name + "の定義】\n\n" +
          txt + "\n\n" +
          "あなたなら？\n\n" +
          "#メガネ辞書\n" +
          (url || "")
      };

      if(navigator.share) navigator.share(payload).catch(function(){});
      else window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(payload.text), "_blank", "noopener,noreferrer");
      return false;
    }, true);
  }

  function suppressCharacterVoiceOnSelfCard(){
    // v16: v15ではここで click/touchend/pointerup を捕まえていたため、
    // 自分カード上の左右・上下スワイプまで止めてしまっていた。
    // タッチイベントは止めず、20_dictionary_audio.js 側の playLine 直前判定だけで音声を止める。
    window.MEGANE_SELF_GLASS_IS_ACTIVE = function(){
      return !!(selfActive && isDictionary());
    };
  }

  function watchDefinitionChanges(){
    lastKnownDefCount = defCount();
    setInterval(function(){
      hookCore();
      appendSelfToggle();

      if(!isActualSelfDictionaryScreen()){
        removeReobserveButton();
      }

      checkReobserveDue();
      const c = defCount();
      if(c !== lastKnownDefCount){
        lastKnownDefCount = c;
        if(selfActive && (!selfEnabled() || !hasDef(currentWordText()))){
          selfActive = false;
          if(typeof render === "function") render("flash");
        }
      }
    }, 900);
  }


  function escapeSelfFavHtml(s){
    return String(s || "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function openSelfDictFavorite(item){
    if(!item || !item.word) return false;
    try{
      if(typeof appMode !== "undefined") appMode = "dictionary";
      const words = getWords();
      const wi = words.findIndex(w => w.word === item.word);
      if(wi >= 0) setWordIndex(wi);
      setSelfEnabled(true);
      selfActive = true;
      const d = q("favoriteDialog");
      if(d && d.open) d.close();
      if(typeof render === "function") render("flash");
      return true;
    }catch(_){}
    return false;
  }

  let favoriteTabV27 = localStorage.getItem("megane_favorite_tab_v27") || "megane";
  const favoriteScrollV27 = { megane: 0, self: 0 };

  function escapeSelfFavHtml(s){
    return String(s || "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[ch]));
  }

  function openSelfDictFavorite(item){
    if(!item || !item.word) return false;
    try{
      if(typeof appMode !== "undefined") appMode = "dictionary";
      const words = getWords();
      const wi = words.findIndex(w => w.word === item.word);
      if(wi >= 0) setWordIndex(wi);
      setSelfEnabled(true);
      selfActive = true;
      const d = q("favoriteDialog");
      if(d && d.open) d.close();
      if(typeof render === "function") render("flash");
      return true;
    }catch(_){}
    return false;
  }

  function injectFavoriteTabsStyleV27(){
    if(q("favoriteTabsStyleV27")) return;
    const st = document.createElement("style");
    st.id = "favoriteTabsStyleV27";
    st.textContent = `
      #favoriteDialog .favorite-tabs-v27{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin:10px 0 12px;
      }
      #favoriteDialog .favorite-tab-v27{
        border:1px solid rgba(255,255,255,.16);
        border-radius:16px;
        background:rgba(255,255,255,.06);
        color:rgba(255,255,255,.72);
        min-height:42px;
        font-weight:900;
        font-size:13px;
      }
      #favoriteDialog .favorite-tab-v27.active{
        color:#ffe2a0;
        border-color:rgba(255,214,112,.42);
        background:rgba(255,214,112,.12);
        box-shadow:0 0 0 1px rgba(255,214,112,.08) inset;
      }
      #favoriteDialog .favorite-list-title-v27{
        margin:2px 0 10px;
        color:rgba(255,255,255,.48);
        font-size:12px;
        font-weight:900;
        letter-spacing:.08em;
      }
      #favoriteDialog .favorite-empty-sub-v27{
        margin-top:8px;
        color:rgba(255,255,255,.42);
        font-size:12px;
        line-height:1.7;
      }
    `;
    document.head.appendChild(st);
  }

  function favoriteListsV27(){
    const all = allFavLoad();
    return {
      megane: all.filter(f => f && f.type === "dict"),
      self: all.filter(f => f && f.type === "selfdict")
    };
  }

  function renderFavoritesWithSelfDict(){ return false; }

  function bindFavoriteTabsV27(listEl){ return false; }

  function openMeganeDictFavorite(item){
    if(!item || !item.word) return false;
    try{
      if(typeof appMode !== "undefined") appMode = "dictionary";
      if(window.MEGANE_SELF_GLASS && window.MEGANE_SELF_GLASS.leave) window.MEGANE_SELF_GLASS.leave();

      if(typeof data !== "undefined"){
        const wi = data.words.findIndex(w => w.word === item.word);
        const gi = data.glasses.findIndex(g => g.id === item.glassId || g.name === item.glassName);
        if(wi >= 0) wordIndex = wi;
        if(gi >= 0) glassIndex = gi;
      }

      const d = q("favoriteDialog");
      if(d && d.open) d.close();

      if(typeof render === "function") render("flash");
      return true;
    }catch(_){}
    return false;
  }

  function bindLongPressFavoriteRow(el, getItem, opener, flagName){
    if(!el || el.dataset[flagName] === "1") return;
    el.dataset[flagName] = "1";

    let timer = 0;
    let sx = 0, sy = 0;
    let moved = false;
    let openedAt = 0;

    const getPoint = (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      return t ? {x:t.clientX, y:t.clientY} : {x:(e.clientX || 0), y:(e.clientY || 0)};
    };
    const clear = () => {
      if(timer) clearTimeout(timer);
      timer = 0;
    };

    function openFromHold(e){
      if(moved) return false;
      const now = Date.now();
      if(now - openedAt < 900) return false;

      const item = getItem();
      if(!item) return false;

      openedAt = now;
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      opener(item);
      return false;
    }

    function start(e){
      const p = getPoint(e);
      sx = p.x; sy = p.y;
      moved = false;
      clear();
      timer = setTimeout(() => openFromHold(e), 360);
    }

    function move(e){
      const p = getPoint(e);
      if(Math.abs(p.x - sx) > 10 || Math.abs(p.y - sy) > 10){
        moved = true;
        clear();
      }
    }

    function end(e){
      clear();
      if(e && !moved){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      return false;
    }

    el.addEventListener("pointerdown", start, {capture:true, passive:true});
    el.addEventListener("touchstart", start, {capture:true, passive:true});
    el.addEventListener("pointermove", move, {capture:true, passive:true});
    el.addEventListener("touchmove", move, {capture:true, passive:true});
    el.addEventListener("pointerup", end, {capture:true, passive:false});
    el.addEventListener("touchend", end, {capture:true, passive:false});
    el.addEventListener("click", end, {capture:true, passive:false});
    el.addEventListener("pointercancel", clear, {capture:true, passive:true});
    el.addEventListener("touchcancel", clear, {capture:true, passive:true});
  }


  function bindSelfFavoriteSwipeDeleteV32(listEl){ return false; }

  function bindFavoriteRowsV27(listEl){ return false; }


  function installFavoriteListRenderer(){ return false; }



  function migrateSelfFavoritesV26(){
    try{
      const main = favLoad();
      const self = selfFavLoad();
      const map = new Map();
      self.forEach(f => { if(f && f.key) map.set(f.key, f); });
      main.filter(f => f && f.type === "selfdict").forEach(f => map.set(f.key, f));
      selfFavSave(Array.from(map.values()));
      const cleaned = main.filter(f => !(f && f.type === "selfdict"));
      if(cleaned.length !== main.length) favSave(cleaned);
    }catch(_){}
  }

  function boot(){
    ensureStyle();
    migrateSelfFavoritesV26();
    hookCore();
    hookUserDefButtons();
    bindSelfFavorite();
    installFavoriteListRenderer();
    suppressCharacterVoiceOnSelfCard();
    appendSelfToggle();

    ["cardMode","musicMode","mangaMode"].forEach(id => {
      const btn = q(id);
      if(!btn || btn.dataset.reobserveCleanupBound === "1") return;
      btn.dataset.reobserveCleanupBound = "1";
      btn.addEventListener("pointerdown", removeReobserveButton, true);
      btn.addEventListener("click", function(){
        selfActive = false;
        clearSelfClass();
        removeReobserveButton();
      }, true);
    });

    const dictionaryBtn = q("dictionaryMode");
    if(dictionaryBtn && dictionaryBtn.dataset.reobserveRestoreBound !== "1"){
      dictionaryBtn.dataset.reobserveRestoreBound = "1";
      dictionaryBtn.addEventListener("click", function(){
        removeReobserveButton();
        setTimeout(function(){
          if(selfActive && hasDef(currentWordText())) applySelfCard("flash");
        }, 80);
      }, true);
    }

    window.addEventListener("hashchange", removeReobserveButton);
    window.addEventListener("popstate", removeReobserveButton);

    watchDefinitionChanges();
    setTimeout(checkReobserveDue, 700);
    /* singleton: old favorite repair interval disabled */
    setTimeout(function(){
      hookCore();
      appendSelfToggle();
      if(typeof render === "function") render("flash");
    }, 80);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MEGANE_SELF_GLASS = {
    version: "v35-reobserve-184d-selfvoice",
    enable: function(){ setSelfEnabled(true); selfActive = hasDef(currentWordText()); if(typeof render==="function") render("flash"); },
    disable: function(){ setSelfEnabled(false); selfActive = false; clearSelfClass(); if(typeof render==="function") render("flash"); },
    leave: function(){ selfActive = false; clearSelfClass(); },
    openWord: function(word){
      try{
        const words = getWords();
        const wi = words.findIndex(w => w.word === word);
        if(wi >= 0) setWordIndex(wi);
        setSelfEnabled(true);
        selfActive = true;
        if(typeof appMode !== "undefined") appMode = "dictionary";
        if(typeof render==="function") render("flash");
      }catch(_){}
    },
    rename: function(){ askProfileName(true); if(typeof render==="function") render("flash"); },
    profile: getProfile
  };
})();