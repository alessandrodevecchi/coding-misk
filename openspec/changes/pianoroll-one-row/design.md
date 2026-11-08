# Design

## Context

See proposal.md for the motivation and specs/app/one-row-pianoroll/spec.md for the rules.

The pianoroll is drawn by three painters today:

- **Editor**: Strudel's own `pianoroll` (`@strudel/draw`), called through the `_pianoroll` wrapper in `src/live/widgets.js` (`installWidgets`). With "Widget notes: Always full" (the default since settings-polish) the wrapper hands Strudel a copy of the pattern with `gain` and `velocity` at 1. Strudel folds the rows on the values of the haps in its drawn window and sets `globalAlpha = velocity * gain`.
- **Stage panels** (Monitor, side panels, big screen): `paint.roll` in `src/visuals/widget-painters.js`, called by `drawWidget` in `src/visuals/widget-looks.js` with the section's pitches (`F.pitches(inst)`) and the stage notes (`[begin, end, pitch, level]`).
- **Fast video**: `paint.roll` again, from `fastWidgets` in `src/video/widget-frames.js`. The render page (`src/render/page.js`) sends back each note-widget line's notes by line key, with `level = gain * velocity`, up to two cycles past each rendered block.

Widget placement already draws per-section choices from the song seed: `rand(seed, 'cw-…', section, key)` with `seed = sg.id` and `section = sg.meta.sectionAt(bar)` (`main.js` around `plainMemory.place`). The stage knows `stage.seed()` and `stage.section(cyc)`; the fast video has `fv.seed` and `fv.meta`.

The 1 November prototype (`protoRollMode`, `protoRollPainter` in the uncommitted `proto/pianoroll-one-row` worktree) covered only the editor, read the row count from cycles 0 to 4 of the pattern and scaled bars against the loudest hit in the visible window.

## Goals / Non-Goals

**Goals:**

- One pure module of rules shared by the three painters: row count, equal volume, level scale, look of a section.
- The fast video gets the same answers as the editor without the pattern in hand.
- No layout jump while a line's code stays the same.

**Non-Goals:**

- Punchcards, spirals, pitchwheels, the Rullo look (many instruments in one roll).
- The ASCII and Terminal glyph forms of the stage (they keep today's drawing; see Open Questions).
- Any change to sound, generated code, growth, fixtures or placement of widgets.

## Decisions

### D1. Shared rules in `src/live/widgets.js`

Pure functions next to `widgetFor` and `targets`, importable in Node:

- `rollShape(notes, span)` → `{ rows, equal, top }` from `[begin, end, row, level]` notes: `rows` the distinct row values of audible hits (level above 0.001) with an onset in `span`; `equal` when `min ≥ 0.95 × max`; `top` the loudest level.
- `rollLook(S, seed, section, shape)` → `null` (two or more rows: today's drawing), `'thin'`, `'full'`, `'height'`, `'alpha'` or `'both'`.
- `rollLooks(S, n, seed)` → the looks of `n` sections for Random, built like `targets`: `rand(seed, 'cw-roll-look', k)` over the three looks, re-drawn when it would make three sections in a row the same.

All three painters call these with the same inputs, so they cannot drift. The editor turns haps into the same note tuples first.

Alternative considered: one function per painter (the prototype's way). Rejected: the video and the stage would drift from the editor.

### D2. Reference span per line and code version

The span is the first 8 cycles, cut at the section end, from the later of the section start and the bar the line's current code starts. Row count, equal volume and `top` are decided once for that span and hold until the section or the line's code changes.

- Editor: the wrapper runs at each evaluation; it queries the evaluated pattern (`queryArc`) over the span, with the section bounds and the current bar from a function the app sets on `globalThis.miskWidgets` (`rollContext(cycle)` → `{ section, start, end, seed }`).
- Fast video: the render page has the pattern of each segment; it computes `rollShape` per note-widget line over the same span (segment start as the code's start) and sends it back with the notes (`wshape[key]` per segment). `fastWidgets` reads it with the section and seed from `fv.meta` and `fv.seed`.
- Stage: per instrument and section, from the stage notes over the span from the section start (the stage store is filled ahead of the playhead; until the span is known the panel draws as today, then switches once).

Why not the visible window (the prototype, and Strudel's own fold)? The rows and the scale would change as hits scroll in and out: the widget would jump between half and full height inside a section, and bars would grow and shrink as a loud hit leaves the window. Why not the whole section? The fast video gets notes only two cycles past each block, and live coder lines change many times per section. Eight cycles covers the `<a b c d>` alternations the generator writes (at most eight bars) at a cost of one small query per evaluation.

### D3. Equal volume and scale

- Volume of a hit: `gain × velocity` as the line writes them (1 when absent), the same value Strudel's roll uses and the render page already sends. The hidden mixer's gain is not in it; it is the same factor for every hit of a line within a mixer step, so it cancels in the relative scale.
- Equal: quietest audible hit at least 95% of the loudest. A relative tolerance works the same on a hats line at gain 0.1 and on a kick at 1; 5% is below what reads as a difference in bar height at 36 px (under 2 px).
- Scale: `level = min(1, volume / top)` with `top` from D2, so bars keep their size within a code version and a louder hit outside the span is capped, not rescaled.
- Floors: height at least 20% of the box, opacity at least 0.2, so the quietest accent stays visible in light and dark themes. Both: height by level and opacity `0.35 + 0.65 × level`.

### D4. Looks

- Thin: the editor widget's canvas is half the row height (`max(12, round(row / 2))` px); ticks are `min(bar width − 2, 3)` device pixels wide and the full canvas height. On the stage the panel box stays; ticks take a band of half the box height, centred.
- Full: today's "Always full" bars.
- Height, Transparency, Both: bars of today's width (`(end − begin) / span × width`, minus 1 px gap), bottom aligned for Height and Both.
- Active hit in the accent colour, others in the muted colour, playhead in ink, as `paint.roll` does now.

### D5. Editor painter

For one-row rolls the wrapper does what the prototype did: it replaces Strudel's `pianoroll` call for that call only with `this.draw(oneRowPainter(...))`, with `lookbehind`/`lookahead` of 2 cycles, and sets the height before Strudel sizes the canvas. The painter draws through the shared `paint.roll` (D6) so the pixels match the stage and the video. "Always full" is skipped for one-row rolls (the real volume is needed); for other rolls the wrapper is unchanged.

### D6. `paint.roll` gains the looks

`roll(g, box, list, cyc, o)` takes `o.look` and `o.top`; without `o.look` it draws exactly as today, so every existing caller and picture stays the same. The stage and the fast video pass the look from D1.

### D7. Settings

Two keys in `CW_DEFAULTS`: `rollEqual: 'thin'` (`'thin' | 'full'`) and `rollVaried: 'random'` (`'height' | 'alpha' | 'both' | 'random'`). `widgetSettings` reads unknown or missing values as the defaults, so no `CW_VERSION` bump. Two segmented rows in the general section of the Code widgets card, below "Widget notes", with `cwRollEqual*`, `cwRollVaried*` strings and hints in `src/i18n.js`:

- en: "One-row pianoroll, equal volume" (Thin, Full), hint "A pianoroll with one sound and every hit as loud: Thin draws a low strip of small ticks, Full the tall blocks. The sound does not change."
- en: "One-row pianoroll, varying volume" (Height, Transparency, Both, Random), hint "A pianoroll with one sound and accents: louder hits taller, darker, or both. Random picks one per section from the song, the same in every replay and video."
- it: "Pianoroll a una riga, volume uguale" (Sottile, Pieno); "Pianoroll a una riga, volume che varia" (Altezza, Trasparenza, Entrambe, A caso), hints translated in the same style.

A change of either setting rebuilds `globalThis.miskWidgets` and re-evaluates nothing: the editor painter reads the settings each frame, the height applies at the next evaluation (see Risks).

## Risks / Trade-offs

- [The editor height changes only at an evaluation] → After a settings change the thin height applies at the next step or edit; the looks inside the canvas change at once. Acceptable; noted in the help text of the guide card.
- [Hand live coding: the code's start bar is the bar of the evaluation] → The span starts there, so a hand edit gets the same rules from that bar; the video of a hand session uses the segment start, which is the same bar.
- [Stage notes carry the mixer's gain, the editor's do not] → The relative scale cancels a constant factor; a mixer that changes the gain inside the span could make the stage differ. Check on the Live coder songs in task 4.2.
- [Strudel updates its `pianoroll`] → The one-row path no longer calls it; the two-or-more-rows path is untouched.
- [A line whose second sound appears after the span] → It is drawn on the one row until the code or section changes. Rare in generated code (eight cycles cover its alternations); accepted.

## Migration Plan

No data migration: the two settings default when absent. The prototype worktree `coding-misk-pianoroll` and branch `proto/pianoroll-one-row` are deleted after this change is merged (owner's call).

## Decided Questions

The owner approved every recommended option on 2026-11-08.

1. **Random look: one per section for all one-row rolls, or one per section and line?** Decided: one per section for all, so a section reads as one style; per line would mix heights and opacities side by side.
2. **Thin on the stage: smaller box or a band in the same box?** Decided: a centred band of half the panel's height inside the same panel, so the Monitor grid does not reflow (owner: keep it simple).
3. **ASCII and Terminal stage forms.** Decided: unchanged in this change; a follow-up can map height to half blocks if the owner wants it.
4. **Punchcard (when "Pianoroll or punchcard" is set to punchcard).** Decided: unchanged; dots of one row already read as a rhythm.
5. **Tolerance for equal volume.** Decided: 5% relative (D3). A stricter 1% would turn humanised velocities (±3%) into a tall varying roll.
6. **Reference span length.** Decided: 8 cycles (D2). 4 cycles (the prototype) misses `<…>` lists of eight bars; the whole section is not available to the fast video.

## Implementation Notes

- The stage has no line, only instruments: its span starts at the section's start, and an instrument with two lines of different sounds in a section (two rows) keeps the roll of before on its panel while the editor's line shows a one-row look.
- The editor's shape is read from the line's own pattern; the notes it draws, and the render page's notes and shapes, come from the code evaluated with the hidden mixer. A mixer lane that changes a line's velocity inside the span (a fade) can make the fast video's shape differ from the editor's. The fast video of luci-rosse (Classic, Live build on) matched the editor at every section checked.
- A Classic song without the Live build has one segment in the fast video, so its code (and its widgets) stay those of bar 0 for the whole video, as before this change; the one-row looks follow the line shown.
