## Why

The user writes spoken lines in three places: the radio console (Say now, At the right moment), the voice track's phrase list in Compose, and the narrator lines of their own songs. Each line gets its sample from the dev-server voice helper in about half a second and the sample stays on disk, but the line itself is lost for reuse (`#82`, owner request of 2026-10-29). Today:

- The voice track's texts come from the song, else the style's lines, else a fixed vocabulary in the code (`VOCABULARY` in `src/song/vocabulary.js`: dark, calm, machine, night). The narrator's lines come from the steps, the style's narrator lines, or fixed pools (`PHRASES` in `src/song/build.js`, `POOL` in `src/endless/phrases.js`, `POETIC` and `POETIC.move` in `src/song/vocabulary.js`).
- A line the user typed is not in any reusable collection, not in the app backup, and the director never says it again.
- Adding a narrator phrase means asking the developer to edit a pool in the code.
- The samples folder (`public/samples/say_*`, git-ignored) holds about 260 MB in about 3,500 files over 18 banks. Nothing shows which samples are used, which are missing, or how much space the user's own lines take; a sample nobody uses is never removed.
- Voices, voice sounds and vocabularies are scattered: the Voices groups of Compose and the radio set them per song, the vocabularies are only in the code, and there is no place to hear a speaker or check samples.

The owner wants a personal phrase collection that grows with use, a save policy, sample housekeeping, and a Voices tab in the Groove Lab.

## What Changes

- **My phrases.** Every line the user writes (radio console, Compose phrase list, narrator lines of their own songs, the new tab) is saved in a personal collection, `coding-misk-phrases`, which is in the app backup. Each phrase has a kind (voice track, narrator explaining, narrator poetic), a tag (a mood, a moment of the build, or a track that comes in), a language with an optional translation, optional styles, a use count and an on/off switch for the director.
- **The director reuses them.** Where a line comes from a built-in pool (vocabulary, explaining pools, poetic images), a phrase of the same kind, tag and language can take its place, drawn on its own random stream. A setting "Quanto usare le mie frasi" (Mai, Ogni tanto, Spesso, Molto, Sempre; default Ogni tanto; Sempre replaces every replaceable line) sets how often. With Mai or an empty collection every draw stays as today. A song's own written lines never change.
- **Save policy.** A global setting: Salva sempre (default, with a toast that offers Annulla), Chiedi ogni volta (a toast with Salva, No and Sempre that never blocks the music), Non salvare mai.
- **Samples of unsaved lines** are temporary: deleted after 24 hours by default (or at the end of the song, or after 7 days), never while their song plays, and made again when needed. Deleting a phrase deletes its samples unless a built-in vocabulary, another phrase or a saved song uses the same file.
- **Disk.** The space of the samples by kind (built-in, mine, temporary, orphans), and a cleanup of orphan samples with a list to confirm first.
- **Voci tab in the Groove Lab**, after Suoni, with four sections: Le mie frasi (list, filters, edit, add, delete), Vocabolari inclusi (read-only, browsable, preview with headphones, copy into mine), Voci e suoni (speakers and their sample counts, the ten voice styles to hear, a test bench), Campioni (status, space, prepare missing, clean orphans, temporary samples).
- **Settings:** a "Voci e frasi" card with the save policy, the temporary samples' lifetime, how often to use my phrases, and the space with a link to the tab.
- Italian and English, phone width, hardware and light themes, drawn icons only. Pictures: `notes/prove-2026-10-29/mie-frasi/` (git-ignored).

## Capabilities

### New Capabilities

- `app/my-phrases`: the personal phrase collection, its save policy, its use by the director.
- `app/voices-tab`: the Voci tab of the Groove Lab.
- `app/voice-samples`: sample status, temporary samples, deletion, disk space and orphan cleanup.

### Modified Capabilities

None in `openspec/specs/`. `endless/radio-voice` keeps its requirements: with Mai or no phrases the voice amount, speakers and draws are the same.

## Impact

- New: `src/voices/phrases.js` (store, classification, merge; pure, checked in Node), `src/voices/voices-tab.js` (the tab), `src/voices/mine.js` (the substitution draw), `tools/check-phrases.mjs`, `tools/check-voices-tab.cjs`.
- Changed: `src/endless/director.js` and `src/endless/voice-track.js` (a phrase of mine may replace a vocabulary or pool line, own stream), `src/song/spoken.js` (narration: explaining and poetic lines from pools), `src/radio/radio.js` (typed lines saved, toast), `src/main.js` (phrase list and narrator lines saved, `lineSamples`), `src/settings/settings.js` and `src/settings/backup.js` (card, merge by id), `vite.config.js` (voice helper: `/voice/usage`, `/voice/delete`, `/voice/keep`, temporary ledger), `tools/voice-sample.mjs` (shared helpers), `index.html`, `src/i18n.js`, `src/style.css`, `src/theme-light.css`, `src/guide.js`.
- Builds on `spoken-text-on-stage` (in progress): its `spokenNeeds` for the missing list, `npm run check:samples` for the built-in text set, the per-line fallback chain (D10) so a deleted sample is made again or falls back, and the speaker registry for icons. No duplicate of those.
- Determinism: director fixtures, growth fixtures and the growth cache do not move with Mai or an empty collection; no `DIRECTOR_VERSION` or `SHAPES_VERSION` bump.
- Samples stay in `public/samples/say_*` with today's names (`say_<lang>[_<speaker>]/<slug>.wav`); only `say_temp.json` is new (git-ignored).
