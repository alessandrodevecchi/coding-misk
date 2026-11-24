# Proposal

**Status (round 13, 18 November 2026): specified before the code, then measured. Ships: A, C (the four kicks; not the grid phase) and D. B dropped: no measure separates a line from a chord. Verdicts in design.md.**

## Why

Five defects of level B remain after round 12 (the owner's notes and the round 12 measures):

1. **Silent endings.** One real track is silent from 3:15 to its end; another one's outro is silent.
2. **A single line written as a chord.** On the owner's file whose true code is known, the held Gm comes from the notes of one acid line playing sixteenths; on a real track a sung voice from 0:32 becomes chords.
3. **One kick a bar in a full-kick drop.** The same file's last drop (92-120 s) has a kick on every beat in its code; Decode writes about one a bar. Without the learned beat tracker the grid also stays a sixteenth before the kick.
4. **A held chord from the start of a test song** whose true code has its pad only in its second half.

## What Changes

- **A. Silent endings.** Find why the last bars stay empty (a section never written, an ending rule, the level gate) and fix it.
- **B. One line is not a chord.** When one pitch at a time explains most of a bar's mid energy, the bar has a line, not a chord: no chord is written there; the line stays in the bass or goes to the Lead (a voice-led Lead starts muted, as today). Ships only if a measure separates a line from a chord.
- **C. A full kick in drops.** Where the kick band has an attack on each beat, write four kicks a bar; try the kick's attack as the grid phase without the beat tracker.
- **D. The early held chord.** Compare the test song's decode with its true code; fix only with a general rule.
- **E.** Checks, listening files and the owner's checklist items.
- `ANALYSIS_VERSION` 21 to 22 once.

Verdict rule (round 13 brief): a fix ships only when its own measure improves (silent bars, false chords against the truth, kick hits) and the band error of the 26 real tracks worsens by at most 0.3 dB on average and by at most 1 dB on any one track without a written reason; the bench's chord F1 and the tracks that are fine today (luci-rosse, real-05, real-18, the stab and dist16 hit songs) must not regress. A fix that fails is dropped and the reason recorded.

Out of scope: new sounds, stems in the app, the beat tracker option.

## Capabilities

### New Capabilities

- `decode/round13`: quiet endings, a line against a chord, a full kick, chords that enter inside a section.

## Impact

`src/decode/writer.js`, `src/decode/full.js`, `src/decode/hit-measure.js`, `src/decode/model.js`, the Decode checks, the knowledge notes, CHANGELOG.
