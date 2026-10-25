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

## Follow-up (owner decisions, 2026-10-25)

After the first round (`SHAPES_VERSION` 4) kellerlicht grows to 20:27 (14:04 before), because its growth waits for the typing of long literal sweep lines. The owner decided:

- **Two advanced settings.** "Try all growth shapes" (off by default; when on, every candidate is measured, whatever their number: 28 today) and "Random order" (on by default: the seeded weighted order of D2; off: the fixed order used before `SHAPES_VERSION` 4). Like "Growth shapes tried": hints in English and Italian, default values not stored, part of the Compose growth key; the radio and the checks use the defaults.
- **Long songs.** When the whole grown song (growth and written part) with the kept shape is longer than 15 minutes, every candidate is measured and the one that gives the shortest whole song among those that meet the target is kept, in Compose and in the radio.
- **Long literal lists.** When a Live coder step would type a mini-notation list of 16 or more values that move linearly per bar (a written sweep), it writes a short ramp with Strudel signals instead, stepped per bar so each bar keeps its value. Other long lists keep the human-typing strategies.
- **Questions to answer.** Whether kellerlicht's long sweep line already existed at v0.5.0; whether `tools/check-growth-background.cjs` ("kellerlicht: Play during the growth shows the mark on Play") or the app is wrong; a fair rewrite of check 5.5 of `tools/check-radio-profiles.mjs` over more songs and curve points.

Goal: kellerlicht back near 14:03 or shorter, and fewer rushed radio growth steps (132 before this change, 168 after its first round).

Impact of the follow-up: `SHAPES_VERSION` 5 (Live coder fixtures, `npm run durations`, radio growth fixtures; the Crescendo fixtures do not move); `src/song/crescendo.js`; a new pure ramp writer used by `src/live/live-code.js` for Live coder growths only (Classic and Crescendo code unchanged, the `check:code` snapshots do not move); Settings, i18n, Guide, knowledge notes; `tools/check-growth-background.cjs` or the app; `tools/check-radio-profiles.mjs`.
