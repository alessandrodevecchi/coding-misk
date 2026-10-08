# Design

## Context

See proposal.md for motivation. Relevant current state:

- **Song format v2** (`src/song/format.js`, `docs/SONG-FORMAT.md`): sections (tempo, key, chords, meter, fade), free tracks of nine instrument types plus `voice`, named patterns, clips. `compileSong` turns it into Strudel code; `validateSong` reports problems with JSON paths.
- **Live build** (`src/song/build.js`, v0.4.0): `build` steps (`add`, `remove`, `set`, `pattern`, `rack`, `unrack`, `say`, `voice`) applied by bar; `stateAt(song, bar)` gives the song at any bar; the player types and evaluates each step on its bar; pinned settings win over steps; a voice track speaks `say` comments from samples made by `tools/voice.mjs`.
- **Musical building blocks** (`src/music.js`): 14 drum grooves, 12 bass presets, 6 arps, 22 hooks, 10 pads, 14 guitar patterns, 5 guitar types, 19 chord progressions written in A minor and moved to a key, 8 keys, 4 meters, 13 drum machines in the compose menus (71 loadable), oscillators and General MIDI sounds.
- **Feasibility check** (phase 0): Strudel keeps playing correctly at cycle 5000 and beyond, lanes written as `<0!5000 1!16 …>` work, and two songs can overlap on separate orbits (3 and 23). This matters for later phases (windowed code, crossfades); phase 1 only relies on the existing live build.
- The director runs in Node (command line) in this phase and must also run in the browser later (#22), so it cannot use Node-only APIs.

## Goals / Non-Goals

**Goals:**
- A director whose output is plain v2 songs, so everything that already works (validator, compiler, Compose, live build, voice, export) works on it without changes.
- Deterministic and testable from the command line, so the rules in the specs become automated checks.
- Recipes as data that a person or an agent can write without touching code.

**Non-Goals:**
- Radio view, steering buttons, crossfades and morphs, continue-in-radio, session audio recording, agents, live voice generation, energy axes (density, intensity, tension) and the "fine tuning" switch: later phases (#22 to #26).
- Generating patterns from scratch (option b of the owner's choice): possible later, after the hybrid approach is proven.
- Spanish spoken comments (Spanish titles are in scope).

## Decisions

**1. Output is the existing song format, one song per file plus a session file.**
The director writes v2 songs with `build` steps instead of inventing a new runtime format. Alternatives: a stream of commands consumed only by a future radio player (nothing to inspect or play today), or one ever-growing song (harder to save and reuse per song). Session data (seed, options, per-song plan, styles per part) goes to `session.json`; `--join` concatenates songs into one long song for listening in Compose, renaming track ids per song (`s2-bass`) and offsetting bars and step positions.

**2. Each song is planned whole, then steps are chosen phrase by phrase.**
Plan: pick parts per style (chaos), length, tempo, key, sections (each a multiple of two phrases, chords per section from the harmony style), energy shape, and a pool of candidate tracks with their patterns (base preset plus mutated variants `A`, `B`, …). All candidate tracks get clips over the whole song; steps decide when they actually play, exactly as derived live builds do. Then a loop over phrase boundaries measures the current state and picks moves toward the target energy. Alternative considered: generating clips per section like hand-written songs; rejected because live build steps are what make the song evolve visibly and they already handle silence before `add`.

**3. Energy is measured, not declared.**
`energyOf(state, bar)` combines, with weights from the recipe defaults: share of the usual track count playing, drum density (hits per bar of drum tracks), filter openness (cutoff on a log scale), and drive. Moves are scored by how much they bring measured energy toward the phrase target, minus penalties (same track recently moved, same move kind twice in a row, exceeding the track limit, removing the last drum track outside a break). Ties break with the seeded random generator. This keeps the shapes honest: the report can show target against measured energy, and tests can check that shapes are followed. Alternative: each move carries a fixed energy value; simpler but drifts from what is actually playing.

**4. Shapes as functions of the song position.**
Each of the seven shapes is a function from phrase position (0 to 1) to a target (0 to 1), with a few named landmarks (drop, break, chorus) that the director must place on double-phrase boundaries. The energy amount shifts and clamps the curve; flat groove uses a narrow band. Recipes list which shapes they allow (verse and chorus for rock and metal, flat groove for lo-fi and jazz, and so on).

**5. Seeded random generator, one stream per concern.**
A small seeded generator (mulberry32 over a string hash) is split into named streams (plan, moves, mutation, titles, comments), so changing how titles are drawn does not change the music for the same seed. No `Math.random` in the director.

**6. Mutation operators on existing material.**
Drums: toggle hits on off-beats and ghost positions, keep the backbeat and the downbeat kick; bass and arp: reorder chord-tone indices (0 to 3) or replace one with another chord tone; hook: replace scale degrees by neighbours or repeat a cell, within the hook's mode; complexity sets how many operators apply. Because notes stay as chord tones or scale degrees, the song format keeps them in key automatically.

**7. Recipes reference existing building blocks by name.**
A recipe lists preset names, groove names, progression names, kit names and sound names; the recipe validator checks them against `src/music.js`, `src/sounds/machines.js` and the song validator's sound rules. New drum grooves or progressions needed by a style (for example a jazz swing groove, a country train beat, a rock verse beat) are added to `src/music.js` as ordinary presets, so Compose can use them too. A browser check confirms every sound a recipe names is in the loaded sound map.

**8. Comments from a phrase pool per move kind.**
`src/endless/phrases.js` holds short phrases per move kind (`add-drums`, `add-bass`, `break`, `drop`, `brighter`, `dirtier`, `more-space`, `strip`, `song-start`, `song-end`, …) in English and Italian. `tools/voice.mjs` imports the pool so `npm run voices` voices it. The comment rate and spacing are rules in the director (spec: about half of the moves, at least 8 bars apart).

**9. Recorded decisions for later phases (not built here).**
So that later changes start from the agreed design: radio as a separate view linked to Compose by "continue in radio" (song as seed); twelve styles with multi-select and chaos; transitions of three kinds (end and start, crossfade with the next song entering under the current one, morph track by track) chosen per song, with the next song prepared ahead (tempo ramp, compatible key); song start defined as the first bar of the new song, with a "now playing" card; session always saved as a replayable recipe (seed, options, steering commands with times), audio recording optional in Opus or WAV, and a later video export of the radio (WebM) for YouTube; tempo and key lock in the radio; steering buttons queued to the next phrase and cancellable; a compact mixer strip with lock and change instrument, full track panel in a drawer, hand-made changes pinned; energy amount plus shape now, energy axes behind a "fine tuning" switch later; track default 4 to 5, soft limit 8, more only with "more complex"; agents optional in three levels (none, written ahead, live) with providers Claude and ChatGPT through a local server holding the keys, a local model later; one set of agent tools with JSON schemas in `docs/AGENT-API.md`, an MCP server last and optional.

## Risks / Trade-offs

- [Generated songs sound mechanical or samey] → Owner listens to sessions of each style from the command line before #22; mutation and variety rules are tunable per recipe; the report makes repetition visible.
- [Twelve recipes need building blocks the app lacks (swing groove, country beat, rock verse)] → Add them as normal presets in `src/music.js`, covered by the existing code snapshot check; keep the list of additions in tasks so nothing is forgotten.
- [Energy measurement does not match what is heard] → Start from simple weights, compare target and measured energy in the report against listening, adjust weights per recipe if needed.
- [Joined sessions get long code] → Joining is for listening and inspection only; the radio (#22) will compile a window of bars instead (feasibility already checked).
- [Determinism breaks silently when code changes] → A fixture of seeds and expected session hashes in the check script; an intended change updates the fixtures with a note, like the code snapshots.
- [Sounds missing at run time] → Recipe validator warns on unknown names; the browser check fails on missing ones.
