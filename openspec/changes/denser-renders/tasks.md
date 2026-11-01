## 1. Measure before (about 1 h)

- [x] 1.1 `tools/measure-render-density.cjs` (D7): outputs, renders, table, crops; run it on `develop` before any code change and paste the "before" table into `design.md`; save the crops in the owner's test folder.
- [x] 1.2 Record whether the automatic light form switches on at full screen (ratio 2) and after how many seconds; note it in the table.

## 2. Density rules (about 2.5 h)

- [x] 2.1 `passSizes` takes the logical short side and the ratio (D1) and applies the LED (D2), 1-bit (D4) and Terminal (D5) rules; verify in Node with `npm run check:render-styles`, extended with the expected rows and cells per output from the D2 to D5 numbers.
- [x] 2.2 ASCII drawn a row at a time (D3), the font fitted to the cell width; verify in Node with a recording context that a row is one `fillText` and in the browser that the row's width equals `cols × cellW` within one pixel.
- [x] 2.3 Glyph Monitor and Roll: `rowsFor` from the short side with the 12-pixel floor (D5); verify the panels' names stay whole in the native glyph pictures of `check-render-styles.cjs`.
- [x] 2.4 CRT spacing in logical pixels (D6); verify the line count over the height at ratio 1 and 2 in Node.
- [x] 2.5 Same frame alone and in a sequence, stage and fast video at the same logical size: the existing determinism checks still pass.

## 3. Light form (about 1 h)

- [x] 3.1 Light form × 1.5 clamped to the render's limit (D6); verify in Node.
- [x] 3.2 The mark and tooltip in the Render menu while the automatic light form is on, English and Italian, a Guide line in the visuals card; verify with the CPU slowed 4× in `check-render-styles.cjs`.

## 4. Density setting (about 1.5 h)

- [x] 4.1 `src/visuals/density.js`: the rules of D2 to D6 and D8 as pure functions of `(W, H, dpr, density, light)` (D9), used by the passes and the glyph forms; verify in Node the Coarse, Normal and Fine sizes per output and the floors.
- [x] 4.2 Settings → Look: the "Render density" row after "Render on slow devices" (`coding-misk-render-density`, Normal not stored), help text in English and Italian; the stage, the session video, the fast video, the fragments and the live output read it; Video and Fragments Render hints name it; verify with `tools/check-settings.cjs` and `tools/check-render-styles.cjs` (the setting saved, the stage and a fast video frame at the same logical size with the same rows at Fine).
- [x] 4.3 A change of render, look or Density clears the automatic light form; verify in the browser check.
- [x] 4.4 Guide line (visuals card) and knowledge note for Density, English and Italian.

## 5. Measure after and close (about 1.5 h)

- [x] 5.1 Run `tools/measure-render-density.cjs` again; paste the "after" table next to the "before" one; crops in the owner's test folder, each render at Coarse, Normal and Fine at full screen.
- [x] 5.2 Run `tools/check-render-styles.cjs` (budget at 1080p, stage, fast video against Normal); if a median is over budget, tune the limits (Risks) and rerun only that render.
- [x] 5.3 `npx vite build`, `check:guide`, `npm run knowledge`, `check:knowledge`; DEVLOG entry in Italian with the two tables.

Total: about 7.5 agent hours.
