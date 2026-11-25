# Tasks

Steps 1 and 2 of #95, then the devices' knobs as a later phase. Depends on #94 (`random-sound-params`): branch from `feat/94-random-sound-params` once it is merged into `develop`.

## 0. Base

- [x] 0.1 Rebase onto #94 merged; read its final D4 merge and skip rule in the writer and validator, and update D2 if it changed.

## 1. Movement devices (step 1)

- [x] 1.1 Add the `move` kind and the `writes` list to every device in `src/song/rack.js`; make #94's skip rule read `writes` (D2). `npm run check:code` must not move.
- [x] 1.2 Base values for modulated controls, merged with #94's one-call-per-control rule; absolute depth (`da`) everywhere (D3).
- [x] 1.3 Sweep (D4): ramp aligned to the clip like the FM rise, `once` and `loop`, the in-note glide with `env`; measure the glide in the browser (spectrum at four points of a held bar); keep steps only if it clicks or overshoots, and record it in D4.
- [x] 1.4 LFO (D5): filter form with `lpsync`, `lpdepth`, `lpshape`, generic form with `lfo`; measure `lpdepth`'s units and fix the depth mapping.
- [x] 1.5 Pump (D6): the kick-line write in `src/song/compile.js` / `src/music.js` (one entry per pumped track, none from muted or soloed-out drums), the beat gain LFO without a kick that only dips; pick its shape and offset by measurement.
- [x] 1.6 Validator (`src/song/validate.js`, `checkRack`): limits per track, Sweep over track automation, every error and warning of the spec with JSON paths. Document the devices in `docs/SONG-FORMAT.md`.
- [x] 1.7 Compose cards (`src/main.js`): the new "Movement" group (Italian "Movimento") in the existing "+ Add device" menu, no separate panel, choice labels in both languages (`src/i18n.js`), the code preview.
- [x] 1.8 Example songs in `songs/examples/` (a pumped pad, a swept pad, a swaying pad).

## 2. Checks for step 1

- [x] 2.1 `npm run check:modulation` (Node, D10).
- [x] 2.2 `tools/check-modulation.cjs` (browser, D10): plays, levels with and without, glide, fast export against real time.
- [x] 2.3 `npm run catalog:strudel`, `check:strudel`, `check:code`, `check:songs`, `check:functions`, `check:mixer`, `check-levels.cjs` on the examples, `check:export`.

## 3. Decode bench (step 2)

- [x] 3.1 The five modulated songs in two takes in `tools/decode-songs.mjs` (VALIDATION), exported by `tools/decode-export.cjs` (D9).
- [x] 3.2 `modTruth(song)` and `modScore(truth, measured)`; self checks in `check:decode`.
- [x] 3.3 `envelopeError` in `tools/decode-hits.mjs`, reported next to the band error in `tools/decode-bench.cjs`.
- [x] 3.4 Baseline run (`--set every`), numbers in `DEVLOG.md`.

## 4. Texts and docs (steps 1 and 2)

- [x] 4.1 Guide (`src/guide.js`): the rack card names Apertura, Oscillazione and Pompa, the phase note of D5, both languages; `npm run check:guide`.
- [x] 4.2 Knowledge: `npm run knowledge` (rack table), sound-and-levels (Pump and movement level rules), decisions (rack devices beside `vary`; absolute depth; `bmod` bus key), Decode bench note; `npm run check:knowledge`.
- [x] 4.3 DEVLOG (Italian); owner tests 1-7 into the overall checklist artifact.

## 5. Owner review

- [ ] 5.1 Show the owner tests 1-7; act on the notes before the later phase.

## 6. Knobs (later phase, after the owner's go and the UI review)

- [ ] 6.1 `path` on movement devices, validator limits (two movement devices per track, 256 points) (D1, D7).
- [ ] 6.2 Bus driver in `src/sounds/`: one `ConstantSourceNode` per Sweep or LFO on bus N carrying the knob's offset from the set value (0 when untouched), reconnected after every `reset()`; `.bmod({ b: N, c, da })` in the writer; Pump through `ref()`.
- [ ] 6.3 Compose card: the main knob as the first row of every movement device's card (Sweep opening, LFO depth, Pump depth), starting at the set value, the drawn "acts at once" mark (`src/icons.js`, no "Live" text), the record dot, path recording and playback, hand wins (D7, D8); both themes, hardware knob, 400 px.
- [ ] 6.4 Export: real time as playback; fast export schedules paths on the render page's controller (`src/render/page.js`); copied code writes the path as steps per bar with a comment.
- [ ] 6.5 Code: `knob(n)` with the editor's slider widget (check the transpiler's widget hook; else an app code widget in `src/widgets/app-widgets.js`).
- [ ] 6.6 Radio console: knobs in the Parts row only while the selected part plays a movement device, at most two, acting while the song plays, never recorded (`src/radio/radio.js`, `src/style.css`).
- [ ] 6.7 Browser check: untouched knob leaves the sound as set, knob moves a held note, Stop, Play and re-evaluation, path replay, fast against real-time export, copied code in plain Strudel, radio row and no path saved from the radio; guide and knowledge; owner tests 8-9.
