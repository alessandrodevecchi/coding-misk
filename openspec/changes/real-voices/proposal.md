# Proposal

## Why

The eight speakers in `SPEAKERS` (`src/song/build.js`: eddy, flo, grandma, grandpa, reed, rocko, sandy, shelley) are listed by `say -v '?'` on the owner's Mac, but they are not installed there. `say` falls back to the system voice without an error, so every sample in `public/samples/say_<lang>_<speaker>/` is a byte-identical copy of the default voice (307 MB). A speaker choice changes nothing audible today; only the voice styles (robot, echo and the others) do. This is the cause of backlog item `#63` ("speaker variants sound the same").

The owner listened to test samples and chose the voices to keep: real, installed and distinct.

## What Changes

- **BREAKING: new speaker list.** The eight speakers are removed. The speakers are `albert`, `fred`, `junior` and `kathy`, all English only. The default voice stays Samantha (English, `say_en`) and Alice (Italian, `say_it`). Italian has no speaker other than the default.
- **Speakers per language.** A speaker declares the languages it speaks. Where a speaker does not speak the app language, the line uses the default voice of that language (Alice in Italian), and the speaker pickers and the Voices tab say so.
- **Migration of saved data.** A removed speaker found in a saved song, a radio session, a radio voice option, a user style or a hand-picked setting reads as the default voice. That is what it always sounded like, so saved songs and sessions sound the same as before. Nothing in the browser storage is rewritten.
- **Built-in data rewritten.** `songs/*.json`, `songs/examples/06-voices.json` and the `voice.speakers` and `spoken.speakers` lists in `styles/*.json` name the new speakers, by a fixed table in `design.md`.
- **Generator guard.** `npm run voices` (`tools/voice.mjs`), `tools/voice-sample.mjs` and the dev server voice helper (`vite.config.js`) use the new names. A speaker whose sample is byte-identical in audio to the default voice's sample of the same text is treated as "not installed": the sample is not written, and the tool warns. This cannot happen silently again.
- **Parallel generation.** `npm run voices` gets a `--jobs N` option, so the new English banks are made in minutes.
- **Old banks.** A prune option of `npm run voices` lists the banks of removed speakers and of languages a speaker does not speak, and deletes them only when the owner confirms. No check deletes samples.
- **Checks.** A new `npm run check:speakers` proves that every speaker of every language makes a sample different from the default voice. `check:spoken`, `check:phrases`, `check:samples`, `check-voices.cjs`, `check-voices-tab.cjs` and `check-voice-preload.cjs` use the new names.
- **Versions and fixtures.** The director draws speakers from the list, so the endless fixtures move (voice only; the music hash stays). `DIRECTOR_VERSION` goes up by one. `STYLE_MAKER_VERSION` goes up by one only if the invented-style fixtures move. The `varied-openings` change bumps the same versions; the fixtures are regenerated once, by whichever change merges last (see `design.md`, D9).

## Capabilities

### New Capabilities

- `app/speakers`: the speaker list per language, the default voice, the language fallback, how pickers and the Voices tab show speakers, and how removed speakers in saved data are read.
- `app/voice-samples`: how the sample banks are made and kept: the generator's "not installed" guard, parallel generation, the prune of old banks, and the check that every speaker sounds different.

### Modified Capabilities

- `endless/radio-voice`: "A speaker per style" no longer requires speakers that speak both English and Italian; a style names speakers from the new list, and in Italian they speak with the default voice.

## Impact

- **Code:** `src/song/build.js` (`SPEAKERS`, speaker languages, `sayBank`, `lineSample`), `src/song/spoken.js` (`speakerOf`, `narratorSpeaker`), `src/song/validate.js`, `src/endless/director.js` (`voiceFor`, the voice instrument draw), `src/endless/recipe.js`, `src/endless/voice-sound.js`, `src/endless/steering.js`, `src/radio/radio.js`, `src/library/styles-tab.js`, `src/voices/voices-tab.js`, `src/main.js` (track panel controls), `src/i18n.js`.
- **Tools:** `tools/voice-sample.mjs`, `tools/voice.mjs`, `vite.config.js` (voice helper), `tools/knowledge.mjs`, new `tools/check-speakers.mjs`, the checks listed above.
- **Data:** 12 song files, 20 style files.
- **Fixtures:** endless seed fixtures, radio fixtures (`tests/snapshots/radio-growth.json`), code snapshots of `prova-voce-notte`, `prova-voce-taglio` and `example-voices`, possibly invented-style fixtures; song card durations (`npm run durations`).
- **Local files (git-ignored):** the 16 old speaker banks in `public/samples/` are deleted by the owner; four English banks are made.
- **Docs:** `docs/knowledge/voice.md`, `docs/knowledge/narrator.md` (generated part), `docs/knowledge/phrases.md`, `docs/knowledge/recipes-build.md`, `docs/knowledge/checks.md`, `docs/knowledge/status.md` (`#63`), `docs/STYLES.md`, `docs/SONG-FORMAT.md`, `AGENTS.md`, `CHANGELOG.md`, `DEVLOG.md`.
