## 1. Baseline

- [ ] 1.1 Copy `tests/snapshots/code/` to `tests/snapshots/code-before-ideas/` and verify `npm run check:code` still passes against the main snapshots
- [ ] 1.2 Write `tools/check-ideas.cjs` (events of the baseline code against the current code, rules of design D8) and verify it passes on the unchanged code for every song in `songs/` and `songs/examples/`

## 2. Format and validator

- [ ] 2.1 Add the optional `idea` pattern field and the song `shared` map to `src/song/format.js` and verify an old song normalizes to the same object as before
- [ ] 2.2 Validate ideas with JSON paths (kinds, whole degrees and indices, steps inside the grid, grid fits the meter, chord names, scale, seeded random only, random only on indices, slices and values, known shared names) and verify each error with a small bad song in `npm run check:songs`
- [ ] 2.3 Document `idea`, `shared` and the `variant` step in `docs/SONG-FORMAT.md` and verify the examples there pass `node --no-warnings tools/song.mjs validate`

## 3. Idea writer and presets

- [ ] 3.1 Write `src/song/ideas.js` with `writeIdea` and `expandIdea` for every kind and verify unit cases in Node (cell, beat, degrees, chords with voicing, random, shared, variants; 4/4 and 7/8)
- [ ] 3.2 Give every preset in `BASS`, `ARPS`, `HOOKS`, `PADS`, `GUITAR_PATTERNS`, `GROOVES` and `TEX_RHYTHMS` its idea and make `sceneLayers` use `writeIdea`; verify `node tools/check-ideas.cjs` reports no difference for any song
- [ ] 3.3 Write shared progressions as `const` and prepared variants as commented lines in `compileSong`; verify with an example song in `songs/examples/` that compiles, plays without `evalError` and passes the event check
- [ ] 3.4 Move the `idiom.js` rules into the writer, keep `idiomatic()` for code it did not write, and verify `npm run check:live-code` passes
- [ ] 3.5 Rewrite the code snapshots (`npm run snapshot:code`) with the reason in the commit, and verify `node tools/snapshot-levels.cjs check` passes with the dev server running (no edits under `src/` during the run)
- [ ] 3.6 Update `docs/MUSIC-ENGINE.md` (presets as ideas, the writer) and `docs/COMPOSING.md` (writing ideas by hand) and verify every example in them validates

## 4. Live build

- [ ] 4.1 Add `ideaLadder` and use it in `patternVariants` for `rules.natural` only; verify `npm run check:crescendo` gives the same steps for Crescendo songs and new, valid forms for Live coder songs
- [ ] 4.2 Add the `variant` build step to `src/song/build.js` (`stateAt`, seek) and verify with a Node check that seeking past the step gives the variant on and the code without `//`
- [ ] 4.3 Bump `CRESCENDO_VERSION` for the changed natural growth and verify `npm run check:typing` and `npm run check:profiles` pass, with fixtures rewritten only for Live coder songs
- [ ] 4.4 Verify `npm run check:endless` passes without writing fixtures (the director still picks presets by name)

## 5. Compose, Guide and log

- [ ] 5.1 Compose pattern panel: step row filled from `expandIdea`, editing it writes the steps and shows the "written out" notice, idea shown as read-only code; verify by hand on a preset pattern and with a screenshot
- [ ] 5.2 Update the `compose` and `crescendo` Guide cards in `src/guide.js` (short code, ideas, written out on edit), English and Italian, and verify `npm run check:guide`
- [ ] 5.3 Add a DEVLOG entry in Italian (what changed, event check result, shorter code measured in lines and characters for three songs)

## 6. Integration

- [ ] 6.1 Run `npm run check:code`, `npm run check:songs`, `node tools/check-ideas.cjs`, `node tools/snapshot-levels.cjs check`, `npm run check:crescendo`, `npm run check:endless` and `npm run build`; verify all pass
- [ ] 6.2 Owner's listening test (`docs/VARIETY.md`, step 3): 3-4 known songs sound the same, with shorter code; record the songs and the outcome in DEVLOG
