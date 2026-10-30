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
- **Labels in Strudel 1.2.6/1.3**: the transpiler turns `name: expr` into `expr.p('name')`; a name starting or ending with `_` is muted; a key longer than one character starting with `S` is a solo; two equal names keep only the last; `$` gets a counter. The app writes `// Drums · kit` comments and `$:`, `_$:`, `S$:`; about 40 places in `src/` and `tools/` match `[_S]?\$:`.

The prototype in `prototype/` (throwaway, injected into the running app with Playwright) draws the layout and both widgets from the real editor text and the real scheduler haps. It made every picture in `mockups/` and the test videos. It confirmed three things: the hap locations of Strudel match the shown code (frames land on the right tokens); the Live coder's shown lines carry no `analyze()` (the hidden mixer holds it), so a line's instrument must come from the haps' locations; and a bar's haps are enough for both widgets at 60 fps.

### Mockups and test video

All pictures are real app frames (real looks, renders, songs and haps) with the prototype drawn on top, in `mockups/`:

- Layout: `layout-16x9-neon-palco`, `layout-16x9-hw-tramonto`, `layout-16x9-light-montagne`, `layout-9x16-neon-pixel`, `layout-9x16-hw-spazio`, `layout-9x16-light-edgerunners`, `layout-9x16-neon-terminal`.
- Render styles: `render-led-16x9`, `render-1bit-16x9`, `render-ascii-16x9`, `render-terminal-16x9`.
- Edited line: `edit-line-neon`, `edit-line-hw`, `edit-line-light`. Lit notes: `outline-box`, `outline-fill`. Captions: `captions-16x9`, `captions-9x16`.
- Widgets: `widget-grid-16-blocks`, `widget-grid-16-text`, `widget-grid-8-names`, `widget-grid-32-two-bars`, `widget-grid-hw`, `widget-grid-light`, `widget-chroma-default`, `widget-chroma-blocks-ramp`, `widget-chroma-24-low-window`, `widget-chroma-no-labels`, `widget-chroma-hw`, `widget-chroma-light`.
- Settings (Italian UI, injected into the real Settings page): `settings-code-over-neon|hw`, `settings-app-widgets-neon|hw`, `settings-lit-notes-neon|hw`.
- Labeled lines: `labels-before-after`.

The test videos (with sound, kept out of git) show each widget on several songs, looks, renders and source instruments: 10 screens in 16:9 (kellerlicht, settimo-cielo, pioggia-sul-vetro, insert-coin, ferro; the chroma on all melodic lines, bass, guitar, pad, hook and arp; the grid in blocks, characters, two bars and with a bass row; Normal, Terminal, LED and 1-bit) and 4 screens in 9:16.

## Goals / Non-Goals

**Goals:**

- One canvas painter for "Code over", shared by the page's stage, real-time video, fast video, fragments and the live output.
- Widgets from haps only, deterministic, identical in real time and fast video.
- A small registry so the next app widget is one painter plus its parameters.
- Labels as a look option that never changes the sound.

**Non-Goals:**

- A transparent CodeMirror editor over the stage (see D2).
- Audio-fed widgets, beat tracking or chord recognition from audio.
- The other ideas of the reference (staged syntax errors, sliding `slider` values, edits landing on the bar, future parts as comments): a later change.

## Decisions

### D1. One painter, a new layout name

A module (for example `src/video/code-over.js`) exports `drawCodeOver(g, area, frame, theme, opts)`, where `frame` carries the code text, the edited line, the lit locations, the line instruments and the widget data. `layout.js` gets `code-over` in `LAYOUTS` and `F_SHOWS`; `layoutAreas` and `fragmentAreas` return the stage over the whole frame and a `codeOver` area (16:9: left 58% by default, setting left, right or full; tall: the full width above the bottom band, 4% side gutters). `compose`, `composeVertical` and `paintLive` call the painter after `drawStage` and the captions' new position. Alternative: extend `drawCode` with a flag. Rejected: `drawCode` is a panel with wrapping and a header; the two would fight in one function.

### D2. The page: a stage mode, not a transparent editor

The stage gets a "Code over" button (and the same in full screen). With it on, `#stagewrap` takes the window height, the code column folds (`code-collapsed`), and the stage loop draws `drawCodeOver` on an overlay canvas above the stage canvas, with the editor's text. Taking over by hand or opening the column shows the editor again; the overlay stays. Alternative: CodeMirror made transparent over a large stage. Rejected for now: Strudel's DOM widgets, selection, gutters and scrolling would all need restyling over moving scenes, the render style would have to skip a DOM layer, and the video would still need the canvas painter. Open question cv1.

### D3. Bands, cut and scroll

Each row is measured in character cells (monospace; other fonts scaled to JetBrains Mono's width as `drawCode` does). The band covers from the first non-blank cell to the end plus half a cell each side; empty lines draw nothing. A line longer than the area's columns is cut at `cols − 1` with `…`; continuation lines (indented `.method()`) stay separate rows as they are in the code. The scroll keeps the edited line (or the newest line when nobody types) in the upper third, eased, as today. Font size: frame height / 40 in 16:9, frame width / 34 in tall formats.

### D4. Theme roles for the layout

New roles in every code theme: `band` (colour with opacity), `edit` (band of the edited line) and `editInk`, plus a derived `bandStrong` for busy scenes. Neon: `band` = the theme's `bg` at 0.82, `edit` = `a1` at 0.86 with white ink. Amber (HW): dark brown at 0.84, `edit` = amber with dark ink. Contrast light: light grey-blue at 0.86 with dark ink, `edit` teal with white ink (as in the reference). Strudel themes get `band` from their `bg` at 0.82 and `edit` from their selection colour. `check:code-themes` adds: every text role at 4.5:1 on `band` composited over black and over white (the worst cases of any scene), `editInk` at 4.5:1 on `edit`. A band opacity setting (Low 0.7, Medium as above, High 0.92) stays per user. Open question cv5.

### D5. The edited line from the typing plan

`typingPlan` gets `cursor(t)` → `{ line, col, editing }`: the part being typed at `t` (its line in the new text, the column after the last typed key), `editing` true from the part's first key until 0.35 s after its last key or until the evaluation, whichever comes first. `typeFrame` in `main.js` and `codeFrom` in `feed.js` pass it with the text. The painter draws the edit band and a block cursor (blinking at 2 Hz in real time; steady in the fast video so frames do not flicker at 30 fps). For hand-typed code the cursor comes from CodeMirror's selection. Alternative: keep diffing frames. Rejected: the diff jumps between parts and cannot tell when an edit ends.

### D6. Lit notes: real locations, outline or fill

In real time, the painter queries `scheduler.pattern.queryArc(now, now + ε)` and draws each active hap's `context.locations` (offsets into the evaluated code, mapped to rows). In the fast video, the render page returns, for each frame window, the locations of the haps active at that cycle (a list of `[start, end]` per frame, small), next to the notes it already returns for the `#79` widgets. Outline: a 2 px frame (fs / 12) in the theme's `outline`; Filled: the outline colour at 0.45 under the text, for the editor through Strudel's `markcss` hook in the wrapper (`hap.value.markcss` is applied by the highlighter) and in the painter directly. The prototype shows Strudel lights every playing string (sound names and banks too). Open question cv4.

### D7. Captions and stage widgets in this layout

`drawCaptions` gets the free area instead of the stage area: 16:9 code left → the right 42% of the frame, bottom at `.86h`; code right → the left part; full width → a band at the bottom of the frame with the code area ending at 0.84h. Tall formats: the code area ends at 0.84h and captions take 0.86h–0.96h. The strip layer (`widget-layer.js`) gets the free area too: 16:9 keeps the two panels on the free side only; tall formats turn the strip off while "Code over" is on. The page's `#say` lane gets the same rule through a `data-where` class.

### D8. App widget registry

`src/widgets/app-widgets.js` keeps `{ name, defaults, limits, data(haps, cycle, opts), paint(g, box, data, theme, style) }` per widget. Install: in both Strudel copies, `registerWidget('_rhythm', …)` and `registerWidget('_chroma', …)` create the canvas for the editor (as `getCanvasWidget` does), tag the pattern with the widget id, and redraw each animation frame from the scheduler's haps; the wrapper merges the hidden defaults from Settings with the line's options, like `installWidgets`. Videos and "Code over" call the same `data` and `paint` with haps from the scheduler (real time) or the feed store (fast video). The calls are stripped when code leaves the app (copy, Save as pattern, export to a file, open in another Strudel), with the same `stripWidgets` used for line keys. `check:strudel` accepts the two names; Node stubs for the checks without a browser.

### D9. Rhythm grid data

Window: the current bar (or `bars` bars from the first bar of the group). Haps with onset of the drum instruments (`analyze` in kick, snare, hats, clap, perc, toms, ride, crash, or a drum `bank`), grouped by sound (`bd`, `sd`, `hh`, `oh`, `cp`, `rim`…; `names: 'long'` groups by instrument). Step = `floor((begin − bar) × steps)`. Played hits (step ≤ current) lit at full colour, coming hits at 0.3, the current column filled with the theme's `widget.a2`. Rows seen once in the song stay until the song changes. `extra` adds melodic instruments as rows (a bass row shows its rhythm). In characters: `█` played, `▒` coming, `·` empty, the current column inverted, two cells per step when `size` ≥ 1.5. The footer uses the song's meter: 3/4 gives 12 steps in 3 beats.

### D10. Chroma data

Window: `bars` cycles ending now, `cols` slices. For each melodic hap of the sources (`from`; default every instrument except drums, fx, riser, voice): pitch class from `note` (string or number), `freq` or `n` with a synth; energy per slice = level (gain × velocity × postgain) × overlap, then an exponential tail of `decay` cycles after the note ends. Normalisation `column` (default, as the reference: each slice between its weakest and strongest class, raised to 1.7, so chord tones stand out and trails look alive) or `window` (one scale for the whole window, closer to loudness). Character = `ramp[round(e × (len − 1))]`, a space below 0.04. Chord: the pitch classes sounding in the last quarter cycle, matched against maj7, m7, 7, m7b5, maj, min, dim, sus4, sus2 and 5 (the largest shape that fits, the lowest note preferred as root); labels inverted for its notes; names sharp or flat by the song's key (`auto`). The pad's chord is exact because the haps are exact; with `from` set to one melodic line the name is the shape of that line's notes, for example an arpeggio's.

### D11. Where they go and the "Code widgets" option

The two widgets are two new kinds in `WIDGETS` of `#79` with their own defaults: the rhythm grid is the drums' primary widget (it sits on the last drum line of the shown code and covers every drum sound, so one slot serves the whole kit), the chroma is the pad's primary (on chord instruments) and a secondary for bass, lead, arp and guitar. They count toward the maximum (default 3) and follow the slot order and the muted-line rules of `#79`. With "Code widgets" off they are not written. Open question cv8.

### D12. Render styles

The painter runs after the render pass, so the code and the widgets are never dithered or pixelated (the rule of `widget-render-styles` D5). Style `auto` picks per render: Normal and CRT blocks; LED round cells of the same size; 1-bit two tones (the theme's `widget.ink` and `band`); ASCII and Terminal characters on the code's cell grid, so they look native to those renders. The look under the code is free (the full looks Monitor, Rullo, Claude and Soul included).

### D13. Settings

- **Appearance → code theme rows:** "Lit notes" Outline / Filled.
- **New card "Code over"** (it: "Codice sopra"): stage mode on or off (also the stage button), code side in 16:9 (Left, Right, Whole width), band opacity (Low, Medium, High), edited line on or off, long lines (Cut with `…`; Wrap as an escape hatch), Default values. A small preview frame like the video card's.
- **Video card:** layout "Code over"; **Fragments card:** show "Code over".
- **Code widgets card:** a section "App widgets" with each widget on or off, its parameters (numbers, selects, the ramp as a text field with a preview), a live preview in the theme, Default values.
- **Code look controls of the profiles:** "Labeled lines" on or off.

All saved, in the backup, texts in English and Italian, a Guide card for "Code over", one for app widgets, one line for labeled lines.

### D14. Labeled lines

- **Writing:** a single name function `labelOf(instrument, taken)` → lowercase identifier from the instrument (`kick`, `snare`, `hats`, `bass`, `pad`, `lead`, `arp`, `guitar`, `fx`, `voice`), a number for later lines of the same instrument in the shown code (`kick2`), a suffix for a reserved word (never `_`). `sceneLayers`, `compile.js`, `compile-compact.js`, the voice lines (`build.js`, `spoken.js`), air code and the endless waypoints call it when the option is on; the instrument comment line is dropped, the track header and section comments stay.
- **Mute and solo:** `_name:` and `Sname:`, so a mute is still one typed character.
- **One parser:** a shared `patternLine(line)` → `{ label, muted, solo, body }` replaces the `[_S]?\$:` regexes (typing `lead()` and `lineLike`, `writer.js` `PATTERN` and `lineKey`, `live-code.js`, `widgets.js`, `written-plan.js`, `typing-load.js`, `air-code.js`, `crescendo.js`, `compile-compact.js`, `code-themes/install.js`, `main.js` widget dimming, `video.js`, `widget-frames.js`, `preview.js`, `validate.js`) and the checks that copy them. `lineKey` uses the body, so `kick:` and `_kick:` are the same line.
- **Guard:** on every evaluation of hand-typed code (Compose, hand take-over, Patterns), a scan of labels warns on duplicates, `S` + letters, and a trailing `_`, in the code panel's error line style but yellow and non-blocking. `validate.js` rejects labels inside a song's pattern code (the compiler writes them).
- **Checks:** `check:mixer` gets a `labels` view (same haps in every profile and preset); `check:code` unchanged with the option off, plus a `labels` snapshot set; `check:typing` (a mute is one character); `check:functions` fixtures in both forms; the Strudel catalog lists named labels, `name_`, `_name`, `Sname`.

Open questions cv10–cv12.

## Risks / Trade-offs

- [Code over busy scenes is hard to read] → band roles checked against black and white at 4.5:1; High opacity setting; the mockups cover Palco, Tramonto, Montagne, Pixel, Spazio, Edgerunners and the LED, 1-bit, ASCII and Terminal renders.
- [The code area hides the scene's centre in 16:9] → code on the left 58% with bands only as wide as the text; side setting; empty lines show the scene.
- [Truncated lines hide the end of a change] → the edited line scrolls horizontally inside its band while it is typed so the cursor stays visible; truncation only in this layout.
- [Chroma looks static on long sustained notes (a full row of `@`)] → column normalisation with the 1.7 exponent and the decay make attacks and changes visible; `window` normalisation as an alternative; the video shows both.
- [App widget calls break code copied to another Strudel] → stripped on copy, Save as pattern and export (D8).
- [Labels touch about 40 parsers] → one shared helper first, then the option; `check:mixer` labels view proves the sound is the same; with the option off nothing changes.
- [`Sname:` reads oddly] → it is Strudel's own rule; the guard explains it to users.
- [Fast video cost] → hap locations per frame are a few numbers; the widgets reuse the notes the render page already returns. Measured in the check, budget +10% render time.

## Migration Plan

New options default to off ("Labeled lines", the stage mode); the new layout and show are extra choices. No stored data changes shape; settings get new keys with defaults. Rollback: remove the options; nothing else depends on them.

## Estimate

About 40 agent hours, 30 without labeled lines. The analysis estimate of 14-20 hours covered only the layout and the two widgets in videos; this adds the page mode, the typing cursor, real lit locations in the fast video, the widget registry and settings, and the labels.

| Phase | Content | Hours |
| --- | --- | --- |
| 1. Painter and layout | Bands, cut, scroll, dimming, theme roles and contrast, `code-over` layout and show, live output view | 5 |
| 2. Page mode | Stage button, full screen, folded column, overlay canvas, hand take-over, settings card and preview | 2.5 |
| 3. Edited line and lit notes | `cursor(t)` in the typing plan, real time and fast video; real hap locations in both; Outline / Filled in editor and painter | 4 |
| 4. Captions and strip | Free area for captions (page and canvas) and for the strip layer | 1 |
| 5. App widget registry | `registerWidget` in both copies, wrapper, strip on copy and export, stubs, `check:strudel`, catalog | 2.5 |
| 6. Rhythm grid | Data, painter (blocks, LED, 1-bit, characters), meters | 2.5 |
| 7. Chroma | Data, normalisation, decay, chord names, painter in every style | 3.5 |
| 8. Widget settings and slots | App widgets section with previews, `#79` slots and primaries, backup | 2.5 |
| 9. Labeled lines | Name function, compiler and writers, shared parser across about 40 places, guard, validator, checks and snapshots | 10 |
| 10. Closing | `check:code-over` and the browser check, Guide cards, i18n, knowledge base, screenshots and a video for the owner | 4.5 |

## Open Questions

Each has a recommended option; the owner's answers go in an "Owner Answers" section before code.

1. **cv1. Page form.** (a) Stage mode drawn on a canvas, editor folded (recommended, D2); (b) the real editor made transparent over a large stage (editable over the scene, much more styling and risk).
2. **cv2. Code side in 16:9.** Left 58% (recommended, as the mockups), right, or whole width.
3. **cv3. Edited line colour.** The theme's accent: magenta in Neon, amber with dark text in HW, teal in Light as the reference (recommended); or one colour for every theme.
4. **cv4. Which tokens light up.** (a) Every playing string, as Strudel does today (sound names and bank names light too, as in the mockups); (b) only the first mini-notation string of `s`, `note`, `n`, `chord` and `struct` in this layout (recommended: closer to the reference, less noise over the scene); the editor keeps Strudel's behaviour.
5. **cv5. Band opacity.** Fixed per theme with a Low/Medium/High setting (recommended); or automatic by the brightness behind each band (smoother, costlier, a later step).
6. **cv6. Widget names in code.** `._rhythm()` and `._chroma()` (recommended, English like Strudel's widgets); or Italian names.
7. **cv7. Code leaving the app.** Strip the app widget calls on copy, Save as pattern and export (recommended); or keep them and add a one-line prelude that defines them as no-ops.
8. **cv8. Where the widgets go by default.** Rhythm grid as the drums' primary widget, chroma as the pad's primary and a secondary for bass, lead, arp and guitar (recommended); the owner picks after the test video, which shows the chroma on all melodic lines, bass, guitar, pad, hook and arp.
9. **cv9. Widget defaults.** Grid: 16 steps, 1 bar, short names, no extra rows, style automatic, trail 2. Chroma: 40 columns, 2 bars, ramp ` .:-=+*#%@`, high notes on top, column normalisation, decay 0.25, labels and chord on (recommended, as the first video screens). Variants in `mockups/widget-*`.
10. **cv10. Labeled lines by default.** Off everywhere until the owner tries it (recommended); or on in Live coder from the start.
11. **cv11. Repeated names.** Numbers in code order: `kick`, `kick2` (recommended); or by section letter (`kickB`). Never a trailing `_` (it mutes).
12. **cv12. Solo form with labels.** `Skick:` (recommended, Strudel's rule, one character as today); or keep `S$:` for solos only.
13. **cv13. Stage widgets.** Also offer the two widgets as Monitor panels and in the strip layer: (a) in a follow-up change, about 1.5 hours (recommended: the painter is shared, but the stage settings card grows); (b) in this change.
14. **cv14. Live output.** Add a "Code over" view to the live output presets (recommended), or only videos and the page.
