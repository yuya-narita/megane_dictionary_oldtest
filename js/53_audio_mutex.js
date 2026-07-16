/* Audio Mutex
   Music と Conference は同時再生しない。
   Dictionary音声は短い効果音扱いなので重ねてOK。

   ルール:
   - Music再生開始 → Conference停止
   - Conference再生開始 → Music停止
   - Dictionary音声 → Music/Conferenceを止めない
*/
(function(){
  function q(id){ return document.getElementById(id); }

  function musicAudio(){
    return q("musicAudio");
  }

  function conferenceAudios(){
    var list = [];
    var conf = q("confNativeAudio");
    var manga = q("mangaAudio");

    if(conf) list.push(conf);

    // mangaAudioはConference用として使われている場合だけ対象。
    // 辞書短音声が別Audioで鳴る場合は巻き込まない。
    if(manga){
      var src = manga.getAttribute("src") || "";
      if(src.indexOf("conf") !== -1 || src.indexOf("conference") !== -1 || src.indexOf("audio/") !== -1){
        list.push(manga);
      }
    }
    return list;
  }

  function pauseAudio(a){
    if(!a) return;
    try {
      if(!a.paused) a.pause();
    } catch(e){}
  }

  function pauseMusic(){
    pauseAudio(musicAudio());
  }

  function pauseConference(){
    conferenceAudios().forEach(function(a){
      pauseAudio(a);
    });
  }

  function bindMusic(){
    var a = musicAudio();
    if(!a || a.dataset.audioMutexMusic) return;
    a.dataset.audioMutexMusic = "1";

    a.addEventListener("play", function(){
      pauseConference();
    });
  }

  function bindConference(){
    conferenceAudios().forEach(function(a){
      if(!a || a.dataset.audioMutexConference) return;
      a.dataset.audioMutexConference = "1";

      a.addEventListener("play", function(){
        pauseMusic();
      });
    });
  }

  function patch(){
    bindMusic();
    bindConference();
  }

  function boot(){
    patch();

    // 画面切替でaudio要素が後から現れることがあるので軽く監視
    setInterval(patch, 1000);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
