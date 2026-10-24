## Why

The profile panel in Compose (and the Custom profile in the radio) holds many options in one flat list. Options that change the code on screen sit next to options that change the sound, such as "Fully narrated", which makes the narrator speak at almost every step. There is also no way to switch the narrator off: the voice that reads the step phrases always speaks, even when its code and phrases are hidden.

## What Changes

- **Narrator switch.** A new option "Narrator voice" (on by default) silences the spoken step phrases in Compose and in the radio. "Fully narrated" becomes part of it and is available only when the narrator is on. The voice instrument is a track of the song and is not affected.
- **Minimal interface change.** The switch sits next to "Fully narrated" in the existing options. Grouping and a redesign of the options panels belong to the interface review (#44).

## Capabilities

### New Capabilities

- `live-build/profile-options`: the narrator switch.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/live/profiles.js` (new control `narrator`), the narrator in the live build and the radio (no spoken step lines when off), the profile panel in `src/main.js` and the radio Custom section in `src/radio/radio.js`, `src/i18n.js`, Guide.
- **Checks:** Classic and Crescendo code unchanged with the narrator on; a Node case for the narrator off (no voice lines, same music); a browser check of the switch.
- **Docs:** knowledge notes (profiles, narrator), DEVLOG.
- **Later, not here:** option groups, merging Profile, Build style and Growth (interface review, #44).
