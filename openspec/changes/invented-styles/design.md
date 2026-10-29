# Design

## Context

- Style recipes live in `styles/*.json` (built-in, read-only) and in browser storage `coding-misk-styles` (the user's, edited in the Styles tab). The radio, the New song panel, artists and the compilation all read one list, `RECIPES` in `src/main.js`: built-ins plus the user's valid styles.
- Mixing styles already exists (`src/endless/mix.js`, `docs/STYLES.md` "Mixing"): each song takes each **part** from one selected style. The parts are `tempo` (tempo, shapes, minutes, phrase, tracks, energy), `drums`, `bass`, `harmony` (keys, progressions, meters, swing), `lead` (arp, hook), `pads` (pad, guitar, texture, riser) and `voice` (voice, spoken, narrator). An invented style freezes one such mix into a new recipe, and trims it.
- The random tools (#50, `src/endless/artist-maker.js`) give the pattern to reuse: seeded streams (`stream(seed, label)`), name lists, a temporary item in the radio options (`opts.temp` for the random artist) with Keep and ×, `freshSeed()` per press, the seed in the tooltip.
- Recipes have no `transitions` field: transitions belong to artists and to the radio. The issue lists them among the ingredients; here they stay with the artist (see Open questions).

## Goals and non-goals

- Goals: musically coherent styles from existing building blocks; clear words (genre, style, artist); a trial before keeping; kept styles work everywhere user styles work; same seed, same style.
- Non-goals: new presets, grooves, drum machines or sounds (the maker only recombines); new genres; changes to the director.

## Decisions

### D1. Words in the app

The three words of the proposal table are used everywhere, never swapped. Every place that shows an invented style shows its genre next to it ("Stile inventato · genere Techno"). The Styles tab intro and the Guide card get one line each: "Genere = famiglia ampia (Techno). Stile = ricetta precisa dentro un genere (Techno berlinese). Artista = nome inventato che mescola stili." Button texts say "stile", never "genere": "Inventa uno stile", "Inventa uno stile di questo genere".

### D2. The style maker

`src/endless/style-maker.js`, pure, checked in Node. `inventStyle(seed, recipes, { genre = null, base = null }) → { recipe, report }`.

1. **Pool.** Built-in styles only (Open question 1), in `recipeOrder` id order, each through `withDefaults`. The same seed gives the same style in every browser.
2. **Base.** One style drawn from the pool (from the asked genre when `genre` is set; `base` forces one, for the radio's selected style). The base gives the `tempo` part and `headroom`.
3. **Donors.** One or two other styles. Each donor is near the base with chance 0.65 (same genre, or tempo ranges within 15 BPM), anywhere otherwise.
4. **Parts.** Each of the six other parts (`drums`, `bass`, `harmony`, `lead`, `pads`, `voice`) comes from the base or a donor. At least two parts come from donors and at least two from the base, so the style is neither a copy nor a random heap.
5. **Trim.** Every list of a taken part keeps 1 to 3 items of its source (kits 1 to 2, grooves 1 to 2, presets 1 to 3, progressions 2 to 3, keys 2 to 4). Settings ranges and `material` travel with their instrument unchanged.
6. **Tracks and taste.** `tracks.usual` stays within `[4, 5]` and `max` at most 8 (owner's rule: 4 to 5 layers). At least drums, bass and one of hook, arp or pad; at most 6 instruments.
7. **Rest.** `words`: 3 to 6 per language, merged from the styles used. `growthShapes` from the base. No `family`, `buildStyle` or `profile`: an invented style opens in Compose like any user style.

### D3. Coherence rules

The rules read the built-in styles as a table of pairs that already work: **two building blocks fit when at least one built-in style uses both**. This needs no hand-made table and grows when styles are added.

| Rule | What fits |
| --- | --- |
| Groove and tempo | A groove's home tempo is the union of the tempo ranges of the styles that list it, widened by 8 BPM. The new tempo range is the base's range cut to the home tempo of the chosen grooves; it keeps at least 4 BPM. No home tempo overlap: drop the groove; no groove left: take the drums part from the base. |
| Kit and groove | At least one chosen drum machine appears in a style together with one chosen groove. |
| Swing | Swing only when a chosen groove comes from a style with swing (jazz, lo-fi, country) and the harmony or the drums come from a style that swings, with that style's range; otherwise `[0, 0]`. |
| Chords and melody | Hook modes are kept only when a style uses that mode with one of the chosen progressions; none left: the harmony source's own hook modes. |
| Guitar and tempo | Guitar types and patterns only at tempos a style with guitar plays (rock, metal, country, darksynth, industrial ranges). |
| Energy shape | Shapes are the base's shapes shared with a donor; none shared: the base's. |
| Meter | `4/4` unless every style that gave drums and harmony allows another meter (none of the built-ins does today). |

The draw is checked by `validateRecipe` (no errors, no unknown sound warnings) and by `styleCoherence(recipe, pool)`. A failed draw is drawn again from `${seed}/try/${n}`, at most 8 times; after that the base with one donor part that passes is returned, which always fits. The report lists the tries, so the Node check can count them.

### D4. Not a copy

`similarity(a, b)` in 0 to 1: tempo overlap, shared grooves, kits, progressions and presets (Jaccard), weighted. The invented style must stay below 0.8 against every style of the pool and every kept style; otherwise it is drawn again (D3 tries).

### D5. Closest genre and style

The closest style is the one with the highest similarity. The genre is the genre with the highest mean similarity over its (up to) two closest styles: a mean, not a sum, so a genre with one style (jazz, rock) is not outweighed by a genre with three. Below 0.25 the genre is `experimental`. With an asked genre (Genres tab) the result must land in it, or it is drawn again. The recipe stores `genre`; `invented.closest` keeps the closest style id.

The description is generated: "Base Techno berlinese; batteria da Lo-fi, armonia e pad da Synthwave." (`description` is one language today; it is written in the language of the app at invention time, and the sheet rebuilds it from `invented.from` in the current language.)

### D6. Name

Bilingual pairs from fixed lists in the maker: an image word and a texture or motion word, `{ en: 'Rust Tide', it: 'Marea di ruggine' }`, or an image word with a generic suffix from `['wave', 'step', 'drive', 'pulse', 'core']` (`{ en: 'Fogstep', it: 'Fogstep' }`). Never accepted: the name or id of an existing style or artist, the genre names of `GENRES`, and a fixed list of real genre names (vaporwave, dubstep, trap, grime, and so on) so that a style never looks like a real genre. No free text, so no brand or person can appear. The id is the slug of the English name plus four seed characters, as for random artists.

### D7. The `invented` field

A new optional top field, accepted by the validator (format stays 1):

```json
"invented": { "seed": "k3x9q2", "maker": 1, "from": { "tempo": "berlin-techno", "drums": "lo-fi", "bass": "berlin-techno", "harmony": "synthwave", "lead": "berlin-techno", "pads": "synthwave", "voice": "berlin-techno" }, "closest": "berlin-techno", "edited": false }
```

`maker` is `STYLE_MAKER_VERSION`. The director ignores the field. The first save from the form after keeping sets `edited: true`; the badge then reads "Inventato, modificato".

### D8. Where the button lives

- **Radio**, Styles row: `die('invent', 'diceInvent', 'Inventa')` after Mix and Genre. Base: the first selected style with chance 0.5, any otherwise, so the invention starts near what is playing.
- **Styles tab**, top row: "Inventa uno stile". It opens a **trial card** above the list: the sheet of the invented style, the origin per part (chips of the source styles), genre and closest style, and the buttons Ascolta in radio, Ancora, Tieni, Scarta.
- **Genres tab**: each card with styles gets "Inventa uno stile di questo genere" (base and result in that genre); it sends the style to the radio trial.
- **Random tools** (#50): `invent` is a die kind in `throwDice`, with `lastDice.invent` and the seed tooltip.
- **New song panel** (Compose), Styles row: the same die after Mix and Genre (owner's answer to Open question 4). The panel shares `song-controls.js`, so the trial chip, Tieni, Ancora and × are the same code as in the radio; the trial lives in the panel's own store (`coding-misk-new-song`), apart from the radio's. Genera uses the trial style like any selected style. The panel has no compilation, so there is nothing to turn off.

### D9. Trial in the radio

- `opts.tempStyle` holds the trial recipe in the radio options (saved, so it survives a reload), like `opts.temp` for the random artist. `opts.trialBefore` keeps the styles, artist and compilation state before the trial.
- The radio's recipe list stays `RECIPES`; the trial reaches the director as an **extra style**: `createSession(recipes, seed, { extra })` adds it to the styles a song may use, and `session.addStyle(recipe)` adds it to a session already on air. Artist exploration draws only over `recipes`, and the dice for existing styles and the compilation draws read `RECIPES`, so they give the same results as without it. With no extra style the director is exactly as before (fixtures unchanged).
- Starting a trial sets `opts.styles = [trial.id]`, artist Custom, compilation off, from the next song (like every die; Skip plays it now). The toast says "Stile inventato in prova dal prossimo brano".
- The chip: "Marea di ruggine · in prova" with Tieni, Ancora, ×. The now playing tag and Coming next mark its songs "stile in prova".
- **Ancora** replaces the trial with a new one from a fresh seed. **Tieni** (D10). **×** removes it and restores `opts.trialBefore`.
- The user may add other style chips during the trial: the trial style mixes like any style.

### D10. Keep, edit, storage, backup

- **Keep** puts the recipe in `coding-misk-styles` through the Styles tab store (`userStore.put`), refreshes `RECIPES`, clears `opts.tempStyle`, keeps the selection. Toast: "Stile salvato tra i tuoi (Styles)".
- A kept style is a user style: form, JSON view, duplicate, rename (song tags follow, #34), delete, export and import, `tools/style.mjs validate` once copied into `styles/`.
- **Backup:** `coding-misk-styles` is already in the backup and merged by id; nothing new. The trial itself is in the radio options (a `coding-misk-` key), so a backup taken during a trial keeps it.
- **Saving during a trial:** a song saved from the radio carries its own content and keeps the trial id in `tags.styles`; when that id is unknown the song falls back to its genre (`stylesNear`), so nothing breaks. A **session** saved to a playlist embeds the trial recipe (`extraStyles: [recipe]` in the session recipe, which the playlist item copies) so Replay makes the same songs after a discard or in another browser; Replay and the exports pass embedded recipes as extra styles only for that session.

### D11. Artists and compilations

- Kept invented styles are in `RECIPES`, so the artist editor offers them, random artists may pick them (`makeArtist` draws over `RECIPES`), and the compilation setup lists them under their genre.
- **Phase 2:** compilation setup switch "Stili inventati" (off by default; a setup without the field reads as off, so saved setups draw the same segments). When on, `drawSegment` adds the segment kind `invented`: `inventStyle(`${seed}/compilation/${i}`, pool, { genre })` in the segment's genre, knobs as for `styles`. The pool is the list the compilation already draws from (the usable styles within the setup) without invented styles, like the rest of the compilation. The segment's style travels in the director options (`inventedStyle`), and the session adds it as an extra style. The now playing tag shows Tieni, as for a random artist. Same session seed, same segments.

### D12. Determinism, fixtures, versions

- `inventStyle` uses only `stream(seed, 'style-maker/...')` labels of its own. Same seed and same pool give the same recipe; the pool is the built-ins, so the result is the same in every browser.
- `STYLE_MAKER_VERSION = 1` in `style-maker.js`, with fixtures in `tests/snapshots/invented-styles.json` (30 seeds, written by `npm run check:invent -- --write-fixtures`). An intended change that moves them raises the version in the same commit, like `DIRECTOR_VERSION`. A kept style is stored whole, so a maker change never changes it.
- Adding a built-in style changes the pool and so the result of old seeds: the check reports it, and the version goes up in that commit.
- The director, the mixing and the endless fixtures do not change: `npm run check:endless` must pass with no `--write-fixtures`, and `DIRECTOR_VERSION` stays 12. Playlist sessions keep replaying as before.

### D13. Checks

- `npm run check:invent` (Node): 300 seeds valid with no warnings; every D3 rule; similarity below 0.8; names from the lists and not forbidden; genre asked equals genre given; same seed same style; fixtures; tries counted (fewer than 2 on average).
- `tools/check-invented.cjs` (dev server, Chrome): radio die and chip, three seeds play two songs each without `evalError` and below clipping, Ancora, Tieni (Styles tab, badge, radio chip), ×, reload during a trial, edit sets `edited`, session saved during a trial replays after discard, backup export and import, Genres card, Italian and English labels, 400 px.
- `check:random`, `check:compilation` (phase 2), `check:endless` (unchanged fixtures), `check:styles`, `check-style-sounds.cjs` with three kept styles, `check:guide`, `check:knowledge`, `tools/check-backup.mjs`.

## Risks

- **Strange but valid styles.** The rules only say a pair has been seen; three valid pairs can still sound odd together. Mitigation: the trial before keeping; the owner listens to 10 seeds before the merge; the near-donor chance (0.65) can go up.
- **Loud mixes.** A metal drum part on an ambient base. `headroom` comes from the base; the browser check measures levels on three seeds.
- **Pool drift.** New built-in styles change old seeds. Accepted and versioned (D12).

## Open questions

Each with a recommended answer. **Owner's answers (2026-10-29):** every recommendation approved (1 to 10), except 4: the die also goes in the New song panel now. Phase 2 (compilation switch, off by default) approved.

1. **Which styles can be ingredients?** Recommended: built-in styles only, so a seed gives the same style everywhere and invented styles do not breed from each other. (Alternative: also the user's styles, behind a switch.)
2. **How bold?** Recommended: a base plus 1 or 2 donors, donors near the base 65% of the time, no extra control. A "boldness" slider can come later if the owner wants more surprise.
3. **When does the trial start?** Recommended: from the next song, like every die, with the toast; Skip plays it now. (Alternative: skip automatically.)
4. **Where are the buttons?** Recommended: radio Styles row, Styles tab, Genres cards. Not in the New song panel for now; it can come later with no engine work. **Owner (2026-10-29): also in the New song panel now** (D8).
5. **Should the compilation invent styles?** Recommended: yes, as phase 2, behind a setup switch that is off by default.
6. **Saving a song or session during a trial:** keep the style automatically? Recommended: no; the session embeds the recipe, the song falls back to its genre. Keeping stays a choice.
7. **After editing a kept invented style:** keep the badge and origin? Recommended: yes, as "Inventato, modificato".
8. **Names:** translated in English and Italian, or one name? Recommended: translated pairs, like built-in style names.
9. **Transitions:** the issue lists them as an ingredient, but recipes have none. Recommended: no new recipe field; transitions stay with artists and the radio.
10. **Owner's taste:** bias the draw toward dark and tense chords? Recommended: no bias in the maker; the base drawn from the radio's selected styles already follows the owner's choices.
