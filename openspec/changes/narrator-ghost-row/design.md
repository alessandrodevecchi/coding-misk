## Context

The narrator speaks the `say` of the live build's steps (`narration` and `narratorLines` in `src/song/build.js`), with the settings of the first track of type `voice` or, without one, with `VOICE_DEFAULT`. Songs made by the director always carry a `voice` track (`director.js`); most built-in songs do not. In Compose the first narrator sound edit adds a track named Narrator (`setVoiceSetting`, `newNarratorTrack` in `src/main.js`), with Undo. Today a real narrator row shows `❝ n` per section in the sections view (step `say` counted per section), diamonds from `buildMap` in the timeline view, and ticks in the growth cells (`xSpans`). The Voices group already lists the narrator's lines ("Frasi del narratore", read-only for grown songs). Measured on luci-rosse in Live coder: 21 step lines, 19 of them in the 132 bars of the growth, 2 in the written part.

## Goals / Non-Goals

**Goals:** show from the start that the narrator speaks and where; keep one way for it to become a real track; change nothing that is heard or saved.

**Non-Goals:** a real narrator track in every song; editing narrator lines from the timeline; the ghost row in the radio (its songs already have a voice track) or on the song cards.

## Decisions

### D1. Ghost row, not a real track

Two options were weighed.

|                   | A. Real track always                                                                                                                                    | B. Ghost row (chosen)                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Song format       | every song gains a `voice` track: at load (normalize) or written in the 30 built-in JSON files without one; user songs change on the next save          | none                                                        |
| Generated code    | the voice header becomes `// ===== Narrator · voice =====`: every `check:code` snapshot moves                                                           | none                                                        |
| Checks            | `check:code`, `check:mixer -- --full`, `check:crescendo -- --full`, levels snapshots, `npm run durations`, the growth hash (stored growths grown again) | `check-timeline`, `check-voices`, `check:spoken` gain cases |
| Radio             | track lists and console rows gain a row; the cap of 12 already skips voices (`playing()`), the recommended values need a look                           | none                                                        |
| Growth            | the track has no clips; growth filters keep `voice` tracks, the first `add` must never name it                                                          | none                                                        |
| Undo, Save, trial | Restore original, dirty state and trials must ignore an untouched narrator track                                                                        | the existing first-edit path, unchanged                     |
| Estimate          | 12 to 16 agent hours, high regression risk                                                                                                              | 4 to 6 agent hours, low risk                                |

B answers the owner's complaint (the narrator seems to appear from nowhere) at a fraction of the cost. A stays possible later; B does not block it (the ghost would simply never show).

### D2. One source for the narrator's marks

A pure helper, `narratorMarks(song, C, lang, files)`, returns `[{ at, text }]` for the narrator from `spokenSchedule` (the same list the radio's Coming next and the code use). It counts what is heard: the poetic style's images, the lines skipped where the voice instrument speaks, a muted narrator excluded. With the narrator switched off it is called with the narrator on, so the dimmed row still shows where it would speak. The real narrator row uses the same helper, so the ghost and the track it becomes show the same marks. Today the real row counts step `say` values, which is wrong for the poetic style (open question Q1).

### D3. When the row shows

The ghost row shows when the open song has no track of type `voice` and the narrator can speak: the Live build is on, or the song has its own steps. With the narrator switched off, it is dimmed like a muted row, with the reason in its tooltip. With the Live build off it is hidden: there is nothing to show, and the Voices group already says why. A song with zero narrator lines shows the row empty only while the build is pending; once compiled with no lines, the row is hidden.

### D4. How it looks

- Always the last row of the grid, after the real tracks, in both views, with the growth and ending cells of `timeline-growth` aligned like any row.
- Head: the voice icon `❝` and the name, in italics, inside a dashed outline; no Mute or Solo button, so the name uses the whole head (it fits at 96 px on a phone).
- Sections view: one dashed cell per written section with `❝ n` (n lines), empty and faint where it does not speak.
- Timeline view: a dashed lane with a small round mark per line at its bar.
- Growth and ending cells: hatched as today, with a tick per line instead of the play spans.
- Theme tokens only (`--a2` for marks and outline); the hardware theme gets the dashed `#3a3a40` outline of the growth cells and its LED colour for the marks.
- Tooltips (native `title`, as the other cells): the section or column name, then one line per narrator line, `battuta 149 · «sta arrivando»`, then "Sola lettura".

### D5. What clicks do

- A section cell, a growth cell or a mark: seek to the narrator line nearest to the click (in a section cell, its first line; an empty cell seeks to the section start, as a real cell would). No track is selected: the ghost has no track panel.
- The row's name: scrolls to Voice: narrator in the Voices group, unfolds its Sound part and gives it focus. The tooltip says: "Il narratore parla in questo brano con il suono predefinito. Diventa la traccia Narrator quando ne cambi il suono."
- The empty timeline lane does not add clips (as a real voice row). Keys: the cells are buttons, Enter and Space act as a click.

### D6. Becoming the real track

Unchanged path: the first narrator sound edit (`setVoiceSetting`) adds the Narrator track at the end of the tracks, so the real row appears where the ghost was. The arranger re-renders; the new row flashes once (the existing `aria-current` outline for 1.2 s) so the eye follows the change. Undo removes the track and the ghost row comes back. A narrator track added any other way (Add track, an opened radio song) also hides the ghost.

### D7. Phone width

At 400 px the head is 96 px wide: without Mute and Solo the name fits. Touch has no hover, so the tooltips do not show; a tap seeks, and the lines are read in "Frasi del narratore" under Voice: narrator. The arranger scrolls sideways as today.

## Risks / Trade-offs

- Two lists of narrator lines that may differ: "Frasi del narratore" lists step `say` values; the row shows what is heard (D2). The tooltip of the row's name says how many lines are heard. Q1 decides.
- `spokenSchedule` walks every build state: on long grown songs it must be cached with the compiled build (computed once per compile, as `timelineShape`).
- A sample missing for a line: the line is silent and not marked. Accepted: the row shows what is heard.

## Open Questions

- **Q1. Which lines the row shows.** Recommended: what is heard (`spokenSchedule`), and the real narrator row switched to the same helper. Alternative: step `say` values, as the real row and the phrase list today (wrong for the poetic style).
- **Q2. The row's label.** Recommended: "Narrator" in both languages, the name of the track it becomes, so nothing renames at the switch. Alternative: "Narratore" in Italian (the mockups), which then asks for a localized name for the real track too.
- **Q3. Hover content.** Recommended: native tooltips, as every other cell. Alternative: a styled popover like the mockups, a new component with its own phone behaviour (+1 agent hour).
- **Q4. Narrator switched off.** Recommended: the row stays, dimmed. Alternative: hidden.
- **Q5. A button "Crea traccia" on the ghost.** Recommended: no; one way to the real track (the first sound edit). Alternative: a button on the name's tooltip or in Voice: narratore.
- **Q6. Live build off.** Recommended: no ghost row. Alternative: a faint row that says "Accendi In divenire".
