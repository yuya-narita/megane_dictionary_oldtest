/* v88: sync card-is-back class */
(function(){
  function sync(){
    try{
      document.body.classList.toggle("card-is-back", !!cardFlipped && appMode === "cards");
    }catch(e){}
  }
  function patch(){
    try{
      if(typeof render !== "function" || render.__v88BackClassSync) return;
      var old = render;
      render = function(){
        var r = old.apply(this, arguments);
        setTimeout(sync, 0);
        return r;
      };
      render.__v88BackClassSync = true;
    }catch(e){}
  }
  function boot(){
    patch();
    sync();
    setInterval(function(){ patch(); sync(); }, 500);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
