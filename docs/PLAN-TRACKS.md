# Plan: tracks, patterns and a timeline

Status: in progress. Phases 0 (`#9`), 1 (`#10`) and 2 (`#11`) done on `develop`. Owner request: give every instrument its own rhythm control, allow several instruments of the same type, and show a timeline with one lane per track, without giving up music as code.

## Findings

- **The drum grid controls only the drums.** Melodic channels have an on/off switch, a rhythm preset (for example guitar `power8`) and sound controls. Measured on 2026-10-05: with drums off, the guitar still plays (peak 0.43). It sounds tied to the drums because its presets sit on the same 8th and 16th grid.
- **Real limits of the scene model:** melodic rhythms and notes cannot be drawn, each scene holds one instrument per type, and nothing shows when each instrument plays across the song.
- **Effects are already per channel, except the character of delay and reverb.** Filters, distortion, crush and gain apply to one `$:` layer. Delay and reverb live on an orbit bus in superdough (`orbitBus.getDelay`, `getReverb`): the send amount is per layer, but delay time, feedback and room size are shared by every layer on the same orbit. The compiler never sets `orbit`, so all channels share orbit 1. Fix: one orbit per track.
- **Global versus per track.** Tempo, meter, key and chords stay per section and shared by all tracks: tracks playing together need one pulse and one harmony. Per track: octave and transpose, scale degrees used by its patterns, step division (16ths, triplets), relative speed (half or double time with `.slow`/`.fast`), pattern length (a 3-step pattern over 4/4 gives a polyrhythm), swing override, effects, volume and pan.
- **Strudel has no tracks or timeline, and does not need them.** Each `$:` line is an independent layer; rhythms are `.struct()`, notes are `note()` or `n().scale()`. `pick` (in `@strudel/core/pick.mjs`) selects a named pattern per bar from a lane, `arrange` chains sections, `@strudel/draw` ships a piano roll. Everything requested is work on our model, compiler and UI.

## Reference: Reason

Reason ([Reason Studios docs](https://docs.reasonstudios.com/reason13/sequencer-functions)) maps well onto this project:

- **Rack:** each track is a chain of devices: instrument, effects, and Player devices (Scales & Chords, Note Echo, Dual Arpeggio) that transform notes before the instrument.
- **Sequencer:** tracks with note lanes and clips; pattern devices (Redrum, Matrix) have pattern lanes whose clips select a pattern.
- **Blocks mode:** named sections (Intro, Verse, Chorus) holding several tracks for N bars, drawn into the song in Song mode, with manual overrides.

Mapping to coding-misk:

| Reason | coding-misk |
| --- | --- |
| Block | Our scene, renamed section: bars, tempo, key, chords, meter |
| Track with devices | Track: instrument + players + effects, compiled to one `$:` line |
| Player device | A Strudel function shown as code: `.arp()`, `.off()`, `.echo()`, `.ply()`, `.jux()`, `.scale()` |
| Pattern device and pattern lane | Track patterns A, B, C… and a per-section choice of pattern |
| Song mode overrides | Later phase |

## Principles

1. **Code stays the output and stays visible.** Every UI element corresponds to readable Strudel code. Selecting a track highlights its block in the code view.
2. **Code tracks.** A track can hold raw Strudel instead of a structured pattern, placed on the timeline like any other track. This keeps live-coding inside the arranger.
3. **Harmony is shared.** Sections own key and chords. Melodic patterns are written as chord tones or scale degrees, so they follow chord and key changes.
4. **Nothing breaks.** The current model keeps working until the new one plays the 18 built-in tracks at the same levels.

## Data model v2

One model with free clips underneath; sections mode and timeline mode are two views of it.

```js
song = {
  version: 2,
  sections: [{ id, name, start, bars, bpm, bpmEnd, key, prog, meter, swing, crash, breath, fill, fade }],  // contiguous markers on the timeline
  tracks: [{
    id, name, type,                              // drums | bass | guitar | synth | pad | texture | riser | vocal | code
    instrument: { sound, …params },
    players: [{ fn: 'arp', args: ['up'] }, …],   // note transforms, compiled to Strudel functions
    fx: [{ fn: 'distort', args: [3] }, { fn: 'delay', args: [0.3] }, …],  // ordered chain, per track
    mix: { gain, pan, mute, solo },
    timing: { octave, transpose, division, speed, swing },  // per track; harmony stays per section
    orbit,                                       // own delay and reverb bus
    patterns: { A: pattern, B: pattern },        // drums: step rows; melodic: steps with chord or scale degree, octave, length, velocity; code: Strudel source
    clips: [{ start, bars, pattern: 'A', offset: 0, automation: { gain: [0.4, 0.8] } }],  // start and bars in bars from song start
  }],
}
```

- **Units are bars.** A clip starts at bar `start` and lasts `bars`. Fractions are allowed later (`start: 12.5`).
- **Melodic notes are chord or scale degrees** (owner decision), so they follow key and chord changes of the section they play in.
- **Code tracks** hold Strudel source per pattern and are composed, not just viewed (owner decision).

## Adding and removing instruments

- **Today:** every scene has the same eight fixed channels (drums, bass, guitar, arp, hook, pad, texture, riser), each switched on or off. One instance per type.
- **v2: the track list belongs to the song and is free.** Any type, any number: three guitars, two drum kits, no guitar at all. A new song starts with a few tracks (for example drums and bass), not eight.
- **Silent in a section = no clip there.** A track exists for the whole song but plays only where it has clips. Three guitars only in the drop: add two guitar tracks with clips only in the drop.
- **Removing a track** deletes it and its clips from the song (with undo). Tracks with no clips are kept until removed, so they can be filled later.
- **Add track menu:** pick a type, then a preset sound; duplicate an existing track to get a second guitar with the same sound and patterns.
- **Display:** in sections mode, a section only shows lanes that play in it plus a "show all" switch, so a long track list stays readable. Collapsing and reordering lanes is always possible.
- **Limit:** no fixed cap; the validator warns above about 15 tracks playing at the same time (CPU) and the owner's 4 to 5 layers rule stays a musical guideline.
- **Agents:** adding or removing an instrument is adding or removing an entry in `tracks`; silencing it in a section is removing its clip there.

## Two modes, one model

- **Sections mode (casual, MVP).** A grid: rows are tracks, columns are sections. A cell sets "track plays pattern B during the drop". Writing a cell creates or replaces one clip that covers exactly that section.
- **Timeline mode (full control, final goal).** Clips at any bar, any length, dragged and resized freely; sections are markers above the lanes.
- **Switching is lossless both ways.** Sections to timeline: cells are already clips. Timeline to sections: a section fully covered by one clip shows a normal cell; a section covered partly or by several clips shows a "custom" cell (striped) that still plays exactly as written. Editing a custom cell asks before replacing its clips with a single one. Moving or resizing a section in timeline mode moves the clips inside it.
- **Setting.** A switch in the arranger header, remembered per viewer. Both modes edit the same song, so an agent never needs to know which mode the owner uses.

## Usable by agents

- **Songs are JSON files** (`songs/<id>.json`) following a documented, versioned schema, instead of JavaScript in `src/tracks.js`. Easy to write, diff and review. The app loads them as built-in tracks; saved songs export and import as the same JSON.
- **Command line tools:** `tools/song.mjs validate <file>` (schema and musical checks with clear errors, for example "clip overlaps another clip on track guitar at bar 17"), `compile` (prints the Strudel code), `levels` and `render` (reuse the Playwright tools, later issue `#8`).
- **Patterns in text form** that are short to write: drum rows as `"x...x...x...x..."`, melodic steps as degree strings like `"1 . 3 5 . 8 . 5"`, code patterns as plain Strudel.
- **Every feature reachable without the UI.** The UI writes the same JSON an agent writes.

## Documentation

`docs/COMPOSING.md`, written for humans and agents, mirrored in the in-app Guide tab:

1. The model: sections, tracks, patterns, clips, the two modes.
2. Every track type and its instrument options; every player and effect, with the Strudel code it produces.
3. Patterns: drum steps, degree notation, division, speed, length and polyrhythms; code tracks and what Strudel features work inside them.
4. Worked examples from one track to a full song, each a real JSON file that the validator compiles (examples cannot rot).
5. Recipes per genre and mood, mixing levels, and the owner's taste rules (few layers, tension, reels starting loaded).
6. Gotchas inherited from Strudel (see `docs/MUSIC-ENGINE.md`).

Compiled shape, one block per track:

```js
const lane_guitar = "<~!8 A!8 B!16>"            // one value per bar, from the clips
$: lane_guitar.pick({ A: …pattern A…, B: …pattern B… })
  .s("gm_distortion_guitar").distort(3).delay(.3).orbit(3).postgain(…).analyze("guitar")
```

Clips that start or end inside a bar use a finer lane. Section fades and tempo stay as today (lanes and player-driven `setCps`). A second guitar is another track with its own `analyze("guitar2")`.

## Interface v2

- **Top:** transport, mode switch (sections or timeline), section markers, BPM, key and chords of the selected section.
- **Center, arrangement:** time across, one lane per track; cells in sections mode, free clips in timeline mode; playhead, mute and solo per lane. Add, duplicate, rename and reorder tracks.
- **Bottom, pattern editor:** drum grid for drum tracks; step and degree grid for melodic tracks; code editor for code tracks.
- **Right, rack:** devices of the selected track: instrument, players, effects in order, each showing the Strudel function it adds. The hardware theme fits here.
- **Code view:** generated code with the selected track highlighted.
- **Phone:** stack the panels; the arrangement scrolls horizontally inside its own container.

## Phases

Each phase is a GitHub issue and a branch from `develop`, verified (errors, levels per instrument, screenshots) before merging; `main` only after the owner confirms.

0. **Safety net. (`#9`)** Snapshot the compiled code and measured levels of every built-in track, with check scripts. No visible change. Splitting the compiler into modules moves to phase 2, where it is rewritten.
1. **Quick wins in the current model. (`#10`)** A read-only timeline under the arranger (one lane per instrument, lit where it plays); a step row per melodic channel so its rhythm can be drawn, starting from the preset; one orbit per channel.
2. **Model v2, compiler v2, JSON songs and CLI. (`#11`)** Schema, validator, compiler, automatic conversion of built-in and saved tracks, parity check against phase 0 snapshots. First version of `docs/COMPOSING.md`. Done: one layer group per clip instead of `pick` (exact parity with the scene compiler); built-in tracks stay authored as scenes until the arranger edits v2 in phase 3; JSON songs in `songs/` play from the Tracks tab.
3. **Interface v2, sections mode. (`#12`)** Arrangement grid, pattern editor, add, duplicate and remove tracks of any type and number, mute and solo, lanes shown per section.
4. **Rack and code tracks. (`#13`)** Players and effects as ordered devices; code tracks composed in the arranger; code highlight per track.
5. **Timeline mode. (`#14`)** Free clips, drag and resize, lossless switch with sections mode.
6. **Later.** Automation lanes, piano roll view, vocal tracks (issue `#3`), faster export (issue `#8`).

Documentation grows with every phase; a phase is done only when its features are documented with an example.

## Risks

- **Size.** Phases 2 and 3 are a rewrite of the core; phase 1 delivers value first and tests the direction.
- **Migration.** Saved tracks in `localStorage` need a versioned converter.
- **Performance.** Each track is a layer; 10 to 15 are fine, dozens with distortion and reverb are not.
- **Visuals.** Stage has one spot per instrument type; extra instances share it or get a copy.

## Owner decisions (2026-10-05)

1. Timeline mode is the goal, sections mode is the MVP; both stay available and switch without losing anything.
2. Melodic notes relative to chords and scale.
3. Code tracks: yes, composed and not only viewed, with full documentation for humans and agents.
