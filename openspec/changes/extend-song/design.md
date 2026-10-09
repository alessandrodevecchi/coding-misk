# Design

## Context

Steering rebuilds a song from its original plan plus every command (`steerSong`). Structural commands (`drop`, `stay`, `end`) edit `plan.plan` (one entry per double phrase) and apply on a double phrase; the radio relays out the following songs when a song's length changes.

## Goals / Non-Goals

**Goals:** a deterministic `extend` command, the ending kept, no limit.

**Non-Goals:** extending past the end of a song already in its transition; extending the whole session.

## Decisions

- **Command:** `{ kind: 'extend' }`, structural (next double phrase), group `song`.
- **Where:** the ending is the closing run of `outro` entries; without one, the last entry. The insert index is `max(d0, start of the ending)`, where `d0` is the double phrase where the command applies.
- **What:** a copy of the entry before the insert index (its role) with `target` moved by `-0.08` then `+0.06` on alternate presses (counted from the plan's `extended` field), clamped 0.05 to 1, and no listener curve targets. The plan gets `extended: n`. The director writes it with the steering random streams, so the moves differ from the part before.
- **Seconds per press:** `2 * phrase * beatsPerBar * 60 / bpm`, with `beatsPerBar` from the meter, as the director computes song length.
- **Total:** `plan.extended * seconds per press`, shown as `+m:ss`.
- **Key repeat:** the shortcut handler ignores `keydown` events with `repeat`.

## Risks / Trade-offs

- Many presses make the rebuild longer (every command is replayed on each change); at tens of presses this stays well under a frame budget's concern since it runs on a command, not every frame.
