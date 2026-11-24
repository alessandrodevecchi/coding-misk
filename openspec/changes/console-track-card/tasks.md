# Tasks

Estimate: 11 to 13 agent hours. Branch `feat/82-console-track-card` from `feat/95-movement-paths`.

## 1. Steering and pure helpers

- [x] 1.1 `src/endless/steering.js`: the `sound` command (group `sound`), `whyNot` (late, not-playing), the rewrite as listener steps kept in `plan.varied` (D2).
- [x] 1.2 `src/material/dice.js`: `rollMove` (D4): melodic types, Sweep, LFO, Pump, Gate, at most one owned, MOVE_MAX, `checkRack`, no Path.
- [x] 1.3 `src/radio/track-card.js`: the radio roll (sound, texture sample, movement, locks, owned devices), the history and its chips, the new pattern per type, the library list of a track (D3, D5, D7).

## 2. Console

- [x] 2.1 `src/radio/radio.js`: the card under the Mixer row (D1), Sound row (D2, D3, D5), Pattern row (D7); the batch entries for sounds and card patterns, their Queue rows and ✕, the chips' states.
- [x] 2.2 The console's order (D8): «Instrument» out of the Sound group, ♪ out of the Mixer, the I key, the saved patterns panel after the Mixer and hidden by default.
- [x] 2.3 `src/main.js` (`savePattern`), `src/i18n.js` (English and Italian), `src/style.css` (card, chips, 400 px, hardware and light), drawn icons only.

## 3. Checks

- [x] 3.1 `tools/check-track-card.mjs` (`npm run check:track-card`, D9).
- [x] 3.2 `tools/check-track-card.cjs` (browser, D9), screenshots in `notes/console-scheda-ascolto/`.
- [x] 3.3 The radio chain: steer-memo, endless, radio-profiles, live-code, sound-guard, knowledge, guide, decode, decode-library, stage-video, stage-widgets, strudel, oscilloscope, added-play, line-names, modulation; `npm run build`.

## 4. Texts and docs

- [x] 4.1 `src/guide.js` (the console card: the track card, the `sound` command), `src/ai/commands.js` (`sound` in LEFT_OUT with its reason), `npm run check:guide`, `npm run check:agent-api`.
- [x] 4.2 Knowledge (radio commands, radio), `npm run knowledge`, `npm run check:knowledge`; CHANGELOG, DEVLOG.
- [x] 4.3 sound-modulation: task 6.6, design and `app/device-knobs` place the radio knobs in the card's Movement row (D6).
- [x] 4.4 Owner tests (Italian) in `notes/console-scheda-ascolto/checklist-items.json`.
