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

A session is an ordered list of songs plus session data: the seed, the options (styles, chaos, energy, complexity, minutes) and, for each song, its title, the style of each part, length, tempo, key, meter, shape, track count and one entry per phrase (role, target energy, measured energy, moves, comment). Songs follow each other with a plain end and start in this phase.

Options and defaults: chaos 0.3, energy 0.6, complexity 0.5, 15 minutes. The director adds songs until the session reaches the length.

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

## Rules

- Steps fall on phrase boundaries; breaks and drops on double-phrase boundaries.
- At most one move per track on a boundary, and never on two consecutive boundaries.
- Usually 4 to 5 tracks (fewer for sparse styles such as ambient and lo-fi). Complexity moves the usual count by up to one track. Never more than 8 tracks or the style's maximum, unless complexity is above 0.8.
- Material starts from recipe presets. Variations come from mutation, whose amount grows with complexity; at complexity 0 there is none and variations are other presets. Bass and arp notes stay chord tones, hook notes stay scale degrees.
- Consecutive songs never share the key or the shape, and a song never repeats the style-per-part combination of the three songs before it, unless the options leave no other choice.
- Comments: always on the start, breaks, drops and the song end, on about half of the other boundaries with moves, never closer than 8 bars.

## Comments

`src/endless/phrases.js` holds two or three short phrases per kind of move in English and Italian (`add-drums`, `add-bass`, `add-lead`, `break`, `drop`, `brighter`, `dirtier`, `more-space`, `strip`, `song-start`, `song-end`, …). `npm run voices` makes a sample of each.

## Determinism

Everything random comes from one seed through named streams: `plan`, `moves`, `mutation`, `titles`, `comments`. Changing how titles are drawn does not change the music. The same seed and options give the same session; a session made without a seed records the seed it used. Seed fixtures in `tests/snapshots/endless.json` catch unintended changes: after an intended change, run `npm run check:endless -- --write-fixtures` and say why in the commit.

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
| Same seed, same session                      | `determinism: same seed, same session`                           |
| Seed recorded                                | `determinism: a session without seed records the seed`           |
| No unintended change                         | `determinism: seed fixtures`                                     |

## Later phases

Planned in `openspec/changes/endless-director/design.md` and in issues `#22` to `#26`: the radio view linked to Compose, transitions (crossfade, morph), steering buttons, session recording, agents and live voice, an MCP server. Ideas for later still: several directors with their own personality and quirks, and a video made from a session (`#27`).
