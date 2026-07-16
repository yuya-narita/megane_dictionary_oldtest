/* MUSIC V7 NAV ESCAPE FIX
   musicモードから辞書/カード/confへ戻れない問題を修正。
   musicViewやbody.mode-musicが残って他タブ表示を邪魔するのを解除する。
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function leaveMusic(){
    document.body.classList.remove("mode-music", "music-v7");
    var music = q("musicView");
    if(music){
      music.hidden = true;
      music.style.display = "none";
      music.style.visibility = "";
      music.style.opacity = "";
    }
    var card = q("card");
    var content = q("content");
    if(card){
      card.hidden = false;
      card.style.display = "";
    }
    if(content){
      content.hidden = false;
      content.style.display = "";
    }
  }

  function forceMode(mode){
    leaveMusic();

    // 既存の本体側 setMode が使えるなら使う。
    try{
      if(typeof window.setMode === "function"){
        if(mode === "conf") {
          try { window.mangaState = "list"; } catch(e){}
          window.setMode("manga");
        } else {
          window.setMode(mode);
        }
        return;
      }
    }catch(e){}

    // setModeが外から見えない場合の最低限フォールバック。
    try { window.appMode = (mode === "conf" ? "manga" : mode); } catch(e){}
    document.body.classList.toggle("mode-cards", mode === "cards");
    document.body.classList.toggle("mode-manga", mode === "conf");
    document.body.classList.toggle("mode-conf", mode === "conf");
    document.body.classList.toggle("reader-page", false);
    document.body.classList.toggle("conf-player-state", false);

    ["dictionaryMode","cardMode","musicMode","mangaMode"].forEach(function(id){
      var b = q(id);
      if(!b) return;
      b.classList.remove("active");
    });
    var active = mode === "cards" ? q("cardMode") : mode === "conf" ? q("mangaMode") : q("dictionaryMode");
    if(active) active.classList.add("active");

    try{
      if(typeof window.render === "function") window.render("flash");
    }catch(e){}
  }

  function bind(){
    var dict = q("dictionaryMode");
    var card = q("cardMode");
    var conf = q("mangaMode");

    if(dict && !dict.dataset.musicV7Escape){
      dict.dataset.musicV7Escape = "1";
      dict.addEventListener("click", function(e){
        if(document.body.classList.contains("mode-music")){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          forceMode("dictionary");
        }
      }, true);
    }

    if(card && !card.dataset.musicV7Escape){
      card.dataset.musicV7Escape = "1";
      card.addEventListener("click", function(e){
        if(document.body.classList.contains("mode-music")){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          forceMode("cards");
        }
      }, true);
    }

    if(conf && !conf.dataset.musicV7Escape){
      conf.dataset.musicV7Escape = "1";
      conf.addEventListener("click", function(e){
        if(document.body.classList.contains("mode-music")){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          forceMode("conf");
        }
      }, true);
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.MEGANE_MUSIC_LEAVE = leaveMusic;
})();
