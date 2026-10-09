# Design

## Context

`createSession(recipes, seed)` keeps `entries`; `next()` plans each song with `prev: entries[i - 1]` (harmony) and plans the transition `entries[i - 1] → entry`. The radio's stream items hold `{ song, entry, plan, base, commands }`; items without `plan` are not steerable already (the console reads `item.plan`).

## Goals / Non-Goals

**Goals:** song 0 from any track-based song, a smooth handover, deterministic replay.

**Non-Goals:** steering song 0; continuing a playlist in the radio.

## Decisions

- **Lead entry:** `createSession(recipes, seed, { lead })` pushes a lead entry built from song 0 (`leadEntry(song)`: last section's tempo, key, meter, total seconds, phrase 8, no artist). Indexes and random streams of the generated songs stay as in a session without lead, so song 1 of a lead session is planned like song 0 of a plain one plus the harmony constraint.
- **Style choice:** `stylesNear(song, recipes)` in a small module: tags, then genres (style `genre` field) by tempo distance, then tempo and meter distance; deterministic.
- **Radio:** `start({ lead: { song, from } })` makes item 0 `{ song, entry: leadEntry, n: 0, lead: true }` without `plan`; the player starts the window at `from`. The recipe stores `lead: { song, from }`.
- **Steering off:** `whyNot` is not called for items without `plan`; the console renders disabled buttons with the reason `steerWhy:lead`.
- **Cards and Compose:** the action is hidden for songs whose tracks are all code.

## Risks / Trade-offs

- A recipe with song 0 is bigger (a full song); it stays in the history like the steered songs already do.
