---
id: styles
related: [radio, material, artists, profiles, growth-shapes, voice, comments-and-functions, music-engine, sounds, from-a-reference, recipes-music]
code: [styles, src/endless/recipe.js, src/endless/mix.js, tools/styles-dir.mjs]
checks: [npm run check:styles, npm run check:endless]
---

# Style recipes

## What it is

A style recipe is a JSON file in `styles/` that tells the director how songs of a style are made. It gives ranges and choices, never one fixed song: tempo, keys, progressions, meters, energy shapes, length, phrase, track counts, and one block per instrument.

Each style belongs to a genre of the song library. Some belong to a family across genres.

## How it connects

- **Radio.** The director writes songs from recipes ([radio.md](radio.md)). With several styles, chaos decides how much a song mixes them.
- **Material.** Each instrument block has a `material` field for the generator ([material.md](material.md)).
- **Artists.** An artist is a taste over styles ([artists.md](artists.md)).
- **Profiles and shapes.** A recipe can name a `profile` and give `growthShapes` weights ([profiles.md](profiles.md), [growth-shapes.md](growth-shapes.md)).
- **Voice.** `voice`, `spoken` and `narrator` set the narrator's voice and the voice instrument ([narrator.md](narrator.md), [voice.md](voice.md)).
- **Function names.** A style id picks the theme of song function names ([comments-and-functions.md](comments-and-functions.md)).
- **Library.** Songs tagged with a style count under its genre in the Songs tab ([library.md](library.md)).

**Mixing.** Each song takes each of its parts from one style: tempo, drums, bass, harmony, lead, pads, voice. Chaos 0 keeps a song in one style and rotates the selection. Chaos 1 draws each part on its own.

## Options

<!-- generated:styles -->
| Style id | Name | Genre | Family | Profile | BPM |
| --- | --- | --- | --- | --- | --- |
| `acid` | Acid | techno | `live-coder` | `switch` | 128-135 |
| `ambient` | Ambient | ambient |  |  | 60-80 |
| `berlin-techno` | Berlin techno (it: Techno berlinese) | techno |  |  | 126-134 |
| `classic-rock` | Classic rock (it: Rock classico) | rock |  |  | 100-140 |
| `country` | Country | country |  |  | 100-132 |
| `dark-cyberpunk` | Dark cyberpunk (it: Cyberpunk oscuro) | techno |  |  | 100-122 |
| `darksynth` | Darksynth | synthwave |  |  | 110-132 |
| `dreamy-cyberpunk` | Dreamy cyberpunk (it: Cyberpunk sognante) | synthwave |  |  | 82-100 |
| `drum-and-bass` | Drum and bass | drum-and-bass |  |  | 168-176 |
| `gated-trance` | Gated trance (it: Trance gated) | trance | `live-coder` | `switch` | 138-142 |
| `house` | House | house | `live-coder` | `switch` | 122-126 |
| `industrial` | Industrial | industrial |  |  | 120-140 |
| `jazz` | Jazz | jazz |  |  | 96-140 |
| `lo-fi` | Lo-fi | hip-hop |  |  | 70-88 |
| `melodic-metal` | Melodic metal (it: Metal melodico) | metal |  |  | 140-180 |
| `phonk` | Phonk | hip-hop |  |  | 130-150 |
| `progressive-house` | Progressive house | house |  |  | 124-128 |
| `pure-trance` | Pure trance (it: Trance pura) | trance | `live-coder` | `switch` | 138-142 |
| `synthwave` | Synthwave | synthwave |  |  | 96-118 |
| `trance` | Trance | trance |  |  | 134-140 |

Families: `live-coder` (acid, gated-trance, house, pure-trance).
<!-- /generated -->

Each recipe describes its sound in one sentence. The descriptions below come from the recipes; they may name a film or a scene as a mood reference.

<!-- generated:style-descriptions -->
| Style | Description (the recipe's own words) | Keys | Progressions | Meters |
| --- | --- | --- | --- | --- |
| `acid` | Live-coded acid in one minor scale: a squelchy resonant line, a distorted kick, sparse hats and claps, built one function at a time. | C A F E | `drone`, `pendolo`, `tensione` | 4/4 |
| `ambient` | Long held chords, slow filters, distant bells and wind; very few layers, almost no drums. | D E C A | `drone`, `pendolo`, `malinconica`, `dorico` | 4/4 |
| `berlin-techno` | Dark warehouse techno: one chord or a flat-second tension, low rolling bass, dry hats, no sweet melodies. | F E G A | `drone`, `tensione`, `ipnotica` | 4/4 |
| `classic-rock` | Seventies and eighties rock: verse and chorus beats, overdriven power chords, organ and a guitar-like lead. | E A D G | `rock`, `dorico`, `epica`, `andalusa` | 4/4 |
| `country` | Train beat and boom-chick bass, steel-string and banjo chords, harmonica or fiddle lines. | G D A E | `country`, `rock`, `andalusa` | 4/4 |
| `dark-cyberpunk` | Night city at its worst: tritone riffs, glitching machines, cold stabs and a threat in every bar, in the John Wick club mood. | F E D F# | `cyber`, `tensione`, `frigio`, `notturna` | 4/4 |
| `darksynth` | Synthwave turned to horror: driving kick, galloping octave bass, aggressive saw leads, sidechained walls and the odd distorted guitar. | E F G A | `cyber`, `frigio`, `epica`, `tensione` | 4/4 |
| `dreamy-cyberpunk` | Rain on neon at three in the morning: slow pulse, warm pads, bells and a melancholic lead, more nostalgia than threat. | D E C A | `malinconica`, `notturna`, `pendolo`, `lofi` | 4/4 |
| `drum-and-bass` | Fast two-step breaks over deep sub bass, dark pads and short stabs. | F E G D | `notturna`, `pendolo`, `drone`, `malinconica` | 4/4 |
| `gated-trance` | Live-coded trance in one minor scale: four on the floor, a gated supersaw bass and lead on one or two chords, a pulse riser, built step by step. | G A F D | `drone`, `pendolo`, `ipnotica`, `epica` | 4/4 |
| `house` | Live-coded house in one minor scale: four on the floor with off-beat open hats, a chord stab on one or two chords, a bass on the root. | A D F G | `drone`, `pendolo`, `dorico`, `ipnotica` | 4/4 |
| `industrial` | Machines and metal: hard techno drums, stomping guitars, bit-crushed textures and tritone riffs. | E F D A | `frigio`, `tensione`, `drone` | 4/4 |
| `jazz` | Small combo at night: swing ride, walking upright bass, comping piano and vibraphone lines. | C F D B | `jazz`, `turnaround`, `lofi` | 4/4 |
| `lo-fi` | Slow, dusty beats with seventh chords, electric piano and vinyl crackle; sparse and calm. | C D F A | `lofi`, `jazz`, `turnaround` | 4/4 |
| `melodic-metal` | Double kick and gallops, high-gain riffs in phrygian, heroic twin-guitar leads and choir pads. | E D F# B | `frigio`, `epica`, `andalusa`, `anthem` | 4/4 |
| `phonk` | Drift phonk: cowbell melodies, heavy 808 sub, rolling hats and distorted drums. | F F# G E | `frigio`, `tensione`, `drone` | 4/4 |
| `progressive-house` | Uplifting festival house: four-on-the-floor, offbeat and pumping bass, piano chords, plucked arps and a big singable lead over vi-IV-I-V. | B A G F# | `epica`, `euforica`, `anthem`, `ascesa`, `rock` | 4/4 |
| `pure-trance` | Pure live-coded trance in one minor scale: four on the floor, a gated supersaw bass, one or two chords and a lead written with scale degrees, no arpeggio, built step by step. | G A F D | `drone`, `pendolo` | 4/4 |
| `synthwave` | Eighties night drive: gated snare, octave bass, warm pads and a sawtooth lead, in minor. | F E A D | `epica`, `malinconica`, `cyber`, `notturna` | 4/4 |
| `trance` | Driving trance with rolling bass, arpeggios and a big lift before the drop. | A F# G B | `epica`, `euforica`, `anthem`, `ascesa`, `ipnotica` | 4/4 |
<!-- /generated -->

To pick a style for a mood, compare tempo, keys, progressions and the description. To make a new one from a song or an audio file, see [from-a-reference.md](from-a-reference.md); the steps are in [recipes-music.md](recipes-music.md#define-a-style).

Main recipe fields: `tempo`, `keys`, `progressions`, `meters`, `swing`, `shapes` (energy shapes), `minutes`, `phrase`, `tracks`, `energy`, `voice`, `spoken`, `narrator`, `growthShapes`, `words` (title words). Instrument blocks: `drums`, `bass`, `arp`, `hook`, `pad`, `guitar`, `texture`, `riser`.

A recipe is tested by `npm run check:styles`. `node tools/check-style-sounds.cjs` checks that every sound it names loads (dev server).

## Example

The head of `styles/acid.json`:

```json
{"format": 1, "id": "acid", "family": "live-coder", "buildStyle": "crescendo", "profile": "switch", "genre": "techno", "tempo": [128, 135], "keys": ["C", "A", "F", "E"], "progressions": ["drone", "pendolo", "tensione"], "phrase": 8}
```

Its songs open in the Live coder profile and draw their growth shape with the style's weights.

## Where to read more

- [docs/STYLES.md](../STYLES.md): every field, instruments, mixing, adding a style.
- [docs/ENDLESS.md](../ENDLESS.md): how the director uses a recipe.
