## Context

Read on `develop` 426b16a (2026-10-29). "Verified" means read in the code or measured; the rest is inferred. This change builds on `widgets-on-stage`, which is a spec only: its painters module, stage feed, Monitor, Rullo and layer are assumed here.

- **One canvas per frame.** `paint(look, cyc, dt, playing)` in `src/visuals.js` clears the canvas, draws `SCENE_DRAW[look]` (or the soul), then a flash. While a video records or the fast video renders, it draws on an offscreen canvas at 720 logical pixels high scaled to the target (`setTarget`); `drawAt` draws one fast video frame from a feed. Verified.
- **Videos compose the stage with other parts.** `compose` in `src/video/video.js` draws the stage canvas into its area (`drawStage`), then the say line, the title card, the soul panel and the code panel (`drawCode`, text drawn on the canvas). Fragments and the live output use the same stage frame. Verified.
- **A style pass already exists once.** The soul's colour views in the hardware theme go through `retro()` in `src/soul/views.js`: downscale to 400×254, five amber levels, 4×4 Bayer dither, nearest-neighbour upscale, scanlines. Verified.
- **The stage has a CSS scanline overlay** (`.stagewrap::after`). It is not in any video, because videos draw canvases, not the page. Verified.
- **Not every look is repeatable today.** Onsets push sparks with `Math.random()` (`onset` in `src/visuals.js`), and Edgerunners shakes and glitches with `Math.random()`. The rule of the visuals (a frame depends only on the bar and the levels) holds for most of the picture, not all. Verified.
- **Code widgets painters** (`fastWidgets` in `src/video/widget-frames.js`) draw pianoroll, punchcard, spiral, pitchwheel, scope and spectrum into small canvases with given colours; `widgets-on-stage` D1 moves them into one shared module drawing in a box. Verified for the current painters.
- **"Style" already means a music recipe** (`styles/`, the Styles tab, invented styles). A render style needs another name in the interface.

## The owner's question: separate visuals, or filters on the same visual?

Filters, as the user sees it: one Render choice next to the look, and any look can take any render. Separate scenes per style multiply the menu (8 looks with Monitor and Rullo, × 5 renders) and leave the existing scenes, the soul and the layer unstyled. Inside the code, though, a pure frame filter is not enough for every style: the prototypes show that ASCII and Terminal passes over a finished frame lose the thin lines of a scope and make text unreadable, while native glyph painters stay sharp. So the recommendation is a hybrid behind one choice: a frame pass for every look, and native glyph painters where the widgets need them.

## Options compared

Prototypes made on 2026-10-29 with temporary canvas code injected into the running app (port 5209), Monitor drawn with made-up data and the real Tramonto look playing `luci-rosse`; in the owner's local notes, `notes/prove-2026-10-29/widget-stili/` (list at the end). Times are the median of 6 to 20 runs in headless Chrome on the owner's machine with music playing, noisy (they moved by 2× between two runs); "phone" is the same with the CPU slowed 4×. They are an order of magnitude, not a budget.

### Option 1: render style as a frame pass

What it is: after `paint` draws the look, a pass reads the frame at low resolution and redraws it: ASCII (one glyph per cell from the cell's light, in the cell's colour or a phosphor colour), the first Terminal (ASCII in a phosphor colour with bloom, scanlines, vignette and a status line; replaced by the modern text interface below), 1-bit (two colours, ordered Bayer or Atkinson error diffusion), CRT (bloom, RGB grille, scanlines, vignette), LED (a dot matrix with 5 levels).

- **Looks:** 1-bit, CRT and LED look good over Monitor and over the scenes (screenshots 04, 05, 07). ASCII over Monitor keeps the note blocks but breaks the scopes into scattered glyphs (02); over Tramonto the sun and the wave read, the dark sky must be cut with a black point or it fills with dots (06).
- **Existing scenes and the soul:** yes, all of them, with no change to their code.
- **Code panel:** a pass over text destroys it at glyph sizes (08: ASCII and Terminal unreadable); 1-bit at full resolution keeps it readable. So renders leave the code panel alone (D5).
- **Performance:** with the prototype's unoptimised Canvas 2D code (new canvases every call, one `fillText` per cell): ASCII 150 columns 6 to 16 ms at 720p and 1080p, Terminal 10 to 15 ms, 1-bit Bayer 9 to 19 ms, LED 5 to 14 ms, CRT under 1 ms of script time (most of its cost is in the GPU, not measured). Phone: 13 to 33 ms. A WebGL 1-bit pass took 1 to 10 ms in headless Chrome, which likely runs a software GPU. With cached canvases, a glyph atlas (one `drawImage` per cell) and work at the cell or dither resolution, the Canvas 2D passes should reach 2 to 5 ms at 1080p; to be measured.
- **Fast video:** offline, so not bound to 60 fps; it adds the pass time per frame (about 5400 frames for 3 minutes at 30 fps: 10 ms is about 54 s more).
- **Repeatable:** a pass is a pure function of the frame, so it keeps whatever the look has. Bayer is stable in time: still parts stay still. Atkinson spreads the error across the frame, so a small change moves dots everywhere: it shimmers in video and compresses badly. Use Bayer by default.
- **Settings:** one menu; the pass has few knobs (cell size, colours from the theme).
- **Cost:** about 10 agent hours for the pass pipeline and three renders, 3 more for the glyph renders as passes.
- **Risks:** frame budget on phones; glyph shimmer when a cell's light crosses a step (no hysteresis, since it would make a frame depend on the one before); a dark look turns mostly empty under 1-bit and ASCII without a black point and a gain per look.

### Option 2: painters that draw natively in a style

What it is: each painter of `widgets-on-stage` (scope, pianoroll, punchcard, spectrum, spiral, pitchwheel) and the panel frame draw directly in the style: a grid of characters for ASCII and Terminal (scope as `/ \ -` slope glyphs, notes as full and shaded blocks, hits as `o`, frames as `+-|`, level as `[####....]`), dots for LED.

- **Looks:** the sharpest glyph result (03): every line and note readable, panel names readable, colours per instrument kept.
- **Existing scenes, the soul and the code panel:** no. Only Monitor, Rullo and the layer.
- **Performance:** cheap: 1.3 to 1.6 ms at 720p and 1080p, 2 to 5 ms on the phone, against 0.3 to 0.4 ms for the plain Monitor.
- **Fast video:** no extra cost worth noting.
- **Repeatable:** yes, as the painters (data in, picture out).
- **Settings:** the same menu.
- **Cost:** about 2 hours per style for six painters and the frame, so 4 hours for ASCII and Terminal; a style that only a pass makes well (1-bit, CRT) gains little from it.
- **Risks:** every new painter needs a version per native style; scenes stay unstyled, so a video cycling looks switches between styled and unstyled pictures.

### Option 3: separate scenes, one per style

What it is: new looks such as "Terminal Monitor", "1-bit Rullo", each drawn by hand.

- **Looks:** can be the best single picture (a hand-made terminal scene with its own layout and text), but only for the scenes made.
- **Existing scenes and the code panel:** no.
- **Performance and repeatable:** like any look.
- **Settings:** no new menu, but the look menu grows by one entry per style and per base look.
- **Cost:** 3 to 5 hours per scene; 6 renders on 2 widget looks is 12 scenes.
- **Risks:** menu growth, duplicated drawing code, styles that never reach the other scenes, owner's tests multiply.

### Comparison

| | 1. Frame pass | 2. Native painters | 3. Separate scenes |
| --- | --- | --- | --- |
| Works on existing scenes and the soul | yes | no | no |
| Code panel | not touched (D5) | not touched | not touched |
| Glyph styles (ASCII, Terminal) | rough on thin lines | sharp | sharp |
| 1-bit, CRT, LED | good | little gain | good |
| Live frame cost | 2 to 5 ms after work, 6 to 19 ms as prototyped | about 1.5 ms | like a look |
| Phone | needs a lighter setting | fine | like a look |
| Fast video | +pass time per frame, repeatable | repeatable, no cost | repeatable |
| Menu | one Render menu | one Render menu | look menu × styles |
| Cost | about 13 h | about 4 h for two glyph styles | 3 to 5 h per scene |

## Terminal: a modern text interface

Owner feedback on the first prototypes: the Terminal render looked like monochrome ASCII on a phosphor screen. The owner imagines a modern text interface instead, like today's agent command line tools and GPU terminals: a dark ground, many truecolour colours, a monospace font, rounded box-drawing panels with titles, a status bar, maybe a prompt line and a cursor, block characters for meters and spectra, braille or half blocks for lines, dim labels. Three takes were prototyped (screenshots `terminale-*`, neon and hardware):

- **A, system monitor** (`terminale-a-monitor-*`): Monitor as one rounded panel per instrument, title in the instrument's colour and widget kind dimmed, a level line with a percentage, braille scopes, half-block piano rolls, `●` punchcards, a dimmed silent panel; a header line (song, tempo, bar, section) and a footer of key hints. Clear at a glance, same grid as Monitor, works for Rullo and the layer the same way. 2.4 to 4.8 ms at 720p, about 3 ms at 1080p (prototype, unoptimised).
- **B, agent command line layout** (`terminale-b-monitor-*`): a header card with the song and a side list of what enters and what comes next, one large pane (lead) and smaller ones, a prompt box with a typed command and a cursor, a status line (tracks, section, time, render) and a mode line. The most characterful, but its layout is fixed and it shows information (what enters, the next change, a typed command) that no other look has: it is a scene, not a way of drawing one. 1.9 to 6.1 ms.
- **C, clean truecolour over a scene** (`terminale-c-tramonto-*`): Tramonto as half-block truecolour cells (160 × 86 pixels), a tab bar, a braille scope pane and an eighth-block spectrum pane, a status bar with a mode badge and the section. Keeps the scene's colours and shapes, so it works on every look. 12 to 15 ms as prototyped (two rectangles per cell); drawn as one downscale and one upscale without smoothing it should cost about 1 ms plus the chrome.

**Recommendation:** the Terminal render is A on the widget looks and the layer (native painters) and C on every other look (the half-block pass with the same chrome). Both share the palette, the panels and the status bar, so a video that cycles looks stays one family. B is not a render.

**A signature scene instead?** Not for the render. A and C are what the render should be: any look, one choice. B is the best candidate for a later hand-made signature look, a full-screen text interface (working name "Console"), because it needs the song's information (what enters, the next change, the narrator's or the console's commands as the typed prompt) and a fixed composition. It would reuse the Terminal palette and glyph painters, cost about 5 agent hours, and belong in its own change after this one.

## Decisions

### D1. One Render choice, two ways to draw it

The user picks a look and a render. The renderer picks how: a native painter when the look draws widgets and the render has one (ASCII, Terminal on Monitor, Rullo and the layer), else the frame pass. One list `RENDERS` next to `LOOKS` in `src/music.js`: `normal`, `bit` (1-bit), `crt`, `led`, `ascii`, `terminal`, each with English and Italian names and a flag `native: ['ascii', 'terminal']`.

### D2. Where the pass runs

In `paint`, after the look and the flash, on the canvas that was drawn (stage, video target or fast video target). Normal skips it: nothing changes for a user who does not pick a render. On a widget look with a native render the pass is skipped for the panels, and only the background (if any) gets the pass. The layer of `widgets-on-stage` is drawn before the pass when the render has no native form, and natively after it when it has one, so its glyphs stay sharp over a styled scene.

### D3. The passes

- **1-bit:** downscale to a third of the target (a sixth on the light setting), black point 0.1 and gain per look, ordered Bayer 8×8, two colours, nearest-neighbour upscale. Atkinson is not offered: it shimmers in video.
- **CRT:** a bloom (blurred copy added), an RGB grille, scanlines every 3 pixels, a vignette. Colours unchanged.
- **LED:** dots on a pitch of 1/80 of the height, 5 levels, the cell's colour boosted, unlit dots faint.
- **ASCII:** cells of 1/40 of the height (aspect 1:1.9), ramp ` .:-=+*#%@`, black point 0.1, the cell's colour with its full brightness; glyphs from an atlas made once per font size and colour step.
- **Terminal** (on looks without native widgets, take C above): the frame downscaled to the cell grid at two pixels per cell (half blocks), colours stepped (neon: 8 levels per channel; hardware: a 6-step amber ramp), upscaled without smoothing in one draw, then the text interface chrome drawn on top: a tab bar with the look's name, two small panes (a braille scope of the master wave, an eighth-block spectrum) and a status bar with mode, song, section, bar, tempo and time.
- All passes reuse their canvases (made at the first frame and on a size change) and read the frame only at the work resolution.

### D4. Native glyph painters

The painters module of `widgets-on-stage` gets a glyph target: a grid of columns and rows in a box, and `put(col, row, glyph, colour, alpha)`. Each painter has a glyph form: scope as one glyph per column chosen by slope, spectrum as ramp glyphs, pianoroll as full blocks for sounding notes and shaded blocks for the others, punchcard as `o`, spiral and pitchwheel on a circle of glyphs, the panel frame as `+-|` with the name in the top edge and a level `[####....]`, dimmed panels with `:` edges. Terminal (take A above) uses the same cells with other forms: rounded panels (`╭╮╰╯`) titled with the instrument in its palette colour and the widget kind dimmed, a level line (`━━━━──`) with a percentage and a dot, scope as braille dots (2×4 per cell, drawn as dots, not taken from the font, so no font fallback), spectrum as eighth blocks (`▁▂▃▄▅▆▇█`) green to yellow to red, pianoroll as half-block notes (two pitch rows per cell, the sounding note bright), punchcard as `●`, a silent panel dimmed with a "silent" line; a header line (song, tempo, bar, section) and a footer of key hints and the play state.

### D5. The code panel is never rendered

No render touches the code panel, in the page or in videos and fragments: the pass runs on the stage canvas only, and `drawCode` is unchanged. The owner plans separate code themes; styling the code (a terminal font and palette, for example) belongs there. The prototypes agree: a glyph pass makes code unreadable (screenshot 08).

### D6. Colours from the theme

- Neon: 1-bit paper white on near black; LED and ASCII keep the frame's colours; Terminal a truecolour palette of named colours (ground `#0d0b14`, text `#e4e0f0`, dim `#6f6888`, red, green, yellow, blue, magenta, cyan, orange), one per instrument as in `widgets-on-stage` D7.
- Hardware: 1-bit amber (`#ffb347` on `#1b1306`, the LCD tokens), as the soul's retro filter; Terminal a warm palette (ground `#120e08`, text `#f2e2c4`, amber, orange, olive green, brick red, teal) and the scene of take C mapped to an amber ramp.
- Read once per theme change.

### D7. Every output, one frame

The pass runs inside `paint`, so the stage, the session video, the fast video (`drawAt`), the fragments and the live output get the same styled stage. A pass has no state between frames and no randomness: the same input frame gives the same output. The render for videos and fragments is a setting with "same as the stage" by default; the video direction's look cycles keep the render.

### D8. Settings and the menu

- A Render menu next to the look menu on the stage (drawn icons, no emoji), saved in `coding-misk-render`.
- In the video and fragments settings: Render, "same as the stage" by default.
- "On slow devices": automatic (default) uses the light setting (half the cells or dots) when a frame of the pass takes more than 8 ms for 30 frames in a row; on and off.
- In the backup, reset to defaults, English and Italian, a Guide line in the `visuals` card.
- Songs keep only their `look`; a song does not carry a render (open question 4).

### D9. Performance budget

Measured by the browser check on the owner's machine class:

- Pass at 1080p video target: at most 4 ms median for 1-bit, ASCII, Terminal, LED; CRT at most 2 ms.
- Stage at its own size: the look plus the pass within the frame of the display (16.7 ms at 60 Hz) with a margin: total median at most 10 ms.
- Native glyph Monitor: at most 2 ms more than the plain Monitor.
- Light setting with the CPU slowed 4×: at most 12 ms for the pass.
- Fast video: a render adds at most 15% to the export time of the same song with Normal.
- If Canvas 2D misses the 1080p budget after the atlas and cached canvases, a WebGL pass for 1-bit, CRT and LED is the fallback (a new decision then, with its own check).

## Risks / Trade-offs

- **Glyph shimmer** when a cell's light sits on a step: no hysteresis (it would break the frame drawn alone). Mitigation: black point and a ramp with fewer steps; native painters where it matters most.
- **Dark looks under 1-bit and ASCII** (Spazio, Sonar) turn mostly black. Mitigation: a gain per look in `RENDERS`, checked by screenshots of every look.
- **Phone frame budget.** Mitigation: the light setting, automatic.
- **Non-repeatable looks stay non-repeatable** (`Math.random()` sparks and Edgerunners glitch). The pass neither fixes nor worsens it. Out of scope here; worth a separate fix if the fast video must match the live picture exactly.
- **Video size.** 1-bit and LED have many hard edges and dots; files may grow. Mitigation: measure in `check-export.cjs`, keep the quality presets.
- **The word "style".** The interface says Render (Resa) to keep "style" for music recipes.

## Later ideas

Each marked by how it would be drawn:

- **Pixel** (pass): a coarse grid and a palette of 16 colours. Easy.
- **Halftone** (pass): dots sized by light, as Edgerunners does in parts. Easy.
- **Thermal** (pass): light to a false colour ramp. Easy.
- **Blueprint, vector** (native only): white lines on a blue grid. A pass would need edge detection and looks poor; good on Monitor and Rullo through the painters, not on the scenes.

## Estimate

About 22 agent hours, after `widgets-on-stage` phases 1 to 3:

| Phase | Content | Hours |
| --- | --- | --- |
| 1. Pass pipeline | `RENDERS`, the pass after `paint`, cached canvases, the theme colours, Normal identical to today | 3 |
| 2. 1-bit, CRT, LED | Passes with black point and gain per look, light setting | 4 |
| 3. ASCII and Terminal as passes | Glyph atlas, ramp; Terminal half-block truecolour pass, tab bar, panes, status bar | 4 |
| 4. Native glyph painters | Cell target; ASCII and Terminal forms of six painters (braille, eighth blocks, half blocks), rounded panels, header and footer, layer after the pass | 5 |
| 5. Settings | Render menu, video and fragments, slow devices, backup, i18n, Guide | 2.5 |
| 6. Checks and docs | `check:render-styles`, browser check with times and screenshots of every look and render, video, clips, live, export, knowledge base, design system | 3.5 |

Phases 1 and 2 alone (1-bit, CRT, LED on every look) are about 7 hours and can ship first; ASCII and Terminal follow.

## Open Questions

Each with a recommended answer.

1. **Separate visuals or filters?** Recommended: filters for the user (one Render choice next to the look, any look takes any render), drawn as a frame pass on every look and natively by the widget painters for ASCII and Terminal.
2. **Which renders first?** Recommended: 1-bit, CRT and LED first (good as passes on every look, about 7 hours), then ASCII and Terminal with the native painters.
3. **Name in the interface?** Recommended: "Render" (it: "Resa"), since "style" already names the music recipes. Renders: Normal (Normale), 1-bit, CRT, LED, ASCII, Terminal (Terminale).
4. **Does a song carry a render, like its look?** Recommended: no for now; the render is the user's choice on the stage and in the video settings. A song field can come later.
5. **Videos and fragments: same render as the stage?** Recommended: yes by default, with its own setting.
6. **The code panel?** Decided by the owner: no render on the code panel, in the page or in videos. Recommended: no Settings option for it now either; the code themes change owns code styling.
7. **Dither kind?** Recommended: Bayer only. Atkinson looks finer in a still but shimmers in video.
8. **Hardware theme colours?** Recommended: amber for 1-bit, as the soul's retro filter; Terminal a warm truecolour palette with the scene on an amber ramp (screenshots `terminale-*-hw`).
9. **WebGL?** Recommended: not now. Canvas 2D with a glyph atlas and cached canvases first; WebGL only if the 1080p budget is missed.
10. **Terminal as a hand-made signature scene instead of a render?** Recommended: no for the render (take A on the widget looks, take C on the others). Take B, the agent command line layout, becomes a later signature look ("Console", about 5 hours, own change).
11. **Which Terminal take?** Recommended: A plus C, as above; B later as a scene.

## Prototypes

Made on 2026-10-29 with temporary canvas code injected into the running app (port 5209): Monitor with made-up data, Tramonto playing `luci-rosse` scene 3, the code panel of the same song. In the owner's local notes, `notes/prove-2026-10-29/widget-stili/`:

1. `01-monitor-base.png`: Monitor of `widgets-on-stage`, no render.
2. `02-monitor-filtro-ascii.png`: option 1, ASCII pass over Monitor (scopes break up).
3. `03-monitor-ascii-nativo.png`: option 2, native ASCII painters (sharp).
4. `04-monitor-dither-1bit.png`: 1-bit pass, Bayer (left) and Atkinson (right).
5. `05-tramonto-dither-1bit.png`: Tramonto as is, 1-bit Bayer, 1-bit Atkinson in amber.
6. `06-tramonto-terminale.png`: Terminal pass and ASCII in the scene's colours over Tramonto.
7. `07-monitor-crt-led.png`: CRT and LED passes over Monitor.
8. `08-codice-con-filtri.png`: the code panel as is, 1-bit, ASCII and the first Terminal pass (only 1-bit stays readable).

Second round, after the owner's feedback on Terminal (same day, port 5209, made-up data on Monitor, the real Tramonto):

9. `terminale-a-monitor-neon.png`, `terminale-a-monitor-hw.png`: take A, system monitor panels.
10. `terminale-b-monitor-neon.png`, `terminale-b-monitor-hw.png`: take B, agent command line layout.
11. `terminale-c-tramonto-neon.png`, `terminale-c-tramonto-hw.png`: take C, half-block truecolour scene with panes and status bar.

`06-tramonto-terminale.png` shows the first, monochrome Terminal, now replaced.
