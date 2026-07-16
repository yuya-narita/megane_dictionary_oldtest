/* v100 clean card collection counts
   cardCollectionV100 だけをカード所持履歴として使う。
   古い binderV98 は読まない。辞書や過去テストデータ混入を遮断する。
*/
(function(){
  "use strict";

  var HISTORY_KEY = "cardCollectionV100";
  var UNIQUE_KEY = "cardOwnedUniqueV100";
  var NEW_KEY = "cardOwnedNewV100";

  // v101: daily storage watcher
  // 102_card_daily_tap_draw.js が meganeCardDailyV92 を保存した瞬間に、
  // cardCollectionV100 へ即時転記する。バインダーを開くタイミング依存をなくす。
  function rawLoadV101(key, fallback){
    try{
      var v = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return v == null ? fallback : v;
    }catch(e){ return fallback; }
  }

  function rawSaveV101(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  function validIndexRawV101(idx){
    try{
      var arr = [];
      if(typeof cards !== "undefined" && Array.isArray(cards)) arr = cards;
      else if(window.cards && Array.isArray(window.cards)) arr = window.cards;
      idx = Number(idx);
      return isFinite(idx) && idx >= 0 && idx < arr.length;
    }catch(e){ return false; }
  }

  function addCollectionRawV101(idx, dateKey){
    idx = Number(idx);
    if(!validIndexRawV101(idx)) return;

    dateKey = dateKey || (function(){
      var d = new Date();
      return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
    })();

    var recordedKey = "cardCollectionDailyRecordedV100";
    var recorded = rawLoadV101(recordedKey, {});
    if(!recorded || typeof recorded !== "object" || Array.isArray(recorded)) recorded = {};

    // 同じ日付は1回だけ。これでバインダーを何度開いても増えない。
    if(recorded[dateKey] === undefined){
      var hist = rawLoadV101(HISTORY_KEY, []);
      if(!Array.isArray(hist)) hist = [];
      hist.push(idx);
      rawSaveV101(HISTORY_KEY, hist);

      var unique = Array.from(new Set(hist.map(function(x){ return Number(x); }).filter(validIndexRawV101))).sort(function(a,b){ return a-b; });
      rawSaveV101(UNIQUE_KEY, unique);

      var news = rawLoadV101(NEW_KEY, []);
      if(!Array.isArray(news)) news = [];
      if(news.indexOf(idx) < 0){
        news.push(idx);
        rawSaveV101(NEW_KEY, news);
      }

      recorded[dateKey] = idx;
      rawSaveV101(recordedKey, recorded);
    }
  }

  function absorbDailyRawV101(){
    try{
      var s = rawLoadV101("meganeCardDailyV92", {});
      if(s && s.drawn && validIndexRawV101(Number(s.index))){
        addCollectionRawV101(Number(s.index), s.date);
      }
    }catch(e){}
  }

  (function hookDailyStorageV101(){
    if(window.__cardCollectionStorageHookV101) return;
    window.__cardCollectionStorageHookV101 = true;

    var originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value){
      var r = originalSetItem(key, value);
      try{
        if(String(key) === "meganeCardDailyV92"){
          var s = JSON.parse(String(value || "{}"));
          if(s && s.drawn && validIndexRawV101(Number(s.index))){
            addCollectionRawV101(Number(s.index), s.date);
          }
        }
      }catch(e){}
      return r;
    };

    // 初回起動時・描画遅延保険。setIntervalはガードされるのでsetTimeout再帰。
    var tries = 0;
    function tick(){
      tries++;
      absorbDailyRawV101();
      if(tries < 20) setTimeout(tick, 300);
    }
    setTimeout(tick, 100);
  })();



  function load(key, fallback){
    try{
      var v = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return v == null ? fallback : v;
    }catch(e){
      return fallback;
    }
  }

  function save(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch];
    });
  }

  function getCards(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    try{
      if(window.cards && Array.isArray(window.cards)) return window.cards;
    }catch(e){}
    return [];
  }

  function validIndex(idx){
    var arr = getCards();
    return typeof idx === "number" && isFinite(idx) && idx >= 0 && idx < arr.length;
  }

  function getCard(idx){
    var arr = getCards();
    return validIndex(idx) ? arr[idx] : null;
  }

  function getTitle(idx){
    var c = getCard(idx);
    if(!c) return "CARD " + String(idx + 1).padStart(3, "0");
    return c.title || c.name || c.label || c.id || ("CARD " + String(idx + 1).padStart(3, "0"));
  }

  function getSub(idx){
    var c = getCard(idx);
    if(!c) return "";
    return c.subtitle || c.caption || "";
  }

  function getImage(idx){
    var c = getCard(idx);
    if(!c) return "";
    return c.image || c.img || c.src || c.url || c.front || c.frontImage || c.cardImage || "";
  }

  function normalizeHistory(){
    var arr = load(HISTORY_KEY, []);
    if(!Array.isArray(arr)) arr = [];

    arr = arr
      .map(function(x){ return Number(x); })
      .filter(validIndex);

    save(HISTORY_KEY, arr);

    var unique = Array.from(new Set(arr)).sort(function(a,b){ return a-b; });
    save(UNIQUE_KEY, unique);

    return arr;
  }

  function addCard(idx){
    idx = Number(idx);
    if(!validIndex(idx)) return;

    var arr = normalizeHistory();
    arr.push(idx);
    save(HISTORY_KEY, arr);

    var unique = Array.from(new Set(arr)).sort(function(a,b){ return a-b; });
    save(UNIQUE_KEY, unique);

    var news = load(NEW_KEY, []);
    if(!Array.isArray(news)) news = [];
    if(news.indexOf(idx) < 0){
      news.push(idx);
      save(NEW_KEY, news);
    }
  }

  function countMap(){
    var arr = normalizeHistory();
    var map = {};
    arr.forEach(function(idx){
      map[idx] = (map[idx] || 0) + 1;
    });
    return map;
  }

  function summary(counts){
    var totalKinds = getCards().length || 0;
    var ownedKinds = Object.keys(counts).filter(function(k){ return counts[k] > 0; }).length;
    var totalOwned = Object.keys(counts).reduce(function(sum, k){ return sum + Number(counts[k] || 0); }, 0);
    var percent = totalKinds ? Math.round((ownedKinds / totalKinds) * 100) : 0;
    return { totalKinds:totalKinds, ownedKinds:ownedKinds, totalOwned:totalOwned, percent:percent };
  }

  function renderOwned(idx, count, isNew){
    var no = String(idx + 1).padStart(3, "0");
    var title = getTitle(idx);
    var img = getImage(idx);

    var outerStyle = [
      "position:relative",
      "box-sizing:border-box",
      "aspect-ratio:1/1.42",
      "height:auto",
      "min-height:0",
      "overflow:hidden",
      "border-radius:18px",
      "border:1px solid rgba(255,210,120,.44)",
      "background:rgba(255,255,255,.055)",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:5px"
    ].join(";");

    var cardStyle = [
      "width:88%",
      "aspect-ratio:0.68/1",
      "height:auto",
      "overflow:hidden",
      "border-radius:10px",
      "box-shadow:0 8px 20px rgba(0,0,0,.30)",
      "background:rgba(0,0,0,.22)"
    ].join(";");

    var imgStyle = [
      "display:block",
      "width:100%",
      "height:100%",
      "object-fit:contain",
      "border-radius:10px"
    ].join(";");

    return [
      '<div class="binder-item owned-card card-count-owned-inline" data-card-index="' + idx + '" style="' + outerStyle + '">',
        '<span class="binder-mini-no" style="position:absolute;left:8px;top:7px;z-index:5;font-size:11px;opacity:.7;">No.' + no + '</span>',
        isNew ? '<span style="position:absolute;right:9px;top:7px;z-index:9;padding:2px 7px;border-radius:999px;background:rgba(255,221,82,.92);color:#241600;font-size:9px;font-weight:900;letter-spacing:.06em;box-shadow:0 0 14px rgba(255,220,90,.45);">NEW</span>' : '',
        '<span class="binder-count-badge" style="position:absolute;right:9px;top:' + (isNew ? '30px' : '8px') + ';z-index:8;min-width:28px;height:21px;padding:0 7px;border-radius:999px;display:inline-grid;place-items:center;font-size:12px;font-weight:900;line-height:1;background:rgba(255,255,255,.88);color:rgba(10,12,18,.92);box-shadow:0 5px 14px rgba(0,0,0,.28);">×' + count + '</span>',
        '<div style="' + cardStyle + '">',
          img ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" style="' + imgStyle + '">' : '<span style="display:grid;place-items:center;width:100%;height:100%;font-size:11px;font-weight:800;color:rgba(255,255,255,.72);text-align:center;">' + esc(title) + '</span>',
        '</div>',
        '<span style="position:absolute;left:9px;bottom:7px;font-size:10px;opacity:.52;">tap</span>',
      '</div>'
    ].join("");
  }

  function renderLocked(idx){
    var no = String(idx + 1).padStart(3, "0");

    var outerStyle = [
      "position:relative",
      "box-sizing:border-box",
      "aspect-ratio:1/1.42",
      "height:auto",
      "min-height:0",
      "overflow:hidden",
      "border-radius:18px",
      "border:1px dashed rgba(255,210,120,.18)",
      "background:rgba(0,0,0,.20)",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:8px",
      "opacity:.62"
    ].join(";");

    return [
      '<div class="binder-item binder-locked card-count-locked-inline" data-card-index="' + idx + '" style="' + outerStyle + '">',
        '<span class="binder-mini-no" style="position:absolute;left:8px;top:7px;z-index:5;font-size:11px;opacity:.58;">No.' + no + '</span>',
        '<span style="position:absolute;right:7px;top:8px;z-index:8;min-width:30px;height:22px;padding:0 8px;border-radius:999px;display:inline-grid;place-items:center;font-size:12px;font-weight:900;line-height:1;background:rgba(255,255,255,.08);color:rgba(255,255,255,.34);border:1px solid rgba(255,255,255,.08);">×0</span>',
        '<span style="font-size:18px;font-weight:900;letter-spacing:.08em;opacity:.48;">???</span>',
      '</div>'
    ].join("");
  }

  function openCard(idx){
    if(!validIndex(idx)) return;
    try{
      appMode = "cards";
      cardIndex = idx;
      cardFlipped = false;
      var modal = document.getElementById("binderModal");
      if(modal) modal.style.display = "none";
      if(typeof render === "function") render("flash");
    }catch(e){}
  }

  function isCompleteV106(counts){
    var arr = getCards();
    if(!arr.length) return false;
    var ownedKinds = Object.keys(counts || {}).filter(function(k){ return counts[k] > 0; }).length;
    return ownedKinds >= arr.length;
  }

  function getObserverImageV106(){
    return "images/cards/000_observer.png";
  }

  function getInfinityImageV106(){
    // No.∞ 画像はここに置く。
    // ファイル名を変えたい場合はこの1行だけ変更。
    return "images/cards/no_infinity.png";
  }

  function renderObserverStartV106(){
    var img = getObserverImageV106();

    var wrapStyle = [
      "grid-column:1/-1",
      "position:relative",
      "box-sizing:border-box",
      "border-radius:22px",
      "border:1px solid rgba(255,210,120,.38)",
      "background:linear-gradient(145deg,rgba(255,210,120,.08),rgba(0,0,0,.18))",
      "min-height:260px",
      "padding:18px 16px 22px",
      "display:grid",
      "grid-template-columns:1fr",
      "gap:14px",
      "align-items:center",
      "justify-items:center",
      "overflow:hidden",
      "text-align:center"
    ].join(";");

    var cardBoxStyle = [
      "position:relative",
      "width:min(62vw,240px)",
      "aspect-ratio:.68/1",
      "border-radius:14px",
      "border:1px solid rgba(255,210,120,.32)",
      "background:radial-gradient(circle at 50% 28%,rgba(255,220,130,.16),transparent 42%),rgba(0,0,0,.32)",
      "display:grid",
      "place-items:center",
      "overflow:hidden",
      "box-shadow:0 10px 28px rgba(0,0,0,.34)"
    ].join(";");

    return [
      '<div class="binder-observer-start" style="' + wrapStyle + '">',
        '<div style="' + cardBoxStyle + '">',
          '<img src="' + img + '" alt="THE OBSERVER" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;grid&quot;;">',
          '<div style="display:none;place-items:center;width:100%;height:100%;padding:16px;text-align:center;color:rgba(255,230,170,.82);font-weight:900;letter-spacing:.08em;">0<br><br>THE<br>OBSERVER</div>',
        '</div>',
        '<div class="binder-observer-copy" style="color:rgba(255,235,205,.88);line-height:1.95;font-size:16px;font-weight:900;">',
          '<div style="font-size:25px;letter-spacing:.06em;margin-bottom:8px;color:rgba(255,245,225,.94);">No.000</div>',
          '<div>あなたがカードを見た。</div>',
          '<div style="height:1px;background:rgba(255,222,164,.18);margin:14px auto;width:88%;"></div>',
          '<div>その瞬間</div>',
          '<div>カードもあなたを見た。</div>',
        '</div>',
      '</div>'
    ].join("");
  }

  function renderInfinitySlotV106(finalIdx, complete){
    var label = complete ? "No.∞" : "No.???";
    var title = complete ? "THE LOOKING BEAR" : "???";
    var img = complete ? getInfinityImageV106() : "";

    var outerStyle = [
      "grid-column:1/-1",
      "position:relative",
      "box-sizing:border-box",
      "min-height:260px",
      "border-radius:22px",
      "border:" + (complete ? "1px solid rgba(255,221,130,.62)" : "1px dashed rgba(255,210,120,.22)"),
      "background:" + (complete ? "linear-gradient(145deg,rgba(255,221,130,.12),rgba(0,0,0,.22))" : "rgba(0,0,0,.18)"),
      "display:grid",
      "grid-template-columns:1fr",
      "gap:14px",
      "align-items:center",
      "justify-items:center",
      "padding:18px 16px 22px",
      "overflow:hidden",
      "opacity:" + (complete ? "1" : ".82"),
      "text-align:center"
    ].join(";");

    var cardStyle = [
      "width:min(62vw,240px)",
      "aspect-ratio:.68/1",
      "border-radius:14px",
      "border:1px solid rgba(255,210,120,.32)",
      "background:radial-gradient(circle at 50% 35%,rgba(255,210,120,.14),transparent 46%),rgba(0,0,0,.28)",
      "display:grid",
      "place-items:center",
      "overflow:hidden",
      "box-shadow:0 10px 28px rgba(0,0,0,.28)"
    ].join(";");

    var text = complete
      ? '<div style="font-size:18px;font-weight:900;color:rgba(255,225,160,.96);letter-spacing:.08em;">BUG COLLECTION</div><div style="margin-top:4px;font-size:28px;font-weight:900;color:rgba(255,255,255,.92);">Complete</div><div style="height:1px;background:rgba(255,222,164,.18);margin:14px auto;width:88%;"></div><div>新しいバインダーが解放されました。</div>'
      : '<div style="font-size:14px;font-weight:800;color:rgba(255,222,164,.78);"></div><div style="margin-top:4px;font-size:21px;font-weight:900;color:rgba(255,235,205,.9);"></div>';

    return [
      '<div class="binder-infinity-slot ' + (complete ? "complete" : "locked") + '" data-card-index="' + finalIdx + '" style="' + outerStyle + '">',
        '<span style="position:absolute;left:18px;top:16px;z-index:5;font-size:18px;font-weight:900;color:rgba(255,222,164,.88);">' + label + '</span>',
        '<div style="' + cardStyle + '">',
          complete && img ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" style="width:100%;height:100%;object-fit:contain;display:block;">' : '<span style="font-size:28px;font-weight:900;letter-spacing:.08em;color:rgba(255,222,164,.50);">???</span>',
        '</div>',
        '<div style="color:rgba(255,222,164,.82);line-height:1.7;font-size:16px;font-weight:900;">' + text + '</div>',
      '</div>'
    ].join("");
  }

  function maybeShowCompleteEventV106(counts){
    try{
      if(!isCompleteV106(counts)) return;
      var key = "bugCollectionCompleteEventShownV106";
      if(localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");

      var overlay = document.createElement("div");
      overlay.id = "bugCollectionCompleteOverlay";
      overlay.innerHTML = ''
        + '<div class="bug-complete-card">'
        +   '<div class="bug-complete-no">No.000</div>'
        +   '<div class="bug-complete-title">THE OBSERVER</div>'
        +   '<div class="bug-complete-collection">BUG COLLECTION</div>'
        +   '<div class="bug-complete-complete">Complete</div>'
        +   '<div class="bug-complete-line"></div>'
        +   '<div class="bug-complete-message">新しいバインダーが解放されました。</div>'
        +   '<button type="button" class="bug-complete-close">観測する</button>'
        + '</div>';

      document.body.appendChild(overlay);

      overlay.querySelector(".bug-complete-close").onclick = function(){
        overlay.remove();
      };
    }catch(e){}
  }

  window.renderBinder = function renderCardCollectionV100(){
    absorbDailyRawV101();
    syncTodayIfAlreadyDrawn();
    var grid = document.getElementById("binderGrid");
    if(!grid) return;

    var arr = getCards();
    var counts = countMap();
    var news = load(NEW_KEY, []);
    if(!Array.isArray(news)) news = [];
    news = news.map(function(x){ return Number(x); }).filter(validIndex);

    var s = summary(counts);
    var complete = isCompleteV106(counts);
    var finalIdx = arr.length ? arr.length - 1 : -1;
    var normalLimit = Math.max(0, arr.length - 1);

    var html = ''
      + '<div class="binder-count-summary">'
      +   '<div class="binder-count-main">コンプリート ' + s.ownedKinds + ' / ' + s.totalKinds + '</div>'
      +   '<div class="binder-count-meter"><span style="width:' + s.percent + '%"></span></div>'
      +   '<div class="binder-count-subline">総所持 ' + s.totalOwned + '枚　' + s.percent + '%</div>'
      + '</div>'
      + renderObserverStartV106();

    for(var i=0; i<normalLimit; i++){
      var count = counts[i] || 0;
      html += count > 0 ? renderOwned(i, count, news.indexOf(i) >= 0) : renderLocked(i);
    }

    if(finalIdx >= 0){
      html += renderInfinitySlotV106(finalIdx, complete);
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".owned-card").forEach(function(el){
      el.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        openCard(Number(el.dataset.cardIndex));
      });
    });

    grid.querySelectorAll(".binder-infinity-slot.complete").forEach(function(el){
      el.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        openCard(Number(el.dataset.cardIndex));
      });
    });

    maybeShowCompleteEventV106(counts);

    if(news.length){
      setTimeout(function(){ save(NEW_KEY, []); }, 1400);
    }
  };

  function bindOpen(){
    var btn = document.getElementById("openBinderBtn");
    var modal = document.getElementById("binderModal");
    var close = document.getElementById("binderCloseBtn");

    if(btn){
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        if(!modal) return;
        modal.style.display = "block";
        syncTodayIfAlreadyDrawn();
        window.renderBinder();
        setTimeout(function(){
          syncTodayIfAlreadyDrawn();
          window.renderBinder();
        }, 180);
      };
    }

    if(close && !close.dataset.cardCollectionCloseV100){
      close.dataset.cardCollectionCloseV100 = "1";
      close.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        if(modal) modal.style.display = "none";
      };
    }
  }

  function todayKeyV100(){
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
  }

  function recordIndexOncePerDay(idx, dateKey){
    idx = Number(idx);
    if(!validIndex(idx)) return false;

    dateKey = dateKey || todayKeyV100();

    var recordedKey = "cardCollectionDailyRecordedV100";
    var recorded = {};
    try{ recorded = JSON.parse(localStorage.getItem(recordedKey) || "{}") || {}; }catch(e){ recorded = {}; }
    if(!recorded || typeof recorded !== "object" || Array.isArray(recorded)) recorded = {};

    // その日すでに記録済みなら増やさない。1日1回仕様。
    if(recorded[dateKey] !== undefined) return false;

    addCard(idx);
    recorded[dateKey] = idx;
    try{ localStorage.setItem(recordedKey, JSON.stringify(recorded)); }catch(e){}
    return true;
  }

  function recordCurrentVisibleCardV100(){
    try{
      var isCards = (typeof appMode !== "undefined" && appMode === "cards") ||
                    document.body.classList.contains("mode-cards") ||
                    document.body.classList.contains("mode-card");
      if(!isCards) return false;

      if(typeof cardIndex === "undefined") return false;

      // 表カードが見えている時だけ記録。裏面/未抽選では入れない。
      if(typeof cardFlipped !== "undefined" && cardFlipped !== false) return false;

      return recordIndexOncePerDay(Number(cardIndex), todayKeyV100());
    }catch(e){
      return false;
    }
  }

  function syncTodayIfAlreadyDrawn(){
    // まず現在画面の表カードを最優先で拾う。
    // カードを引いた直後に daily localStorage の反映が遅れても、即バインダーへ入れる。
    if(recordCurrentVisibleCardV100()) return;

    // 画面から拾えない場合は、今日カード保存から復元する。
    try{
      var s = JSON.parse(localStorage.getItem("meganeCardDailyV92") || "{}");
      if(!s || !s.drawn || !validIndex(Number(s.index))) return;

      var dateKey = s.date || todayKeyV100();
      var idx = Number(s.index);

      if(recordIndexOncePerDay(idx, dateKey)) return;

      // 旧版で「記録済み扱い」だけ残って履歴が空の事故を補正。
      var arr = normalizeHistory();
      if(arr.length === 0){
        addCard(idx);
      }
    }catch(e){}
  }

  function boot(){
    normalizeHistory();
    syncTodayIfAlreadyDrawn();
    bindOpen();
    setInterval(bindOpen, 1000);

    // カードを引いた直後でも、タップ終了後に表カードを拾って専用履歴へ入れる。
    ["click","touchend","pointerup"].forEach(function(type){
      document.addEventListener(type, function(){
        setTimeout(syncTodayIfAlreadyDrawn, 520);
      }, true);
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MEGANE_CARD_COLLECTION_V100 = {
    addCard:addCard,
    countMap:countMap,
    normalizeHistory:normalizeHistory
  };
})();
