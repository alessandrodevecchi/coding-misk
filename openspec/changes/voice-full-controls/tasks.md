## 1. Voice styles and sound model

- [ ] 1.1 `VOICE_STYLES` (D3) and `styleOf` in `src/song/format.js`; `check:spoken` case: each character on `VOICE_DEFAULT` equals its style, every style inside `VOICE_LIMITS`, `styleOf` gives Custom after a hand edit
- [ ] 1.2 `setVoiceSetting(trackId, patch)` in `src/main.js`: one song edit, re-render of the Voices group and the open track panel; narrator track added on the first edit of a song without one (D2), with Undo; verify in `tools/check-voices.cjs` (group to panel, panel to group, Undo, open Sound adds nothing)

## 2. Compose Voices group

- [ ] 2.1 Voice: narratore and Voice: traccia blocks, each with a closed Sound part (style picker and nine controls, same ranges as `CONTROLS.voice`); disabled with the reason (Live build off, narrator off, no voice instrument); `check-voices.cjs` cases
- [ ] 2.2 Voice instrument phrase list (D5) in the group and in the track panel: rows from `placeSpoken`, text and bars editable in place, 12-word limit, shared pattern note, "to translate" mark; `check-voices.cjs` cases (sort, edit text, edit bar, Undo)
- [ ] 2.3 Heard bars in Crescendo and Live coder (D6): heard and written bars, typed bar converted, bar in the growth refused, growing mark; `check-voices.cjs` case on a Crescendo song
- [ ] 2.4 Narrator line list: editable for songs with their own steps, read-only with the reason for derived builds; `check-voices.cjs` case

## 3. Where the voice instrument speaks

- [ ] 3.1 `partsOf(song, from, where)` (D7) in `src/endless/voice-track.js`, used by `rewriteSpoken`, the director's placement and the refrain rule in `src/song/spoken.js`; `check:spoken` cases (many phrases with quiet and medium, only busy, default identical) and `npm run check:endless` with fixtures unchanged
- [ ] 3.2 Where chips in `voicePanel` (track, radio, new song modes), `voiceOptions.where` in the validator and `docs/SONG-FORMAT.md`; toast texts for the new kinds; `check:songs`

## 4. Narrator

- [ ] 4.1 Poetic style with Narrated growth (D11) in `narration`; `check:spoken` cases (both lines, image wins a shared bar, poetic without Narrated growth unchanged); `npm run voices` covers any new line
- [ ] 4.2 Fixed name "Narrator" in the director and in the 10 built-in songs named "Voice"; `npm run snapshot:code` and `check:code`, `node tools/snapshot-levels.cjs check` on those songs (levels unchanged)

## 5. Radio and console

- [ ] 5.1 Radio options `narratorSound`, `voice.sound`, `voice.where` (D4, D7) in the director after the usual draws; session recipe only when not default; `check:endless` fixtures unchanged, `check:spoken` case for an overridden style
- [ ] 5.2 Radio Voices group layout (D12): two blocks, folded Phrases and Sound parts remembered, one hint line, no on-air button; `check-voices.cjs` and `check-radio.cjs` updated; Italian screenshots in the notes folder
- [ ] 5.3 Console Voice group: narrator row, voice instrument row with preset, style and Apply (`voice` + `voice-sound`, one queue entry), scope switch writing the Voices group (D10); `spokenCode` settings per bar; `tools/check-steering.cjs` cases (this song, whole session, Replay)
- [ ] 5.4 "Aggiungi frase" with Say now and At the right moment (`say-live`, D10): queue, Cancel, stage text, narrator yields, recorded bar, Replay; disabled without the helper; `check-steering.cjs` cases with a fake helper

## 6. Samples

- [ ] 6.1 Extract `makeSample` from `tools/voice.mjs`; `npm run voices -- --song <file>`; same output as before for `songs/` (file list compared)
- [ ] 6.2 Dev-only voice helper plugin in `vite.config.js` (`/voice/status`, `/voice/say`, queue, argument passing, 12-word limit); the app asks for missing samples of edited and typed lines and reloads that bank; measure the time per line and check no page reload; result in the DEVLOG

## 7. Labels, Guide, docs

- [ ] 7.1 Strings from `notes/etichette-voci-v2.md` with "Due voci" and "voice track" (D13) in `src/i18n.js`, new `voiceTitle` key for Library blocks; `check:guide`
- [ ] 7.2 Guide cards "Due voci" and "Voce: traccia", console card (Voice group, Aggiungi frase); knowledge notes `voice.md`, `narrator.md`, `radio.md`, `radio-commands.md`, `profiles.md`, `glossary.md`, `decisions.md`; `npm run knowledge` and `npm run check:knowledge`
- [ ] 7.3 DEVLOG entry in Italian, CHANGELOG under Unreleased; full checks: `check:spoken`, `check:endless`, `check:code`, `check:songs`, `check:radio-profiles`, `check-voices.cjs`, `check-radio.cjs`, `check-steering.cjs`, build
