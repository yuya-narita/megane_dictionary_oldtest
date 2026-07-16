/* Music overlay final fix
   musicViewを固定レイヤーとして表示。既存レイアウトに埋もれないようにする。
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function showMusic(){
    try { appMode = "music"; } catch(e){}
    document.body.classList.add("mode-music");

    var music = q("musicView");
    if(!music) return;

    music.hidden = false;
    music.removeAttribute("hidden");
    music.style.display = "grid";
    music.style.visibility = "visible";
    music.style.opacity = "1";
    music.style.position = "fixed";
    music.style.left = "0";
    music.style.right = "0";
    music.style.top = "140px";
    music.style.bottom = "105px";
    music.style.zIndex = "5000";
    music.style.overflow = "auto";

    var stage = music.querySelector(".music-stage");
    if(stage){
      stage.style.display = "grid";
      stage.style.visibility = "visible";
      stage.style.opacity = "1";
    }

    ["dictionaryMode","cardMode","mangaMode","musicMode"].forEach(function(id){
      var el = q(id);
      if(el) el.classList.toggle("active", id === "musicMode");
    });

    // musicListが空なら最低限描画
    var list = q("musicList");
    if(list && !list.children.length){
      list.innerHTML =
        '<button type="button" class="music-item active" data-index="0">' +
        '<span><span class="music-item-title">BGM 01｜仮タイトル</span>' +
        '<span class="music-item-tag">music/bgm_01.mp3</span></span><span>♪</span></button>';
    }
  }

  function hideMusic(){
    var music = q("musicView");
    if(music){
      music.hidden = true;
      music.style.display = "none";
    }
    document.body.classList.remove("mode-music");
  }

  function bind(){
    var btn = q("musicMode");
    if(btn && !btn.dataset.musicOverlayFinal){
      btn.dataset.musicOverlayFinal = "1";
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
      if(el && !el.dataset.musicOverlayFinalLeave){
        el.dataset.musicOverlayFinalLeave = "1";
        el.addEventListener("click", function(){
          hideMusic();
        }, true);
      }
    });
  }

  function boot(){
    bind();
    setInterval(bind, 800);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
