# Design

## Context

- `index.html` has a sticky top bar (`.bar`) with the logo, `#play`, `#stop`, theme and language buttons.
- `src/main.js` keeps the master output at 0.6 (`MASTER`) on superdough's `destinationGain` every frame, and the WAV export (`tapMaster`) records from `destinationGain`.
- Modes: `track` (Compose), `free` (a library song, a lesson, a sound), `radio`. `togglePlay`, `stop`, `startCard` (library cards), `radio.skip` exist.

## Goals / Non-Goals

**Goals:** one transport for every mode; a volume that never changes exports.

**Non-Goals:** a playlist or queue; per-track volume; moving theme and language to a settings page (#31).

## Decisions

**1. Volume node after the master output.** A `GainNode` is inserted between `destinationGain` and the audio context destination (disconnect `destinationGain` from the destination, connect it to the volume node, the volume node to the destination). The recorder keeps tapping `destinationGain`, before the volume, so exports keep their level. Alternative: scale `MASTER` (simple, but exports would follow the volume).

**2. Move the buttons, keep the ids.** `#play` and `#stop` move into the bar with their handlers and labels, so the browser checks keep working. The top bar keeps the logo, the theme and the language.

**3. Previous and next by mode.** Track and free song modes walk the library order used by the Songs tab (`composedTracks()` plus coded songs): load the neighbour song and play it if music was playing. Radio: next is `skip`; previous restarts the song on air (`playSong(window, start)` through a new radio method). Lessons and sounds have no neighbours: the buttons are disabled.

**4. Position and title.** Updated in the existing `transport()` loop: song title and "time / total" for songs, "bar n" for live builds, song title and ON AIR for the radio.

**5. Look.** Height about 48 px. Neon: dark glass with a thin glowing top line in the theme colours, round buttons with glow. Hardware: brushed panel, square mechanical buttons with a pressed state, an amber display for title and position, a red ON AIR lamp. The page gets bottom padding equal to the bar height (plus the safe-area inset).

## Risks / Trade-offs

- [The audio graph is created by superdough when audio starts] → The volume node is inserted once the controller exists (first play) and re-checked each frame like `MASTER`, so a recreated output gets the node again.
- [Users used to the top play button] → The bar is always visible at the bottom; the shortcut (space) stays.
