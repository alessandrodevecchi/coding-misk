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
| `material.js` | Where each track's material comes from: presets, varied, composed (see Material) |
| `phrases.js`  | Spoken comments per kind of move                                    |
| `director.js` | Song plan, moves, titles, session                                   |

## Session

A session is an ordered list of songs plus session data: the seed, the options (styles, chaos, energy, complexity, minutes) and, for each song, its title, the style of each part, length, tempo, key, meter, shape, track count and one entry per phrase (role, target energy, measured energy, moves, comment), and the transition to the next song (see Transitions).

Options and defaults: chaos 0.3, energy 0.6, complexity 0.5, 15 minutes, transitions and harmony from the artist (compatible harmony without one), material `mix` (see Material). The director adds songs until the session reaches the length.

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
| `--material`   | `patterns`, `varied`, `composed` or `mix` (see Material)  | `mix`           |
| `--out`        | Output folder                                             | `songs/endless` |
| `--join`       | Also write one song with the whole session                |                 |
| `--quiet`      | Report one line per song only                             |                 |

An unknown style or a value out of range stops the command with the valid choices, and nothing is written. A new session in the same folder replaces the files of the previous one.

## Rules

- Steps fall on phrase boundaries; breaks and drops on double-phrase boundaries.
- At most one move per track on a boundary, and never on two consecutive boundaries.
- Usually 4 to 5 tracks (fewer for sparse styles such as ambient and lo-fi). Complexity moves the usual count by up to one track. Never more than 8 tracks or the style's maximum, unless complexity is above 0.8.
- Material starts from recipe presets, composed parts or varied presets, as each recipe instrument's `material` asks (see Material). Variations come from mutation, whose amount grows with complexity, or from a part composed at another energy; at complexity 0 there is neither and variations are other presets. Bass and arp notes stay chord tones, hook notes stay scale degrees.
- Consecutive songs never share the key or the shape, and a song never repeats the style-per-part combination of the three songs before it, unless the options leave no other choice.
- Comments: always on the start, breaks, drops and the song end, on about half of the other boundaries with moves (option `talk`, 0 to 1, default 0.5: 0 never speaks, 1 speaks on almost every boundary), never closer than 8 bars.

## Material

The material generator (`src/material/`, `material-generator`, `#71`) composes parts the way a live coder writes them: small cells, summed progressions, chord indices, sequencer steps. Every part is an idea of the song format (`docs/SONG-FORMAT.md`, Ideas), so it compiles, grows in a live build and is measured like a preset. It is pure and seeded: the same inputs give the same part, in Node and in the browser.

```js
compose(kind, { seed, style, harmony, meter, energy, from, keep, type, shape }) // → { idea, settings, rack, why, stats }
```

`kind` is `melody`, `bass`, `arp`, `chords`, `drums` or `sound`; `style` is the recipe instrument's `material` field (`docs/STYLES.md`); `harmony` is `{ key, mode, chords, shared }`; `energy` goes from 0 to 1; `from` and `keep` vary a preset. Each kind draws from its own stream (`material:<kind>` of the seed), so a melody never changes the drums of the same seed. `why` lists the rules used, for reports and checks.

The seed chooses among rules, never note by note in a free range:

| Kind | Rules |
| --- | --- |
| Melody (`hook`) | A cell of scale degrees plus a progression summed over the bars (`.add("<0 -2 2 -1>")`, the chord roots of the section, or a still line such as `<0!3 -2>` on a one-chord harmony). One shape each: a motif repeated with a changed tail (`<[A]!3 [A']>`, the fourth bar changes its last one or two notes), call and response (`<[A] [B]>`, B ends on degree 0), or a polymetric line (`{0 ~ 2 4 1}%16`, 5 or 7 values over the bar's steps, more likely with energy). Notes walk by steps and leaps up to a fifth, start and end on a stable degree more than half of the time; dark modes lean on the second and sixth degrees. One prepared variant half of the time (`// .add("0 0 4 0 5")`). |
| Bassline | The roots of the section's chords with a rhythm cell from the style's families (`half`, `offbeat`, `pulse`, `rolling`, `gallop`, `sixteenths`), and an octave or fifth line as rhythm (`.transpose("[0 12]*4")`); with a shared progression of the song, the bass reads it three octaves down (`n(roots.sub(21))`). Every note is the root or the fifth of its bar's chord. |
| Arpeggio | Indices into the voiced chords: a written cell (`up`, `updown`, `pedal`, `skips`) repeated over the bar or as a polymeter (`{0 1 2}%16`), or a seeded random source (`irand(4).seg(16).rib(371, 2)`). Every index is a chord tone. |
| Chords | A pad voices the section's chords with `voicing()` (anchor `c4`), held or as stabs; with the rule `mode`, a new progression on the degrees of the mode, 1 to 4 different chords a phrase, the last one leading back (the fifth, the seventh or the flat second). A guitar plays power chords with a rhythm cell, or a riff of dark steps over them. |
| Drums | Sequencer steps per row from a family: `four-floor` (kick on every beat), `breakbeat` (snare on 2 and 4, kick on 1 and on 6, 10 or 11), `two-step` (clap on 2 and 4, kick on 1 and one or two of 7, 10, 11), `half-time` (snare on 3, kick on 1 and 10 or 11), `euclid` (kick and rim as euclidean rhythms, rotated). Kits stay from the recipe. |
| Sound | The wave and an optional FM patch: `bell`, `reese`, `growl`, `dirty`, `saw`, `square`, `tine`, `clang`, `sub`, `organ` (below). |

Energy steers density and range, inside the style's limits: 0 to 0.33 gives 2 to 4 onsets a bar within a fifth, 0.33 to 0.66 gives 4 to 8 within an octave, 0.66 to 1 gives 6 to 16 up to an octave and a fifth. Basslines, arpeggios and grooves follow the same bands (more hits, hats and ghost notes with energy).

`shape` (`{ density, register, complexity }`, each 0 to 1) is given only by steering, for material composed on air (Steering, Composed material); without it a part is composed with the same draws as before.

A preset can be varied (`from`, `keep`): `rhythm` keeps its onsets and composes new pitches (chord tones for a bass, indices for an arpeggio, degrees for a melody), `notes` keeps its pitches in their order on a new rhythm.

FM patches are a rack device (`fm`, `src/song/rack.js`), inside a range table: index 0 to 4 (one less per octave above 4), harmonicity from 0.5, 0.505, 1, 1.005, 1.01, 1.015, 1.02, 1.41, 2, 2.01, 2.76, 3, 3.5, 4, modulator wave sine, triangle, square or sawtooth (pink and brown only with an index under 0.5), decay 0.05 to 1, sustain 0 to 1, and a second operator (`fm2` 0.5 to 3, `fmh2` 1 to 10) for `growl`, `tine` and `clang`. No third operator and no feedback in this first version. The second operator modulates the first one, not the note.

| Kind | Wave | FM patch | Sound |
| --- | --- | --- | --- |
| `bell` | sine or triangle | index 1 to 3, ratio 1.01, 2.01 or 3.5, short decay, no sustain | a bell or glass pluck |
| `reese` | sawtooth | index 0.3 to 1.2, ratio 1.005 to 1.02 or 0.505, high sustain | a wide bass that beats slowly: the ratio is never exactly 1 or 0.5 |
| `growl` | sawtooth or square | index 1 to 3, ratio 0.5, 1 or 2, a second operator (0.5 to 3, ratio 1 to 10) | an aggressive, almost vocal growl |
| `dirty` | sawtooth or square | pink or brown noise as the modulator, index under 0.5 | grain and noise inside the note |
| `tine` | sine or triangle | index 1 to 2.5, ratio 1, decay 0.1 to 0.35, sustain under 0.2, a second operator (0.5 to 1.2, ratio 7 or 9) | an electric piano: a bright, metallic attack that falls to a soft tone |
| `clang` | sine or triangle | index 2 to 3.5, ratio 1.41, 2.76 or 3.5, a second operator (0.5 to 1.5, ratio 2.5 to 6.5) | struck metal, inharmonic, a ring that fades |
| `sub` | triangle or square | index 1 to 2.5, ratio 0.5, high sustain | a hollow growl an octave down |
| `organ` | sine | index 0.6 to 1.4, ratio 1, 2 or 3, sustain 0.9 to 1 | steady and even, like drawbars |
| `saw`, `square` | the wave | none | the plain wave |

`tine`, `clang`, `sub` and `organ` are in no style recipe yet: a style uses them when its `sounds` names them. The first six kinds are measured below clipping in the browser (`songs/examples/05-material.json`); the four new ones were measured in fast exports of a demo song (bass alone and in a mix, peak at most -4.4 dBFS).

FM changes the frequency of a synth oscillator, so it applies only to synth sounds: the basic waves (`sine`, `triangle`, `square`, `sawtooth`), `supersaw`, `pulse` and the wavetables. Samples (drum kits, the General MIDI instruments, the voices) and noise ignore it: Strudel's sampler never connects the FM operators.

### In the director

For each track whose type has a generator (drums, bass, arp, lead, pad, guitar), the director asks where its material comes from, on the `material` streams of the session seed (`material/<song>/<track>`), so the other streams keep their draws:

- **Session source** (option `material`, saved with the session and the radio's recipe; in the radio it is picked in the console next to the knobs and applies from the next song prepared, recorded in the recipe's changes like the knobs, while Settings → Radio keeps the default for new sessions): `patterns` plays the library as written, with no mutation; `varied` keeps presets and adds a pattern that keeps their rhythm or notes (complexity sets how often the base pattern is varied too); `composed` composes every part; `mix`, the default, asks each recipe instrument's `material` field (`preset`, `generated`, or `mix` with a `share`).
- **Complexity 0** keeps presets only, whatever the recipes say, and gives the same songs as director version 2 (unless the session source is `composed`).
- A composed track gets pattern A at the target energy of the phrase where its type usually comes in (its place in the entry order), pattern B at the song's next big moment, and pattern C at the quietest phrase when complexity is above 0.6. The kick and beat tracks share one composed groove. A recipe that names `sounds` also gets a composed sound on composed tracks. Pads compose like the other melodic parts: every built-in style with a pad has `material: { source: "mix", share: 0.3, rules: ["style"] }`, so about a third of its songs voice the song's own chords near `c4` (held or as stabs, `voicing()` below the anchor) and the rest play the style's presets. A composed pad plays at 0.6 of the pad gain drawn from the recipe (`COMPOSED_PAD_GAIN` in `src/endless/material.js`): with 4 or 5 voices and no preset envelope it peaked 1.6 to 1.9 times higher than a preset pad at the same gain. Measured in the browser on berlin techno, ambient, darksynth and drum and bass sessions (`generator-followups`): written in A, composed pads span D2 to C4 (mean E3) against about F2 to F3 for the preset pads, so they sit higher on average and reach a third lower at the bottom; the basses stay at or below A#1 except in one drum and bass song, where a preset bass reaching G2 overlaps any pad. Composed pads peak at 0.05 to 0.19 (preset pads 0.07 to 0.21, basses 0.19 to 0.43), and the master output stays at or below 0.85 with every track playing at once.
- **The user's saved patterns** (`pattern-library`, passed as `userPatterns`) join the pool only where they fit: the same track type, a style tag of the part's style or `any`, and material that moves to the song's key.

The session report (`npm run endless`) shows which tracks are composed, varied or saved. `DIRECTOR_VERSION` is 6 (`generator-followups`: pads take composed chords with the recipe's share; 5 was `radio-variation`, Add and More complex compose): sessions saved by another version, older or newer, warn in the playlists.

The rules were written from scratch from general techniques of live coders and public courses; no passage or full recipe of a course is reused, so no credit line is needed.

`npm run check:material` checks the generator in Node: determinism, variety over 50 seeds, each rule, notes in key, chord tones, families, energy, varied presets, valid ideas in 4/4, 7/8 and 3/4, the FM range table, the session sources and the user's patterns.

## Voice

Each song has its own voice. The style that gives the voice part sets the base: a list of speakers and a range for each effect (pitch, tempo, filters, drive, reverb, delay). The song draws a speaker from the list and a value from each range. Then, now and then, it goes further:

- another speaker, any of the nine (chance 0.15, up to 0.45 with chaos 1);
- a character on top of the base (chance 0.4, up to 0.8 with chaos 1): `radio`, `robot`, `deep`, `bright`, `cathedral`, `echo`, `dirty` or `slow`, each overriding a few settings;
- one or two rack devices on the voice (chance 0.25, up to 0.65 with chaos 1): crush, sample rate, phaser, tremolo, vowel or echo.

The style's ranges are widened around their middle (1.6 times, plus the chaos), and sometimes one or two knobs the style leaves alone get a value of their own; every knob stays within `VOICE_LIMITS`, so the words stay understandable (#66).

The draws use their own random stream (`voice`), so they never change the music of a seed. The session report and the recap show the speaker and the character of each song.

### Voice instrument

A style may give its songs a voice instrument (`spoken` in the recipe, `docs/STYLES.md`): a spoken track that is part of the music, apart from the narrator (voice-instrument, #39). Its `weight` is the chance that a song gets one; the way (`passage`, `refrain`, `chop`, `opening`) is drawn by the style's `ways`, the line from its `lines` for that way, else from the vocabulary (`src/song/vocabulary.js`, the style's `vocab` group); the speaker from its `speakers`, never the narrator's; sometimes a voice character on top (more often on a chop). Where it plays:

- a refrain has a clip over the whole song: its lines only sound in the intro, break and outro;
- a passage plays in the first break (else the intro, else the outro);
- a chop plays in the first groove, drop, build or peak where fewer tracks than the usual most play (a chop counts as a layer);
- an opening ends where the next track comes in, its line ending before it (bound with `before`).

It is not one of the director's moves: it comes in with one `add` step where its clip starts, and the energy and density measures leave it out like the narrator. The draws use their own stream (`spoken`), so they never change the music of a seed, and complexity 0 gives no voice instrument (the plain songs stay those of version 2). The style's `narrator` (`"poetic"`) goes into its songs too. Dark cyberpunk and Ambient (refrains and passages, poetic narrator) and Pure trance (openings and chops) have a weight of 0.3. `npm run check:spoken` checks it.

**Options (voice-controls, #77).** The director options may carry `voice: { phrases, kind, ways, presence }` (`src/endless/voice-options.js`): how many phrases at most (`1`, `2-3`, `4-5`, `6-8`, `many` up to 12), different, repeated or mixed lines, the ways a phrase may use (each as likely; `null` keeps the style's weights) and how often a song gets one (`never`, the style's weight, `often` twice it up to 0.9, `always` for a single song, with every way, the vocabulary and a speaker of the styles that have one when its style has none). Presets: As the style (the default), Discreet, Present, Obsessive. With the default `spokenFor` draws exactly as before, so the seed fixtures and `DIRECTOR_VERSION` stay; the extra phrases draw from `spoken-more/<index>`. Several phrases get one pattern per line and one clip each in a quiet part (a phrase of the plan in an intro, break or outro, or with few tracks), never two in one part, spread over the song; a refrain only in an intro, break or outro; the count is a ceiling (`spokenParts`). The radio records the options in the recipe only when they are not the default; the session entry gets `phrasesSpoken`. The radio console and the new song from an artist in Compose show them (`src/endless/voice-panel.js`).

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
| Add, remove a type | next phrase | a forced add of a silent track of that type (a new one from the song's style when the song has none, `#41`), or a forced remove of every playing one; a track the song has not played yet gets composed material |
| More, less complex | next phrase | usual track count ±1 and session complexity ±0.2; with More, the tracks that have not played yet get composed material |
| Vary a part (`radio-variation`) | next phrase | a new idea for each playing, unlocked track of the part (lead, the default, bass, arp or pad), added as pattern `V<k>` with a listener's pattern step; the rest of the song stays, later pattern steps of the varied tracks go |
| Swap a part (`radio-variation`) | next phrase | another ready part for each playing, unlocked track of the part (a style preset or a saved pattern that fits), added as pattern `S<k>` with a listener's pattern step; never composed |
| Darker, brighter, dirtier, cleaner, more space | next phrase | that move on every playing track that allows it |
| Change instrument | next phrase | another wave, kit, guitar or texture from the style |
| Change progression, key | next double phrase | the following sections take another progression, or a key a fifth away |
| Talk more, less | next phrase | voice amount ±0.2 for the rest of the song |
| Go to the drop, stay here, end | next double phrase | the plan jumps to its drop, repeats the current part, or ends with an outro |
| Extend (`#45`) | next double phrase | one more double phrase before the ending (the closing outros, or the last part), with the role and curves of the part before it and energy a little lower, then higher, on repeated presses; disabled once the transition to the next song plays |
| Volume, mute, lock (mixer) | next bar | pinned gain; a step plus a lock; the director stops moving the track |

**Grown songs (`radio-profiles` stage 5, D9).** On a Crescendo or Live coder song a command becomes the next waypoint of its growth (`src/endless/waypoints.js`): the steps before its boundary are kept as they were, and from the boundary small typed moves (a line in or out, a growth level, notes a few at a time, a knob, a function, a device) lead from the code on air to the written form of the rewrite above, which plays as written from the arrival, a phrase boundary. The boundary is the first that leaves time to type the edit (the next phrase or the one after), the queue shows it; mute types `_$:`, a volume is `.gain()` on the line, Vary and Swap are notes edits, End takes the lines out one at a time during the outro. The listener's tracks move first (D10). A recipe records `growth: 2`; one of growth version 1 replays its steered songs grown again, as heard then.

### Composed material

Steering composes with the material generator (`radio-variation`, `airIdea` in `src/endless/material.js`), in the key and chords of the section where the material starts and with the style's rules:

- **Vary** (`vary`, part in `type`, one of `VARY_TYPES`: `lead`, `bass`, `arp`, `pad`): for the lead the hook, else the guitar; the arp is a part of its own (unlike Add and Remove, where lead covers the arp). The new idea differs from every pattern the track already has; drums and textures are not varied. Later commands keep the varied part (its step is kept as the listener's), and later director moves of the track may pick it or another of its patterns. Disabled with `not-playing` when no track of the part plays at the bar where it would apply, `locked` when every one is locked. Vary always composes, whatever the session source; a pad keeps the song's chords (the style's own progressions are left out) and changes only its rhythm, register and voicing.
- **Swap** (`swap`, the same parts as Vary): another ready part, never composed: `readyParts` lists the style's presets of the track's type (an arp keeps its speed) and the user's saved patterns that fit the song's style and key, without the parts the track already holds; the pick comes from the stream of the track id in the seed `swap:<song>:<index>`. Disabled with `not-playing` and `locked` as Vary, and `no-ready` when nothing else fits.
- **Add and More complex**: a melodic track (bass, arp, lead, pad, guitar) that has not played before the command and still holds presets gets composed patterns A and B. Drums and textures keep the style's presets. With the session source `patterns`, or at complexity 0, nothing is composed and the songs are the same as before; with `varied`, the track gets a variation of its preset.
- **Inputs** (`airInputs`), at the double phrase where the material starts: density is the density target, or the tracks playing when the curve is automatic, as a share of the most the song can play, and sets the notes per bar (the generator's onsets band); the energy target sets the register (a melody moves up to three degrees up or down, a bass favours octaves, an arpeggio goes an octave up above 0.75, a pad's anchor is `a3`, `c4` or `e4`); the session complexity, moved by More and Less complex, sets the range (the span of a melody) and the rhythmic variety (syncopation, fifths in a bassline, skips and random indices in an arpeggio, voicing modes of a pad).

### Continue in radio

A session can start after a song from Compose or the Songs tab (`#29`): `createSession(recipes, seed, { lead: leadEntry(song) })`. The lead entry carries the tempo and key of the song's last section, its meter and length; the first generated song is planned after it (compatible harmony, the transition from the lead), and the generated songs keep their usual indexes and random streams. `stylesNear(song, recipes)` picks the styles: the song's style tags, else the styles of its genres closest in tempo, else the one to three styles closest in tempo and meter. In the radio the song is song 0: it plays to its end, steering starts from song 1, and the recipe keeps a copy of it for Replay.

### Sessions in playlists

A radio session can be a playlist item (`#38`): the recipe (seed, options and changes, steering, song 0), the number of songs heard, a title and `DIRECTOR_VERSION`. In a playlist the radio replays it for that many songs and hands back to the queue; with Mix on its songs are rebuilt as heard and join the mix stream like saved songs. A session made with another director version, older or newer, warns that it may sound different; Freeze stores its songs and transitions, and a frozen session plays them without the director. Bump `DIRECTOR_VERSION` whenever the fixtures change.

### Curves

Next to energy, the radio shows four curves per double phrase (`#40`), measured on what plays (`curveParts` in `energy.js`, `songCurves` in `steering.js`):

- **Density:** tracks playing (voice and riser left out), out of the most the song can play.
- **Brightness:** the filter part of the energy measure.
- **Tension:** drive and distortion, the riser playing, and the strong progression.
- **Voice:** how often the voice speaks (the talk option, or the set value).

A curve is automatic until the listener drags a part: the part then gets a target in `plan.plan[d].curves`. Set targets are soft: each candidate move loses the distance between the measured curves and their targets, the phrase gets one more move when they are far (over 0.25), and energy stays the main target. A density target below the usual track count turns off the "add a track first" taste rule, and one above it raises the track limit. Parts without set targets are written exactly as before.

A tension of 0.7 or more gives a part the strong progression (sections split where chords change). On the part right before a drop it builds a charge: the riser from its first phrase, darker and dirtier moves, and a drum out on its last phrase. The drop brings the drums back and prefers brighter moves. A voice of 0 makes a part silent, start and end included. Curve edits only change the song on air.

## Profiles and growth on air (`radio-profiles`)

Radio songs can build like a live coder. Every generated song gets a profile (Classic, Crescendo or Live coder, id `switch`) from the first source that names one: the session's Profile option, the compilation setup's `profiles`, the artist's `profiles` weights, the declared `profile` of the style that gives the drums (the four `live-coder` family styles), else Classic (`songProfileOnAir` in `src/endless/profile.js`, its own stream `profile/<n>`, so the songs and every other draw stay the same). The director writes `entry.profile` only when it is not Classic. A saved song keeps its own profile, then the session's forced one, then the player default. The console also offers a Custom profile with the Compose controls, saved with the session.

`src/endless/growth.js` turns a director song into its written form and grows Crescendo and Live coder songs from it with the Compose engine, seeded by the song id. The duration is fitted by default: the growth ends at the reference section and the song stays within a phrase of its plan; an artist's `growth.duration: free` makes songs wait for their typing. On air the typed opening comes only after a cut or an interlude and the metamorphosis is never drawn. The app grows each new song in a Web Worker. The incoming song plays from its hidden full code (orbits moved up by 20, constants renamed) when it grows and appears whole when it goes on air; a Classic one is shown, as before. Commands on a grown song are waypoints of its growth (see Steering). Exports, videos and fragments of a session rebuild its songs as the radio played them.

Recipes record a growth marker (`growth: 2`); a recipe without it, or without the Profile option, replays every song in blocks as it was heard. The director's songs did not change, so `DIRECTOR_VERSION` stayed at 5; the radio items are pinned in `tests/snapshots/radio-growth.json` by `npm run check:radio-profiles`.

Three ways to a Live coder session: the Profile option Live coder, the compilation preset Live coder (`profiles: { switch: 1 }`, Journey movement), or the built-in artist Cursor Bloom, who weighs the Live coder over Crescendo by its own `profiles`.

## Determinism

Everything random comes from one seed through named streams: `plan`, `moves`, `mutation`, `titles`, `comments`, `voice`, `artist`, `transition`, and `material/<song>/<track>` for composed parts. Material composed on air is seeded by the song and the command's index: `vary:<song>:<index>` for Vary, `swap:<song>:<index>` for Swap, `add:<song>:<index>` and `more:<song>:<index>` for Add and More complex (with the track id), so cancelling a command or replaying a recorded session gives the same notes, and no other stream moves. Changing how titles are drawn does not change the music. The same seed and options give the same session; a session made without a seed records the seed it used. Seed fixtures in `tests/snapshots/endless.json` catch unintended changes: after an intended change, run `npm run check:endless -- --write-fixtures` and say why in the commit. The fixtures are sessions without steering, so composing on air did not move them; `DIRECTOR_VERSION` went to 5 anyway, because saved sessions with Add or More complex sound different; steered songs at complexity 0 or with the source `patterns` are pinned by hashes recorded before `radio-variation`.

## Checks

`npm run check:endless` runs every check. Each rule above has one:

| Rule                                         | Check                                                            |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Songs pass the song validator                | `director: songs of every style are valid`                       |
| Length, sections, title, voice track         | `director: song plan (length, sections, title, voice)`           |
| Build and drop shape is followed             | `director: build and drop follows its shape`                     |
| Energy amount raises the energy              | `director: energy amount raises the measured energy`             |
| Mutation by complexity, notes in key         | `director: complexity 0 keeps presets, complexity 1 stays in key` |
| Complexity 0 gives the version 2 songs       | `director: complexity 0 gives the songs of director version 2`   |
| Composed leads where the recipe asks         | `director: a recipe asking for composed leads gets them in most songs` |
| Session material source                      | `director: material source patterns, varied, composed`           |
| Grid, one move per track, no back to back    | `director: moves on the grid, one per track, never back to back` |
| Track limits                                 | `director: track limits`                                         |
| Variety between songs                        | `director: variety between songs`                                |
| Comment rate and spacing                     | `director: comments about half of the boundaries, 8 bars apart`  |
| Short phrases                                | `director: phrase pool is short and complete`                    |
| Voice amount                                 | `director: voice amount sets how often comments are spoken`      |
| Live coder styles: one key, short progressions, crescendo | `director: Live coder styles keep one key, short progressions and open in crescendo` |
| Pure trance: no arpeggio, at most two chords | `director: pure trance has no arpeggio and at most two chords` |
| Renamed styles: old ids give the same songs | `renamed styles: old ids give the same songs as the new ones (sessions, artists, saved settings)` |
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
| Vary: new notes in key, the rest unchanged   | `steering: vary gives a part new notes in key and keeps the rest` |
| Vary: not playing, locked, late              | `steering: vary is disabled when the part does not play or is locked` |
| Vary: replay and cancel                      | `steering: vary replays the same, and a cancelled vary leaves the notes` |
| Add and More complex compose; plain sessions as before | `steering: Add and More complex compose new tracks`    |
| Curves and complexity shape composed material | `steering: curves and complexity shape composed material`       |
| Vary composes with any source; pad keeps chords | `steering: vary composes whatever the source, and a pad keeps its chords` |
| Swap: a ready part, replays, why not, saved patterns | `steering: swap gives a part another ready part, never composed` |
| A vary under 20 ms                           | `steering: one vary takes less than 20 ms`                       |
| Continue a Compose song                      | `radio: a session continues after a song from Compose`           |

## Artists

Artists (`docs/ARTISTS.md`) are tastes the director samples for every song: favourite styles with weights, ranges for chaos, energy, complexity, voice and pace, preferred shapes and moves, voice characters and quirks. Pass one with `--artist` or pick it in the Radio. `profiles` and `growth` say how the artist's songs build in the radio (Profiles and growth on air).

## Later phases

Planned in `openspec/changes/endless-director/design.md` and in issues `#22` to `#26`: steering buttons (`#24`), continuing a Compose song in the radio (`#29`), long spoken passages (`#39`), session recording, agents and live voice, an MCP server. Ideas for later still: several directors with their own personality and quirks, and a video made from a session (`#27`).

## Compilation (`#49`)

A radio mode that changes artist, genre, styles and knobs on its own (`src/endless/compilation.js`, checked by `npm run check:compilation`). The session is cut into segments of one song, or of 2 to 4 songs (the length drawn per segment). Each segment draws a genre among those the setup allows: on a journey the same genre or a neighbour on a fixed ring (ambient, jazz, hip-hop, pop, house, trance, techno, drum and bass, industrial, metal, rock, country, synthwave, experimental), with a jump chance of 0.1 plus 0.3 times the middle of the chaos range; free movement picks any allowed genre other than the last. Then it draws one of: an artist of that genre from the setup's pool, a random artist made on the fly (when allowed), or 1 to 3 styles of the genre with knob values inside the setup's ranges. Every draw comes from the session seed and the segment index (`compilation/<i>`, `compilation-length/<i>`), and the session recipe stores the compilation with its setup and the artists it may use, so Replay and sessions saved in playlists give the same songs. Built-in presets: Everything (free), Journey, Club, Chill, Live coder (every generated song grows like a live coder); the listener's presets live in the browser. Director fixtures do not change: the compilation only builds the options of each song.
