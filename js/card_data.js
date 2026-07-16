/* card_data.js
   カード追加専用ファイル。
   ここだけ編集すればカードを追加できます。
   2026-06-22: OBSERVE / BUG / LOOK BACK / LOOK BEAR 圧縮版
*/
window.cards = [

  {
    title: "白クマバグ",
    subtitle: "POLAR BEAR BUG｜禁止 → 観測",
    image: "images/cards/1_POLAR BEAR BUG.png",
    caption: "考えるな、と言われた瞬間に始まる。",
    back: "images/cards/card_back.png",

    observe: "考えないようにした瞬間、その対象は強く意識される。",
    bug: "禁止は対象を消さない。\n観測対象として固定する。",
    lookback: "それは元からあった？\nそれとも禁止されたから見えた？",
    lookbear: "見ちゃダメって言われると見たくなるよね。"
  },

  {
    title: "観測バグ",
    subtitle: "OBSERVATION BUG｜観測 → 変化",
    image: "images/cards/2_OBSERVATION BUG.png",
    caption: "見た瞬間世界は少し変わる。",
    back: "images/cards/card_back.png",

    observe: "見られた瞬間、世界は少し形を持つ。",
    bug: "観測は記録ではない。\n現実を決める行為でもある。",
    lookback: "それは本当にそうだった？\nそれとも見たからそうなった？",
    lookbear: "見ちゃったね。"
  },

  {
    title: "比較バグ",
    subtitle: "COMPARISON BUG｜比較 → 欠如",
    image: "images/cards/3_COMPARISON BUG.png",
    caption: "並べた瞬間、価値が生まれる。",
    back: "images/cards/card_back.png",

    observe: "人は物事を並べて価値を判断する。",
    bug: "比較は差を見つけるが、価値まで作ってしまう。",
    lookback: "比べているのは本当に自分？\nそれとも並び順？",
    lookbear: "隣を見ると気になっちゃうよね。"
  },

  {
    title: "沈黙バグ",
    subtitle: "SILENCE BUG｜沈黙 → 想像",
    image: "images/cards/4_SILENCE BUG.png",
    caption: "何も言っていないのに\n意味が生まれる。",
    back: "images/cards/card_back.png",

    observe: "言葉がないと、人は意味を想像し始める。",
    bug: "沈黙は空白ではない。\n意味が集まる場所になる。",
    lookback: "その沈黙に意味はあった？\nそれとも作ってしまった？",
    lookbear: "……いろいろ考えちゃうよね。"
  },

  {
    title: "理由バグ",
    subtitle: "REASON BUG｜理由 → 停止",
    image: "images/cards/5_REASON BUG.png",
    caption: "「なぜ？」その一言で世界は止まる。",
    back: "images/cards/card_back.png",

    observe: "人は理由を求めて世界を理解しようとする。",
    bug: "理由は説明になるが、ときどき行動を止める。",
    lookback: "その理由は必要だった？\nそれとも止まるための言葉？",
    lookbear: "理由、あとででもいいかもね。"
  },

  {
    title: "期待バグ",
    subtitle: "EXPECTATION BUG｜期待 → 失望",
    image: "images/cards/6_EXPECTATION BUG.png",
    caption: "まだ起きていない未来が今を動かす。",
    back: "images/cards/card_back.png",

    observe: "まだ来ていない未来が今の行動を変える。",
    bug: "期待は未来を待たない。\n先に観測してしまう。",
    lookback: "それは未来の出来事？\nそれとも想像した未来？",
    lookbear: "まだ起きてないのにドキドキするよね。"
  },

  {
    title: "承認バグ",
    subtitle: "APPROVAL BUG｜承認 → 依存",
    image: "images/cards/7_APPROVAL BUG.png",
    caption: "拍手は人を動かす。",
    back: "images/cards/card_back.png",

    observe: "誰かに認められると世界は少し明るくなる。",
    bug: "承認は力になるが、やがて方向も決め始める。",
    lookback: "やりたいこと？\nそれとも拍手の方向？",
    lookbear: "いいねもらえるとうれしいよね。"
  },

  {
    title: "自己参照バグ",
    subtitle: "SELF-REFERENCE BUG｜自己参照 → 無限",
    image: "images/cards/8_SELF-REFERENCE BUG.png",
    caption: "自分を見た瞬間\nもう一人の自分が生まれる。",
    back: "images/cards/card_back.png",

    observe: "自分を見ると、見られる自分も生まれる。",
    bug: "自己観測はもう一人の自分を作り出す。",
    lookback: "今見ているのは本当に自分？\nそれとも観測者の自分？",
    lookbear: "自分って何人いるんだろうね。"
  },

  {
    title: "ダブルバインド",
    subtitle: "DOUBLE BIND BUG｜命令 → 矛盾",
    image: "images/cards/9_DOUBLE BIND BUG.png",
    caption: "自由にしていい。\nでも間違えないで。",
    back: "images/cards/card_back.png",

    observe: "人は矛盾する期待の間で立ち止まる。",
    bug: "どちらを選んでも間違いになる構造がある。",
    lookback: "そのルールは本当に存在している？",
    lookbear: "どっちでも怒られそうな気がするね。"
  },

  {
    title: "空回りバグ",
    subtitle: "LOOP BUG｜行動 → 空転",
    image: "images/cards/10_LOOP BUG.png",
    caption: "進んでいるのに同じ場所にいる。",
    back: "images/cards/card_back.png",

    observe: "動いているのに進んでいないことがある。",
    bug: "行動と変化は同じではない。",
    lookback: "前に進んでいる？\nそれとも回っているだけ？",
    lookbear: "ぐるぐるしてるだけかもね。"
  },

  {
    title: "過剰観測バグ",
    subtitle: "OVER OBSERVATION BUG｜観測 → 歪み",
    image: "images/cards/11_OVER OBSERVATION BUG.png",
    caption: "見られすぎると形が変わる。",
    back: "images/cards/card_back.png",

    observe: "見られるほど、人は自分を意識し始める。",
    bug: "観測が増えすぎると、本来の姿は見えなくなる。",
    lookback: "それは本当の姿？\nそれとも見られて変わった姿？",
    lookbear: "見られるとちょっと変になっちゃうよね。"
  },

  {
    title: "H(x)バグ",
    subtitle: "H(x) BUG｜否定 → 存在",
    image: "images/cards/12_H(x) BUG.png",
    caption: "これは意味がない。\nそう言った瞬間、意味が生まれる。",
    back: "images/cards/card_back.png",

    observe: "意味がないと言われた瞬間、その言葉が意味を持つ。",
    bug: "否定は対象を消さない。\n別の形で存在させる。",
    lookback: "それは本当に意味がない？",
    lookbear: "意味ないって言うと意味ありそうだよね。"
  },

  {
    title: "誤読バグ",
    subtitle: "MISREADING BUG｜解釈 → 改変",
    image: "images/cards/13_MISREADING BUG.png",
    caption: "同じ言葉が違う世界を作る。",
    back: "images/cards/card_back.png",

    observe: "同じ言葉でも、人によって違う意味になる。",
    bug: "言葉は届いた瞬間、受け手の世界で作り直される。",
    lookback: "その意味は本当に書かれていた？",
    lookbear: "そういう意味で言ったんじゃないんだけどな。"
  },

  {
    title: "拡散バグ",
    subtitle: "SPREAD BUG｜共有 → 変質",
    image: "images/cards/14_SPREAD BUG.png",
    caption: "小さな声が遠くまで飛んだ。\n元の声はもう見つからない。",
    back: "images/cards/card_back.png",

    observe: "言葉は渡るたびに少しずつ姿を変える。",
    bug: "拡散はコピーではない。\n変形の連鎖である。",
    lookback: "それは最初の言葉？",
    lookbear: "最初の人、何て言ってたんだっけ？"
  },

  {
    title: "ラベリング",
    subtitle: "LABELING BUG｜命名 → 固定",
    image: "images/cards/15_LABELING BUG.png",
    caption: "名前をつけた。\nその瞬間自由は少し減った。",
    back: "images/cards/card_back.png",

    observe: "人は理解するために名前をつける。",
    bug: "名前は説明になるが、ときどき檻にもなる。",
    lookback: "その名前は本当にあなた？",
    lookbear: "ぼく、本当は何なんだろうね。"
  },

  {
    title: "神の目バグ",
    subtitle: "GOD EYE BUG｜俯瞰 → 監視",
    image: "images/cards/16_GOD EYE BUG.png",
    caption: "誰も見ていないのに見られている気がする。\nそれだけで行動は変わる。",
    back: "images/cards/card_back.png",

    observe: "見られていなくても、人は視線を感じる。",
    bug: "想像された観測者が行動を変えてしまう。",
    lookback: "その視線は本当に存在している？",
    lookbear: "誰か見てる気がすると背筋伸びるよね。"
  },

  {
    title: "物語バグ",
    subtitle: "STORY BUG｜物語 → 正当化",
    image: "images/cards/17_STORY BUG.png",
    caption: "ただの出来事が物語になると\nもう元には戻らない。",
    back: "images/cards/card_back.png",

    observe: "人は出来事に意味と順番を与える。",
    bug: "物語は理解を助けるが、現実を固定する。",
    lookback: "それは出来事？\nそれとも物語？",
    lookbear: "あとから全部つながって見えるよね。"
  },

  {
    title: "群衆バグ",
    subtitle: "CROWD BUG｜集団 → 同調",
    image: "images/cards/18_CROWD BUG.png",
    caption: "一人では思わなかったことを\nみんなだと信じてしまう。",
    back: "images/cards/card_back.png",

    observe: "集団の中では判断が少し変わる。",
    bug: "安心はときどき思考を預けさせる。",
    lookback: "それはあなたの考え？",
    lookbear: "みんなが言ってると信じちゃうよね。"
  },

  {
    title: "信念バグ",
    subtitle: "BELIEF BUG｜信念 → 固着",
    image: "images/cards/19_BELIEF BUG.png",
    caption: "信じるほど世界は\nその形になっていく。",
    back: "images/cards/card_back.png",

    observe: "信念は不安な世界に方向を与える。",
    bug: "信じるほど、別の可能性は見えにくくなる。",
    lookback: "それは事実？\nそれとも信念？",
    lookbear: "信じると本当っぽく見えるよね。"
  },

  {
    title: "偶像バグ",
    subtitle: "IDOL BUG｜理想 → 投影",
    image: "images/cards/20_IDOL BUG.png",
    caption: "誰かを高く置いた。\nその影はとても大きくなった。",
    back: "images/cards/card_back.png",

    observe: "人は誰かに理想を重ねる。",
    bug: "偶像は希望を生むが、大きな影も作る。",
    lookback: "見ているのはその人？\nそれとも理想像？",
    lookbear: "すごい人って大きく見えすぎるよね。"
  },

  {
    title: "教義バグ",
    subtitle: "DOCTRINE BUG｜教え → 停止",
    image: "images/cards/21_DOCTRINE BUG.png",
    caption: "最初はただの考え。\n気づけば守るべきものになった。",
    back: "images/cards/card_back.png",

    observe: "考えは繰り返されるうちに常識になる。",
    bug: "意見はやがて疑えないルールへ変わる。",
    lookback: "それは本当に絶対？",
    lookbear: "昔のアイデアがルールになってるよね。"
  },

  {
    title: "崩壊バグ",
    subtitle: "COLLAPSE BUG｜臨界 → 崩壊",
    image: "images/cards/22_COLLAPSE BUG.png",
    caption: "ずっと続くと思っていたものが\n静かに崩れる音。",
    back: "images/cards/card_back.png",

    observe: "固まりすぎた意味は、ある日壊れる。",
    bug: "小さなズレは、やがて構造全体を崩す。",
    lookback: "それは壊れた？\nそれとも更新された？",
    lookbear: "次が始まりそうな気もするね。"
  },

  {
    title: "再帰バグ",
    subtitle: "RECURSION BUG｜自己参照 → 循環",
    image: "images/cards/23_RECURSION BUG.png",
    caption: "終わったはずのものが、また始まっていた。",
    back: "images/cards/card_back.png",

    observe: "壊れた世界は、また作り直される。",
    bug: "意味は終わらない。\n同じ形で戻ってくる。",
    lookback: "それは進歩？\nそれとも繰り返し？",
    lookbear: "前にも見た気がするね。"
  },

  {
    title: "無意味バグ",
    subtitle: "MEANINGLESS BUG｜意味 → 消失",
    image: "images/cards/24_MEANINGLESS BUG.png",
    caption: "全部の意味が消えた。そして世界は少し軽くなった。",
    back: "images/cards/card_back.png",

    observe: "意味は世界ではなく、人の中で生まれる。",
    bug: "人は作った意味を本物だと信じ始める。",
    lookback: "それでも人はなぜ意味を作る？",
    lookbear: "意味って後からついてくるんだね。"
  },

  {
    title: "THE LOOKING BEAR",
    subtitle: "LOOKING BEAR｜観測者 → 被観測者",
    image: "images/cards/no_infinity.png",
    caption: "あなたがカードを集めた。\nその瞬間、観測者も完成した。",
    back: "images/cards/card_back.png",

    observe: "あなたはカードを見ていた。\nけれど、カードもまたあなたを見ていた。",
    bug: "観測者は外側にいるとは限らない。\n見ている者もまた、見られている。",
    lookback: "LOOK BACK.\n最初に光っていた目は、最後に現れる目だった。",
    lookbear: "見てたのは、ぼくだけじゃなかったね。"
  }



  /*
  ▼ 新しいカードを追加する時は、この形をコピーして上の ] の直前に貼る

  ,
  {
    title: "カード名",
    subtitle: "ENGLISH｜構文 → 変化",
    image: "images/cards/画像ファイル名.jpeg",
    caption: "カード表面に出る一言。",
    back: "images/cards/card_back.png",

    observe: "OBSERVEに出す文章。",
    bug: "BUGに出す文章。",
    lookback: "LOOK BACKに出す文章。改行したい時は\\nを使う。",
    lookbear: "LOOK BEARに出す文章。"
  }
  */
];