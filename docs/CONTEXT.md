# Project context

## Story

The owner (Alessandro, GitHub `alessandrodevecchi`) got hooked a year ago on Switch Angel's live-coding videos and kept the idea of music as code with Strudel. This project joins that idea with what current models can do. It started as a few Strudel patterns and a player, then grew, at the owner's push, into a scene arranger able to produce structured tracks.

Original request: "create a project `coding-misk`, take inspiration from Switch Angel, explore music made with code using Strudel or TidalCycles". "misk" is probably a typo of "music/musik"; the owner kept the name. Renaming to `coding-musik` was offered and is still open.

## Goals

- Compose with code, in the spirit of Switch Angel; eventually recreate a live-coded track.
- Practical use: background music for short videos and social reels (15 to 60 seconds, starting at full energy).
- Reusable moods and presets; more genres; vocals (probably a small local model).

## Owner preferences and feedback (keep applying these)

- Conversation in Italian. Likes concise answers and visible progress.
- Melodies were "too sweet" and tracks "too similar": stepwise minor-scale hooks felt cantabile. Prefer tension: tritone, flat second, octave jumps, repeated notes, silence. Use the `chromatic` and `locrian` hook modes, bass riffs, one-chord or b2 progressions.
- Too many instruments at once: keep 4 to 5 layers per scene, focus on rhythm.
- "Cyberpunk" tracks came out cheerful; dark club music (John Wick, Le Castle Vania) is the reference for action and club moods.
- Reels must start loaded, like an excerpt of a longer song: no long build-up. Write the full song, then cut the reel from its strongest sections.
- Wants to see everything in the Compose UI: every built-in song opens in the arranger. Hand-written code tracks are kept only as references.
- Transitions matter: avoid hard cuts that sound like different tracks. Use fades, transition scenes, continuous layers, tempo ramps.
- Loved the visuals and the logo; asked for Stage to show every instrument, and for an anime (Edgerunners) visual and a hardware-style UI.
- Git: `main` stable, `develop` for experiments, merge to `main` only after confirmation. Repo is private.

## Key decisions

- **No Strudel fork.** `@strudel/repl` 1.3.0 from npm; the app wraps it. A fork only if the audio engine itself must change.
- **Local app, not hosted.** A claude.ai artifact was tried and dropped: its sandbox blocks Strudel's `data:` audio worklets, so it played no sound. The artifact was deleted.
- **Tempo is driven by the player** (`scheduler.setCps` at bar boundaries), never by `.cps()` inside patterns.
- **Scene model over hand-written code** for all built-in tracks, so they open in Compose.
- **Master gain 0.6** on Strudel's output to avoid clipping when all layers play.
- **Guitar volume after the distortion** (`postgain`), otherwise level and fades do not change.

## References

- Switch Angel, Coding Trance Music: https://www.youtube.com/watch?v=GWXCCBsOMSg and channel https://www.youtube.com/@Switch-Angel
- Le Castle Vania, John Wick medley (club fight reference): https://youtu.be/IBvf7KUEZ78
- Strudel: https://strudel.cc/ (workshop, mini-notation, effects docs); source https://codeberg.org/uzu/strudel
- TidalCycles: https://tidalcycles.org/ ; dirt-samples: https://github.com/tidalcycles/dirt-samples ; drum machines: https://github.com/ritchse/tidal-drum-machines
- Reference audio analysed (owner's files, kept outside the repo):
  - `sf-tenyears-149s.m4a`: inspirational future pop, 92 BPM, E minor, Em Em D D C C D D, strong sidechain, 57 bars.
  - `dci-track-23s.m4a`: tech jingle, 103 BPM, F# minor with G bass (phrygian tension), staccato then syncopated stabs, 10 bars.
  - Rebuilds kept structure, tempo and harmony but not the timbre; the owner found them not very similar.

## Built-in songs (`songs/`)

JSON songs (format v2), in library order (`songs/index.json`): Cavo Scoperto (dark electro techno, two hooks in call and response, glitch code track), Ruggine Lenta (slow trip-hop, clean guitar arpeggio, guitar wall, flute), both written directly in the v2 format, Segnale nel rumore (the free-form piece, D dorian, 7/8), Luci Rosse (dark club), DCI Jingle carica, Insert Coin (90s arcade), Circuito Ruggine (industrial techno with guitars), Ferro, Ali di cenere, Drift, Neon Rush reel, Settimo Cielo (prog rock 7/8, 5/4), Pioggia sul vetro (lo-fi), Ghost Protocol, Neon Ascent, Ten Years rebuild, Next Chapter, DCI rebuild, DCI Ignition, Synth Lab Demo. Examples for the guide: `songs/examples/`. Hand-written originals: `patterns/05-neon-ascent.js`, `patterns/06-ghost-protocol.js`.

## Backlog (GitHub issues)

- `#1` Edgerunners visual and `#2` Hardware interface theme: done, closed.
- `#3` Vocals, `#4` Recreate a live-coded track, `#5` Background music for short videos, `#6` Moods and presets, `#7` More genres, `#8` Faster than real-time audio export: open.
- `#15` Full sound browser: done, released in `v0.3.0`.
- `#16` FastTracker 2 module track: concept only. Strudel code and XM modules do not convert cleanly, so a `module` track would play an `.xm` file next to the Strudel tracks, with an FT2-style panel; not scheduled.
- `#17` Live build mode (song that builds itself while it plays, with short comments; the way to do `#4`): first version on `develop` (steps in the song file, demo "Primo Segnale"); next, a button that derives steps from any song, `#18` Endless mode (built on `#17`), `#19` Device panels for tracks (Reason-style front panels, UI only). `#3` Vocals now starts from short spoken comments as samples (owner's recordings, then macOS `say` or Piper), singing later. Planned order: `#17`, then voices, then `#18`.
- Tracks rework (plan in `docs/PLAN-TRACKS.md`), one issue per phase: `#9` Safety net, `#10` Own rhythm for every instrument, `#11` Song format v2, `#12` Arrangement grid with free tracks, `#13` Effect rack and code tracks, `#14` Free timeline mode.

## Vocabulary (decided 2026-10-06)

- **Song** (IT "brano"): the whole composition. Tab "Songs", "Open song", "New song". "Composition" was considered and dropped because it sits too close to the "Compose" tab.
- **Track** (IT "traccia"): one row of the arranger: an instrument with its settings, rack, patterns and clips.
- **Section** (IT "sezione"): a part of the song (intro, drop). The word "scene" is no longer used in the interface.
- **Pattern**, **clip**: what a track plays, and where.

## Ideas to re-evaluate (lowest priority)

- **Shared patterns across tracks.** Today patterns belong to one track and are reused across its sections and clips. A song-level library could share rhythms (steps) and melodies (degree notes) between melodic tracks, for example bass and guitar in unison; drum rows would stay per track. Owner decision (2026-10-05): not now, per-track patterns are fine.

## Media and demo

- `docs/media/`: README screenshots, `demo.gif` (17 s), `demo.mp4` (38 s, with audio).
- `demo/coding-misk-demo.mp4`: 1:26 demo for the team (git-ignored).
- A video inside the repo shows only as a link on GitHub; for an inline player, upload it through GitHub's web editor.
