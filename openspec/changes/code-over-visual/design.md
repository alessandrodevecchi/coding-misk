## Context

See proposal.md for the why. What exists today:

- **Code in videos** is drawn on a canvas by `drawCode` (`src/video/video.js`): a rounded panel with a header, a regex tokenizer coloured by the code theme roles, line wrapping (no cut), a smooth scroll that keeps the caret in the upper third, a thin caret found by diffing the text of two frames, muted lines dimmed, and lit notes drawn as an approximate box on one token per layer. Layouts live in `src/video/layout.js` (`LAYOUTS`, `F_SHOWS`, `layoutAreas`, `fragmentAreas`); the live output uses `src/live/presets.js` (`liveAreas`, `code-only` is the nearest thing to an overlay, without a stage). No layout overlaps code and stage.
- **The page** has the stage strip on top (`#stagewrap`, about 42vh) and the editor in a side column (`#codecol`), with full screen for the stage only and a full-page code modal.
- **Typing** (`src/song/typing.js`): `typingPlan(...).frame(t)` returns only text; the plan knows each part's line, segment, key times. The app writes the minimal diff into CodeMirror (`setCodeRange`); the fast video replays the same plan through `codeFrom` (`src/video/feed.js`). No "line being edited" is exposed.
- **Lit notes in the editor** are Strudel's: `outline: solid 2px var(--foreground)`, where the code theme writes its `outline` role. Nothing fills them today.
- **Code themes** (`src/code-themes/themes.js`): roles `bg, text, comment, string, number, label, keyword, variable, method, punct, caret, selection, gutter, outline, flash, line, widget{ink,a1,a2,muted}`; Automatic picks Neon, Amber (HW) or Contrast light by the app theme.
- **Code widgets (`#79`)**: Strudel's six inline widgets through `registerWidget` (public in `@strudel/codemirror` 1.3: `registerWidget(type, fn)` adds a method and tells the transpiler to give each call an id). The app wraps them (`installWidgets` in `src/live/widgets.js`, both Strudel copies), merges hidden option groups, and redraws note widgets from haps in the fast video (`src/video/widget-frames.js`).
- **Stage widgets** (Monitor, Rullo, the strip layer) draw from haps through `stage-feed.js`; render styles are a post pass over the stage frame and never touch the code; ASCII and Terminal draw some widgets natively on a cell grid (`term-grid.js`).
- **Captions** sit at the bottom (`.86h`) in 16:9 and in the lower third in 9:16, drawn after the stage.

The prototype in `prototype/` (throwaway, injected into the running app with Playwright) draws the layout and both widgets from the real editor text and the real scheduler haps. It made every picture in `mockups/` and the test videos. It confirmed three things: the hap locations of Strudel match the shown code (frames land on the right tokens); the Live coder's shown lines carry no `analyze()` (the hidden mixer holds it), so a line's instrument must come from the haps' locations; and a bar's haps are enough for both widgets at 60 fps.

### Mockups and test video

All pictures are real app frames (real looks, renders, songs and haps) with the prototype drawn on top, in `mockups/`:

- Layout: `layout-16x9-neon-palco`, `layout-16x9-hw-tramonto`, `layout-16x9-light-montagne`, `layout-9x16-neon-pixel`, `layout-9x16-hw-spazio`, `layout-9x16-light-edgerunners`, `layout-9x16-neon-terminal`.
- Render styles: `render-led-16x9`, `render-1bit-16x9`, `render-ascii-16x9`, `render-terminal-16x9`.
- Edited line: `edit-line-neon`, `edit-line-hw`, `edit-line-light`. Lit notes: `outline-box`, `outline-fill`. Captions: `captions-16x9`, `captions-9x16`.
- Widgets: `widget-grid-16-blocks`, `widget-grid-16-text`, `widget-grid-8-names`, `widget-grid-32-two-bars`, `widget-grid-hw`, `widget-grid-light`, `widget-chroma-default`, `widget-chroma-blocks-ramp`, `widget-chroma-24-low-window`, `widget-chroma-no-labels`, `widget-chroma-hw`, `widget-chroma-light`.
- Settings (Italian UI, injected into the real Settings page): `settings-code-over-neon|hw`, `settings-app-widgets-neon|hw`, `settings-lit-notes-neon|hw`.
- Labeled lines (deferred, see below): `labels-before-after`.

The test videos (with sound, kept out of git) show each widget on several songs, looks, renders and source instruments: 10 screens in 16:9 (kellerlicht, settimo-cielo, pioggia-sul-vetro, insert-coin, ferro; the chroma on all melodic lines, bass, guitar, pad, hook and arp; the grid in blocks, characters, two bars and with a bass row; Normal, Terminal, LED and 1-bit) and 4 screens in 9:16.

## Goals / Non-Goals

**Goals:**

- One canvas painter for "Code over", shared by the page's stage, real-time video, fast video, fragments and the live output.
- Widgets from haps only, deterministic, identical in real time and fast video.
- A small registry so the next app widget is one painter plus its parameters.

**Non-Goals:**

- A transparent CodeMirror editor over the stage (see D2).
- Labeled lines (`kick: s(...)`): deferred to a separate change, related to the code comment options (cv10-cv12).
- App widgets on the stage (Monitor panels, the strip layer): a follow-up change (cv13).
- Audio-fed widgets, beat tracking or chord recognition from audio.
- The other ideas of the reference (staged syntax errors, sliding `slider` values, edits landing on the bar, future parts as comments): a later change.

## Decisions

### D1. One painter, a new layout name

A module (`src/video/code-over.js`) exports `drawCodeOver(g, area, frame, theme, opts)`, where `frame` carries the code text, the edited line, the lit locations, the line instruments and the widget data. `layout.js` gets `code-over` in `LAYOUTS` and `F_SHOWS`; `layoutAreas` and `fragmentAreas` return the stage over the whole frame and a `codeOver` area. 16:9: the code area starts at 3.5% of the width from its side and ends at the "Code width" setting (default 62% of the frame, as measured on the mockups: text from 3.5% to about 61.5%); side Left (default), Right or Whole width (cv2). Tall formats: the full width above the bottom band, 4% side gutters. `compose`, `composeVertical` and `paintLive` call the painter after `drawStage` and the captions' new position. Alternative: extend `drawCode` with a flag. Rejected: `drawCode` is a panel with wrapping and a header; the two would fight in one function.

### D2. The page: an optional stage mode next to the editor

The layout is made mainly for videos (real time, fast video, fragments, the live output) (cv1). In the page the code editor stays open as today. The stage gets an optional "Code over" mode (off by default, a button in the stage bar and the same in full screen): with it on, the stage loop draws `drawCodeOver` on an overlay canvas above the stage canvas, with the editor's text; the editor column is never folded or replaced by it, and hand typing goes on in the editor. Alternative: CodeMirror made transparent over a large stage. Rejected: Strudel's DOM widgets, selection, gutters and scrolling would all need restyling over moving scenes, the render style would have to skip a DOM layer, and the video would still need the canvas painter.

### D3. Bands, cut and scroll

Each row is measured in character cells (monospace; other fonts scaled to JetBrains Mono's width as `drawCode` does). The band covers from the first non-blank cell to the end plus half a cell each side; empty lines draw nothing. A line longer than the area's columns is cut at `cols − 1` with `…`; continuation lines (indented `.method()`) stay separate rows as they are in the code. The scroll keeps the edited line (or the newest line when nobody types) in the upper third, eased, as today. Font size: frame height / 40 in 16:9, frame width / 34 in tall formats.

### D4. Theme roles for the layout

New roles derived for every code theme: `band` (the theme's ground with an opacity), `edit` (band of the edited line: the theme's accent, `widget.a1`, cv3) and `editInk` (black or white, whichever reads better on `edit`). Neon: magenta with white ink; Amber (HW): orange with dark ink; Contrast light: violet with white ink. The band opacity is fixed per theme with a Low / Medium / High setting (cv5: 0.7, 0.82, 0.92), never below the theme's floor: the lowest opacity at which every text role reads at 4.5:1 on the band composited over black and over white (the worst cases of any scene). `check:code-themes` adds: every text role at 4.5:1 on `band` over black and over white at every setting, `editInk` at 4.5:1 on `edit`.

### D5. The edited line from the typing plan

`typingPlan` gets `cursor(t)` → `{ line, col, editing }`: the part being typed at `t` (its line in the new text, the column after the last typed key), `editing` true from the part's first key until 0.35 s after its last key or until the evaluation, whichever comes first. `typeFrame` in `main.js` and `codeFrom` in `feed.js` pass it with the text. The painter draws the edit band and a block cursor (blinking at 2 Hz in real time; steady in the fast video so frames do not flicker at 30 fps). For hand-typed code the cursor comes from CodeMirror's selection. Alternative: keep diffing frames. Rejected: the diff jumps between parts and cannot tell when an edit ends.

### D6. Lit notes: real locations, outline or fill

In real time, the painter queries the playing pattern at `now` and draws each active hap's `context.locations` (offsets into the evaluated code, mapped to rows of the shown code by line text). In the fast video, the render page returns, with each block, the haps' begin, end and locations (a few numbers each), next to the notes it already returns for the `#79` widgets. Which tokens light in "Code over" is a setting (cv4): only the first mini-notation string of each pattern line (default, closer to the reference and less noise over the scene) or every playing string, as Strudel does in the editor. Outline: a 2 px frame (fs / 12) in the theme's `outline`; Filled: the outline colour at 0.45 under the text, in the painter directly and in the editor through a style rule over Strudel's highlight marks (its `outline: solid 2px` inline style).

### D7. Captions and stage widgets in this layout

`drawCaptions` gets the free area instead of the stage area: 16:9 code left → the part of the frame right of the code area, bottom at `.86h`; code right → the left part; whole width → a band at the bottom of the frame with the code area ending at 0.84h. Tall formats: the code area ends at 0.84h and captions take 0.86h–0.96h. The strip layer (`widget-layer.js`) gets the free area too: 16:9 keeps its panels on the free side only; tall formats turn the strip off while "Code over" is on. The page's `#say` lane gets the same rule through a `data-where` class while the stage mode is on.

### D8. App widget registry

`src/widgets/app-widgets.js` keeps `{ name, defaults, limits, data(notes, cycle, opts), paint(g, box, data, theme, style) }` per widget. The two calls are `._hitgrid()` (the hit grid) and `._tonecloud()` (the tone cloud): names of our own, unlike the reference project's (cv6; its source uses `rhythm` and `chroma` for its own fields). Install: in both Strudel copies, `registerWidget('_hitgrid', …)` and `registerWidget('_tonecloud', …)` create the canvas for the editor (as `getCanvasWidget` does), tag the pattern with the widget id, and redraw each animation frame from the scheduler's haps; the wrapper merges the hidden defaults from Settings with the line's options, like `installWidgets`. Videos and "Code over" call the same `data` and `paint` with notes queried from the scheduler (real time) or the feed store (fast video). Code leaving the app (copy, Save as pattern, export to a file, open in another Strudel) keeps the calls but harmless (cv7): each call becomes a block comment in place, `s("bd*4")/* ._hitgrid() */`, which is valid mid-chain and on a continuation line of its own, so the code still runs in a plain Strudel; a `*/` inside the options is written `*\/`. `check:strudel` accepts the two names; Node stubs for the checks without a browser.

### D9. Hit grid data

Window: the current bar (or `bars` bars from the first bar of the group). Notes with onset of the drum instruments (`analyze` in kick, snare, hats, clap, perc, toms, ride, crash, beat, drums, or a drum `bank`), grouped by sound and variant (cv9: `hh` and `hh:3`, `bd` and `bd:2` are separate rows; `names: 'long'` groups by instrument), from every line of the code, muted ones included while they play. `extra` adds melodic instruments as rows (default the bass, so its rhythm shows). Step = `floor((begin − bar) × steps)`. Played hits (step ≤ current) lit at full colour, coming hits at 0.3, the current column filled with the theme's `widget.a2`. Rows seen once in the song stay until the song changes. In characters: `█` played, `▒` coming, `·` empty, the current column inverted, two cells per step when `size` ≥ 1.5. The footer uses the song's meter: 3/4 gives 12 steps in 3 beats.

### D10. Tone cloud data

Window: `bars` cycles ending now, `cols` slices. For each melodic note of the sources (`from`; default every instrument except drums, fx and riser): pitch class from `note` (string or number), `freq` or `n` with a synth; energy per slice = level (gain × velocity × postgain) × overlap, then an exponential tail of `decay` cycles after the note ends. To read as a cloud rather than thin lines (cv9), each note also spreads a little energy to its neighbouring pitch classes and to its overtones (the fifth and the major third above, as the harmonics of a real tone do), with a small deterministic texture, the cells are taller and the ramp is used more evenly (a gamma under 1). Normalisation `column` (default, as the reference: each slice between its weakest and strongest class, raised to 1.7, so chord tones stand out and trails look alive) or `window` (one scale for the whole window, closer to loudness). Character = `ramp[round(e × (len − 1))]`, a space below 0.04. Chord: the pitch classes sounding in the last quarter cycle, matched against maj7, m7, 7, m7b5, maj, min, dim, sus4, sus2 and 5 (the largest shape that fits, the lowest note preferred as root); labels inverted for its notes; names sharp or flat by the song's key (`auto`). The pad's chord is exact because the haps are exact; with `from` set to one melodic line the name is the shape of that line's notes, for example an arpeggio's. On a voice line (spoken samples have no pitch) the cloud shows the harmony under the voice.

### D11. Where they go and the "Code widgets" option

The two widgets are two new kinds in `WIDGETS` of `#79` with their own defaults (cv8): the hit grid is the drums' primary widget (it sits on the last drum line of the shown code and covers every drum sound, so one slot serves the whole kit), the tone cloud is the pad's primary (on chord instruments), the voice's primary (the voice tracks), and a secondary for bass, lead, arp and guitar. They count toward the maximum (default 3) and follow the slot order and the muted-line rules of `#79`. With "Code widgets" off they are not written.

### D12. Render styles

The painter runs after the render pass, so the code and the widgets are never dithered or pixelated (the rule of `widget-render-styles` D5). Style `auto` picks per render: Normal and CRT blocks; LED round cells of the same size; 1-bit two tones (the theme's `widget.ink` and `band`); ASCII and Terminal characters on the code's cell grid, so they look native to those renders. The look under the code is free (the full looks Monitor, Rullo, Claude and Soul included).

### D13. Settings

- **Appearance → code theme rows:** "Lit notes" Outline / Filled.
- **New card "Code over"** (it: "Codice sopra"): stage mode in the page on or off (off by default; also the stage button), code side in 16:9 (Left, Right, Whole width), code width (default 62%), band opacity (Low, Medium, High), edited line on or off, lit tokens (First string, Every string), long lines (Cut with `…`; Wrap as an escape hatch), Default values. A small preview frame like the video card's.
- **Video card:** layout "Code over"; **Fragments card:** show "Code over"; **Live output:** a "Code over" view (cv14).
- **Code widgets card:** a section "App widgets" with each widget on or off, its parameters (numbers, selects, the ramp as a text field with a preview), a live preview in the theme, Default values.

All saved, in the backup, texts in English and Italian, a Guide card for "Code over" and one for app widgets.

### D14. Labeled lines: deferred

Labeled lines (`kick: s(...)` instead of a comment and `$:`) leave this change (cv10-cv12). They will be a separate change, related to the options of the code comments, with its own proposal; the mockup `labels-before-after` stays as its starting point.

## Risks / Trade-offs

- [Code over busy scenes is hard to read] → band roles checked against black and white at 4.5:1; High opacity setting; the mockups cover Palco, Tramonto, Montagne, Pixel, Spazio, Edgerunners and the LED, 1-bit, ASCII and Terminal renders.
- [The code area hides the scene's centre in 16:9] → code on the left 62% with bands only as wide as the text; side and width settings; empty lines show the scene.
- [Truncated lines hide the end of a change] → the edited line scrolls horizontally inside its band while it is typed so the cursor stays visible; truncation only in this layout.
- [The tone cloud looks static on long sustained notes (a full row of `@`)] → column normalisation with the 1.7 exponent, the decay, the spread to neighbours and overtones make attacks and changes visible; `window` normalisation as an alternative.
- [App widget calls break code copied to another Strudel] → commented out in place on copy, Save as pattern and export (D8).
- [Fast video cost] → hap locations per frame are a few numbers; the widgets reuse the notes the render page already returns. Measured in the check, budget +10% render time.

## Migration Plan

The stage mode defaults to off; the new layout, show and live view are extra choices. No stored data changes shape; settings get new keys with defaults. Rollback: remove the options; nothing else depends on them.

## Estimate

About 30 agent hours without labeled lines (deferred). The analysis estimate of 14-20 hours covered only the layout and the two widgets in videos; this adds the page mode, the typing cursor, real lit locations in the fast video, the widget registry and settings.

| Phase | Content | Hours |
| --- | --- | --- |
| 1. Painter and layout | Bands, cut, scroll, dimming, theme roles and contrast, `code-over` layout and show, live output view | 5 |
| 2. Page mode | Stage button, full screen, overlay canvas, hand typing, settings card and preview | 2.5 |
| 3. Edited line and lit notes | `cursor(t)` in the typing plan, real time and fast video; real hap locations in both; Outline / Filled in editor and painter | 4 |
| 4. Captions and strip | Free area for captions (page and canvas) and for the strip layer | 1 |
| 5. App widget registry | `registerWidget` in both copies, wrapper, comment out on copy and export, stubs, `check:strudel`, catalog | 2.5 |
| 6. Hit grid | Data, painter (blocks, LED, 1-bit, characters), meters | 2.5 |
| 7. Tone cloud | Data, normalisation, decay, spread, chord names, painter in every style | 3.5 |
| 8. Widget settings and slots | App widgets section with previews, `#79` slots and primaries, backup | 2.5 |
| 9. Closing | `check:code-over` and the browser check, Guide cards, i18n, knowledge base, screenshots and a video for the owner | 4.5 |

## Owner Answers

Answers of 2026-10-30, after the mockups and the test video. The recommended option is approved unless noted.

1. **cv1. Page form.** Changed. The "Code over" layout is mainly for videos (real time, fast video, fragments, live output). In the page the editor stays open as today; the stage mode is optional (off by default, a toggle) and never replaces the editor (D2).
2. **cv2. Code side and width.** Both are settings. Default as in the mockups, measured there: the text runs from 3.5% to about 61.5% of the frame, so the code width defaults to 62% (D1).
3. **cv3. Edited line colour.** The theme's accent colour (D4).
4. **cv4. Which tokens light up.** A setting; default: only the first mini-notation string of each line in this layout (D6).
5. **cv5. Band opacity.** Fixed per theme with Low / Medium / High as a setting (D4).
6. **cv6. Widget names in code.** English names, but not the ones the reference project uses: its source has `rhythm` and `chroma` as its own field names, so the calls are `._hitgrid()` and `._tonecloud()` ("Hit grid" / "Griglia colpi", "Tone cloud" / "Nuvola di note") (D8).
7. **cv7. Code leaving the app.** Changed. The calls stay, made harmless: commented out in place as `/* ._hitgrid() */` on copy and on export, so the code still runs in another Strudel (D8).
8. **cv8. Where the widgets go.** Approved, and the tone cloud also on the voice tracks, as the reference uses it on its vocal line (D10, D11).
9. **cv9. Widget defaults.** Changed. Both widgets looked too sparse next to the reference: more rows in the grid (drum sounds and variants apart, more lines, the bass row), and a bigger, denser tone cloud (spread to neighbouring pitch classes and overtones, longer trail and decay, denser ramp, taller cells) (D9, D10). Before and after pictures and a short new clip go in the owner's notes.
10. **cv10-cv12. Labeled lines.** Deferred: removed from this change, to be a separate change related to the comment options (D14).
11. **cv13. Stage widgets.** A follow-up change, not now.
12. **cv14. Live output.** A "Code over" view in the live output.
