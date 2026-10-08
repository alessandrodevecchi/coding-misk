# Design

## Context

- The director (`src/endless/director.js`) makes one song at a time with `createSession(recipes, seed).next(options)`; options are styles, chaos, energy, complexity, talk. Recipes are JSON validated by `validateRecipe`; the browser loads them with `import.meta.glob`.
- Song planning picks the shape with `pickOther` from the tempo style's list, moves are scored in `directSong`, voice per song in `voiceFor`, all from named seeded streams.
- The app's tabs are sections shown by `showTab`; the stage and the player bar are shared, so changing tab never stops playback.
- `src/sounds/art.js` already renders pixel art (`pixelArt`) for the sound browser.

## Goals / Non-Goals

**Goals:** an artist changes the music audibly but every song still differs; artists and styles are data the user can read and edit in the app; sessions stay replayable.

**Non-Goals:** the settings page for theme, language and rare options (#31, later); per-artist voice phrases; artists choosing transitions (#23 will add it to the taste with a default).

## Decisions

**1. An artist is a taste the director samples per song.** Format (`artists/<id>.json`, `format: 1`):

```json
{ "format": 1, "id": "night-owl", "name": "Night Owl", "bio": { "en": "...", "it": "..." }, "inspiredBy": "...",
  "portrait": { "seed": "owl", "palette": "violet" },
  "styles": { "berlin-techno": 3, "industrial": 2, "dark-cyberpunk": 1 }, "explore": 0.1,
  "chaos": [0.1, 0.4], "energy": [0.4, 0.8], "complexity": [0.3, 0.7], "talk": [0.1, 0.3],
  "shapes": { "slow-burn": 3, "build-drop": 2 }, "pace": [0.3, 0.6],
  "moves": { "darker": 2, "dirtier": 2, "variation": 1 }, "voice": { "characters": { "deep": 2, "radio": 1 }, "chance": 0.4 },
  "quirks": { "long-breaks": 0.5, "hard-endings": 0.3 } }
```

For each song, `next(options)` turns the artist into concrete options with the `plan` stream: a dominant style by weight (or, with chance `explore`, any style), the other parts mixed with the drawn chaos; values drawn in their ranges; the shape drawn by weight among those the tempo style allows (falling back to the style's own list); `pace` scales how many moves a boundary gets; move weights add a bonus to the score of those kinds; voice characters replace the uniform pick; each quirk is rolled once per song with its chance. A session without an artist works exactly as today (fixtures unchanged).

**2. Quirks as small hooks in the director.** Each quirk is a named rule in one place (`src/endless/quirks.js`) applied at a known point: planning (`two-drops`, `long-breaks` change the shape plan; `no-guitars` removes the candidate), the first boundaries (`texture-first`, `slow-builds`), the last boundary (`hard-endings`), comments (`talks-a-lot`). The list is fixed so the validator can check names.

**3. Built-ins in the repository, the user's in the browser.** `artists/*.json` and `styles/*.json` are read-only built-ins loaded by the bundler. The user's artists and styles live in browser storage (`coding-misk-artists`, `coding-misk-styles`), merged with the built-ins at load, validated; a user item with a built-in id is refused (duplicate gets a new id). Export downloads one JSON file through the app's existing download path; import reads a file chosen by the user.

**4. Sessions record the artist in full.** The session recipe stores the artist's whole JSON as it was, not just its id, so a replay after editing gives the same songs. The command line gets `--artist <id|file>`.

**5. Portrait from a seed.** A 16x16 symmetric pixel face (head shape, hair, eyes, accessory such as headphones, glasses or a hood) drawn from the portrait seed with a palette, rendered once to a canvas and shown pixelated; "new face" changes the seed. No image files, no licences.

**6. Sheets and forms from one description.** A small field description per format (label, kind: range, weights, list, menu, text) drives both the read-only sheet and the edit form, so new fields appear in both. The advanced JSON view edits the raw object and shows the validator's errors with their paths.

**7. Progressive house and a major mode.** `MODES` gains `major` (Strudel's major scale), used by hooks in uplifting styles. The progressive house recipe uses the existing major progressions (`rock` I-V-vi-IV, `country` I-IV-V) plus a new `euphoria` progression (vi-IV-I-V), piano stabs, plucked arps and a four-on-the-floor groove.

## Risks / Trade-offs

- [Artists sound alike because ranges overlap] → The built-ins have clearly different favourite styles, shapes and quirks; the check compares their sessions (styles used, average energy, shapes) and expects them to differ.
- [New app features make artists outdated] → Format versions with defaults for new fields (decision 1), and a check that every built-in artist still validates; when a later feature adds taste fields, its change updates the built-ins.
- [Browser storage lost] → Export and import as files; the Artists and Styles tabs say where items are kept.
- [Editing a style the radio is using] → Edits apply from the next song, like the controls.
