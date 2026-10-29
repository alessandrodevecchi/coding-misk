## Why

Code widgets (`#79`, change `code-widgets`) draw small pictures of each track below its line in the code panel. The owner decided that the next step, approach B (pictures drawn by the app), comes after approach A, builds on it and extends to the stage; full-screen widgets "go into the stage visual"; Hydra comes later with the stage visuals. The owner now says widgets on the stage can go ahead: "in the end it is a visual".

The stage today shows one look at a time (`src/visuals.js`), drawn from the level and the onsets of each instrument. No look shows what each track plays (its notes, its wave) the way a widget does.

## What Changes

- **"Stage widgets"** (it: "Widget sul palco"): the pictures of the code widgets (scope, pianoroll, punchcard, spectrum, spiral, pitchwheel) drawn by the app on the stage canvas, one panel per instrument.
- **Two new full-screen looks** in every look menu (stage, radio look, video direction, fragments, live output):
  - **Monitor**: a wall of up to 6 panels, one per playing instrument, each with its widget, its name and a level bar.
  - **Rullo** (en: Roll): one large piano roll of the melodic tracks, each in its colour, with the drums as punchcard lanes below.
- **A layer over the other looks**, off by default: a strip of up to 3 small panels over the look that plays, or, on the Palco look, the panels inside its big screen.
- **Drawn by the app (approach B), not by Strudel.** The panels use the app's own painters (today in `src/video/widget-frames.js` and `src/live/widgets.js`), moved to one shared module and fed by one stage feed: notes per instrument, level and wave per instrument. The same frame comes out live, in the session video, in the live output and in the fast video. Strudel's full-screen functions (`pianoroll()`, `scope()` without `_`) are not used: they draw on Strudel's own canvas behind the whole page, outside the stage and the videos.
- **Per-track reaction.** Each panel belongs to one instrument (`analyze` name): its border glows with the level, an onset flashes it, a silent instrument dims its panel (the muted look of the code widgets) and loses it after the return window.
- **Instruments and widgets follow the code widgets card** by default: same slot order, same primary and secondary widget per instrument, same "Widget notes". Panels change only at section boundaries.
- **Colours**: the app theme (neon, hardware) on the full-screen looks; the playing look's palette on the layer.
- **A Settings card "Stage widgets"**: the layer (off, strip, Palco), panels in Monitor and in the strip, instruments and widgets as in the code or their own, colours, silent instruments. Saved and in the backup.
- **Fast video**: notes per instrument from the render page; scope and spectrum from the per-instrument renders the code widgets already make, with the same "Real scope and spectrum" setting and fallback.
- **Out of scope**: Hydra and shader visuals (later stage visuals); Strudel's full-screen functions; new widget kinds (`wordfall`, `fscope`); changes to the code widgets in the panel.

## Capabilities

### New Capabilities

- `stage-widgets`: widget pictures drawn by the app on the stage, as two full-screen looks and as a layer over the other looks, with one feed for live, videos, live output and the fast video.

### Modified Capabilities

None in `openspec/specs/`. The open changes `code-widgets` (settings and painters it reuses), `fast-video`, `session-video`, `live-output` and `vertical-clips` are read by this change.

## Impact

- **Code:** a new module of painters shared by the code widgets in the fast video and the stage (for example `src/visuals/widget-painters.js`); a stage feed (`src/visuals/stage-feed.js`): notes per instrument from the playing pattern live, from the render page in the fast video; `src/visuals.js` (two looks, the layer, per-instrument waves kept in `readAudio`); `src/music.js` (`LOOKS`); `src/video/feed.js` and `src/render/page.js` (notes per instrument); `src/settings/settings.js`, `src/i18n.js`, `src/guide.js`.
- **Checks:** `check:video`, `check:clips`, `check:live`, `check:export`; a new `check:stage-widgets` (no browser: same frame for the same time, panels per section, layout in every format) and a browser check with screenshots and frame time; `check:guide`, `check:knowledge`. Nothing in the growth, the sound or the levels changes: `check:code`, the fixtures and the level snapshots do not move.
- **Docs:** `docs/knowledge/visuals.md`, `docs/knowledge/code-widgets.md`, `decisions.md`, `docs/DESIGN-SYSTEM.md` (the two looks).
