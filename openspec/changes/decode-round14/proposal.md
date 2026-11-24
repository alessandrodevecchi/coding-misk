# Proposal

**Status (round 14, 19 November 2026): specified before the code, then measured. Ships: B and C. A dropped: the chroma's stability within the bar does not separate a line from the real tracks' chords. Verdicts in design.md.**

## Why

Three defects of level B remain after round 13 (the round 13 notes):

1. **A single line written as a chord.** On the owner's file whose true code is known, an acid line playing a new note almost every sixteenth reads as a held Gm; on a real track a sung voice from 0:32 becomes chords. Round 13 tried two measures of how many pitches sound together; neither separated the line from true pads.
2. **The grid a sixteenth before the kick without the beat tracker.** On the same file the kicks land right since round 13, but the written code reads `.x...x...x...x..`.
3. **Silent bars left by round 13.** One real track's first bars and its bars 41-43; another one's last 4 bars.

## What Changes

- **A. A line is not a chord, third try.** Measure the stability of the chroma within the bar at sixteenth-step resolution (a held chord's step chroma stays alike, a moving line's changes from step to step) on the owner's file's truth spans, the real track's voice, the bench's true pads and stabs, luci-rosse, the hit songs and the real tracks. Ship a rule only if it separates; where a bar is a line, no chord is written.
- **B. The grid on the kick.** When the kick's attack (round 13's `kickShape`) sits on the same off-grid step of every beat across the song's clear sections, move the whole grid by that sixteenth: the downbeat moves and every bar's step rows rotate. Measure band error, kick F1 against the truth and the written code.
- **C. The silent bars.** Find why they stay silent and fix only with a general rule.
- **D.** Checks, listening files and the owner's checklist items. `ANALYSIS_VERSION` 22 to 23 once.

Verdict rule (round 14 brief): a fix ships only when its own measure improves and the band error of the 26 real tracks worsens by at most 0.3 dB on average and by at most 1 dB on any one track without a written reason; the bench's chord F1 and kick F1, luci-rosse, real-05, real-18, the stab and dist16 hit songs and drumdrive-132 must not regress. A fix that fails is dropped and the reason recorded in `docs/knowledge/decisions.md`.

Out of scope: new sounds, stems in the app, the beat tracker option.

## Capabilities

### New Capabilities

- `decode/round14`: a grid moved onto the kick, a fade past the chord level's rounding, a pad that fades in.

## Impact

`src/decode/writer.js`, `src/decode/full.js`, `src/decode/model.js`, the Decode checks, the knowledge notes, CHANGELOG.
