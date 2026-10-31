## 1. Devices (about 1.5 h)

- [ ] 1.1 Fold's optional `steps` (D3) and the FM device's optional `rise` in `src/song/rack.js`, with validator rules; verify with `npm run check:fm-effects` (each step's level by `foldLevel`, the rise's last sixteenth at `to`) and `npm run check:strudel`.
- [ ] 1.2 Ring's label without "(trial)" if the owner agrees (open question 1), both languages.

## 2. Gestures in the director (about 3 h)

- [ ] 2.1 The five gestures (D1) with their parts, tracks and steps, drawn from `gestures/<index>` (D4); the ranges of D2.
- [ ] 2.2 The safety rules (D5): Fold and Distortion, the Ring cap, the busiest line, locks and listener tracks; verify in Node over 300 seeds: no rule broken, at most two gestures per song.
- [ ] 2.3 The `gestures` recipe field and the family defaults (D4) in `src/endless/recipe.js`, `check:styles` accepts it; verify the rates over 200 seeds per family (`npm run check:endless` extended).
- [ ] 2.4 The `gestures: false` option and the comparison with the version 14 fixtures (D6); verify they match exactly.

## 3. Version and fixtures (about 0.5 h)

- [ ] 3.1 `DIRECTOR_VERSION` 15 with its comment line; `npm run check:endless -- --write-fixtures` in the same commit; `check:mixer`, `check:code`, `check:songs` pass.

## 4. Levels and cost (about 1.5 h)

- [ ] 4.1 `tools/check-arrangement-levels.cjs` on darksynth, industrial, berlin-techno, ambient with gestures: output below 1.0, no track louder by more than 0.02 with its gesture.
- [ ] 4.2 `tools/check-fm-effects.cjs` real time on darksynth and industrial with gestures: underruns no higher than without; record the numbers in `docs/knowledge/sound-and-levels.md`.
- [ ] 4.3 `node tools/check-radio.cjs` and a 20-minute session per family with `npm run endless`, then `tools/endless-recap.mjs` with a line per gesture heard, for the owner's listening.

## 5. Docs (about 0.5 h)

- [ ] 5.1 `docs/ENDLESS.md` (gestures), `docs/STYLES.md` (the field), `docs/knowledge/decisions.md`, `npm run knowledge`, `check:knowledge`; DEVLOG entry in Italian.

Total: about 7 agent hours.
