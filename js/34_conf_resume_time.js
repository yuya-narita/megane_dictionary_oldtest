/* Conference resume time FIXED v2
   - Conferenceごとに再生位置を保存
   - 前/次/一覧へ移動時にだけ現在位置を保存
   - 辞書/カード/confタブを押しただけでは保存位置へ巻き戻さない
   - 未視聴Conferenceは0秒から
*/
(function(){
  var POS_KEY = "megane_conf_positions";
  var lastAppliedStoryId = "";

  function q(id){ return document.getElementById(id); }

  function readPositions(){
    try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}") || {}; }
    catch(e){ return {}; }
  }

  function writePositions(map){
    try { localStorage.setItem(POS_KEY, JSON.stringify(map)); } catch(e){}
  }

  function currentStory(){
    try { return mangaStories[mangaStoryIndex] || mangaStories[selectedMangaIndex] || null; }
    catch(e){ return null; }
  }

  function audio(){
    return q("confNativeAudio") || q("mangaAudio");
  }

  function isConfReader(){
    try { return appMode === "manga" && mangaState === "reader"; }
    catch(e){ return false; }
  }

  function saveCurrentPosition(){
    var a = audio();
    var s = currentStory();
    if(!a || !s || !s.id) return;
    if(!a.duration || !isFinite(a.duration) || a.currentTime <= 0) return;

    var pos = readPositions();
    if(a.currentTime > a.duration - 4){
      pos[s.id] = 0;
    }else{
      pos[s.id] = Math.max(0, Math.floor(a.currentTime));
    }
    writePositions(pos);
  }

  function applySavedPosition(force){
    var a = audio();
    var s = currentStory();
    if(!a || !s || !s.id) return;
    if(!isConfReader()) return;

    // 同じConferenceに対しては何度も適用しない。タブ切替時の巻き戻り防止。
    if(!force && lastAppliedStoryId === s.id) return;

    var src = a.getAttribute("src") || "";
    if(s.audio && src && src.indexOf(s.audio) === -1) return;

    var pos = readPositions();
    var target = Number(pos[s.id] || 0);

    function setIt(){
      try{
        if(!target || target < 1){
          if(a.currentTime < 1) a.currentTime = 0;
        }else if(a.duration && isFinite(a.duration)){
          a.currentTime = Math.min(target, Math.max(0, a.duration - 3));
        }else{
          a.currentTime = target;
        }
        lastAppliedStoryId = s.id;
      }catch(e){}
    }

    if(a.readyState >= 1){
      setIt();
    }else{
      var once = function(){
        a.removeEventListener("loadedmetadata", once);
        setIt();
      };
      a.addEventListener("loadedmetadata", once);
    }
  }

  function bindAudio(){
    var a = audio();
    if(!a || a.dataset.resumeTimeFixedV2Bound) return;
    a.dataset.resumeTimeFixedV2Bound = "1";

    a.addEventListener("timeupdate", function(){
      if(!isConfReader()) return;
      if(Math.floor(a.currentTime) % 5 === 0){
        saveCurrentPosition();
      }
    });

    a.addEventListener("pause", function(){
      if(isConfReader()) saveCurrentPosition();
    });

    a.addEventListener("ended", function(){
      var s = currentStory();
      if(!s || !s.id) return;
      var pos = readPositions();
      pos[s.id] = 0;
      writePositions(pos);
    });

    a.addEventListener("loadedmetadata", function(){
      setTimeout(function(){ applySavedPosition(true); }, 50);
    });
  }

  function patchNavButtons(){
    var row = q("confNavRow");
    if(!row || row.dataset.resumeTimeFixedV2Nav) return;
    row.dataset.resumeTimeFixedV2Nav = "1";

    row.addEventListener("click", function(e){
      var txt = (e.target && e.target.textContent || "").trim();
      if(txt.indexOf("前") !== -1 || txt.indexOf("次") !== -1 || txt.indexOf("一覧") !== -1 || txt.indexOf("過去ログ") !== -1){
        saveCurrentPosition();
        // 前後移動後は別Conferenceなので再適用を許可
        if(txt.indexOf("前") !== -1 || txt.indexOf("次") !== -1){
          lastAppliedStoryId = "";
          setTimeout(function(){ applySavedPosition(true); }, 260);
        }
      }
    }, true);
  }

  function patchRender(){
    try{
      if(typeof render !== "function" || render.__resumeTimeFixedV2Patched) return;
      var old = render;
      render = function(){
        var result = old.apply(this, arguments);
        setTimeout(function(){
          bindAudio();
          patchNavButtons();
          // renderのたびに適用しない。未適用のConferenceだけ適用。
          applySavedPosition(false);
        }, 180);
        return result;
      };
      render.__resumeTimeFixedV2Patched = true;
    }catch(e){}
  }

  function boot(){
    patchRender();
    bindAudio();
    patchNavButtons();
    setTimeout(function(){ applySavedPosition(false); }, 200);

    setInterval(function(){
      patchRender();
      bindAudio();
      patchNavButtons();
    }, 900);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
