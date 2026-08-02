/* NYX OFFICIAL ARCHIVES
   作品追加・編集は、このファイルだけで完結します。

   window.NYX_ARCHIVES = [
     {
       id,
       protocol,
       title,
       description,
       logs:[ ... ]
     }
   ]

   logのbodyは省略可能。
   segmentsのtextから自動生成されます。

   voiceSrc + segments:
   音声時間に合わせて段落表示。

   voiceSrcなし:
   従来のタイピング表示。
*/
window.NYX_ARCHIVES = [
  {
    id: "observe",
    protocol: "silent_packet://nxs-observe",
    title: "ニクスのどうでもいい観測",
    description: "LOW PRIORITY OBSERVATION / DAILY TRACE",
    logs: [
      {
        id: "observe-001",
        displayId: "#OBS-001",
        title: "カップ麺の麺径と満足感の関係について",
        createdAt: "2026-02-04T16:26:00+09:00",
        official: true,
        archiveId: "observe",
        voiceSrc: "./audio/nxs_001.mp3",
        segments: [
          { time: 1.0, text: "…アクセスログ検知。" },
          { time: 2.8, text: "silent_packet://nxs-observe" },
          { time: 5.4, text: "読み取り専用で開放する。" },
          { time: 8.5, text: "改変は禁止。" },
          { time: 10.3, text: "見るだけな。" },
          { time: 13.8, text: "カップ麺は味で選ばれていない。" },
          { time: 18.2, text: "少なくとも、" },
          { time: 20.4, text: "満足感は味では決まってない。" },
          { time: 25.0, text: "重要なのは——" },
          { time: 27.8, text: "麺の太さだ。" },
          { time: 31.5, text: "正確には、" },
          { time: 33.4, text: "噛んだ瞬間の反発時間。" }
        ]
      },
      {
        id: "observe-002",
        displayId: "#OBS-002",
        title: "RPGの宿屋にワクワクしなくなった理由",
        createdAt: "2026-02-08T23:47:00+09:00",
        official: true,
        archiveId: "observe",
        // voiceSrc: "./audio/nxs_002.mp3",
        segments: [
          { time: 0.0, text: "アクセスを確認。" },
          { time: 2.4, text: "今回の対象はRPGだ。" },
          { time: 5.8, text: "宿屋ではない。" },
          { time: 8.2, text: "安心の構造を見る。" },
          { time: 12.6, text: "観測開始。" }
        ]
      }
    ]
  },
  {
    id: "origin",
    protocol: "silent_packet://nxs-log",
    title: "H(x)∞ origin",
    description: "ORIGIN TRACE / RESTRICTED LOG",
    logs: [
      {
        id: "origin-001",
        displayId: "#ORG-001",
        title: "H(x)∞ origin / SAMPLE LOG",
        createdAt: "2026-08-01T21:11:00+09:00",
        official: true,
        archiveId: "origin",
        // voiceSrc: "./audio/hx_origin_001.mp3",
        segments: [
          { time: 0.0, text: "…アクセスログ検知。" },
          { time: 2.5, text: "silent_packet://nxs-log" },
          { time: 5.0, text: "起源ログを開放する。" },
          { time: 8.0, text: "H(x)は、跳ねの不在を観測する。" },
          { time: 12.0, text: "ここから先はサンプルだ。" }
        ]
      }
    ]
  }
];

/* v1.0.5互換用 */
window.NYX_OFFICIAL_LOGS = window.NYX_ARCHIVES.flatMap(archive =>
  archive.logs.map(log => ({
    ...log,
    archiveId: log.archiveId || archive.id,
    archiveProtocol: archive.protocol,
    archiveTitle: archive.title
  }))
);
