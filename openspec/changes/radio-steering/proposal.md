# Proposal

## Why

The radio plays what the director decides; the listener can only change options for the next song or skip (#24). The owner wants to steer the song on air like a DJ steers a set: more energy now, drop the bass, darker, go to the drop, and see and shape the energy curve of the song.

## What Changes

- **A console in the Radio tab** with groups of large buttons and keyboard shortcuts:
  - **Energy:** up, down.
  - **Arrangement:** add or remove drums, bass, lead, pad (or texture); more or less complex.
  - **Sound:** darker, brighter, dirtier, cleaner, more space, change instrument.
  - **Harmony:** change chord progression, change key (a fifth away).
  - **Voice:** talk more, talk less.
  - **Song:** go to the drop, stay here (one more phrase of the same part), end the song (go to the outro and the transition).
- **When a command applies:** at the next phrase boundary by default; short commands (mute, volume, filter) can apply on the next bar. Queued commands are listed with their bar and can be cancelled.
- **Scope switch:** "this song" or "the whole session". In session scope, energy, complexity and voice commands also move the sliders for the songs after.
- **Editable energy curve:** the curve of the song on air can be dragged for the phrases still to come; the director rewrites the rest of the song to follow it.
- **Mixer strip:** one row per active track with volume, mute, lock (the director stops changing it) and change instrument. Changes by hand stay fixed for the rest of the song.
- **Replay:** commands, curve edits and mixer changes are recorded in the session recipe with their song and bar, so "Replay" plays the same session with the same steering.
- **Out of scope:** the full track panel in a drawer (later); a view with several curves (density, brightness, tension), in a new issue.

## Capabilities

### New Capabilities

- `endless/steering`: the console, commands and their timing, the queue, the scope switch, the editable energy curve, the mixer strip, shortcuts.

### Modified Capabilities

- `endless/radio-history`: the session recipe also records steering, and Replay reproduces it.

## Impact

- `src/endless/`: the director can rewrite a song from a phrase boundary (new targets, forced moves, harmony and length changes) deterministically; a steering module turns commands into those rewrites.
- `src/radio/radio.js` (console, queue, curve editing, mixer, recipe), `src/main.js` (window swap after a rewrite, shortcuts), `src/i18n.js`, `src/style.css`.
- Checks: rewrite rules in `check:endless`, a browser check for steering; docs `ENDLESS.md`, `ARCHITECTURE.md`, README, DEVLOG.
