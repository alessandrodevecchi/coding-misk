## Why

The director picks from 22 fixed melodies, 13 bass rhythms, 6 arpeggios and 20 grooves with light mutation, so the same melody shows up in several songs (#71, `docs/VARIETY.md`, change 6). With parts stored as ideas (`idea-model`), new material can be composed from the song seed the way reference live coders write it: small cells, summed progressions, chord indices, sequencer steps.

## What Changes

- **A material generator.** From the song seed, the style recipe and an energy value it composes melodies, basslines, arpeggios, chords and progressions, drum grooves and sounds, each as an idea.
- **Rules from the research, not raw randomness.** Melodies are a short cell plus a summed progression, often polymetric (5 or 7 values over 16 steps); a motif repeats with a changed tail (A A A A'); call and response; basslines are cloned from the chords or read from a shared progression; arpeggios are indices into chord voicings; drum grooves are sequencer steps from style rules (four on the floor, breakbeat, two-step, half-time, euclid). Seeded randomness only where musicians keep it: indices inside chords, sample slices, filters.
- **Sounds, FM included.** Generated patches for melodic tracks within safe ranges, including the FM controls superdough 1.3.0 ships (`fmh`, `fmwave`, `fm2` to `fm8`), limited in the first version to two operators.
- **Presets stay.** A style recipe says per instrument whether it wants presets, generated parts or a mix, and a generated part can start from a preset and vary it.
- **Energy steers density and range.** More energy gives more onsets and a wider range; less gives sparse, narrow parts.
- **Used by the director and by Compose.** Radio and generated songs get new material; Compose gets "Compose a part" on a track.
- **Director version 3.** The same seed gives different songs, so saved radio sessions warn.

## Capabilities

### New Capabilities

- `music/material-generator`: composing parts and sounds as ideas from seed, style and energy, with the musical rules and safe ranges.
- `app/compose-part`: the "Compose a part" action on a Compose track.

### Modified Capabilities

- `endless/director`: the requirement "Hybrid material with controlled mutation" changes: tracks start from presets, generated parts or both, as the recipe asks.
- `endless/style-recipes`: recipes gain a material choice per instrument (added requirement).

## Impact

- **Code:** new `src/material/` (pure, Node and browser), `src/endless/director.js` (`candidateTracks`), `src/endless/recipe.js` (material field and its validation), `styles/*.json` (material choice), Compose track panel in `src/main.js`, `src/i18n.js`.
- **Checks:** new `npm run check:material` (no browser): rules, determinism, ranges, key; `npm run check:endless -- --write-fixtures` with `DIRECTOR_VERSION` 3; `node tools/check-endless-play.cjs` on a generated session; `npm run check:styles`.
- **Depends on:** `idea-model` (#70) for the idea format; `strudel-catalog` (#69) for the functions generated code may use. `pattern-library` (#72) plays and saves generated parts. `radio-variation` (#24) later lets the radio curves steer the energy value.
- **Docs:** `docs/ENDLESS.md` (material), `docs/STYLES.md` (material field), Guide, DEVLOG.
