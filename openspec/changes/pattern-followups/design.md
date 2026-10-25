## Decisions

### D1. Styles
Saved patterns already hold `styles` (`['any']` when empty). The card gets a row of style chips with an add menu (the recipes) and a remove cross; `any` shows as "every style". Save as pattern reads `song.tags.styles` (today it does, but Compose songs often have none: then it falls back to the style of the song's artist or recipe when known).

### D2. Drafts
New parts move from memory to a store in the browser (`coding-misk-pattern-drafts`), part of the backup. Discard and Discard all use the inline confirmation strip of the app.

### D3. Riffs
`MATERIAL_KIND.riffs` becomes a choice: `guitar` → `chords(type: 'guitar', riff: true)`, `bass` → today's bassline with riff rules. `chords()` gains `riff: true`, which skips the power-chord-only branch; without it the output is unchanged (same random draws), so existing songs and fixtures do not move.

## Risks / Trade-offs

- Drafts kept across reloads can pile up: Discard all and a cap of 30 drafts (oldest out, with a note) keep it small.
