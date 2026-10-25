# Style recipes

A style recipe describes a genre or mood as data. The endless director (`#18`, phase `#21`) reads recipes from `styles/` and makes songs from them. A recipe only names building blocks the app already has: presets, grooves and chord progressions from `src/music.js`, drum machines, and sounds. It contains no code.

Check recipes with:

```sh
node --no-warnings tools/style.mjs validate            # every recipe in styles/
node --no-warnings tools/style.mjs validate styles/jazz.json
node --no-warnings tools/style.mjs list                # id, names, tempo, parts
npm run check:endless                                  # recipes plus director checks
node tools/check-style-sounds.cjs                      # every named sound is loaded (dev server, Playwright)
```

The validator prints each problem with its JSON path, like the song validator. Errors make a recipe unusable. Unknown sound names are warnings, because sounds load at run time; the browser check confirms them.

## Fields

One recipe per file, `styles/<id>.json`. Required fields are marked.

| Field          | Value                                                                                      | Default                 |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------- |
| `format`       | Format version of the file (1). Fields added by later versions take their defaults when missing. | `1` |
| `id`           | Required. Lowercase letters, digits and hyphens, the same as the file name.               |                         |
| `name`         | Required. `{ "en": "...", "it": "..." }`                                                   |                         |
| `genre`        | One genre of the song library: `techno`, `trance`, `house`, `synthwave`, `drum-and-bass`, `industrial`, `rock`, `metal`, `hip-hop`, `pop`, `jazz`, `country`, `ambient`, `experimental`. Songs tagged with the style count under this genre. | `experimental`, with a warning |
| `family`       | Optional family of styles across genres, for example `live-coder` (Gated trance, Pure trance, Acid, House): shown together in the style list. Renamed styles keep working under their old ids (`switch-trance` reads as `gated-trance`, `switch-trance-pure` as `pure-trance`, `switch-acid` as `acid`, `switch-house` as `house`, family `switch` as `live-coder`), in saved songs, artists, radio settings and sessions. |
| `buildStyle`   | Optional `crescendo` or `blocks`: songs whose drums come from this style declare it and open with it in Compose. |
| `profile`      | Optional performance profile (`classic`, `crescendo`, `switch`) of the songs whose drums come from this style: they open with it in Compose. |
| `description`  | One sentence on the sound of the style, for people and agents.                             |                         |
| `tempo`        | Required. BPM range `[low, high]`, within 40 to 240.                                       |                         |
| `keys`         | Required. Keys the songs can use: `E F F# G A B C D`.                                      |                         |
| `progressions` | Required. Chord progression names from `PROGS` in `src/music.js`.                          |                         |
| `meters`       | Meters: `4/4`, `3/4`, `5/4`, `7/8`.                                                         | `["4/4"]`               |
| `swing`        | Swing range `[low, high]`, 0 to 1.                                                          | `[0, 0]`                |
| `shapes`       | Required. Energy shapes the style allows (see below).                                      |                         |
| `minutes`      | Song length range in minutes, within 2 to 6.                                               | `[3, 5]`                |
| `phrase`       | Phrase length in bars: 4, 8 or 16. Moves happen on phrase boundaries.                      | `8`                     |
| `tracks`       | `{ "usual": [low, high], "max": n }`: tracks playing at once, usually and at most.         | `{ usual: [4, 5], max: 8 }` |
| `energy`       | Weights of the energy measure: `tracks`, `drums`, `filter`, `drive`, each 0 to 1.          | `0.4, 0.3, 0.2, 0.1`    |
| `voice`        | The base of the voice: `speakers` (system voices that speak English and Italian: `eddy`, `flo`, `grandma`, `grandpa`, `reed`, `rocko`, `sandy`, `shelley`, or `""` for the default; `speaker` for just one) and the voice track settings `gain`, `pitch`, `tempo`, `cutoff`, `hpf`, `drive`, `room`, `delay`, each a number or a range `[low, high]`. Each song draws its own values; see "Voice" in `docs/ENDLESS.md`. | voice track defaults |
| `spoken`       | Optional voice instrument (voice-instrument): `{ "weight": 0.3, "ways": { "refrain": 2, "passage": 1 }, "lines": { "refrain": [{ "en": "…", "it": "…" }] }, "speakers": ["reed"], "vocab": "dark" }`. `weight` (0 to 1) is the chance that a song gets a spoken track; `ways` weights `passage`, `refrain`, `chop`, `opening`; `lines` the style's own lines by way (at most 12 words); `speakers` who speaks them (never the narrator's speaker of the song); `vocab` the vocabulary group of drawn lines (`dark`, `calm`, `machine`, `night`). Without it the style's songs have no voice instrument. See "Voice instrument" in `docs/ENDLESS.md`. | none |
| `narrator`     | Optional narrator style of its songs: `"explain"` (default) or `"poetic"` (short images before each track comes in), or `{ "style": "poetic", "lines": { "bass": [{ "en": "…", "it": "…" }] } }` with the style's own images by track type. | `"explain"` |
| `growthShapes` | Optional weights of the growth shapes its songs draw in a Live coder build: `{ "openings": { "full-kick": 3 }, "paces": { "fast": 2 }, "developments": { "by-type": 1 } }` (see Growth shapes below). |                         |
| `headroom`     | Optional. The peak a track line of the style's songs may reach before the level checks warn, 1.0 to 1.5. A loud genre may let single lines go higher, because every line passes the master level first. It is also the push into the master limiter: the song's level into it is raised by the headroom (1.3 is +2.3 dB), for a louder, denser mix; the highest among a song's styles counts, 1.0 pushes none. The master output and exported files never go above 1.0, whatever the headroom; make a dirtier sound with distortion (`crunch`, `shape`, filter drive), not with more gain. | `1.0` |
| `words`        | Required. Title words: `{ "en": [...], "it": [...], "es": [...] }`, at least 3 each.       |                         |

Energy shapes: `build-drop`, `slow-burn`, `waves`, `flat-groove`, `verse-chorus`, `late-peak`, `descent`.

Growth shapes (growth-shapes): how a song of the style opens and grows when it builds with the Live coder profile. `openings`: `slow`, `full-kick`, `typed`, `broken`, `filtered`, `melodic`, `pad`, `voice`, `muted-base`, `mid-set`; `paces`: `slow`, `medium`, `fast`; `developments`: `by-type`, `as-written`, `masks`, `parameters`, `second-section`, `metamorphosis`. Each part is drawn by weight when the song names none; a part the recipe leaves out uses the defaults (`docs/COMPOSING.md`, Growth shapes). The Live coder styles carry weights from the research: Gated trance and Pure trance a full kick and a fast pace, Acid a filtered kick and a medium pace, House a broken beat or a muted base; Ambient and Lo-fi a pad or a melody and a slow pace. The metamorphosis takes the parts of another style of the same `family`.

## Instruments

Each instrument is an optional object. A recipe needs at least one. When an instrument is missing, songs made only from that recipe never get a track of that kind.

| Instrument | Lists                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------- |
| `drums`    | `kits` (drum machines, for example `RolandTR909`), `grooves` (names from `GROOVES`)       |
| `bass`     | `presets` (from `BASS`), `waves` (sounds)                                                  |
| `arp`      | `presets` (from `ARPS`), `waves`, `speeds` (`"8"` or `"16"`)                               |
| `hook`     | `presets` (from `HOOKS`), `waves`, `modes` (`minor`, `phrygian`, `dorian`, `mixolydian`, `locrian`, `chromatic`) |
| `pad`      | `presets` (from `PADS`), `waves`                                                           |
| `guitar`   | `patterns` (from `GUITAR_PATTERNS`), `types` (`clean`, `crunch`, `distorted`, `metal`, `muted`) |
| `texture`  | `samples` (`vinyl`, `numbers`, `industrial`, `metal`, `glitch`, `space`, `wind`, `crow`), `rhythms` (from `TEX_RHYTHMS`) |
| `riser`    | No lists: `{}` allows a riser before big moments.                                          |

Every instrument also takes:

- `settings`: track settings, each a number or a range `[low, high]` the director draws from, for example `"cutoff": [400, 1200]`. Setting names are those of the song format for that track type.
- `weight`: how likely the director is to use the instrument, 0 to 1 (default 1).

`waves` accepts the instrument sounds of the Compose menus, the built-in synths (`sawtooth`, `square`, `sine`, …) and any General MIDI sound (`gm_…`).

### Material

`drums`, `bass`, `arp`, `hook`, `pad` and `guitar` also take `material`: where the instrument's parts come from in the songs of the style (material generator, `docs/ENDLESS.md` "Material").

```json
"hook": { "material": { "source": "mix", "share": 0.4, "rules": ["polymeter", "tail", "call-response"] }, "presets": ["neon", "pioggia"] },
"drums": { "material": { "source": "mix", "share": 0.3, "families": ["four-floor", "two-step"] }, "grooves": ["techno"] },
"bass": { "material": { "source": "mix", "share": 0.5, "rules": ["rolling", "octaves"], "sounds": ["reese", "saw"] } },
"pad": { "material": { "source": "mix", "share": 0.3, "rules": ["style"] }, "presets": ["pad", "stab"] }
```

| Field | Value | Default |
| --- | --- | --- |
| `source` | `preset` (the lists above), `generated` (parts composed for each song), `mix` (some songs each) | `preset` |
| `share` | With `mix`: the share of songs with a composed part, 0 to 1 | `0.5` |
| `families` | Drums only: groove families the generator may use: `four-floor`, `breakbeat`, `two-step`, `half-time`, `euclid` | all |
| `rules` | Melody (`hook`): `polymeter`, `tail`, `call-response`, `dark`. Bass: rhythm families `half`, `offbeat`, `pulse`, `rolling`, `gallop`, `sixteenths`, and `roots`, `octaves`, `fifths`, `shared`. Arp: `up`, `updown`, `pedal`, `skips`, `random`. Pad and guitar: `style`, `mode` (a new progression on the degrees of the mode), `sevenths`, `power` | all |
| `sounds` | Melodic instruments: sound kinds for composed parts: `bell`, `reese`, `growl`, `dirty`, `saw`, `square` (FM within the generator's range table) | the recipe's `waves` |

An instrument without `material` uses its presets only. The validator rejects an unknown source, family, rule or sound kind, and a share outside 0 to 1, with the JSON path and the known names. Composed parts come in only with complexity above 0, and a radio or session can override every recipe with its own material source (`patterns`, `varied`, `composed`, or `mix` to follow the recipes).

The built-in styles use `mix` with a modest share (0.2 to 0.5): presets stay the larger share where a style lives on its signature grooves and riffs (live coder styles, acid, house, jazz, country, rock, metal), every style with a pad composes it in 0.3 of its songs with the rule `style` (the song's own chords voiced near `c4`, held or as stabs, at 0.6 of the pad gain; never `mode`, so the harmony stays the song's), guitars keep presets, and FM sounds are named only by drum and bass (`reese`) and darksynth (`growl`, `dirty`) basses. The owner approved composed pad chords after listening in Compose (`#71`); the other shares and the FM lists still wait for his listening test.

## Mixing

Several styles can be selected at once, with a chaos amount from 0 to 1. Each song takes each of its parts from one style:

| Part      | Recipe fields                                              |
| --------- | ---------------------------------------------------------- |
| `tempo`   | `tempo`, `shapes`, `minutes`, `phrase`, `tracks`, `energy` |
| `drums`   | `drums`                                                    |
| `bass`    | `bass`                                                     |
| `harmony` | `keys`, `progressions`, `meters`, `swing`                  |
| `lead`    | `arp`, `hook`                                              |
| `pads`    | `pad`, `guitar`, `texture`, `riser`                        |
| `voice`   | `voice`, `spoken`, `narrator`                              |

The rules:

- With one style, every part comes from it.
- With chaos 0, every song takes all its parts from one style, and songs rotate through the selection in order.
- With chaos 1, each part is drawn on its own, evenly among the selected styles.
- In between, the rotating style dominates, and each part comes from another selected style with probability `chaos × (n − 1) / n`, where `n` is the number of styles.
- A part taken from a style that lacks it stays empty: jazz pads with no `guitar` give no guitar track.
- Title words come from every style the song uses.

## Adding a style

1. Copy a recipe close to the new style into `styles/<id>.json` and change `id`, `name` and `description`.
2. Pick presets and grooves by listening in Compose. Missing building blocks go into `src/music.js` as ordinary presets, so Compose can use them too; then run `npm run check:code`.
3. Keep the owner's taste rules (`docs/CONTEXT.md`): 4 to 5 layers, tension over sweetness, dark club references, unless the genre needs otherwise.
4. Run `node --no-warnings tools/style.mjs validate` and `node tools/check-style-sounds.cjs`.
5. Generate a session with the new style and listen to it before committing.
