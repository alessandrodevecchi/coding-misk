# Proposal

## Why

The random tools of #50 only pick among the styles that exist. The owner wants a button that **invents a new style** (#51): a recipe mixed from the existing ones, with its own name, heard in the radio before deciding to keep it.

The owner often mixes up genres and styles, so this change uses three words, always with the same meaning, in the spec and in the app:

| Word | Italian | Meaning | Example |
| --- | --- | --- | --- |
| **Genre** | Genere | A broad family of music. Fixed list, the app never invents one. | Techno |
| **Style** | Stile | A precise recipe inside one genre: tempo, drums, chords, sounds, shapes. This change invents these. | Techno berlinese |
| **Artist** | Artista | An invented name with a taste that mixes several styles. | Velvet Monk |

An invented style is a style: it belongs to exactly one genre (the closest one) and artists can like it.

## What Changes

- **Invent a style** (button "Inventa uno stile", a drawn die with a spark, not an emoji):
  - in the radio, in the Styles row next to the Mix and Genre dice;
  - in the Styles tab, next to New style and "A random style in the radio";
  - on each card of the Genres tab ("Inventa uno stile di questo genere": the new style must land in that genre);
  - in the New song panel of Compose, in its Styles row next to the Mix and Genre dice (the owner's answer to Open question 4: now, not later).
- **How a style is invented:** one existing style is the base (tempo and energy shape), one or two others lend whole parts (drums, bass, harmony, lead, pads, voice). Lists are trimmed to a few items. Coherence rules keep it musical: a groove only at tempos where some style already plays it, a drum machine that some style already pairs with that groove, swing only with swinging grooves, melody modes that fit the chords, 4 to 5 layers as usual. A draw that breaks a rule, fails validation or copies an existing style is drawn again.
- **Name and genre:** a generated name in English and Italian from fixed word lists (never a real genre, brand or person, never the name of an existing style or artist), the closest genre, the closest existing style, and a one-line description saying which style gave each part.
- **Trial in the radio:** the invented style shows as a chip "in prova" with Tieni (keep), Ancora (again) and × (discard). It plays from the next song, alone, with the artist set to Custom. It survives a reload until kept or discarded.
- **Keep:** the style joins the user's styles in the Styles tab with an "Inventato" badge and its origin. It is a normal user style: editable with the form and JSON view, duplicable, exportable, in the backup, usable by artists, random artists, the New song panel and the compilation (#49).
- **Discard:** the radio goes back to the styles it had before the trial.
- **Seeds:** the same seed gives the same style; the seed shows in the tooltip, like the other dice.
- **Compilation (phase 2):** a setup switch "Stili inventati" lets a compilation segment play a freshly invented style, with Tieni on the now playing tag, like random artists.

## Capabilities

### New Capabilities

- `endless/invented-styles`: the style maker, its coherence rules, naming, closest genre, the invent buttons, trial, keep and discard, storage, seeds, and invented styles in compilations (phase 2).

### Modified Capabilities

None as spec deltas: the Styles tab (#35), the random tools (#50) and the compilation (#49) are still open changes, not archived specs, so their new behavior is written as requirements of `endless/invented-styles`.

## Impact

- New pure module `src/endless/style-maker.js` and its Node check; `src/endless/recipe.js` (optional `invented` field).
- Radio (`src/radio/radio.js`, `src/radio/song-controls.js`), the New song panel (`src/live/new-song-panel.js`, `src/endless/new-song.js`, `src/endless/song-options.js`), Styles and Genres tabs, the playlist session item (embedded trial style), `src/i18n.js`, `src/icons.js`, the Guide, `docs/STYLES.md`, `docs/knowledge/`.
- The director's songs do not change: `DIRECTOR_VERSION` and the endless fixtures stay as they are. `createSession` only learns to take extra styles that the artist exploration does not draw from (D9).
- Estimate: about 25 agent hours (20 to 30); phase 1 without the compilation switch about 21.
