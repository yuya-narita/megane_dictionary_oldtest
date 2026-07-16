/* 111_paradox_playground.js
   MEGANE DICTIONARY v1.02 — BUG PLAYGROUND
   111は画面表示だけ。カード操作や長押し判定は120が担当。
*/
(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  function cardsSafe(){
    try{
      if(typeof cards !== "undefined" && Array.isArray(cards)) return cards;
    }catch(e){}
    try{
      if(window.cards && Array.isArray(window.cards)) return window.cards;
    }catch(e){}
    return [];
  }

  function esc(value){
    return String(value == null ? "" : value).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch];
    });
  }

  function ensureStyle(){
    if($("bugPlaygroundStyleV102")) return;

    var style = document.createElement("style");
    style.id = "bugPlaygroundStyleV102";
    style.textContent = `
      #bugPlaygroundOverlay{
        position:fixed;
        inset:0;
        z-index:2147483400;
        overflow:hidden;
        background:#050608;
        color:#fff;
        touch-action:none;
        user-select:none;
        -webkit-user-select:none;
        font-family:inherit;
      }
      #bugPlaygroundOverlay .bp-world{
        position:absolute;
        inset:0;
        display:grid;
        place-items:center;
        overflow:hidden;
      }
      #bugPlaygroundOverlay .bp-close{
        position:absolute;
        top:max(18px,env(safe-area-inset-top));
        right:18px;
        z-index:50;
        width:48px;
        height:48px;
        border:1px solid rgba(255,255,255,.14);
        border-radius:50%;
        background:rgba(255,255,255,.10);
        color:#fff;
        font-size:27px;
        cursor:pointer;
        touch-action:manipulation;
      }
      #bugPlaygroundOverlay .bp-no{
        position:absolute;
        top:max(28px,calc(env(safe-area-inset-top) + 10px));
        left:22px;
        right:82px;
        font-size:10px;
        letter-spacing:.16em;
        color:rgba(255,255,255,.30);
      }
      #bugPlaygroundOverlay .bp-message{
        position:absolute;
        left:20px;
        right:20px;
        bottom:max(44px,calc(env(safe-area-inset-bottom) + 28px));
        text-align:center;
        font-size:13px;
        line-height:1.8;
        letter-spacing:.08em;
        color:rgba(255,255,255,.63);
        pointer-events:none;
      }
      #bugPlaygroundOverlay .bp-bear{
        position:absolute;
        left:50%;
        top:48%;
        transform:translate(-50%,-50%);
        padding:0;
        border:0;
        background:transparent;
        font-size:84px;
        line-height:1;
        filter:drop-shadow(0 18px 30px rgba(0,0,0,.46));
        cursor:pointer;
        transition:left .30s cubic-bezier(.2,.8,.2,1),top .30s cubic-bezier(.2,.8,.2,1);
      }
      #bugPlaygroundOverlay .bp-bear.bp-pop{
        animation:bpBearPop .28s ease;
      }
      @keyframes bpBearPop{
        0%{transform:translate(-50%,-50%) scale(.82)}
        60%{transform:translate(-50%,-50%) scale(1.13)}
        100%{transform:translate(-50%,-50%) scale(1)}
      }
      #bugPlaygroundOverlay .bp-thought{
        position:absolute;
        width:7px;
        height:7px;
        border-radius:50%;
        background:rgba(255,255,255,.58);
        pointer-events:none;
        animation:bpThought 1.8s ease-out forwards;
      }
      @keyframes bpThought{
        0%{opacity:.82;transform:scale(.5)}
        100%{opacity:0;transform:scale(8)}
      }
    `;
    document.head.appendChild(style);
  }

  var closeLockUntil = 0;

  function close(){
    var overlay = $("bugPlaygroundOverlay");
    closeLockUntil = Date.now() + 420;
    document.documentElement.dataset.bugCloseLock = "1";

    if(overlay){
      overlay.style.pointerEvents = "auto";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity .10s ease";
      setTimeout(function(){
        if(overlay && overlay.parentNode) overlay.remove();
      },110);
    }

    document.body.classList.remove("bug-playground-open");

    setTimeout(function(){
      if(Date.now() >= closeLockUntil){
        delete document.documentElement.dataset.bugCloseLock;
      }
    },450);
  }

  function baseOverlay(label){
    close();
    ensureStyle();

    var overlay = document.createElement("section");
    overlay.id = "bugPlaygroundOverlay";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.innerHTML =
      '<button type="button" class="bp-close" aria-label="閉じる">×</button>' +
      '<div class="bp-world"><div class="bp-no">' + esc(label) + '</div></div>';

    document.body.appendChild(overlay);
    document.body.classList.add("bug-playground-open");

    var closeButton = overlay.querySelector(".bp-close");
    function closeNow(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      close();
      return false;
    }
    closeButton.addEventListener("pointerdown",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    },true);
    closeButton.addEventListener("pointerup",closeNow,true);
    closeButton.addEventListener("click",closeNow,true);

    return overlay;
  }

  function openPolarBear(){
    var overlay = baseOverlay("No.001 / POLAR BEAR BUG");
    var world = overlay.querySelector(".bp-world");

    var bear = document.createElement("button");
    bear.type = "button";
    bear.className = "bp-bear";
    bear.textContent = "🐻‍❄️";

    var message = document.createElement("div");
    message.className = "bp-message";
    message.innerHTML = "白クマのことを<br>考えないでください。";

    world.appendChild(bear);
    world.appendChild(message);

    var count = 0;

    function leaveThought(x,y){
      var dot = document.createElement("i");
      dot.className = "bp-thought";
      dot.style.left = x + "px";
      dot.style.top = y + "px";
      world.appendChild(dot);
      setTimeout(function(){ dot.remove(); },1900);
    }

    function observe(x,y){
      count++;
      var pad = 62;
      var nx = Math.max(pad,Math.min(window.innerWidth-pad,x));
      var ny = Math.max(pad+30,Math.min(window.innerHeight-pad-55,y));

      bear.style.left = nx + "px";
      bear.style.top = ny + "px";
      bear.classList.remove("bp-pop");
      void bear.offsetWidth;
      bear.classList.add("bp-pop");
      leaveThought(nx,ny);

      if(count === 1) message.textContent = "見ましたね。";
      else if(count === 2) message.textContent = "考えないようにしてください。";
      else if(count === 3) message.textContent = "まだ見ています。";
      else message.textContent = "考えないようにした回数：" + count;
    }

    world.addEventListener("pointerup",function(e){
      if(e.target.closest(".bp-close")) return;
      observe(e.clientX,e.clientY);
    });
  }

  function openPlaceholder(index,card){
    var no = String(index+1).padStart(3,"0");
    var title = card && (card.title || card.name) || "BUG";
    var overlay = baseOverlay("No." + no + " / " + title);
    var world = overlay.querySelector(".bp-world");

    var message = document.createElement("div");
    message.className = "bp-message";
    message.textContent = "このBUGは、まだ観測されていません。";
    world.appendChild(message);
  }

  var gameLoaders = {};

  function lazyLoadGame(key,src,globalName){
    if(window[globalName] && typeof window[globalName].open === "function"){
      return Promise.resolve(window[globalName]);
    }
    if(gameLoaders[key]) return gameLoaders[key];

    gameLoaders[key] = new Promise(function(resolve,reject){
      var selector = 'script[data-megane-game="'+key+'"]';
      var existing = document.querySelector(selector);

      function finish(){
        if(window[globalName] && typeof window[globalName].open === "function"){
          resolve(window[globalName]);
        }else{
          reject(new Error(globalName+" not available"));
        }
      }

      if(existing){
        existing.addEventListener("load",finish,{once:true});
        existing.addEventListener("error",reject,{once:true});
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.meganeGame = key;
      script.onload = finish;
      script.onerror = function(err){
        delete gameLoaders[key];
        reject(err);
      };
      document.head.appendChild(script);
    });

    return gameLoaders[key];
  }

  function openPeaceShooter(){
    close();
    lazyLoadGame(
      "peace-shooter-10",
      "./js/127_peace_shooter_v10.js?v=peace10",
      "MEGANE_PEACE_SHOOTER"
    ).then(function(api){
      api.open();
    }).catch(function(err){
      console.error("[BUG PLAYGROUND] PEACE SHOOTER load failed",err);
      openPlaceholder(18,{title:"PEACE SHOOTER / LOAD ERROR"});
    });
  }

  function openStoryBug(){
    close();
    lazyLoadGame(
      "story-bug-09",
      "./js/136_story_bug_v09.js?v=story09",
      "MEGANE_STORY_BUG"
    ).then(function(api){
      api.open();
    }).catch(function(err){
      console.error("[BUG PLAYGROUND] STORY BUG load failed",err);
      openPlaceholder(16,{title:"STORY BUG / LOAD ERROR"});
    });
  }

  function openApprovalBug(){
    close();
    lazyLoadGame(
      "approval-bug-final-clean-stats",
      "./js/139_approval_bug_final_clean_stats.js?v=approvalFinalCleanStats",
      "MEGANE_APPROVAL_BUG"
    ).then(function(api){
      api.open();
    }).catch(function(err){
      console.error("[BUG PLAYGROUND] APPROVAL BUG load failed",err);
      openPlaceholder(6,{title:"APPROVAL BUG / LOAD ERROR"});
    });
  }

  function openRecursionBug(){
    close();
    lazyLoadGame(
      "recursion-bug-release-1",
      "./js/137_recursion_bug_release_v1.js?v=release1",
      "MEGANE_RECURSION_BUG"
    ).then(function(api){
      api.open();
    }).catch(function(err){
      console.error("[BUG PLAYGROUND] RECURSION BUG load failed",err);
      openPlaceholder(22,{title:"RECURSION BUG / LOAD ERROR"});
    });
  }

  function open(index){
    var list = cardsSafe();
    index = Number(index);
    if(!isFinite(index) || index < 0 || index >= list.length) return false;

    // No.∞は将来の「中へ入る世界」専用。
    if(index === list.length-1) return false;

    if(index === 22){
      openRecursionBug();
    }else if(index === 6){
      openApprovalBug();
    }else if(index === 18){
      openPeaceShooter();
    }else if(index === 16){
      openStoryBug();
    }else if(index === 0){
      openPolarBear();
    }else{
      openPlaceholder(index,list[index]);
    }

    return true;
  }

  function boot(){
    ensureStyle();

    window.addEventListener("keydown",function(e){
      if(e.key === "Escape" && $("bugPlaygroundOverlay")){
        e.preventDefault();
        close();
      }
    },true);

    document.addEventListener("pointerup",function(e){
      if(Date.now() < closeLockUntil){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    },true);

    document.addEventListener("click",function(e){
      if(Date.now() < closeLockUntil){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    },true);

    window.MEGANE_BUG_PLAYGROUND = {
      version:"v1.073-approval-bug-final-clean-stats-router",
      open:open,
      close:close
    };
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();