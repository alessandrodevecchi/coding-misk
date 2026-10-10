# Design

## Context

The radio has, per song on air, the plan (energy targets, roles), the curves (`songCurves`), tracks, build steps, seed and options. Three generations of mockups in `docs/soul` (one self-contained HTML page each, two test songs, comparison sheets) fixed the look; v3 is the reference. The visual stage (`src/visuals.js`) draws looks such as Studio, Sonar, Edgerunners, with a row of look buttons and full screen.

## Goals / Non-Goals

**Goals:** the ten v3 views in the app, animated, per song; the scene first, then the Soul display; radio first, then any song.

**Non-Goals:** editing from the soul; video export (#27, which can reuse the views).

## Decisions

- **Modules:** `src/soul/data.js` (pure: `soulData(song, { plan, entry, opts })`, seeded `hashOf` and timed events `eventAt`, line lists, default view; checkable in Node), `src/soul/views.js` (the ten views and the two overlays, ported from v3 on an offscreen canvas of 1200×760 logical pixels, fitted into the stage), `src/soul/scene.js` (the scene: follows the song, events, view and lock), `src/soul/display.js` (phase 2).
- **Drawing:** one 2D canvas at device pixel ratio; CRT layers (scanlines, vignette) and the HW retro filter drawn in the canvas; at most 30 frames a second while visible, paused when hidden; a lighter path on phones (fewer points).
- **Default view:** `views[H32(seed) % 10]`; lock state and the last manual choice remembered in the browser.
- **Neon hue:** each visual look has an accent hue; the colour views read it, plus a small seeded shift.
- **Events:** steering commands call the soul's `recalibrate()`; song changes call `analyze()`.
- **Visual picker:** the look buttons become a themed dropdown (the app's `appearance: base-select` style) next to the full-screen button.
- **Other songs:** curves measured per section with the same measures as the radio (energy, density, brightness, tension; voice from the comments), so Compose, Songs and playlists get a soul too.

## The Soul display: where it lives

The owner's doubts: a card in the tab, a collapsible section like the live code, a tab on the edge, or beside the visual. Options:

- **A card in the Radio tab:** simple, but only for the radio, and gone in other tabs.
- **A collapsible section in the right column, like the live code:** global (every tab, radio and songs), next to the code it complements; but the column is busy and narrow.
- **A tab on the edge that slides a panel out:** global, but hidden, and the owner is not convinced.
- **Beside the visual stage:** the stage is full width; a button shrinks it and opens the display on its right (collapsible). Global, always above the tabs, and the "override visual" lever has an obvious meaning there. On phones the display goes under the stage, closed by default.

**Shells and motion (owner's request):** the display has shells, picked with a lever: a sci-fi terminal, a wasteland terminal, a retro-futuristic screen, a 2000s CRT monitor or TV; a default per theme. It lives in a hatch beside the stage: on power the stage shrinks, the hatch slides in and opens, the display comes out and switches on; a shell change sends the display back in and brings the next one out; power off plays the reverse. The override lever draws a cable from the display to the stage. These concepts get mockups (stills and a short video) before phase 2 starts.

**Recommendation:** beside the visual stage. The power button is also the collapse control: off closes the display and gives the stage its full width back. A small "monitor" in the now playing card can come later as a shortcut.

## Risks / Trade-offs

- Glow and filters are costly on big screens: frame cap, pause when hidden, lighter phone path.
- Ten views are a lot of code: ported one by one from the mockups, each with a browser smoke check.
