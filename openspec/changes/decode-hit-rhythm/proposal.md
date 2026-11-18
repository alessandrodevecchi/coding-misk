# Proposal

**Status (round 11, 18 November 2026): specified before the code, then measured. Shipped: A (in a cautious form), C and D. Dropped after the verdict: B and E (design D3, D6).**

## Why

In six of the owner's eight listening tests of round 9 the same defect stands out: where the original hits fast in the mids (chord stabs, repeated chords, a distorted bass on 16ths), Decode writes one chord held a whole bar, often an empty fifth (A5, E5), that covers everything. Level B's writer has no way to write a chord rhythm: `chord("<…>").voicing()` holds each chord for its bar, so ten stabs and a pad give the same code. Chords are also written from any energy in the mids: a distorted bass's harmonics (its 3rd, 4th and 5th harmonics read as a major triad or a fifth), the drums' claps and hats, or a pad that enters only later. A repeated bass note whose low band never dips is read as one held note. Two similar sections can get different parts, and the parts' levels do not follow the original enough (a kick far louder, a power chord at gain 0.85).

The band error in dB, the bench's main number, cannot see it: a held chord and ten stabs with the same energy give nearly the same band shares.

## What Changes

- **A, chords with rhythm.** Level B measures, per bar with a chord, the chord's own tones step by step (the hits, and how much the sound stays between them). A section whose chords hit with gaps is written with their rhythm, `chord("<Am F>").voicing().struct("x ~ x x ~ x x ~")`; a held section stays held.
- **B, chords only where they are.** Two rules were specified and measured: no chords where the chord's own tones are weak in the band, and no power chords on the bass's own roots. Both left out true chords on the bench and were dropped (design D3); what remains of B is the tonal share that gates A's rhythm.
- **C, a repeated bass.** A bass step that the analysis left empty or held, where the bass's own harmonics attack again, is written as a new note.
- **D, similar sections, the same parts.** Two sections whose drums and bass are alike take the same set of parts: a part written in one is written in its twin (the second drop does not lose its bass or chords).
- **E, levels from the original.** A ceiling on the chords' gain in the balance was specified and measured: the balance then moved the drums and the bass instead and one real track lost 1.9 dB; dropped. The kick's level is not changed in this round.
- **G, the measure.** The bench gets a hit-density measure (hits per bar and how held each band is, original against code) and per-part onset precision and recall where the true code is known, with six songs built for this defect.
- `ANALYSIS_VERSION` 19 to 20: stored level B analyses are made again.

Verdict rule (round 11 plan): a fix ships only when it improves the hit-density measure without worsening the band error of the 26 real tracks by more than 0.3 dB on average, and no real track by more than 1 dB without a written reason.

Out of scope: the voice read as a chord when no other signal tells it from a pad (no fix found for it here beyond A's rhythm), the learned beat tracker (measured again, not shipped), new sounds.

## Capabilities

### New Capabilities

- `decode/hit-rhythm`: how level B measures and writes the chords' rhythm, the repeated bass and twin sections.

### Modified Capabilities

- None.

## Impact

`src/decode/hit-measure.js` (new), `src/decode/full.js` (the measures per bar), `src/decode/writer.js` (writeFull, the balance), `src/decode/model.js` (`ANALYSIS_VERSION`), `tools/decode-hits.mjs`, `tools/decode-bench.cjs`, `tools/decode-songs.mjs`, `tools/decode-export.cjs`, the Decode checks, the Guide's Decode card.
