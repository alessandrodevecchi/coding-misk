## Why

A reference video shows the live code drawn right on top of the visual: one band per line as wide as the text, the visual breathing through the empty lines, the line being typed in its own colour, the playing notes outlined, and two small widgets drawn inside the code (a drum step grid and an ASCII cloud of the notes with the chord name). The owner likes it: "very cool, gives a lot of flexibility, showing the code right on the visual; and gave us the idea of custom widgets". Today our code always sits in its own panel (the editor column in the page, a separate area in videos and fragments), and the only widgets in the code are Strudel's (`#79`).

## What Changes

- **"Code over" layout** (it: "Codice sopra"), made mainly for videos: the code drawn transparent over the scene, in 16:9 (session video, live output) and in 9:16 (fragments). One band per line, as wide as the text; empty lines without a band; comments and muted lines dimmed; long lines cut with `…` in this layout only (the editor and the other layouts keep the whole line). Code side (left, right, whole width) and width are settings; the default is the mockups' (code from 3.5% to 62% of the frame). Band colour and opacity come from the code theme, with Neon, Hardware (amber) and Light variants, readable over every look and render style, and a Low / Medium / High opacity setting. The render style never touches the code (as today).
- **The page:** an optional stage mode "Code over" (off by default; a button in the stage bar and in full screen) draws the code over the stage. The code editor stays open as today and is never replaced by it.
- **The live output:** a "Code over" view.
- **Captions and stage widgets in this layout:** in 16:9 the caption lane moves to the visual's side of the frame; in 9:16 it sits under the code area. The stage widget strip keeps only the side away from the code (16:9) and is off in 9:16; the full looks (Monitor, Rullo, Claude, Soul) stay available under the code.
- **Line being edited:** while the coder types a line, the line's band takes the theme's accent colour with a block cursor; it goes back to normal when the edit ends. Same in real time and in the fast video, from the typing plan.
- **Lit notes outlined or filled:** a code theme option "Lit notes" (it: "Note accese"): Outline (default, as Strudel draws them in the editor) or Filled. In videos and in "Code over" the lit notes follow the real hap locations instead of today's approximate box; which tokens light in "Code over" is a setting (default: the first mini-notation string of each line).
- **Custom code widgets:** a small app widget kind next to Strudel's, written in the code like the `#79` widgets (`._hitgrid()`, `._tonecloud()`), with parameters in the call and defaults from Settings; drawn from the code's haps (exact, deterministic, works in the fast video), never from audio; one painter used by the editor, the "Code over" layout, every video and the live output.
  - **Hit grid** (it: "Griglia colpi"): one row per drum sound and variant (and the bass's rhythm), 16 steps per bar in 4 beats, the current step column, played and coming hits, `battuta 13 · passo 16/16` (`bar 13 · step 16/16`).
  - **Tone cloud** (it: "Nuvola di note"): 12 note rows over time, a dense cloud of characters from a ramp (` .:-=+*#%@`) by each pitch class's energy, spread to neighbouring classes and overtones, the current chord's notes with inverted labels, the chord name below.
  - **Parameters** with defaults: steps per bar, bars shown, rows shown and their order, short or long names, extra melodic rows, style (blocks or characters), trail, size; for the tone cloud, source instruments, columns, bars shown, ramp, row order, normalisation, decay, spread, labels, chord name, size. Colours always from the code theme.
  - **Every render style:** blocks in Normal, CRT, LED (round cells) and 1-bit (two tones); characters in ASCII and Terminal.
  - The two widgets join the "Code widgets" option (`#79`): the hit grid is the drums' primary widget, the tone cloud the pad's and the voice's primary, and a secondary of bass, lead, arp and guitar; they count toward the maximum.
  - Code leaving the app (copy, Save as pattern, export) keeps the calls commented out in place (`/* ._hitgrid() */`), so it runs in another Strudel.
- **Test video and mockups** of the layout, the edited line, the outlined notes, both widgets with parameter variants and the settings, made with a throwaway prototype in `prototype/`.

Out of scope: widgets fed from audio analysis; turning an audio file into code; a staged syntax error, a moving `slider(…)` value and edits landing on the bar (a later "live typing" change); new stage looks; the two widgets as stage panels (a follow-up change); **labeled lines** (`kick: s(...)`), deferred to a separate change related to the code comment options.

## Capabilities

### New Capabilities

- `code-over-visual`: the "Code over" layout in videos, fragments, the live output and an optional stage mode of the page; bands, truncation, the edited line, lit notes outline or fill, captions and stage widgets in this layout.
- `custom-code-widgets`: app widgets written in the code and drawn from haps, with the hit grid and the tone cloud, their parameters, settings and render style forms.

### Modified Capabilities

None in `openspec/specs/`. The open changes `code-widgets`, `code-themes`, `widgets-on-stage`, `widget-render-styles`, `spoken-text-on-stage`, `fast-video` and `live-typing` are read by this change: it adds two widget kinds to the first, an option to the second, and new layouts next to the others.

## Impact

- **Code:** a new painter for the layout and the widgets (`src/video/code-over.js`, `src/widgets/app-widgets.js`, `src/widgets/hitgrid.js`, `src/widgets/tonecloud.js`), `src/video/video.js` and `src/video/layout.js` (layout `code-over`, fragment show `code-over`), `src/live/presets.js` (a live output view), `src/main.js` (stage mode, haps and code locations to the painter), `src/song/typing.js` and `src/video/feed.js` (the edited line), `src/render/page.js` (hap locations in the fast video), `src/code-themes/themes.js` (band, edit and lit-notes roles), `src/live/widgets.js` (two widget kinds), `src/captions/captions.js`, `src/visuals/widget-layer.js`, `src/settings/settings.js`, `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Checks:** `check:video`, `check:clips`, `check:live`, `check:export`, `check:code-themes`, `check:render-styles`, `check:captions` (browser), `check:code` (unchanged with widgets off), `check:typing`, `check:strudel` and `npm run catalog:strudel` (widget calls), `check:guide`, `check:knowledge`; a new `check:code-over` (no browser: geometry, truncation, widget data from haps) and `tools/check-code-over.cjs` (browser).
- **Docs:** `docs/knowledge/` (visuals, code widgets, settings, decisions, checks), `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, `docs/STRUDEL-FUNCTIONS.md`.
- **Versions:** none. With the layout unused and "Code widgets" off, generated code, fixtures and levels do not move.
