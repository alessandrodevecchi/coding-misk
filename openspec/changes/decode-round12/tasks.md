# Tasks

Estimate: about 13 agent hours (1: 2-3, 2: 3-4, 3: 2, 4: 2, 5: 2-3, 6: 1).

## 0. Measure

- [x] 0.1 `silentBars` in `tools/decode-hits.mjs`, in the bench rows and log.
- [x] 0.2 Baseline of the round (models of round 11, analysis 20): every, hits, owner, real.
- [x] 0.3 c-0.2 against its truth: false chord, hat and clap onsets, kick precision, kicks per bar in the last drop.

## 1. Silence

- [x] 1.1 Find the causes on real-17, real-25, real-14, real-18.
- [x] 1.2 Fix, bench, verdict.

## 2. Chords from a bass's harmonics

- [x] 2.1 Rule, bench, verdict (c-0.2 chords, hit-dist16, drumdrive-132, the bench's chord F1, luci-rosse, fresh-twofeel-95).
- [x] 2.2 Voice against pad: measure; rule only if it separates.

## 3. Hats and cymbals

- [x] 3.1 Rule, bench, verdict.

## 4. Kick phase and density

- [x] 4.1 Phase on the kick's attack; four kicks a bar in a full-kick drop; bench, verdict.

## 5. Beat tracker option

- [ ] 5.1 The round 10 card and wiring, off by default; security check again (pins, no remote code).
- [ ] 5.2 `VITE_DECODE_BEAT_TRACKER` flag read through `import.meta.env`; documented in the round notes.
- [ ] 5.3 Guide (en, it), CHANGELOG, knowledge notes, checks.

## 6. Close

- [x] 6.1 `ANALYSIS_VERSION` 21; `check:decode` cases; DEVLOG; round notes; listening files and checklist items.
