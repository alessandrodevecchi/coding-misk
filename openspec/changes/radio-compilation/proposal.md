# Proposal

## Why

With an artist chosen the radio keeps that artist; with styles chosen it keeps those styles. A long mix or a real radio keeps changing artists and genres. The owner wants a compilation mode (#49) that changes everything on its own, within limits the listener can set.

## What Changes

- **Compilation button** in the radio panel, next to the artist and the styles, with a double lamp: off, every song, every 2 to 4 songs. While on, the chosen artist and styles are set aside.
- **What changes:** the artist (with its own transitions and harmony) or, when no artist is drawn, the styles and the knobs. Transitions and harmony keep the changes smooth.
- **Compilation setup** (a gear next to the button): movement (free jumps, or a journey between neighbouring genres with an occasional jump), the genres, styles and artists it may use, random artists made on the fly (on or off), and a range for each knob. A setup can be saved as a preset with a name; built-in presets: Everything, Journey, Club, Chill.
- **Random artists** in a compilation are not saved; "Keep" on the now playing card saves the one on air.
- **Now playing** shows a "Compilation · next change in 2 songs" tag. Same seed, same compilation; sessions saved in playlists replay it.

## Capabilities

### New Capabilities

- `radio-compilation`: a radio mode that changes artist, genre, styles and knobs on its own within a setup.

## Impact

- Radio panel and options, the director's options per song, the session recipe (playlists, Replay), the Guide card of the Radio, i18n. Uses the random artist maker of `random-tools` (#50).
