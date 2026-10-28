## Why

The radio console steers the arrangement with coarse buttons: "− drums, − bass, − lead, + pad, + texture, More complex, Simpler" (#83). "Lead" hides three instruments (arp, melody, guitar), "drums" hides two (kick and beat), and a song holds at most one track of each type, so the listener cannot ask for a second arpeggio or a third pad. The style's track limits, written for generated songs, also cap what the listener can build. The listener cannot bring one of their own saved patterns into the song on air, and Vary and Swap can only pick a part type, not one track, while the owner asked for the same per-part control on harmony too (#83 checklist fx5). Adding an instrument the song does not have (#41) works for the coarse types only.

## What Changes

- **One + and − per instrument.** The Arrangement group shows a + and a − for each instrument the song's style can play: kick, beat, bass, arp, melody, guitar, pad, texture, in two rows, labelled in Italian and English. Instruments the style cannot play are hidden. "More complex" and "Simpler" stay. **BREAKING** for the console: the buttons "− drums", "− lead" and their shortcuts go; recorded sessions with the old commands still replay as they were heard.
- **Several tracks of one instrument.** "+" always adds one more track of that instrument, even when one plays; "−" removes the last one added. A new track takes a sound and a pattern from the style that differ from the tracks of that instrument already in the song, a register that does not sit on theirs, and a level that leaves room for the rest. An instrument the song lacks is created from the style (#41).
- **Limits.** The style's usual and maximum track counts stay the defaults of generated songs. From the console the listener can go past them, up to 12 tracks playing at once. There is no cap per instrument (two kicks are allowed): past the recommended count (kick 1, beat 2, bass 2, the others 3) the console shows a warning with the recommended values and lets the track in. As tracks add up, the song's levels go down so the output keeps its headroom.
- **A lock per instrument.** Each instrument gets a lock next to its + and −. Open (the default): the director may change that instrument (pattern, filter, drive, effects, a pause for a break) but never removes a track the listener added. Closed: the director does not touch the instrument for the rest of the song; the listener's own commands still work. It reuses the mixer's per-track lock, and the two stay in sync. The mixer's lock icons become drawn icons.
- **A Riser row.** The riser (the noise sweep the director puts before a big moment) gets its own row: "+ Riser before the next change" (Italian "+ Riser al prossimo cambio") with length, direction and sound, and a lock that keeps the director's own risers out of the song.
- **Add a saved pattern.** A new console panel lists the user's saved patterns that fit the song on air (type and meter), as small cards with a preview drawing, collapsible to a compact list and expandable to a fuller view, each with a preview listen in the song's key and tempo. A pattern can come in as a new track or replace one playing track.
- **Per-part target for Vary, Swap and a new part harmony.** Vary and Swap get a target selector: "Auto" (the default: a track of the part picked by a rule) or one named track ("Arp 2"). A new "Part harmony" command changes how one part sits on the chords (in thirds, an octave away, chord colour, inversion), with "Auto" choosing for it, as Song harmony picks a progression by itself. Song harmony gets a menu for chords and key by hand, "Auto" by default.
- **Scope and replay.** Every new command follows the console scope switch (this song or the whole session); the scope says how long a choice lasts, the lock says whether the director may change it, and the two combine and is recorded with the other console commands, so Replay, saved sessions and playlists play it back the same. The director version goes up once.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering` (changes `radio-steering`, `radio-variation`): per-instrument Add and Remove with several tracks per instrument, a lock per instrument, a Riser row, console limits above the style's with recommended counts as warnings, headroom as tracks add up, Add a saved pattern, per-track target for Vary and Swap, Part harmony, a Song harmony menu, session scope and replay for all of them.

## Impact

- **Code:** `src/endless/steering.js` (`ARRANGE_TYPES`, `KIND_OF`, `whyNot`, `rewrite` add and remove, `varyTracks`, new commands, `densityMax`), `src/endless/director.js` (`candidateTracks` and `tracksOfKind` with track ids per instance, `KIND_OF_ADD`, `hardMax`, `DIRECTOR_VERSION`), `src/endless/material.js` (`airIdea` register offsets, `userPool` with a meter fit), `src/song/crescendo.js` (track lookups by type that assume one track), `src/music.js` and `src/song/compile.js` (`ORBIT_OF`, extra buses past the spoken ones), `src/radio/radio.js` (console layout, instrument locks, Riser row, pattern panel, target selectors, session scope), `src/icons.js` (an open lock icon), `src/library/patterns.js` (`forRadio` with meter and sound), `src/i18n.js`, `src/guide.js`.
- **Depends on:** `radio-steering`, `radio-variation`, `pattern-library`, `material-generator`, `level-headroom`.
- **Checks:** `npm run check:endless`, `node tools/check-steering.cjs`, `node --no-warnings tools/check-radio.cjs`, `node tools/check-levels.cjs` on steered songs, `node tools/check-transitions.cjs`, `npm run check:patterns`, `npm run check:guide`, `npm run check:knowledge`.
- **Docs:** `docs/ENDLESS.md` (Steering), `docs/knowledge/radio-commands.md`, Guide cards, `DEVLOG.md`.
