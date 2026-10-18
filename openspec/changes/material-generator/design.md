## Context

See proposal.md for the motivation. Today `candidateTracks` in `src/endless/director.js` picks presets from the recipe and varies them with `src/endless/mutate.js` (drum ghost hits, chord tone swaps, neighbour degrees). All randomness goes through `src/endless/random.js` (named streams from one seed). `idea-model` gives every part an idea (cells, degrees, chord names with indices, sequencer steps, seeded random sources, shared progressions, prepared variants) and an `expandIdea` that Crescendo and the energy measure read.

The rules below come from local study notes on public Strudel courses and on videos and streams of reference live coders. Code from a reference repository without a licence is not copied: only the musical ideas, written from scratch with our own names. Where a passage of the public Strudel course under CC BY 4.0 is reused, it is credited in `docs/ENDLESS.md` with its title, author, a link to the licence and a note that it was adapted.

## Goals / Non-Goals

**Goals:**

- Pure functions, the same in Node and in the browser, seeded, with no `Math.random`.
- Material that sounds composed: few notes, repetition with small changes, always in key.
- A first set of rules per kind that the owner can judge in one listening session, then tune.

**Non-Goals:**

- No sung or spoken material (`voice-instrument`).
- No openings or growth order (`growth-shapes`); the generator only gives each idea its ladder through `idea-model`.
- No steering of the generator by the radio curves (`radio-variation`); this change takes one energy value.
- No votes yet: `pattern-library` keeps the place for them (D9).
- No FM with more than two operators, feedback or a routing matrix in the first version.

## Decisions

### D1. Module and interface

`src/material/` with one file per kind (`melody.js`, `bass.js`, `arp.js`, `chords.js`, `drums.js`, `sound.js`) and `index.js`:

```js
compose(kind, { seed, style, harmony, meter, energy, from })  // → { idea, settings, why }
```

- `seed`: a string. Streams are named `material:<kind>:<seed>`, so a melody never changes the drums of the same seed.
- `style`: the recipe instrument part with its `material` field (D7).
- `harmony`: `{ key, mode, chords, shared }` of the section the part plays in first.
- `energy`: 0 to 1 (D6).
- `from`: optional preset name to vary (D8).
- `why`: a short list of the rules used (`["polymeter 5/16", "tail A'"]`), for the session report, the Patterns tab and checks.

### D2. Melodies

A melody is `degrees` (a cell) plus `add` (a progression over the bars), in the song's mode:

1. Pick a cell length: 4 or 8 (straight), or 5 or 7 (polymetric over 16 steps). Polymetric chance grows with energy and with the style's `rules`.
2. Fill the cell by steps and small leaps (up to a fifth), with rests; start and end on a stable degree (0, 2 or 4) at least half of the time. Dark styles favour the second and sixth degrees of their mode.
3. Pick one shape: repeated motif with a changed tail (A A A A': the fourth bar changes its last one or two notes), call and response (cell A, then cell B ending on degree 0), or a long polymetric line.
4. Add a progression of 3 to 5 values with repeats (`<0!3 -2>`, `<0 0 4 3>`), each a chord root of the section in degrees.
5. Optionally prepare one variant (`add` of a second short cell, as `// .add("0 0 4 0 5")`), used later by growth shapes and the radio.

No random source in melody notes. The seed chooses among these rules, never note by note in a free range.

### D3. Basslines

- **From the chords:** the section's chord line moved down (`sub` of 7 or 14 degrees, or the roots of the note stacks for presets), with a rhythm cell or sequencer steps from the style's family (rolling `[~ x x x]`, offbeat `[~ x]`, gallop, half notes).
- **From a shared progression:** when the song declares one (the melody step can create it), the bass reads it with its own `sub`, so bass and lead change together.
- **Octaves as rhythm:** one root with an octave pattern added (`"<0 12 0 0>*4"`), for rolling and acid styles.

### D4. Arpeggios and chords

- An arpeggio is `index` into the voiced chords of the section: a written cell (up, up and down, pedal, skips) of 3 to 8 indices, or a seeded random source `irand(n).seg(16).rib(seed, cycles)` with `n` the number of voiced notes. Random indices are allowed because every index is a chord tone.
- A progression is either a recipe progression (`PROGS`) or a new one built on the degrees of the mode: 1 to 4 different chords per phrase, ending on a chord that leads back to the first, with the qualities the style allows (`m`, `m7`, `^7`, `sus2`, power). New progressions compile to chord names with `voicing()` (with an anchor near the pad register); `idea-model` keeps note stacks only for the old presets.

### D5. Drum grooves

A groove is sequencer steps per row from a family:

| Family | Fixed | Varied by seed and energy |
| --- | --- | --- |
| four on the floor | kick 0,4,8,12 | hats offbeat or 16ths, clap 4,12, ghost kicks |
| breakbeat | snare 4,12, kick on 0 | kick positions 6, 10, 11; hats; a late snare 15 |
| two-step | clap 4,12 | kick 0 plus one or two of 7, 10, 11; hats with skips |
| half-time | snare 8 | kick 0 plus 10 or 11; sparse hats |
| euclid | none | kick and rim as euclidean (3,8), (5,16), rotated |

Energy sets how many hats and ghost hits; the style names the families it allows. Kits stay from the recipe.

### D6. Energy

One mapping for every kind, inside the limits of the style:

| Energy | Onsets per bar (melodic) | Range |
| --- | --- | --- |
| 0 to 0.33 | 2 to 4 | within a fifth |
| 0.33 to 0.66 | 4 to 8 | within an octave |
| 0.66 to 1 | 6 to 16 | up to an octave and a fifth |

The director passes the target energy of the phrase where the part first plays; pattern B gets the next higher or lower target. `radio-variation` later passes curve values in the same place.

### D7. Recipe field `material`

```json
"hook": { "presets": ["neon", "pioggia"], "material": { "source": "mix", "share": 0.6, "rules": ["polymeter", "tail", "call-response"] } },
"drums": { "grooves": ["techno"], "material": { "source": "mix", "share": 0.5, "families": ["four-floor", "two-step"] } },
"bass": { "material": { "source": "generated", "sounds": ["fm-bass", "saw"] } }
```

`source`: `preset` (default), `generated`, `mix`. Every built-in recipe gets a `material` entry in this change, chosen by listening, so the variety reaches the radio. At complexity 0 the director still uses presets only, as the existing scenario says.

### D8. Varying a preset

`from: "rolling"` reads the preset's idea through `idea-model` and keeps either its rhythm (new pitches from D2 to D4) or its pitches (new rhythm from the family cells). This is how a recipe "starts from a preset and varies it" and how Compose varies a selected pattern.

### D9. Sounds and safe ranges

`sound.js` composes the settings of a melodic track: wave, filter, envelope, drive, and an optional FM patch. Patch kinds: `bell` (sine, non-integer harmonicity, short FM decay), `reese` (saw, harmonicity near 1), `growl` (two operators), `dirty` (noise modulator, low index), `saw`, `square`.

| Control | Range in the first version |
| --- | --- |
| `fm` (index) | 0 to 4, lowered by one per octave above octave 4 |
| `fmh` | from a list: 0.5, 1, 1.01, 2, 2.01, 3, 3.5, 4 |
| `fmwave` | sine, triangle, square, sawtooth; pink and brown only with index under 0.5 |
| `fm2` | 0.5 to 3; `fmh2` 1 to 10 |
| `fm3` to `fm8`, matrix (`fm13`, `fm22`) | not used |
| `fmdecay`, `fmsustain` | 0.05 to 1, 0 to 1 |

Each patch is checked below clipping in the browser on a test phrase at the track's default gain. Votes from the Patterns tab will later weigh patch kinds and rules (stored per rule and kind, so they can steer `compose` without changing its interface).

### D10. Director and version

`candidateTracks` asks each recipe instrument for its source. For `generated` or `mix` it calls `compose` with a seed made of the session seed, the song index and the track id, on the `material` stream, so other streams (titles, comments, voice) keep their draws. Songs reference generated ideas inline in their patterns. `DIRECTOR_VERSION` goes to 3 with the fixture rewrite.

### D11. Compose a part

The pattern panel gets [Compose a part] with a number field and an energy knob (default 0.5). The seed is `<song id>:<track id>:<number>`. The style is the first style tag of the song, else `stylesNear(song)` (already used by Continue in radio). The new pattern takes the next free letter. With a preset selected, two more actions: [Keep rhythm] and [Keep notes] (D8).

## Risks / Trade-offs

- [Generated melodies sound aimless] → cells are short and repeated, tails change little, progressions are borrowed from the style; the owner's listening session decides which rules stay.
- [Polymetric cells drift against the section lanes] → the cell restarts at each clip start (`late`), as chords do today.
- [FM patches clip or burn CPU on 16ths] → range table, index lowered with pitch, two operators at most, browser level check; patches measured with `tools/check-levels.cjs`.
- [`voicing()` lands in a register that masks the bass] → an anchor per track type (pad near c4, arp near c5), checked by ear in the test.
- [Radio sessions saved in playlists change] → `DIRECTOR_VERSION` 3 makes them warn; Freeze keeps them as they were.
- [Recipe defaults change existing styles] → each recipe's `material` is set by listening and noted in DEVLOG; missing field means presets only.

## Migration Plan

Add the module, then the recipe field with `preset` everywhere (fixtures unchanged), then switch recipes one family at a time and rewrite fixtures once with the version bump. Rollback: set the recipes back to `preset`.

## Material source (owner, 2026-10-18)

A session (radio, compilation, generated songs) can force the source of all material: `patterns` (library as written, no mutation), `varied` (library with variations, from today's light mutation to new rhythm or pitches), `composed` (generator only), `mix` (default: each recipe's `material` field). The value is stored with the session recipe and seeds, so replays match. Today's director is the light end of `varied`. "patterns" only makes sense once the library holds many patterns per kind; with today's 22 melodies it repeats. The user's saved patterns join the pool only where they fit (kind, style tag or "any style", key transposable). The control lives in the radio's compilation setup and in Settings → Radio (change `radio-variation`), not in the live console.

## Open Questions

- **Share of generated material in the built-in recipes.** Recommended: `mix` with share 0.5 for lead, arp and bass; drums `mix` 0.3 so the style keeps its signature groove; pads `preset` until chord voicings are judged. Adjust after the listening test.
- **Energy for pattern B.** Recommended: target of the next big moment (drop, chorus) for B, and the quietest phrase for C. Can be tuned without changing the specs.
- **Number shown in Compose.** Recommended: a small number field starting at 1. A word seed (like the radio) is friendlier but longer to type.
- **Credit line for the course.** Recommended: one line in `docs/ENDLESS.md` under Material, only if a passage or a full recipe from the course is reused; general techniques need no credit.

### Note: song functions

After `song-functions`, the effect chains of generated sounds go through the same folding as any song: a generated sound needs no function of its own. The generator never writes app helper names; `chan` and `grit` come from the writer.
