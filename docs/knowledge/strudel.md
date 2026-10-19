---
id: strudel
related: [songs, ideas, comments-and-functions, live-build]
code: [src/song/compile.js, src/song/writer.js, src/content.js, docs/STRUDEL-FUNCTIONS.md]
checks: [npm run check:strudel, npm run check:code]
---

# Strudel basics

## What it is

Strudel is a live coding language for music that runs in the browser. You write patterns in JavaScript and they play in a loop. The app ships Strudel from npm and never forks it.

**Cycles.** Time is counted in cycles. In this app one cycle is one bar. A pattern spreads its events over the cycle.

**Mini-notation.** A string in double quotes or backticks is a small rhythm language. `"bd hh sd hh"` splits the bar into four equal steps. `~` is a rest. `[a b]` squeezes two events into one step. `*4` repeats a step four times. `<a b>` plays one item per cycle, in turn. A comma plays two sequences at once. `!3` repeats an item, `@3` makes it last three steps.

**Lines.** Each line that starts with `$:` is a pattern that plays with the others. `_$:` mutes a line. `S$:` is solo: while some lines have it, only those play.

**Tempo.** `setcpm(124/4)` sets cycles per minute. With four beats per bar this is 124 BPM.

**Chains.** A pattern is built by calling functions one after another: `s("bd*4").bank("RolandTR909").gain(0.8)`. Each call returns a new pattern.

**Sounds and banks.** `s("bd")` plays a sample by name. `.bank("RolandTR909")` picks a drum machine. Synths are sounds too: `s("sawtooth")`, `s("supersaw")`.

**Notes and scales.** `note("a1 c2")` plays note names. `n("0 2 4").scale("A4:minor")` plays scale degrees. `chord("<Am7 F^7>").voicing()` voices chord names.

**Effects and orbits.** Effects are calls on the chain: `.lpf(800)` filters, `.room(0.5)` adds reverb, `.delay(0.3)` adds echo. `.orbit(n)` sends a pattern to its own bus, so its delay and reverb stay its own.

**Signals.** `sine`, `saw`, `perlin` and `rand` are values that move over time. `sine.range(400, 1600).slow(8)` sweeps a filter over eight cycles.

## How it connects

The app writes Strudel code from songs ([songs.md](songs.md)). The compiler turns tracks, patterns and clips into `$:` lines. The player evaluates that code in Strudel.

What the app adds on top:

- **Section lanes.** Each section is a string like `"<1!8 0.5 0!31>"`. A line plays where its lane is 1 through `.mask(lane).velocity(lane)`.
- **Visuals.** `.analyze("bass")` names a line for the stage visuals.
- **Its own functions.** `chan`, `crunch`, the library and song functions ([comments-and-functions.md](comments-and-functions.md)). None of them takes a Strudel name.
- **Hidden code.** The definitions of those functions and a hidden mixer run after the code shown. Copy and Open in Strudel include them, so the code plays the same outside the app.
- **Tempo from outside.** The player changes tempo at bar lines. Code never sets it inside a pattern.
- **Short forms.** Parts are stored as ideas and written in their shortest form ([ideas.md](ideas.md)).

## Options

There are no user options for Strudel itself. The version is fixed by `package.json`. The catalog lists every function of that version.

Things that matter when writing code for this app:

- Inside mini-notation a number needs its leading zero: `0.5`, not `.5`.
- Double quotes are always mini-notation, even in helper code. Use single quotes for plain strings.
- Shape a layer's volume with `postgain` when a section lane sets `velocity`.
- Before heavy distortion `gain` only changes the drive. Set the level after it.
- Chord names follow Strudel's voicings: `F^7`, not `Fmaj7`.

<!-- generated:lessons -->
Strudel shipped with the app: `@strudel/repl` 1.3.0. In-app lessons (Groove Lab, tab Strudel lessons), in order:

1. The cycle
2. Multiply, subdivide, layer
3. Alternate between cycles
4. Drum machines
5. Notes and chords
6. Scales
7. Filter and resonance
8. Envelope
9. Modulation
10. Space: delay and reverb
11. Controlled randomness
12. Layers and mutes
13. Live sliders
14. Trance recipe
<!-- /generated -->

## Example

```js
setcpm(124/4)
$: s("bd*4").bank("RolandTR909")
$: s("[~ hh]*4").bank("RolandTR909").gain(0.4)
$: n("<0 2 4 7>").scale("A4:minor").s("triangle").lpf(1200).room(0.3).orbit(2)
```

In `s("[~ hh]*4").bank("RolandTR909").gain(0.4)` every part is Strudel. `s` picks the sound, the string is mini-notation (a rest and a hat, four times a bar), `bank` picks the drum machine, `gain` sets the level. In the app's compact code the same line could end with `.chan("hats")`, which is the app's: it stands for `.orbit(n).analyze("hats")`.

<!-- generated:example-compact-line -->
The arpeggio of the Ideas example (`songs/examples/04-ideas.json`) at the last step of its Live coder build, compact code:

```js
$: n(irand(5).seg(16).rib(3, 2)).chord("<C^7 G7 Am7 F^7>").anchor("c5").mode("below").voicing()
  .s("triangle").wob(1040, 4160).lpq(4)
  .plk(.15, .15).delay(.3)
```

| Call | From |
| --- | --- |
| `n` | Strudel |
| `seg` | Strudel |
| `rib` | Strudel |
| `chord` | Strudel |
| `anchor` | Strudel |
| `mode` | Strudel |
| `voicing` | Strudel |
| `s` | Strudel |
| `wob` | app (library): lpf(sine.range(a, b).slow(8)) |
| `lpq` | Strudel |
| `plk` | app (library): decay(a).sustain(b) |
| `delay` | Strudel |
<!-- /generated -->

## Where to read more

Official Strudel documentation, in English:

- [Learn Strudel](https://strudel.cc/learn/) and the [first steps workshop](https://strudel.cc/workshop/getting-started/)
- [Cycles](https://strudel.cc/understand/cycles/), [mini-notation](https://strudel.cc/learn/mini-notation/), [coding syntax](https://strudel.cc/learn/code/)
- [Samples](https://strudel.cc/learn/samples/), [synths](https://strudel.cc/learn/synths/), [notes](https://strudel.cc/learn/notes/), [tonal functions](https://strudel.cc/learn/tonal/), [voicings](https://strudel.cc/understand/voicings/)
- [Audio effects](https://strudel.cc/learn/effects/) and [orbits](https://strudel.cc/learn/effects/#orbits), [signals](https://strudel.cc/learn/signals/), [random modifiers](https://strudel.cc/learn/random-modifiers/)

In this repository:

- [docs/STRUDEL-FUNCTIONS.md](../STRUDEL-FUNCTIONS.md): every function of the version we ship, what the app writes, notes for variety.
- [docs/MUSIC-ENGINE.md](../MUSIC-ENGINE.md#strudel-gotchas-learned-the-hard-way): gotchas learned the hard way.
- The lessons tab: `LESSONS` in `src/content.js`, shown in the Groove Lab.
