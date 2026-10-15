## Context

The live build (`src/song/build.js`) plays a song from silence by applying timed steps (`add`, `remove`, `set`, `pattern`, `rack`, `unrack`) to the song model. `stateAt(song, bar)` gives the song at any bar, the compiler turns it into code, and `typingFrames(from, to)` animates the edit in the code panel during the bar before each step. Songs without steps get a derived build (`deriveBuild`): a track comes in where its clips start and leaves where they stop, so the steps are whole tracks, one phrase or so apart.

Live coding videos build in a different build style: one or a few lines every few bars, from one sound to a rich song with only 4 to 7 tracks. The owner's notes (local) and the analysis of two such videos are the reference: steps every 4 to 6 bars at 140 BPM, a track born minimal and grown by chaining functions, patterns that get longer, effects one at a time, breaks made by muting a track and bringing it back, a short spoken comment on almost every step.

Patterns in our songs are of two kinds: drums have step rows (`"bd": "x...x...x...x..."`), melodic tracks name a preset (`{ "preset": "rolling" }`). Settings and rack devices compile to chained functions.

## Goals / Non-Goals

**Goals:**
- A Crescendo build style of the live build in Compose, built on the existing step actions, so nothing downstream changes.
- One path generator, from a start state to a destination, usable by the radio in phase 2.
- Deterministic builds (song and seed), varied length and endings, a fully narrated option.

**Non-Goals:**
- Crescendo in the radio, and its interplay with curves and steering (phase 2).
- A learned or language model as director.
- New Strudel functions or samples (for example other live coders' custom helpers).
- Building inside module tracks.
- Showing muted tracks in the code with a leading `_` (possible later; today a muted track leaves the code).

## Decisions

### D1. Crescendo writes ordinary steps and generated patterns

Crescendo returns a song: the written song plus generated pattern variants and a `build` list. Everything downstream (player, seek, typing, voice, export, fast video, hand takeover) already handles such a song.

Alternative rejected: editing code text directly. It would bypass the song model, break seeking and export, and need a parser for our compiled code.

### D2. Path = destination minus a reversed teardown

`crescendoPath(from, to, rng, opts)` works backwards. Starting from the destination, it removes one small thing at a time (lower a pattern variant, move a setting toward neutral, take off a rack device, mute a track) until it reaches the start state. Reversing that list gives the growth. Each removal is checked: the state must compile. In Compose `from` is silence (every track muted) and `to` is the written song at its first full section.

Order of the teardown follows how live coders build:
- **First to go:** colour (rack devices, sends, filter motion).
- **Then:** pattern fullness.
- **Then:** the later-entering tracks.
- **Last to go:** the anchor track (drums if any, otherwise the lowest track) at its simplest.

So the build starts from one sound. A small random factor (seeded) varies the order between songs.

Why backwards: every intermediate state is a simplification of a song that sounds good, so the growth is always musical, and the end is exactly the written song.

### D3. Growing patterns

- **Drum rows:** variants are made by removing hits in a fixed order of weakness. Off-16ths go first, then off-8ths, then off-beats, then beats 2 to 4; the first beat stays last. Hits are thinned row by row, so the hats thin out before the kick. Variants are stored as `<name>~1`, `<name>~2`… in the track's `patterns`, and `pattern` steps switch to them.
- **Preset patterns:** a `degrade` rack device with amounts like 0.6, 0.35, 0.15, then removed. Presets have no rows to thin, and `degrade` is an existing device.
- **Variant count:** a pattern gets 2 to 4 variants depending on its density.
- **Pattern level:** the `pattern` action gains `{ "track", "level": k }`: every clip plays the variant `k` of its own pattern (`0` the written one). A track whose clips use different patterns in different sections can then grow and end on its written patterns, which a single `to` cannot do.

### D4. Settings move toward their written value

- **Neutral values:**
  - cutoff: halfway between 200 Hz and the written value on a log scale (a closed filter that opens; values up to 300 Hz are not grown);
  - drive, room, delay: 0;
  - gain: 80% of written.
- **Moves:** a setting can move in 1 to 3 steps, like a hand turning a knob.
- **Defaults:** settings already at their default are not touched.

### D5. Length, spacing, sections

The growth needs more bars than the song's intro gives. Crescendo builds a longer song for the growth phase: the first section is repeated as many times as needed (each repeat is a new section with the same harmony), then the song continues as written. The total stays within three times the written length.

- **Spacing:** steps are 1 to 4 bars apart, drawn per step. Spacing is denser in "fully narrated" (1 to 2 bars) and around a build-up.
- **Inside the written part:** where a written clip enters or leaves, a Crescendo step does the same. A track whose clips start later in the song enters minimal there and grows over the next steps.

### D6. Endings

One of three endings is drawn per song, seeded and weighted by the song's last section:
- **Strip back:** the teardown, played forward, over the last sections.
- **Blocks:** two or three steps that each remove several tracks.
- **Short end:** the written outro, then stop.

### D7. Breaks

When the written song has a section with fewer tracks (a break), the clips already do the muting. Crescendo adds one or two extra break moves of its own, seeded, during the growth: mute the drums for a few bars, then "bring the kick back in". Each break move stays inside one phrase.

### D8. Narration

- **Phrase list:** a list per kind of step, in English and Italian, short and imperative. Examples: "more bass", "open the filter", "add some delay", "bring the kick back in", "more hats", "strip it back". The analysis of the reference videos gives the tone. Phrases are ours, not copied lines.
- **Normal:** in Compose there is no talk amount: the key steps speak (a track entering, a break and its return, the chords coming in, the ending) and about a third of the others. The radio's talk amount takes this role in phase 2.
- **Fully narrated:** the amount is forced high for Crescendo builds, and every step gets a phrase. Phrases are picked so the same one does not repeat within 8 steps.
- **Spoken samples:** phrases need recordings, as today. New phrases go through `npm run voices`, and missing samples stay silent, as today.

### D9. Where it lives and what the UI shows

- **Path generator:** `src/song/crescendo.js`, pure, checked in Node like `build.js`.
- **Compose:** the "Live build" switch becomes a small control: off, in blocks, crescendo.
- **Fully narrated:** a toggle shown when crescendo is chosen.
- **Settings keys:** `coding-misk-live` keeps its meaning. New key `coding-misk-live-style` (`blocks`, `crescendo`), and `coding-misk-live-narrated`.
- **Seed:** derived from the song id, so a song always builds the same way. A "new build" action may reseed later; not in this change.

### D10. Radio (phase 2, for reference only)

The same `crescendoPath(from, to)` will run from the current state of the song on air to the destination after a steering rewrite. Curves and steering stay active: they change the destination, and the path is recomputed from where the code is.

## Risks / Trade-offs

- **[Compiled code is long; a setting appears on every clip line of a track]** → A step can touch a few lines of the same track. Acceptable for this phase. Check that the typing animation stays readable. A later change could compile a track once with section masks, giving shorter code.
- **[A thinned pattern or a neutral setting may sound weak or silent]** → Neutral values stay audible (cutoff halfway in log scale, not closed; a third, not closed), and the simplest drum variant keeps at least one hit per bar. Level checks measure each state.
- **[Long builds tire]** → Limit of three times the written length, denser steps when the song is short, and the "short end" ending.
- **[Many steps in export]** → Fast export renders one segment per step. Check its speed on a long Crescendo build. If needed, join steps that fall in the same render block.
- **[Determinism vs variety]** → The seed comes from the song id, so the same song always builds alike. Variety comes from different songs and, later, from reseeding.

## Resolved Questions

- Hand-written `build` steps of a song are ignored by Crescendo in phase 1 (owner, 2026-10-15).
- Muted tracks shown in the code as `_$:` come later, as their own change, because they touch the compiler (owner, 2026-10-15).
