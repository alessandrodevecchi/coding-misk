## Context

The passes live in `src/visuals/render-styles.js` (`passSizes`, `createRenderer().apply`). They work on the canvas in device pixels (`c.width`, `c.height`). Logical sizes: the stage is its CSS size with `dpr = min(devicePixelRatio, 2)`; a video frame is always 720 logical pixels high (`H = 720`, `dpr = target.h / 720`, so 1.5 at 1080p, and a 1080 × 1920 fragment is 405 × 720 logical at `dpr` 2.67).

### What scales with what today

| Render                                   | Today's rule (`passSizes`)                                                                                   | Light form           | Scales with                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------- |
| 1-bit                                    | work picture = device size / 3: dot 3 device px                                                              | / 6: dot 6 device px | device pixels (finer on a ratio-2 screen, coarser at ratio 1) |
| LED                                      | 80 rows, pitch = device height / 80, dot radius 0.38 pitch                                                   | 40 rows              | output height: the dot grows with the screen                  |
| ASCII                                    | 40 rows, cell height = device height / 40, width = height / 1.9; one `drawImage` per cell from a glyph atlas | 20 rows              | output height                                                 |
| Terminal                                 | 45 rows on the logical grid (`gridOf`), cell width = height / 2                                              | 30 rows              | output height                                                 |
| Glyph Monitor and Roll (ASCII, Terminal) | `rowsFor(H) = clamp(H / 20, 18, 40)` logical                                                                 | none                 | height up to 800 logical px, then fixed at 40 rows            |
| CRT                                      | bloom at 1/8; grille one device column per colour; a scanline every 3 device px                              | none                 | device pixels                                                 |

### Today's numbers (computed from the code)

| Output                                         | Logical short side | LED pitch                  | ASCII cell height      | 1-bit dot              | Terminal cell height |
| ---------------------------------------------- | ------------------ | -------------------------- | ---------------------- | ---------------------- | -------------------- |
| Stage in a window, 1100 × 460 logical, ratio 2 | 460                | 5.75 logical (11.5 device) | 11.5 logical           | 1.5 logical            | 10.2 logical         |
| Stage full screen, 1920 × 1080, ratio 2        | 1080               | 13.5 logical (27 device)   | 27 logical             | 1.5 logical            | 24 logical           |
| Same with the light form                       | 1080               | 27 logical                 | 54 logical             | 3 logical              | 36 logical           |
| Stage full screen, ratio 1                     | 1080               | 13.5 logical               | 27 logical             | 3 logical              | 24 logical           |
| Video 1080p (1280 × 720 logical)               | 720                | 9 logical (13.5 device)    | 18 logical (27 device) | 2 logical (3 device)   | 16 logical           |
| Fragment 1080 × 1920 (405 × 720 logical)       | 405                | 9 logical (24 device)      | 18 logical (48 device) | 1.1 logical (3 device) | 16 logical           |

The full-screen stage is where the owner saw huge dots: LED 13.5 logical pixels, or 27 with the light form. The light form is likely there: a full-screen pass on a ratio-2 display reads a picture four times larger than in the window, so it is the first to pass 8 ms for 30 frames. The measurements (D7) confirm or rule this out.

## Goals / Non-Goals

**Goals:** cells that stay about the same size on screen at any output size; a light form that never makes the picture coarse; the existing budget kept; measurements before and after.

**Non-Goals:** new renders or colours; changing what a render looks like at a small stage (the window stays close to today).

## Decisions

### D1. The rule: the short side in logical pixels, with limits

Each render takes `S = min(W, H)` in logical pixels and a cell size `clamp(S / n, min, max)`. The short side, not the height: a 9:16 fragment would otherwise get cells 1.8 times larger than a landscape video of the same file width. Logical, not device pixels: the same picture on a ratio-1 and a ratio-2 screen, and the stage and a video of the same logical size, get the same grid (the "same frame in every output" rule of `widget-render-styles`).

| Option                                         | Notes                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **A (chosen)** short side, logical px, clamped | Same grid on the stage and in videos; cells never grow past `max` on big screens; a floor keeps small stages readable        |
| B a fixed cell size in device pixels           | Full screen looks right, but a ratio-1 screen and a ratio-2 screen give different pictures, and videos differ from the stage |
| C a fixed row count (today)                    | Cells grow with the screen: the problem the owner saw                                                                        |

### D2. LED

`pitch = clamp(S / 150, 2.5, 6)` logical, and at least 4 device pixels so dots stay round. Full screen 1080: 6 logical (180 rows, 13.5 today). Window 460: 3.1 logical (150 rows, 80 today). Video 1080p: 4.8 logical = 7.2 device (150 rows, 13.5 device today). Fragment 9:16: 2.7 logical = 7.2 device, the same dots as the landscape video. The work picture stays small (at most 320 × 180 at full screen); the dot mask is made once per size, so the cost hardly changes.

### D3. ASCII: more rows, drawn a row at a time

`cell height = clamp(S / 80, 7, 14)` logical, width = height / 1.9. Full screen 1080: 13.5 logical (80 rows, 40 today), window 460: 7 logical (65 rows), video 1080p: 9 logical (80 rows). At full screen that is about 270 × 80 = 21,600 cells, four times today. One `drawImage` per cell would break the budget, so each row is drawn as one `fillText` of its glyphs in white with the font sized so its advance equals the cell width (JetBrains Mono's advance is 0.6 em), then the colour picture is multiplied over it, as today.

| Option                                               | Notes                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| **A (chosen)** one `fillText` per row                | About 80 calls a frame; the glyph shapes are the font's, as in the atlas          |
| B keep the atlas, one `drawImage` per cell           | 21,600 calls a frame: measured cost likely above 4 ms                             |
| C a glyph texture blitted in a pixel loop on the CPU | Fast, but a second glyph drawing path to keep identical to the native glyph looks |

If the font's advance does not match the cell to the pixel, `letterSpacing` corrects it; the check compares the row's measured width with `cols × cellW`.

### D4. 1-bit

The dot is 2 device pixels; when the work picture would be larger than 1.2 million pixels the dot grows to `sqrt(device pixels / 1.2 M)`. Video 1080p: 2 device (3 today), work 960 × 540. Full screen at ratio 1: 2 logical (3 today). Full screen at ratio 2: 2.63 device = 1.3 logical (1.5 today). The 8 × 8 Bayer matrix stays: a smaller matrix would show fewer grey steps.

### D5. Terminal and the glyph looks

Terminal: `rows = clamp(S / 16, 30, 70)`, text at least 12 logical pixels high. Full screen 1080: 67 rows (45 today), video 720: 45 rows (as today), window 460: 30 rows. Glyph Monitor and Roll: `rowsFor = clamp(S / 16, 18, 64)` with the same 12-pixel floor. The panes and the status bar keep their layout in cells, so they get more room for text, not bigger letters.

### D6. CRT and the light form

CRT: each grille colour column is `max(1, round(dpr / 1.5))` device pixels wide and a scanline comes every `max(2, round(2 × dpr))` device pixels: 2 logical pixels at ratio 1, 1.5 and 2 (today 3 device pixels: 3 logical at ratio 1, 1.5 at ratio 2, 2 in a 1080p video), so ratio 1, ratio 2 and a 1080p video have the same number of lines over the picture. The bloom stays at 1/8. Only the spacing changes; the look (colours, strength of the lines, vignette) stays (owner, 2026-10-31). CRT has no cells, so the Density setting (D8) does not change it.

Light form: cells × 1.5 (today × 2), clamped to the render's `max` (times the Density factor, D8); Terminal never below its smallest row count. While the automatic light form is on, the stage's Render menu shows a small drawn mark (no emoji) and a tooltip ("Light form: the render uses fewer cells because this device is slow" / «Forma leggera: il render usa meno celle perché il dispositivo è lento»). `reset()` clears it when the render, the look or the Density changes (today nothing calls `reset()`, so a light form switched on stayed until a reload). The Settings row "Render on slow devices" (Never light) still turns it off.

### D8. Density setting: Coarse, Normal, Fine

One value for every screen and output, `coding-misk-render-density` (`coarse`, `normal`, `fine`; Normal is not stored, so the key is absent by default and the backup carries it when set). The stage, the session video, the fast video, the fragments and the live output read the same value: a video then looks like the stage it was chosen on, and the "same frame in every output" rule holds. A per-screen value was rejected: the stage cannot tell a laptop screen from an external one reliably (the window moves between them), and a video has no screen.

| Density | Factor on the cell | LED pitch at full screen 1080 | ASCII cell at full screen | Terminal rows at full screen |
| ------- | ------------------ | ----------------------------- | ------------------------- | ---------------------------- |
| Coarse  | 1.4                | 8.4 logical                   | 18.9 logical              | 48                           |
| Normal  | 1                  | 6 logical (the rule)          | 13.5 logical              | 67                           |
| Fine    | 0.7                | 4.2 logical                   | 9.5 logical               | 90 (the 12-pixel floor)      |

The factor multiplies the Normal cell after the rule's clamp (`cell = clamp(S / n, min, max) × f`), so the limits move with it (`min × f`, `max × f`). Applying it before the same clamp was rejected: a full-screen stage sits at the rule's `max`, so Coarse would change nothing exactly where the owner looks, and Fine nothing on a small stage. 1.4 and 0.7 are about one step of √2 each way (1.4 × 0.7 ≈ 1), large enough to see on a 1080 screen (LED 8.4 / 6 / 4.2) and small enough that Coarse stays below today's full-screen dots (13.5). The hard floors still hold after the factor: LED at least 4 device pixels, ASCII at least 5 logical pixels high, 1-bit at least 1 device pixel and within the 1.2 million pixel work picture (so Fine can be the same as Normal at a ratio-2 full screen), Terminal and glyph text at least 12 logical pixels high (so Fine stops at `H / 12` rows) and at least 18 rows. The light form (× 1.5) applies on top of the density.

Where it lives: Settings → Look, the row after "Render on slow devices" ("Render density" / «Densità del render»), with its help text in both languages (shown as the hint and the label's tooltip, `tools/check-settings.cjs`). Video and Fragments have no density of their own: they use this value, as they use the light form setting; their Render rows' hints say so. The Render menu on the stage stays one select.

### D9. Any picture source

The density rule and the CRT spacing take only the picture's size (logical width and height, device pixel ratio), never the look: the rules live in `src/visuals/density.js`, pure functions of `(W, H, dpr, density, light)`. The passes may later run on video pictures (owner, 2026-10-31: for example a video visual in Decode); such a source then gets the same cells for the same size with no change to the rules. No video work in this change.

### D7. Measurements

A script `tools/measure-render-density.cjs` (dev server) sets each output (window 1100 × 460 at ratio 2, full screen 1920 × 1080 at ratio 1 and 2, a 1080p fast video frame, a 1080 × 1920 fragment frame), plays 30 seconds of one song on Sunset and Stage with each render, and prints a table: cell or dot in device and logical pixels, rows × columns, median pass time, the light form's state, and saves a 400 × 400 crop at 100% for each. Run once on `develop` before any code change (the "before" table and crops) and once after; both tables go in `design.md` of this change and the crops in the owner's test folder.

## Measurements (D7)

`tools/measure-render-density.cjs` on 2026-11-01, headless Chrome on the owner's Mac (load average about 6 from other work), Tramonto playing luci-rosse live on the stage (30 s), the video outputs from 300 frames of a made-up feed. Cell: LED pitch, ASCII and Terminal cell height, 1-bit dot, CRT scanline period, in logical pixels. "Before" ran on `develop` (2e55193) before any code change; full tables with Palco and every crop in the owner's test folder (`notes/prove-2026-11-01/render-density/`).

| Output | Render | Before: cell (logical px), rows, pass, light | After: cell, rows, pass, light |
| --- | --- | --- | --- |
| window @2 | bit | 3.01, 153 rows, 6.4 ms, on | 1, 460 rows, 5.3 ms, off |
| window @2 | crt | 1.5, 307 rows, 0.1 ms, off | 2, 230 rows, 0.1 ms, off |
| window @2 | led | 11.5, 40 rows, 4.9 ms, on | 3.07, 150 rows, 5.9 ms, off |
| window @2 | ascii | 11.5, 40 rows, 4.4 ms, off | 10.45, 44 rows, 5.4 ms, on |
| window @2 | terminal | 10.22, 45 rows, 5.8 ms, off | 15.33, 30 rows, 5.8 ms, off |
| full screen @1 | bit | 6, 180 rows, 10 ms, on | 2, 540 rows, 6.5 ms, off |
| full screen @1 | crt | 3, 360 rows, 0.1 ms, off | 2, 540 rows, 0.1 ms, off |
| full screen @1 | led | 27, 40 rows, 10.5 ms, on | 6, 180 rows, 4.4 ms, off |
| full screen @1 | ascii | 54, 20 rows, 9.6 ms, on | 14.03, 77 rows, 7.2 ms, on |
| full screen @1 | terminal | 36, 30 rows, 7.8 ms, on | 15.88, 68 rows, 4.3 ms, off |
| full screen @2 | bit | 3, 360 rows, 12.4 ms, on | 1.5, 720 rows, 8.6 ms, on |
| full screen @2 | crt | 1.5, 720 rows, 0.1 ms, off | 2, 540 rows, 0.1 ms, off |
| full screen @2 | led | 27, 40 rows, 11.2 ms, on | 6, 180 rows, 7.2 ms, off |
| full screen @2 | ascii | 54, 20 rows, 11 ms, on | 14.03, 77 rows, 9.6 ms, on |
| full screen @2 | terminal | 36, 30 rows, 10.6 ms, on | 15.88, 68 rows, 7.5 ms, off |
| video 1080p | bit | 2, 360 rows, 2.3 ms, — | 1.33, 540 rows, 3.6 ms, — |
| video 1080p | crt | 2, 360 rows, 0 ms, — | 2, 360 rows, 0 ms, — |
| video 1080p | led | 9, 80 rows, 1.3 ms, — | 4.8, 150 rows, 1.5 ms, — |
| video 1080p | ascii | 18, 40 rows, 1.8 ms, — | 9, 80 rows, 3.5 ms, — |
| video 1080p | terminal | 16, 45 rows, 1.6 ms, — | 16, 45 rows, 2.7 ms, — |
| fragment 9:16 | bit | 1.13, 640 rows, 2.7 ms, — | 0.75, 960 rows, 3.3 ms, — |
| fragment 9:16 | crt | 1.13, 640 rows, 0 ms, — | 1.88, 384 rows, 0 ms, — |
| fragment 9:16 | led | 9, 80 rows, 1.3 ms, — | 2.7, 267 rows, 1.5 ms, — |
| fragment 9:16 | ascii | 18, 40 rows, 1.3 ms, — | 6.99, 103 rows, 2.2 ms, — |
| fragment 9:16 | terminal | 16, 45 rows, 1.2 ms, — | 14.4, 50 rows, 1.7 ms, — |

Density at a full-screen stage, ratio 2 (after):

| Render | Coarse: cell, rows | Normal: cell, rows | Fine: cell, rows |
| --- | --- | --- | --- |
| bit | 2.1, 514 (light) | 1.5, 720 (light) | 1.32, 821 (light) |
| led | 8.37, 129 | 6, 180 | 4.2, 257 |
| ascii | 18.95, 57 | 14.03, 77 (light) | 9.82, 110 (light) |
| terminal | 22.04, 49 | 15.88, 68 | 14.4, 75 |

Findings:

- In headless Chrome the automatic light form switched on about 0.5 s after Play in almost every stage case before the change, so the full-screen "before" pictures are the light form (LED 40 rows of 27-pixel dots, ASCII 20 rows): the cause the owner saw. After, Tramonto stays in the normal form in LED, Terminal and CRT; ASCII and 1-bit still switch at full screen (after 1 to 2.5 s), now only 1.5 times coarser (1-bit 3 device pixels instead of 6, ASCII 77 rows instead of 20).
- Terminal in the window is coarser than before (30 rows instead of 45): before, its text was about 8.5 logical pixels high, below the 12-pixel floor of D5; 30 rows is the rule's smallest count and the floor allows 31. Fine stops at 31 rows there for the same reason.
- Palco's pass times include the look's own drawing (its glows are flushed when the pass reads the frame back), so Palco switches to the light form at once before and after; its times are not the pass alone.
- The pass times move by up to 2 times between runs on this machine; `tools/check-render-styles.cjs` on `develop` in the same session failed the 1080p budget for 1-bit (5.7 ms), LED (4.8), ASCII (6.3) and Terminal (4.8). After the change: 1-bit 3.9, LED 1.3, ASCII 4.1, Terminal 2.1, CRT 0.6 ms (only ASCII over 4 ms). 1-bit's work picture is 2.25 times larger; its loop now writes 32 bits a pixel, which keeps it within the budget.

## Risks / Trade-offs

- **Cost of ASCII and 1-bit:** more cells cost more. D3 keeps ASCII to about 80 draw calls; 1-bit's work picture can double. If a median goes above the budget, the first lever is the floor (`max` in D2 and D3, the 1.2 M cap in D4), not the light form.
- **Small text in Terminal:** more rows mean smaller letters on a small stage; the 12-pixel floor protects readability and caps the rows there.
- **Looks drawn for big cells:** Monitor's ASCII panels were laid out for 40 rows; with more rows their boxes keep proportions but hold more glyphs. The pictures in D7 show it.

## Open Questions

All resolved.

1. Density setting: resolved 2026-11-01 (owner, answers of 2026-10-31 and 2026-11-01): yes, Coarse / Normal / Fine, one value for all screens (D8).
2. Light form at full screen: resolved 2026-11-01: yes, gentler (× 1.5), with the drawn mark and tooltip in the Render menu and "Never light" to turn it off (D6), as recommended.
3. Other picture sources: resolved 2026-11-01: the density rule and the CRT spacing take the picture size, not the visual (D9); no video work now.
4. CRT: resolved 2026-11-01: only the spacing in logical pixels, the look stays (D6), as recommended.
