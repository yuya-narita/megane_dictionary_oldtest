/* Conf favorite top-right + iPhone swipe fix + small list button */
(function(){
  var FAV_KEY = "megane_conf_favorites";

  function q(id){ return document.getElementById(id); }

  function readMap(key){
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch(e){ return {}; }
  }

  function writeMap(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
  }

  function stories(){
    try { return Array.isArray(mangaStories) ? mangaStories : []; }
    catch(e){ return []; }
  }

  function currentStory(){
    try { return mangaStories[mangaStoryIndex] || mangaStories[selectedMangaIndex] || null; }
    catch(e){ return null; }
  }

  function getStage(){
    var layer = q("confPlayerLayer");
    return layer ? layer.querySelector(".conf-stage") : null;
  }

  function isConfReader(){
    try { return appMode === "manga" && mangaState === "reader"; }
    catch(e){ return false; }
  }

  function getAudio(){
    return q("confNativeAudio") || q("mangaAudio");
  }

  function isFav(id){
    return !!readMap(FAV_KEY)[id];
  }

  function toggleFav(id){
    if(!id) return;
    var m = readMap(FAV_KEY);
    m[id] = !m[id];
    writeMap(FAV_KEY, m);
    updateFavButton();
    updateListMarks();
  }

  function ensureFavButton(){
    var stage = getStage();
    if(!stage || q("confTopFav")) return;

    var btn = document.createElement("button");
    btn.id = "confTopFav";
    btn.type = "button";
    btn.setAttribute("aria-label", "お気に入り");
    btn.textContent = "☆";

    // NAV_REAL_FIX_V10: remove circular background from confTopFav
    btn.style.background = "transparent";
    btn.style.backgroundColor = "transparent";
    btn.style.border = "0";
    btn.style.boxShadow = "none";
    btn.style.outline = "0";
    btn.style.backdropFilter = "none";
    btn.style.webkitBackdropFilter = "none";
    btn.style.borderRadius = "0";
    btn.style.width = "auto";
    btn.style.height = "auto";
    btn.style.minWidth = "0";
    btn.style.minHeight = "0";
    btn.style.padding = "0";
    btn.style.margin = "0";
    btn.style.lineHeight = "1";
    btn.style.textShadow = "none";
    btn.style.filter = "none";
    btn.style.webkitFilter = "none";

    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      var s = currentStory();
      if(s && s.id) toggleFav(s.id);
    });
    stage.appendChild(btn);
  }

  function updateFavButton(){
    var btn = q("confTopFav");
    var s = currentStory();
    if(!btn || !s) return;
    var active = isFav(s.id);
    btn.classList.toggle("active", active);
    btn.textContent = active ? "★" : "☆";
  }

  function updateListMarks(){
    var list = q("mangaListView");
    if(!list) return;
    var fav = readMap(FAV_KEY);
    list.querySelectorAll(".manga-item").forEach(function(item){
      var idx = Number(item.dataset.index || 0);
      var s = stories()[idx];
      if(!s) return;
      item.classList.toggle("conf-min-fav", !!fav[s.id]);
    });
  }

  function stopAudio(){
    var a = getAudio();
    if(!a) return;
    try { a.pause(); a.currentTime = 0; } catch(e){}
  }

  function moveConf(step){
    var list = stories();
    if(!list.length) return;
    var next = 0;
    try { next = (mangaStoryIndex + step + list.length) % list.length; } catch(e) {}
    stopAudio();
    try {
      selectedMangaIndex = next;
      mangaStoryIndex = next;
      mangaPageIndex = 0;
      mangaReadMode = "page";
      mangaState = "reader";
      appMode = "manga";
      localStorage.setItem("megane_current_conference_id", list[next].id || "");
    } catch(e){}
    if(typeof render === "function"){
      render(step > 0 ? "slide-left" : "slide-right");
    }
    setTimeout(function(){
      ensureFavButton();
      updateFavButton();
      bindSwipe();
    }, 50);
  }

  function bindSwipe(){
    var stage = getStage();
    if(!stage || stage.dataset.confSwipeFullBound) return;
    stage.dataset.confSwipeFullBound = "1";

    var sx = 0, sy = 0, active = false, moved = false;

    function isControl(el){
      if(!el) return false;
      if(el.id === "confTopFav") return true;
      var tag = el.tagName ? el.tagName.toLowerCase() : "";
      if(tag === "audio" || tag === "input" || tag === "button") return true;
      return !!(el.closest && el.closest("audio,input,button"));
    }

    stage.addEventListener("touchstart", function(e){
      if(!isConfReader() || isControl(e.target)) return;
      var t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      sx = t.clientX; sy = t.clientY;
      active = true; moved = false;
    }, { passive: true });

    stage.addEventListener("touchmove", function(e){
      if(!active || !isConfReader()) return;
      var t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      if(Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)){
        moved = true;
        e.preventDefault();
      }
    }, { passive: false });

    stage.addEventListener("touchend", function(e){
      if(!active || !isConfReader()) return;
      active = false;
      var t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      if(Math.abs(dx) < 46) return;
      if(Math.abs(dx) < Math.abs(dy) * 1.05) return;
      e.preventDefault();
      e.stopPropagation();
      moveConf(dx < 0 ? 1 : -1);
    }, { passive: false });

    // PC確認用
    var px=0, py=0, down=false;
    stage.addEventListener("pointerdown", function(e){
      if(!isConfReader() || isControl(e.target)) return;
      px=e.clientX; py=e.clientY; down=true;
    });
    stage.addEventListener("pointerup", function(e){
      if(!down || !isConfReader()) return;
      down=false;
      if(isControl(e.target)) return;
      var dx=e.clientX-px, dy=e.clientY-py;
      if(Math.abs(dx)<60 || Math.abs(dx)<Math.abs(dy)*1.05) return;
      e.preventDefault();
      e.stopPropagation();
      moveConf(dx<0 ? 1 : -1);
    });
  }

  function cleanupOldFavButtons(){
    // 旧お気に入りUIを除去。右上ボタンだけ残す
    ["confPlayerFav"].forEach(function(id){
      var el = q(id);
      if(el) el.remove();
    });
    document.querySelectorAll(".conf-player-fav,.conf-ios-swipe-zone,.conf-swipe-hint,.conf-swipe-hint-fixed").forEach(function(el){
      el.remove();
    });
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__confFavSwipeMiniPatched) return;
      var old = render;
      render = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){
          cleanupOldFavButtons();
          ensureFavButton();
          updateFavButton();
          updateListMarks();
          bindSwipe();
        }, 0);
        return result;
      };
      render.__confFavSwipeMiniPatched = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    cleanupOldFavButtons();
    ensureFavButton();
    updateFavButton();
    updateListMarks();
    bindSwipe();

    setInterval(function(){
      cleanupOldFavButtons();
      ensureFavButton();
      updateFavButton();
      updateListMarks();
      bindSwipe();
    }, 1000);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
