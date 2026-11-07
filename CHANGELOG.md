# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Italian speaker Siri 4 (`siri4`), spoken with the macOS system voice; `npm run voices` makes its samples with `say` without `-v`.
- Draw styles grid on each voice card of the Voices tab: switch the voice styles automatic draws may give a voice, with a mark on changed styles, the count of allowed styles and Reset to defaults.
- Voice style choices kept in the browser and in the settings backup; an import merges them per voice.
- Radio sessions record the allowed voice styles they started with, so Replay, saved sessions and exports keep them.
- Guide card for the Draw styles grid.
- `src/voices/combos.json`: the voice styles automatic draws may use per speaker and language; it ships with every pair allowed.
- Voice style pickers mark a style that is not allowed for the current speaker; it stays selectable.
- Voices tab test bench line that says whether the chosen speaker and style are allowed.
- `npm run check:voice-combos`.
- Narrator style control: automatic, explaining or poetic, for any song.
- Voices group in Compose and in the radio Custom profile: narrator voice, narrator style and narrated growth.
- Voice instrument controls for generated songs: phrases per song, different, repeated or mixed lines, ways and how often, with presets.
- Voice instrument options for a new song by an artist.
- Guide card that compares the narrator, the poetic narrator and the voice instrument.
- Voice instrument controls for the song being edited, in the Compose Voices group and in the voice instrument track panel, with New phrases and Undo.
- Add a voice instrument to a song that has none, from the Compose Voices group.
- Radio steering command that changes the voice instrument of the song on air from its next quiet part.
- Optional `voiceOptions` field on spoken tracks.
- Pattern preview in Compose: a headphones button next to a track's preset or groove menu plays the selected pattern in a loop, on the song's bars while the song plays, alone while it is stopped.
- Bar counter in the player bar: `bar n / total` of what plays, grown songs included.
- Sound controls for both voices (voice style, speaker, volume, pitch, speed, filter, low cut, drive, reverb, delay) in the Compose and radio Voices groups.
- Voice styles: Clear, Radio, Distant, Robot, Deep, Bright, Cathedral, Echo, Dirty, Slow.
- Phrase list of the voice track with bars, way and text editable in place, heard bars in Crescendo and Live coder, Fill with, + Add line and a remove button per row.
- Narrator lines list in the Compose Voices group.
- Where the voice track speaks: quiet, medium and busy parts.
- On/off switch for each voice in the Compose and radio Voices groups.
- How often Always for the radio voice track.
- A voice track chance in every style.
- Console Voice group: phrase preset and voice style for the song on air, and a typed line said now or at the right moment.
- Dev-server voice helper that makes the samples of new and edited lines.
- `npm run voices -- --song <file>` and `--list`.
- Faders for the voice Sound controls in the hardware theme.
- `npm run check:speakers`: every speaker is installed and sounds different from the default voice.
- `npm run voices -- --jobs N` makes several samples at a time.
- `node tools/voice.mjs --prune` lists the sample banks of removed speakers; `--prune --yes` deletes them.
- Growth openings `bass`, `chord` and `top`: the bass, a chord part or the beat without its kick first.
- Kick starts: the first kick of a build can be one kick, two, four on the floor, a push, the off-beat or the first two kicks of the groove, weighted per style with `growthShapes.kicks`.
- More drum machines and sounds in every style.
- New kits in the kit menu: `RolandR8`, `KorgM1`, `RolandMC303`, `RolandTR505`, `RolandTR626`, `BossDR110`, `AlesisSR16`, `YamahaRY30`, `RolandCompurhythm78`, `MPC1000`.
- `npm run probe:openings` reports how radio songs open, `-- --check` checks the targets.
- `npm run check:kit-rows`: every style kit has the drum rows its grooves play.
- Radio: a countdown badge next to Extend until it enters ("Extend +16 s · in 24 s").

### Changed

- Generated voices, the voice instrument and the narrator speaker drawn next to a chosen narrator style use only the speaker and style pairs that `src/voices/combos.json` allows.
- Radio: a style the compilation invents shows in Now playing and in On air, STYLES as the same chip and hint as the Invent die's trial style, with an explicit Keep.
- "Fully narrated" is now "Narrated growth".
- The Compose Voices group is always shown; narrator controls that cannot apply are disabled with the reason.
- New-song voice instrument settings moved from the Compose toolbar to the "In the next song" row of the Voices group.
- The radio narrator controls and voice instrument controls are in one Voices group.
- The radio Voice knob, compilation range, curve and console group are now named Narrator.
- The track panel splits its pattern row into "Song patterns" (patterns and Delete) and "Make patterns" (New, Save as pattern, Compose a part).
- The button that opens a track's pattern in the Patterns tab shows a flask instead of headphones.
- The player bar shows the time of the radio song on air; its bars moved to the bar counter.
- The voices are labelled "Voice: narrator" and "Voice: track"; the Guide card is "Two voices".
- The radio Voices group holds the settings for the next songs only; the song on air changes from the console.
- The radio How often menu no longer offers Never; a saved Never reads as the voice track switch off.
- The radio narrator switch works with every profile.
- The poetic narrator keeps the step lines with Narrated growth.
- The narrator track of generated and built-in songs is named Narrator.
- The speakers are Albert, Fred, Junior and Kathy, in English only; in Italian Alice speaks their lines.
- A removed speaker in a saved song, session or style plays with the default voice.
- `npm run voices` leaves out a speaker that speaks like the default voice.
- Crescendo draws its first track from the style's opening weights instead of always starting on the kick.
- The Compose Opening control also steers the first track in Crescendo, with the lead openings only.
- Every style has its own opening weights; the default weight of the slow opening is 1.

### Fixed

- A line typed in the radio console with Say now is heard with its own new sample, and no later line of the same voice plays a neighbouring sample.
- An unsaved change in the phrase editor of the Voices tab is no longer lost when the tab redraws in the background.
- Saving a phrase edit in the Voices tab no longer closes the next phrase form when the voice helper is slow.
- Radio: Keep on a style invented by the compilation saves it with one click while Now playing is redrawn.
- Radio: a line typed in the console is no longer lost when its sample decodes late; it plays on a later bar.
- Shorter main-thread pause on the bar where a live build step changes the code (Classic Say now included).
- Radio: Now playing is redrawn only when what it shows changes; the position marks move in place.
- Radio: Skip no longer freezes the page while the next song grows; it shows "Skipping…" until the next song is ready.
- Radio: a riser pressed inside the growth of a Live coder or Crescendo song comes within two phrases, not near the song's end.
- Radio: console commands steer Classic songs and make the code plan of the window away from the page; the window is not made again while the steering runs.
- Radio: adding a saved pattern redraws only the saved patterns panel after the press.
- The code typing updates the editor at most 30 times a second, and the code panel's scroll no longer forces a layout each frame.
- Song cards are updated each frame only while the Songs tab is shown.

### Removed

- The radio button Apply to the song on air (the console's Voice group replaces it).
- The speakers Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy and Shelley.

## [0.6.0-beta.2] - 2026-10-25

### Added

- Listen and Groove Lab modes, each with its own tabs.
- Player bar with a global volume and a draggable timeline.
- Playlists with shuffle and repeat, and radio sessions saved in playlists.
- Song search, filters, tags, favourites, dates and a paged song list.
- Trash bin for songs, kept for 30 days, built-in songs included.
- Styles, Artists and Genres tabs to read, edit and share styles and artists.
- Built-in artists with pixel-art portraits, taste and quirks, among them a live coder artist.
- Radio console to steer the song on air: energy, parts, vary, swap, mute, level, end.
- Radio curves for density, brightness, tension and voice.
- Radio compilation mode with presets and random artists, styles, knobs and sounds.
- Transitions between radio songs.
- Continue a Compose song in the radio.
- Crescendo and Live coder profiles: a song grows from one sound in small code edits, in Compose and in the radio.
- Growth shapes for the opening, pace and development of a Live coder growth.
- Human typing with listening pauses, typing mistakes and changes of mind.
- Code views: code of the moment, compact code, one line per track and code per section.
- Code options: comments, technical functions, song and library functions, and one line per part (Sections).
- Each song keeps its own configuration, with trials per song and buttons back to the original song or configuration.
- Narrator voice switch.
- Voice instrument: spoken lines played as part of the music.
- Material generator that composes melodies, basslines, arpeggios, chords, grooves and sounds from a number.
- Patterns tab to hear, compose and keep song parts.
- Song soul: a scene of the stage and a hidden display beside it.
- Recording studio scene and endless scrolling visuals (Caravan, Neon city).
- Fast offline export to WAV, FLAC, MP3 and Opus, by songs, minutes or exact length.
- Video of songs and radio sessions, with fast rendering from the timeline.
- Vertical fragments with labels, taglines and texts for sharing.
- Live output window with a control room, presets and transitions.
- Radio recording with a track list.
- Settings page with a backup of everything in the browser.
- Guide with a card for every feature.
- Master limiter in the app and in every export.
- Knowledge base and checks for agents working on the project.

### Changed

- The app starts in about a second, also with many songs of your own.
- Song cards show the length of each song with its own profile.
- Parts are stored as ideas, so the same sound is written with shorter code.

### Fixed

- The hidden mixer gives every part the level of the code in full.
- Exports keep their length, their sounds and the audio in line with the picture.
- Songs keep playing when the tab is in the background.
- Sample addresses that never loaded.

[Unreleased]: https://github.com/alessandrodevecchi/coding-misk/compare/v0.6.0-beta.2...HEAD
[0.6.0-beta.2]: https://github.com/alessandrodevecchi/coding-misk/compare/v0.5.0...v0.6.0-beta.2
