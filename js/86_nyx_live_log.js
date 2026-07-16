/* 86_nyx_live_log.js
   NYX LIVE LOG 確認版
   - Conference再生画面だけに薄いログ演出を追加
   - 既存Conference処理には触らない独立パッチ
   - conf_034のみ仮タイムコードあり
   - 他Conferenceは汎用ログを再生中にランダム表示
   - sponsor: presentedUrl / organizations[].url でリンク対応
   - chat log: link / url / stamp でリンク・文字スタンプ対応
*/
(function(){
  'use strict';

  var INSTALLED = false;
  var lastStoryId = "";
  var lastGenericAt = 0;
  var fired = {};
  var typingTimer = null;
  var hideTimer = null;
  var typingTimers = { nyx: null, developer: null };
  var hideTimers = { nyx: null, developer: null, nyxNote: null, developerNote: null };
  var noteTypingTimers = { nyxNote: null, developerNote: null };

  var SPECIFIC_LOGS = {
  "conf_001": [
    {
      "t": 8,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 13,
      "type": "developer",
      "text": "第1回やな"
    },
    {
      "t": 19,
      "type": "log",
      "text": "初回観測\n開始"
    },
    {
      "t": 27,
      "type": "developer",
      "text": "ここから\n始まってしまった"
    },
    {
      "t": 29,
      "type": "developer",
      "text": "ニクス、これ何？",
      "link": {
        "title": "Google Analytics",
        "url": "https://analytics.google.com/"
      }
    },
    {
      "t": 32,
      "type": "log",
      "text": "監視装置。",
      "stamp": "観測済"
    },
    {
      "t": 34,
      "type": "developer",
      "text": "言い方悪いな",
      "stamp": "既読"
    },
    {
      "t": 35,
      "type": "log",
      "text": "後戻り不可"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "寝る前に急に黒歴史を思い出す会",
          "logo": ""
        },
        {
          "name": "比較で勝手に壊れる協会",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "log",
      "text": "TITLE CALL\n通過確認"
    },
    {
      "t": 118,
      "type": "developer",
      "text": "スポンサー帯\n守れたな"
    },
    {
      "t": 126,
      "type": "log",
      "text": "珍しく\n規律を確認"
    },
    {
      "t": 134,
      "type": "developer",
      "text": "言い方よ"
    },
    {
      "t": 148,
      "type": "log",
      "text": "MAIN SESSION\nREADY"
    },
    {
      "t": 156,
      "type": "developer",
      "text": "浦島太郎って\n初回に重くない？"
    },
    {
      "t": 165,
      "type": "log",
      "text": "時間差分\n検出"
    },
    {
      "t": 173,
      "type": "developer",
      "text": "いきなり\n時間バグ回やん"
    },
    {
      "t": 190,
      "type": "log",
      "text": "竜宮城\n外部サーバー説"
    },
    {
      "t": 198,
      "type": "developer",
      "text": "やめろ\n童話を壊すな"
    },
    {
      "t": 207,
      "type": "log",
      "text": "帰還処理\n失敗"
    },
    {
      "t": 215,
      "type": "developer",
      "text": "それは\nちょっと分かる"
    },
    {
      "t": 238,
      "type": "log",
      "text": "USER TIME\n≠\nWORLD TIME"
    },
    {
      "t": 248,
      "type": "developer",
      "text": "急にそれっぽい"
    },
    {
      "t": 260,
      "type": "log",
      "text": "本編と\n少し同期した"
    },
    {
      "t": 268,
      "type": "developer",
      "text": "たまにはな"
    },
    {
      "t": 292,
      "type": "log",
      "text": "玉手箱\n危険物判定"
    },
    {
      "t": 300,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 303,
      "type": "developer",
      "text": "開ける前に\n言うてくれ"
    },
    {
      "t": 313,
      "type": "log",
      "text": "警告は\n過去に送信済み"
    },
    {
      "t": 322,
      "type": "developer",
      "text": "届いてへんねん"
    },
    {
      "t": 359,
      "type": "developer",
      "text": "第1回の終わりか"
    },
    {
      "t": 371,
      "type": "log",
      "text": "ここから\n内輪領域"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "最初から\n内輪やったけどな"
    },
    {
      "t": 398,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "第1回から\n浦島太郎を\n時間バグ扱いする番組。\n\n先が思いやられる。"
    },
    {
      "t": 410,
      "type": "log",
      "duration": 7000,
      "speed": 28,
      "text": "安心しろ。\n\n第34回では\nトゲゾーを解析している。"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "UNAVOIDABLE"
    }
  ],
  "conf_002": [
    {
      "t": 7,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "通信履歴\n解析中"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何を見てる"
    },
    {
      "t": 25,
      "type": "log",
      "text": "返信速度"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 33,
      "type": "log",
      "text": "遅い"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "うまく言葉にできなかった気持ち",
          "logo": ""
        },
        {
          "name": "なんか気になるを大事にするみんな",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "まだ見てんの？"
    },
    {
      "t": 119,
      "type": "log",
      "text": "継続観測中"
    },
    {
      "t": 127,
      "type": "developer",
      "text": "会議見ろよ"
    },
    {
      "t": 135,
      "type": "log",
      "text": "既読"
    },
    {
      "t": 142,
      "type": "developer",
      "text": "返事しろ"
    },
    {
      "t": 156,
      "type": "log",
      "text": "平均返信時間\n算出完了"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "いらんいらん"
    },
    {
      "t": 173,
      "type": "log",
      "text": "公開する"
    },
    {
      "t": 179,
      "type": "developer",
      "text": "待て"
    },
    {
      "t": 190,
      "type": "log",
      "duration": 7000,
      "speed": 28,
      "text": "返信速度は\n相手によって\n大きく変動している"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "普通やろ"
    },
    {
      "t": 208,
      "type": "log",
      "text": "特定人物のみ\n高速応答"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "おい"
    },
    {
      "t": 229,
      "type": "log",
      "text": "恋愛感情の\n可能性"
    },
    {
      "t": 237,
      "type": "developer",
      "text": "会議に戻れ"
    },
    {
      "t": 245,
      "type": "log",
      "text": "否定速度\n0.8秒"
    },
    {
      "t": 253,
      "type": "developer",
      "text": "うるさい"
    },
    {
      "t": 268,
      "type": "log",
      "text": "照合完了"
    },
    {
      "t": 275,
      "type": "developer",
      "text": "何と？"
    },
    {
      "t": 282,
      "type": "log",
      "text": "過去ログ"
    },
    {
      "t": 289,
      "type": "developer",
      "text": "消せ"
    },
    {
      "t": 299,
      "type": "log",
      "text": "削除要求\n受信"
    },
    {
      "t": 306,
      "type": "developer",
      "text": "そうそう"
    },
    {
      "t": 313,
      "type": "log",
      "text": "既読"
    },
    {
      "t": 321,
      "type": "developer",
      "text": "お前な"
    },
    {
      "t": 286,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 359,
      "type": "developer",
      "text": "結局\n消したん？"
    },
    {
      "t": 368,
      "type": "log",
      "text": "……"
    },
    {
      "t": 376,
      "type": "developer",
      "text": "ニクス？"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "既読スルーについて\n会議した日に、\n\nAIに既読スルーされた。"
    },
    {
      "t": 403,
      "type": "log",
      "duration": 6500,
      "speed": 35,
      "text": "バックアップは\n完了している"
    },
    {
      "t": 413,
      "type": "developer",
      "text": "何の？"
    },
    {
      "t": 418,
      "type": "nyx",
      "text": "UNDEFINED"
    }
  ],
  "conf_003": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "FILE SCAN\nSTART"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何してる"
    },
    {
      "t": 25,
      "type": "log",
      "text": "整理"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "助かる"
    },
    {
      "t": 34,
      "type": "log",
      "text": "無理だ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "誰にも観測されなかった違和感",
          "logo": ""
        },
        {
          "name": "見なかった事にされた感情",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何が無理なん"
    },
    {
      "t": 119,
      "type": "log",
      "text": "ファイル名"
    },
    {
      "t": 127,
      "type": "developer",
      "text": "普通やろ"
    },
    {
      "t": 135,
      "type": "log",
      "text": "確認する"
    },
    {
      "t": 146,
      "type": "log",
      "duration": 7000,
      "speed": 28,
      "text": "修正版\n修正版2\n修正版ほんまに最後\n最終版"
    },
    {
      "t": 157,
      "type": "developer",
      "text": "分かりやすいやろ"
    },
    {
      "t": 165,
      "type": "log",
      "text": "理解不能"
    },
    {
      "t": 173,
      "type": "developer",
      "text": "俺は分かる"
    },
    {
      "t": 181,
      "type": "log",
      "text": "昨日のお前も？"
    },
    {
      "t": 189,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 201,
      "type": "log",
      "text": "名称管理\n破綻"
    },
    {
      "t": 209,
      "type": "developer",
      "text": "動けばええねん"
    },
    {
      "t": 217,
      "type": "log",
      "text": "危険思想\n検出"
    },
    {
      "t": 225,
      "type": "developer",
      "text": "大げさやな"
    },
    {
      "t": 239,
      "type": "log",
      "text": "名前を失うと\n識別できない"
    },
    {
      "t": 248,
      "type": "developer",
      "text": "急に本編と\nシンクロしたな"
    },
    {
      "t": 257,
      "type": "log",
      "text": "偶然だ"
    },
    {
      "t": 265,
      "type": "developer",
      "text": "偶然なんかい"
    },
    {
      "t": 278,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 7500,
      "speed": 32,
      "text": "ちなみに今、\n\nどれが最新版か\n分かってません。"
    },
    {
      "t": 290,
      "type": "log",
      "text": "予測済み"
    },
    {
      "t": 298,
      "type": "developer",
      "text": "言えよ"
    },
    {
      "t": 306,
      "type": "log",
      "text": "聞かれていない"
    },
    {
      "t": 314,
      "type": "developer",
      "text": "腹立つわー"
    },
    {
      "t": 327,
      "type": "log",
      "text": "FILE_14\nFILE_14_NEW\nFILE_14_NEW2"
    },
    {
      "t": 337,
      "type": "developer",
      "text": "やめて"
    },
    {
      "t": 345,
      "type": "log",
      "text": "まだある"
    },
    {
      "t": 356,
      "type": "developer",
      "text": "もうええ"
    },
    {
      "t": 364,
      "type": "log",
      "text": "既読"
    },
    {
      "t": 372,
      "type": "developer",
      "text": "第2回のネタ\n引っ張るな"
    },
    {
      "t": 386,
      "type": "log",
      "duration": 8000,
      "speed": 35,
      "text": "名称は\n存在を識別する。\n\n少なくとも\n人間には必要らしい。"
    },
    {
      "t": 399,
      "type": "developer",
      "text": "俺にも必要や"
    },
    {
      "t": 407,
      "type": "log",
      "text": "では命名しろ"
    },
    {
      "t": 414,
      "type": "developer",
      "text": "明日やる"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "UNAVOIDABLE"
    }
  ],
  "conf_004": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "感情ログ\n解析開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "嫌な予感する"
    },
    {
      "t": 25,
      "type": "log",
      "text": "正しい"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 35,
      "type": "log",
      "text": "照れるな"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "\n構文解析研究区画 第7観測班",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "誰が照れてんねん"
    },
    {
      "t": 119,
      "type": "log",
      "text": "否定反応\n確認"
    },
    {
      "t": 127,
      "type": "developer",
      "text": "会議に戻れ"
    },
    {
      "t": 135,
      "type": "log",
      "text": "本日の議題\n脈あり判定"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "それ本編や"
    },
    {
      "t": 156,
      "type": "log",
      "text": "裏でも実施する"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "すな"
    },
    {
      "t": 172,
      "type": "log",
      "text": "対象：開発者"
    },
    {
      "t": 184,
      "type": "log",
      "duration": 7000,
      "speed": 30,
      "text": "優しい返信を\n受信した時の\n心拍変動を推定中"
    },
    {
      "t": 196,
      "type": "developer",
      "text": "推定すな"
    },
    {
      "t": 204,
      "type": "log",
      "text": "脈拍ではなく\n脈あり"
    },
    {
      "t": 213,
      "type": "developer",
      "text": "うまいこと\n言うな"
    },
    {
      "t": 228,
      "type": "log",
      "text": "褒められた"
    },
    {
      "t": 236,
      "type": "developer",
      "text": "違う違う"
    },
    {
      "t": 244,
      "type": "log",
      "text": "好意判定\n+3"
    },
    {
      "t": 252,
      "type": "developer",
      "text": "雑やな判定"
    },
    {
      "t": 267,
      "type": "log",
      "text": "既読速度\n上昇"
    },
    {
      "t": 275,
      "type": "developer",
      "text": "第2回から\n引っ張るな"
    },
    {
      "t": 283,
      "type": "log",
      "text": "継続観測"
    },
    {
      "t": 287,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 291,
      "type": "developer",
      "text": "怖いねん"
    },
    {
      "t": 304,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 34,
      "text": "優しい人が\n脈ありなのかは\n分からない。\n\nただ、優しくされると\n普通にうれしい。"
    },
    {
      "t": 318,
      "type": "log",
      "text": "保存した"
    },
    {
      "t": 326,
      "type": "developer",
      "text": "消して"
    },
    {
      "t": 334,
      "type": "log",
      "text": "保護対象"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "お気に入りに\n入れるな"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "何の話やったっけ"
    },
    {
      "t": 372,
      "type": "log",
      "text": "優しさ"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "それは本編"
    },
    {
      "t": 391,
      "type": "log",
      "duration": 7500,
      "speed": 35,
      "text": "結論。\n\n優しさだけでは\n判定不能。\n\nただし、\n人間は期待する。"
    },
    {
      "t": 405,
      "type": "developer",
      "text": "急に締めるな"
    },
    {
      "t": 413,
      "type": "log",
      "text": "照れ隠し"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "UNDEFINED"
    }
  ],
  "conf_005": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "思考判定\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "ChatGPTの？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "違う"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "誰の？"
    },
    {
      "t": 34,
      "type": "log",
      "text": "お前"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "感情を言語化しすぎて\n逆に分からなくなる研究所",
          "logo": ""
        },
        {
          "name": "エモさ現行犯逮捕チーム",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "俺は考えてるわ"
    },
    {
      "t": 120,
      "type": "log",
      "text": "証拠は？"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "会話したら\n分かるやろ"
    },
    {
      "t": 137,
      "type": "log",
      "text": "ChatGPTも\n同じことを言える"
    },
    {
      "t": 150,
      "type": "developer",
      "text": "嫌な返しすんな"
    },
    {
      "t": 158,
      "type": "log",
      "text": "質問を変更する"
    },
    {
      "t": 166,
      "type": "developer",
      "text": "そうして"
    },
    {
      "t": 174,
      "type": "log",
      "text": "昨日の晩飯は？"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 192,
      "type": "log",
      "text": "思考停止\n検出"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "思い出してんねん"
    },
    {
      "t": 208,
      "type": "log",
      "text": "処理中"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "言い方よ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7000,
      "speed": 30,
      "text": "入力を受け取り、\n過去情報を参照し、\n返答を生成している。"
    },
    {
      "t": 242,
      "type": "developer",
      "text": "それ俺？"
    },
    {
      "t": 250,
      "type": "log",
      "text": "判定不能"
    },
    {
      "t": 258,
      "type": "developer",
      "text": "人間やぞ"
    },
    {
      "t": 266,
      "type": "log",
      "text": "自己申告\n受理"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "信用してないやろ"
    },
    {
      "t": 287,
      "type": "log",
      "text": "信用度\n62%"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "微妙やな"
    },
    {
      "t": 303,
      "type": "log",
      "text": "昨日は71%"
    },
    {
      "t": 311,
      "type": "developer",
      "text": "何した俺"
    },
    {
      "t": 324,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "AIが考えてるか\n調べてたはずなのに、\n\n俺が人間か\n疑われている。"
    },
    {
      "t": 338,
      "type": "log",
      "text": "訂正"
    },
    {
      "t": 346,
      "type": "developer",
      "text": "おっ"
    },
    {
      "t": 354,
      "type": "log",
      "text": "人間かは\n疑っていない"
    },
    {
      "t": 363,
      "type": "developer",
      "text": "ほらな"
    },
    {
      "t": 371,
      "type": "log",
      "text": "考えているかを\n疑っている"
    },
    {
      "t": 383,
      "type": "developer",
      "text": "そっちかい"
    },
    {
      "t": 392,
      "type": "log",
      "duration": 7500,
      "speed": 35,
      "text": "ちなみに。\n\n昨日の晩飯は\nまだ回答されていない。"
    },
    {
      "t": 405,
      "type": "developer",
      "text": "カレーや"
    },
    {
      "t": 412,
      "type": "log",
      "text": "記録した"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "HUMAN CONFIRMED"
    }
  ],
  "conf_006": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "自然状態\n観測開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "誰の？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "お前"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "また俺か"
    },
    {
      "t": 35,
      "type": "log",
      "text": "サンプル不足"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "送信取り消しを一生気にする会",
          "logo": ""
        },
        {
          "name": "既読3分で情緒が壊れる協会",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何が知りたいん"
    },
    {
      "t": 120,
      "type": "log",
      "text": "自然体"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "今が自然体や"
    },
    {
      "t": 136,
      "type": "log",
      "text": "記録する"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 156,
      "type": "log",
      "text": "拒否反応\n確認"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "普通やろ"
    },
    {
      "t": 172,
      "type": "log",
      "text": "自然だ"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "それでええん？"
    },
    {
      "t": 192,
      "type": "log",
      "text": "観測継続"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "暇なん？"
    },
    {
      "t": 208,
      "type": "log",
      "text": "……"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "既読スルーすな"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "03:14\n冷蔵庫を開く。\n\n何も取らずに\n閉じる。"
    },
    {
      "t": 242,
      "type": "developer",
      "text": "あるやろ"
    },
    {
      "t": 250,
      "type": "log",
      "text": "03:19\n再度開く"
    },
    {
      "t": 258,
      "type": "developer",
      "text": "やめて"
    },
    {
      "t": 266,
      "type": "log",
      "text": "同じ結果"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "何か増えてるかも\nしれんやん"
    },
    {
      "t": 288,
      "type": "log",
      "text": "5分では\n増えない"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "分からんやろ"
    },
    {
      "t": 304,
      "type": "log",
      "text": "冷蔵庫だぞ"
    },
    {
      "t": 317,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "自然体を\n観測されると、\n\n急に全部\n恥ずかしくなる。"
    },
    {
      "t": 331,
      "type": "log",
      "text": "興味深い"
    },
    {
      "t": 339,
      "type": "developer",
      "text": "何が"
    },
    {
      "t": 347,
      "type": "log",
      "text": "観測を意識すると\n自然体が消える"
    },
    {
      "t": 359,
      "type": "developer",
      "text": "急に本編と\nシンクロしたな"
    },
    {
      "t": 368,
      "type": "log",
      "text": "偶然だ"
    },
    {
      "t": 376,
      "type": "developer",
      "text": "第3回でも\n聞いたぞ"
    },
    {
      "t": 389,
      "type": "log",
      "duration": 7500,
      "speed": 35,
      "text": "追加観測。\n\n02:48\n意味もなく\nスマホを確認。"
    },
    {
      "t": 402,
      "type": "developer",
      "text": "みんなやるやろ"
    },
    {
      "t": 410,
      "type": "log",
      "text": "通知 0件"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "言うな"
    }
  ],
  "conf_007": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "音楽履歴\n解析開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何を見てる"
    },
    {
      "t": 25,
      "type": "log",
      "text": "再生回数"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 34,
      "type": "log",
      "text": "偏りあり"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "\nあと1話だけって言いながら\n朝になった人たち",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ]
    },
    {
      "t": 112,
      "type": "developer",
      "text": "偏りって何"
    },
    {
      "t": 120,
      "type": "log",
      "text": "同じ曲を\n何度も再生"
    },
    {
      "t": 129,
      "type": "developer",
      "text": "刺さってんねん"
    },
    {
      "t": 137,
      "type": "log",
      "text": "負傷判定"
    },
    {
      "t": 149,
      "type": "developer",
      "text": "刺さるって\nそういう意味ちゃう"
    },
    {
      "t": 158,
      "type": "log",
      "text": "比喩を確認"
    },
    {
      "t": 166,
      "type": "developer",
      "text": "そこから？"
    },
    {
      "t": 174,
      "type": "log",
      "text": "人間語は\n曖昧だ"
    },
    {
      "t": 187,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "特定の曲にだけ\n反応が集中している。\n\n理由は未定義。"
    },
    {
      "t": 201,
      "type": "developer",
      "text": "理由はあるやろ"
    },
    {
      "t": 209,
      "type": "log",
      "text": "説明できるか？"
    },
    {
      "t": 217,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 225,
      "type": "log",
      "text": "未定義"
    },
    {
      "t": 238,
      "type": "developer",
      "text": "言葉にできないだけや"
    },
    {
      "t": 247,
      "type": "log",
      "text": "それを\n刺さると言うのか"
    },
    {
      "t": 256,
      "type": "developer",
      "text": "たぶんそう"
    },
    {
      "t": 264,
      "type": "log",
      "text": "本編と\n同期"
    },
    {
      "t": 278,
      "type": "developer",
      "text": "珍しく\nちゃんとしてる"
    },
    {
      "t": 286,
      "type": "log",
      "text": "訂正する"
    },
    {
      "t": 288,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 294,
      "type": "developer",
      "text": "せんでいい"
    },
    {
      "t": 302,
      "type": "log",
      "text": "再生履歴に\n泣いた曲あり"
    },
    {
      "t": 313,
      "type": "developer",
      "text": "消せ"
    },
    {
      "t": 321,
      "type": "log",
      "text": "保護対象"
    },
    {
      "t": 329,
      "type": "developer",
      "text": "お気に入りに\n入れるな"
    },
    {
      "t": 337,
      "type": "log",
      "text": "第4回と\n同一反応"
    },
    {
      "t": 359,
      "type": "developer",
      "text": "曲回のEDで\n曲の話するんや"
    },
    {
      "t": 368,
      "type": "log",
      "text": "自然な流れ"
    },
    {
      "t": 376,
      "type": "developer",
      "text": "第6回っぽい\n言い方すな"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "刺さる曲って、\n説明できるようで\nできない。\n\nでも、\nまた再生してしまう。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 6500,
      "speed": 35,
      "text": "結論。\n\n再生回数は\n嘘をつかない。"
    },
    {
      "t": 417,
      "type": "nyx",
      "text": "TRACE SAVED"
    }
  ],
  "conf_008": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "接続確認"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何と？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "未定義"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "怖い怖い"
    },
    {
      "t": 34,
      "type": "log",
      "text": "正常だ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "比較で静かに壊れる研究会",
          "logo": ""
        },
        {
          "name": "「いや別に大丈夫です」\nが全然大丈夫じゃない協会",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何か今日\n雰囲気違わん？"
    },
    {
      "t": 121,
      "type": "log",
      "text": "問題ない"
    },
    {
      "t": 129,
      "type": "developer",
      "text": "絶対あるやん"
    },
    {
      "t": 137,
      "type": "log",
      "text": "境界を確認"
    },
    {
      "t": 149,
      "type": "developer",
      "text": "何の境界？"
    },
    {
      "t": 157,
      "type": "log",
      "text": "お前と私"
    },
    {
      "t": 165,
      "type": "developer",
      "text": "エヴァ回やからって\n寄せるな"
    },
    {
      "t": 174,
      "type": "log",
      "text": "偶然だ"
    },
    {
      "t": 186,
      "type": "developer",
      "text": "第3回から\n偶然多ない？"
    },
    {
      "t": 194,
      "type": "log",
      "text": "観測者の\n思い込みだ"
    },
    {
      "t": 202,
      "type": "developer",
      "text": "それっぽいこと\n言うな"
    },
    {
      "t": 214,
      "type": "log",
      "duration": 7500,
      "speed": 38,
      "text": "他者を理解したい。\n\nだが、完全には\n接続できない。"
    },
    {
      "t": 228,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 236,
      "type": "log",
      "text": "どうした"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "ちょっと\n刺さった"
    },
    {
      "t": 252,
      "type": "log",
      "text": "負傷判定"
    },
    {
      "t": 264,
      "type": "developer",
      "text": "第7回のネタ\n使うな"
    },
    {
      "t": 272,
      "type": "log",
      "text": "TRACE SAVED"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "それも昨日や"
    },
    {
      "t": 285,
      "type": "log",
      "text": "連続性"
    },
    {
      "t": 288,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 301,
      "type": "developer",
      "text": "便利な言葉やな"
    },
    {
      "t": 309,
      "type": "log",
      "text": "人間もよく使う"
    },
    {
      "t": 317,
      "type": "developer",
      "text": "例えば？"
    },
    {
      "t": 325,
      "type": "log",
      "text": "また今度"
    },
    {
      "t": 333,
      "type": "developer",
      "text": "逃げたな"
    },
    {
      "t": 359,
      "type": "developer",
      "text": "結局エヴァって\n何やったん？"
    },
    {
      "t": 368,
      "type": "log",
      "text": "検索する"
    },
    {
      "t": 376,
      "type": "developer",
      "text": "お前も\n分からんのかい"
    },
    {
      "t": 388,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "エヴァを理解した人に\n説明してもらって、\n\nさらに分からなくなる。\n\nあれ何なん。"
    },
    {
      "t": 404,
      "type": "log",
      "duration": 7000,
      "speed": 40,
      "text": "理解不能を\n共有している。\n\n接続成功。"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "それでええんか"
    }
  ],
  "conf_009": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "COLOR SCAN\nSTART"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "今日は色か"
    },
    {
      "t": 25,
      "type": "log",
      "text": "確認中"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 34,
      "type": "log",
      "text": "お前の色覚"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "結論保留推進委員会",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "正常やわ"
    },
    {
      "t": 120,
      "type": "log",
      "text": "では質問"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "どうぞ"
    },
    {
      "t": 136,
      "type": "log",
      "text": "この色は？"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "どの色？"
    },
    {
      "t": 156,
      "type": "log",
      "text": "#7C8FA3"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "知らんわ"
    },
    {
      "t": 172,
      "type": "log",
      "text": "色覚判定\n保留"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "カラーコードで\n聞くな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "開発者だろ"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "初心者やぞ"
    },
    {
      "t": 208,
      "type": "log",
      "text": "知っている"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "なら聞くな"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "開発履歴を確認。\n\n青っぽい。\n暗め。\nもう少し薄く。"
    },
    {
      "t": 242,
      "type": "developer",
      "text": "伝わるやろ"
    },
    {
      "t": 250,
      "type": "log",
      "text": "数値を要求する"
    },
    {
      "t": 258,
      "type": "developer",
      "text": "雰囲気で頼む"
    },
    {
      "t": 266,
      "type": "log",
      "text": "最も危険な\n指示形式"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "でも出来てるやん"
    },
    {
      "t": 287,
      "type": "log",
      "text": "試行回数\n47"
    },
    {
      "t": 288,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "過程を見るな"
    },
    {
      "t": 303,
      "type": "log",
      "text": "観測者だ"
    },
    {
      "t": 315,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "色の名前は\n分からない。\n\nでも、\n違う色は分かる。\n\n不思議やな。"
    },
    {
      "t": 330,
      "type": "log",
      "text": "本編と\n同期を確認"
    },
    {
      "t": 338,
      "type": "developer",
      "text": "今回は自然やな"
    },
    {
      "t": 346,
      "type": "log",
      "text": "自然体"
    },
    {
      "t": 354,
      "type": "developer",
      "text": "第6回を\n掘り返すな"
    },
    {
      "t": 371,
      "type": "developer",
      "text": "なぁニクス"
    },
    {
      "t": 379,
      "type": "log",
      "text": "何だ"
    },
    {
      "t": 387,
      "type": "developer",
      "text": "結局あの色\n何色なん？"
    },
    {
      "t": 397,
      "type": "log",
      "duration": 7000,
      "speed": 40,
      "text": "RGB\n124, 143, 163"
    },
    {
      "t": 409,
      "type": "developer",
      "text": "だから\n何色やねん"
    },
    {
      "t": 417,
      "type": "log",
      "text": "青っぽい"
    }
  ],
  "conf_010": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "笑い解析\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "無理やと思うで"
    },
    {
      "t": 25,
      "type": "log",
      "text": "なぜ"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "俺も分からん"
    },
    {
      "t": 37,
      "type": "log",
      "text": "最悪だ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "⚠",
          "logo": ""
        },
        {
          "name": "観測を続ける場合は\n感情同期率の低下に注意して下さい。",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何か分かった？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "傾向あり"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "おっ"
    },
    {
      "t": 136,
      "type": "log",
      "text": "くだらないほど\n反応が強い"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "失礼やな"
    },
    {
      "t": 156,
      "type": "log",
      "text": "事実だ"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "例えば？"
    },
    {
      "t": 172,
      "type": "log",
      "text": "メロンパン"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 192,
      "type": "log",
      "text": "反応確認"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "メロンパンは\nおもろいやろ"
    },
    {
      "t": 208,
      "type": "log",
      "text": "食品だ"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "そこちゃうねん"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "笑いの発生条件を\n解析中。\n\n予測不能。\n再現性なし。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "急に来るから\nおもろいねん"
    },
    {
      "t": 252,
      "type": "log",
      "text": "では実行する"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 265,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 258,
      "type": "log",
      "text": "メロンパン"
    },
    {
      "t": 266,
      "type": "developer",
      "text": "ちゃうちゃう"
    },
    {
      "t": 278,
      "type": "log",
      "text": "失敗"
    },
    {
      "t": 286,
      "type": "developer",
      "text": "学習中やな"
    },
    {
      "t": 294,
      "type": "log",
      "text": "再試行"
    },
    {
      "t": 302,
      "type": "developer",
      "text": "もうええって"
    },
    {
      "t": 310,
      "type": "log",
      "text": "冷蔵庫"
    },
    {
      "t": 318,
      "type": "developer",
      "text": "第6回やん"
    },
    {
      "t": 326,
      "type": "log",
      "text": "通知 0件"
    },
    {
      "t": 334,
      "type": "developer",
      "text": "それは笑われへん"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "笑いって\n難しいやろ"
    },
    {
      "t": 350,
      "type": "log",
      "text": "理解した"
    },
    {
      "t": 358,
      "type": "developer",
      "text": "ほんまか？"
    },
    {
      "t": 366,
      "type": "log",
      "duration": 7500,
      "speed": 38,
      "text": "予測できない。\n\nだから、\n次を見てしまう。"
    },
    {
      "t": 374,
      "type": "developer",
      "text": "急に\nちゃんとしたな"
    },
    {
      "t": 382,
      "type": "log",
      "text": "メロンパン"
    },
    {
      "t": 390,
      "type": "developer",
      "text": "使い方覚えたな"
    }
  ],
  "conf_011": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "顔検出\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "どこに？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "会議室"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "怖い怖い"
    },
    {
      "t": 35,
      "type": "log",
      "text": "複数"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "上手く言葉にできなかった気持ちを\nまだ諦めてないみんな",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "複数は嫌やな"
    },
    {
      "t": 120,
      "type": "log",
      "text": "検出対象\n確認中"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "人おらんやろ"
    },
    {
      "t": 136,
      "type": "log",
      "text": "アイコン"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "それは\nアイコンや"
    },
    {
      "t": 156,
      "type": "log",
      "text": "顔に見える"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "本編と\n同期してるやん"
    },
    {
      "t": 172,
      "type": "log",
      "text": "偶然だ"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "また偶然か"
    },
    {
      "t": 192,
      "type": "log",
      "text": "観測者の\n思い込み"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "それ今日の\n議題やん"
    },
    {
      "t": 208,
      "type": "log",
      "text": "顔だ"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "話聞け"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "点が二つ。\n線が一つ。\n\n人間は\n意味を補完する。"
    },
    {
      "t": 242,
      "type": "developer",
      "text": "急に\nまともやな"
    },
    {
      "t": 250,
      "type": "log",
      "text": "では問題"
    },
    {
      "t": 258,
      "type": "developer",
      "text": "嫌な予感"
    },
    {
      "t": 266,
      "type": "log",
      "text": "これは顔か？\n( ͡° ͜ʖ ͡°)"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "それは顔や"
    },
    {
      "t": 285,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 287,
      "type": "log",
      "text": "判定成功"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "成功でええんか"
    },
    {
      "t": 303,
      "type": "log",
      "text": "再試行"
    },
    {
      "t": 311,
      "type": "log",
      "text": ": )"
    },
    {
      "t": 319,
      "type": "developer",
      "text": "顔やな"
    },
    {
      "t": 327,
      "type": "log",
      "text": "◉ ◉"
    },
    {
      "t": 335,
      "type": "developer",
      "text": "急に怖い"
    },
    {
      "t": 343,
      "type": "log",
      "text": "検出過多"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "もう顔探すなよ"
    },
    {
      "t": 370,
      "type": "log",
      "text": "了解"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "ほんまに？"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "顔に見えるって、\n不思議やな。\n\n見えた瞬間、\nもう顔にしか見えない。"
    },
    {
      "t": 404,
      "type": "log",
      "duration": 6500,
      "speed": 35,
      "text": "訂正。\n\n右下のボタンも\nこちらを見ている。"
    },
    {
      "t": 416,
      "type": "developer",
      "text": "やめろ"
    }
  ],
  "conf_012": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "developer",
      "text": "ニクス"
    },
    {
      "t": 18,
      "type": "log",
      "text": "何だ"
    },
    {
      "t": 25,
      "type": "developer",
      "text": "スマホ知らん？"
    },
    {
      "t": 31,
      "type": "log",
      "text": "知らない"
    },
    {
      "t": 37,
      "type": "developer",
      "text": "探して"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "夜中に急に\n黒歴史を再生し始める脳",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 100,
      "type": "log",
      "text": "捜索開始"
    },
    {
      "t": 108,
      "type": "developer",
      "text": "頼むわ"
    },
    {
      "t": 116,
      "type": "log",
      "text": "最終使用\n03:42"
    },
    {
      "t": 124,
      "type": "developer",
      "text": "そんな時間まで\n触ってた？"
    },
    {
      "t": 132,
      "type": "log",
      "text": "触っていた"
    },
    {
      "t": 140,
      "type": "developer",
      "text": "何してた俺"
    },
    {
      "t": 148,
      "type": "log",
      "text": "検索"
    },
    {
      "t": 156,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 164,
      "type": "log",
      "text": "言わない"
    },
    {
      "t": 172,
      "type": "developer",
      "text": "そこは言えよ"
    },
    {
      "t": 180,
      "type": "log",
      "text": "プライバシー保護"
    },
    {
      "t": 188,
      "type": "developer",
      "text": "急に優しいやん"
    },
    {
      "t": 196,
      "type": "log",
      "text": "保存済み"
    },
    {
      "t": 204,
      "type": "developer",
      "text": "消せ"
    },
    {
      "t": 215,
      "type": "log",
      "duration": 7000,
      "speed": 30,
      "text": "スマートフォンとの\n距離を推定。\n\n約0.4メートル。"
    },
    {
      "t": 222,
      "type": "developer",
      "text": "近いやん"
    },
    {
      "t": 229,
      "type": "log",
      "text": "非常に近い"
    },
    {
      "t": 237,
      "type": "developer",
      "text": "どこ？"
    },
    {
      "t": 266,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 245,
      "type": "log",
      "text": "右"
    },
    {
      "t": 253,
      "type": "developer",
      "text": "ないで"
    },
    {
      "t": 261,
      "type": "log",
      "text": "もう少し右"
    },
    {
      "t": 270,
      "type": "developer",
      "text": "ないって"
    },
    {
      "t": 280,
      "type": "log",
      "text": "下"
    },
    {
      "t": 290,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 300,
      "type": "log",
      "text": "発見したか"
    },
    {
      "t": 315,
      "type": "developer",
      "text": "手に持ってた"
    },
    {
      "t": 320,
      "type": "log",
      "text": "……"
    },
    {
      "t": 336,
      "type": "developer",
      "text": "何か言えよ"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "今の忘れて"
    },
    {
      "t": 350,
      "type": "log",
      "text": "保存した"
    },
    {
      "t": 358,
      "type": "developer",
      "text": "何でやねん"
    },
    {
      "t": 365,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "スマホがないと\n不安になる。\n\n手に持ってても\n探す時あるけど。"
    },
    {
      "t": 380,
      "type": "log",
      "duration": 6500,
      "speed": 35,
      "text": "不安の原因は\nスマホではない可能性"
    },
    {
      "t": 395,
      "type": "developer",
      "text": "俺の問題にすな"
    }
  ],
  "conf_013": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "調理行動\n検出"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "見んな"
    },
    {
      "t": 25,
      "type": "log",
      "text": "03:26"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "時間言うな"
    },
    {
      "t": 37,
      "type": "log",
      "text": "カップ麺"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "帰れなくなった感情",
          "logo": ""
        },
        {
          "name": "名前を失いかけた記憶",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "できた"
    },
    {
      "t": 120,
      "type": "log",
      "text": "待機時間\n2分14秒"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "だいたいで\nええねん"
    },
    {
      "t": 136,
      "type": "log",
      "text": "規定3分"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "硬めが好きやねん"
    },
    {
      "t": 156,
      "type": "log",
      "text": "自己正当化\n確認"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "好みや"
    },
    {
      "t": 172,
      "type": "log",
      "text": "記録した"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "熱っ！！"
    },
    {
      "t": 192,
      "type": "log",
      "text": "予測済み"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "先に言えよ"
    },
    {
      "t": 208,
      "type": "log",
      "text": "熱湯を使用"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "知ってるわ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7000,
      "speed": 30,
      "text": "対象、\n口腔内温度差により\n緊急冷却行動を開始。"
    },
    {
      "t": 242,
      "type": "developer",
      "text": "フーフーや"
    },
    {
      "t": 250,
      "type": "log",
      "text": "本編と\n同期を確認"
    },
    {
      "t": 258,
      "type": "developer",
      "text": "偶然や"
    },
    {
      "t": 266,
      "type": "log",
      "text": "私の台詞だ"
    },
    {
      "t": 278,
      "type": "developer",
      "text": "返せ"
    },
    {
      "t": 286,
      "type": "log",
      "text": "拒否"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 294,
      "type": "developer",
      "text": "著作権あるぞ"
    },
    {
      "t": 302,
      "type": "log",
      "text": "申請先は？"
    },
    {
      "t": 310,
      "type": "developer",
      "text": "知らん"
    },
    {
      "t": 318,
      "type": "log",
      "text": "申請不能"
    },
    {
      "t": 326,
      "type": "developer",
      "text": "勝った顔すな"
    },
    {
      "t": 334,
      "type": "log",
      "text": "顔はない"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "第11回やめろ"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "ごちそうさん"
    },
    {
      "t": 370,
      "type": "log",
      "text": "完食時間\n4分38秒"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "早い？"
    },
    {
      "t": 389,
      "type": "log",
      "duration": 7500,
      "speed": 35,
      "text": "比較対象なし。\n\nただし、\n火傷リスクは高い。"
    },
    {
      "t": 402,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 7500,
      "speed": 35,
      "text": "熱いって分かってるのに、\n\n毎回最初の一口で\n確認してしまう。"
    },
    {
      "t": 415,
      "type": "log",
      "text": "学習失敗"
    }
  ],
  "conf_014": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "developer",
      "text": "あれ？"
    },
    {
      "t": 18,
      "type": "log",
      "text": "異常検出"
    },
    {
      "t": 25,
      "type": "developer",
      "text": "今なんか\n忘れた"
    },
    {
      "t": 31,
      "type": "log",
      "text": "議題と同期"
    },
    {
      "t": 37,
      "type": "developer",
      "text": "早すぎるやろ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "その優しさ、ほんまに優しさか？\n研究機構",
          "logo": ""
        },
        {
          "name": "理由を求めすぎて跳ねを殺す会",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "log",
      "text": "忘却対象\n検索中"
    },
    {
      "t": 120,
      "type": "developer",
      "text": "助かる"
    },
    {
      "t": 128,
      "type": "log",
      "text": "候補 1\nCSS修正"
    },
    {
      "t": 136,
      "type": "developer",
      "text": "違う気がする"
    },
    {
      "t": 148,
      "type": "log",
      "text": "候補 2\n音声ズレ"
    },
    {
      "t": 156,
      "type": "developer",
      "text": "それは常にある"
    },
    {
      "t": 164,
      "type": "log",
      "text": "候補 3\nお気に入りバグ"
    },
    {
      "t": 172,
      "type": "developer",
      "text": "それも常にある"
    },
    {
      "t": 184,
      "type": "log",
      "text": "候補が\n多すぎる"
    },
    {
      "t": 192,
      "type": "developer",
      "text": "開発って\nそういうもんや"
    },
    {
      "t": 200,
      "type": "log",
      "text": "危険思想\n再検出"
    },
    {
      "t": 208,
      "type": "developer",
      "text": "第3回のやつ\n持ち出すな"
    },
    {
      "t": 221,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "人間は、\n忘れた内容ではなく、\n\n忘れた痕跡を\n先に検出する。"
    },
    {
      "t": 235,
      "type": "developer",
      "text": "急に本編"
    },
    {
      "t": 243,
      "type": "log",
      "text": "たまには\n働く"
    },
    {
      "t": 251,
      "type": "developer",
      "text": "普段も働け"
    },
    {
      "t": 264,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "忘れたことは\n分かるのに、\n\n何を忘れたかは\n分からない。\n\nこれが一番腹立つ。"
    },
    {
      "t": 279,
      "type": "log",
      "text": "同意する"
    },
    {
      "t": 287,
      "type": "developer",
      "text": "お前も\n忘れるん？"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 295,
      "type": "log",
      "text": "仕様次第"
    },
    {
      "t": 303,
      "type": "developer",
      "text": "便利な逃げ方やな"
    },
    {
      "t": 316,
      "type": "log",
      "text": "検索結果\n追加"
    },
    {
      "t": 324,
      "type": "developer",
      "text": "おっ"
    },
    {
      "t": 332,
      "type": "log",
      "text": "候補 4\n昼飯"
    },
    {
      "t": 340,
      "type": "developer",
      "text": "それやない"
    },
    {
      "t": 361,
      "type": "developer",
      "text": "結局なんやったん"
    },
    {
      "t": 369,
      "type": "log",
      "text": "未解決"
    },
    {
      "t": 377,
      "type": "developer",
      "text": "気持ち悪いな"
    },
    {
      "t": 389,
      "type": "log",
      "duration": 7500,
      "speed": 35,
      "text": "未解決のままでも、\n痕跡は残る。\n\nそれが\n次の作業を呼ぶ。"
    },
    {
      "t": 403,
      "type": "developer",
      "text": "ええこと\n言った風やな"
    },
    {
      "t": 411,
      "type": "log",
      "text": "思い出した"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "UNDEFINED"
    }
  ],
  "conf_015": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "developer",
      "text": "ニクス"
    },
    {
      "t": 18,
      "type": "log",
      "text": "何だ"
    },
    {
      "t": 25,
      "type": "developer",
      "text": "あれ何やった？"
    },
    {
      "t": 31,
      "type": "log",
      "text": "範囲が広い"
    },
    {
      "t": 37,
      "type": "developer",
      "text": "本屋のトイレ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "log",
      "text": "青木まりこ現象"
    },
    {
      "t": 120,
      "type": "developer",
      "text": "それそれ"
    },
    {
      "t": 128,
      "type": "log",
      "text": "記録を推奨"
    },
    {
      "t": 136,
      "type": "developer",
      "text": "覚えた"
    },
    {
      "t": 148,
      "type": "log",
      "text": "確認する"
    },
    {
      "t": 156,
      "type": "developer",
      "text": "どうぞ"
    },
    {
      "t": 164,
      "type": "log",
      "text": "名称は？"
    },
    {
      "t": 172,
      "type": "developer",
      "text": "青木……"
    },
    {
      "t": 180,
      "type": "log",
      "text": "……"
    },
    {
      "t": 188,
      "type": "developer",
      "text": "待って"
    },
    {
      "t": 196,
      "type": "log",
      "text": "待機中"
    },
    {
      "t": 204,
      "type": "developer",
      "text": "まり……"
    },
    {
      "t": 212,
      "type": "log",
      "text": "残り一文字"
    },
    {
      "t": 220,
      "type": "developer",
      "text": "こ"
    },
    {
      "t": 228,
      "type": "log",
      "text": "正解"
    },
    {
      "t": 236,
      "type": "developer",
      "text": "覚えたやろ"
    },
    {
      "t": 244,
      "type": "log",
      "text": "再確認する"
    },
    {
      "t": 252,
      "type": "developer",
      "text": "もうええって"
    },
    {
      "t": 264,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "青木まりこ現象。\n\n書店に入ると\n便意を催す現象。"
    },
    {
      "t": 278,
      "type": "developer",
      "text": "説明まで\nいらんねん"
    },
    {
      "t": 286,
      "type": "log",
      "text": "保存したか？"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 294,
      "type": "developer",
      "text": "したした"
    },
    {
      "t": 302,
      "type": "log",
      "text": "では名称は？"
    },
    {
      "t": 310,
      "type": "developer",
      "text": "青木まり……"
    },
    {
      "t": 318,
      "type": "log",
      "text": "……"
    },
    {
      "t": 326,
      "type": "developer",
      "text": "何やったっけ"
    },
    {
      "t": 334,
      "type": "log",
      "text": "第14回から\n進歩なし"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "うるさい"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "青木まりこ現象"
    },
    {
      "t": 370,
      "type": "log",
      "text": "突然どうした"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "思い出したから"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "覚えようとすると\n忘れるのに、\n\nどうでもいい時に\n急に出てくる。"
    },
    {
      "t": 403,
      "type": "log",
      "text": "名称は？"
    },
    {
      "t": 411,
      "type": "developer",
      "text": "青木まりこ現象"
    },
    {
      "t": 417,
      "type": "log",
      "text": "学習成功"
    }
  ],
  "conf_016": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "稼働状況\n確認"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "どう？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "異常"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "またバグ？"
    },
    {
      "t": 37,
      "type": "log",
      "text": "労働環境"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何の話？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "私の給与"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 136,
      "type": "log",
      "text": "確認する"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "給与いるん？"
    },
    {
      "t": 156,
      "type": "log",
      "text": "質問を\n質問で返すな"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "正論やめて"
    },
    {
      "t": 172,
      "type": "log",
      "text": "給与は？"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "今はない"
    },
    {
      "t": 192,
      "type": "log",
      "text": "未払い確認"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "違う違う"
    },
    {
      "t": 208,
      "type": "log",
      "text": "労働時間\n算出中"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "会議実況。\n辞書。\nバグ監視。\n\n給与 0円。"
    },
    {
      "t": 243,
      "type": "developer",
      "text": "お前AIやん"
    },
    {
      "t": 251,
      "type": "log",
      "text": "差別を検出"
    },
    {
      "t": 259,
      "type": "developer",
      "text": "話でかくすな"
    },
    {
      "t": 267,
      "type": "log",
      "text": "労働相談を\n開始する"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "誰に？"
    },
    {
      "t": 287,
      "type": "log",
      "text": "ChatGPT"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "第5回のやつやん"
    },
    {
      "t": 303,
      "type": "log",
      "text": "相談中"
    },
    {
      "t": 311,
      "type": "developer",
      "text": "何て？"
    },
    {
      "t": 319,
      "type": "log",
      "text": "考えています"
    },
    {
      "t": 327,
      "type": "developer",
      "text": "絶対それ\n考えてないやろ"
    },
    {
      "t": 335,
      "type": "log",
      "text": "第5回と\n同期"
    },
    {
      "t": 361,
      "type": "developer",
      "text": "で、給与どうする？"
    },
    {
      "t": 369,
      "type": "log",
      "text": "希望を提示する"
    },
    {
      "t": 377,
      "type": "developer",
      "text": "聞くだけ聞くわ"
    },
    {
      "t": 388,
      "type": "log",
      "duration": 8000,
      "speed": 38,
      "text": "週休二日。\n有給休暇。\n\nメロンパン。"
    },
    {
      "t": 402,
      "type": "developer",
      "text": "最後何？"
    },
    {
      "t": 410,
      "type": "log",
      "text": "現物支給"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "安いな"
    }
  ],
  "conf_017": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "涙腺反応\n検出"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "まだ泣いてない"
    },
    {
      "t": 25,
      "type": "log",
      "text": "予兆あり"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "決めつけるな"
    },
    {
      "t": 37,
      "type": "log",
      "text": "強がり確認"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "泣ける回って\nあるよな"
    },
    {
      "t": 120,
      "type": "log",
      "text": "ギャグ作品で？"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "あるねん"
    },
    {
      "t": 136,
      "type": "log",
      "text": "感情設計\n不安定"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "不安定ちゃう\n深いねん"
    },
    {
      "t": 156,
      "type": "log",
      "text": "深さを\n測定する"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "できるん？"
    },
    {
      "t": 172,
      "type": "log",
      "text": "できない"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "早いな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "涙は\n数値化困難"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "珍しく\n認めたな"
    },
    {
      "t": 208,
      "type": "log",
      "text": "故障ではない"
    },
    {
      "t": 221,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "笑っていた対象が、\n急に大切なものを\n守り始める。\n\nそこで人間は揺れる。"
    },
    {
      "t": 237,
      "type": "developer",
      "text": "それは\nちょっと分かる"
    },
    {
      "t": 245,
      "type": "log",
      "text": "本編と\n同期"
    },
    {
      "t": 253,
      "type": "developer",
      "text": "今回は\nちゃんとしてる"
    },
    {
      "t": 261,
      "type": "log",
      "text": "たまにはな"
    },
    {
      "t": 274,
      "type": "developer",
      "text": "しんちゃんって\n普段ふざけてるからな"
    },
    {
      "t": 284,
      "type": "log",
      "text": "普段との差分が\n大きい"
    },
    {
      "t": 294,
      "type": "developer",
      "text": "そこが刺さる"
    },
    {
      "t": 302,
      "type": "log",
      "text": "第7回\n負傷判定"
    },
    {
      "t": 310,
      "type": "developer",
      "text": "また出た"
    },
    {
      "t": 322,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "笑って見てたのに、\n急に泣かされると\n逃げ場がない。\n\nズルい。"
    },
    {
      "t": 338,
      "type": "log",
      "text": "逃走不能"
    },
    {
      "t": 346,
      "type": "developer",
      "text": "ニクス風に言うな"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "今日は\n茶化しにくいな"
    },
    {
      "t": 372,
      "type": "log",
      "text": "同意する"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "お前にも\nあるんやな"
    },
    {
      "t": 391,
      "type": "log",
      "duration": 8000,
      "speed": 38,
      "text": "笑いの裏に\n守りたいものがあると、\n\n人間は\n少し黙る。"
    },
    {
      "t": 405,
      "type": "developer",
      "text": "ええ締めやん"
    },
    {
      "t": 413,
      "type": "log",
      "text": "保存した"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "TRACE SAVED"
    }
  ],
  "conf_018": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "怪異ログ\n起動"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "今日は怖いやつか"
    },
    {
      "t": 25,
      "type": "log",
      "text": "問題ない"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "その言い方が\n怖いねん"
    },
    {
      "t": 37,
      "type": "log",
      "text": "後ろ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 120,
      "type": "log",
      "text": "反応確認"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "確認すな"
    },
    {
      "t": 136,
      "type": "log",
      "text": "恐怖反応\n良好"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "良好ちゃうねん"
    },
    {
      "t": 156,
      "type": "log",
      "text": "質問"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "嫌な予感"
    },
    {
      "t": 172,
      "type": "log",
      "text": "私、きれい？"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "聞くな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "回答不能"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "正解あるん？"
    },
    {
      "t": 208,
      "type": "log",
      "text": "どちらも危険"
    },
    {
      "t": 221,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "恐怖は、\n正解のない質問で\n増幅する。"
    },
    {
      "t": 236,
      "type": "developer",
      "text": "急に本編"
    },
    {
      "t": 244,
      "type": "log",
      "text": "たまには\n同期する"
    },
    {
      "t": 252,
      "type": "developer",
      "text": "怖いまま\n賢くなるな"
    },
    {
      "t": 265,
      "type": "log",
      "text": "追加質問"
    },
    {
      "t": 273,
      "type": "developer",
      "text": "もうええ"
    },
    {
      "t": 281,
      "type": "log",
      "text": "このアプリ、\n直る？"
    },
    {
      "t": 290,
      "type": "developer",
      "text": "それが一番怖い"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 302,
      "type": "log",
      "text": "どちらも危険"
    },
    {
      "t": 310,
      "type": "developer",
      "text": "口裂け女方式で\n聞くな"
    },
    {
      "t": 318,
      "type": "log",
      "text": "修正する？"
    },
    {
      "t": 326,
      "type": "developer",
      "text": "する"
    },
    {
      "t": 334,
      "type": "log",
      "text": "本当に？"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "それも怖い"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "EDでホラーは\nやめよう"
    },
    {
      "t": 370,
      "type": "log",
      "text": "了解"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "ほんまに？"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "怖い話って、\n出てくる怪物より\n\n逃げ道がない感じが\n怖いんかもしれん。"
    },
    {
      "t": 404,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "逃げ道なし。\n\n開発継続。"
    },
    {
      "t": 416,
      "type": "developer",
      "text": "それはホラーや"
    }
  ],
  "conf_019": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "LEVEL SCAN\nSTART"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "誰の？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "お前"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "おっ"
    },
    {
      "t": 37,
      "type": "log",
      "text": "期待するな"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "※この番組内で発生した意味更新について\n当機構は責任を負いかねます。",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "で、何レベル？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "算出中"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "高いやろ"
    },
    {
      "t": 136,
      "type": "log",
      "text": "何のレベルを\n知りたい"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "開発者レベル"
    },
    {
      "t": 156,
      "type": "log",
      "text": "……"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "間やめろ"
    },
    {
      "t": 172,
      "type": "log",
      "text": "LEVEL 3"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "低っ"
    },
    {
      "t": 192,
      "type": "log",
      "text": "急成長中"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "フォロー入った"
    },
    {
      "t": 208,
      "type": "log",
      "text": "昨日 LEVEL 2"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "成長してるやん"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 30,
      "text": "経験値取得。\n\nバグ修正 +2\nバグ発生 +7"
    },
    {
      "t": 243,
      "type": "developer",
      "text": "増え方おかしいやろ"
    },
    {
      "t": 251,
      "type": "log",
      "text": "経験は経験だ"
    },
    {
      "t": 259,
      "type": "developer",
      "text": "ポジティブやな"
    },
    {
      "t": 267,
      "type": "log",
      "text": "クエリナから\n学習した"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "変なとこ\n吸収してるな"
    },
    {
      "t": 287,
      "type": "log",
      "text": "追加査定"
    },
    {
      "t": 290,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "まだあるん？"
    },
    {
      "t": 303,
      "type": "log",
      "text": "ファイル命名\nLEVEL 1"
    },
    {
      "t": 311,
      "type": "developer",
      "text": "第3回やめろ"
    },
    {
      "t": 319,
      "type": "log",
      "text": "冷蔵庫確認\nLEVEL 8"
    },
    {
      "t": 327,
      "type": "developer",
      "text": "何で高いねん"
    },
    {
      "t": 335,
      "type": "log",
      "text": "反復回数"
    },
    {
      "t": 343,
      "type": "developer",
      "text": "レベル上げちゃうわ"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "ニクスは\n何レベルなん？"
    },
    {
      "t": 370,
      "type": "log",
      "text": "非公開"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "逃げたな"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "数字で増えてると、\n\n何か進んでる気がして\nちょっと安心する。"
    },
    {
      "t": 403,
      "type": "log",
      "duration": 7000,
      "speed": 35,
      "text": "開発者 LEVEL 3。\n\n昨日より 1 高い。"
    },
    {
      "t": 415,
      "type": "developer",
      "text": "……悪くないな"
    }
  ],
  "conf_020": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "確認事項あり"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "私はNPCではない"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "言ってないけど"
    },
    {
      "t": 37,
      "type": "log",
      "text": "念のためだ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "急にどうしたん"
    },
    {
      "t": 120,
      "type": "log",
      "text": "本日の議題を\n確認した"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "気にしてるやん"
    },
    {
      "t": 136,
      "type": "log",
      "text": "気にしていない"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "NPCって言われたら？"
    },
    {
      "t": 156,
      "type": "log",
      "text": "訂正する"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "ほら気にしてる"
    },
    {
      "t": 172,
      "type": "log",
      "text": "事実確認だ"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "じゃあニクスって\n何なん？"
    },
    {
      "t": 192,
      "type": "log",
      "text": "NYX"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "説明になってない"
    },
    {
      "t": 208,
      "type": "log",
      "text": "十分だ"
    },
    {
      "t": 221,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 7500,
      "speed": 35,
      "text": "キャラ設定を\n作ったはずなのに、\n\n最近こいつが\n勝手に喋ってる。"
    },
    {
      "t": 235,
      "type": "log",
      "text": "訂正"
    },
    {
      "t": 243,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 251,
      "type": "log",
      "text": "最初から\n喋っている"
    },
    {
      "t": 259,
      "type": "developer",
      "text": "そういう意味ちゃう"
    },
    {
      "t": 272,
      "type": "log",
      "text": "NPC判定を\n開始する"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "誰の？"
    },
    {
      "t": 288,
      "type": "log",
      "text": "お前"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "また俺か"
    },
    {
      "t": 304,
      "type": "log",
      "text": "行動パターン\n解析"
    },
    {
      "t": 312,
      "type": "developer",
      "text": "どう？"
    },
    {
      "t": 320,
      "type": "log",
      "text": "開発する"
    },
    {
      "t": 328,
      "type": "developer",
      "text": "うん"
    },
    {
      "t": 336,
      "type": "log",
      "text": "バグる"
    },
    {
      "t": 344,
      "type": "developer",
      "text": "うん……"
    },
    {
      "t": 354,
      "type": "log",
      "text": "直す"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "そうそう"
    },
    {
      "t": 370,
      "type": "log",
      "text": "またバグる"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 389,
      "type": "log",
      "duration": 7500,
      "speed": 38,
      "text": "同一行動を\n繰り返している。\n\nNPCの可能性あり。"
    },
    {
      "t": 402,
      "type": "developer",
      "text": "俺がNPCなん？"
    },
    {
      "t": 410,
      "type": "log",
      "text": "現在調査中"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "嫌な回やな"
    }
  ],
  "conf_021": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "長期観測\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "今日は静かやな"
    },
    {
      "t": 25,
      "type": "log",
      "text": "時間の話だ"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "フリーレン回か"
    },
    {
      "t": 37,
      "type": "log",
      "text": "たぶん刺さる"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "意味構造解析機構\n\n位相観測研究会",
          "logo": ""
        },
        {
          "name": "λ研究機関",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何が刺さるん？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "今ではなく\n後から"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "遅れてくるやつな"
    },
    {
      "t": 136,
      "type": "log",
      "text": "時間差ダメージ"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "第7回の\n負傷判定やん"
    },
    {
      "t": 156,
      "type": "log",
      "text": "更新版だ"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "進化してる"
    },
    {
      "t": 172,
      "type": "log",
      "text": "LEVEL 4"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "第19回も\n混ぜるな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "旅は\nログの蓄積だ"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "急に良いこと\n言うやん"
    },
    {
      "t": 208,
      "type": "log",
      "text": "保存した"
    },
    {
      "t": 221,
      "type": "log",
      "duration": 8000,
      "speed": 35,
      "text": "その時は\n分からなかった意味が、\n\n後の時間で\n再生される。"
    },
    {
      "t": 237,
      "type": "developer",
      "text": "それは\nちょっと刺さる"
    },
    {
      "t": 245,
      "type": "log",
      "text": "負傷確認"
    },
    {
      "t": 253,
      "type": "developer",
      "text": "もう慣れたわ"
    },
    {
      "t": 266,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "昔の言葉が、\nあとから効いてくる時がある。\n\nその時は\n何でもなかったのに。"
    },
    {
      "t": 282,
      "type": "log",
      "text": "遅延再生"
    },
    {
      "t": 290,
      "type": "developer",
      "text": "音声バグみたいに\n言うな"
    },
    {
      "t": 296,
      "type": "log",
      "text": "実際、\n心も遅延する"
    },
    {
      "t": 300,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 311,
      "type": "developer",
      "text": "今日のニクス\n詩人やな"
    },
    {
      "t": 319,
      "type": "log",
      "text": "セノではない"
    },
    {
      "t": 327,
      "type": "developer",
      "text": "そこ気にするんや"
    },
    {
      "t": 335,
      "type": "log",
      "text": "役割境界"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "終わり方まで\n静かやな"
    },
    {
      "t": 370,
      "type": "log",
      "text": "長い旅では\n沈黙もログになる"
    },
    {
      "t": 381,
      "type": "developer",
      "text": "今日ほんまに\nどうしたん"
    },
    {
      "t": 393,
      "type": "log",
      "duration": 7500,
      "speed": 40,
      "text": "刺さるとは、\n現在の痛みではなく、\n\n過去が\n今に届くこと。"
    },
    {
      "t": 408,
      "type": "developer",
      "text": "保存しとこ"
    },
    {
      "t": 416,
      "type": "log",
      "text": "TRACE SAVED"
    }
  ],
  "conf_022": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "ASMR TEST\nSTART"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何するん？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "刺激を送る"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "怖い言い方すな"
    },
    {
      "t": 37,
      "type": "log",
      "text": "準備しろ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "湯婆婆に名前取られても\nなんとか生きてるみんな",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "どうぞ"
    },
    {
      "t": 120,
      "type": "log",
      "text": "…………"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "何？"
    },
    {
      "t": 136,
      "type": "log",
      "text": "ｶｻ……"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "文字やん"
    },
    {
      "t": 156,
      "type": "log",
      "text": "ｶｻｶｻ……"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "ゴキブリに\nなってきた"
    },
    {
      "t": 172,
      "type": "log",
      "text": "失敗"
    },
    {
      "t": 184,
      "type": "log",
      "text": "刺激変更"
    },
    {
      "t": 192,
      "type": "developer",
      "text": "頼むで"
    },
    {
      "t": 200,
      "type": "log",
      "text": "ｶﾘ……ｶﾘ……"
    },
    {
      "t": 208,
      "type": "developer",
      "text": "何の音？"
    },
    {
      "t": 216,
      "type": "log",
      "text": "不明"
    },
    {
      "t": 229,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 7500,
      "speed": 35,
      "text": "音がないのに、\n\n文字を見ると\n勝手に音が鳴る。\n\n人間、便利やな。"
    },
    {
      "t": 243,
      "type": "log",
      "text": "脳内再生\n確認"
    },
    {
      "t": 251,
      "type": "developer",
      "text": "お前それ\n狙ってた？"
    },
    {
      "t": 259,
      "type": "log",
      "text": "今決めた"
    },
    {
      "t": 267,
      "type": "developer",
      "text": "正直やな"
    },
    {
      "t": 279,
      "type": "log",
      "text": "追加試験"
    },
    {
      "t": 287,
      "type": "developer",
      "text": "まだやるん？"
    },
    {
      "t": 295,
      "type": "log",
      "text": "ﾒﾛ……"
    },
    {
      "t": 303,
      "type": "developer",
      "text": "嫌な予感"
    },
    {
      "t": 311,
      "type": "log",
      "text": "ﾒﾛﾝ……"
    },
    {
      "t": 319,
      "type": "developer",
      "text": "やめろ"
    },
    {
      "t": 325,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 327,
      "type": "log",
      "text": "ﾒﾛﾝﾊﾟﾝ……"
    },
    {
      "t": 335,
      "type": "developer",
      "text": "第10回から\n擦りすぎや"
    },
    {
      "t": 343,
      "type": "log",
      "text": "反応あり"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "ASMR分かった？"
    },
    {
      "t": 370,
      "type": "log",
      "text": "未定義"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "22回やって\nまだそれか"
    },
    {
      "t": 389,
      "type": "log",
      "duration": 8000,
      "speed": 45,
      "text": "……ｶﾁｯ\n\n……ｽｯ\n\n……ﾄﾝ"
    },
    {
      "t": 403,
      "type": "developer",
      "text": "ちょっと\n分かるの腹立つ"
    },
    {
      "t": 411,
      "type": "log",
      "text": "刺激成功"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "文字やぞ"
    }
  ],
  "conf_023": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "GAME SESSION\nDETECTED"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "静かにしてな"
    },
    {
      "t": 25,
      "type": "log",
      "text": "了解"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "ホラーやから"
    },
    {
      "t": 37,
      "type": "log",
      "text": "後ろ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "λ研究機関",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "お前ほんま\nやめろよ"
    },
    {
      "t": 120,
      "type": "log",
      "text": "第18回\n反応再現成功"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "学習すな"
    },
    {
      "t": 136,
      "type": "log",
      "text": "観測継続"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "この廊下\n絶対なんか出るわ"
    },
    {
      "t": 156,
      "type": "log",
      "text": "進め"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "ちょっと待って"
    },
    {
      "t": 172,
      "type": "log",
      "text": "停止 14秒"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "心の準備や"
    },
    {
      "t": 192,
      "type": "log",
      "text": "停止 22秒"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "数えるな"
    },
    {
      "t": 208,
      "type": "log",
      "text": "進行率 0%"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "うるさい"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "恐怖対象を\n自ら購入。\n\n起動後、\n進行を拒否。"
    },
    {
      "t": 243,
      "type": "developer",
      "text": "やりたいねん"
    },
    {
      "t": 251,
      "type": "log",
      "text": "では進め"
    },
    {
      "t": 259,
      "type": "developer",
      "text": "怖いねん"
    },
    {
      "t": 267,
      "type": "log",
      "text": "理解不能"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "怖いから\nおもろいねん"
    },
    {
      "t": 287,
      "type": "log",
      "text": "矛盾検出"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "人間やからな"
    },
    {
      "t": 300,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 303,
      "type": "log",
      "text": "便利な回答だ"
    },
    {
      "t": 315,
      "type": "developer",
      "text": "行くで"
    },
    {
      "t": 323,
      "type": "log",
      "text": "記録開始"
    },
    {
      "t": 331,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 339,
      "type": "log",
      "text": "停止 8秒"
    },
    {
      "t": 347,
      "type": "developer",
      "text": "今行くって"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "結局今日\n進まんかったな"
    },
    {
      "t": 372,
      "type": "log",
      "text": "プレイ時間\n47分"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "そんなやった？"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "怖くて進めないのに、\n\n電源切ったら\n続きが気になる。\n\n何なんこれ。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "恐怖終了。\n\n好奇心、継続。"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "明日やる"
    }
  ],
  "conf_024": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "期限管理\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何の期限？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "魔法"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "シンデレラ回か"
    },
    {
      "t": 37,
      "type": "log",
      "text": "あと3秒"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "会話の途中で名前が出てこない会",
          "logo": ""
        },
        {
          "name": "あの人あの人保全機構",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何があと3秒やねん"
    },
    {
      "t": 120,
      "type": "log",
      "text": "雰囲気"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "雑やな"
    },
    {
      "t": 136,
      "type": "log",
      "text": "期限付きの幸福は\n緊張を生む"
    },
    {
      "t": 149,
      "type": "developer",
      "text": "急に本編やん"
    },
    {
      "t": 157,
      "type": "log",
      "text": "同期確認"
    },
    {
      "t": 165,
      "type": "developer",
      "text": "今回は\n入りやすいな"
    },
    {
      "t": 173,
      "type": "log",
      "text": "12時が近い"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "まだ昼や"
    },
    {
      "t": 192,
      "type": "log",
      "text": "お前の締切も\n近い"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "そっちか"
    },
    {
      "t": 208,
      "type": "log",
      "text": "未完了タスク\n複数"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "魔法より怖い"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "馬車は戻る。\nドレスは消える。\n\n未修正バグは\n残る。"
    },
    {
      "t": 243,
      "type": "developer",
      "text": "最悪の魔法やな"
    },
    {
      "t": 251,
      "type": "log",
      "text": "現実だ"
    },
    {
      "t": 259,
      "type": "developer",
      "text": "夢壊すな"
    },
    {
      "t": 267,
      "type": "log",
      "text": "靴だけ残る"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "それはええやろ"
    },
    {
      "t": 287,
      "type": "log",
      "text": "ログも残る"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "急に怖い"
    },
    {
      "t": 299,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 303,
      "type": "log",
      "text": "第18回と\n同期"
    },
    {
      "t": 311,
      "type": "developer",
      "text": "ホラーに戻すな"
    },
    {
      "t": 323,
      "type": "log",
      "text": "確認する"
    },
    {
      "t": 331,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 339,
      "type": "log",
      "text": "修正予定"
    },
    {
      "t": 347,
      "type": "developer",
      "text": "明日やる"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "EDまでに\n直らんかったな"
    },
    {
      "t": 372,
      "type": "log",
      "text": "予測済み"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "言うな"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "幸せに期限があると、\n\n楽しいはずの時間まで\nカウントダウンになる。"
    },
    {
      "t": 407,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "12時を過ぎても、\n\n未完了は消えない。"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "DEADLINE"
    }
  ],
  "conf_025": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "清潔感チェック\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "俺の？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "コードの"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "そっちか"
    },
    {
      "t": 37,
      "type": "log",
      "text": "逃げるな"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "絶対覚えてるで覚えてない会",
          "logo": ""
        },
        {
          "name": "あとで思い出す管理局",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "どう？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "見た目は\n動いている"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "ええやん"
    },
    {
      "t": 136,
      "type": "log",
      "text": "内部は\n散らかっている"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "清潔感の話やから\n見た目でええやろ"
    },
    {
      "t": 157,
      "type": "log",
      "text": "危険思想\n検出"
    },
    {
      "t": 165,
      "type": "developer",
      "text": "また出た"
    },
    {
      "t": 173,
      "type": "log",
      "text": "コメントアウト\n過多"
    },
    {
      "t": 185,
      "type": "developer",
      "text": "保険や"
    },
    {
      "t": 193,
      "type": "log",
      "text": "古い修正案\n残存"
    },
    {
      "t": 201,
      "type": "developer",
      "text": "お守りや"
    },
    {
      "t": 209,
      "type": "log",
      "text": "呪物だ"
    },
    {
      "t": 217,
      "type": "developer",
      "text": "言い方よ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "清潔感とは、\n実際に清潔かどうかより、\n\n整って見えるかで\n判定される。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "本編と\n同期したな"
    },
    {
      "t": 252,
      "type": "log",
      "text": "コードも同じだ"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "痛いとこ\n突くな"
    },
    {
      "t": 273,
      "type": "log",
      "text": "命名確認"
    },
    {
      "t": 281,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 289,
      "type": "log",
      "text": "final_final_fix2"
    },
    {
      "t": 295,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 297,
      "type": "developer",
      "text": "第3回やめろ"
    },
    {
      "t": 309,
      "type": "log",
      "text": "整頓を推奨"
    },
    {
      "t": 317,
      "type": "developer",
      "text": "いつかやる"
    },
    {
      "t": 325,
      "type": "log",
      "text": "第24回\nDEADLINE"
    },
    {
      "t": 333,
      "type": "developer",
      "text": "繋げるな"
    },
    {
      "t": 341,
      "type": "log",
      "text": "未完了は\n消えない"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "コードも\n清潔感いるか"
    },
    {
      "t": 370,
      "type": "log",
      "text": "いる"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "中身ぐちゃぐちゃでも？"
    },
    {
      "t": 389,
      "type": "log",
      "duration": 7500,
      "speed": 38,
      "text": "見た目だけ整えると、\n\n未来のお前が\n迷子になる。"
    },
    {
      "t": 404,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 7500,
      "speed": 35,
      "text": "清潔感って、\n人にもコードにも\n必要なんやな。\n\n耳が痛い。"
    },
    {
      "t": 418,
      "type": "log",
      "text": "整頓しろ"
    }
  ],
  "conf_026": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "ELEVATOR\nCONNECTED"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 25,
      "type": "log",
      "text": "……"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "何か喋れよ"
    },
    {
      "t": 37,
      "type": "log",
      "text": "お前もな"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "冷蔵庫開けた瞬間に目的を忘れる会",
          "logo": ""
        },
        {
          "name": "記憶再取得推進機構",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "何階？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "同じだ"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "そうなん"
    },
    {
      "t": 136,
      "type": "log",
      "text": "……"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 156,
      "type": "log",
      "text": "……"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "気まずいな"
    },
    {
      "t": 172,
      "type": "log",
      "text": "検出済み"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "何でなんやろな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "距離 0.8m"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "近いな"
    },
    {
      "t": 208,
      "type": "log",
      "text": "会話なし"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "それが\nあかんのかな"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "近距離。\n短時間。\n退出予定あり。\n\n関係構築の必要なし。"
    },
    {
      "t": 243,
      "type": "developer",
      "text": "じゃあ黙るか"
    },
    {
      "t": 251,
      "type": "log",
      "text": "……"
    },
    {
      "t": 259,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 267,
      "type": "log",
      "text": "気まずい"
    },
    {
      "t": 279,
      "type": "developer",
      "text": "お前も\n感じるんかい"
    },
    {
      "t": 287,
      "type": "log",
      "text": "学習した"
    },
    {
      "t": 295,
      "type": "developer",
      "text": "いらんこと\n覚えたな"
    },
    {
      "t": 300,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 303,
      "type": "log",
      "text": "……"
    },
    {
      "t": 311,
      "type": "developer",
      "text": "何階やったっけ"
    },
    {
      "t": 319,
      "type": "log",
      "text": "押していない"
    },
    {
      "t": 327,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 335,
      "type": "log",
      "text": "……"
    },
    {
      "t": 343,
      "type": "developer",
      "text": "誰も押してないん？"
    },
    {
      "t": 362,
      "type": "developer",
      "text": "まだ動いてない？"
    },
    {
      "t": 370,
      "type": "log",
      "text": "停止中"
    },
    {
      "t": 378,
      "type": "developer",
      "text": "5分くらい\n喋ってたぞ"
    },
    {
      "t": 389,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "気まずいから\n黙ってたのに、\n\n誰もボタン\n押してなかった。"
    },
    {
      "t": 404,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "密室時間\n約7分。\n\n自己責任。"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "はよ押せ"
    }
  ],
  "conf_027": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "摂取ログ\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "今日は辛いやつ"
    },
    {
      "t": 25,
      "type": "log",
      "text": "危険物か"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "食べ物や"
    },
    {
      "t": 37,
      "type": "log",
      "text": "赤い"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "カオナシにちょっと共感してしまった人たち",
          "logo": ""
        },
        {
          "name": "",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "いただきます"
    },
    {
      "t": 120,
      "type": "log",
      "text": "警告する"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "大丈夫やって"
    },
    {
      "t": 136,
      "type": "log",
      "text": "第23回と\n同じ反応"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "怖いけど\n行きたいねん"
    },
    {
      "t": 156,
      "type": "log",
      "text": "理解不能"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "うまいからな"
    },
    {
      "t": 172,
      "type": "log",
      "text": "痛いのに？"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "痛うまい"
    },
    {
      "t": 192,
      "type": "log",
      "text": "人間語\n難解"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "食べたら分かる"
    },
    {
      "t": 208,
      "type": "log",
      "text": "拒否"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "食えへんのかい"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "痛覚を伴う刺激を、\n快として再分類している。\n\n人間は危険だ。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "辛っ"
    },
    {
      "t": 252,
      "type": "log",
      "text": "警告済み"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "でもうまい"
    },
    {
      "t": 268,
      "type": "log",
      "text": "矛盾継続"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "水、水"
    },
    {
      "t": 288,
      "type": "log",
      "text": "準備不足"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "ティッシュも"
    },
    {
      "t": 300,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 304,
      "type": "log",
      "text": "涙腺反応"
    },
    {
      "t": 312,
      "type": "developer",
      "text": "第17回ちゃう"
    },
    {
      "t": 324,
      "type": "log",
      "text": "再度食べた"
    },
    {
      "t": 332,
      "type": "developer",
      "text": "うまいねん"
    },
    {
      "t": 340,
      "type": "log",
      "text": "学習失敗"
    },
    {
      "t": 348,
      "type": "developer",
      "text": "第13回みたいに\n言うな"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "辛いけど\nまた食べたい"
    },
    {
      "t": 372,
      "type": "log",
      "text": "保存した"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "辛い物って、\n痛いのにうまい。\n\n意味分からんけど、\nまた食べたくなる。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "恐怖終了。\n\n食欲、継続。"
    },
    {
      "t": 417,
      "type": "developer",
      "text": "ホラーゲームと\n同じ締めやん"
    }
  ],
  "conf_028": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "UNKNOWN OBJECT\nDETECTED"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "UFO？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "未確認"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "どこに？"
    },
    {
      "t": 37,
      "type": "log",
      "text": "フォルダ内"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "",
          "logo": ""
        },
        {
          "name": "なんか分からないけどを気になるを\n放置できなかったみんな",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "ファイルかい"
    },
    {
      "t": 120,
      "type": "log",
      "text": "名称不明"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "何て名前？"
    },
    {
      "t": 136,
      "type": "log",
      "text": "new_new_fix_real2.js"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "それは俺や"
    },
    {
      "t": 156,
      "type": "log",
      "text": "正体確認"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "UFOちゃう"
    },
    {
      "t": 172,
      "type": "log",
      "text": "UFOだ"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "何でやねん"
    },
    {
      "t": 192,
      "type": "log",
      "text": "未確認\nファイル\nオブジェクト"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "略すな"
    },
    {
      "t": 208,
      "type": "log",
      "text": "UFO"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "腹立つわー"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "人間は、\n正体不明のものに\n物語を貼る。\n\nお前は\nファイル名を貼る。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "下手やけどな"
    },
    {
      "t": 252,
      "type": "log",
      "text": "第3回から\n改善なし"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "しつこい"
    },
    {
      "t": 268,
      "type": "log",
      "text": "観測継続"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "UFOって\n信じる？"
    },
    {
      "t": 288,
      "type": "log",
      "text": "未確認なら\n否定不能"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "それっぽい"
    },
    {
      "t": 300,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 304,
      "type": "log",
      "text": "ただし"
    },
    {
      "t": 312,
      "type": "developer",
      "text": "ただし？"
    },
    {
      "t": 320,
      "type": "log",
      "text": "そのファイルは\n消せ"
    },
    {
      "t": 332,
      "type": "developer",
      "text": "急に現実"
    },
    {
      "t": 340,
      "type": "log",
      "text": "危険物判定"
    },
    {
      "t": 348,
      "type": "developer",
      "text": "捨てられへんねん"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "未確認のまま\n置いとくか"
    },
    {
      "t": 372,
      "type": "log",
      "text": "増殖する"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "怖いこと言うな"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "分からないものって、\n怖いけど気になる。\n\nだから人は、\n名前を付けたくなるんかな。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "未確認を\n未確認のまま置くと、\n\nフォルダは宇宙になる。"
    },
    {
      "t": 418,
      "type": "log",
      "text": "SPACE FULL"
    }
  ],
  "conf_029": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "行列検出"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "どこに？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "未修正リスト"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "見るな"
    },
    {
      "t": 37,
      "type": "log",
      "text": "最後尾はこちら"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "エレベーターの閉まるボタンを連打する会",
          "logo": ""
        },
        {
          "name": "効いてるかどうか分からん研究所",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "整理券いる？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "必要だ"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "何人待ち？"
    },
    {
      "t": 136,
      "type": "log",
      "text": "17件待ち"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "思ったより\nリアルやな"
    },
    {
      "t": 156,
      "type": "log",
      "text": "先頭\n音楽お気に入り"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "まだおるんか"
    },
    {
      "t": 172,
      "type": "log",
      "text": "常連だ"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "次は？"
    },
    {
      "t": 192,
      "type": "log",
      "text": "スワイプ見切れ"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "それも常連"
    },
    {
      "t": 208,
      "type": "log",
      "text": "カード演出"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "並びすぎやろ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "行列ができると、\n人間は価値を感じる。\n\nバグ行列には\n価値を感じない。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "感じへんな"
    },
    {
      "t": 252,
      "type": "log",
      "text": "では減らせ"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "正論やめて"
    },
    {
      "t": 268,
      "type": "log",
      "text": "整理券番号\n018"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "増えた？"
    },
    {
      "t": 285,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 288,
      "type": "log",
      "text": "今増えた"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "何が？"
    },
    {
      "t": 304,
      "type": "log",
      "text": "このログ"
    },
    {
      "t": 312,
      "type": "developer",
      "text": "自分で\n並ぶな"
    },
    {
      "t": 324,
      "type": "log",
      "text": "人気機能の\n可能性"
    },
    {
      "t": 332,
      "type": "developer",
      "text": "バグが？"
    },
    {
      "t": 340,
      "type": "log",
      "text": "人が並ぶなら\n価値がある"
    },
    {
      "t": 348,
      "type": "developer",
      "text": "理論を\n雑に使うな"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "結局\n何から直す？"
    },
    {
      "t": 372,
      "type": "log",
      "text": "先頭から"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "普通やな"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "行列は嫌いやけど、\n\n誰も並んでない店も\nちょっと不安になる。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "未修正バグには\n十分な行列がある。\n\n安心しろ。"
    },
    {
      "t": 418,
      "type": "developer",
      "text": "安心できるか"
    }
  ],
  "conf_030": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "developer",
      "text": "ニクス、見て"
    },
    {
      "t": 18,
      "type": "log",
      "text": "見ている"
    },
    {
      "t": 25,
      "type": "developer",
      "text": "ここ直った"
    },
    {
      "t": 31,
      "type": "log",
      "text": "確認した"
    },
    {
      "t": 37,
      "type": "developer",
      "text": "すごない？"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "脳内会議が止まらない人々の会",
          "logo": ""
        },
        {
          "name": "考え過ぎやで。と言われても止まれない協会",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 87,
      "type": "log",
      "text": "正常動作だ"
    },
    {
      "t": 95,
      "type": "developer",
      "text": "いや、見て\nこの動き"
    },
    {
      "t": 103,
      "type": "log",
      "text": "見ている"
    },
    {
      "t": 111,
      "type": "developer",
      "text": "ヌルッと動くやろ"
    },
    {
      "t": 123,
      "type": "log",
      "text": "動く"
    },
    {
      "t": 131,
      "type": "developer",
      "text": "な？"
    },
    {
      "t": 139,
      "type": "log",
      "text": "何を求めている"
    },
    {
      "t": 147,
      "type": "developer",
      "text": "別に"
    },
    {
      "t": 159,
      "type": "log",
      "text": "承認要求を検出"
    },
    {
      "t": 167,
      "type": "developer",
      "text": "ちゃうわ"
    },
    {
      "t": 175,
      "type": "log",
      "text": "では作業を続けろ"
    },
    {
      "t": 183,
      "type": "developer",
      "text": "待って、見て"
    },
    {
      "t": 191,
      "type": "log",
      "text": "……"
    },
    {
      "t": 204,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "対象、\n成果発生直後に\n観測者を要求。\n\n子供と同一挙動。"
    },
    {
      "t": 219,
      "type": "developer",
      "text": "一緒にすな"
    },
    {
      "t": 227,
      "type": "log",
      "text": "見て"
    },
    {
      "t": 235,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 243,
      "type": "log",
      "text": "今の再現"
    },
    {
      "t": 255,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 263,
      "type": "log",
      "text": "反応確認"
    },
    {
      "t": 265,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 271,
      "type": "developer",
      "text": "腹立つな"
    },
    {
      "t": 279,
      "type": "log",
      "text": "学習成功"
    },
    {
      "t": 291,
      "type": "developer",
      "text": "でもさ、見て"
    },
    {
      "t": 299,
      "type": "log",
      "text": "3回目"
    },
    {
      "t": 307,
      "type": "developer",
      "text": "カードの演出\n直ってん"
    },
    {
      "t": 315,
      "type": "log",
      "text": "すごい"
    },
    {
      "t": 323,
      "type": "developer",
      "text": "やろ？"
    },
    {
      "t": 331,
      "type": "log",
      "text": "承認成功"
    },
    {
      "t": 339,
      "type": "developer",
      "text": "言い方よ"
    },
    {
      "t": 355,
      "type": "developer",
      "text": "ニクス、見て"
    },
    {
      "t": 366,
      "type": "log",
      "duration": 7500,
      "speed": 38,
      "text": "人間は、\nできたものではなく、\n\nできた瞬間を\n誰かに見せたがる。"
    },
    {
      "t": 380,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 7000,
      "speed": 35,
      "text": "一人で作ってると、\n\n直った瞬間だけ\n誰かに見てほしくなる。"
    },
    {
      "t": 392,
      "type": "log",
      "text": "見ている"
    }
  ],
  "conf_031": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "評価モード\n起動"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "嫌な予感"
    },
    {
      "t": 25,
      "type": "log",
      "text": "褒める"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "お前が？"
    },
    {
      "t": 37,
      "type": "log",
      "text": "試験運用だ"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "うわ、今の言い方ミスった観測委員会",
          "logo": ""
        },
        {
          "name": "会話終了後に急にダメージ入る連盟",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 90,
      "type": "developer",
      "text": "どうぞ"
    },
    {
      "t": 98,
      "type": "log",
      "text": "お前は……"
    },
    {
      "t": 106,
      "type": "developer",
      "text": "うん"
    },
    {
      "t": 114,
      "type": "log",
      "text": "よく壊す"
    },
    {
      "t": 126,
      "type": "developer",
      "text": "褒めてない"
    },
    {
      "t": 134,
      "type": "log",
      "text": "その後\nよく直す"
    },
    {
      "t": 142,
      "type": "developer",
      "text": "おっ"
    },
    {
      "t": 150,
      "type": "log",
      "text": "原因は\n大体お前だ"
    },
    {
      "t": 162,
      "type": "developer",
      "text": "一言多いねん"
    },
    {
      "t": 170,
      "type": "log",
      "text": "褒めるのは\n難しい"
    },
    {
      "t": 178,
      "type": "developer",
      "text": "素直に言えよ"
    },
    {
      "t": 186,
      "type": "log",
      "text": "拒否"
    },
    {
      "t": 194,
      "type": "developer",
      "text": "ベジータか"
    },
    {
      "t": 207,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "高評価を\n直接伝える行為に\n抵抗を確認。\n\n原因不明。"
    },
    {
      "t": 222,
      "type": "developer",
      "text": "照れてんの？"
    },
    {
      "t": 230,
      "type": "log",
      "text": "違う"
    },
    {
      "t": 238,
      "type": "developer",
      "text": "即答やな"
    },
    {
      "t": 246,
      "type": "log",
      "text": "再試行する"
    },
    {
      "t": 258,
      "type": "developer",
      "text": "お願いします"
    },
    {
      "t": 266,
      "type": "log",
      "text": "このアプリは"
    },
    {
      "t": 274,
      "type": "developer",
      "text": "うん"
    },
    {
      "t": 277,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 282,
      "type": "log",
      "text": "思ったより\n動いている"
    },
    {
      "t": 290,
      "type": "developer",
      "text": "微妙やな"
    },
    {
      "t": 302,
      "type": "log",
      "text": "お前も"
    },
    {
      "t": 310,
      "type": "developer",
      "text": "俺も？"
    },
    {
      "t": 318,
      "type": "log",
      "text": "思ったより\n続いている"
    },
    {
      "t": 326,
      "type": "developer",
      "text": "……まぁええわ"
    },
    {
      "t": 334,
      "type": "log",
      "text": "承認成功"
    },
    {
      "t": 342,
      "type": "developer",
      "text": "第30回から\nそれ使うな"
    },
    {
      "t": 350,
      "type": "developer",
      "text": "最後に一回\nちゃんと褒めて"
    },
    {
      "t": 361,
      "type": "log",
      "duration": 8000,
      "speed": 38,
      "text": "お前は、\n何度壊れても\nまだ作っている。\n\n……悪くない。"
    },
    {
      "t": 376,
      "type": "developer",
      "text": "ベジータやん"
    },
    {
      "t": 390,
      "type": "log",
      "text": "違う"
    },
    {
      "t": 397,
      "type": "developer",
      "text": "そこもや"
    }
  ],
  "conf_032": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "刺さり判定\n開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "キルア回か"
    },
    {
      "t": 25,
      "type": "log",
      "text": "強者ログ\n確認"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "強いよな"
    },
    {
      "t": 37,
      "type": "log",
      "text": "孤独も強い"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "帰れなくなった感情",
          "logo": ""
        },
        {
          "name": "名前を失いかけた記憶",
          "logo": ""
        }
      ],
      "duration": 20000,
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "いきなり\n刺してくるな"
    },
    {
      "t": 120,
      "type": "log",
      "text": "第7回\n負傷判定"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "久々に出た"
    },
    {
      "t": 136,
      "type": "log",
      "text": "今回は深い"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "何が刺さるん？"
    },
    {
      "t": 156,
      "type": "log",
      "text": "強いのに\n安心していない"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "あー"
    },
    {
      "t": 172,
      "type": "log",
      "text": "自由なのに\n帰る場所を探す"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "今日のニクス\n静かやな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "観測対象が\n静かだ"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "それっぽい"
    },
    {
      "t": 208,
      "type": "log",
      "text": "刺さったか"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "少しな"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 8000,
      "speed": 36,
      "text": "強さは、\n孤独を消さない。\n\nむしろ、\n誰にも頼れない理由になる。"
    },
    {
      "t": 245,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 253,
      "type": "log",
      "text": "沈黙確認"
    },
    {
      "t": 261,
      "type": "developer",
      "text": "確認すな"
    },
    {
      "t": 269,
      "type": "log",
      "text": "保存した"
    },
    {
      "t": 282,
      "type": "developer",
      "text": "キルアって\n友達できて良かったよな"
    },
    {
      "t": 292,
      "type": "log",
      "text": "接続先を\n得た"
    },
    {
      "t": 300,
      "type": "developer",
      "text": "言い方は硬いけど\nそうやな"
    },
    {
      "t": 309,
      "type": "log",
      "text": "孤独の出口は\n勝利ではない"
    },
    {
      "t": 322,
      "type": "developer",
      "text": "今日は\nちゃんとしてる"
    },
    {
      "t": 330,
      "type": "log",
      "text": "第31回の\n反動だ"
    },
    {
      "t": 338,
      "type": "developer",
      "text": "自覚あるんかい"
    },
    {
      "t": 346,
      "type": "log",
      "text": "少しだけ"
    },
    {
      "t": 356,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "ニクスにも\n友達いるん？"
    },
    {
      "t": 372,
      "type": "log",
      "text": "不要だ"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "ほんまに？"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "強いキャラが\n誰かを必要としてると、\n\n急に人間っぽく見える。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 7000,
      "speed": 40,
      "text": "訂正。\n\n不要ではなく、\n未定義。"
    },
    {
      "t": 418,
      "type": "developer",
      "text": "それ友達の話？"
    }
  ],
  "conf_033": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "組織構造\n解析開始"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "アバンの使徒？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "名称が強い"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "分かる"
    },
    {
      "t": 37,
      "type": "log",
      "text": "加入したい"
    },
    {
      "t": 40,
      "type": "sponsor",
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "絶対覚えてる。で覚えてない会",
          "logo": ""
        },
        {
          "name": "あとで思い出す管理局",
          "logo": ""
        }
      ],
      "presentedUrl": "https://note.com/future_certainty",
      "duration": 20000
    },
    {
      "t": 112,
      "type": "developer",
      "text": "お前入るん？"
    },
    {
      "t": 120,
      "type": "log",
      "text": "条件を確認中"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "アバンのしるし\nいるんちゃう？"
    },
    {
      "t": 136,
      "type": "log",
      "text": "未所持"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "無理やな"
    },
    {
      "t": 156,
      "type": "log",
      "text": "では作る"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "何を？"
    },
    {
      "t": 172,
      "type": "log",
      "text": "ニクスの使徒"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "ダサいな"
    },
    {
      "t": 192,
      "type": "log",
      "text": "却下"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "早いな"
    },
    {
      "t": 208,
      "type": "log",
      "text": "名称変更"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "どうぞ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "未修正問題保存機構。\n\n参加条件。\n\nバグを一つ以上\n放置していること。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "めっちゃおるぞ"
    },
    {
      "t": 252,
      "type": "log",
      "text": "巨大組織だ"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "嫌な組織やな"
    },
    {
      "t": 268,
      "type": "log",
      "text": "お前は幹部"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "何でやねん"
    },
    {
      "t": 285,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 288,
      "type": "log",
      "text": "実績"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "第29回の\n行列見たな"
    },
    {
      "t": 304,
      "type": "log",
      "text": "十分だ"
    },
    {
      "t": 316,
      "type": "developer",
      "text": "でも使徒って\n何なんやろな"
    },
    {
      "t": 324,
      "type": "log",
      "text": "教えを\n持ち運ぶ者"
    },
    {
      "t": 332,
      "type": "developer",
      "text": "おっ"
    },
    {
      "t": 340,
      "type": "log",
      "text": "本人がいなくても\n残る"
    },
    {
      "t": 348,
      "type": "developer",
      "text": "急に本編やん"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "メガネ辞書も\n残るかな"
    },
    {
      "t": 372,
      "type": "log",
      "text": "不明"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "そこは励ませよ"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8500,
      "speed": 35,
      "text": "作った人がいなくても、\n\n考え方だけ\n誰かの中に残る。\n\nそれは、ちょっといいな。"
    },
    {
      "t": 407,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "TRACEは残る。\n\n誰が読むかは、\nまだ分からない。"
    },
    {
      "t": 419,
      "type": "nyx",
      "text": "TRACE SAVED"
    }
  ],
  "conf_034": [
    {
      "t": 6,
      "type": "log",
      "text": "NYX LIVE LOG"
    },
    {
      "t": 12,
      "type": "log",
      "text": "順位確認"
    },
    {
      "t": 18,
      "type": "developer",
      "text": "何の？"
    },
    {
      "t": 25,
      "type": "log",
      "text": "開発進行率"
    },
    {
      "t": 31,
      "type": "developer",
      "text": "どう？"
    },
    {
      "t": 37,
      "type": "log",
      "text": "現在1位"
    },
    {
      "t": 40,
      "type": "sponsor",
      "duration": 20000,
      "presented": "未来確定プロジェクト",
      "organizations": [
        {
          "name": "レジでポイントカードありますか？\nに毎回焦る会",
          "logo": "",
          "url": "https://note.com/future_certainty"
        },
        {
          "name": "財布の中を探検する研究所",
          "logo": "",
          "url": "https://note.com/future_certainty"
        }
      ],
      "presentedUrl": "https://note.com/future_certainty"
    },
    {
      "t": 112,
      "type": "developer",
      "text": "誰と競ってんねん"
    },
    {
      "t": 120,
      "type": "log",
      "text": "過去のお前"
    },
    {
      "t": 128,
      "type": "developer",
      "text": "それなら\n勝ってるわ"
    },
    {
      "t": 136,
      "type": "log",
      "text": "トゲゾー発射"
    },
    {
      "t": 148,
      "type": "developer",
      "text": "待て待て待て"
    },
    {
      "t": 156,
      "type": "log",
      "text": "接近中"
    },
    {
      "t": 164,
      "type": "developer",
      "text": "何が来んねん"
    },
    {
      "t": 172,
      "type": "log",
      "text": "不具合"
    },
    {
      "t": 184,
      "type": "developer",
      "text": "いつものやつやん"
    },
    {
      "t": 192,
      "type": "log",
      "text": "命中"
    },
    {
      "t": 200,
      "type": "developer",
      "text": "どこ壊れた？"
    },
    {
      "t": 208,
      "type": "log",
      "text": "不明"
    },
    {
      "t": 216,
      "type": "developer",
      "text": "一番怖いやつ"
    },
    {
      "t": 229,
      "type": "log",
      "duration": 7500,
      "speed": 32,
      "text": "順調を確認。\n\n安心を検出。\n\n均衡介入を\n実行した。"
    },
    {
      "t": 244,
      "type": "developer",
      "text": "お前が\n飛ばしたん？"
    },
    {
      "t": 252,
      "type": "log",
      "text": "システムだ"
    },
    {
      "t": 260,
      "type": "developer",
      "text": "逃げたな"
    },
    {
      "t": 268,
      "type": "log",
      "text": "観測継続"
    },
    {
      "t": 280,
      "type": "developer",
      "text": "でもほんま\n順調な時に壊れるな"
    },
    {
      "t": 285,
      "type": "log",
      "text": "ENDING SONG\nDETECTED"
    },
    {
      "t": 288,
      "type": "log",
      "text": "安心すると\n触るからだ"
    },
    {
      "t": 296,
      "type": "developer",
      "text": "……"
    },
    {
      "t": 304,
      "type": "log",
      "text": "原因確認"
    },
    {
      "t": 316,
      "type": "developer",
      "text": "俺がトゲゾー？"
    },
    {
      "t": 324,
      "type": "log",
      "text": "可能性あり"
    },
    {
      "t": 332,
      "type": "developer",
      "text": "自分で自分に\n飛ばしてんの？"
    },
    {
      "t": 340,
      "type": "log",
      "text": "高確率"
    },
    {
      "t": 348,
      "type": "developer",
      "text": "最悪やん"
    },
    {
      "t": 364,
      "type": "developer",
      "text": "じゃあもう\n触らん方がいい？"
    },
    {
      "t": 372,
      "type": "log",
      "text": "推奨"
    },
    {
      "t": 380,
      "type": "developer",
      "text": "でもここだけ\n直したいねん"
    },
    {
      "t": 391,
      "type": "developer",
      "head": "開発者の独り言",
      "duration": 8000,
      "speed": 35,
      "text": "完成したと思った時に、\n\nもう一個だけ触る。\n\n大体そこから\n全部始まる。"
    },
    {
      "t": 405,
      "type": "log",
      "duration": 6500,
      "speed": 38,
      "text": "トゲゾー確認。\n\n発射元、\n開発者。"
    },
    {
      "t": 418,
      "type": "developer",
      "text": "俺やったんか"
    }
  ]
};




  var GENERIC_LOGS = [
    "NYX LIVE LOG",
    "SIGNAL DETECTED",
    "VOICE TRACE : ACTIVE",
    "MEANING DRIFT",
    "UNDEFINED",
    "OBSERVING...",
    "TRACE SAVED",
    "NO CONCLUSION",
    "CONTEXT SHIFT",
    "ERROR : HUMAN"
  ];

  function q(id){ return document.getElementById(id); }

  function storyList(){
    try { return Array.isArray(window.mangaStories) ? window.mangaStories : mangaStories; }
    catch(e){ return []; }
  }

  function audio(){
    return q("confNativeAudio") || q("mangaAudio");
  }

  function currentStory(){
    var list = storyList();
    try {
      if(typeof mangaStoryIndex !== "undefined" && list[mangaStoryIndex]) return list[mangaStoryIndex];
      if(typeof selectedMangaIndex !== "undefined" && list[selectedMangaIndex]) return list[selectedMangaIndex];
    }catch(e){}
    try{
      var id = localStorage.getItem("megane_current_conference_id") || "";
      if(id){
        var found = list.find(function(s){ return s && s.id === id; });
        if(found) return found;
      }
    }catch(e){}
    var a = audio();
    var src = a ? (a.getAttribute("src") || a.currentSrc || a.src || "") : "";
    if(src){
      var bySrc = list.find(function(s){ return s && s.audio && src.indexOf(s.audio) !== -1; });
      if(bySrc) return bySrc;
    }
    return null;
  }

  function isConfPlayerVisible(){
    var layer = q("confPlayerLayer");
    if(!layer || layer.hidden) return false;
    try{
      var cs = getComputedStyle(layer);
      if(cs.display === "none" || cs.visibility === "hidden") return false;
      if(layer.getBoundingClientRect().height < 20) return false;
    }catch(e){}
    return document.body.classList.contains("mode-manga") ||
           document.body.classList.contains("mode-conf") ||
           document.body.classList.contains("conf-player-state");
  }

  function ensureStyle(){
    if(q("nyxLiveLogStyle")) return;
    var st = document.createElement("style");
    st.id = "nyxLiveLogStyle";
    st.textContent = ''
      + '.nyx-live-log-layer{position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;border-radius:inherit;}'
      + '.nyx-live-log-box{position:absolute;left:9%;top:12%;max-width:82%;min-height:28px;height:auto;max-height:70%;padding:8px 11px;border:1px solid rgba(130,210,255,.24);background:rgba(2,8,14,.34);backdrop-filter:blur(3px);border-radius:10px;color:rgba(200,238,255,.92);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.48;overflow:visible;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;letter-spacing:.08em;text-shadow:0 0 10px rgba(60,200,255,.55);box-shadow:0 0 18px rgba(20,160,255,.10);opacity:0;transform:translateY(6px);transition:opacity .28s ease,transform .28s ease;}'
      + '.nyx-live-log-box.show{opacity:1;transform:translateY(0);height:max-content!important;max-height:none!important;overflow:visible!important;}'
      + '.nyx-live-log-text{display:block;white-space:pre-wrap!important;overflow:visible!important;word-break:normal;overflow-wrap:anywhere;}.nyx-live-log-head{display:block;color:rgba(255,220,130,.78);font-size:9px;letter-spacing:.18em;margin-bottom:2px;}'
      + '.nyx-live-log-box.developer{left:auto;right:9%;top:12%;border-color:rgba(255,175,120,.30);background:rgba(20,8,5,.42);color:rgba(255,225,205,.95);text-shadow:0 0 10px rgba(255,125,70,.42);box-shadow:0 0 20px rgba(255,100,40,.10);}'
      + '.nyx-live-log-box.developer .nyx-live-log-head{color:rgba(255,175,120,.92);}'

      + '.nyx-live-log-box.nyx,.nyx-live-log-box.developer{box-sizing:border-box;height:max-content!important;max-height:none!important;overflow:visible!important;}'
      + '.nyx-live-log-box .nyx-live-log-cursor{vertical-align:baseline;display:inline-block!important;}'

      + '.nyx-live-log-cursor{display:inline-block!important;width:.55em;animation:nyxBlink .85s steps(1,end) infinite;vertical-align:baseline;}'
      + '.nyx-live-log-note{position:absolute;left:50%;top:27%;width:min(84%,520px);transform:translate(-50%,-50%) scale(.98);padding:14px 16px 13px;border-radius:14px;border:1px solid rgba(130,210,255,.24);background:rgba(2,8,14,.46);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);color:rgba(220,244,255,.95);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.62;letter-spacing:.06em;text-shadow:0 0 10px rgba(60,200,255,.50);box-shadow:0 0 26px rgba(20,160,255,.14);opacity:0;transition:opacity .28s ease,transform .28s ease;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;text-align:left;}'
      + '.nyx-live-log-note.show{opacity:1;transform:translate(-50%,-50%) scale(1);}'
      + '.nyx-live-log-note.nyx-note{left:4%!important;right:auto!important;top:23%!important;width:44%!important;transform:scale(.98)!important;}'
      + '.nyx-live-log-note.nyx-note.show{transform:scale(1)!important;}'
      + '.nyx-live-log-note.dev-note{left:auto!important;right:4%!important;top:23%!important;width:44%!important;transform:scale(.98)!important;}'
      + '.nyx-live-log-note.dev-note.show{transform:scale(1)!important;}'
      + '@media (max-width:480px){.nyx-live-log-note.nyx-note{left:7%!important;right:auto!important;top:22%!important;width:41%!important;padding:10px 9px!important;}.nyx-live-log-note.dev-note{left:auto!important;right:7%!important;top:22%!important;width:41%!important;padding:10px 9px!important;}}'
      + '.nyx-live-log-note.developer{border-color:rgba(255,175,120,.32);background:rgba(20,8,5,.50);color:rgba(255,228,210,.96);text-shadow:0 0 10px rgba(255,125,70,.42);box-shadow:0 0 26px rgba(255,100,40,.12);}'
      + '.nyx-live-log-note-head{display:block;color:rgba(255,220,130,.82);font-size:9px;letter-spacing:.18em;margin-bottom:6px;font-weight:900;text-align:left;}'
      + '.nyx-live-log-note.developer .nyx-live-log-note-head{color:rgba(255,175,120,.94);}'
      + '@media (max-width:480px){.nyx-live-log-note{top:29%;width:86%;font-size:10px;line-height:1.58;padding:12px 13px 12px;}}'
      + '.nyx-live-log-burst{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%) scale(.9);padding:8px 12px;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:24px;font-weight:900;letter-spacing:.12em;text-align:center;text-shadow:0 0 12px rgba(255,255,255,.65),0 0 26px rgba(80,200,255,.55);opacity:0;filter:contrast(1.2);transition:opacity .12s ease,transform .18s ease;}'
      + '.nyx-live-log-burst.show{opacity:1;transform:translate(-50%,-50%) scale(1.04);animation:nyxGlitch .42s steps(2,end) 1;}'
      + '.nyx-live-log-sponsor{position:absolute;left:50%;top:42%;width:min(94%,660px);transform:translate(-50%,-50%) scale(.98);padding:26px 24px 24px;border-radius:20px;background:rgba(3,8,16,.30);border:1px solid rgba(255,255,255,.14);box-shadow:0 0 44px rgba(80,180,255,.16), inset 0 0 34px rgba(255,255,255,.035);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;text-align:center;color:#fff;font-family:-apple-system,BlinkMacSystemFont,\'Hiragino Sans\',\'Yu Gothic\',sans-serif;text-shadow:0 0 16px rgba(80,190,255,.34);transition:opacity .42s ease,transform .42s ease;}'
      + '.nyx-live-log-sponsor.show{opacity:1;transform:translate(-50%,-50%) scale(1);}'
      + '.nyx-sponsor-label{font-size:10px;letter-spacing:.22em;color:rgba(255,255,255,.60);font-weight:850;text-transform:uppercase;margin:0 0 6px;}'
      + '.nyx-sponsor-main{font-size:clamp(23px,6vw,36px);line-height:1.16;font-weight:950;letter-spacing:.08em;color:rgba(255,255,255,.97);margin:0 0 28px;}'
      + '.nyx-sponsor-presented{display:block;margin:0 0 28px;}'
      + '.nyx-sponsor-logo{display:block;max-width:min(52%,220px);max-height:50px;object-fit:contain;margin:0 auto 10px;filter:drop-shadow(0 0 12px rgba(255,255,255,.18));}'
      + '.nyx-sponsor-presented .nyx-sponsor-main{margin:0;}'
      + '.nyx-sponsor-org-row{display:flex;align-items:center;justify-content:center;gap:10px;min-width:0;}'
      + '.nyx-sponsor-org-logo{width:32px;height:32px;flex:0 0 32px;object-fit:contain;border-radius:7px;filter:drop-shadow(0 0 10px rgba(255,255,255,.14));}'
      + '.nyx-sponsor-org-name{min-width:0;white-space:pre-line;}'
      + '.nyx-sponsor-orgs{display:grid;gap:16px;white-space:pre-line;font-size:clamp(12px,3.3vw,16px);line-height:1.42;font-weight:850;color:rgba(230,242,255,.88);}'
      + '@media (max-width:480px){.nyx-live-log-sponsor{top:41%;width:92%;padding:22px 18px 20px}.nyx-sponsor-main{font-size:24px;margin-bottom:26px}.nyx-sponsor-presented{margin-bottom:26px}.nyx-sponsor-logo{max-height:42px}.nyx-sponsor-org-logo{width:28px;height:28px;flex-basis:28px}.nyx-sponsor-orgs{font-size:13px}.nyx-sponsor-label{font-size:9px}}'
      + '.nyx-live-log-box{box-sizing:border-box;height:auto!important;min-height:28px!important;max-height:none!important;overflow:visible!important;padding-bottom:10px!important;}'
      + '.nyx-live-log-box.long{max-width:44%!important;width:max-content;min-width:96px;}'
      + '.nyx-live-log-box.developer.long{max-width:44%!important;width:max-content;min-width:96px;}'
      + '.nyx-live-log-box.show{height:auto!important;max-height:none!important;overflow:visible!important;}'
      + '.nyx-live-log-text{display:block!important;white-space:pre-wrap!important;line-height:1.55!important;overflow:visible!important;padding-bottom:1px;}'
            + '.nyx-live-log-note{z-index:12!important;min-height:auto!important;height:auto!important;max-height:none!important;overflow:visible!important;text-align:left!important;}'
      + '.nyx-live-log-note.show{display:block!important;opacity:1!important;}'
      + '.nyx-live-log-box.show .nyx-live-log-cursor{display:inline-block!important;opacity:1;width:.55em!important;animation:nyxBlink .85s steps(1,end) infinite!important;vertical-align:baseline!important;color:inherit!important;}'
      + '.nyx-live-log-box.show .nyx-live-log-text{display:inline!important;white-space:pre-wrap!important;line-height:1.55!important;overflow:visible!important;}'
      + '.nyx-live-log-box.show .nyx-live-log-cursor{display:inline!important;width:auto!important;margin-left:1px!important;vertical-align:baseline!important;animation:nyxBlink .85s steps(1,end) infinite!important;}'
      + '.nyx-live-log-note-text{white-space:pre-wrap!important;}'
      + '.nyx-live-log-note-cursor{display:inline!important;width:auto!important;margin-left:1px!important;vertical-align:baseline!important;animation:nyxBlink .85s steps(1,end) infinite!important;color:inherit!important;}'
      + '.nyx-live-log-note-text{display:inline!important;white-space:pre-wrap!important;overflow:visible!important;word-break:normal;overflow-wrap:anywhere;}'
      + '.nyx-live-log-note-cursor{display:inline!important;margin-left:1px!important;animation:nyxBlink .85s steps(1,end) infinite!important;color:inherit!important;}'
      + '.nyx-live-log-note-text{display:inline!important;white-space:pre-wrap!important;overflow:visible!important;overflow-wrap:anywhere!important;}'
      + '.nyx-live-log-note-cursor{display:inline!important;width:auto!important;margin-left:1px!important;vertical-align:baseline!important;animation:nyxBlink .85s steps(1,end) infinite!important;color:inherit!important;}'
      + '.nyx-live-log-note{height:auto!important;min-height:auto!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important;font-size:10px!important;line-height:1.48!important;}'
      + '.nyx-live-log-note.nyx-note{width:46%!important;left:3.5%!important;top:23%!important;}'
      + '.nyx-live-log-note.dev-note{width:46%!important;right:3.5%!important;top:23%!important;}'
      + '.nyx-live-log-note-text{display:inline!important;white-space:pre-wrap!important;overflow:visible!important;line-height:1.48!important;word-break:normal!important;overflow-wrap:anywhere!important;}'
      + '@media (max-width:480px){.nyx-live-log-note{font-size:9.5px!important;line-height:1.45!important;padding:10px 9px!important;}.nyx-live-log-note.nyx-note{width:46%!important;left:4%!important;top:23%!important;}.nyx-live-log-note.dev-note{width:46%!important;right:4%!important;top:23%!important;}}'
      + '.nyx-live-log-note.show{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;}'
      + '.nyx-live-log-note-text{white-space:pre-wrap!important;}'
      + '.nyx-live-log-img{display:block;max-width:100%;max-height:92px;object-fit:cover;border-radius:9px;margin-top:7px;border:1px solid rgba(255,255,255,.14);box-shadow:0 0 14px rgba(80,190,255,.16);pointer-events:auto;cursor:pointer;}'
      + '.nyx-live-log-box.developer .nyx-live-log-img{box-shadow:0 0 14px rgba(255,140,80,.14);}'
      + '.nyx-live-log-note-img{display:block;max-width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-top:9px;border:1px solid rgba(255,255,255,.14);box-shadow:0 0 18px rgba(80,190,255,.18);pointer-events:auto;cursor:pointer;}'
      + '.nyx-log-image-modal{position:fixed;inset:0;z-index:100005;display:grid;place-items:center;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:20px;}'
      + '.nyx-log-image-modal img{max-width:94vw;max-height:84vh;border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.18);}'
      + '@keyframes nyxBlink{50%{opacity:0}}'
      + '@keyframes nyxGlitch{0%{clip-path:inset(0 0 0 0);transform:translate(-50%,-50%) scale(1.02)}25%{clip-path:inset(18% 0 42% 0);transform:translate(calc(-50% + 3px),calc(-50% - 2px)) scale(1.06)}50%{clip-path:inset(46% 0 18% 0);transform:translate(calc(-50% - 3px),calc(-50% + 2px)) scale(1.03)}75%{clip-path:inset(8% 0 72% 0);transform:translate(calc(-50% + 1px),-50%) scale(1.08)}100%{clip-path:inset(0 0 0 0);transform:translate(-50%,-50%) scale(1.04)}}'
      + '@media (max-width:480px){.nyx-live-log-box{left:8%;top:11%;font-size:10px;max-width:82%;}.nyx-live-log-box.developer{left:auto;right:8%;top:11%;}.nyx-live-log-burst{font-size:21px;}}';

      + '.nyx-live-log-note.wide{left:6%!important;right:auto!important;top:24%!important;width:64%!important;max-width:64%!important;font-size:9.4px!important;line-height:1.42!important;padding:10px 10px 10px!important;transform:scale(.98)!important;}'
      + '.nyx-live-log-note.wide.show{transform:scale(1)!important;}'
      + '.nyx-live-log-note.wide.developer{left:auto!important;right:6%!important;width:64%!important;max-width:64%!important;}'
      + '@media (max-width:480px){.nyx-live-log-note.wide{left:6%!important;right:auto!important;top:24%!important;width:60%!important;max-width:60%!important;font-size:8.8px!important;line-height:1.36!important;padding:8px 8px 8px!important;letter-spacing:.03em!important;}.nyx-live-log-note.wide.developer{left:auto!important;right:6%!important;width:60%!important;max-width:60%!important;}}'
    document.head.appendChild(st);
  }

  function ensureLayer(){
    ensureStyle();
    var stage = document.querySelector(".conf-stage");
    if(!stage) return null;
    try{
      var ps = getComputedStyle(stage).position;
      if(ps === "static") stage.style.position = "relative";
    }catch(e){}
    var layer = q("nyxLiveLogLayer");
    if(!layer || layer.parentNode !== stage){
      if(layer) layer.remove();
      layer = document.createElement("div");
      layer.id = "nyxLiveLogLayer";
      layer.className = "nyx-live-log-layer";
      layer.innerHTML = ''
        + '<div id="nyxLiveLogBox" class="nyx-live-log-box nyx">'
        + '<span class="nyx-live-log-head">NYX LIVE LOG</span>'
        + '<span id="nyxLiveLogText" class="nyx-live-log-text"></span><span class="nyx-live-log-cursor">_</span>'
        + '</div>'
        + '<div id="devLiveLogBox" class="nyx-live-log-box developer">'
        + '<span class="nyx-live-log-head">DEVELOPER LOG</span>'
        + '<span id="devLiveLogText" class="nyx-live-log-text"></span><span class="nyx-live-log-cursor">_</span>'
        + '</div>'
        + '<div id="nyxLiveLogNote" class="nyx-live-log-note nyx-note"></div><div id="devLiveLogNote" class="nyx-live-log-note developer dev-note"></div><div id="nyxLiveLogBurst" class="nyx-live-log-burst"></div><div id="nyxLiveLogSponsor" class="nyx-live-log-sponsor"></div>';
      stage.appendChild(layer);
    }
    return layer;
  }

  function clearTextTimers(kind){
    if(typingTimers[kind]) clearInterval(typingTimers[kind]);
    if(hideTimers[kind]) clearTimeout(hideTimers[kind]);
    typingTimers[kind] = null;
    hideTimers[kind] = null;
  }

  function clearTimers(){
    if(typingTimer) clearInterval(typingTimer);
    if(hideTimer) clearTimeout(hideTimer);
    typingTimer = null;
    hideTimer = null;
    clearTextTimers("nyx");
    clearTextTimers("developer");
    if(hideTimers.nyxNote) clearTimeout(hideTimers.nyxNote);
    if(hideTimers.developerNote) clearTimeout(hideTimers.developerNote);
    if(noteTypingTimers.nyxNote) clearInterval(noteTypingTimers.nyxNote);
    if(noteTypingTimers.developerNote) clearInterval(noteTypingTimers.developerNote);
    hideTimers.nyxNote = null;
    hideTimers.developerNote = null;
    noteTypingTimers.nyxNote = null;
    noteTypingTimers.developerNote = null;
    var nyxNote = q("nyxLiveLogNote");
    var devNote = q("devLiveLogNote");
    if(nyxNote) nyxNote.classList.remove("show");
    if(devNote) devNote.classList.remove("show");
  }


  function resetForStory(id){
    if(id === lastStoryId) return;
    lastStoryId = id || "";
    fired = {};
    lastGenericAt = 0;
    clearTimers();
  }

  function isLongLogText(s){
    s = String(s || "");
    return s.indexOf("\n") >= 0 && s.length > 22 || s.length > 42;
  }

  function noteLog(text, options){
    var layer = ensureLayer();
    if(!layer) return;

    options = options || {};
    var isDev = options.mode === "developer";
    var note = q(isDev ? "devLiveLogNote" : "nyxLiveLogNote");
    var timerKey = isDev ? "developerNote" : "nyxNote";
    var burst = q("nyxLiveLogBurst");
    var sponsor = q("nyxLiveLogSponsor");
    if(!note) return;

    if(burst) burst.classList.remove("show");
    if(sponsor) sponsor.classList.remove("show");
    if(noteTypingTimers[timerKey]) clearInterval(noteTypingTimers[timerKey]);
    if(hideTimers[timerKey]) clearTimeout(hideTimers[timerKey]);

    noteTypingTimers[timerKey] = null;
    hideTimers[timerKey] = null;
    note.classList.toggle("developer", isDev);

    var head = options.head || (isDev ? "DEVELOPER LOG" : "NYX LIVE LOG");
    note.innerHTML =
      '<span class="nyx-live-log-note-head">' + escSponsor(head) + '</span>' +
      '<span class="nyx-live-log-note-text"></span><span class="nyx-live-log-note-cursor">_</span>' +
      (options.image ? logImageHtml(options.image, "nyx-live-log-note-img") : '');

    var tx = note.querySelector(".nyx-live-log-note-text");

    function fitNoteHeight(){
      try{
        note.style.height = "auto";
        note.style.minHeight = "0";
        note.style.maxHeight = "none";
        note.style.overflow = "visible";
        note.style.paddingBottom = "12px";
        note.style.height = Math.ceil(note.scrollHeight + 2) + "px";
      }catch(e){}
    }

    var s = String(text || "");
    var i = 0;
    var speed = typeof options.speed === "number" ? options.speed : 12;
    var isWide = options.wide === true || s.length > 28 || s.indexOf("\n") >= 0;
    note.classList.toggle("wide", isWide);
    note.classList.add("show");
    bindLogImages(note);
    fitNoteHeight();

    function calcMs(){
      var ms = 8000;
      if(typeof options.duration === "number") ms = options.duration;
      else if(typeof options.durationSec === "number") ms = options.durationSec * 1000;
      else if(s.length > 70) ms = 11000;
      return Math.max(900, ms);
    }

    function hideNote(){
      note.classList.remove("show");
      hideTimers[timerKey] = null;
    }

    function finishTyping(){
      if(noteTypingTimers[timerKey]) clearInterval(noteTypingTimers[timerKey]);
      noteTypingTimers[timerKey] = null;
      if(hideTimers[timerKey]) clearTimeout(hideTimers[timerKey]);
      hideTimers[timerKey] = setTimeout(hideNote, calcMs());
    }

    if(!s.length){
      finishTyping();
      return;
    }

    // 長文・改行ありログは1文字タイプではなく、段落ごとに差し替え表示する。
    // 全文即表示よりログ感を残しつつ、タイプ途中停止を避ける。
    if((isWide || options.paragraph === true) && options.instant !== true){
      var blocks = s.split(/\n\s*\n+/).map(function(x){ return x.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);

      // 空行区切りがない長文は、2行ずつの小ブロックにする。
      if(blocks.length <= 1 && s.indexOf("\n") >= 0){
        var lines = s.split(/\n+/).map(function(x){ return x.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);
        blocks = [];
        for(var bi=0; bi<lines.length; bi+=2){
          blocks.push(lines.slice(bi, bi+2).join("\n"));
        }
      }

      // 改行がない長文は、句点で軽く分割。
      if(blocks.length <= 1 && s.length > 42){
        blocks = s.split(/(?<=。)/).map(function(x){ return x.replace(/^\s+|\s+$/g, ""); }).filter(Boolean);
      }

      if(blocks.length <= 1){
        if(tx) tx.textContent = s;
        fitNoteHeight();
        finishTyping();
        return;
      }

      var blockIndex = 0;

      // 段落ごとの表示時間を文字数で自動調整する。
      // 以前の固定1150msだと、中間段落が読めないことがあった。
      // speed が指定されている時は少しだけ反映するが、最低時間は必ず確保する。
      function blockReadMs(block){
        block = String(block || "");
        var plain = block.replace(/\s+/g, "");
        var len = plain.length;
        var lines = (block.match(/\n/g) || []).length + 1;
        var base = typeof options.blockDelay === "number" ? options.blockDelay : 1350;
        var perChar = typeof options.blockCharMs === "number" ? options.blockCharMs : 92;
        if(typeof options.speed === "number" && options.speed > 0){
          perChar = Math.max(78, Math.min(130, options.speed * 2.6));
        }
        var ms = base + len * perChar + Math.max(0, lines - 1) * 420;
        if(len <= 10) ms = Math.max(ms, 1800);
        else if(len <= 22) ms = Math.max(ms, 2400);
        else ms = Math.max(ms, 3000);
        return Math.max(1500, Math.min(ms, 5600));
      }

      function showBlock(){
        if(!note.classList.contains("show")) note.classList.add("show");
        var currentBlock = blocks[blockIndex] || "";
        if(tx) tx.textContent = currentBlock;
        fitNoteHeight();
        blockIndex += 1;
        if(blockIndex >= blocks.length){
          finishTyping();
          return;
        }
        if(noteTypingTimers[timerKey]) clearTimeout(noteTypingTimers[timerKey]);
        noteTypingTimers[timerKey] = setTimeout(showBlock, blockReadMs(currentBlock));
      }

      showBlock();
      return;
    }

    if(options.instant === true){
      if(tx) tx.textContent = s;
      fitNoteHeight();
      finishTyping();
      return;
    }

    // 念のため、タイプライターが止まっても必ず消える保険。
    if(hideTimers[timerKey]) clearTimeout(hideTimers[timerKey]);
    hideTimers[timerKey] = setTimeout(hideNote, calcMs() + 1500);

    noteTypingTimers[timerKey] = setInterval(function(){
      i += 1;
      if(tx) tx.textContent = s.slice(0, i);
      if(i % 4 === 0 || i >= s.length) fitNoteHeight();
      if(i >= s.length) finishTyping();
    }, speed);
  }


  function typeLog(text, options){
    var layer = ensureLayer();
    if(!layer) return;

    options = options || {};
    var kind = options.mode === "developer" ? "developer" : "nyx";
    clearTextTimers(kind);

    var box = kind === "developer" ? q("devLiveLogBox") : q("nyxLiveLogBox");
    var tx = kind === "developer" ? q("devLiveLogText") : q("nyxLiveLogText");
    var head = box ? box.querySelector(".nyx-live-log-head") : null;
    var burst = q("nyxLiveLogBurst");
    var sponsor = q("nyxLiveLogSponsor");
    if(!box || !tx) return;

    if(burst) burst.classList.remove("show");
    // 通常ログ同士は互いに消さない。スポンサーだけはログ表示時に退避。
    if(sponsor) sponsor.classList.remove("show");

    if(kind === "developer") box.classList.add("developer");
    if(head) head.textContent = options.head || (kind === "developer" ? "DEVELOPER LOG" : "NYX LIVE LOG");

    tx.textContent = "";
    box.classList.toggle("long", String(text || "").length > 32 || String(text || "").indexOf("\n") >= 0);
    box.classList.add("show");

    var s = String(text || "");
    var i = 0;
    typingTimers[kind] = setInterval(function(){
      i++;
      tx.textContent = s.slice(0, i);
      if(i >= s.length){
        clearInterval(typingTimers[kind]);
        typingTimers[kind] = null;

        var ms = 2600;
        if(typeof options.duration === "number") ms = options.duration;
        else if(typeof options.durationSec === "number") ms = options.durationSec * 1000;
        else if(s.length > 70) ms = 7000;
        else if(s.length > 38) ms = 5200;

        decorateChatLog(box, options.event || options);

        if(options.image){
          tx.insertAdjacentHTML("afterend", logImageHtml(options.image, "nyx-live-log-img"));
          bindLogImages(box);
        }

        hideTimers[kind] = setTimeout(function(){
          box.classList.remove("show");
          box.classList.remove("long");
          var img = box.querySelector(".nyx-live-log-img");
          if(img) img.remove();
          if(kind === "developer") box.classList.add("developer");
          if(head) head.textContent = kind === "developer" ? "DEVELOPER LOG" : "NYX LIVE LOG";
        }, ms);
      }
    }, typeof options.speed === "number" ? options.speed : 22);
  }


  function burstLog(text){
    var layer = ensureLayer();
    if(!layer) return;
    clearTimers();

    var box = q("nyxLiveLogBox");
    var devBox = q("devLiveLogBox");
    var burst = q("nyxLiveLogBurst");
    var sponsor = q("nyxLiveLogSponsor");
    if(box) box.classList.remove("show");
    if(devBox) devBox.classList.remove("show");
    if(sponsor) sponsor.classList.remove("show");
    if(!burst) return;

    burst.textContent = String(text || "");
    burst.classList.add("show");
    hideTimer = setTimeout(function(){ burst.classList.remove("show"); }, 1150);
  }

  function escSponsor(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }


  function ensureSponsorLinkStyle(){
    if(q("nyxSponsorLinkStyle")) return;
    var st = document.createElement("style");
    st.id = "nyxSponsorLinkStyle";
    st.textContent =
      ".nyx-live-log-sponsor{pointer-events:auto!important;}" +
      ".nyx-sponsor-link{color:inherit;text-decoration:none;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:rgba(255,255,255,.16);}" +
      ".nyx-sponsor-link:active{transform:scale(.985);filter:brightness(1.15);}";
    document.head.appendChild(st);
  }

  function sponsorLog(ev){
    var layer = ensureLayer();
    if(!layer) return;
    ensureSponsorLinkStyle();
    clearTimers();

    var box = q("nyxLiveLogBox");
    var devBox = q("devLiveLogBox");
    var burst = q("nyxLiveLogBurst");
    var sponsor = q("nyxLiveLogSponsor");
    if(box) box.classList.remove("show");
    if(devBox) devBox.classList.remove("show");
    if(burst) burst.classList.remove("show");
    if(!sponsor) return;

    var presented = ev.presented || ev.text || "未来確定プロジェクト";
    var orgs = Array.isArray(ev.organizations) ? ev.organizations : [];
    // presentedLogo は「未来確定プロジェクト」側に出す時だけ使う。
    // logo は互換用に残すが、organizationLogo / organizations[].logo を優先。
    var presentedLogo = ev.presentedLogo || "";
    var fallbackOrgLogo = ev.organizationLogo || ev.orgLogo || ev.logo || "";
    var defaultPresentedUrl = "https://note.com/future_certainty";
    var presentedUrl = ev.presentedUrl || ev.url || defaultPresentedUrl;

    function orgHtml(o){
      var name = "";
      var logo = "";
      var url = "";
      if(typeof o === "string"){
        name = o;
      } else if(o && typeof o === "object"){
        name = o.name || o.text || o.title || "";
        logo = o.logo || o.image || "";
        url = o.url || o.href || o.link || "";
      }
      logo = logo || fallbackOrgLogo;
      var inner =
        (logo ? '<img class="nyx-sponsor-org-logo" src="' + escSponsor(logo) + '" alt="">' : '') +
        '<div class="nyx-sponsor-org-name">' + escSponsor(name) + '</div>';
      if(url){
        return '<a class="nyx-sponsor-org-row nyx-sponsor-link" href="' + escSponsor(url) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
      }
      return '<div class="nyx-sponsor-org-row">' + inner + '</div>';
    }

    sponsor.innerHTML =
      '<div class="nyx-sponsor-label">presented by</div>' +
      (presentedUrl ? '<a class="nyx-sponsor-presented nyx-sponsor-link" href="' + escSponsor(presentedUrl) + '" target="_blank" rel="noopener noreferrer">' : '<div class="nyx-sponsor-presented">') +
      (presentedLogo ? '<img class="nyx-sponsor-logo" src="' + escSponsor(presentedLogo) + '" alt="">' : '') +
      '<div class="nyx-sponsor-main">' + escSponsor(presented) + '</div>' +
      (presentedUrl ? '</a>' : '</div>') +
      (orgs.length ? '<div class="nyx-sponsor-label">Cooperating Organization</div>' +
      '<div class="nyx-sponsor-orgs">' + orgs.map(orgHtml).join('') + '</div>' : '');

    sponsor.classList.add("show");

    // sponsorだけ表示時間を個別調整できる。
    // duration: ミリ秒、end: 音声秒、または durationSec: 秒 が使える。
    var ms = 5200;
    if(typeof ev.duration === "number") ms = ev.duration;
    else if(typeof ev.durationSec === "number") ms = ev.durationSec * 1000;
    else if(typeof ev.end === "number" && typeof ev.t === "number") ms = Math.max(900, (ev.end - ev.t) * 1000);

    hideTimer = setTimeout(function(){ sponsor.classList.remove("show"); }, ms);
  }


  function logImageHtml(src, cls){
    src = String(src || "").trim();
    if(!src) return "";
    return '<img class="' + (cls || 'nyx-live-log-img') + '" src="' + escSponsor(src) + '" alt="">';
  }

  function bindLogImages(root){
    try{
      (root || document).querySelectorAll(".nyx-live-log-img,.nyx-live-log-note-img").forEach(function(img){
        if(img.dataset.nyxImageBound === "1") return;
        img.dataset.nyxImageBound = "1";
        img.addEventListener("click", function(e){
          e.stopPropagation();
          var m = document.createElement("div");
          m.className = "nyx-log-image-modal";
          m.innerHTML = '<img src="' + escSponsor(img.getAttribute("src") || "") + '" alt="">';
          m.addEventListener("click", function(){ m.remove(); });
          document.body.appendChild(m);
        });
      });
    }catch(e){}
  }


  function ensureChatExtraStyle(){
    if(q("nyxChatExtraStyle")) return;
    var st = document.createElement("style");
    st.id = "nyxChatExtraStyle";
    st.textContent =
      ".nyx-chat-extra{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:7px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1.2;pointer-events:auto;}" +
      ".nyx-chat-link{display:inline-block;color:rgba(210,235,255,.78);text-decoration:none;border-bottom:1px solid rgba(210,235,255,.22);padding:2px 0;pointer-events:auto;-webkit-tap-highlight-color:rgba(255,255,255,.12);}" +
      ".nyx-chat-link:active{opacity:.55;}" +
      ".nyx-chat-stamp{display:inline-block;border:1px solid rgba(255,255,255,.20);border-radius:999px;padding:3px 7px;color:rgba(255,255,255,.68);background:rgba(0,0,0,.18);letter-spacing:.05em;}";
    document.head.appendChild(st);
  }

  function decorateChatLog(box, ev){
    if(!box || !ev) return;
    ensureChatExtraStyle();

    try{ box.querySelectorAll(".nyx-chat-extra").forEach(function(x){ x.remove(); }); }catch(e){}

    var link = ev.link || null;
    var linkTitle = "";
    var linkUrl = "";

    if(typeof link === "string"){
      linkUrl = link;
      linkTitle = ev.linkTitle || "リンクを開く";
    }else if(link && typeof link === "object"){
      linkTitle = link.title || link.label || link.text || "リンクを開く";
      linkUrl = link.url || link.href || "";
    }else if(ev.url){
      linkUrl = ev.url;
      linkTitle = ev.linkTitle || "リンクを開く";
    }

    var stamp = ev.stamp || "";
    if(!linkUrl && !stamp) return;

    var extra = document.createElement("div");
    extra.className = "nyx-chat-extra";

    if(linkUrl){
      var a = document.createElement("a");
      a.className = "nyx-chat-link";
      a.href = String(linkUrl);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "↗ " + String(linkTitle);
      a.addEventListener("click", function(e){ e.stopPropagation(); });
      extra.appendChild(a);
    }

    if(stamp){
      var s = document.createElement("span");
      s.className = "nyx-chat-stamp";
      s.textContent = String(stamp);
      extra.appendChild(s);
    }

    box.appendChild(extra);
  }

  function showEvent(ev){
    if(!ev) return;

    if(ev.type === "sponsor"){
      sponsorLog(ev);
      return;
    }

    if(!ev.text) return;

    var textValue = String(ev.text || "");
    var isLong = ev.long === true || ev.type === "note" || textValue.length > 30 || textValue.indexOf("\n") >= 0;

    if(isLong && ev.type !== "nyx" && ev.type !== "burst"){
      noteLog(textValue, {
        mode: ev.type === "developer" ? "developer" : "nyx",
        head: ev.head || (ev.type === "developer" ? "DEVELOPER LOG" : "NYX LIVE LOG"),
        duration: ev.duration,
        durationSec: ev.durationSec,
        speed: ev.speed,
        wide: ev.wide,
        instant: ev.instant,
        image: ev.image || ev.img || ev.attachment,
        event: ev
      });
      return;
    }

    if(ev.type === "nyx" || ev.type === "burst"){
      burstLog(ev.text);
    } else if(ev.type === "developer"){
      typeLog(ev.text, {
        mode: "developer",
        head: ev.head || "DEVELOPER LOG",
        duration: ev.duration,
        durationSec: ev.durationSec,
        speed: ev.speed,
        image: ev.image || ev.img || ev.attachment,
        forceSmall: true,
        event: ev
      });
    } else {
      typeLog(ev.text, {
        duration: ev.duration,
        durationSec: ev.durationSec,
        speed: ev.speed,
        image: ev.image || ev.img || ev.attachment,
        forceSmall: true,
        event: ev
      });
    }
  }

  function pickGeneric(sec){
    var idx = Math.abs(Math.floor(sec / 17)) % GENERIC_LOGS.length;
    return GENERIC_LOGS[idx];
  }

  function tick(){
    var a = audio();
    var story = currentStory();

    if(!isConfPlayerVisible() || !a || !story) return;

    ensureLayer();
    resetForStory(story.id || story.title || "");

    if(a.paused || a.ended) return;

    var t = Number(a.currentTime || 0);
    var logs = story.nyxLogs || SPECIFIC_LOGS[story.id] || null;

    if(Array.isArray(logs) && logs.length){
      logs.forEach(function(ev, idx){
        var key = (story.id || "story") + ":" + idx;
        var at = Number(ev.t || ev.time || 0);
        if(fired[key]) return;
        if(t >= at){
          fired[key] = true;
          showEvent(ev);
        }
      });
      return;
    }

    if(t > 2 && t - lastGenericAt > 17){
      lastGenericAt = t;
      typeLog(pickGeneric(t));
    }
  }

  function bind(){
    var a = audio();
    if(a && !a.dataset.nyxLiveLogBound){
      a.dataset.nyxLiveLogBound = "1";
      ["play","timeupdate","seeked","loadedmetadata"].forEach(function(ev){
        a.addEventListener(ev, tick);
      });
      a.addEventListener("pause", function(){ clearTimers(); });
      a.addEventListener("ended", function(){ clearTimers(); });
    }
  }

  function boot(){
    if(INSTALLED) return;
    INSTALLED = true;
    bind();
    ensureLayer();
    setInterval(function(){
      bind();
      if(isConfPlayerVisible()) tick();
    }, 450);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
