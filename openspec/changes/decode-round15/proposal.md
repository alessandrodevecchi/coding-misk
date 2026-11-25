# Proposal

**Status (round 15, 24 November 2026): specified from the round plan, then measured. Ships: B, and D as a fix of the fast export. A and C dropped. Verdicts in design.md.**

## Why

The sound-modulation bench (#95, step 2) found three things level B gets wrong or cannot see:

1. **A pump read as a kick.** Level B wrote a four-on-the-floor kick on `mod-pump-bare`, which has no drums.
2. **Movement is not written.** A pumped pad or a filter that opens decodes as still chords; a movement device added to the decoded chords by hand helps little unless its parameters are measured.
3. **The envelope error is weaker than specified.** `mod-pump-bare` against its still take read 0.62 dB in the mid band, where the scenario asks for at least 1 dB.

## What Changes

- **D. A cleaner envelope measure.** Find why the mid band's envelope barely moves on the pumped song and make the 1 dB scale measurable (the plan: take out the part the bass explains).
- **B. The pump is not a kick.** A kick is written only where the low band attacks, not where a pad and a bass alone rise on the beat.
- **A. The pump measured.** A periodic dip of the chords just after the beat becomes a Pump on the chords track with measured depth and recovery.
- **C. A measured sweep.** Chords whose brightness rises or falls in a regular loop get a Sweep with measured start and end.
- **E.** Checks, listening files and the owner's checklist items. `ANALYSIS_VERSION` 23 to 24 once.

Verdict rule (round 15 plan): a correction ships only when its own measures improve (held-note error, envelope error, kick hits) and the band error of the 26 real tracks worsens by at most 0.3 dB on average (1 dB on one track needs a written reason); luci-rosse, real-05, real-18, hit-stabs and hit-dist16 must not get worse. A correction that fails is dropped and recorded in `docs/knowledge/decisions.md`.

## Capabilities

### New Capabilities

- `decode/round15`: a song without drums writes no drums.

## Impact

`src/decode/full.js`, `src/decode/model.js`, `src/render/page.js` (fast export), `tools/check-decode.mjs`, the knowledge notes, CHANGELOG.
