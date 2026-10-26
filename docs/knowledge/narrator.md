---
id: narrator
related: [voice, live-build, radio, artists, songs, profiles]
code: [src/song/build.js, src/song/spoken.js, src/endless/phrases.js, src/song/format.js, tools/voice.mjs]
checks: [npm run check:spoken, npm run check:endless, npm run check:profiles]
---

# Narrator

## What it is

The narrator is the voice that speaks the comments of a live build. A step can carry a short phrase, its `say`. The phrase shows over the stage, is written in the code as `// > …` and is spoken by a track of type `voice`.

`npm run voices` makes one sample per phrase and language with the system voices of macOS. Without a sample the phrase is only shown and written.

## How it connects

- **Live build.** Phrases come from the steps ([live-build.md](live-build.md)). Several steps can share a bar (the director puts a boundary's phrase on its first move); the narrator says the latest phrase of the bar, not only the phrase of the bar's last step (`sayStep`, #81). One phrase per bar is spoken. The profile control `narrated` ("Narrated growth", formerly Fully narrated) makes the Crescendo steps denser, each one spoken ([profiles.md](profiles.md)).
- **Narrator switch.** The profile control `narrator` ("Narrator voice", on by default in every profile; profile-options) silences the narrator in Compose and in the radio: `liveCode` leaves out the narrator's voice lines, shown and hidden (`voiceCode` is not called). The music, the steps and the length stay the same; the phrases written as `// > …` follow the comment option `steps`; the voice instrument is a track of the song and still speaks. "Narrated growth" and "Narrator style" are disabled with a hint while the narrator is off (its value is kept, so the growth does not change). A configuration or a trial saved without the control plays with the narrator on. In the radio it is a Custom control that applies from the next song; a song not on air (hidden or shown in Classic) keeps its own switch.
- **Voices group (voice-controls, voice-placement).** Compose has one Voices group in the live build panel, shown with the Live build on or off: Narrator voice, Narrator style and Narrated growth, then the voice instrument of the open song and "In the next song" ([voice.md](voice.md)). A narrator control that cannot apply is disabled and its tooltip says why: the Live build is off, Narrated growth outside Crescendo, the narrator is off. The radio has one Voices group too: the Narrator knob, the narrator controls (the Custom profile's, disabled with the reason under another profile) and the voice instrument block. The narrator of the song on air never changes: its comments are steps the director already wrote.
- **Narrator style control.** The profile control `narratorStyle`: `auto` (default, the song's own `narrator`, else its style's), `explain` or `poetic`. Not `auto`, it overrides the song's style in `liveCode` (`withNarratorStyle` in `src/song/spoken.js`; a song's own short images stay with it). It changes the sound, never the growth: in the radio it applies from the next song; a song not on air keeps its own (`air-code.js`).
- **Radio.** The director comments its moves with phrases from `src/endless/phrases.js`. The knob `talk`, named Narrator (it was Voice until voice-placement), sets how often: the chance that a phrase boundary gets a comment; the Narrator curve sets it per part, Talk more and Talk less move it by 0.2, the compilation has a range for it, and an artist a `talk` range. It never touches the voice instrument ([radio.md](radio.md)).
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

The song (`narrator`) or its style chooses the style; the profile control `narratorStyle` can override it for any song (`auto` keeps the song's).

Voice characters: `radio`, `robot`, `deep`, `bright`, `cathedral`, `echo`, `dirty`, `slow`. Each overrides a few settings.

The comment option `steps` shows the phrases in the code, and `voice` shows the code that makes the voice speak ([comments-and-functions.md](comments-and-functions.md)). With them off the voice still speaks. To silence the voice, switch `narrator` off.

## Example

A step with a comment in both languages, spoken by the voice track `robot`:

```json
{"at": 16, "add": "bass", "say": {"en": "need bass", "it": "serve il basso"}, "voice": "robot"}
```

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#live-build): `say` and `voice` in steps.
- [docs/ENDLESS.md](../ENDLESS.md#voice): the voice of generated songs, and [comments](../ENDLESS.md#comments).
