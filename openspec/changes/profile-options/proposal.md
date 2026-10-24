## Why

The profile panel in Compose (and the Custom profile in the radio) holds many options in one flat list. Options that change the code on screen sit next to options that change the sound, such as "Fully narrated", which makes the narrator speak at almost every step. There is also no way to switch the narrator off: the voice that reads the step phrases always speaks, even when its code and phrases are hidden.

## What Changes

- **Narrator switch.** A new option "Narrator voice" (on by default) silences the spoken step phrases in Compose and in the radio. "Fully narrated" becomes part of it and is available only when the narrator is on. The voice instrument is a track of the song and is not affected.
- **Options in groups.** The profile options are shown in four groups, each with a drawn icon and a short title, in Compose and in the radio's Custom section:
  - **Growth** (how the song builds): build style and growth, duration, growth shape, code view, generator.
  - **Code** (what the code shows): title, comments and their options, technical functions and their options, line breaks, lit notes.
  - **Typing** (how the code is typed): human typing, typing mistakes.
  - **Voice** (what speaks): narrator voice, fully narrated, voice code. Room for sung vocals later.
- **What applies when.** Each group says whether it applies at once (Code, Typing) or from the next song in the radio (Growth, Voice).
- **Groups can be folded**, and remember their state.

## Capabilities

### New Capabilities

- `live-build/profile-options`: the narrator switch and the grouped options panel.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/live/profiles.js` (new control `narrator`), the narrator in the live build and the radio (no spoken step lines when off), the profile panel in `src/main.js` and the radio Custom section in `src/radio/radio.js`, `src/i18n.js`, `src/icons.js`, `src/style.css`, Guide.
- **Checks:** Classic and Crescendo code unchanged with the narrator on; a Node case for the narrator off (no voice lines, same music); browser checks of the panel.
- **Docs:** knowledge notes (profiles, narrator), DEVLOG.
- **Later, not here:** merging Profile and Build style into one choice (backlog).
