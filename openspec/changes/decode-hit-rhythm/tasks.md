# Tasks

Estimate: about 14 agent hours (round 11 plan: A 3-4, B 3, C 2-3, D 1-2, E 1, F 0.5, G 2-3).

## 1. Measure (G)

- [x] 1.1 `tools/decode-hits.mjs`: hit density per band from the audio, per-part onsets from the code.
- [x] 1.2 `HIT_SONGS` in `tools/decode-songs.mjs`, `--hits` in `tools/decode-export.cjs`, `--set hits` in `tools/decode-bench.cjs`.
- [x] 1.3 Baseline before any fix: every, hits, owner and the 26 real tracks.

## 2. Chords (A and B)

- [x] 2.1 `src/decode/hit-measure.js`: `chordHits`, `bassAttack`.
- [x] 2.2 `full.js`: `chordHits`, `chordHeld`, `chordTonal` per chord bar; `bassAttack` per bass bar.
- [x] 2.3 Writer: `CHORD_RULE`; the struct per section (the rules of B, no chords under a tonal share and no power chords on the bass's roots, were measured and dropped).
- [x] 2.4 Bench and verdict (A ships with `steady` 0.65; B dropped).

## 3. Bass, twins, levels (C, D, E)

- [x] 3.1 C: `BASS_FILL`, the repeated notes; bench and verdict (ships).
- [x] 3.2 D: `TWIN_RULE`; bench and verdict (ships).
- [x] 3.3 E: a ceiling on the chords' gain; bench and verdict (dropped).

## 4. Close

- [ ] 4.1 `ANALYSIS_VERSION` 20; `check:decode` cases for the new rules; the Guide's Decode card; CHANGELOG; DEVLOG; knowledge notes.
- [x] 4.2 F: the distorted sound of real-16 (verification only).
- [ ] 4.3 The learned beat tracker with the round's fixes, on and off (bench only).
