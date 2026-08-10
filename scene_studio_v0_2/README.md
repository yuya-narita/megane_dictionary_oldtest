# Easy Studio v0.2.5

Scene Player Core v1.11.0 + Japanese / English Splitter + multilingual Scene Format support.

## v0.2.5

Advanced Scene Editor now includes scene-level media editing.

- Background: inherit / replace image / clear, dim, fit, transition, motion
- BGM: inherit / start / volume / stop, volume, loop, fade controls
- Ambient: inherit / start / volume / stop, volume, loop, fade controls
- SE: one-shot per Scene, volume and fade-in
- Scene list shows BG / BGM / AMB / SE markers
- Splitting a Scene keeps media events on the first half only, avoiding duplicated BGM/SE events
- Player navigation `allowPrevious` remains author-controlled

Media chosen from local files is stored as browser object URLs for this prototype. Persistence/export of media assets will be handled later in the Scene Format/API packaging stage.


## v0.2.5.1 hotfix
- Fixed Easy -> Player CINEMA/background loss caused by stale hidden Advanced fields overwriting a freshly built Scene document.
- Player/Advanced Confirm click now unlocks and arms audio immediately after `load()`, allowing Scene 1 BGM/Ambient/SE to start from the first Scene on iOS/WebKit.
- Core label bumped to v1.5.2.


## v0.2.6 / Core v1.6.0 — History Scroll
- `player.navigation.allowPrevious` remains the author-level switch.
- When ON, Previous no longer steps back one Scene. It opens a continuous History Scroll.
- Mobile: pull down/right from the Player to enter History, then use native momentum scrolling.
- Desktop: Previous button / ArrowUp / ArrowLeft / Backspace / upward wheel enters History.
- History contains only Scenes at or before `maxVisitedIndex`; unread future Scenes are never rendered.
- Tap any visited Scene in History to resume reading from it.
- Restart resets the visited frontier to Scene 1.
- When `allowPrevious` is OFF, History Scroll is unavailable.


## v0.2.7 / Core v1.7.0 — LIGHT / DARK / CINEMA unified
- All three presets now render through the same Scene Player Core geometry, history, ending, navigation and media pipeline.
- Theme differences are token-based (background/text/subtext/line/panel/accent), not separate Player implementations.
- CINEMA light/dark treatment is now serialized as `appearance.cinemaTone` and interpreted by Core.
- Removed the Easy-only CINEMA class shim from playback; Easy and Advanced now feed the same theme contract.
- Scene background/BGM/Ambient/SE behavior is theme-independent.


## v0.2.7.1 / Core v1.7.1 hotfix
- CINEMA light uses a white paper wash over background images; Scene background `dim` becomes wash strength in this tone (Easy default 72%).
- Advanced label changes from `暗さ` to `薄さ` for CINEMA light.
- Removed restrictive `accept=audio/*` from Advanced audio file inputs because iOS Files can gray out valid MP3 files; Studio validates common audio file types after selection instead.
- History landing preserves the current playback position when the same BGM/Ambient remains valid at the target Scene.
- Landing on a past Scene replays that Scene's one-shot SE; merely scrolling History remains silent.


## v0.2.7.2 / Core v1.7.2 — Audio semantics
- BGM = 続いていた時間: History landing keeps playback position when the same BGM is still active.
- Ambient = その時そこにあった音: History landing reconstructs the Ambient state valid at that Scene and restarts that source from its configured `startAt`.
- SE = その時起きた音: browsing History is silent; explicitly landing on a Scene replays that Scene's one-shot SE.
- Studio wording now describes these behavioral roles rather than restricting Ambient to literal environmental sound.


## v0.2.8 / Core v1.8.0 — Theme final polish
- Work-level typography: 明朝 / ゴシック / 等幅.
- Scene-level font override: inherit work font / 明朝 / ゴシック / 等幅.
- Scene Format remains language-neutral internally:
  - `appearance.typography.fontFamily`
  - `presentation.text.fontFamily`
- Advanced labels are now author-facing Japanese while stored values remain `text/dialogue/sound`, `stack/solo`, `auto/fade/...`.
- Optional subText editor is compact and grows only when needed.
- AUTO Scene transition restores the original two-way spacing rhythm:
  - previous text moves slightly upward;
  - current text settles slightly downward;
  - explicit effects still remain available.


## v0.2.8.1 / Core v1.8.1 — Jump / Shino whitespace breathing
The default Scene motion was rebuilt from the actual Jump and Shino players.

Key behavioral change:
- Previous Scene DOM nodes are reused on forward progression instead of being destroyed/recreated.
- Newest Scene is positioned around 46% (mobile) / 48% (desktop) of the Stage.
- All visible Scene positions are measured from their real rendered heights.
- Gap depends on text/dialogue/sound types.
- Each TAP performs a two-phase whitespace breath:
  1. inhale: visible gaps temporarily expand by 9px;
  2. exhale: previous Scenes physically move upward while the new Scene settles into focus.
- New Scene begins blurred/transparent and resolves during the exhale.
- History/load/restoration remain deterministic and do not replay the breathing transition.

This is the structural behavior used by the original Jump/Shino players, not a CSS-only approximation.


## v0.2.8.2 / Core v1.8.2 — synchronized Scene landing
- Previous Scene and current Scene now use the same final landing duration and easing.
- Whitespace inhale remains.
- Final exhale/landing is 860ms for both old and new text.
- New Scene opacity/blur resolves during the same shared landing rather than on a separate timing curve.


## v0.2.8.3 / Core v1.8.3 — lingering synchronized landing
- Previous and current Scene remain synchronized.
- Shared final landing extended from 860ms to 1180ms.
- Easing changed to a gentler late deceleration so both texts visibly linger before settling.
- No independent fast path for the incoming Scene.


## v0.2.8.4 / Core v1.8.4 — true Jump landing
The missing piece was not duration; it was the initial rendered frame.

Jump/Shino behavior reproduced:
1. append the new Scene with `.entering`;
2. allow that state to paint for one requestAnimationFrame;
3. move all Scenes to whitespace-inhale geometry;
4. wait two requestAnimationFrames;
5. move all Scenes to final geometry and reveal the new Scene.

Jump timing is used:
- transform: 0.82s cubic-bezier(.16,.72,.17,1)
- opacity/filter: 0.72s
- entering offset: translateY(13px), blur(2px)

Previous and current Scene therefore share the same transform clock and final landing,
while the current Scene now has the full travel distance that was missing in Core v1.8.1–1.8.3.


## v0.2.8.5 / Core v1.8.5 — 1px paper press
- The Player stage sinks exactly 1 CSS pixel at pointer/touch down.
- It returns immediately (~115ms total).
- The feedback is independent from Scene layout/landing, so True Jump Landing timing is unchanged.
- Rapid taps restart the press feedback cleanly.


## v0.2.8.6 / Core v1.8.6 — quiet Player chrome
Final Step 8 polish before UI i18n.

- Header visual height: 86px -> 68px desktop / 64px mobile (safe-area remains additive).
- Footer visual height: 72px -> 56px desktop / 52px mobile.
- Header button hit areas remain 44x44.
- AUTO remains 36px high.
- Author/title typography is slightly tighter.
- Stage and History insets now derive from shared chrome-height CSS variables.
- True Jump Landing geometry/focus ratios and 1px Paper Press were not changed.


## v0.2.8.7 / Core v1.8.7 — chrome micro polish
- TAP hint moved down to 4px above the compact footer.
- Author-only 「編集に戻る」 control is tucked immediately below the Player header and made quieter.
- The Player's left history control is intentionally preserved; it is not repurposed as the Studio return button.
- True Jump Landing, Paper Press, scene spacing, audio semantics, and History Scroll behavior are unchanged.


## v0.2.9.0 / Core v1.9.0 — UI i18n (ja/en)

Step 9 of Scene Studio v0.2.

### What is localized
- Easy Studio authoring UI
- Advanced Scene Editor labels, options, helper text, asset states and alerts
- Player Core navigation/history/ending UI
- Background transition / fit / motion labels
- Audio editor semantics and controls

### Deliberate separation
UI locale and work language are independent.

Changing JA / EN:
- DOES change Studio / Player interface strings.
- DOES NOT translate the work.
- DOES NOT change `Scene Format.language`.
- DOES NOT switch Splitter logic.

`Scene Format.language` remains `ja` in this build because English Splitter is Step 10.

### Behavior
- JA / EN choice persists in `localStorage`.
- First visit uses browser language (`ja` -> Japanese, otherwise English).
- The Player receives UI locale independently through `uiLanguage`.
- Existing Scene motion, True Jump Landing, Paper Press, audio semantics, History Scroll and theme behavior are unchanged.

## v0.2.10.0 / Core v1.10.0 — Japanese / English Splitter

Step 10 of Scene Studio v0.2.

### Splitter behavior
- Japanese works continue to use `JapaneseSceneSplitter`.
- English works use the new `EnglishSceneSplitter`.
- Easy Studio now chooses the splitter from the **work text**, not from the JA / EN UI switch.
- `Scene Format.language` is written as `ja` or `en` from the detected work language.
- Japanese prose containing English product names, URLs, or code remains classified as Japanese when Japanese characters are meaningfully present.

### English protections
The English splitter avoids naive splitting inside common cases such as:
- decimals and versions (`3.14`, `v1.2.3`)
- domains / URLs / email-like tokens
- common abbreviations (`Dr.`, `Mr.`, `e.g.`, `i.e.`, `a.m.`)
- quoted dialogue
- numbered / bulleted lists
- repeated punctuation and standalone beats

### Deliberate boundary
Step 10 selects **one splitter for one work**. True mixed-language / multilingual works are Step 11.
UI locale remains independent from work language.

### Debug helpers
`SceneStudioDebug` adds:
- `splitEnglish(text, options)`
- `splitAuto(text, options)`
- `detectWorkLanguage(text)`


## v0.2.11.0 / Core v1.11.0 — Multilingual Scene Format

Step 11 of Scene Studio v0.2.

### Scene Format language model
- `document.language` remains the default language for a work.
- `document.language: "mul"` means that the work intentionally contains multiple languages.
- `document.languages` may list the language tags actually present in the work.
- `scene.language` optionally overrides the document language for one Scene.
- `document.direction` / `scene.direction` may be `auto`, `ltr`, or `rtl`.
- Language values use BCP 47-shaped tags (`ja`, `en`, `ko`, `zh-Hans`, `ar`, etc.).

Example:
```json
{
  "format": "scene-format",
  "version": "1.0",
  "language": "mul",
  "languages": ["ja", "en"],
  "title": "Two Languages",
  "author": "",
  "theme": "light",
  "scenes": [
    { "id": "s001", "type": "text", "language": "ja", "text": "聞こえる？" },
    { "id": "s002", "type": "dialogue", "language": "en", "text": "Can you hear me?" }
  ]
}
```

### Easy Studio behavior
Easy Studio now detects language by paragraph/line block. When Japanese and English are both present, it delegates each block to the matching Splitter and writes a multilingual Scene document (`language: "mul"`). A normal monolingual work remains unchanged.

Inline code, URLs, English product names inside Japanese prose do not by themselves force the whole work into multilingual mode. For unusual same-line mixtures, Advanced Scene Editor can keep language on Automatic or override the language of the individual Scene manually. Automatic detects the Scene language when the document is multilingual.

### Player behavior
The Player applies `lang` and `dir` at Scene level. This lets one work switch typography / line-breaking semantics Scene by Scene while keeping Player UI language independent.

### Debug helpers
`SceneStudioDebug` now also exposes:
- `splitMultilingual(text, options)`
- `summarizeLanguages(chunks)`


## v0.2.12.5 — Scene document authority / effect & audio retention hotfix

This build pauses Export/Import expansion and fixes the internal round-trip first.

- Once generated, `workingDocument` (Scene Format) is the single source of truth.
- Advanced -> Easy no longer destroys Scene-level edits.
- Easy -> Advanced / Player reuses the existing Scene document unless the Easy body text itself was edited.
- Returning to Easy mirrors the current Scene text back into the textarea without invalidating the Scene document.
- Work-level theme/font changes update the existing document instead of rebuilding Scenes.
- CINEMA background/tone changes can update the existing document without wiping Advanced edits.
- Explicit entrance effects animate the inner text, while True Jump Landing keeps exclusive ownership of Scene layout transforms.
- Audio/background commands stored in Scene Format now survive Advanced -> Easy -> Advanced/Player round trips.


## v0.2.12.5 — Type layout + effect distinction

- `text`: keeps the normal reading-flow alignment.
- `dialogue`: centers the scene text/subtext as a dialogue beat.
- `sound`: centers the scene text/subtext (and existing sound mark) as a sound beat.
- All selectable entrance effects now animate inner text, avoiding transform ownership conflicts with True Jump Landing.
- `pulse`, `shake`, and `tilt` were strengthened so they are visually distinguishable.
- Auto effects (`fadeRise`, `softRise`, `settle`, `whisperIn`, `emphasis`) were moved to inner-text animation for the same reason.


## v0.2.12.5 — Original Player effects / one-shot entrance

Replaced the provisional Core-specific effect tuning with Shino Story Player v0.7 semantics.

Type distinction:
- text: normal prose
- dialogue: centered, larger, font-weight 600
- sound: centered, larger again, wide letter spacing

Explicit effects use the original Player's strength/timing:
- pulse: .95s
- shake: .48s
- blur: 1.05s
- loud: .58s + persistent large/bold typography
- whisper: persistent small/quiet typography + one subtle reveal
- slow: 1.25s
- tilt: persistent -2deg character + one subtle reveal
- fade: 1.2s
- pop: .52s

Critical behavior change:
Entrance animation is now triggered by `.sp-fx-play` exactly once when a Scene first appears.
Past Scenes do not shake/pulse/fade again when the reader taps to reveal later Scenes.
True Jump Landing remains independent and unchanged.


## v0.2.12.5 — hard one-shot entrance lock

Root cause fixed:
- Legacy `.is-visible` effect CSS was still present in Core and could replay shake/pulse/tilt.
- `next()` cleared presentation timers before the one-shot cleanup timer ran, which could leave `.sp-fx-play` attached to an old Scene.

New rule:
1. Entrance effect starts only on the newly arrived Scene.
2. If the reader taps Next while it is still animating, the effect ends immediately.
3. The Scene moves upward into history in a completely static state.
4. Past Scenes can never restart entrance effects from `is-visible`, active-state, or layout changes.

All legacy Scene-container effect rules were removed. True Jump Landing remains unchanged.


## v0.2.12.5 — effect/layout decoupling

The original Shino effects animated font-size and margins because that Player had a simpler layout model.
In Core, True Jump Landing and whitespace breathing calculate Scene geometry independently.

This build preserves the visual strength while making entrance effects layout-neutral:

- pulse: font-size animation -> inner scale
- shake: margin-left animation -> inner translateX
- loud: final large typography is reserved from frame 0; entrance overshoot uses scale only
- pop: font-size animation -> inner scale
- slow: no vertical offset; slow opacity/blur only
- emphasis: font-size animation -> inner scale

Result:
- Scene height never changes during entrance.
- Final landing position is calculated from the final typography from the beginning.
- Large effects no longer appear to 'correct themselves' to the landing point.
- True Jump Landing remains the only owner of vertical Scene movement.


## v0.2.12.14 — tilt origin lock

Root cause of the final tilt snap:
- text Scenes animated around `left center`
- after the entrance trigger class was removed, resting tilt used `center center`
- the angle stayed at -2deg, but the rotation pivot changed, producing a visible final jump

Fix:
- text + tilt: `left center` for both animation and resting state
- dialogue/sound + tilt: `center center` for both animation and resting state
- no change to True Jump Landing or other effects


## v0.2.12.14 — tilt pure rotation

Tilt entrance now changes only:
- opacity
- rotation

Removed from tilt:
- scale
- blur
- any font/box metric change

The glyph raster/line box is therefore identical throughout the landing.
True Jump Landing continues to own all vertical Scene movement.


## v0.2.12.14 — tilt parent clip fix

Root cause target:
- `.sp-scene` uses a temporary parent blur/filter during True Jump Landing.
- A transformed/rotated child can be rasterized to that filtered parent's
  unrotated bounds, especially on Safari/WebKit and composited Chrome layers.
- Result: rotated glyph tops/bottoms look slightly clipped until landing.

Fix for tilt only:
- parent Scene filter disabled
- overflow explicitly visible
- parent `will-change` no longer includes filter
- rotated text overflow explicitly visible
- no Scene geometry, spacing, font metrics, or True Jump Landing timing changed


## v0.2.12.14 — Default Auto Motion

`おまかせ / Automatic` is now a single stable product default.

Before:
- Auto heuristically selected fadeRise / softRise / settle / whisperIn / emphasis.
- Some automatic choices changed scale, letter-spacing, blur or emphasis weight.
- Different Scene types could therefore appear to shrink/grow at landing.

Now:
- Auto always resolves to one geometry-neutral default reveal.
- True Jump Landing owns all spatial movement.
- Auto animates opacity only.
- No scale, font-size, letter-spacing, blur, font-weight or text-box geometry changes.
- text / dialogue / sound retain their final type-specific typography from frame zero.
- Explicit author effects remain available and unchanged.


## v0.2.12.14 — Step 12 Package I/O

Scene Studio now has two I/O paths.

### Blueprint JSON
- `.scene.json`
- Scene Format only
- suitable for API / Embed / source control
- local `blob:` assets are references only

### Full Scene Package
- `.scene.zip`
- contains `scene.json` plus `assets/`
- local background images, BGM, Ambient and SE are bundled
- package import recreates browser object URLs and restores the work immediately

Package layout:

```text
work.scene.zip
├── scene.json
└── assets/
    ├── 001_background_...
    ├── 002_bgm_...
    ├── 003_ambient_...
    └── 004_se_...
```

Implementation notes:
- ZIP export uses standards-compliant STORE entries and has no external dependency.
- Images/audio are generally already compressed, so STORE avoids needless browser CPU work.
- Import supports STORE and DEFLATE when the browser exposes `DecompressionStream`.
- Public/remote URLs remain URLs and are not copied into the package.
- Duplicate local source URLs are bundled only once.


## v0.2.12.14 — External URL / API / Embed I/O

Step 12 now supports the second I/O path: Scene Format files whose assets live outside Studio.

### Advanced Studio external refs
Background, BGM, Ambient and SE can now be supplied either as:
- local file
- external URL
- relative path

Examples:
```text
https://cdn.example.com/work/bg.jpg
https://cdn.example.com/work/bgm.mp3
./assets/ambient.mp3
/assets/se/click.mp3
```

External refs remain ordinary `src` strings in `.scene.json`.
They survive JSON Export -> Import without being converted to local Blob URLs.

### Full package behavior
`.scene.zip` continues to package only local `blob:` assets.
External/public URLs remain external refs in `scene.json`, avoiding duplicated remote media.

### Public integration API
`window.SceneStudioAPI` is now available:

```js
SceneStudioAPI.load(sceneDocument, { openPlayer: true, startAt: 0 });

await SceneStudioAPI.loadFromUrl(
  "https://example.com/work.scene.json",
  { openPlayer: true }
);

const player = SceneStudioAPI.createPlayer(
  document.querySelector("#player"),
  sceneDocument,
  { allowPrevious: true }
);
```

Surface:
- `load(document, options)`
- `loadFromUrl(url, options)`
- `play(startAt)`
- `getDocument()`
- `validate(document)`
- `createPlayer(host, document, options)`

Notes:
- `loadFromUrl()` requires the JSON host to allow browser CORS.
- Background/audio hosts must likewise permit normal browser media access.
- Scene Player Core itself does not require Studio state when used through `createPlayer()`.


## v0.2.12.14 — External audio transport fix

External absolute HTTP(S) audio now uses a native HTMLMediaElement transport.

Why:
- A remote MP3 can be playable by `<audio>` while becoming silent when the
  same element is routed through `AudioContext.createMediaElementSource()`.
- That behavior depends on origin/CORS/browser details and is especially
  awkward for API / Embed assets.

Routing:
- local Blob / packaged asset / relative path -> existing Web Audio route
- absolute `http://` / `https://` audio -> native media route

The native route:
- never mutes the element while waiting for AudioContext
- never connects it to MediaElementSource
- explicitly calls `load()` after assigning the external URL
- keeps BGM / Ambient / SE semantics unchanged
- emits `sceneplayer:audiotransport`, `sceneplayer:audioready`,
  and enriched `sceneplayer:audioerror` diagnostics

Existing local/package audio behavior is unchanged.


## v0.2.12.14 — Audio transport reset

Fixes the case where:
1. a full `.scene.zip` package is imported,
2. its local Blob BGM/Ambient is previewed through Web Audio,
3. the Scene is edited to use an external HTTP(S) audio URL,
4. the external audio becomes silent until the page is reloaded.

Root cause:
`HTMLMediaElement` instances previously connected with
`AudioContext.createMediaElementSource()` were being reused for the new
native-media transport. That routing history is not safely reversible.

Fix:
- BGM/Ambient media elements are replaced with fresh instances whenever
  transport changes between Web Audio and native HTTP(S) media.
- old MediaElementSource / GainNode connections are disconnected and discarded.
- each new document preview also starts with clean persistent media elements
  when the previous elements carry routing history.
- AudioContext itself is preserved.
- BGM/Ambient semantics, fades and Scene state logic are unchanged.
