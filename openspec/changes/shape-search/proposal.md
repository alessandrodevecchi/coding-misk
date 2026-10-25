## Why

A Live coder growth tries growth shapes until one has no rushed step, that is no step that a person could not type in the time before it. The count also includes the steps of the written part, after the growth: section changes and tracks entering with their first clip. No shape can change those steps, so the target is never reached. Every growth tries all 28 candidates (4.6 s on luci-rosse, 22.7 s on kellerlicht) and then keeps a fallback, judged partly on steps the shape does not decide. Adding shapes would make it slower still.

Some steps inside the growth also stay rushed with the free duration (settimo-cielo, bars 28 and 49), although the free duration should add the bars they need. Ideas plays 8:27 as Live coder where 5:54 was expected; the fallback shape may explain it.

## What Changes

- **Target on the growth only.** A shape is judged on the steps of the growth, the ones its opening, pace and development decide. The written part does not count.
- **Seeded order.** The shape drawn for the song (song, artist, style or seed) is tried first. The other candidates follow in an order drawn from the song's seed and weighted by the style's or artist's weights: the same song always gets the same shape, and the first candidates in the list are not always favoured.
- **Cap.** At most 8 shapes are tried, up to 16 when none of the first 8 meets the target; the first one that meets it is kept, else the one rushed least. The cap is an advanced setting with a hint. The time of a growth no longer grows with the number of shapes.
- **Free duration that reaches the target.** The free duration adds the bars a rushed growth step needs, or says why it cannot (counters).
- **Ideas length.** The 8:27 of Ideas as Live coder is explained and, when it comes from the fallback, fixed by this change.

## Capabilities

### New Capabilities

- `live-build/shape-search`: how a Live coder growth picks its shape.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Grown songs change:** Live coder songs in Compose and in the radio may pick another shape. `SHAPES_VERSION` goes up, the Live coder fixtures are rewritten, `npm run durations`; the Crescendo fixtures and `CRESCENDO_VERSION` must not move. If the endless fixtures move, `DIRECTOR_VERSION` goes up too.
- **Code:** `src/song/crescendo.js` (`crescendoSong`, `shapeCandidates`, the free-duration loop), the counters of `growth-in-background`.
- **Checks:** `check:crescendo -- --full`; `growth:probe` before and after on luci-rosse, settimo-cielo, kellerlicht, Ideas, switch-prima-luce; a check that a growth tries at most 8 shapes and that the same song gets the same shape.
- **Depends on:** `growth-in-background` (counters, shared measure).
