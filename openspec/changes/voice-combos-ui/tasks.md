# Tasks

## 1. Storage and effective table

- [x] 1.1 Add `normalizeOverrides`, `effectiveCombos` and `overridesErrors` to `src/voices/combos.js` (design D3); verify with `check:voice-combos` tests: an unknown id is ignored, `clear` always present, an entry equal to the default is dropped, an English-only speaker under `it` is rejected, and `effectiveCombos` leaves other speakers as in the file
- [x] 1.2 Add `src/voices/combos-store.js` (key `coding-misk-voice-combos`, format 1, try/catch, `combos-changed` event, `set`, `reset(speaker)`) and set the module table to the effective one at start and on change; verify in the browser check that a toggle survives a reload and that a corrupt value gives the committed table

## 2. UI

- [x] 2.1 Add the per-card disclosure "Draw styles" with the chip grid in `src/voices/voices-tab.js` and `styles/` (D2, D7): `clear` locked, changed mark, "n of 10 allowed" summary, the note for English-only speakers and the "limited by Alice" mark; verify with `tools/check-voices-tab.cjs` in both languages and screenshots in neon and light at 400 px
- [x] 2.2 Add "Reset to defaults" per card (shown only with overrides) and the "Applies to the next radio session" note while a session is on air; strings in `src/i18n.js` in en and it; verify with the Voices tab check (reset clears only that voice)
- [x] 2.3 Check that the picker hints and the bench status follow the effective table after a toggle; verify with `tools/check-voices.cjs` and the Voices tab check

## 3. Draw wiring and session snapshot

- [x] 3.1 Let `voiceFor`, the voice instrument draw and the narrator step read `opts.combos` (D4); verify with a `check:spoken` test over 300 seeds that a limited speaker never gets another character through `opts.combos`, and that with no `opts.combos` songs are byte-identical to `develop`
- [x] 3.2 Add `comboRecord()` in `src/radio/radio.js` and `withCombos` in `src/endless/items.js`; record `recipe.combos` only when the effective table differs from the committed one (D5); verify with a radio check: a session with an override records it, a session without records nothing, and Replay after changing the override gives the same songs
- [x] 3.3 Check the share link and export carry `recipe.combos` or fall back to the committed table when it does not fit; verify with the existing share check and state the outcome in `DEVLOG.md`

## 4. Backup

- [x] 4.1 Add the merge rule to `src/settings/backup.js` (per language and speaker, backup wins, invalid parts ignored, counted as settings) (D6); verify with `tools/check-backup.mjs`: export and import round trip, the merge case of the spec, a backup without the key, a malformed value

## 5. Guide and docs

- [x] 5.1 Add the Guide card in `src/guide.js` in English and Italian (what the grid does, only automatic draws, manual stays free, reset, kept in the browser and the backup) and update the `voices-tab` card text; verify with `npm run check:guide`
- [x] 5.2 Document the overrides, the effective table and the session snapshot in `docs/knowledge/voice.md`, `docs/ENDLESS.md` (Voice) and `docs/VOCALS.md`; update `docs/knowledge/checks.md`; verify `npm run check:knowledge`
- [x] 5.3 Add the entries to `CHANGELOG.md` under `## [Unreleased]` and a `DEVLOG.md` entry; verify the full check list of `AGENTS.md` passes, with a browser check of the toggle, reload and Replay

## 6. Deferred (not scheduled): fallback per voice

- [ ] 6.1 (optional, about 7.5 agent hours, recommended not now) Implement design D8: a `fallback` mode per voice stored with the overrides, the draw wiring, the nearest-voice table, snapshot and backup extension, Guide text, checks
