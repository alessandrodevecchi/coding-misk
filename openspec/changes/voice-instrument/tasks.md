## 1. Track and lines

- [ ] 1.1 Track type `spoken` with voice settings and rack, and line patterns (text, way, bind, once, every, slices, rhythm) in the format and validator; verify with `npm run check:songs` (wrong way, unknown bound track and lines over 12 words give errors with their paths)
- [ ] 1.2 Compiler: entry, refrain, chop and opening resolved to bars with mask lanes, orbits 13 and 14; verify with a new Node check `tools/check-spoken.mjs` (entry lines end one beat before each entry, refrains only in quiet sections, chop slices on the rhythm's steps) and `npm run check:code` unchanged for existing songs
- [ ] 1.3 Narrator yields on shared bars (D5); verify in `tools/check-spoken.mjs` that no step comment and spoken line overlap

## 2. Texts and samples

- [ ] 2.1 Vocabulary file in English and Italian, own words only, and generated lines on the `spoken` stream; verify in `tools/check-spoken.mjs`: same song same lines, music of a seed unchanged
- [ ] 2.2 `tools/voice.mjs` collects song, style and vocabulary lines per speaker and language and stores sample lengths in the manifest; verify by running `npm run voices` and checking that every line of the example song has a file and a length
- [ ] 2.3 Language and speaker choice (D4); verify in the check that the narrator and the voice instrument of a song differ in speaker by default
- [ ] 2.4 Missing samples stay silent; verify in the browser with the samples folder renamed: the example song plays without `evalError`

## 3. Live build and director

- [ ] 3.1 `spoken` in the growth order and the `voice` opening hook for `growth-shapes`; verify with `tools/check-crescendo.mjs` that Classic and Crescendo fixtures do not move and that a song with a spoken opening starts with it
- [ ] 3.2 Recipe field `spoken` and the director's candidate track (D7), left out of density and energy; verify with `npm run check:styles` and `npm run check:endless`
- [ ] 3.3 Weights for the first styles, fixtures rewritten with `npm run check:endless -- --write-fixtures`, `DIRECTOR_VERSION` raised in the same commit; verify the check passes and the playlist session warning shows for an older saved session (`node tools/check-playlists.cjs`)

## 4. Examples, docs and Guide

- [ ] 4.1 Example song in `songs/examples/` with all four ways to speak; verify with `node --no-warnings tools/song.mjs validate` and `node tools/check-levels.cjs` (no errors, spoken track below clipping)
- [ ] 4.2 Guide card in English and Italian in `src/guide.js` (what the voice instrument is, how it differs from the narrator, `npm run voices`); verify with `npm run check:guide`
- [ ] 4.3 `docs/SONG-FORMAT.md`, `docs/COMPOSING.md`, `docs/VOCALS.md`, `docs/ENDLESS.md`, `docs/STYLES.md` updated; `DEVLOG.md` entry in Italian

## 5. Integration and listening test

- [ ] 5.1 Export the example song (`node tools/check-export.cjs`) and compare with playback: same lines at the same bars
- [ ] 5.2 Owner's listening test (`docs/VARIETY.md`): 2 to 3 songs with a voice; notes in `DEVLOG.md`, weights and vocabulary adjusted after it
