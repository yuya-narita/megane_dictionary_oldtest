
(function(){
function q(id){return document.getElementById(id);}

function addNav(){
 const stage=document.querySelector(".conf-stage");
 if(!stage || q("confNavRow")) return;

 const back=q("confBackToList");
 if(!back) return;

 const row=document.createElement("div");
 row.id="confNavRow";
 row.className="conf-nav-row";

 const prev=document.createElement("button");
 prev.className="conf-nav-btn";
 prev.textContent="← 前";

 const next=document.createElement("button");
 next.className="conf-nav-btn";
 next.textContent="次 →";

 back.textContent="過去ログ";

 prev.onclick=function(){
   try{
     mangaStoryIndex=(mangaStoryIndex-1+mangaStories.length)%mangaStories.length;
     selectedMangaIndex=mangaStoryIndex;
     render();
   }catch(e){}
 };

 next.onclick=function(){
   try{
     mangaStoryIndex=(mangaStoryIndex+1)%mangaStories.length;
     selectedMangaIndex=mangaStoryIndex;
     render();
   }catch(e){}
 };

 back.parentNode.insertBefore(row, back);
 row.appendChild(prev);
 row.appendChild(back);
 row.appendChild(next);
}

const oldRender=window.render;
if(typeof oldRender==="function"){
 window.render=function(){
   const r=oldRender.apply(this,arguments);
   setTimeout(addNav,50);
   return r;
 };
}
setTimeout(addNav,500);
})();
