/* Music tab display fix */
(function(){
  function q(id){ return document.getElementById(id); }

  function showMusic(){
    try { appMode = "music"; } catch(e){}
    document.body.classList.remove("mode-dictionary","mode-cards","mode-manga");
    document.body.classList.add("mode-music");

    var v = q("musicView");
    if(v) {
      v.hidden = false;
      v.style.display = "grid";
    }

    ["dictionaryView","bugCardView","mangaListLayer","mangaChoiceLayer","mangaView","confPlayerLayer"].forEach(function(id){
      var el = q(id);
      if(el) el.hidden = true;
    });

    ["dictionaryMode","cardMode","mangaMode","musicMode"].forEach(function(id){
      var el = q(id);
      if(el) el.classList.toggle("active", id === "musicMode");
    });
  }

  function hideMusic(){
    var v = q("musicView");
    if(v) {
      v.hidden = true;
      v.style.display = "";
    }
    document.body.classList.remove("mode-music");
  }

  function bind(){
    var btn = q("musicMode");
    if(btn && !btn.dataset.musicFixBound){
      btn.dataset.musicFixBound = "1";
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showMusic();
        return false;
      }, true);
    }

    ["dictionaryMode","cardMode","mangaMode"].forEach(function(id){
      var el = q(id);
      if(el && !el.dataset.musicFixLeave){
        el.dataset.musicFixLeave = "1";
        el.addEventListener("click", function(){ hideMusic(); }, true);
      }
    });
  }

  function boot(){
    bind();
    setInterval(bind, 1000);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
