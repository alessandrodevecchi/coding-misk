# Design system

Retro-futuristic synthwave by default, with a per-visual accent palette and an optional hardware theme. All styles live in `src/style.css`; tokens are CSS custom properties on `:root`.

## Tokens

Base (Sunset look): `--bg #0d0818`, `--panel #160f26`, `--panel2 #1f1534`, `--line #3a2a5c`, `--ink #f3ecff`, `--muted #a597c7`, `--a1 #ff4fa3` (primary accent), `--a2 #ffb347` (secondary accent). Step colors of the 909-style sequencer: `--s1 #ff4f6d`, `--s2 #ff8a3d`, `--s3 #ffd23d`, `--s4 #f4f0ff` (one color per beat group).

Each visual sets `data-look` on `<html>` and overrides the tokens:

| Look                     | `--bg`    | `--a1`    | `--a2`    |
| ------------------------ | --------- | --------- | --------- |
| `palco` (Stage, default) | `#0a0614` | `#ff2e88` | `#00e5ff` |
| `pixel`                  | `#0f0f1b` | `#ffcc33` | `#ff5577` |
| `tramonto` (Sunset)      | `#0d0818` | `#ff4fa3` | `#ffb347` |
| `montagne` (Mountains)   | `#070d1d` | `#4fe3ff` | `#a98bff` |
| `spazio` (Space)         | `#06050d` | `#a495ff` | `#ff7ad9` |
| `sonar`                  | `#03110d` | `#3dffb0` | `#d4ff5a` |
| `edgerunners`            | `#0b0410` | `#fcee0a` | `#00f0ff` |
| `studio`                 | `#0b0710` | `#ffb347` | `#ff2a3d` |

The UI is dark only, by design.

## Typography

- Logo: "coding" in `Mr Dafoe` (neon script, white with `--a2` glow) over "MISK" in `Russo One` (chrome gradient, skewed), on a perspective grid, with an 8-bar equalizer driven by the instruments.
- UI: `Chakra Petch`. Code, numbers, readouts: `JetBrains Mono`. Hardware LCD: `VT323`.
- Labels (`.lbl`): 11px, uppercase, letter-spacing .14em.

## Components

- `.card` panels, `.btn` (primary uses `--a1`), `.chip` toggles, `.tab`, `.led` channel switch, `.ramp` automation toggle (↗), `.arr-scene-btn` scene blocks (width proportional to bars, `.playing`, `[aria-current]`), `.timeline` with `.sec` blocks and `.head` playhead, `.step` sequencer keys (drum grid and `.chsteps` rows in melodic channels), arranger grid (`.arr-strip` sections and `.arr-grid` rows share one CSS grid template: a `--trk-col` label column, then `minmax(54px, <bars>fr)` per section; `.trk-row` with `.trk-head` name, `.mini` mute/solo keys, `.trk-cell` cells: `.on` pattern clip, `.custom` striped partial clips, `*` marks per-section overrides), `.track-panel` (header, pattern chips, `.tp-editor` with drum grid, `.chsteps` step row, `.notegrid` degree grid, code textarea; `.ctrl.over` marks a setting overridden in the selected section), rack (`.device` cards with `.led` bypass, `.dev-head` code preview, `.dev-args`), section view (`.srack` with `.scard` compact cards, `.hits` read-only rhythm), full section view (one `.tp-host.tp-full` panel per playing track, `[aria-current]` on the selected one), player ruler (`.arr-ruler`: `.ruler-time` current / total, `.ruler-track` slider with bar numbers, `.ruler-fill` and `.ruler-knob`; positions map through the section blocks, so it works in both views), free timeline (`.tl-mode` on the arranger: gapless proportional section strip, `.trk-lane` with bar ticks and `.sec-line` section dividers, `.clip` blocks positioned in % of the song with a `.clip-grip` resize edge, `.clip.free` for `start`/`bars` clips), sound browser (`.sb-top` search and view chips, `.sb-cats`, `.sb-groups` with pixel icons, `.sb-cards` / `.sb-list` / `.sb-pads` results, `.sb-insp` inspector with `.sb-photo` and `.sb-credit`; `img.px` is pixel art scaled with `image-rendering: pixelated`), code panel (`.code-resize` grip up to 50% width, `.code-collapsed` rail, `.codecol.full` overlay).
- Player bar (`.pbar`, fixed at the bottom, 52 px, the page keeps that much bottom padding): `.pb-btn` round icon keys, the `.play` key, `.pb-now` with `.pb-onair` (red when lit), `.pb-title` and `.pb-pos`, `.pb-vol` volume with mute; the same volume next to the radio controls (`.radio-vol`). On phones the position and the previous key are hidden and ON AIR becomes a dot.
- Radio (`.radio`): `.radio-grid` controls and now playing card, `.onair` light, `.ctrls.four` sliders on two rows in a narrow panel (container query), `.radio-curve` energy line. Curves of the song on air (`.curves`, `#40`, look `#47`): energy on top as the main curve (grid, part names, `.charge` zone), detail lanes (`.radio-lane[data-lane]`, one colour each) folded under `.curves-toggle`; small squares hollow when automatic and filled when set, a glow on set parts, the past shaded, a `.curve-tip` box with every value on hover or while dragging. HW theme: each curve in a dark `.screen`, amber traces, set parts warm white, the position green.
- Toasts for feedback; two-tap confirmation instead of `confirm()`.

## Navigation

Two modes at the top of the work area (`#42`): **Listen** (Compose, Songs, Playlists, Radio) to make and hear music, and **Groove Lab** (Artists, Styles, Genres, Sounds, Guide, References) for the material music is made of and for learning. The mode buttons are large toggles with the tab names as a subtitle (hidden on phones); in the hardware theme they are latching keys with a lamp. Under them, the tabs of the mode. Each mode remembers its last tab; a link to a tab of the other mode switches mode. The live code stays on the right in both modes and can be collapsed; the settings open from the gear next to the code, with no mode lit.

## Hardware theme (`data-ui="hw"`)

Switch NEON/HW in the top bar (`coding-misk-ui`). Anodized panels with screws, rubber keys, amber LCD fields (`--lcd-bg #1b1306`, `--lcd-fg #ffb347`, `VT323`), knobs replacing range inputs (arc in `--a1`, pointer cap rotating -135° to +135°), power LEDs on channel switches, green activity LEDs (`--led #39ff6a`) driven by each channel's level, bezels around the stage and the code editor. Knobs drive the hidden original inputs, so keyboard use and state stay the same. The player bar becomes a brushed panel with square mechanical keys (they sink when pressed), an amber display for title and position, a small volume knob and a round red ON AIR lamp.

## Visuals (`src/visuals.js`)

Each theme reacts to per-instrument levels and onsets (kick echoes and flashes, hats sparkles, snare glitch, guitar shake, pad and hook glows, riser sparks) and draws the summed waveform.

- **Palco (Stage):** cyberpunk stage laid out in units: hi-hat, kick, snare and crash (lit by FX), bass cabinet, guitar amp stack with an electric guitar, keyboard and arp sequencer, lead synth with oscilloscope, FX sampler pads, Tesla coil (riser). LED wall with the waveform, light beams, skyline. Labels on one row.
- **Pixel:** 200px-wide buffer scaled up: dithered sky, banded sun, low-poly mountains, city with lit windows, road, bouncing car.
- **Tramonto:** synthwave sun, perspective grid, waveform on the horizon.
- **Montagne:** wireframe ridges reacting to bass and guitar, moon with echoes.
- **Spazio:** nebulae, warp starfield, waveform aurora, rising ringed gas giant, moon, comets, retro ship.
- **Sonar:** radar sweep per bar, echo rings, blips.
- **Studio** (`#28`, the radio's look by default): acoustic foam wall, an ON AIR light lit while the radio is on air, a microphone whose ring lights up and sends waves while the voice speaks, a screen with the song, artist, styles, bar and the last spoken comment typed out, a radio dial whose needle finds the station, two VU meters, a desk with one fader per instrument and a turntable that spins at the song's tempo. A look picked while the radio plays becomes the radio's look.
- **Edgerunners:** halftone moon, layered city with cyan rim light and holo signs, elevated train, anime speed lines, glitch slices with RGB split, cyberware HUD.

The stage area has a CRT scanline overlay; visuals respect `prefers-reduced-motion`.
