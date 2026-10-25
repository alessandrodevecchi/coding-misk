---
id: profiles
related: [live-build, growth-shapes, comments-and-functions, styles, songs]
code: [src/live/profiles.js, src/main.js, src/i18n.js]
checks: [npm run check:profiles, npm run check:live-code, npm run check:crescendo, node tools/check-growth-background.cjs]
---

# Performance profiles

## What it is

A profile is a named set of controls that decide how a song builds and looks while it plays. There are three: Classic, Crescendo and Live coder. The Live coder id is `switch` in songs, recipes and storage; it kept its old id when it was renamed.

The profile menu sits next to "Live build" in Compose. Changing one control makes the profile "custom", based on the one picked.

## How it connects

- **Who picks it.** The song's own configuration (`config`: profile, Live build switch, options; song-own-settings, `src/live/song-config.js`) wins, then its `profile` field, then its old `buildStyle` (`crescendo` or `blocks`), all with the Live build on; a song with none of them plays as Classic with the Live build off. A pick in Compose is a **trial** on the open song only: it never reaches another song or the saved song, survives reloads (`coding-misk-song-trials`, in the backup), shows "configuration changed" with ↺ "Original configuration" in the song actions (next to ↺ "Original song", the former Restore original, outside the Live build panel because the original may be the Live build off) and on the Songs card, and becomes the song's `config` only with Save or Save as new. The global Compose choice used before (`coding-misk-profile`, `coding-misk-profile-overrides`, `coding-misk-live`) is no longer read. A style recipe can name a profile for the songs it makes ([styles.md](styles.md)).
- **In the radio.** A generated song takes the radio's Profile option, then the compilation setup, then the artist's `profiles`, then the drums style's profile, else Classic. A saved song keeps its own, then the radio's forced one, then the player default. The radio uses each profile's own controls on air (fitted duration), never the Compose overrides, or the console's Custom profile: the same controls as Compose, saved with the session ([radio.md](radio.md)). The song on air shows its code with its own controls; a song that is not on air plays from full Classic code ([comments-and-functions.md](comments-and-functions.md)).
- **Build.** `build` and `growth` choose between a build in blocks, Crescendo and the natural growth of the Live coder ([live-build.md](live-build.md)).
- **Shape.** With growth `natural`, the controls `opening`, `pace` and `development` choose the growth shape ([growth-shapes.md](growth-shapes.md)).
- **Code.** The comment options and the technical function options decide what the code panel shows ([comments-and-functions.md](comments-and-functions.md)). The sound never changes with them. The Live coder shows only the title as comments (radio-profiles 9.2). These and the typing options are the display controls (`DISPLAY_CONTROLS`, `withDisplay`): in the radio they apply to the song on air from its next edit ([radio.md](radio.md)). The growth never reads them: the Live coder's shape choice measures the typing on the code with the track names (`crescendoSong`), and so does the steering on air without Custom controls (`steerOnAir`), as before 9.2.
- **Typing.** `typist`, `mistakes` and `typing` decide how the code types itself.
- **Narrator.** `narrator` (on in every profile) switches the spoken step phrases on or off; `narrated` (Fully narrated) needs it on and is disabled in the panel while it is off. It changes the sound, not the growth: in the radio it applies from the next song ([narrator.md](narrator.md)). Off, the step phrase is not shown over the stage, in the studio scene or in videos either.

**Growth in the background** (growth-in-background, `src/main.js`). Crescendo and Live coder grow the song before it plays; a Live coder growth takes seconds on a long song (before the change, in the page: luci-rosse 4.6 s, settimo-cielo 11.6 s, kellerlicht 22.7 s). Every Compose change that needs a growth (profile, build style, growth, duration, opening, pace, development, Fully narrated, the Live build switch, opening a song, Save as new) goes through `composeCompiled()`: the growth already in the page's cache plays at once; else the song is held as written (`heldCompiled`, `pending`) while a stored growth is looked up (IndexedDB `coding-misk-growths`, `src/live/growth-store.js`) and then grown in the Compose worker (`composeAway`, the code of `src/endless/grow-worker.js`). A newer request ends the worker and starts a new one; the answer counts only when its key is still the song's. A drawn mark (`GROWING` in `src/icons.js`, turning with CSS, still with reduced motion) shows next to the profile chips while the song grows, and on Play while Play or export waits (`grownNow`). A song playing when the change is made goes on until the grown song takes over at the same bar. Without a worker the page grows as before. A failed growth leaves the song as written with a message. `npm run growth:probe -- <song>` prints what one growth tried and how long it took.

`resolveProfile(id, overrides)` returns the controls in force; `configOf(song, trial)` and `controlsOf(cfg)` give a song's configuration and its controls. `cleanOverrides` keeps only known controls with allowed values that differ from the profile. A comment or function preset saved by name stands for its options.

## Options

<!-- generated:profiles -->
| Profile id | Name | What it does |
| --- | --- | --- |
| `classic` | Classic (it: Classico) | In blocks: each track comes in whole, as before Crescendo |
| `crescendo` | Crescendo | The song grows in small steps from one sound |
| `switch` | Live coder | Grows like a live coder: few lines, functions one at a time, listening pauses, short patterns, lit notes, only the title as a comment |
<!-- /generated -->

Every control, its values and its default per profile. Texts come from the app's help texts.

<!-- generated:profile-controls -->
| Control | Values | Classic | Crescendo | Live coder | What it does |
| --- | --- | --- | --- | --- | --- |
| `build` | `blocks` in blocks, `crescendo` crescendo | `blocks` | `crescendo` | `crescendo` | Build style (it: Andamento): How the song builds itself. In blocks: each track comes in whole. Crescendo: the song starts from one sound and grows in small steps, a line at a time, like a live coder |
| `growth` | `crescendo` small steps, `gradual` gradual, `natural` natural (like a live coder) | `crescendo` | `crescendo` | `natural` | Growth (it: Crescita): Small steps: a change every 1-4 bars, a track enters already written. Gradual: a track enters with a few lines, functions arrive one at a time, sparse steps and listening pauses. Natural: like a live coder, 4 to 6 small waypoints drawn at the start, small moves between them, lines copied and changed, sometimes something taken out and put back (songs of 24 bars or more) |
| `duration` | `fitted` within the song length, `free` free | `fitted` | `fitted` | `free` | Growth duration (it: Durata della crescita): Natural growth. Within the song length: fewer details when needed. Free: as long as the moves need, rich songs grow longer |
| `narrator` | `true`, `false` | `true` | `true` | `true` | Narrator voice (it: Voce narrante): The voice that speaks the step phrases. Off: the phrases are not heard; the music and the length stay the same, the song's voice track still speaks, the comments follow their own options |
| `narrated` | `false`, `true` | `false` | `false` | `false` | Fully narrated (it: Tutto narrato): Crescendo: almost every step has a spoken comment |
| `typing` | `slow` slow, `normal` normal, `fast` fast | `normal` | `normal` | `normal` | Code typing (it: Scrittura del codice): When the code types itself (live build, crescendo, radio, videos): small edits like a person, long ones faster |
| `view` | `now` code of the moment, `compact` compact code, `track` one line per track, `sections` code per section | `sections` | `now` | `now` | Code view (it: Vista del codice): Crescendo, how the code looks. Of the moment: only the section that plays, the lines of the next section prepared muted before the change. Compact: identical lines of a track become one, tracks still to come show muted with _$:. One line per track: also the values that change between sections go in the same line. Per section: like any song. The sound is the same |
| `gen` | `standard` standard patterns, `idiomatic` short patterns | `standard` | `standard` | `idiomatic` | Generator (it: Generatore): Crescendo, how patterns are written. Standard: step by step. Short: like a live coder (bd*4, [~ hh]*4, repeated cells, equal groups with !, the arpeggio with its chords written once and .arp()). The sound is the same |
| `title` | `true`, `false` | `true` | `true` | `true` | Title (it: Titolo): The first line with the song title |
| `tracks` | `true`, `false` | `true` | `true` | `false` | Tracks (it: Tracce): The track names (// ===== bass =====) |
| `notes` | `true`, `false` | `true` | `true` | `false` | Notes (it: Note): The section and pattern notes (// Intro · bars 1-8) |
| `steps` | `true`, `false` | `true` | `true` | `false` | Phrases (it: Frasi): The step phrases (// > …) and the phrase the voice says |
| `voice` | `true`, `false` | `true` | `true` | `false` | Voice code (it: Codice della voce): The lines that make the voice speak. Off: the voice still speaks, its code is not shown |
| `highlights` | `false`, `true` | `false` | `false` | `true` | Lit notes (it: Note accese): In the code of videos and of the live picture the playing notes light up in time |
| `wrap` | `false`, `true` | `false` | `false` | `true` | Line breaks (it: A capo): A line wider than the panel breaks before a function, as a person would |
| `fnBus` | `false`, `true` | `false` | `false` | `true` | Bus: Bus and visual in short: .chan("bass") |
| `fnLevel` | `false`, `true` | `false` | `false` | `true` | Mixer: Bus, visual and level in a hidden mixer: .gain() only when a step changes the level |
| `fnCrunch` | `false`, `true` | `false` | `false` | `true` | Distortion (it: Distorsione): Distortion with its volume in short: .crunch(0.6) |
| `fnVoice` | `false`, `true` | `false` | `false` | `true` | Voice (it: Voce): The voice effects in a song function |
| `fnSong` | `false`, `true` | `false` | `false` | `true` | Song (it: Del brano): Effect chains that repeat become song functions with a themed name; the values that change stay in the brackets |
| `fnLib` | `false`, `true` | `false` | `false` | `true` | Library (it: Libreria): Library functions for the most used chains: .plk(decay, sustain), .wet(delay, room), .res(lpf, lpq), .wob(from, to) for a moving filter |
| `fnLanes` | `false`, `true` | `false` | `false` | `true` | Sections (it: Sezioni): Section and clip lanes go to the hidden mixer: each part is one line, changed in place when its section or clip changes, no section constants. For every profile, also with the Live build off |
| `typist` | `exact`, `human` | `exact` | `exact` | `human` | Human typing (it: Scrittura umana): The code is typed like a person: first it listens, then it types at an uneven pace, stops to think, sometimes pastes a long line from notes |
| `mistakes` | `on`, `off` | `on` | `on` | `on` | Typing mistakes (it: Errori di battitura): With human typing: wrong keys that stay on screen for a moment and get fixed, sometimes a whole wrong word, sometimes a number changed. Careful stretches and hurried ones. Off: always typed right |
| `opening` | `auto` automatic, `slow` Slow, `full-kick` full kick, `typed` from silence, `broken` broken beat, `filtered` filtered kick, `melodic` arpeggio or melody, `pad` pad or drone, `voice` voice, `muted-base` muted base, `mid-set` mid-set | `auto` | `auto` | `auto` | Opening (it: Apertura): How it starts: one kick that grows (Slow), the full kick, silence while the first line is typed, a broken beat, a filtered kick that opens, an arpeggio or a melody, a pad or a drone, a voice, a written base kept muted and switched on line by line, two tracks already playing in solo |
| `pace` | `auto` automatic, `slow` slow, `medium` medium, `fast` fast | `auto` | `auto` | `auto` | Pace (it: Velocità): How many changes in the first minute. Slow: as before, sparse steps and long pauses. Medium: a step every 10 to 15 seconds. Fast: a step about every 8 seconds, small moves. With medium and fast the kick is whole within the first minute. The typing never rushes: a step that takes long to type comes later |
| `development` | `auto` automatic, `by-type` by type, `as-written` as written, `masks` masks, `parameters` parameters only, `second-section` second section, `metamorphosis` metamorphosis | `auto` | `auto` | `auto` | Development (it: Sviluppo): In which order it grows. By type: drums, bass, pad, then the rest. As written: in the order the tracks come in the song. Masks: each instrument comes in, leaves and varies with its own mask. Parameters only: all come in at once, then filters, density, reverb and delay grow. Second section: new lines play alone with S$:, then all play. Metamorphosis: the whole song changes tempo, key and style, rewriting its lines one at a time |
<!-- /generated -->

Overrides saved before the Live coder growth used `natural` for what is now `gradual`. `migrateGrowth` moves them once (`PROFILE_STORE_VERSION` 2).

## Example

The Live coder profile with one change, line breaks off:

```json
{"id": "switch", "overrides": {"wrap": false}}
```

`resolveProfile('switch', { wrap: false })` gives every Live coder control, `wrap: false`, `custom: true`, `comments: 'custom'` and `functions: 'compact'`.

The Ideas example built with this profile is in [live-build.md](live-build.md#example).

## Where to read more

- [docs/COMPOSING.md](../COMPOSING.md#profiles): profiles from the composer's side.
- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#live-build): the `profile`, `buildStyle` and `growthShape` fields.
- The Guide card `crescendo` in `src/guide.js`.
