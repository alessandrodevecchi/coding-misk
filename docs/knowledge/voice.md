---
id: voice
related: [narrator, songs, growth-shapes, styles, live-build]
code: [src/song/spoken.js, src/song/vocabulary.js, src/endless/director.js, src/endless/voice-options.js, src/endless/voice-panel.js, src/endless/voice-track.js, tools/voice.mjs]
checks: [npm run check:spoken]
---

# Voice instrument

## What it is

The voice instrument is a track of type `spoken`: spoken lines that are part of the music. It is not the narrator. The narrator explains the steps of a build; the voice instrument plays in the song as written, in exports and in every build.

Lines are samples made on macOS by `npm run voices`. Without them the track stays silent and the song plays on.

## How it connects

- **Songs.** A spoken track's patterns are lines, and its clips place them ([songs.md](songs.md)).
- **Narrator.** The narrator yields: it stays quiet on bars where a line sounds and never announces a spoken track ([narrator.md](narrator.md)).
- **Growth shapes.** The `voice` opening starts a Live coder build with the first opening line ([growth-shapes.md](growth-shapes.md)).
- **Styles.** A recipe's `spoken` field gives the chance, the ways, lines, speakers and a vocabulary group ([styles.md](styles.md)).
- **Live build.** A spoken track is never thinned. It enters on the bar of its first line ([live-build.md](live-build.md)).
- **Grown on air (#81).** A radio song in Crescendo or Live coder grows from a bar of its written form (`growOnAir`). A spoken track whose clips all end before that bar keeps its first clip, moved to the start of the written part, so the growth still brings it in; before, it left the song. The rest of the grown song is unchanged.
- **Generated songs (voice-controls).** The director gives a song at most one spoken track (`words`). The voice instrument options (`voice` in the director options, `src/endless/voice-options.js`) set how often, the ways and how many phrases; the radio and the new song from an artist show them ([radio.md](radio.md)).
- **The song being edited (voice-placement).** The Compose Voices group and the panel of a spoken track show the same controls for that track (no How often: the track exists), with New phrases. A change rewrites the track with `rewriteSpoken` (`src/endless/voice-track.js`): lines drawn like the director's from the song's styles and written out, one clip per quiet part (an 8-bar phrase of a quiet section), never two in one part, the count a ceiling, the settings and speaker kept; the options stay on the track as `voiceOptions` (`draw` counts New phrases). A track without them shows options read from its clips. The toast offers Undo. A song with no spoken track offers Add a voice instrument.
- **The song on air (voice-placement).** In the radio a voice instrument change also queues a `voice` steering command on the song on air: from the first quiet part after the next phrase, the clips before it kept; the plan keeps it (`voiceAir`) so later commands, Replay and saved sessions rebuild the same song ([radio-commands.md](radio-commands.md)).

**Texts.** The song's own text, else the style's lines for that way, else a line from the vocabulary (`src/song/vocabulary.js`), drawn with the song's seed. At most 12 words.

**Speakers.** The track's `speaker`, else one of the style's speakers, else any speaker. Never the narrator's.

## Options

<!-- generated:spoken-ways -->
| Way | Name |
| --- | --- |
| `passage` | spoken passage (it: passaggio parlato) |
| `refrain` | refrain (it: ritornello) |
| `chop` | chop (it: taglio) |
| `opening` | opening (it: apertura) |
<!-- /generated -->

- `opening`: the line once, from the clip's first bar. With `before`, it ends one beat before a track comes in.
- `passage`: a longer text, once, at the start of the quietest section of the clip, lightly treated.
- `refrain`: the line every `every` bars, only in quiet sections, only when it ends before the section does.
- `chop`: the line cut in `slices` and played on the steps of `rhythm`, every bar of the clip.

A quiet section has at most half the tracks of the fullest one, or a name like intro, break or outro. Spoken lines play on orbits 13 and 14.

### Options for generated songs

`voice: { phrases, kind, ways, presence }` in the director options. `voiceOption` gives `null` for the default, and the session recipe carries the options only when they are not the default, so a replay sounds the same.

| Option | Values | What it does |
| --- | --- | --- |
| `phrases` | `1`, `2-3`, `4-5`, `6-8`, `many` (9 to 12) | How many phrases at most, drawn in the range |
| `kind` | `different`, `repeated`, `mixed` | A new line each time; line A every time (a refrain); A, a new line, A, another one… |
| `ways` | `null` (the style's ways and weights) or a list of `opening`, `refrain`, `chop`, `passage` | The ways a phrase may use, each as likely |
| `presence` | `never`, `style` (the style's weight), `often` (twice the weight, at most 0.9), `always` | How often a song gets one. `always` is a single song with the voice instrument on: a style without one gets every way, a vocabulary line and a speaker of the styles that have one (their vocabulary samples exist) |

Presets (`VOICE_PRESETS`): As the style (`1`, `different`, the style's ways, `style`: the default, the director's draws before voice-controls), Discreet (`1`, `different`, all four ways, `style`), Present (`2-3`, `mixed`, `often`), Obsessive (`6-8`, `repeated`, refrain and chop, `often`). A single song keeps its own on/off (`style`, `always`, `never`); the radio offers `never`, `style` and `often`. Changing a control makes it Custom (`presetOf`).

Several phrases: one pattern per line (A, B, C…) and one clip per phrase, each in a quiet part: a phrase of the plan (8 bars or so) with the role intro, break or outro, or with few tracks playing (at most half the song's usual most, at least 2). Never two phrases in one part; the parts are spread over the song; a refrain only goes to an intro, a break or an outro. A phrase that finds no part is dropped: the count is a ceiling. New lines are the style's lines for their way not used yet, else vocabulary entries written out, so two lines are never the same. The draws for the extra phrases come from their own stream (`spoken-more/<index>`): the default draws exactly as before.

## Example

A spoken track with a chopped word:

```json
{"id": "words", "type": "spoken", "settings": {"speaker": "reed", "gain": 0.55}, "patterns": {"chop": {"way": "chop", "text": {"en": "signal", "it": "segnale"}, "slices": 8, "rhythm": "0 ~ 1 ~ 2 3 ~ 3"}}, "clips": [{"start": 16, "bars": 8, "pattern": "chop"}]}
```

It plays the word in eight slices on that rhythm, every bar from bar 17 to 24. The Voices example (`songs/examples/06-voices.json`) uses all four ways.

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#voice-instrument): every field, the code, samples, speakers.
- [docs/ENDLESS.md](../ENDLESS.md#voice-instrument): the voice instrument in generated songs.
- [docs/VOCALS.md](../VOCALS.md): research on sung vocals, for later.
- The Guide cards `voice-instrument` and `voices` (the three voices side by side) in `src/guide.js`.
