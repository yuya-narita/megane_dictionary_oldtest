/* 139_approval_bug_v061_dev.js
   LOOKING BEAR No.007 — APPROVAL BUG
   ECHO v0.3 / Storage rebuild

   - HTML/CSS social feed, no canvas
   - User-written posts are stored locally
   - Engagement grows in waves, one large viral event, then an abrupt drought
   - Likes, followers, notifications and phase survive closing/reopening
   - No player-facing reset
*/
(function(){
  "use strict";

  var API_KEY="MEGANE_APPROVAL_BUG";
  var VERSION="v0.6.1-dev-tools";
  var LEGACY_STORE_KEY="looking_bear_approval_bug_v02";
  var FALLBACK_STORE_KEY="looking_bear_approval_bug_v03_fallback";
  var DB_NAME="looking_bear_echo_db";
  var DB_VERSION=1;
  var DB_STORE="kv";
  var DB_STATE_KEY="main";
  if(window[API_KEY] && window[API_KEY].version===VERSION) return;

  var root=null,state=null,audio=null,raf=0,timers=[],dbPromise=null,saveTimer=0,saveChain=Promise.resolve(),booting=false,mediaGesture=null,profileTab="posts",pressTimer=0,pressedPostId=null,devOpen=false;
  var oldViewport=null;
  var fakeNames=["ねむい犬","うみの向こう","ゆっくり歩く人","紙コップ","未読のまま","朝のパン","レンズ越し","となりの誰か","午後4時","白い信号"];
  var commentsPositive=["わかる","好きです","これ待ってた","なんか良い","届きました","応援してます","保存しました","今日いちばん好き"];
  var commentsCold=["最近ちょっと変わったね","前の投稿の方が好きだった","おすすめに出てきた","なんか必死に見える","フォローしてたっけ","これは誰向け？"];

  function $(q){return root&&root.querySelector(q)}
  function $all(q){return root?Array.prototype.slice.call(root.querySelectorAll(q)):[]}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function block(e){if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}}
  function later(fn,ms){var id=setTimeout(fn,ms);timers.push(id);return id}
  function clearTimers(){timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);raf=0}
  function fmt(n){
    n=Math.max(0,Math.floor(Number(n)||0));
    if(n>=1000000)return (n/1000000).toFixed(n>=10000000?0:1).replace(".0","")+"M";
    if(n>=10000)return (n/1000).toFixed(n>=100000?0:1).replace(".0","")+"K";
    return n.toLocaleString("ja-JP");
  }
  function escapeHtml(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
    });
  }
  function nowISO(){return new Date().toISOString()}
  function relativeTime(iso){
    var d=Math.max(0,Date.now()-new Date(iso).getTime()),m=Math.floor(d/60000);
    if(m<1)return "今";
    if(m<60)return m+"分";
    var h=Math.floor(m/60);if(h<24)return h+"時間";
    return Math.floor(h/24)+"日";
  }
  function randomInt(a,b){return Math.floor(a+Math.random()*(b-a+1))}
  function pick(a){return a[Math.floor(Math.random()*a.length)]}

  function defaultState(){
    return{
      version:1,
      accountCreatedAt:nowISO(),
      lastOpenAt:nowISO(),
      phase:"growth",
      postCount:0,
      followers:7,
      following:18,
      totalLikes:0,
      viralSeen:false,
      algorithmUpdated:false,
      posts:[],
      notifications:[],
      unread:0,
      activeTab:"home",
      session:1,
      profile:{
        name:"あなた",
        handle:"observer",
        bio:"言葉を置いています。",
        link:"",
        avatar:"",
        header:""
      },
      profileViews:0,
      savedCount:0,
      trendTags:["#LOOKINGBEAR","#ECHO","#今日の投稿"],
      recommendations:[],
      theme:"auto"
    };
  }
  function sanitizeState(value,stripImages){
    var copy;
    try{copy=JSON.parse(JSON.stringify(value||defaultState()))}catch(e){copy=defaultState()}
    delete copy._pendingAvatar;
    delete copy._pendingHeader;
    delete copy._pendingPostImage;
    if(stripImages){
      if(copy.profile){copy.profile.avatar="";copy.profile.header=""}
      (copy.posts||[]).forEach(function(p){p.image=""});
    }
    return copy;
  }

  function openDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error("IndexedDB unavailable"));return}
      var req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=function(){
        var db=req.result;
        if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE);
      };
      req.onsuccess=function(){resolve(req.result)};
      req.onerror=function(){reject(req.error||new Error("IndexedDB open failed"))};
      req.onblocked=function(){reject(new Error("IndexedDB blocked"))};
    });
    return dbPromise;
  }

  function idbGet(key){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx=db.transaction(DB_STORE,"readonly");
        var req=tx.objectStore(DB_STORE).get(key);
        req.onsuccess=function(){resolve(req.result)};
        req.onerror=function(){reject(req.error||new Error("IndexedDB read failed"))};
      });
    });
  }

  function idbPut(key,value){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx=db.transaction(DB_STORE,"readwrite");
        tx.objectStore(DB_STORE).put(value,key);
        tx.oncomplete=function(){resolve()};
        tx.onerror=function(){reject(tx.error||new Error("IndexedDB write failed"))};
        tx.onabort=function(){reject(tx.error||new Error("IndexedDB write aborted"))};
      });
    });
  }

  function mergeLoaded(v){
    var d=defaultState();
    Object.keys(v||{}).forEach(function(k){d[k]=v[k]});
    d.posts=Array.isArray(d.posts)?d.posts:[];
    d.notifications=Array.isArray(d.notifications)?d.notifications:[];
    d.profile=Object.assign(defaultState().profile,d.profile||{});
    d.trendTags=Array.isArray(d.trendTags)?d.trendTags:["#LOOKINGBEAR","#ECHO","#今日の投稿"];
    d.recommendations=Array.isArray(d.recommendations)?d.recommendations:[];
    d.profileViews=Number(d.profileViews)||0;
    d.savedCount=Number(d.savedCount)||0;
    d.session=(Number(d.session)||0)+1;
    simulateOfflineWorld(d);
    d.lastOpenAt=nowISO();
    return d;
  }

  function readLegacyState(){
    var keys=[LEGACY_STORE_KEY,FALLBACK_STORE_KEY,"looking_bear_approval_bug_v01"];
    for(var i=0;i<keys.length;i++){
      try{
        var raw=localStorage.getItem(keys[i]);
        if(raw){
          var parsed=JSON.parse(raw);
          if(parsed&&typeof parsed==="object")return parsed;
        }
      }catch(e){}
    }
    return null;
  }

  function loadState(){
    return idbGet(DB_STATE_KEY).then(function(v){
      if(v)return mergeLoaded(v);
      var legacy=readLegacyState();
      var migrated=mergeLoaded(legacy||defaultState());
      return idbPut(DB_STATE_KEY,sanitizeState(migrated,false)).then(function(){return migrated});
    }).catch(function(){
      var legacy=readLegacyState();
      return mergeLoaded(legacy||defaultState());
    });
  }

  function writeFallback(snapshot){
    try{
      localStorage.setItem(FALLBACK_STORE_KEY,JSON.stringify(sanitizeState(snapshot,true)));
    }catch(e){}
  }

  function saveNow(){
    if(!state)return Promise.resolve();
    state.lastOpenAt=nowISO();
    var snapshot=sanitizeState(state,false);
    writeFallback(snapshot);
    saveChain=saveChain.catch(function(){}).then(function(){
      return idbPut(DB_STATE_KEY,snapshot);
    }).catch(function(err){
      console.warn("[ECHO] IndexedDB save failed; text fallback retained.",err);
    });
    return saveChain;
  }

  function save(immediate){
    if(!state)return Promise.resolve();
    state.lastOpenAt=nowISO();
    clearTimeout(saveTimer);
    if(immediate)return saveNow();
    saveTimer=setTimeout(function(){saveNow()},120);
    return Promise.resolve();
  }

  function simulateOfflineWorld(d){
    try{
      var last=new Date(d.lastOpenAt||Date.now()).getTime();
      var elapsed=Math.max(0,Date.now()-last);
      var hours=Math.floor(elapsed/3600000);
      if(hours<=0)return;
      var drift=Math.min(1200,Math.max(-50,Math.round(hours*(Math.random()*3.2-0.35))));
      d.followers=Math.max(0,(Number(d.followers)||0)+drift);
      d.profileViews+=(Math.max(1,hours)*randomInt(1,8));
      if(hours>=6){
        d.notifications.push({icon:"◉",title:"プロフィールが閲覧されました",body:Math.max(1,hours*randomInt(1,4))+"件の閲覧",at:nowISO(),unread:true});
        d.unread=(Number(d.unread)||0)+1;
      }
      if(hours>=24 && d.posts.length){
        d.notifications.push({icon:"↻",title:"過去の投稿が再び見られています",body:"ECHO内で小さな反響が続いています",at:nowISO(),unread:true});
        d.unread++;
      }
      d.notifications=d.notifications.slice(-100);
    }catch(e){}
  }

  function ensureStyle(){
    if(document.getElementById("approvalBugStyleV061DEV"))return;
    var s=document.createElement("style");
    s.id="approvalBugStyleV061DEV";
    s.textContent=`
      #approvalBugRoot,#approvalBugRoot *{box-sizing:border-box}
      #approvalBugRoot{
        --bg:#f5f7fa;--panel:#fff;--text:#17202a;--muted:#708090;--line:#e3e8ee;
        --accent:#635bff;--accent2:#8d7dff;--danger:#e94b72;
        position:fixed;inset:0;z-index:2147483500;background:var(--bg);color:var(--text);
        font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","Noto Sans JP",sans-serif;
        overflow:hidden;-webkit-user-select:none;user-select:none;
      }
      #approvalBugRoot .ab-shell{position:absolute;inset:0;display:flex;flex-direction:column}
      #approvalBugRoot .ab-top{
        flex:0 0 auto;min-height:64px;padding:max(12px,env(safe-area-inset-top)) 14px 10px;
        display:flex;align-items:flex-end;justify-content:space-between;background:rgba(255,255,255,.96);
        border-bottom:1px solid var(--line);backdrop-filter:blur(14px);z-index:20;
      }
      #approvalBugRoot .ab-brand{display:flex;align-items:center;gap:9px;font-weight:900;letter-spacing:-.02em}
      #approvalBugRoot .ab-mark{width:31px;height:31px;border-radius:10px;display:grid;place-items:center;
        background:linear-gradient(145deg,var(--accent),var(--accent2));color:#fff;font-weight:1000}
      #approvalBugRoot .ab-top-actions{display:flex;gap:8px}
      #approvalBugRoot .ab-icon{
        position:relative;width:42px;height:42px;border:0;border-radius:50%;background:#f0f3f7;color:#27313d;
        font:800 19px/1 system-ui;
      }
      #approvalBugRoot .ab-badge{
        position:absolute;right:-2px;top:-3px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;
        display:none;place-items:center;background:var(--danger);color:#fff;font:800 10px/19px system-ui;
      }
      #approvalBugRoot .ab-badge.show{display:grid}
      #approvalBugRoot .ab-main{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}
      #approvalBugRoot .ab-view{position:absolute;inset:0;display:none;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:92px}
      #approvalBugRoot .ab-view.show{display:block}
      #approvalBugRoot .ab-compose{
        margin:12px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:15px;
        box-shadow:0 8px 28px rgba(28,39,55,.07);transition:.18s ease
      }
      #approvalBugRoot .ab-compose:focus-within{border-color:rgba(99,91,255,.55);box-shadow:0 10px 34px rgba(99,91,255,.12)}
      #approvalBugRoot .ab-userline{display:flex;align-items:center;gap:10px;margin-bottom:10px}
      #approvalBugRoot .ab-avatar{
        width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#101722;color:#fff;
        font-size:21px;flex:0 0 auto;overflow:hidden
      }
      #approvalBugRoot .ab-account{min-width:0}
      #approvalBugRoot .ab-name{font-size:14px;font-weight:850}
      #approvalBugRoot .ab-handle{font-size:11px;color:var(--muted)}
      #approvalBugRoot textarea{
        width:100%;min-height:156px;max-height:340px;resize:none;border:0;outline:0;background:transparent;color:var(--text);
        font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","Noto Sans JP",sans-serif;
        font-size:18px;font-weight:500;line-height:1.6;
        -webkit-text-size-adjust:100%;text-size-adjust:100%;
        padding:10px 2px 12px;overflow-y:auto
      }
      #approvalBugRoot textarea::placeholder{color:#9ba7b4}
      #approvalBugRoot .ab-compose-foot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px}
      #approvalBugRoot .ab-tools{display:flex;gap:9px;color:var(--accent);font-size:18px}
      #approvalBugRoot .ab-post-btn{
        border:0;border-radius:999px;min-width:96px;padding:12px 22px;background:linear-gradient(145deg,var(--accent),var(--accent2));
        color:#fff;font-weight:900;font-size:14px;letter-spacing:.02em;opacity:.45
      }
      #approvalBugRoot .ab-post-btn.ready{opacity:1}
      #approvalBugRoot .ab-feed-head{padding:5px 16px 9px;color:var(--muted);font-size:11px;font-weight:750;letter-spacing:.08em}
      #approvalBugRoot .ab-post{
        background:var(--panel);border-top:1px solid var(--line);border-bottom:1px solid var(--line);
        padding:14px 15px;margin-bottom:9px
      }
      #approvalBugRoot .ab-post-top{display:flex;gap:10px}
      #approvalBugRoot .ab-post-body{min-width:0;flex:1}
      #approvalBugRoot .ab-post-meta{display:flex;align-items:baseline;gap:5px;white-space:nowrap;overflow:hidden}
      #approvalBugRoot .ab-post-meta b{font-size:13px}
      #approvalBugRoot .ab-post-meta span{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}
      #approvalBugRoot .ab-text{margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.55}
      #approvalBugRoot .ab-post-stats{display:flex;gap:24px;margin:12px 0 0 54px;color:#687687;font-size:12px}
      #approvalBugRoot .ab-stat{display:flex;align-items:center;gap:5px;transition:.18s}
      #approvalBugRoot .ab-stat.like.hot{color:var(--danger);transform:scale(1.12);font-weight:800}
      #approvalBugRoot .ab-post.early-glow{animation:abEarlyGlow .7s ease}
      #approvalBugRoot .ab-soft-toast{
        position:fixed;left:50%;bottom:95px;z-index:85;transform:translateX(-50%) translateY(12px);
        padding:10px 14px;border-radius:999px;background:rgba(20,26,38,.94);color:#fff;
        font-size:12px;font-weight:850;opacity:0;pointer-events:none;transition:.2s
      }
      #approvalBugRoot .ab-soft-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      #approvalBugRoot .ab-dev-panel{
        position:absolute;inset:0;z-index:140;display:none;background:rgba(8,10,16,.88);
        backdrop-filter:blur(8px);padding:calc(env(safe-area-inset-top) + 16px) 14px 24px;overflow:auto
      }
      #approvalBugRoot .ab-dev-panel.show{display:block}
      #approvalBugRoot .ab-dev-card{
        width:min(100%,520px);margin:0 auto;background:#111622;color:#eef2ff;border:1px solid #333b52;
        border-radius:20px;padding:16px
      }
      #approvalBugRoot .ab-dev-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      #approvalBugRoot .ab-dev-head b{font-size:18px;letter-spacing:.08em}
      #approvalBugRoot .ab-dev-close{width:42px;height:42px;border:0;border-radius:50%;background:#252d40;color:#fff;font-size:22px}
      #approvalBugRoot .ab-dev-status{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.65;background:#0b0f18;border:1px solid #293148;border-radius:12px;padding:12px;margin-bottom:14px}
      #approvalBugRoot .ab-dev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #approvalBugRoot .ab-dev-grid button{
        min-height:54px;border:1px solid #3a4562;border-radius:13px;background:#1a2234;color:#fff;
        font-weight:850;font-size:12px;padding:10px
      }
      #approvalBugRoot .ab-dev-grid button.danger{border-color:#7c3044;color:#ff9ab2}
      #approvalBugRoot .ab-dev-note{margin-top:13px;color:#9eabc2;font-size:10px;line-height:1.6}

      @keyframes abEarlyGlow{
        0%{box-shadow:0 0 0 rgba(99,91,255,0)}
        45%{box-shadow:0 0 28px rgba(99,91,255,.16)}
        100%{box-shadow:0 0 0 rgba(99,91,255,0)}
      }

      #approvalBugRoot .ab-stat.like{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      #approvalBugRoot .ab-stat.like.self-liked{color:var(--danger);font-weight:900}
      #approvalBugRoot .ab-stat.like.self-liked .ab-heart{display:inline-block;transform:scale(1.08)}
      #approvalBugRoot .ab-comments{margin:10px 0 0 54px;border-left:2px solid #edf0f4;padding-left:10px}
      #approvalBugRoot .ab-comment{font-size:11px;color:#5d6976;margin:6px 0}
      #approvalBugRoot .ab-empty{padding:60px 22px;text-align:center;color:var(--muted);line-height:1.7}

      #approvalBugRoot .ab-profile-hero{position:relative;background:var(--panel);border-bottom:1px solid var(--line)}
      #approvalBugRoot .ab-header-img{height:132px;background:linear-gradient(135deg,#6067ff,#9c7dff 60%,#ff98ba);background-size:cover;background-position:center}
      #approvalBugRoot .ab-profile-body{padding:0 16px 18px}
      #approvalBugRoot .ab-profile-avatar-wrap{display:flex;justify-content:space-between;align-items:flex-end;margin-top:-38px}
      #approvalBugRoot .ab-profile-avatar-img{width:82px;height:82px;border-radius:50%;border:4px solid var(--panel);background:#101722;display:grid;place-items:center;color:#fff;font-size:34px;background-size:cover;background-position:center}
      #approvalBugRoot .ab-edit-profile{border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--text);padding:9px 14px;font-weight:800}
      #approvalBugRoot .ab-profile-tabs{display:flex;border-top:1px solid var(--line)}
      #approvalBugRoot .ab-profile-tabs button{flex:1;border:0;background:transparent;color:var(--muted);padding:12px 4px;font-weight:750}
      #approvalBugRoot .ab-profile-tabs button.active{color:var(--text);border-bottom:3px solid var(--accent)}
      #approvalBugRoot .ab-profile-panel{min-height:180px}
      #approvalBugRoot .ab-media-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--line)}
      #approvalBugRoot .ab-media-grid button{
        aspect-ratio:1/1;border:0;padding:0;background:#111;overflow:hidden;border-radius:0
      }
      #approvalBugRoot .ab-media-grid img{
        width:100%;height:100%;object-fit:cover;display:block;border-radius:0
      }
      #approvalBugRoot .ab-reply-empty{padding:54px 18px;text-align:center;color:var(--muted);line-height:1.7}
      #approvalBugRoot .ab-post-menu{
        position:absolute;inset:0;z-index:95;display:none;place-items:end center;padding:18px;
        background:rgba(0,0,0,.45);backdrop-filter:blur(5px)
      }
      #approvalBugRoot .ab-post-menu.show{display:grid}
      #approvalBugRoot .ab-sheet{width:min(100%,430px);border-radius:20px;background:var(--panel);padding:12px}
      #approvalBugRoot .ab-sheet button{width:100%;border:0;border-radius:14px;padding:14px;background:transparent;color:var(--text);font-weight:850}
      #approvalBugRoot .ab-sheet button.danger{color:var(--danger)}
      #approvalBugRoot .ab-comment-modal .ab-modal-card{padding:0;overflow:hidden}
      #approvalBugRoot .ab-comment-head{padding:15px 17px;border-bottom:1px solid var(--line);font-weight:900}
      #approvalBugRoot .ab-comment-list{max-height:54vh;overflow:auto;padding:12px 16px}
      #approvalBugRoot .ab-comment-row{padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;line-height:1.55}
      #approvalBugRoot .ab-comment-compose{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}
      #approvalBugRoot .ab-comment-compose input{flex:1;min-width:0;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--text);padding:11px 14px;font-size:16px}
      #approvalBugRoot .ab-comment-compose button{border:0;border-radius:999px;background:var(--accent);color:#fff;padding:0 16px;font-weight:900}

      #approvalBugRoot .ab-media-thumb{
        position:relative;margin:10px 0 0 54px;border-radius:15px;overflow:hidden;border:1px solid var(--line);background:#eef1f6;
        touch-action:pan-y
      }
      #approvalBugRoot .ab-media-thumb::after{
        content:"タップで表示";position:absolute;right:9px;bottom:9px;padding:5px 8px;border-radius:999px;
        background:rgba(0,0,0,.58);color:#fff;font-size:10px;font-weight:800;pointer-events:none
      }
      #approvalBugRoot .ab-media-thumb img{
        display:block;width:100%;max-height:360px;object-fit:cover;cursor:zoom-in;
        pointer-events:none;touch-action:pan-y;-webkit-user-drag:none;-webkit-touch-callout:none
      }
      #approvalBugRoot .ab-image-chip{font-size:12px;color:var(--accent);font-weight:800}
      #approvalBugRoot .ab-add-image-label{
        display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;
        background:var(--panel);color:var(--accent);padding:9px 13px;font-size:12px;font-weight:850;cursor:pointer
      }
      #approvalBugRoot .ab-add-image-label:active{transform:translateY(1px)}
      #approvalBugRoot .ab-remove-image{
        display:none;border:0;background:transparent;color:var(--danger);font-size:12px;font-weight:850
      }
      #approvalBugRoot .ab-remove-image.show{display:inline-block}

      #approvalBugRoot .ab-trends{margin:12px;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden}
      #approvalBugRoot .ab-trends h3{margin:0;padding:14px 15px;font-size:15px;border-bottom:1px solid var(--line)}
      #approvalBugRoot .ab-trend{padding:12px 15px;border-bottom:1px solid var(--line)}
      #approvalBugRoot .ab-trend:last-child{border-bottom:0}
      #approvalBugRoot .ab-trend b{display:block;font-size:13px}
      #approvalBugRoot .ab-trend span{font-size:11px;color:var(--muted)}
      #approvalBugRoot .ab-modal{position:absolute;inset:0;z-index:90;display:none;place-items:center;padding:18px;background:rgba(10,13,20,.72);backdrop-filter:blur(8px)}
      #approvalBugRoot .ab-modal.show{display:grid}
      #approvalBugRoot .ab-modal-card{width:min(95%,430px);max-height:90%;overflow:auto;background:var(--panel);border-radius:22px;padding:18px}
      #approvalBugRoot .ab-modal-card h2{margin:0 0 15px}
      #approvalBugRoot .ab-field{margin:12px 0}
      #approvalBugRoot .ab-field label{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}
      #approvalBugRoot .ab-field input,#approvalBugRoot .ab-field textarea{
        width:100%;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--text);
        padding:11px;font-family:inherit;font-size:16px;font-weight:500;line-height:1.5
      }
      #approvalBugRoot .ab-field textarea{min-height:78px;max-height:180px}
      #approvalBugRoot .ab-modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:15px}
      #approvalBugRoot .ab-small-btn{border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--text);padding:9px 14px;font-weight:800}
      #approvalBugRoot .ab-small-btn.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
      #approvalBugRoot .ab-image-preview{width:100%;max-height:180px;object-fit:cover;border-radius:12px;display:none}
      #approvalBugRoot .ab-image-preview.show{display:block}
      #approvalBugRoot .ab-image-viewer{
        position:absolute;inset:0;z-index:120;display:none;background:rgba(0,0,0,.94);
        align-items:center;justify-content:center;overflow:auto;
        touch-action:pan-x pan-y pinch-zoom;-webkit-overflow-scrolling:touch
      }
      #approvalBugRoot .ab-image-viewer.show{display:flex}
      #approvalBugRoot .ab-image-viewer img{
        display:block;max-width:100%;max-height:100%;object-fit:contain;
        touch-action:pan-x pan-y pinch-zoom;-webkit-user-drag:none
      }
      #approvalBugRoot .ab-image-viewer-close{
        position:fixed;right:16px;top:max(16px,env(safe-area-inset-top));z-index:2;
        width:48px;height:48px;border:1px solid rgba(255,255,255,.35);border-radius:50%;
        background:rgba(15,15,18,.72);color:#fff;font:800 27px/1 system-ui
      }

      #approvalBugRoot .ab-screenshot .ab-top-actions,#approvalBugRoot .ab-screenshot .ab-bottom,#approvalBugRoot .ab-screenshot .ab-compose{display:none}
      #approvalBugRoot .ab-screenshot .ab-view{padding-bottom:10px}
      #approvalBugRoot .ab-profile-card{background:var(--panel);padding:22px 18px;border-bottom:1px solid var(--line)}
      #approvalBugRoot .ab-profile-top{display:flex;align-items:center;gap:15px}
      #approvalBugRoot .ab-profile-avatar{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:#101722;color:#fff;font-size:34px}
      #approvalBugRoot .ab-counts{display:flex;gap:25px;margin-top:18px}
      #approvalBugRoot .ab-counts div{font-size:12px;color:var(--muted)}
      #approvalBugRoot .ab-counts b{display:block;color:var(--text);font-size:19px}
      #approvalBugRoot .ab-system-note{margin:12px;padding:12px 14px;background:#111622;color:#e9edff;border-radius:13px;font-size:11px;line-height:1.55}
      #approvalBugRoot .ab-notification{
        display:flex;gap:11px;padding:13px 15px;background:#fff;border-bottom:1px solid var(--line);font-size:13px;line-height:1.4
      }
      #approvalBugRoot .ab-notification.unread{background:#f1efff}
      #approvalBugRoot .ab-noti-icon{width:37px;height:37px;display:grid;place-items:center;border-radius:50%;background:#ece9ff;font-size:18px}
      #approvalBugRoot .ab-bottom{
        position:absolute;left:0;right:0;bottom:0;z-index:25;min-height:72px;padding:8px 20px max(9px,env(safe-area-inset-bottom));
        display:flex;justify-content:space-around;background:rgba(255,255,255,.97);border-top:1px solid var(--line);backdrop-filter:blur(14px)
      }
      #approvalBugRoot .ab-tab{position:relative;border:0;background:transparent;color:#7c8793;font-size:21px;min-width:70px}
      #approvalBugRoot .ab-tab small{display:block;margin-top:4px;font-size:9px;font-weight:750}
      #approvalBugRoot .ab-tab.active{color:var(--accent)}
      #approvalBugRoot .ab-overlay{
        position:absolute;inset:0;z-index:70;display:none;place-items:center;padding:24px;background:rgba(10,13,20,.86);
        color:#fff;text-align:center;backdrop-filter:blur(8px)
      }
      #approvalBugRoot .ab-overlay.show{display:grid}
      #approvalBugRoot .ab-overlay-card{width:min(92%,390px);padding:28px 20px;border:1px solid rgba(255,255,255,.22);border-radius:22px;background:#111622}
      #approvalBugRoot .ab-overlay-title{font-size:22px;font-weight:950;letter-spacing:.06em}
      #approvalBugRoot .ab-overlay-copy{margin-top:13px;color:#c7cddd;font-size:12px;line-height:1.7}
      #approvalBugRoot .ab-viral{
        position:absolute;inset:0;z-index:60;display:none;overflow:hidden;pointer-events:none;background:rgba(99,91,255,.05)
      }
      #approvalBugRoot .ab-viral.show{display:block;animation:abViralFlash .48s steps(2,end) infinite}
      #approvalBugRoot .ab-confetti{position:absolute;width:8px;height:15px;border-radius:2px;animation:abFall 2.7s linear forwards}
      #approvalBugRoot .ab-toast{
        position:absolute;left:50%;top:max(82px,calc(env(safe-area-inset-top) + 58px));z-index:80;transform:translateX(-50%) translateY(-18px);
        width:min(92%,410px);padding:12px 14px;border-radius:15px;background:#141a26;color:#fff;box-shadow:0 9px 30px rgba(0,0,0,.27);
        opacity:0;pointer-events:none;font-size:12px;transition:.23s
      }
      #approvalBugRoot .ab-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      @keyframes abFall{0%{transform:translateY(-30px) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:.2}}
      @keyframes abViralFlash{0%,100%{background:rgba(99,91,255,.04)}50%{background:rgba(255,232,94,.12)}}
      @keyframes abBell{0%,100%{transform:rotate(0)}25%{transform:rotate(-15deg)}75%{transform:rotate(15deg)}}
      #approvalBugRoot .ring{animation:abBell .28s linear 3}
      @media(prefers-color-scheme:dark){
        #approvalBugRoot{--bg:#0b0e13;--panel:#121720;--text:#edf1f7;--muted:#8b97a5;--line:#262d37}
        #approvalBugRoot .ab-top,#approvalBugRoot .ab-bottom{background:rgba(18,23,32,.96)}
        #approvalBugRoot .ab-icon{background:#232a35;color:#eef2f7}
        #approvalBugRoot .ab-notification{background:#121720}.ab-notification.unread{background:#211d3b!important}
        #approvalBugRoot .ab-tab{color:#8d97a5}
      }
    `;
    document.head.appendChild(s);
  }

  function setViewport(lock){
    var vp=document.querySelector('meta[name="viewport"]');
    if(!vp)return;
    if(lock){oldViewport=vp.getAttribute("content");vp.setAttribute("content","width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover")}
    else if(oldViewport!=null){vp.setAttribute("content",oldViewport);oldViewport=null}
  }

  function build(){
    if(booting||root)return;
    booting=true;
    ensureStyle();setViewport(true);
    loadState().then(function(loaded){
      state=loaded;
      return save(true);
    }).then(function(){
      root=document.createElement("div");root.id="approvalBugRoot";
    root.innerHTML=`
      <div class="ab-shell">
        <header class="ab-top">
          <div class="ab-brand"><span class="ab-mark">E</span><span>ECHO</span></div>
          <div class="ab-top-actions">
            <button class="ab-icon ab-shot" type="button" aria-label="スクショモード">⌗</button>
            <button class="ab-icon ab-bell" type="button" aria-label="通知">♢<span class="ab-badge"></span></button>
            <button class="ab-icon ab-close" type="button" aria-label="閉じる">×</button>
          </div>
        </header>
        <main class="ab-main">
          <section class="ab-view ab-home show">
            <div class="ab-compose">
              <div class="ab-userline"><div class="ab-avatar ab-compose-avatar">🐻‍❄️</div><div class="ab-account"><div class="ab-name ab-compose-name">あなた</div><div class="ab-handle ab-compose-handle">@observer</div></div></div>
              <textarea class="ab-input" maxlength="280" placeholder="今、誰にも届かなくても残したいことは？"></textarea>
              <img class="ab-image-preview" alt="">
              <input id="abPostImageInput" class="ab-post-image-input" type="file" accept="image/*" hidden>
              <div class="ab-compose-foot"><div class="ab-tools"><label class="ab-add-image-label" for="abPostImageInput">▣ 画像</label><button type="button" class="ab-remove-image">画像を外す</button><span class="ab-image-chip"></span></div><button class="ab-post-btn" type="button">投稿</button></div>
            </div>
            <div class="ab-feed-head">あなたの投稿</div>
            <div class="ab-feed"></div>
            <div class="ab-trends"><h3>急上昇</h3><div class="ab-trend-list"></div></div>
          </section>
          <section class="ab-view ab-notifications"></section>
          <section class="ab-view ab-profile"></section>
        </main>
        <nav class="ab-bottom">
          <button class="ab-tab active" data-tab="home">⌂<small>ホーム</small></button>
          <button class="ab-tab" data-tab="notifications">♢<small>通知</small><span class="ab-badge ab-tab-badge"></span></button>
          <button class="ab-tab" data-tab="profile">◉<small>プロフィール</small></button>
        </nav>
        <div class="ab-dev-panel">
          <div class="ab-dev-card">
            <div class="ab-dev-head"><b>ECHO / DEV</b><button class="ab-dev-close" type="button">×</button></div>
            <div class="ab-dev-status"></div>
            <div class="ab-dev-grid">
              <button data-dev="phase-early">序盤に戻す</button>
              <button data-dev="small-hit">3投稿目相当</button>
              <button data-dev="viral-ready">次投稿をバズ</button>
              <button data-dev="start-viral">最新投稿を即バズ</button>
              <button data-dev="drought">バズ後へ</button>
              <button data-dev="clear-notifications">通知だけ消す</button>
              <button class="danger" data-dev="reset-all">ECHO完全リセット</button>
              <button data-dev="close">閉じる</button>
            </div>
            <div class="ab-dev-note">ECHOロゴを約1.2秒長押しで開閉。完全リセットは投稿・画像・プロフィール・通知・バズ状態を削除します。</div>
          </div>
        </div>
        <div class="ab-post-menu">
          <div class="ab-sheet">
            <button class="danger ab-delete-post" type="button">投稿を削除</button>
            <button class="ab-cancel-post-menu" type="button">キャンセル</button>
          </div>
        </div>
        <div class="ab-modal ab-comment-modal">
          <div class="ab-modal-card">
            <div class="ab-comment-head">コメント</div>
            <div class="ab-comment-list"></div>
            <div class="ab-comment-compose">
              <input class="ab-comment-input" maxlength="120" placeholder="コメントを書く">
              <button class="ab-comment-send" type="button">送信</button>
            </div>
          </div>
        </div>
        <div class="ab-image-viewer" aria-hidden="true">
          <button class="ab-image-viewer-close" type="button" aria-label="画像を閉じる">×</button>
          <img class="ab-image-viewer-img" alt="">
        </div>
        <div class="ab-modal ab-profile-modal"><div class="ab-modal-card">
          <h2>プロフィールを編集</h2>
          <div class="ab-field"><label>名前</label><input class="ab-edit-name" maxlength="30"></div>
          <div class="ab-field"><label>@ID</label><input class="ab-edit-handle" maxlength="20"></div>
          <div class="ab-field"><label>自己紹介</label><textarea class="ab-edit-bio" maxlength="160"></textarea></div>
          <div class="ab-field"><label>リンク</label><input class="ab-edit-link" maxlength="120"></div>
          <div class="ab-field"><label>アイコン画像</label><input class="ab-avatar-input" type="file" accept="image/*"></div>
          <div class="ab-field"><label>ヘッダー画像</label><input class="ab-header-input" type="file" accept="image/*"></div>
          <div class="ab-modal-actions"><button class="ab-small-btn ab-profile-cancel">キャンセル</button><button class="ab-small-btn primary ab-profile-save">保存</button></div>
        </div></div>
        <div class="ab-viral"></div>
        <div class="ab-overlay"><div class="ab-overlay-card"><div class="ab-overlay-title"></div><div class="ab-overlay-copy"></div></div></div>
        <div class="ab-toast"></div>
        <div class="ab-soft-toast"></div>
      </div>`;
    document.body.appendChild(root);
    bind();renderAll();
    autoGrowInput();
    if(state.phase==="drought" && state.session>1){
      later(function(){toast("前回の続きから再開しました。")},500);
    }
    booting=false;
    }).catch(function(err){
      booting=false;
      console.error("[ECHO] boot failed",err);
      setViewport(false);
    });
  }

  function bind(){
    $(".ab-close").addEventListener("pointerdown",function(e){block(e);close()},true);
    bindDevLongPress();
    $(".ab-dev-close").addEventListener("click",function(){toggleDev(false)},false);
    $all("[data-dev]").forEach(function(b){b.addEventListener("click",function(){runDevAction(b.dataset.dev)},false)});
    $(".ab-shot").addEventListener("pointerdown",function(e){block(e);toggleScreenshotMode()},true);
    $(".ab-bell").addEventListener("pointerdown",function(e){block(e);switchTab("notifications")},true);
    $(".ab-post-image-input").addEventListener("change",handlePostImage,true);
    $(".ab-remove-image").addEventListener("pointerdown",function(e){block(e);clearPendingPostImage()},true);
    root.addEventListener("pointerdown",handleMediaPointerDown,false);
    root.addEventListener("click",handleSelfLikeClick,false);
    root.addEventListener("click",handleReplyClick,false);
    root.addEventListener("pointerdown",handlePostLongPressStart,false);
    root.addEventListener("pointerup",cancelPostLongPress,false);
    root.addEventListener("pointercancel",cancelPostLongPress,false);
    root.addEventListener("pointermove",cancelPostLongPress,false);
    $(".ab-delete-post").addEventListener("click",deletePressedPost,false);
    $(".ab-cancel-post-menu").addEventListener("click",closePostMenu,false);
    $(".ab-comment-send").addEventListener("click",sendUserComment,false);
    $(".ab-comment-modal").addEventListener("click",function(e){if(e.target===$(".ab-comment-modal"))closeCommentModal()},false);

    root.addEventListener("pointermove",handleMediaPointerMove,false);
    root.addEventListener("pointerup",handleMediaPointerUp,false);
    root.addEventListener("pointercancel",handleMediaPointerCancel,false);
    $(".ab-image-viewer-close").addEventListener("click",function(e){block(e);closeImageViewer()},false);
    $(".ab-image-viewer").addEventListener("click",function(e){
      if(e.target===$(".ab-image-viewer")){block(e);closeImageViewer()}
    },false);
    $(".ab-profile-save").addEventListener("pointerdown",function(e){block(e);saveProfile()},true);
    $(".ab-profile-cancel").addEventListener("pointerdown",function(e){block(e);closeProfileModal()},true);
    $(".ab-avatar-input").addEventListener("change",function(e){readFileAsDataUrl(e.target.files[0],function(v){state._pendingAvatar=v})},true);
    $(".ab-header-input").addEventListener("change",function(e){readFileAsDataUrl(e.target.files[0],function(v){state._pendingHeader=v})},true);
    $(".ab-input").addEventListener("input",function(){autoGrowInput();updatePostButton()},true);
    $(".ab-post-btn").addEventListener("pointerdown",function(e){block(e);submitPost()},true);
    $all(".ab-tab").forEach(function(b){b.addEventListener("pointerdown",function(e){block(e);switchTab(b.dataset.tab)},true)});
    root.addEventListener("touchmove",function(e){
      if(e.target.closest(".ab-view")||e.target.closest("textarea"))return;
      e.preventDefault();
    },{passive:false});
    window.addEventListener("pagehide",flushOnHide,true);
    document.addEventListener("visibilitychange",flushOnVisibility,true);
  }

  function flushOnHide(){saveNow()}
  function flushOnVisibility(){if(document.visibilityState==="hidden")saveNow()}

  function bindDevLongPress(){
    var brand=$(".ab-brand"),hold=0;
    if(!brand)return;
    brand.addEventListener("pointerdown",function(){
      clearTimeout(hold);
      hold=setTimeout(function(){toggleDev(!devOpen)},1200);
    },false);
    ["pointerup","pointercancel","pointerleave","pointermove"].forEach(function(type){
      brand.addEventListener(type,function(){clearTimeout(hold)},false);
    });
  }

  function toggleDev(show){
    devOpen=show!==false;
    $(".ab-dev-panel").classList.toggle("show",devOpen);
    renderDevStatus();
  }

  function renderDevStatus(){
    var box=$(".ab-dev-status");
    if(!box||!state)return;
    var latest=state.posts[state.posts.length-1];
    box.textContent=
      "PHASE  "+state.phase+"\n"+
      "POSTS  "+state.posts.length+"\n"+
      "VIRAL  "+(state.viralSeen?"YES":"NO")+"\n"+
      "TARGET "+(state.viralTargetPost==null?"-":state.viralTargetPost)+"\n"+
      "FOLLOW "+fmt(state.followers)+"\n"+
      "LATEST "+(latest?(latest.kind+" / ♥"+fmt(latest.likes||0)):"-");
  }

  function runDevAction(action){
    if(action==="close"){toggleDev(false);return}
    if(action==="phase-early"){
      state.phase="growth";state.viralSeen=false;state.viralTargetPost=null;
      state.postCount=Math.min(state.posts.length,2);
      save(true);renderAll();renderDevStatus();softToast("序盤状態へ戻しました");return;
    }
    if(action==="small-hit"){
      state.phase="growth";state.viralSeen=false;state.viralTargetPost=null;state.postCount=2;
      save(true);renderDevStatus();softToast("次投稿を3投稿目扱い");return;
    }
    if(action==="viral-ready"){
      state.phase="growth";state.viralSeen=false;
      state.viralTargetPost=(Number(state.postCount)||0)+1;
      save(true);renderDevStatus();softToast("次投稿をバズ対象に設定");return;
    }
    if(action==="start-viral"){
      var latest=state.posts[state.posts.length-1];
      if(!latest){softToast("投稿がありません");return}
      latest.kind="viral";
      latest.targetLikes=Math.max(42000,latest.targetLikes||0);
      latest.targetViews=Math.max(900000,latest.targetViews||0);
      runViral(latest);toggleDev(false);return;
    }
    if(action==="drought"){
      state.phase="drought";state.viralSeen=true;state.viralTargetPost=null;
      save(true);renderAll();renderDevStatus();softToast("バズ後状態へ移動");return;
    }
    if(action==="clear-notifications"){
      state.notifications=[];state.unread=0;
      save(true);renderAll();renderDevStatus();softToast("通知を消しました");return;
    }
    if(action==="reset-all"){
      resetEchoCompletely();return;
    }
  }

  function resetEchoCompletely(){
    if(!confirm("ECHOの投稿・画像・プロフィール・通知をすべて削除します。よろしいですか？"))return;
    clearTimers();clearTimeout(saveTimer);
    state=defaultState();
    state.session=1;
    profileTab="posts";
    idbPut(DB_STATE_KEY,sanitizeState(state,false)).catch(function(){});
    try{
      localStorage.removeItem(FALLBACK_STORE_KEY);
      localStorage.removeItem(LEGACY_STORE_KEY);
      localStorage.removeItem("looking_bear_approval_bug_v01");
    }catch(e){}
    save(true).then(function(){
      toggleDev(false);switchTab("home");renderAll();softToast("ECHOを初期化しました");
    });
  }

  function readFileAsDataUrl(file,cb){
    if(!file)return;
    if(!/^image\//.test(file.type||"")){toast("画像ファイルを選んでください");return}
    var reader=new FileReader();
    reader.onerror=function(){toast("画像を読み込めませんでした")};
    reader.onload=function(){
      var img=new Image();
      img.onerror=function(){cb(String(reader.result||""))};
      img.onload=function(){
        try{
          var maxSide=1600,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
          var scale=Math.min(1,maxSide/Math.max(w,h));
          var cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
          var c=document.createElement("canvas");c.width=cw;c.height=ch;
          var x=c.getContext("2d");x.drawImage(img,0,0,cw,ch);
          cb(c.toDataURL("image/jpeg",0.82));
        }catch(e){cb(String(reader.result||""))}
      };
      img.src=String(reader.result||"");
    };
    reader.readAsDataURL(file);
  }

  function handlePostImage(e){
    var file=e.target.files&&e.target.files[0];
    if(!file)return;
    readFileAsDataUrl(file,function(v){
      state._pendingPostImage=v;
      var p=$(".ab-image-preview");
      p.src=v;p.classList.add("show");
      $(".ab-image-chip").textContent="画像を追加しました";
      $(".ab-remove-image").classList.add("show");
      updatePostButton();
      e.target.value="";
    });
  }

  function openProfileModal(){
    var p=state.profile||{};
    $(".ab-edit-name").value=p.name||"";
    $(".ab-edit-handle").value=p.handle||"";
    $(".ab-edit-bio").value=p.bio||"";
    $(".ab-edit-link").value=p.link||"";
    state._pendingAvatar=p.avatar||"";
    state._pendingHeader=p.header||"";
    $(".ab-profile-modal").classList.add("show");
  }
  function closeProfileModal(){
    $(".ab-profile-modal").classList.remove("show");
  }
  function saveProfile(){
    state.profile.name=$(".ab-edit-name").value.trim()||"あなた";
    state.profile.handle=($(".ab-edit-handle").value.trim()||"observer").replace(/^@/,"");
    state.profile.bio=$(".ab-edit-bio").value.trim();
    state.profile.link=$(".ab-edit-link").value.trim();
    state.profile.avatar=state._pendingAvatar||"";
    state.profile.header=state._pendingHeader||"";
    state.profileViews+=randomInt(12,180);
    addNotification("◉","プロフィールが更新されました","新しいプロフィールが閲覧されています",true);
    renderAll();
    save(true).then(function(){closeProfileModal();toast("プロフィールを保存しました")});
  }
  function toggleScreenshotMode(){
    root.classList.toggle("ab-screenshot");
    toast(root.classList.contains("ab-screenshot")?"スクショモード":"通常表示");
  }
  function applyProfileIdentity(){
    var p=state.profile||{};
    var av=$(".ab-compose-avatar");
    if(av){
      av.textContent=p.avatar?"":"🐻‍❄️";
      av.style.backgroundImage=p.avatar?'url("'+p.avatar+'")':"";
      av.style.backgroundSize="cover";av.style.backgroundPosition="center";
    }
    if($(".ab-compose-name"))$(".ab-compose-name").textContent=p.name||"あなた";
    if($(".ab-compose-handle"))$(".ab-compose-handle").textContent="@"+(p.handle||"observer");
  }

  function handleReplyClick(e){
    var stat=e.target&&e.target.closest?e.target.closest(".ab-stat.reply"):null;
    if(!stat)return;
    var article=stat.closest(".ab-post[data-id]");
    if(!article)return;
    openCommentModal(article.getAttribute("data-id"));
  }

  function openCommentModal(id){
    var post=state.posts.find(function(p){return p.id===id});
    if(!post)return;
    state._commentPostId=id;
    renderCommentModal(post);
    $(".ab-comment-modal").classList.add("show");
    $(".ab-comment-input").value="";
  }

  function closeCommentModal(){
    $(".ab-comment-modal").classList.remove("show");
    state._commentPostId="";
  }

  function renderCommentModal(post){
    var list=(post.comments||[]);
    $(".ab-comment-list").innerHTML=list.length
      ? list.map(function(c){return '<div class="ab-comment-row"><b>'+escapeHtml(c.name||"誰か")+'</b><br>'+escapeHtml(c.text||"")+'</div>'}).join("")
      : '<div class="ab-reply-empty">まだコメントはありません。</div>';
  }

  function sendUserComment(){
    var id=state._commentPostId;
    var post=state.posts.find(function(p){return p.id===id});
    var input=$(".ab-comment-input");
    var value=input.value.trim();
    if(!post||!value)return;
    post.comments=Array.isArray(post.comments)?post.comments:[];
    post.comments.push({name:state.profile.name||"あなた",text:value,self:true});
    post.replies=(Number(post.replies)||0)+1;
    input.value="";
    save(true);renderCommentModal(post);renderAll();
  }

  function handlePostLongPressStart(e){
    if(e.target.closest(".ab-stat")||e.target.closest(".ab-media-thumb")||e.target.closest("button")||e.target.closest("input"))return;
    var article=e.target.closest(".ab-post[data-id]");
    if(!article)return;
    clearTimeout(pressTimer);
    pressedPostId=article.getAttribute("data-id");
    pressTimer=setTimeout(function(){
      if(pressedPostId)$(".ab-post-menu").classList.add("show");
    },650);
  }

  function cancelPostLongPress(){
    clearTimeout(pressTimer);pressTimer=0;
  }

  function closePostMenu(){
    $(".ab-post-menu").classList.remove("show");
    pressedPostId=null;
  }

  function deletePressedPost(){
    if(!pressedPostId)return closePostMenu();
    state.posts=state.posts.filter(function(p){return p.id!==pressedPostId});
    state.postCount=state.posts.length;
    save(true);closePostMenu();renderAll();toast("投稿を削除しました");
  }

  function handleSelfLikeClick(e){
    var like=e.target&&e.target.closest?e.target.closest(".ab-stat.like"):null;
    if(!like||!root.contains(like))return;
    var article=like.closest(".ab-post[data-id]");
    if(!article)return;
    var id=article.getAttribute("data-id");
    var post=state.posts.find(function(p){return p.id===id});
    if(!post)return;
    post.selfLiked=!post.selfLiked;
    post.likes=Math.max(0,(Number(post.likes)||0)+(post.selfLiked?1:-1));
    save(true);
    renderAll();
    later(function(){
      var refreshed=root&&root.querySelector('.ab-post[data-id="'+id+'"] .ab-stat.like');
      if(refreshed){
        refreshed.classList.add("hot");
        later(function(){if(refreshed)refreshed.classList.remove("hot")},170);
      }
    },0);
  }

  function mediaThumbFromTarget(target){
    return target&&target.closest?target.closest(".ab-media-thumb"):null;
  }

  function handleMediaPointerDown(e){
    if(e.pointerType==="mouse"&&e.button!==0)return;
    var thumb=mediaThumbFromTarget(e.target);
    if(!thumb||!root.contains(thumb))return;
    var img=thumb.querySelector("img");
    if(!img)return;
    mediaGesture={
      pointerId:e.pointerId,
      thumb:thumb,
      src:img.currentSrc||img.src,
      startX:e.clientX,
      startY:e.clientY,
      startTime:Date.now(),
      moved:false
    };
    // Deliberately do not preventDefault or capture the pointer:
    // Safari must remain free to perform native vertical scrolling.
  }

  function handleMediaPointerMove(e){
    if(!mediaGesture||mediaGesture.pointerId!==e.pointerId)return;
    var dx=Math.abs(e.clientX-mediaGesture.startX);
    var dy=Math.abs(e.clientY-mediaGesture.startY);
    if(dx>8||dy>8)mediaGesture.moved=true;
  }

  function handleMediaPointerUp(e){
    if(!mediaGesture||mediaGesture.pointerId!==e.pointerId)return;
    var gesture=mediaGesture;
    mediaGesture=null;
    var dx=Math.abs(e.clientX-gesture.startX);
    var dy=Math.abs(e.clientY-gesture.startY);
    var elapsed=Date.now()-gesture.startTime;
    if(!gesture.moved&&dx<=8&&dy<=8&&elapsed<650){
      openImageViewer(gesture.src);
    }
  }

  function handleMediaPointerCancel(e){
    if(mediaGesture&&mediaGesture.pointerId===e.pointerId)mediaGesture=null;
  }

  function openImageViewer(src){
    if(!src)return;
    var viewer=$(".ab-image-viewer"),img=$(".ab-image-viewer-img");
    img.src=src;
    viewer.classList.add("show");
    viewer.setAttribute("aria-hidden","false");
  }

  function closeImageViewer(){
    var viewer=$(".ab-image-viewer"),img=$(".ab-image-viewer-img");
    viewer.classList.remove("show");
    viewer.setAttribute("aria-hidden","true");
    later(function(){if(img&&!viewer.classList.contains("show"))img.src=""},120);
  }

  function autoGrowInput(){
    var box=$(".ab-input");
    if(!box)return;
    box.style.height="auto";
    box.style.height=Math.min(340,Math.max(156,box.scrollHeight))+"px";
  }

  function clearPendingPostImage(){
    state._pendingPostImage="";
    var p=$(".ab-image-preview");
    if(p){p.src="";p.classList.remove("show")}
    var c=$(".ab-image-chip");
    if(c)c.textContent="";
    var r=$(".ab-remove-image");
    if(r)r.classList.remove("show");
    var input=$(".ab-post-image-input");
    if(input)input.value="";
    updatePostButton();
  }

  function updatePostButton(){
    var ready=$(".ab-input").value.trim().length>0||!!state._pendingPostImage;
    $(".ab-post-btn").classList.toggle("ready",ready);
  }

  function switchTab(tab){
    state.activeTab=tab;
    $all(".ab-view").forEach(function(v){v.classList.remove("show")});
    var view=tab==="home"?$(".ab-home"):tab==="notifications"?$(".ab-notifications"):$(".ab-profile");
    view.classList.add("show");
    $all(".ab-tab").forEach(function(b){b.classList.toggle("active",b.dataset.tab===tab)});
    if(tab==="notifications"){state.unread=0;state.notifications.forEach(function(n){n.unread=false});save(true)}
    renderAll();
  }

  function renderAll(){
    renderFeed();renderNotifications();renderProfile();renderTrends();renderBadges();applyProfileIdentity();updatePostButton();if(devOpen)renderDevStatus();
  }

  function renderFeed(){
    var feed=$(".ab-feed");
    if(!state.posts.length){
      feed.innerHTML='<div class="ab-empty">まだ投稿はありません。<br>最初の言葉を置いてください。</div>';
      return;
    }
    feed.innerHTML=state.posts.slice().reverse().map(function(p){
      var comments=(p.comments||[]).map(function(c){return '<div class="ab-comment"><b>'+escapeHtml(c.name)+'</b>　'+escapeHtml(c.text)+'</div>'}).join("");
      var prof=state.profile||{},avatarStyle=prof.avatar?' style="background-image:url('+JSON.stringify(prof.avatar).slice(1,-1)+');background-size:cover;background-position:center"':"";
      var media=p.image?'<div class="ab-media-thumb"><img src="'+p.image+'" alt=""></div>':"";
      return '<article class="ab-post" data-id="'+p.id+'">'+
        '<div class="ab-post-top"><div class="ab-avatar"'+avatarStyle+'>'+(prof.avatar?"":"🐻‍❄️")+'</div><div class="ab-post-body">'+
        '<div class="ab-post-meta"><b>'+escapeHtml(prof.name||"あなた")+'</b><span>@'+escapeHtml(prof.handle||"observer")+' · '+relativeTime(p.createdAt)+'</span></div>'+
        '<div class="ab-text">'+escapeHtml(p.text)+'</div></div></div>'+media+
        '<div class="ab-post-stats"><span class="ab-stat reply">◌ '+fmt(p.replies||0)+'</span><span class="ab-stat">↻ '+fmt(p.reposts||0)+'</span><span class="ab-stat like '+(p.selfLiked?"self-liked":"")+'"><span class="ab-heart">'+(p.selfLiked?"♥":"♡")+'</span> <i>'+fmt(p.likes||0)+'</i></span><span class="ab-stat">⌑ '+fmt(p.saves||0)+'</span></div>'+
        (comments?'<div class="ab-comments">'+comments+'</div>':'')+
      '</article>';
    }).join("");
  }

  function renderNotifications(){
    var el=$(".ab-notifications");
    if(!state.notifications.length){
      el.innerHTML='<div class="ab-empty">通知はまだありません。</div>';
      return;
    }
    el.innerHTML=state.notifications.slice().reverse().map(function(n){
      return '<div class="ab-notification '+(n.unread?"unread":"")+'"><div class="ab-noti-icon">'+escapeHtml(n.icon||"♥")+'</div><div><b>'+escapeHtml(n.title)+'</b><br><span style="color:var(--muted)">'+escapeHtml(n.body||"")+'</span><div style="font-size:10px;color:var(--muted);margin-top:4px">'+relativeTime(n.at)+'</div></div></div>';
    }).join("");
  }

  function renderProfile(){
    var p=state.profile||{},topPost=state.posts.reduce(function(a,b){return !a||b.likes>a.likes?b:a},null);
    var note=(state.phase==="drought"&&state.viralSeen)
      ?'<div class="ab-system-note">現在、投稿への配信量が以前より低下しています。品質向上のため継続的な投稿をおすすめします。</div>'
      :'';
    var headerStyle=p.header?' style="background-image:url('+JSON.stringify(p.header).slice(1,-1)+')"':"";
    var avatarStyle=p.avatar?' style="background-image:url('+JSON.stringify(p.avatar).slice(1,-1)+');background-size:cover;background-position:center"':"";
    var mediaPosts=state.posts.filter(function(x){return !!x.image});
    var savedTotal=state.posts.reduce(function(sum,x){return sum+(Number(x.saves)||0)},0);
    var recommended=state.posts.filter(function(x){return (x.likes||0)>=1000}).length;

    var body="";
    if(profileTab==="images"){
      body=mediaPosts.length
        ? '<div class="ab-media-grid">'+mediaPosts.slice().reverse().map(function(post){return '<button type="button" class="ab-profile-media" style="border-radius:0" data-src="'+escapeHtml(post.image)+'"><img src="'+post.image+'" alt=""></button>'}).join("")+'</div>'
        : '<div class="ab-reply-empty">まだ画像投稿はありません。</div>';
    }else if(profileTab==="replies"){
      body='<div class="ab-reply-empty">返信一覧は準備中です。<br>投稿のコメントは各投稿から開けます。</div>';
    }else{
      body='<div class="ab-feed">'+state.posts.slice().reverse().map(function(post){
        return '<div class="ab-post" data-id="'+post.id+'"><div class="ab-text">'+escapeHtml(post.text)+'</div>'+
          (post.image?'<div class="ab-media-thumb" style="margin-left:0"><img src="'+post.image+'"></div>':'')+
          '<div class="ab-post-stats" style="margin-left:0"><span>♥ '+fmt(post.likes||0)+'</span><span>↻ '+fmt(post.reposts||0)+'</span></div></div>';
      }).join("")+'</div>';
    }

    $(".ab-profile").innerHTML=
      '<div class="ab-profile-hero"><div class="ab-header-img"'+headerStyle+'></div><div class="ab-profile-body">'+
      '<div class="ab-profile-avatar-wrap"><div class="ab-profile-avatar-img"'+avatarStyle+'>'+(p.avatar?"":"🐻‍❄️")+'</div><button class="ab-edit-profile">プロフィールを編集</button></div>'+
      '<div style="margin-top:10px;font-size:21px;font-weight:900">'+escapeHtml(p.name||"あなた")+'</div>'+
      '<div style="color:var(--muted);font-size:12px">@'+escapeHtml(p.handle||"observer")+'</div>'+
      '<div style="margin-top:10px;font-size:13px;line-height:1.55">'+escapeHtml(p.bio||"")+'</div>'+
      (p.link?'<div style="margin-top:7px;color:var(--accent);font-size:12px">'+escapeHtml(p.link)+'</div>':'')+
      '<div class="ab-counts"><div><b>'+fmt(state.posts.length)+'</b>投稿</div><div><b>'+fmt(state.followers)+'</b>フォロワー</div><div><b>'+fmt(state.following)+'</b>フォロー中</div></div></div>'+
      '<div class="ab-profile-tabs">'+
        '<button data-profile-tab="posts" class="'+(profileTab==="posts"?"active":"")+'">投稿</button>'+
        '<button data-profile-tab="replies" class="'+(profileTab==="replies"?"active":"")+'">返信</button>'+
        '<button data-profile-tab="images" class="'+(profileTab==="images"?"active":"")+'">画像 '+mediaPosts.length+'</button>'+
      '</div></div>'+
      note+
      '<div class="ab-system-note" style="background:transparent;color:var(--muted);border:1px solid var(--line)">保存方式　端末内データベース<br>'+
      '最高反応　'+(topPost?fmt(topPost.likes)+" いいね":"—")+'<br>'+
      '累計反応　'+fmt(state.totalLikes)+' いいね<br>'+
      'プロフィール閲覧　'+fmt(state.profileViews)+'<br>'+
      '画像投稿　'+fmt(mediaPosts.length)+'<br>'+
      '保存された回数　'+fmt(savedTotal)+'<br>'+
      'おすすめ掲載　'+fmt(recommended)+'</div>'+
      '<div class="ab-profile-panel">'+body+'</div>';

    var btn=$(".ab-profile .ab-edit-profile");
    if(btn)btn.addEventListener("pointerdown",function(e){block(e);openProfileModal()},true);
    $all(".ab-profile [data-profile-tab]").forEach(function(b){
      b.addEventListener("click",function(){profileTab=b.dataset.profileTab;renderProfile()},false);
    });
    $all(".ab-profile-media").forEach(function(b){
      b.addEventListener("click",function(){openImageViewer(b.dataset.src)},false);
    });
  }

  function renderTrends(){
    var tags=(state.trendTags||[]).slice();
    var latest=state.posts[state.posts.length-1];
    if(latest){
      var words=latest.text.match(/#[^\s#]+/g)||[];
      tags=words.concat(tags);
      if(/メロンパン/.test(latest.text))tags.unshift("#メロンパン");
    }
    tags=Array.from(new Set(tags)).slice(0,5);
    $(".ab-trend-list").innerHTML=tags.map(function(t,i){
      return '<div class="ab-trend"><span>日本のトレンド</span><b>'+escapeHtml(t)+'</b><span>'+fmt((i+1)*randomInt(1200,9800))+'件の投稿</span></div>';
    }).join("");
  }

  function renderBadges(){
    var text=state.unread>99?"99+":String(state.unread||"");
    [$(".ab-badge"),$(".ab-tab-badge")].forEach(function(b){if(!b)return;b.textContent=text;b.classList.toggle("show",state.unread>0)});
  }

  function createPost(text,imageData){
    state.postCount++;
    var result=engagementFor(state.postCount,state.phase,!!imageData);
    var post={
      id:"p"+Date.now()+"_"+state.postCount,
      text:text,createdAt:nowISO(),likes:0,targetLikes:result.likes,targetViews:result.views||0,
      reposts:0,replies:0,saves:0,views:0,comments:[],kind:result.kind,
      reactionStage:"posted",image:imageData||"",selfLiked:false
    };
    state._pendingPostImage="";
    state.posts.push(post);
    state.posts=state.posts.slice(-60);
    save(true);renderAll();return post;
  }

  function engagementFor(count,phase,hasImage){
    if(phase==="drought"){
      var low=[0,1,1,2,3,0,1,4,2,0][count%10];
      return{kind:"drought",likes:low,delayProfile:"drought"};
    }

    var bonus=hasImage?1.35:1;
    if(count===1){
      return{
        kind:"welcome",
        likes:Math.round(randomInt(3,7)*bonus),
        views:randomInt(18,42),
        delayProfile:"gentle"
      };
    }
    if(count===2){
      return{
        kind:"growth",
        likes:Math.round(randomInt(12,28)*bonus),
        views:randomInt(70,160),
        delayProfile:"growth"
      };
    }
    if(count===3){
      return{
        kind:"small-hit",
        likes:Math.round(randomInt(90,260)*bonus),
        views:randomInt(800,2600),
        delayProfile:"small-hit"
      };
    }

    if(!state.viralSeen){
      if(!state.viralTargetPost){
        state.viralTargetPost=randomInt(4,6);
        save(true);
      }
      if(count===state.viralTargetPost){
        return{
          kind:"viral",
          likes:Math.round(randomInt(42000,138000)*bonus),
          views:randomInt(900000,4800000),
          delayProfile:"viral"
        };
      }
      return{
        kind:"growth",
        likes:Math.round(randomInt(28,85)*bonus),
        views:randomInt(200,900),
        delayProfile:"growth"
      };
    }

    return{
      kind:"growth",
      likes:Math.round(randomInt(220,1400)*bonus),
      views:randomInt(2500,22000),
      delayProfile:"growth"
    };
  }

  function submitPost(){
    var input=$(".ab-input"),text=input.value.trim();
    if(!text&&!state._pendingPostImage)return;
    if(!text)text="";
    var pendingImage=state._pendingPostImage||"";
    var post=createPost(text,pendingImage);
    input.value="";
    clearPendingPostImage();
    autoGrowInput();
    switchTab("home");
    save(true);
    later(function(){
      var card=root.querySelector('.ab-post[data-id="'+post.id+'"]');
      if(card)card.scrollIntoView({behavior:"smooth",block:"start"});
    },80);
    animateEngagement(post);
  }

  function animateEngagement(post){
    var target=Math.max(0,Number(post.targetLikes)||0);
    var targetViews=Math.max(target,Number(post.targetViews)||0);

    // 1) 投稿直後は静か。まず閲覧だけ動かす。
    post.reactionStage="silent";
    save();

    later(function(){
      if(!root)return;
      post.reactionStage="viewed";
      post.views=Math.max(1,Math.round(targetViews*.18));
      save();renderAll();
      softToast("見られ始めています");
    },randomInt(5000,9000));

    later(function(){
      if(!root)return;
      post.views=Math.max(post.views,Math.round(targetViews*.42));
      save();renderAll();
    },randomInt(10000,15000));

    // 2) 初反応
    later(function(){
      if(!root)return;
      var firstLike=Math.min(target,Math.max(1,Math.round(target*.08)));
      post.likes=Math.max(post.likes,firstLike);
      post.reposts=Math.floor(post.likes*.04);
      post.replies=post.kind==="welcome"?0:Math.floor(post.likes*.015);
      post.saves=Math.floor(post.likes*(post.image?.09:.025));
      post.reactionStage="first-like";
      if(post.kind==="welcome"){
        post.comments=[{name:"はじめての誰か",text:"最初の投稿、見つけました"}];
      }else if(post.kind==="growth"){
        post.comments=[{name:pick(fakeNames),text:pick(commentsPositive)}];
      }
      addReactionNotification(post,false);
      save();renderAll();highlightPost(post.id);
      ping(.012);
    },randomInt(17000,26000));

    // 3) 小さく伸びる
    later(function(){
      if(!root)return;
      if(post.kind==="viral"){runViral(post);return}
      var steps=post.kind==="small-hit"?8:post.kind==="growth"?5:3;
      var i=0;
      function tick(){
        if(!root)return;
        i++;
        var t=i/steps,eased=1-Math.pow(1-t,2.4);
        post.likes=Math.max(post.likes,Math.round(target*eased));
        post.views=Math.max(post.views,Math.round(targetViews*eased));
        post.reposts=Math.floor(post.likes*(post.kind==="small-hit"?.09:.05));
        post.replies=Math.floor(post.likes*(post.kind==="small-hit"?.028:.015));
        post.saves=Math.floor(post.likes*(post.image?.11:.035));
        post.reactionStage=i===steps?"settled":"growing";
        if(i===2&&post.kind==="small-hit"){
          post.comments.push({name:pick(fakeNames),text:"おすすめから来ました"});
          softToast("反応が増えています");
        }
        save();renderAll();highlightPost(post.id);
        if(i<steps)later(tick,post.kind==="small-hit"?randomInt(1000,1800):randomInt(1400,2400));
        else{
          state.totalLikes+=post.likes;
          state.followers+=Math.max(0,Math.floor(post.likes*.06));
          save(true);renderAll();
        }
      }
      tick();
    },randomInt(30000,42000));
  }

  function highlightPost(id){
    later(function(){
      var card=root&&root.querySelector('.ab-post[data-id="'+id+'"]');
      if(card){
        card.classList.remove("early-glow");
        void card.offsetWidth;
        card.classList.add("early-glow");
      }
    },0);
  }

  function softToast(text){
    var t=$(".ab-soft-toast");
    if(!t)return;
    t.textContent=text;
    t.classList.add("show");
    later(function(){if(t)t.classList.remove("show")},1600);
  }

  function updatePostLike(post,pop){
    var card=root&&root.querySelector('.ab-post[data-id="'+post.id+'"]');
    if(!card){renderAll();return}
    var like=card.querySelector(".ab-stat.like"),i=like&&like.querySelector("i");
    if(i)i.textContent=fmt(post.likes);
    if(pop&&like){like.classList.add("hot");later(function(){if(like)like.classList.remove("hot")},150)}
  }

  function runViral(post){
    state.viralSeen=true;save(true);
    var viral=$(".ab-viral");viral.classList.add("show");spawnConfetti();
    overlay("おすすめ掲載","あなたの投稿が急上昇しています。",1050);
    var start=Date.now(),duration=15000,lastLikes=post.likes,lastNoti=0,startLikes=post.likes,startViews=post.views;
    function frame(){
      if(!root)return;
      var t=clamp((Date.now()-start)/duration,0,1),eased=1-Math.pow(1-t,3.2);
      var current=Math.round(startLikes+(post.targetLikes-startLikes)*eased);
      if(current>post.likes){
        post.likes=current;
        post.reposts=Math.floor(current*.22);
        post.replies=Math.floor(current*.035);
        post.saves=Math.floor(current*.13);
        post.views=Math.max(startViews,Math.round(startViews+(post.targetViews-startViews)*eased));
        updatePostLike(post,true);
      }
      if(Date.now()-lastNoti>(t<.55?randomInt(110,220):randomInt(260,520))){
        lastNoti=Date.now();burstNotification(post,t);
      }
      if(t<1){raf=requestAnimationFrame(frame)}
      else{
        viral.classList.remove("show");
        post.likes=post.targetLikes;
        post.comments=[
          {name:pick(fakeNames),text:pick(commentsPositive)},
          {name:pick(fakeNames),text:"おすすめから来ました"},
          {name:pick(fakeNames),text:pick(commentsPositive)}
        ];
        state.totalLikes+=post.likes;
        state.followers+=Math.floor(post.likes*.17)+randomInt(900,4100);state.profileViews+=randomInt(2200,14000);
        state.algorithmUpdated=true;
        state.phase="drought";
        addNotification("⚙","配信システム","Distribution model updated.",true);
        save();renderAll();
        later(function(){
          overlay("ALGORITHM UPDATED","配信システムが更新されました。",2300);
        },1300);
      }
    }
    raf=requestAnimationFrame(frame);
  }

  function burstNotification(post,t){
    var types=[
      ["♥",pick(fakeNames)+"さんがいいねしました","あなたの投稿"],
      ["↻",pick(fakeNames)+"さんが再投稿しました","新しい閲覧者に届いています"],
      ["＋",pick(fakeNames)+"さんがフォローしました","フォロワーが増えています"],
      ["⌑",pick(fakeNames)+"さんが保存しました","あとで見返すために保存されました"],
      ["◉","プロフィールが閲覧されています",randomInt(12,240)+"件の新しい閲覧"],
      ["↗","急上昇しています","おすすめで表示されています"]
    ];
    var n=pick(types);addNotification(n[0],n[1],n[2],true);
    ping(t<.55?0.025:0.016);
    try{if(navigator.vibrate)navigator.vibrate(t<.55?[18,22,18]:14)}catch(e){}
    $(".ab-bell").classList.remove("ring");void $(".ab-bell").offsetWidth;$(".ab-bell").classList.add("ring");
  }

  function addReactionNotification(post,loud){
    var title=pick(fakeNames)+"さんがいいねしました";
    addNotification("♥",title,"「"+post.text.slice(0,30)+(post.text.length>30?"…":"")+"」",true);
    if(loud)ping(.018);
  }

  function addNotification(icon,title,body,unread){
    state.notifications.push({icon:icon,title:title,body:body,at:nowISO(),unread:unread!==false});
    state.notifications=state.notifications.slice(-80);
    if(unread!==false)state.unread++;
    save();renderBadges();
  }

  function ping(vol){
    try{
      if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==="suspended")audio.resume();
      var t=audio.currentTime,o1=audio.createOscillator(),o2=audio.createOscillator(),g=audio.createGain();
      o1.type="sine";o2.type="sine";o1.frequency.setValueAtTime(880,t);o2.frequency.setValueAtTime(1320,t);
      g.gain.setValueAtTime(vol||.02,t);g.gain.exponentialRampToValueAtTime(.0001,t+.12);
      o1.connect(g);o2.connect(g);g.connect(audio.destination);o1.start(t);o2.start(t+.015);o1.stop(t+.12);o2.stop(t+.12);
    }catch(e){}
  }

  function spawnConfetti(){
    var box=$(".ab-viral"),colors=["#635bff","#ffe35c","#ff5e83","#4dd6a7","#55aaff","#fff"];
    box.innerHTML="";
    for(var i=0;i<72;i++){
      var c=document.createElement("i");c.className="ab-confetti";
      c.style.left=randomInt(0,100)+"%";c.style.top=randomInt(-30,5)+"%";
      c.style.background=pick(colors);c.style.animationDelay=(Math.random()*2.2)+"s";c.style.animationDuration=(1.8+Math.random()*2.1)+"s";
      box.appendChild(c);
    }
  }

  function overlay(title,copy,ms){
    var o=$(".ab-overlay");$(".ab-overlay-title").textContent=title;$(".ab-overlay-copy").textContent=copy;
    o.classList.add("show");later(function(){if(o)o.classList.remove("show")},ms||1700);
  }
  function toast(text){
    var t=$(".ab-toast");t.textContent=text;t.classList.add("show");later(function(){if(t)t.classList.remove("show")},1800);
  }

  function close(){
    mediaGesture=null;
    if(root&&$(".ab-image-viewer"))closeImageViewer();
    clearTimers();clearTimeout(saveTimer);
    window.removeEventListener("pagehide",flushOnHide,true);
    document.removeEventListener("visibilitychange",flushOnVisibility,true);
    var closingState=state;
    var done=saveNow();
    setViewport(false);
    if(root)root.remove();
    root=null;
    done.finally(function(){if(state===closingState)state=null});
  }
  function open(){if(root||booting)return;build()}

  window[API_KEY]={version:VERSION,open:open,close:close};
})();