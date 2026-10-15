## Why

Phase 1 of Crescendo (`#64`, change `crescendo`) builds Compose songs in small steps. The owner wants the same in the radio, where songs are written by the director and can be steered while they play, and wants artists to have their own preference for it.

## What Changes

- **Crescendo songs in the radio.** The director can make a song with the crescendo build style. Its growth is the path from the current state to the song the director planned.
- **Steering keeps working.** Curves and steering commands change the destination; the path is recomputed from the code on air, so the build turns toward the new destination without starting over.
- **Artists choose a build style.** A new artist field `buildStyle` gives weights (`{ "blocks": 3, "crescendo": 1 }`), plus a `crescendo` block for the artist's way of growing (step spacing, what the build starts from, breaks, endings, dense narration) and new quirks. Existing artists keep the blocks style only. Random artists draw these too. A new built-in artist builds in crescendo only.
- **Visible in the radio.** The song card on air shows a crescendo mark; "new song from artist" in the Artists tab proposes the artist's build style.
- **Sessions and recording.** Sessions record the build style; replays stay identical; `DIRECTOR_VERSION` is bumped. Recording and export of radio sessions with crescendo songs work as for any song.

## Capabilities

### New Capabilities

- `endless/crescendo`: crescendo songs in the radio, path recomputed on steering, artist build style weights and crescendo parameters, session determinism.

### Modified Capabilities

- None in their requirements; the director, steering and artists gain behavior described in the new capability.

## Impact

- `src/endless/` (director, steering, artists), `src/song/crescendo.js` (path from any state), artist format and validator, Artists tab editor, radio song card, `docs/ENDLESS.md`, `docs/ARTISTS.md`, Guide card, `npm run check:endless` fixtures and `DIRECTOR_VERSION`.
- Depends on the change `crescendo` (phase 1). Transitions between a blocks song and a crescendo song must keep working; if the compact compiler (change `crescendo-code`) is in place, the two codes in one window must not clash.
