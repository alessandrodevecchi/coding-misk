## 0. Owner

- [ ] 0.1 Owner answers the questions (default per profile, kinds, muted lines, videos and fragments, a live-only wave) and says go. Verify: answers recorded in the DEVLOG; design D2, D6 and D7 updated

## 1. Line of a hap and drawing (no browser)

- [ ] 1.1 Pure module (for example `src/live/code-visuals.js`): `blocksOf(code)` (pattern blocks with their text key and line range), `lineOfHap(hap, blocks)` (first location), `drawLineVisual(ctx, area, kind, haps, cyc, style)` with no wall time. Verify: new `npm run check:code-visuals` with cases for a plain line, the hidden mixer tail, compact code, a muted line, a constant used by two lines, a hap without location
- [ ] 1.2 Same frame twice: the check draws a strip into an offscreen canvas stub for the same haps and cycle twice and compares the calls. Verify: `check:code-visuals`

## 2. Control

- [ ] 2.1 `codeVisuals` in `CONTROLS`, `PROFILES` (all `off`), `DISPLAY_CONTROLS`, not in `CODE_CONTROLS`; select in Compose's Code options and in the radio Custom profile; texts in English and Italian; Guide card line. Verify: `check:profiles`, `check:radio-profiles`, `check:guide`
- [ ] 2.2 The growth key, the growth store hash and the shape search do not read it. Verify: a case in `check:profiles` (same growth key with `off` and `notes`)

## 3. Panel layer

- [ ] 3.1 One canvas over `#edhost`, placed from CodeMirror's coordinates, redrawn on scroll, resize, document change and at most 30 frames a second; not created when `off`, stopped when the panel is collapsed or the tab hidden
- [ ] 3.2 Hap feed: query the scheduler's pattern around the cycle once per half cycle and after each evaluation, bucket by block key; blocks being typed lose their strip until evaluated
- [ ] 3.3 `notes` strip (D2) and `level` mark (D5); muted lines and lines typed ahead (D7). Verify: screenshots for the owner on luci-rosse (Classic) and kellerlicht (Live coder, hidden mixer, a line typed ahead) before tuning sizes

## 4. Videos and live output

- [ ] 4.1 `drawCode` draws the strips and marks beside the code it wraps, through `drawLineVisual`; session video, vertical fragments with code, live output. Verify: `check:video`, `check:clips`, `check:live`
- [ ] 4.2 Fast video: the render page returns note haps by line per segment; `feed.js` keeps them (`linesFrom`); `composeAt` draws them. Verify: `check:export`; `node tools/check-video.cjs` with `notes`

## 5. Regression and cost

- [ ] 5.1 Browser check `tools/check-code-visuals.cjs` (dev server on its own port): editor text identical at every typing frame with `off` and `notes` over 64 bars of a Live coder song; strip present on playing lines, absent on muted ones; hand-typed line gets its strip after evaluation; mean frame time under 1.5 ms on luci-rosse; a fast video bar against the live player
- [ ] 5.2 Unchanged: `check:code`, `check:live-code`, `check:mixer -- --full`, `check:functions`, `check:typing`, `check:strudel`, `check-compact-code.cjs`, `check:crescendo` (no fixture written), `check-startup.cjs`, `check-hand.cjs`

## 6. Docs

- [ ] 6.1 `docs/knowledge/visuals.md` (code visuals), `profiles.md` (`npm run knowledge`), `decisions.md` (Strudel widget calls not written: growth, mixer, checks, videos), `checks.md` (new checks), `docs/ARCHITECTURE.md` (Visuals, Video). Verify: `check:knowledge`
- [ ] 6.2 DEVLOG entry with the frame time measured and the screenshots shown to the owner
