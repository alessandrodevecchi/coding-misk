## Context

See proposal.md for the motivation. The Groove Lab (`#42`) holds Artists, Styles, Genres, Sounds, Guide, Lessons and References (`index.html`, `data-mode-of="lab"`). Tabs are `data-tab` buttons with a `section#tab-<id>`; `tools/check-modes.cjs` checks the exact list of Groove Lab tabs and a link across modes, and `npm run check:guide` fails for a tab without a Guide card. The Sounds tab (`src/sounds/browser.js`) already auditions code with `play` and `stop` and keeps favourites in the store. User data lives in the store under `coding-misk-*` keys; the backup (`src/settings/backup.js`) exports every such key and merges known keys by id. After `idea-model`, every preset has an idea and `expandIdea` gives its steps or notes; after `material-generator`, `compose(kind, opts)` makes new parts.

## Goals / Non-Goals

**Goals:**

- Listen to any part alone, fast, with the sound, key and tempo the user wants.
- Keep and reuse good parts, from Compose and from the generator.
- Leave a clear place for favourites and votes.

**Non-Goals:**

- No pattern editor: editing stays in Compose.
- No favourites or votes in this change (D8).
- No sharing of patterns between users or files other than the backup.
- No pattern for texture, riser, voice or code tracks in the first version.

## Decisions

### D1. Tab and kinds

The tab id is `pattern` (Italian ids like `suoni` and `stili`; the word is the same in both languages), placed after `suoni`. Labels: "Patterns" and "Pattern". Kinds and their sources:

| Kind | Built-in source | Track type |
| --- | --- | --- |
| melodies | `HOOKS` | hook |
| basslines | `BASS` (beat templates) | bass |
| arpeggios | `ARPS` | arp |
| chords | `PROGS` with `PADS` rhythms (a progression played by a pad rhythm) | pad |
| grooves | `GROOVES` | drums |
| riffs | `BASS` riffs and `GUITAR_PATTERNS` | bass or guitar |

Layout like the Sounds tab: search and kind chips on top, a list of cards with name, kind, preview and play button, a detail panel on the right (stacked on a phone) with the loop controls, styles that use it, and actions.

### D2. Loop player through a temporary song

Playing a pattern builds a song in memory: one section (4 bars, the chosen key, progression, meter and tempo), one track of the pattern's type with the pattern and the chosen sound, and, when the beat is on, a drums track with a kick on every beat and an offbeat hat at gain 0.45. It is compiled with `compileSong` and played with the same `play` and `stop` the Sounds tab uses, looping its 4 bars. Changes rebuild the song and replace the code at the next bar. The song is never saved.

Why: the compiler, the idea writer, the orbits and the level rules already make a pattern sound as it does in a song. A separate audition path would drift.

### D3. Preview

`expandIdea` gives the steps or notes over one to four bars. Melodic patterns draw notes as short bars on a pitch-time canvas (degrees or chord tones resolved in the chosen key); grooves draw a grid of rows by steps. The current step is lit from the scheduler time while playing. Drawn with the theme tokens of `docs/DESIGN-SYSTEM.md`.

### D4. Styles that use a pattern

Computed once from the loaded recipes: for each recipe instrument list (`presets`, `grooves`, `patterns`), a map from preset name to style ids. A style card in the Styles tab links each preset name to the Patterns tab (`#pattern?kind=basslines&id=rolling` or an internal call, as other cross-tab links do).

### D5. Links from Compose and Sounds

- Compose: a small listen button next to the preset menu of a track (`#pt-preset`). It opens the Groove Lab on the Patterns tab with the pattern selected (the preset, or the track's current pattern when it has no preset), the track's sound, the section's key and progression and the song's tempo. The song stops; it does not resume by itself.
- Sounds: in the inspector of a melodic sound, [Try on a pattern] opens the tab with a pattern of the matching kind (bass sounds to basslines, keys and pads to chords, leads to melodies) and that sound selected.

### D6. Store of the user's patterns

Key `coding-misk-patterns`, a list of:

```json
{ "id": "p-1739350000000", "name": "Bass · Night Drive", "kind": "basslines", "type": "bass",
  "pattern": { "idea": { "rhythm": "[~ x x x]*4" } }, "sound": "sawtooth",
  "context": { "key": "F", "chords": "notturna", "meter": "4/4", "bpm": 132, "mode": "minor" },
  "source": "compose", "seed": null, "created": "2026-10-20" }
```

`source` is `compose` or `generated` (with the generator `seed` and `why`). `src/library/patterns.js` holds the pure store functions (add, rename, remove, list by kind), checked in Node by `npm run check:patterns`. The backup merges the key by id like styles and artists (one line in `mergeBackup`, a count `patterns`).

### D7. Save as pattern and Add to song

- [Save as pattern] in the Compose pattern panel saves the selected pattern of the track with the context of the first section where one of its clips plays, and shows a toast with a link to the tab.
- [Add to song] in the tab detail adds the pattern to the song open in Compose (spec `app/user-patterns`): next free letter on the first track of the type, or a new track with default settings and the pattern's sound. Compose marks the song changed; nothing is saved until the user saves the song.

### D8. Favourites and votes later

Not built now. Their place: a star on each card (favourite) and, in the detail, a vote of three values (no, maybe, yes) stored per pattern with the rules that made it (`why` for generated patterns, the preset name for built-in ones). The material generator will read the votes as weights per rule and per kind, so a voted rule is chosen more often. Keeping `why` and `seed` on saved generated patterns now means old saves can be voted later.

### D9. Navigation and modes

The tab follows the two-modes rules: hidden in Listen, remembered per mode, reachable by a link across modes (Compose to Groove Lab). `tools/check-modes.cjs` gets the new Groove Lab list `artisti,stili,generi,suoni,pattern,guida,lezioni,riferimenti` and a check that the Compose listen button lands on the Patterns tab in the Groove Lab.

## Risks / Trade-offs

- [Playing from the tab while a song plays] → the tab stops the song or radio first, like the Sounds tab audition; the player bar shows nothing playing.
- [Riffs written as semitones sound wrong over a progression] → riffs play over the drone progression by default, the way their presets are written (power chord on the key root).
- [Too many cards] → about 90 built-in patterns; the list pages like the Songs tab (20 per page) and filters by kind first.
- [A saved pattern from an older idea format] → the store keeps the pattern as the song format stores it, so the validator and `normalizeSong` read it like any song pattern.

## Migration Plan

New key, nothing to migrate. Rollback: remove the tab; saved patterns stay in the store and in backups, unused.

## Open Questions

- **Default beat.** Recommended: off for grooves, on for basslines and riffs, off for the rest. A per-kind memory of the last choice is a small later addition.
- **Chords kind source.** Recommended: progressions played with the `pad` rhythm by default and a rhythm menu with the `PADS` rhythms, rather than one card per progression and rhythm pair.
- **Where generated parts appear.** Recommended: a "new" strip at the top of the list, cleared when the tab closes, so unsaved parts never mix with built-in ones.

### Note: song functions

A saved pattern keeps its effect chain written out in full. In the Patterns tab the code preview uses the Technical functions preset of the current profile. Later, with votes (D8), an effect chain that is saved and liked often can be proposed as a new entry of the function library (`song-functions`); the owner approves its name.
