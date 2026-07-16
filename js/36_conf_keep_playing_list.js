/* Conference keep playing when back to list
   一覧ボタンを押しても音声を止めない。
   再生中のConferenceを保存し、一覧に戻ってもそのまま流す。
*/
(function(){
  var PLAYING_KEY = "megane_current_conference_id";

  function q(id){ return document.getElementById(id); }

  function currentStory(){
    try { return mangaStories[mangaStoryIndex] || mangaStories[selectedMangaIndex] || null; }
    catch(e){ return null; }
  }

  function audio(){
    return q("confNativeAudio") || q("mangaAudio");
  }

  function savePlayingId(){
    var s = currentStory();
    if(!s || !s.id) return;
    try { localStorage.setItem(PLAYING_KEY, s.id); } catch(e){}
  }

  function goListKeepAudio(){
    savePlayingId();

    try {
      mangaState = "list";
      appMode = "manga";
      if(typeof setMode === "function") {
        setMode("manga");
      } else if(typeof render === "function") {
        render("flash");
      }
    } catch(e){}
  }

  function bindBackButton(){
    var btn = q("confBackToList");
    if(!btn || btn.dataset.keepPlayingBound) return;
    btn.dataset.keepPlayingBound = "1";

    // 既存処理より先に横取りする
    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      goListKeepAudio();
      return false;
    }, true);
  }

  function bindNavRow(){
    var row = q("confNavRow");
    if(!row || row.dataset.keepPlayingBound) return;
    row.dataset.keepPlayingBound = "1";

    row.addEventListener("click", function(e){
      var txt = (e.target && e.target.textContent || "").trim();
      if(txt === "一覧" || txt.indexOf("一覧") !== -1 || txt === "過去ログ" || txt.indexOf("過去ログ") !== -1){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        goListKeepAudio();
        return false;
      }
    }, true);
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__keepPlayingListPatched) return;
      var old = render;
      render = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){
          bindBackButton();
          bindNavRow();
        }, 0);
        return result;
      };
      render.__keepPlayingListPatched = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    bindBackButton();
    bindNavRow();
    setInterval(function(){
      bindBackButton();
      bindNavRow();
    }, 800);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
