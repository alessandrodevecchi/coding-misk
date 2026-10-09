# Proposal

## Why

The radio shows and lets the listener drag one curve, the energy of the song on air (#24). Energy mixes several things (how many tracks, how bright, how dirty), so the listener cannot ask for "same energy, but sparser" or "build tension before the drop". Issue #40 asks for more curves on the same view, each readable and editable.

## What Changes

- **Four lanes under the energy lane** in the now playing card, one per curve, stacked, each with its own handles:
  - **Density:** how many tracks play, shown as "3 of 6".
  - **Brightness:** the mean filter of the melodic tracks.
  - **Tension:** drive and dirt, the riser, and the strong chord progression; a high value before a drop builds a charge that the drop releases.
  - **Voice:** how often the voice speaks in that part, from silent to almost every boundary.
- **Auto and set values:** a curve the listener has not touched is automatic and shows, dashed, what the song really does. Dragging a handle sets a target for that part (solid point). A reset button per lane makes the parts still to come automatic again.
- **The director follows the set targets** when it rewrites the song from the next boundary, as it does for the energy curve. Energy stays the main target; the other curves bend the choice of moves.
- **Song on air only:** curve edits change the song playing, never the whole session; the scope switch does not apply to them.
- **Replay:** curve edits are recorded like the other steering commands, so Replay reproduces them.
- **Out of scope:** extending the song on air (new issue); a single "soul of the song" screen in a radar or sonar style (new issue, later, built on these curves).

## Capabilities

### New Capabilities

- `endless/radio-curves`: the four curves, their measure, auto and set values, editing, reset, how the director follows them, the tension charge before a drop, replay.

### Modified Capabilities

None. The editable energy curve requirement lives in the open change `radio-steering` and stays as it is; the new lanes sit under it.

## Impact

- `src/endless/`: measures for density, brightness and tension next to energy; per-part targets in the plan; the director scores moves against set targets and builds the pre-drop charge; per-part voice frequency; steering commands for curve edits and resets.
- `src/radio/radio.js` (lanes, drag, reset, queue labels), `src/i18n.js`, `src/style.css` (both themes, phone width).
- Checks: `check:endless` for the director rules, `check-steering.cjs` for the lanes; docs `ENDLESS.md`, README, DEVLOG.
