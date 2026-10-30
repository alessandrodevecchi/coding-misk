## 0. Owner

- [x] 0.1 Owner answers the open questions cv1-cv14 after the mockups and the test video. Verify: "Owner Answers" in the design; proposal, specs and tasks updated
- [x] 0.2 Owner says go. Verify: answers and go in the DEVLOG

## 1. Painter and layout

- [ ] 1.1 Theme roles `band`, `edit`, `editInk` for every own and Strudel theme, band opacity setting (Low, Medium, High) with the theme's floor. Verify: `npm run check:code-themes` new cases (text roles 4.5:1 on `band` over black and over white at every opacity, `editInk` on `edit`)
- [ ] 1.2 `drawCodeOver` painter: rows in cells, bands as wide as the text, empty lines bare, comments and muted blocks dimmed, cut with `…`, eased scroll. Verify: new `npm run check:code-over` (Node, canvas stub): band widths, no band on empty lines, cut column, scroll keeps the focus line in the upper third
- [ ] 1.3 Layout `code-over` in `LAYOUTS` and `F_SHOWS` (every fragment format) with the code area (left, right, whole width; width setting, default 62%); compose, composeVertical and the live output view "Code over". Verify: `npm run check:video`, `npm run check:clips`, `npm run check:live` new cases; old layouts' areas unchanged
- [ ] 1.4 Captions and the strip layer use the free area in this layout. Verify: `check:code-over` geometry (no caption or panel box overlaps the code area in 16:9 left, right, whole, and 9:16); `PORT=… node tools/check-captions.cjs` passes

## 2. Page mode

- [ ] 2.1 Optional stage mode "Code over" (off by default): button in the stage bar and in full screen, overlay canvas drawn after the render pass, the editor column left as it is, mode remembered. Verify: browser check `tools/check-code-over.cjs` (dev server on its own port): off by default, on and off, the editor still open, reload, full screen, no long task over 50 ms per frame on kellerlicht
- [ ] 2.2 Hand take-over keeps the overlay; the user types in the editor. Verify: `check-hand.cjs` passes; new case in `check-code-over.cjs`
- [ ] 2.3 Settings card "Code over" with preview (stage mode, side, width, opacity, edited line, lit tokens, long lines), saved, in the backup, texts IT/EN. Verify: `check-settings.cjs`, `check-backup.mjs`, `npm run check:guide`

## 3. Edited line and lit notes

- [ ] 3.1 `typingPlan(...).cursor(t)` → `{ line, col, editing }`, passed by `typeFrame` and `codeFrom`. Verify: `npm run check:typing` new cases (cursor on the typed part, editing ends 0.35 s after the last key or at the evaluation; same cursor in `codeFrom` at the same cycle)
- [ ] 3.2 Edit band in the theme's accent and block cursor in the painter; CodeMirror selection for hand code. Verify: `check-code-over.cjs` screenshot at a typed frame; fast video frame at the same cycle has the same edited row
- [ ] 3.3 Real lit locations: scheduler haps in real time, per-hap locations from the render page in the fast video; lit tokens setting (first string, every string). Verify: `check:code-over` (first string only); `check-code-over.cjs` lit boxes land on the playing tokens (luci-rosse, kellerlicht); `node tools/check-export.cjs` passes and render time grows under 10%
- [ ] 3.4 "Lit notes" Outline / Filled in the code theme settings, in the editor (a style rule over Strudel's marks) and in the painter. Verify: `tools/check-code-themes.cjs` new case; screenshots both values

## 4. App widget registry

- [ ] 4.1 Registry (`name`, defaults, limits, `data`, `paint`) and `registerWidget('_hitgrid' | '_tonecloud')` in both Strudel copies with merged hidden defaults. Verify: a line with `._hitgrid({ steps: 8 })` evaluates in the page and the render page; `npm run check:strudel` accepts the calls; Node stubs for the checks without a browser
- [ ] 4.2 Calls commented out in place (`/* ._hitgrid() */`) on copy, Save as pattern and export. Verify: `check:code-over` cases; the commented code evaluates in a plain Strudel in Node with the same haps; `npm run check:patterns`

## 5. Hit grid

- [ ] 5.1 Data from haps: rows by sound and variant, the bass row, stable order, steps by meter, played and coming hits, current step, footer. Verify: `check:code-over` cases: `s("bd*4")` lights steps 1, 5, 9, 13; `hh` and `hh:3` are two rows; 3/4 gives 12 steps; same data in real time and from the feed store at the same cycle
- [ ] 5.2 Painter in every style (blocks, LED round cells, 1-bit two tones, characters). Verify: `PORT=… node tools/check-render-styles.cjs` passes; `check:code-over` style per render; screenshots

## 6. Tone cloud

- [ ] 6.1 Data from haps: sources, slices, decay, spread to neighbours and overtones, column and window normalisation, chord recognition and names by key. Verify: `check:code-over` cases: `[a2,c3,e3]` gives `Am` with A, C, E inverted; a full-level note gives the last ramp character; a lone A lights its neighbours and E more lightly; window normalisation is monotonic with level
- [ ] 6.2 Painter in every style. Verify: as 5.2

## 7. Settings and slots

- [ ] 7.1 "App widgets" section in the Code widgets card: on or off, parameters, ramp field, live preview, Default values; backup. Verify: `check-settings.cjs`, `check-backup.mjs`
- [ ] 7.2 The two kinds in `WIDGETS` with primaries (drums: hit grid; pad and voice: tone cloud) and secondaries (bass, lead, arp, guitar: tone cloud); slots, maximum and muted-line rules of `#79`. Verify: `npm run check:live-code` new cases; with "Code widgets" off, `npm run check:code` unchanged
- [ ] 7.3 Strudel catalog: the two widget calls. Verify: `npm run catalog:strudel`, `npm run check:knowledge` without the stale warning

## 8. Closing

- [ ] 8.1 Guide cards (Code over, App widgets) in English and Italian. Verify: `npm run check:guide`
- [ ] 8.2 Knowledge base: visuals, code widgets, settings, decisions, checks; `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`. Verify: `npm run knowledge`, `npm run check:knowledge`
- [ ] 8.3 Full regression: `check:video`, `check:clips`, `check:live`, `check:export`, `check:render-styles`, `check:code-themes`, `check:light-theme`, `check:captions` (browser), settings, code widgets, timeline, hand, guide, knowledge, `check:code`, `vite build`. Verify: all pass
- [ ] 8.4 Pictures for the owner in `notes/prove-2026-10-30/code-over-visual/` named `*-v2.*`: the widgets before and after the denser defaults, the layout (neon, HW, light, 16:9 and 9:16), and a short clip in 16:9 and 9:16 (20-40 s, app audio). Verify: files listed in the DEVLOG

Labeled lines (cv10-cv12) are not in this change: they will be a separate change, related to the code comment options.
