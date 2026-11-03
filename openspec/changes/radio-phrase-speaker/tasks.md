Estimate: about 0.75 agent hours.

## 1. Ask for the speaker's sample in the radio (0.3 h)

- [ ] 1.1 `src/song/build.js`: add `missingNeeds(list, files, mineSlugs)` (D1). It keeps a line with no speaker sample when its text is mine or no bank of its language has it, and enforces the `MAX_WORDS` limit. Verify: the new Node check in 2.1.
- [ ] 1.2 `src/main.js` `needsOf`: use `missingNeeds` with the collection's slugs. Verify: `npm run check:phrases` and `PORT=5173 node tools/check-voices-tab.cjs` pass unchanged.
- [ ] 1.3 `src/radio/radio.js` `needs()`: use `missingNeeds` with the slugs of `S.recipe.mine.list` in the current language (D2). Keep the next song first. Verify: 2.1, and with no snapshot the list equals today's.
- [ ] 1.4 `src/radio/radio.js` `samplesArrived()`: queue `voicesOf` of the next song with `player.preloadVoices` when it is made (D3). Verify: 2.2.

## 2. Checks (0.35 h)

- [ ] 2.1 `tools/check-phrases.mjs`: add a radio song (`radioSong` with a phrase of All and a voice track with speaker X). Assert that `spokenNeeds` gives the phrase the bank `say_<lang>_X`. With a manifest holding only `say_<lang>/<slug>.wav`, assert that `missingNeeds` keeps the phrase and drops a built-in line the default voice has. With no mine slugs, assert the result equals the old radio filter. Verify: `npm run check:phrases`.
- [ ] 2.2 `tools/check-voice-preload.cjs`: add a `--speaker` step with the voice helper. Put a phrase of All in My phrases and wait for the helper to make `say_en_<X>/<slug>.wav` for the next song. Assert that the file is fetched before the next song's first bar and that the phrase plays from `say_en_<X>`, not from `say_en`. Without the helper, print a skip note. Verify: `PORT=5173 node tools/check-voice-preload.cjs --speaker`.
- [ ] 2.3 Run `npm run check:spoken`, `npm run check:endless` (fixtures unchanged, no `--write-fixtures`, `DIRECTOR_VERSION` unchanged) and `PORT=5173 node tools/check-voice-preload.cjs`.

## 3. Docs (0.1 h)

- [ ] 3.1 `docs/knowledge/radio.md` and `docs/knowledge/phrases.md`: in the radio, a phrase of mine gets its speaker's sample and the default voice speaks it until then. Update the `check-voice-preload.cjs` line in `AGENTS.md` and `docs/knowledge/checks.md` for `--speaker`. Verify: `npm run check:knowledge`.
- [ ] 3.2 Add the `DEVLOG.md` entry in Italian.
