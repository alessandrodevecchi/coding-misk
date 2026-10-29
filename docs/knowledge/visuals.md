---
id: visuals
related: [export, radio, settings, songs, live-build]
code: [src/visuals.js, src/hardware.js, src/soul/data.js, src/soul/views.js, src/soul/shells.js, src/video/layout.js, src/live/timeline.js, src/style.css]
checks: [npm run check:soul, npm run check:video, npm run check:clips, node tools/check-soul.cjs, node tools/screenshot-visual.cjs]
---

# Visuals

## What it is

What the app draws while music plays, and how video files are laid out.

- **Themes.** Two interface themes: `neon` (default) and `hw`, a hardware look with knobs and LEDs (`data-ui="hw"`, stored in `coding-misk-ui`). Tokens and components are in `docs/DESIGN-SYSTEM.md`.
- **Looks.** Canvas visuals on the stage, one per look, drawn by `src/visuals.js`. Each look reacts to the level and the onsets of every instrument (`.analyze()` names).
- **Song soul.** A science fiction screen of the song playing: ten views, drawn from the song's own data, inside a choice of device shells. It opens from a hidden screw on the stage (an easter egg).
- **Procedural visuals.** Endless scrolling scenes were built and then moved out of the app at the owner's request. They live in the owner's local notes; the repo keeps the tags `visuals-v1` to `visuals-v3`.
- **Video layouts.** Where the visual, the code, the soul and the timeline sit in an exported video, and the vertical fragments.

## How it connects

- **Songs** pick a look with `look` ([songs.md](songs.md)). The radio has its own look in Settings.
- **Export** draws the same frames into video files; the fast video draws them from the timeline, so a frame depends only on the bar ([export.md](export.md)).
- **Live build** decides the code shown in video layouts with code ([live-build.md](live-build.md)).
- **Settings** keep the video layout, quality, card, visual and fragment options ([settings.md](settings.md)).

A frame must depend on the bar and the levels only, never on wall time. Then the live player, the fast video and the checks draw the same thing.

## Options

<!-- generated:looks -->
Stage visuals (`LOOKS` in `src/music.js`): `palco` Stage (it: Palco), `pixel` Pixel, `tramonto` Sunset (it: Tramonto), `montagne` Mountains (it: Montagne), `spazio` Space (it: Spazio), `sonar` Sonar, `edgerunners` Edgerunners, `studio` Studio (hidden).

Soul views (`VIEW_NAMES` in `src/soul/data.js`): `a` Tracker, `b` Terrain, `c` Sphere, `d` Lattice, `e` Strands, `f` Landscape, `g` Particles, `h` Halftone, `i` Aura, `j` Spectrum.

Soul display shells (`SHELLS` in `src/soul/shells.js`): `A` MISK/OS 6000, `B` Unified terminal, `C` Wrist-Link, `D` Deck console, `E` MiskVision, `F` Pro monitor, `G` Electronic Brain 1958.
<!-- /generated -->

<!-- generated:video-options -->
Video layouts (`LAYOUTS`): `visual`, `code`, `code-widgets`, `tab`, `visual-tl`, `visual-code-tl`, `code-tl`, `soul-tl`, `visual-float`, `visual-column`. Qualities: `1080p30`, `1080p60`, `720p30`. Title card: `always`, `start`, `off`.

Fragments: formats `9:16`, `4:5`, `1:1`, `16:9`; show `visual`, `visual-code`, `visual-soul`, `soul`, `code`, `visual-code-widgets`, `code-widgets`; aspect `whole`, `fill`, `16:9`, `4:3`, `1:1`, `4:5`, `9:16`; code mode `focus`, `scroll`, `follow`; files `video`, `audio`, `texts`, `list`.

Audio formats (`src/export/encode.js`): `wav`, `flac`, `mp3`, `opus`; MP3 at 320 or 192 kbps.
<!-- /generated -->

The look `studio` is hidden: a song or setting that names it falls back to the stage. Soul views `a` to `c` are CRT screens; the others draw on a black screen.

## Example

Screenshots of one look playing a song, to compare before and after a change:

```sh
node tools/screenshot-visual.cjs edgerunners luci-rosse 3 /tmp/edge
```

Add a look: a drawing function in `src/visuals.js`, an entry in `LOOKS` with English and Italian names, a Guide line in the card `visuals`, and screenshots for the owner. The owner wants drawn icons, never emoji, and screenshots before any change of look ([pitfalls.md](pitfalls.md)).

## Where to read more

- [docs/DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md): tokens, themes, components, every look and the soul.
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#visuals) and [video](../ARCHITECTURE.md#video-27).
