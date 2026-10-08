# Proposal

## Why

Endless mode (#18) needs music that never ends: songs that keep changing and hand over to new songs without a human writing every step. The live build engine (v0.4.0) can already play a song whose steps change it bar by bar; what is missing is something that writes those songs and steps from a style, so this first phase (#21) builds that director and lets it be judged from the command line before any radio UI (#22) is built on it.

## What Changes

- **Style recipes**: JSON files in `styles/` that describe a genre or mood with the building blocks the app already has (tempo range, keys, chord progressions, drum machines and grooves, bass, arp, lead, pad, guitar and texture presets, sounds, voice settings, energy shapes, song length, phrase length, track limits, title words). Twelve to start: Berlin techno, trance, synthwave, lo-fi, drum and bass, ambient, phonk, industrial, jazz, country, classic rock, melodic metal. Recipes are validated like songs.
- **Style mixing**: several recipes can be selected at once; a chaos amount decides whether each song follows one style (0) or takes each part (tempo, drums, bass, harmony, lead, pads and texture, voice) from a different one (1).
- **Director**: a seeded, deterministic generator that writes a session as a sequence of songs in the existing v2 song format, each with live build steps. Each song picks a length (2 to 6 minutes), tempo, key, chords, an energy shape and a set of tracks; the director then adds, removes, varies and shapes tracks on phrase boundaries so the energy follows the shape. Material is hybrid: curated presets as a base with controlled mutations scaled by a complexity amount.
- **Energy controls** for this phase: one energy amount that raises or lowers the shape, one complexity amount, seven energy shapes (build and drop, slow burn, waves, flat groove, verse and chorus, late peak, descent).
- **Taste and variety rules**: usually 4 to 5 tracks, soft limit 8 (exceeded only at high complexity), changes on phrase boundaries, no repeated move on the same track back to back, no same key or same shape twice in a row, no same style and part combination within the last three songs.
- **Spoken comments**: a fixed pool of short phrases per kind of move in English and Italian, included in `npm run voices`; titles are invented from per-style word lists in English, Italian and Spanish.
- **Command line**: `tools/endless.mjs` generates a session (styles, chaos, energy, complexity, minutes, seed), writes each song and a session file, can join the songs into one long song to play in Compose as a live build, and prints a readable report. `tools/style.mjs` validates recipes.
- **Checks**: an automated check that the same seed gives the same session, that every generated song passes the song validator, and that the taste and variety rules hold.

## Capabilities

### New Capabilities

- `endless/style-recipes`: the recipe format, the twelve starting styles, validation, and how several styles mix with a chaos amount.
- `endless/director`: how a seeded session of songs with live build steps is generated: song plan, energy shapes and amounts, moves, mutations, taste and variety rules, titles and spoken comments.
- `endless/session-cli`: the command line that generates, joins, reports and saves sessions, and validates recipes.

### Modified Capabilities

None. The song format, the live build engine and the voice track are used as they are.

## Impact

- New code in `src/endless/` (random generator, recipe loader and validator, director, moves, titles, phrase pool), new data in `styles/`, new tools `tools/endless.mjs` and `tools/style.mjs`, a new check script and npm scripts.
- `tools/voice.mjs` also generates the director's phrase pool.
- Documentation: new `docs/STYLES.md` and `docs/ENDLESS.md`; updates to `AGENTS.md`, `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/COMPOSING.md`, README.
- No change to existing songs, the compiler or the player. No new runtime dependency.
