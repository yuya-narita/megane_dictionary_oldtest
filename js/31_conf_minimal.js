/* CONF MINIMAL UI
   表示を最小限にする:
   - 一覧: サムネ / タイトル / 説明のみ
   - 視聴済み: サムネ右上✓
   - お気に入り: サムネ左上★
   - 再生画面: タイトル / audio / 一覧へ
*/
(function(){
  var VIEWED_KEY = "megane_conf_viewed";
  var FAV_KEY = "megane_conf_favorites";

  function q(id){ return document.getElementById(id); }

  function readMap(key){
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch(e){ return {}; }
  }

  function stories(){
    try { return Array.isArray(mangaStories) ? mangaStories : []; }
    catch(e){ return []; }
  }

  function cleanList(){
    var list = q("mangaListView");
    if(!list) return;

    var viewed = readMap(VIEWED_KEY);
    var fav = readMap(FAV_KEY);

    list.querySelectorAll(".manga-item").forEach(function(item){
      var idx = Number(item.dataset.index || 0);
      var s = stories()[idx];
      if(!s) return;

      item.classList.toggle("conf-min-viewed", !!viewed[s.id]);
      item.classList.toggle("conf-min-fav", !!fav[s.id]);

      item.classList.remove("conf-now-playing", "conf-viewed", "conf-favorited");

      item.querySelectorAll(
        ".conf-badge-row,.conf-badge,.conf-now-playing-badge,.conf-resume-hint,.conf-fav-button"
      ).forEach(function(el){ el.remove(); });
    });
  }

  function cleanPlayer(){
    ["confPlayerFav","confBack15","confForward15","confPlayPause","confSeek","confTime","confIosSwipeZone"].forEach(function(id){
      var el = q(id);
      if(el) el.remove();
    });

    document.querySelectorAll(".conf-swipe-hint,.conf-swipe-hint-fixed,.conf-onair").forEach(function(el){
      el.remove();
    });
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__confMinimalPatched) return;
      var old = render;
      render = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){
          cleanList();
          cleanPlayer();
        }, 0);
        return result;
      };
      render.__confMinimalPatched = true;
    }catch(e){}
  }

  function patchRenderMangaList(){
    try{
      if(typeof renderMangaList !== "function" || renderMangaList.__confMinimalPatched) return;
      var old = renderMangaList;
      renderMangaList = function(){
        var result = old.apply(this, arguments);
        setTimeout(cleanList, 0);
        return result;
      };
      renderMangaList.__confMinimalPatched = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    patchRenderMangaList();
    cleanList();
    cleanPlayer();

    // 既存の後付けJSが後からDOMを足す場合の軽い掃除
    setInterval(function(){
      cleanList();
      cleanPlayer();
    }, 1200);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
