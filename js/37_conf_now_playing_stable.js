/* Conference now playing stable
   一覧に「▶ 再生中」を安定表示。
   音声を流しながら一覧や辞書を見ても、現在再生中のConferenceが分かる。
*/
(function(){
  var PLAYING_KEY = "megane_current_conference_id";

  function q(id){ return document.getElementById(id); }

  function stories(){
    try { return Array.isArray(mangaStories) ? mangaStories : []; }
    catch(e){ return []; }
  }

  function audio(){
    return q("confNativeAudio") || q("mangaAudio");
  }

  function currentStory(){
    try { return mangaStories[mangaStoryIndex] || mangaStories[selectedMangaIndex] || null; }
    catch(e){ return null; }
  }

  function setPlayingId(id){
    try {
      if(id) localStorage.setItem(PLAYING_KEY, id);
      else localStorage.removeItem(PLAYING_KEY);
    } catch(e){}
  }

  function getPlayingId(){
    var id = "";
    try { id = localStorage.getItem(PLAYING_KEY) || ""; } catch(e){}

    var list = stories();
    if(id && list.some(function(s){ return s && s.id === id; })) return id;

    var a = audio();
    var src = a ? (a.getAttribute("src") || "") : "";
    var found = list.find(function(s){
      return s && s.audio && src.indexOf(s.audio) !== -1;
    });
    return found ? found.id : "";
  }

  function isPlaying(){
    var a = audio();
    return !!(a && !a.paused && !a.ended && a.currentTime >= 0);
  }

  function ensureBadge(meta){
    var badge = meta.querySelector(".conf-now-stable-badge");
    if(!badge){
      badge = document.createElement("div");
      badge.className = "conf-now-stable-badge";
      badge.textContent = "▶ 再生中";
      meta.insertBefore(badge, meta.firstChild);
    }
    return badge;
  }

  function decorateNowPlaying(){
    var list = q("mangaListView");
    if(!list) return;

    var playingId = getPlayingId();
    var playing = isPlaying();

    list.querySelectorAll(".manga-item").forEach(function(item){
      var idx = Number(item.dataset.index || 0);
      var s = stories()[idx];
      if(!s) return;

      var meta = item.querySelector(".manga-meta") || item;
      var badge = meta.querySelector(".conf-now-stable-badge");

      var active = !!(playing && playingId && s.id === playingId);
      item.classList.toggle("conf-now-playing-stable", active);

      if(active){
        ensureBadge(meta);
      }else if(badge){
        badge.remove();
      }
    });
  }

  function bindAudio(){
    var a = audio();
    if(!a || a.dataset.nowPlayingStableBound) return;
    a.dataset.nowPlayingStableBound = "1";

    a.addEventListener("play", function(){
      var s = currentStory();
      if(s && s.id) setPlayingId(s.id);
      decorateNowPlaying();
    });

    a.addEventListener("pause", decorateNowPlaying);
    a.addEventListener("ended", decorateNowPlaying);
    a.addEventListener("timeupdate", function(){
      // 軽く同期
      if(Math.floor(a.currentTime) % 10 === 0) decorateNowPlaying();
    });
  }

  function patchRenderMangaList(){
    try{
      if(typeof renderMangaList !== "function" || renderMangaList.__nowPlayingStablePatched) return;
      var old = renderMangaList;
      renderMangaList = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){
          bindAudio();
          decorateNowPlaying();
        }, 0);
        return result;
      };
      renderMangaList.__nowPlayingStablePatched = true;
    }catch(e){}
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__nowPlayingStablePatched) return;
      var old = render;
      render = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){
          bindAudio();
          decorateNowPlaying();
        }, 0);
        return result;
      };
      render.__nowPlayingStablePatched = true;
    }catch(e){}
  }

  function patchListClick(){
    var list = q("mangaListView");
    if(!list || list.dataset.nowPlayingStableList) return;
    list.dataset.nowPlayingStableList = "1";
    list.addEventListener("click", function(e){
      var item = e.target.closest(".manga-item");
      if(!item) return;
      var idx = Number(item.dataset.index || 0);
      var s = stories()[idx];
      if(s && s.id) setPlayingId(s.id);
    }, true);
  }

  function boot(){
    patchRenderMangaList();
    patchRender();
    patchListClick();
    bindAudio();
    decorateNowPlaying();

    setInterval(function(){
      patchRenderMangaList();
      patchRender();
      patchListClick();
      bindAudio();
      decorateNowPlaying();
    }, 1500);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
