## Context

Layers come from `sceneLayers` (src/music.js): drums from step rows, bass/arp/hook/pad from presets or written notes, turned into note names per chord of the progression, rotated by the section start. `code-now` shows one section; the compact views join lines.

## Goals / Non-Goals

**Goals:** shorter patterns with the same events; small growth steps; the setting keeps the standard generator.

**Non-Goals:** changing what plays; the Switch styles (`switch-styles`), which use this generator.

## Decisions

### D1. Drums: shortest equal form

For a row of 16 steps, try in order: one hit repeated (`bd*4`, `hh*16`), an off-beat (`[~ hh]*4`), a short cell repeated (`[x ~ ~ x]*2` as `bd` names), then the full row. Rows of the same bank and gain may join with `,` in one `s()`. A form is used only if it gives the same onsets.

### D2. Notes: degrees and progression

When the progression's chords are all diatonic to the song's key and scale, a melodic part is written as degrees of its first chord plus `.add("<a b c d>")` with the chord roots as degrees, and `.scale("A:minor")`. Otherwise the standard note names stay. Repeats become `!`, holds `@`.

### D3. Equivalence by events

A browser check compares events per bar between both generators, with `note` names and `n` + `scale` turned into MIDI numbers. A pattern whose short form fails falls back to the standard form, at compile time, through a table of known safe forms (no evaluation in the compiler).

### D4. Setting

`coding-misk-live-gen`: `standard` (default), `idiomatic`. Shown in Compose next to the code view, for Crescendo songs first; extendable like `code-now`.

## Risks / Trade-offs

- **[Rounding of ramps and signals]** → only patterns are rewritten; gains, filters and signals keep their standard form.
- **[Scale spelling]** → degrees are compared as MIDI numbers, so `a#` and `bb` match.
