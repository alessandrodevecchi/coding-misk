# Design

## Context

The radio has, per song on air, the plan (energy targets, roles), the measured and set curves (`songCurves`), the tracks and the build steps, the seed and the options. Mockups of three concepts were made with a real generated song (`nostromo-6`, "Humo Voltage") on a 1200 by 760 canvas.

## Goals / Non-Goals

**Goals:** a striking, readable picture of a song; live while it plays; one canvas, no library.

**Non-Goals:** editing from the Soul screen (the curves stay the place to edit); video export (#27).

## Decisions

- **Concept:** to be chosen by the owner among A (motion tracker), B (terrain scan), C (soul sphere), or a mix (for example A as the main view with a toggle to C). The requirements hold for any choice.
- **Drawing:** one `<canvas>` at device pixel ratio, drawn with 2D context; glow with `shadowBlur`; scanlines, vignette and bezel as CSS layers over it. 3D (B, C) by a small projection, no WebGL.
- **Data:** a pure function `soulData(song, plan, opts, seed)` builds what the screen needs, so it can be checked in Node and reused by the video of #27.
- **Sigil:** FNV-1a hash of the seed feeding a small generator: symmetric arms (5 to 8 by hash), point paths, two rings.
- **Live:** redraw on the player's frame at most 30 times a second while open; still otherwise.
- **Names:** "MISK/OS" and "Misk Industries" style labels, never film trademarks.

## Risks / Trade-offs

- Canvas glow is costly on large screens; the screen caps its frame rate and pauses when hidden.
- Small screens cannot hold the side panels; the phone layout keeps the picture and a short readout.
