## Context

A style recipe (`styles/*.json`, `src/endless/recipe.js`) has one genre, tempo, keys, progressions, shapes, parts per instrument and a voice. The director draws songs from recipes. Songs may declare `buildStyle` (Crescendo phase 1).

## Goals / Non-Goals

**Goals:** two Switch styles that sound like one-scale live-coded tracks; a family that can grow across genres.

**Non-Goals:** copying any artist's code or functions; Crescendo in the radio.

## Decisions

### D1. Family by name

The family is a naming convention plus a `family: "switch"` field in the recipe, so the style list can group them and search finds them. Each member keeps one genre (trance, techno), as every recipe.

### D2. Harmony

Keys limited to minor keys; progressions from a short list of one to four diatonic chords (for example i, i-VI, i-VI-VII, i-iv-VI-VII); a song keeps one key. Chord roots fit the idiomatic generator's degrees.

### D3. Parts

- Switch · trance: 138 to 142 BPM, four on the floor, gated supersaw bass and lead (degrade or gate-like rack), pulse riser, big room and delay on the lead.
- Switch · acid: 128 to 135 BPM, acid bass with high resonance and filter movement, distortion, sparse hats, clap on 2 and 4.
- Both: four to six tracks; patterns of 1 to 2 bars repeated.

### D4. Build style from the recipe

Recipe field `buildStyle: "crescendo"`: songs made from it carry the field, so Compose opens them in crescendo. A song mixing a Switch style with others takes the field from the style that gives the drums part.

## Risks / Trade-offs

- **[Sounding generic]** → listen tests with the owner before release; recipes are data, easy to tune.
