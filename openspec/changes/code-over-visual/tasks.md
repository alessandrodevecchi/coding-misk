## 0. Owner

- [ ] 0.1 Owner answers the open questions cv1-cv14 after the mockups and the test video. Verify: "Owner Answers" in the design; proposal, specs and tasks updated
- [ ] 0.2 Owner says go. Verify: answers and go in the DEVLOG

## 1. Painter and layout

- [ ] 1.1 Theme roles `band`, `edit`, `editInk` for every own and Strudel theme, band opacity setting. Verify: `npm run check:code-themes` new cases (text roles 4.5:1 on `band` over black and over white, `editInk` on `edit`)
- [ ] 1.2 `drawCodeOver` painter: rows in cells, bands as wide as the text, empty lines bare, comments and muted blocks dimmed, cut with `…`, eased scroll. Verify: new `npm run check:code-over` (Node, canvas stub): band widths, no band on empty lines, cut column, scroll keeps the focus line in the upper third
- [ ] 1.3 Layout `code-over` in `LAYOUTS` and `F_SHOWS` (every fragment format) with the code area (left, right, whole width); compose, composeVertical and the live output view. Verify: `npm run check:video`, `npm run check:clips`, `npm run check:live` new cases; old layouts' areas unchanged
- [ ] 1.4 Captions and the strip layer use the free area in this layout. Verify: `check:code-over` geometry (no caption or panel box overlaps the code area in 16:9 left, right, whole, and 9:16); `PORT=… node tools/check-captions.cjs` passes

## 2. Page mode

- [ ] 2.1 Stage button "Code over" and full screen, stage to window height, code column folded, overlay canvas drawn after the render pass, mode remembered. Verify: browser check `tools/check-code-over.cjs` (dev server on its own port): mode on and off, reload, full screen, no long task over 50 ms per frame on kellerlicht
- [ ] 2.2 Hand take-over and opening the column show the editor with the overlay kept. Verify: `check-hand.cjs` passes; new case in `check-code-over.cjs`
- [ ] 2.3 Settings card "Code over" with preview, saved, in the backup, texts IT/EN. Verify: `check-settings.cjs`, `check-backup.mjs`, `npm run check:guide`

## 3. Edited line and lit notes

- [ ] 3.1 `typingPlan(...).cursor(t)` → `{ line, col, editing }`, passed by `typeFrame` and `codeFrom`. Verify: `npm run check:typing` new cases (cursor on the typed part, editing ends 0.35 s after the last key or at the evaluation; same cursor in `codeFrom` at the same cycle)
- [ ] 3.2 Edit band and block cursor in the painter; CodeMirror selection for hand code. Verify: `check-code-over.cjs` screenshot at a typed frame; fast video frame at the same cycle has the same edited row
- [ ] 3.3 Real lit locations: scheduler haps in real time, per-frame locations from the render page in the fast video. Verify: `check-code-over.cjs` lit boxes land on the playing tokens (luci-rosse, kellerlicht); `node tools/check-export.cjs` passes and render time grows under 10%
- [ ] 3.4 "Lit notes" Outline / Filled in the code theme settings, in the editor (through `markcss`) and in the painter. Verify: `tools/check-code-themes.cjs` new case; screenshots both values

## 4. App widget registry

- [ ] 4.1 Registry (`name`, defaults, limits, `data`, `paint`) and `registerWidget('_rhythm' | '_chroma')` in both Strudel copies with merged hidden defaults. Verify: a line with `._rhythm({ steps: 8 })` evaluates in the page and the render page; `npm run check:strudel` accepts the calls; Node stubs for the checks without a browser
- [ ] 4.2 Calls stripped on copy, Save as pattern and export. Verify: `npm run check:patterns` new case; copied code evaluates in a plain Strudel in Node

## 5. Rhythm grid

- [ ] 5.1 Data from haps: rows by sound, stable order, steps by meter, played and coming hits, current step, footer. Verify: `check:code-over` cases: `s("bd*4")` lights steps 1, 5, 9, 13; 3/4 gives 12 steps; same data in real time and from the feed store at the same cycle
- [ ] 5.2 Painter in every style (blocks, LED round cells, 1-bit two tones, characters). Verify: `PORT=… node tools/check-render-styles.cjs` new case: the grid pixels are identical with and without each render pass; screenshots

## 6. Chroma

- [ ] 6.1 Data from haps: sources, slices, decay, column and window normalisation, chord recognition and names by key. Verify: `check:code-over` cases: `[a2,c3,e3]` gives `Am` with A, C, E inverted; a full-level note gives the last ramp character; window normalisation is monotonic with level
- [ ] 6.2 Painter in every style. Verify: as 5.2

## 7. Settings and slots

- [ ] 7.1 "App widgets" section in the Code widgets card: on or off, parameters, ramp field, live preview, Default values; backup. Verify: `check-settings.cjs`, `check-backup.mjs`
- [ ] 7.2 The two kinds in `WIDGETS` with primaries (drums: grid; pad: chroma) and secondaries; slots, maximum and muted-line rules of `#79`. Verify: `npm run check:live-code` new cases; `npm run check:mixer -- --full` with the widgets view (same haps); with "Code widgets" off, `npm run check:code` unchanged

## 8. Labeled lines

- [ ] 8.1 Shared `patternLine(line)` helper replacing every `[_S]?\$:` pattern in `src/` and `tools/`, no behaviour change. Verify: `npm run check:code` 46/46 unchanged, `npm run check:typing`, `npm run check:live-code`, `npm run check:mixer -- --full`, `npm run check:crescendo`
- [ ] 8.2 `labelOf` names and the option in the code-look controls; compiler, compact code, voice lines, air code and waypoints write labels when on. Verify: `npm run check:mixer -- --full` labels view (same haps in every profile and preset); new `labels` snapshots via `npm run snapshot:code` for the labels set only
- [ ] 8.3 Mute `_name:`, solo `Sname:` across typing, mixer, timeline, compact code, widgets and video dimming. Verify: `check:typing` (a mute is one character); `check-timeline.cjs`, `check-code-widgets.cjs` pass with labels on
- [ ] 8.4 Guard on hand code (duplicates, `S` + letters, trailing `_`) and validator rule. Verify: browser case in `check-code-over.cjs` (two `bass:` lines show the warning); `npm run check:songs`
- [ ] 8.5 Strudel catalog: label forms and the two widget calls. Verify: `npm run catalog:strudel`, `npm run check:knowledge` without the stale warning

## 9. Closing

- [ ] 9.1 Guide cards (Code over, App widgets, Labeled lines) in English and Italian. Verify: `npm run check:guide`
- [ ] 9.2 Knowledge base: visuals, code widgets, settings, decisions, checks; `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`. Verify: `npm run knowledge`, `npm run check:knowledge`
- [ ] 9.3 Full regression: `check:video`, `check:clips`, `check:live`, `check:export`, `check:render-styles`, `check:code-themes`, `check:captions` (browser), `node tools/snapshot-levels.cjs check`. Verify: all pass
- [ ] 9.4 Screenshots and a short video for the owner in `notes/` (neon, HW, light, 16:9 and 9:16, 400 px page). Verify: files listed in the DEVLOG
