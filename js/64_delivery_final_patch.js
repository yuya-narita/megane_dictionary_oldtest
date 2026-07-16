/* 64_delivery_final_patch.js
   v4 final bridge:
   - 自分カードの⭐保存を最後に強制処理
   - キャラカード側の＋ダイアログでは「画像生成」に見せない
   - キャラカード側の旧テキストシェアを止める
*/
(() => {
  "use strict";

  const DEF_KEY="megane_user_definitions_single_by_word_v1";
  const PROFILE_KEY="megane_user_profile_v1";
  const MAIN_KEY="meganeFavoritesV65";
  const SELF_KEY="meganeSelfFavoritesV1";

  const q=id=>document.getElementById(id);
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))||d}catch(_){return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const wk=w=>encodeURIComponent(w||"");

  let swallowStarUntil=0;

  function word(){
    try{ if(typeof currentWord==="function"){ const w=currentWord(); if(w&&w.word)return String(w.word); } }catch(_){}
    const el=q("word"); return el?el.textContent.trim():"";
  }
  function profile(){
    const p=read(PROFILE_KEY,{});
    return {name:String(p.name||p.nickname||"YOU").trim()||"YOU", glassName:String(p.glassName||"自分メガネ").trim()||"自分メガネ"};
  }
  function defText(w){
    const d=read(DEF_KEY,{})[wk(w)];
    return d&&d.text ? String(d.text) : "";
  }
  function isSelfCard(){
    const bodyActive=!!(document.body&&document.body.classList&&document.body.classList.contains("self-glass-active"));
    const g=q("glassName");
    const visibleSelf=!!(g&&g.textContent.indexOf("自分メガネ")>=0);
    return bodyActive||visibleSelf;
  }
  function item(){
    const w=word(), text=defText(w);
    if(!w||!text||!isSelfCard())return null;
    const p=profile();
    return {
      key:"selfdict:"+wk(w),
      type:"selfdict",
      title:w,
      meta:p.name+"｜"+text,
      word:w,
      userName:p.name,
      text:text,
      savedAt:Date.now()
    };
  }
  function isOn(){
    const it=item(); if(!it)return false;
    return read(SELF_KEY,[]).some(f=>f&&f.key===it.key) || read(MAIN_KEY,[]).some(f=>f&&f.key===it.key&&f.type==="selfdict");
  }
  function saveSelfFavorite(nextItem){
    const key=nextItem.key;
    let self=read(SELF_KEY,[]);
    let main=read(MAIN_KEY,[]);
    const exists=self.some(f=>f&&f.key===key)||main.some(f=>f&&f.key===key&&f.type==="selfdict");
    if(exists){
      self=self.filter(f=>!(f&&f.key===key));
      main=main.filter(f=>!(f&&f.key===key&&f.type==="selfdict"));
    }else{
      const fresh={...nextItem,savedAt:Date.now()};
      self.unshift(fresh);
      main.unshift(fresh);
    }
    const uniq=arr=>Array.from(new Map(arr.filter(f=>f&&f.key).map(f=>[f.key,f])).values());
    write(SELF_KEY,uniq(self));
    write(MAIN_KEY,uniq(main));
  }
  function updateStar(){
    const btn=q("favoriteToggle"); if(!btn||!isSelfCard())return;
    const it=item(); if(!it)return;
    btn.hidden=false;
    const active=isOn();
    btn.classList.toggle("active",active);
    btn.textContent=active?"★":"☆";
  }
  function starHandler(e){
    const btn=e.target&&e.target.closest?e.target.closest("#favoriteToggle"):null;
    if(!btn||!isSelfCard()||!item())return;

    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();

    const now=Date.now();
    if(now<swallowStarUntil)return false;
    swallowStarUntil=now+750;

    saveSelfFavorite(item());
    setTimeout(updateStar,0);
    try{
      if(window.MEGANE_UNIFIED_FAVORITES&&window.MEGANE_UNIFIED_FAVORITES.render) window.MEGANE_UNIFIED_FAVORITES.render();
      else if(typeof window.renderFavoriteList==="function") window.renderFavoriteList();
    }catch(_){}
    return false;
  }
  function starSwallow(e){
    const btn=e.target&&e.target.closest?e.target.closest("#favoriteToggle"):null;
    if(!btn||!isSelfCard())return;
    if(Date.now()<swallowStarUntil){
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      return false;
    }
  }

  function normalize(v){
    let s=String(v||"").replace(/\r/g,"").replace(/\n{3,}/g,"\n\n");
    const lines=s.split("\n");
    if(lines.length>4){
      const head=lines.slice(0,4);
      const rest=lines.slice(4).join(" ").replace(/\s+/g," ").trim();
      s=head.join("\n")+(rest?" "+rest:"");
    }
    if(s.length>100)s=s.slice(0,100);
    return s;
  }
  function updateDialogShareButton(){
    const btn=q("userDefinitionShare"), ta=q("userDefinitionText");
    if(!btn||!ta)return;
    const saved=defText(word());
    if(ta.value!==normalize(ta.value))ta.value=normalize(ta.value);
    const can=isSelfCard() && !!saved && normalize(ta.value).trim()===saved.trim();
    btn.disabled=!can;
    btn.classList.toggle("disabled",!can);
    btn.textContent=can ? "この言葉を渡す" : (isSelfCard() ? "保存後に渡せます" : "保存後、自分カードで渡せます");
    const c=q("userDefinitionCount"); if(c)c.textContent=String(ta.value.length)+" / 100";
  }
  function shareGuard(e){
    const btn=e.target&&e.target.closest?e.target.closest("#userDefinitionShare"):null;
    if(!btn)return;
    if(!isSelfCard()){
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      updateDialogShareButton();
      return false;
    }
  }

  function boot(){
    window.addEventListener("pointerdown",starHandler,true);
    window.addEventListener("touchend",starSwallow,{capture:true,passive:false});
    window.addEventListener("click",starSwallow,true);

    window.addEventListener("pointerdown",shareGuard,true);
    window.addEventListener("touchend",shareGuard,{capture:true,passive:false});
    window.addEventListener("click",shareGuard,true);
    document.addEventListener("input",e=>{ if(e.target&&e.target.id==="userDefinitionText") setTimeout(updateDialogShareButton,0); },true);

    setInterval(()=>{updateStar();updateDialogShareButton();},500);
    setTimeout(()=>{updateStar();updateDialogShareButton();},150);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.MEGANE_DELIVERY_FINAL_PATCH={version:"v4",updateStar,updateDialogShareButton};
})();