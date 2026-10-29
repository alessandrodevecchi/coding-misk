# Design

## Context

- `src/main.js`: `growth()` and `growBars()` read only `build.crescendo`; `arrSec` maps a played section to an arranger section; `sceneStart(i)` gives the played bar of a section (0 for the first, so Play starts from the top).
- The ruler (`rulerGeo`, `barToX`, `xToBar`) is piecewise linear over the section buttons of the strip and covers the written bars; seek adds `growBars()`.
- `compiled.meta.sections` are the played sections: growth sections (Crescendo, Live coder) or waypoint sections (`normal: "waypoints"` in Classic with the live build off), then the written sections, then an optional ending.
- `timelineShape(doc)` gives per track its absolute clips, silent spans (`off`) and step marks over the whole played song.
- Two arranger views: sections (`minmax(54px, Nfr)` columns, fit to width) and timeline (one lane per track, `minmax(0, Nfr)` columns, a minimum width of 10 px per bar).

## Goals / Non-Goals

**Goals:** one scale for every control of the Compose timeline; the growth visible and seekable; waypoint songs seek right; Classic songs unchanged.

**Non-Goals:** a read-only card with the track's code at a growth step (later); editing the growth; changes to the player bar or the song cards.

## Decisions

**D1. One played map.** `playMap()` reads `compiled.meta` and the arranger sections: `pre` (played sections before the written ones: `build.crescendo.sections`, or the extra sections of a waypoint song), `G` (bars before the written part), `W` (written bars), the ending (sections after the written ones) and the total. `growBars()`, `arrSec`, `sceneStart`, the ruler, the keys and the playing highlights read it. The map is cached per `compiled` object. Alternative: a mapping per caller (the cause of the waypoint bug). The song cards keep their own offset (the Crescendo growth), as their timeline is drawn from the library song.

**D2. Columns.** The strip and every track row share one grid template: track column, growth column (when `G > 0`), one column per written section, ending column (when there is one). The growth and ending columns are not `.arr-scene-btn` and have no `data-scene-i`, so section indexes, checks that count sections and `sel` stay on the written sections. Every column of the strip carries `data-col-start` and `data-col-bars` in played bars; the ruler geometry reads them.

**D3. Growth views.** A CSS variable sets the growth column: hidden 22 px, compact 160 px (96 px under 560 px). Open gives the growth `G fr` like the sections and sets a minimum width so the written part keeps the pixels per bar it has when fit to width (measured from the scroller width); in the timeline view, at least 10 px per bar as today. The toggle sits in the strip's corner, drawn as an SVG eye (closed, half-open, open); the view is stored in `coding-misk-growth-view` like the arranger view. Compact is the default.

**D4. Growth cells.** Each track row's growth cell draws the spans where the track plays (its clips in the growth minus its silent spans) and a tick at each of its steps (build marks and the bars where it comes in), positioned in percent of the growth. A click picks the track's step nearest to the click (the bar under the click when the track has none), seeks there and selects the track. The ending cell draws the same for the ending and seeks to its start.

**D5. One scale.** The ruler maps x to played bars over all columns, linear inside each column. Ticks: bar numbers of the played song in the written part and the ending, minutes and step ticks in the growth (none in the hidden tab). A click in the growth snaps to a step within 4 px. Keys: arrows one bar, Page Up and Page Down to the previous or next boundary (growth steps and section starts), Home 0, End the last bar of the played song. The knob, the fill and the time label read the played bar; the strip and grid playheads use the same columns.

**D6. Strip clicks.** The growth column seeks to bar 0. A written section seeks to its played start (`G` for the first one). `sceneStart(0)` stays 0 so Play and "Play from this section" with the first section start from the top, growth included.

## Risks

- Section indexes: every query by index uses `.arr-scene-btn` (written sections only) or `arrSec`, never a strip child index.
- A growth that arrives later re-renders the arranger: the compact column has a fixed width, so the written part does not move.
