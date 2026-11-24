# Proposal

## Why

Composed songs vary their parts but not their sound (#94). Three gaps:

- **Compose re-rolls patterns only.** "Compose a part" draws a new pattern with the seed `<song id>:<track id>:<n>` (`src/main.js:4085-4091`). A new sound within the style comes only from the generator (`src/endless/material.js:86-91`) and the radio's Vary (`src/endless/steering.js:516`). In Compose the user picks a wave by hand.
- **Drum sounds are never composed.** `groove()` (`src/material/drums.js`) writes step rows only. Kits come from the recipe, and every hit of a kit piece sounds the same in every song.
- **Generated songs never vary a value per hit.** The only `random` the generator writes is the arpeggio index (`src/material/arp.js:42`). `RANDOM_VALUES` (`lpf`, `hpf`, `pan`, `delay`, `room`, `gain`, `src/song/ideas.js:310`) are reachable only by hand, and the hand form writes absolute values that replace the track's own.

## What Changes

- **Sound dice in Compose.** A dice button in the track panel of melodic and drum tracks draws a new sound within the style's ranges, with the seed `<song id>:<track id>:sound:<n>`, for that track only.
  - Synth tracks draw the wave or a composed sound kind with its FM device, and the style's setting ranges (filter, effects).
  - Drum tracks draw a kit from the style's list and a tone per kit piece (next item).
  - Lock chips keep groups of parameters across rolls. The level is never rolled.
  - Undo restores the track as it was before the roll. The number next to the dice steps back and forth through the seeded rolls.
- **Composed drum tones.** A new drum setting `tone` holds decay, tune, drive and filter per kit piece group (kick; snare and clap; hats and ride). The generator draws it from the seed, the style and the energy, inside a fixed table of safe ranges. The writer appends it to each drum row's line.
- **Seeded per-hit variation.** A new track setting `vary` lists up to three targets, each with an amount, a seed and a loop length. The writer turns it into a seeded random value per hit around the track's own value, never above its level. Targets: `lpf`, `hpf`, `pan`, `delay`, `room`, `gain`, `decay`, `distort`, `crush` and `vowel`. The generator writes it with an amount tied to the style and the energy, small by default.
- **Opt-in by version.** A new director option `sound` (0 or `SOUND_VERSION`, default 0) turns composed tones and variation on. New sessions made by the app record `sound: 1`. Sessions saved before, the command line without `--sound`, and every fixture keep 0 and sound as today.
- **Out of scope, as separate future work:**
  - Live knobs: modulating a sounding note through Strudel `.bmod()` buses.
  - Rack "Sweep" devices with `.env()`, `.lfo()` and `lpenv`.
  - Variation of the FM index (the `fm` rack device owns it, design D7).

## Capabilities

### New Capabilities

- `app/sound-dice`: the dice of a track in Compose: what it draws for synth and drum tracks, the seed, the locks, undo and the number.
- `endless/drum-tones`: the `tone` drum setting, its safe ranges, how the generator draws it and how the writer plays it.
- `endless/sound-variation`: the `vary` setting, its targets and limits, how the writer turns it into seeded values per hit, and how the generator writes it.

### Modified Capabilities

- `endless/style-recipes`: adds the optional `drums.material.tones` and `<instrument>.material.variation` fields (ADDED requirement only).

## Impact

- `src/material/sound.js`, `src/material/drums.js`, new `src/material/tone.js` and `src/material/variation.js`, `src/material/index.js` (`compose` gains `tone` and `vary` kinds).
- `src/endless/material.js`, `src/endless/steering.js`, `src/endless/director.js` (`OPTION_DEFAULTS.sound`), the radio and compilation setups (record `sound`), `tools/endless.mjs` (`--sound`).
- `src/music.js` (`DEFAULT.*.tone`, `DEFAULT.*.vary`, the drum and synth line writers), `src/song/ideas.js` (variation code), `src/song/format.js`, `src/song/validate.js`, `src/song/crescendo.js` and `src/song/build.js` (the new settings are not ramped or set by steps), `src/endless/recipe.js` (recipe fields).
- `src/main.js` (track panel, dice, locks, undo), `src/i18n.js`, `src/guide.js`, `src/style.css` (both themes).
- Docs: `docs/SONG-FORMAT.md`, `docs/STYLES.md`, `docs/ENDLESS.md`, `docs/VARIETY.md`, `docs/knowledge/` (material, sounds, sound-and-levels, decisions, glossary), `DEVLOG.md`.
- Checks: `check:material`, `check:ideas`, `check:songs`, `check:styles`, `check:endless` (new fixtures for `sound: 1`), `check:strudel` and `catalog:strudel`, `check:functions`, `check:guide`, `check:knowledge`; a new browser check for the dice and for the levels of composed tones.
- No change to built-in songs, the Crescendo fixtures, the growth shapes or the level snapshots: no `DIRECTOR_VERSION`, `SHAPES_VERSION` or `CRESCENDO_VERSION` bump.
