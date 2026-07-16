/* Music repeat via MUSIC label + playlist background */
(function(){
  var REPEAT_KEY = "megane_music_repeat";

  function q(id){ return document.getElementById(id); }

  function isRepeatOn(){
    try { return localStorage.getItem(REPEAT_KEY) === "1"; }
    catch(e){ return false; }
  }

  function setRepeat(on){
    try { localStorage.setItem(REPEAT_KEY, on ? "1" : "0"); } catch(e){}
    updateRepeatLabel();

    var old = q("musicRepeatTop") || q("musicRepeat");
    if(old && old.dataset.syncing !== "1"){
      var oldActive = old.classList.contains("active");
      if(oldActive !== on){
        old.dataset.syncing = "1";
        old.click();
        setTimeout(function(){ old.dataset.syncing = ""; }, 80);
      }
    }
  }

  function updateRepeatLabel(){
    var label = document.querySelector("#musicView .music-label");
    if(!label) return;
    label.classList.toggle("repeat-on", isRepeatOn());
    label.setAttribute("title", isRepeatOn() ? "プレイリストリピート ON" : "プレイリストリピート OFF");
    label.setAttribute("aria-label", isRepeatOn() ? "プレイリストリピート ON" : "プレイリストリピート OFF");
  }

  function bindLabel(){
    var label = document.querySelector("#musicView .music-label");
    if(!label || label.dataset.repeatLabelBound) return;
    label.dataset.repeatLabelBound = "1";
    label.setAttribute("role", "button");
    label.tabIndex = 0;
    label.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      setRepeat(!isRepeatOn());
    }, true);
    label.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        setRepeat(!isRepeatOn());
      }
    });
  }

  function hideOldRepeat(){
    ["musicRepeatTop","musicRepeat"].forEach(function(id){
      var el = q(id);
      if(el){
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
      }
    });
  }

  function detectPlaylistOpen(){
    var view = q("musicView");
    if(!view) return;
    var hasBack = !!q("musicBackPlaylists");
    var list = q("musicList");
    var hasTrackItems = !!(list && list.querySelector(".music-item"));
    view.classList.toggle("playlist-open", hasBack || hasTrackItems);
    view.classList.toggle("playlist-home", !(hasBack || hasTrackItems));
  }

  function patchRenderHooks(){
    bindLabel();
    hideOldRepeat();
    updateRepeatLabel();
    detectPlaylistOpen();
  }

  function boot(){
    patchRenderHooks();

    var musicMode = q("musicMode");
    if(musicMode && !musicMode.dataset.repeatLabelBg){
      musicMode.dataset.repeatLabelBg = "1";
      musicMode.addEventListener("click", function(){
        setTimeout(patchRenderHooks, 60);
        setTimeout(patchRenderHooks, 250);
      }, true);
    }

    var list = q("musicList");
    if(list && !list.dataset.repeatLabelBg){
      list.dataset.repeatLabelBg = "1";
      list.addEventListener("click", function(){
        setTimeout(patchRenderHooks, 50);
        setTimeout(patchRenderHooks, 220);
      }, true);
    }

    setInterval(patchRenderHooks, 800);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
