
(function(){
function clean(){
 document.querySelectorAll('*').forEach(el=>{
   const t=(el.textContent||'').trim();
   if(t==='またあした'){ el.style.opacity='0'; }
 });
}
setInterval(clean,1000);
document.addEventListener('DOMContentLoaded',clean);
})();
