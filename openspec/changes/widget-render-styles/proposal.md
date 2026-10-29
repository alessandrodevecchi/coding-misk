## Why

The change `widgets-on-stage` (this change builds on it; neither is built yet) proposes stage widgets drawn by the app: the looks Monitor and Rullo and a layer of panels over the other looks, all with one set of painters and one feed. The owner calls those first versions basic prototypes and wants cooler versions after them, with the widgets drawn in other render styles: ASCII art, a terminal, 1-bit dither, and others. The owner's open question: are these separate visuals or "filters" over the same visual?

## What Changes

- **A render style**, shown in the interface as "Render" (it: "Resa"), because "style" already names the music recipes: a second choice next to the look, independent of it: Normal (default, today's pictures), 1-bit, CRT, LED, ASCII, Terminal. Any look can be drawn in any style, so the style is a filter in what the user sees, not a new scene.
- **Two ways to draw a style, one choice for the user.**
  - A **frame pass** after the look is drawn, on the stage canvas, for every look: the existing scenes, the soul, Monitor, Rullo and the layer. 1-bit (ordered dither), CRT (bloom, grille, scanlines) and LED (dot matrix) work well this way.
  - **Native painters** for the glyph styles (ASCII, Terminal) on the widget looks and the layer: the painters of `widgets-on-stage` draw in a grid of characters (a scope as slope glyphs, notes as blocks, frames as box lines), because a pass over the finished frame loses thin lines and text. The other looks get the glyph styles as a frame pass.
- **The code panel in videos** is drawn in the style by changing its font and colours (Terminal: phosphor mono font; 1-bit: two colours, no dither on text), never by a pass over the text. The live code editor in the page does not change.
- **Everywhere the stage goes:** live stage, session video, fast video, fragments and live output draw the same styled frame. The style is a pure function of the frame, so the fast video stays repeatable.
- **Theme colours:** 1-bit, Terminal and LED take their two or few colours from the app theme (neon: phosphor green and paper white; hardware: amber, as the soul's retro filter already does).
- **Settings:** a Render menu next to the look menu on the stage, a style for videos and fragments ("same as the stage" by default), a lighter style on slow devices. Saved and in the backup.
- **Out of scope:** WebGL and shaders (kept as a later step only if the budget is missed), new scenes made for one style, a styled live code editor, Blueprint and other styles that need native drawing in every look (listed as later ideas).

## Capabilities

### New Capabilities

- `render-styles`: a render style applied to any stage look, by a frame pass or by native widget painters, the same in every output.

### Modified Capabilities

None in `openspec/specs/`. Builds on the open change `widgets-on-stage` (painters, feed, Monitor, Rullo, the layer) and reads `fast-video`, `session-video`, `live-output` and `vertical-clips`.

## Impact

- **Code:** a styles module (for example `src/visuals/styles.js`: passes and glyph atlas); `src/visuals.js` (`paint` calls the pass after the look and the flash); the painters module of `widgets-on-stage` (a glyph grid target); `src/video/video.js` (`drawCode` with the style's font and colours; the stage area already arrives styled); `src/music.js` (`RENDERS` list next to `LOOKS`); settings, `src/i18n.js`, `src/guide.js`.
- **Checks:** a new `check:render-styles` (no browser: the same input frame gives the same output, every style on every look and format) and a browser check with screenshots and frame times; `check:video`, `check:clips`, `check:live`, `check:export`, `check:guide`, `check:knowledge`. Sound, growth, levels and fixtures do not move.
- **Docs:** `docs/knowledge/visuals.md`, `decisions.md`, `settings.md`, `docs/DESIGN-SYSTEM.md`.
