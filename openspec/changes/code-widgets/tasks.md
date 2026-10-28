## 0. Owner

- [x] 0.1 Owner answers the open questions in the design (number, muted lines in the count, importance order, variety, fast video limit, faint pianoroll). Verify: "Owner Answers" in the design; proposal, spec and tasks updated
- [ ] 0.2 Owner says go. Verify: answers and go in the DEVLOG

## 1. Base

- [ ] 1.1 Range update of the editor (equal prefix and suffix, one transaction) for every `setCode` of a playing song in `src/main.js`; full replacement kept for a new song and hand code. Verify: browser check, text at every typed frame equal to the full replacement; `check-hand.cjs`
- [ ] 1.2 Wrapper for the six `_` methods in `installHelpers` (page and render page): merge hidden groups and line options, pass every parameter on, clear a reused canvas. Verify: a line with `labels` and `overscan` evaluates; a new `_spectrum` starts blank
- [ ] 1.3 `_scope` and `_spectrum` keep `analyze` and read the instrument's analyser each frame. Verify: browser check, haps keep `analyze`, scope moves with the bass
- [ ] 1.4 Hidden object `miskWidgets` from the settings and the theme colours (neon, hardware)
- [ ] 1.6 Dimmed class on the widget element of a `_$:` line, set after each evaluation and range update, removed when the line returns; theme tokens of the muted code lines. Verify: browser check, all six widgets on a muted line are grey, semi-transparent and dashed; normal after the unmuting evaluation; dimmed look off leaves them as Strudel draws them
- [ ] 1.7 "Widget notes": "always full" draws from a copy of the haps with gain 1 for the widget only. Verify: pad line at gain 0.1 drawn at full opacity; `check:mixer` case, haps identical with both values
- [ ] 1.5 Node stubs for the `_` methods; `check:strudel` accepts them; `npm run catalog:strudel`. Verify: `npm run check:strudel`

## 2. Settings

- [ ] 2.1 "Code widgets" card with collapsible sections: general, muted lines, widgets, instruments, parameters, sizes; defaults (off, maximum 3, slot order bass, lead, drums, arp, hats, pad, fx, voice, secondary share 25%, return window 16 bars, dimmed look on, "Widget notes" as chosen in 7.4, `_spiral` and `_pitchwheel` off, `labels` and `smear` off, fx and voice off, the default mapping, pianoroll or punchcard). Verify: `check-settings.cjs` with screenshots
- [ ] 2.4 Each new setting changes what it says. Verify: `check-settings.cjs` cases: maximum 1 gives one widget; drums first in the order takes the slot over bass; share 0% gives only primary widgets; window 8, 16, 32, always each keep or remove a muted widget at 12 and 24 bars; dimmed off shows a muted widget undimmed; "Widget notes" switches the pianoroll opacity
- [ ] 2.5 Video setting "Real scope and spectrum in the fast video" ("Automatic" default, "Always real") with the video settings, saved and in the backup. Verify: `check-settings.cjs`, `check-backup.mjs`
- [ ] 2.2 Saved, in the backup, reset to defaults. Verify: `check-backup.mjs`
- [ ] 2.3 Texts in English and Italian in `src/i18n.js`. Verify: `npm run check:guide`

## 3. Writing in growing profiles

- [ ] 3.1 Module `src/live/widgets.js`: instrument of a track, widget of a line (primary, or secondary by the share and the seed), target count per section from 1 to the maximum by the seed, slots by the slot order and seed, muted lines in the count, `stripWidgets(line)`. Verify: new cases in `check:live-code`: same song same widgets; the count varies across sections and never passes the maximum; about 25% secondary over the built-in songs; a muted widget takes a slot
- [ ] 3.2 `stripWidgets` in `lineKey`, `plainKey`, `norm`, `shownLine`, reused lines, copy limits. Verify: `check:typing`, `npm run growth:probe -- all` same counters with the option off
- [ ] 3.3 Calls added in `liveCode.codeWith` after folding and before `breakLines` and the hidden tail. Verify: `npm run check:mixer -- --full` with a new case with widgets on (same gain, orbit, analyze, postgain, velocity)
- [ ] 3.4 Post-pass after the growth: moment 1, moment 2, muted lines (carried or added in a pause, only when they return within N bars), fallback at once. Verify: `check:typing` cases; Live coder fixtures unchanged (`node tools/check-crescendo.mjs`); if an intended change moves them, raise `SHAPES_VERSION` and run `npm run durations` in the same commit
- [ ] 3.5 Crescendo and Classic with growth use the same post-pass. Verify: `npm run check:crescendo -- --full`, Crescendo fixtures unchanged

## 4. Classic and songs that do not grow

- [ ] 4.1 Classic rules: widget on the playing line, move at a section change, remove when silent, keep on a muted line returning within N bars (setting, default 16). Verify: `check:live-code` cases for 8, 16, 32 and always
- [ ] 4.2 Songs that do not grow: calls replaced at each boundary, one evaluation at the boundary; "one line per track" never moves
- [ ] 4.3 Browser check `tools/check-code-widgets.cjs` (dev server on its own port): widgets at every typed frame and after a text change without evaluation, scope instrument, Classic moves on luci-rosse, dimmed muted widgets, every boundary without underrun or level jump against the option off, frame time. Verify: the check passes; screenshots for the owner

## 5. Videos and live output

- [ ] 5.1 "Code + widgets" scenes; old scenes unchanged. Verify: `npm run check:video`, `npm run check:clips`
- [ ] 5.2 `drawCode` copies widget canvases below their lines in the session video, fragments and live output, with the dimmed look on muted lines when it is on. Verify: `node tools/check-video.cjs`, `node tools/check-clips.cjs`, `npm run check:live`, `node tools/check-live.cjs`
- [ ] 5.3 Fast video: haps by line from the render page, redraw with Strudel's drawing functions. Verify: `npm run check:export`
- [ ] 5.4 Fast video scope and spectrum: one extra render per track with a widget; "Automatic" falls back to the master waveform over twice the time and says so in the export log, "Always real" never falls back. Verify: `node tools/check-export.cjs` with two scope tracks and a forced slow limit, once per value; time measured in the DEVLOG

## 6. Regression

- [ ] 6.1 With the option off: `npm run check:code`, `npm run check:mixer`, `npm run check:strudel`, `npm run check:functions`, `npm run check:typing`, `npm run check:live-code`, `npm run check:crescendo`, `npm run check:durations`, `check-compact-code.cjs`, `check-startup.cjs`, `node tools/snapshot-levels.cjs check` pass without new fixtures

## 7. Guide and docs

- [ ] 7.1 Guide card "Code widgets" in `src/guide.js`, English and Italian. Verify: `npm run check:guide`
- [ ] 7.2 Knowledge base: a code widgets note (widgets, mapping, parameters, rules per profile, gotchas), settings, `decisions.md` (approach A now, B later on the stage; range update; analyser wrapper), `checks.md` (new check); `npm run knowledge`. Verify: `npm run check:knowledge`
- [ ] 7.3 `docs/ARCHITECTURE.md` (code panel, video), DEVLOG entry with the measures and the screenshots shown to the owner
- [ ] 7.4 "Widget notes" default: measure the real track volumes (gain after the hidden mixer) of the built-in songs, take screenshots of pianoroll lines with "follow the volume" and "always full", show them to the owner and set the default he chooses. Verify: measures and choice in the DEVLOG; default in 2.1
