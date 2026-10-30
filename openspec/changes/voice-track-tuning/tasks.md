# Tasks

Estimate: about 19 agent hours (16 to 22), in the order below. Each group ends with its checks green.

## 1. Measure before (about 1.5 h)

- [ ] 1.1 Write `tools/voice-repeats.mjs` (Node, no browser): for a fixed list of seeds (`f7zvee` plus 10 seeds of 12 songs, styles with own lines among them: dark cyberpunk, synthwave, berlin techno), voice options default, "many" mixed, one-phrase chop and one-phrase refrain, print per song the voice bars, starts per line, the most starts of one line, the share of the song with voice, and per session the lines said again within 5 songs and the share of songs per style line. JSON output with `--json`.
- [ ] 1.2 Run it on `develop` (before any change below) and keep the output in `notes/prove-2026-10-30/voci-misure-prima.json`; record the seed list in the script.

## 2. Song format and compiler (about 3 h)

- [ ] 2.1 `src/song/spoken.js`: array texts (2 to 4 vocabulary entries) in `lineOf` and the validator; chop `every` (default 1) in `placeSpoken`; refrain `times` (spread starts, first and last kept); stop the "every is for refrains" warning for chops.
- [ ] 2.2 `lineOf`: leave out the entries the track's other patterns write out (fallback to the whole group).
- [ ] 2.3 `spokenCode`: `n("…").s("bank")` for lines of several entries; `lineEntries` returns every entry with its offset.
- [ ] 2.4 `src/song/writer.js` `voiceCall`: accept `n(…).s("say_…")`.
- [ ] 2.5 `src/voices/mine.js` `vocabGroupOf`: arrays.
- [ ] 2.6 Captions and Coming next per entry (`src/song/build.js`, `src/radio/next-changes.js`), Compose phrase list shows array texts joined.
- [ ] 2.7 `npm run check:spoken` (new cases: array texts, de-duplication, every entry heard in Strudel in Node with captions matching, `every`, `times`); update the d2a7911 synthwave case to all entries.
- [ ] 2.8 `npm run snapshot:code` for `example-voices`, `prova-voce-notte`, `prova-voce-taglio` only (check `git diff --stat tests/snapshots/code`); `node tools/snapshot-levels.cjs write` for those three songs (dev server on 5245); say why in the commit.

## 3. Generation rules (about 3 h)

- [ ] 3.1 `src/endless/director.js`: new `CHOP_RHYTHMS`; chop clips at most 4 bars with `every: 2` (`spokenPlace`, `spokenParts`); refrain `every` from `[4, 8]`; one-phrase refrain `times: 3`; mixed A slots (D3); vocabulary lines written out without repeats in the song (D4).
- [ ] 3.2 `src/endless/voice-track.js`: the same in `extrasOf`, the first line, the one-phrase refrain clip, chop clip length in `rewriteSpoken` and `placeGrownSpoken`.
- [ ] 3.3 Style line share one half in both paths (`STYLE_LINE_SHARE`).
- [ ] 3.4 `npm run check:spoken`, `npm run check:phrases`.

## 4. Memory in the radio session (about 3 h)

- [ ] 4.1 `createSession`/`makeSong`: `entry.said`, `recent` over the 5 songs before (`RECENT_SONGS`), least recently used fallback.
- [ ] 4.2 Every line draw takes `recent` (A, new lines, vocabulary entries, my phrases); the radio voice steering commands pass the session's `recent` for the song they rewrite (`src/endless/steering.js`).
- [ ] 4.3 My phrases: session-overlaid use counts for `mineSpokenTrack` and `song.mine` (D6).
- [ ] 4.4 `DIRECTOR_VERSION` 14 with its comment; `npm run check:endless -- --write-fixtures`, then `npm run check:endless`; new cases: no line said twice within 6 songs while candidates remain, Replay equality, steering rewrite equality.
- [ ] 4.5 `npm run check:phrases` (session counts, exclusion, Mai unchanged), `npm run check:radio-profiles`.

## 5. Just-in-time lines and the Options toggles (about 5.5 h)

- [ ] 5.1 `src/live/live-code.js`: per-line spans from `placeSpoken` of the grown song; split of the spoken block in `codeWith` into shown and hidden tail (D8); display steps in `momentOf` when no step falls in the 4 bars before a first start.
- [ ] 5.2 Typing (D9): voice-track lines pasted by default, typed only in a free gap after every other edit is planned; not counted by `pasteRule`, ignored by the typing load. Check that `node tools/check-crescendo.mjs` fixtures, `SHAPES_VERSION` and the Live coder fixtures do not move.
- [ ] 5.3 Options toggles (D11): move "Narrator voice code" (`voice`) from the Comments chips to the Options row as "V:N code" (Compose `index.html` and `src/main.js:2054`, `:2471`; radio `src/radio/song-controls.js:23`, `:111-113`, `:307`), key and values unchanged; add "V:T code" (`spoken`) next to it, `splitSpoken` in `src/song/writer.js`, `DISPLAY_CONTROLS` in `src/live/profiles.js`; hidden lines folded with "Voice effects" on; strings in `src/i18n.js` (English and Italian), the Guide card in `src/guide.js`.
- [ ] 5.4 `check:radio-profiles`: seed `f7zvee` Live coder: no voice line at bar 0, each line only in its span, voice haps identical to all lines shown; a busy step pastes, a free step may type. `PORT=5245 node tools/check-compact-code.cjs`, `npm run check:mixer` (quick), `npm run check:live-code`, `npm run check:crescendo`.
- [ ] 5.5 `check:functions`: every generated voice line folds with Voice effects on (D12), 20 radio songs and the built-in songs; with "V:T code" and "V:N code" off, the hidden tail holds the folded lines and the haps are the same.
- [ ] 5.6 Browser: `PORT=5245 node tools/check-captions.cjs`, `PORT=5245 node --no-warnings tools/check-radio.cjs`, `PORT=5245 node tools/check-voices.cjs`; screenshots of the code panel of "Static" at bar 0 and at its first voice line, with the toggle on and off; `PORT=5245 node tools/check-settings.cjs` and the radio Custom section: both toggles in Options, a song saved with the narrator code off keeps it off.

## 6. Measure after and document (about 3 h)

- [ ] 6.1 Run `tools/voice-repeats.mjs` with the same seeds; write a before/after table (voice bars per song, most starts of one line, repeats within 5 songs, share of songs per style line) into the DEVLOG entry and `notes/prove-2026-10-30/`.
- [ ] 6.2 Docs: `docs/SONG-FORMAT.md` (array texts, chop `every`, refrain `times`), `docs/ENDLESS.md` (memory, director version 14), `docs/knowledge/voice.md` and `docs/knowledge/decisions.md` (D4, D7, D8 and the rejected compile rule of D1); `npm run knowledge`, `npm run check:knowledge`, `npm run check:guide`, `npm run check:samples`.
- [ ] 6.3 `npm run check:code`, `npm run check:songs`, `node tools/snapshot-levels.cjs check` (dev server on 5245, no edits under `src/` while it runs), `npm run durations` if a built-in song's grown length moved.
- [ ] 6.4 DEVLOG entry (Italian) with the measurements and what the owner should listen for.
