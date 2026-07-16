/* 84_observation_hooks_patch.js
   v3:
   - 辞書音声は dictionary.voice
   - music/ 配下だけ music.play
   - 辞書音声ファイル名から単語・メガネを推定
*/
(function(){
  "use strict";

  var PATCH_ID = "observationHooksPatchV3";
  var last = {};
  var completedSrc = {};

  function observe(name, payload){
    try{
      if(window.MEGANE_OBSERVE) window.MEGANE_OBSERVE(name, payload || {});
    }catch(e){}
  }

  function throttle(key, ms){
    var t = Date.now();
    if(last[key] && (t - last[key]) < ms) return true;
    last[key] = t;
    return false;
  }

  function cleanTitleFromSrc(src){
    try{
      var file = decodeURIComponent(String(src || "").split("/").pop().split("?")[0] || "");
      return file.replace(/\.(mp3|m4a|wav|ogg)$/i, "");
    }catch(e){ return ""; }
  }

  function classifyAudio(src, title){
    var s = String(src || "").toLowerCase();
    var t = String(title || "").toLowerCase();
    if(/conference|conf_|\/conf|会議|syntax/.test(s + " " + t)) return "conference";
    if(/\/music\/|music\//.test(s)) return "music";
    return "dictionary";
  }

  function wordFromVoiceTitle(title){
    var s = String(title || "").trim();
    s = s.replace(/\.(mp3|m4a|wav|ogg)$/i, "");
    s = s.replace(/_(gag|happy|math|hacker|science|medical|economy|comm|xeno|zurea|nyx|xeris|quelina|radek|milca|neia)_?\d*$/i, "");
    s = s.replace(/_\d+$/i, "");
    var map = {
      "melon_pan": "メロンパン",
      "space": "空間",
      "time": "時間",
      "toy": "おもちゃ",
      "laughter": "笑い",
      "laugh": "笑い"
    };
    return map[s] || s.replace(/_/g, " ");
  }

  function meganeFromVoiceTitle(title){
    var s = String(title || "").toLowerCase();
    if(/gag|zurea/.test(s)) return "ギャグメガネ";
    if(/happy|quelina/.test(s)) return "ハッピーメガネ";
    if(/math|xeris/.test(s)) return "数学メガネ";
    if(/hacker|nyx/.test(s)) return "ハッカーメガネ";
    return "未分類";
  }

  function hookAudioElement(audio){
    if(!audio || audio.dataset.obsAudioHooked === PATCH_ID) return;
    audio.dataset.obsAudioHooked = PATCH_ID;

    audio.addEventListener("play", function(){
      var src = audio.currentSrc || audio.src || "";
      var title = cleanTitleFromSrc(src);
      var kind = classifyAudio(src, title);

      if(kind === "conference"){
        if(!throttle("conference.play:" + src, 1500)){
          observe("conference.play", { source:"audio", src:src, title:title });
        }
        return;
      }

      if(kind === "music"){
        if(!throttle("music.play:" + src, 1500)){
          observe("music.play", { source:"audio", src:src, title:title, track:title });
        }
        return;
      }

      if(kind === "dictionary"){
        if(!throttle("dictionary.voice:" + src, 900)){
          observe("dictionary.voice", {
            source:"audio",
            src:src,
            word: wordFromVoiceTitle(title),
            megane: meganeFromVoiceTitle(title),
            title:title
          });
        }
      }
    }, true);

    audio.addEventListener("ended", function(){
      var src = audio.currentSrc || audio.src || "";
      var title = cleanTitleFromSrc(src);
      var kind = classifyAudio(src, title);
      var key = kind + ":" + src;
      if(completedSrc[key]) return;
      completedSrc[key] = true;

      if(kind === "conference"){
        observe("conference.complete", { source:"audio", src:src, title:title });
      }else if(kind === "music"){
        observe("music.complete", { source:"audio", src:src, title:title, track:title });
      }
    }, true);
  }

  function hookAudio(){
    document.querySelectorAll("audio").forEach(hookAudioElement);
  }

  function hookAudioConstructor(){
    if(window.__MEGANE_AUDIO_CONSTRUCTOR_HOOKED_V3__) return;
    window.__MEGANE_AUDIO_CONSTRUCTOR_HOOKED_V3__ = true;
    try{
      var NativeAudio = window.Audio;
      if(typeof NativeAudio !== "function") return;
      window.Audio = function(src){
        var a = src == null ? new NativeAudio() : new NativeAudio(src);
        setTimeout(function(){ hookAudioElement(a); }, 0);
        return a;
      };
      window.Audio.prototype = NativeAudio.prototype;
    }catch(e){}
  }

  function hookHTMLMediaPlay(){
    if(window.__MEGANE_MEDIA_PLAY_HOOKED_V3__) return;
    window.__MEGANE_MEDIA_PLAY_HOOKED_V3__ = true;
    try{
      var proto = HTMLMediaElement && HTMLMediaElement.prototype;
      if(!proto || !proto.play) return;
      var nativePlay = proto.play;
      proto.play = function(){
        try{ hookAudioElement(this); }catch(e){}
        return nativePlay.apply(this, arguments);
      };
    }catch(e){}
  }

  function boot(){
    hookAudioConstructor();
    hookHTMLMediaPlay();
    hookAudio();

    try{
      var obs = new MutationObserver(function(){ hookAudio(); });
      obs.observe(document.body, { childList:true, subtree:true });
    }catch(e){}

    setInterval(hookAudio, 1000);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MEGANE_OBSERVATION_HOOKS = {
    version: PATCH_ID,
    hookAudio: hookAudio,
    observe: observe
  };
})();
