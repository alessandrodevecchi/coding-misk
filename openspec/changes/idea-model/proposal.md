## Why

Parts are stored written out in full, so the code is long and the material cannot grow or vary as an idea: a bassline becomes `.struct("[~ x x x] [~ x x x] [~ x x x] [~ x x x]")` where a live coder writes `[~ x x x]*4` (#70, `docs/VARIETY.md`, change 5). The material generator (#71) and the growth shapes (#64) both need parts that are small ideas, so this change comes first.

## What Changes

- **Ideas in the song format.** A pattern can hold an idea instead of written-out material: a repeated cell (`[~ x x x]*4`), scale degrees with a scale, chord names with a voicing (`chord("<Am7 F^7>").voicing()`, with anchor and mode), sequencer steps (`beat("0,4,11",16)`), seeded randomness (`irand(8).seg(16).rib(3,2)` for indices inside chords, sample slices, glitches), a shared progression that several tracks read with their own transposition, and prepared variants that stay commented until a step uses them (`// .add("0 0 4 0 5")`).
- **Presets become ideas.** Bass, arp, hook, pad, guitar and texture presets and the drum grooves are stored as ideas. Compose, the director and the recipes keep using them by name.
- **Shorter code, same sound.** The compiler writes the shortest exact form of each idea. Every existing song plays the same events as before: the same notes, at the same times, with the same lengths and values.
- **Old songs load unchanged.** Songs without ideas keep their meaning. No migration, no new format version.
- **A live build can grow an idea.** In the Live coder profile (Switch until `clear-names`) a part can start from the simple form of its idea and grow to the elaborated one. Classic and Crescendo keep thinning as today, with the same steps and the same sound.
- **A prepared variant can be switched on by a build step.** The commented line becomes active code.

## Capabilities

### New Capabilities

- `music/part-ideas`: how a part is stored as an idea, which kinds of idea exist, how they compile to short code, and the guarantee that existing songs keep their events.
- `live-build/idea-growth`: how a live build grows an idea from its simple form to the written one, and how a prepared variant is switched on, without changing Classic and Crescendo.

### Modified Capabilities

None. The endless director keeps its requirements; it picks presets by name as before.

## Impact

- **Code:** preset tables in `src/music.js` (`BASS`, `ARPS`, `HOOKS`, `PADS`, `GUITAR_PATTERNS`, `GROOVES`, `TEX_RHYTHMS`), the code generator `sceneLayers` and `rhythm()`, `src/song/format.js` (pattern fields, validation), `src/song/compile.js` (shared progressions as `const`, commented variants), `src/song/idiom.js` (its rules move into the idea writer), `src/song/crescendo.js` (idea growth for the natural rules only), `src/song/build.js` (variant step), the validator.
- **Checks:** a new event-equivalence check over every built-in song; `npm run check:code` snapshots change on purpose (shorter code) and are rewritten in the same commit; `node tools/snapshot-levels.cjs check` and `npm run check:crescendo` must pass unchanged for Classic and Crescendo; `npm run check:endless` fixtures must not change.
- **Depends on:** `strudel-catalog` (#69) for the list of functions we ship (`beat`, `rib`, `seg`, `chord`, `voicing`).
- **Docs:** `docs/SONG-FORMAT.md`, `docs/MUSIC-ENGINE.md`, `docs/COMPOSING.md`, Guide, DEVLOG.
