## Why

The voice controls of #77 sit in the wrong places. Compose has a "Voice instrument" button in the toolbar, next to "New song from artist", that only sets the voice of a new song; the narrator controls are in the live build panel; the voice instrument of the song being edited has no controls at all, although changing it is the main Compose use case. In the radio the voice instrument block and the narrator controls are apart (the narrator only in the Custom section).

## What Changes

- **Compose: one Voices group** in the live build panel, always shown: Narrator voice, Narrator style, Narrated growth, and the voice instrument of a new song by an artist (preset, phrases per song, phrases, ways, in the new song). The toolbar button goes.
- **Narrator controls that cannot apply are disabled with a tooltip that says why**: the song does not build live (Live build off), the build style is not Crescendo (Narrated growth), the narrator is off (style and Narrated growth).
- **The voice instrument track panel** (a "Voice instrument" track of the song being edited) gets the same voice instrument controls, without the presence, plus "New phrases". Changing them rewrites that track's lines and clips; the options are kept on the track. An undo is offered after each rewrite.
- **Radio: one Voices group** with the narrator controls and the voice instrument block together. The narrator controls belong to the Custom profile: with another profile they show its values, disabled, with a tooltip that says so. A hint says that the settings apply from the next song and why the song on air does not change.
- **Stored values keep working**: the new-song options stay under `coding-misk-artist-voice`, same shape; no migration is needed. The radio keeps `voice` and `custom` as before.
- **Guide card and strings** in English and Italian; `tools/check-voices.cjs` checks the new positions.

## Capabilities

### New Capabilities

- `live-build/voice-placement`: where the voice controls live in Compose, in the voice instrument track panel and in the radio, and what changing the voice instrument of the song being edited does.

### Modified Capabilities

None in `openspec/specs/` (the voice-controls change is not archived; this change moves its controls).

## Impact

- **Code:** `index.html` (toolbar button out, Voices group), `src/main.js` (Voices group, track panel block), `src/endless/voice-panel.js` (a `track` mode, New phrases), a new pure module `src/endless/voice-track.js` (rewrite a spoken track from the options), `src/endless/director.js` (export the phrase drawing, no behaviour change), `src/song/spoken.js` (export the section facts), `src/song/validate.js` (the track's `voiceOptions`), `src/radio/radio.js`, `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Format:** an optional `voiceOptions` field on a spoken track (`{ phrases, kind, ways, draw }`), written only when the owner changes the voice instrument in its panel.
- **Sound:** unchanged until the owner changes the voice instrument of a song; director output, endless and Crescendo fixtures do not move.
- **Checks:** `check:spoken` cases for the rewrite (count as a ceiling, quiet parts, kinds, ways, repeatable, build step); `tools/check-voices.cjs` for the new positions.
