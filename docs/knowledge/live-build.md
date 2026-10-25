---
id: live-build
related: [profiles, growth-shapes, songs, ideas, narrator, comments-and-functions]
code: [src/song/build.js, src/song/crescendo.js, src/song/coder.js, src/live/live-code.js, src/song/typing.js]
checks: [npm run check:crescendo, npm run check:live-code, npm run check:typing, npm run check:functions]
---

# Live build

## What it is

A live build is a song that builds itself while it plays. It starts from silence. Each change is typed into the code panel during the bar before it, and sounds on its bar.

The changes are steps: a list of timed actions in the song's `build` field. A step can also carry a short comment, shown on the stage and spoken by the narrator.

## How it connects

- **Where steps come from.** A song can write its own steps ([songs.md](songs.md)). Without them, the "Live build" switch derives steps from the clips. Crescendo and the Live coder growth compute steps from the song as written.
- **Profiles.** The profile picks blocks, Crescendo or the natural growth, and how the code looks and types ([profiles.md](profiles.md)).
- **Shapes.** The natural growth of the Live coder follows a growth shape ([growth-shapes.md](growth-shapes.md)).
- **Ideas.** In the Live coder growth a part written as an idea grows from its simple form: a bass from one note per beat to its cell ([ideas.md](ideas.md)).
- **Code.** `liveCode` writes the code of each step with the comment and function options ([comments-and-functions.md](comments-and-functions.md)).
- **Voice.** Step comments are spoken by the narrator ([narrator.md](narrator.md)).
- **Hand coding.** Typing in the code panel stops the steps and the music goes on. "Resume live build" types the song's code back.

**Growth of a radio song.** The director writes its own steps. `writtenForm` in `src/endless/growth.js` turns them into clips (same sound bar by bar; rack and comments stay steps), then `crescendoSong` grows the part from a section boundary with `budget`, `span` and `noEnding` rules, so the song keeps its planned length within a phrase ([radio.md](radio.md)).

**Three growths.** `crescendo`: small steps, a change every one to four bars. `gradual`: a track enters with few lines, functions arrive one at a time. `natural`: like a live coder, four to six waypoints drawn at the start and small moves between them.

**Typing.** Human typing waits, types at an uneven pace and makes mistakes it fixes. A new line that cannot be typed at a person's pace before its step is pasted whole. With free duration the step waits for the typing instead.

## Options

The options of a build are profile controls ([profiles.md](profiles.md)). The step actions are the song format's:

<!-- generated:build-actions -->
Step actions (`BUILD_ACTIONS`): `add`, `remove`, `set`, `pattern`, `rack`, `unrack`, `hide`, `reveal`, `clone`, `comment`, `notes`, `variant`, `mute`, `unmute`, `solo`, `unsolo`, `mask`.
<!-- /generated -->

- `add` and `remove`: a track starts or stops playing.
- `set`: settings of a track from now on.
- `pattern`: every clip of a track plays another pattern, or a variant level (`A~1`, `A~2`, made by Crescendo).
- `rack` and `unrack`: add or remove a rack device.
- `hide` and `reveal`: leave the functions of some settings out of the code, so Strudel's defaults apply, then bring them back.
- `clone`: a track starts playing with the notes, shared settings and shown functions of another track, like a line copied from above.
- `comment`: some functions of a track's line become comments (`// .lpf(800)`); `on: false` brings them back.
- `notes`: new notes, rows or steps for a track's patterns.
- `variant`: switch on a prepared variant of an idea; its line loses the `//`.
- `mute` and `unmute`: the line stays in the code with `_$:`, or loses the `_`.
- `solo` and `unsolo`: the line plays alone with `S$:`, or loses the `S`.
- `mask`: a mask per phrase on a track's lines, such as `"<1 1 0 1>"`.

## Example

<!-- generated:example-growth-step -->
The Ideas example in the Live coder profile. Shape drawn: opening `slow`, pace `slow`, development `second-section` (from opening seed, pace seed, development seed).

The pattern lines that the step at bar 53 rewrites, before:

```js
$: chord("Am").anchor("c4").voicing()
  .s("supersaw").attack(.4).release(1.2)
  .room(.85).degradeBy(0.5)
```

After:

```js
$: chord("Am").anchor("c4").voicing()
  .s("supersaw").attack(.4).release(1.2).wob(196, 784)
  .room(.85).degradeBy(0.5)
```

The steps at that bar:

```json
[
  {"at":53,"reveal":{"track":"pad","keys":"cutoff"}}
]
```
<!-- /generated -->

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#live-build): every step field.
- [docs/COMPOSING.md](../COMPOSING.md#live-build): writing a build, Crescendo, profiles, shapes.
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#live-build) and [hand live coding](../ARCHITECTURE.md#hand-live-coding).
- `node --no-warnings tools/song.mjs steps <file>` lists the steps of a song.
