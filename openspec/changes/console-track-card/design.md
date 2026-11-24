# Design

## Context

- The Mixer (`renderSteer`, `src/radio/radio.js`) lists the tracks playing now and the locked silent ones: a volume slider, M, the lock and ♪ (`instrument` on that track). The ♪ and «Instrument» of the Sound group draw another wave, kit, guitar type or texture sample from the style (`otherSound`, `src/endless/steering.js`), applied by the director as a forced move on the next phrase.
- Compose has the sound dice (`random-sound-params` D5, D10): `rollSound` draws a whole sound for one track within its style (wave or composed sound with its FM device, filter, effects, drum tones, variation), with lock groups and a seeded number; the sounds rolled stay as chips.
- «+», «−», saved patterns added as new tracks and locks wait in batches (`console-add-ahead`, `console-add-waves`): prepared away from the page, with their sounds loaded, entering together at a phrase start, shown in the Queue and on badges.
- A saved pattern replaces a playing track's pattern with the `pattern` command, mode `replace` (`radio-arrangement` D9): a `P<k>` pattern and a pattern step from the boundary, kept as the listener's (`vary`).
- The saved-patterns preview (`player.preview.toggle`) plays one pattern alone in the song's key and tempo, in the headphones of the listener, without touching the song on air.

## Goals / Non-Goals

Goals: everything the owner approved in version A, with the radio's existing paths (batches, steering, preview, library); replays give the same song.

Non-goals: the live knobs (sound-modulation 6.6, later); Path on air (D4); new sounds outside the song's style; editing single settings by hand in the radio.

## Decisions

### D1. The card

- The name of each Mixer row is a button (`data-card`, `aria-expanded`). Pressing it opens the card of that track under its row and closes any other; pressing it again, or Escape inside the card, closes it. The card stays open across console rebuilds while the track is in the Mixer, and closes when the song changes or the track leaves the Mixer.
- A track locked in the Mixer or by its instrument's lock: the name button is disabled; its tooltip says the track is locked and the lock keeps it as it is. An open card closes when its track gets locked.
- Rows: Sound, Pattern, Movement (D6), each with a small label, the actions on one wrapping line, and a short help line. At 400 px the rows wrap; nothing scrolls sideways.
- Voice and riser tracks have no card (their names stay plain text); a texture track has the Sound row only (its sample is its sound, and the radio has no saved texture patterns).

### D2. The `sound` command

`{ kind: 'sound', track, n, set, rack }`: `set` holds the track's sound settings (the dice keys allowed for the track's type in a `set` step: wave, type, kit, tone, cutoff, reso, drive, delay, room, vary, sample), `rack` the whole rack the track plays with it. `n` is the chip's number (0 for the original sound). Group `sound`, applied on a phrase (`applyBar`).

The page rolls (D3) and sends the result, so a replay never rolls again: the session's steering list holds the values.

In the steering (`rewrite`), like Vary and a replace: no director run. At the command's bar it writes, by the listener, one `set` step with the values that differ from the track's state at that bar, one `rack` step per device that is new or changed, one `unrack` per device kind the track loses (a key the new sound does not hold, such as `vary` or `tone`, is set to `null`, which the compiler reads as absent). The steps go to `plan.varied`, so a later command's rewrite keeps them (the director then writes its own moves around them, as after Vary). `whyNot`: `late`, and `not-playing` when the track is not in the song.

On a grown song (Live coder, Crescendo) the steering on air types the change as for any other: new devices and values as edits over the next bars; a drum tone and a variation stay part of the line from its start (random-sound-params D1), so on a grown song a new kit is heard at once and its tone from the track's next new line. The queue row says the sound's number.

The press goes into the batch of its boundary (`b.cards`), as a saved pattern added as a new track: prepared ahead with the batch (the new sound's samples loaded by `warmTracks`, which loads every track whose settings changed), entering with the «+» of that wave, moved to the next phrase start with them. Its Queue row reads "Bass · sound #4 · in 6 s" with ✕ (taken back until a third of a bar before the boundary, as the «+»). A second press on the same track for the same batch replaces the first in the batch (one sound per track per wave).

### D3. The roll

- `rollSound` with the recipe of the song on air (`plan.R`: a mix of styles reads its merged recipe), the track's sound at the boundary (its state at that bar on the director's song), seed base `<session seed>:<song number>:<track id>:sound`, the chip number `n` (one above the highest of the track's history), the energy target of the boundary's part, and the card's locks.
- Locks: the Compose lock groups of the track's type (sound, filter, effects, variation; drums kit, kick, snare, hats, variation) plus «Movement» (D4), remembered per type in this browser (`coding-misk-radio-card-locks`), not per song.
- The FM device the dice adds (composed sounds) is owned by the roll, as in Compose: a later roll takes it out before drawing; a device the track had from the director is never removed by the roll, except the FM device a composed sound replaces (as Compose does when it owns it). In the radio the owned FM device and movement device are read from the history entry on air.
- The style decides the sounds; a sound from the style the browser cannot play plays its stand-in through the sound guard (#54), as any other.

### D4. Movement in the roll

`rollMove({ track, seedBase, n, rack, owned })` in `src/material/dice.js`, its own stream `sound/move`:
- melodic types only (bass, arp, hook, pad, guitar); none for drums and texture;
- half the rolls bring a device, half none (so a roll can also take the movement away); the device is Sweep, LFO, Pump or Gate, with values inside each argument's range and musical defaults (Sweep on the filter or high-pass in loop over 4, 8 or 16 bars; LFO on filter, pan, room or delay, rates 1/4 to 4 bars, depth 0.2 to 0.6; Pump depth 0.4 to 0.8; Gate from its presets, depth 0.5 to 0.9);
- the roll owns at most one movement device; it never goes past two movement devices on the track (MOVE_MAX), and a candidate the rack validator (`checkRack`, its movement rules: Gate with Pump, Sweep over track automation, one per kind) rejects with an error is drawn again (up to 8 tries, else none).
- **Path is not rolled in the radio.** A Path's points are bars from the start of the song and its bus is given once per song from the tracks' racks; on air, grown songs move bars (the steering works in the director's bars, the growth retimes them) and a Path arriving at a phrase start would be drawn over bars the song has already played. The owner's step 4 (Decode measuring paths) and step 5 (knobs) come first; Path in the roll can follow when a path can start at its entry bar.

### D5. History and Undo

Per song on air and track, in the page while the session plays (not saved): entry 0 is the sound the track had before the first roll, then one entry per roll, each `{ n, set, rack, owned, cmd }`. Chips: «Original», #1, #2…; lit: the entry on air; dashed with "coming": the entry waiting in a batch. A chip sends a `sound` command with that entry's values (n = its number). «Undo»: a waiting entry leaves its batch; else a `sound` command with the entry before the one on air. Twelve entries at most (Compose's cap), the original always kept.

### D6. Movement row

Reserved for sound-modulation 6.6 (the knobs of the track's movement devices, acting while the song plays, never recorded). Until then the card shows no Movement row. The sound-modulation design, task 6.6 and the `app/device-knobs` spec now place the radio knobs here, not in the Parts row.

### D7. Pattern row

- «New pattern» (number n, one above the last for this track): melodic tracks `airIdea` with `airInputs` at the boundary (the next phrase's key, chords, energy, density, the session complexity), seed `<session seed>:<song number>:<track id>:pattern:<n>`, avoiding the track's ideas; kick and beat tracks `airGroove` for their part, else a groove of the style the track does not play. The candidate shows as a small drawing (the saved patterns' preview drawing) with its number.
- «Listen»: `player.preview.toggle` with the candidate, as a saved pattern's headphones (alone, in the song's key, chords and tempo, never on air); a second press stops it.
- «Use»: a `pattern` command, mode `replace`, target the track, the candidate as its item; it waits in the batch of its boundary with the «+» (D2), Queue row "Bass · new pattern #2 · in 6 s".
- «Save»: the candidate into the pattern library (`savedFromGenerated`, name "<track> · <song title> #n", the style's tags, the boundary's key, chords, meter and tempo); a toast confirms. It then shows among the saved patterns.
- «From the library ▾»: a menu of the saved patterns whose instrument (`patternPart`) is the track's and that fit the song (`fitsAir`), most used first, then a «Replace» key: a `pattern` replace on that track in the batch, one use counted. Empty: the menu says there is none for this instrument.
- Texture tracks: no Pattern row.

### D8. The console's order

- Sound group: Darker, Brighter, Dirtier, Cleaner, More space. The `instrument` command stays in the steering (sessions recorded with it replay the same) and in the assistant's registry.
- Mixer rows lose ♪. The I key: in an open card, «New sound»; with no card open, the card of the track «Instrument» changed (the lead first: hook, arp, guitar, pad, bass among the tracks playing).
- The saved patterns panel goes after the Mixer, hidden by default (a browser that chose shown keeps it); P still shows it and focuses the search. Adding as a new track keeps its batch, badge and Queue row.

### D9. Checks

- `npm run check:track-card` (no browser): the roll (same number same sound, locks keep their groups, movement within the limits and validator over 300 seeds, no Path, the lock keeps movement out), the `sound` command on Classic songs (steps at the boundary, the track's state after, kept by a later energy command, a replay equal, cancel gives the song back), `whyNot`, new pattern per type (same number same pattern, fits the boundary's harmony), «Use» and library replace through `pattern` replace (the track plays the candidate from the boundary), the library filter (same instrument, kick against beat).
- `tools/check-track-card.cjs` (browser): radio on air, a card opened and closed, one at a time, locked name disabled, a new sound waiting with its badge and Queue row, entering at the phrase start and lit, Original chip back, Undo, new pattern listen, use, save, a library replace, the saved panel below the Mixer and hidden, I and P keys, Italian and English, 400 px without horizontal scroll, no `evalError`.
- The existing chain (`check:steer-memo`, `check:endless`, `check:added-play`, `check:guide`, `check:agent-api`, …) passes unchanged.

## Risks / Trade-offs

- A sound entering with a batch makes the batch heavier (one more track's samples to load); the batch's rules (move to the next phrase when not ready) cover it.
- The director's later moves on the same track (darker, brighter) may change a value the roll set; that is the radio's usual life, as after Vary.
- A grown song hears the drum tone of a new sound later (D2); said in the guide.
