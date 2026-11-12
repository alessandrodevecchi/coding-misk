## Why

The owner wants a stage visual that looks like a real oscilloscope (backlog, 30 October): the sound drawn as a glowing beam on a phosphor screen that keeps a fading trail, with screen overlays and many parameters, each of which can move by itself with the song. The app already draws scopes as code widgets (`#79`); none of the stage looks shows the sound itself, as a trace, full screen.

## What Changes

- **A new look, Oscilloscope ("Oscilloscopio").** It shows the sound of the song as a beam: a time sweep (the mix against time, held still by a trigger) or XY (the low instruments against the others). The beam leaves phosphor that fades by Persistence, is brighter where it moves slowly, and glows.
- **Six screen overlays:** Empty, Graticule, Smudged, Smudged graticule, Real oscilloscope (bezel, graticule, smudges, reflection), Vector display. All drawn by the app, no images.
- **Parameters:** Intensity, Persistence, Hue, Line saturation, Screen saturation, Focus, Noise, Glow, Ambient light, Smoothing, Sweep (ms), Trigger value; switches: Oversample audio, Sweep or XY.
- **Each parameter can follow the song.** Next to each value a link: Static, Bar, Section, an instrument's level (kick, bass, pad, lead) or the mix. The defaults move the glow with the kick and the hue with the section.
- **Light.** The look is a module loaded only when it is picked; one 2D canvas pass per frame; no new dependency.
- **Settings.** An "Oscilloscope" card in Settings with the overlay, the mode and the main parameters with their links.
- **First prototype** in this change: the look, all six overlays, sweep and XY, all parameters in the settings model, eight of them in the card, links working. The rest is in tasks.

Not in scope now: a Render that gives the other looks the phosphor (later, see design), the true left and right channels (the app has no stereo analyser today, see open questions), a panel of parameters on the stage itself.

## Capabilities

### New Capabilities

- `stage/oscilloscope`: the Oscilloscope look, its overlays, parameters, song links and settings.

### Modified Capabilities

None.

## Impact

- `src/music.js` (`LOOKS`, `RENDER_GAIN`), `src/visuals.js` (the look's frame, the full-length analyser buffers while it shows, the lazy module), new `src/visuals/oscilloscope.js` and `src/visuals/oscilloscope-rules.js`.
- `src/settings/settings.js` and `src/i18n.js`: the card and its strings in English and Italian; `src/guide.js`: the look in the stage's card.
- New `tools/check-oscilloscope.mjs` (settings, links, sweep window, resampling, no browser).
- The fast video draws the look from its feed (256 samples of the mix): coarser than live, see open questions.
