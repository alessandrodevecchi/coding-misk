---
id: styles
related: [radio, material, artists, profiles, growth-shapes, voice, comments-and-functions]
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
