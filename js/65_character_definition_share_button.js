/* 65_character_definition_share_button.js
   Separate share button. Does not hijack +.
   Character card: この定義をシェア
   Self card: この言葉を渡す
*/
(() => {
  "use strict";
  const q = id => document.getElementById(id);
  let previewState = null;
  let busy = false;
  let lastAt = 0;
  const BEAR_DATA_URL = "data:image/webp;base64,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";

  function appShareUrl(){
    try{
      const u = new URL(location.href);
      u.hash = "";
      u.searchParams.delete("local");
      return u.href;
    }catch(_){ return location.href || ""; }
  }
  const escFile = s => String(s || "word").replace(/[\\/:*?"<>|\s]/g, "_");
  function isDict(){
    try{
      if(typeof appMode !== "undefined") return appMode === "dictionary";
      const active = Array.from(document.querySelectorAll("button")).find(el => {
        const t=(el.textContent||"").trim();
        const c=String(el.className||"");
        return t==="辞書" && (c.indexOf("active")>=0 || c.indexOf("selected")>=0 || el.getAttribute("aria-selected")==="true");
      });
      return !!active;
    }catch(_){ return false; }
  }

  function isSelfCard(){
    const g = q("glassName");
    const name = g ? String(g.textContent || "") : "";
    return name.indexOf("自分メガネ") >= 0;
  }

  function currentWordText(){
    try{
      if(typeof currentWord === "function"){
        const w = currentWord();
        if(w && w.word) return String(w.word);
      }
    }catch(_){}
    const el = q("word");
    return el ? el.textContent.trim() : "";
  }

  function currentGlassInfo(){
    try{
      if(typeof currentGlass === "function"){
        const g = currentGlass();
        return {
          id: String(g && g.id || "unknown"),
          name: String(g && g.name || "このメガネ"),
          character: String(g && (g.character || g.chara || g.owner) || ""),
          subtitle: String(g && (g.tagline || g.subtitle || g.description || g.desc || "") || "")
        };
      }
    }catch(_){}
    const name = q("glassName");
    const meta = q("glassMeta") || q("glassDescription") || q("viewpoint");
    return {id:"unknown", name:name ? name.textContent.trim() : "このメガネ", character:"", subtitle:meta ? meta.textContent.trim() : ""};
  }

  function definitionText(){
    let text = "";
    try{
      const w = typeof currentWord === "function" ? currentWord() : null;
      const g = typeof currentGlass === "function" ? currentGlass() : null;
      if(w && g){
        const id = g.id;
        const candidates = [];
        if(w.definitions && id && w.definitions[id]) candidates.push(w.definitions[id]);
        if(w.translations && id && w.translations[id]) candidates.push(w.translations[id]);
        if(w.glasses && id && w.glasses[id]) candidates.push(w.glasses[id]);
        if(id && w[id]) candidates.push(w[id]);
        for(const d of candidates){
          text = String((d && (d.text || d.translation || d.definition || d.body)) || d || "");
          if(text) break;
        }
      }
    }catch(_){}
    if(!text){
      const els = [q("definition"), q("wordDefinition"), q("translation"), q("meaning"),
        document.querySelector(".word-definition"), document.querySelector(".definition-text"), document.querySelector(".card-definition")].filter(Boolean);
      for(const el of els){
        const t = el.textContent.trim();
        if(t){ text = t; break; }
      }
    }
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function roundRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
  }
  function wrapText(ctx,text,maxWidth,maxLines){
    const chars=Array.from(String(text||"").replace(/\r/g,""));
    const lines=[]; let line="";
    chars.forEach(ch=>{
      if(ch==="\n"){ lines.push(line); line=""; return; }
      const test=line+ch;
      if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=ch; }
      else line=test;
    });
    if(line || !lines.length) lines.push(line);
    if(lines.length>maxLines){ const out=lines.slice(0,maxLines); out[maxLines-1]=out[maxLines-1].replace(/…?$/,"")+"…"; return out; }
    return lines;
  }
  const canvasToBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));


  let bearIcon = null;
  let bearReady = false;

  function ensureBearIcon(){
    if(bearIcon) return bearIcon;
    bearIcon = new Image();
    bearIcon.onload = () => { bearReady = true; };
    bearIcon.onerror = () => { bearReady = false; };
    bearIcon.src = BEAR_DATA_URL;
    return bearIcon;
  }

  function waitBearReady(){
    ensureBearIcon();
    if(bearReady) return Promise.resolve(true);
    return new Promise(resolve => {
      const img = bearIcon;
      if(!img) return resolve(false);
      const done = ok => resolve(!!ok);
      img.onload = () => { bearReady = true; done(true); };
      img.onerror = () => { bearReady = false; done(false); };
      setTimeout(() => done(bearReady), 500);
    });
  }

  function drawCrownBear(ctx, x, y, size){
    ensureBearIcon();
    if(!bearIcon || !bearReady) return false;
    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRect(ctx, x, y, size, size, 24);
    ctx.clip();
    ctx.drawImage(bearIcon, x, y, size, size);
    ctx.restore();
    return true;
  }

  async function drawCard(ctx, word, def, glass){
    const W=1200,H=1600;
    ctx.clearRect(0,0,W,H);
    const bg=ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,"#2a1731"); bg.addColorStop(.48,"#11121b"); bg.addColorStop(1,"#082b2b");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    let g=ctx.createRadialGradient(170,170,10,170,170,520);
    g.addColorStop(0,"rgba(185,92,155,.20)"); g.addColorStop(1,"rgba(185,92,155,0)");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    g=ctx.createRadialGradient(1000,1390,10,1000,1390,560);
    g.addColorStop(0,"rgba(48,174,151,.16)"); g.addColorStop(1,"rgba(48,174,151,0)");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    roundRect(ctx,42,58,W-84,H-116,82);
    ctx.fillStyle="rgba(18,18,28,.58)"; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="rgba(255,255,255,.16)"; ctx.stroke();

    ctx.textAlign="center";
    ctx.fillStyle="rgba(255,225,145,.92)";
    ctx.font="700 38px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif";
    ctx.fillText(glass.name||"メガネ辞書",W/2,525);
    ctx.fillStyle="rgba(255,255,255,.48)";
    ctx.font="600 27px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif";
    const sub=(glass.character?glass.character+"｜":"")+(glass.subtitle||"世界を見る視点");
    ctx.fillText(sub.slice(0,40),W/2,575);
    ctx.fillStyle="rgba(255,255,255,.97)";
    const wordLen=Array.from(word||"").length;
    const wordFont=wordLen>=8?86:wordLen>=5?100:120;
    ctx.font="800 "+wordFont+"px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif";
    ctx.fillText(word||"",W/2,745);
    ctx.fillStyle="rgba(255,255,255,.94)";
    ctx.font="700 50px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif";
    let y=875; wrapText(ctx,def||"",900,8).forEach(line=>{ ctx.fillText(line,W/2,y); y+=76; });
    await waitBearReady();
    drawCrownBear(ctx, W/2 - 56, 1272, 112);

    ctx.fillStyle="rgba(255,255,255,.70)";
    ctx.font="800 34px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif";
    ctx.fillText("この定義、あなたなら？",W/2,1422);
    ctx.fillStyle="rgba(255,226,160,.80)";
    ctx.font="900 30px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("MEGANE DICTIONARY",W/2,1484);
    ctx.fillStyle="rgba(255,255,255,.42)";
    ctx.font="600 25px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("#メガネ辞書",W/2,1530);
  }

  async function generateCharacterCardImage(){
    const word=currentWordText();
    const glass=currentGlassInfo();
    const def=definitionText();
    if(!word || !def) throw new Error("キャラ定義を取得できませんでした");
    const canvas=document.createElement("canvas");
    canvas.width=1200; canvas.height=1600;
    await drawCard(canvas.getContext("2d"), word, def, glass);
    const blob=await canvasToBlob(canvas);
    if(!blob) throw new Error("画像生成に失敗しました");
    const file=new File([blob], "megane_dictionary_"+escFile(word)+"_"+escFile(glass.name)+".png", {type:"image/png"});
    const url=URL.createObjectURL(blob);
    const payloadText="【"+word+"｜"+(glass.name||"メガネ辞書")+"の定義】\n\nこの定義、あなたなら？\n\n#メガネ辞書\n"+appShareUrl();
    return {word, glass, def, blob, file, url, payloadText};
  }

  function ensurePreviewDialog(){
    let dlg=q("characterCardSharePreviewDialog");
    if(dlg) return dlg;
    if(!q("characterCardSharePreviewStyle")){
      const style=document.createElement("style");
      style.id="characterCardSharePreviewStyle";
      style.textContent=`
        #characterCardSharePreviewDialog{border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(9,12,20,.94);color:#fff;width:min(92vw,430px);padding:0;box-shadow:0 24px 80px rgba(0,0,0,.58)}
        #characterCardSharePreviewDialog::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(6px)}
        .char-share-preview-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px;font-weight:900}
        .char-share-preview-close{border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:999px;width:34px;height:34px;font-size:18px;font-weight:900}
        .char-share-preview-body{padding:0 18px 18px}.char-share-preview-img{display:block;width:100%;max-height:58vh;object-fit:contain;border-radius:18px;background:#111;margin:8px 0 14px}
        .char-share-preview-url{font-size:12px;line-height:1.45;color:rgba(255,255,255,.50);margin:0 0 14px}
        .char-share-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.char-share-preview-actions button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:16px;min-height:46px;font-weight:900}
        .char-share-preview-actions .primary{background:rgba(255,226,160,.16);border-color:rgba(255,226,160,.42);color:#ffe2a0}
      `;
      document.head.appendChild(style);
    }
    dlg=document.createElement("dialog");
    dlg.id="characterCardSharePreviewDialog";
    dlg.innerHTML=`<div class="char-share-preview-head"><div>定義カード画像プレビュー</div><button type="button" class="char-share-preview-close" aria-label="閉じる">×</button></div>
      <div class="char-share-preview-body"><img class="char-share-preview-img" alt="メガネ辞書 定義カード画像"><div class="char-share-preview-url"></div>
      <div class="char-share-preview-actions"><button type="button" class="char-share-preview-save">画像を保存</button><button type="button" class="char-share-preview-share primary">共有</button></div></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector(".char-share-preview-close").addEventListener("click",()=>dlg.close());
    dlg.addEventListener("close",()=>setTimeout(()=>{ if(previewState&&previewState.url){ URL.revokeObjectURL(previewState.url); previewState=null; }},30000));
    dlg.querySelector(".char-share-preview-share").addEventListener("click",async()=>{
      if(!previewState) return;
      try{
        if(navigator.canShare && navigator.canShare({files:[previewState.file]}) && navigator.share){
          await navigator.share({title:"メガネ辞書｜"+previewState.word,text:previewState.payloadText,files:[previewState.file]});
          return;
        }
        const a=document.createElement("a"); a.href=previewState.url; a.download=previewState.file.name; a.click();
      }catch(err){ console.warn("[character card share]",err); alert("共有に失敗しました。画像を保存して投稿してください。"); }
    });
    dlg.querySelector(".char-share-preview-save").addEventListener("click",()=>{ if(!previewState) return; const a=document.createElement("a"); a.href=previewState.url; a.download=previewState.file.name; a.click(); });
    return dlg;
  }

  async function openCharacterSharePreview(){
    if(previewState && previewState.url){ URL.revokeObjectURL(previewState.url); previewState=null; }
    previewState=await generateCharacterCardImage();
    const dlg=ensurePreviewDialog();
    dlg.querySelector(".char-share-preview-img").src=previewState.url;
    dlg.querySelector(".char-share-preview-url").textContent="共有時は、公開URLを本文に入れます";
    if(!dlg.open) dlg.showModal();
  }

  function ensureButton(){
    let btn=q("cardShareButton");
    if(btn) return btn;

    if(!q("cardShareButtonStyle")){
      const st=document.createElement("style");
      st.id="cardShareButtonStyle";
      st.textContent=`
        #cardShareButton{
          position:absolute;
          z-index:2147483000;
          width:40px;
          height:40px;
          border:0;
          background:transparent;
          color:rgba(255,255,255,.90);
          font-size:25px;
          font-weight:800;
          line-height:1;
          display:none;
          align-items:center;
          justify-content:center;
          padding:0;
          border-radius:999px;
          box-shadow:none;
          -webkit-tap-highlight-color:transparent;
          touch-action:manipulation;
          pointer-events:auto;
        }
        #cardShareButton:active{
          transform:scale(.94);
          color:#ffe2a0;
          background:rgba(255,255,255,.06);
        }
      `;
      document.head.appendChild(st);
    }

    btn=document.createElement("button");
    btn.id="cardShareButton";
    btn.type="button";
    btn.textContent="↗";
    btn.title="シェア";
    btn.setAttribute("aria-label","シェア");

    // 辞書カード本体へ入れる。これでカード/音楽/会議には物理的に出ない。
    const card=q("card");
    const parent=card || document.body;
    parent.appendChild(btn);
    return btn;
  }

  function refreshButton(){
    const btn=ensureButton();

    const card=q("card");
    const word=q("word");
    const glass=q("glassName");
    const fav=q("favoriteToggle");

    const ok = !!(
      isDict() &&
      card && word && glass && fav &&
      card.offsetParent !== null &&
      word.offsetParent !== null &&
      glass.offsetParent !== null &&
      fav.offsetParent !== null
    );

    if(!ok){
      btn.style.display="none";
      btn.setAttribute("aria-hidden","true");
      btn.removeAttribute("data-ready");
      return;
    }

    // Always keep button in the dictionary card, never in favoriteLayer/body.
    if(btn.parentNode !== card) card.appendChild(btn);

    const cr = card.getBoundingClientRect();
    const fr = fav.getBoundingClientRect();

    // Place ↗ to the left of ☆, using the card coordinate system.
    // This prevents drifting after switching Card/Music/Conference tabs.
    const gap = 41;
    const x = Math.round(fr.left - cr.left - gap - 20);
    const y = Math.round(fr.top - cr.top + fr.height / 2 - 20);

    btn.style.left = Math.max(8, x) + "px";
    btn.style.top = Math.max(8, y) + "px";
    btn.style.right = "auto";
    btn.style.bottom = "auto";
    btn.style.display="flex";
    btn.removeAttribute("aria-hidden");
    btn.dataset.ready = "1";

    if(isSelfCard()){
      btn.title="この言葉を渡す";
      btn.setAttribute("aria-label","この言葉を渡す");
    }else{
      btn.title="この定義をシェア";
      btn.setAttribute("aria-label","この定義をシェア");
    }
  }

  function handleButton(e){
    const btn=e.target && e.target.closest ? e.target.closest("#cardShareButton") : null;
    if(!btn) return;
    if(!isDict() || btn.dataset.ready !== "1"){
      btn.style.display="none";
      return;
    }
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    if(e.type !== "pointerdown" && e.type !== "touchstart") return false;
    const now=Date.now();
    if(busy || now-lastAt<700) return false;
    busy=true; lastAt=now;

    // シェア画面を開いても、再生中の音楽・Conferenceは止めない。
    // iPhone/PWAで共有画面から戻った際も、そのまま再生を継続する。
    if(isSelfCard()){
      try{
        if(window.MEGANE_SELF_CARD_IMAGE_SHARE && typeof window.MEGANE_SELF_CARD_IMAGE_SHARE.openDelivery==="function"){
          window.MEGANE_SELF_CARD_IMAGE_SHARE.openDelivery();
        }else if(window.MEGANE_SELF_CARD_IMAGE_SHARE && typeof window.MEGANE_SELF_CARD_IMAGE_SHARE.share==="function"){
          window.MEGANE_SELF_CARD_IMAGE_SHARE.share();
        }else alert("先に自分の定義を保存してください。");
      }catch(err){ console.warn("[self card share button]",err); }
      setTimeout(()=>{busy=false;},250);
      return false;
    }

    openCharacterSharePreview().catch(err=>{ console.warn("[character share button]",err); alert("定義カード画像の生成に失敗しました。"); }).finally(()=>setTimeout(()=>{busy=false;},250));
    return false;
  }

  function boot(){
    ensureButton();

    function hardStopShareButton(e){
      const btn=e.target && e.target.closest ? e.target.closest("#cardShareButton") : null;
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    document.addEventListener("pointerup", hardStopShareButton, true);
    document.addEventListener("touchend", hardStopShareButton, {capture:true, passive:false});
    document.addEventListener("click", hardStopShareButton, true);

    document.addEventListener("pointerdown",handleButton,true);
    document.addEventListener("touchstart",handleButton,{capture:true,passive:false});
    document.addEventListener("click",handleButton,true);
    document.addEventListener("click", () => { setTimeout(refreshButton, 0); setTimeout(refreshButton, 120); }, true);
    document.addEventListener("pointerup", () => { setTimeout(refreshButton, 0); setTimeout(refreshButton, 120); }, true);
    window.addEventListener("resize", refreshButton, true);
    setInterval(refreshButton,250);
    setTimeout(refreshButton,80);
    setTimeout(refreshButton,400);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
  window.MEGANE_CHARACTER_DEFINITION_SHARE = {version:"v12", open:openCharacterSharePreview};
})();