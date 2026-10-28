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
- **Voice group (voice-full-controls D10).** Moves can be commented by the narrator ([narrator.md](narrator.md)). The console's Voice group has a row per voice: Voice: narrator (Talk more, Talk less) and Voice: track (a phrase preset, a voice style and Apply), then Add a line. Apply sends one `voice` command with the preset's options (rewrite from the first quiet part after the next phrase, the clips before kept) and the style as `sound` (a `set` step on the voice track from the command's bar); `voice-sound` is the sound alone. With the whole session scope Apply also writes the preset and the style into the Voices group (also with an artist). `say-live { text, lang, speaker, mode }` adds an own-text passage clip on the voice track (a Words track, silent before it, when the song has none) on the first bar that starts at least half a bar after its sample is ready (`now`, `applyBar`), or in the first free part Where allows from there (`moment`, `sayBar`); the narrator yields on its bars. Each line also writes a listener step on its bar (after-tests-oct28 D4): `add` of the voice track (`unmute` when the track plays from the start with no add step), which changes nothing in the sound but makes the radio evaluate the code on that bar, so the line sounds there even when the voice track already plays. The plan keeps them (`voiceAir`, `sayAir` in `src/endless/steering.js`), so later rewrites, Replay and saved sessions rebuild the same song ([voice.md](voice.md)).
- **Guide.** Every command needs a line in the Radio card of the Guide (`npm run check:guide`).

A command that cannot apply is disabled with a reason: `late`, `no-type`, `all-playing`, `locked`, `last-track`, `no-target`, `no-drop`, `not-playing`, `no-ready`, `transition`, `cap`. A lock never disables a listener's command (radio-arrangement D12): Vary, Swap and the sound commands reach locked tracks; only `add` and `remove`, kept for sessions recorded before, still skip them.

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
| `more` | arrangement | next phrase | + [part] | One more [part] track from the next phrase, even when one plays: another sound and pattern from the style, an octave up and a little lower; if the song has none, it takes one from its style |
| `less` | arrangement | next phrase | − [part] | One fewer [part] track from the next phrase: the last one you added, else the last one that came in |
| `lock-part` | arrangement | next phrase | [part]: locked (it: [part]: bloccato) | Closes the lock: the director leaves the [part] alone until the song ends (your commands still work) |
| `unlock-part` | arrangement | next phrase | [part]: unlocked (it: [part]: sbloccato) | Opens the lock: the director may change the [part] again |
| `riser` | arrangement | next phrase | + Riser before the next change (it: + Riser al prossimo cambio) | A riser is a noise that rises (a filter opening, a volume growing) for a few bars and ends on a change of part, to tell the ear something is coming. Up: into the change; down: starts on the change and falls after it. This song only |
| `pattern` | arrangement | next phrase | Saved pattern (it: Pattern salvato) | One of your saved patterns in the song on air from the next phrase, in the song's key and tempo: as a new track (with its own sound) or in place of a playing track (with that track's sound) |
| `voicing` | arrangement | next phrase | Part harmony (it: Armonia della parte) | Changes how the chosen part sits on the chords, from the next phrase: in thirds, an octave up or down, chord colour (sevenths, pads and guitars only), another inversion; Auto picks a new one. It stays in the song's key and chords |
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
| `voice` | voice | next phrase | Voice: track (it: Voce: traccia) | The voice track of the song on air, from the next quiet part |
| `say-live` | voice | next bar | Add a line (it: Aggiungi frase) | A line typed in the console, spoken by the voice track of the song on air: on the first bar after its sample is ready (Say now) or in the next free part where it may speak (At the right moment) |
| `voice-sound` | voice | next phrase | Voice style (it: Stile della voce) | The voice style of the voice track of the song on air, from the next phrase (with Apply, together with the preset) |
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
- `unlock`: the director may change the track again. A track of a locked instrument unlocked in the mixer: that track only; the instrument's other tracks stay locked one by one.

Arrangement by instrument (radio-arrangement): the console shows a − and a + per instrument in two rows (kick, beat, bass, texture; arp, melody, guitar, pad) with a count badge and a lock, a line with the tracks playing, the warning past the recommended counts, and the riser row (length, direction, sound, the lock of the director's risers). Digits 1 to 8 press +, Shift with the digit presses −. The instrument lock and the mixer's locks are one state: a closed instrument lock locks every row of it, a row unlocked in the mixer gives the half state.

- `more`: one more track of an instrument (`part`: kick, beat, bass, arp, hook, guitar, pad, texture) from the next phrase, even when one plays: a silent track of it the song holds, else a new one (`arp-2`, "Arp 2") from the style, with another sound and pattern, an octave up and at a lower gain (× 0.75, × 0.6 for a third one or a second bass). Up to 12 tracks play at once (`cap`); past the recommended count (kick 1, beat 2, bass 2, the others 3) it warns and never blocks (`moreWarning`). The director never strips a track the listener added before the final outro; one that sat out a break or a charge comes back on the next phrase.
- `less`: one fewer track of an instrument: the listener's last one, else the one that came in last (`not-playing`, `last-track`).
- `lock-part`, `unlock-part`: a lock per instrument (or the riser): the director leaves every track of it alone for the rest of the song, tracks added later included; a locked drum still sits out breaks and the charge before a drop and comes back at the drop with its sound and pattern (after-tests-oct28 D7, director version 12); other locked instruments play through. The listener's own commands still act on locked tracks. `unlock-part` also opens the per-track locks of that instrument.
- `riser`: a noise sweep (`bars`: auto, 2, 4 or 8; `dir`: up or down; `sound`: noise) that ends on the next part change (up) or starts on it (down), replacing the director's riser there; in a style without a riser the song gets one only the listener uses (`riserTarget`; `late` when no change is 2 bars away).

- `pattern`: one of the listener's saved patterns on air (`mode`: `new` or `replace`, `target` for a replace, `item`: a copy of the pattern as `forRadio` gives it, with name, kind, sound, settings and context). It fits when its type is one the style plays (or the song holds) and its meter has the song's steps per bar (`fitsAir`, style tags not needed; `no-fit`). New: a track of its instrument (`patternPart`: a groove with only bd is a kick) with the pattern as A, its own sound when the app knows it, else the style's, recorded as a `+`. Replace: a `P<k>` pattern on the target, which keeps its sound. Patterns are written in A, so they follow the song's key like every part; a chromatic melody keeps its mode. The console's preview plays the pattern's loop riding the radio, the radio at a quarter of its velocity (12 dB lower), never paused (`duck` in `src/player/preview.js`).

- `voicing`: Part harmony (D8) on the part (`type`) and `target` of Vary and Swap, with a `treatment`: `thirds` (scale degrees + 2, an arp's next chord tone), `octave` (up, or down when already up), `colour` (the section's chords with sevenths, pads and guitars), `inversion` (a voiced chord anchored higher, an arp's indices rotated), or `auto` (one the track can take other than its last). It writes an `H<k>` pattern from the track's idea and a pattern step, recorded in `plan.voiced` (`src/endless/part-harmony.js`; `no-target` when no track of the part can take it).
- `progression` and `key` take the Song harmony menu: `chords` (a progression of the style by name; `same-chords` when it already plays) and `to` (`up`, `down`, `relative`: a fifth up, a fifth down, the relative major; `no-key` when that key is not one of the app's, `keyTo`). Without them, or with `auto`, they draw as before.

**The whole session (D10).** With the scope switch on the whole session, `more`, `less`, `pattern`, `voicing`, `lock-part` and `unlock-part` (`SESSION_KINDS`) also go to the recipe's `arrange` list (`{ song, ref, kind, part, … }`). Each later song is planned, then `biasSong` (`sessionBias`) puts them on the director's song as commands on its own boundaries: "+" where the instrument first plays (twice where the director brings it in, so it is one more), "−" there, a saved pattern on the first part after the intro, Part harmony where the part first plays, the instruments still locked for the session from their first entry. The result is the base the listener's own commands steer, in the radio and in `sessionItems` (replays, exports, playlists). Vary, Swap and the riser stay on the song on air. A session choice can be cancelled until the next song starts; the songs already prepared take the list again (`rebias`).

Every `+` writes a headroom rule: on phrases where more tracks play than the song's usual count, the tracks whose gain the listener did not set play at `sqrt(usual / n)` of their gain (`set` steps on the phrase). Extra buses skip the spoken orbits (13, 14) and the narrators' (15 and up).

Vary and Swap take a part: lead (the default), bass, arp, pad or guitar. For Vary the lead is the hook, else the guitar. A `target` (radio-arrangement D7) narrows them to one track: `auto` takes the track of the part varied or swapped least recently in the song (ties by the command's stream), a track id takes that track; a command without a target (sessions recorded before) rewrites every track of the part (`targetTracks`). On a grown song both are typed as small notes edits of the line (see What it is).

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
