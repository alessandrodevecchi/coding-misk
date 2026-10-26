# Proposal

## Why

In Compose, hearing a new pattern of a track is slow (#84, owner notes fx4). Today the user solos the track, moves to a point where it plays, plays the song and picks the pattern from the row above; or presses the listen button next to the preset menu, which stops the song and opens the pattern in the Groove Lab as an unsaved pattern. The owner wants a quick play and stop for the pattern being made, which leaves the song alone: it does not replace what the bottom player bar plays, and it can sound while the song plays, like a small second player.

The owner also asked (ss6) for the current bar and the total bars in the player bar. Today it shows only seconds. In the Live coder and Crescendo profiles the song that plays (the growth and then the written part) is longer than the written song, so bars are the clearest way to know where one is.

## What Changes

- **Pattern preview in Compose.** A play and stop button next to the listen button by the preset (or groove) menu of a track. It plays the pattern selected in the track panel in a loop, with the track's sound and settings and the harmony of the selected section.
  - It never changes what the player bar plays, shows or controls: the bar's title, position, play, pause and stop stay with the song.
  - While the song plays, the preview starts at the song's next bar, follows the song's tempo, and lines up with the song's bars.
  - While the song is stopped, the preview plays alone at the selected section's tempo.
  - One preview at a time. It follows edits of the pattern from the next bar. It stops with its own button, when another song opens, or when the user leaves Compose.
- **Two named rows of patterns in the track panel.** The row that today reads "Pattern" is split in two:
  - The track's patterns, renamed **"Pattern del brano" / "Song patterns"**.
  - The creation tools (New, Save as pattern, Compose a part, number, Energy, Keep rhythm, Keep notes), under **"Crea pattern" / "Make patterns"**.
  - The other names, with the reasons for the choice, are in `design.md` (D6).
- **Bar counter in the player bar.** On the right of the title line: `bar 101 / 180`, with the word "bar" in every language. The count runs over the song as it plays: in Live coder and Crescendo it counts the growth and then the written part, so the total is the grown length. In the radio it replaces today's "battuta n di total" / "bar n of total" for the song on air. The time in seconds stays.
- **Not in this change (later, lower priority).** In Live coder and Crescendo, a click on a point of the Compose timeline jumps too far ahead: the timeline does not follow the grown song. The change records it as a follow-up and makes no fix (design D9).

## Capabilities

### New Capabilities

- `app/pattern-preview`: the second, independent player for the pattern being made in Compose: where its button is, what it plays, how it lines up with the song or plays alone, level and output, when it stops. It also covers the two named pattern rows of the track panel.

### Modified Capabilities

- `app/player-bar`: adds the bar counter requirement. The capability comes from the `player-bar` change, which is not archived yet (no `openspec/specs/app/player-bar/` exists), so the delta only ADDs a requirement and changes none of the existing ones.

## Impact

- `src/main.js`: track panel markup (`panelHtml`, the pattern rows and the preset row), a preview controller next to the transport, the player bar position (`renderPlayerBar`).
- New module `src/player/preview.js` (pure parts testable in Node): builds the preview expression from the loop song of `src/library/patterns.js` (`loopSong`), and runs a second Strudel scheduler on the shared AudioContext.
- `index.html`, `src/style.css` (both themes): bar counter slot, preview button state.
- `src/i18n.js` (both languages), `src/guide.js` (Compose card), `docs/knowledge/patterns.md`, `docs/knowledge/glossary.md`, `docs/ARCHITECTURE.md`.
- Checks: a new browser check `tools/check-preview.cjs`. `tools/check-player.cjs`, `tools/check-radio.cjs` and `tools/check-patterns.cjs` are updated where they read the position text or the pattern rows.
- No change to the song format, the compiler, presets, the director or the growth: no level snapshots, fixtures or version bumps.
