## Why

The owner's radio tests of 2026-10-28 (#81, #82, #83) found voice and console problems. The causes were measured in Node and in the browser:

- **The voice track comes late in grown Live coder songs.** The growth on air keeps only the tail of the written song (`tailOf`, from bar 96 to 144). The voice track's first clip moves to the start of that tail, after the growth. Over five pure-trance Live coder songs, its first line sounds at 65% to 71% of the song. In Classic, the same songs speak at bar 5. Narrator and voice track together seemed silent for the same reason: the narrator says few lines in Live coder, and the voice track waits until two thirds of the song.
- **"Next changes" shows "kick → undefined" and empty rows.** `stepText` in `src/radio/radio.js` covers 6 of the 17 build actions. A `pattern` step with a `level` prints `undefined`. The code-of-the-moment steps have no action and print an empty row.
- **The list does not say which voice speaks, or what it says.** It quotes the step's `say`, even when the narrator says a poetic image instead, yields to the voice track, is off or has no sample. The voice track's lines are not listed at all.
- **A typed line can stay silent (vo15).** A line added with Say now or At the right moment becomes a clip on the voice track. When that track already plays, no build step falls on the line's bar. The radio keeps the code on air until the next step, so the line is never evaluated. In the browser, a Say now line at bar 11 was not heard: the code was evaluated at bars 7 and 15 only. An At the right moment line was heard only because a director step fell on its bar. Seeking back works because a seek evaluates the code again.
- **Poetic images are lost at many track entries (vo1).** The narrator style reaches the radio, and the images exist in every speaker's bank. The narrator looks only at the very next step. An entry that shares its bar with an earlier step therefore gets no image: a code-of-the-moment section step, or another step of the growth on the same bar. In the radio, every song after the first loses its opening image, because its first bar is not bar 0 of the window. Live coder openings that bring tracks in with `unsolo` count no entry. Over 13 measured radio songs: 0 to 8 images against 18 to 36 step lines with Narrated growth on. One Live coder song had 6 entries and no image in the window.
- **The narrator yields to lines that make no sound.** `spokenBars` marks the bars of every voice-track line, also lines with no sample, which compile to nothing.
- **A locked drum plays through breaks.** radio-arrangement D12 keeps a locked instrument playing through breaks and the charge before a drop (`src/endless/director.js:530` and `:563`). The owner wants a locked drum to drop out in breaks and come back at the drop like an unlocked one. The lock keeps its sound and its pattern.
- **The console shows more than 12 tracks (ar4, low priority).** Pressing "+" again and again, the console read "13 tracks play · usually up to 5 · at most 12", then 14, then 12. This happens inside one song, not in transitions: the count covers the song on air only. The cap is checked at the bar of the command, on the song before the director arranges it again. The re-arranged song can then go past 12 tracks: in Node, three styles reached 13 to 16 tracks.

## What Changes

- **Step labels.** Every build action gets a short label in Italian and English in the radio's "Next changes" list. Steps without an action and without words are left out.
- **V:N and V:T with the words actually spoken.** Each row of "Next changes" that has a spoken line is tagged V:N (narrator) or V:T (voice track). The quoted text is the line that will be heard there, from one schedule (`spokenSchedule`) that the code also uses. The voice track's lines get rows of their own.
- **Voice track re-placed in grown songs.** After the growth on air, the voice track's lines are placed again over the whole grown song, on parts of the kinds the track may speak in. The song keeps its number of lines and their texts.
- **Typed lines always sound.** A typed line gets a code step on its bar, so the radio evaluates its code there. Say now picks a bar far enough ahead for the evaluation.
- **Poetic images at every entry.** The poetic narrator finds the next entry on any later bar, not only at the next step. It says the image on the entry's bar when the bar before belongs to an earlier step. A song's first bar counts as its start in the radio window. A step that makes silent tracks sound (`unsolo` of the last solo line) counts as an entry.
- **The narrator yields only to lines that sound.** `spokenBars` leaves out lines without a sample and tracks that are muted.
- **Locked drums in breaks.** A locked drum drops out in a break and in the charge before a drop, and comes back at the drop, like an unlocked drum. The lock still keeps its sound and pattern: no variation, filter, drive or effect move, and no strip for good. radio-arrangement D12 is updated. The director version goes up.
- **The 12-track cap at every bar (low priority).** The director brings no track in, and no listener track back, when 12 tracks already play at that bar. The console count never shows more than 12.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/radio-view`: step labels, V:N and V:T tags with the spoken text, rows for the voice track's lines.
- `endless/radio-voice`: the voice track in grown songs, typed lines that sound, poetic images at every entry, the narrator yielding only to lines that sound.
- `endless/steering` (from radio-arrangement): the lock per instrument with drums that drop out in breaks, and the 12-track cap at every bar.

## Impact

- **Code:** `src/radio/radio.js` (`stepText`, `renderNow`, Say now bar), `src/song/build.js` (`narration`, new `spokenSchedule`, `voiceCode`), `src/song/spoken.js` (`spokenBars`, `enteringTrack`), `src/endless/growth.js` (`growOnAir`, `tailOf`), `src/endless/voice-track.js` (placement helper), `src/endless/steering.js` (`sayAir`, `whyNot`), `src/endless/director.js` (break and charge lines, cap on adds and returns, `DIRECTOR_VERSION`), `src/live/live-code.js` (no change expected: the new step is a plain build step), `src/i18n.js`, `src/guide.js`.
- **Depends on:** `radio-arrangement`, `voice-full-controls`, `radio-profiles` (all on `develop`, not yet archived).
- **Checks:** `npm run check:spoken`, `npm run check:endless`, `npm run check:radio-profiles` (or `node --no-warnings tools/check-radio-profiles.mjs`), `npm run check:crescendo`, `PORT=… node tools/check-steering.cjs`, `PORT=… node --no-warnings tools/check-radio.cjs`, `npm run check:guide`, `npm run check:knowledge`.
- **Docs:** `docs/knowledge/narrator.md`, `docs/knowledge/radio.md`, `docs/knowledge/radio-commands.md`, `docs/knowledge/decisions.md`, Guide cards, `DEVLOG.md`.
