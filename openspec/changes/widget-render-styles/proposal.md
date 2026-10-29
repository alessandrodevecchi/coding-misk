## Why

The change `widgets-on-stage` (this change builds on it; neither is built yet) proposes stage widgets drawn by the app: the looks Monitor and Rullo and a layer of panels over the other looks, all with one set of painters and one feed. The owner calls those first versions basic prototypes and wants cooler versions after them, with the widgets drawn in other render styles: ASCII art, a terminal, 1-bit dither, and others. The owner's open question: are these separate visuals or "filters" over the same visual?

## What Changes

- **A render style**, shown in the interface as "Render" in English and Italian (owner, rs3), because "style" already names the music recipes: a second choice next to the look, independent of it: Normal (default, today's pictures), 1-bit, CRT, LED, ASCII, Terminal. Any look can be drawn in any style, so the style is a filter in what the user sees, not a new scene.
- **Two ways to draw a style, one choice for the user.**
  - A **frame pass** after the look is drawn, on the stage canvas, for every look: the existing scenes, the soul, Monitor, Rullo and the layer. 1-bit (ordered dither), CRT (bloom, grille, scanlines) and LED (dot matrix) work well this way.
  - **Native painters** for the glyph renders (ASCII, Terminal) on the widget looks and the layer: the painters of `widgets-on-stage` draw in a grid of character cells, because a pass over the finished frame loses thin lines and text. The other looks get the glyph renders as a frame pass.
- **Terminal is a modern text interface, not a monochrome phosphor screen:** a dark ground, a truecolour palette of named colours per theme, a monospace font, rounded box-drawing panels with titles, a header and a status bar with key hints, braille dots for scopes, eighth blocks for meters and spectra, half blocks for piano rolls, dim text for labels. On the widget looks it is drawn natively (one panel per instrument, like a system monitor); on the other looks the scene becomes half-block truecolour cells (two pixels per cell) inside the same tab bar and status bar.
- **The code panel is never rendered,** not in the page and not in videos: code styling belongs to the separate code themes planned later.
- **Everywhere the stage goes:** live stage, session video, fast video, fragments and live output draw the same styled frame. The style is a pure function of the frame, so the fast video stays repeatable.
- **Theme colours:** 1-bit and LED take their colours from the app theme (neon: paper white; hardware: amber, as the soul's retro filter already does). Terminal and the "Claude" look have a truecolour palette per theme (neon: cool pastel colours on near black; hardware: warm amber family, the scene mapped to an amber ramp).
- **Settings:** a Render menu next to the look menu on the stage, a style for videos and fragments ("same as the stage" by default), a lighter style on slow devices. Saved and in the backup.
- **A new look, "Claude"** (owner, rs10): Terminal take B built now as its own look, a full-screen text interface in the layout of an agent command line tool: a header card with the song, what enters and what comes next, a large pane and smaller ones drawn with the Terminal painters, a prompt box with a typed line and a cursor, a status line and a mode line. The owner confirmed the name "Claude" as an explicit exception to the rule on brand names, in the code and in the public app.
- **Out of scope:** WebGL and shaders (kept as a later step only if the budget is missed), any render on the code panel (later code themes), Blueprint and other renders that need native drawing in every look (listed as later ideas).

## Capabilities

### New Capabilities

- `render-styles`: a render style applied to any stage look, by a frame pass or by native widget painters, the same in every output.

### Modified Capabilities

None in `openspec/specs/`. Builds on the open change `widgets-on-stage` (painters, feed, Monitor, Rullo, the layer) and reads `fast-video`, `session-video`, `live-output` and `vertical-clips`.

## Impact

- **Code:** a styles module (for example `src/visuals/styles.js`: passes and glyph atlas); `src/visuals.js` (`paint` calls the pass after the look and the flash); the painters module of `widgets-on-stage` (a glyph grid target); `src/video/video.js` unchanged except that the stage area arrives rendered; `src/music.js` (`RENDERS` list next to `LOOKS`); settings, `src/i18n.js`, `src/guide.js`.
- **Checks:** a new `check:render-styles` (no browser: the same input frame gives the same output, every style on every look and format) and a browser check with screenshots and frame times; `check:video`, `check:clips`, `check:live`, `check:export`, `check:guide`, `check:knowledge`. Sound, growth, levels and fixtures do not move.
- **Docs:** `docs/knowledge/visuals.md`, `decisions.md`, `settings.md`, `docs/DESIGN-SYSTEM.md`.
