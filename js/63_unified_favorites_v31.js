(() => {
  "use strict";
  const MAIN="meganeFavoritesV65", SELF="meganeSelfFavoritesV1";
  const q=id=>document.getElementById(id);
  const read=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))||d}catch(_){return d}};
  const esc=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function merged(){
    const map=new Map();
    [...read(MAIN),...read(SELF)].forEach((f,i)=>{
      if(!f||!f.key)return;
      const x={...f};
      // 古い保存データにsavedAtがない場合は現在の配列順を壊さない補助値。
      x.__order=Number(x.savedAt||0) || (1_000_000-i);
      const old=map.get(x.key);
      if(!old || x.__order>=old.__order) map.set(x.key,x);
    });
    return [...map.values()].sort((a,b)=>b.__order-a.__order);
  }

  function renderUnified(){
    const el=q("favoriteList"); if(!el)return;
    const list=merged();
    el.classList.add("favorite-list");
    if(!list.length){el.innerHTML='<div class="favorite-empty">まだお気に入りはありません</div>';return;}
    el.innerHTML=list.map(item=>{
      const label=item.type==="selfdict" ? (item.userName||"YOU") : (item.glassName||item.type||"辞書");
      return '<div class="favorite-item" role="button" tabindex="0" data-key="'+esc(item.key)+'"'+(item.type==="selfdict"?' data-selfdict="1"':'')+'>'+
        '<span class="favorite-item-title">'+esc(item.title||item.word||"Untitled")+'</span>'+
        '<span class="favorite-item-meta">'+esc(label)+'｜'+esc(item.meta||"")+'</span></div>';
    }).join("");
  }

  function install(){
    // v27の2タブ描画を最終的に上書き。
    window.renderFavoriteList=renderUnified;
    window.renderDictFavoriteList=renderUnified;
    const star=q("randomWord");
    if(star){
      ["pointerdown","touchend","click"].forEach(type=>star.addEventListener(type,()=>{
        setTimeout(renderUnified,0);
      },true));
    }
    const dlg=q("favoriteDialog");
    if(dlg){
      new MutationObserver(()=>{
        if(dlg.open && q("favoriteList") && q("favoriteList").querySelector(".favorite-tabs-v27")) renderUnified();
      }).observe(q("favoriteList"),{childList:true,subtree:false});
    }
    setTimeout(renderUnified,0);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
  window.MEGANE_UNIFIED_FAVORITES={render:renderUnified,version:"v1"};
})();