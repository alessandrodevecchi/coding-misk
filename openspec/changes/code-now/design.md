## Context

The standard compiler (`compileSong`) writes, per track and section, layers gated by a section lane. Patterns are rotated by the section start so they line up with absolute bars. The compact views (`compile-compact.js`) start from that output. Crescendo songs have growth sections (one section repeated, held chord then progression) and the written sections after.

## Goals / Non-Goals

**Goals:** a view with only the present; the same events as the code per section; boundary edits that look prepared.

**Non-Goals:** new ways to write patterns (idiomatic-code); radio and songs in blocks.

## Decisions

### D1. One section, no lanes

The code at bar b is the standard layers of the section that holds b, with their gate removed: `.mask(sectionN).velocity(sectionN)` goes away, a partial clip keeps a short mask for its bars inside the section. Rotation by the section start stays, so the patterns line up with absolute bars and the sound is the same. Header: tempo, the current section's name and harmony as a comment.

### D2. Section boundaries are steps

A boundary becomes a step of the build: the code of the next section. It joins the Crescendo steps already there (a step on the same bar applies both). Seeking lands on the right section's code, as for any step.

### D3. Prepared lines

For lines that change at a boundary, the new line is typed muted (`_$:`) under the old one during the bars before the boundary (within the typing time of `live-typing`), then at the boundary the old line goes and the muted one loses its `_`. Lines that change little are edited in place (word-level typing).

### D4. Fades

A section with a fade-in keeps the fade as a gain lane on the layers of the fading bars (the only lane left), so the sound stays the same.

### D5. Settings

`coding-misk-live-code` gains `now`; for Crescendo songs `now` becomes the default. The future generator setting is separate (`idiomatic-code`).

## Risks / Trade-offs

- **[Many steps]** → one more step per section boundary; export renders one segment per code change, as today.
- **[Big boundary edits]** → prepared lines spread them over the bars before.
- **[Overlapping fades]** → where two sections sound together during a fade, both are kept for those bars.
