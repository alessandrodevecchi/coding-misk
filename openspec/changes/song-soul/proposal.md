# Proposal

## Why

The radio shows a song's settings as separate curves, menus and knobs. The owner wants the whole "soul" of a song (its seed, settings, curves and instruments) drawn as living pictures, in retro science-fiction screens, as the showpiece of the app (#46). Three generations of mockups (`docs/soul/v1`, `v2`, `v3`) fixed the look; the owner wants all ten views.

## What Changes

- **Ten soul views** from the v3 mockups, all animated: A Tracker, B Terrain, C Sphere (CRT family: green phosphor, amber in HW) and D Lattice, E Strands, F Landscape, G Particles, H Halftone, I Aura, J Spectrum (colour family: hue from the selected visual in neon, a retro amber filter in HW). Each song gets its own shapes and small events from its seed.
- **Messages:** an "analyzing" overlay when the soul opens or the song changes (a rotating list of sci-fi and horror lines), and an interference effect with "recalibrating" lines when steering changes the song.
- **One view per song by default** (picked from the seed), changing with the song unless locked; the listener can switch view at any time.
- **Phase 1, scene:** the soul as a scene of the visual stage (temporary while it is built), with full screen. The visual picker becomes a dropdown plus a full-screen button.
- **Phase 2, the Soul display:** a retro device of its own, independent of the visual stage: a power button with switch-on and switch-off animations, a full-screen button, buttons to change view, a lock switch and an "override visual" lever that puts the soul on the visual stage. The display's shell can be changed (a lever next to it): a sci-fi terminal, a wasteland terminal, a retro-futuristic screen, a 2000s CRT monitor or TV, with a default per theme. It comes out of a hatch beside the stage with an animation, and the override lever shows a cable from the display to the stage. Mockups of these concepts come before phase 2.
- **Radio first,** then any song (curves measured from its sections and tracks).
- **Own names:** labels use the app's own names (no film trademarks); the mockups are versioned in `docs/soul`.

## Capabilities

### New Capabilities

- `endless/song-soul`: the soul data, the ten views, the sigil, live following, messages, themes, the scene and the Soul display.

### Modified Capabilities

None.

## Impact

- New `src/soul/` (data, views, overlays, display), `src/visuals.js` and `index.html` (visual dropdown, soul scene), `src/radio/radio.js` (data and events), `src/style.css`, `src/i18n.js`, `src/guide.js`.
- Checks: Node checks for the data and the sigil; a browser check for the scene, the display and full screen.
