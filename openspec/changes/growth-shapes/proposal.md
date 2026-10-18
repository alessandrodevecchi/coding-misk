## Why

Live builds open almost always the same way: 66 of 68 measured builds open with the drums, almost always with one kick on beat one, and the first step already sounds at bar 0. In the Live coder profile (named Switch before `clear-names`) the full kick arrives after a median of 156 s (up to 7 or 8 minutes), and the first minute holds 5 audible changes (2 to 3 in the songs written for it), against 7 to 8 in the reference videos and 13 in Crescendo (#64, `docs/VARIETY.md`). Reference live coders open with a full kick, a broken beat, a bass or a melody alone, a written base switched on line by line, or a song already playing, and they grow at very different speeds.

## What Changes

- **Growth shape.** A live build with the Live coder profile follows a shape made of three choices: an opening, a pace and a development. The song names its shape; else its style recipe gives weights; else the song's seed draws it.
- **Openings:** single kick that grows (today, named "slow" / "Lenta"), full kick, silence while the first line is typed, broken beat (the core is not beat one: tresillo, two-step), filtered kick that opens, arpeggio or synth first, pad or drone, spoken voice (needs `voice-instrument`), already written base with muted tracks (`_$:`) switched on one by one, mid-set (two tracks already playing in solo).
- **Pace:** slow (today), medium, fast (7 to 8 audible moves in the first minute).
- **Development:** by instrument type (today's order), as written in the song, masks per instrument (entries, exits, variations), parameters only (filters, density, room, delay), metamorphosis of a full song (tempo, key and genre change over minutes, existing lines rewritten), second section built in solo (`S$:`) while the first is silent.
- **New moves from the research:** move one step of a beat, uncomment a prepared variant, solo a line, a key change prepared in a comment, alternate two parts with `pick`, a value that moves slowly over minutes, `seg(16)` turning a held chord into a rhythm.
- **Second thoughts stay musical.** A melody may enter and later leave because it was meant only for that moment; a first version of a part may be refined later. Both use the song's own material, in key.
- **Ideas grow.** Where the shape needs it, a part grows from its idea (`idea-model`), for example beat steps added one at a time, instead of thinning the written result.
- **Classic and Crescendo do not change.** Their builds stay exactly as today; only the Live coder profile uses shapes.
- **Same every time.** All draws are seeded by the song.

## Capabilities

### New Capabilities

- `live-build/growth-shapes`: openings, pace and development of a live build; who chooses the shape; the new moves; musical second thoughts; growing ideas; which profiles use shapes; determinism and versioning.

### Modified Capabilities

None in their requirements. Crescendo, natural growth and the live coder growth keep their rules; the shape sets the parameters of the live coder growth (stated in the new capability).

## Impact

- **Code:** `src/song/crescendo.js` and `src/song/coder.js` (first waypoint from the opening, order of entries from the development, spacing from the pace, new moves); `src/song/build.js` (build actions for mute, solo, tempo and key); `src/live/profiles.js` (shape controls); `src/main.js` (`liveBuild` with a silent typed opening); the compiler for `_$:` and `S$:` lines; style recipe validator and `styles/*.json` weights; song validator.
- **Depends on:** `idea-model` (parts as ideas) and `material-generator` (material for a metamorphosis and for passing melodies); `voice-instrument` for the spoken opening; `clear-names` for the profile name.
- **Checks:** `tools/check-crescendo.mjs` (Classic and Crescendo fixtures unchanged, shape fixtures), `tools/check-crescendo-play.cjs`, `npm run check:styles`, `npm run check:songs`, `npm run check:guide`.
- **Docs:** `docs/COMPOSING.md`, `docs/SONG-FORMAT.md`, `docs/STYLES.md`, Guide card, `DEVLOG.md`.
