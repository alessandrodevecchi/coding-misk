---
id: radio-commands
related: [radio, material, patterns, narrator, decisions]
code: [src/endless/steering.js, src/endless/waypoints.js, src/endless/material.js, src/radio/radio.js, src/guide.js]
checks: [npm run check:endless, npm run check:radio-profiles, npm run check:guide, node --no-warnings tools/check-steering.cjs]
---

# Radio commands

## What it is

The console in the Radio tab steers the song on air. Each button queues a command. A command applies on a boundary: the next bar, the next phrase or the next double phrase. Until then it can be cancelled.

A command rewrites the song from its boundary. The steps before it stay. The rest is written again by the director with the listener's moves first, marked `by: "listener"`.

**On a grown song (Crescendo or Live coder, radio-profiles stage 5).** A command is the next waypoint of the growth (`steerOnAir` in `src/endless/waypoints.js`). The steps and the sound before its boundary stay as they were. From the boundary, small typed moves lead from the code on air to the song as the director rewrites it: a line in (`add`, or `unmute` of a muted line) or out (`remove`), a growth level on its way down, the notes a few at a time (`notes` steps), a knob in one or two turns (`set`), a function revealed or uncommented, a device. The moves are the listener's (`by: "listener"`), in the order of the chooser on air: a version of `AIR_CHOOSERS` in `src/endless/waypoints.js`, `normal-1` (the default chooser of every growth) since growth marker 3; a recipe of marker 2 replays with `radio-1` (the tracks the command changed first, then the moves toward the coming energy), as it was heard. Each version has a fixed id and a name in English and Italian (`AIR_CHOOSER_NAMES`); a changed rule is a new version. Settings, Advanced, Chooser on air (`coding-misk-air-chooser`, the default not stored) picks the version of the sessions started after it; a new recipe records it as `chooser` when it is not the default, and its replays use it (`airChooserOf` in `src/endless/items.js`). An id no longer in the code gives the default, and a saved session that names one warns in its playlist (radio-chooser-versions). Check 5.5 of `check:radio-profiles` measures that the default is no slower in all than any other version. They end at the arrival, a phrase boundary of the written form; from there the steered written form plays as written. Classic songs keep the one-step rewrites.

- **Boundary.** The first boundary (the next phrase, or the one after; the next double phrase for structural commands; the next bars for the mixer) that leaves time to type the first edit at a person's pace, measured with the typing of the app. The queue shows that bar: the console queues the first boundary, the steering (in the growth worker) moves it when the edit needs more time. No boundary left: `late`. Each later move gets the bars its typing needs; near the end of the song the moves are fewer and larger, and the typing pastes as the paste rule allows.
- **Bars.** A command records its boundary in the grown song's bars; the director's rewrite gets it in its own bars (`airOffset`: the growth's bars minus the written bars it replaced).
- **Mixer.** Mute types the `_` of `_$:` (a `mute` step), unmute takes it away; a volume is a `set` of `gain`, shown as `.gain()` on the line; lock changes no code.
- **Vary and Swap.** The new part is reached by small `notes` edits of the line (`ideaSteps`: the tokens of the idea change a few at a time, a field of another shape in one edit), the last edit the new idea. A part that differs a lot is one edit, a new line typed or pasted.
- **End.** The last waypoint is the song's ending: the lines go one at a time (at least a bar apart) during the outro's first phrase, then the last phrase plays as written and the transition follows. Not a cut.
- **Replay and cancel.** A song is always rebuilt from its growth and every standing command, in order, with the recorded boundaries; cancelling a command gives back the song without it. A recipe of growth version 1 (stage 4) replays its steered songs grown again from the steered song, as heard then.

## How it connects

- **Director.** A steered song is always rebuilt from its original plan plus every command still standing, in order ([radio.md](radio.md)). So cancelling or replaying gives the same song.
- **Material.** Vary composes, Add and More complex compose for tracks that have not played yet ([material.md](material.md)). Swap never composes: it picks a preset of the style or a saved pattern ([patterns.md](patterns.md)).
- **Seeds.** Composed and swapped parts are seeded by the song and the command's index (`vary:<song>:<index>`, `swap:<song>:<index>`).
- **Narrator and voice instrument.** Moves can be commented by the narrator ([narrator.md](narrator.md)); Talk more and Talk less sit in the Narrator group. The `voice` command (voice-placement) comes from the button Apply to the song on air in the Voices group, not from the console: it rewrites the song's voice instrument from the first quiet part after the next phrase, keeps the clips before, replaces a pending one, and is applied again after every later rewrite ([voice.md](voice.md)).
- **Guide.** Every command needs a line in the Radio card of the Guide (`npm run check:guide`).

A command that cannot apply is disabled with a reason: `late`, `no-type`, `all-playing`, `locked`, `last-track`, `no-target`, `no-drop`, `not-playing`, `no-ready`, `transition`.

## Options

<!-- generated:commands -->
| Command | Group | Applies at | Button | What it does |
| --- | --- | --- | --- | --- |
| `energy-up` | energy | next phrase | ▲ More energy (it: ▲ Più energia) | Raise the energy of the rest of the song |
| `energy-down` | energy | next phrase | ▼ Less energy (it: ▼ Meno energia) | Lower the energy of the rest of the song |
| `add` | arrangement | next phrase | + [type] | Adds or removes this instrument at the next phrase; if the song has none, it takes one from its style |
| `remove` | arrangement | next phrase | − [type] | Adds or removes this instrument at the next phrase |
| `more-complex` | arrangement | next phrase | More complex (it: Più complesso) | More tracks at once |
| `less-complex` | arrangement | next phrase | Simpler (it: Più semplice) | Fewer tracks at once |
| `vary` | arrangement | next phrase | Vary [type] (it: Varia [type]) | New notes for the [type] from the next phrase: composed in the song's key and chords, with the same sound |
| `swap` | arrangement | next phrase | Swap [type] (it: Scambia [type]) | Another ready part for the [type] from the next phrase: a preset of the style or one of your saved patterns that fits, never composed |
| `darker` | sound | next phrase | Darker (it: Più scuro) | Closes the filters |
| `brighter` | sound | next phrase | Brighter (it: Più brillante) | Opens the filters |
| `dirtier` | sound | next phrase | Dirtier (it: Più sporco) | More drive |
| `cleaner` | sound | next phrase | Cleaner (it: Più pulito) | Less drive and fewer effects |
| `more-space` | sound | next phrase | More space (it: Più spazio) | Delay and reverb |
| `instrument` | sound | next phrase | Change instrument (it: Cambia strumento) | Another sound for the leading instrument (or for this track) |
| `progression` | harmony | next double phrase | Change chords (it: Cambia accordi) | Another chord progression from the next double phrase |
| `key` | harmony | next double phrase | Change key (it: Cambia tonalità) | A key a fifth away from the next double phrase |
| `talk-more` | voice | next phrase | Talk more (it: Parla di più) | The narrator comments more |
| `talk-less` | voice | next phrase | Talk less (it: Parla di meno) | The narrator comments less |
| `voice` | voice | next phrase | Voice instrument (it: Voce strumento) | The voice instrument of the song on air, from the next quiet part |
| `drop` | song | next double phrase | Go to the drop (it: Vai al drop) | Jump to the drop at the next double phrase |
| `stay` | song | next double phrase | Stay here (it: Resta qui) | Repeat the part playing once more |
| `extend` | song | next double phrase | Extend [s] (it: Estendi [s]) | Make the song about [s] longer before its ending: a new stretch in the song's character, with its own moves; then the outro and the transition as planned. Applies at the next double phrase; press as often as you like |
| `end` | song | next double phrase | End the song (it: Chiudi il brano) | Go to the outro, then to the next song |
| `curve` | curve | next phrase | Curve (it: Curva) | no help text: described below |
| `curve-reset` | curve | next phrase |  | no help text: described below |
| `volume` | mixer | next bar | [track]: volume [v]% | no help text: described below |
| `mute` | mixer | next bar | [track]: mute (it: [track]: muto) | Mute from the next bar (press again to bring it back) |
| `unmute` | mixer | next bar | [track]: back (it: [track]: torna) | no help text: described below |
| `lock` | mixer | next phrase | [track]: locked (it: [track]: bloccata) | The director stops changing this track |
| `unlock` | mixer | next phrase | [track]: unlocked (it: [track]: sbloccata) | no help text: described below |
<!-- /generated -->

Commands without a help text in the app:

- `curve`: one double phrase of a curve (energy, density, brightness, tension, voice) gets the value dragged by the listener.
- `curve-reset`: the remaining double phrases of that curve go back to automatic.
- `volume`: a pinned level for a track, from the next bar.
- `unmute`: a muted track plays again from the next bar.
- `unlock`: the director may change the track again.

Vary and Swap take a part: lead (the default), bass, arp or pad. For Vary the lead is the hook, else the guitar. On a grown song both are typed as small notes edits of the line (see What it is).

## Example

<!-- generated:example-command -->
A radio session with seed `knowledge` in `berlin-techno`, first song. The listener presses Vary on the bass at bar 16; it applies at bar 24, the next phrase.

The step it adds to the song:

```json
[
  {"at":24,"pattern":{"track":"bass","to":"V1"},"by":"listener"}
]
```

The bass in section 2 before:

```js
$: note("<a1 g1 f1 g1>").transpose(-2).struct("[~ x x]*4")
  .s("sawtooth").lpf(sine.range(341, 1365).slow(8)).lpq(10.53)
  .decay(.1).sustain(0).gain(0.8).mask(section2).velocity(section2).orbit(2).analyze("bass")
```

After:

```js
$: note("<a1 g1 f1 g1>").transpose(-2).struct("[~ x x x]*4").transpose("[0 0 12 0]*2")
  .s("sawtooth").lpf(sine.range(341, 1365).slow(8)).lpq(10.53)
  .decay(.12).sustain(0).gain(0.8).mask(section2).velocity(section2).orbit(2).analyze("bass")
```
<!-- /generated -->

## Where to read more

- [docs/ENDLESS.md](../ENDLESS.md#steering): the table of commands and what each changes, [composed material](../ENDLESS.md#composed-material), [curves](../ENDLESS.md#curves).
- `COMMANDS`, `whyNot`, `steerSong` in `src/endless/steering.js`.
- [openspec/changes/radio-variation/](../../openspec/changes/radio-variation/): Vary and Swap.
- [openspec/changes/radio-profiles/design.md](../../openspec/changes/radio-profiles/design.md) D9, D10: commands as waypoints on grown songs, the chooser on air.
- [openspec/changes/radio-chooser-versions/design.md](../../openspec/changes/radio-chooser-versions/design.md): chooser versions on air, the setting, the recipe field.
