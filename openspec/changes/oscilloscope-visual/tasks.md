## 1. Prototype (about 3 h, this branch)

- [x] 1.1 Settings model `src/visuals/oscilloscope-rules.js`: overlays, modes, parameters with ranges and defaults, links, `oscSettings`, `paramNow`, `sweepWindow`, `resample`, `binOf` (D4 to D6).
- [x] 1.2 Drawing module `src/visuals/oscilloscope.js`: phosphor buffer, beam by brightness bins, glow, the six overlays cached (D3, D4).
- [x] 1.3 The look in `LOOKS` and `RENDER_GAIN`; `src/visuals.js` loads the module on first use, keeps the full mix, low and high buffers only while the look shows, passes bar, section and levels (D1, D2).
- [x] 1.4 Settings card with the overlay, the mode, Oversample and eight parameters with their links (D7); strings in English and Italian.
- [x] 1.5 `tools/check-oscilloscope.mjs` (no browser): defaults, clamping, links, hue turn, sweep trigger, resampling, brightness bins.
- [x] 1.6 Screenshots with three overlays in the owner's local notes.

## 2. After the owner's answers (about 3 h)

- [ ] 2.1 The open questions settled in the design.
- [ ] 2.2 Every parameter in the card (Line and Screen saturation, Smoothing, Trigger), with a short help line each.
- [x] 2.3 The look card in `src/guide.js` and the knowledge note (`docs/knowledge/`), `npm run knowledge`, `check:guide`, `check:knowledge`.
- [ ] 2.4 The fast video: the module loaded before the first frame, the feed's wave (or the full buffer, question 3); a fragment and a 1080p video checked against the stage.
  - [x] 2.4a The module loaded before the first frame (`visuals.loadLook`, awaited before the render when a part shows the look and before the frame where a section brings it); a fragment with no frame drawn black, in `tools/check-oscilloscope.cjs` (4 black frames without it).
  - [ ] 2.4b The feed's wave or the full buffer (question 3), and a 1080p video against the stage.
- [x] 2.5 Cost: the frame time at 1080p and 4K with each overlay and Glow 1, CPU slowed 4 times (design, Cost).
- [ ] 2.5b A smaller glow canvas on the software path (design, Cost), after the owner's look at the defaults.
- [x] 2.6 A browser check (`tools/check-oscilloscope.cjs`): the look in the menu, the module not loaded before, every overlay and both modes drawn, a slider and a link stored, a reload, a fragment's frames; AGENTS.md line and knowledge row. Render passes over the look are not checked yet.

## 3. Later

- [ ] 3.1 Phosphor as a Render for the other looks (D8), its own change.
