# Design

## Context

What the code does today (`develop` f80b167):

- **Rack.** `DEVICES` in `src/song/rack.js`: each device is one or two Strudel calls, with arguments `[name, 'num', default, min, max, step]` or `[name, 'choice', default, values]`. Compose draws every device generically (`deviceHtml`, `src/main.js`): a range or a select per argument, labels `arg_<name>` in `src/i18n.js`. Voice tracks have the same rack. The radio has no rack editor; the director gives radio voices one or two random devices (`VOICE_DEVICES`, `src/endless/director.js`).
- **Distortion in superdough 1.3.0.** `distort` with `distorttype` and `distortvol` (`superdough.mjs:790`, `helpers.mjs:495-590`). The worklet computes `postgain · curve(x, expm1(distort))` per sample, `postgain` clamped to 0.001…1. The `fold` curve is `fold((1 + k/2)·x)` (a triangle fold into −1…1), `sinefold` is `sin(π/2 · fold(…))`. The stage sits after the gain stage and the filters, so its input is the line at its gain.
- **Custom effects.** `.K(expr)` is rewritten by the transpiler into `.worklet("<kabelsalat source>", inputs…)`; superdough builds a `generic-processor` worklet per note when a hap has `workletSrc`, after compiling the source on the main thread with `compileKabel` (`superdough.mjs:615`). The worklet reads input channel 0 only and writes both channels. Kabelsalat 0.4.0 ships `audioin`, `sine`, `mul`, `add`, `out`.
- **No ring modulator** in the browser engine: `ring`, `fshift` and the like are SuperCollider-only control names.

## Goals / Non-Goals

**Goals:**

- An FM-like colour on any track, drums, samples, soundfonts and voices included, from the rack, with two settings per device.
- Safe levels: Ring never makes a line louder; Fold never takes a note above its own peak or its track type's usual peak.
- The Ring trial answers three questions with numbers: does it play in the page, does it play the same in the fast export, what does it cost on a 12-track radio.

**Non-Goals:**

- True FM on samples (modulating the playback rate): stepped at 128 samples, a "broken" sound, not FM.
- Fast vibrato and a finished Ring (step 3 of #90): after the owner's verdict.
- A patch to superdough, or a per-orbit effect: only if the trial shows per-note worklets cost too much.
- Rack effects in the FM lab of the Groove Lab: its cards are synths, which already have true FM; Fold and Ring are for the other sounds and are tried in Compose.

## Decisions

### D1. Fold is superdough's distortion with its fold curves

`fold: { amount 0.1–3 (1.5), curve sharp | soft (sharp) }` writes `.distort(a).distorttype("fold" | "sinefold").distortvol(v)`.

| Option | Notes |
| --- | --- |
| **A (chosen)** | Built in, one worklet per note already used by Distortion, works the same in the fast export (same superdough worklets). |
| B | A Kabelsalat `fold` through `.K`: same sound, costs a compile per note on the main thread (see D4). |

Amount 0.1 to 3 maps to superdough's `k = expm1(amount)`, a fold gain from 1.05 to 11: above 3 the sound is noise. Curve "Sharp" is `fold`, "Soft" is `sinefold` (rounder, fewer high harmonics).

### D2. Fold's level: never above the line's own peak or its type's usual peak

The fold's slope near zero is its gain `g = 1 + k/2` (`π/2 · g` for `sinefold`), and the fold never leaves −1…1. A fold acts only on what is loud enough: a sample `x` folds when `g·|x| > 1`.

First version (rejected after measuring): `distortvol(1/g)`, so `|out| ≤ |x|` always. In the page a line below the fold kept its level, but a folded line fell far below it: drums peaking at 1.10 came out at 0.12 to 0.19 with Amount 3 (RMS −15 dB). The effect sounded like a volume cut.

Chosen: `distortvol(max(1/g, P))`, `P` the usual peak of the track type (`FOLD_PEAK`: drums 0.45, guitar 0.4, bass, voice and spoken 0.35, code 0.3, hook and pad 0.2, arp 0.18, texture 0.15, riser 0.1, from the level targets of `docs/knowledge/sound-and-levels.md`), floored to 3 decimals. Then each note comes out at most `max(|x|, P)`: a line below the fold keeps its level, a folded one comes out near its type's usual peak. Measured in the page (`tools/check-fm-effects.cjs`): drums 1.10 → 0.83 to 0.90, a voice 0.37 → 0.35 to 0.36, a single pad note 0.08 → 0.18 to 0.20 at Amount 3 (a quiet pad folded gets louder, up to the pad target). The bound holds per note: chords and overlapping tails add up as without the device. The check asserts it on superdough's own curves for every type, amount and curve, and in the browser (peak at most the higher of the plain peak and `P`, plus 0.02).

Default Amount 1.5 (`g` = 2.7): drums, basses and voices at their usual level fold a little; quiet pads need 2.5 or more.

Fold and Distortion share one Strudel stage (`distort`): with both on a track, the later one in the rack wins. The track's own drive (Saturation on drums, `drive`; the guitar's distortion) writes the same stage before the rack, so Fold takes its place. The validator warns, and the Guide line of the device says so.

### D3. Ring is a Kabelsalat effect through `.K`

`ring: { freq 30–2000 Hz (220), amount 0–1 (0.8) }` writes `.K(audioin().mul(sine(f).mul(a).add(1 - a)).out())`: the dry sound times `1 − a + a·sin(2πft)`. At amount 1 it is a true ring modulator (the original pitch disappears, sum and difference tones remain); below 1 some of the dry sound stays.

| Option | Notes |
| --- | --- |
| **A (chosen, trial)** | `.K` per note: no engine change, in the catalog, plays wherever Strudel plays (page and render page share `compileKabel` from `@strudel/core`'s REPL). Cost: one compile on the main thread and one worklet per note. |
| B | Tremolo at audio rate: built in, but unipolar (`(1-d) + (d·w)^1.5`, never below 0): AM with the dry pitch always there, not a ring. |
| C | A worklet per orbit (one per track): cheapest, but an engine change in two superdough copies (`fm-groove-lab` analysis, way 3). Only if the trial's numbers ask for it. |

Level: `|1 − a + a·sin| ≤ 1`, so the output is never above the input. The generic worklet reads the left channel only: a stereo sample becomes mono before its pan (the pan stage comes after). Superdough places the worklet first in a note's chain, before gain and filters, whatever the rack order.

The label says "(prova)" / "(trial)" until step 3.

### D4. Measuring the trial

`tools/check-fm-effects.cjs` (dev server) does, for one or more styles:

1. A radio session stacked to 12 tracks with "+" (as `check-arrangement-levels.cjs`), and the song as it is on that bar (`stateAt`).
2. Three variants of that song: as it is, Ring on all 12 tracks, Fold on all 12 tracks (the worst case: every note through the device).
3. **Fast export**: 16 bars of each variant rendered by `renderOffline` (the fast export's render page). Reported: render seconds per second of audio, the slowdown against the plain song, the peak.
4. **Real time**: each variant played 30 s in the page through the editor. Reported: long tasks, the longest, audio underruns (Chrome's playback stats, or the audio clock against the page clock), notes per second, and the main-thread time spent in `compileKabel` per note and per second.
5. **Same sound**: for each device, the rendered 16 bars of the plain and the device variant differ (the device does something), and the peak with the device is at most the plain peak + 0.02.

Pass rules: no page error, no evaluation error, output below 1.0. The cost numbers are reported, not judged by the tool: the owner decides step 3.

### D5. Translated choice values

A choice argument may carry a fifth element, labels per value: `['curve', 'choice', 'sharp', ['sharp', 'soft'], { sharp: { en: 'Sharp', it: 'Spigolosa' }, soft: { en: 'Soft', it: 'Morbida' } }]`. The device row shows the label in the interface language; songs store the value.

### D6. The radio: Fold on voices

A radio voice with fewer than two devices gets Fold (`amount 0.3–1.2`, either curve) with chance `0.15 + 0.25 · chaos`, drawn from a stream of its own (`rng.voice.fork('fold/<song index>')`), so the other voice draws and the music do not move. The voices of the seed fixtures move: `DIRECTOR_VERSION` + 1 in the same commit, fixtures rewritten. Ring stays out of the director during the trial.

### D7. Checks

- `npm run check:fm-effects` (Node): the devices exist with their ranges; the code of each, evaluated by Strudel in Node, carries `distort`, `distorttype`, `distortvol` (Fold) and `workletSrc` (Ring); the Fold level rule holds on sample curves for every amount and both curves; the validator warns on Fold with Distortion; the Kabelsalat source is skipped by the code scanner; labels in both languages.
- `tools/check-fm-effects.cjs` (browser): D4.
- Existing: `check:code`, `check:songs`, `check:mixer`, `check:strudel`, `check:endless` (fixtures rewritten), `check-settings`, `check-radio`, `check:export`, `check:guide`, `check:knowledge`.

## Risks / Trade-offs

- **Main-thread cost of Ring**: `compileKabel` runs once per note. On dense drums it can add up; the trial measures it. A memo of the compiled source (same source, same result) is a cheap fix if needed.
- **Mono worklet input**: stereo samples lose their right channel under Ring. Acceptable for a trial; a finished Ring would read both channels (way C).
- **Kabelsalat is young** (0.4.0): an update of Strudel may change `K`. `npm run catalog:strudel` and the checks show it.

## Owner Decisions

- fx-1, fx-2 (`fm-groove-lab`): Fold first, then a short Ring trial; Ring and Fast vibrato only if the trial satisfies.
