# Proposal

**Status (round 12, 18 November 2026): specified before the code, then measured. Ships: 1, 2, 3, and 4 in part (the kick on its click; the phase and the density of a full-kick drop not solved). 5 in a separate commit. Verdicts in design.md.**

## Why

The owner's listening notes of rounds 10 and 11 name four defects of level B that stay after round 11:

1. **Silence where the original plays.** Decode writes nothing in intros, breaks and outros that the original fills with a pad, a voice or quiet drums (one real track: the first 50 s and the last 20 s).
2. **False held chords.** A chord held over bars where no chord plays: on the owner's file whose true code is known, every chord Decode writes is false; its tones are the harmonics of a bass and an acid line playing sixteenths. A voice read as a chord is the same defect.
3. **Invented hats and cymbals.** Hats and cymbals where the original has none, from the highs of a bright bass or acid line.
4. **The beat on the wrong sixteenth, kicks missing.** On the same file the beat sits a sixteenth before the true kick (kick precision 0.26), and a drop with four kicks a bar gets one.

## What Changes

- **A measure first, for each defect:** silent bars (bars where the code is silent and the original plays, `tools/decode-hits.mjs silentBars`, in the bench); false chord, hat and kick onsets against the hand-read truth of the owner's file (`tools/decode-span-truth.mjs`) and the hit songs.
- **1. No silence where the original plays.** The causes are found with the measure and fixed in the writer or the analysis (quiet pads, sections kept out by the key test).
- **2. No chords made of a bass's harmonics.** A chord whose tones are the notes and harmonics of a bass or a line playing sixteenths in that bar is not written; a part whose pitch moves (a voice) is told from a part that holds (a pad) where a measure separates them. True pads and chords of the bench, luci-rosse and fresh-twofeel-95 must stay.
- **3. No hats from a bass's highs; no cymbal without its own attack in the high band.**
- **4. The beat phase on the kick's attack; a drop with a kick on every beat writes four kicks a bar.**
- **5. The learned beat tracker as an opt-in Settings option, off by default.** The round 10 card (download with a third-party disclaimer, pinned files, nothing downloaded until the user turns it on) ships off by default; a build-time flag (`VITE_DECODE_BEAT_TRACKER=on`, set only by a local, git-excluded Vite config) turns it on for a developer's own server. Guide card and CHANGELOG.
- `ANALYSIS_VERSION` 20 to 21 once.

Verdict rule (round 12 brief): a fix ships only when its own measure improves and the band error of the 26 real tracks worsens by at most 0.3 dB on average and by at most 1 dB on any one track without a written reason; the bench's chord F1 and the round 11 hit songs must not regress. A fix that fails is dropped and the reason recorded.

Out of scope: new sounds, the kick's level, stems in the app.

## Capabilities

### New Capabilities

- `decode/round12`: silent bars, chords and bass harmonics, hats and cymbals, the kick's phase and density, the beat tracker option.

### Modified Capabilities

- `decode/beat-tracker` (round 10 change): the card ships, off by default, with a local build flag.

## Impact

`src/decode/writer.js`, `src/decode/full.js`, `src/decode/misk-analyzer.js`, `src/decode/model.js`, the beat tracker's files of round 10 (`beat-this-store.js`, `engine-beat-this-browser.js`, the worker, the Settings card), `src/guide.js`, `src/i18n.js`, `tools/decode-hits.mjs`, `tools/decode-bench.cjs`, `tools/decode-span-truth.mjs`, the Decode checks, CHANGELOG.
