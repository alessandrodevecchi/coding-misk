## Why

Compose now has performance profiles (Classic, Crescendo, Switch), several growths (small steps, gradual, natural like a live coder with waypoints), code views, technical functions, comments and lit notes (#64). The radio still builds every song in blocks. This change brings it all to the radio, written before the Compose updates so both stay coherent. It replaces the earlier plan `crescendo-radio`, which only chose between blocks and crescendo.

## What Changes

- **Artists choose a profile.** Artist field `profiles` with weights (`{ "classic": 3, "switch": 1 }`) plus the details of their growth (spacing, pauses, detours, how songs start, endings, narration). Existing artists stay Classic, so their sessions sound the same. Random artists draw profiles too. A new built-in artist made for Switch. The listener may force a profile in the radio settings.
- **The three growths in the radio**, with the growth duration fitted to the song's planned length by default; an artist trait may make it free.
- **Steering and curves as waypoints.** A command (more energy, darker, add the bass) or a curve point becomes the next waypoint: the song reaches it with small moves from the code on air. "End" leads to a last waypoint (the song's ending), not a cut.
- **Chooser in the radio.** The radio's chooser is the director plus the listener's commands; the interface leaves room for a decision model later.
- **The incoming song, like a DJ.** During a transition only the song on air shows in the code; the next song plays underneath from code that is evaluated but not shown, and appears whole when it goes on air. An option keeps today's behaviour (both songs visible): visible by default for Classic, hidden for the others.
- **Mixer per song.** With technical functions at the mixer, the song on air uses the hidden mixer; the incoming song carries its levels in full on separate buses, so the two never clash.
- **Code on air.** Code views, comments (voice code hidden for Switch), technical functions, typing and lit notes work on the song on air.
- **Repeatable and exportable.** Sessions record profiles, waypoints and commands, and replay identically; `DIRECTOR_VERSION` goes up. Compilations play saved songs with their own profile. Recording, audio and video export of sessions work, with a speed measure on a one-hour session.

## Capabilities

### New Capabilities

- `endless/radio-profiles`: profiles in the radio (artists, listener setting), growths, steering and curves as waypoints, the chooser, the hidden incoming song, the mixer per song, code on air, sessions and export.

### Modified Capabilities

None in their requirements; the director, steering, artists and transitions gain behaviour described in the new capability.

## Impact

- `src/endless/` (director, steering, artists, transitions, session), the growth engines, the radio code panel (shown and evaluated code), the artist format and editor, radio settings, `docs/ENDLESS.md`, `docs/ARTISTS.md`, Guide, `check:endless` fixtures and `DIRECTOR_VERSION`.
- Depends on `performance-profiles`, `live-coder-growth`, `code-writing`, `typing-lines`.
