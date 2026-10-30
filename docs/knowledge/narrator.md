---
id: narrator
related: [voice, live-build, radio, artists, songs, profiles]
code: [src/song/build.js, src/song/spoken.js, src/endless/phrases.js, src/song/format.js, tools/voice.mjs]
checks: [npm run check:spoken, npm run check:endless, npm run check:profiles]
---

# Narrator

## What it is

The narrator, labelled "Voice: narrator" (it: "Voce: narratore"), is the voice that speaks the comments of a live build. A step can carry a short phrase, its `say`. The phrase is written in the code as `// > …` and is spoken by a track of type `voice`; what is spoken shows over the stage as a caption (spoken-text-on-stage, below).

`npm run voices` makes one sample per phrase and language with the system voices of macOS. A line without the speaker's own sample is spoken by the default voice's sample of the same line, with the speaker's sound (`lineSample`, D10); without either it is only written, and on the stage it shows only as the small step tag. `npm run check:samples` lists the lines with no sample.

## How it connects

- **Live build.** Phrases come from the steps ([live-build.md](live-build.md)). Several steps can share a bar (the director puts a boundary's phrase on its first move); the narrator says the latest phrase of the bar, not only the phrase of the bar's last step (`sayStep`, #81). One phrase per bar is spoken. The profile control `narrated` ("Narrated growth", formerly Fully narrated) makes the Crescendo steps denser, each one spoken ([profiles.md](profiles.md)).
- **Narrator switch.** The profile control `narrator` (the On switch in the title row of the Voice: narrator block, once "Narrator voice"; on by default in every profile; profile-options) silences the narrator in Compose and in the radio: `liveCode` leaves out the narrator's voice lines, shown and hidden (`voiceCode` is not called). The music, the steps and the length stay the same; the phrases written as `// > …` follow the comment option `steps`; the voice instrument is a track of the song and still speaks. "Narrated growth" and "Narrator style" are disabled with a hint while the narrator is off (its value is kept, so the growth does not change). A configuration or a trial saved without the control plays with the narrator on. In the radio the narrator switch of the Voices group (`opts.voices.narrator`, voice-full-controls D15) works with every profile and applies from the next song (`item.hush`); a Custom profile saved with the narrator off reads as the switch off. A song not on air (hidden or shown in Classic) keeps its own switch.
- **Voices group (voice-controls, voice-placement).** Compose has one Voices group in the live build panel, shown with the Live build on or off: Narrator voice, Narrator style and Narrated growth, then the voice instrument of the open song and "In the next song" ([voice.md](voice.md)). A narrator control that cannot apply is disabled and its tooltip says why: the Live build is off, Narrated growth outside Crescendo, the narrator is off. The radio has one Voices group too: the Narrator knob, the narrator controls (the Custom profile's, disabled with the reason under another profile) and the voice instrument block. The narrator of the song on air never changes: its comments are steps the director already wrote.
- **Narrator style control.** The profile control `narratorStyle`: `auto` (default, the song's own `narrator`, else its style's), `explain` or `poetic`. Not `auto`, it overrides the song's style in `liveCode` (`withNarratorStyle` in `src/song/spoken.js`; a song's own short images stay with it). It changes the sound, never the growth: in the radio it applies from the next song; a song not on air keeps its own (`air-code.js`).
- **Sound and name (voice-full-controls).** The narrator's sound is the settings of its `voice` track; the Sound part of the Voices group edits the same values as the track panel. A song with no narrator track gets one, named `Narrator`, on the first edit, with Undo; the director and the built-in songs name it Narrator too (it was Voice). In the radio, `narratorSound` (`{ style: 'auto' | <voice style> | 'custom', settings?, speaker? }`) puts a voice style or own values over the drawn voice of the next songs; `auto` changes nothing.
- **An image at every entry (after-tests-oct28 D5).** `narration()` looks at every later step, not only the next one: each state's code says the image of each entry whose image bar falls between its bar and the next step's. The image goes in the bar before the entry, or on the entry's bar when the bar before is not the song's (bar 0, or its first bar in the radio window: `windowPart` sets `start`). An entry that shares its bar with other steps (a code-of-the-moment section step, other growth steps) keeps its image; several entries on one bar get one image. The unsolo of the last line played alone counts as an entry (`enteringTrack`): its image names the first track it brings back. luci-rosse Crescendo with Narrated growth: 5 images before, 7 now (one per entry).
- **Poetic narrator with Narrated growth (D11, poetic-steps).** With both, the narrator says the images of the entries and, at every other step with a line, a short image of movement instead of the step line (`POETIC.move`, `movementLine` in `src/song/spoken.js`, chosen in `narration()` by `stepSaid`). A step on an entry's bar keeps its step line; on a shared bar the image is said. The stage always shows the step line. Consecutive steps take consecutive movement lines from a start drawn with the song's seed. Without Narrated growth the poetic style says images only, as before.
- **Narrator lines.** The Voice: narrator block lists the lines of the build that plays; a song's own written steps are editable in place, lines a build makes are read-only.
- **Radio.** The director comments its moves with phrases from `src/endless/phrases.js`. The knob `talk`, named Voice: narrator (Narrator after voice-placement, Voice before), sets how often: the chance that a phrase boundary gets a comment; the Narrator curve sets it per part, Talk more and Talk less move it by 0.2, the compilation has a range for it, and an artist a `talk` range. It never touches the voice instrument ([radio.md](radio.md)).
- **Voice instrument.** The narrator yields to spoken lines that sound ([voice.md](voice.md)): `spokenBars` leaves out muted tracks and, since after-tests-oct28 D6, lines with no sample (`lineSounds`), which compile to nothing.
- **One schedule (after-tests-oct28 D2).** `narratorLines` gives the lines a state's code speaks, after the filters (narrator track muted, a voice-track bar, no sample); `voiceCode` writes them and `spokenSchedule` lists them for the whole song with the voice track's lines, for the radio's Coming next ([radio.md](radio.md)). The code and the list cannot disagree.
- **In the Compose timeline (narrator-ghost-row, #82).** `narratorMarks(song, C, lang, files)` in `src/song/build.js` returns the narrator's lines of `spokenSchedule` (`[{ at, text, track }]`), with the narrator off counted as on; `nMarks()` in `src/main.js` keeps them per compiled build, language and samples manifest. A song that builds live (Live build on, or its own steps) with no `voice` track shows a ghost row, `Narrator` in both languages, last in the arranger: a count per written section, a tick per line in the growth and ending cells, a round mark per line on the timeline lane; dimmed when the narrator is off, absent with the Live build off, empty while the song grows, absent once built with no line. It is not a track: the song, its code and the radio do not change. Its cells and marks seek to the nearest line without selecting a track; its name opens the narrator's Sound. The first sound edit adds the Narrator track in its place (it flashes for 1.2 s); Undo brings the ghost back. A real narrator row and the read-only Narrator lines list use the same marks, so the poetic images are counted, not the step lines; a song's own written steps keep their editable list.
- **Captions (spoken-text-on-stage, #82).** `captionSchedule(song, C, lang, files, lengths)` in `src/song/build.js` turns `spokenSchedule` into captions `[{ at, until, kind, text, step, typed, speaker, seconds }]`: every narrator line and every start of a voice-track line (a chop once per clip), held for the sample's length plus 1.5 s (at least 2 s, at most 4 bars, cut by the speaker's next line; 2 bars without `say_lengths.json`), then the step lines as entries of kind `step` with `heard`. The stage, the looks and every video draw them through `captionFrame` ([visuals.md](visuals.md)). The narrator off: no narrator caption and no step tag; the voice track still shows.
- **Speakers registry (D11).** `SPEAKER_KINDS` in `src/song/speakers.js`: narrator (`N`, rank 1, one line per bar), voice track (`T`, rank 2) and a future singing voice (`S`, nothing plays it). `narratorLines` reads the precedence from it (the voice track wins on its bars). `exclusive` (lower ranks go quiet while a kind sounds) and `multiCaption` (one caption row per active kind) are built and checked with a fake kind in `check:spoken`, groundwork only.
- **Samples prepared ahead (D9).** `spokenNeeds(song, C, lang, files)` is `spokenSchedule` with its `needSamples` switch: every line the code would say if every sample existed, with its bank and whether the speaker's sample exists. With the dev server's voice helper, `askSamples()` in `src/main.js` makes the lines with no sample at all for the song in Compose and, in the radio, for the next song and the song on air (`radio.needs()`), in batches, then writes the song again; the Voices group and Coming next say "Preparing voices 3/7". A line that missed its bar while its sample was made is spoken late by `playLate()` (the next beat, else the next bar, never over the voice track) and captioned then. Without the helper the Voices group says how many lines stay silent.
- **Live build off.** The Voice: narrator block shows a note (`narratorNoLive`) and folds Sound and Narrator lines; the folds are not remembered while the block is `.no-live`, so the user's state comes back with the Live build on.
- **Artists and styles.** A style sets the base voice; an artist can prefer voice characters ([artists.md](artists.md)).
- **Songs.** The voice track's settings shape the sound: pitch, tempo, filters, drive, reverb, delay ([songs.md](songs.md)).

Each radio song has its own voice. The style gives a speaker list and ranges for each effect. Sometimes the song takes another speaker, a character on top, or one or two rack devices. Every value stays within `VOICE_LIMITS`, so words stay clear.

## Options

<!-- generated:narrator -->
Narrator styles: `explain`, `poetic`.

Speakers (`SPEAKERS`): `eddy`, `flo`, `grandma`, `grandpa`, `reed`, `rocko`, `sandy`, `shelley`.
<!-- /generated -->

- `explain`: the default. It says what each step does.
- `poetic`: a short image in the bar before each track comes in, nothing at the other steps (with Narrated growth, a movement image at the other steps). Lines come from the song's `narrator.lines`, its style's, else the vocabulary's poetic group; the key `move` holds the movement images.

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
