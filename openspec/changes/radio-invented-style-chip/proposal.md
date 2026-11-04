# Proposal

## Why

With the compilation on, "Now playing" shows a small chip "Keep Pollendrive · invented" for a style the radio invented (#82, test si5). The chip gives no definition of the style and no visible Keep button. In the browser it also needs a double click: the card is rebuilt about every 250 ms, so a single click often lands on a button that is gone before the mouse is released. The left column (On air, STYLES) already shows a better chip for a style invented with the Invent die: its name, "on trial", its genre, a Keep button, a description and the seed in the tooltip. The two places should look and work the same.

## What Changes

- **Now playing:** the chip for a style invented by the compilation becomes the same chip and hint as the trial style of the Invent die: name, "invented", genre, description, an explicit Keep button. Keep saves the style exactly as Invent's Keep does.
- **Left column:** while a compilation-invented style plays, it also shows in the STYLES block as the same chip, so the column looks the same with and without the compilation.
- **Click reliability:** Keep reacts to a single click while the card is rebuilt (the Now playing re-render no longer swallows it).
- **Unchanged:** compilation off, the Invent die, the Styles tab, the saved session recipe, how the director picks and invents styles. No new setting.

## Capabilities

### New Capabilities

- `endless/radio-invented-style-chip`: one chip and hint for an invented style in Now playing and in the STYLES block, with an explicit Keep.

### Modified Capabilities

None.

## Impact

- `src/radio/song-controls.js`: `trialChip` and `trialHint` take the style and the Keep action as parameters (today they read `state.tempStyle`).
- `src/radio/radio.js`: the `comp-tag` markup of `renderNow` (about line 1269) and the STYLES block (about line 1350); the `data-comp-keep-style` handler (about line 1451); `src/i18n.js` for one or two strings if the label differs from "on trial".
- `src/style.css`: reuse of `.trial-style` and `.trial-row`; at most a small rule for the compilation variant.
- No change to `src/endless/*`, `src/main.js`, the recipe format or stored data.
