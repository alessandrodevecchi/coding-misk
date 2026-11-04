# Design

## Context

Two invented-style paths exist today (invented-styles D8, D9, D11):

- **Invent die (trial):** `startTrial` / `applyTrial` in `src/radio/song-controls.js` put the recipe in `options.state.tempStyle`. `styleChips` renders `trialChip` (name, "on trial", genre, Keep `data-trial-keep`, Again, drop ×) and `trialHint` (description, what × gives back). `keepTrial` calls `ctx.keepStyle(recipe)` (`main.js` `keepStyle` → `stylesTab.keepInvented`) and swaps the id in `options.state.styles`.
- **Compilation (`invented: true` in the setup):** `segmentStyle` in `src/endless/compilation.js` makes a style per segment. It is not in `options.state`; it travels as `seg.style` and the director adds it as an extra style. `renderNow` shows it only in `.comp-tag` as `<button data-comp-keep-style>Keep NAME · invented</button>`, and only while the style is not yet among `recipes`. The handler (`radio.js` ~1451) calls `keepStyle(item.comp.style)` and re-renders; it never touches `options.state`.

With the compilation on, the whole STYLES block is greyed (`set-aside`, hint `compAside`) and shows the user's chosen styles, never the invented one.

## Goals / Non-Goals

**Goals:** same chip and hint in both places, explicit Keep, one click works, no behavior change when the compilation is off.

**Non-Goals:** Again and × for a compilation style (the compilation owns the choice); editing the style; changing how the compilation invents; the Styles tab.

## Decisions

- **D1 One renderer.** `trialChip` and `trialHint` take `{ style, on, actions }` instead of reading `state.tempStyle`. The Invent call sites pass the trial style with Keep, Again and ×; the compilation call sites pass the segment style with Keep only. Same markup and CSS classes (`.trial-row`, `.trial-style`), so the look cannot drift.
- **D2 Where the compilation chip shows.** In Now playing it replaces the small `comp-tag` Keep chip with the shared chip and hint, shown while the on-air song's `item.comp.style` exists. In the STYLES block it is a read-only row above the (greyed) style chips, from the same on-air item: it shows when the on-air item has `comp.style`. The name part is not a toggle (the compilation, not the listener, picks styles while it is on).
- **D3 Keep is one function.** Both Keep buttons in the compilation case use the existing handler path: `keepStyle(recipe)` and the toast `inventKept`. After Keep, `recipes` contains the style (as a user style), so the chip disappears from both places on the next render; the Keep for an already-kept style is hidden as today (`!recipes.some(...)`). The Invent trial Keep stays `keepTrial` (it also rewrites `options.state.styles`, which the compilation case has no need for).
- **D4 The double click.** The only handler is a plain `click` on `[data-comp-keep-style]`; there is no `dblclick` code. The probable cause is the 250 ms `renderNow` timer (radio.js ~443) rebuilding `#radio-now` between pointer down and up, so the click never fires; the second click of a double click lands in a quiet moment. Recommendation: replace the double click (it was never a feature) with a single click that works. Fix by acting on `pointerdown` for this button, or by skipping the card rebuild while the pointer is down on it; the plan picks the smaller one after reproducing it in the browser (task 1.1). No double-click handling is added or kept.
- **D5 Labels.** The chip reads "invented" (`inventBadgeShort`) instead of "on trial" for the compilation case, because nothing is on trial; the Keep tooltip stays `inventKeepHint`. Strings reused from `src/i18n.js`; at most one new key for the STYLES row note.
- **D6 Next song, other style.** The chips are derived from the on-air item on each render, so no state is kept: when the next song has another compilation style, both chips change; when it has none (or the user's style), both disappear.

## Risks / Trade-offs

- The STYLES block is a greyed `set-aside` area; the extra row must stay readable there. Put it outside the greyed `div`, under the label, or keep it inside with full opacity.
- Re-rendering on a 250 ms timer is not touched for other controls; only the Keep button gets the fix, to avoid a wider change.
