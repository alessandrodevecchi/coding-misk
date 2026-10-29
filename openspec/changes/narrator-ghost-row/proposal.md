## Why

In Compose a song that builds live has a narrator that speaks its steps, but most songs have no narrator track: the narrator speaks with the default sound and the timeline shows no row for it. The Narrator track appears only when the owner first changes the narrator's sound (`voice-full-controls` D2), so a voice that was speaking all along seems to arrive from nowhere (`#82`, test vo4).

## What Changes

- **A ghost narrator row** at the bottom of the Compose timeline, in the sections view and in the timeline view, when the song has no narrator track and the narrator can speak (the Live build is on, or the song has its own steps). It is read-only and drawn apart from the real tracks (dashed, no clips, no Mute or Solo).
- **Where the narrator speaks.** The row shows the narrator's lines where they are heard: a count per written section (sections view), a mark per line (timeline view) and a tick per line in the growth and ending cells. The tooltip of each cell lists the bars and the lines.
- **Clicks.** A cell goes to the narrator line nearest to the click. The row's name opens Voice: narrator in the Voices group with its Sound part unfolded.
- **It becomes the real track** on the first edit of the narrator's sound, as today: the ghost row is replaced by the Narrator track in the same place, and Undo brings the ghost back.
- With the narrator switched off, the row stays, dimmed, like a muted track.
- **The narrator track shows the same marks** as the ghost (what is heard, from the code's schedule), and the read-only Narrator lines list of Voice: narrator lists the same heard lines (Q1).
- **Voice: narrator with the Live build off** (owner request): the block says the song has no narrator ("Questo brano non ha il narratore: accendi In divenire per sentirlo."), and its Sound and Narrator lines fold; turning the Live build on brings back the user's open or closed state.
- The ghost row is not a track: songs, the code, levels, the growth, the radio track count, the console and the hidden mixer do not change.

## Rejected alternative

A real narrator track in every song. It changes the song format (every song gains a track), the generated code (the voice header names the track, so every code snapshot moves), saved songs, stored growths, the checks of code, mixer, levels and durations, and the radio console's track lists. Analysis in `design.md`, D1.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/compose-timeline` (from `timeline-growth`): a ghost narrator row; the narrator track's marks.
- `live-build/voice-sound` (from `voice-full-controls`): the narrator block with the Live build off.
- `live-build/voice-phrases` (from `voice-full-controls`): the narrator's read-only lines as heard.

## Impact

- `src/main.js` (arranger rows, cell clicks, the switch to the real track), a pure helper for the narrator's marks (`src/song/build.js`, next to `spokenSchedule`), `src/style.css` (neon, hardware theme, phone), `src/i18n.js`, `index.html` (the note), `src/guide.js` (Compose timeline and Two voices cards), `docs/knowledge/`, `tools/check-timeline.cjs`, `tools/check-voices.cjs`, `npm run check:spoken`.
