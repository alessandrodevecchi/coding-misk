## Why

In the Crescendo build a track enters with its whole chain already written (notes, filter with movement, resonance, envelope, gain, effects) and steps come every 1 to 4 bars, typed in one go. Nobody writes such a line in a moment: it shows a machine that knows where it is going. In the reference videos a track is born in one or two lines with one note, functions arrive one at a time at the end of the chain, a new track is often a copy of another with one number changed, one musical step takes about 20 seconds of typing, trying and correcting, and then the coder listens for several seconds (#64; analysis in the local notes). These growth rules make the Switch profile.

## What Changes

- **Minimal entries.** A track enters with its sound and its simplest notes: one held note, or a few hits; nothing else in the chain.
- **Functions one at a time.** A function appears in the code only when a step brings it in (filter, resonance, envelope, gain, delay, room, rack devices); before that it is absent, Strudel's default.
- **Notes grow inside the quotes.** The pattern grows from one note to the written line in short forms (`"0"` → `"0 ~ 0 3"` → the written line), with the short pattern generator.
- **Clones.** A new track may be born as a copy of a playing track's block (pasted at once), then changed in one or two places (sound, octave, notes).
- **Sparse steps and listening pauses.** Steps 4 to 8 bars apart at the start, closer later; after a big moment (a track coming in, a drop, the progression arriving) a pause of 4 to 8 bars without changes.
- **Trials.** Some steps are typed as a person tries values: a number typed, evaluated, then corrected once or twice before the final value (for example a filter opening by ear). The sound of each trial is a real intermediate value.
- **Same destination.** After the growth the song plays as written; the checks of Crescendo still apply.

## Capabilities

### New Capabilities

- `live-build/natural-growth`: the growth rules of the Switch profile: minimal entries, functions one at a time, notes growing inside the quotes, clones, sparse steps, listening pauses and trials.

### Modified Capabilities

None in their requirements: Crescendo keeps its rules; natural growth is chosen by the profile.

## Impact

- **Code:** the Crescendo path generator gains rule parameters (entry, reveal, clone, spacing, pauses, trials); the compiler gains an "absent until revealed" set per track; the typing schedule gains trial edits.
- **Checks:** the Crescendo checks with the natural rules (every state compiles, the growth ends on the written song, one track per step), plus: entries are short, functions appear one per step, pauses after big moments, Strudel events after the growth equal the written song.
- **Out of scope:** the radio (`crescendo-radio`); the arpeggio written with scale degrees (short patterns generator, next change).
