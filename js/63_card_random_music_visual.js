/* v82 stable polish: card random + music visual only */
(function(){
  function q(id){ return document.getElementById(id); }

  function getMode(){
    try { return appMode; } catch(e){ return ""; }
  }

  function randomCardIndex(current, length){
    if(!length || length <= 1) return 0;
    var next = current;
    var guard = 0;
    while(next === current && guard < 20){
      next = Math.floor(Math.random() * length);
      guard++;
    }
    return next;
  }

  function patchMoveCard(){
    try{
      if(typeof moveCard !== "function" || moveCard.__randomPatched) return;

      var original = moveCard;
      moveCard = function(step){
        if(getMode() !== "cards"){
          return original.apply(this, arguments);
        }

        try{
          var len = Array.isArray(cards) ? cards.length : 0;
          if(!len) return original.apply(this, arguments);

          cardFlipped = true;

          if(typeof render === "function"){
            render(step > 0 ? "slide-up" : "slide-down");
          }

          var flip = q("flipCard");
          if(flip){
            flip.classList.remove(
              "shuffle-next","shuffle-prev","deal-next","deal-prev","shuffling",
              "flow-up","flow-down","flow-in","flow-up-safe","flow-down-safe","flowing"
            );
            void flip.offsetWidth;
            flip.classList.add("flowing");
            flip.classList.add(step > 0 ? "flow-up-safe" : "flow-down-safe");
          }

          setTimeout(function(){
            cardIndex = randomCardIndex(cardIndex, len);
            cardFlipped = true;
            if(typeof render === "function"){
              render(step > 0 ? "slide-up" : "slide-down");
            }
          }, 230);

          setTimeout(function(){
            var f = q("flipCard");
            if(f){
              f.classList.remove("flow-up-safe","flow-down-safe","flowing");
            }
          }, 520);

        }catch(e){
          return original.apply(this, arguments);
        }
      };
      moveCard.__randomPatched = true;
    }catch(e){}
  }

  function escapeHtml(str){
    return String(str || "").replace(/[&<>"']/g, function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }

  function splitMusicTitle(){
    var title = q("musicTitle");
    if(!title) return;

    var raw = title.textContent.trim();
    if(!raw || raw === "Music Playlists"){
      title.classList.remove("music-title-two-line");
      title.dataset.rawTitle = raw;
      return;
    }

    if(title.dataset.rawTitle === raw) return;
    title.dataset.rawTitle = raw;

    var parts = raw.split(/[｜|]/).map(function(x){ return x.trim(); }).filter(Boolean);
    if(parts.length >= 2){
      title.classList.add("music-title-two-line");
      title.innerHTML = '<span class="music-title-main">' + escapeHtml(parts[0]) + '</span><span class="music-title-sub">' + escapeHtml(parts.slice(1).join(" | ")) + '</span>';
    }else{
      title.classList.remove("music-title-two-line");
      title.textContent = raw;
    }
  }

  function markMusicState(){
    var view = q("musicView");
    var list = q("musicList");
    if(!view || !list) return;

    var hasPlaylist = !!list.querySelector(".music-playlist-item");
    var hasTrack = !!list.querySelector(".music-item");
    view.classList.toggle("music-home", hasPlaylist);
    view.classList.toggle("music-tracks", hasTrack);
  }

  function polish(){
    splitMusicTitle();
    markMusicState();
  }

  function boot(){
    patchMoveCard();
    polish();
    setInterval(function(){
      patchMoveCard();
      polish();
    }, 900);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
