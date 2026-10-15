## Why

How a song builds and shows itself while it plays is now set by many separate controls: build style, typing speed, code view, generator, and soon comments, pauses and highlights. Each experiment added one more switch. The owner wants to keep every way of playing (each has its reason) and to reproduce live-coding styles such as Switch, without piling up modes (#64). A profile groups the controls under one name.

## What Changes

- **Performance profiles.** A profile is a named set of the controls that decide how a song builds and looks while it plays: build style, growth rules, typing speed, code view, generator, comments and note highlights.
- **Three profiles to start:**
  - Classic: the live build in blocks, as before Crescendo;
  - Crescendo: today's Crescendo, unchanged;
  - Switch: natural growth (change `natural-growth`), code of the moment, short patterns, essential comments, highlighted notes.
- **Choose and adjust.** Compose picks a profile; changing one control makes the profile "custom", based on it. A style or a song may name its profile; Switch styles name Switch.
- **Code comments.** A title switch (on by default) and a level: all, essential (track headers only), none. A track header is written when its track first comes in and stays even when the block is empty. With none, a blank line separates the code blocks.
- **Note highlights.** The notes that play light up in the code of videos and of the live picture, as in Strudel's editor, so the code looks alive during pauses.
- **Nothing lost.** Classic and Crescendo keep their exact behaviour; checks compare their steps and code with today's.

## Capabilities

### New Capabilities

- `live-build/profiles`: performance profiles, their controls, the three built-in profiles, choosing and adjusting them, profiles named by styles and songs, code comments and note highlights.

### Modified Capabilities

None in their requirements: the controls keep their meaning, a profile only sets them together.

## Impact

- **Code:** a profile table and resolver (song or style profile, Compose choice, custom overrides), the existing settings read through it; the compilers gain comment options; the video code panel draws highlights.
- **Format:** optional `profile` in songs and style recipes (next to `buildStyle`, which maps to a profile).
- **Checks:** fixtures that Classic and Crescendo do not change; comment levels and header persistence; a browser check of the profile control.
- **Out of scope:** the Switch growth rules themselves (`natural-growth`); profiles in the radio (`crescendo-radio`).
