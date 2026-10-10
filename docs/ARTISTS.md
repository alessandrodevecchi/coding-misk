# Artists

An artist gives the endless director a personality (`#35`): a profile people recognise and a taste that shapes every song. An artist never fixes a value. It gives weights and ranges, and each song draws its own, so songs by the same artist differ while keeping a character. Built-in artists live in `artists/`; the user's artists live in the browser (Artists tab) and can be exported as JSON.

```sh
node --no-warnings tools/artist.mjs validate          # every artist in artists/
node --no-warnings tools/artist.mjs list
npm run endless -- --artist night-owl --minutes 20    # a session by one artist
```

## Format

| Field        | Value                                                                                          | Default            |
| ------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| `format`     | Format version (1). Fields added by later versions take their defaults when missing.          | `1`                |
| `id`         | Required. Lowercase letters, digits and hyphens.                                               |                    |
| `name`       | Required. Stage name, up to 40 characters.                                                     |                    |
| `bio`        | Required. `{ "en": "...", "it": "..." }`, one or two sentences.                                |                    |
| `inspiredBy` | Optional text: an artist, a scene, a place.                                                    |                    |
| `portrait`   | Required. `{ "seed": "any text", "palette": "violet" }`: the pixel-art face is drawn from them. |                    |
| `styles`     | Required. Favourite styles with weights, for example `{ "berlin-techno": 3, "industrial": 1 }`. |                    |
| `explore`    | Chance (0 to 1) that a song uses a style outside the favourites.                                | `0.1`              |
| `chaos`      | Range `[low, high]` from 0 to 1: how much a song mixes its favourite styles.                    | `[0.1, 0.5]`       |
| `energy`     | Range from 0 to 1.                                                                              | `[0.4, 0.8]`       |
| `complexity` | Range from 0 to 1.                                                                              | `[0.3, 0.7]`       |
| `talk`       | Range from 0 to 1: how often the voice comments.                                                | `[0.3, 0.6]`       |
| `pace`       | Range from 0 to 1: below 0.3 calm (phrases go by without moves), above 0.7 busy (an extra move). | `[0.4, 0.6]`      |
| `shapes`     | Energy shapes with weights; only those the song's style allows are used.                       | the style's shapes |
| `moves`      | Kinds of move with weights: a bonus when the director scores them.                              | none               |
| `voice`      | `{ "characters": { "deep": 2 }, "chance": 0.4 }`: voice characters by weight and how often one is used. | `chance` 0.35 |
| `quirks`     | Quirks with their chance per song, for example `{ "no-guitars": 1 }`.                           | none               |
| `transitions` | `{ "kinds": { "mix": 3, "break": 1 }, "bars": [8, 16], "harmony": "compatible" }`: transitions to the next song by weight (`mix`, `morph`, `break`, `echo`, `interlude`, `cut`), their length in bars, and `compatible` or `free` harmony (docs/ENDLESS.md, Transitions). | mix 3, cut 2, morph, break and echo 1, interlude 0.5; 8 to 16 bars; compatible |

Palettes: `violet`, `neon`, `amber`, `ice`, `blood`, `forest`, `sunset`, `mono`. Kinds of move: `add-drums`, `add-bass`, `add-lead`, `add-pad`, `add-guitar`, `add-texture`, `strip`, `variation`, `brighter`, `darker`, `dirtier`, `cleaner`, `more-space`. Voice characters: `radio`, `robot`, `deep`, `bright`, `cathedral`, `echo`, `dirty`, `slow`.

## Quirks

| Quirk           | What it does                                                         |
| --------------- | -------------------------------------------------------------------- |
| `two-drops`     | Build and drop songs get two breaks and two drops                    |
| `long-breaks`   | Breaks last two double phrases                                       |
| `no-guitars`    | No guitar track                                                      |
| `texture-first` | The texture comes in with the first track                            |
| `hard-endings`  | Everything stops at the last change, nothing moves just before it    |
| `talks-a-lot`   | The voice amount is at least 0.9                                     |
| `slow-builds`   | One track at a time, at most one move per change, in the first half |

## How a song is drawn

For each song the director draws, from the `artist` random stream:

1. The dominant style by weight, or with chance `explore` any other style. The other favourites follow it, and the drawn chaos decides how much the song's parts mix them.
2. Chaos, energy, complexity, voice amount and pace, each in its range.
3. Which quirks apply, each with its chance.

Then planning uses the shape weights, the moves get the bonus of their weights, and the voice character comes from the artist's list. A session records the whole artist as it was, so a replay after the artist is edited gives the same songs. A session without an artist is drawn exactly as before artists existed.

## Built-in artists

| Artist       | Taste                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Night Owl    | Berlin techno and industrial, slow burns, darker and dirtier moves, speaks little     |
| HYPERDROP    | Trance, drum and bass, phonk, build and drop, two drops, talks a lot                  |
| Lumen Drift  | Ambient and dreamy cyberpunk, descents and waves, space, slow builds                  |
| Jukebox Joe  | Every style, high chaos, hard endings now and then                                    |
| The Purist   | Jazz, techno or lo-fi, one style at a time, flat grooves, never a guitar              |
| Wake Horizon | Progressive house, inspired by Avicii: euphoric leads, brighter moves, sometimes two drops |

## Keeping artists up to date

When a later feature adds something an artist could prefer (for example transitions in `#23`), its change adds a field with a default, documents it here and updates the built-in artists. The format version goes up only when an old file would be read differently.

## Random artists (`#50`)

`src/endless/artist-maker.js` makes an artist from a seed: a name (adjective and noun, invented syllables, or a title like "DJ" or "Dr."), a pixel portrait, a short bio in English and Italian from its traits, 1 to 3 favourite styles of one genre (now and then one more), knob ranges around a centre inside the sensible ranges, shapes, moves, voice characters, 0 to 2 quirks and transitions. The same seed gives the same artist and it always passes the artist validation. It also draws random styles, a random genre and knob values (in a sensible range or the full one). The radio's dice, the Artists tab's "Random artist" and the compilation (`#49`) use it. Only existing styles are picked; inventing styles is `#51`.
