/* 139_approval_bug_v01.js
   LOOKING BEAR No.007 — APPROVAL BUG
   ECHO v0.1 / Persistent social-network simulator

   - HTML/CSS social feed, no canvas
   - User-written posts are stored locally
   - Engagement grows in waves, one large viral event, then an abrupt drought
   - Likes, followers, notifications and phase survive closing/reopening
   - No player-facing reset
*/
(function(){
  "use strict";

  var API_KEY="MEGANE_APPROVAL_BUG";
  var VERSION="v0.1-persistent-social-simulator";
  var STORE_KEY="looking_bear_approval_bug_v01";
  if(window[API_KEY] && window[API_KEY].version===VERSION) return;

  var root=null,state=null,audio=null,raf=0,timers=[];
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
      session:1
    };
  }
  function load(){
    try{
      var raw=localStorage.getItem(STORE_KEY);
      if(!raw)return defaultState();
      var v=JSON.parse(raw);
      var d=defaultState();
      Object.keys(v||{}).forEach(function(k){d[k]=v[k]});
      d.posts=Array.isArray(d.posts)?d.posts:[];
      d.notifications=Array.isArray(d.notifications)?d.notifications:[];
      d.session=(Number(d.session)||0)+1;
      d.lastOpenAt=nowISO();
      return d;
    }catch(e){return defaultState()}
  }
  function save(){
    try{state.lastOpenAt=nowISO();localStorage.setItem(STORE_KEY,JSON.stringify(state))}catch(e){}
  }

  function ensureStyle(){
    if(document.getElementById("approvalBugStyleV01"))return;
    var s=document.createElement("style");
    s.id="approvalBugStyleV01";
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
        margin:12px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:13px;
        box-shadow:0 5px 20px rgba(28,39,55,.05)
      }
      #approvalBugRoot .ab-userline{display:flex;align-items:center;gap:10px;margin-bottom:10px}
      #approvalBugRoot .ab-avatar{
        width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#101722;color:#fff;
        font-size:21px;flex:0 0 auto;overflow:hidden
      }
      #approvalBugRoot .ab-account{min-width:0}
      #approvalBugRoot .ab-name{font-size:14px;font-weight:850}
      #approvalBugRoot .ab-handle{font-size:11px;color:var(--muted)}
      #approvalBugRoot textarea{
        width:100%;min-height:86px;resize:none;border:0;outline:0;background:transparent;color:var(--text);
        font:500 16px/1.55 inherit;padding:6px 2px
      }
      #approvalBugRoot textarea::placeholder{color:#9ba7b4}
      #approvalBugRoot .ab-compose-foot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px}
      #approvalBugRoot .ab-tools{display:flex;gap:9px;color:var(--accent);font-size:18px}
      #approvalBugRoot .ab-post-btn{
        border:0;border-radius:999px;padding:10px 19px;background:linear-gradient(145deg,var(--accent),var(--accent2));
        color:#fff;font-weight:850;letter-spacing:.02em;opacity:.45
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
      #approvalBugRoot .ab-comments{margin:10px 0 0 54px;border-left:2px solid #edf0f4;padding-left:10px}
      #approvalBugRoot .ab-comment{font-size:11px;color:#5d6976;margin:6px 0}
      #approvalBugRoot .ab-empty{padding:60px 22px;text-align:center;color:var(--muted);line-height:1.7}
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
    ensureStyle();setViewport(true);
    state=load();save();
    root=document.createElement("div");root.id="approvalBugRoot";
    root.innerHTML=`
      <div class="ab-shell">
        <header class="ab-top">
          <div class="ab-brand"><span class="ab-mark">E</span><span>ECHO</span></div>
          <div class="ab-top-actions">
            <button class="ab-icon ab-bell" type="button" aria-label="通知">♢<span class="ab-badge"></span></button>
            <button class="ab-icon ab-close" type="button" aria-label="閉じる">×</button>
          </div>
        </header>
        <main class="ab-main">
          <section class="ab-view ab-home show">
            <div class="ab-compose">
              <div class="ab-userline"><div class="ab-avatar">🐻‍❄️</div><div class="ab-account"><div class="ab-name">あなた</div><div class="ab-handle">@observer</div></div></div>
              <textarea class="ab-input" maxlength="280" placeholder="いま、何を伝えますか？"></textarea>
              <div class="ab-compose-foot"><div class="ab-tools">⌁　□　#</div><button class="ab-post-btn" type="button">投稿</button></div>
            </div>
            <div class="ab-feed-head">あなたの投稿</div>
            <div class="ab-feed"></div>
          </section>
          <section class="ab-view ab-notifications"></section>
          <section class="ab-view ab-profile"></section>
        </main>
        <nav class="ab-bottom">
          <button class="ab-tab active" data-tab="home">⌂<small>ホーム</small></button>
          <button class="ab-tab" data-tab="notifications">♢<small>通知</small><span class="ab-badge ab-tab-badge"></span></button>
          <button class="ab-tab" data-tab="profile">◉<small>プロフィール</small></button>
        </nav>
        <div class="ab-viral"></div>
        <div class="ab-overlay"><div class="ab-overlay-card"><div class="ab-overlay-title"></div><div class="ab-overlay-copy"></div></div></div>
        <div class="ab-toast"></div>
      </div>`;
    document.body.appendChild(root);
    bind();renderAll();
    if(state.phase==="drought" && state.session>1){
      later(function(){toast("前回の続きから再開しました。")},500);
    }
  }

  function bind(){
    $(".ab-close").addEventListener("pointerdown",function(e){block(e);close()},true);
    $(".ab-bell").addEventListener("pointerdown",function(e){block(e);switchTab("notifications")},true);
    $(".ab-input").addEventListener("input",function(){updatePostButton()},true);
    $(".ab-post-btn").addEventListener("pointerdown",function(e){block(e);submitPost()},true);
    $all(".ab-tab").forEach(function(b){b.addEventListener("pointerdown",function(e){block(e);switchTab(b.dataset.tab)},true)});
    root.addEventListener("touchmove",function(e){
      if(e.target.closest(".ab-view")||e.target.closest("textarea"))return;
      e.preventDefault();
    },{passive:false});
  }

  function updatePostButton(){
    var ready=$(".ab-input").value.trim().length>0;
    $(".ab-post-btn").classList.toggle("ready",ready);
  }

  function switchTab(tab){
    state.activeTab=tab;
    $all(".ab-view").forEach(function(v){v.classList.remove("show")});
    var view=tab==="home"?$(".ab-home"):tab==="notifications"?$(".ab-notifications"):$(".ab-profile");
    view.classList.add("show");
    $all(".ab-tab").forEach(function(b){b.classList.toggle("active",b.dataset.tab===tab)});
    if(tab==="notifications"){state.unread=0;state.notifications.forEach(function(n){n.unread=false});save()}
    renderAll();
  }

  function renderAll(){
    renderFeed();renderNotifications();renderProfile();renderBadges();updatePostButton();
  }

  function renderFeed(){
    var feed=$(".ab-feed");
    if(!state.posts.length){
      feed.innerHTML='<div class="ab-empty">まだ投稿はありません。<br>最初の言葉を置いてください。</div>';
      return;
    }
    feed.innerHTML=state.posts.slice().reverse().map(function(p){
      var comments=(p.comments||[]).map(function(c){return '<div class="ab-comment"><b>'+escapeHtml(c.name)+'</b>　'+escapeHtml(c.text)+'</div>'}).join("");
      return '<article class="ab-post" data-id="'+p.id+'">'+
        '<div class="ab-post-top"><div class="ab-avatar">🐻‍❄️</div><div class="ab-post-body">'+
        '<div class="ab-post-meta"><b>あなた</b><span>@observer · '+relativeTime(p.createdAt)+'</span></div>'+
        '<div class="ab-text">'+escapeHtml(p.text)+'</div></div></div>'+
        '<div class="ab-post-stats"><span class="ab-stat">◌ '+fmt(p.replies||0)+'</span><span class="ab-stat">↻ '+fmt(p.reposts||0)+'</span><span class="ab-stat like">♥ <i>'+fmt(p.likes||0)+'</i></span></div>'+
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
    var topPost=state.posts.reduce(function(a,b){return !a||b.likes>a.likes?b:a},null);
    var note=state.phase==="drought"
      ?'<div class="ab-system-note">現在、投稿への配信量が以前より低下しています。品質向上のため継続的な投稿をおすすめします。</div>'
      :'';
    $(".ab-profile").innerHTML=
      '<div class="ab-profile-card"><div class="ab-profile-top"><div class="ab-profile-avatar">🐻‍❄️</div><div><div style="font-size:20px;font-weight:900">あなた</div><div style="color:var(--muted);font-size:12px">@observer</div><div style="margin-top:8px;font-size:13px">言葉を置いています。</div></div></div>'+
      '<div class="ab-counts"><div><b>'+fmt(state.posts.length)+'</b>投稿</div><div><b>'+fmt(state.followers)+'</b>フォロワー</div><div><b>'+fmt(state.following)+'</b>フォロー中</div></div></div>'+
      note+
      '<div class="ab-system-note" style="background:transparent;color:var(--muted);border:1px solid var(--line)">最高反応　'+(topPost?fmt(topPost.likes)+" いいね":"—")+'<br>累計反応　'+fmt(state.totalLikes)+" いいね</div>";
  }

  function renderBadges(){
    var text=state.unread>99?"99+":String(state.unread||"");
    [$(".ab-badge"),$(".ab-tab-badge")].forEach(function(b){if(!b)return;b.textContent=text;b.classList.toggle("show",state.unread>0)});
  }

  function createPost(text){
    state.postCount++;
    var result=engagementFor(state.postCount,state.phase);
    var post={
      id:"p"+Date.now()+"_"+state.postCount,
      text:text,createdAt:nowISO(),likes:0,targetLikes:result.likes,
      reposts:0,replies:0,comments:[],kind:result.kind
    };
    state.posts.push(post);
    state.posts=state.posts.slice(-60);
    save();renderAll();return post;
  }

  function engagementFor(count,phase){
    if(phase==="drought"){
      var low=[0,1,1,2,3,0,1,4,2,0][count%10];
      return{kind:"drought",likes:low};
    }
    if(count===1)return{kind:"seed",likes:randomInt(2,7)};
    if(count===2)return{kind:"growth",likes:randomInt(18,48)};
    if(count===3)return{kind:"growth",likes:randomInt(130,520)};
    if(count>=4 && !state.viralSeen)return{kind:"viral",likes:randomInt(42000,138000)};
    return{kind:"growth",likes:randomInt(220,1400)};
  }

  function submitPost(){
    var input=$(".ab-input"),text=input.value.trim();
    if(!text)return;
    input.value="";updatePostButton();
    var post=createPost(text);
    switchTab("home");
    later(function(){
      var card=root.querySelector('.ab-post[data-id="'+post.id+'"]');
      if(card)card.scrollIntoView({behavior:"smooth",block:"start"});
    },80);
    if(post.kind==="viral")runViral(post);
    else animateEngagement(post);
  }

  function animateEngagement(post){
    var target=post.targetLikes,steps=target<=4?target:Math.min(12,Math.max(4,Math.ceil(Math.log(target+1)*2)));
    if(target===0){later(function(){toast("投稿しました。")},500);return}
    var i=0;
    function tick(){
      if(!root)return;
      i++;
      var t=i/steps,eased=1-Math.pow(1-t,2.6);
      post.likes=Math.max(post.likes,Math.round(target*eased));
      post.reposts=Math.floor(post.likes*(post.kind==="growth"?.08:.03));
      post.replies=Math.floor(post.likes*(post.kind==="growth"?.025:.01));
      updatePostLike(post,true);
      if(i===1||i===steps||Math.random()<.35){
        addReactionNotification(post,false);
      }
      if(i<steps)later(tick,post.kind==="drought"?1100:randomInt(380,760));
      else{
        state.totalLikes+=post.likes;
        state.followers+=post.kind==="drought"?randomInt(-2,1):Math.max(0,Math.floor(post.likes*.08));
        if(state.followers<0)state.followers=0;
        if(post.likes>20)post.comments.push({name:pick(fakeNames),text:pick(commentsPositive)});
        if(state.phase==="drought"&&state.postCount%3===0)post.comments.push({name:pick(fakeNames),text:pick(commentsCold)});
        save();renderAll();
      }
    }
    later(tick,500);
  }

  function updatePostLike(post,pop){
    var card=root&&root.querySelector('.ab-post[data-id="'+post.id+'"]');
    if(!card){renderAll();return}
    var like=card.querySelector(".ab-stat.like"),i=like&&like.querySelector("i");
    if(i)i.textContent=fmt(post.likes);
    if(pop&&like){like.classList.add("hot");later(function(){if(like)like.classList.remove("hot")},150)}
  }

  function runViral(post){
    state.viralSeen=true;save();
    var viral=$(".ab-viral");viral.classList.add("show");spawnConfetti();
    overlay("おすすめ掲載","あなたの投稿が急上昇しています。",1050);
    var start=Date.now(),duration=11500,lastLikes=0,lastNoti=0;
    function frame(){
      if(!root)return;
      var t=clamp((Date.now()-start)/duration,0,1),eased=1-Math.pow(1-t,3.8);
      var current=Math.round(post.targetLikes*eased);
      if(current>post.likes){
        post.likes=current;post.reposts=Math.floor(current*.22);post.replies=Math.floor(current*.035);
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
        state.followers+=Math.floor(post.likes*.17)+randomInt(900,4100);
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
    clearTimers();save();setViewport(false);
    if(root)root.remove();root=null;state=null;
  }
  function open(){if(root)return;build()}

  window[API_KEY]={version:VERSION,open:open,close:close};
})();