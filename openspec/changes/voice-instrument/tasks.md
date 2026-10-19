## 1. Track and lines

- [x] 1.1 Track type `spoken` with voice settings and rack, and line patterns (text, way, every, slices, rhythm) in the format and validator; verify with `npm run check:songs` (wrong way, unknown bound track and lines over 12 words give errors with their paths)
- [x] 1.2 Compiler: passage, refrain, chop and opening resolved to bars with mask lanes, orbits 13 and 14; verify with a new Node check `tools/check-spoken.mjs` (entry lines end one beat before each entry, refrains only in quiet sections, chop slices on the rhythm's steps) and `npm run check:code` unchanged for existing songs
- [x] 1.3 Narrator yields on shared bars (D5); verify in `tools/check-spoken.mjs` that no step comment and spoken line overlap
- [x] 1.4 Poetic narrator style (`narrator: explain | poetic` on song and style, poetic lines at enter and back steps, vocabulary group `poetic` in English and Italian); verify in `tools/check-spoken.mjs` that explain is unchanged and poetic speaks only at entries

## 2. Texts and samples

- [x] 2.1 Vocabulary file in English and Italian, own words only, and generated lines on the `spoken` stream; verify in `tools/check-spoken.mjs`: same song same lines, music of a seed unchanged
- [x] 2.2 `tools/voice.mjs` collects song, style and vocabulary lines per speaker and language and stores sample lengths in the manifest; verify by running `npm run voices` and checking that every line of the example song has a file and a length
- [x] 2.3 Language and speaker choice (D4); verify in the check that the narrator and the voice instrument of a song differ in speaker by default
- [x] 2.4 Missing samples stay silent; verify in the browser with the samples folder renamed: the example song plays without `evalError`
  - Verified with `tools/check-spoken-play.cjs`: the page gets the samples manifest without the `say_*` banks (what a machine without `npm run voices` serves), so the owner's samples folder stays as it is.

## 3. Live build and director

- [x] 3.1 `spoken` in the growth order and the `voice` opening hook for `growth-shapes`; verify with `tools/check-crescendo.mjs` that Classic and Crescendo fixtures do not move and that a song with a spoken opening starts with it
- [x] 3.2 Recipe field `spoken` and the director's candidate track (D7), left out of density and energy; verify with `npm run check:styles` and `npm run check:endless`
- [x] 3.3 Weights for the first styles, fixtures rewritten with `npm run check:endless -- --write-fixtures`, `DIRECTOR_VERSION` raised in the same commit; verify the check passes and the playlist session warning shows for an older saved session (`node tools/check-playlists.cjs`)
  - `check:endless` 60/60 with the new fixtures (only the `quiet` seed, ambient and lo-fi, moved), `DIRECTOR_VERSION` 4. In the browser a playlist with a version 3 session shows "may sound different" and a version 4 session does not. `tools/check-playlists.cjs` stops before that part on this machine: its test songs are past the first page of the Songs tab (the library holds the generated `songs/endless/` sessions), unrelated to this change.

## 4. Examples, docs and Guide

- [x] 4.1 Example song in `songs/examples/` with all four ways to speak; verify with `node --no-warnings tools/song.mjs validate` and `node tools/check-levels.cjs` (no errors, spoken track below clipping)
  - `check-levels.cjs` measures a short window at each section start, too short for a line in the middle of a section; the spoken levels come from `tools/check-spoken-play.cjs` (fx peaks 0.27 to 0.65, no evaluation error).
- [x] 4.2 Guide card in English and Italian in `src/guide.js` (what the voice instrument is, how it differs from the narrator, `npm run voices`); verify with `npm run check:guide`
- [x] 4.3 `docs/SONG-FORMAT.md`, `docs/COMPOSING.md`, `docs/VOCALS.md`, `docs/ENDLESS.md`, `docs/STYLES.md` updated; `DEVLOG.md` entry in Italian

## 5. Integration and listening test

- [x] 5.1 Export the example song (`node tools/check-export.cjs`) and compare with playback: same lines at the same bars
  - `tools/check-export.cjs example-voices`: fast and real time sound the same (loudness 0.03 dB, over time r=0.999). The fast export lost a sound with `stretch` in the first tenth of a second of a render (a voice line on bar 0): `src/render/page.js` now starts such a sound 0.1 s later. `check-export.cjs` finds a song past the first page of the Songs tab by its title.
- [ ] 5.2 Owner's listening test (`docs/VARIETY.md`): 2 to 3 songs with a voice; notes in `DEVLOG.md`, weights and vocabulary adjusted after it
