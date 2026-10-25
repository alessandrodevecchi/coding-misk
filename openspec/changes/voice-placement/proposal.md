## Why

The voice controls of #77 sit in the wrong places. Compose has a "Voice instrument" button in the toolbar, next to "New song from artist", that only sets the voice of a new song; the narrator controls are in the live build panel; the voice instrument of the song being edited has no controls at all, although changing it is the main Compose use case. In the radio the voice instrument block and the narrator controls are apart (the narrator only in the Custom section), the song on air cannot change its voice instrument, and a knob, a curve and a console group named "Voice" actually drive the narrator.

## What Changes

- **Compose: one Voices group** in the live build panel, always shown: the narrator (Narrator voice, Narrator style, Narrated growth); the voice instrument of the open song, with the same controls as its track panel and kept in sync with it, or "Add a voice instrument" when the song has none; a small folded row "In the next song" with the settings for a new song by an artist, until the New song panel (#78) takes them over. The toolbar button goes.
- **Narrator controls that cannot apply are disabled with a tooltip that says why**: the song does not build live (Live build off), the build style is not Crescendo (Narrated growth), the narrator is off (style and Narrated growth).
- **The voice instrument track panel** gets the same voice instrument controls, without the presence, plus "New phrases". Changing them rewrites that track's lines and clips; the options are kept on the track. An undo is offered after each rewrite.
- **Radio: one Voices group** with the Narrator knob, the narrator controls and the voice instrument block together. The narrator controls belong to the Custom profile: with another profile they show its values, disabled, with a tooltip that says so.
- **Radio: the song on air** changes its voice instrument only with the button Apply to the song on air: a steering command, recorded like the other console commands, from its next quiet part. A change by itself applies from the next song. The narrator of the song on air does not change, and the hint says why.
- **The radio Voice knob, compilation range, curve and console group become "Narrator"**, with tooltips that say they set how often the narrator comments and do not touch the voice instrument. Behaviour and stored keys stay.
- **Stored values keep working**: the new-song options stay under `coding-misk-artist-voice`, same shape; no migration is needed.
- **Guide card and strings** in English and Italian; `tools/check-voices.cjs` checks the new positions.

## Capabilities

### New Capabilities

- `live-build/voice-placement`: where the voice controls live in Compose, in the voice instrument track panel and in the radio, what changing the voice instrument of the song being edited or on air does, and the narrator's knob names.

### Modified Capabilities

None in `openspec/specs/` (the voice-controls change is not archived; this change moves its controls).

## Impact

- **Code:** `index.html`, `src/main.js` (Voices group, track panel block), `src/endless/voice-panel.js` (a `track` mode, New phrases), a new pure module `src/endless/voice-track.js` (rewrite a spoken track from the options, from a bar), `src/endless/steering.js` (the `voice` command), `src/endless/director.js` and `src/song/spoken.js` (exports only), `src/song/validate.js` (the track's `voiceOptions`), `src/radio/radio.js`, `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Format:** an optional `voiceOptions` field on a spoken track (`{ phrases, kind, ways, draw }`), written only when the owner changes the voice instrument in Compose. Session recipes may carry `voice` steering commands.
- **Sound:** unchanged until the owner changes a voice instrument; director output, endless and Crescendo fixtures do not move.
- **Checks:** `check:spoken` cases for the rewrite and the steering command; `tools/check-voices.cjs` for the new positions.
