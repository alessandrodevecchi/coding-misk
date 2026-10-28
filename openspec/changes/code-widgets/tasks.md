## 0. Owner

- [ ] 0.1 Owner answers the open questions in the design (number, muted lines in the count, importance order, variety, fast video limit, faint pianoroll) and says go. Verify: answers in the DEVLOG; design updated

## 1. Base

- [ ] 1.1 Range update of the editor (equal prefix and suffix, one transaction) for every `setCode` of a playing song in `src/main.js`; full replacement kept for a new song and hand code. Verify: browser check, text at every typed frame equal to the full replacement; `check-hand.cjs`
- [ ] 1.2 Wrapper for the six `_` methods in `installHelpers` (page and render page): merge hidden groups and line options, pass every parameter on, clear a reused canvas. Verify: a line with `labels` and `overscan` evaluates; a new `_spectrum` starts blank
- [ ] 1.3 `_scope` and `_spectrum` keep `analyze` and read the instrument's analyser each frame. Verify: browser check, haps keep `analyze`, scope moves with the bass
- [ ] 1.4 Hidden object `miskWidgets` from the settings and the theme colours (neon, hardware)
- [ ] 1.5 Node stubs for the `_` methods; `check:strudel` accepts them; `npm run catalog:strudel`. Verify: `npm run check:strudel`

## 2. Settings

- [ ] 2.1 "Code widgets" card with collapsible sections: general, widgets, instruments, parameters, sizes; defaults (off, 3, `_spiral` and `_pitchwheel` off, `labels` and `smear` off, fx and voice off, the default mapping, pianoroll or punchcard). Verify: `check-settings.cjs` with screenshots
- [ ] 2.2 Saved, in the backup, reset to defaults. Verify: `check-backup.mjs`
- [ ] 2.3 Texts in English and Italian in `src/i18n.js`. Verify: `npm run check:guide`

## 3. Writing in growing profiles

- [ ] 3.1 Module `src/live/widgets.js`: instrument of a track, widget of a line, slots by importance and seed, `stripWidgets(line)`. Verify: new cases in `check:live-code`
- [ ] 3.2 `stripWidgets` in `lineKey`, `plainKey`, `norm`, `shownLine`, reused lines, copy limits. Verify: `check:typing`, `npm run growth:probe -- all` same counters with the option off
- [ ] 3.3 Calls added in `liveCode.codeWith` after folding and before `breakLines` and the hidden tail. Verify: `npm run check:mixer -- --full` with a new case with widgets on (same gain, orbit, analyze, postgain, velocity)
- [ ] 3.4 Post-pass after the growth: moment 1, moment 2, muted lines (carried or added in a pause), fallback at once. Verify: `check:typing` cases; Live coder fixtures unchanged (`node tools/check-crescendo.mjs`); if an intended change moves them, raise `SHAPES_VERSION` and run `npm run durations` in the same commit
- [ ] 3.5 Crescendo and Classic with growth use the same post-pass. Verify: `npm run check:crescendo -- --full`, Crescendo fixtures unchanged

## 4. Classic and songs that do not grow

- [ ] 4.1 Classic rules: widget on the playing line, move at a section change, remove when silent, keep on a muted line returning within 8 bars
- [ ] 4.2 Songs that do not grow: calls replaced at each boundary, one evaluation at the boundary; "one line per track" never moves
- [ ] 4.3 Browser check `tools/check-code-widgets.cjs` (dev server on its own port): widgets at every typed frame, scope instrument, Classic moves on luci-rosse, every boundary without underrun or level jump against the option off, frame time. Verify: the check passes; screenshots for the owner

## 5. Videos and live output

- [ ] 5.1 "Code + widgets" scenes; old scenes unchanged. Verify: `npm run check:video`, `npm run check:clips`
- [ ] 5.2 `drawCode` copies widget canvases below their lines in the session video, fragments and live output. Verify: `node tools/check-video.cjs`, `node tools/check-clips.cjs`, `npm run check:live`, `node tools/check-live.cjs`
- [ ] 5.3 Fast video: haps by line from the render page, redraw with Strudel's drawing functions. Verify: `npm run check:export`
- [ ] 5.4 Fast video scope and spectrum: one extra render per track with a widget, fallback to the master waveform over the time limit. Verify: `node tools/check-export.cjs` with two scope tracks; time measured in the DEVLOG

## 6. Regression

- [ ] 6.1 With the option off: `npm run check:code`, `npm run check:mixer`, `npm run check:strudel`, `npm run check:functions`, `npm run check:typing`, `npm run check:live-code`, `npm run check:crescendo`, `npm run check:durations`, `check-compact-code.cjs`, `check-startup.cjs`, `node tools/snapshot-levels.cjs check` pass without new fixtures

## 7. Guide and docs

- [ ] 7.1 Guide card "Code widgets" in `src/guide.js`, English and Italian. Verify: `npm run check:guide`
- [ ] 7.2 Knowledge base: a code widgets note (widgets, mapping, parameters, rules per profile, gotchas), settings, `decisions.md` (approach A now, B later on the stage; range update; analyser wrapper), `checks.md` (new check); `npm run knowledge`. Verify: `npm run check:knowledge`
- [ ] 7.3 `docs/ARCHITECTURE.md` (code panel, video), DEVLOG entry with the measures and the screenshots shown to the owner
