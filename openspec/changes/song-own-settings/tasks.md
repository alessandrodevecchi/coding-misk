## 1. Configuration in the song

- [ ] 1.1 Optional `config` in the song format (validator, docs/SONG-FORMAT.md); songs without it are Classic with the Live build off; declared `profile`/`buildStyle` keep their meaning; verify `npm run check:songs` and a Node case
- [ ] 1.2 liveOf and ctlOf read the song's configuration, then its trial; the global Compose choice no longer applies to other songs

## 2. Trials

- [ ] 2.1 Trial configuration per song in the browser (survives reloads, in the backup); "configuration changed" marker and ↺ (drawn circular-arrow icon) in Compose and on the Songs card; English and Italian
- [ ] 2.2 Save writes the trial as the song's config; Save as new copies it; built-in songs: owner's version and Restore original as today
- [ ] 2.3 Card lengths use the song's configuration plus its trial (built-in lengths from song-durations when no trial)

## 3. Checks and docs

- [ ] 3.1 Browser cases: trial on one song leaves kellerlicht as written; reload keeps the trial; ↺ restores; Save and Save as new; startup check passes; Classic and Crescendo code checks unchanged
- [ ] 3.2 Knowledge notes (profiles, library, songs), Guide, DEVLOG entry in Italian
