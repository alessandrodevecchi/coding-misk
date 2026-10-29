Estimate: about 22 agent hours (design, Estimate), after `widgets-on-stage` phases 1 to 3. Phases 1 and 2 alone (1-bit, CRT, LED on every look) are about 7 hours.

## 0. Owner

- [x] 0.1 Owner answers the open questions in the design (filters or scenes, first renders, name, song field, videos, dither, hardware colours, WebGL, Terminal take and signature scene). Verify: answers in the design; proposal, spec and tasks updated
- [x] 0.2 `widgets-on-stage` phases 1 to 3 built (painters, feed, Monitor, Rullo). Verify: its checks pass
- [x] 0.3 Owner says go. Verify: answers and go in the DEVLOG

## 1. Pass pipeline (3 h)

- [ ] 1.1 `RENDERS` next to `LOOKS` (names in English and Italian, native flag, gain per look). Verify: `npm run knowledge`, `npm run check:knowledge`
- [ ] 1.2 Pass after the look and the flash in `paint`, cached canvases, theme colours read on a theme change. Verify: `node tools/screenshot-visual.cjs` before and after on every look with Normal, identical
- [ ] 1.3 Same input frame, same output, no state between frames. Verify: `check:render-styles` case

## 2. 1-bit, CRT, LED (4 h)

- [ ] 2.1 1-bit Bayer with black point and gain per look; CRT; LED. Verify: screenshots of every look in every render, shown to the owner
- [ ] 2.2 Light form and "On slow devices". Verify: browser check with the CPU slowed 4×

## 3. ASCII and Terminal as passes (4 h)

- [ ] 3.1 ASCII: glyph atlas per size and colour step, ramp, black point. Verify: screenshots; pass times within D9
- [ ] 3.2 Terminal on looks without native widgets: half-block truecolour cells (one downscale, one upscale), stepped colours, amber ramp in hardware, tab bar, scope and spectrum panes, status bar. Verify: screenshots of every look in neon and hardware; pass time within D9

## 4. Native glyph painters (5 h)

- [ ] 4.1 Cell target in the painters module and ASCII forms of scope, spectrum, pianoroll, punchcard, spiral, pitchwheel, frame, name, level, dimmed panels. Verify: `check:render-styles` (same grid for the same time), screenshots of Monitor and Rullo
- [ ] 4.2 Terminal forms: rounded titled panels, level line, braille scope drawn as dots, eighth-block spectrum, half-block piano roll, dot punchcard, header and footer, both palettes. Verify: screenshots of Monitor and Rullo in neon and hardware against `terminale-a-*`
- [ ] 4.3 Layer drawn natively after the pass. Verify: screenshot of the strip over Tramonto in ASCII

## 5. Settings (2.5 h)

- [ ] 5.1 Render menu next to the look menu, video and fragments setting, slow devices, saved, backup, reset. Verify: `check-settings.cjs`, `check-backup.mjs`
- [ ] 5.2 Texts in English and Italian, Guide line in the `visuals` card. Verify: `npm run check:guide`

## 7. The "Claude" look (5 h)

- [ ] 7.1 `claude` in `LOOKS` (the same name in every language), drawn from the stage feed with the Terminal grid: header card, what enters and what comes next, large pane and small panes, prompt box with the typed line and cursor, status and mode lines, both themes. Verify: `check:render-styles` (same frame for the same time), screenshots in neon and hardware
- [ ] 7.2 The renders over it (Terminal as it is, ASCII glyphs, passes for the others), fast video and fragments. Verify: screenshots, fast video twice gives the same frames

## 6. Checks and docs (3.5 h)

- [ ] 6.1 `npm run check:render-styles` (no browser) and a browser check with pass times (budget of D9) and screenshots. Verify: both pass; times in the DEVLOG
- [ ] 6.2 `check:video`, `check:clips`, `check:live`, `check:export`, `node tools/check-video.cjs`, `node tools/check-clips.cjs`, `node tools/check-live.cjs`, `node tools/check-export.cjs` with a render; fast video twice gives the same frames; the code panel identical to Normal; export time within 15%. Verify: all pass
- [ ] 6.3 With Normal: `npm run check:code`, level snapshots and fixtures unchanged
- [ ] 6.4 Knowledge base (`visuals.md`, `decisions.md`, `settings.md`), `docs/DESIGN-SYSTEM.md`, DEVLOG with screenshots shown to the owner. Verify: `npm run check:knowledge`
