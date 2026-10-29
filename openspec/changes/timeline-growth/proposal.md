## Why

In Compose, a song with a growth (Live coder, Crescendo) plays a growth before its written sections, and may add an ending. The Compose timeline shows the written sections only, while the time label and the player bar cover the whole played song: the knob stays at the start during the growth and dragging seems to jump (`#88`). A song that starts with its waypoints in Classic with the live build off plays waypoint sections the arranger does not count, so clicking a section plays another one.

## What Changes

- **One mapping between played bars and arranger columns** for the growth, waypoint sections and an added ending. The section offsets, the playing section, the ruler, the keys and the highlights all use it. This fixes the waypoint songs.
- **A growth column** before the written sections, read-only and hatched, in the ruler, the section strip and the track grid (sections view and timeline view), aligned. Each track row shows when it plays in the growth, with a tick for each of its steps. An added ending ("Stop", "Strip") is a column of its own after the written sections.
- **Three growth views** behind one icon toggle (closed, half-open and open eye, with a tooltip in Italian and English): hidden (a narrow tab), compact (default, a fixed width with a linear scale inside) and open (the growth at the same pixels per bar as the written song; the arranger scrolls horizontally). The view is remembered per viewer.
- **One scale.** Knob, time label, click, drag and keys follow the played song: arrows move one bar, Page Up and Page Down move to the previous or next growth step or section, Home goes to bar 0, End to the last bar of the song, ending included. Clicking the growth column in the strip goes to bar 0; clicking the first written section goes to the written section. Clicking a growth cell goes to that track's step and selects the track.
- Classic songs without a growth look and behave as before.

## Capabilities

### New Capabilities

- `app/compose-timeline`: the Compose ruler, section strip and track grid of a grown song: columns, growth views, one scale for seeking and keys.

### Modified Capabilities

- None.

## Impact

- `src/main.js` (arranger rendering, ruler geometry, seek, keys, highlights, section offsets), `src/style.css`, `src/i18n.js`, `src/guide.js` (Compose card), `docs/knowledge/`, a new browser check `tools/check-timeline.cjs`.
