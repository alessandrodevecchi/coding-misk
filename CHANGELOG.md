# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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

### Changed

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

### Removed

- The radio button Apply to the song on air (the console's Voice group replaces it).

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
