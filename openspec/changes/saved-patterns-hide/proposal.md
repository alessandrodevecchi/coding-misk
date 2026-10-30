# Proposal

## Why

The radio console's "Add a saved pattern" panel (radio-arrangement D9, saved-patterns-list, #83) cannot be put away. Its title row has a chevron, but "closed" only switches from cards to compact rows: the toolbar, the instrument chips and a scroll area of up to 320 px stay. The owner, after the tests of 30 October: "if you collapse, it collapses entirely". The behaviour is written in the steering spec ("collapsed by default to a compact list … expand to a fuller view with larger cards", `openspec/specs/endless/steering/spec.md:90`) and in design D9 of `radio-arrangement`, so the spec changes first.

## What Changes

- **The chevron hides or shows the whole panel body.** Hidden: only the title row stays, with the count ("Add a saved pattern (97)"). Shown: the body as today (toolbar, instrument chips, groups, fixed-height scroll area, the note on patterns that do not fit).
- **An icon button in the title row switches the body between rows and cards.** Rows: the compact list of today's "closed" panel. Cards: today's "open" cards with the actions.
- **Both choices are remembered** in the browser. Default: shown, rows (the look the panel opens with today).
- Search, filters, groups, sorts, keyboard (P, Escape, arrows) and the scroll areas work inside the shown body as today. P on a hidden panel shows it and puts the focus in the search.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: "Add a saved pattern" no longer describes a collapsed list and expanded cards; two new requirements describe the panel shown or hidden and the rows or cards view.

## Impact

- `src/radio/radio.js`: the panel state (`savedOpen` and its store key, the `sp-toggle` handler, `spParts`, `spPanelHtml`, the P key), a new view button.
- `src/style.css`: the title row with the view button, the hidden state, the hardware theme.
- `src/i18n.js` (English and Italian), `src/icons.js` (rows and cards icons, drawn), `src/guide.js` (the console card).
- `tools/check-steering.cjs`: the saved-pattern steps that click `#sp-toggle` to switch rows and cards.
- `docs/knowledge/` note of the console, `DEVLOG.md`.
- No change to the director, the sessions or the saved patterns themselves.
