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

CRT: each grille colour column is `max(1, round(dpr / 1.5))` device pixels wide and a scanline comes every `max(2, round(2 × dpr))` device pixels (3 logical pixels at every ratio, about 1.5 times today's spacing at ratio 2), so ratio 1, ratio 2 and a 1080p video have the same number of lines over the picture. The bloom stays at 1/8.

Light form: cells × 1.5 (today × 2), clamped to the render's `max`. While the automatic light form is on, the stage's Render menu shows a small drawn mark (no emoji) and a tooltip ("Light form: the render uses fewer cells because this device is slow" / «Forma leggera: il render usa meno celle perché il dispositivo è lento»). `reset()` (a new render or look) clears it, as today.

### D7. Measurements

A script `tools/measure-render-density.cjs` (dev server) sets each output (window 1100 × 460 at ratio 2, full screen 1920 × 1080 at ratio 1 and 2, a 1080p fast video frame, a 1080 × 1920 fragment frame), plays 30 seconds of one song on Sunset and Stage with each render, and prints a table: cell or dot in device and logical pixels, rows × columns, median pass time, the light form's state, and saves a 400 × 400 crop at 100% for each. Run once on `develop` before any code change (the "before" table and crops) and once after; both tables go in `design.md` of this change and the crops in the owner's test folder.

## Risks / Trade-offs

- **Cost of ASCII and 1-bit:** more cells cost more. D3 keeps ASCII to about 80 draw calls; 1-bit's work picture can double. If a median goes above the budget, the first lever is the floor (`max` in D2 and D3, the 1.2 M cap in D4), not the light form.
- **Small text in Terminal:** more rows mean smaller letters on a small stage; the 12-pixel floor protects readability and caps the rows there.
- **Looks drawn for big cells:** Monitor's ASCII panels were laid out for 40 rows; with more rows their boxes keep proportions but hold more glyphs. The pictures in D7 show it.

## Open Questions

1. Should the owner get a "Density" setting (Coarse, Normal, Fine) on top of the rule? Owner, 2026-10-31: yes, likely needed, since the laptop screen, a vertical external screen and an ultrawide screen look different. To be specified (one setting for all screens or remembered per screen).
2. Should the light form ever switch on at full screen? Recommended: yes, but gentler (× 1.5) and shown in the Render menu, so the owner can set "Never light" when the machine is fast enough.
3. (Owner, 2026-10-31: the passes may later run on video pictures too, for example a video visual in Decode; the density rule and CRT spacing must work on any picture source, not only the drawn visuals.)
4. Should CRT change at all? Recommended: yes, only the spacing in logical pixels (D6); its look stays.
