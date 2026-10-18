# Variety: songs that do not sound alike

This plan ties together ten OpenSpec changes that give the app's music more variety: how parts are written, how new material is composed, how a live build opens and grows, and how the radio steers it. Existing songs and the Classic and Crescendo profiles keep their sound and behaviour.

## What we found

Measurements over every built-in song, four test songs and the owner's listening (October 2026):

- **Openings are almost all the same.** 66 of 68 live builds open with the drums, almost always with a single kick on the first beat. Thinning a written part keeps only its strongest hit, so a breakbeat and a drum and bass groove open like a straight kick.
- **The Switch profile is slow at the start.** In the songs written for it the kick stays at one or two hits a bar for minutes; the first minute holds 2 to 5 audible changes, against 7 to 8 in the reference videos.
- **New songs reuse the same material.** The director picks from 22 fixed melodies, 13 bass rhythms, 6 arpeggios and 20 grooves, with light mutation. The same melody shows up in several songs.
- **Code is longer than a live coder's.** Rhythms and notes are stored written out in full, so a bassline becomes `.struct("[~ x x x] [~ x x x] [~ x x x] [~ x x x]")`.
- **Many Strudel functions are never written:** `chord().voicing()`, `beat`, `sometimes`, `rib`, `seg`, `duck`, the eight-operator FM, and more.

References studied (notes kept locally): two public Strudel courses and tutorials, a repository of community helper functions, and nine videos and streams of live coders.

## One root

Our material is written out in full, not as ideas. Live coders write small ideas that generate a lot:

| Idea | Example |
| --- | --- |
| A repeated cell | `[~ x x x]*4` |
| Scale degrees | `n("0 2 4").scale("a:minor")` |
| A chord name with voicing | `chord("<Am7 Fmaj7>").voicing()` |
| Sequencer steps | `beat("0,4,11",16)` |
| Seeded randomness | `n(irand(8).seg(16).rib(3,2))` |
| A prepared variant | `// .add("0 0 4 0 5")`, uncommented later |

When parts are ideas, the code is short, a live build grows an idea instead of thinning a result, a melody can be varied instead of replaced, and new material can be composed from a seed.

Randomness is always seeded: the same song gives the same sound, in the app, in exports and in checks. Live coders use it on chord indices, sample slices, glitches and filters, and write free melodies by hand; the generator follows the same rule.

## The changes

| # | Change | What it does | Issue |
| --- | --- | --- | --- |
| 1 | `song-trash` | Delete from the Songs tab, a 30-day trash bin, playlists cleaned, a filterable test tag | #68 |
| 2 | `typing-mistakes` | Human typing mistakes that can be seen | #64 |
| 3 | `clear-names` | The Switch profile becomes Live coder; the four `switch-*` styles get genre names | #64 |
| 4 | `strudel-catalog` | Catalog of every Strudel function we ship, coverage table, check on generated code | #69 |
| 5 | `idea-model` | Parts stored as ideas; same sound, shorter code | #70 |
| 5b | `song-functions` | Repeated effect chains as named song and library functions; our helpers never take a Strudel name | #73 |
| 6 | `material-generator` | Melodies, basslines, arpeggios, chords, grooves and sounds composed from seed and style | #71 |
| 7 | `pattern-library` | Patterns tab in the Groove Lab; Save as pattern in Compose | #72 |
| 8 | `growth-shapes` | Openings, pace and development of a live build, chosen by song, style or seed | #64 |
| 9 | `voice-instrument` | Spoken lines as part of a song | #39 |
| 10 | `radio-variation` | Vary a part on air; Add and More complex compose; curves steer the generator | #24 |

### How they connect

- **Catalog, then moves.** The catalog (4) lists what Strudel can do; each useful function becomes a way to write an idea (5), a choice of the generator (6) or a move of the live coder (8).
- **Ideas first.** The idea model (5) comes before the generator (6) and the growth shapes (8): both work on ideas.
- **Presets stay.** Presets become ideas too. The generator can pick one, compose a new part, or start from a preset and vary it. The Patterns tab (7) plays both, saves the user's own and collects votes that later steer the generator.
- **Growth shapes.** A shape is an opening, a pace and a development:
  - **Openings:** today's single kick, a full kick, silence while the first line is typed, a broken beat, a filtered kick that opens, an arpeggio or synth first, a pad or drone, a spoken voice, an already written base with muted tracks.
  - **Pace:** slow (today's Switch), medium, fast.
  - **Development:** by instrument type (today), as written in the song, by masks, by parameters only, a metamorphosis of a full song, a second section built in solo.

  The song decides first, then its style, then the seed. Classic and Crescendo do not use shapes.
- **Second thoughts stay musical.** A live coder may bring in a melody that later leaves because it was only meant for that moment, or a first version that gets refined. Never something off key or foreign to the song.
- **Voice.** The narrator (spoken step comments) and the voice instrument (9) are different: the narrator explains steps; the voice instrument is part of the music and can open a song. Sung vocals stay in #3.
- **Radio.** The radio uses the same director, so (6) changes its songs. (10) adds Vary and lets the curves steer how parts are composed. The director version goes up, since saved sessions will sound different.

## Order and listening tests

| Step | Changes | Owner's test |
| --- | --- | --- |
| 1 | `song-trash`, `typing-mistakes`, `clear-names` | Delete and restore test songs; see a typo fixed; check the new names |
| 2 | `strudel-catalog` | None: automatic checks |
| 3 | `idea-model` | 3-4 known songs sound the same, with shorter code |
| 3b | `song-functions` | The Ideas example and 2-3 songs in Live coder: shorter code, same sound |
| 4 | `material-generator`, `pattern-library` | A listening session in the Patterns tab with votes; 4-5 new songs |
| 5 | `growth-shapes` | One exported song per opening, first two minutes |
| 6 | `voice-instrument` | 2-3 songs with a voice |
| 7 | `radio-variation` | A radio session steered by the owner |

Each change stops at a simple first version. Favourites, more openings, complex FM patches and new styles come after the listening tests.
