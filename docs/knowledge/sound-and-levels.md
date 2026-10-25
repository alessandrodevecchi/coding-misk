---
id: sound-and-levels
related: [sounds, songs, material, export, checks, pitfalls]
code: [src/song/rack.js, src/sounds/limiter.js, src/sounds/sound-guard.js, src/sounds/soundfont-fix.js, tools/output-peak.cjs, tools/check-levels.cjs, tools/snapshot-levels.cjs, tests/snapshots/levels.json]
checks: [node tools/check-levels.cjs, node tools/snapshot-levels.cjs, node tools/check-export.cjs, npm run check:sound-guard, node tools/check-sounds.cjs]
---

# Sound and levels

## What it is

How loud each part is, how the app keeps it below clipping, and the devices that shape a sound. Read this before adding a sound, a preset, a rack device or a style, and before touching gains.

**Levels.** Every track line ends with `.analyze("<instrument>")`. The browser tools read those analysers and report each instrument's peak per section, before the master. All lines together go to Strudel's master, which the app keeps at 0.6, and then to the output. The audio inside the browser is floating point: a line above 1.0 does not clip by itself. Only the output clips, and an exported file, where a sample cannot go above full scale.

**Master limiter.** The last stage of the output, in the app and in every export (fast and real time, radio, video, fragments): `src/sounds/limiter.js`. The lines are summed, multiplied by the master level and the style's push, and pass a look-ahead peak limiter (an audio worklet): the sound is delayed 5 ms and the gain falls before a peak arrives, so no sample leaves above the ceiling, 0.97 (-0.26 dBFS; 0.95 until v0.6.0-beta.2). It releases in about 0.12 s. Below the ceiling the gain is exactly 1: the sound is unchanged, only 5 ms later (the render page removes that delay from files). A wave shaper after it, the identity up to the ceiling, caps the output at 0.99 whatever happens. The limiter is a safety net: a mix that leans on it hard (the level into it far above the ceiling) loses its peaks and sounds squashed.

**Push.** A style's `headroom` is also how hard its songs push into the limiter: the level into it is multiplied by the headroom (1.3 is +2.3 dB), so the mix gets louder and denser and the output still stays below the ceiling. A song without styles, or whose styles set no `headroom`, pushes none; a song with several styles takes the highest.

**Output peak.** `tools/output-peak.cjs` reads the peak of the master output (an analyser per channel on `destinationGain`, after the limiter) and of the fast export's render and files, and the level into the limiter (`in=` in `check-levels.cjs`: the output the song would have without the limiter). The output is the hard limit: above 1.0 the level tools, `check-transitions.cjs`, `check-spoken-play.cjs` and `check-export.cjs` fail, and name the song, the section or the time. With the limiter it stays at the ceiling (0.97) at most.

**Headroom.** A track line above the headroom of its song's styles is a warning, never a failure by itself. The headroom is 1.0 unless a style recipe sets `headroom` (1.0 to 1.5) for a loud genre; a song with several styles takes the highest. The output limit stays 1.0 whatever the headroom.

**Saturation comes from the sound.** A dirty, saturated sound is made with distortion: `crunch` and `grit` on a track, the `distort` and `shape` rack devices, a driven filter (`drive`). Raising `gain` to get it is a mistake: the line gets louder, the sum at the output goes past 1.0 and the output clips, which sounds harsh and is not the sound a style asks for. Set the level after the distortion with `postgain`.

**Rack.** A track can carry a chain of devices after its instrument (`rack` in the song). Note devices change what is played; sound devices change how it sounds. Each device is one or two Strudel calls.

**Sound guard.** Some soundfont files are broken upstream. The guard plays a stand-in font instead of silence, and an export names a sound it had to skip. A drum row a kit lacks is mapped to the nearest row by the compiler (`kitRow` in `src/music.js`). It remembers what it learned in the browser, per soundfont library version.

## How it connects

- **Sounds** ([sounds.md](sounds.md)): the inventory, and the missing sounds the guard covers.
- **Songs** ([songs.md](songs.md)): `gain`, `postgain` shapes, `drive`, `grit` and `rack` are track settings.
- **Material** ([material.md](material.md)): composed FM sounds stay inside `FM_RANGES` so they stay under clipping.
- **Export** ([export.md](export.md)): exports take the master level, the push and the limiter, so the app volume never changes a file.
- **Checks** ([checks.md](checks.md)): level snapshots need the dev server and are never rewritten without a reason.

## Options

<!-- generated:rack-devices -->
| Device | Name | Kind | Arguments: range (default) |
| --- | --- | --- | --- |
| `echo` | Echo (it: Eco) | note | count 2-8 (3); time 0.0625/0.125/0.1875/0.25/0.375/0.5 (0.125); feedback 0-0.95 (0.5) |
| `off` | Offset copy (it: Copia sfasata) | note | time 0.0625/0.125/0.1875/0.25/0.375 (0.125); semitones -24-24 (12) |
| `ply` | Repeat notes (it: Ripeti le note) | note | times 2-4 (2) |
| `degrade` | Random drop (it: Togli a caso) | note | amount 0-0.9 (0.3) |
| `rev` | Reverse each bar (it: Al contrario) | note |  |
| `jux` | Stereo reverse (it: Stereo al contrario) | note |  |
| `seg` | Steps (it: Passi) | note | steps 4/8/16 (16) |
| `delay` | Delay | sound | amount 0-1 (0.4); time 0.0625/0.125/0.1875/0.25/0.375/0.5 (0.1875); feedback 0-0.9 (0.45) |
| `reverb` | Reverb (it: Riverbero) | sound | amount 0-1 (0.4); size 0-1 (0.6) |
| `distort` | Distortion (it: Distorsione) | sound | amount 0-8 (2) |
| `shape` | Saturation (it: Saturazione) | sound | amount 0-0.95 (0.4) |
| `crush` | Bit crush | sound | bits 1-16 (6) |
| `coarse` | Sample rate (it: Campionamento basso) | sound | amount 1-32 (8) |
| `phaser` | Phaser | sound | rate 0.1-8 (1); depth 0-1 (0.6) |
| `tremolo` | Tremolo | sound | rate 1-32 (8); depth 0-1 (0.7) |
| `vowel` | Vowel filter (it: Filtro vocale) | sound | vowel a/e/i/o/u (a) |
| `hpf` | High-pass (it: Passa-alto) | sound | cutoff 20-8000 (400); reso 0-20 (0) |
| `lpf` | Low-pass (it: Passa-basso) | sound | cutoff 100-18000 (2000); reso 0-20 (0) |
| `fm` | FM | sound | index 0-4 (1); harmonicity 0.5/1/1.01/2/2.01/3/3.5/4 (1); wave sine/triangle/square/sawtooth/pink/brown (sine); decay 0.05-1 (0.3); sustain 0-1 (0.5); index2 0-3 (0); harmonicity2 1-10 (1) |
| `pan` | Pan (it: Panorama) | sound | position 0-1 (0.5); motion fixed/slow/fast (fixed) |
<!-- /generated -->

<!-- generated:levels -->
Peak levels per instrument in `tests/snapshots/levels.json` (26 built-in songs, every section): how many sections, median and highest peak. A line above 1.0 is a warning (above its style's `headroom`); the master output and exported files above 1.0 clip and fail the checks.

| Instrument | Sections | Median peak | Highest peak |
| --- | --- | --- | --- |
| `arp` | 69 | 0.16 | 0.51 |
| `bass` | 126 | 0.33 | 0.94 |
| `fx` | 74 | 0.06 | 0.62 |
| `guitar` | 39 | 0.48 | 0.89 |
| `hats` | 129 | 0.34 | 1.24 |
| `hook` | 71 | 0.13 | 0.69 |
| `kick` | 130 | 0.5 | 0.9 |
| `pad` | 101 | 0.18 | 0.43 |
| `riser` | 23 | 0.07 | 0.16 |
| `snare` | 107 | 0.44 | 0.76 |

Snapshot tolerance (`tools/snapshot-levels.cjs`): 0.12 absolute, floor 0.03, per instrument { guitar: 0.25 }; `fx` is recorded, not compared. Master level: `MASTER = .6` in `src/main.js`.
<!-- /generated -->

Targets for a new part, from the snapshots and `docs/COMPOSING.md`:

- Kick and lead parts peak around 0.5. Pads, arps and textures stay lower (0.1 to 0.3).
- No single line above 0.9 unless the style sets a `headroom`. Above the headroom the level tools warn.
- The level into the limiter (`in=`) at or below the ceiling for a clean song: then the limiter never acts. A little above it in the loudest moments is fine; far above (1.2 and more) the peaks are squashed, so lower the loudest lines.
- The master output below 1.0 in every section, and every exported file below full scale. The limiter makes sure of it; the checks still fail on it.
- 4 to 5 tracks at once. More lines raise the sum at the master.
- General MIDI sounds differ a lot: organs and vibraphone are quiet, electric piano is loud. Measure, then set `gain`.
- Heavy drive: set the level with `postgain` after the distortion, not with `gain`.

Measured 2026-10-19 (level-headroom): the hats of `neon-rush-reel` peak at 1.16 to 1.23, and before the limiter its output peaked at 1.13 to 1.23 in the Drop, the Glitch break and the Final: that output clipped. A line above 1.0 is not needed for the output to clip: `drift` and `ferro` stay below 1.0 on every line and their exports reached 1.29 and 1.23. With the limiter every built-in song stays at 0.95 at most, live and in exports; the songs themselves are unchanged. The full list is in `DEVLOG.md` (2026-10-19).

## Example

Measure a new song, then record its snapshot:

```sh
export PLAYWRIGHT_CORE=/opt/homebrew/opt/playwright-cli/libexec/lib/node_modules/@playwright/cli/node_modules/playwright-core
npm run dev    # in another terminal: the tools need http://localhost:5173
node tools/check-levels.cjs my-song                 # peaks per section and instrument, page errors
node tools/snapshot-levels.cjs write my-song        # only once the levels are right, with the reason in the commit
node tools/snapshot-levels.cjs check                # every song against tests/snapshots/levels.json
```

Do not edit files under `src/` while a level tool runs: Vite reloads the page and the rest of the run measures silence. A level that moves once and comes back on a second run is measurement noise (guitars, `fx`): run it twice before changing anything.

## Where to read more

- [docs/COMPOSING.md](../COMPOSING.md#checking-levels): checking levels.
- [docs/MUSIC-ENGINE.md](../MUSIC-ENGINE.md#strudel-gotchas-learned-the-hard-way): gain, velocity and drive gotchas.
- [docs/COMPOSING.md](../COMPOSING.md#the-rack): the rack in Compose.
- `tools/check-sounds.cjs`: fetches and decodes every soundfont zone and sample (long, unattended).
