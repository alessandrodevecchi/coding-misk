# Proposal

## Why

FM works only on synth oscillators (#80, `fm-groove-lab` D10): superdough applies it inside the oscillators, and the sampler never calls it, so samples, drums, soundfonts and voices cannot get an FM colour. The owner asked for rack effects with few settings that give an FM-like colour to any track, voices included, in this order (#90):

1. Fold.
2. A short Ring trial: does it sound right in the page and in the fast export, and what does it cost on a 12-track radio.
3. Ring and Fast vibrato as finished devices, only if the owner likes the trial.

This change covers steps 1 and 2. Step 3 waits for the owner's verdict on the trial.

## What Changes

### Fold

- **A new sound device "Fold" (it: "Piega")** in the rack menu of every track, drums, samples and voices included. It folds the wave back on itself when it passes a threshold: the sound gets bright, hollow and metallic, close to an FM sound with a rising index.
- **Two settings**: Amount (how hard the wave is folded) and Curve (Sharp or Soft).
- **Safe level by construction**: the device sets the level after the fold so that a line is never louder than without it.
- **In the radio**: the director can give a radio voice the Fold device, like the other voice effects it already picks (crush, phaser, tremolo…). This moves the endless fixtures, so `DIRECTOR_VERSION` goes up.

### Ring trial

- **A new sound device "Ring" (it: "Ring")** in the rack menu, marked as a trial in its name ("Ring (prova)"), on every track, voices included: the sound multiplied by a sine wave, for metal, bells and robot voices.
- **Two settings**: Frequency (Hz) and Amount (from the dry sound to the full ring).
- **Heard in the page and in the fast export**, with a measure of its cost on a radio song with 12 tracks: real time load in the page (long tasks, late audio, time spent preparing each note) and fast export render time, with and without the device. The numbers go in the DEVLOG and the knowledge base; the owner decides step 3 on them and on the sound.
- Ring is not given to the radio director during the trial.

### Common

- Choice values of rack devices can have names in both languages (the Fold curve is the first).
- Texts in Italian and English, Guide (Compose rack card), knowledge notes, decisions, Node checks for both devices and a browser check for sound, levels and cost.

## Capabilities

### New Capabilities

- `app/fm-like-effects`: the Fold and Ring rack devices, their settings, levels, where they appear, and the Ring trial's measurements.

### Modified Capabilities

- `endless/director` (behaviour only, no requirement text changes): the voice effects the director may pick include Fold.

## Impact

- `src/song/rack.js`: two devices, translated choice labels, a validator warning when Fold and Distortion share a track (they use the same Strudel stage).
- `src/main.js`: choice labels in the device row.
- `src/endless/director.js`: Fold among the voice devices, `DIRECTOR_VERSION` + 1, endless fixtures rewritten.
- `tools/strudel-code.mjs`: the scanner skips the Kabelsalat expression inside `K(…)` (it is not Strudel code).
- `src/i18n.js`, `src/guide.js`, `docs/knowledge/sound-and-levels.md`, `docs/knowledge/decisions.md`, `docs/knowledge/checks.md`, `docs/COMPOSING.md`, `DEVLOG.md`.
- New checks: `npm run check:fm-effects` (Node) and `tools/check-fm-effects.cjs` (browser: sound, levels, fast export, cost).
- No change to built-in songs, presets or the growth: no level snapshots or code snapshots move.

## Estimate

About 8 to 10 agent hours: Fold 2.5, Ring trial with its measurements 3.5, checks 2, texts, guide and docs 1.5.
