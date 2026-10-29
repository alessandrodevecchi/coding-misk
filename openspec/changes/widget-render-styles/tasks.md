Estimate: about 21 agent hours (design, Estimate), after `widgets-on-stage` phases 1 to 3. Phases 1 and 2 alone (1-bit, CRT, LED on every look) are about 7 hours.

## 0. Owner

- [ ] 0.1 Owner answers the open questions in the design (filters or scenes, first renders, name, song field, videos, code panel, dither, hardware colours, WebGL, signature scenes). Verify: answers in the design; proposal, spec and tasks updated
- [ ] 0.2 `widgets-on-stage` phases 1 to 3 built (painters, feed, Monitor, Rullo). Verify: its checks pass
- [ ] 0.3 Owner says go. Verify: answers and go in the DEVLOG

## 1. Pass pipeline (3 h)

- [ ] 1.1 `RENDERS` next to `LOOKS` (names in English and Italian, native flag, gain per look). Verify: `npm run knowledge`, `npm run check:knowledge`
- [ ] 1.2 Pass after the look and the flash in `paint`, cached canvases, theme colours read on a theme change. Verify: `node tools/screenshot-visual.cjs` before and after on every look with Normal, identical
- [ ] 1.3 Same input frame, same output, no state between frames. Verify: `check:render-styles` case

## 2. 1-bit, CRT, LED (4 h)

- [ ] 2.1 1-bit Bayer with black point and gain per look; CRT; LED. Verify: screenshots of every look in every render, shown to the owner
- [ ] 2.2 Light form and "On slow devices". Verify: browser check with the CPU slowed 4×

## 3. ASCII and Terminal as passes (3 h)

- [ ] 3.1 Glyph atlas per size and colour step, ramp, black point; Terminal phosphor, bloom, scanlines, status line. Verify: screenshots; pass times within D9

## 4. Native glyph painters (4 h)

- [ ] 4.1 Glyph target in the painters module and glyph forms of scope, spectrum, pianoroll, punchcard, spiral, pitchwheel, frame, name, level, dimmed panels. Verify: `check:render-styles` (same grid for the same time), screenshots of Monitor and Rullo
- [ ] 4.2 Layer drawn natively after the pass. Verify: screenshot of the strip over Tramonto in ASCII

## 5. Code panel in videos (1 h)

- [ ] 5.1 `drawCode` with the Terminal and 1-bit text looks. Verify: `node tools/check-video.cjs` with the code layout in both renders; code readable in the screenshots

## 6. Settings (2.5 h)

- [ ] 6.1 Render menu next to the look menu, video and fragments setting, slow devices, saved, backup, reset. Verify: `check-settings.cjs`, `check-backup.mjs`
- [ ] 6.2 Texts in English and Italian, Guide line in the `visuals` card. Verify: `npm run check:guide`

## 7. Checks and docs (3.5 h)

- [ ] 7.1 `npm run check:render-styles` (no browser) and a browser check with pass times (budget of D9) and screenshots. Verify: both pass; times in the DEVLOG
- [ ] 7.2 `check:video`, `check:clips`, `check:live`, `check:export`, `node tools/check-video.cjs`, `node tools/check-clips.cjs`, `node tools/check-live.cjs`, `node tools/check-export.cjs` with a render; fast video twice gives the same frames; export time within 15%. Verify: all pass
- [ ] 7.3 With Normal: `npm run check:code`, level snapshots and fixtures unchanged
- [ ] 7.4 Knowledge base (`visuals.md`, `decisions.md`, `settings.md`), `docs/DESIGN-SYSTEM.md`, DEVLOG with screenshots shown to the owner. Verify: `npm run check:knowledge`
