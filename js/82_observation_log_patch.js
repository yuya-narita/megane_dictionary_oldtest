/* 82_observation_log_patch.js
   観測ログ v9 Growing Looking Bear
   - voice-map.js由来の単語ID→日本語表示を追加
   - 構文タイプ称号を増量
   - 自分の定義数を localStorage から集計
   - 定義保存キー:
     megane_user_definitions_single_by_word_v1
     megane_user_definitions_by_word_v1
   - Build 1.0.3 長押し → Developer
*/
(function(){
  "use strict";

  var LOG_KEY = "megane_observation_log_v1";
  var LONG_MS = 850;

  function now(){ return new Date().toISOString(); }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }

  function readJson(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }

  function userDefinitionCount(){
    var count = 0;
    var seen = {};

    // 現行：1単語1定義
    var single = readJson("megane_user_definitions_single_by_word_v1", {});
    Object.keys(single || {}).forEach(function(k){
      var d = single[k] || {};
      if(d.text && String(d.text).trim()){
        seen[k] = true;
        count++;
      }
    });

    // 旧形式：1単語複数定義。移行漏れ保険。
    var old = readJson("megane_user_definitions_by_word_v1", {});
    Object.keys(old || {}).forEach(function(k){
      if(seen[k]) return;
      var arr = old[k] || [];
      if(Array.isArray(arr) && arr.some(function(x){ return x && x.text && String(x.text).trim(); })){
        count++;
      }
    });

    return count;
  }

  function userDefinitionTitle(n){
    if(n <= 0) return "読むだけ観測者";
    if(n === 1) return "初回改変者";
    if(n < 10) return "意味メモ職人";
    if(n < 30) return "意味改変者";
    if(n < 100) return "辞書汚染者";
    return "共著者";
  }

  function normalize(d){
    d = d || {};
    d.createdAt = d.createdAt || now();
    d.lastSeenAt = d.lastSeenAt || now();
    d.appOpen = Number(d.appOpen || 0);
    d.totalEvents = Number(d.totalEvents || 0);
    d.events = d.events || {};
    d.dictionary = d.dictionary || { taps:0, voices:0, words:{}, megane:{} };
    d.dictionary.words = d.dictionary.words || {};
    d.dictionary.megane = d.dictionary.megane || {};
    d.cards = d.cards || { draws:0, kinds:0, total:0 };
    d.music = d.music || { plays:0, completes:0, seconds:0, tracks:{} };
    d.music.tracks = d.music.tracks || {};
    d.conference = d.conference || { plays:0, completes:0, seconds:0 };
    d.unlocks = d.unlocks || [];
    return d;
  }

  function load(){
    try{
      var d = normalize(JSON.parse(localStorage.getItem(LOG_KEY) || "{}") || {});
      return migrateDictionaryAudioFromMusic(d);
    }
    catch(e){ return normalize({}); }
  }

  function save(d){
    try{ localStorage.setItem(LOG_KEY, JSON.stringify(normalize(d))); }catch(e){}
  }

  function inc(obj, key, n){
    if(!key) return;
    obj[key] = Number(obj[key] || 0) + (n || 1);
  }

  function refreshCardStats(d){
    try{
      var raw = localStorage.getItem("cardCollectionV100") || localStorage.getItem("megane_card_collection_v100") || "";
      var parsed = raw ? JSON.parse(raw) : null;
      var counts = {};
      if(Array.isArray(parsed)){
        parsed.forEach(function(x){ counts[String(x)] = (counts[String(x)] || 0) + 1; });
      }else if(parsed && typeof parsed === "object"){
        Object.keys(parsed).forEach(function(k){ counts[k] = Number(parsed[k] || 0); });
      }
      d.cards.kinds = Object.keys(counts).filter(function(k){ return Number(counts[k] || 0) > 0; }).length;
      d.cards.total = Object.keys(counts).reduce(function(a,k){ return a + Number(counts[k] || 0); }, 0);
    }catch(e){}
  }


  function dictionaryAudioInfo(s){
    var raw = String(s || "").trim();
    if(!raw || raw === "unknown") return null;
    try{ raw = decodeURIComponent(raw); }catch(e){}
    raw = raw.split("/").pop().split("?")[0];
    raw = raw.replace(/\.(mp3|m4a|wav|ogg)$/i, "");

    var m = raw.match(/(?:^|[_\-\s])(gag|happy|math|hacker|science|medical|economy|comm|communication|xeno|zurea|nyx|xeris|quelina|radek|milca|neia)(?:[_\-\s]?\d+)?$/i);
    if(!m) return null;

    var lens = String(m[1] || "").toLowerCase();
    var meganeMap = {
      gag:"ギャグメガネ", zurea:"ギャグメガネ",
      happy:"ハッピーメガネ", quelina:"ハッピーメガネ",
      math:"数学メガネ", xeris:"数学メガネ",
      hacker:"ハッカーメガネ", nyx:"ハッカーメガネ",
      science:"科学メガネ", radek:"科学メガネ",
      medical:"医療メガネ", milca:"医療メガネ",
      economy:"経済メガネ", neia:"経済メガネ",
      comm:"コミュニケーションメガネ",
      communication:"コミュニケーションメガネ",
      xeno:"コミュニケーションメガネ"
    };

    return { word: displayWord(raw), megane: meganeMap[lens] || displayMegane(lens) };
  }

  function migrateDictionaryAudioFromMusic(d){
    var tracks = (d.music && d.music.tracks) || {};
    var moved = 0;
    Object.keys(tracks).forEach(function(k){
      var info = dictionaryAudioInfo(k);
      var n = Number(tracks[k] || 0);
      if(!info || n <= 0) return;
      inc(d.dictionary.words, info.word, n);
      inc(d.dictionary.megane, info.megane, n);
      d.dictionary.voices += n;
      moved += n;
      delete tracks[k];
    });
    if(moved > 0) d.music.plays = Math.max(0, Number(d.music.plays || 0) - moved);
    return d;
  }

  function observe(name, payload){
    var d = load();
    payload = payload || {};
    d.lastSeenAt = now();
    d.totalEvents++;
    inc(d.events, name, 1);

    if(name === "app.open") d.appOpen++;

    if(name === "dictionary.tap"){
      d.dictionary.taps++;
      inc(d.dictionary.words, displayWord(payload.word || payload.title || "unknown"), 1);
      inc(d.dictionary.megane, displayMegane(payload.megane || "unknown"), 1);
    }

    if(name === "dictionary.voice"){
      d.dictionary.voices++;
      inc(d.dictionary.words, displayWord(payload.word || payload.title || "unknown"), 1);
      inc(d.dictionary.megane, displayMegane(payload.megane || "unknown"), 1);
    }

    if(name === "card.draw"){
      d.cards.draws++;
      refreshCardStats(d);
    }

    if(name === "music.play"){
      var audioInfo = dictionaryAudioInfo(payload.title || payload.track || payload.audio || payload.src || "");
      if(audioInfo){
        d.dictionary.voices++;
        inc(d.dictionary.words, audioInfo.word, 1);
        inc(d.dictionary.megane, audioInfo.megane, 1);
      }else{
        d.music.plays++;
        inc(d.music.tracks, displayTrack(payload.title || payload.track || "unknown"), 1);
      }
    }

    if(name === "music.complete"){
      d.music.completes++;
    }

    if(name === "music.seconds") d.music.seconds += Number(payload.seconds || 0);
    if(name === "conference.play") d.conference.plays++;
    if(name === "conference.complete") d.conference.completes++;
    if(name === "conference.seconds") d.conference.seconds += Number(payload.seconds || 0);

    if(name.indexOf("unlock.") === 0){
      var id = payload.id || name.replace(/^unlock\./,"");
      if(d.unlocks.indexOf(id) < 0) d.unlocks.push(id);
    }

    save(d);
    checkLv7Notice(d);
    return d;
  }

  function displayMegane(s){
    s = String(s || "").trim();
    if(!s || s === "unknown") return "未分類";
    if(/gag|ズレア|ギャグ/i.test(s)) return "ギャグメガネ";
    if(/happy|クエリナ|ハッピー/i.test(s)) return "ハッピーメガネ";
    if(/math|ゼリス|数学/i.test(s)) return "数学メガネ";
    if(/hacker|ニクス|ハッカー/i.test(s)) return "ハッカーメガネ";
    return s;
  }

  function normalizeWordKey(s){
    s = String(s || "").trim();
    if(!s || s === "unknown") return "";
    try{ s = decodeURIComponent(s); }catch(e){}
    s = s.split("/").pop().split("?")[0];
    s = s.replace(/\.(mp3|m4a|wav|ogg)$/i, "");
    s = s.replace(/[-_]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    s = s.replace(/\s+(gag|happy|math|hacker|science|medical|economy|comm|communication|xeno|zurea|nyx|xeris|quelina|radek|milca|neia)\s*\d*$/i, "");
    s = s.replace(/\s+\d+$/i, "");
    return s.toLowerCase().trim();
  }

  function addWordMapAlias(map, alias, word){
    alias = normalizeWordKey(alias);
    word = String(word || "").trim();
    if(alias && word) map[alias] = word;
  }

  function getWordList(){
    try{
      if(window.data && Array.isArray(window.data.words)) return window.data.words;
      if(window.MEGANE_WORDS && Array.isArray(window.MEGANE_WORDS)) return window.MEGANE_WORDS;
      if(window.words && Array.isArray(window.words)) return window.words;
    }catch(e){}
    return [];
  }

  function getVoiceMap(){
    try{
      if(window.MEGANE_VOICE_MAP && typeof window.MEGANE_VOICE_MAP === "object") return window.MEGANE_VOICE_MAP;
      if(window.voiceMap && typeof window.voiceMap === "object") return window.voiceMap;
      if(window.VOICE_MAP && typeof window.VOICE_MAP === "object") return window.VOICE_MAP;
      if(window.dictionaryVoiceMap && typeof window.dictionaryVoiceMap === "object") return window.dictionaryVoiceMap;
      if(window.dictionaryVoiceLines && typeof window.dictionaryVoiceLines === "object") return window.dictionaryVoiceLines;
    }catch(e){}
    return {};
  }

  function buildWordDisplayMap(){
    var out = {};

    getWordList().forEach(function(w){
      var word = String((w && (w.word || w.title || w.name)) || "").trim();
      if(!word) return;
      addWordMapAlias(out, word, word);
      var id = String((w && (w.id || w.key || w.slug)) || "").trim();
      if(id) addWordMapAlias(out, id, word);
    });

    var vm = getVoiceMap();
    Object.keys(vm || {}).forEach(function(k){
      var v = vm[k];
      var word = "";
      if(/[ぁ-んァ-ヶ一-龠]/.test(k)) word = k;
      if(!word && v && typeof v === "object"){
        word = String(v.word || v.title || v.name || "").trim();
      }
      if(!word) return;

      addWordMapAlias(out, k, word);

      if(v && typeof v === "object"){
        Object.keys(v).forEach(function(g){
          var val = v[g];
          if(typeof val === "string"){
            addWordMapAlias(out, val, word);
          }else if(val && typeof val === "object"){
            addWordMapAlias(out, val.id || "", word);
            addWordMapAlias(out, val.src || val.audio || val.file || val.url || "", word);
          }
        });
      }
    });

    return out;
  }

  function displayWord(s){
    var raw = String(s || "").trim();
    if(!raw || raw === "unknown") return "未分類";
    var key = normalizeWordKey(raw);
    if(!key) return "未分類";
    var map = buildWordDisplayMap();
    if(map[key]) return map[key];
    if(/[ぁ-んァ-ヶ一-龠]/.test(raw)) return raw.replace(/^\s+|\s+$/g, "");
    return key.replace(/_/g, " ");
  }


  function displayTrack(s){
    s = String(s || "").trim();
    if(!s || s === "unknown") return "未分類";
    s = decodeURIComponent(s).split("/").pop().split("?")[0];
    s = s.replace(/\.(mp3|m4a|wav|ogg)$/i, "");

    try{
      var arr = (typeof musicPlaylists !== "undefined" && Array.isArray(musicPlaylists)) ? musicPlaylists :
                (window.musicPlaylists && Array.isArray(window.musicPlaylists) ? window.musicPlaylists : []);
      for(var i=0;i<arr.length;i++){
        var tracks = arr[i].tracks || [];
        for(var j=0;j<tracks.length;j++){
          var tr = tracks[j];
          var id = String(tr.id || "");
          var title = String(tr.title || "");
          var audio = String(tr.audio || "");
          if((id && s.indexOf(id) >= 0) || (audio && audio.indexOf(s) >= 0) || (title && s.indexOf(title) >= 0)){
            return title || id || s;
          }
        }
      }
    }catch(e){}

    return s.replace(/_/g, " ");
  }

  function topList(obj, max){
    return Object.keys(obj || {})
      .filter(function(k){ return k && k !== "unknown" && k !== "未分類" && Number(obj[k] || 0) > 0; })
      .sort(function(a,b){ return Number(obj[b] || 0) - Number(obj[a] || 0); })
      .slice(0, max || 5)
      .map(function(k){ return {key:k, value:Number(obj[k] || 0)}; });
  }

  function syntaxType(d){
    var ranks = topList(d.dictionary.megane, 4);
    if(!ranks.length) return "未観測";

    var total = ranks.reduce(function(a,x){ return a + x.value; }, 0);
    var top = ranks[0];
    var second = ranks[1] || { key:"", value:0 };
    var ratio = total ? top.value / total : 0;
    var gap = top.value - second.value;
    var defs = userDefinitionCount();
    var cardKinds = Number((d.cards && d.cards.kinds) || 0);
    var musicPlays = Number((d.music && d.music.plays) || 0);
    var confPlays = Number((d.conference && d.conference.plays) || 0);

    if(total < 3) return "観測中";

    // 書く人・広く遊ぶ人の特殊称号
    if(defs >= 100) return "辞書共犯者";
    if(defs >= 30) return "意味汚染型";
    if(defs >= 10) return "意味改変型";
    if(cardKinds >= 25) return "バインダー亡者";
    if(musicPlays >= 50) return "耳から観測型";
    if(confPlays >= 30) return "会議常駐型";

    // 拮抗・混合
    if(total >= 8 && ratio < 0.34) return "全方位観測型";
    if(total >= 8 && ratio < 0.45) return "多視点同期型";
    if(second.value > 0 && gap <= 1 && total >= 6) return "構文ゆらぎ型";

    var strong = ratio >= 0.70 || (top.value >= 8 && gap >= 4);
    var mid = ratio >= 0.50 || gap >= 2;

    var titles = {
      "ギャグメガネ": {
        strong: ["ズレ耐性Lv99", "世界を笑わせる側", "ボケ回収業者"],
        mid: ["ツッコミ待機型", "違和感収集家", "バグ許容型"],
        weak: ["ネタ発掘型", "笑い待ち"]
      },
      "ハッピーメガネ": {
        strong: ["希望過積載型", "全部大丈夫変換機", "幸せ誤検知型"],
        mid: ["跳ね待ち型", "可能性信者", "笑顔感染型"],
        weak: ["ふわふわ観測型", "やさしさ過多"]
      },
      "数学メガネ": {
        strong: ["未定義収集型", "定義厨", "関係式中毒"],
        mid: ["構造分析型", "証明保留型", "世界を式にしたい型"],
        weak: ["定義待ち", "構造好き"]
      },
      "ハッカーメガネ": {
        strong: ["例外処理型", "ログ監視型", "回避不能型"],
        mid: ["デバッグ脳", "バグ検知型", "システム侵入型"],
        weak: ["裏側気になる型", "監視中"]
      }
    };

    var set = titles[top.key];
    if(!set) return top.key + "型";

    var arr = strong ? set.strong : (mid ? set.mid : set.weak);
    // 同じ状態でも少し変化が出るように、観測回数で選ぶ
    var idx = Math.abs(total + top.value + defs + cardKinds) % arr.length;
    return arr[idx];
  }

  function daysSince(iso){
    try{ return Math.max(1, Math.ceil((Date.now() - new Date(iso).getTime()) / 86400000)); }
    catch(e){ return 1; }
  }

  function level(d){
    var exp = 0;
    exp += Number(d.dictionary.voices || 0) * 2;
    exp += Number(d.cards.kinds || 0) * 12;
    exp += Number(d.cards.draws || 0) * 3;
    exp += Number(d.music.plays || 0) * 3;
    exp += Number(d.music.completes || 0) * 10;
    exp += Number(d.conference.plays || 0) * 5;
    exp += Number(d.conference.completes || 0) * 12;
    exp += userDefinitionCount() * 8;
    return Math.max(1, Math.floor(Math.sqrt(exp / 18)) + 1);
  }

  var LV7_NOTICE_KEY = "megane_lv7_notice_seen_v1";

  function lv7NoticeSeen(){
    try{ return localStorage.getItem(LV7_NOTICE_KEY) === "1"; }
    catch(e){ return false; }
  }

  function markLv7Notice(){
    try{ localStorage.setItem(LV7_NOTICE_KEY, "1"); }catch(e){}
  }

  function showLv7Notice(){
    if(lv7NoticeSeen()) return;
    markLv7Notice();

    var cfg = {
      title: "【運営からのお知らせ】",
      text: "観測レベル 7 に到達しました。",
      audio: "audio/notice/nyx_lv7_01.mp3"
    };

    var old = document.getElementById("noticeModalBg");
    if(old) old.remove();

    var modalAudio = null;
    var playing = false;

    function stopModalAudio(){
      try{
        if(modalAudio){
          modalAudio.pause();
          modalAudio.currentTime = 0;
        }
      }catch(e){}
      playing = false;
    }

    function playModalAudio(btn){
      if(!cfg.audio) return;
      try{
        if(!modalAudio || modalAudio.getAttribute("data-src") !== cfg.audio){
          modalAudio = new Audio(cfg.audio);
          modalAudio.setAttribute("data-src", cfg.audio);
          modalAudio.preload = "auto";
        }
        if(playing){
          stopModalAudio();
        }
        playing = true;
        if(btn){ btn.disabled = true; btn.textContent = "再生中"; }
        modalAudio.currentTime = 0;
        modalAudio.play().catch(function(){
          playing = false;
          if(btn){ btn.disabled = false; btn.textContent = "▶ 音声"; }
        });
        modalAudio.onended = function(){
          playing = false;
          if(btn){ btn.disabled = false; btn.textContent = "▶ 音声"; }
        };
      }catch(e){
        playing = false;
        if(btn){ btn.disabled = false; btn.textContent = "▶ 音声"; }
      }
    }

    var d = document.createElement("div");
    d.id = "noticeModalBg";
    d.innerHTML =
      '<div id="noticeModalCard">' +
      '<div class="ttl">' + esc(cfg.title) + '</div>' +
      '<div class="txt">' + esc(cfg.text).replace(/\n/g, "<br>") + '</div>' +
      '<div class="btns"><button id="noticePlay">▶ 音声</button><button id="noticeClose">閉じる</button></div>' +
      '</div>';
    document.body.appendChild(d);

    var close = document.getElementById("noticeClose");
    var play = document.getElementById("noticePlay");
    if(close) close.onclick = function(){ stopModalAudio(); d.remove(); };
    if(play) play.onclick = function(){ playModalAudio(this); };
  }


  function checkLv7Notice(d){
    try{
      if(level(d) >= 7 && !lv7NoticeSeen()){
        setTimeout(showLv7Notice, 220);
      }
    }catch(e){}
  }


  function ensureStyle(){
    if(document.getElementById("observationLogPatchStyleV4")) return;
    var st = document.createElement("style");
    st.id = "observationLogPatchStyleV4";
    st.textContent = ""
      + ".obs-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));background:rgba(0,0,0,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}"
      + ".obs-modal[hidden]{display:none!important}"
      + ".obs-card{width:min(92vw,460px);max-height:82vh;overflow:auto;border-radius:28px;border:1px solid rgba(255,230,170,.22);background:linear-gradient(145deg,rgba(48,31,26,.94),rgba(12,11,18,.96));color:#fff;padding:22px;box-shadow:0 24px 90px rgba(0,0,0,.65);-webkit-overflow-scrolling:touch}"
      + ".obs-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.obs-head strong{font-size:22px;letter-spacing:.06em}.obs-close{border-radius:999px;padding:8px 12px;font-weight:900}"
      + ".obs-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.obs-box{border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.055);padding:13px}.obs-box span{display:block;font-size:12px;color:rgba(255,255,255,.58);font-weight:800}.obs-box b{display:block;margin-top:5px;font-size:22px;line-height:1.15}"
      + ".obs-section{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.10)}.obs-mini-title{font-size:13px;color:rgba(255,255,255,.48);font-weight:900;margin:10px 0 4px}.obs-rank{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-weight:900;color:rgba(255,255,255,.82)}.obs-rank em{font-style:normal;color:rgba(255,230,170,.92)}"
      + ".obs-userdef{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.045);border-radius:16px;padding:11px 12px;margin-bottom:10px;font-weight:900}.obs-userdef span{color:rgba(255,255,255,.78)}.obs-userdef em{font-style:normal;color:rgba(255,230,170,.95)}"
      + ".obs-build{margin-top:18px;padding:14px 0 2px;text-align:center;color:rgba(255,255,255,.42);font-size:12px;font-weight:900;letter-spacing:.12em;user-select:none;-webkit-user-select:none}";
    document.head.appendChild(st);
  }

  function modal(id){
    ensureStyle();
    var m = document.getElementById(id);
    if(m) return m;
    m = document.createElement("div");
    m.id = id;
    m.className = "obs-modal";
    m.hidden = true;
    document.body.appendChild(m);
    m.addEventListener("click", function(e){ if(e.target === m) m.hidden = true; });
    return m;
  }

  function box(label, value){
    return '<div class="obs-box"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';
  }

  function rankHtml(title, list){
    var html = '<div class="obs-mini-title">'+esc(title)+'</div>';
    if(!list.length) return html + '<div class="obs-rank"><span>未観測</span><em>-</em></div>';
    list.forEach(function(item, i){
      html += '<div class="obs-rank"><span>'+(i+1)+'. '+esc(item.key)+'</span><em>×'+esc(item.value)+'</em></div>';
    });
    return html;
  }

  function userDefHtml(){
    var n = userDefinitionCount();
    return '<div class="obs-userdef"><span>✍ '+esc(userDefinitionTitle(n))+'</span><em>自分の定義 '+esc(n)+'件</em></div>';
  }

  function bindLongPress(el, fn, ms){
    if(!el || el.dataset.obsLongPressBound === "1") return;
    el.dataset.obsLongPressBound = "1";
    var timer = null;
    function start(e){ clearTimeout(timer); timer = setTimeout(function(){ fn(e); }, ms || LONG_MS); }
    function end(){ clearTimeout(timer); timer = null; }
    el.addEventListener("pointerdown", start, true);
    el.addEventListener("pointerup", end, true);
    el.addEventListener("pointerleave", end, true);
    el.addEventListener("pointercancel", end, true);
    el.addEventListener("touchstart", start, true);
    el.addEventListener("touchend", end, true);
    el.addEventListener("touchcancel", end, true);
  }



  var BEAR_SNAPSHOT_KEY = "megane_looking_bear_snapshot_v1";

  function bearEscape(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }

  function cloneCounts(obj){
    var out = {};
    Object.keys(obj || {}).forEach(function(k){
      var n = Number(obj[k] || 0);
      if(k && n > 0) out[k] = n;
    });
    return out;
  }

  function readBearSnapshot(){
    try{ return JSON.parse(localStorage.getItem(BEAR_SNAPSHOT_KEY) || "null"); }
    catch(e){ return null; }
  }

  function writeBearSnapshot(d){
    try{
      localStorage.setItem(BEAR_SNAPSHOT_KEY, JSON.stringify({
        at: now(),
        level: level(d),
        dictionaryVoices: Number(d.dictionary.voices || 0),
        musicPlays: Number(d.music.plays || 0),
        conferencePlays: Number(d.conference.plays || 0),
        cardTotal: Number(d.cards.total || 0),
        userDefinitions: userDefinitionCount(),
        words: cloneCounts(d.dictionary.words),
        megane: cloneCounts(d.dictionary.megane),
        tracks: cloneCounts(d.music.tracks)
      }));
    }catch(e){}
  }

  function diffCounts(current, previous){
    var out = {};
    current = current || {};
    previous = previous || {};
    Object.keys(current).forEach(function(k){
      var d = Number(current[k] || 0) - Number(previous[k] || 0);
      if(k && d > 0) out[k] = d;
    });
    return out;
  }

  function topOne(obj){
    var arr = topList(obj || {}, 1);
    return arr && arr.length ? arr[0] : null;
  }

  function bearPick(seed, arr){
    if(!arr || !arr.length) return "";
    var s = String(seed == null ? "" : seed);
    var h = 2166136261;
    for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return arr[Math.abs(h >>> 0) % arr.length];
  }

  function bearDayKey(){
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
  }

  function bearReportHtml(d, meganeRanks, wordRanks, trackRanks){
    var prev = readBearSnapshot();
    var defs = userDefinitionCount();

    var nowWords = cloneCounts(d.dictionary.words);
    var nowMegane = cloneCounts(d.dictionary.megane);
    var nowTracks = cloneCounts(d.music.tracks);

    var topM = prev ? topOne(diffCounts(nowMegane, prev.megane || {})) : (meganeRanks[0] || null);
    var topW = prev ? topOne(diffCounts(nowWords, prev.words || {})) : (wordRanks[0] || null);
    var topT = prev ? topOne(diffCounts(nowTracks, prev.tracks || {})) : (trackRanks[0] || null);

    var musicDelta = prev ? Math.max(0, Number(d.music.plays || 0) - Number(prev.musicPlays || 0)) : Number(d.music.plays || 0);
    var confDelta = prev ? Math.max(0, Number(d.conference.plays || 0) - Number(prev.conferencePlays || 0)) : Number(d.conference.plays || 0);
    var defDelta = prev ? Math.max(0, defs - Number(prev.userDefinitions || 0)) : defs;
    var cardDelta = prev ? Math.max(0, Number(d.cards.total || 0) - Number(prev.cardTotal || 0)) : Number(d.cards.total || 0);

    var changed = !!(topM || topW || topT || musicDelta || confDelta || defDelta || cardDelta);
    var totalObs = Number(d.dictionary.voices || 0);
    var lv = level(d);
    var seed = bearDayKey() + "|" + totalObs + "|" + musicDelta + "|" + confDelta + "|" + defs + "|" + (topW ? topW.key : "") + "|" + (topM ? topM.key : "");
    var lines = [];

    var firstOpen = [
      'はじめて見にきたね。<br>ぼくも、見てたよ。',
      '見つけた。<br><br>きみ、ここを見るんだね。<br>ぼくも見てるよ。',
      'こんにちは。<br><br>……で、いいのかな。<br>ずっと見てたから。',
      'きみの記録、<br>少しだけ見せてもらったよ。<br><br>ぼくの仕事だから。',
      'ここまで来たんだ。<br><br>じゃあ、少しだけ<br>ぼくが見たものを話すね。',
      '観測開始。<br><br>……なんてね。<br>ぼくはもう見てたよ。',
      'きみが見る前から、<br>ここにいたよ。<br><br>よろしくね。',
      'やっと会えたね。<br><br>ぼくはクマ。<br>見てるだけのクマ。'
    ];

    var returnOpen = [
      'また来たね。',
      'おかえり。<br><br>……ここで合ってるよ。',
      '来た。<br><br>きょうも見る？',
      'また記録を見にきたんだね。',
      '足音はしないけど、<br>来たのは分かったよ。',
      'きみだ。<br><br>覚えてるよ。',
      'また会ったね。<br><br>偶然じゃないけど。',
      '観測者が<br>観測ログを見にきた。',
      'きょうも、<br>ぼくのメモを読むんだね。',
      '待ってた。<br><br>……クマは待つの得意だから。',
      'また開いたね。<br><br>うん。見てたよ。',
      'ここ、<br>気になるようになってきた？'
    ];

    var noChange = [
      'さっきと<br>あまり変わってないね。<br><br>でも、見にきたことは<br>覚えてるよ。',
      'まだ同じ景色だね。<br><br>きみだけ、また来た。',
      '変化なし。<br><br>……でも<br>開いた回数は増えたね。',
      '新しい記録はないよ。<br><br>ぼくはいるけど。',
      'さっきも見たね。<br><br>確認したかったの？',
      '何も増えてない。<br><br>そういう日も<br>ちゃんと見てるよ。',
      'ログは静か。<br><br>きみは来た。<br>それだけ。',
      'まだ変わってないよ。<br><br>急がなくても<br>ぼくは困らない。',
      '同じだね。<br><br>……同じかどうか<br>見にきたんだね。',
      '今日は静か。<br><br>静かなログも<br>ログだから。',
      '差分、なし。<br><br>ちょっとだけ<br>ニクスみたいな言い方した。',
      '何も起きてないね。<br><br>でも、何も起きてないのを<br>ぼくは見たよ。'
    ];

    var wordLines = [
      '前より<br><strong style="color:#fff;">{WORD}</strong>が増えてた。<br>+{N}回。<br><br>また見てたね。',
      '<strong style="color:#fff;">{WORD}</strong>。<br><br>また見たんだ。<br>これで +{N}回。',
      'きょう増えたのは<br><strong style="color:#fff;">{WORD}</strong>。<br><br>{N}回ぶん、気になったみたい。',
      '<strong style="color:#fff;">{WORD}</strong>を<br>前より {N}回多く見てた。<br><br>理由は、ぼくには分からない。',
      'また<br><strong style="color:#fff;">{WORD}</strong>。<br><br>……うん。<br>ちゃんと数えてるよ。+{N}回。',
      '目が止まったのは<br><strong style="color:#fff;">{WORD}</strong>。<br><br>前より +{N}回。',
      '<strong style="color:#fff;">{WORD}</strong>に<br>戻ってきたね。<br><br>+{N}回。<br>何か残ってる？',
      'ぼくのメモには<br><strong style="color:#fff;">{WORD}</strong>。<br><br>+{N}回って書いてある。',
      '<strong style="color:#fff;">{WORD}</strong>。<br><br>きみ、これを見る時<br>少し長いね。<br><br>……たぶん。',
      'また同じ言葉を見た。<br><strong style="color:#fff;">{WORD}</strong>。<br><br>+{N}回。<br>偶然かな。',
      '今日の足あと。<br><br><strong style="color:#fff;">{WORD}</strong>、+{N}回。<br><br>消してないよ。',
      '前回から<br><strong style="color:#fff;">{WORD}</strong>が {N}回増えた。<br><br>きみの目は<br>そこに行くんだね。'
    ];

    var heavyWord = [
      '……そんなに好き？',
      'また？<br><br>いや。いいけど。',
      '気になるんだね。<br><br>かなり。',
      'ぼくより見てるかも。',
      'もう覚えたよ。<br>きみがこれを見ること。',
      'たまたま、では<br>なさそうだね。',
      'そこに何があるの？<br><br>ぼくにも教えて。',
      'きみの中では<br>まだ終わってない言葉なのかな。',
      '何回見ても<br>同じ言葉なのにね。',
      '……ぼくも<br>気になってきた。'
    ];

    var meganeLines = [
      '前より<br><strong style="color:#fff;">{MEGANE}</strong>が増えてた。<br>+{N}回。',
      '今日は<br><strong style="color:#fff;">{MEGANE}</strong>から<br>よく見てたね。<br><br>+{N}回。',
      '<strong style="color:#fff;">{MEGANE}</strong>。<br><br>きみ、今日はこの目を<br>よく借りてた。',
      '増えてたメガネは<br><strong style="color:#fff;">{MEGANE}</strong>。<br><br>+{N}回。',
      '世界を見る角度、<br>今日は<strong style="color:#fff;">{MEGANE}</strong>寄り。<br><br>ぼくのメモではね。',
      '<strong style="color:#fff;">{MEGANE}</strong>を<br>{N}回ぶん多く使ってた。<br><br>何を見てたの？',
      'きょうのきみは<br><strong style="color:#fff;">{MEGANE}</strong>。<br><br>……少なくとも<br>ログでは。',
      'メガネの跡がある。<br><br><strong style="color:#fff;">{MEGANE}</strong>、+{N}回。',
      '<strong style="color:#fff;">{MEGANE}</strong>に<br>よく戻ってた。<br><br>見やすい？',
      '前より {N}回。<br><br><strong style="color:#fff;">{MEGANE}</strong>で<br>世界を見てた。'
    ];

    var defLines = [
      'きみの言葉、<br>{N}件増えてた。<br><br>ちゃんと見つけたよ。',
      '新しい言葉を<br>{N}件残したね。<br><br>消えてないよ。',
      'きみの定義、<br>{N}件増えてた。<br><br>ぼくは読んだよ。',
      '自分の言葉が<br>{N}件増えた。<br><br>少しずつ<br>きみの辞書になってるね。',
      'また言葉を残したね。<br><br>+{N}件。<br>ぼくの近くに置いてあるよ。',
      '{N}件ぶん、<br>きみの言葉が増えた。<br><br>誰の定義とも違うやつ。',
      '書いたんだね。<br><br>{N}件。<br>……見てたよ。',
      'きみが決めた意味、<br>{N}件増えてた。<br><br>大事にする？',
      '新しい定義を見つけた。<br><br>{N}件。<br>きみの字じゃないけど<br>きみの言葉。',
      '言葉を残す瞬間って<br>少しだけ長いね。<br><br>今日は {N}件。'
    ];

    var musicLines = [
      '音楽も<br>{N}回きいてたね。',
      '今日は音が<br>{N}回流れてた。',
      '音楽、+{N}回。<br><br>ぼくも聞こえてたよ。',
      '{N}回ぶん<br>曲が流れてた。<br><br>静かなクマにも聞こえる。',
      'きみが曲を流すと<br>ここも少しだけ賑やか。<br><br>+{N}回。',
      '音楽を {N}回。<br><br>同じ場所で<br>違う時間になるね。',
      '今日は {N}回<br>音が鳴った。<br><br>ぼくは踊らないよ。',
      '曲、+{N}回。<br><br>……耳は描かれてるから<br>たぶん聞ける。',
      '{N}回きいてたね。<br><br>ぼくは曲名も<br>ちゃんと見てる。',
      '音楽のログが<br>{N}回ぶん増えてた。<br><br>いい夜だった？'
    ];

    var conferenceLines = [
      '会議室、行ったんだ。<br>+{N}回。',
      '会議室の扉が<br>{N}回開いてた。<br><br>ぼくは入ってないよ。',
      '会議、{N}回。<br><br>また難しい話してた？',
      'あの部屋に<br>{N}回行ったね。<br><br>声、ここまで聞こえるよ。',
      'Conference、+{N}回。<br><br>結論は出た？<br><br>……出てないか。',
      '会議室に {N}回。<br><br>ぼくは廊下にいたよ。',
      'また会議してたね。<br><br>+{N}回。<br>よく集まるね。',
      '{N}回ぶん<br>会議のログが増えた。<br><br>観測継続、かな。',
      '会議室、+{N}回。<br><br>クマは招待されてない。',
      'あの四人、<br>今日も喋ってたね。<br><br>{N}回ぶん。'
    ];

    var cardLines = [
      'カードも増えてた。<br>+{N}枚。',
      '新しいカード、<br>{N}枚増えたね。<br><br>カードもきみを見た？',
      'バインダーが<br>{N}枚ぶん重くなった。',
      'カード、+{N}枚。<br><br>ぼくの仲間はいた？',
      '{N}枚増えてた。<br><br>集める人って<br>並べ直すよね。',
      '新しいカードを<br>{N}枚見つけたんだ。<br><br>ぼくも見つけたよ。',
      '所持カード、+{N}枚。<br><br>ちゃんと数えた。',
      'カードが {N}枚増えた。<br><br>裏面も見た？',
      '{N}枚ぶん<br>新しい目が増えたね。',
      'バインダーに<br>{N}枚追加。<br><br>少し賑やかになった。'
    ];

    var waiting = [
      'まだ、自分の言葉は<br>残してないみたい。<br><br>ぼくは待つの得意だから。',
      'きみの言葉は<br>まだゼロ。<br><br>ゼロも見えるよ。',
      'まだ書いてないね。<br><br>書くまで<br>ぼくはここにいるよ。',
      '自分の定義は<br>まだ空っぽ。<br><br>空っぽって<br>意外と目立つね。',
      'きみの言葉、まだない。<br><br>急かしてないよ。<br>見てるだけ。',
      'まだ誰かの定義を<br>見てる途中かな。<br><br>それもいいね。',
      '自分の言葉は<br>まだ残ってない。<br><br>いつか増えたら<br>ぼくが先に見つける。',
      'ゼロ件。<br><br>……ニクスなら<br>未入力って言うのかな。',
      'まだ書かないんだね。<br><br>うん。<br>覚えておく。',
      'きみの定義は<br>まだ見つからない。<br><br>見落としてないよ。'
    ];

    function fill(t, map){
      Object.keys(map || {}).forEach(function(k){
        t = t.split("{" + k + "}").join(bearEscape(map[k]));
      });
      return t;
    }

    lines.push('<div class="obs-mini-title">クマの観測メモ</div>');
    lines.push('<div style="padding:14px 4px 8px;color:rgba(255,255,255,.88);font-size:14px;line-height:1.9;font-weight:800;">');

    if(!prev){
      lines.push(bearPick(seed+"first", firstOpen) + '<br><br>');
      if(topM) lines.push(fill(bearPick(seed+"m", meganeLines), {MEGANE:topM.key,N:topM.value}) + '<br><br>');
      if(topW){
        lines.push(fill(bearPick(seed+"w", wordLines), {WORD:topW.key,N:topW.value}));
        if(Number(topW.value || 0) >= 5) lines.push('<br><br>' + bearPick(seed+"heavy", heavyWord));
        lines.push('<br><br>');
      }
      if(defs === 0) lines.push(bearPick(seed+"wait", waiting));
      else lines.push(fill(bearPick(seed+"def", defLines), {N:defs}));
    }else if(!changed){
      lines.push(bearPick(seed+"return", returnOpen) + '<br><br>');
      lines.push(bearPick(seed+"none", noChange));
    }else{
      lines.push(bearPick(seed+"return", returnOpen) + '<br><br>');

      if(topW){
        lines.push(fill(bearPick(seed+"w", wordLines), {WORD:topW.key,N:topW.value}));
        if(Number(topW.value || 0) >= 3) lines.push('<br><br>' + bearPick(seed+"heavy", heavyWord));
        lines.push('<br><br>');
      }else if(topM){
        lines.push(fill(bearPick(seed+"m", meganeLines), {MEGANE:topM.key,N:topM.value}) + '<br><br>');
      }

      if(defDelta > 0){
        lines.push(fill(bearPick(seed+"def", defLines), {N:defDelta}));
      }else if(confDelta > 0){
        lines.push(fill(bearPick(seed+"conf", conferenceLines), {N:confDelta}));
      }else if(musicDelta > 0){
        lines.push(fill(bearPick(seed+"music", musicLines), {N:musicDelta}));
        if(topT) lines.push('<br><br>「' + bearEscape(topT.key) + '」。');
      }else if(cardDelta > 0){
        lines.push(fill(bearPick(seed+"card", cardLines), {N:cardDelta}));
      }else if(defs === 0){
        lines.push(bearPick(seed+"wait", waiting));
      }
    }

    lines.push('</div>');
    return lines.join('');
  }

  function showLog(){
    var d = load();
    refreshCardStats(d);
    save(d);

    var meganeRanks = topList(d.dictionary.megane, 4);
    var wordRanks = topList(d.dictionary.words, 3);
    var trackRanks = topList(d.music.tracks, 3);

    var m = modal("observationLogModal");
    m.innerHTML = ''
      + '<div class="obs-card">'
      + '<div class="obs-head"><strong>👁 観測ログ</strong><button class="obs-close" data-close>×</button></div>'
      + '<div class="obs-grid">'
      + box("観測レベル", "Lv." + level(d))
      + box("観測日数", daysSince(d.createdAt) + "日")
      + box("カード種類", (d.cards.kinds || 0) + " / 25")
      + box("総所持カード", (d.cards.total || 0) + "枚")
      + box("辞書観測", d.dictionary.voices || 0)
      + box("構文タイプ", syntaxType(d))
      + box("音楽再生", d.music.plays || 0)
      + box("Conference", d.conference.plays || 0)
      + '</div>'
      + '<div class="obs-section">'
      + bearReportHtml(d, meganeRanks, wordRanks, trackRanks)
      + '</div>'
      + '<div class="obs-section" style="color:rgba(255,255,255,.58);font-size:12px;line-height:1.7;font-weight:800;">またね。<br>ぼくはここにいるから。</div>'
      + '<div class="obs-build" id="obsBuildLabel">Build 1.0.3</div>'
      + '</div>';
    m.hidden = false;
    writeBearSnapshot(d);
    m.querySelector("[data-close]").onclick = function(){ m.hidden = true; };

    var build = document.getElementById("obsBuildLabel");
    if(build){
      build.dataset.obsLongPressBound = "";
      bindLongPress(build, function(){
        if(window.MEGANE_DEVELOPER_OPEN) window.MEGANE_DEVELOPER_OPEN();
      }, 1100);
    }
  }

  function findLogo(){
    var nodes = Array.prototype.slice.call(document.querySelectorAll("div,span,h1,h2,p,button"));
    return nodes.find(function(x){ return (x.textContent || "").trim() === "MEGANE DICTIONARY"; });
  }

  function autoBind(){
    var logo = findLogo();
    if(logo) bindLongPress(logo, function(){ observe("status.open"); showLog(); });
  }

  function boot(){
    observe("app.open");
    autoBind();
    setInterval(autoBind, 1000);
  }

  window.MEGANE_OBSERVE = observe;
  window.MEGANE_OBSERVATION_LOG = {
    load: load,
    save: save,
    observe: observe,
    show: showLog,
    userDefinitionCount: userDefinitionCount,
    syntaxType: function(){ return syntaxType(load()); },
    refreshCardStats: function(){ var d=load(); refreshCardStats(d); save(d); return d; },
    resetLv7Notice: function(){ try{ localStorage.removeItem(LV7_NOTICE_KEY); }catch(e){} },
    testLv7Notice: function(){
      try{ localStorage.removeItem(LV7_NOTICE_KEY); }catch(e){}
      showLv7Notice();
    },
    reset: function(){ localStorage.removeItem(LOG_KEY); observe("app.open"); }
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
