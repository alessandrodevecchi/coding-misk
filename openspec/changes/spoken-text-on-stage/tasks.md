Estimates in agent hours, for the recommended design (A for every look, C1 for "Claude", the Studio monitor). Total: about 11.5 (9 to 14). Design B instead of A: about 2 more; C2 instead of C1: about 1.5 more.

## 1. Caption schedule (2 h)

- [ ] 1.1 `captionSchedule(song, C, lang, files, lengths)` in `src/song/build.js` from `spokenSchedule` (D1): speaker, start, `until` from `say_lengths.json`, chop once per clip, refrains at each repeat
- [ ] 1.2 Kept per compiled build, language and manifest in `src/main.js`; the radio's `info` and the fast video's list read it
- [ ] 1.3 Lines typed in the radio console: check they reach the schedule of the song on air (Say now, At the right moment); add them if not
- [ ] 1.4 Cases in `npm run check:spoken`: explain, poetic, poetic with Narrated growth, a voice track, narrator off, no sample, a typed line

## 2. Stage lane (1.5 h)

- [ ] 2.1 `#say` becomes the caption lane: speaker chip, style per speaker, stack of two, fade, step tag (D2)
- [ ] 2.2 Hardware theme (amber display, lights), phone width
- [ ] 2.3 Strings in Italian and English (`src/i18n.js`)

## 3. Looks (2 h)

- [ ] 3.1 "Claude": reply block, prompt cleared, voice line, last two exchanges, no page caption (D4)
- [ ] 3.2 Studio monitor types the heard line with its speaker
- [ ] 3.3 `termInfo` and `stageInfo` carry the captions instead of the step line

## 4. Videos and live output (2 h)

- [ ] 4.1 `drawCaptions` in `src/video/video.js` for the session video and the live output
- [ ] 4.2 Fast video and fragments from `captionSchedule` (replaces `sayList`), 9:16 lower third
- [ ] 4.3 Timeline layout: the heard line beside the playhead

## 5. Settings (1.5 h)

- [ ] 5.1 "Testi sul palco" card (D7), store, backup, reset
- [ ] 5.2 Guide card in `src/guide.js`, both languages; `npm run check:guide`

## 6. Checks (2 h)

- [ ] 6.1 `tools/check-captions.cjs` (dev server): the five cases of the design measured again (caption equals the heard line on every spoken bar, voice-track lines shown, nothing shown when not heard), "Claude" and Palco pictures, HW, 400 px, a fast video fragment
- [ ] 6.2 Regression: `check:video`, `check:clips`, `check:live`, `check:render-styles`, `check-render-styles.cjs`, `check-song-config.cjs` (its "narrator off: no phrase" case changes for songs with a voice track)

## 7. Docs (0.5 h)

- [ ] 7.1 `docs/knowledge/narrator.md`, `voice.md`, `visuals.md`; `npm run knowledge`, `npm run check:knowledge`; DEVLOG
