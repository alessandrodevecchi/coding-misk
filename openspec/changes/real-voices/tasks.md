# Tasks

## 1. Speaker table and language rule

- [x] 1.1 In `src/song/build.js`, replace `SPEAKERS` with `SPEAKER_LANGS` (albert, fred, junior, kathy: `['en']`), `SPEAKERS`, `REMOVED_SPEAKERS`, `speakerId` and `speaks`, and make `sayBank` return `say_<lang>` for a speaker that does not speak the language or is not listed (design D1, D2); verify with new `check:spoken` tests: `sayBank('it', 'kathy') === 'say_it'`, `sayBank('en', 'kathy') === 'say_en_kathy'`, `sayBank('en', 'reed') === 'say_en'`
- [x] 1.2 In `tools/voice-sample.mjs`, add the same speaker table and `sayBank` rule; in `vite.config.js`, replace `SPEAKER_IDS` with the table imported from `tools/voice-sample.mjs`; verify with a `check:spoken` test that both tables and both `sayBank` functions agree for every speaker, removed speaker and language
- [x] 1.3 Update the comment on `speaker` in `src/song/format.js` and the generated speakers line of `tools/knowledge.mjs` (speakers with their languages); verify `npm run knowledge` rewrites `docs/knowledge/narrator.md` with the new list and `npm run check:knowledge` passes

## 2. Reading removed speakers as the default voice

- [x] 2.1 Route every speaker read through `speakerId`: `narratorSpeaker` and `speakerOf` (`src/song/spoken.js`), `voiceFor` and the voice instrument draw (`src/endless/director.js`), the typed lines in `src/endless/steering.js`, `lineSpeaker` in `src/radio/radio.js` (design D3); verify with `check:spoken` tests: a song with narrator `reed` plays from `say_en`, and a style with `voice.speakers: ["rocko", "kathy"]` draws only `""` or `kathy` over 200 seeds
- [x] 2.2 In `src/song/validate.js`, give the removed-speaker warning; in `src/endless/recipe.js`, turn the error for a removed id in `voice.speaker`, `voice.speakers` and `spoken.speakers` into a warning, keep other unknown ids as errors; verify with `check:spoken` tests for both and `npm run check:styles`
- [x] 2.3 Verify a frozen radio session and a saved Compose song from before the change: a `check:spoken` test loads a stored song naming `flo` and `grandpa` and asserts every line's bank is `say_<lang>` and validation has no error

## 3. Built-in data

- [x] 3.1 Rewrite the speakers of the 12 song files by the table in design D4; verify `npm run check:songs` passes with no speaker warning and the `check:spoken` narrator-versus-voice-instrument test passes on every built-in song
- [x] 3.2 Rewrite `voice.speakers` and `spoken.speakers` in the 20 style files by the table in design D4; verify `npm run check:styles` passes with no warning
- [x] 3.3 Change `reed` to `fred` in the examples of `docs/knowledge/voice.md` and `docs/SONG-FORMAT.md`, and the speaker sentence of `docs/STYLES.md` (English-only speakers, Alice in Italian); verify `npm run check:knowledge` passes (its example songs compile)

## 4. Pickers and the Voices tab

- [ ] 4.1 Speaker pickers in `src/main.js` (`CONTROLS.voice`, `CONTROLS.spoken`), `src/endless/voice-sound.js`, `src/voices/voices-tab.js` (test bench) and `src/library/styles-tab.js` list the new speakers; in Italian, an English-only speaker's option carries a note that Alice speaks in Italian; a stored removed id shows as the default option; new strings in both languages in `src/i18n.js`; verify with `tools/check-voices.cjs` (picks `fred`, checks the Italian note) and `npm run check:guide`
- [ ] 4.2 The Voices tab cards show, for an English-only speaker in Italian, that Alice speaks instead of the "not installed" warning; verify with `tools/check-voices-tab.cjs` (delete test on `say_en_kathy`, card text in Italian and English) and screenshots of the cards in neon, hardware, light and 400 px
- [x] 4.3 Update the Voices tab card of `src/guide.js` (speakers and languages) in English and Italian; verify `npm run check:guide`

## 5. Generator, voice helper and prune

- [x] 5.1 In `tools/voice-sample.mjs`, match the listed name exactly (`Kathy` or `Kathy (`), return `null` from `systemVoice` for a language the speaker does not speak, and add `realVoice` (probe against the default voice, audio data compared, cached) used by `makeSample` and `makeSampleAsync` (design D5); verify by running `node tools/voice.mjs --list` (no Italian speaker bank, no removed bank) and a probe of a voice listed but not installed returning not real
- [x] 5.2 Add the per-sample copy guard: a speaker sample whose audio data equals `say_<lang>/` of the same text is deleted and counted as a copy with a warning; verify with a test that copies a default sample into a speaker bank and runs the guard on it
- [x] 5.3 Add `--jobs N` (default 4) to `tools/voice.mjs` with a pool over `makeSampleAsync` and one `writeLengths` at the end (design D6); verify that a run with `--jobs 4` and a run with `--jobs 1` on the same missing lines give files with the same audio data, and a second run makes nothing
- [x] 5.4 Add `--prune` (list only) and `--prune --yes` (delete, rewrite `say_lengths.json`, clean `say_temp.json`) to `tools/voice.mjs` (design D7); verify on a temporary samples root with fake old banks that the listing deletes nothing and `--yes` deletes exactly the listed folders
- [x] 5.5 The voice helper in `vite.config.js` answers a request for a language the speaker does not speak with the `say_<lang>` sample, and 404 `speaker not installed` for a speaker that is not real; verify with `tools/check-voice-preload.cjs --speaker` in English and a request for `fred` in Italian
- [x] 5.6 Update `npm run voices` in the `AGENTS.md` Tooling list (`--jobs`, `--prune`, `--prune --yes`) and the voice notes of `docs/knowledge/voice.md` and `docs/knowledge/narrator.md` (how samples are made, the not-installed guard); verify `npm run check:knowledge`

## 6. Speaker check and existing checks

- [x] 6.1 Add `tools/check-speakers.mjs` and `npm run check:speakers` (design D8); verify it passes on the owner's Mac with the four voices, fails on a temporary bank holding a copy of a default sample, warns for the old banks while they exist, and deletes nothing
- [x] 6.2 Update `check:spoken` (speakers test over the new list, example banks `say_it` and `say_en_fred`, known-speakers test), `check:phrases` (radio-phrase-speaker test in English, no speaker request in Italian, fake usage on `say_en_fred`) and `check:samples`; verify each passes
- [x] 6.3 Add `check:speakers` to the `AGENTS.md` Tooling list and to `docs/knowledge/checks.md`, and update the lines of `check:samples`, `check-voice-preload.cjs` and `check:phrases` there; verify `npm run check:knowledge`

## 7. Sample banks on the owner's Mac

- [ ] 7.1 The owner runs `npm run voices -- --jobs 4`, then `npm run check:speakers`; verify the four English banks exist and `check:speakers` passes
- [ ] 7.2 The owner runs `node tools/voice.mjs --prune` and reads the list of the 16 old banks, then runs `node tools/voice.mjs --prune --yes` or confirms that an agent runs it; verify `npm run check:speakers` shows no old bank and `npm run check:samples` passes
- [ ] 7.3 Run `npm run check:voice-heard`, `PORT=5173 node tools/check-voice-heard.cjs` and `node tools/check-spoken-play.cjs` with the new banks; verify every line starts on its bar and the example song stays below clipping

## 8. Versions and fixtures

- [x] 8.1 Bump `DIRECTOR_VERSION` by one over the value on `develop` at merge time (17 if this change merges first, 18 after `varied-openings`) (design D9); verify radio sessions saved before show the "may sound different" badge in `tools/check-radio.cjs`
- [x] 8.2 On this branch, before any fixture is written, run `npm run check:endless`, `npm run check:radio-profiles`, `npm run check:invent` and `npm run check:code`; verify that only voice data moves: no `music` hash, only `say_*` bank names in the code snapshots; if the invent fixtures move, bump `STYLE_MAKER_VERSION` by one
- [x] 8.3 If this change merges last: regenerate every shared fixture once, after both changes are in (`npm run check:endless -- --write-fixtures`, `npm run check:radio-profiles -- --write-fixtures`, `npm run check:invent -- --write-fixtures`, `npm run snapshot:code`, the Crescendo and Live coder fixtures if `varied-openings` moved them, `npm run durations`); verify every fixture check passes. If this change merges first: commit no fixture file and note in `DEVLOG.md` that `varied-openings` regenerates them

## 9. Changelog, devlog and integration

- [x] 9.1 Add the change to `CHANGELOG.md` under `## [Unreleased]` (Changed: speakers; Removed: the eight speakers; Added: `check:speakers`, `--jobs`, `--prune`), mark `#63` in `docs/knowledge/status.md`, and add the Italian `DEVLOG.md` entry; verify `npm run check:knowledge`
- [ ] 9.2 Run `npm run check:code`, `npm run check:songs`, `npm run check:spoken`, `npm run check:phrases`, `npm run check:samples`, `npm run check:speakers`, `PORT=5173 node tools/check-voices.cjs`, `PORT=5173 node tools/check-voices-tab.cjs` and `PORT=5173 node tools/check-captions.cjs --no-video`; verify all pass, apart from the fixture checks that wait for the last merge (task 8.3)
