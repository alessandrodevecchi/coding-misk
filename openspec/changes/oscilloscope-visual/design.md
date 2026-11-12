# Design

## Context

See proposal.md. Pointers checked at `ef85658`:

| What | Where |
| --- | --- |
| Looks, the pickable list, render gain per look | `src/music.js` `LOOKS`, `PICK_LOOKS`, `RENDER_GAIN` |
| One picture of the stage, the analysers read each frame | `src/visuals.js` `paint`, `readAudio` (`window.getAnalyzerData('time', id)`, one analyser per instrument, `fftSize` 8192) |
| The fast video's frame from a feed of levels and a 256-sample wave | `src/visuals.js` `drawAt` |
| The section of a cycle | `stage.sectionInfo(cyc)` → `{ label, i, n, end, next }` |
| Settings cards | `src/settings/settings.js` (`row`, `seg`, a card per feature) |
| Our scopes (code widgets, `#79`) | `src/live/widgets.js`, `src/visuals/widget-painters.js` |

The reference images (two screenshots of a parameter panel) are in the owner's local notes; nothing from them is copied, only the list of parameters and their default values.

## Goals / Non-Goals

**Goals:** a look that reads as a real instrument, light on the page, with parameters that follow the song; defaults that look good without touching anything.

**Non-Goals:** sound-accurate vector graphics (drawing pictures with audio), a stereo audio path, a WebGL renderer.

## Decisions

### D1. Oscilloscope is a look

It goes in `LOOKS` as `oscilloscope` ("Oscilloscope", "Oscilloscopio"), so the look menu, the radio look, the video direction, fragments, the render styles and the widget layer work as with any scene look. The render passes (CRT, LED, 1-bit, ASCII, Terminal) go over it like over Sonar; `RENDER_GAIN` 2.4, like the other dark looks.

### D2. Loaded only when picked

The drawing lives in `src/visuals/oscilloscope.js`, imported with `import()` the first time a frame asks for the look; until it arrives (a few milliseconds) the frame is black. The settings model (`oscilloscope-rules.js`) is small and pure, imported by the settings card and the check. While the look is not on screen, `readAudio` does not keep the full buffers (no extra work for the other looks).

### D3. Overlays

Six overlays, drawn by the app into two cached canvases (under the beam: the screen; over it: the glass) and rebuilt only when the size, the overlay, the hue, the ambient light or the screen saturation change:

- **Empty:** black glass with a little of the trace's colour.
- **Graticule:** 10 × 8 divisions with five ticks per division on the centre lines.
- **Smudged:** greasy patches and wipe marks on the glass, seeded (the same on every frame and every video).
- **Smudged graticule:** both.
- **Real oscilloscope:** a bezel, a rounded screen, graticule, a few smudges and a reflection of the room.
- **Vector display:** a blue-black rounded tube darker at the corners, no graticule, the reflection.

Ambient light lights the glass (graticule, smudges, reflection, screen base); Screen saturation is how much of the hue the glass takes.

### D4. The beam

- **Signal.** While the look shows, `readAudio` keeps the full time data: the mix (every instrument summed), the low group (kick, bass) and the high group (the others). Sweep draws the mix against time; XY draws low on X against high on Y, with the low group also on Y about 1.5 ms later, so drums and bass alone draw loops instead of a flat line (seen on the first prototype: with only kick and bass playing, Y stayed at zero). A true left and right needs a stereo analyser on the master, which the app does not have (open question 1).
- **Sweep.** Sweep (ms) of samples (2 to 40 ms) from the first rising crossing of the Trigger value in the first half of the buffer, so a steady tone stands still.
- **Oversample audio.** Catmull-Rom points between samples (4 per sample, fewer on a long sweep: at most about 4000 points); Smoothing is a one-pole low-pass before it.
- **Brightness.** A real beam leaves less light where it moves fast: each segment's brightness goes with 1 / its length, in 6 levels, so the trace is 6 paths, each drawn as a wide faint halo and a thin core. Focus is the beam's width.
- **Phosphor.** A buffer canvas at the stage's pixel size; each frame it fades so that Persistence is what is left after 1/60 s (the same at any frame rate), then the new beam is added with `lighter`. On the stage: the screen, the buffer sharp, the buffer blurred for Glow, the glass.
- **Noise.** A tremble on the beam and grains of phosphor, seeded by the song time, so a frame depends on the song and not on the clock.

### D5. Song links

Each parameter has a value and a link: Static, Bar (a ramp through each bar), Section (a step per section, from the first to the last), Kick, Bass, Pad, Lead (hook, arp, guitar) level, or the mix. A link moves the value from where it is toward the top of its range by up to 60 %; Hue turns instead, up to half the circle, so a section's colour stays in the family. The levels are the ones the other looks use (`lv`, 0..1 per instrument). This is the "Static" menu of the reference, with the song in place of a free LFO or the microphone.

### D6. Defaults

From the reference panel, adjusted to the stage: Intensity 5, Persistence 0.5, Hue 125 (green), saturations 1, Focus 1, Noise 0, Glow 0.3, Ambient light 0.7, Smoothing 0, Oversample on, Sweep 10 ms, Trigger 0, overlay Real oscilloscope, mode Sweep. Links: Glow with the kick, Hue with the section.

### D7. Settings

A card "Oscilloscope" in Settings: overlay, mode, Oversample, and in the prototype eight parameters (Intensity, Persistence, Hue, Glow, Focus, Noise, Ambient light, Sweep), each with a slider and its link. Stored whole in `coding-misk-oscilloscope` (so it goes in the backup with the other `coding-misk-*` keys). The others keep their defaults until the full card (task 3).

### D8. Later: phosphor as a Render

The phosphor buffer and the glow could become a Render ("Phosphor") for the other looks: the look's frame instead of the beam fed into the same fade and glow. Not in this change; the module keeps the phosphor and the beam apart so it can.

## Cost (measured 12 November, task 2.5)

`tools/check-oscilloscope.cjs --cost`, kellerlicht playing, headless Chrome on the owner's Mac (Apple M4, ANGLE Metal), the stage drawn into a target of the size below (`setTarget`), 4 s per row. The time is the look's own draw (`codingMiskOscTimes`, 0.1 ms resolution). Two readings:

- **Main thread only.** The canvas commands as recorded, the drawing left to the GPU: median 0.3 ms, p95 0.4 ms for every overlay at 1080p and at 4K, with Glow 1 too; XY with Glow 1 0.4 / 0.5 ms. Load average 3.0 to 3.5.
- **With the drawing.** A pixel read after each frame, so the time holds the drawing itself. After a few reads Chrome draws the canvas on the CPU, so this is the software path, the worst case:

| Size | Overlay, settings | Median | p95 | Load average |
| --- | --- | --- | --- | --- |
| 1920 × 1080 | each overlay, defaults (Glow 0.3) | 18.2 to 18.7 ms | 21.4 to 22.2 ms | 2.8 to 3.1 |
| 1920 × 1080 | Real oscilloscope, Glow 1 | 17.8 ms | 20.2 ms | 2.9 |
| 1920 × 1080 | Real oscilloscope, XY, Glow 1 | 18.0 ms | 20.9 ms | 2.8 |
| 1920 × 1080 | Real oscilloscope, Glow 1, CPU slowed 4× | 67.9 ms | 71.9 ms | 2.8 |
| 3840 × 2160 | each overlay, defaults | 60.6 to 61.4 ms | 62.8 to 63.8 ms | 2.7 to 3.1 |
| 3840 × 2160 | Real oscilloscope, Glow 1 | 63.6 ms | 67.5 ms | 3.2 |
| 3840 × 2160 | Real oscilloscope, XY, Glow 1 | 66.4 ms | 69.9 ms | 3.0 |

(Empty at 1080p measured first: 9.7 ms median, 26.7 ms p95, before Chrome moved the canvas to the CPU.)

Where the time goes, on the same software canvas: the Glow blur of the full phosphor buffer 7.8 ms at 1080p and 33 ms at 4K, the three full-size copies (screen, phosphor, glass) and the fade 2.8 ms and 11 ms; a glow drawn on a canvas a quarter of the size and scaled up 3.0 ms and 9.9 ms. The overlay hardly counts (cached).

The fast video: an 8-second 9:16 fragment of kellerlicht exported in 4.1 s with the look against 5.0 s with Palco (best of two each, load average 2.2), so the look does not slow the exports.

Reading: on the live stage the look costs well under a millisecond of main-thread time; the software path only matters for a canvas that is read back every frame. The smaller glow canvas (Risks) would take about 5 ms off at 1080p and 23 ms at 4K on that path; it changes how the glow looks a little, so it waits for the owner's look at the defaults (open question 4).

## Risks / Trade-offs

- **`ctx.filter` blur** costs on large stages and is missing in some older browsers (then Glow is skipped, the trace still shows). Measure at 1080p and 4K before the full card; fall back to a smaller glow canvas if needed.
- **The fast video's feed** has only 256 samples of the mix, so the video's beam is coarser than live, and XY falls back to Sweep there. A fuller feed is open question 3.
- **Persistence across a seek** keeps the old trail for a moment: acceptable, it fades within a second.

## Open Questions

1. **Left and right for XY.** Today X is the low instruments and Y the others. A true L/R needs a stereo analyser on the master and pans in the songs. *Recommended:* keep low/high for now; add a stereo master analyser only if XY on real L/R is wanted for a specific use.
2. **Where the parameters live.** A card in Settings (prototype), or a small panel on the stage next to the look menu. *Recommended:* the Settings card first; a stage panel later with the other looks' options, so the stage stays clean.
3. **Fast video quality.** Feed the fast video the full mix buffer (more memory per frame) or keep the 256-sample wave. *Recommended:* keep 256 for the prototype; feed the full buffer only if the owner exports with this look.
4. **Defaults.** Real oscilloscope, green, sweep, glow on the kick, hue by section. *Recommended:* yes; switch to Vector display and amber if the owner prefers a warmer stage.
5. **Phosphor Render for the other looks (D8).** *Recommended:* after the owner has seen the look on a few songs, as its own change.
6. **More links (an LFO, the microphone).** *Recommended:* no: links to the song only, as the backlog says; an LFO adds a clock the exports cannot repeat unless tied to the bar.
