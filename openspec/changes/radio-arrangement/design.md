## Context

Steering (`src/endless/steering.js`) rebuilds the song on air from its plan plus every standing command, in order, with random streams `steer:<song>:<index>`. Today:

- `ARRANGE_TYPES = ['drums', 'bass', 'lead', 'pad', 'texture']`; `KIND_OF` maps `lead` to hook, arp and guitar and `drums` to the drum tracks (the director splits a groove into `kick`, the `bd` row, and `beat`, the rest). The console draws one button per type, "+" when the type is silent at the next phrase, "−" when it plays (`src/radio/radio.js`, `renderSteer`).
- `candidateTracks` (`src/endless/director.js`) makes at most one track per type with fixed ids (`kick`, `beat`, `bass`, `arp`, `hook`, `pad`, `guitar`, `texture`, `riser`). `tracksOfKind(...)[0]` makes the track #41 adds; a clash of ids gets `-2`. `whyNot` returns `all-playing` when every track of the type plays. Remove strips every playing track of the type.
- Limits: `usualHigh` from `R.tracks.usual` and complexity, `hardMax` = `min(R.tracks.max, 8)`, or `max(R.tracks.max, 8) + 2` above complexity 0.8. `candidateMoves` adds a track only below `hardMax`; `densityMax` caps the density curve. More complex and Simpler move `usualHigh` by one.
- Buses: `ORBIT_OF` gives the first track of each type its own orbit (1 to 8); further tracks get 9, 10, … The spoken tracks use 13 and 14, so a fifth extra track would share a bus with the voice.
- Crescendo (`src/song/crescendo.js`) finds "the" drums, kick or pad track with `dest.find(t => t.type === …)`: with several tracks of a type it takes the first, which is acceptable for the opening and the breaks but must not assume uniqueness.
- Vary and Swap (`radio-variation`) rewrite every playing track of the part (`varyTracks`), lead meaning the hook, else the guitar. Song harmony (`progression`, `key`) changes chords or key for every part; the owner asked for the same idea per part (#83, checklist fx5), with a selector that defaults to an automatic choice.
- Saved patterns: `forRadio` (`src/library/patterns.js`) gives `{ id, type, pattern, styles, context, idea }`; `userPool` / `fitsTrack` (`src/endless/material.js`) filter by type and style tag. A saved pattern also stores `sound`, `settings` and `context { key, chords, meter, bpm, mode }`.
- Scope: `opts.scope` is `song` or `session`; in session scope only energy, complexity and talk nudge the sliders for later songs. Commands go to `S.recipe.steering` with their song index.
- Levels: master at 0.6, a look-ahead limiter with ceiling 0.97, a style `headroom` as push (`level-headroom`). A composed pad already plays at `COMPOSED_PAD_GAIN` 0.6.

## Goals / Non-Goals

**Goals:**
- One + and − per instrument, several tracks per instrument, inside the existing rewrite model (commands rebuild the song; no new kind of state).
- Variety and fit for a second or third track of an instrument: sound, pattern, register, level.
- Room past the style limits from the console, with a fixed safety cap and automatic headroom.
- The user's saved patterns on air, previewed before they go in.
- One track as the target of Vary, Swap and a new Part harmony, automatic by default.
- Scope and replay for all of it.

**Non-Goals:**
- Changing how the director arranges generated songs without commands (the seed fixtures must not move).
- Editing a saved pattern from the radio, or saving from the radio into the library (Save as pattern stays in Compose).
- Voice and spoken tracks: they keep their own controls.
- A per-part key change: a part in another key than the rest clashes; Part harmony stays inside the song's key and chords.

## Decisions

### D1. Instruments and commands

`INSTRUMENTS = ['kick', 'beat', 'bass', 'arp', 'hook', 'guitar', 'pad', 'texture']` (labels: kick "cassa", beat "ritmica", hook "melodia" in Italian; "kick", "beat", "melody" in English). An instrument maps to a track type plus, for drums, a role: kick is a drums track holding only `bd`, beat a drums track holding the other rows. New command kinds `more` and `less` with `{ part }` (one of `INSTRUMENTS`). The old `add` and `remove` with `drums`, `bass`, `lead`, `pad`, `texture` stay in `COMMANDS` for replay only, with today's behaviour, and leave the console. This keeps recorded sessions exact (see D10).

The riser is not an instrument of the console: the director places it before big moments as a transition sound; a listener's riser would mostly sound like a mistake. Open question below.

Shown when `styleHas(plan, part)` or the song holds a track of it. Layout, two rows: kick, beat, bass, texture | arp, melody, guitar, pad; More complex and Simpler at the end of the second row. Each instrument is a small pair `[− name +]` with a count badge when more than one plays ("arp ×2"). Shortcuts: digits 1 to 8 add, Shift+digit removes (today 1 to 5 toggle).

Alternative rejected: keeping the toggle (one button that is "+" or "−"). With several tracks per instrument the listener needs both directions at once.

### D2. Track instances

A track added beside others of its instrument gets id `<base>-<k>` (`arp-2`, `pad-3`) and name `<Name> <k>`, the first free `k`. The track records `by: 'listener'` and the command index that made it, so "−" can find "the last one added": among playing tracks of the instrument, the listener's with the highest command index, else the one whose `add` step is latest, else the last in entry order. The director's own candidates keep their ids, so the fixtures do not move.

`whyNot` for `more`: `cap` (12 playing, D4), `part-cap` (per-instrument cap, D4), `no-type` (style lacks it and the song holds none), `locked` (only locked silent tracks and no room for a new one). For `less`: `no-type`, `locked`, `last-track`. `all-playing` goes away for `more`.

The places that assume one track per type change to lists: `tracksOfKind` returns the style's track for an instrument with a variety request (D3); `KIND_OF_ADD` and `ADD_PHRASE` key on type and stay; `varyTracks` takes a target (D7); Crescendo keeps `find` for the opening track and the break track and is checked with two drums and two pads (the first one is the right choice there: it is the director's own).

### D3. Variety for a second track

`trackFor(R, part, existing, rng)`: starts from `tracksOfKind` and then:

| Field | Rule |
| --- | --- |
| Sound | the style's list (`waves`, `kits`, `samples`, guitar `types`) without the sounds the existing tracks of the instrument use; the whole list when none is left. A generated sound (`compose('sound')`) when the style names sound kinds. |
| Pattern | composed (`airIdea`) with `avoid` = every idea of the existing tracks, or a preset the existing tracks do not hold when the session source is `patterns`. Drums: a groove of the style other than the ones playing; a beat keeps only rows the other beat does not play when it can (hats against percussion). |
| Register | `octave` offset +1 from the highest existing track for arp, hook and guitar, −1 for the second bass only when it stays above the bass floor (else +1, as a mid bass); a pad voiced an octave up or in another inversion. The generator's register input takes the offset. |
| Level | gain × 0.75 for the second track of an instrument, × 0.6 for the third, before the headroom rule (D5). A second bass at × 0.6. |
| Pan | a second and third track of a melodic instrument panned −0.3 and +0.3 where the track settings have `pan`, so they do not sit on top of each other. |

### D4. Limits

| Limit | Value | Who |
| --- | --- | --- |
| Usual and max of the style, `hardMax` | as today | the director, for generated songs and its own moves |
| Console cap | 12 tracks playing (riser and voices not counted) | `more` |
| Per instrument | kick 1, bass 2, beat 2, others 3 | `more` |

A `more` past `hardMax` raises the song's `hardMax` to the count it reaches, so the director's later moves do not undo it, and `densityMax` follows. The director's strip moves skip tracks with `by: 'listener'` until the song's final outro, where they leave with the rest.

Why 12: 8 base buses plus 4 extra stay clear of the spoken buses once D6 moves them; the owner's mixes sound best at 4 to 5 layers, so 12 is a ceiling, not a target. CPU: measured in phase 1 with `check-steering` on a 12-track song (frame budget of the scheduler, no underruns); lower the cap if it does not hold.

### D5. Headroom

When the tracks playing at a bar exceed `usualHigh`, every track whose gain the listener did not pin is scaled by `sqrt(usualHigh / n)` (equal power: the summed level stays close to the usual count's). The factor is written into the track's gain at the rewrite, so the code shows it and replays reproduce it; it changes only at phrase boundaries, so no gain jumps inside a phrase. The limiter stays the safety net. Measured target: with 12 tracks, the level into the limiter (`in=`) at most 1.2 and the output below 1.0, on three styles (berlin-techno, a darksynth style, jazz).

### D6. Buses

Extra orbits go 9, 10, 11, 12, then 15, 16, … skipping the spoken orbits 13 and 14. Songs without extra tracks keep their orbits, so built-in songs and the code snapshots do not move.

### D7. Target selector for Vary and Swap

Commands carry `target: 'auto' | <track id>`; default `auto`. With `auto` the rewrite picks one playing, unlocked track of the part: the one varied or swapped least recently in this song (by the `V<k>`/`S<k>` steps), ties broken by the command's stream. Today's commands without `target` keep rewriting every track of the part (replay). The part picker gains `guitar` (separate from lead, as arp already is). The selector is a small dropdown after the part chips, listing "Auto" and the playing tracks of the part by name; it resets to Auto when its track stops.

### D8. Part harmony

New command `voicing` (label "Part harmony", "Armonia della parte") `{ part, target, treatment }`, `treatment` in `auto`, `thirds`, `octave`, `colour`, `inversion`. It writes a new pattern `H<k>` from the track's current idea and a pattern step, like Vary:

| Treatment | Parts | Effect |
| --- | --- | --- |
| thirds | lead, arp, bass | every degree +2 in the song's scale (a diatonic third), clamped to the instrument's range |
| octave | all with notes | +12 or −12, the direction that stays in range |
| colour | pad, guitar | chords with `7`, `9` or `sus` added where the chord quality allows it |
| inversion | pad, arp, guitar | first or second inversion of each chord |

`auto` picks among the treatments of the part the one it has not had, seeded by `voicing:<song>:<index>`; the queue shows the treatment chosen. A pattern written as fixed notes (a preset with `notes`) is read through its idea (`presetOf`), so every part with notes can take it. The group in the console stays "Song harmony" for progression and key; Part harmony sits in the Parts group, next to Vary and Swap, sharing their part and target selectors.

Alternative considered: a per-part progression (one part on other chords). Rejected: it clashes with the bass and pad on the same bar; colour and inversion give the same "new harmony" feeling without a clash.

Song harmony also gets an optional dropdown (progression: Auto or one of the style's progressions; key: Auto, a fifth up, a fifth down, the relative key). Default Auto keeps today's behaviour. Open question below whether this belongs here.

### D9. Add a saved pattern

Command `pattern` `{ mode: 'new' | 'replace', target?, item }` where `item` is a copy of the saved pattern as `forRadio` gives it, extended with `sound`, `settings` and `context.meter`. Fit (`fitsAir`): the song's style plays the type or the song holds a track of it; `meterSteps(context.meter) === meterSteps(song meter)`; the type is one of `hook`, `bass`, `arp`, `pad`, `drums`, `guitar`. Style tags are not required here (the listener picks the pattern by hand), unlike the director's pool.

Key: an idea with degrees or chords follows the section's key and chords as composed ideas do; a pattern with fixed notes moves by the smallest interval from `context.key` to the song's key (−6 to +5 semitones); a chromatic hook keeps its mode. Tempo: patterns are written in steps per bar, so they take the song's tempo; the card shows the saved tempo, and when the song is more than 1.5 times faster or slower, a hint says the pattern will feel different.

`new`: a track of the pattern's type (instance id as D2), the pattern as `A`, sound from `item.sound` when the sound is loaded (`check-style-sounds` registry), else a sound of the style (D3); level and register as D3. `replace`: a `P<k>` pattern on the target track and a pattern step, like Swap; the track keeps its sound.

UI: a collapsible section under the Parts group, "Add a saved pattern" with a count. Collapsed: one row per pattern (mini preview canvas 64×20, name, type chip, play button). Expanded: the Patterns tab cards (`pn-card` look) with the preview drawing, type, key, tempo, styles, play, and two actions "Add as new track" and "Replace" (a dropdown of the playing tracks of that type). Patterns that do not fit are counted below ("2 in another meter") and not listed. The preview listen plays the pattern alone through the Patterns tab loop player at the song's key and tempo, with the radio ducked by 12 dB; the radio is never paused, so the transport and the recording go on.

### D10. Scope, replay and versions

Commands are stored in `S.recipe.steering` as today, with `scope` when `session`. A session-scope `more`/`less`/`pattern`/`voicing` also goes to `S.recipe.arrange` (a list from the song where it was given). When the director plans a later song, `arrangeBias(recipe, n)` applies each entry in order as a forced command at the song's first phrase where that part is playing or can enter (`more`: one more track of the instrument entering with the director's own entry of that type; `less`: one fewer candidate of it; `pattern`: a new track with the pattern from the first groove part; `voicing`: the treatment on that part from the first phrase). A command the later song cannot take is skipped there. Vary and Swap are song-only.

Replay: unchanged rule, the song is the plan plus the commands. Old kinds keep their old code paths. `DIRECTOR_VERSION` goes to 9 in phase 1 (headroom D5 and the session bias change how steered sessions sound); the seed fixtures, which have no commands, must not move, and `check:endless` proves it.

## Risks / Trade-offs

- **[Mud: two pads and two arps in the same range]** → register offsets and pans (D3), and the per-instrument caps; the owner's listening test decides the offsets.
- **[CPU at 12 tracks with their own buses]** → measured in phase 1; the cap is a constant and can go down.
- **[Headroom scaling makes the song quieter as it grows]** → equal-power scaling keeps the perceived level; the push of loud styles stays.
- **[Crescendo and Live coder growths with several tracks of a type]** → a check grows a steered song with two arps and two drums tracks (`check:radio-profiles`).
- **[Saved patterns with a sound that is not loaded]** → fall back to a style sound; the card says which sound it will use.
- **[Session-scope arrangement surprises the listener on the next song]** → the queue shows "for the session" items, cancellable until the next song starts.

## Open Questions

- **Riser on the console?** Recommended: no; it stays the director's transition sound.
- **Per-instrument caps (kick 1, bass 2, beat 2, others 3)?** Recommended: yes; a second kick only flams with the first, and three basses mask each other.
- **Do listener tracks survive the director's strips until the outro?** Recommended: yes, so "+" means "keep it"; the listener removes it with "−" or the mixer.
- **Song harmony dropdown (progression and key picked by hand)?** Recommended: include it in phase 5 with Part harmony, default Auto, since it shares the selector.
- **Session scope for a saved pattern?** Recommended: yes, as a new track in later songs where it fits; otherwise the listener has to add it to every song.
- **Saved pattern sound: its own or the song's?** Recommended: its own for a new track (that is why it was saved), the song's for a replace.
