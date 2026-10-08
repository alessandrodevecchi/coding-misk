# coding-misk

**English** · [Italiano](README.it.md)

A local lab for composing music by writing code, built on [Strudel](https://strudel.cc/), the JavaScript port of [TidalCycles](https://tidalcycles.org/). Every track becomes readable Strudel code that plays in the browser, with visuals synced to each instrument.

## Demo

![coding-misk visuals reacting to the music](docs/media/demo.gif)

[Watch the 38 second demo with audio (MP4)](docs/media/demo.mp4)

![Stage visual while Luci Rosse plays](docs/media/visual-palco.jpg)

|                                                    |                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------- |
| ![Stage visual](docs/media/stage-palco.jpg)        | ![Space visual](docs/media/stage-spazio.jpg)                    |
| ![Pixel visual](docs/media/stage-pixel.jpg)        | ![Mountains visual](docs/media/stage-montagne.jpg)              |
| ![Scene arranger](docs/media/compose-arranger.jpg) | ![Drum sequencer and channels](docs/media/compose-channels.jpg) |

![Songs tab](docs/media/tracks.jpg)

## Listen

Five tracks exported with the app's WAV export (MP3 here). Each one is also in the app, where you can open it in Compose and read its code.

| Track | Style | Length |
| --- | --- | --- |
| [Kellerlicht](docs/media/audio/kellerlicht.mp3) | Dark techno trance from a Berlin basement with a synthwave last drop, F minor, 132 BPM | 4:53 |
| [Luci Rosse](docs/media/audio/luci-rosse.mp3) | Dark action-movie club, A minor on one chord, 124 BPM | 1:55 |
| [Ghost Protocol](docs/media/audio/ghost-protocol.mp3) | Cyberpunk hard techno, tempo from 132 to 148 BPM | 1:45 |
| [Segnale nel rumore](docs/media/audio/segnale-nel-rumore.mp3) | Free piece written by Claude, D dorian, from noise to 7/8 and back | 1:40 |
| [Pioggia sul vetro](docs/media/audio/pioggia-sul-vetro.mp3) | Lo-fi hip hop, D minor, 78 BPM with swing | 1:53 |
| [DCI Jingle, charged](docs/media/audio/dci-carica.mp3) | Short tech jingle, F# minor, 106 BPM | 0:30 |

## Where it comes from

A year ago I got hooked on [Switch Angel](https://www.youtube.com/@Switch-Angel)'s videos, especially [Coding Trance Music](https://www.youtube.com/watch?v=GWXCCBsOMSg). The idea of music as code with strudel.cc stuck with me: tracks built live, one line at a time.

This project combines that idea with what the new models can do, with my own twist. The first engine was rigid. I extended it with Claude, pushing at every round, until it could produce tracks with real structure: sections, transitions, odd meters, guitars and a balanced mix.

## What it does

- **Arranger.** A grid of tracks and sections. Sections hold tempo (with ramps), key, chords, meter (4/4, 3/4, 5/4, 7/8), swing and the entry (hard cut or fade). Tracks are free: any number of any instrument, each with its own patterns, mute and solo. Everything compiles to Strudel code in real time.
- **Find songs.** The Songs tab has one list with search (title, style, key, tags), filters by genre, style and kind (standard, live build, generated, yours, code), favourites and sorting. Style tags follow the Styles tab, and you can tag your own songs.
- **Two modes.** Listen (Compose, Songs, Playlists, Radio) to make and hear music; Groove Lab (Artists, Styles, Sounds, Guide, References) for what music is made of and for learning.
- **Record the radio.** Record a radio session as audio (Opus or WAV) with its track list and recipe, from now or from the start of the session, since a seed and its moves always replay the same.
- **Settings.** The gear in the top bar opens the settings: theme, language, the radio's visual and defaults, volume, export format (WAV or Opus), and a backup of everything in one file to move to another computer.
- **Keep what you write by hand.** After taking over a live build, "Save as a new version" keeps your code as a new code song ("Song · v2"), linked to the original, which stays as it is. Works in the radio too.
- **Steer the radio.** A console in the Radio tab changes the song on air at the next phrase: energy, instruments in and out, darker or dirtier, chords and key, more or less talk, go to the drop, stay, end. Drag the energy curve, mix and lock tracks, and replay a session with the same moves.
- **Transitions.** In the radio, songs turn into each other like in a DJ set: mix, morph, break and riser, echo out, interlude, or a plain cut, chosen by the artist's taste or by a menu, with compatible or free harmony. Playlists can mix saved songs too.
- **Playlists.** Favourites (the star on every song) and your own playlists, managed in the Playlists tab and picked in the Songs tab. Songs play one after another, with shuffle and repeat (whole playlist or one song) in the player bar. Export and import as JSON.
- **Songs as JSON.** Songs are files in `songs/` with a documented format, a validator and a command line tool, so people and agents can write them as code ([docs/COMPOSING.md](docs/COMPOSING.md)). Code tracks hold plain Strudel inside a song.
- **Instruments.** Drum sequencer with several drum machines, bass with riffs, guitar (clean, crunch, distorted, metal, palm muted) with riffs and stereo double tracking, arpeggio, hook with harmonies and dark modes, pad, texture (voices, metal hits, vinyl) and riser. Every instrument can use oscillators or General MIDI sounds, has its own rhythm steps, and bass, arpeggio and hook take notes written as chord or scale degrees.
- **Automation.** Volume, filter and tempo can move from the start to the end of a section. Drive, bitcrusher, resonance, FM and vowel filter are available too.
- **Player.** Clickable timeline, start from any bar, buttons to hear each transition between sections, section loop, pause and resume.
- **Included tracks.** About twenty tracks across genres: techno, trance, hard techno, industrial, dark club, metal, melodic metal, phonk, progressive rock, lo-fi and 90s arcade, plus a 30 second reel.
- **Sound browser.** Every sound Strudel loads (about 1,200 after removing aliases: 71 drum machines, 125 General MIDI instruments, sample banks, acoustic instruments, synths, your own samples) with search, categories, cards, list and keyboard-playable pads, pixel art pictures and free photos of famous drum machines. One click puts a sound in the selected track.
- **Visuals.** Eight canvas themes (Stage, Pixel, Sunset, Mountains, Space, Sonar, Edgerunners, Studio). Studio is the radio's recording studio, with an ON AIR light, a microphone that lights up when the voice speaks, the song and its comments on a screen, and a spinning record. Each instrument has its own audio analyser, so on the Stage the drums, bass, guitar, keys and FX light up when they play.
- **Hardware interface theme.** Switch from neon to hardware: knobs instead of sliders, small amber displays, power and activity LEDs on every channel, anodized panels.
- **WAV export.** Records the track in real time from Strudel's output and downloads a stereo WAV.
- **Custom samples.** Audio files placed in `public/samples/` become sounds you can use in tracks.
- **Player bar and volume.** A low bar at the bottom in every tab: play and pause, stop, previous and next song (in the radio: start the song again, skip), title and position, an ON AIR light, and one volume for the whole app with mute. The volume only changes what you hear: WAV exports keep their level.
- **Artists and styles.** Six artists with a pixel-art face, a bio and a taste (favourite styles, energy, pace, voice, quirks) make the radio's music, every song different; pick one in the Radio or start a new song from one in Compose. The Artists and Styles tabs show each one as a sheet, and you can duplicate, edit, create, export and import them ([docs/ARTISTS.md](docs/ARTISTS.md)).
- **Live coding by hand.** While a song builds itself, type in the code to take over: the steps stop and your code plays; "Resume live build" gives control back to the song, and your last code stays at hand.
- **Endless sessions (first phase).** A director writes sessions of songs from twelve style recipes (Berlin techno, trance, synthwave, lo-fi, drum and bass, ambient, phonk, industrial, jazz, country, classic rock, melodic metal), mixes styles with a chaos amount, follows energy shapes and builds each song live with spoken comments. Same seed, same music. The **Radio** tab plays them without end: pick styles, chaos, energy and complexity, press On air; a now playing card shows the song, its energy shape and the next changes; skip, save a song, open it in Compose, replay a session from its seed. The command line makes the same songs: `npm run endless -- --styles synthwave,jazz --seed aurora --join` ([docs/ENDLESS.md](docs/ENDLESS.md)).
- **Guide and sounds.** 14 lessons to listen to and a library to try drum machines, oscillators and samples.
- **Italian and English**, including the comments in the generated code.

## Ideas and next steps

The backlog lives in the [repository issues](https://github.com/alessandrodevecchi/coding-misk/issues). The main ideas:

- **Vocals.** Find out how to generate them, probably with a small local model.
- **Live coding.** Recreate a track built live, like in Switch Angel's videos.
- **Music for short videos.** Use the tracks as background music for reels and social content, with ready-made lengths and starting points.
- **Moods and presets.** Define reusable moods and presets to compose faster and with more variety.
- **More genres.** Keep exploring different styles, with fewer layers and more rhythm.

## Getting started

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

The app opens at <http://localhost:5173>. Space bar plays and pauses, `Ctrl+Enter` (or `⌘+Enter`) plays or updates, `Ctrl+.` stops.

## Branches

- `main` holds the stable version.
- `develop` collects changes being tried out. When a change is confirmed, `develop` is merged into `main`.

## Project layout

| Path             | Contents                                                            |
| ---------------- | ------------------------------------------------------------------- |
| `index.html`     | Interface markup                                                    |
| `src/main.js`    | Track library, arranger, controls, transport, Strudel editor wiring |
| `src/music.js`   | Keys, chords, presets, per-instrument code generator                |
| `src/song/`      | Song format: compiler, validator, converter from older saves        |
| `songs/`         | Included songs as JSON, `songs/examples/` for the guide             |
| `src/endless/`   | Endless director: recipes, mixing, energy shapes, moves, sessions   |
| `styles/`        | Style recipes for endless sessions                                  |
| `src/songs.js`   | Reads sections and tempo from a track's code                        |
| `src/visuals.js` | Canvas visuals synced to the audio                                  |
| `src/i18n.js`    | Italian and English strings                                         |
| `src/content.js` | Lessons, sound library, references                                  |
| `src/style.css`  | Styles and themes                                                   |
| `vite.config.js` | Plugin that serves the samples in `public/samples/`                 |
| `patterns/`      | Example patterns and hand-written tracks, also usable on strudel.cc |

## Connecting an instrument to the visuals

Add `.analyze("name")` to a layer. Names the Stage understands: `kick`, `snare`, `hats`, `fx`, `bass`, `guitar`, `arp`, `pad`, `hook`, `riser`. Code without a tag uses a generic channel.

## Custom samples

Put WAV, MP3, OGG or FLAC files in `public/samples/`: one folder per instrument (`voice/01.wav` becomes `s("voice").n(0)`) or a single file (`swoosh.wav` becomes `s("swoosh")`). The sounds show up in the Texture channel and in the Sounds tab after a reload. Details in `public/samples/README.md`.

## Technical notes

- Strudel is an npm dependency (`@strudel/repl`), not a fork. To update it: `npm update @strudel/repl`.
- Samples are downloaded from GitHub on first use, so a connection is needed. The app loads the full dirt-samples archive.
- The player changes the tempo bar by bar. A `.cps()` inside a pattern makes the scheduler drop notes.
- Songs compile to code with two lines read by the player, with single quotes: `const SECTIONS = [['intro', 8], …]` and `const TEMPO = {'intro': 132, 'build': [132, 140], …}`.
- In Strudel code, double quotes and backticks are mini-notation. Plain JavaScript strings use single quotes; `mini('…')` turns them into patterns.
- Tempo ramps, starting from a bar and the extra samples only work in coding-misk, not on strudel.cc.
- Saved tracks and the current draft live in the browser's `localStorage`. Clearing site data deletes them.
- Strudel is licensed under AGPL-3.0. If the project is published, its code must be released under a compatible license.

## License

AGPL-3.0-or-later, the same license as Strudel. See [LICENSE](LICENSE). Drum machine photos come from Wikimedia Commons under their own licences: see [public/sounds/photos/CREDITS.md](public/sounds/photos/CREDITS.md).
