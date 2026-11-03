## 1. Narration

- [x] 1.1 `narration()` in `src/song/build.js`: the poetic style speaks on the steps with `say` (`sayStep`) with Narrated growth on or off; entry images as today, pushed first; nothing more on an entry's own bar (D1, D2, D3)
- [x] 1.2 `stepSaid()`: a movement image on a bar with no entry, without the Narrated growth test; never the step line except the fallback (D3, D5)
- [x] 1.3 Movement image index: the ordinal among the steps that say a movement image, memoised per song and language; `m:${k}` keys follow (D4)
- [x] 1.4 Fallback: `imageText(line, lang)` (no English fallback for images); an empty entry image says the entry bar's step line on that bar, an empty movement image the step's line (D5)
- [x] 1.5 `voiceSamples()`: the same texts as `narration()` (images, movement images, fallback step lines), with no Narrated growth test

## 2. Texts

- [x] 2.1 Guide card `voices` in `src/guide.js`, en and it (D10); reread `crescendo`, `growth-timeline`, `next`, `captions`
- [x] 2.2 `narratorStyleHint` and `liveNarratedHint` in `src/i18n.js`, en and it (D10)

## 3. Docs

- [x] 3.1 `docs/knowledge/narrator.md`: the poetic paragraph and the `poetic` option line; `npm run knowledge`
- [x] 3.2 `docs/knowledge/voice.md`: reread, change only a contradicting line
- [x] 3.3 `docs/knowledge/decisions.md`: replace the poetic-steps D1, D2 row with this change's row (one rule for both styles, entries always imaged, fallback)
- [x] 3.4 DEVLOG (Italian), with the note on saved radio sessions with a poetic narrator (D8)

## 4. Checks

- [x] 4.1 `check:spoken`: rewrite "poetic narrator: … speaks only where a track comes in" and the D11 / poetic-steps cases: without and with Narrated growth on luci-rosse and kellerlicht, en and it, every bar with `say` and no entry says a movement image or yields to an image; no step line is said; every entry has its image; nothing on an entry's own bar; the explaining style unchanged
- [x] 4.2 `check:spoken`: movement images all different while the list lasts, with Narrated growth off (D4)
- [x] 4.3 `check:spoken`: fallback cases: a song with `narrator.lines.move: []` and a style list emptied in a test copy; an image with English text only in an Italian song (D5)
- [x] 4.4 `check:spoken`: every `POETIC` image has `en` and `it`
- [x] 4.5 `tools/check-captions.cjs`: the poetic counts (38 narrator captions with Narrated growth today), a poetic case without Narrated growth, the tag on an entry's bar (D6)
- [x] 4.6 `check:phrases`: movement image keys after D4
- [x] 4.7 `check:samples -- --strict` (fill with `--make` on macOS), `check:voice-heard`, `check:code` (expected unchanged, else `snapshot:code` with the reason, D7), `check:crescendo`, `check:endless` (fixtures unchanged, no version bump), `check:profiles`, `check:guide`, `check:knowledge`, `vite build`
- [x] 4.8 In the browser: `check-voices.cjs`, `check-timeline.cjs` (ghost row marks), `check-radio.cjs` (Coming next V:N), `check-captions.cjs`

## 5. Owner

- [x] 5.1 Answer Q1 (saved radio sessions: note only, or `DIRECTOR_VERSION`): note only in DEVLOG and release notes, no bump (owner, 2026-11-03)
- [ ] 5.2 Listening: luci-rosse poetic in Crescendo with Narrated growth off and on; a poetic radio session

## 6. Archive

- [ ] 6.1 Archive voice-full-controls and poetic-steps before this change
- [ ] 6.2 Archive this change
- [ ] 6.3 Remove from `openspec/specs/live-build/voice-phrases/spec.md` the requirements "Poetic narrator with Narrated growth" and "Poetic movement lines for steps without an entry", replaced by this change's requirements
