## Why

The owner's tests of the Patterns tab (#72) found three gaps: the styles of a saved pattern cannot be changed (New links one style, Save as pattern from Compose links none), new parts vanish when the tab closes and cannot be discarded one by one, and New on riffs composes with the bass generator, so a new riff sounds like a bassline even though the guitar generator can write power chord riffs.

## What Changes

- **Styles of a saved pattern** can be edited from its card: add or remove styles. New links the style chosen; Save as pattern from Compose links the song's styles.
- **New parts stay** at the top of the list, under "New, not saved", until saved or discarded, also across tab changes and reloads. Discard on a selected card and Discard all on the section header.
- **Guitar riffs from New**: New on riffs offers guitar riff (the guitar generator, a riff every time) and bass riff (today's). In Compose, "Compose a part" on a guitar track offers riff or chords.
- **Favourites** stay for later.

## Capabilities

### New Capabilities

- `app/pattern-followups`: pattern styles, kept and discarded new parts, guitar riffs.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/library/patterns-tab.js`, `src/library/patterns.js` (styles, drafts store, riff kinds), `src/material/chords.js` (riff on request), the Compose pattern panel, `src/i18n.js`, Guide.
- **Checks:** `check:patterns` (edit styles, drafts kept and discarded, guitar riff from New), `check:material` (a riff every time when asked; same output otherwise), `check-patterns` in the browser.
