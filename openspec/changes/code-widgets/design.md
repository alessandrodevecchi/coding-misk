## Context

Analysis on `develop` 83f16bb (2026-10-26 to 2026-10-28), `@strudel/repl` 1.3.0, with demos in the browser and with sound. Marked "verified" when tried in the browser or read in the installed code, otherwise inferred.

- **Strudel's inline widgets.** `@strudel/codemirror` registers `_pianoroll`, `_punchcard`, `_scope`, `_spectrum`, `_spiral` and `_pitchwheel` as Pattern methods and widget types of the transpiler. The transpiler gives each call an id from its type and its index (`_widget__scope_0`); adding a call above renumbers the ones below. After evaluation StrudelMirror puts a block widget (a canvas) below the line where the call ends. All six work in the app as they are (verified).
- **Two engines.** `_pianoroll`, `_scope`, `_spectrum` run their own drawing loop per widget. `_punchcard`, `_spiral`, `_pitchwheel` use the editor's painter, which then queries two cycles back and ahead (verified in code).
- **Full `setCode` removes every widget.** The typing replaces the whole document at each frame; CodeMirror drops all block widgets until the next evaluation, and then lines jump down by 60 to 90 px (verified, demo 03). Updating only the range between the equal prefix and suffix keeps every widget and the lit notes of untouched lines (verified, demo 04).
- **`_scope` and `_spectrum` overwrite `analyze`.** They call `.analyze(widgetId)`. `miskMix` fills `analyze` only when undefined, so the line loses its instrument: stage, level snapshots, soul and fast video onsets lose it. `withVisuals` in free mode adds `all(x => x.analyze(1))` when the text has no `.analyze(`, which also overwrites the id (verified). A wrapper that calls the original, returns `this.tag(id)` and points `analysers[id]` at `analysers[instrument]` each frame keeps `analyze` and draws the right instrument (verified, demo 04). It must be installed in both Strudel copies: the page's repl bundle and the render page's `node_modules`; `installHelpers` already runs in both.
- **Fast export.** It renders in an `OfflineAudioContext` (`src/render/page.js`); superdough connects no analyser offline and the render returns one mixed sound, no audio per track. Scope and spectrum have nothing to draw there (verified in code).
- **Node checks** load core, mini and transpiler only: the `_` methods do not exist, so evaluation would throw (strong inference). `check:strudel` would report the calls as unknown, because `@strudel/codemirror` is not catalogued.
- **Classic keeps past sections' lines** in the code, with and without growth, each masked by its section (verified on luci-rosse). A widget on such a line stays empty or flat and takes its space.
- **Widgets on a muted line** (`_$:`, trial of 2026-10-28, verified; notes in the git-ignored `notes/prove-2026-10-28/widget-riga-muta/`). `_$:` becomes `.p('_$')`, which returns `silence`, but the widget is created during evaluation, so the canvas always appears and takes its space: 60 px for pianoroll, punchcard and scope, 200 px for spectrum and pitchwheel, 275 px for spiral. A commented line (`// $:`) has no canvas. On a muted line:
  - `_pianoroll` keeps drawing and scrolling, showing notes that do not sound: it starts its own drawer on the pattern (`this.draw`), independent of the scheduler.
  - `_punchcard`, `_spiral`, `_pitchwheel` and `_spectrum` stay empty: the painter draws only patterns that reach the scheduler.
  - `_scope` draws the silence, a flat line.
  - Switching `_$:` to `$:` with an evaluation (how the app unmutes) keeps the same canvas and id, and every widget draws. Back to `_$:` with an evaluation, the canvas stays and empties; `_spectrum` fades out in about 4 to 12 s.
  - Changing only the text (`setCode` without evaluation) removes every canvas until the next evaluation (see D6).
- **Widget gotchas** (demo 2, verified):
  - `_pianoroll` and `_pitchwheel` use the note's gain for opacity: at gain 0.1 notes are almost invisible; `.gain(0)` hides the pianoroll.
  - `_scope` and `_spectrum` read the sound after `postgain`: on a line with `.postgain(0)` or a muted line they stay flat or black.
  - `_spectrum` ignores `color`; on a quiet noise with the default range (-80..0 dB) it stays almost black.
  - `_spiral` `padding: .2` erases most notes of an 8-step arp; `.05` works.
  - `_pianoroll` `fold: 0` squashes notes into a thin line; `smear: 1` fills the box with white in a few cycles; `hideInactive: 1` leaves only the playing note.
  - A comment at the end of a line falls below the box.
  - After a new evaluation the first `_spectrum` can show the previous canvas for a few seconds (canvas reuse).
  - `_pitchwheel` below 120 px is unreadable; on drums, fx and voice it shows an empty circle or false notes.

## Goals / Non-Goals

**Goals:**

- Strudel's inline widgets written in the code by the app, as a live coder would, in every profile and in songs that do not grow.
- Settings per widget, per instrument and per parameter, in one card.
- No change to the growth, the sound, the levels or any fixture with the option off; no change to the growth or the sound with it on.
- The same widgets in videos, fragments with code and the live output.

**Non-Goals:**

- Full-screen visuals (`pianoroll()`, `scope()`, `wordfall`), Hydra, widgets on the stage: later stage visuals (approach B).
- Pictures drawn by the app beside the lines (approach B).
- Removing or rewriting widget calls the user types by hand.
- Patching superdough or Strudel's widget code.

## Decisions

### D1. Name and option

"Code widgets" (it: "Widget nel codice"), Strudel's own word (`registerWidget`), distinct from stage visuals, scenes and soul. The option is an app setting, not a profile control: on/off (default off) and a maximum number of widgets on screen together (default 3; more than the tracks has no effect). The maximum is a ceiling, not a target: the number on screen varies over the song (D3). It is read when the code is shown, so it is not part of the growth key, the growth store hash or the shape search. On air it applies from the next song or the next evaluation.

### D2. Settings card

One card "Code widgets" in `src/settings/settings.js`, with collapsible sections (`<details>`), state remembered per section:

1. **General:** on/off, maximum (default 3), "pianoroll or punchcard", slot order (a reorderable list of instruments, default bass, lead, drums, arp, hats, pad, fx, voice), share of secondary widgets (default 25%), "Widget notes" (D15).
2. **Muted lines:** how long a muted line keeps its widget, N bars: 8, 16, 32 or always (default 16); the dimmed look on or off (default on, D14).
3. **Widgets:** a switch per widget (`_scope`, `_pianoroll`, `_punchcard`, `_spectrum`, `_spiral`, `_pitchwheel`); `_spiral` and `_pitchwheel` off by default.
4. **Instruments:** per instrument (drums, hats, bass, lead, arp, pad, fx, voice) an on/off switch, the primary widget and the secondary order; fx and voice off by default.
5. **Parameters:** switches for selected parameters (`labels`, `smear` off by default; `fold`, `steady` and `fade` on), and the shared groups' values.
6. **Sizes:** row height (default 36 px, Strudel 60), round size (default 120 px, Strudel 200 and 275), spiral size (default 200 px), spectrum size.

Stored with the other settings and in the backup (`src/settings/backup.js`). "Reset" restores these defaults. The fast video setting lives with the video settings (D11), not in this card.

### D3. Choosing lines and widgets

- An instrument comes from the track's role, the same mapping the stage and the mixer use; unknown roles use `lead`.
- Widget for a line: usually the instrument's primary if on; with the secondary share (default 25%) the seed picks a secondary that is on instead, for variety. When the primary is off, the first secondary that is on; else none. Pianoroll is replaced by punchcard when chosen in Settings.
- How many: the maximum is a ceiling. For each section (each growth part in growing profiles) the song seed picks a target from 1 to the maximum, weighted toward more widgets when more tracks play, and avoids the same count in more than two sections in a row when the maximum is above 1. Variety is the aim.
- Which tracks get a slot when more play than the target allows: tracks in the slot order of the settings (default bass, lead, drums, arp, hats, pad, then fx and voice), ties broken by first entrance, then by the song seed. The same song with the same settings always gives the same widgets.
- The count includes muted lines, because each box takes screen space (verified: the canvas of a `_$:` line always appears).

### D4. Written form and wrapper

- The shown line ends with the short call, `._scope()`. With "Line breaks" it becomes a continuation line `  ._scope()`. It is added in `liveCode.codeWith` after `writeCode` and after `foldLibrary` and `foldSong`, before `breakLines`, `entrySets`, `laneSets` and the hidden tail, so the hidden mixer's offsets match the shown text.
- The hidden code holds one object, for example `miskWidgets = { size, colour, scope, pianoroll, punchcard, spectrum, spiral, pitchwheel }`, written by the app from the settings and the theme.
- A wrapper replaces each `_` method in both Strudel copies (`installHelpers`): it merges `size` + `colour` + the widget's group + the line's own options, passes every key on unchanged (any Strudel parameter is accepted), then calls the original.
- For `_scope` and `_spectrum` the wrapper keeps `analyze` (returns `this.tag(id)`), and each frame points `analysers[id]` at `analysers[instrument]`, read again each frame in case superdough replaces the map. The instrument is `hap.value.analyze` after the mixer for haps with the widget's tag.
- The wrapper clears a reused canvas when a widget is created, so a new `_spectrum` does not show the previous drawing.
- Copied to another Strudel, the code plays the same and shows Strudel's default sizes. Accepted.

### D5. Colours

Strudel's normal style, coloured from the theme tokens (neon, hardware) read when the hidden object is written: `active`, `inactive`, `playheadColor`, `color`, `background` transparent. A theme change applies at the next evaluation. `_spectrum` ignores `color` (Strudel's behaviour); accepted.

### D6. Range update of the code

One function updates the editor by the changed range (equal prefix and suffix, one CodeMirror transaction), used by every `ed.setCode` of a playing song in `src/main.js` (steps, typing frames, section boundaries). It applies with the option off too: the text is identical, and lit notes on untouched lines stop flickering. A full replacement stays for loading a new song and for hand-written code. `followEdit` gets the same old and new text as today.

The 2026-10-28 trial on muted lines confirmed the problem again: a `setCode` without evaluation removes every widget, and only an evaluation brings them back. The range update is the verified fix and stays a requirement. Muting and unmuting a line go through an evaluation, which keeps the widget's canvas and id.

### D7. Line keys

One `stripWidgets(line)` removes widget calls before every comparison: `lineKey`, `plainKey`, `norm` in `src/live/written-plan.js`, `shownLine`, the reused-lines and copy matches. The 40 and 60 character limits for copies and pastes are measured without the call. A line with and without a widget is the same line; adding one is a small edit, not a new line.

### D8. Writing in growing profiles (Live coder, Crescendo, Classic with growth)

- The growth and its shape search run with widgets off. A post-pass over the grown steps places widgets into free time only; it never changes a step's duration, so `SHAPES_VERSION` and `npm run durations` stay.
- Moment 1: when a step writes a line that gets a widget, and the step has enough free time after the line (the typing load says how much), the call is typed at the end of the line. The first entrance of an important track (D3 order) gets priority.
- Moment 2: otherwise the call is typed in the next idle step (the most free bars), as a small edit of an existing line, like the muted-line edit of `planWritten`.
- Muted lines: a line typed ahead may carry its widget; a muted line without one may get it in a pause before it returns. Both are allowed; the post-pass chooses the one that fits. A muted line keeps or gets a widget only if it returns within N bars (the setting, default 16; "always" keeps it while the line stays muted in the code). Its slot counts toward the target meanwhile.
- Fallback: when no idle time comes before the line needs its widget (a section change, D9), the call appears at once in the next frame.
- Typing mistakes and pauses can fall on the widget call as on any text.

### D9. Classic rules

- A widget sits only on the line of its track that plays now.
- At a section change it moves to the track's new line, same widget: typed when the profile types, at once otherwise.
- It is removed when the track is silent in the new section.
- A muted line that returns within N bars keeps it (the setting, default 16; this replaces the fixed 8 bars). Beyond N bars it is removed, its slot goes to another track, and it can be written again before the return (D8). With "always" it is never removed for a silence.

### D10. Songs that do not grow

- At each section boundary the app replaces the widget calls in the code at once (range update, D6) and evaluates at the boundary, as a growth step would. The calls do not change haps, so the sound is the same.
- In the "one line per track" view (`view: 'track'`) each track has one line for the whole song: widgets are set once and never move.
- A browser check plays every boundary and compares underruns and levels with the option off.

### D11. Videos and the live output

- New scenes "Code + widgets" (copies of the code scenes); the old scenes stay identical.
- Real-time session video, vertical fragments with code, live output: each frame `drawCode` (`src/video/video.js`) copies each widget canvas (`drawImage`) below its line in the video's layout. The line comes from the widget's position after evaluation (`widgets[].to`), then the video's own wrapping. The live output gets the drawing from the same tab. The `tab` layout already shows the real page.
- Fast video, note widgets: the render page returns the haps of each segment by line; the video redraws them with Strudel's own drawing functions (`drawPianoroll` for pianoroll and punchcard, `pitchwheel`, the spiral painter) at the frame's cycle.
- Fast video, scope and spectrum: one extra offline render per track with `_scope` or `_spectrum` (2 to 3 renders), with only that track playing, then the wave and spectrum frames from that audio. A video setting "Real scope and spectrum in the fast video" (it: "Scope e spectrum veri nel video veloce") has two values:
  - "Automatic" (default): if the extra renders would make the export more than twice as long as without them, the fast video falls back to the master waveform and spectrum for those widgets, and says so in the export log.
  - "Always real": always the per-track render, even if slower.
- Every video path draws a muted line's widget with the dimmed look when it is on (D14), and note widgets with the "Widget notes" choice (D15): a copied canvas does not carry the page's CSS, so `drawCode` applies the same grey, alpha and dashed frame itself.

### D12. Checks

- Node stubs: `installHelpers` adds `_` methods that return `this` when they are missing (Node only).
- `check:strudel`: the widget methods are allowed, as app helpers or as a widget list from `@strudel/codemirror`; `npm run catalog:strudel` rebuilds the catalog.
- `check:mixer`: a case with widgets on for each profile; every hap keeps the gain, orbit, analyze, postgain and velocity of the code without widgets.
- `check:typing` and `check:live-code`: cases for moment 1, moment 2, the two muted-line cases, the fallback and line keys. With the option off, the Live coder and Crescendo fixtures do not move. If an intended change still moves them, `SHAPES_VERSION` rises and `npm run durations` runs in the same commit.
- A new browser check for the panel: widgets present at every typed frame, scope with the right instrument, Classic moves, songs that do not grow at each boundary without glitch, frame time.

### D13. Voice

The voice widget stays off by default: a voice line has few words, and `_pitchwheel` reads sample indices as notes. Scope and spectrum can be turned on in Settings.

### D14. Dimmed widgets on muted lines

- Until a muted line returns, its widget is drawn dimmed: grey, semi-transparent, with a dashed frame like the muted code lines. The look comes from app styling on the widget element (a class on the block widget's DOM node, set from the line's `_$:` prefix after each evaluation and each range update), not from widget parameters, so it works for every widget, including `_pianoroll`, which keeps drawing notes that do not sound.
- The class is removed when the line returns (`$:` and an evaluation). The colours come from the theme tokens of the muted code lines.
- A setting turns the dimmed look off (default on). Off, a muted widget looks like Strudel draws it.

### D15. Widget notes

- "Widget notes" (it: "Note dei widget") has two values: "follow the volume" (it: "come il volume"), Strudel's behaviour, where opacity follows the note's gain; and "always full" (it: "sempre piene"), where the wrapper draws from a copy of the haps with gain 1 for the widget only.
- It changes only the drawing, never the sound: the evaluated pattern and its haps are unchanged; `check:mixer` covers it.
- It applies to the widgets whose opacity follows gain (`_pianoroll` and `_pitchwheel`, verified; `_punchcard` shares the pianoroll drawing; `_spiral` if the implementation shows it does too).
- The default is chosen after measuring the real track volumes of the built-in songs through the hidden mixer and looking at screenshots of both values (task 7.4).

## Risks / Trade-offs

- **Faint pianoroll on quiet lines.** Opacity follows gain, and the hidden mixer writes low gains. Mitigation: the "Widget notes" setting (D15), with its default chosen on measures and screenshots.
- **Lines jump when a widget appears.** Each new box pushes the lines below. Mitigation: small default sizes and the existing smooth scroll.
- **Muted widgets look empty or misleading:** flat scope, empty punchcard, a pianoroll drawing notes that do not sound (verified). Mitigation: the dimmed look (D14) and the return window N (default 16 bars).
- **Variable count moves lines more often** than a fixed count. Mitigation: the target changes only at section or growth part boundaries, never inside one.
- **Widget ids renumber** when a call is added above another; the wrapper keys its analyser link by id each evaluation, so the link follows.
- **Two Strudel copies** can drift; the wrapper is installed by the same `installHelpers` in both, and the browser check covers the render page.
- **Fast video time** grows by one render per scope or spectrum track; the fallback keeps exports finishing.
- **Code copied to another Strudel** shows Strudel's default sizes and colours. Accepted.

## Estimate

About 30 agent hours (the earlier estimates were 21 and 25):

| Phase                              | Content                                                                                                                                                                         | Hours |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1. Base                            | Option and maximum, range update of the code, wrapper for parameters and analysers in both copies, hidden groups and theme colours, dimmed class, "always full" notes, stubs | 6     |
| 2. Settings                        | Card with collapsible sections, maximum, slot order list, secondary share, return window, dimmed look, widget notes, per widget, per instrument, parameters, sizes, backup     | 3.5   |
| 3. Live coder writing              | Line choice, variable count, secondary share, moment 1 and 2, muted lines and return window, fallback, line keys, growth unchanged, check cases                                | 6     |
| 4. Other profiles                  | Crescendo, Classic with growth and the return window, songs that do not grow, boundary evaluation, glitch check                                                                 | 4     |
| 5. Real-time video and live output | Canvas copy in `drawCode` with the dimmed look, "Code + widgets" scenes, fragments                                                                                              | 3.5   |
| 6. Fast video                      | Haps by line, redraw, extra render per track, "Automatic" and "Always real" setting                                                                                             | 5     |
| 7. Closing                         | Guide card, i18n, knowledge base, volume measures and screenshots for the "Widget notes" default, full checks                                                                  | 2.5   |

## Owner Answers

Answered on 2026-10-28; all are settings in the "Code widgets" card, except the fast video one, which is a video setting.

1. **Number (cw-1).** "Up to 3": the setting is a maximum, default 3, and the number on screen varies over the song for variety (D1, D3).
2. **Muted lines (cw-2).** A widget on a muted line counts toward the maximum (verified). It stays only if the line returns within N bars, N in 8, 16, 32, always, default 16, also in Classic. Muted widgets are dimmed by app styling, with a setting, default on (D3, D8, D9, D14).
3. **Order (cw-3).** A setting, default bass, lead, drums, arp, hats, pad, then fx and voice (D2, D3).
4. **Secondary widgets (cw-4).** Usually the primary, about 1 time in 4 a secondary; a share setting, default 25% (D3).
5. **Fast video (cw-5).** Video setting "Real scope and spectrum in the fast video": "Automatic" (default, fallback over twice the time) or "Always real" (D11).
6. **Note opacity (cw-6).** Setting "Widget notes": "follow the volume" or "always full", drawing only; the default is chosen after volume measures and screenshots (D15, task 7.4).
7. **Pending check.** `setCode` without evaluation removes every widget; the range update stays the fix (D6).
