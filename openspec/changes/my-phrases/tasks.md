Estimates in agent hours, for the recommended answers, after `spoken-text-on-stage` (its preparation of samples, fallback chain, `spokenNeeds`, `check:samples` and speaker registry). Total: about 22 (17 to 28), unchanged by round 5: Sempre is one more value of the same setting and draw, covered by tasks 3.1, 3.5 and 6.1. Splitting the moments into several lists, if the owner asks (D2, open), adds about 0.5. Before `spoken-text-on-stage`: about 1.5 more for a minimal fallback.

## 1. Store and backup (2 h)

- [ ] 1.1 `src/voices/phrases.js` (pure): the store `coding-misk-phrases`, key `kind + lang + slug`, add with use count, edit, delete, cap, translation
- [ ] 1.2 Moments: the map of the 14 `PHRASES` kinds and the 18 `POOL` kinds onto 21 moments, in three groups, the same for Compose and the radio; every pool key mapped (D2; one list or several to confirm with the owner first)
- [ ] 1.3 Backup merge by id with larger use count and newer last use (`src/settings/backup.js`); case in `tools/check-backup.mjs`

## 2. Capture and save policy (2.5 h)

- [ ] 2.1 Radio console (`sayLine`): offer the line with kind voice, the style's group and the style (D2)
- [ ] 2.2 Compose phrase list and the narrator lines of the user's own songs (`lineSamples`, narrator edits): offer with kind and tag
- [ ] 2.3 Policy setting `coding-misk-phrase-settings.save`: Salva sempre with Annulla (riding the edit's Undo in Compose), Chiedi with Salva, No, Sempre and the 10 s timeout, Non salvare mai (D3)
- [ ] 2.4 A late save button on the radio console's row until the song ends

## 3. The director uses them (3 h)

- [ ] 3.1 `src/voices/mine.js`: candidates by kind, tag, language, styles, on; the second draw on `mine/<kind>/<n>`; least used first (D4)
- [ ] 3.2 Radio: voice track vocabulary lines and `POOL` lines in `src/endless/director.js`, written out in the song; `mine` in the session recipe only when not Mai
- [ ] 3.3 Compose: `PHRASES` and `POETIC` lines in the narration layer (`src/song/spoken.js`), growth untouched; "Fill with" and "New phrases" get Le mie frasi (`src/endless/voice-track.js`)
- [ ] 3.4 Use counts on play (radio on air, Compose Play)
- [ ] 3.5 `npm run check:phrases` (`tools/check-phrases.mjs`, no browser): store, merge, moments map, Mai and empty collection leave `check:endless`, `check:spoken` and the growth fixtures unchanged, share rates over 200 seeds, Sempre replaces every pool line that has a candidate and none of a song's or a style's own lines, a song's own lines never replaced, Replay identical after a delete

## 4. Voice helper: samples (2.5 h)

- [ ] 4.1 `GET /voice/usage` (banks, files, sizes), `POST /voice/delete` (named files under `say_*`, protected slugs skipped), `POST /voice/keep` (playing songs, saved slugs) in `vite.config.js`, local only like `/voice/say`
- [ ] 4.2 `say_temp.json` ledger: list on `made: true` for unsaved lines, expiry from the setting, sweep at start and hourly, never a playing song's (D6)
- [ ] 4.3 Page side: classes of D5 (built-in set shared with `check:samples`), protected slugs on every delete, `reloadSamples` and recompile after any deletion
- [ ] 4.4 Delete and edit of a phrase: files per bank minus protected, size in the confirmation, Undo (D7)

## 5. Voci tab (7 h)

- [ ] 5.1 Tab after Suoni, the four section chips, remembered section; `index.html`, `src/voices/voices-tab.js` (1 h)
- [ ] 5.2 Le mie frasi: search, kind chips, Quanto usarle, groups, rows, status, hear with the voice it would use, form for new and edit (2.5 h)
- [ ] 5.3 Vocabolari inclusi: groups, read-only rows, both languages, a mark per bank, headphones, Copia nelle mie frasi (1.5 h)
- [ ] 5.4 Voci e suoni: speakers and counts, not installed, test line per speaker and per voice style on the preview player, test bench with a temporary sample (1 h)
- [ ] 5.5 Campioni: space by class and bank, missing list, Prepara i mancanti with progress, Pulisci gli orfani with its list, temporary samples; read-only without the helper (1 h)

## 6. Settings and links (1 h)

- [ ] 6.1 "Voci e frasi" card: save policy, temporary lifetime, how often (five levels with Sempre), space with the link (`src/settings/settings.js`), reset
- [ ] 6.2 Links: "Fill with" and the radio vocabulary choice to Vocabolari inclusi, missing-sample rows to Campioni, the Voices groups to Voci e suoni

## 7. Look (1 h)

- [ ] 7.1 Icons in `src/icons.js` (wave, microphone, quill, copy, disk, broom, spark, clock), shared with the speaker registry
- [ ] 7.2 Hardware lights and LCD, light theme tokens, 400 px layout; strings in `src/i18n.js` in both languages

## 8. Checks (2 h)

- [ ] 8.1 `tools/check-voices-tab.cjs` (dev server): capture from the radio console and Compose with the three policies (fake helper), toast Annulla and the 10 s No, edit, delete with protected files, copy from a vocabulary, test bench, a delete during playback against the new manifest, hardware, light, 400 px, English
- [ ] 8.2 Regression: `check:endless`, `check:spoken`, `check-voices.cjs`, `check-steering.cjs`, `check-settings.cjs`, `check-backup.mjs`, `check:light-theme`, `check-light-theme.cjs`, `check:guide`

## 9. Docs (1 h)

- [ ] 9.1 Guide cards `voices-tab` and `my-phrases`, updates to the radio console and Compose cards; `npm run check:guide`
- [ ] 9.2 `docs/knowledge/voice.md`, `narrator.md`, a new `phrases.md`; `npm run knowledge`, `npm run check:knowledge`; the two new checks in `AGENTS.md` and `docs/knowledge/checks.md`; DEVLOG
