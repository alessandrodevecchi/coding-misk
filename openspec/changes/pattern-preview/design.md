# Design

## Context

What the code does today (line numbers at `develop` 72698b5):

- **One player.** The whole app plays through the Strudel REPL of the `<strudel-editor>` element (`src/main.js:541-571`). Its scheduler is `sched()` (`src/main.js:608`). `playSong` (`src/main.js:784`), `play`, `pause` and `stop` (`src/main.js:816-840`) all drive that single scheduler. `songTick` (`src/main.js:3367`) sets the tempo bar by bar and runs the live build, the radio and the mix.
- **The Patterns tab loop is the same player.** `loopPlayable` and `playLoop` (`src/main.js:865-893`) turn a pattern into a 4-bar song with `loopSong` (`src/library/patterns.js:200`). They stop whatever plays (song or radio) and put the loop on the main scheduler. `loopState` (`src/main.js:894`) reports it. The tab calls them through the `loop` object (`src/library/patterns-tab.js:15`, `:47-51`; wired at `src/main.js:3610-3611`). So the loop builder can be reused, but not the loop as a player.
- **The listen button.** `listenPattern` (`src/main.js:2540-2555`) builds the "over" settings of a track's pattern: the track's sound and settings, and the selected section's key, progression, meter and tempo. Then it stops the song and opens the Patterns tab. The button is in `.pt-presetrow`: groove menu at `src/main.js:2567` (drums), preset menu at `src/main.js:2572`. Clicks are routed at `src/main.js:2814-2817`.
- **Pattern rows.** `panelHtml` (`src/main.js:2560`) draws the track panel. `tp-plays` holds the section's pattern chips, or the clip hint in timeline mode. `tp-pats` (`src/main.js:2608-2611`) holds one row with the label "Pattern": the pattern chips, + New, Delete, Save as pattern, the "Editing pattern" note, and `composeRow` (`src/main.js:2492`) with Compose a part, its number, Energy, Keep rhythm and Keep notes. The labels come from `src/i18n.js:128` (it) and `:340` (en).
- **Player bar.** `#pb-pos` sits next to the title (`index.html:246`). `renderPlayerBar` (`src/main.js:3535-3566`) writes `m:ss / m:ss` for songs. For the radio it writes `radioBar` ("battuta n di total", `src/i18n.js:123`, `:335`); the radio view uses the same key at `src/radio/radio.js:762`. `seekRange` (`src/main.js:3516`) gives the timeline's range.
- **Grown songs.** In Live coder and Crescendo the song that plays is the grown one. `growth()`, `growBars()`, `arrSec` and `sceneStart` (`src/main.js:532-537`) map between the grown song and the written sections. `cueBar` (`src/main.js:2011`) is the bar Play starts from.
- **Output chain.** Superdough's output goes through the master level and limiter (`applyMaster`, `src/main.js:3323`), then the global volume node (`applyVolume`, `src/main.js:3331`), then the speakers.
- **Orbits.** Orbits by type are 1 to 8 (`src/music.js:374`). The compiler gives extra tracks new orbits and keeps 13 and 14 for spoken tracks (`src/song/compile.js:66-67`). Superdough keeps one delay and one reverb per orbit.
- **Strudel 1.2.6.** `repl()` writes module-level scheduler state when it is created and when it runs: `setTriggerFunc`, `setCpsFunc` and `setTime` (`node_modules/@strudel/core/repl.mjs:75-77`, `:109`). Draw and highlighting read that state. `Cyclist` (`node_modules/@strudel/core/cyclist.mjs`) can be built on its own with `getTrigger` (`repl.mjs:295`) and `webaudioOutput` (`@strudel/webaudio`). The fast export page already builds its own REPL (`src/render/page.js:8-10`, `:66`), but on a separate page.

## Goals / Non-Goals

**Goals:**

- A preview of the selected pattern of a track. It never changes the main player's state, code, title or position.
- When the song plays, the preview is in time with it, exactly on its bars. When the song is stopped, it plays alone.
- Reuse the Patterns tab's loop builder and the listen button's settings, so the preview sounds like the loop in the Patterns tab.
- Clear names for the two pattern rows.
- A bar counter that is right for grown songs and the radio.

**Non-Goals:**

- Fixing the timeline jump in Live coder and Crescendo (D9, a follow-up).
- A preview in the Patterns tab, in the Sounds tab or for code, texture, spoken, voice and riser tracks.
- A preview volume control (owner decision 3).
- Changing the song format, the compiler or the levels.

## Decisions

### D1. Engine: ride the song's scheduler while it plays, a bare Cyclist when it does not

The preview is one Strudel `Pattern`, built once per edit (D2). It is played in one of two ways:

- **With the song (riding).** The preview is stacked into the main scheduler at the scheduler level: `scheduler.pattern = stack(songPattern, previewPattern)`. The song's code, the editor and the evaluated song stay as they are. A small wrapper around `ed.repl.scheduler.setPattern` keeps the song's own pattern as `base`, so each new evaluation (live build steps, edits, hand live coding) keeps the preview on top. The REPL exposes the song pattern, not the stack, to the highlighting (`exposeSchedulerPattern` in `repl.mjs`), so the preview never lights the editor code. The scheduler, the tempo and the clock are the song's own, so the preview lands on the song's bars with no drift and follows every `setCps`.
- **Alone (free).** A bare `Cyclist` from `@strudel/core` with `onTrigger: getTrigger({ defaultOutput: webaudioOutput, getTime })` on the shared AudioContext. It is not a `repl()`, so the module-level scheduler state stays with the main REPL. Its cps is the selected section's tempo (`bpm / 240`, the same rule as `songTick`).
- **Handover.** A preview controller is called from the existing frame loop (`transport`, `src/main.js:3389`) and from the background clock. When `isPlaying()` turns on, it stops the free Cyclist and rides from the song's next whole bar (`filterWhen(t => t >= k)`). When `isPlaying()` turns off (stop, pause, end of song), it starts the free Cyclist at the next whole cycle. The gap is under one bar, as the spec allows. Watching state in the frame loop catches every way the song can start or stop (Play, the timeline, hand live coding, the end of the song) with no hook in each path.

Alternatives considered:

- **A second full `repl()`.** Rejected. Creating it and running it overwrite `setTime`, `setCpsFunc` and `setTriggerFunc` for the whole page, which breaks highlighting and anything else that reads the scheduler state.
- **Two independent Cyclists kept in phase.** Rejected. `Cyclist` sets its phase at its own clock tick (`cyclist.mjs`, first tick after a cps change). It cannot share the song's grid without subclassing it, and each cps change of the song would need copying.
- **Writing the preview into the song's code.** Rejected. It changes the code shown, the hidden mixer and the live build, and it is undone at every step.
- **`playLoop` of the Patterns tab.** Rejected as a player. It replaces the song on the main scheduler (`src/main.js:876-893`).

### D2. What is played: the Patterns tab loop, as one expression

- **Settings.** `listenPattern`'s "over" settings (sound, key, progression, meter, tempo, settings) move into a shared helper, so the listen button and the preview use the same settings.
- **Code.** `loopSong(item, over)` makes the 4-bar loop with the beat off. `compileSong` compiles it with no technical function options. The pure helper `previewExpression(code, { orbit })` in `src/player/preview.js` turns the compiled track line into one expression. It drops `setcpm`, `$:`, `.analyze(...)` and `.mask(section1).velocity(section1)`, and sets `.orbit(PREVIEW_ORBIT)`. It can be tested in Node.
- **Rack.** `loopSong` gets an optional `rack`, so the preview carries the track's rack devices. The loop in the Patterns tab passes none, so it does not change.
- **Evaluation.** Strudel's `evaluate` with the transpiler (as `src/render/page.js` imports them) turns the expression into a `Pattern`. `evaluate` writes no scheduler state.
- **Edits.** An edit of the track (`changed()`, `src/main.js:843`) rebuilds the expression when the preview plays. The new pattern takes over at the next bar.
- **Phase.** While riding, the loop is shifted by the selected section's start modulo the loop length (`late`), so its chords match the song's when that section plays.

### D3. Level, orbit and output

- **Level.** The preview plays at the track's level, through superdough. So it goes through the master, the limiter and the global volume like the song.
- **Orbit.** It gets its own orbit, `PREVIEW_ORBIT = 15`, above the compiler's range (1-8 by type, extra tracks from 9, spoken 13 and 14). Its delay and reverb then never retune the song's. The check confirms that superdough sets no orbit cap, and that no built-in song reaches orbit 15. If one does, the preview takes the first orbit above the song's highest.
- **Visuals.** No `.analyze`, so the Stage visual and the hardware LEDs do not light up for the preview. The soul and the scopes read the master and hear it, which is expected.
- **Exports.** A real-time WAV export or recording taps the master, so the preview stops and its button is disabled while `rec || capture || fastJob` (`src/main.js:3412`). The fast export renders on its own page and never hears the preview.

### D4. Lifetime

- **One preview at a time.** It belongs to a track id and plays that track's selected pattern (`patOf(tr)`). Selecting another pattern chip switches what it plays at the next bar.
- **When it stops.** Its button. `showTab` away from Compose (`src/main.js:2935`). Opening another song. Removing its track or pattern. The start of an export.
- **Re-rendering.** Re-rendering the panel keeps it playing: the button's state is read from the controller.

### D5. Placement and look

- **Place.** The button `pt-preview` sits right after `pt-listen` in `.pt-presetrow`, for the groove row (`src/main.js:2567`) and the preset row (`src/main.js:2572`). It uses `btn small icon` with `aria-pressed`.
- **Icons (D10).** Off, it shows the headphones icon (`LISTEN` in `src/icons.js`); playing, it shows STOP. The button that opens the Patterns tab (`pt-listen`) moves from the headphones to a new drawn flask icon (`FLASK`).
- **Look.** While it plays, the button is lit like `.pn-play` (neon) or shows the lit LED key (hardware).
- **Texts.** Tooltip "Anteprima del pattern (la traccia continua a suonare nel brano: M la mette in muto)" / "Preview the pattern (the track keeps playing in the song: M mutes it)". The flask's tooltip stays "Ascolta nella scheda Pattern" / its English text.
- **Why here.** The owner asked for the button by the headphones, so it reads as tied to the pattern. The preset row edits the selected pattern, the one the preview plays.

### D6. Row names

| Option | First row (IT / EN) | Second row (IT / EN) | Notes |
| --- | --- | --- | --- |
| **A (recommended)** | Pattern del brano / Song patterns | Crea pattern / Make patterns | Plain, uses the app's word "pattern", says what each row is for |
| B | Nel brano / In the song | Laboratorio pattern / Pattern lab | Short, but "Lab" clashes with the Groove Lab mode name |
| C | Pattern in uso / Patterns in use | In definizione / Work in progress | Wrong when a pattern is used in no section; "in definizione" is vague |

- **Choice.** Option A, approved by the owner. "Crea pattern" fits Italian UI copy better than "Laboratorio" and does not repeat the Groove Lab.
- **Delete.** It moves to the first row, because it deletes a song pattern (owner decision 1).
- **The "Editing pattern" note.** It stays under the first row.

### D7. Bar counter

- **Slot.** A new `#pb-bar` at the right end of `.pb-now` (`index.html:246`). Its own slot keeps the title and the time from shifting.
- **Text.** The string `pbBar: 'bar {n} / {total}'`, the same in `it` and `en`. `npm run check:guide` accepts a string present in both languages.
- **Values in `renderPlayerBar`.**
  - Songs: `n = floor(cyc) + 1`, `total = song.meta.bars`. The grown song's meta includes the growth, as `sceneStart` shows.
  - Stopped in Compose: `cueBar()` and `compiled.meta.bars`. While the growth is pending, `compiled` is the held, written song, so the counter shows the written total until the growing mark goes away.
  - Radio: the song on air (`cyc - it.start`, `it.bars`). The radio's `pos` keeps only the time. `radioBar` stays for the radio view (`src/radio/radio.js:762`).
  - Mix: the item heard.
  - Patterns loop: `floor(cyc) mod 4 + 1 / 4`.
  - While the timeline is dragged: the bar under the thumb.
  - Below 480 px the total time hides first, then the counter keeps `bar n / total`.

### D8. Reuse of the Patterns tab

- **Reused.** The loop builder (`loopSong`) and the listen settings.
- **Not reused.** The tab's player (`playLoop`): it is the main player.
- **Possible follow-up.** The Patterns tab could use the same preview engine to try a pattern over a playing song. Not in this change.

### D9. Timeline jump in Live coder and Crescendo (later)

- **What the owner sees.** Clicking the Compose ruler jumps far ahead.
- **Where to look.** The ruler converts the clicked written bar with `seekTo(b + growBars())` (`src/main.js:2026`, keyboard at `:2031`). The ruler is drawn over the written sections, but the grown song repeats and reshapes sections in its growth. So a written bar plus the growth length does not match what the user sees on the ruler.
- **Follow-up.** It should map through the grown song's sections (`arrSec`, `meta.sectionAt`), or draw the ruler over the grown song. It gets its own issue, at lower priority, as the owner asked.

### D10. Icons: the triangle means "main player", the headphones mean "preview"

- **Rule (owner, 2026-10-26).** The play triangle has always meant "this becomes what plays": the code is shown and the player bar takes it (song cards, the Patterns tab loop, Play in the player bar). A preview is a second player that leaves the main one alone, so it uses another icon everywhere: the headphones.
- **Compose.** The preview button shows the headphones (and STOP while it plays). The button that opens the pattern in the Patterns tab used the headphones; it now shows a lab flask.
- **Flask over "open in new".** The flask matches the Groove Lab mode, whose name already carries a flask mark in the mode switch, and the Patterns tab lives in that mode, so the icon says "take this to the lab". An "open in new" arrow reads as a new browser window. The flask is drawn as SVG (`FLASK` in `src/icons.js`), in `currentColor` like the other icons, so both themes work.
- **Later previews.** Every later preview (for example in the radio console, or in the Patterns tab over a playing song, D8) uses the headphones icon, and keeps the triangle for actions that take the main player.
- **Not changed.** The Patterns tab's play buttons keep the triangle: its loop replaces what the player bar plays.

## Risks / Trade-offs

- **Two copies of Strudel's core.** If the app's import of `@strudel/core` resolved to another copy than the REPL's, `stack` would mix two `Pattern` classes. There is one copy today (`node_modules/@strudel/core`, 1.2.6, none nested under `@strudel/repl`). The check asserts that `previewPattern instanceof` the scheduler pattern's class.
- **Wrapping `scheduler.setPattern`.** A future Strudel update could rename it. The wrapper is small, lives in one place (`src/player/preview.js`), and the browser check fails if riding breaks.
- **Two parts at once.** While the song plays, the track's own pattern and the preview sound together. That is intended (no interference), but two basslines can clash. The tooltip hints at M (mute) to hear the preview in place of the track (owner decision 2).
- **Gap at a handover.** Up to one bar of silence when the song starts or stops under the preview. This is accepted to keep the engine simple.
- **CPU.** The preview adds one track's voices. A riding preview adds no scheduler. A free one adds a 50 ms clock only while the song is stopped.

## Owner Decisions (2026-10-26)

The owner approved the change and answered the open questions:

1. **Delete** goes in "Pattern del brano". Yes.
2. **The track's own line while previewing over the song** keeps playing, with a tooltip that suggests M. Yes.
3. **Preview level.** The track's level, no control of its own. Yes. The owner added the icon rule of D10.
4. **Start point while the song plays.** The next bar. Yes.
5. **Tracks without a preset menu (code, texture).** Later, in a follow-up.
6. **Row names.** "Pattern del brano" and "Crea pattern". Yes.
7. **Bar counter label.** "bar" in every language (already decided, D7).
