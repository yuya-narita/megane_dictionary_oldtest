/* 83_developer_patch.js
   Phase1: Developerの箱
   - 観測ログ下部 Build 1.0.3 長押しから開く
   - localStorageビューア / Event Test / Observation / Reset の土台
*/
(function(){
  "use strict";
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); }
  function ensureStyle(){
    if(document.getElementById("developerPatchStylePhase1")) return;
    var st=document.createElement("style"); st.id="developerPatchStylePhase1";
    st.textContent=".dev-modal{position:fixed;inset:0;z-index:100002;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));background:rgba(0,0,0,.76);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.dev-modal[hidden]{display:none!important}.dev-card{width:min(94vw,520px);max-height:84vh;overflow:auto;border-radius:28px;border:1px solid rgba(160,220,255,.24);background:linear-gradient(145deg,rgba(20,35,48,.95),rgba(10,12,18,.96));color:#fff;padding:22px;box-shadow:0 24px 90px rgba(0,0,0,.65);-webkit-overflow-scrolling:touch}.dev-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.dev-head strong{font-size:22px;letter-spacing:.06em}.dev-close{border-radius:999px;padding:8px 12px;font-weight:900}.dev-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 16px}.dev-tabs button{border-radius:14px;padding:10px 8px;font-size:12px;font-weight:900}.dev-section{display:none}.dev-section.active{display:block}.dev-row{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.82);font-weight:800}.dev-row em{font-style:normal;color:rgba(170,230,255,.95);text-align:right;word-break:break-all}.dev-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.dev-actions button{border-radius:14px;padding:10px;font-weight:900}.dev-storage{font-size:12px;line-height:1.55;color:rgba(255,255,255,.78);font-weight:800;white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;margin-top:10px}.dev-muted{color:rgba(255,255,255,.54);font-size:12px;line-height:1.7;font-weight:800}.dev-toast{position:fixed;left:50%;bottom:max(88px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:100003;padding:12px 16px;border-radius:999px;background:rgba(0,0,0,.82);border:1px solid rgba(160,220,255,.24);color:#fff;font-weight:900;box-shadow:0 12px 34px rgba(0,0,0,.42)}";
    document.head.appendChild(st);
  }
  function toast(text){ var old=document.querySelector(".dev-toast"); if(old) old.remove(); var t=document.createElement("div"); t.className="dev-toast"; t.textContent=text; document.body.appendChild(t); setTimeout(function(){ t.remove(); },1600); }
  function modal(){ ensureStyle(); var m=document.getElementById("developerPatchModal"); if(m) return m; m=document.createElement("div"); m.id="developerPatchModal"; m.className="dev-modal"; m.hidden=true; document.body.appendChild(m); m.addEventListener("click",function(e){ if(e.target===m) m.hidden=true; }); return m; }
  function row(label,value){ return '<div class="dev-row"><span>'+esc(label)+'</span><em>'+esc(value)+'</em></div>'; }
  function storageSummary(){ var keys=[]; try{ for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i)); }catch(e){} keys.sort(); return keys.map(function(k){ var v=""; try{ v=localStorage.getItem(k)||""; }catch(e){} return k+" = "+(v.length>80?v.slice(0,80)+"…":v); }).join("\n"); }
  function storageRows(){ var count=0, chars=0; try{ count=localStorage.length; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i), v=localStorage.getItem(k)||""; chars += k.length + v.length; } }catch(e){} return row("localStorage keys",count)+row("approx chars",chars); }
  function showTab(root,name){ root.querySelectorAll(".dev-section").forEach(function(s){ s.classList.remove("active"); }); var el=root.querySelector('[data-section="'+name+'"]'); if(el) el.classList.add("active"); }
  function openDeveloper(){
    localStorage.setItem("megane_developer_mode_v1","1");
    var m=modal();
    m.innerHTML='<div class="dev-card"><div class="dev-head"><strong>🛠 Developer</strong><button class="dev-close" data-close>×</button></div><div class="dev-tabs"><button data-tab="storage">Storage</button><button data-tab="event">Event</button><button data-tab="observation">Observe</button><button data-tab="reset">Reset</button></div>'
      + '<div class="dev-section active" data-section="storage">'+storageRows()+'<div class="dev-actions"><button data-dev="refreshStorage">更新</button><button data-dev="copyStorage">Copy</button></div><div class="dev-storage" id="devStorageView">'+esc(storageSummary()||"empty")+'</div></div>'
      + '<div class="dev-section" data-section="event">'+row("カード3枚テスト",localStorage.getItem("megane_dev_card_kinds")||"OFF")+row("カードコンプテスト",localStorage.getItem("megane_dev_card_complete")==="1"?"ON":"OFF")+row("全解除テスト",localStorage.getItem("megane_dev_unlock_all")==="1"?"ON":"OFF")+row("ランダム検査🎲",localStorage.getItem("megane_dev_random_test")==="1"?"ON":"OFF")+'<div class="dev-actions"><button data-dev="card3">カード3枚ON</button><button data-dev="card10">カード10枚ON</button><button data-dev="cardComplete">カードコンプON</button><button data-dev="clearCard">カードテストOFF</button><button data-dev="unlockAll">全解除ON</button><button data-dev="clearUnlockAll">全解除OFF</button><button data-dev="randomTestOn">ランダム検査ON</button><button data-dev="randomTestOff">ランダム検査OFF</button></div><p class="dev-muted">Phase1ではテストフラグだけ保存します。各解除パッチ側がこの値を見るようにするとイベント確認ができます。</p></div>'
      + '<div class="dev-section" data-section="observation"><div class="dev-actions"><button data-dev="showLog">観測ログ表示</button><button data-dev="fakeDict">辞書音声+1</button><button data-dev="fakeMusic">音楽再生+1</button><button data-dev="fakeCard">カード観測+1</button></div><p class="dev-muted">観測ログの箱にテストイベントを送ります。</p></div>'
      + '<div class="dev-section" data-section="reset"><div class="dev-actions"><button data-dev="resetObservation">観測ログ初期化</button><button data-dev="resetLv7Notice">Lv.7通知 初期化</button><button data-dev="testLv7Notice">Lv.7通知 テスト</button><button data-dev="resetDev">Developerフラグ初期化</button><button data-dev="resetUnlocks">解除テスト初期化</button><button data-dev="resetAllDanger">localStorage全削除</button></div><p class="dev-muted">全削除はカード・お気に入り・解除状態なども消えるので注意。</p></div></div>';
    m.hidden=false;
    var card=m.querySelector(".dev-card");
    m.querySelector("[data-close]").onclick=function(){ m.hidden=true; };
    m.querySelectorAll("[data-tab]").forEach(function(btn){ btn.onclick=function(){ showTab(card,btn.dataset.tab); }; });
    m.querySelectorAll("[data-dev]").forEach(function(btn){ btn.onclick=function(){
      var a=btn.dataset.dev;
      if(a==="refreshStorage"){ var sv=document.getElementById("devStorageView"); if(sv) sv.textContent=storageSummary()||"empty"; toast("Storage更新"); }
      if(a==="copyStorage"){ try{ navigator.clipboard.writeText(storageSummary()||"empty"); toast("コピーしました"); }catch(e){ toast("コピー失敗"); } }
      if(a==="card3"){ localStorage.setItem("megane_dev_card_kinds","3"); toast("カード3枚テスト ON"); }
      if(a==="card10"){ localStorage.setItem("megane_dev_card_kinds","10"); toast("カード10枚テスト ON"); }
      if(a==="cardComplete"){ localStorage.setItem("megane_dev_card_complete","1"); localStorage.setItem("megane_dev_card_kinds","25"); toast("カードコンプテスト ON"); }
      if(a==="clearCard"){ localStorage.removeItem("megane_dev_card_kinds"); localStorage.removeItem("megane_dev_card_complete"); toast("カードテスト OFF"); }
      if(a==="unlockAll"){ localStorage.setItem("megane_dev_unlock_all","1"); toast("全解除 ON"); }
      if(a==="clearUnlockAll"){ localStorage.removeItem("megane_dev_unlock_all"); toast("全解除 OFF"); }
      if(a==="randomTestOn"){ localStorage.setItem("megane_dev_random_test","1"); toast("ランダム検査 ON"); }
      if(a==="randomTestOff"){ localStorage.removeItem("megane_dev_random_test"); var rb=document.getElementById("cardRandomTestButton"); if(rb) rb.style.display="none"; var rp=document.getElementById("cardRandomTestPanel"); if(rp) rp.style.display="none"; toast("ランダム検査 OFF"); }
      if(a==="showLog" && window.MEGANE_OBSERVATION_LOG) window.MEGANE_OBSERVATION_LOG.show();
      if(a==="fakeDict" && window.MEGANE_OBSERVE){ window.MEGANE_OBSERVE("dictionary.voice",{word:"テスト",megane:"ズレア"}); toast("辞書音声+1"); }
      if(a==="fakeMusic" && window.MEGANE_OBSERVE){ window.MEGANE_OBSERVE("music.play",{track:"TEST TRACK"}); toast("音楽再生+1"); }
      if(a==="fakeCard" && window.MEGANE_OBSERVE){ window.MEGANE_OBSERVE("card.draw",{}); toast("カード観測+1"); }
      if(a==="resetObservation" && confirm("観測ログだけ初期化しますか？")){ if(window.MEGANE_OBSERVATION_LOG && window.MEGANE_OBSERVATION_LOG.reset) window.MEGANE_OBSERVATION_LOG.reset(); else localStorage.removeItem("megane_observation_log_v1"); toast("観測ログ初期化"); }
      if(a==="resetLv7Notice"){
        localStorage.removeItem("megane_lv7_notice_seen_v1");
        if(window.MEGANE_OBSERVATION_LOG && window.MEGANE_OBSERVATION_LOG.resetLv7Notice) window.MEGANE_OBSERVATION_LOG.resetLv7Notice();
        toast("Lv.7通知 初期化");
      }
      if(a==="testLv7Notice"){
        localStorage.removeItem("megane_lv7_notice_seen_v1");
        if(window.MEGANE_OBSERVATION_LOG && window.MEGANE_OBSERVATION_LOG.testLv7Notice){
          window.MEGANE_OBSERVATION_LOG.testLv7Notice();
          toast("Lv.7通知 テスト");
        }else{
          toast("82さんにテスト関数がありません");
        }
      }
      if(a==="resetDev"){ localStorage.removeItem("megane_developer_mode_v1"); localStorage.removeItem("megane_dev_random_test"); var rb=document.getElementById("cardRandomTestButton"); if(rb) rb.style.display="none"; var rp=document.getElementById("cardRandomTestPanel"); if(rp) rp.style.display="none"; toast("Developerフラグ初期化"); }
      if(a==="resetUnlocks"){ localStorage.removeItem("megane_dev_card_kinds"); localStorage.removeItem("megane_dev_card_complete"); localStorage.removeItem("megane_dev_unlock_all"); toast("解除テスト初期化"); }
      if(a==="resetAllDanger" && confirm("localStorageを全削除しますか？")){ localStorage.clear(); toast("localStorage全削除"); }
    }; });
  }
  window.MEGANE_DEVELOPER_OPEN=openDeveloper;
})();
