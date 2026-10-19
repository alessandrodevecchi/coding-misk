---
id: comments-and-functions
related: [profiles, strudel, live-build, decisions]
code: [src/song/comments.js, src/song/writer.js, src/song/functions.js]
checks: [npm run check:functions, npm run check:strudel, npm run check:live-code]
---

# Comments and technical functions

## What it is

Two groups of profile controls decide what the code panel shows. The sound never changes with them.

- **Comments**: the title line, track names, section and pattern notes, step phrases, the voice code.
- **Technical functions**: how much technical code is written out. Bus, level, distortion and repeated effect chains can fold into short functions.

Each group has presets over separate options. Changing one option makes the preset "custom".

## How it connects

- **Profiles.** Every option is a profile control ([profiles.md](profiles.md)). Classic and Crescendo write everything out; the Live coder writes compact code.
- **Strudel.** The app's functions are registered in Strudel before the code runs ([strudel.md](strudel.md)). Their definitions and the mixer live in the hidden code. Copy and Open in Strudel add them, so the code plays the same there.
- **Live build.** Each step of a build is written with these options ([live-build.md](live-build.md)).
- **Names.** No app function takes a Strudel name or synonym ([decisions.md](decisions.md)).

**Song functions.** With `fnSong`, an effect chain that repeats in a song becomes a function of that song. It needs three calls or more with the same names on two lines or more, and takes at most three parameters. Its name is a themed word drawn by the song id from `NAMES` in `src/song/functions.js`: theme words per style, then words per track type, then generic words.

**The hidden mixer.** With `fnLevel`, bus, visual and level go to a hidden tail, `all(x => miskMix(x, [...]))`. It finds each line by the place of its text and gives its events what the line no longer writes. The Live coder's section lanes play through it too.

**The radio's hidden songs (radio-profiles D7).** In the radio, the code evaluated is the panel's text, the hidden tail of the song on air, then the songs not on air in full technical form (`src/live/air-code.js`): Classic controls, no song functions and no lanes, their constants renamed with `n<k>_`, their orbits moved up by 20, their `S$:` lines played alone only within their own song. The mixer finds lines by place, so it never touches them, and the song functions of the song on air never meet theirs. The prelude panel (Hidden code) shows them too.

## Options

<!-- generated:comment-presets -->
Comments (it: Commenti): Comments in the code. Essential: the title and the track names. None: code only.

| Preset | Name | `tracks` | `notes` | `steps` |
| --- | --- | --- | --- | --- |
| `all` | all comments (it: tutti i commenti) | on | on | on |
| `essential` | essential comments (it: commenti essenziali) | on | off | off |
| `none` | no comments (it: nessun commento) | off | off | off |

| Option | Name | What it shows |
| --- | --- | --- |
| `tracks` | Tracks (it: Tracce) | The track names (// ===== bass =====) |
| `notes` | Notes (it: Note) | The section and pattern notes (// Intro · bars 1-8) |
| `steps` | Phrases (it: Frasi) | The step phrases (// > …) and the phrase the voice says |
| `voice` | Voice code (it: Codice della voce) | The lines that make the voice speak. Off: the voice still speaks, its code is not shown |
<!-- /generated -->

<!-- generated:function-presets -->
Technical functions (it: Funzioni tecniche): How much technical code you see. Full: everything written. Short: .chan("bass") for bus and visual, .crunch(0.6) for distortion, the voice effects in a function. Mixer: also bus, visual and level in a hidden mixer, .gain() only when a step changes the level. Compact: also the library functions (.wob(), .plk(), .wet(), .res()) and the song functions, with a themed name, for effect chains that repeat. Sounds, notes and rhythms stay written. Changing an option makes it custom. The sound is the same.

| Preset | Name | `fnBus` | `fnLevel` | `fnCrunch` | `fnVoice` | `fnSong` | `fnLib` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `full` | full (it: per esteso) | off | off | off | off | off | off |
| `short` | short (it: abbreviate) | on | off | on | on | off | off |
| `mixer` | mixer (it: al mixer) | on | on | on | on | off | off |
| `compact` | compact (it: compatte) | on | on | on | on | on | on |

Default preset per profile: Classic `full`, Crescendo `full`, Live coder `compact`.

| Option | Name | What it does |
| --- | --- | --- |
| `fnBus` | Bus | Bus and visual in short: .chan("bass") |
| `fnLevel` | Mixer | Bus, visual and level in a hidden mixer: .gain() only when a step changes the level |
| `fnCrunch` | Distortion (it: Distorsione) | Distortion with its volume in short: .crunch(0.6) |
| `fnVoice` | Voice (it: Voce) | The voice effects in a song function |
| `fnSong` | Song (it: Del brano) | Effect chains that repeat become song functions with a themed name; the values that change stay in the brackets |
| `fnLib` | Library (it: Libreria) | Library functions for the most used chains: .plk(decay, sustain), .wet(delay, room), .res(lpf, lpq), .wob(from, to) for a moving filter |
<!-- /generated -->

The app's own functions:

<!-- generated:helpers -->
| Function | Parameters | Stands for | What it does |
| --- | --- | --- | --- |
| `chan` |  |  | no help text: described below |
| `crunch` |  |  | no help text: described below |
| `miskMix` |  |  | no help text: described below |
| `plk` | a, b | `.decay(a).sustain(b)` | envelope: decay and sustain (it: inviluppo: decay e sustain) |
| `wet` | a, b | `.delay(a).room(b)` | echo and reverb: delay and room (it: eco e riverbero: delay e room) |
| `res` | a, b | `.lpf(a).lpq(b)` | filter with resonance: lpf and lpq (it: filtro con risonanza: lpf e lpq) |
| `wob` | a, b | `.lpf(sine.range(a, b).slow(8))` | moving filter: lpf from a to b and back over 8 cycles (it: filtro che si muove: lpf da a a b e ritorno in 8 cicli) |
<!-- /generated -->

- `chan`: `.chan(name)` is the bus and the visual of a track, `.orbit(n).analyze(name)`, with the orbit from the song's buses.
- `crunch`: `.crunch(x)` is distortion with its volume, `.distort(x).distortvol(0.5)`.
- `miskMix`: the hidden mixer, called as `miskMix(pattern, ranges)`. It never appears in the code shown.

Adding a library function or a name word is a new entry in `src/song/functions.js`. `npm run check:strudel` fails when a name is a Strudel name. `npm run check:functions` checks that every folded line expands back to the line written out.

## Example

<!-- generated:example-song-function -->
The Material example (`songs/examples/05-material.json`) in the Live coder profile folds a repeated chain into the song function `oddity`. The hidden code defines it:

```js
register('oddity', (a, b, c, p) => p.fmh(a).fmdecay(b).fmsustain(c), false)
```

A line that calls it:

```js
$: note("<[a3,c4,e4,a4] [f3,a3,c4,f4] [g3,c4,e4,g4] [g3,b3,d4,g4]>").transpose(-5).arp(irand(4).seg(16).rib(7, 2))
  .s("triangle").quirk().fm(3).oddity(3.5, 0.4, 0)
```

The same line with every function written out, as the check expands it:

```js
$: note("<[a3,c4,e4,a4] [f3,a3,c4,f4] [g3,c4,e4,g4] [g3,b3,d4,g4]>").transpose(-5).arp(irand(4).seg(16).rib(7, 2))
  .s("triangle").lpf(sine.range(960, 3840).slow(8)).lpq(4).decay(.15).sustain(.15).delay(.35).fm(3).fmh(3.5).fmdecay(0.4).fmsustain(0)
```
<!-- /generated -->

## Where to read more

- [docs/STRUDEL-FUNCTIONS.md](../STRUDEL-FUNCTIONS.md#app-functions): the app functions in the catalog.
- [openspec/changes/song-functions/](../../openspec/changes/song-functions/) and [code-writing](../../openspec/changes/code-writing/): the changes behind them.
- `writeCode`, `tail`, `preludeText`, `installHelpers` in `src/song/writer.js`.
