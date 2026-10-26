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
- Locks: the mixer has a per-track lock (`lock` and `unlock` commands, `plan.locked`, song scope). Locked track ids reach `directSong` as `locked`: `candidateMoves` skips them (no add, strip, variation, filter, drive or effect move), and the charge before a drop and the riser placement respect them. The listener's forced moves skip locked tracks unless they come from the mixer. The mixer draws the lock as an emoji (`🔒`, `🔓`); `src/icons.js` has a drawn `LOCK`. The compilation's knob locks (`radio-knob-locks`) are a different thing: a knob held by hand keeps its value for the next songs.
- Riser: a track of type `riser` with no pattern, white noise with a high-pass filter sweeping 300 to 8000 Hz and a gain rising from 0 over `bars` (8 by default), or the reverse with `dir: 'down'` (`src/music.js`). 12 of the 20 styles have one (`riser: {}` in the recipe). The director adds it in the phrase before a drop, chorus or peak (not a break) and during the charge before a drop, and takes it out two phrases later; it does not count as a layer for density. The "Break with riser" transition has its own riser (`tx-riser`), outside the song.
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

The riser is not one of the eight instruments: it has no notes or pattern and it marks a moment, so it gets its own row with its own command (D11).

Shown when `styleHas(plan, part)` or the song holds a track of it. Layout, two rows: kick, beat, bass, texture | arp, melody, guitar, pad; More complex and Simpler at the end of the second row. Each instrument is a small group `[− name + lock]` with a count badge when more than one plays ("arp ×2"); the lock is D12. A third row holds the riser (D11). Below the rows a line says how many tracks play, the style's usual maximum and the console cap. Shortcuts: digits 1 to 8 add, Shift+digit removes (today 1 to 5 toggle).

Alternative rejected: keeping the toggle (one button that is "+" or "−"). With several tracks per instrument the listener needs both directions at once.

### D2. Track instances

A track added beside others of its instrument gets id `<base>-<k>` (`arp-2`, `pad-3`) and name `<Name> <k>`, the first free `k`. The track records `by: 'listener'` and the command index that made it, so "−" can find "the last one added": among playing tracks of the instrument, the listener's with the highest command index, else the one whose `add` step is latest, else the last in entry order. The director's own candidates keep their ids, so the fixtures do not move.

`whyNot` for `more`: `cap` (12 playing, D4) and `no-type` (style lacks it and the song holds none). For `less`: `no-type` and `last-track`. `all-playing` goes away for `more`. A lock does not disable `more` or `less`: locks keep the director out, not the listener (D12). Past the recommended count `more` stays enabled and carries a warning (D4).

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
| Console cap | 12 tracks playing (riser and voices not counted) | `more` (disabled at 12, reason `cap`) |
| Recommended per instrument | kick 1, beat 2, bass 2, the others 3 | a warning only, never a block |

No cap per instrument: the owner wants two kicks in one song to be possible. When `more` brings an instrument past its recommended count, the count badge turns to the warning colour and a line under the rows says it, with the recommended values ("2 casse: di solito ne basta 1 ... Valori consigliati: cassa 1, ritmica 2, basso 2, gli altri 3"); the "+" tooltip says it too before the press. The warning goes when the count is back at the recommended value. D3 still makes the extra track differ (a second kick takes another groove of the style and × 0.75 gain, so the two do not land on the same steps where the style offers another groove).

The 12-track cap stays, as the owner approved earlier. Reasons that still hold: the CPU cost of 12 tracks with their own buses, measured in phase 1 (task 1.8); the headroom rule (D5), whose equal-power scaling gets steep past 12 (each track at about 0.8 of its level at 8 tracks, 0.65 at 12 against 5 usual); and the spoken buses (D6). Without per-instrument caps, the 12-track cap is the only guard left against a song stacked by a key held down, so it matters more, not less. It is a constant: lower it if task 1.8 fails, raise it only with a new measurement.

A `more` past `hardMax` raises the song's `hardMax` to the count it reaches, so the director's later moves do not undo it, and `densityMax` follows.

A track the listener added is never removed for good by the director, locked or not: the director's strip moves skip tracks with `by: 'listener'` until the song's final outro, where they leave with the rest unless locked (D12). An unlocked listener track may sit out a break and the charge before a drop like the director's own tracks, and comes back at the phrase after it; a locked one plays through them. The owner's test: press "+" on an instrument and listen for the next phrases; the track must not disappear a few seconds later (task 1.4 and 2.3).

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

Song harmony also gets a menu, confirmed by the owner: progression (Auto or one of the style's progressions, by name) and key (Auto, a fifth up, a fifth down, the relative key). Default Auto keeps today's behaviour: "Change chords" and "Change key" pick by themselves. A choice in the menu makes the next press apply that progression or key. Built in phase 5 with Part harmony. It follows the same scope as today's Change chords and Change key.

### D9. Add a saved pattern

Command `pattern` `{ mode: 'new' | 'replace', target?, item }` where `item` is a copy of the saved pattern as `forRadio` gives it, extended with `sound`, `settings` and `context.meter`. Fit (`fitsAir`): the song's style plays the type or the song holds a track of it; `meterSteps(context.meter) === meterSteps(song meter)`; the type is one of `hook`, `bass`, `arp`, `pad`, `drums`, `guitar`. Style tags are not required here (the listener picks the pattern by hand), unlike the director's pool.

Key: an idea with degrees or chords follows the section's key and chords as composed ideas do; a pattern with fixed notes moves by the smallest interval from `context.key` to the song's key (−6 to +5 semitones); a chromatic hook keeps its mode. Tempo: patterns are written in steps per bar, so they take the song's tempo; the card shows the saved tempo, and when the song is more than 1.5 times faster or slower, a hint says the pattern will feel different.

Sound, confirmed by the owner: `new`: a track of the pattern's type (instance id as D2), the pattern as `A`, sound from `item.sound` when the sound is loaded (`check-style-sounds` registry), else a sound of the style (D3); level and register as D3. `replace`: a `P<k>` pattern on the target track and a pattern step, like Swap; the track keeps its sound.

UI: a collapsible section under the Parts group, "Add a saved pattern" with a count. Collapsed: one row per pattern (mini preview canvas 64×20, name, type chip, play button). Expanded: the Patterns tab cards (`pn-card` look) with the preview drawing, type, key, tempo, styles, play, and two actions "Add as new track" and "Replace" (a dropdown of the playing tracks of that type). Patterns that do not fit are counted below ("2 in another meter") and not listed. The preview listen plays the pattern alone through the Patterns tab loop player at the song's key and tempo, with the radio ducked by 12 dB; the radio is never paused, so the transport and the recording go on.

### D10. Scope, replay and versions

Commands are stored in `S.recipe.steering` as today, with `scope` when `session`. A session-scope `more`/`less`/`pattern`/`voicing`/`lock-part`/`unlock-part` also goes to `S.recipe.arrange` (a list from the song where it was given). When the director plans a later song, `arrangeBias(recipe, n)` applies each entry in order as a forced command at the song's first phrase where that part is playing or can enter (`more`: one more track of the instrument entering with the director's own entry of that type; `less`: one fewer candidate of it; `pattern`: a new track with the pattern from the first groove part; `voicing`: the treatment on that part from the first phrase; `lock-part`: the part locked from its first entry). The riser command, Vary and Swap stay song-only. A command the later song cannot take is skipped there.

Replay: unchanged rule, the song is the plan plus the commands. Old kinds keep their old code paths. `DIRECTOR_VERSION` goes to 9 in phase 1 (headroom D5 and the session bias change how steered sessions sound); the seed fixtures, which have no commands, must not move, and `check:endless` proves it.

#### Scope and lock together

The owner asked whether "Tutta la diretta" is a lock that goes past one song. It is not: they answer two different questions, and every choice has both.

- **Scope** (the switch "Vale per questo brano" / "Vale per tutta la diretta") says **how long** a choice lasts: the song on air, or the song on air and every later song of the session.
- **Lock** (per instrument, D12) says **whether the director may change** what the choice set: open, the director keeps arranging that instrument around it; closed, the director leaves it alone.

| Scope | Lock | What happens |
| --- | --- | --- |
| This song | open | The change plays from the next phrase. The director may change that instrument later in the song (pattern, filter, effects, a pause for a break) but does not remove the listener's tracks. Later songs: as the director plans them. |
| This song | closed | The change plays from the next phrase and the director does not touch the instrument until the song ends. Later songs: as the director plans them. |
| Whole session | open | The change plays now and in every later song where it fits (D10 above); in each song the director may change it as in the first row. |
| Whole session | closed | The change plays now and in every later song where it fits, and in each of them the instrument is locked from the moment it first plays. |

A lock command follows the scope switch like the others: a lock given with "Tutta la diretta" goes to `S.recipe.arrange` and locks that instrument in later songs from its first entry (before it, the director plans the song as usual, so a locked instrument still gets in). An unlock with the same scope ends it for the songs after. The compilation's knob lock is the closest thing to "whole session, closed": a held knob keeps its value in every next song.

### D11. Riser row

What the riser is today, in plain words: a whoosh. A noise that rises (a filter opening and a volume growing) for a few bars and ends on a section change, to tell the ear "something is coming". The director puts one before drops, choruses and peaks. The owner leans yes on putting it in the console, so it gets a row of its own, not a + and − (it is a moment, not a layer that plays for minutes).

| Control | Values | Effect |
| --- | --- | --- |
| "+ Riser al prossimo cambio" ("+ Riser before the next change") | button | one riser that ends on the next phrase where the part changes (the next role change; when none is left before the outro, the next double phrase) |
| Lunghezza (Length) | Auto, 2, 4, 8 bars | Auto: the style's riser length, else 8, cut to the bars left before the change |
| Direzione (Direction) | Sale (up), Scende (down) | up: rises into the change; down: a downlifter that starts on the change and falls after it |
| Suono (Sound) | Fruscio (noise) | today's sound; the menu shows only when there is more than one (open question) |
| Lock "riser del regista" | open, closed | closed: the director places no riser in this song (the existing lock on the riser track id); the listener's risers still play |

Command `riser { bars, dir, sound }`, recorded and replayed like the others; it writes a riser clip ending on the target bar, on the song's riser track (created from `music.js` defaults when the style has none) with `bars` and `dir` in the clip's settings. When the director already places a riser on that change, the command replaces it (one riser per change). With fewer than 2 bars left before the change it targets the change after (`steerWhy:late` names the bar). It is song-only whatever the scope (it marks one moment). The row shows for every style, since the noise does not depend on the style; in the 8 styles without a riser the director never adds one and only the listener's play. It does not count for the 12-track cap or density, as today.

Rejected: a riser as a ninth instrument with + and −. A riser that plays on and on is noise over the song; the director already takes it out two phrases later.

### D12. Lock per instrument

The owner proposed a lock ("lucchetto") per instrument, as for other settings: open by default, closed means the director does not touch it. Chosen, built on the mixer's per-track lock rather than a new mechanism:

- Command `lock-part` / `unlock-part` `{ part }`, stored in `plan.lockedParts`. The ids passed to `directSong` as `locked` become `plan.locked` plus every track of a locked part, including tracks the listener adds later with "+". So everything the per-track lock already does (no add, strip, variation, filter, drive or effect move by the director; respected by the charge and the riser) applies to the whole instrument.
- A closed lock on an instrument that is silent keeps the director from bringing it in; on one that plays, it keeps it playing as it is until the song ends, through breaks and the charge, and past the outro's strips (the song's end and the transition fade it as today).
- The listener is never blocked by a lock: "+", "−", Vary, Swap, Part harmony, a saved pattern and the Sound commands act on locked tracks. Song harmony still changes their chords and key, and the headroom rule (D5) still scales them (a safety rule, not a director move; a gain set in the mixer stays pinned).
- Default open. A track added with "+" is not locked by itself: the owner wants the director free by default. It is still never removed for good (D4).
- Sync: the console lock of an instrument is closed when every track of it is locked or the part is locked; when only some tracks are locked in the mixer it shows a half state (closed outline, tooltip "1 di 2 tracce bloccate") and a click locks them all. Locking the instrument shows closed locks on its mixer rows; unlocking one of those rows in the mixer unlocks that track only and the instrument shows the half state. Queue items read "basso: bloccato" / "basso: sbloccato".
- The mixer lock icons become drawn icons: `LOCK` (closed, filled) and a new open lock in `src/icons.js`; the emoji go.

Alternatives considered: locking every listener track by default (rejected by the owner: the director should stay free unless asked); a separate "keep" flag next to the lock (two controls for one idea); locks per track only in the mixer (the console works per instrument, and a second arp would need its own lock press).

## Risks / Trade-offs

- **[Mud: two pads and two arps, or two kicks]** → register offsets, pans and another groove (D3), the warning past the recommended counts (D4); the owner's listening test decides the offsets.
- **[A locked instrument fights the song's shape]** → a locked kick plays through a break; that is what the lock means, and the tooltip says it. The lock lasts one song unless given for the whole session.
- **[CPU at 12 tracks with their own buses]** → measured in phase 1; the cap is a constant and can go down.
- **[Headroom scaling makes the song quieter as it grows]** → equal-power scaling keeps the perceived level; the push of loud styles stays.
- **[Crescendo and Live coder growths with several tracks of a type]** → a check grows a steered song with two arps and two drums tracks (`check:radio-profiles`).
- **[Saved patterns with a sound that is not loaded]** → fall back to a style sound; the card says which sound it will use.
- **[Session-scope arrangement surprises the listener on the next song]** → the queue shows "for the session" items, cancellable until the next song starts.

## Decisions from the owner (2026-10-26)

- **Riser on the console** (83-1): leaning yes, unsure what it is. Explained above and proposed as a Riser row (D11), with a mockup.
- **Per-instrument caps** (83-2): rejected. No cap per instrument; a warning with the recommended values (D4). The 12-track cap stays.
- **Listener tracks stay** (83-3): yes, plus a lock per instrument, open by default (D12). Test: a track added with "+" still plays a few phrases later (D4, tasks 1.4 and 2.3).
- **Song harmony menu** (83-4): yes, default Auto (D8, phase 5).
- **Saved pattern for the session** (83-5): yes. Scope and lock combine as in D10.
- **Saved pattern sound** (83-6): yes, its own for a new track, the replaced track's for a replace (D9).
- Still in force: one + and − per instrument, every instrument separate (arp, melody, guitar, not "lead" with a selector), a saved pattern picked from the console, controls shown in several places kept in sync.

## Open Questions

- **Riser sounds.** Recommended: ship with today's noise only, length and direction; add a second sound (a snare roll that speeds up, or a synth sweep) as a follow-up issue once the owner has heard the row.
- **Riser row in styles without a riser** (8 of 20). Recommended: show it everywhere; the noise suits any style and the director still adds none there by itself.
- **Session lock before an instrument's first entry.** Recommended: as D10, the lock starts when the instrument first plays in a later song, so a locked instrument is not kept out of songs that open without it.
