---
id: narrator
related: [voice, live-build, radio, artists, songs, profiles]
code: [src/song/build.js, src/song/spoken.js, src/endless/phrases.js, src/song/format.js, tools/voice.mjs]
checks: [npm run check:spoken, npm run check:endless]
---

# Narrator

## What it is

The narrator is the voice that speaks the comments of a live build. A step can carry a short phrase, its `say`. The phrase shows over the stage, is written in the code as `// > …` and is spoken by a track of type `voice`.

`npm run voices` makes one sample per phrase and language with the system voices of macOS. Without a sample the phrase is only shown and written.

## How it connects

- **Live build.** Phrases come from the steps ([live-build.md](live-build.md)). The profile control `narrated` makes almost every Crescendo step speak ([profiles.md](profiles.md)).
- **Radio.** The director comments its moves with phrases from `src/endless/phrases.js`. The knob `talk` sets how often ([radio.md](radio.md)).
- **Voice instrument.** The narrator yields to spoken lines ([voice.md](voice.md)).
- **Artists and styles.** A style sets the base voice; an artist can prefer voice characters ([artists.md](artists.md)).
- **Songs.** The voice track's settings shape the sound: pitch, tempo, filters, drive, reverb, delay ([songs.md](songs.md)).

Each radio song has its own voice. The style gives a speaker list and ranges for each effect. Sometimes the song takes another speaker, a character on top, or one or two rack devices. Every value stays within `VOICE_LIMITS`, so words stay clear.

## Options

<!-- generated:narrator -->
Narrator styles: `explain`, `poetic`.

Speakers (`SPEAKERS`): `eddy`, `flo`, `grandma`, `grandpa`, `reed`, `rocko`, `sandy`, `shelley`.
<!-- /generated -->

- `explain`: the default. It says what each step does.
- `poetic`: a short image in the bar before each track comes in, nothing at the other steps. Lines come from the song's `narrator.lines`, its style's, else the vocabulary's poetic group.

Voice characters: `radio`, `robot`, `deep`, `bright`, `cathedral`, `echo`, `dirty`, `slow`. Each overrides a few settings.

The comment option `steps` shows the phrases in the code, and `voice` shows the code that makes the voice speak ([comments-and-functions.md](comments-and-functions.md)). With them off the voice still speaks.

## Example

A step with a comment in both languages, spoken by the voice track `robot`:

```json
{"at": 16, "add": "bass", "say": {"en": "need bass", "it": "serve il basso"}, "voice": "robot"}
```

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#live-build): `say` and `voice` in steps.
- [docs/ENDLESS.md](../ENDLESS.md#voice): the voice of generated songs, and [comments](../ENDLESS.md#comments).
