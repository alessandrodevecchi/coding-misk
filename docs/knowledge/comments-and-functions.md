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

- **Profiles.** Every option is a profile control ([profiles.md](profiles.md)). Classic and Crescendo write everything out; the Live coder writes compact code (Sections included) with only the title as comments (no track names, notes or phrases, radio-profiles 9.2).
- **Strudel.** The app's functions are registered in Strudel before the code runs ([strudel.md](strudel.md)). Their definitions and the mixer live in the hidden code. Copy and Open in Strudel add them, so the code plays the same there.
- **Live build.** Each step of a build is written with these options ([live-build.md](live-build.md)).
- **Names.** No app function takes a Strudel name or synonym ([decisions.md](decisions.md)).

**Song functions.** With `fnSong`, an effect chain that repeats in a song becomes a function of that song. It needs three calls or more with the same names on two lines or more, and takes at most three parameters. Its name is a themed word drawn by the song id from `NAMES` in `src/song/functions.js`: theme words per style, then words per track type, then generic words.

**The hidden mixer.** With `fnLevel`, bus, visual and level go to a hidden tail, `all(x => miskMix(x, [...]))`. It finds each line by the place of its text and gives its events what the line no longer writes. The section and clip lanes play through it too (Sections, and the Live coder).

**Sections (`fnLanes`, code-lanes).** The section and clip lanes leave the code: each part is one line, edited in place when its section or clip changes, and the section constants (`const section3 = …`, `const clip2 = …`) and the `SECTIONS` table are gone. It works with every profile and code view: `liveCode` then always writes the code of the moment in place (`compileNow` with `inPlace`, `gated`, `bounds`), with a step at each section start and at each bar inside a section where a clip starts or ends (`clipBounds` in `src/song/compile-compact.js`). `liftLanes` takes `.mask(x).velocity(x)` and, with Sections, `.mask(x).postgain(x.mul(n))` (gated guitars, n a number or a value per bar) out of each line; the mixer plays a lane as velocity, a gated lane `"lane x n"` as postgain, the lane's value times n on that bar. A Classic song with the Live build off and Sections on plays as written, every track from the start, through the same code of the moment (`playable` in `src/main.js` gives it a build with no steps). The same holds for any code option away from Classic's with the Live build off (`writtenOptions` in `src/live/profiles.js`: comments, technical functions, title, lit notes, line breaks); with Classic's options the song keeps the code it always had. The compact preset has Sections; full, short and mixer do not, so Classic and Crescendo with full write the code they always wrote. The Live coder edits in place with or without it; without it a gated guitar still shows every clip of its track and the clips of a section are not split. The growth measures its typing on the Live coder code without Sections (`src/song/crescendo.js`), so the grown builds did not change.

**Lines that come back stay muted (written-like-coder).** In code edited in place (`compileNow` with `inPlace`: the Live coder, and Sections in any profile), a line silent in the part shown that sounded before and sounds again later stays written as it last played, muted with `_$:`, in its place among the lines of its track. When it plays again the typing unmutes it and edits only the values that changed, instead of typing it again (on luci-rosse the drums of Pista stay muted through Taglio, the hats and the crash of Scontro through Ombra). A line is known by its track, its visual (`.analyze`) and its order among the lines of that visual in its clip (`returnKeys` in `src/song/compile-compact.js`), so a line whose sound or pattern changes is the same line edited. A line that never sounds again leaves at once (in practice at the section change after its last clip). With a growth it starts at the written part (`crescendo.growth`, `returning` in `src/live/live-code.js`): the growth's code, its typing and so its shapes do not change; without one (Classic or Crescendo with Sections) it holds for the whole song. A track not yet in the build (`mute`) is not shown. Muted lines play nothing: the hidden mixer counts them as lines and `check:mixer` proves every hap the same. Measured with `npm run growth:probe` (the written part table): the typing needed at the section changes went from 253 s to 230 s on luci-rosse (Scontro 2 58.3 s to 53.8 s), 434 s to 346 s on settimo-cielo, 306 s to 266 s on kellerlicht (2026-10-25). Muting is not always cheaper: for each line that goes silent and comes back, `muteOrDelete` costs both ways with the typing model (human, lean) on the code of its track, muted and edited (`$:` to `_$:` when it goes silent, then the track before the return with the line muted in its place into the track at the return) or deleted and typed again (nothing when it goes silent, then the track without it into the track at the return, so a long line can be copied from a like line above), and takes the cheaper; within a factor of 1.35 the choice is drawn from the song, the track, the line and the bar it returns at. Measured, it changes little (luci-rosse 229.9 s to 230.8 s, settimo-cielo 345.7 s to 346.4 s, kellerlicht 266.4 s unchanged): muting is mostly the cheaper way. Kellerlicht's Druck stays at 120.9 s, but not because of the acid line (47 s to edit, 65 s to type again on its track): the typing diff (`lineDiff` in `src/song/typing.js`) anchors on blank lines between tracks, shifts by one track and retypes lines it should edit. Without blank lines as anchors Druck needs 73.7 s (an open point: it changes the growth's typing too).

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
Technical functions (it: Funzioni tecniche): How much technical code you see. Full: everything written. Short: .chan("bass") for bus and visual, .crunch(0.6) for distortion, the voice effects in a function. Mixer: also bus, visual and level in a hidden mixer, .gain() only when a step changes the level. Compact: also the library functions (.wob(), .plk(), .wet(), .res()) and the song functions, with a themed name, for effect chains that repeat, and the sections: one line per part, changed in place at each section or clip. Sounds, notes and rhythms stay written. Changing an option makes it custom. The sound is the same.

| Preset | Name | `fnBus` | `fnLevel` | `fnCrunch` | `fnVoice` | `fnSong` | `fnLib` | `fnLanes` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `full` | full (it: per esteso) | off | off | off | off | off | off | off |
| `short` | short (it: abbreviate) | on | off | on | on | off | off | off |
| `mixer` | mixer (it: al mixer) | on | on | on | on | off | off | off |
| `compact` | compact (it: compatte) | on | on | on | on | on | on | on |

Default preset per profile: Classic `full`, Crescendo `full`, Live coder `compact`.

| Option | Name | What it does |
| --- | --- | --- |
| `fnBus` | Bus | Bus and visual in short: .chan("bass") |
| `fnLevel` | Mixer | Bus, visual and level in a hidden mixer: .gain() only when a step changes the level |
| `fnCrunch` | Distortion (it: Distorsione) | Distortion with its volume in short: .crunch(0.6) |
| `fnVoice` | Voice (it: Voce) | The voice effects in a song function |
| `fnSong` | Song (it: Del brano) | Effect chains that repeat become song functions with a themed name; the values that change stay in the brackets |
| `fnLib` | Library (it: Libreria) | Library functions for the most used chains: .plk(decay, sustain), .wet(delay, room), .res(lpf, lpq), .wob(from, to) for a moving filter |
| `fnLanes` | Sections (it: Sezioni) | Section and clip lanes go to the hidden mixer: each part is one line, changed in place when its section or clip changes, no section constants. For every profile, also with the Live build off |
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
$: note("<[f3,a3,c4,f4] [g3,c4,e4,g4] [g3,b3,d4,g4] [a3,c4,e4,a4]>").transpose(-5).arp(irand(4).seg(16).rib(7, 2))
  .s("triangle").quirk().fm(3).oddity(3.5, 0.4, 0)
```

The same line with every function written out, as the check expands it:

```js
$: note("<[f3,a3,c4,f4] [g3,c4,e4,g4] [g3,b3,d4,g4] [a3,c4,e4,a4]>").transpose(-5).arp(irand(4).seg(16).rib(7, 2))
  .s("triangle").lpf(sine.range(960, 3840).slow(8)).lpq(4).decay(.15).sustain(.15).delay(.35).fm(3).fmh(3.5).fmdecay(0.4).fmsustain(0)
```
<!-- /generated -->

## Where to read more

- [docs/STRUDEL-FUNCTIONS.md](../STRUDEL-FUNCTIONS.md#app-functions): the app functions in the catalog.
- [openspec/changes/song-functions/](../../openspec/changes/song-functions/) and [code-writing](../../openspec/changes/code-writing/): the changes behind them; [written-like-coder](../../openspec/changes/written-like-coder/): lines that come back stay muted.
- `writeCode`, `tail`, `preludeText`, `installHelpers` in `src/song/writer.js`.
