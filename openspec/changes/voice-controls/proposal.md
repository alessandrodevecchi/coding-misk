## Why

The app has three voices and the owner cannot tell them apart: the narrator explains the steps of a live build, the poetic narrator is the same voice with short images instead of explanations, and the voice instrument is a track of the song. Only the narrator has controls. The poetic narrator is chosen by the song or its style, and a generated song gets at most one voice instrument line (#77).

## What Changes

- **A Voices group** in Compose and in the radio Custom profile: Narrator voice, Narrator style (automatic, explaining, poetic) and Fully narrated, renamed "Narrated growth" with a hint that it makes the steps denser, each one spoken. It stays disabled while the narrator is off.
- **Voice instrument controls** for generated songs (a new song from an artist) and the radio, each one separate:
  - phrases per song: 1, 2 to 3, 4 to 5, 6 to 8, many (up to 12);
  - phrases: different, repeated (as a refrain), mixed;
  - ways: opening, refrain, chop, passage, each on or off;
  - in the radio only, how often a song gets one: never, as the style says, often; a single generated song: on or off.
- **Presets** for the voice instrument: As the style (default, today's behaviour), Discreet, Present, Obsessive; changing a control makes it Custom.
- **The Guide** explains the three voices side by side.

## Capabilities

### New Capabilities

- `live-build/voice-controls`: the Voices group and the voice instrument controls.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/live/profiles.js` (narrator style), `src/song/spoken.js` and `src/endless/director.js` (several phrases per song and their places), the Compose panel, the radio Regia and Custom section, `src/i18n.js`, Guide.
- **Sound:** unchanged with the defaults (As the style, narrator style automatic): the endless and Crescendo fixtures must not move; other choices change the generated songs only.
- **Checks:** `check:spoken` (counts, repeated and different phrases, no two phrases in the same quiet part, ways off), `check:endless` fixtures unchanged by default, browser check of the group and the presets.
