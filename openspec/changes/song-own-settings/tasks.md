## 1. Configuration in the song

- [x] 1.1 Optional `config` in the song format (validator, docs/SONG-FORMAT.md); songs without it are Classic with the Live build off; declared `profile`/`buildStyle` keep their meaning; verify `npm run check:songs` and a Node case
- [x] 1.2 liveOf and ctlOf read the song's configuration, then its trial; the global Compose choice no longer applies to other songs

## 2. Trials

- [x] 2.1 Trial configuration per song in the browser (survives reloads, in the backup); "configuration changed" marker and ↺ (drawn circular-arrow icon) in Compose and on the Songs card; English and Italian
- [x] 2.2 Save writes the trial as the song's config; Save as new copies it; built-in songs: owner's version and Restore original as today
- [x] 2.3 Card lengths use the song's configuration plus its trial (built-in lengths from song-durations when no trial)
- [x] 2.4 ↺ Original song (former Restore original: notes, tracks, configuration, clears the trial) and ↺ Original configuration side by side in the song actions, same drawn icon, tooltips in English and Italian, disabled with the tooltip when there is nothing to restore; ↺ next to the mark on the Songs card

## 3. Checks and docs

- [x] 3.1 Browser cases: trial on one song leaves kellerlicht as written; reload keeps the trial; ↺ restores; Save and Save as new; startup check passes; Classic and Crescendo code checks unchanged
- [x] 3.2 Knowledge notes (profiles, library, songs), Guide, DEVLOG entry in Italian
