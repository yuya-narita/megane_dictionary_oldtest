/* 108_music_prohibited_stage.js — unified */
(function(){
"use strict";

var STYLE_ID="musicLockUnifiedStyle";
var timer=0;

function removeOld(){
  [
    "musicProhibitedStageStyle",
    "musicProhibitedStageStyleV10",
    "musicProhibitedHybridStyle",
    "musicProhibitedStageCinemaStyle"
  ].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.remove();
  });

  document.querySelectorAll(
    ".prohibited-evidence-poster,.prohibited-hybrid-poster,"+
    ".looking-bear-poster,.looking-bear-typography-poster,"+
    ".music-lock-unified-overlay"
  ).forEach(function(el){ el.remove(); });

  document.querySelectorAll(
    ".prohibited-evidence-card,.prohibited-hybrid-card,"+
    ".looking-bear-poster-card,.music-lock-unified-card"
  ).forEach(function(el){
    el.classList.remove(
      "prohibited-evidence-card","prohibited-hybrid-card",
      "looking-bear-poster-card","music-lock-unified-card",
      "music-lock-looking","music-lock-prohibited"
    );
  });
}

function style(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement("style");
  s.id=STYLE_ID;
  s.textContent=`
.music-v7-album-art.music-lock-unified-card .music-v7-jacket{position:relative!important;overflow:hidden!important}
.music-v7-album-art.music-lock-unified-card .music-v7-unlock-mask{display:none!important}
.music-lock-unified-overlay{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;box-sizing:border-box;font-family:"Arial Narrow","Helvetica Neue","Noto Sans JP","Hiragino Kaku Gothic ProN",sans-serif}

/* LOOKING BEAR */
.music-lock-unified-overlay.is-looking{color:#eadca3;text-shadow:0 2px 7px rgba(0,0,0,.72);background:linear-gradient(rgba(12,5,2,.03),rgba(12,5,2,.16))}
.lb3{position:absolute;left:-1%;top:-6%;font:1000 clamp(64px,28vw,130px)/1 "Arial Black",sans-serif}
.lbtypes{position:absolute;top:2%;left:30%;right:3%;font:1000 clamp(28px,12vw,56px)/.92 "Arial Black","Noto Sans JP",sans-serif;letter-spacing:-.08em;text-align:center}
.lbtypesen{position:absolute;top:17%;left:31%;right:3%;font-size:clamp(5px,1.8vw,9px);font-weight:900;letter-spacing:.22em;text-align:center}
.lbrule{position:absolute;left:4%;top:25%;width:38%;height:1px;background:rgba(234,220,163,.74)}
.lbdiff{position:absolute;left:5%;top:29%;font-size:clamp(12px,4.7vw,22px);font-weight:950}
.lbcollect{position:absolute;left:5%;top:40%;font:1000 clamp(23px,9vw,43px)/.94 "Arial Black","Noto Sans JP",sans-serif;letter-spacing:-.08em}
.lbsmall{position:absolute;left:5%;top:56%;font-size:clamp(5px,1.7vw,8px);font-weight:850;letter-spacing:.08em}
.lb6{position:absolute;left:2.5%;top:58%;font:1000 clamp(40px,16vw,76px)/1 "Arial Black","Noto Sans JP",sans-serif;letter-spacing:-.10em}
.lbrelease{position:absolute;left:38%;top:63%;font:1000 clamp(23px,9vw,43px)/.95 "Arial Black","Noto Sans JP",sans-serif;letter-spacing:-.08em}
.lbobserve{position:absolute;right:-1%;top:28%;writing-mode:vertical-rl;font:1000 clamp(15px,5.2vw,25px)/.95 "Arial Black","Noto Sans JP",sans-serif}
.lbappear{position:absolute;right:2%;bottom:-3%;font:1000 clamp(43px,18vw,85px)/.9 "Arial Black","Noto Sans JP",sans-serif;letter-spacing:-.11em}
.lbcopy{position:absolute;left:4%;right:23%;bottom:11%;font-size:clamp(5px,1.7vw,8px);line-height:1.55;font-weight:850;letter-spacing:.1em}
.lbleft,.lbright{position:absolute;font-size:clamp(4px,1.4vw,7px);letter-spacing:.13em;font-weight:850;writing-mode:vertical-rl}
.lbleft{left:.7%;top:40%;transform:rotate(180deg)}
.lbright{right:.6%;bottom:1.5%}

/* PROHIBITED */
.music-v7-album-art.music-lock-prohibited .music-v7-jacket>img{filter:brightness(.46) saturate(.58) contrast(1.06)!important}
.music-lock-unified-overlay.is-prohibited{--p:#d2c6aa;--r:#8b2923;color:var(--p);text-shadow:0 2px 9px rgba(0,0,0,.88);background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.50))}
.music-lock-unified-overlay.is-prohibited:before{content:"";position:absolute;inset:6px;border:1px solid rgba(210,198,170,.22)}
.prtop{position:absolute;top:6%;left:8%;right:8%;display:flex;justify-content:space-between;color:rgba(210,198,170,.55);font-size:clamp(5px,1.9vw,9px);font-weight:850;letter-spacing:.17em}
.prtop small{display:block;margin-top:3px;font-size:.7em;letter-spacing:.2em}
.prlevel{border:1px solid rgba(210,198,170,.28);padding:4px 6px 3px;text-align:center}
.prlevel b{display:block;color:rgba(139,41,35,.82);font-size:2em;line-height:.9}
.prleft,.prright{position:absolute;top:26%;bottom:18%;writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;color:rgba(210,198,170,.58);font-size:clamp(6px,2.1vw,10px);font-weight:900;letter-spacing:.07em}
.prleft{left:3%;transform:rotate(180deg)}.prright{right:3%}
.prkick{position:absolute;top:24%;left:16%;right:16%;display:flex;align-items:center;gap:6px;color:rgba(210,198,170,.54);font-size:clamp(5px,1.9vw,9px);font-weight:850;letter-spacing:.22em;white-space:nowrap}
.prkick:before,.prkick:after{content:"";flex:1;height:1px;background:rgba(210,198,170,.28)}
.prmain{position:absolute;top:31%;left:10%;right:10%;text-align:center;font:1000 clamp(36px,15.5vw,73px)/.95 "Arial Black","Noto Sans JP",sans-serif;letter-spacing:-.10em;color:rgba(210,198,170,.72)}
.prarchive{position:absolute;top:57%;left:15%;right:15%;text-align:center;color:rgba(210,198,170,.44);font-size:clamp(5px,2vw,9px);font-weight:850;letter-spacing:.35em}
.prban{position:absolute;top:67%;left:50%;transform:translateX(-50%);min-width:48%;border:1px solid rgba(139,41,35,.62);padding:5px 7px 4px;color:rgba(157,50,42,.73);text-align:center;font-size:clamp(8px,3.2vw,15px);font-weight:950;letter-spacing:.16em}
.prban small{display:block;margin-top:4px;font-size:.38em;letter-spacing:.19em}
.prlook{position:absolute;left:9%;bottom:17%;color:rgba(210,198,170,.27);font-size:clamp(4px,1.5vw,7px);font-weight:850;letter-spacing:.25em}
.prstamp{position:absolute;right:7%;bottom:16.5%;transform:rotate(-9deg);border:2px solid rgba(139,41,35,.62);padding:4px 6px 3px;color:rgba(157,50,42,.69);font-size:clamp(7px,2.7vw,13px);font-weight:1000}
.prfoot{position:absolute;left:8%;right:8%;bottom:6%;display:flex;justify-content:space-between;align-items:flex-end;color:rgba(210,198,170,.37);font-size:clamp(4px,1.4vw,7px);font-weight:800;line-height:1.35;letter-spacing:.11em}
.prbar{width:31%;height:14px;opacity:.48;background:repeating-linear-gradient(90deg,var(--p) 0 1px,transparent 1px 3px,var(--p) 3px 5px,transparent 5px 7px,var(--p) 7px 8px,transparent 8px 11px)}
.prfile{text-align:right}.prfile strong{display:block;letter-spacing:.18em}
`;
  document.head.appendChild(s);
}

function title(card){
  var el=card.querySelector(".music-v7-album-copy strong");
  return (el?el.textContent:card.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
}

function kind(card){
  var t=title(card);
  if(t.indexOf("looking bear land")>=0) return "looking";
  if(t.indexOf("poem:prohibited")>=0||t.indexOf("poem prohibited")>=0||t.indexOf("立入禁止")>=0) return "prohibited";
  return "";
}

function looking(){
  return '<div class="music-lock-unified-overlay is-looking" aria-hidden="true">'+
  '<div class="lb3">3</div><div class="lbtypes">種類</div>'+
  '<div class="lbtypesen">THREE DIFFERENT CARDS</div><div class="lbrule"></div>'+
  '<div class="lbdiff">異なるカード</div><div class="lbcollect">三種<br>集める</div>'+
  '<div class="lbsmall">COLLECT / OBSERVE / OPEN</div><div class="lb6">6曲</div>'+
  '<div class="lbrelease">解放</div><div class="lbobserve">観測すると</div>'+
  '<div class="lbcopy">FIRST OBSERVATION GATE<br>ENTRY CONDITION 03<br>CARD ARCHIVE</div>'+
  '<div class="lbappear">出現</div><div class="lbleft">LOOKING BEAR / FIRST GATE</div>'+
  '<div class="lbright">OBSERVE</div></div>';
}

function prohibited(){
  return '<div class="music-lock-unified-overlay is-prohibited" aria-hidden="true">'+
  '<div class="prtop"><div>ISOLATION ARCHIVE<small>MUSIC / RESTRICTED MATERIAL</small></div><div class="prlevel">LEVEL<b>7</b></div></div>'+
  '<div class="prleft">RESTRICTED</div><div class="prright">DO NOT OPEN</div>'+
  '<div class="prkick">隔離アルバム</div><div class="prmain">押収品</div>'+
  '<div class="prarchive">EVIDENCE ARCHIVE</div>'+
  '<div class="prban">閲覧禁止<small>AUTHORIZED ACCESS ONLY</small></div>'+
  '<div class="prlook">LOOK BACK.</div><div class="prstamp">QUARANTINE</div>'+
  '<div class="prfoot"><div class="prbar"></div><div class="prfile"><strong>CASE FILE 0001</strong>SEALED / CONFISCATED</div></div></div>';
}

function decorate(card){
  var k=kind(card);
  if(!k) return;

  var locked=card.classList.contains("locked")||card.getAttribute("data-locked")==="1";
  var jacket=card.querySelector(".music-v7-jacket");
  if(!jacket) return;

  card.querySelectorAll(".music-lock-unified-overlay").forEach(function(el){el.remove();});
  card.classList.remove("music-lock-unified-card","music-lock-looking","music-lock-prohibited");

  if(!locked) return;

  card.classList.add("music-lock-unified-card",k==="looking"?"music-lock-looking":"music-lock-prohibited");
  jacket.insertAdjacentHTML("beforeend",k==="looking"?looking():prohibited());
}

function apply(){
  removeOld();
  style();
  document.querySelectorAll(
    ".music-v7-restricted-grid .music-v7-album-art[data-album],"+
    ".music-v7-album-art.music-v7-restricted-album[data-album]"
  ).forEach(decorate);
}

function schedule(){
  clearTimeout(timer);
  timer=setTimeout(apply,45);
}

function boot(){
  removeOld();
  style();
  apply();
  var root=document.getElementById("musicView")||document.getElementById("musicList")||document.body;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["class","data-locked"]});
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();