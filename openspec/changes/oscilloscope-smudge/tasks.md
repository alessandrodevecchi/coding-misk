## 0. Preview (done, local notes)

- [x] 0.1 15 candidates (12 CC0, 3 drawn by us from references we may not ship) and 3 assembled examples over a drawn oscilloscope frame, with sources and licences, in `notes/oscilloscope-sbavature/` (preview, screenshots, `src/FONTI.md`).
- [ ] 0.2 The owner picks the elements (open question 1) and says go.

## 1. Textures (about 1 h)

- [ ] 1.1 `tools/make-glass-masks.sh`: the picked sources to 512 × 512 WebP masks (grey to alpha, levels per file), POSIX shell, ImageMagick.
- [ ] 1.2 `public/visuals/glass/`: the masks, `manifest.json` (file, role, source, URL, licence), `CREDITS.md` (D7).

## 2. Glass plan (about 1.5 h)

- [ ] 2.1 `glassPlan(seed, overlay)` in `oscilloscope-rules.js` (D3); Smudge and Beam scatter in `PARAMS` with defaults and links.
- [ ] 2.2 `check:oscilloscope`: the same plan for the same seed, different plans for three songs, elements inside the screen, prints near the edges, counts per role, the lighter plan of Real oscilloscope, the manifest and credits rules and the size budget (D7).

## 3. Drawing (about 2 h)

- [ ] 3.1 The mask canvas cached by size, overlay and seed; room light; beam scatter on the Glow work canvas (D4); the old smudge code removed.
- [ ] 3.2 The seed from `stage.seed()`; the glass rebuilt on a song change (D5).
- [ ] 3.3 Masks loaded with the look; `loadLook` awaits them for videos and fragments (D6).

## 4. Stage button and panel (about 2.5 h)

- [ ] 4.1 `src/visuals/osc-controls.js`: the shared rows and their events; the Settings card on it, every parameter shown (`SHOWN` removed).
- [ ] 4.2 `#osc-btn` in the toolbar, shown only with the look; the panel in `#stagewrap` (scroll, Escape, click outside, full screen, phone sheet, neon, hardware, light) (D8).
- [ ] 4.3 The card refreshed when the panel changes a value, and the other way.

## 5. Texts (about 0.5 h)

- [ ] 5.1 Strings in English and Italian (D9); `check:guide`.
- [ ] 5.2 Guide card (D10), `docs/knowledge/visuals.md`, `npm run knowledge`, `check:knowledge`; AGENTS.md check lines.

## 6. Checks and measures (about 2 h)

- [ ] 6.1 `tools/check-oscilloscope.cjs`: the button only with the look; the panel opens, a slider changes the stage on the next frame and the stored value, the card shows it; Escape and outside click; full screen; 400 px; Italian; the glass the same on two frames and in a fragment of the same song, different on another song; a fragment from a fresh page with the smudges on its first frame; the panel not in a fragment's frames.
- [ ] 6.2 Cost with Smudge and Beam scatter at 1080p and 4K (design of `oscilloscope-visual`, Cost); the every-other-frame fallback only if needed.
- [ ] 6.3 Screenshots of the three smudged overlays on three songs for the owner (local notes); DEVLOG.

Total: about 9.5 agent hours.
