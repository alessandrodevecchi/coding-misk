Effort: 2 to 3 agent hours, checks included.

## 1. Vocabulary and narration

- [x] 1.1 `POETIC.move`: twelve movement images in English and Italian (`src/song/vocabulary.js`)
- [x] 1.2 `movementLine(song, index)` in `src/song/spoken.js` (D3)
- [x] 1.3 `narration()` says the movement line for steps without an entry (D1); `voiceSamples` warms the same text
- [x] 1.4 `npm run voices`: samples for the new lines (git-ignored)

## 2. Checks

- [x] 2.1 `check:spoken`: update the D11 case (non-entry step lines become movement lines, entry step lines stay)
- [x] 2.2 `check:spoken`: a new case, in English and Italian: a non-entry step of luci-rosse in poetic Crescendo with Narrated growth says a `move` line, not its step line; consecutive movement lines differ; the explaining style is unchanged; every `move` line has a sample for the default speaker in both languages
- [x] 2.3 Run check:spoken, check-voices, check-radio, check:endless, check:code, check:guide, check:knowledge

## 3. Docs

- [x] 3.1 Guide card of the two voices (`src/guide.js`, en and it)
- [x] 3.2 `docs/knowledge/narrator.md`, a row in `docs/knowledge/decisions.md`
- [x] 3.3 DEVLOG (Italian)
