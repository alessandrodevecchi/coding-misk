## Why

In the owner's tests of 31 October (evening, rn1) the renders of `widget-render-styles` (`#79`) look too coarse on a big screen: the LED dots are huge at full screen, ASCII has too few characters to show detail, and the 1-bit dither dots are too big. The owner also asked to look again at the other passes ("the filters": CRT and Terminal).

The cause is in how each pass sizes its cells: LED, ASCII and Terminal use a fixed number of rows whatever the output size (80, 40 and 45), so the cells grow with the screen; 1-bit uses a fixed size in device pixels. On top of that, the automatic light form (for slow devices) halves the density, and a full-screen stage is where it is most likely to switch on.

## What Changes

- **One density rule per render, in logical pixels of the picture's short side,** with a smallest and a largest cell. A bigger screen gets more cells, not bigger ones; a phone or a small stage keeps enough cells to read the shapes.
- **LED:** smaller, denser dots (about twice as many rows at full screen).
- **ASCII:** smaller characters (about twice as many rows at full screen), drawn a row at a time so the cost stays within the budget.
- **1-bit:** finer dither dots, with a cap on the work picture so the pass stays within the budget.
- **Terminal and the glyph forms of Monitor and Roll:** more rows on big screens, text still readable.
- **CRT:** its scanlines and grille sized in logical pixels, so a stage at device pixel ratio 1 and 2 and a 1080p video look alike.
- **A gentler light form:** it makes cells at most 1.5 times larger (today 2), never below the smallest density, and the Render menu shows when it is on.
- **A Density setting** (Coarse, Normal, Fine) in Settings → Look, one value for every screen and output: it scales the cells of the rule (× 1.4, × 1, × 0.7). Normal is the rule.
- **Any picture source:** the rule and the CRT spacing take the picture's size, not the visual, so other sources (a video picture, later) work the same.
- **Measurements before and after:** cell sizes, rows and columns, pass time and the light form's state for each render on the stage (window and full screen), in a 1080p video and in a 9:16 fragment, with pictures.

Not in scope: new renders, the colours of the passes, the code panel (never rendered), the looks themselves.

## Capabilities

### New Capabilities

- `app/render-density`: how fine each render draws for the size of the picture, the Density setting, the light form's limits, and the measurements that guard them.

### Modified Capabilities

None in `openspec/specs/`. The passes and the light form were specified by the open change `widget-render-styles` (requirements "Frame pass for every look", "Render settings", "Render performance budget"); this change refines their sizes and keeps their budget. The budget numbers stay as they are.

## Impact

- `src/visuals/render-styles.js` (`passSizes`, the ASCII drawing, the CRT mask, the light form), `src/visuals/glyph-looks.js` (`rowsFor`), `src/visuals/density.js` (new: the rules), `src/visuals.js` (the light form's mark, the density), `src/main.js` and `src/settings/settings.js` (the Density setting), `index.html`, `src/i18n.js`, `src/guide.js`.
- Checks: `check:render-styles` (pure sizes per output), `tools/check-render-styles.cjs` (budget, pictures), a new measuring script for the before/after table.
- Videos and fragments with a render look finer; their sound and code panel do not change. No fixtures move.
