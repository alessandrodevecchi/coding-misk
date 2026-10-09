# Design

## Context

Playlists store song ids (`songs: [id]`) and the queue plays ids through the app's song player; Mix streams saved songs with transitions (`mixTick`). The radio replays a recipe with `start({ recipe })` and keeps steering per song in the recipe.

## Goals / Non-Goals

**Goals:** sessions as items with the same list operations; replay as heard; a clear story for director updates.

**Non-Goals:** editing a session inside a playlist; sessions in the Songs tab.

## Decisions

- **Ids:** a session item is an id `session:<random>` in `songs`, with its data in `data.sessions[id] = { recipe, count, title, date, version, frozen? }`. Lists, order, shuffle and repeat need no change; only lookups and export know about sessions.
- **Version:** `DIRECTOR_VERSION` in `director.js`, an integer; the rule in `AGENTS.md` and `ENDLESS.md`: bump it whenever `check:endless -- --write-fixtures` changes the fixtures.
- **Play:** the queue asks the radio to `playSession(item, { onEnd })`: `start({ recipe, limit: count })` with `limit` stopping after `count` songs (no song is prepared past it) and calling `onEnd`, which advances the queue. The radio tab is not opened; the player bar shows the song titles.
- **Freeze:** the radio rebuilds the session's songs (replaying the recipe without audio, as the CLI does) and stores them in `frozen`; a frozen item plays as a list of saved songs through the existing Mix or song path.
- **Mix:** the session's songs, rebuilt as heard (or frozen), enter the mix stream like saved songs, with playlist transitions between them; the queue moves on after the session's last song.

## Risks / Trade-offs

- Frozen items can be large (several full songs); export and backup grow accordingly.
- Without Freeze, an old session after a director change plays different music; the warning says so.
