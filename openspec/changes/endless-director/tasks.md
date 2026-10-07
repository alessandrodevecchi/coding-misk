# Tasks

## 1. Foundations

- [ ] 1.1 Create `src/endless/` with a seeded random generator (string seed, named streams) that runs in Node and in the browser, and verify with a check that the same seed and stream give the same sequence and different streams differ.
- [ ] 1.2 Add `npm run check:endless` (a Node script under `tools/`) that will host every director and recipe check, and verify it runs and exits 0 with the generator check from 1.1.

## 2. Style recipes

- [ ] 2.1 Define the recipe format and write `docs/STYLES.md` (fields, defaults, how chaos mixes parts, how to add a style), and verify every field in the doc matches the validator from 2.2.
- [ ] 2.2 Implement the recipe loader and validator (errors and warnings with JSON paths, checks against presets, grooves, progressions, keys, meters, machines, shapes, ranges, song length 2 to 6 minutes) and `tools/style.mjs validate`, and verify it with the failing cases of the recipe spec (unknown preset, reversed range) in `check:endless`.
- [ ] 2.3 Add the building blocks the twelve styles need that `src/music.js` lacks (at least a jazz swing groove, a country train beat, a rock verse and chorus beat, any missing chord progressions), usable in Compose too, and verify `npm run check:code` and `npm run check:songs` still pass with snapshots updated only for the new presets.
- [ ] 2.4 Write the twelve starting recipes in `styles/` (Berlin techno, trance, synthwave, lo-fi, drum and bass, ambient, phonk, industrial, jazz, country, classic rock, melodic metal) with title words in English, Italian and Spanish, and verify `node tools/style.mjs validate` reports all twelve valid.
- [ ] 2.5 Add a browser check (Playwright, dev server) that every sound named by a recipe is in the loaded sound map, and verify it passes on the twelve recipes.
- [ ] 2.6 Implement style mixing with chaos (parts: tempo, drums, bass, harmony, lead, pads and texture, voice; rotation at chaos 0; independent parts at chaos 1) and verify the three mixing scenarios of the recipe spec in `check:endless`.

## 3. Director

- [ ] 3.1 Implement the song plan (length 2 to 6 minutes, tempo from the tempo style, key, sections as multiples of two phrases with chords, energy shape allowed by the style, candidate tracks with clips over the whole song, voice track with the voice style's settings, multilingual title) and verify the "Song plan" scenarios in `check:endless`.
- [ ] 3.2 Implement the seven energy shapes and the energy and complexity amounts, and `energyOf(state, bar)` measured from tracks playing, drum density, filter openness and drive, and verify in `check:endless` that build and drop rises before the drop and that energy 0.9 averages higher than 0.2 for the same seed.
- [ ] 3.3 Implement mutation operators for drums, bass, arp and hook scaled by complexity, and verify in `check:endless` that complexity 0 keeps presets unchanged and complexity 1 keeps notes as chord tones and scale degrees.
- [ ] 3.4 Implement moves on phrase boundaries (add, remove, pattern switch, setting change, rack device, break and drop on double phrases) chosen toward the target energy with the penalties of the design, and verify in `check:endless` the grid rule, one move per track per boundary, no back-to-back moves on a track, and the track limits (4 to 5 usual, at most 8 below complexity 0.8).
- [ ] 3.5 Implement the variety rules between songs (no same key or shape twice in a row, no repeated style-per-part combination within the last three songs) and verify them on long sessions in `check:endless`.
- [ ] 3.6 Add the phrase pool per move kind in English and Italian, the comment rate (about half of the moves) and spacing (at least 8 bars), and make `tools/voice.mjs` voice the pool; verify the spacing rule in `check:endless` and that `npm run voices` creates a sample for every pool phrase.
- [ ] 3.7 Make sessions deterministic end to end and add seed fixtures (seed, options, expected session hash) to `check:endless`, and verify that two runs with the same seed are identical and that a run without seed records the seed it used.
- [ ] 3.8 Write `docs/ENDLESS.md` (what the director does, shapes, moves, rules, comments, determinism, what comes in later phases) and verify each rule in it has a matching check.

## 4. Command line

- [ ] 4.1 Implement `tools/endless.mjs` (options, defaults, errors that list valid choices and write nothing, song files and `session.json` in `--out`) and verify the "Session written" and "Unknown style" scenarios.
- [ ] 4.2 Implement `--join` (one song with every song in order, unique track ids, offset bars and steps) and verify the joined file passes `tools/song.mjs validate`.
- [ ] 4.3 Implement the report (one line per song with title, styles per part, length, tempo, key, shape, tracks; one line per phrase with target and measured energy, moves and comments) and verify its lines on a fixed seed.
- [ ] 4.4 Document the commands in `AGENTS.md` (tooling) and `docs/COMPOSING.md`, add npm scripts, and verify the documented commands run as written.

## 5. Integration

- [ ] 5.1 Generate a session for each of the twelve styles and a mixed session (for example synthwave, jazz and country with chaos 1), open them in Compose, and verify in the browser that every song plays as a live build without evaluation errors, with measured levels per instrument reported.
- [ ] 5.2 Update `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, README and `DEVLOG.md`, run `npm run check:code`, `npm run check:songs`, `npm run check:endless` and `npm run build`, and verify all pass before merging into `develop`.
- [ ] 5.3 Hand the owner a few joined sessions (and exported audio if asked) to listen to, and record the feedback in `DEVLOG.md` and issue #21.
