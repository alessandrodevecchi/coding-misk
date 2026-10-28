Order set by the owner: the step labels and the V:N / V:T tags first, so the voices can be told apart when they are tested again; then the voice-track fix, vo15, the poetic images at entries, `spokenBars`, the lock, pp1, the rename, and ar4 last. Effort is agent working time, checks included.

| Group | Content | Effort |
| --- | --- | --- |
| 1 | Step labels (D1) | 1 h |
| 2 | V:N and V:T with the spoken text (D2) | 2.5 to 3.5 h |
| 3 | Voice track re-placed in grown songs (D3) | 3 to 5 h |
| 4 | Typed lines always sound (D4) | 1 to 1.5 h |
| 5 | Poetic images at every entry (D5) | 1.5 to 2.5 h |
| 6 | Narrator yields only to lines that sound (D6) | 0.5 to 1 h |
| 7 | Locked drums in breaks (D7) | 1 to 2 h |
| 8 | One pattern row in Compose, pp1 #84 (D9) | 5.5 h |
| 9 | Growth duration label (D10) | 0.5 h |
| 10 | 12 tracks at every bar, ar4, low priority (D8) | 1.5 to 2.5 h |
| 11 | Docs, Guide, knowledge, DEVLOG | 1 h |
| | **Total** | **19 to 26 h** |

## 1. Step labels

- [x] 1.1 `stepText` labels for all 17 `BUILD_ACTIONS` with track names, strings in `src/i18n.js` (it, en); rows without action and words left out (D1)
- [x] 1.2 Check in `tools/check-radio-profiles.mjs` (or a new `labels` case of `check:spoken`): for every step of 10 grown radio songs (Crescendo and Live coder, three styles) the label is non-empty, has no "undefined", and names a track of the song; a `{ at }` step gives no row
- [x] 1.3 Browser: `check-radio.cjs` reads "Next changes" of a Live coder song and finds no "undefined" and no empty row

## 2. V:N and V:T with the spoken text

- [x] 2.1 `spokenSchedule(song, C, lang, files)` in `src/song/build.js`; `voiceCode` built on it (D2)
- [x] 2.2 `renderNow`: tags, italic text from the schedule, rows for voice-track lines alone, tooltips; strings in both languages
- [x] 2.3 Check in `check:spoken`: over 20 radio songs (Classic, Crescendo, Live coder; poetic and explaining; Narrated growth on and off; narrator off) every `V:N` text equals the line in the code's `// "…", spoken on bar N` comment on that bar, and every `V:T` text equals the line of a `$:` voice-track line that plays on that bar; no `V:N` on a bar of `spokenBars`; narrator off gives no `V:N`
- [x] 2.4 Browser: `check-radio.cjs` with the narrator and the voice track on: the list shows `V:N` and `V:T` rows, and a `V:T` row for a line with no step on its bar
- [x] 2.5 Guide card for the radio's Next changes: what V:N and V:T mean (`src/guide.js`, `npm run check:guide`)

## 3. Voice track in grown songs

- [x] 3.1 Re-place the spoken tracks in `growOnAir` after the growth (D3), helper in `src/endless/voice-track.js`; remove the lone-clip rule of `tailOf`
- [x] 3.2 Check in `check:spoken` ("the voice instrument kept in songs grown on air"): for 20 Live coder and 20 Crescendo radio songs with a voice track, the grown song has the director's number of lines and the same texts; the first line falls in the first third when an allowed part is there (today: 65% to 71% in pure-trance); lines in the growth fall only in quiet parts (few tracks at those bars); entry lines end before their bound track's first entry
- [x] 3.3 Fixtures: `node --no-warnings tools/check-radio-profiles.mjs --write-fixtures` only for the voice-track moves, with the reason in the commit; `npm run check:crescendo` unchanged
- [x] 3.4 Browser: probe a pure-trance Live coder session with both voices on; the `fx` analyser peaks on the voice track's first line within the first third of the song, and on narrator lines before it

## 4. Typed lines always sound

- [x] 4.1 `sayAir` writes `{ at, add: <spoken id>, by: 'listener' }` on the line's bar also when the track plays; Say now picks the first bar at least half a bar after the sample is ready (D4)
- [x] 4.2 Check in `check:endless`: a typed line on a playing voice track adds a step on its bar, the song sounds the same, Replay gives the same song
- [x] 4.3 Browser: `check-steering.cjs` with the real voice helper (or a sample made before) on a song whose voice track already plays: Say now and At the right moment are evaluated on their bar (an evaluation whose code holds the line before the bar) and the `fx` analyser peaks on the line's bar, with no seek

## 5. Poetic images at every entry

- [x] 5.1 `narration()`: next entering step after the current bar, image on the entry's bar when the bar before belongs to an earlier step, song start in the window; `enteringTrack` with the last `unsolo` (D5)
- [x] 5.2 Check in `check:spoken` ("poetic narrator"): with Narrated growth on and off, every entry of luci-rosse, kellerlicht and settimo-cielo (Crescendo and Live coder) gets one image; in a radio window of three songs every song gets its opening image; a mid-set opening gets an image at its last unsolo
- [x] 5.3 Report per song the images and the step lines before and after (luci-rosse Crescendo with Narrated growth: 5 images before, 7 expected after)

## 6. Narrator yields only to lines that sound

- [ ] 6.1 `spokenBars` leaves out lines without a sample (D6)
- [ ] 6.2 Check in `check:spoken`: with a manifest missing one voice-track line, the narrator line on that bar is in the code; with every sample, it yields as today

## 7. Locked drums in breaks

- [ ] 7.1 `directSong` break and charge drop locked drums too, the drop brings them back; drums only: other locked instruments keep playing through breaks; the lock still blocks the other moves (D7)
- [ ] 7.2 Check in `check:endless` (replaces the 1.4c case of radio-arrangement): a locked kick is silent in the break and the charge, back at the drop with the same pattern and settings, never varied; a locked bass still plays through the break
- [ ] 7.3 `npm run check:endless -- --write-fixtures`, raise `DIRECTOR_VERSION` in the same commit
- [ ] 7.4 Update radio-arrangement: D12 in `design.md`, the lock requirement in its `specs/endless/steering/spec.md` and the tooltip strings (`arrLockClosed`) that say the drum plays through; archive radio-arrangement before this change, since the MODIFIED lock requirement needs `openspec/specs/endless/steering`
- [ ] 7.5 Browser: `check-steering.cjs` locks the kick, reaches a break, and finds the kick muted there and back at the drop

## 8. One pattern row in Compose (pp1, #84)

- [ ] 8.1 Archive pattern-preview before this change, since the REMOVED requirement "Two named pattern rows" needs `openspec/specs/app/pattern-preview`
- [ ] 8.2 One row "Pattern disponibili nel brano" / "Patterns in this song" with its hint, Niente, the patterns, + Nuovo and Elimina; "Crea" / "Make" row below; same row in Sections and Free timeline (D9)
- [ ] 8.3 Marks: "NEL BRANO" badge on the chosen section's or clip's pattern, hollow circle for patterns used elsewhere, headphones in preview, pink border while edited; legend; CSS for neon and hardware
- [ ] 8.4 Whole track selected (no section, no clip): no badge, the row says how to choose one
- [ ] 8.5 Status line with "Usa D in «sezione»" and Undo; "Prova su una copia" (copy to the next free letter, editing moves to it); "Sostituisci B con D" with Undo; "Ripristina B" (per-pattern undo to the state when editing started); editing stays live, no Save
- [ ] 8.6 Elimina disabled on patterns in use, with the reason in the tooltip; preview unchanged (the track keeps playing its song pattern)
- [ ] 8.7 Strings in `src/i18n.js` (it, en); Guide card for the pattern row (`src/guide.js`, `npm run check:guide`)
- [ ] 8.8 `PORT=… node tools/check-patterns.cjs`: one row in both languages, marks for Scontro on Luci Rosse, Use in section, Try on a copy, Replace, Restore, Delete disabled in use, Free timeline with and without a clip
- [ ] 8.9 `PORT=… node tools/check-preview.cjs`: the two-row case becomes the one-row case; headphones on the previewed chip; the song's line still plays under the preview; `npm run check:preview` and `npm run check:patterns` pass
- [ ] 8.10 Screenshots of the row in both themes and both languages (one pattern in the song, a copy in preview, the copy used in the section, no clip chosen)

## 9. Growth duration label

- [ ] 9.1 `dur:fitted` reads "Al massimo quanto il brano scritto" / "At most as long as the written song"; `durHint` uses the same words; label only (D10)
- [ ] 9.2 Places that quote the old label follow (Guide, knowledge); `npm run check:guide`, `npm run knowledge`, `npm run check:knowledge`; the i18n check finds both languages

## 10. 12 tracks at every bar (ar4, low priority)

- [ ] 10.1 Cap in `candidateMoves`, in the `back` and drop returns, and in `whyNot` for `more` and `pattern` over the rest of the song (D8)
- [ ] 10.2 Check in `check:endless`: "+" on every instrument in turn every two bars, five styles, three seeds: at no bar do more than 12 tracks play (today 13 to 16 in berlin-techno, pure-trance and synthwave)
- [ ] 10.3 `check-arrangement-levels.cjs`: the 12-track scenario keeps `in=` at most 1.2 and the output below 1.0

## 11. Docs and wrap-up

- [ ] 11.1 `docs/knowledge/narrator.md`, `radio.md`, `radio-commands.md` (locks, typed lines), the patterns and preview note (pattern row), `decisions.md` (D3, D4, D7, D9); `npm run knowledge`, `npm run check:knowledge`
- [ ] 11.2 Follow-up noted for the owner: poetic "movement" lines at steps without an entry, a separate later change (design, Follow-ups)
- [ ] 11.3 `DEVLOG.md` entry (Italian) with the measurements before and after
- [ ] 11.4 Full runs: `npm run check:spoken`, `npm run check:endless`, `node --no-warnings tools/check-radio-profiles.mjs`, `npm run check:crescendo`, `npm run check:code`, `npm run check:preview`, `npm run check:patterns`, `PORT=… node tools/check-steering.cjs`, `PORT=… node --no-warnings tools/check-radio.cjs`, `PORT=… node tools/check-patterns.cjs`, `PORT=… node tools/check-preview.cjs`
