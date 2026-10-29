# Tasks

Steps 1 and 2 of #90. Step 3 (finished Ring, Fast vibrato) waits for the owner's verdict on the trial.

## 1. Fold

- [x] 1.1 Add the `fold` device to `src/song/rack.js` (D1, D2): amount 0.1–3, curve sharp/soft with labels, level `distortvol(max(1/g, P))`.
  Done with a difference: the level was `1/g` first; measured, a folded line fell far below its level (drums −15 dB RMS at Amount 3), so the level is `max(1/g, P)` with `P` the usual peak of the track type (D2), and the default Amount is 1.5.
- [x] 1.2 Translated choice labels (D5) in the Compose device row (`src/main.js`), `arg_curve` and the device names in `src/i18n.js`.
- [x] 1.3 Validator warning for Fold with Distortion on one track (`checkRack`).
- [x] 1.4 Fold among the director's voice devices (D6), `DIRECTOR_VERSION` + 1, endless fixtures rewritten.
  Done with a difference: Fold is drawn from a stream of its own (`fork('fold/<song>')`) after the other voice devices, so the music and the old draws do not move; only the seed fixtures' voice hashes moved. The checks that hash whole songs (complexity 0, old commands) leave the voices' Fold out.

## 2. Ring trial

- [x] 2.1 Add the `ring` device (D3): frequency 30–2000 Hz, amount 0–1, `.K(audioin().mul(sine(f).mul(a).add(1 - a)).out())`, label "(trial)".
- [x] 2.2 The code scanner of `check:strudel` skips the Kabelsalat expression inside `K(…)`.
- [x] 2.3 Measure it (D4): sound and level in the page, the fast export, the cost on a 12-track radio; record the numbers.

## 3. Checks

- [x] 3.1 `npm run check:fm-effects` (Node, D7).
- [x] 3.2 `tools/check-fm-effects.cjs` (browser, D4).
- [x] 3.3 Run `check:code`, `check:songs`, `check:mixer`, `check:strudel`, `check:endless`, `check-settings`, `check-radio`, `check:export`, `check:guide`, `check:knowledge`.

## 4. Texts and docs

- [x] 4.1 Guide: the rack card in Compose names Fold and Ring, in both languages.
- [x] 4.2 Knowledge: `npm run knowledge` (rack table), sound-and-levels (Fold level rule, Ring trial and its numbers), decisions, checks.
- [x] 4.3 DEVLOG (Italian), listening list for the owner (local notes).
