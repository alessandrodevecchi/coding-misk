Estimates in agent hours, for the design the owner approved in round 5 (A for every look; C1 for "Claude" with C2 as an option of the look; the Studio monitor; the per-voice mark setting; one switch with choices under it) with the round 3 decisions (D9 to D11). Total: about 22.5 (18 to 28): 15.5 for the captions, 7 for samples ahead, the fallback chain with on-the-fly samples, the samples check and the speaker registry. Round 5 added about 4.5 to the earlier 18: C2 as an option (1.5), the per-voice mark (1), the choices under the switch, also in exports (1), speaking a sample made on the fly (0.5), checks (0.5).

## 1. Caption schedule (2 h)

- [x] 1.1 `captionSchedule(song, C, lang, files, lengths)` in `src/song/build.js` from `spokenSchedule` (D1): speaker, start, `until` from `say_lengths.json`, chop once per clip, refrains at each repeat
- [x] 1.2 Kept per compiled build, language and manifest in `src/main.js`; the radio's `info` and the fast video's list read it
- [x] 1.3 Lines typed in the radio console: check they reach the schedule of the song on air (Say now, At the right moment); add them if not
- [x] 1.4 Cases in `npm run check:spoken`: explain, poetic, poetic with Narrated growth, a voice track, narrator off, no sample, a typed line

## 2. Stage lane (2 h)

- [x] 2.1 `#say` becomes the caption lane: speaker mark, stack of two, fade, step tag below the spoken line (D2)
- [x] 2.2 Hardware theme (amber display, lights), phone width
- [x] 2.3 Strings in Italian and English (`src/i18n.js`)
- [x] 2.4 The five marks per speaker kind (nothing, style only, label, icon, icon and style), name on hover, from the registry default and the setting (D12)

## 3. Looks (3.5 h)

- [x] 3.1 "Claude" C1: reply block, prompt cleared, voice line, last two exchanges, no page caption (D4)
- [x] 3.2 Studio monitor types the heard line with its speaker
- [x] 3.3 `termInfo` and `stageInfo` carry the captions instead of the step line
- [x] 3.4 "Claude" C2: transcript pane on the right with the older exchanges, nothing twice; `Trascrizione` option in the look's settings (off by default, stored, in the backup); hidden in 9:16 frames (D4)
- [x] 3.5 "Claude": prompt lines invented from the section change (`bring in…`, `drop…`, `keep the groove`) never spoken or captioned; the replies follow the "Claude" choice of the card (D4, D7)

## 4. Videos and live output (2.5 h)

- [x] 4.1 `drawCaptions` in `src/video/video.js` for the session video and the live output
- [x] 4.2 Fast video and fragments from `captionSchedule` (replaces `sayList`), 9:16 lower third
- [x] 4.3 Timeline layout: the heard line beside the playhead
- [x] 4.4 Videos follow the switch and the choices under it (In videos too); the fast video and fragment panels show the state, link to the card and can turn texts off for one export (D7)

## 5. Settings (2.5 h)

- [x] 5.1 "Testi sul palco" card (D7): one switch, the choices under it folded while off and kept, store, backup, reset
- [x] 5.2 Guide card in `src/guide.js`, both languages; `npm run check:guide`
- [x] 5.3 "How each voice is marked": one row per speaker kind with the five choices, the 1-bit, LED and HW note under Niente (D12)

## 6. Checks (2.5 h)

- [x] 6.1 `tools/check-captions.cjs` (dev server): the five cases of the design measured again (caption equals the heard line on every spoken bar, voice-track lines shown, nothing shown when not heard), "Claude" and Palco pictures, HW, 400 px, a fast video fragment
- [x] 6.2 Regression: `check:video`, `check:clips`, `check:live`, `check:render-styles`, `check-render-styles.cjs`, `check-song-config.cjs` (its "narrator off: no phrase" case changes for songs with a voice track)
- [x] 6.3 Settings in the browser: switch off and on (choices kept), narrator only, each of the five marks, the "Claude" transcript pane at 16:9 and absent at 9:16, an invented prompt line never captioned

## 7. Speaker registry (1.5 h, D11)

- [x] 7.1 `SPEAKER_KINDS` in `src/song/speakers.js`: rank, icon, style, colour, `exclusive`, `multiCaption`; `N` and `T` mapped to kinds, `singing` marked future
- [x] 7.2 Precedence read from the registry, behaviour unchanged: voice track over narrator, one narrator line per bar, the step's line after both (`check:spoken`, `check:code` unchanged)
- [x] 7.3 Captions take icon, style, default mark and rows from the registry; a fake third kind in `check:spoken` gets its caption with no other change, and turns the others quiet with `exclusive` and adds a row with `multiCaption` (groundwork only, no singing voice)

## 8. Samples prepared ahead (2.5 h, D9)

- [x] 8.1 `spokenSchedule` with a `needSamples` switch (`spokenNeeds`): every line without the sample filter, with bank and text
- [x] 8.2 Compose: on open, Generate and regrowth, queue the missing lines to `/voice/say`, read the manifest again, recompile; progress note in the Voices group
- [x] 8.3 Radio: the same when the next song is prepared, its first lines first; progress in Coming next
- [x] 8.4 Without the helper: the list of lines without a sample in the Voices group, with the `npm run voices` hint

## 9. Fallback chain (2 h, D10)

- [x] 9.1 Per-line fallback to the default voice for narrator lines (as voice-track lines already do), speaker settings kept
- [x] 9.2 On-the-fly sample from the dev voice helper (about 1 s), then the line is spoken as soon as it is ready (next beat of its bar, else the next bar, never over a higher rank) and captioned when it plays
- [x] 9.3 Last resort: silent, text as the step tag; a dev-console note on every fallback (visible side of `#63`)

## 10. Missing samples check (1 h, D9)

- [x] 10.1 `tools/check-samples.mjs`, `npm run check:samples`: built-in and example songs, style lines, vocabularies, both languages, every named speaker bank; `--strict` exits non-zero, `--make` fills the gaps (macOS)
- [x] 10.2 Row in `docs/knowledge/checks.md` and in the AGENTS.md tooling list

## 11. Docs (0.5 h)

- [x] 11.1 `docs/knowledge/narrator.md`, `voice.md`, `visuals.md`; `npm run knowledge`, `npm run check:knowledge`; DEVLOG
