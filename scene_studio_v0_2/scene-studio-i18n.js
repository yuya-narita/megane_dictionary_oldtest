(function(global){
  'use strict';

  const STORAGE_KEY = 'scene-studio-ui-language';
  const SUPPORTED = new Set(['ja','en']);

  const M = {
    ja: {
      'intro.title':'文章を貼るだけ。',
      'intro.body':'次の文章を、まだ見せない体験にします。',
      'field.title':'作品タイトル','field.title.ph':'例：声のそろう通り',
      'field.author':'作者名','common.optional':'任意','field.author.ph':'例：Yuya Narita',
      'field.body':'本文','field.body.ph':'ここに文章を貼り付けてください。',
      'body.chars':'{n}文字','body.sample':'サンプルを入れる',
      'theme.heading':'雰囲気','theme.note':'あとから変えられます',
      'theme.light':'文章・エッセイ','theme.dark':'SF・ホラー','theme.cinema':'余白・映画的',
      'font.heading':'作品の書体','font.note':'全Sceneの基本になります',
      'font.serif':'明朝','font.serif.note':'物語・文章向け',
      'font.sans':'ゴシック','font.sans.note':'説明・現代的',
      'font.mono':'等幅','font.mono.note':'端末・ログ向け',
      'split.summary':'シーン分割を調整','split.guide':'1シーンの目安',
      'density.short':'短め','density.normal':'標準','density.long':'長め',
      'split.note':'空行・会話文・箇条書き・改行を優先し、最後に句点と文字数で整えます。',
      'cinema.bg':'背景画像','cinema.bg.note':'Scene Formatの背景としてPlayerへ渡します。',
      'cinema.dark':'暗く','cinema.light':'明るく','cinema.choose':'画像を選ぶ','cinema.remove':'画像を外す',
      'make':'プレイヤーにする','make.note':'Scene Format v1へ変換します',
      'advanced.open':'シーンを調整','io.heading':'作品ファイル','io.export':'設計図を書き出す','io.import':'設計図を読み込む','io.packageExport':'完全パッケージを書き出す','io.packageImport':'完全パッケージを読み込む','io.exported':'書き出しました：{name}','io.imported':'読み込みました：{name}（{n} Scenes）','io.invalid':'Scene Format v1として読み込めません。','io.localAssets':'ローカル画像・音声の参照が{n}件あります。同じブラウザセッション外では再選択が必要です。','io.packageExported':'完全パッケージを書き出しました：{name}（Assets {n}件）','io.packageImported':'完全パッケージを読み込みました：{name}（{n} Scenes / Assets {a}件復元）','io.packageFailed':'完全パッケージを書き出せませんでした。','io.packageInvalid':'Scene Packageとして読み込めません。','footer.note':'Easy Studioは本文を作るだけ。再生は共通Scene Player Coreが担当します。',
      'advanced.title':'シーンを調整','common.preview':'確認',
      'nav.previous.policy':'読者が過去Sceneへ戻れる','nav.previous.note':'戻るボタン・スワイプ・キーボードをまとめて制御します。',
      'scene.text':'本文','scene.subtext':'サブテキスト','scene.subtext.ph':'補足が必要なSceneだけ',
      'scene.type':'種類','scene.type.text':'テキスト','scene.type.dialogue':'セリフ','scene.type.sound':'音だけ',
      'scene.display':'表示','scene.display.stack':'前の文章を残す','scene.display.solo':'この文章だけ',
      'scene.effect':'出かた','effect.auto':'おまかせ','effect.fade':'フェード','effect.pop':'ポンと出る','effect.blur':'ぼやけて現れる',
      'effect.whisper':'そっと現れる','effect.loud':'強く出る','effect.pulse':'脈打つ','effect.shake':'揺れる','effect.tilt':'傾く','effect.slow':'ゆっくり','effect.none':'演出なし',
      'scene.size':'文字サイズ','size.auto':'おまかせ','size.small':'小','size.normal':'標準','size.large':'大','size.xl':'特大',
      'scene.font':'このSceneの書体','font.inherit':'作品設定を使う','scene.language':'このSceneの言語','scene.language.auto':'自動判定','scene.language.ja':'日本語','scene.language.en':'English','scene.language.custom':'その他','scene.language.tag':'言語タグ',
      'edit.merge':'前と結合','edit.split':'カーソル位置で分割','edit.delete':'削除',
      'section.background':'背景','background.mode':'このSceneの背景','background.inherit':'前Sceneから継続','background.image':'このSceneで画像を変更','background.clear':'このSceneで背景を解除',
      'background.choose':'画像を選ぶ','background.unselect':'選択解除','asset.applyUrl':'URLを反映','asset.invalidUrl':'有効なURLまたは相対パスを入力してください。','background.transition':'切替','background.fit':'表示','background.motion':'動き','background.dim':'暗さ','background.thin':'薄さ',
      'transition.fade':'フェード','transition.cut':'カット','transition.flash':'フラッシュ','transition.glitch':'グリッチ',
      'fit.cover':'画面を埋める','fit.contain':'全体を収める',
      'motion.none':'なし','motion.slowZoom':'ゆっくりズーム','motion.breath':'呼吸','motion.panLeft':'左へ流す','motion.panRight':'右へ流す','motion.panUp':'上へ流す','motion.panDown':'下へ流す',
      'section.audio':'音','audio.operation':'操作','audio.inherit':'継続（指定なし）','audio.start':'このSceneで開始','audio.volumeChange':'音量を変更','audio.stop':'このSceneで停止',
      'audio.bgm.note':'続いていた時間','audio.ambient.note':'その時そこにあった音','audio.se.note':'その時起きた音',
      'audio.chooseBgm':'BGMを選ぶ','audio.chooseAmbient':'持続音を選ぶ','audio.chooseSe':'SEを選ぶ','audio.notSelected':'未選択','audio.configured':'設定済み',
      'audio.loop':'ループ','audio.volume':'音量','audio.seEnable':'このSceneでSEを鳴らす',
      'audio.hint':'BGMは「続いていた時間」、Ambientは「その時そこにあった音」、SEは「その時起きた音」として扱います。何も指定しなければ前Sceneの状態を継続します。',
      'preview.return':'編集に戻る','alert.audio':'音声ファイルを選択してください。',
      'scene.count':'{n} Scenes',
      'player.previous':'過去Scene','player.restart':'最初から','player.history':'過去Sceneをスクロール','player.history.close':'履歴を閉じる',
      'player.ending.title':'読了','player.ending.text':'最後まで読みました。','player.ending.restart':'最初から読む'
    },
    en: {
      'intro.title':'Paste your text.',
      'intro.body':'Turn it into an experience where the next passage stays hidden.',
      'field.title':'Title','field.title.ph':'e.g. The Street of Matching Voices',
      'field.author':'Author','common.optional':'Optional','field.author.ph':'e.g. Yuya Narita',
      'field.body':'Text','field.body.ph':'Paste your text here.',
      'body.chars':'{n} characters','body.sample':'Insert sample',
      'theme.heading':'Mood','theme.note':'You can change this later',
      'theme.light':'Writing / Essay','theme.dark':'Sci-Fi / Horror','theme.cinema':'Spacious / Cinematic',
      'font.heading':'Work typeface','font.note':'Default for all Scenes',
      'font.serif':'Serif','font.serif.note':'Stories / prose',
      'font.sans':'Sans-serif','font.sans.note':'Explanatory / modern',
      'font.mono':'Monospace','font.mono.note':'Terminal / logs',
      'split.summary':'Adjust Scene splitting','split.guide':'Scene length',
      'density.short':'Short','density.normal':'Standard','density.long':'Long',
      'split.note':'Prioritizes blank lines, dialogue, lists, and line breaks, then uses punctuation and length as fallback.',
      'cinema.bg':'Background image','cinema.bg.note':'Passed to the Player as a Scene Format background.',
      'cinema.dark':'Dark','cinema.light':'Light','cinema.choose':'Choose image','cinema.remove':'Remove image',
      'make':'Create Player','make.note':'Convert to Scene Format v1',
      'advanced.open':'Adjust Scenes','io.heading':'Work file','io.export':'Export blueprint','io.import':'Import blueprint','io.packageExport':'Export full package','io.packageImport':'Import full package','io.exported':'Exported: {name}','io.imported':'Imported: {name} ({n} Scenes)','io.invalid':'Could not import this as Scene Format v1.','io.localAssets':'This work contains {n} local image/audio reference(s). They must be selected again outside the current browser session.','io.packageExported':'Exported full package: {name} ({n} assets)','io.packageImported':'Imported full package: {name} ({n} Scenes / {a} assets restored)','io.packageFailed':'Could not export the full package.','io.packageInvalid':'Could not import this as a Scene Package.','footer.note':'Easy Studio only authors the content. Shared Scene Player Core handles playback.',
      'advanced.title':'Adjust Scenes','common.preview':'Preview',
      'nav.previous.policy':'Readers can revisit past Scenes','nav.previous.note':'Controls the back button, swipe, and keyboard navigation together.',
      'scene.text':'Text','scene.subtext':'Subtext','scene.subtext.ph':'Only when a Scene needs extra context',
      'scene.type':'Type','scene.type.text':'Text','scene.type.dialogue':'Dialogue','scene.type.sound':'Sound only',
      'scene.display':'Display','scene.display.stack':'Keep previous text','scene.display.solo':'Show only this text',
      'scene.effect':'Entrance','effect.auto':'Automatic','effect.fade':'Fade','effect.pop':'Pop in','effect.blur':'Blur in',
      'effect.whisper':'Whisper in','effect.loud':'Strong entrance','effect.pulse':'Pulse','effect.shake':'Shake','effect.tilt':'Tilt','effect.slow':'Slow','effect.none':'No effect',
      'scene.size':'Text size','size.auto':'Automatic','size.small':'Small','size.normal':'Standard','size.large':'Large','size.xl':'Extra large',
      'scene.font':'Typeface for this Scene','font.inherit':'Use work setting','scene.language':'Language for this Scene','scene.language.auto':'Automatic','scene.language.ja':'Japanese','scene.language.en':'English','scene.language.custom':'Other','scene.language.tag':'Language tag',
      'edit.merge':'Merge with previous','edit.split':'Split at cursor','edit.delete':'Delete',
      'section.background':'Background','background.mode':'Background for this Scene','background.inherit':'Continue from previous Scene','background.image':'Change image in this Scene','background.clear':'Clear background in this Scene',
      'background.choose':'Choose image','background.unselect':'Clear selection','asset.applyUrl':'Apply URL','asset.invalidUrl':'Enter a valid URL or relative path.','background.transition':'Transition','background.fit':'Fit','background.motion':'Motion','background.dim':'Darkness','background.thin':'Fading',
      'transition.fade':'Fade','transition.cut':'Cut','transition.flash':'Flash','transition.glitch':'Glitch',
      'fit.cover':'Fill screen','fit.contain':'Fit whole image',
      'motion.none':'None','motion.slowZoom':'Slow zoom','motion.breath':'Breath','motion.panLeft':'Pan left','motion.panRight':'Pan right','motion.panUp':'Pan up','motion.panDown':'Pan down',
      'section.audio':'Audio','audio.operation':'Action','audio.inherit':'Continue (no command)','audio.start':'Start in this Scene','audio.volumeChange':'Change volume','audio.stop':'Stop in this Scene',
      'audio.bgm.note':'Time that kept flowing','audio.ambient.note':'Sound that existed there','audio.se.note':'Sound that happened then',
      'audio.chooseBgm':'Choose BGM','audio.chooseAmbient':'Choose ambient audio','audio.chooseSe':'Choose SE','audio.notSelected':'Not selected','audio.configured':'Configured',
      'audio.loop':'Loop','audio.volume':'Volume','audio.seEnable':'Play SE in this Scene',
      'audio.hint':'BGM is treated as time that kept flowing, Ambient as sound that existed there, and SE as sound that happened then. With no command, the previous Scene state continues.',
      'preview.return':'Back to editor','alert.audio':'Please choose an audio file.',
      'scene.count':'{n} Scenes',
      'player.previous':'Past Scenes','player.restart':'Restart','player.history':'Scroll past Scenes','player.history.close':'Close history',
      'player.ending.title':'Finished','player.ending.text':'You reached the end.','player.ending.restart':'Read from start'
    }
  };

  function detect(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.has(saved)) return saved;
    return /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
  }

  let locale = detect();

  function t(key, vars={}){
    let s = (M[locale] && M[locale][key]) ?? (M.ja[key] ?? key);
    Object.entries(vars).forEach(([k,v]) => { s = s.replaceAll(`{${k}}`, String(v)); });
    return s;
  }

  function setLocale(next){
    if(!SUPPORTED.has(next)) return locale;
    locale = next;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    global.dispatchEvent(new CustomEvent('scene-studio:ui-language', {detail:{language:locale}}));
    return locale;
  }

  function getLocale(){ return locale; }

  global.SceneStudioI18n = {t,setLocale,getLocale,messages:M};
})(window);
