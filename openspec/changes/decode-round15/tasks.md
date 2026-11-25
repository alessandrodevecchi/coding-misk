# Tasks

Estimate: about 8-10 agent hours (D: 1-2, B and A: 4-5, C: 2, E: 1).

## D. A cleaner envelope measure

- [x] D.1 The modulated test songs' envelope against their still takes, per band and per bar: the Pump without a kick's dip moved a quarter beat per bar.
- [x] D.2 Cause: the fast export passed the note's time in seconds as superdough's cycle (LFO and tremolo phase). Fixed in `src/render/page.js`; the modulated songs exported again.
- [x] D.3 The mid band less the bass's share (a fit of the mid band on the low band per file): measured, dropped.

## B. A song without drums

- [x] B.1 Why the drumless test songs read four kicks a bar (pumped and still takes alike).
- [x] B.2 Rule `DRUMLESS` (full.js `drumless`), bench, verdict.

## A. The pump measured

- [x] A.1 The chord tones' level through the beat (`chordHits` `pulse`, model field `chordPulse`).
- [x] A.2 Rule `PUMP_RULE` (writer.js `pumpOf`), a Pump on the chords track; bench, verdict.

## C. A measured sweep

- [x] C.1 The chord tones' brightness per bar (`chordBright`, model field `chordBright`).
- [x] C.2 Rule `SWEEP_RULE` (writer.js `sweepOf`); bench, verdict.

## E. Close

- [x] E.1 `ANALYSIS_VERSION` 24; `check:decode` cases; knowledge, CHANGELOG, DEVLOG.
- [x] E.2 Round notes, listening files, checklist items.
