---
id: voice
related: [narrator, songs, growth-shapes, styles, live-build]
code: [src/song/spoken.js, src/song/vocabulary.js, tools/voice.mjs]
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
