# Proposal

Refs: coding-misk/#82

## Why

A pianoroll widget whose notes all fall on one row (one sound or one pitch, such as a hi-hat line) draws tall, identical blocks: the app forces "Widget notes: Always full", so accents are invisible and the widget takes a lot of height for little information. The owner compared four alternatives on 1 November (tall equal blocks, a low roll with thin ticks, bar height by volume, bar transparency by volume) and approved a combination.

## What Changes

- A pianoroll with exactly one row gets its own look; with two or more rows nothing changes.
- One row, equal volume on every hit: a low roll (half the row height) with thin, equal ticks. A setting can keep today's full blocks instead.
- One row, varying volume: a roll of normal height with bars of today's width, the volume shown as bar height, bar transparency, both, or a look chosen at random per section from the song seed (default), so replays and exports show the same.
- "Equal volume" is defined precisely (all audible hits within 5% of the loudest, over a fixed reference span of the line in the section), and heights and opacities are scaled against the loudest hit of that span.
- The one-row looks read the hits' real volume even when "Widget notes" is "Always full"; that setting keeps applying to rolls with two or more rows and to the other note widgets.
- Two new settings in the Code widgets card of Settings, with help text, in English and Italian: "One-row pianoroll, equal volume" (Thin / Full) and "One-row pianoroll, varying volume" (Height / Transparency / Both / Random).
- The same looks in the code editor, in the stage panels that draw a pianoroll (Monitor, side panels, big screen) and in every video (the fast video draws from its timeline, which carries what it needs).
- The 1 November prototype (uncommitted on `proto/pianoroll-one-row`) is replaced, not merged.

## Capabilities

### New Capabilities

- `app/one-row-pianoroll`: how a pianoroll widget with a single row shows the volume of its hits (thin ticks, height, transparency, both, random per section), its two settings, and that the editor, the stage panels and the videos agree.

### Modified Capabilities

(none: the code widgets requirements live in the unarchived `code-widgets` change; their behaviour for rolls with two or more rows does not change)

## Impact

- `src/live/widgets.js`: settings defaults and parsing, the shared one-row rules (row count, equal volume, scale, look per section), the `_pianoroll` wrapper and a one-row painter for the editor.
- `src/visuals/widget-painters.js`: `roll` gains the one-row looks, used by the stage (`src/visuals/widget-looks.js`) and the fast video (`src/video/widget-frames.js`).
- `src/render/page.js`, `src/main.js`: the fast video's per-line reference data and the section and seed it needs.
- `src/settings/settings.js`, `src/i18n.js`, `src/guide.js`, `docs/knowledge/`: settings rows, strings, guide card, knowledge notes.
- No change to sound, generated code, growth, fixtures or levels.
