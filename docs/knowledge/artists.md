---
id: artists
related: [styles, radio, narrator, material, recipes-music, from-a-reference]
code: [artists, src/endless/artist.js, src/endless/artist-maker.js, src/endless/quirks.js, src/library/artists-tab.js]
checks: [node --no-warnings tools/artist.mjs validate, npm run check:random, npm run check:endless]
---

# Artists

## What it is

An artist gives the director a personality: a taste over styles and knobs. It never fixes a value. It gives weights and ranges, and each song draws its own, so songs by one artist differ but keep a character.

Built-in artists are JSON files in `artists/`. The user can make more in the Artists tab, or get random ones from the dice.

## How it connects

- **Styles.** `styles` holds favourite style ids with weights ([styles.md](styles.md)).
- **Radio.** In the radio an artist picks styles and knob values for every song ([radio.md](radio.md)). Touching a style or a knob goes back to Custom. The compilation can draw artists too.
- **Voice.** `voice.characters` gives the narrator's characters by weight ([narrator.md](narrator.md)).
- **Transitions.** `transitions` gives the kinds of transition to the next song and their length.

**How a song is drawn.** The dominant style by weight, or another one with chance `explore`. Then chaos, energy, complexity, talk and pace, each in its range. Then the quirks, each with its chance. A session records the whole artist, so a replay gives the same songs after an edit.

## Options

Fields: `id`, `name`, `bio`, `portrait` (seed and palette of the pixel face), `styles`, `explore`, `chaos`, `energy`, `complexity`, `talk`, `pace`, `shapes`, `moves`, `voice`, `quirks`, `transitions`. Missing fields take the defaults of `ARTIST_DEFAULTS` in `src/endless/artist.js`.

How each field steers the director:

- `styles` and `explore`: which recipe each song comes from. One heavy weight gives a focused artist; even weights a wide one.
- `chaos`: how much one song mixes its styles, part by part ([styles.md](styles.md)).
- `energy` and `complexity`: busier drums, more tracks, more open filters; complexity above 0 also lets composed parts in ([material.md](material.md)).
- `talk`: how often the narrator speaks. `pace`: below 0.3 phrases pass without moves, above 0.7 an extra move per phrase.
- `shapes`, `moves`: weights for the energy shapes and a bonus for the moves the director scores.
- `voice.characters`: the effects of the narrator's voice. `transitions`: how one song leaves for the next.

Quirks: `two-drops`, `long-breaks`, `no-guitars`, `texture-first`, `hard-endings`, `talks-a-lot`, `slow-builds`.

What not to write in an artist: real names of people or brands in `name` or `bio` (those references are kept privately by the owner; ask first). `inspiredBy` may name a real artist as a genre reference, as early built-in artists do (for example `horizon`), anything about where the music is published, and fixed values where a range works. `inspiredBy` should be a scene, a place or a mood.

Random artists come from a seed: a name, a portrait, a short bio, one to three styles of one genre, knob ranges. Keep saves one among the user's artists.

<!-- generated:artists -->
| Artist id | Name | Styles (weight) |
| --- | --- | --- |
| `dreamer` | Lumen Drift | ambient 3, dreamy-cyberpunk 3, lo-fi 1 |
| `horizon` | Wake Horizon | progressive-house 5, trance 1, synthwave 1 |
| `hype` | HYPERDROP | trance 3, drum-and-bass 2, phonk 2, progressive-house 1 |
| `jukebox` | Jukebox Joe | synthwave 1, jazz 1, country 1, classic-rock 1, lo-fi 1, phonk 1, trance 1, melodic-metal 1 |
| `night-owl` | Night Owl | berlin-techno 4, industrial 2, dark-cyberpunk 1 |
| `purist` | The Purist | jazz 2, berlin-techno 2, lo-fi 1 |
<!-- /generated -->

## Example

```json
{"id": "night-owl", "styles": {"berlin-techno": 4, "industrial": 2, "dark-cyberpunk": 1}, "talk": [0.05, 0.25]}
```

A radio session with this artist plays mostly Berlin techno, sometimes industrial. The voice speaks rarely.

## Where to read more

- [docs/ARTISTS.md](../ARTISTS.md): the format, quirks, built-in artists, random artists.
- `npm run endless -- --artist night-owl` makes a session by one artist.
