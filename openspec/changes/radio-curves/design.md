# Design

## Context

The director writes a song phrase by phrase toward one target per double phrase, `plan.plan[d].target` (energy). The energy measure is a weighted mix of track count, drum hits, filter and drive (`energyParts`). Steering (#24) rewrites the song from a boundary with `directSong(plan, opts, rng, comments, steer)`; a `curve` command sets one energy target. The radio draws the energy curve as one SVG with drag handles. Comments use the session option `talk` for the whole song.

## Goals / Non-Goals

**Goals:**
- Four extra lanes, readable at phone width, editable per part.
- The director keeps energy as its main goal and treats the other curves as soft targets.
- Deterministic rewrites and replay, as for the other commands.

**Non-Goals:**
- Session-wide curves or curves in the options panel.
- Extending a song, or a combined "soul" view (separate issues).
- Changing keys from the tension curve (the console keeps that command).

## Decisions

- **Targets in the plan.** Each double phrase gets `curves: { density, brightness, tension, voice }`, each `null` (auto) or a number. Density is stored as a track count, the others from 0 to 1. A `null` adds nothing to the scoring, so songs without edits are written exactly as today (same seeds give the same songs).
- **Measures next to energy.** `curveParts(state, ctx)` in `energy.js` returns density (count), brightness (the existing filter part), tension (drive part plus riser plus strong progression). The radio computes the measured values at the first boundary of each double phrase from the written song, the same way it shows energy today.
- **Scoring.** In the move loop, each set curve adds `-|measured - target|` to a candidate's score (density divided by the usual high track count), the same scale as the energy term. `want` grows by one when the set targets are more than 0.25 away in total. A density target below the usual count turns off the "add a track first" taste rule; one above it raises the track limit. Locks and the one-move-per-track rule are untouched.
- **Density maximum.** The lane shows "n of max", where max is the song's candidate tracks (riser left out), at most its track maximum.
- **Charge before a drop.** In the part before a drop, tension of 0.7 or more forces the riser at its first boundary, and adds darker and dirtier candidates with a bonus; on its last phrase a drum may be stripped. The existing drop landmark brings the drums back; a bonus for brighter moves at the drop releases the filters.
- **Strong progression.** A tension target of 0.7 or more on a non-landmark part gives it the lift chords. `sectionsOf` already splits by role; it will also split where the chords change, so the sections stay correct.
- **Voice.** The comment chance uses the part's voice target when set, else `talk`. A target of 0 skips comments in that part, including start and end.
- **Commands.** `{ kind: 'curve', curve, d, value }` (no `curve` means energy, so old recipes replay) and `{ kind: 'curve-reset', curve }`. Both go through the existing queue, the "same kind replaces pending" rule and the recipe.
- **UI.** One SVG per lane, 40 px high, under the energy curve; label and value on the left, reset button on the right. Dashed polyline for measured values, solid points for set targets, handles only on parts to come. Drag reuses the energy drag code with the lane as a parameter. Colours come from theme tokens, one per curve, in both themes.

## Risks / Trade-offs

- **Conflicting targets** (high energy, density 1) cannot both be met. Energy wins; the lane shows the measured value, so the listener sees what happened.
- **Card height** grows by about 200 px. On phones the lanes stay full width; if this proves too tall, lanes can fold behind a toggle later.
- **Tuning** of weights needs listening; the checks cover direction (sparser, darker, silent), not taste.
