# Design

## Context

`steerCurve` draws the energy curve and `curveLanes` the four lanes, as SVG strings rebuilt four times a second by `renderNow` (skipped while dragging). The mockup (`#47`) was a standalone page; its drawing code is the reference.

## Goals / Non-Goals

**Goals:** the chosen look in both themes, no change to how curves behave, drag and checks keep working.

**Non-Goals:** animation of the set parts (the neon glow is static); the "soul" screen (`#46`).

## Decisions

- **One drawing function** for energy and lanes with options (height, grid, part names, charge zone), so both share squares, glow and shading.
- **Glow** with an SVG filter in user space units (a filter in bounding box units makes flat lines vanish). Colours from CSS custom properties, so the HW theme only overrides tokens: lane colours become amber, set colour warm white, position green, and the lanes sit in a `.screen` box.
- **Folded details** as a button with the summary; state in `localStorage` under `coding-misk-radio-details`, read in try/catch.
- **Hover** handled on the curve container with `pointermove` on pointers that hover; the box is a positioned HTML element outside the SVG so it is not redrawn by `renderNow` and works across all lanes. While dragging, the same box follows the dragged part.
- **Rendering cost:** unchanged, the curves were already rebuilt each tick; the hover box survives redraws because it lives outside the redrawn HTML.

## Risks / Trade-offs

- A hover box over a curve may hide points; it sits to the side of the line, flipping near the right edge.
