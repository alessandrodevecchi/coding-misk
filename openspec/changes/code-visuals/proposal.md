## Why

Live coders often show small animated pictures inside their code: a scope of the wave, a piano roll of the notes, a spectrum. The code panel shows only text and lit notes today (`#79`). The owner wants optional visuals inside the code panel, as a code setting, that do not break lit notes, typing or videos.

The app already depends on the exact text of the code in many places: the growth measures typing on it, the hidden mixer keys its tail by character offsets of the lines shown, the checks compare its text and its haps, and every video redraws it on a canvas. Strudel's own inline visuals (`._pianoroll()`, `._scope()`, `._spectrum()`, `._punchcard()`) are calls written into the code, so they touch all of these. The design's analysis compares them with a picture the app draws next to the lines, outside the code, and recommends the second.

## What Changes

- **A new display control, "Visuals in the code"** (it: "Visual nel codice"), in Compose's Code options and in the radio's Custom profile. Values: `off`, `notes` (a small strip of the line's notes, past and coming, with a playhead) and `level` (a few bars beside the line number that follow the line's level). Default `off` in every profile until the owner chooses otherwise.
- **Drawn by the app, never written in the code.** The visuals sit on one transparent layer over the code panel, in the free space right of each pattern line (`$:`), with a small level mark in the gutter for `level`. The code text, its line breaks, its typing and its evaluation stay exactly as with the control off.
- **Fed by the haps the line plays.** A hap belongs to the line that holds its first mini-notation location, the same link the hidden mixer uses. So the visuals work with the hidden mixer, compact code, every functions preset, the radio and code typed by hand. A muted line (`_$:`) and a line still being typed show no strip, or an empty one.
- **The same picture in videos and on the live output.** The session video, the fast video, the vertical fragments (code layouts) and the live output window draw the same strips beside the code they already draw on their canvas. A frame of the strips depends only on the cycle and the song's haps, never on wall time, so the fast video and the live player draw the same thing.
- **No sound and no growth change.** The control is a display control: it does not enter the growth, the shape search, the growth store key, the code options that send a Classic song through the live code, or any fixture.

Out of scope: writing Strudel's widget calls into generated code; a per-line waveform scope or spectrum (live only, see the questions in the design); changing how lit notes are drawn.

## Capabilities

### New Capabilities

- `code-visuals`: optional visuals drawn by the app beside the pattern lines of the code panel, and in the code of videos and of the live output, without changing the code.

### Modified Capabilities

None in `openspec/specs/`. The open change `profile-options` gets one more display control.

## Impact

- **Code:** a new module for the layer and the drawing (for example `src/live/code-visuals.js`, pure drawing functions shared by the panel and the video canvas), `src/main.js` (the layer over `#edhost`, the hap feed, the control), `src/live/profiles.js` (`CONTROLS`, `PROFILES`, `DISPLAY_CONTROLS`, kept out of `CODE_CONTROLS`), `src/video/video.js` (`drawCode` draws the strips), `src/render/page.js` and `src/video/feed.js` (per-line notes for the fast video), `src/radio/radio.js` (Custom profile chip), `src/i18n.js`, `src/guide.js`, `index.html`, `src/style.css`.
- **Checks:** a new check without a browser (line of a hap, strip frames from haps and a cycle) and a browser check (layer on and off, code text and typing frames identical, frame time, fast video frames); `check:profiles`, `check:guide`, `check:knowledge`, `check:video`, `check:clips` cover the new control. `check:code`, `check:live-code`, `check:mixer`, `check:functions`, `check:typing`, `check-compact-code.cjs`, `check:strudel` and the Crescendo fixtures must not move.
- **Docs:** `docs/knowledge/visuals.md`, `docs/knowledge/profiles.md` (generated block), `docs/knowledge/decisions.md` (Strudel widget calls not written, and why), `docs/ARCHITECTURE.md` (Visuals, Video).
- **Versions:** none. `SHAPES_VERSION`, `DIRECTOR_VERSION` and `CRESCENDO_VERSION` stay.
