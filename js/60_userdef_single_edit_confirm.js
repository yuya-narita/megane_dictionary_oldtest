
(function(){
  const OLD_KEY="megane_user_definitions_by_word_v1";
  const STORE_KEY="megane_user_definitions_single_by_word_v1";
  const MIG_KEY="megane_user_definitions_single_migrated_v1";
  let lastAudioId="";

  const q=id=>document.getElementById(id);
  const getMode=()=>{try{return appMode}catch(e){return ""}};
  const getWord=()=>{try{const w=currentWord();return w&&w.word?String(w.word):""}catch(e){const el=q("word");return el?el.textContent.trim():""}};
  const getGlass=()=>{try{const g=currentGlass();return {id:String(g&&g.id||"unknown"),name:String(g&&g.name||"このメガネ"),character:String(g&&g.character||"")}}catch(e){return {id:"unknown",name:"このメガネ",character:""}}};
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"{}")||{}}catch(e){return {}}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const wk=w=>encodeURIComponent(w||"");
  const esc=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function migrate(){
    if(localStorage.getItem(MIG_KEY)==="1") return;
    const old=read(OLD_KEY), data=read(STORE_KEY);
    Object.keys(old).forEach(k=>{
      if(data[k]) return;
      const arr=old[k]||[];
      if(!arr.length) return;
      const x=arr[0]; // 最新1件だけ採用
      data[k]={
        id:x.id||("userdef_"+Date.now()),
        text:x.text||"",
        word:x.word||decodeURIComponent(k),
        glassId:x.glassId||"",
        glassName:x.glassName||"",
        visibility:"private",
        createdAt:x.createdAt||new Date().toISOString(),
        updatedAt:x.updatedAt||x.createdAt||new Date().toISOString()
      };
    });
    write(STORE_KEY,data);
    localStorage.setItem(MIG_KEY,"1");
  }

  function getDef(w){ return read(STORE_KEY)[wk(w)]||null; }
  function saveDef(w,g,text){
    const data=read(STORE_KEY), key=wk(w);
    const now=new Date().toISOString();
    const old=data[key];
    data[key]={
      id: old&&old.id ? old.id : "userdef_"+Date.now(),
      text, word:w,
      glassId:g.id, glassName:g.name,
      visibility:"private",
      createdAt: old&&old.createdAt ? old.createdAt : now,
      updatedAt: now
    };
    write(STORE_KEY,data);
  }
  function deleteDef(w){
    const data=read(STORE_KEY);
    delete data[wk(w)];
    write(STORE_KEY,data);
    try{
      const favKey="selfdict:"+wk(w);
      const a=JSON.parse(localStorage.getItem("meganeSelfFavoritesV1")||"[]")||[];
      localStorage.setItem("meganeSelfFavoritesV1", JSON.stringify(a.filter(x => !(x && (x.key===favKey || x.word===w)))));
      const b=JSON.parse(localStorage.getItem("meganeFavoritesV65")||"[]")||[];
      localStorage.setItem("meganeFavoritesV65", JSON.stringify(b.filter(x => !(x && x.type==="selfdict" && (x.key===favKey || x.word===w)))));
    }catch(_){}
  }

  function ensurePlus(){
    if(q("userDefinitionPlus")) return;
    const b=document.createElement("button");
    b.id="userDefinitionPlus"; b.type="button"; b.textContent="+";
    b.title="あなたなら？"; b.setAttribute("aria-label","あなたなら？");
    b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openDialog()},true);
    document.body.appendChild(b);
  }

  function ensureDialog(){
    if(!q("userDefinitionDialog")){
      const d=document.createElement("div");
      d.id="userDefinitionDialog"; d.className="userdef-dialog"; d.hidden=true;
      d.innerHTML='<div class="userdef-panel"><button id="userDefinitionClose" class="userdef-close" type="button">×</button><div class="userdef-kicker">あなたなら？</div><div id="userDefinitionWord" class="userdef-word"></div><div id="userDefinitionGlass" class="userdef-glass"></div><textarea id="userDefinitionText" class="userdef-textarea" rows="4" maxlength="100" placeholder="あなたには、この言葉がどう見える？"></textarea><div id="userDefinitionCount" class="userdef-count">0 / 100</div><div class="userdef-actions"><button id="userDefinitionSave" type="button" class="userdef-save">保存</button><button id="userDefinitionShare" type="button" class="userdef-cancel userdef-share">保存後、自分カードで渡せます</button></div><div class="userdef-note">1単語につき1つ保存 / 保存後に言葉を渡せます</div></div>';
      document.body.appendChild(d);
    }
    const d=q("userDefinitionDialog");
    if(d.dataset.v80) return;
    d.dataset.v80="1";

    q("userDefinitionClose").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();closeDialog()},true);
    q("userDefinitionShare").addEventListener("click",e=>{
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const btn=q("userDefinitionShare");
      if(btn && btn.disabled) return false;
      // 画像生成JS(62)が後段で拾う。ここでは旧テキスト共有を起動しない。
      return false;
    },true);
    q("userDefinitionText").addEventListener("input",updateCount);
    q("userDefinitionSave").addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();

      const ta=q("userDefinitionText");
      if(ta) ta.value = normalizeDefinitionText(ta.value);
      const txt=ta ? ta.value.trim() : "";
      if(!txt) return;

      try{ if(ta) ta.blur(); }catch(_){}
      try{ if(document.activeElement) document.activeElement.blur(); }catch(_){}

      saveDef(getWord(),getGlass(),txt);

      closeDialog();
      renderDef();

      requestAnimationFrame(()=>{
        try{ window.scrollTo(0,0); }catch(_){}
        const b=q("userDefinitionPlus");
        if(b){
          b.classList.add("saved");
          setTimeout(()=>b.classList.remove("saved"),520);
        }
      });
    },true);
    d.addEventListener("click",e=>{if(e.target===d)closeDialog()},true);
  }

  function buildShareText(){
    const w = getWord();
    const txt = q("userDefinitionText") ? q("userDefinitionText").value.trim() : "";
    const url = location && location.href ? location.href.split("#")[0] : "";
    return {
      title: "メガネ辞書｜あなたなら？",
      text:
        "【" + w + "｜メガネ辞書】\n\n" +
        txt + "\n\n" +
        "あなたなら？\n\n" +
        "#メガネ辞書\n" +
        (url ? url : "")
    };
  }

  function shareDefinition(){
    const ta = q("userDefinitionText");
    const txt = ta ? ta.value.trim() : "";
    if(!txt){
      if(ta) ta.focus();
      return;
    }
    const payload = buildShareText();

    // iPhone SafariなどはWeb Share APIを優先。
    if(navigator.share){
      navigator.share(payload).catch(()=>{});
      return;
    }

    // PC/非対応環境はX投稿画面へ。
    const xurl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(payload.text);
    window.open(xurl, "_blank", "noopener,noreferrer");
  }

  function normalizeDefinitionText(value){
    let s = String(value || "").replace(/\r/g, "");
    // 空行連打を抑制
    s = s.replace(/\n{3,}/g, "\n\n");
    const lines = s.split("\n");
    const maxLines = 4;
    if(lines.length > maxLines){
      const head = lines.slice(0, maxLines);
      const rest = lines.slice(maxLines).join(" ").replace(/\s+/g, " ").trim();
      s = head.join("\n") + (rest ? " " + rest : "");
    }
    if(s.length > 100) s = s.slice(0, 100);
    return s;
  }

  function isSelfCardShowing(){
    const bodyActive = !!(document.body && document.body.classList && document.body.classList.contains("self-glass-active"));
    const glass = q("glassName");
    const visibleSelf = !!(glass && glass.textContent.indexOf("自分メガネ") >= 0);
    return bodyActive || visibleSelf;
  }

  function updateShareButtonState(){
    const btn=q("userDefinitionShare");
    const ta=q("userDefinitionText");
    if(!btn || !ta) return;
    const old=getDef(getWord());
    const saved=old&&old.text?String(old.text):"";
    const current=normalizeDefinitionText(ta.value).trim();
    const can=!!saved && current === saved && isSelfCardShowing();
    btn.disabled=!can;
    btn.textContent=can ? "この言葉を渡す" : (isSelfCardShowing() ? "保存後に渡せます" : "保存後、自分カードで渡せます");
    btn.classList.toggle("disabled", !can);
    btn.setAttribute("aria-disabled", can ? "false" : "true");
  }

  function updateCount(){
    const ta=q("userDefinitionText"), c=q("userDefinitionCount");
    if(ta){
      const fixed = normalizeDefinitionText(ta.value);
      if(fixed !== ta.value) ta.value = fixed;
    }
    if(c&&ta)c.textContent=String(ta.value.length)+" / 100";
    updateShareButtonState();
  }

  function openDialog(){
    if(getMode()!=="dictionary") return;
    ensureDialog();
    const w=getWord(), g=getGlass(), old=getDef(w);
    q("userDefinitionWord").textContent=w;
    q("userDefinitionGlass").textContent="";
    q("userDefinitionText").value=old&&old.text?normalizeDefinitionText(old.text):"";
    updateCount();
    updateShareButtonState();
    q("userDefinitionDialog").hidden=false;
    // iPhone/PWAで拡大が戻らない原因になりやすいので自動focusしない
    // setTimeout(()=>q("userDefinitionText").focus(),80);
  }
  function closeDialog(){
    try{ if(document.activeElement) document.activeElement.blur(); }catch(_){}
    const d=q("userDefinitionDialog");
    if(d)d.hidden=true;
  }

  function ensureConfirm(){
    if(q("userDefinitionConfirm")) return;
    const d=document.createElement("div");
    d.id="userDefinitionConfirm"; d.className="userdef-confirm"; d.hidden=true;
    d.innerHTML='<div class="userdef-confirm-panel"><div class="userdef-confirm-title">この定義を削除しますか？</div><div class="userdef-confirm-text">削除すると、この端末から消えます。</div><div class="userdef-confirm-actions"><button id="userDefinitionDeleteYes" type="button">削除する</button><button id="userDefinitionDeleteNo" type="button">残す</button></div></div>';
    document.body.appendChild(d);
    q("userDefinitionDeleteNo").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();closeConfirm()},true);
    d.addEventListener("click",e=>{if(e.target===d)closeConfirm()},true);
  }
  function openConfirm(){
    ensureConfirm();
    const d=q("userDefinitionConfirm");
    d.hidden=false;
    const yes=q("userDefinitionDeleteYes");
    yes.onclick=function(e){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      deleteDef(getWord());
      closeConfirm();
      renderDef();
    };
  }
  function closeConfirm(){const d=q("userDefinitionConfirm");if(d)d.hidden=true;}

  function ensureList(){
    const t=q("translation");
    if(!t) return null;
    let box=q("userDefinitionList");
    if(!box){box=document.createElement("div");box.id="userDefinitionList";box.className="userdef-list";t.insertAdjacentElement("afterend",box);}
    return box;
  }

  function renderDef(){
    migrate();
    const box=ensureList();
    if(!box) return;
    if(getMode()!=="dictionary"){box.hidden=true;return;}
    const d=getDef(getWord());
    if(!d||!d.text){box.hidden=true;box.innerHTML="";return;}

    box.hidden=false;
    box.innerHTML='<div class="userdef-list-title">あなたの定義</div><div class="userdef-item"><div><div class="userdef-item-text">'+esc(d.text)+'</div><div class="userdef-item-meta"></div></div><div class="userdef-buttons"><button type="button" class="userdef-edit">編集</button><button type="button" class="userdef-delete">削除</button></div></div>';

    const edit=box.querySelector(".userdef-edit");
    const del=box.querySelector(".userdef-delete");
    ["pointerdown","click","touchend"].forEach(type=>{
      edit.addEventListener(type,e=>{
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        if(type!=="pointerdown")openDialog();
        return false;
      },{capture:true,passive:false});
      del.addEventListener(type,e=>{
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        if(type!=="pointerdown")openConfirm();
        return false;
      },{capture:true,passive:false});
    });
  }

  function patchRender(){
    try{
      if(typeof render!=="function"||render.__v80UserDef) return;
      const old=render;
      render=function(){const r=old.apply(this,arguments);setTimeout(update,0);return r};
      render.__v80UserDef=true;
    }catch(e){}
  }

  // stop/resume
  function playingMain(){
    const ids=["musicAudio","confNativeAudio","mangaAudio"];
    for(const id of ids){const a=q(id); if(a&&!a.paused&&!a.ended)return a;}
    return Array.from(document.querySelectorAll("audio")).find(a=>{
      const src=a.getAttribute("src")||"";
      return (a.id==="musicAudio"||a.id==="confNativeAudio"||a.id==="mangaAudio"||src.includes("conf")||src.includes("conference"))&&!a.paused&&!a.ended;
    })||null;
  }
  const pause=a=>{try{if(a&&!a.paused)a.pause()}catch(e){}};
  function stopAll(){
    const p=playingMain(); if(p&&p.id)lastAudioId=p.id;
    document.querySelectorAll("audio").forEach(pause);
    try{if(window.speechSynthesis)window.speechSynthesis.cancel()}catch(e){}
    updateStop();
  }
  function resumeLast(){
    const a=(lastAudioId&&q(lastAudioId))||q("musicAudio")||q("confNativeAudio")||q("mangaAudio");
    if(!a) return;
    try{const p=a.play();if(p&&p.catch)p.catch(err=>console.log("resume failed",err))}catch(e){}
    setTimeout(updateStop,80);
  }
  function updateStop(){
    const b=q("shareCurrent"); if(!b)return;
    const is=!!playingMain();
    b.classList.toggle("is-playing",is);
    b.classList.toggle("can-resume",!is&&!!lastAudioId);
    b.title=is?"停止":"再開"; b.setAttribute("aria-label",is?"停止":"再開");
  }
  function replaceStop(){
    const old=q("shareCurrent"); if(!old)return;
    if(old.dataset.v80Stop!=="1"){
      const fresh=old.cloneNode(true);
      fresh.id="shareCurrent"; fresh.dataset.v80Stop="1"; fresh.type="button"; fresh.textContent="";
      old.parentNode.replaceChild(fresh,old);
      ["click","touchend"].forEach(type=>{
        fresh.addEventListener(type,e=>{
          e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
          if(playingMain())stopAll(); else resumeLast();
          return false;
        },{capture:true,passive:false});
      });
      fresh.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return false},{capture:true,passive:false});
    }
    updateStop();
  }

  function update(){
    ensurePlus(); ensureDialog(); ensureConfirm();
    const b=q("userDefinitionPlus"); if(b)b.hidden=getMode()!=="dictionary";
    renderDef(); replaceStop(); updateStop();
  }
  function boot(){migrate();patchRender();update();setInterval(()=>{patchRender();update()},800);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot); else boot();
})();
