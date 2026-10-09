# Proposal

## Why

The energy curve and the four detail curves of #40 work but look plain (round handles, dashed lines, small lanes), and the card grows tall. The owner picked a look from mockups (#47): variant B "neon" in the normal theme, the "oscilloscope" in the HW theme, details folded by default, and a hover line with every value.

## What Changes

- **Points:** small squares, hollow when automatic, filled when set by the listener.
- **Lines:** solid by default; a set part and its neighbours glow (neon). Parts already played are shaded.
- **Energy as the main curve:** taller, on top, with light grid lines at 0, 50 and 100, part names under it (intro, build, drop) and a shaded "charge" zone before a drop when tension builds one.
- **Details folded by default:** under the energy curve a one-line summary of the four curves for the part playing; a tap opens the lanes. The choice is remembered in the browser.
- **Hover line:** with a mouse, a vertical line on the part under the pointer and a box with the values of every curve for that part. On touch, the box shows while dragging.
- **HW theme:** every curve in a black screen with a grid, amber lines with a phosphor glow, set parts in warm white, the position line in green.
- **Out of scope:** behaviour of the curves (unchanged), the "soul of the song" screen (#46).

## Capabilities

### New Capabilities

- `endless/radio-curve-view`: how the curves of the song on air are drawn: points, lines, grid, part names, charge zone, folded details, hover values, HW look.

### Modified Capabilities

None. The behaviour of the curves (`endless/radio-curves`, open change `radio-curves`) stays as it is.

## Impact

- `src/radio/radio.js` (curve drawing, details toggle, hover), `src/style.css` (both themes, phone width), `src/i18n.js`.
- Checks: `check-steering.cjs` (folded by default, toggle, hover box, drag still works, phone width).
