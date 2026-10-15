## 1. Path generator (pure, `src/song/crescendo.js`)

- [x] 1.1 Drum row thinning: variants of a rows pattern by removing hits in order of weakness (off-16ths, off-8ths, off-beats, beats 2-4, first beat last), 2 to 4 variants by density, stored as `<name>~1`… in the track's `patterns`
- [x] 1.2 Preset growth: `degrade` rack amounts (about 0.6, 0.35, 0.15, then removed) for tracks whose patterns name a preset
- [x] 1.3 Neutral values per setting (cutoff halfway between 200 Hz and the written value on a log scale, drive/room/delay 0, gain 80%), and moves toward the written value in 1 to 3 steps
- [x] 1.4 Teardown from a destination to a start state, one small change at a time (colour, then pattern fullness, then later tracks, anchor track last), seeded order variation; every intermediate state must compile
- [x] 1.5 `crescendoPath(from, to, rng, opts)`: reverse the teardown into steps, place them 1 to 4 bars apart (1 to 2 when fully narrated), never closer than one bar
- [x] 1.6 Growth span: repeat the first section as needed (within three times the written length), then follow the written clips; a track entering later in the song enters minimal and grows over the next steps
- [x] 1.7 Breaks: one or two seeded break moves during the growth (mute drums, then bring them back), each inside a phrase
- [x] 1.8 Endings: strip back, blocks, or short end, drawn per song and seeded
- [x] 1.9 Module tracks (when the type exists): only enter, leave or mute as a whole (a `module` track gets no plan, so it enters whole)
- [x] 1.10 Held chord during the growth (first chord of the progression in the growth sections), progression brought in by one step
- [x] 1.11 Thin written `notes`/`steps` of bass, arp and hook like drum rows
- [x] 1.12 `crescendoSong(song, { seed, narrated })`: returns the song with generated patterns, extended sections and `build`; seed from the song id

- [x] 1.13 `CRESCENDO_VERSION`, raised when the check's fixtures change

## 2. Narration

- [x] 2.1 Phrase list per kind of step, English and Italian, short and imperative, our own wording
- [x] 2.2 Pick phrases without repeating one within 8 steps; normal density: key steps and about a third of the others, every step when fully narrated
- [x] 2.3 Add the new phrases to `npm run voices` so their samples can be made

## 3. Compose UI and settings

- [x] 3.1 Live build control: off, in blocks, crescendo (`coding-misk-live`, new `coding-misk-live-style`)
- [x] 3.2 "Fully narrated" toggle shown with crescendo (`coding-misk-live-narrated`)
- [x] 3.3 Typing animation: type the edit only on the line of the playing section, update the other section lines at once
- [x] 3.4 Play, seek, timeline hatching and step marks, hand takeover and resume with a Crescendo build
- [ ] 3.5 (audio done: `crescendo-notte-lunga`, 6:14 at 2.3 times the written length, exported fast in 96 s; fast video export still to try) Audio export and fast video export of a Crescendo build (one segment per step; measure speed on a build three times the written length; join steps in the same render block if slow); typing rule of the playing section also in the video feed
- [x] 3.6 Fragments of a Crescendo song start on a step; random fragments prefer stretches with steps over the sparse start

- [x] 3.7 Song field `buildStyle` (`crescendo`, `blocks`) in the format, validator and docs; a song that declares it opens with it
- [x] 3.8 Test songs of different lengths (short, medium, long) with `buildStyle: crescendo`: one with drums and written notes, one on presets

## 4. Checks

- [x] 4.1 Node check (`npm run check:crescendo`): determinism (same song and seed, same steps); every step changes one track; spacing ≥ 1 bar; every state compiles; the state after growth equals the written song; length within three times; endings vary across songs; only functions the compiler already emits
- [x] 4.2 Browser check: a Crescendo build of two built-in songs plays every step without `evalError`, seek lands on the right code, hand takeover and resume work
- [x] 4.3 Levels of a few Crescendo states (no silent or clipping state): measured on the audio export of `crescendo-notte-lunga`, 8-bar windows from -27.8 to -19 dB RMS, peak 0.96
- [x] 4.4 Existing checks still pass (`check:code`, `check:songs`, `check:endless`, `check:export`, `check:video`, `check:guide`, snapshot levels)

## 5. Docs

- [x] 5.1 Guide card for Crescendo in English and Italian (`src/guide.js`)
- [x] 5.2 `docs/COMPOSING.md` (live build build styles) and `docs/SONG-FORMAT.md` (generated pattern names)
- [x] 5.3 `docs/ARCHITECTURE.md` (path generator) and DEVLOG entry
