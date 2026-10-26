# Tasks

Code starts only after the owner approves this change and answers the open questions of `design.md`.

## 1. FM lab module (phase 1)

- [ ] 1.1 Add `src/sounds/fm-lab.js` with `FM_CARDS` (D2): kind, names in both languages, carrier, `fm` device, part and preset, tempo, octave, the maximum FM amount by the octave rule.
- [ ] 1.2 Add `fmWave(card, index, opts)` (D5) and `fmRise(expr, top)` (D4), and the loop of a card for each mode (`loopSong` with the rack).
- [ ] 1.3 Add `npm run check:fm-lab` (Node): one card per FM kind of `SOUND_KINDS`; each patch passes `fmInRange` and the kind's rule; FM 0 draws the plain carrier; the drawing matches a direct numeric integration; every mode's expression evaluates with Strudel in Node; the FM rise goes from 0 to the top over 4 bars.

## 2. Sounds tab (phase 1)

- [ ] 2.1 Add the "FM" category, its cards (wave thumbnail, names, headphones) and search by name and "fm" in `src/sounds/browser.js` (D1).
- [ ] 2.2 Add the card detail: the four drawings, the FM amount control, the scope, the three modes, "Use in track" and Copy (D5, D6, D7). Both themes and phone width (two by two drawings below 600 px).
- [ ] 2.3 Add the strings in `src/i18n.js` in both languages (D8).

## 3. Lab preview (phase 1)

- [ ] 3.1 Add the optional `analyze` id to `previewExpression` (default none) and check that Compose and the radio previews keep the same expression (`npm run check:preview`).
- [ ] 3.2 Add `labPreview` in `src/main.js` (D3): source from the selected card, mode and amount; orbit 30; one preview at a time with the Compose preview; stop on leaving the Sounds tab, on an export or a recording; swap at the next bar.
- [ ] 3.3 Draw the scope from `getAnalyzerData('time', 'fmlab')` with a zero-crossing trigger; skip `fmlab` in the stage visual (`src/visuals.js`).
- [ ] 3.4 "Use in track": the wave and the FM device on the selected track through `useSound` and the rack; disabled with a reason without a melodic track.

## 4. Checks and docs (phase 1)

- [ ] 4.1 Add `tools/check-fm-lab.cjs` (dev server): every card plays alone and over a song without changing the main player; one preview at a time; stop on leaving the tab and on export; modes and amount swap at the next bar; the scope's zero crossings for a held note match the drawing within 10%; peaks below 0.97 for every card and mode at the top amount; Italian and English labels; screenshots in both themes at 400 px.
- [ ] 4.2 Run `npm run check:fm-lab`, `npm run check:preview`, `npm run check:guide`, `npm run check:knowledge`, `npm run build`, and the browser checks for preview, sounds and the new lab.
- [ ] 4.3 Update the Sounds card in `src/guide.js` (both languages), `docs/knowledge/sounds.md` (the FM section and the formula), `docs/knowledge/glossary.md` (FM amount, lab preview), `docs/ARCHITECTURE.md` (the third preview), `docs/knowledge/decisions.md` (D1, D9), the AGENTS.md tool list and `DEVLOG.md`.

## 5. Riser sounds (phase 2, only if the owner chooses "together"; otherwise a new change)

- [ ] 5.1 Add the riser `sound` setting (`noise`, `fm-up`, `fm-down`) to the song format and the validator; the compiler writes the FM riser; `noise` compiles as today.
- [ ] 5.2 Grow `RISER_SOUNDS` and the console's "Suono" menu; record and replay the sound in the riser command; the director keeps `noise` unless a style names another.
- [ ] 5.3 Add the "Riser" category in the Sounds tab with the headphones and the sweep drawing, reusing the lab preview.
- [ ] 5.4 Add the `risers` kind to the Patterns tab and store (sound, bars, direction), the backup, and the "Suono" menu.
- [ ] 5.5 Measure the FM risers' levels; update code and level snapshots for songs with risers in the same commit and say why; run `check:steering`, `check:patterns`, `check:mixer`, `check:endless`, the fast export and the video checks.
