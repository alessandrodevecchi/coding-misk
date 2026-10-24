---
id: songs
related: [strudel, ideas, live-build, profiles, voice, narrator, library]
code: [src/song/format.js, src/song/compile.js, src/song/validate.js, songs/index.json, songs/examples]
checks: [npm run check:songs, npm run check:code]
---

# Songs

## What it is

A song is a JSON file in format v2. It has sections (the timeline and the harmony) and a free list of tracks. Each track has named patterns and clips that place a pattern on bars.

Built-in songs live in `songs/`, in the order of `songs/index.json`. The examples used by the docs and the Guide live in `songs/examples/`. Songs saved by the user live in the browser.

## How it connects

- **Code.** `compileSong` turns a song into Strudel code ([strudel.md](strudel.md)).
- **Ideas.** A pattern can hold an idea instead of written steps ([ideas.md](ideas.md)).
- **Live build.** The `build` field holds timed steps ([live-build.md](live-build.md)). `config`, `profile`, `buildStyle` and `growthShape` choose how the song builds; without any the song plays as written ([profiles.md](profiles.md)).
- **Voice.** `spoken` tracks are the voice instrument ([voice.md](voice.md)); `voice` tracks and `narrator` are the narrator ([narrator.md](narrator.md)).
- **Radio.** The director writes songs in this same format ([radio.md](radio.md)).
- **Library.** Tags, dates and favourites drive the Songs tab ([library.md](library.md)).

## Options

Song fields that change the sound: `sections`, `tracks`, `shared` (progressions read by several tracks), `build`, `profile`, `buildStyle`, `config` (the song's own configuration: profile, Live build switch, profile options; song-own-settings), `growthShape`, `narrator`. The others describe the song: `id`, `title`, `look` (the visual), `style`, `tags`, `inspiration`, `created`, `appVersion`, `origin`.

Section fields: `name`, `bars`, `bpm`, `bpmEnd` (a tempo ramp), `key`, `chords` (a named progression), `meter`, `swing`, `fade` (bars of crossfade), `crash`, `breath` (half a bar of silence), `fill` (a snare roll).

Track fields: `id`, `name`, `type`, `settings` (how it sounds), `rack` (effect devices in a chain), `patterns`, `clips`, `mute`, `solo`, `pinned` (settings that steps cannot change).

<!-- generated:track-types -->
Track types (`TYPES` in `src/song/format.js`): `drums`, `bass`, `guitar`, `arp`, `hook`, `pad`, `texture`, `riser`, `code`, `voice`, `spoken`.
<!-- /generated -->

- `drums`: rows of hits on a kit, or a groove.
- `bass`: a bassline from a preset, steps, notes or an idea.
- `guitar`: riffs and chord rhythms through an amp.
- `arp`: chord tones in an order.
- `hook`: the melody.
- `pad`: the harmonic bed, held or rhythmic.
- `texture`: samples like vinyl crackle or wind.
- `riser`: a noise sweep before a drop.
- `code`: free Strudel code in one pattern; the song's harmony is not applied.
- `voice`: the narrator, speaking the step comments.
- `spoken`: the voice instrument, spoken lines in the music.

Each track gets its own orbit, so its delay and reverb stay its own.

## Example

A song with one section and one kick:

```json
{"format": "coding-misk/song", "version": 2, "id": "tiny", "title": "Tiny", "sections": [{"name": "Loop", "bars": 8, "bpm": 124}], "tracks": [{"id": "drums", "type": "drums", "settings": {"kit": "RolandTR909"}, "patterns": {"A": {"rows": {"bd": "x...x...x...x..."}}}, "clips": [{"section": "Loop", "pattern": "A"}]}]}
```

Its compiled code, without the comments and the `SECTIONS` and `TEMPO` lines the player reads:

```js
setcpm(124/4)
const section1 = "<1!8>"
$: s("bd*4").bank("RolandTR909").gain(0.9).mask(section1).velocity(section1).orbit(1).analyze("kick")
```

A real compiled song is in [ideas.md](ideas.md#example).

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md): the full reference.
- [docs/COMPOSING.md](../COMPOSING.md): composing with worked examples.
- `node --no-warnings tools/song.mjs validate|compile|steps <file>`.
