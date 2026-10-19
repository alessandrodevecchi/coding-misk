## 1. Shape data and choice

- [x] 1.1 Song field `growthShape` and recipe field `growthShapes` in the validators; verify with `npm run check:songs` and `npm run check:styles` (a wrong id gives an error with its path)
- [x] 1.2 Shape resolution (song, style weights, seed stream `shape-<SHAPES_VERSION>`, impossible openings removed); verify with a Node check in `tools/check-crescendo.mjs`: same song same shape, song value wins, style weights followed over 200 seeds
- [x] 1.3 Profile controls `opening`, `pace`, `development` (`auto` default) and `growthRules` passing the shape only for the natural growth; verify with `node tools/check-profiles.mjs` (old stored profiles still valid)
- [x] 1.4 Classic and Crescendo unchanged; verify that `tools/check-crescendo.mjs` Crescendo fixtures and `npm run check:code` pass without rewriting

## 2. Openings

- [x] 2.1 Opening functions and the thinning core per opening (D2); verify in `tools/check-crescendo.mjs`: for each opening and each built-in song that can play it, the first waypoint matches the table
- [x] 2.2 Typed opening: lead-in bars, silent until the first line is typed; verify in the browser with `tools/check-crescendo-play.cjs` (no sound before the first step, the line is complete when it sounds) and that fragments skip the lead-in (`npm run check:clips`)
- [x] 2.3 Build actions `mute`, `unmute`, `solo`, `unsolo` with `_$:` and `S$:` in every code view; verify with `npm run check:code` and an evaluation of each state in `tools/check-crescendo-play.cjs`
- [x] 2.4 Muted base and mid-set openings; verify that each step removes one `_` or one `S` and that every state evaluates without errors
- [x] 2.5 Voice opening with a voice instrument line (after `voice-instrument`); verify that it is never drawn for songs without one
  - Done with `voice-instrument`: `canPlay` offers the voice opening only to a song with a spoken track that has an opening line; the build puts that track first and says its opening line just before the next track comes in (the bars before are the time that line takes to type). `check:crescendo` (the first waypoint of each opening: the spoken line alone) and `check:spoken` verify it, and that it is never drawn without a spoken opening.

## 3. Pace

- [ ] 3.1 Spacing in seconds for the first minute (D3); verify in `tools/check-crescendo.mjs`: audible changes in the first minute, fast 7 to 8, medium 4 to 6, slow as today, over the built-in songs and the four test songs
  - Partly done: spacing in seconds, first-minute gaps protected, small moves first with a fast pace. Measured over the built-in and test songs (metamorphosis apart): medium 4 to 6 in 92% of builds (the others 3), fast 7 to 8 in 58% (the others 5 or 6), slow as today. The misses are songs whose next line takes longer to type than a step allows; typing never rushes (design D11, open question).
- [x] 3.2 Full kick within 60 s for medium and fast; verify the time of the written kick row in the same check

## 4. Development

- [x] 4.1 `as-written` and `by-type` orders; verify that the "Apre arpeggio" test song enters with the arpeggio when built as written
- [x] 4.2 `masks` with mask ideas per track; verify that the events after the growth equal the written song
- [x] 4.3 `parameters`; verify that after the first two waypoints no step adds or removes a track
- [x] 4.4 `second-section` with `S$:` lines; verify the solo part plays alone and then everything plays
- [x] 4.5 `metamorphosis` with tempo, key and one style change from `material-generator` (D7); verify every state evaluates, tempo and key change only on phrase boundaries, the build ends on the last skin

## 5. Moves and second thoughts

- [ ] 5.1 Moves: beat step, prepared variant, prepared key change, `pick` alternation, `slide`, `seg(16)`; verify each appears in at least one checked build and that each step changes a few characters
  - Partly done: beat step moved, prepared variant, `seg(16)` (rack device `seg`) and a slow slide appear in checked builds, median edit under 80 characters. Not done: the `pick` alternation and the prepared key change (both need the idea writer to write them; design D5).
- [x] 5.2 Passing melody and refined part (D8); verify in the check that every note is in the section's scale and that the build ends on the written part
- [x] 5.3 Ideas grow instead of thinning where the part is an idea; verify on 3 songs converted by `idea-model` that each growth step adds or moves one element of the idea

## 6. Versions, docs and Guide

- [x] 6.1 `SHAPES_VERSION`, Live coder fixtures written with `tools/check-crescendo.mjs --write-fixtures`, reason in the commit; verify the Crescendo fixtures did not move
  - No commit made in this session: the commit that lands it must say why the Live coder fixtures moved (SHAPES_VERSION 1, first shapes).
- [x] 6.2 Style weights for the live coder styles, ambient and lo-fi (D10); verify with `npm run check:styles` and `node tools/check-style-sounds.cjs`
- [x] 6.3 Compose shows the shape and lets the user set each part; Guide card in English and Italian in `src/guide.js`; verify with `npm run check:guide` and a screenshot of the panel
- [x] 6.4 `docs/COMPOSING.md`, `docs/SONG-FORMAT.md`, `docs/STYLES.md` updated; `DEVLOG.md` entry in Italian with the measured first-minute changes per pace

## 7. Integration and listening test

- [x] 7.1 Level checks: `node tools/snapshot-levels.cjs check` unchanged for Classic and Crescendo; `node tools/check-levels.cjs` on one song per opening below clipping
  - Levels unchanged for the songs with snapshots (one distorted guitar off by 0.27 on the first run, equal on the second). One song per opening below clipping: Prima luce exported per opening, peaks -1.7 to -3.5 dB (master, from the export instead of `check-levels.cjs`, which plays written sections only).
- [ ] 7.2 Owner's listening test (`docs/VARIETY.md`): one exported song per opening, first two minutes; notes go in `DEVLOG.md`, weights adjusted after it
  - Ready for the owner: Prima luce exported once per opening (first two minutes). Notes and weights after the listening test.
