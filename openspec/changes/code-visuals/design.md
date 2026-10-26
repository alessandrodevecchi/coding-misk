## Context

Analysis on `develop` 83f16bb (2026-10-26), `@strudel/repl` 1.3.0. Read from the installed packages and the app's code; the panel was checked in the browser with screenshots, the rest is read, not run, unless it says so.

### How Strudel does inline visuals

- **Widget calls.** `@strudel/codemirror/widget.mjs` registers `_pianoroll`, `_punchcard`, `_scope`, `_spectrum`, `_spiral` and `_pitchwheel` as Pattern methods and as widget types of the transpiler. The transpiler (`@strudel/transpiler`, `isWidgetMethod`) gives each call an id from its type and its index among calls of that type (`_widget__pianoroll_0`), and records its end offset. After evaluation StrudelMirror puts a CodeMirror block widget (a canvas, 500 × 60 px by default) below the line where the call ends.
- **What each call does to the pattern.** `_pianoroll` and `_punchcard` add a tag to the hap context and start a drawing loop (`draw`, `requestAnimationFrame`, wall time from `getTime()`); hap values do not change. `_scope`, `_spectrum` (and `fscope`) call `.analyze(id)` with the widget id, so they **replace the line's `analyze` value**, and read a superdough analyser by that id.
- **Without the widget prefix** (`.pianoroll()`, `.scope()`, `.punchcard()`) they draw on Strudel's full-window canvas, `#test-canvas`, not in the panel.
- **Offline.** superdough connects an analyser only when the context is not an `OfflineAudioContext`, so `_scope` and `_spectrum` draw a flat line in a fast export render. In Node (`check:mixer`, `check:ramps`, `check:profiles`, `check:preview` load only core, mini and transpiler) the widget methods do not exist and evaluation throws.
- **Catalog.** `docs/STRUDEL-FUNCTIONS.md` lists `pianoroll` (`punchcard`), `scope` (`tscope`), `fscope`, `spectrum`, `spiral`, `pitchwheel`, `wordfall` and `color`, all never written by the app. The `_` forms and `markcss` are not in the catalog, because `@strudel/codemirror` is not among the catalogued packages; `check:strudel` would report them as unknown functions.

### How our code panel works

- **The panel is Strudel's own `<strudel-editor>`** (StrudelMirror over CodeMirror), created in `src/main.js` and mounted in `#edhost`. The app adds no CodeMirror extension, decoration or gutter of its own. Strudel's widget plugin is loaded, so a `_pianoroll()` typed by hand already shows its block today.
- **Lit notes in the panel** are Strudel's `highlightMiniLocations`: outlines on the mini-notation locations of the haps playing, on every frame of Strudel's drawer, remapped through edits. The app's "Lit notes" control (`highlights`) does not touch the panel; it only drives the glow of the code drawn in videos and in the live output.
- **Code text.** The steps and the typing replace the whole document (`ed.setCode`) on every typed frame. The evaluated code is the shown code plus, with the hidden mixer, a tail `all(x => miskMix(x, [[start, end, {…}], …]))` whose ranges are character offsets of the lines shown. `miskMix` finds a hap's line through `hap.context.locations`, and fills `analyze`, `orbit` and `gain` only when they are undefined.
- **Line breaks** are real newlines written by `breakLines` from the panel's width in columns (`codeCols`); CodeMirror wrapping is off.
- **Videos and the live output redraw the code on a canvas** with their own tokenizer, wrapping and scroll (`drawCode`, `src/video/video.js`). Their lit notes are an approximation: a layer glows with its instrument level, found by a regex on `.analyze("x")` in the text, and a box steps through its first string by `cyc % 1`. Only the `tab` video layout captures the real page.
- **Fast video.** The render page (`src/render/page.js`) evaluates each segment in a hidden page with an `OfflineAudioContext`, queries its haps and posts the onsets per instrument (`v.analyze || v.s`). The fast video draws the code typed from the segments (`codeFrom`). The code text of a frame depends only on the cycle; scroll easing and the caret depend on earlier frames.

### What each approach does to what we have

Two approaches, compared on every strategy the owner listed.

**A. Strudel's widget calls written in the code** (`._pianoroll()` at the end of a line, or `._scope()`).

**B. An overlay drawn by the app beside the lines**, outside the code, fed by the haps of each line.

| Concern | A: calls in the code | B: app overlay |
| --- | --- | --- |
| Generated code text | Every pattern line gets 9 to 13 more characters (`._scope()`, `._pianoroll()`). They must be added after `writeCode` and before `breakLines` (`liveCode.codeWith`), and stripped again from every line key (`lineKey`, `plainKey`, `norm` of the written plan, `shownLine`), or hand edits and reused lines stop matching. | Unchanged. |
| Typed lines or hidden | Typed: each new line costs about 2 to 3 s more at a person's pace, and more lines cross the 40 and 60 character limits for copies and pastes. Hidden from typing (pasted at the end): it no longer looks like a person typing. Hidden from the text: then it is not Strudel's widget, it is B. | Nothing to type. |
| Live coder growth and shapes | If on during the growth measure, every Live coder shape choice moves (rushed steps), the fixtures move (`SHAPES_VERSION`), the grown lengths move (`npm run durations`), free-duration songs get longer. If off during the measure, the app types more than the growth planned: the typing is squeezed or pasted. | No effect: the control is not read by the growth. |
| Crescendo | Same as the growth for its typing; `check:live-code` fingerprints move where it is on. | No effect. |
| Human typing and mistakes | Mistakes and pauses also fall on the visual calls. | No effect. A line being typed shows no strip until its step plays it. |
| Written like a coder, reused lines, lines typed ahead | `muteOrDelete` and the written plan cost lines by length: longer lines can flip a muted line to deleted, or leave no time for a line ahead. | No effect. A muted line typed ahead shows no strip (or an empty one) until it is unmuted. |
| Compact code, functions presets | The visual call stops a run of folded functions (`foldLibrary`, `foldSong`); `check:functions` "% shorter" moves. | No effect. |
| Hidden mixer | `_scope` and `_spectrum` overwrite the line's `analyze` with their widget id, and `miskMix` does not refill a value already set: the stage looks, the level snapshots, the soul and the fast video onsets lose the instrument. `_pianoroll` is safe here. | The line of each hap comes from its locations, as in `miskMix`, and its instrument from the hap's `analyze` after the mixer: works with every preset. |
| Lit notes | The block widgets are re-placed only after an evaluation; between steps `setCode` replaces the document, so blocks and outlines jump or vanish while the line is typed (inferred from Strudel's code, not run). Lines shift down by 60 px per widget, so less code fits. | Drawn in the free space right of the text, never over the mini-notation that lights up. Lines keep their place. |
| Hand live coding | Works: the user can type the calls; that is Strudel's own feature and stays available either way. | Works on hand-written code too, since the link is the haps' locations. Lines edited and not yet evaluated lose their strip until the next evaluation, like lit notes. |
| `check:code`, snapshots | Move if written in the compiler; stay if added only at display level. | Do not move. |
| `check:mixer`, `check:ramps`, `check:profiles`, `check:preview` | Fail: the methods do not exist in Node; would need stubs. `_scope` also changes `analyze`. | Do not move. |
| `check-compact-code.cjs`, `check-ideas.cjs` | Pass only if both sides have the same calls; `_scope` changes `analyze`. | Do not move. |
| `check:strudel` | Fails: `_pianoroll` and friends are not catalog functions. | Does not move. |
| Session video, fast video, fragments, live output | Not visible: the widgets are DOM canvases in the panel; every video and the live output draw the code text on their own canvas. Only the `tab` layout would show them. In the fast export render the widget loops run in the hidden page for nothing, and `_scope` draws flat. | The same drawing function draws in the panel and on the video canvas, from the same haps and cycle, so videos and the live output show it. |
| Performance | One drawing loop per widget, each querying its pattern every frame (`draw`), plus Strudel's drawer widening its window when painters exist; one analyser per scope. | One layer, one loop at most 30 frames a second, visible lines only, haps cached per cycle window; nothing runs when the control is off or the panel is collapsed. |

### Conclusion

B keeps every live-coding strategy as it is, because it never touches the code text, its typing, its evaluation or its haps; and it is the only one that reaches the videos and the live output, where the owner's work is seen. A is authentic Strudel, but it changes the growth, needs stripping in four line keys and stubs in four checks, breaks the per-instrument levels with `_scope` and `_spectrum`, and is invisible in videos. A stays available by hand, as Strudel's own feature.

**Recommendation: B**, with two kinds first (`notes` and `level`), both drawn from haps and the cycle so the fast video draws the same thing. A per-line waveform needs a live analyser per line: it exists in the page (`analysers[instrument]`) but not in the offline render, so a `wave` kind would be live only, or drawn from levels in the fast video. It is a question for the owner, not part of this change.

## Goals / Non-Goals

**Goals:**
- Optional visuals beside the pattern lines of the code panel, as a display control.
- The same visuals in the session video, the fast video, the vertical fragments with code and the live output.
- No change to the code text, the typing, the growth, the haps, the sound or any existing fixture.

**Non-Goals:**
- Writing Strudel's widget calls into generated code.
- Removing or rewriting widget calls the user types by hand.
- A per-line waveform or spectrum in the fast video.
- Making the lit notes of videos exact (a later change could reuse the per-line haps of D3).

## Decisions

### D1. An overlay, not code

The visuals are drawn by the app on one transparent canvas over the code panel (`pointer-events: none`), placed from CodeMirror's line coordinates (`coordsAtPos`, `lineBlockAt`) and redrawn on scroll, resize and document change. Alternative considered: a CodeMirror extension with inline widgets at the end of each line. Rejected for the first version: widgets are DOM per line, re-created by every `setCode` of the typing; a single canvas is cheaper and its drawing is the same function as the video's.

### D2. Where a strip goes

`notes`: a strip about 150 px wide and one line high, right-aligned in the panel, on the first line of each pattern block (`$:` and its continuation lines). It is drawn only when the longest line of the block ends at least 18 px before it; otherwise it is hidden for that block (the code always wins). It never changes `codeCols`, so the line breaks of the "Line breaks" control stay the same. `level`: four short bars in the gutter, left of the line number, on the same line.

### D3. A hap's line

A hap belongs to the pattern block that holds its first mini-notation location (`hap.context.locations[0].start`) in the evaluated code. Since the evaluated code is the shown code plus a tail, the offsets fall in the shown text. The block is then found by its text key in the code on screen, so while the typing rewrites the document a block keeps its strip as long as its text is unchanged, and a block being edited has none until the next evaluation. A hap without a location (the voice, code without mini-notation) belongs to no line. Colour: the instrument (`hap.value.analyze` after the mixer), with the stage's instrument colours.

### D4. Haps in the page and in the fast video

In the page, the layer queries the scheduler's pattern over a window around the current cycle (for `notes`: one cycle back, one ahead), once per half cycle and after each evaluation, and buckets the haps by line. In the fast video, the render page already queries the haps of each segment; it also returns, per segment, the note haps by line (begin, length, pitch or sound row), which `src/video/feed.js` keeps next to the code (`linesFrom`). The drawing function takes `(haps of the line, cycle, area)` only.

### D5. Same frame everywhere

`drawLineVisual(ctx, area, kind, haps, cyc, style)` is pure: no wall time, no state from earlier frames. The panel, `drawCode` in the video, the vertical fragments (code layouts) and the live output call it. `level` uses the levels the frame already has (`visuals.levels` live, `levelsFrom` in the fast video).

### D6. A display control

`codeVisuals` with values `off`, `notes`, `level` joins `CONTROLS` and `DISPLAY_CONTROLS` (so on air it applies to the song on air from its next edit), but not `CODE_CONTROLS`: turning it on does not send a Classic song through the live code, and it is not part of the growth key or the growth store's hash. Default `off` in every profile; the owner may choose `notes` for Live coder (question 1).

### D7. Muted lines, lines typed ahead, silence

A muted line (`_$:`) plays nothing, so it shows no strip; with `notes` a thin empty frame marks it (question 3). A line typed ahead, muted, is the same. A line whose track is silent in this section (mask at 0) shows an empty strip.

### D8. Cost

The layer exists only while the control is not `off` and the panel is visible. It draws at most 30 frames a second and only the blocks on screen; haps are cached per window. Target: under 1.5 ms per frame on luci-rosse with every line on screen, measured in the browser check, and no change to `check-startup.cjs` numbers.

## Risks / Trade-offs

- **Not "real" Strudel.** A viewer who copies the code does not get the visuals. Mitigation: the Guide card says they are drawn by the app; Strudel's own calls still work when typed by hand.
- **Narrow panel.** With long lines most strips hide. Mitigation: the strip shrinks to 80 px before hiding; in videos the code area has a known width.
- **Wrong line for odd code.** Code that builds a pattern from a shared constant (`const lead = "…"`, used in two lines) gives haps whose locations sit in the constant: those haps belong to the constant's line, which is not a pattern line, so they show nowhere. Accepted; the generated code keeps its mini-notation in the lines.
- **Hand-typed `_scope()`** still replaces the line's `analyze` (Strudel's behaviour), as today. Out of scope.
- **Video lit notes stay approximate** while the strips beside them are exact. Accepted for this change.

## Estimate

About 12 to 16 agent hours: layer and drawing 4, hap feed and line mapping 3, video, fragments and live output 3, fast video feed 2, control, texts, Guide and knowledge 1.5, checks and screenshots for the owner 2.5.

## Open Questions

The owner's questions (in Italian, in the private notes) cover: default per profile, kinds in the first version, muted lines, videos and fragments, and a live-only wave.
