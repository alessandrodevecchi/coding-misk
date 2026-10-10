# Design

## Decisions

- **Artist maker** (`src/endless/artist-maker.js`, pure, checked in Node): a seed gives a name (two syllable lists, or adjective plus noun), a portrait seed and palette, 1 to 3 favourite styles from one or two genres, knob ranges around a drawn centre, weights for shapes and moves, 0 to 2 quirks, transition kinds and harmony. It passes `validateArtist`.
- **Sensible ranges** per knob: chaos 0.15 to 0.7, energy 0.3 to 0.9, complexity 0.3 to 0.8, talk 0.2 to 0.8; full range 0 to 1.
- **Sounds seed:** a `sounds` option mixed into the stream that picks tracks and presets; absent by default, so director fixtures do not change.
- **Dice icon:** an inline SVG die (one, two or three pips by size), in the theme's colours; HW: a small engraved key.
- **Seeds:** `freshSeed()` per press; shown as "seed ab12cd" in the tooltip.
