/* v1.14: 持ち物スワイプ整理 + カスタムアルバム曲順ドラッグ */
(function(){
  'use strict';
  var suppressUntil=0, singleTouch=null, reorder=null;
  var HOLD=360, SWIPE=92, MOVE_CANCEL=12;

  function playlists(){ try{return Array.isArray(window.musicPlaylists)?window.musicPlaylists:(typeof musicPlaylists!=='undefined'?musicPlaylists:[]);}catch(_){return [];} }
  function albumAt(i){ return playlists()[Number(i)]||null; }
  function userAudioId(a){
    if(!a)return '';
    try{if(a._meganeUserAudio149&&a.tracks&&a.tracks[0]&&a.tracks[0]._userAudioId)return String(a.tracks[0]._userAudioId);}catch(_){ }
    var m=String(a.id||'').match(/^user_audio_album_(.+)$/); return m?m[1]:'';
  }
  function toast(s){
    var old=document.querySelector('.music-v114-toast'); if(old)old.remove();
    var e=document.createElement('div'); e.className='music-v114-toast'; e.textContent=s; document.body.appendChild(e); setTimeout(function(){e.remove();},1450);
  }
  function haptic(x){try{if(navigator.vibrate)navigator.vibrate(x||10);}catch(_){}}
  function customAlbums(){return playlists().filter(function(a){return a&&a._meganeCustomAlbum109&&a._userCustomAlbumId;});}
  function addFavorite(card){
    var a=albumAt(card.getAttribute('data-album')), t=a&&a.tracks&&a.tracks[0], id=t&&String(t.id||t.audio||'');
    if(!id)return;
    var exists=false; try{exists=!!(window.MEGANE_MUSIC_V7_IS_FAVORITE&&window.MEGANE_MUSIC_V7_IS_FAVORITE(id));}catch(_){ }
    if(exists){toast('保護済みです');return;}
    try{
      if(window.MEGANE_MUSIC_V7_ADD_FAVORITES) window.MEGANE_MUSIC_V7_ADD_FAVORITES([id]);
      else if(window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE) window.MEGANE_MUSIC_V7_TOGGLE_FAVORITE(id);
      haptic([12,25,12]); toast('保護しました♪');
      if(window.MEGANE_MUSIC_REAPPLY_LOCK_EFFECTS) setTimeout(window.MEGANE_MUSIC_REAPPLY_LOCK_EFFECTS,80);
    }catch(_){toast('保護できませんでした');}
  }
  function closePicker(){var e=document.getElementById('musicV114AlbumPicker');if(e)e.remove();}
  function openPicker(card){
    closePicker();
    var source=albumAt(card.getAttribute('data-album')), tid=userAudioId(source), albums=customAlbums();
    if(!tid){toast('この曲は追加できません');return;}
    if(!albums.length){toast('先にカスタムアルバムを作ってください');return;}
    var box=document.createElement('div'); box.id='musicV114AlbumPicker'; box.className='music-v114-picker';
    var rows=albums.map(function(a){var on=(a._trackIds||[]).map(String).indexOf(tid)>=0;return '<label><input type="checkbox" data-id="'+String(a._userCustomAlbumId).replace(/"/g,'&quot;')+'" '+(on?'checked':'')+'><img src="'+String(a.cover||'').replace(/"/g,'&quot;')+'"><span><strong>'+escapeHtml(a.title||'アルバム')+'</strong><small>'+((a._trackIds||[]).length)+'曲</small></span></label>';}).join('');
    box.innerHTML='<div class="music-v114-picker-head"><strong>📀 アルバムへ追加</strong><button type="button">×</button></div><div class="music-v114-picker-list">'+rows+'</div><div class="music-v114-picker-actions"><button data-act="cancel">戻る</button><button data-act="save">変更を保存</button></div>';
    document.body.appendChild(box);
    box.querySelector('.music-v114-picker-head button').onclick=closePicker;
    box.onclick=function(e){var act=e.target&&e.target.dataset&&e.target.dataset.act;if(act==='cancel')closePicker();if(act==='save'){
      var b=e.target;b.disabled=true;
      var jobs=albums.map(function(a){var cb=box.querySelector('input[data-id="'+CSS.escape(String(a._userCustomAlbumId))+'"]'), ids=(a._trackIds||[]).map(String), has=ids.indexOf(tid)>=0, want=!!(cb&&cb.checked);if(want&&!has)ids.push(tid);if(!want&&has)ids=ids.filter(function(x){return x!==tid;});return window.MEGANE_CUSTOM_ALBUM_SET_TRACKS_V110(String(a._userCustomAlbumId),ids);});
      Promise.all(jobs).then(function(){closePicker();haptic([12,24,12]);toast('アルバムを更新しました♪');}).catch(function(){b.disabled=false;toast('更新できませんでした');});
    }};
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function resetSingle(){if(!singleTouch)return;singleTouch.card.style.transform='';singleTouch.card.classList.remove('v114-swipe-left','v114-swipe-right');singleTouch=null;}
  document.addEventListener('touchstart',function(e){
    var card=e.target.closest&&e.target.closest('.music-v7-single-list .music-v7-single-card'); if(!card)return;
    var t=e.touches[0]; singleTouch={card:card,x:t.clientX,y:t.clientY,moved:false};
  },true);
  document.addEventListener('touchmove',function(e){
    if(!singleTouch||reorder)return;var t=e.touches[0],dx=t.clientX-singleTouch.x,dy=t.clientY-singleTouch.y;
    if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.15){e.preventDefault();e.stopPropagation();singleTouch.moved=true;var p=Math.max(-150,Math.min(150,dx));singleTouch.card.style.transform='translateX('+p+'px)';singleTouch.card.classList.toggle('v114-swipe-left',p<-45);singleTouch.card.classList.toggle('v114-swipe-right',p>45);}
  },{capture:true,passive:false});
  document.addEventListener('touchend',function(e){
    if(!singleTouch||reorder)return;var s=singleTouch,t=e.changedTouches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;resetSingle();
    if(Math.abs(dx)>SWIPE&&Math.abs(dx)>Math.abs(dy)*1.1){e.preventDefault();e.stopPropagation();suppressUntil=Date.now()+900;if(dx>0)addFavorite(s.card);else openPicker(s.card);}
  },{capture:true,passive:false});
  document.addEventListener('touchcancel',resetSingle,true);
  document.addEventListener('click',function(e){if(Date.now()<suppressUntil&&e.target.closest&&e.target.closest('.music-v7-single-card')){e.preventDefault();e.stopImmediatePropagation();}},true);

  function albumIdFromSheet(){var b=document.getElementById('musicV7CustomAlbumEdit112');return b&&b.dataset.customAlbumId||'';}
  function clearReorder(cancel){
    if(!reorder)return;clearTimeout(reorder.timer);if(reorder.ghost)reorder.ghost.remove();if(reorder.row)reorder.row.classList.remove('v114-reorder-source');document.documentElement.classList.remove('v114-reordering');var r=reorder;reorder=null;
    if(cancel)return;
    var list=document.querySelector('#musicV7Sheet .music-v7-track-list');if(!list)return;
    var ids=Array.prototype.map.call(list.querySelectorAll('.music-v7-track.custom-album-mode'),function(x){return x.dataset.userAudioId||'';}).filter(Boolean);
    if(ids.length&&window.MEGANE_CUSTOM_ALBUM_SET_TRACKS_V110)window.MEGANE_CUSTOM_ALBUM_SET_TRACKS_V110(r.albumId,ids).then(function(){toast('曲順を保存しました♪');}).catch(function(){toast('曲順を保存できませんでした');});
  }
  function startReorder(r){
    if(!reorder||reorder!==r)return;var rect=r.row.getBoundingClientRect();r.dragging=true;r.row.classList.add('v114-reorder-source');document.documentElement.classList.add('v114-reordering');var g=r.row.cloneNode(true);g.className+=' v114-reorder-ghost';g.style.width=rect.width+'px';document.body.appendChild(g);r.ghost=g;moveGhost(r);haptic(12);
  }
  function moveGhost(r){if(r.ghost)r.ghost.style.transform='translate3d('+(r.x-r.offX)+'px,'+(r.y-r.offY)+'px,0)';}
  function moveRow(r){var list=r.row.parentNode, rows=Array.prototype.slice.call(list.querySelectorAll('.music-v7-track.custom-album-mode')).filter(function(x){return x!==r.row;}), target=null;for(var i=0;i<rows.length;i++){var q=rows[i].getBoundingClientRect();if(r.y<q.top+q.height/2){target=rows[i];break;}}list.insertBefore(r.row,target);}
  document.addEventListener('touchstart',function(e){
    var row=e.target.closest&&e.target.closest('#musicV7Sheet .music-v7-track.custom-album-mode');if(!row)return;var id=albumIdFromSheet();if(!id)return;var t=e.touches[0],rect=row.getBoundingClientRect();var r={row:row,albumId:id,sx:t.clientX,sy:t.clientY,x:t.clientX,y:t.clientY,offX:t.clientX-rect.left,offY:t.clientY-rect.top,dragging:false,timer:null,ghost:null};r.timer=setTimeout(function(){startReorder(r);},HOLD);reorder=r;
  },true);
  document.addEventListener('touchmove',function(e){
    if(!reorder)return;var t=e.touches[0];reorder.x=t.clientX;reorder.y=t.clientY;if(!reorder.dragging){var dx=t.clientX-reorder.sx,dy=t.clientY-reorder.sy;if(Math.hypot(dx,dy)>MOVE_CANCEL){clearTimeout(reorder.timer);reorder=null;}return;}e.preventDefault();e.stopImmediatePropagation();moveGhost(reorder);moveRow(reorder);
  },{capture:true,passive:false});
  document.addEventListener('touchend',function(e){if(!reorder)return;if(reorder.dragging){e.preventDefault();e.stopImmediatePropagation();suppressUntil=Date.now()+900;clearReorder(false);}else{clearTimeout(reorder.timer);reorder=null;}},{capture:true,passive:false});
  document.addEventListener('touchcancel',function(){clearReorder(true);},true);

  var st=document.createElement('style');st.textContent=
    '.music-v7-single-card{transition:transform .16s ease!important}.music-v7-single-card.v114-swipe-right{box-shadow:inset 8px 0 0 rgba(255,232,120,.85)!important}.music-v7-single-card.v114-swipe-left{box-shadow:inset -8px 0 0 rgba(163,126,255,.9)!important}'+
    '.music-v114-picker{position:fixed;left:14px;right:14px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:2147483600;max-height:72dvh;display:flex;flex-direction:column;padding:16px;border-radius:25px;background:rgba(24,15,28,.995);border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 70px rgba(0,0,0,.66);color:#fff}.music-v114-picker-head{display:flex;align-items:center;justify-content:space-between;font-size:18px}.music-v114-picker-head button{border:0;background:none;color:#fff;font-size:28px}.music-v114-picker-list{overflow:auto;margin:10px 0}.music-v114-picker label{display:grid;grid-template-columns:24px 50px 1fr;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.08)}.music-v114-picker img{width:50px;height:50px;border-radius:11px;object-fit:cover}.music-v114-picker span{min-width:0;display:grid}.music-v114-picker strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.music-v114-picker small{color:rgba(255,255,255,.55)}.music-v114-picker-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.music-v114-picker-actions button{min-height:48px;border:0;border-radius:14px;background:rgba(255,255,255,.09);color:#fff;font-weight:900}.music-v114-picker-actions button[data-act=save]{background:#fff;color:#251522}'+
    '.v114-reorder-source{opacity:.18!important}.v114-reorder-ghost{position:fixed!important;left:0!important;top:0!important;z-index:2147483650!important;pointer-events:none!important;margin:0!important;background:rgba(24,25,34,.98)!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:14px!important;box-shadow:0 18px 42px rgba(0,0,0,.5)!important}.v114-reordering,.v114-reordering body{user-select:none!important;-webkit-user-select:none!important}.music-v114-toast{position:fixed;left:50%;bottom:104px;z-index:2147483700;transform:translateX(-50%);padding:10px 15px;border-radius:999px;background:rgba(13,16,26,.96);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:900;box-shadow:0 12px 36px rgba(0,0,0,.38)}';document.head.appendChild(st);
})();
