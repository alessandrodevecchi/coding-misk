## Why

The Sounds tab answers "which instrument"; nothing answers "what plays": melodies, basslines, arpeggios, chords, grooves and riffs can only be heard inside a song (#72, `docs/VARIETY.md`, change 7). With parts stored as ideas and a generator that composes new ones, the owner needs one place to listen to them, keep the good ones and, later, vote on them to steer the generator.

## What Changes

- **A Patterns tab in the Groove Lab**, next to Sounds: melodies, basslines, arpeggios, chords, grooves and riffs, from the presets and from the user.
- **Play in a loop** with a chosen sound, key and tempo, over an optional simple beat.
- **A mini preview** of each pattern: notes for melodic parts, a step grid for grooves.
- **Styles that use it**, with links to the Styles tab.
- **The user's own patterns**: [Save as pattern] on a track in Compose, rename, delete; generated parts can be saved too, and a saved pattern can be added to the song open in Compose.
- **Links from Styles, Sounds and Compose**: a listen button next to a track's preset menu opens the pattern in the tab with the track's sound, key and tempo.
- Favourites and votes come later; the design keeps their place, since votes will steer the generator.

## Capabilities

### New Capabilities

- `app/patterns-tab`: the Patterns tab, its kinds, loop player, preview, styles that use a pattern, and links from other tabs.
- `app/user-patterns`: saving, renaming, deleting and reusing the user's own patterns, including generated parts, kept in the browser and in the backup.

### Modified Capabilities

None. The navigation of the two modes gains a tab under its existing rules.

## Impact

- **Code:** `index.html` (tab and section), new `src/library/patterns-tab.js` and `src/library/patterns.js` (store), `src/main.js` (Compose track panel: listen button and Save as pattern, tab wiring), `src/library/styles-tab.js` and `src/sounds/browser.js` (links), `src/i18n.js`, `src/guide.js`.
- **Checks:** `npm run check:guide` (new tab card), `tools/check-modes.cjs` (Groove Lab tab list, link across modes), new `tools/check-patterns.cjs` (browser) and `npm run check:patterns` (store, no browser), `tools/check-backup.mjs`.
- **Depends on:** `idea-model` (#70) for patterns as ideas and their expansion for the preview; `material-generator` (#71) for "Compose new" and saving generated parts.
- **Docs:** `docs/ARCHITECTURE.md` (tab and store), Guide, DEVLOG.
