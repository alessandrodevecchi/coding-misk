# Tasks

## 1. Plan

- [x] 1.1 Artist `transitions` (kinds, bars, harmony) with defaults and validation; built-in artists tuned
- [x] 1.2 Director: `transition` stream; plan kind, length and ramp per pair; compatible and free harmony for the next key and tempo; overrides from options
- [x] 1.3 Interlude comments pool in English and Italian

## 2. Join

- [x] 2.1 `joinPair` for mix, morph, echo out, break and riser, interlude, cut
- [x] 2.2 `windowSong` and `joinSession` join through `joinPair`; stream starts with overlaps and interludes; skip and restart cut
- [x] 2.3 Checks: each kind compiles, keeps the beat, ends with only B playing, tempo ramps, determinism, preferences followed; seed fixtures rewritten

## 3. Radio and artists

- [x] 3.1 Radio "Transitions" and "Harmony" menus, recorded in the session recipe; history shows the transition used
- [x] 3.2 Artists tab shows and edits transition preferences
- [x] 3.3 Browser check: radio plays through a mix and a morph without errors; levels of a mix stay below clipping

## 4. Playlists

- [x] 4.1 "Mix" switch in the player bar for playlists
- [x] 4.2 Runs of composed songs joined with an 8-bar mix; bar map for title, position, previous and next; code songs cut
- [x] 4.3 Browser check: two short composed songs mix, a code song cuts

## 5. Docs

- [x] 5.1 Docs (issue `#39` for long spoken passages opened): `docs/ENDLESS.md`, `docs/ARTISTS.md`, `docs/ARCHITECTURE.md`, README, `AGENTS.md`, `DEVLOG.md`
