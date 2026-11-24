# Proposal

## Why

A held note in the app never moves (#95). Strudel reads effect values at each note's onset, so `.lpf(sine.slow(8))` on a pad held for a bar stays frozen for that bar, and `slider()` changes only the next notes. The app writes no modulator that runs inside a note except the Tremolo device: the catalog lists `env`, `lfo`, `lpenv`, `lpsync`, `bmod` and `duckorbit` as never written (`docs/STRUDEL-FUNCTIONS.md`).

Three things are missing:

- **Continuous movement inside a note or across bars:** a filter that opens over 8 bars, a filter or a pan that sways in time.
- **Sidechain pump** on a held pad.
- **A knob that moves a note already sounding.**

Decode needs the same words: it cannot write a pumping pad until the app can play one, and it cannot learn to measure one without test songs whose modulation is known (owner's proposal, `notes/modulazione-proposta-2026-11-21.md`, steps 1 and 2).

## Relationship with #94 (`random-sound-params`)

- **#94 is per-hit seeded variation.** Each note gets a different random value, fixed at its onset (`vary`), plus composed drum tones (`tone`) and the sound dice in Compose.
- **This change is movement with a shape over time,** inside a held note or across bars, plus knobs that act at once. It holds no random value.
- **Both write effect parameters on a track.** This change does not reuse `vary` or `tone`: modulation lives in the track's rack as devices, beside the two settings. It builds on #94's structures where they meet: the writer's "one call per control" merge, the validator rule that skips a `vary` target a rack device writes, the dice that keeps the user's rack devices, and the session `sound` version for future generator use (design D2).
- **This change depends on #94 being merged first.** The implementation branches from `feat/94-random-sound-params`.

## What Changes

- **Three ordinary rack devices,** added from the existing rack menu in a new "Movimento" group, for melodic tracks (bass, arp, hook, pad, guitar, code):
  - **Sweep** ("Apertura"): moves a target (filter, high-pass, reverb send, delay send) from one value to another over 1 to 16 bars, linear or exponential, gliding inside held notes.
  - **LFO** ("Oscillazione"): sways a target (filter, pan, reverb send, delay send) in time with the song, 1/16 bar to 4 bars, with a depth and a shape.
  - **Pump** ("Pompa"): ducks the track on every kick through Strudel's `duckorbit`, with a depth and a recovery time; without a kick in the section, a gain LFO on the beat.
- **Test songs at the Decode bench:** held-out app songs with pads modulated by known parameters (pump, filter LFO, tremolo, sweep), a reader of the modulation truth from a song, and a new envelope error per band and per beat phase next to the band error in `tools/decode-bench.cjs`.
- **Knobs, designed now, built in a later phase:** every movement device always shows one main knob on its card (Sweep opening, LFO depth, Pump depth). It starts at the set value and, turned, acts at once through Strudel's `bmod` bus, also on a note already sounding. A record dot records the movement into the song, and exports replay it. The radio console shows the knob inside the existing Parts row while that part plays a movement device; it acts while the song plays and is not recorded. In code it is `knob(n)`, drawn as a slider widget. Copied code gets the path as steps per bar. Tracks without a movement device have no knob.
- **Existing songs are unchanged:** no new default setting, no version bump; a song without the new devices compiles byte for byte as today.
- **Movement parameters (second step, design D11 to D13):**
  - **Phase** ("Fase") on Oscillazione and on Pompa's beat dip: where the wave starts inside its period, the same in playback, fast export and real-time export, written in the copied code (`phaseoffset`, `tremolophase`).
  - **Two new Oscillazione targets:** volume (tremolo, the same Strudel calls as the existing Tremolo device) and pitch (vibrato, Strudel's `vib` and `vibmod`).
  - **Gate ritmico** ("Rhythmic gate"): a fourth movement device that cuts the sound on a pattern of 16 steps per bar (trance gate), with presets, depth, smoothing of the edges and phase.
  - The rule "at most two movement devices per track" stays. Old songs compile byte for byte as before: every new value is neutral by default.

## Out of scope (future work)

- **Decode writes modulation** (owner's step 3): measuring pump, gate, sweep, tremolo and stab length in real tracks and writing them.
- **Generator, Live coder growth and radio console commands** (owner's step 4): recipe fields such as "pump" for house and techno, a Live coder line that adds `.lpenv`, radio keys "Open the filter in 8 bars", "Pump", "Sway". They will draw from a new `material:mod` stream behind a `sound` version step from #94.

## Capabilities

### New Capabilities

- `app/modulation-devices`: Sweep, LFO, Pump and Gate in the rack: arguments, phase, code, level rule, how they meet track settings and #94's `vary`.
- `app/device-knobs` (later phase): the main knob of each movement device, the bus, the knob in Compose, radio and code, the recorded path and what export does with it.
- `app/decode-modulation-bench`: the modulated test songs, the truth reader and the envelope error.

### Modified Capabilities

None. The rack and #94's variation keep their requirements; the meeting points are new requirements of `app/modulation-devices`.

## Impact

- Step 1: `src/song/rack.js` (three devices, a `writes` list per device), `src/song/compile.js` and `src/music.js` (the Pump write on kick lines, target base values), `src/song/validate.js`, `src/main.js` (device cards), `src/i18n.js`, `src/guide.js`, `docs/SONG-FORMAT.md`, `docs/STRUDEL-FUNCTIONS.md` (catalog: written), `docs/knowledge/`, `songs/examples/`.
- Step 2: `tools/decode-songs.mjs`, `tools/decode-hits.mjs`, `tools/decode-bench.cjs`.
- Movement parameters: `src/song/movement.js` (phase, the new targets, Gate), `src/song/rack.js` (the Tremolo device's code shared with the volume target), `src/main.js` (the Gate's step row), `src/i18n.js`, `src/guide.js`, `docs/SONG-FORMAT.md`, `docs/knowledge/`, `songs/examples/`, `tools/check-modulation.mjs`, `tools/check-modulation.cjs`.
- Later phase: `src/sounds/` (bus driver), `src/render/page.js` (path in the fast export), `src/radio/radio.js`, the code editor widgets (`src/live/widgets.js`, `src/widgets/app-widgets.js`), `src/style.css`.
- Checks: `check:code` unchanged, `check:songs`, `check:strudel`, `check:functions`, `check-levels.cjs`, a new `check:modulation` (Node) and `tools/check-modulation.cjs` (browser), `check:decode`.
