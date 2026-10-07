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
| `id`           | Required. Lowercase letters, digits and hyphens, the same as the file name.               |                         |
| `name`         | Required. `{ "en": "...", "it": "..." }`                                                   |                         |
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
| `voice`        | Settings of the voice track: `gain`, `pitch`, `tempo`, `cutoff`, `hpf`, `drive`, `room`, `delay`. | voice track defaults |
| `words`        | Required. Title words: `{ "en": [...], "it": [...], "es": [...] }`, at least 3 each.       |                         |

Energy shapes: `build-drop`, `slow-burn`, `waves`, `flat-groove`, `verse-chorus`, `late-peak`, `descent`.

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
| `voice`   | `voice`                                                    |

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
