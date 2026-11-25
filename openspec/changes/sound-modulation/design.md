# Design

## Context

What the code and the installed Strudel do today (`@strudel/core` 1.2.6, superdough 1.3.0, read on `develop` with #94's spec on `feat/94-random-sound-params`):

- **Effects are read at the onset.** A held note keeps the value it started with. Only modulators built at the onset move inside a note: ADSR, the filter envelope (`lpenv`, `lpattack`…), the filter LFO (`lprate`, `lpsync`, `lpdepth`, `lpshape`, `lpdc`), `tremolo*`, the phaser, and the generic modulators `.lfo()`, `.env()` and `.bmod()` (`core/controls.mjs:2838-3060`, `superdough/modulators.mjs`).
- **Generic modulator targets** (`superdoughdata.mjs`): `gain`, `pan`, `cutoff` (`lpf`), `hcutoff` (`hpf`), `room`, `delay`, `distort`, the phaser, `tremolodepth`, and others. A target must exist on the note: `.lfo({ c: 'room' })` on a line without `room` finds no node.
- **Depth is relative by default.** `.lfo()`, `.env()` and `.bmod()` scale `depth` by the target's value at the onset, and a value of 0 counts as 1 (`connectLFO`, `connectEnvelope`). `.bmod()` also divides its depth by 0.3 (`connectBusModulator`). `depthabs` (`da`) sets an absolute depth instead. Frequency targets are clamped to 20-24000 Hz.
- **LFO rate in time with the song.** `sync` is cycles per period: the frequency is `sync × cps`. A cycle is a bar in this app (`setcpm(bpm/4)`), so `sync: 4` is a quarter-bar LFO and `sync: 0.25` is a 4-bar one. Shapes: `tri`, `sine`, `ramp`, `saw`, `square`. The LFO starts at each note's onset.
- **Bus.** `.bmod({ bus: N, c: 'lpf' })` (alias `b`) reads `controller.getBus(N)`, a stereo node made on first use; the second argument is the modulator's `id`, not the bus. `controller.reset()` disconnects and drops every bus (`superdoughoutput.mjs:188-197`).
- **Sidechain.** `duckorbit` (alias `duck`), `duckdepth`, `duckattack` (the recovery time, at least 2 ms) and `duckonset` are read on the source's note; superdough ducks the target orbit's output (`superdough.mjs:511`). Several orbits: mininotation `"6:9"`, with per-orbit depth `"0.6:0.4"`. A missing target orbit logs an error.
- **Orbits.** `compile.js:63-75` gives every track its own orbit: the first track of a type keeps `ORBIT_OF[type]` (pad 6), others get 9 and up. A Pump on one pad ducks only that pad.
- **Rack.** `src/song/rack.js` holds the devices: `{ kind, label, args, extra?, code(args, type) }`, written after the instrument by `rackCode`. Compose draws each device as a `.device` card with an LED, the code preview, ▲▼✕ and one control per argument (`src/main.js:3955-3966`). The FM rise (`riseTop`) and Fold steps are the precedent for movement over bars, sampled at each sixteenth.
- **Track automation.** A track's `cutoffEnd`, `gainEnd` and the `filter` move (`src/music.js` ~465) are values per onset.
- **#94** (`random-sound-params`, being implemented): track settings `tone` (drums) and `vary` (per-hit seeded values relative to the track's own value). Its D4 rule: one call per control on a line, and a `vary` target that a rack device writes later on the line is skipped with a warning. Its dice keeps every rack device except the `fm` device it adds. Its session option `sound` (`SOUND_VERSION`) turns generated sound features on.
- **Radio console.** The Parts group (`src/radio/radio.js:1808`) has a `.steer-part` row of chips (lead, bass, arp, pad), a target menu, then the Vary and Swap keys, in one `.steer-btns` row.
- **Code editor.** `slider(v, min, max)` draws a slider widget inside the code; moving it changes the next notes only. The app has its own code widgets (`src/widgets/app-widgets.js`, `src/live/widgets.js`).
- **Fast export** renders in an `OfflineAudioContext` (`src/render/page.js:80`) with its own superdough controller.
- **Decode bench.** `tools/decode-songs.mjs` holds app songs with known truth (tempo, chords, grids) in TUNING, VALIDATION and FRESH sets; `tools/decode-hits.mjs` measures per bar and band (low 30-150 Hz, mid 150-2000, high 5-16 kHz) the hits and how held each band is; `tools/decode-bench.cjs` reports the band error and the other scores.

## Goals / Non-Goals

**Goals:**

- Sweep, LFO and Pump rack devices that move a held note, deterministic, with no random value.
- Test songs with known modulation and an envelope error at the Decode bench, so step 3 has a baseline.
- The design and UI placement of the devices' knobs, built in a later phase.
- Every existing song compiles byte for byte as today.

**Non-Goals:**

- Decode measuring and writing modulation (owner's step 3).
- Generator, style recipes, Live coder growth and radio console commands that add modulation (owner's step 4).
- Modulating the pitch envelope (`penv`), the FM index (the FM rise exists) or drum rows. (Vibrato came with the movement parameters, D12.)
- Changing #94's `vary` or `tone`.

## Decisions

### D1. Rack devices, not a track setting

- **Where.** Sweep, LFO and Pump are ordinary rack devices of a new kind `move`, added from the existing rack menu ("+ Add device") in a new group "Movement" (Italian "Movimento"), on melodic tracks: bass, arp, hook, pad, guitar, code. Not on drums (Pump's source is the kick), voice, spoken, texture and riser tracks in this version.
- **Why the rack.** The rack is already per track, ordered, bypassable and drawn as cards, which is where the knob goes (D7). Modulation has a shape, a rate and, for Pump, a write on another track: none of that fits `vary`'s entry `{ on, amount, seed, cycles }`.
- **Limits.** At most one Sweep and one LFO per target and one Pump per track; at most two movement devices per track, so a track shows at most two knobs (D8). The validator reports more.
- **No randomness.** Every device is a pure function of its arguments and the song time. "Seeded and deterministic" holds without a seed. The future generator (step 4) draws device arguments from a new `material:mod` stream, so it never moves another draw.

### D2. Built on #94, depends on it

The change sits beside `vary` and `tone` and reuses #94's structures:

- **A `writes` list per device.** Each rack device declares the controls it writes as a base value (`lpf: ['cutoff']`, `delay: ['delay']`…). #94's D4 rule "a target a rack device writes later on the line is skipped" reads this list instead of a hard-coded set. Sweep declares its target; LFO and Pump declare nothing, since they move around the base and never replace it.
- **Vary and movement together.** `vary` on `lpf` with an LFO on the filter: the per-hit value is the base and the LFO sways around it, because depth is absolute (D3). `vary` on `lpf` with a Sweep on the filter: the Sweep writes the base, so `vary` is skipped with #94's warning.
- **One call per control.** The writer's merge from #94 D4 also merges the base values this change adds (D3), so a line never holds two `.room()` calls.
- **Dice.** #94's dice keeps the user's rack devices, so it never rolls a movement device. No change to the dice.
- **Version.** Step 4 will gate generated modulation behind the next `SOUND_VERSION` step of #94's `sound` option, not a new option.
- **Order.** The implementation branches from `feat/94-random-sound-params` after it merges into `develop`. Task 0.1 rebases if #94 changed its D4 merge.

### D3. Code: absolute depth, a base value always present

- **Absolute depth.** Every `.lfo()`, `.env()` and `.bmod()` the app writes uses `da` (`depthabs`), computed from the device's arguments. This avoids the "0 counts as 1" and the `/0.3` traps (Context).
- **Base value.** A generic modulator needs its target on the note. When the line has no value for the target, the writer adds one: the track's own setting when it has one (`room`, `delay`), else the device's centre (`pan` 0.5, `room` and `delay` 0.001, so the base is silent but present). Merged per D2.
- **Order.** Movement devices write after the other rack devices of the line, so an LFO on `room` follows a Reverb device's `room`. The device order inside the movement group is the rack order.

### D4. Sweep ("Apertura")

| Argument | Values | Default |
| --- | --- | --- |
| target | `filter` (low-pass), `hpf`, `room`, `delay` | `filter` |
| from, to | filter and hpf 60-18000 Hz; room and delay 0-1 | 400 → 4000 |
| bars | 1, 2, 4, 8, 16 | 8 |
| curve | `exp` (default for filters), `linear` | `exp` |
| repeat | `once` (holds `to` after the bars), `loop` | `once` |

- **Code across notes.** The base at each onset follows a ramp aligned to the clip's start, like the FM rise: `.lpf(saw.slow(8).rangex(400, 4000))` for `exp`, `.range()` for `linear`, with `riseTop` so the last step reaches `to`. `once` holds the last value after `bars` (the writer splits the clip: ramp, then a plain value).
- **Glide inside a held note.** For tracks whose notes last a bar or more (pad, held presets, a code track the writer cannot judge: off), the writer adds `.env({ c: 'lpf', a: <bar seconds>, s: 1, da: <step per bar> })`, so the value climbs inside each bar to where the next bar starts. Bar seconds come from the section's tempo (the mean of `bpm` and `bpmEnd` when the tempo moves). Task 1.3 measures it in the browser; if the glide clicks or overshoots, the device keeps the steps per onset only and D4 records it.
- **A note held over the whole sweep** (one chord for 8 bars): the env alone, `a` = the sweep's length, `da` = `to - from`.
- **Track automation.** A Sweep on the filter replaces the track's `cutoffEnd` and `filter` move on its line; a Sweep on `room` or `delay` replaces the track's value. The validator warns.

### D5. LFO ("Oscillazione")

| Argument | Values | Default |
| --- | --- | --- |
| target | `filter`, `pan`, `room`, `delay` | `filter` |
| rate | 1/16, 1/8, 1/4, 1/2, 1, 2, 4 bars | 1/2 |
| depth | 0-1 of the target's range | 0.4 |
| shape | `sine`, `tri`, `saw`, `ramp`, `square` | `sine` |

- **Code.** Filter: `.lpsync(s).lpdepth(d).lpshape("sine")` with `s = 1 / rate`; `lpdepth` is in octaves-like units of the filter LFO, so the writer maps depth 0-1 to 0-4 and task 1.4 checks it by ear and by spectrum. Pan, room, delay: `.lfo({ c: 'pan', s: 2, da: d, sh: 'sine' })` with `da` = depth × 0.5 for pan, depth × the base's headroom for sends.
- **Gain is not a target.** The Tremolo device already sways the gain inside the note. (Superseded by D12: the target "volume" writes that same tremolo.)
- **Phase.** The LFO restarts at each onset, so a pad struck on the bar line sways in phase with the bar. Notes struck off the grid start their own phase; the guide says so. (Measured later: the wave follows the song, see the implementation notes; D11 adds a phase argument.)

### D6. Pump ("Pompa")

| Argument | Values | Default |
| --- | --- | --- |
| depth | 0-1 | 0.6 |
| recover | 0.05-0.5 s | 0.15 |
| rate (no kick) | 1/4, 1/8, 1/16 bar | 1/4 |

- **With a kick.** The compiler adds to every kick line (row `bd` of every drums track playing in the section) `.duck("<orbits>").duckdepth("<depths>").duckattack("<recovers>")`, one entry per pumped track. The pumped track's own line gets nothing. The write sits after #94's tone on the row's line.
- **Without a kick** in a section: the pumped line gets a gain LFO on the beat that only dips: `.lfo({ c: 'gain', s: 4, sh: 'ramp', da: -depth × g, dc: … })`. Task 1.5 picks the shape and offset so the gain never rises above the track's own (falling ramp from the onset, back by the next beat).
- **Never louder.** Ducking only lowers the orbit. The level rule: each line's peak with Pump is at most its peak without, plus 0.02 of measurement noise (`check-levels.cjs`).
- **Many pumps.** Two pads with Pump: one `duck("6:9")` on the kick with two depths.

### D7. Knobs (later phase)

- **One main knob per device, always.** Every movement device shows one knob on its card. No mark or toggle turns it on. The knob's parameter per device:

| Device | Knob | Range |
| --- | --- | --- |
| Sweep | opening: where the sweep is between `from` and `to` | 0-1 |
| LFO | depth | 0-1 |
| Pump | depth | 0-1 |

- **Starts at the set value.** The knob shows the device's own value. Untouched, the device plays exactly as set.
- **Acts at once, through the bus.** Sweep and LFO: the writer adds `.bmod({ b: N, c: '<control>', da: <range> × 0.3 })`, `N` the song's k-th movement device. The bus carries the knob's offset from the set value, so an undriven bus (0) sounds as set: a page or export that never touches a knob is unchanged. The page drives each bus with a `ConstantSourceNode` and reconnects every bus after each `reset()` (Play, Stop, a new evaluation that resets). A note already sounding moves.
- **Pump needs no bus.** `duckdepth` is read at each kick, so the Pump knob writes through a `ref()` read at each onset: it acts from the next kick, within a beat.
- **Tracks without a movement device have no knob.** Their settings change from the next note, as today.
- **Record dot.** With the card's record dot on, knob moves while the song plays in Compose are recorded on the device as `path: [[bar, value], …]` (sixteenth resolution, at most 256 points, thinned to the moves). On playback the path drives the bus, with `setValueAtTime` and `linearRampToValueAtTime` scheduled a bar ahead. A hand on the knob wins until it is released.
- **Export.**
  - Real-time export: the same as playback.
  - Fast export: the render page builds the same `ConstantSourceNode`s on its own controller and schedules each path as automation from the export's start bar.
  - Code copied out of the app, or opened in plain Strudel: no bus there. The writer leaves out the `bmod` and writes the path as steps per bar into the base (`.lpf("<800 1200 2000 …>")`), or the set value when no path exists. The copied code's comment line says the knob became steps.
  - Radio, Live coder growth: a device plays its path, else its set value.
- **Decode, generator:** never write a path.

### D8. Where the knobs go (later phase; revisit at the UI review)

The owner finds the interface cluttered, so no permanent panel is added:

- **Ordinary rack devices.** Sweep, LFO and Pump are added from the existing rack menu ("+ Add device", Italian "+ Aggiungi modulo") in a new group "Movement" (Italian "Movimento"), next to the Notes and Sound groups. There is no separate panel or menu.
- **Compose rack card.** The knob is the first row of the device's `.dev-args`, with the record dot next to it. A small drawn mark next to the knob (an arc with a lightning tip, `src/icons.js`) shows that it acts at once; its tooltip says "acts on the notes already sounding". The word "Live" is not used. In the hardware theme the knob is the theme's knob; in neon and light it is the existing range input with a larger thumb. Other cards keep their controls as today.
- **Knobs per track.** A track holds at most two movement devices (D1), so at most two knobs.
- **Radio console.** In the Movement row of the track card that opens under a Mixer row (`console-track-card`, D6), only while that track plays a movement device: one compact knob per device of the track, at most two, labelled by the device, with the same mark. It acts while the song plays and is never recorded. A track without a movement device shows no Movement row. (Until 2026-11-24 the knobs were planned in the Parts row, after Vary and Swap; the owner chose the track card instead.)
- **Code.** `knob(n)` written by the app in place of the device's `bmod` line, drawn by the editor as the same slider widget `slider()` gets (task 6.5 checks the transpiler's widget hook; else an app code widget). In a code track the user may type `knob(…)` by hand.
- **Not added:** a mixer strip, a floating knob panel, knobs on the player bar or on the arranger rows.

### D9. Test songs at the Decode bench

- **Songs.** Five new held-out songs in `tools/decode-songs.mjs` (VALIDATION set), each in two takes: the pad alone with bass, and the same with drums, so step 3 can check that a kick is not read as a pump.

| Song | Pad movement | Truth |
| --- | --- | --- |
| `mod-pump` | Pump depth 0.6, recover 0.15 s | `{ device: 'pump', depth, recover }` |
| `mod-gate` | Pump without kick, rate 1/8 | `{ device: 'pump', rate, depth }` |
| `mod-lfo` | LFO filter, rate 1/2, depth 0.5, sine | `{ device: 'lfo', target, rate, depth, shape }` |
| `mod-trem` | Tremolo (existing device), rate 8, depth 0.6 | `{ device: 'tremolo', rate, depth }` |
| `mod-sweep` | Sweep filter 300 → 5000 over 8 bars, loop | `{ device: 'sweep', from, to, bars }` |

- **Truth reader.** `modTruth(song)` returns each track's movement devices with their arguments from the song itself, so the truth always matches the app's code.
- **Envelope error** (`envelopeError(fo, fc, grid)` in `decode-hits.mjs`): for each band (the three of `decode-hits`), the level per beat phase, 32 bins per beat, folded over every bar of the file and normalized by the band's mean; the error is the mean absolute difference in dB, original against code. Reported per band next to the band error in `decode-bench.cjs`, for every bench file with a known grid, real tracks included.
- **Parameter score** (`modScore(truth, measured)`): rate right (exact choice) and depth within 0.15. In this change it runs on the truth against itself and against a song without modulation, to fix the scale; step 3 gives it a measurer.
- **Baseline.** One bench run records the envelope error of the current decoder on every set in the DEVLOG, so step 3 must not make it worse.

### D10. Checks

- `check:code` unchanged; `check:songs`; `check:strudel` (`lpsync`, `lpdepth`, `lpshape`, `lfo`, `env`, `rangex`, `duckorbit`, `duckdepth`, `duckattack` in the catalog) and `catalog:strudel`.
- New `check:modulation` (Node): device code for every target and argument, base values merged, the kick lines with one and two pumps, `once` and `loop`, the validator's errors and warnings, `vary` skipped or kept per D2, Strudel in Node evaluates every line.
- New `tools/check-modulation.cjs` (browser): an example song per device plays with no `evalError`; levels with and without each device (Pump never louder; Sweep and LFO peaks at most the open filter's peak plus 0.02); the glide of D4 sampled by spectrum at four points of a held bar; fast export against real time.
- `check-levels.cjs` on the new example songs; `check:decode` with the new songs; `check:guide`, `check:knowledge`.

## Implementation notes (2026-11-24, steps 1 and 2)

What the code and the measures settled (`src/song/movement.js`, `tools/check-modulation.mjs`, `tools/check-modulation.cjs`):

- **D2.** #94's D4 rule was as read: the writer drops a `vary` target a later call on the line writes, and `varySkips` lists the controls rack devices write. The `writes` lists live in `src/song/writes.js` (no imports), read by the rack and by the variation, because the variation importing the rack would close an import ring with `music.js`.
- **D3.** Base values follow the rule: the track's own value when the line writes it (it stays the one call), else the track's setting (the filter at the track's cutoff, also when 18000 leaves `.lpf` out), else pan 0.5 and sends 0.001.
- **D4.** The glide is kept: on a held pad the brightness rises through the bar to the next bar's value with no overshoot, where steps alone stay flat. "Held" is a pad with a legato preset or an idea that holds, no steps, and no rack device that cuts it (`seg`, `ply`, `echo`, `off`, `degrade`); the writer then writes one value per bar and a per-bar `da` list, both rotated to the clip's start. A chord held over several bars is not detected: it glides through its first bar and holds there. On short notes `once` past the sweep picks `to` with `"<0!8 1!…>".pick([ramp, to])` (Strudel has no `min` on patterns). Sends are always linear.
- **D5.** The LFO's phase follows the song, not the note: superdough starts the wave at `cycle × sync` (the hap's bar), so a note struck off the grid starts mid-wave. `lpdepth` is linear, a share of the cutoff peak to peak (`depth × frequency`, centred, clamped to 30-20000 Hz): the writer maps depth 0-1 to `lpdepth` 0-1.8 (0.1 to 1.9 times the cutoff). Pan: `da` = 2 × depth (the panner runs from -1 to 1). Sends: `dc: 0`, `da` = 0.5 × depth, so a send never goes below its own value.
- **D6.** The dip without a kick is a rising ramp with `dc: -1` and `da` = depth × gain (the lower end of a gain ramp; 0.8 for the guitar's fixed gain, a code track's own `.gain(n)` or 1): from `gain - da` to `gain` over each beat. Superdough skips a duck while the target orbit has played no note (the first kick of a section, logged as an error) and throws on a duck in the first 10 ms of a render; `src/sounds/duck-guard.js` makes the orbit first and moves such a duck to 10 ms. On the render page the guard also schedules the orbit's dip on the audio clock, since superdough's timer reads the offline context's current time and two renders differed. A section counts as having a kick when a playing drums track has a clip in it with a sounding kick line; a pumped track in a section with a kick only in part of it ducks there and does not dip.
- **D7, D8 (tonight).** Each movement card shows its main knob (Sweep `to`, LFO and Pump `depth`) as the first, full-width slider with a larger thumb and a tooltip; moving it re-evaluates the song, so it is heard from the next note (Pump: the next kick). The knob that moves a note already sounding (the `bmod` bus, the record dot, the radio knob, `knob()`) stays in tasks 6.x. The add menu blocks a third movement device and a second Pump with a toast.

- **D9 (bench, 2026-11-24).** The envelope error works on the bench's features (frames of 2048 samples every 512, 32 phases a beat folded over every beat). Its scale is weaker than the spec expected: `mod-pump-bare` against its still take is 0.62 dB in the mid band (the scenario asks for at least 1 dB), because the bass fills the same band and the frame smooths the dip; the tremolo song reaches 2.7 dB, the sweep 8.6 dB in the high band. A finer measure on the chords' tonal bins (as the owner's proposal suggests) belongs to step 3. Level B decoded `mod-pump-bare`, which has no drums, with a four-on-the-floor kick: the pump read as a kick, the risk step 3 must avoid. (Decode round 15: the weak scale came from the fast export, which started each note's LFO and tremolo wave at its time in seconds, so the Pump without a kick drifted a quarter beat per bar; with the note's cycle passed, as the live player does, `mod-pump-bare` reads 2.02 dB. The kick on the drumless songs came from the pad and the bass, not the pump: `decode-round15` B.)

## Movement parameters (D11 to D13, second step)

What the installed superdough (1.3.0) offers, read for this step:

- **Generic LFO.** `connectLFO` starts the wave at `cycle / cps × frequency + phaseoffset` (`modulators.mjs`, the LFO worklet in `worklets.mjs`), so with `sync` the wave follows the bar. `phaseoffset` has no alias, and `.lfo({ … })` passes any key it does not know to the worklet, so `.lfo({ c: 'gain', …, phaseoffset: 0.5 })` works (the Decode bench used it, `tools/decode-mod-bench.cjs`).
- **Tremolo.** The same LFO worklet on a gain node: `tremolosync`, `tremolodepth`, `tremoloshape`, `tremolophase`, skew 0.5 when a shape is set. The gain is `1 - depth` plus the wave clamped to 0-1, so the tremolo never raises the note.
- **Filter LFO** (`lpsync`, `lpdepth`, `lpshape`): built inside the filter, with no phase input.
- **Vibrato.** `vib` (rate in Hz) and `vibmod` (depth in semitones) add a sine oscillator on the source's detune, started at the note's onset. It works on every source (synths, samples, soundfonts); it has no sync, no phase and no shape.
- **Fast export.** Since `ef0bfb0` the render page passes the note's cycle, as the live player does, so every wave above starts at the same phase in playback, fast export and real-time export.

### D11. Phase ("Fase")

| Device | Argument | Values | Default |
| --- | --- | --- | --- |
| LFO, Pump, Gate | phase | 0 to 0.95, step 0.05 | 0 |

- **Meaning.** How late the wave starts, as a share of its period: Fase 0.25 on a Pump at 1/4 bar puts the dip a sixteenth after each beat. For the Gate the share is of one step (D13), since a whole step is a pattern edit.
- **Code.** Strudel counts the other way (`phaseoffset` moves the wave earlier), so the writer writes `1 - phase`: `phaseoffset: 0.75` for Fase 0.25 on generic LFOs (pan, sends, the Pump's dip, the Gate), `.tremolophase(0.75)` on volume. Phase 0 writes nothing, so every existing song compiles byte for byte as before.
- **Filter.** The filter LFO has no phase input. With a phase, the writer writes the filter LFO in the generic form, `.lfo({ c: 'lpf', s, da: depth × 1.8 × cutoff, sh, phaseoffset })`, the same centred swing as `lpdepth` (D5 notes) around the line's base cutoff. Phase 0 keeps the `lpsync` form. The one difference: with #94's `vary` on `lpf`, the generic form's swing follows the base cutoff, not each hit's value.
- **Pump with a kick.** The dip follows the kick; phase moves only the beat dip of a section without a kick. The card's tooltip says so.
- **Pitch.** Strudel's vibrato has no phase: phase on the pitch target does nothing, and the validator warns.

### D12. Oscillazione on volume (tremolo) and on pitch (vibrato)

| Target | Code | Depth 1 means |
| --- | --- | --- |
| `volume` | `.tremolosync(1/rate).tremolodepth(depth).tremoloshape("<shape>")` | the sound goes down to silence at the wave's low point |
| `pitch` | `.vib(<Hz>).vibmod(<semitones>)` | half a semitone up and down |

- **Volume reuses the Tremolo device.** The rack's Tremolo device and the volume target write the same Strudel tremolo through one function in `movement.js`; the Tremolo device's code does not change. The volume target adds a shape (so the wave is symmetric, skew 0.5) and the phase. The Tremolo device stays a Sound device, outside the two-device rule. A Tremolo device and an LFO on volume on one track: the LFO wins, the Tremolo device's calls leave the line and the validator warns, as for a Sweep over the track's own value (D4).
- **Pitch through `vib`.** The generic LFO on `note` moves the source's frequency in Hz on synths but falls back to the detune in cents on samples, so one absolute depth cannot serve both. `vib` acts in semitones on every source. The rate in Hz comes from the section's tempo, `1 / (rate × bar seconds)` with the bar seconds of D4 (the mean tempo under a ramp). Depth 0 to 1 maps to `vibmod` 0 to 0.5 semitones (0.4 is 20 cents each way). The wave is a sine that starts with each note, so shape and phase do nothing and the validator warns when they are set.
- **No base value.** The tremolo makes its own gain node and the vibrato its own oscillator: the writer adds nothing to the line.
- **Never louder.** The tremolo only lowers the sound; the vibrato does not change the level.

### D13. Gate ritmico ("Rhythmic gate")

| Argument | Values | Default |
| --- | --- | --- |
| pattern | 16 steps, `x` open and `.` closed, at least one of each; five presets | `x.x.x.x.x.x.x.x.` |
| depth | 0-1 | 0.8 |
| smooth | 0, 0.1, 0.25, 0.5 of a step | 0.1 |
| phase | 0-0.95 of a step (D11) | 0 |

- **Presets:** Ottavi `x.x.x.x.x.x.x.x.`, Controtempo `..x...x...x...x.`, Trance A `xx.xx.x.xx.xx.x.`, Trance B `x.xx.xx.x.xx.xx.`, Puntato `x..x..x..x..x.x.`. The card shows the 16 steps as a row of toggles (the step row of the pattern editor) and a menu of presets; a song file may hold any pattern of 16 steps.
- **Code: a gain LFO per closed run.** The gain dips by `depth × g` during each run of closed steps, `g` the line's gain as for the Pump's dip (D6 notes). With `smooth` 0, each run is one generic LFO on `gain`: square, `dc: -1`, skew `1 - run`, `phaseoffset` at the run's end, one cycle per bar. A pattern that repeats every 2, 4 or 8 steps is written once for its period (`s` 8, 4, 2), so Ottavi is a single LFO.
- **Smoothing.** With `smooth` above 0, each run is two triangle LFOs whose sum is a trapezoid: with `k = 1 - run` and the ramp `r` (both shares of the period), `tri_k(u - a) - tri_k(u - a - r)` rises over `r`, holds, and falls over `r`; Strudel has no negative wave, so the second one is written as `tri_(1-k)` shifted by `k`, which equals `1 - tri_k`. Each LFO has depth `depth × g × k (1 - k) / r`, and their offsets put the high plateau at 0 and the low one at `-depth × g`. The ramps are centred on the run's edges, so a step keeps its length. Both LFOs start on the same audio block, so the sum is exact. A model of superdough's LFO in `check:modulation` samples the sum against the pattern.
- **Why not the duck or `struct`.** A duck dips and recovers, it holds no step, needs a trigger line and cancels a Pump's duck on the same orbit. `struct` or `seg` cut a held note into new notes: the pad's attack starts again and the Sweep's glide breaks.
- **Existing gate usage.** The bench song `mod-gate` (D9) is a Pump without a kick at 1/8 bar. The Gate reuses that dip's gain rule and LFO form; the bench song stays as it is.
- **Limits.** One Gate per track; a Gate counts in the two movement devices. Gate and Pump on one track is an error: both dip the gain, and two deep dips could pass zero and flip the sound. Above 6 closed runs in a bar (12 LFOs per note) the validator warns about the cost.
- **Meter.** The 16 steps divide the bar evenly, also in meters other than 4/4.
- **Never louder.** The gain only goes down: the level rule of D6 holds.

### Implementation notes (2026-11-24, D11 to D13)

- **As designed.** The phase, the two targets and the Gate went in as written. `gateRuns` reads a pattern's shortest period and its closed runs; `gateCode` writes 5-decimal depths and offsets so the two triangles of a run cancel to well under a thousandth of the gain.
- **Measured** (`tools/check-modulation.cjs`): closed steps -158 dB, open steps 0 dB; smoothing 0.5 fades the edge (-11 dB just past it) where hard edges are silent; a phased dip and a phased tremolo move their low point by the phase; a vibrato at depth 1 swings a sine about 90 cents peak to peak. Every superdough LFO starts on the first audio block after the note's onset, so the Gate's edges come about 3 ms late, in playback as in the export. Example 10 exported fast and in real time: the gated pad and the phased bass dip agree within 1/64 bar.

### Checks for D11 to D13

- `check:modulation` (Node): the code of every new target and argument, phase 0 writing nothing, the filter's generic form with a phase, the Gate's runs and periods, the trapezoid sampled with a model of the LFO worklet at 64 points a bar against the pattern (closed steps at `1 - depth`, open steps at 1, never above 1), the validator's new errors and warnings, Strudel in Node evaluating every line, and the existing songs' code unchanged (`check:code`).
- `tools/check-modulation.cjs` (browser): an example song with a Gate, a tremolo, a vibrato and a phased Pump plays with no error; levels with and without (never louder); the envelope of the Gate and of the phased dip in playback against the fast export, aligned within a 32nd.

## Path engine (D14 and D15, spec only)

### D14. Path engine ("Percorso")

- **Why.** Decode will write movement it measures in real tracks: the fade-in of a quiet intro, the fade-out of an ending, a filter that opens unevenly. A Sweep is one straight ramp and an LFO repeats; neither fits. The knobs' recorded gesture (D7) is the same thing: a value that follows a curve. So the engine comes first, as an ordinary movement device usable without any knob, and the knobs (section 6 of the tasks) build on it.
- **The device.** `{ "device": "path", "target": "filter", "points": [[0, 400], [2.5, 900], [4, 3000]], "smooth": "linear" }`:

| Argument | Values | Default |
| --- | --- | --- |
| target | `filter`, `hpf`, `volume`, `room`, `delay`, `pan` | `filter` |
| points | `[bar, value]` pairs, bars from the song's start, increasing; values in the target's range (filters 60-18000 Hz, volume 0-1 of the track's gain, sends 0-1, pan 0-1) | none (the device needs points) |
| smooth | `linear` (straight lines between points), `step` (each value held until the next point, edges of 10 ms) | `linear` |

  Before the first point the value is the first point's, after the last the last one's. Pitch is not a path target in this step: a pitch curve needs the source's frequency, whose unit depends on the sound (D12).
- **How it moves a held note.** Inside a note only a modulator moves a value (Context). The engine uses Strudel's bus: a path line plays Strudel's constant sound `one` (a `ConstantSourceNode`) into a bus with no dry output, and the moved line reads that bus with `.bmod({ b: N, c, da })` over a base value. Each point is a short note of `one`; with `linear` its gain envelope is a triangle from the previous point's time to the next point's (linear attack and decay), and overlapping triangles sum to the straight line through the points. With `step` each note holds its value until the next point. For example, a volume path on a pad:

  ```js
  $: s("one").struct("x*4").gain("<[0 .25 .5 .75] [1 1 1 1]>").attack(.5).decay(.5).sustain(0).bus(1).dry(0)   // percorso: volume
  $: note("<[c3,e3,g3]>").s("supersaw").gain(.05).bmod({ b: 1, c: 'gain', da: .075 })…
  ```

  (the plan; the measured form is under "Measured (task 8.1)" below:)

  ```js
  $: stack("<.0625:.01:1.99:0 …>", "<.125:2:0:1 …>").as("gain:attack:decay:sustain").s("one").bus(1).dry(0)  // percorso: volume, 2 punti
  $: note("<[c3,e3,g3]>").s("supersaw").gain(.3)….mul(postgain(.001)).bmod({ b: 1, c: 'postgain', dep: 1000 }).orbit(6)…
  ```

  The exact calls (the triangle's start, the gain curve, the depth factor) are fixed by task 8.1's measures; the shape above is the plan. The measures changed it as written under "Measured (task 8.1)" below.
- **Encoding.** The bus carries 0 to 1, the path between its lowest and highest value; the moved line's base is the lowest value and `da` is the span, times the bus modulator's factor (superdough divides the depth by 0.3) and through the inverse of the gain curve `one`'s notes pass (`applyGainCurve`). A filter path is linear in Hz between points; Decode writes more points where an opening is steep, so the ear hears no corner.
- **Same everywhere.** Both lines are plain Strudel, so the sound is the same in the page, in the real-time export (it records the page), in the fast export (the render page plays every hap through its own controller, which makes the bus on first use) and in code copied out of the app, which holds the path line as written with a comment naming it (`// percorso: filtro, 24 punti`).
- **Limits.**
  - At most 16 points a bar (a sixteenth, the knob's resolution in D7) and at most 256 points a path. `thinPath` drops a point that lies on the straight line through its neighbours within 1 % of the path's span, before the cap.
  - At most 8 paths in a song, on buses 1 to 8 in track order (the knobs' live buses take 9 and up, D15).
  - A path counts as one of the two movement devices of a track; one path per target per track.
  - A path and a Sweep on the same target is an error (both write the base). A path and an LFO on the same target is fine: the LFO sways around the path.
  - Volume values are shares of the track's gain from 0 to 1, so a volume path never makes a track louder than its own gain.
- **Cost.** One `one` note per point, at most 16 a bar per path, plus one bus connection per moved note: lighter than a Gate's LFOs.
- **Bus lifetime.** `controller.reset()` drops every bus on Stop, Play and some evaluations. The path line and the moved line make the bus again on their next notes, so the path resumes from the next note; a note held through a reset plays at its base until its next onset. Task 8.4 measures it.
- **In the song's code.** The path line opens the track's block, so a live build or a growth that types the track's lines never plays the moved line before its path (that would leave it at the base). The path line is muted, soloed out and hushed with its track. The hit grid, the tone cloud, the level checks and the hidden mixer skip `s("one")` lines.
- **No knob, no recording here.** The Compose card shows the path read-only: the target, the number of points, the bars it spans and a small drawn curve. Points come from the song file or from a writer; editing them by hand in the page comes with the knobs.
- **How Decode will call it.** `pathDevice(target, points, { perBar = 4, smooth = 'linear' })` in `movement.js`: clamps values to the target's range, rounds bars to `1 / perBar` (`perBar` at most 16), drops repeated bars, thins, cuts at 256 points and returns a rack device, or `null` when the path is flat within 1 %. The level B writer appends it to a track's rack; the validator checks it like any device. Examples:
  - a quiet intro: `pathDevice('volume', [[0, 0.1], [8, 1]])` on each track that plays in the first 8 bars;
  - an ending that fades: `pathDevice('volume', [[120, 1], [128, 0]])`;
  - a filter that opens unevenly: one point per bar from the measured brightness, `perBar: 1`, or 4 where it moves fast.
  
  The truth for Decode's bench reads paths with `modTruth` like the other devices.

- **Measured (task 8.1, 2026-11-24).** The plan works in superdough 1.3.0 with these changes, measured on held notes rendered by the fast export's render page (`renderOffline`):
  - **Notes per bar, not triangles across points.** A note whose onset is missed (a start in the middle of the song, a bus made again after a reset) would leave the path at its base until the next point, which can be many bars away. The bus's notes are cut at every point and every bar line, and each piece is one or two notes of `one` with linear envelopes: a held value is one note (attack 10 ms, sustain 1); a ramp from `x` to `y` over `d` seconds is a falling note (gain `x (1 - 0.01/d)`, attack 10 ms, decay `d - 0.01`, sustain 0) plus a rising one (gain `y`, attack `d`, sustain 1). Every note that ends at a piece's end falls to 0 over superdough's shortest release (10 ms) while the next piece's first note rises over the same 10 ms, so the two sum to a straight crossfade and a held value never dips. The seconds come from the bar's tempo (TEMPO's per-bar values).
  - **Edges of 10 ms**, not 5: superdough's release is at least 10 ms (`getADSRValues`), and an edge shorter than the release would bump.
  - **Code.** `$: stack("<…>", "<…>").as("gain:attack:decay:sustain").s("one").bus(N).dry(0)`, one value per bar (`!` for repeats); the rising notes' list is left out when it is empty. The moved line: `.lpf(lo).bmod({ b: N, c: 'lpf', da: span })` (hpf the same; sends from at least .001 so their node exists; pan's `da` is twice the span, its panner runs from -1 to 1).
  - **Depth factor.** `one` passes a gain of .3 (`synth.mjs`, "turn down") and `bmod` divides its depth by .3: the bus's 0 to 1 arrives as 0 to 1 times `da`. The gain curve is the identity (the app sets none). Measured: a filter path at nine points gives the brightness of the static cutoff at each, to the hertz of the centroid; pan swings from 20 dB left to 20 dB right; a volume path matches the drawn value within 0.003 of the gain at 90 and 120 BPM, a step path within 0.001 away from its edges.
  - **Volume on the postgain, relative.** A volume path writes `.mul(postgain(m)).bmod({ b: N, c: 'postgain', dep: span / m })` with `m` the lowest share (at least .001): the line's own postgain (a pad's or bass's volume shape, a guitar's gated level) is scaled, the depth relative to the note's postgain follows it, the section lanes' `velocity` fades still act on the gain, and the gain a Gate or a Pump dips stays apart. The volume calls go before the line's orbit, after any postgain it sets: a base set after its `bmod` on the line gives a wrong depth (measured 4 to 8 times too deep), so every base comes before its `bmod`.
  - **The render page connects late.** superdough connects a bus modulator from a source node's `ended` event; an offline context delivers it only when its render pauses, so the fast export connected each moved note up to a second late (the first 0.2 to 0.5 bar of a note stayed at the base). The render page now pauses one render quantum after each onset of a note with a `bmod`; the measured volume path then matches from the note's start. Live playback gets the event within milliseconds.
  - **Bus on first use.** The render page's own controller makes the bus on the first note that uses it; the path line alone is silent (`dry(0)`, peak 0).

- **Implementation notes (2026-11-24, tasks 8.2 to 8.7).** As designed and measured above, plus what the readers of the code needed: a Path's line is found by `isPathLine` (`src/song/line-names.js`: `.s("one").bus(n)`) and its notes by `isPathHap`. A mask idea leaves it alone, it is named `<track>Path` with line names, the mixer's text match never gives it an instrument's entry, the fast export's onsets leave out its notes, a song beside the song on air moves its buses up by 100 as its orbits move, and the pattern preview leaves out the path line and the bmod and volume calls (the moved line plays at the path's base: the points follow the song's bars, not the loop). A growth never hides or comments out the control a Path's base writes. Compose: a new Path starts from a preset (a fade in, else a filter that opens), and the read-only card offers four presets ("Replace with…"); the spec named no way to make one by hand. In copied code the path's seconds follow each bar's tempo, so outside the app, where the first section's tempo holds, a song with tempo changes moves its path a little off.

### D15. Knobs on top of the path engine (revises D7)

- A knob's recorded gesture is saved as the device's `path` of offsets from the set value, in the same format as D14, and plays through the same engine on its own bus. This replaces D7's playback with `setValueAtTime` and the fast export's scheduling on the render page.
- The page's `ConstantSourceNode` stays only for the hand on the knob: the live offset while the user turns it, on buses 9 and up.
- Code copied out of the app keeps the gesture as its path line (plain Strudel), not as values per bar; D7's "steps per bar" and its comment go.
- Decode and the generator write Path devices (D14), never a knob's gesture.

## Owner tests (checklist)

1. **Pad che si apre (Sweep).** Dove: Compose, un brano con un pad tenuto (per esempio `luci-rosse`), pannello della traccia pad, rack. Cosa fare: aggiungi "Apertura", lascia filtro da 400 a 4000 in 8 battute, premi Play. Cosa deve succedere: il pad parte scuro e diventa brillante in 8 battute, in modo continuo anche dentro ogni accordo tenuto, senza scatti a ogni battuta. Perché: è il movimento dentro la nota che oggi manca.
2. **Pad che ondeggia (LFO).** Dove: lo stesso pad. Cosa fare: togli Apertura, aggiungi "Oscillazione" sul filtro, velocità 1/2 battuta; poi prova bersaglio Panorama. Cosa deve succedere: il filtro (poi il panorama) va su e giù due volte per battuta, a tempo col brano, anche mentre l'accordo è tenuto. Perché: un movimento ciclico a tempo.
3. **Pad che pompa (Pump) con la cassa.** Dove: un brano con cassa in quattro e un pad. Cosa fare: aggiungi "Pompa" al pad, profondità 0,6. Cosa deve succedere: il pad si abbassa a ogni colpo di cassa e risale prima del colpo successivo; la cassa e le altre tracce non cambiano; il master non diventa mai rosso. Perché: è il pompaggio da sidechain dei brani house e techno.
4. **Pompa senza cassa.** Dove: lo stesso brano, una sezione senza batteria (o silenzia la batteria). Cosa fare: ascolta il pad in quella sezione. Cosa deve succedere: il pad pulsa ancora sui quarti, come se ci fosse la cassa, e mai più forte di prima. Perché: Pompa funziona anche nei break.
5. **Variazione e movimento insieme (#94).** Dove: un pad con la variazione per colpo sul filtro (dado del suono di #94) e Oscillazione sul filtro. Cosa fare: ascolta 4 battute; poi sostituisci Oscillazione con Apertura sul filtro. Cosa deve succedere: con Oscillazione senti entrambe le cose (ogni accordo parte un po' diverso e poi ondeggia); con Apertura la variazione sul filtro sparisce e la validazione mostra un avviso. Perché: le due funzioni si sommano dove ha senso e non litigano sullo stesso valore.
6. **Brani vecchi uguali.** Dove: scheda Brani, tre brani integrati e uno tuo. Cosa fare: suonali in Classic e Crescendo. Cosa deve succedere: suonano esattamente come ieri. Perché: niente cambia se non aggiungi un dispositivo.
7. **Stesso suono nell'export.** Dove: il brano del test 3. Cosa fare: esporta veloce in WAV e riascolta. Cosa deve succedere: il pompaggio e l'apertura sono uguali a quelli in riproduzione, negli stessi punti. Perché: i dispositivi sono deterministici.
8. **Fase successiva, manopola in Compose.** Dove: la scheda di Oscillazione del test 2, nel rack del pad. Cosa fare: guarda la manopola in cima alla scheda, poi girala durante un accordo tenuto; accendi il punto di registrazione, rifai il gesto, spegni il punto e riascolta. Cosa deve succedere: la manopola parte dal valore impostato e senza toccarla il pad suona come nel test 2; girandola il filtro si muove subito, dentro l'accordo che sta suonando; accanto alla manopola c'è solo un piccolo segno (nessuna scritta "Live"); al riascolto la manopola si muove da sola e ripete il gesto; le tracce senza dispositivi di movimento non hanno manopole. Perché: la manopola muove una nota già partita e il gesto resta nel brano.
9. **Fase successiva, manopola in radio e nel codice.** Dove: Radio, un tuo brano con un dispositivo di movimento in una playlist; poi Copia codice. Cosa fare: nella console scegli la parte con il dispositivo, gira la manopola; poi incolla il codice copiato in Strudel. Cosa deve succedere: la manopola compare solo per quella parte, accanto a Varia e Scambia, e sparisce scegliendo un'altra parte; il gesto in radio non viene registrato; nel codice copiato il gesto registrato in Compose diventa un valore per battuta. Perché: nessun pannello nuovo, e il codice copiato suona anche fuori dall'app.

10. **Fase.** Dove: Compose, un brano con pad e senza batteria (o batteria silenziata), rack del pad. Cosa fare: aggiungi "Pompa", ascolta, poi porta Fase a 0,5. Cosa deve succedere: con Fase 0 il pad si abbassa sul battito; con 0,5 si abbassa a metà fra un battito e l'altro, e l'export veloce fa lo stesso negli stessi punti. Perché: decidere dove cade il movimento dentro il battito.
11. **Tremolo e vibrato da Oscillazione.** Dove: lo stesso pad. Cosa fare: Oscillazione con bersaglio Volume, velocità 1/8; poi bersaglio Intonazione, profondità 0,4. Cosa deve succedere: con Volume il pad pulsa a tempo senza mai diventare più forte; con Intonazione la nota oscilla di poco in altezza, come un vibrato. Perché: due bersagli nuovi senza un modulo in più.
12. **Gate ritmico.** Dove: un pad tenuto (per esempio `luci-rosse`). Cosa fare: aggiungi "Gate ritmico", prova i preset Ottavi e Trance A, poi cambia due passi a mano e prova Morbidezza da Netta a Morbida. Cosa deve succedere: il pad viene tagliato a ritmo di sedicesimi secondo i passi accesi; con Netta i tagli sono secchi, con Morbida più dolci; il master non diventa mai rosso. Perché: il trance gate dei brani trance e progressive.
13. **Brani vecchi uguali (movimento).** Dove: gli esempi `07-pump`, `08-sweep`, `09-sway`. Cosa fare: suonali. Cosa deve succedere: suonano come prima di questo passo. Perché: i valori nuovi partono neutri.

## Risks / Trade-offs

- **Glide accuracy (D4).** `env` needs the note length in seconds; a tempo ramp makes it approximate. Fallback: steps per onset, as the FM rise.
- **`lpdepth` units.** The filter LFO's depth scale is not documented; task 1.4 measures it before the range is fixed.
- **LFO phase per note.** Off-grid notes sway out of phase. Accepted: the bar-aligned case is the common one.
- **Pump on the kick line.** A write on one track caused by another track's device. The kick line grows by three calls; song functions fold them. A muted kick track still ducks (its notes are not played but the duck is): the compiler leaves `duck` out of muted and soloed-out tracks.
- **Bus reset (later phase).** A missed reconnect leaves the knob dead until the next Play; the sound stays as set, since an undriven bus is 0. The browser check presses Stop, Play and a re-evaluation and moves the knob after each.
- **Knob path in copied code** is coarser than the original gesture (steps per bar). Accepted and said in the code's comment.

## Decisions approved by the owner

The six open questions of the first draft, approved as recommended:

1. **Gain is not a Sweep target.** `gainEnd` and Crescendo already fade.
2. **Pump in a section without a kick** uses the beat gain dip automatically (D6).
3. **Knob moves in the radio** act while the song plays only and are not recorded (D8).
4. **A path is recorded** only with the card's record dot on (D7).
5. **The code helper is `knob(n)`,** distinct from `slider()` because it moves sounding notes (D8).
6. **Movement devices on drums** come later, with step 4 (D1).

The knob model was also revised: no "Live" mark or toggle; every movement device always shows one main knob (D7, D8).

## Estimate

In agent hours:

- Step 1, devices (D1-D6), validator, Compose cards, guide, knowledge, catalog, example songs, checks: about 6.5.
- Step 2, test songs, truth reader, envelope error, parameter score, baseline run: about 3.5.
- Later phase, knobs (D7, D8): about 8 (bus driver and reset 2, Compose card and path 2, fast export and copied code 1.5, radio row 1, code widget 1, checks 0.5).

This change, without the later phase: about 10.
- Path engine (D14), without knobs: about 6 (measures of the bus, gain curve and depth factor 1, device, writer and `pathDevice` 1.5, compiler, bus numbers, growth and widgets 1.5, fast export and copied code 0.5, checks 1, docs 0.5). The knobs on top (D15) drop to about 6.
- Movement parameters (D11 to D13): about 4 (phase and the filter's generic form 0.5, volume and pitch 0.5, Gate with its step row and smoothing 1.5, checks in Node and in the browser 1, docs, guide and knowledge 0.5).
