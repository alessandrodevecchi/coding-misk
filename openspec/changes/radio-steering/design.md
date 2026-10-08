# Design

## Context

The director writes a song in two steps: `planSong` (parts, tempo, key, length, sections, the energy plan of roles and targets per double phrase, candidate tracks) and `directSong` (phrase by phrase, moves toward the target, from a muted base of every candidate track). Only tracks the moves add end up in the song, and the plan is not kept. The radio keeps a stream of `{ song, entry, start, bars }` items and plays a window of two songs; it records option changes per song in the session recipe and replays a session from it. Steps can carry `pinned` settings that win over later steps.

## Goals / Non-Goals

**Goals:**
- One mechanism for commands, curve edits, locks and length changes: a deterministic rewrite of the song on air from a boundary.
- Replay reproduces steering exactly.
- The rest of the radio (window, transitions, history) keeps working unchanged.

**Non-Goals:**
- The full track panel in a drawer, a view with several curves (new issue), steering in Compose or in playlists.

## Decisions

### Keep the plan, rewrite from a boundary

`session.next()` also returns the song's `plan` (with all candidate tracks); the radio keeps it on the stream item. `redirect(plan, opts, steering, rng)` (new `src/endless/steering.js`) builds a modified plan and calls `directSong` with three new inputs:

- `keep`: the steps before the boundary bar, kept as they are;
- `from`: the boundary index to start writing from; the loop's memory (last move per track, last comment bar, broken drums) is rebuilt from `keep`;
- `forced`: moves to take at the boundary before the ordinary ones, and `locked` track ids that are always blocked.

`directSong` is refactored so that a run with `from = 0` and nothing forced gives exactly the songs of today (seed fixtures do not change). The rewrite's random moves and comments come from a named stream `steer:<song>:<boundary>:<count>`, so a replay with the same steering rewrites the same way.

### Commands to plan changes

| Command | Change |
| --- | --- |
| Energy up / down | targets of the remaining double phrases ±0.15 (clamped 0.05 to 1) |
| Curve edit | target of one double phrase set to the dragged value |
| Add / remove a type | a forced add of a muted candidate of that type / a forced remove of every playing track of it |
| More / less complex | `usualHigh` ±1 within the style's limits |
| Darker, brighter, dirtier, cleaner, more space | forced moves of that kind on every playing track that allows it |
| Change instrument | a forced `set` of another wave or preset on one track (mixer row) or on the most prominent melodic track |
| Change progression / key | sections from the next double phrase get another progression of the style / a key a fifth away |
| Talk more / less | `talk` ±0.2 for the rest of the song |
| Go to the drop | the plan jumps from the next double phrase to its first drop (the song gets shorter) |
| Stay here | the current double phrase is repeated once (the song gets longer) |
| End the song | the plan ends with one outro double phrase after the next boundary |

Structural commands (drop, stay, end, progression, key) apply at the next double-phrase boundary, so sections stay whole; the others at the next phrase. Sections are rebuilt from the modified plan with the same code as `planSong` (extracted into a helper).

### Mixer

Volume writes the track's setting and pins it (the existing `pinned` list), so later steps cannot change it; it applies on the next bar through a swap of the window. Mute is a step on the next bar plus a lock. Lock adds the track to `locked` and triggers a rewrite at the next boundary. Change instrument is a command on that track.

### Queue and timing

Commands wait in a queue `{ id, cmd, at }` with the bar where they apply (next boundary or next bar). The radio rewrites the song as soon as a command is queued (only bars after `at` change), swaps the window, and shows the queue; cancelling removes the command and rewrites again from the same base. Every rewrite starts from the song as generated plus the commands still standing, in order, so cancel and replace are exact.

### Length changes and the stream

When the song's length changes, its stream item gets the new `bars`, the following starts are recomputed with `layout` (transitions kept), and the next song, if already generated, is not regenerated.

### Recipe and replay

`recipe.steering: [{ song, at, cmd }]`. On replay, the radio applies a song's steering right after generating it, before it plays, through the same `redirect`.

### Code

Steps from the listener carry `by: "listener"`; the annotated code marks them ("you:") next to the director's comments. The validator accepts the field.

### Scope

The switch is remembered. In session scope, energy, complexity and voice commands also change the sliders (and so the options recorded for the next song).

## Risks / Trade-offs

- Refactoring `directSong` could change existing songs: the seed fixtures guard it.
- Many commands in a short time rewrite often; each rewrite is a few milliseconds per phrase, and the window swap does not touch the bars already played.
- "Go to the drop" on a song without a drop in its shape takes the highest target part instead.
