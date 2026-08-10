# Scene Studio v0.2.12 — Export / Import round-trip

## Added
- Easy Studio に「作品を書き出す」「作品を読み込む」を追加。
- Scene Format v1.0 を `<title>.scene.json` として保存。
- `.scene.json` / `.json` を読み込み、Scene順・演出・書体・言語・背景・BGM・Ambient・SE・戻る設定を保持したまま Advanced Scene Editor に復元。
- `format`, `version`, `theme`, `scenes`, Scene ID/type/text の基本検証を追加。
- JSON wrapper (`document` / `sceneFormat`) も Import 可能。API / Embed の次工程で使える入口を用意。
- `blob:` のローカル画像・音声参照が含まれる場合は検出可能。現段階ではメディア本体をJSONへ埋め込まない。
- Scene Format schema の作品言語に `mul` / `und` を許可。

## Round-trip test
1. Easy / Advanced で作品を作成。
2. Easy Studio 下部の「作品を書き出す」を押す。
3. `<作品名>.scene.json` が保存される。
4. 「作品を読み込む」から同じJSONを選ぶ。
5. Advanced Scene Editor が開く。
6. Scene数・順番・本文・演出・フォント・言語・背景・音・戻る設定を確認。
7. 「確認」でPlayer再生し、Export前と同じ挙動か確認。

### Media note
ブラウザで選んだ画像・音声は現段階では `blob:` URL とファイル名を参照情報として保持します。同じページセッション中の往復では参照できますが、ページ再読み込み・別端末・別ブラウザでは元ファイルの再選択が必要です。メディア同梱方式は API / Embed の入出力仕様と分けて次工程で決めます。
