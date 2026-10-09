# Endless director

Endless mode (`#18`) plays music that never ends. Phase 1 (`#21`) builds the director: a program that writes a session of songs from one or more style recipes (`docs/STYLES.md`). Each song is an ordinary v2 song (`docs/SONG-FORMAT.md`) with live build steps, so it plays in Compose, builds itself while it plays and speaks short comments. The radio view and everything listed under "Later phases" come after.

The code lives in `src/endless/` and runs in Node and in the browser:

| File          | What it does                                                        |
| ------------- | ------------------------------------------------------------------- |
| `random.js`   | Seeded random numbers with named streams                            |
| `recipe.js`   | Recipe format, defaults, validator                                  |
| `mix.js`      | Picks the style of each part of a song (chaos)                      |
| `shapes.js`   | The seven energy shapes                                             |
| `energy.js`   | Measures the energy of a song state                                 |
| `mutate.js`   | Varies drums, bass, arp and hook material                           |
| `phrases.js`  | Spoken comments per kind of move                                    |
| `director.js` | Song plan, moves, titles, session                                   |

## Session

A session is an ordered list of songs plus session data: the seed, the options (styles, chaos, energy, complexity, minutes) and, for each song, its title, the style of each part, length, tempo, key, meter, shape, track count and one entry per phrase (role, target energy, measured energy, moves, comment), and the transition to the next song (see Transitions).

Options and defaults: chaos 0.3, energy 0.6, complexity 0.5, 15 minutes, transitions and harmony from the artist (compatible harmony without one). The director adds songs until the session reaches the length.

## Song plan

For each song the director picks, from the styles that give each part:

- **Tempo** within the tempo style's range, and the **shape** among the shapes it allows.
- **Key**, **meter**, **swing** and two **progressions** from the harmony style: the main one, and one for big moments (drop, chorus, peak).
- **Length** within the tempo style's minutes, kept between 2 and 6 minutes, in whole double phrases.
- **Sections**: consecutive double phrases with the same role form one section (Intro, Build, Break, Drop, Verse, Chorus, Peak, Outro, …).
- **Candidate tracks**: drums split into `kick` and `beat`, then bass, arp, lead, pad, guitar, texture and riser when the parts provide them (each with the recipe's `weight` as its chance). Settings come from the app defaults plus the recipe values. Every candidate has a clip over the whole song; the steps decide when it plays.
- **Voice** track with the voice style's settings.
- **Title** of one or two words from the word lists of the styles the song uses, in English, Italian or Spanish.

## Energy

Each shape gives a role and a target energy (0 to 1) for every double phrase:

| Shape          | Curve                                                        |
| -------------- | ------------------------------------------------------------ |
| `build-drop`   | Rises to about 60 %, one double phrase of break, drop, outro |
| `slow-burn`    | Slow rise to a peak at the end                               |
| `waves`        | Alternates high and low                                      |
| `flat-groove`  | Stays in a narrow band                                       |
| `verse-chorus` | Two verses, one chorus, repeating                            |
| `late-peak`    | Low for long, one peak near the end                          |
| `descent`      | Starts full and fades down (like a reel)                     |

The energy amount moves every target: 0.6 keeps the curve, 0.9 raises it, 0.2 lowers it. Flat groove moves less.

Energy is measured, not declared. The measure combines, with the recipe's weights:

- **tracks**: tracks playing divided by the usual high count;
- **drums**: drum hits per bar;
- **filter**: cutoff of the melodic tracks, on a log scale from 150 Hz to 6 kHz;
- **drive**: drive setting and distortion devices.

## Moves

The director walks the song phrase by phrase. On each phrase boundary it measures the song as the live build will play it and picks moves toward the target:

- **add** or **remove** a track;
- **pattern** switch to a variation;
- **setting** change: filter up or down, drive up or down;
- **rack** device in or out (delay, reverb, distortion, bit crush, phaser);
- **break**: all drums out, on a double-phrase boundary;
- **drop**: the drums of the break back in, two phrases later;
- **riser** in the phrase before a big moment, out in the phrase after it.

Each candidate move gets a score: how close it brings the measured energy to the target, minus penalties (same kind as the last move, more tracks than usual, removing the last drum outside a break), plus a small bonus for colour moves when the energy is already close, plus a tiny random amount. Usually one move per boundary, two when the energy is far from the target, three at a big moment that is far.

## Command line

```sh
npm run endless -- --styles berlin-techno --minutes 12 --seed test
npm run endless -- --styles synthwave,jazz,country --chaos 1 --energy 0.8 --complexity 0.7 --minutes 30 --join
npm run endless -- --styles lo-fi --out /tmp/lofi --quiet
```

| Option         | Value                                                     | Default         |
| -------------- | --------------------------------------------------------- | --------------- |
| `--styles`     | Recipe ids, comma-separated (required)                    |                 |
| `--chaos`      | 0 to 1: how much parts mix between styles                 | 0.3             |
| `--energy`     | 0 to 1: moves every energy target                         | 0.6             |
| `--complexity` | 0 to 1: tracks and mutation                               | 0.5             |
| `--talk`       | 0 to 1: how often the voice comments                      | 0.5             |
| `--minutes`    | Total length; songs are added until it is reached         | 15              |
| `--seed`       | Any text; without it, a new seed is printed               | new             |
| `--out`        | Output folder                                             | `songs/endless` |
| `--join`       | Also write one song with the whole session                |                 |
| `--quiet`      | Report one line per song only                             |                 |

An unknown style or a value out of range stops the command with the valid choices, and nothing is written. A new session in the same folder replaces the files of the previous one.

## Rules

- Steps fall on phrase boundaries; breaks and drops on double-phrase boundaries.
- At most one move per track on a boundary, and never on two consecutive boundaries.
- Usually 4 to 5 tracks (fewer for sparse styles such as ambient and lo-fi). Complexity moves the usual count by up to one track. Never more than 8 tracks or the style's maximum, unless complexity is above 0.8.
- Material starts from recipe presets. Variations come from mutation, whose amount grows with complexity; at complexity 0 there is none and variations are other presets. Bass and arp notes stay chord tones, hook notes stay scale degrees.
- Consecutive songs never share the key or the shape, and a song never repeats the style-per-part combination of the three songs before it, unless the options leave no other choice.
- Comments: always on the start, breaks, drops and the song end, on about half of the other boundaries with moves (option `talk`, 0 to 1, default 0.5: 0 never speaks, 1 speaks on almost every boundary), never closer than 8 bars.

## Voice

Each song has its own voice. The style that gives the voice part sets the base: a list of speakers and a range for each effect (pitch, tempo, filters, drive, reverb, delay). The song draws a speaker from the list and a value from each range. Then, now and then, it goes further:

- another speaker, any of the nine (chance 0.15, up to 0.45 with chaos 1);
- a character on top of the base (chance 0.3, up to 0.6 with chaos 1): `radio`, `robot`, `deep`, `bright`, `cathedral`, `echo`, `dirty` or `slow`, each overriding a few settings.

The draws use their own random stream (`voice`), so they never change the music of a seed. The session report and the recap show the speaker and the character of each song.

## Comments

`src/endless/phrases.js` holds two or three short phrases per kind of move in English and Italian (`add-drums`, `add-bass`, `add-lead`, `break`, `drop`, `brighter`, `dirtier`, `more-space`, `strip`, `song-start`, `song-end`, …). `npm run voices` makes a sample of each.

## Incremental sessions and the radio window

`createSession(recipes, seed)` makes one song at a time: `next(options)` generates the next song with the options given (styles, chaos, energy, complexity), keeping the random streams and the variety history between calls. `generateSession` is a loop over it, so the command line and the radio make the same songs for the same seed and options. A change of options applies from the next song; replaying the same sequence of options gives the same songs.

The radio plays songs on one timeline of absolute bars. `windowSong` (`src/endless/join.js`) joins the song on air and the next one, with silent sections before them so that the window's bar numbers equal the stream's: the scheduler never restarts between songs. Track ids carry the song number in the stream (`s7-bass`), so a song's code does not change when the window moves.

## Transitions

The director plans the transition from each song to the next when it makes the next one (it needs both tempos), with the `transition` random stream, and records it in the earlier song's entry: `{ kind, bars, ramp?, say? }`. `src/endless/transitions.js` writes it where the two songs meet, as sections, extra tracks and build steps, so the joined song compiles and opens in Compose like any other:

| Kind        | What happens                                                                                                  | Bars              |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| `mix`       | The next song starts under the last bars: its intro builds in, the current song fades and filters out, its drums leave at three quarters. First half in the current key, second half in the next. | 1 to 2 phrases |
| `morph`     | The current song's tracks leave one at a time (texture and melody first, drums last) while the next song builds in. | 2 to 4 phrases |
| `echo`      | The current song's tracks get delay and reverb two bars before the end and stop on the last bar; the next song starts under the tail. | 2 |
| `break`     | The last phrase keeps pad and texture, a riser climbs and the pad opens; the next song starts with a crash.      | 1 phrase          |
| `interlude` | After the song, a near-silence: at most two quiet tracks of it, a sparse click, a spoken comment.               | 1 to 4 phrases    |
| `cut`       | A plain end and start.                                                                                        | 0                 |

Mix and morph ramp the tempo across the overlap and are never planned for a tempo jump above 12 BPM or a change of meter. The kind comes from the artist's weights (`transitions.kinds`, defaults mix 3, cut 2, morph, break and echo 1, interlude 0.5) or from the option `transition` (`artist` or a kind); chaos lifts the kinds the artist likes less.

**Harmony.** With `harmony: compatible` (the default, or the artist's choice) the next song takes a key a fifth up or down from the current one and a tempo within 12 BPM, when its style allows; with `free` keys and tempos are drawn as before. Consecutive songs never share a key unless the style allows only one.

On the stream, the next song starts `bars` before the end of the current one for mix, morph and echo, and `bars` after it for an interlude. A skip always cuts.

## Steering

The listener can change the song on air from the Radio tab (`#24`). `src/endless/steering.js` turns each command into a rewrite of the song from a boundary: the steps before it are kept, the plan is changed (targets, length, sections, track limits, voice amount), and `directSong` writes the rest with the listener's moves first (`by: "listener"` on their steps) and the locked tracks blocked. A song is always rebuilt from its original plan plus every command still standing, in order, with random streams named after the song and the command (`steer:<song>:<index>`), so cancelling a command or replaying a session gives the same song.

| Command | Applies | Change |
| --- | --- | --- |
| Energy up, down | next phrase | targets of the remaining double phrases ±0.15 |
| Curve | next phrase | one double phrase gets the dragged target: energy, or a curve target (`#40`) |
| Reset a curve | next phrase | the remaining double phrases of that curve go back to automatic |
| Add, remove a type | next phrase | a forced add of a silent track of that type (a new one from the song's style when the song has none, `#41`), or a forced remove of every playing one |
| More, less complex | next phrase | usual track count ±1 |
| Darker, brighter, dirtier, cleaner, more space | next phrase | that move on every playing track that allows it |
| Change instrument | next phrase | another wave, kit, guitar or texture from the style |
| Change progression, key | next double phrase | the following sections take another progression, or a key a fifth away |
| Talk more, less | next phrase | voice amount ±0.2 for the rest of the song |
| Go to the drop, stay here, end | next double phrase | the plan jumps to its drop, repeats the current part, or ends with an outro |
| Extend (`#45`) | next double phrase | one more double phrase before the ending (the closing outros, or the last part), with the role and curves of the part before it and energy a little lower, then higher, on repeated presses; disabled once the transition to the next song plays |
| Volume, mute, lock (mixer) | next bar | pinned gain; a step plus a lock; the director stops moving the track |

### Continue in radio

A session can start after a song from Compose or the Songs tab (`#29`): `createSession(recipes, seed, { lead: leadEntry(song) })`. The lead entry carries the tempo and key of the song's last section, its meter and length; the first generated song is planned after it (compatible harmony, the transition from the lead), and the generated songs keep their usual indexes and random streams. `stylesNear(song, recipes)` picks the styles: the song's style tags, else the styles of its genres closest in tempo, else the one to three styles closest in tempo and meter. In the radio the song is song 0: it plays to its end, steering starts from song 1, and the recipe keeps a copy of it for Replay.

### Curves

Next to energy, the radio shows four curves per double phrase (`#40`), measured on what plays (`curveParts` in `energy.js`, `songCurves` in `steering.js`):

- **Density:** tracks playing (voice and riser left out), out of the most the song can play.
- **Brightness:** the filter part of the energy measure.
- **Tension:** drive and distortion, the riser playing, and the strong progression.
- **Voice:** how often the voice speaks (the talk option, or the set value).

A curve is automatic until the listener drags a part: the part then gets a target in `plan.plan[d].curves`. Set targets are soft: each candidate move loses the distance between the measured curves and their targets, the phrase gets one more move when they are far (over 0.25), and energy stays the main target. A density target below the usual track count turns off the "add a track first" taste rule, and one above it raises the track limit. Parts without set targets are written exactly as before.

A tension of 0.7 or more gives a part the strong progression (sections split where chords change). On the part right before a drop it builds a charge: the riser from its first phrase, darker and dirtier moves, and a drum out on its last phrase. The drop brings the drums back and prefers brighter moves. A voice of 0 makes a part silent, start and end included. Curve edits only change the song on air.

## Determinism

Everything random comes from one seed through named streams: `plan`, `moves`, `mutation`, `titles`, `comments`, `voice`, `artist`, `transition`. Changing how titles are drawn does not change the music. The same seed and options give the same session; a session made without a seed records the seed it used. Seed fixtures in `tests/snapshots/endless.json` catch unintended changes: after an intended change, run `npm run check:endless -- --write-fixtures` and say why in the commit.

## Checks

`npm run check:endless` runs every check. Each rule above has one:

| Rule                                         | Check                                                            |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Songs pass the song validator                | `director: songs of every style are valid`                       |
| Length, sections, title, voice track         | `director: song plan (length, sections, title, voice)`           |
| Build and drop shape is followed             | `director: build and drop follows its shape`                     |
| Energy amount raises the energy              | `director: energy amount raises the measured energy`             |
| Mutation by complexity, notes in key         | `director: complexity 0 keeps presets, complexity 1 stays in key` |
| Grid, one move per track, no back to back    | `director: moves on the grid, one per track, never back to back` |
| Track limits                                 | `director: track limits`                                         |
| Variety between songs                        | `director: variety between songs`                                |
| Comment rate and spacing                     | `director: comments about half of the boundaries, 8 bars apart`  |
| Short phrases                                | `director: phrase pool is short and complete`                    |
| Voice amount                                 | `director: voice amount sets how often comments are spoken`      |
| A voice per song                             | `director: each song has its own voice`                          |
| Artist validator                             | `artists: validator reports errors at their paths`               |
| Songs drawn from an artist's taste           | `artists: songs draw their values from the taste`                |
| Quirks                                       | `artists: quirks do what they say`                               |
| Replay with the recorded artist              | `artists: a recorded session replays the same after the artist changes` |
| Built-in artists                             | `artists: the built-in artists are valid, make valid songs and differ` |
| Portraits                                    | `artists: portraits are the same for a seed and differ between seeds` |
| Same seed, same session                      | `determinism: same seed, same session`                           |
| Seed recorded                                | `determinism: a session without seed records the seed`           |
| No unintended change                         | `determinism: seed fixtures`                                     |
| Song by song equals a whole session          | `radio: song by song equals a whole session`                     |
| Options apply from the next song             | `radio: an option change applies from the next song and replays the same` |
| Window keeps each song, at any offset        | `radio: window song keeps each song as it is, at any offset`     |
| Every transition makes a valid song          | `transitions: every kind joins two songs into a valid song`      |
| Overlaps bring the next song in and leave it | `transitions: mix and morph bring the next song in before the end and leave only it` |
| No overlap over a big tempo jump             | `transitions: a big tempo jump never mixes or morphs`            |
| Artist preferences                           | `transitions: artist preferences are followed`                   |
| Compatible harmony                           | `transitions: compatible harmony keeps keys a fifth apart`       |
| Steering is exact                            | `steering: no command gives the same song, and the same commands the same song` |
| Steering keeps the past                      | `steering: every command keeps the past and makes a valid song`  |
| Energy up                                    | `steering: energy up raises the rest of the song`                |
| Song length commands                         | `steering: drop, stay and end change the length`                 |
| Locks and removed types                      | `steering: locked tracks and removed types`                      |
| Curves                                       | `steering: curves set density, brightness and the voice of a part` |
| Charge before a drop                         | `steering: high tension charges the part before a drop`          |
| Extend                                       | `steering: extend adds a part before the ending and keeps it`    |
| Continue a Compose song                      | `radio: a session continues after a song from Compose`           |

## Artists

Artists (`docs/ARTISTS.md`) are tastes the director samples for every song: favourite styles with weights, ranges for chaos, energy, complexity, voice and pace, preferred shapes and moves, voice characters and quirks. Pass one with `--artist` or pick it in the Radio.

## Later phases

Planned in `openspec/changes/endless-director/design.md` and in issues `#22` to `#26`: steering buttons (`#24`), continuing a Compose song in the radio (`#29`), long spoken passages (`#39`), session recording, agents and live voice, an MCP server. Ideas for later still: several directors with their own personality and quirks, and a video made from a session (`#27`).
