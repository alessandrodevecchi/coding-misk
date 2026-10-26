## Context

See proposal.md for the why. Current state (develop 83f16bb):

- **Compose title row** (`index.html` 84-85): `#tr-new` makes an empty song with one drum track (`src/main.js` ~2178); `#tr-artist` is a select of usable artists that calls `newSongFromArtist(a)` (~2525): `createSession(RECIPES).next({ artist, voice })`, opened unsaved and dirty, toast `newFromArtistDone`. The Artists tab's "♪ New song" (`artCompose`) calls the same function.
- **Voice of the next artist song**: `artistVoice`, stored under `coding-misk-artist-voice`, drawn as the "In the next song" row of the Compose Voices group (`renderArtistVoice`, ~2189). It is a second store for what the radio Voices group also sets.
- **Radio options** (`createRadio`, `src/radio/radio.js` 58-120): one object `opts` in closure, saved under `coding-misk-radio`: `styles`, `chaos`, `energy`, `complexity`, `talk`, `artist`, `temp`, `sounds`, `profile`, `custom`, `material`/`materialDefault`, `voice`, `voices`, `narratorSound`, and session-only fields (`transition`, `harmony`, `incoming`, `compilation`, `compSetup`, `compPreset`, `compLocks`, `scope`, `diceRange`). `current()` turns them into the director options.
- **Radio controls**: `render()` writes the whole panel as one HTML string: artist chips, style chips, dice, the three sliders, the material seg, the How selects (transition, harmony, profile, incoming), `voicesGroup()`, `customPanel()` (build, growth, duration, opening, pace, development, view, generator, comments, functions, options).
- **Profiles** (`src/endless/profile.js`): `songProfileOnAir` picks a song's profile from the Profile option, the artist and the style; `CUSTOM_DEFAULT` is `{ base: 'switch', controls: {} }`.
- **Song configuration** (song-own-settings): a song may carry `config` (profile and options) and plays with it by default.
- **Song length** (`planSong`, `src/endless/director.js` ~185): between the style's `minutes` clamped to 2-6 minutes and 120-360 s, in whole double phrases; `opts.fit` makes a clip at full energy, not a song.

## Goals / Non-Goals

**Goals:** one place in Compose to choose how a new song is made; the radio's options and controls reused, never copied; one value per option across the radio and the panel; a song that opens playing as chosen; a length the owner can pick.

**Non-Goals:** a new director rule other than length; presets in the radio (later, see Q3); changing the open song's own configuration from the panel (the Compose live panel does that); transitions and harmony (they only matter between songs); generating several songs at once.

## Decisions

### D1. One options store for the radio and the panel
`src/endless/song-options.js` exports `createSongOptions(store)`: it reads and migrates `coding-misk-radio` exactly as `createRadio` does today (moved, not rewritten) and returns `{ state, set(patch), on(fn), directorOptions(ctx) }`. `set` merges, saves and calls every listener with the changed keys. `directorOptions` is today's `current()` (artist taste, profile options, sounds, material, user patterns, voice, voices, narrator sound), with `ctx` giving `artists`, `userPatterns`, `shapeSearch` and `chooser`. `main.js` makes the store once and hands it to `createRadio` and to the panel.

- Session-only fields stay in the same stored object (one key, no migration) and only the radio reads them.
- `length` (D8) is stored with the others but `directorOptions({ use: 'radio' })` leaves it out, so the radio never sends it.
- *Alternative rejected:* the panel keeps its own copy and copies from the radio when it opens. Two stores drift, which the owner forbids.
- *Alternative rejected:* the panel calls into the radio's closure. Compose would depend on the radio tab having been built.

### D2. The controls are drawn and handled by shared functions
`src/radio/song-controls.js` holds the HTML of the controls the radio and the panel both show, moved from `render()`: artist chips and select, style chips, genre chips (new), the three knobs with dice, the sounds die, the material seg, the Profile select, `customPanel`, `voicesGroup`, and one `songControlEvent(el, options)` that turns a click, input or change into `options.set(patch)` (the artist and dice rules included: touching styles or knobs with an artist picked goes back to Custom, as today). Each function takes `{ state, t, esc, prefix }`; `prefix` (`radio` or `ns`) keeps element ids unique, while the `data-*` attributes stay the contract both views listen to.

- The radio's `render()` calls them where it draws them today, so the radio looks and behaves the same; its checks must pass unchanged except for moved code.
- Each view re-renders from the store when a listener fires and the view is shown; a hidden view re-renders when it is shown. A range input being dragged updates its output only (as the voice Sound parts do), so the drag is not lost.
- *Alternative rejected:* a framework or web components. Out of proportion for two views.

### D3. Where the panel lives
`#tr-new` keeps its place and label ("Nuovo brano") and gains a chevron and `aria-expanded`. It opens an inline card `#new-song` between the title row and the arranger, full width, pushing the arranger down; a close button (CROSS icon) and Esc close it. No modal: the owner can keep the panel open while listening to the generated song and press Genera again. `#tr-artist` leaves the row. The panel's open state is remembered per page (`coding-misk-new-song-open`).

### D4. Quick row
One row, wrapping on narrow screens: **Artista** (select: Personalizzato, the usable artists, the random artist with its portrait when one is drawn, and a die that draws one, as the radio's), **Preset** (select, plus save and delete buttons drawn with icons), **Seme** (text, empty = random, the seed used shown after a generation), **Genera** (primary), **Brano vuoto** (the empty song of today). Genera and Brano vuoto ask to press twice when the open song has unsaved changes, as today. The artist select writes `artist`, the same value as the radio's artist chips.

### D5. Sections
Five sections drawn with the existing fold (`.curves-toggle.custom-toggle`: chevron, icon, title, summary of the values when closed), closed by default, open state remembered in `coding-misk-new-song-folds`:

1. **Stile e genere**: genre chips (`GENRES` with at least one style; a click selects the styles of that genre, a second click adds or removes them), the style chips, the genre die and style die, the three knobs with dice and the full or sensible range switch, the sounds die. Summary: styles · chaos · energy · complexity.
2. **Profilo e crescita**: Profile select; under it the growth controls of `customPanel` (build, growth, duration, opening, pace, development, code view, comments, functions, options). The opening, pace and development selects are always shown here: changing one while Profile is Classic, Crescendo or Live coder switches Profile to Custom based on that profile with the new value (the rule "touching a control goes back to Custom" the radio already uses for artists). With "as the artist and style say", the shape selects show Automatico and are enabled; a change makes Custom based on Live coder. Summary: profile · opening · pace · development.
3. **Voci**: `voicesGroup` as in the radio (voice-full-controls D12): "Voce: narratore" and "Voce: traccia" with their switches in the title rows, the narrator knob, Narrator style, Narrated growth, How often, Preset, folded Phrases and Sound. Off greys the block and keeps every value. Hint: "Valgono per il nuovo brano e per i prossimi brani della radio."
4. **Materiale**: the material seg and the Generator select (`custom.controls.gen`, the same value as in section 2); the Generator is disabled with the reason when the build is in blocks. A muted line counts the owner's saved patterns the director may use. Summary: material · generator.
5. **Durata**: chips Come lo stile, Breve (about 2 minutes), Media (3 to 4), Lunga (5 to 6), Esatta with a minutes field (1 to 12, step 0.5). A muted line says that a Live coder growth with free duration may last longer than the written song. Summary: the choice.

A footer line under the sections says that these are the radio's settings too, and shows "Preset: <name>" or "Personalizzato".

### D6. Presets
A preset is `{ name, values }` where `values` holds any of `styles`, `chaos`, `energy`, `complexity`, `artist`, `profile`, `custom`, `material`, `voice`, `voices`, `narratorSound`, `talk`, `length`; keys it does not hold keep their current value. Picking one calls `options.set(values)` once. Built-in presets (names in both languages, in `src/endless/song-presets.js`):

| id | it | values |
| --- | --- | --- |
| short-groove | Groove breve | profile classic, material patterns, length short |
| live-coder | Live coder | profile switch, custom duration free, length medium |
| narrated | Crescendo narrato | profile custom from crescendo, narrated on, narrator on, narrator style explain |
| fresh | Materiale nuovo | material composed, chaos 0.6 |
| obsessive-voice | Voce ossessiva | voice track on, preset obsessive, How often Sempre |

The owner's presets are saved in `coding-misk-song-presets` with every value above (Save asks for a name inline, as the compilation presets do); delete works on the owner's presets only. The Preset select shows the last preset picked until any value changes, then Personalizzato (as `compPreset`). Backup includes the presets.

### D7. Generation
Genera runs `createSession(RECIPES, seed).next(options.directorOptions({ use: 'new-song' }))`: the same call and options as a radio song, plus `length`. Then:

- **Profile**: `songProfileOnAir(0, { seed, choice: state.profile, artist, style })` gives the profile; with Custom the song gets `config` = the Custom controls (song-own-settings), otherwise `config.profile` only. The song opens with that configuration as its own (no trial mark), the Live build switch set accordingly, and grows in the background as any Live coder song.
- **Voices**: the director already honours `voices` and `voice` (voice-full-controls D15); nothing is added to the song after the call.
- **Title, style label, id**: as `newSongFromArtist` today (`u-<time>`, `kind: 'composed'`, the artist name before the style when an artist is picked).
- The song opens unsaved and dirty; the toast says "Brano nuovo: ascoltalo e salvalo se ti piace" (with the artist name when one is picked). The panel stays open; the quick row shows the seed used.
- `newSongFromArtist(a)` becomes `options.set({ artist: a.id })` plus Genera, so the Artists tab keeps working.

### D8. Song length in the director
New option `length`: absent or `'style'` (today), `'short'` (2 to 2.5 minutes), `'medium'` (3 to 4), `'long'` (5 to 6), or a number of minutes (1 to 12). In `planSong`, without `fit`: the range replaces `[lo, hi]` and the 120-360 s bounds follow it; an exact length takes the bars nearest to it in whole double phrases (so the error is at most half a double phrase). The draw `P.range(lo, hi)` is still made in every case, so the styles, tempo, meter and key (drawn before) and the length draw itself stay aligned; the sections and tracks may differ, since a different length gives a different plan. `fit` wins over `length`. The recipe records `length` only when it is not `'style'`.

- No radio song gets `length` (D1), so the endless fixtures and `DIRECTOR_VERSION` stay.
- *Alternative rejected:* reuse `fit`. It makes a clip at full energy with no intro or outro.

### D9. The old artist voice store
The "In the next song" row leaves the Compose Voices group (that group is about the open song); the panel's Voci section replaces it. `coding-misk-artist-voice` is not read any more and is removed from the backup; the radio Voices values (the same as the panel's) apply. Its hint `vinstNewHint` goes.

### D10. Hardware theme and phone
In the hardware theme the panel's range inputs carry `data-fader="h"` (voice-full-controls D17): chaos, energy, complexity and the narrator knob are faders, so the sections stay short; the radio keeps its knobs. Chips and selects are the same as elsewhere. At phone width (400 px) the quick row wraps to Artista and Preset on one line, Seme and Genera on the next, Brano vuoto under them; the sections are full width with one control per line, and the three knobs stack instead of sharing a row (side by side at 400 px their labels and values overlap).

Mockups (Italian, real page with the app's classes and the radio's own control HTML) are in the git-ignored `notes/prove-2026-10-26/nuovo-brano-spec/`: NEON and HW with the sections closed, Stile e genere with Profilo e crescita, Voci with Materiale and Durata, and two phone shots.

### D11. Icons and wording
Drawn SVG icons from `src/icons.js` only: CHEVRON on the button and folds, DICE, SLIDERS (Profilo e crescita), CROSS (close), a new PLUS on Nuovo brano, a new SAVE for the preset; no emoji, no text glyphs. LISTEN (headphones) and FLASK keep their meanings (preview, Patterns tab) and are not used for other things here. Italian labels: Nuovo brano, Artista, Preset, Seme, Genera, Brano vuoto, Stile e genere, Profilo e crescita, Voci, Materiale, Durata, Voce: narratore, Voce: traccia.

## Risks / Trade-offs

- **The radio refactor** (D2) touches the radio's biggest render. Mitigation: move code without changing it, keep the `data-*` contract, run `check-radio.cjs`, `check-steering.cjs`, `check-voices.cjs`, `check-random.cjs` and `check-compilation.cjs` before the panel exists.
- **Shared values surprise**: changing the panel while the radio plays changes the radio's next songs (as changing the radio panel does). The footer line and the Voci hint say it; see Q1.
- **Profile in the panel and in the Compose live panel** look alike but set different things (the next new song, the open song). The panel's section title and footer say "nuovo brano".

## Open Questions

- **Q1. Should the panel share the radio's values, or keep a set of its own?** Recommended: share (D1), as the owner's rule asks; the footer says it. Alternative: a separate set seeded from the radio's when the panel first opens.
- **Q2. Should Length also be offered in the radio?** Recommended: not in this change; the option is stored with the others and the radio ignores it. Alternative: a Length row in the radio for its next songs.
- **Q3. Should presets also be offered in the radio?** Recommended: later, in a follow-up, using the same store. Alternative: add them to the radio now.
- **Q4. Which built-in presets?** Recommended: the five of D6. Alternative: none, only the owner's.
- **Q5. Does the panel close after Genera?** Recommended: it stays open, so the owner can change one value and generate again. Alternative: close it and reopen with Nuovo brano.
- **Q6. Shape controls with a profile other than Custom** (D5.2). Recommended: a change switches to Custom based on that profile. Alternative: show them only with Custom, as the radio does.

## Estimate

About 18 agent hours: options store and radio refactor 4, shared control functions 2, panel and quick row with both themes and phone 3.5, presets 1.5, director length with checks 1.5, generation and configuration 1.5, Guide, texts and knowledge notes 1.5, browser check and screenshots 2.5. Slow checks (`check:endless`, radio and voices in the browser) run in the background within these hours.
