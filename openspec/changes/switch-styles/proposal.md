## Why

Our styles make harmonically rich songs: progressions of four to eight chords, chords spelled out, many tracks. Some live-coded music works the other way: one scale for the whole song, short progressions, short patterns repeated, few tracks that grow inside, built step by step. The owner wants that sound available as a family of styles, without losing the others. The family is called Switch and is not tied to one genre.

## What Changes

- **A Switch family of styles.** Style recipes named Switch, one per genre: Switch · trance, Switch · acid (techno) and Switch · house; more genres can join the family later (an acid techno genre is being considered).
- **Their rules.** One key and scale per song; progressions of one to four chords, all in the scale; short patterns with repeats; four to six tracks; strong use of filter, resonance, gate and delay; a held first chord.
- **Their build.** Songs made from a Switch style declare `"buildStyle": "crescendo"`, so they open in crescendo in Compose; with the idiomatic generator and the view now (when they exist) their code looks like a live-coding session.
- **In the radio.** They play like any style; Crescendo in the radio stays for `crescendo-radio`.
- **Only our material.** The recipes use the app's sounds, presets and devices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/style-recipes`: a style family (Switch) with styles in several genres, and a style may ask its songs to build in crescendo.

## Impact

- **Data:** new recipes in `styles/` (switch-trance, switch-acid), their names and descriptions in English and Italian, voices for them.
- **Code:** a recipe field `buildStyle` passed to the songs the director makes; family name shown in the style list.
- **Checks:** `check:styles`, `check:endless` (songs of these styles: one key, short progressions, track count, build style).
- **Out of scope:** custom functions of other live coders; Crescendo in the radio.
