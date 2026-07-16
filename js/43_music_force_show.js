/* Music force show fix
   musicViewが存在するのに空白になる問題を強制修正。
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function showOnlyMusic(){
    var music = q("musicView");
    if(!music) return;

    try { appMode = "music"; } catch(e){}

    document.body.classList.add("mode-music");

    // 既存のreader/card系状態が邪魔するので、music表示時だけ一時的に外す
    document.body.classList.remove(
      "mode-dictionary",
      "mode-cards",
      "mode-manga",
      "manga-reader-state",
      "reader-page",
      "manga-choice-state",
      "manga-list-state",
      "conf-player-state"
    );

    // 画面本体を強制表示
    music.hidden = false;
    music.removeAttribute("hidden");
    music.style.display = "grid";
    music.style.visibility = "visible";
    music.style.opacity = "1";
    music.style.position = "relative";
    music.style.zIndex = "20";

    // 他ビューを強制非表示
    [
      "dictionaryView",
      "cardView",
      "bugCardView",
      "mangaListLayer",
      "mangaChoiceLayer",
      "mangaReaderLayer",
      "confPlayerLayer",
      "mangaPage",
      "mangaListView"
    ].forEach(function(id){
      var el = q(id);
      if(el){
        el.hidden = true;
        el.style.display = "none";
      }
    });

    // 旧カード本体も隠す
    document.querySelectorAll(".card,.manga-list-layer,.manga-choice-layer,.manga-view,.conf-player-layer").forEach(function(el){
      if(!el.closest("#musicView")) el.style.display = "none";
    });

    // タブ active
    ["dictionaryMode","cardMode","mangaMode","musicMode"].forEach(function(id){
      var el = q(id);
      if(el) el.classList.toggle("active", id === "musicMode");
    });

    // 中身が空なら最低限描画
    var list = q("musicList");
    if(list && !list.children.length){
      list.innerHTML = '<button type="button" class="music-item active"><span><span class="music-item-title">BGM 01｜仮タイトル</span><span class="music-item-tag">music/bgm_01.mp3</span></span><span>♪</span></button>';
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
    if(btn && !btn.dataset.forceMusicBound){
      btn.dataset.forceMusicBound = "1";
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showOnlyMusic();
        return false;
      }, true);
    }

    ["dictionaryMode","cardMode","mangaMode"].forEach(function(id){
      var el = q(id);
      if(el && !el.dataset.forceMusicLeave){
        el.dataset.forceMusicLeave = "1";
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
