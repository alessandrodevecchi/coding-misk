## Context

See proposal.md for the why. Current state (develop 83f16bb):

- **Compose title row** (`index.html` 84-85): `#tr-new` makes an empty song with one drum track (`src/main.js` ~2178); `#tr-artist` is a select of usable artists that calls `newSongFromArtist(a)` (~2525): `createSession(RECIPES).next({ artist, voice })`, opened unsaved and dirty, toast `newFromArtistDone`. The Artists tab's "♪ New song" (`artCompose`) calls the same function.
- **Voice of the next artist song**: `artistVoice`, stored under `coding-misk-artist-voice`, drawn as the "In the next song" row of the Compose Voices group (`renderArtistVoice`, ~2189). It is a second store for what the radio Voices group also sets.
- **Radio options** (`createRadio`, `src/radio/radio.js` 58-120): one object `opts` in closure, saved under `coding-misk-radio`: `styles`, `chaos`, `energy`, `complexity`, `talk`, `artist`, `temp`, `sounds`, `profile`, `custom`, `material`/`materialDefault`, `voice`, `voices`, `narratorSound`, and session-only fields (`transition`, `harmony`, `incoming`, `compilation`, `compSetup`, `compPreset`, `compLocks`, `scope`, `diceRange`). `current()` turns them into the director options.
- **Radio controls**: `render()` writes the whole panel as one HTML string: artist chips, style chips, dice, the three sliders, the material seg, the How selects (transition, harmony, profile, incoming), `voicesGroup()`, `customPanel()` (build, growth, duration, opening, pace, development, view, generator, comments, functions, options).
- **Profiles** (`src/endless/profile.js`): `songProfileOnAir` picks a song's profile from the Profile option, the artist and the style; `CUSTOM_DEFAULT` is `{ base: 'switch', controls: {} }`.
- **Song configuration** (song-own-settings): a song may carry `config` (profile and options) and plays with it by default.
- **Song length** (`planSong`, `src/endless/director.js` ~185): between the style's `minutes` clamped to 2-6 minutes and 120-360 s, in whole double phrases; `opts.fit` makes a clip at full energy, not a song.
- **Growth length.** Compose grows a Crescendo or Live coder song before its written part (`crescendoSong`, `src/song/crescendo.js` ~847): the growth budget is the written length for a natural growth (W bars, W ≥ 48), one and a half times it for Crescendo, and with the free duration up to 2W − 4 plus the bars the typing waits for. The radio grows a director song inside its plan instead (`growOnAir`, `src/endless/growth.js` ~150): with the fitted duration the growth takes the written bars before a section boundary, so the song stays within a phrase of its plan. D12 measures both.

## Goals / Non-Goals

**Goals:** one place in Compose to start a new song, from scratch, generated or at random; the radio's controls reused, never copied, with values of the panel's own; a song that opens playing as chosen; a length the owner can pick that is the length he hears.

**Non-Goals:** a new director rule other than length; presets in the radio (later, owner decision 3); changing the open song's own configuration from the panel (the Compose live panel does that); transitions and harmony (they only matter between songs); generating several songs at once.

## Decisions

### D1. Same code, two stores of values (owner decision 1)
`src/endless/song-options.js` exports `createSongOptions(store, key)`: it reads and migrates a stored options object exactly as `createRadio` does today (moved, not rewritten) and returns `{ state, set(patch), on(fn), directorOptions(ctx) }`. `set` merges, saves and calls every listener with the changed keys. `directorOptions` is today's `current()` (artist taste, profile options, sounds, material, user patterns, voice, voices, narrator sound), with `ctx` giving `artists`, `userPatterns`, `shapeSearch` and `chooser`. `main.js` makes two instances: the radio's on `coding-misk-radio` (the same key and values as today) and the panel's on `coding-misk-new-song`.

- **Separate values.** A change in the panel never changes the radio's next songs, and the other way round: a trial in Compose cannot change the radio by surprise.
- **First open.** When `coding-misk-new-song` does not exist yet, the panel's store starts from a copy of the radio's song values (not the session-only fields), so the owner finds his usual choices.
- **"Prendi dalla radio".** A button in the panel's footer copies the radio's current song values into the panel in one `set`; the Preset select then shows Personalizzato. No button goes the other way in this change.
- Session-only fields (`transition`, `harmony`, `incoming`, `compilation`, …) stay in the radio's store only.
- `length` (D8) lives in the panel's store only; `directorOptions({ use: 'radio' })` never sends it.
- *Alternative rejected by the owner:* one shared set of values, with a footer line saying so.

### D2. The controls are drawn and handled by shared functions
`src/radio/song-controls.js` holds the HTML of the controls the radio and the panel both show, moved from `render()`: artist chips and select, style chips, genre chips (new), the three knobs with dice, the sounds die, the material seg, the Profile select, `customPanel`, `voicesGroup`, and one `songControlEvent(el, options)` that turns a click, input or change into `options.set(patch)` (the artist and dice rules included: touching styles or knobs with an artist picked goes back to Custom, as today). Each function takes `{ state, t, esc, prefix }`; `prefix` (`radio` or `ns`) keeps element ids unique, while the `data-*` attributes stay the contract both views listen to. Each view passes its own store to `songControlEvent`.

- The radio's `render()` calls them where it draws them today, so the radio looks and behaves the same; its checks must pass unchanged except for moved code.
- Each view re-renders from its own store when a listener fires and the view is shown; a hidden view re-renders when it is shown. A range input being dragged updates its output only (as the voice Sound parts do), so the drag is not lost.
- *Alternative rejected:* a framework or web components. Out of proportion for two views.

### D3. Where the panel lives
`#tr-new` keeps its place and label ("Nuovo brano") and gains a chevron and `aria-expanded`. It opens an inline card `#new-song` between the title row and the arranger, full width, pushing the arranger down; a close button (CROSS icon) and Esc close it. No modal: the owner can keep the panel open while listening to the generated song and press Genera again. `#tr-artist` leaves the row. The panel's open state is remembered per page (`coding-misk-new-song-open`).

### D4. Quick row: from scratch, generate, surprise me
One row, wrapping on narrow screens, in this order:

- **Da zero** (owner decision 1; replaces "Brano vuoto"): the empty song Nuovo brano makes today, one drum track, no configuration of its own, the code free to edit by hand. It reads no value of the panel. It sits first, apart from the rest by a thin divider, so the free creation flow stays one click away once the panel is open.
- **Artista** (select: Personalizzato, the usable artists, the random artist with its portrait when one is drawn, and a die that draws one, as the radio's).
- **Preset** (select, plus save and delete buttons drawn with icons).
- **Seme** (text, empty = random, the seed used shown after a generation).
- **Genera** (primary).
- **Sorprendimi** (DICE icon, D13): a song with every value drawn at random.

Da zero, Genera and Sorprendimi ask to press twice when the open song has unsaved changes, as today. The artist select writes `artist` in the panel's store.

**Where "from scratch" lives.** The owner allowed two places:

| Option | How | Clicks to an empty song | Clicks to a generated song |
| --- | --- | --- | --- |
| **A (recommended)** | Da zero first in the panel's quick row; Nuovo brano opens the panel | 2 | 2 (open, Genera) |
| B | Nuovo brano opens a small menu: "Da zero" (as today) and "Genera…" (opens the panel) | 2 | 3 (menu, Genera…, Genera) |

A is recommended: the same clicks for an empty song, one fewer to generate, one control instead of a menu plus a panel, and the panel can stay open between tries. With the panel open, Da zero is also the quickest way back to a blank page.

### D5. Sections
Five sections drawn with the existing fold (`.curves-toggle.custom-toggle`: chevron, icon, title, summary of the values when closed), closed by default, open state remembered in `coding-misk-new-song-folds`:

1. **Stile e genere**: genre chips (`GENRES` with at least one style; a click selects the styles of that genre, a second click adds or removes them), the style chips, the genre die and style die, the three knobs with dice and the full or sensible range switch, the sounds die. Summary: styles · chaos · energy · complexity.
2. **Profilo e crescita**: Profile select; under it the growth controls of `customPanel` (build, growth, duration, opening, pace, development, code view, comments, functions, options). The opening, pace and development selects are always shown here: changing one while Profile is Classic, Crescendo or Live coder switches Profile to Custom based on that profile with the new value (the rule "touching a control goes back to Custom" the radio already uses for artists). With "as the artist and style say", the shape selects show Automatico and are enabled; a change makes Custom based on Live coder. Summary: profile · opening · pace · development.
3. **Voci**: `voicesGroup` as in the radio (voice-full-controls D12): "Voce: narratore" and "Voce: traccia" with their switches in the title rows, the narrator knob, Narrator style, Narrated growth, How often, Preset, folded Phrases and Sound. Off greys the block and keeps every value. Hint: "Valgono per il nuovo brano; la radio ha i suoi."
4. **Materiale**: the material seg and the Generator select (`custom.controls.gen`, the same value as in section 2); the Generator is disabled with the reason when the build is in blocks. A muted line counts the owner's saved patterns the director may use. Summary: material · generator.
5. **Durata**: chips Come lo stile, Breve (2 to 2.5 minutes), Media (3 to 4), Lunga (5 to 6), Esatta with a minutes field (1 to 12, step 0.5). The length is the length heard, growth included (D12). A muted line says how the choice works with the profile: with Classic "durata del brano"; with Crescendo or Live coder "la crescita sta nella durata"; with Come lo stile and a growth "il brano cresciuto dura più di quello scritto". Summary: the choice.

A footer under the sections holds "Prendi dalla radio" (D1) and shows "Preset: <name>" or "Personalizzato".

### D6. Presets
A preset is `{ name, values }` where `values` holds any of `styles`, `chaos`, `energy`, `complexity`, `artist`, `profile`, `custom`, `material`, `voice`, `voices`, `narratorSound`, `talk`, `length`; keys it does not hold keep their current value. Picking one calls `options.set(values)` once. Five built-in presets serve as a guide (owner decision 4; they are changed after the owner has tried them), with names in both languages, in `src/endless/song-presets.js`:

| id | it | values |
| --- | --- | --- |
| short-groove | Groove breve | profile classic, material patterns, length short |
| live-coder | Live coder | profile switch, custom duration free, length medium |
| narrated | Crescendo narrato | profile custom from crescendo, narrated on, narrator on, narrator style explain |
| fresh | Materiale nuovo | material composed, chaos 0.6 |
| obsessive-voice | Voce ossessiva | voice track on, preset obsessive, How often Sempre |

The owner's own presets are the main use: Save stores every value above, length included, in `coding-misk-song-presets` (Save asks for a name inline, as the compilation presets do). Saving under the name of one of his own presets asks to confirm and overwrites it; under the name of a built-in preset it makes a new preset of his own. Delete works on the owner's presets only; built-in presets cannot be deleted or overwritten. The Preset select shows the last preset picked until any value changes, then Personalizzato (as `compPreset`). Backup includes the presets.

### D7. Generation
Genera runs `createSession(RECIPES, seed).next(panel.directorOptions({ use: 'new-song' }))`: the same call and options as a radio song, from the panel's store, plus `length`. Then:

- **Profile**: `songProfileOnAir(0, { seed, choice: state.profile, artist, style })` gives the profile; with Custom the song gets `config` = the Custom controls (song-own-settings), otherwise `config.profile` only. With a Durata and a growing profile, `config.controls.duration` is `planned` (D12). The song opens with that configuration as its own (no trial mark), the Live build switch set accordingly, and grows in the background as any Live coder song.
- **Voices**: the director already honours `voices` and `voice` (voice-full-controls D15); nothing is added to the song after the call.
- **Title, style label, id**: as `newSongFromArtist` today (`u-<time>`, `kind: 'composed'`, the artist name before the style when an artist is picked).
- The song opens unsaved and dirty; the toast says "Brano nuovo: ascoltalo e salvalo se ti piace" (with the artist name when one is picked). The panel stays open; the quick row shows the seed used.
- `newSongFromArtist(a)` becomes `panel.set({ artist: a.id })` plus Genera, so the Artists tab keeps working.

### D8. Song length in the director
New option `length`: absent or `'style'` (today), `'short'` (2 to 2.5 minutes), `'medium'` (3 to 4), `'long'` (5 to 6), or a number of minutes (1 to 12). In `planSong`, without `fit`: the range replaces `[lo, hi]` and the 120-360 s bounds follow it; an exact length takes the bars nearest to it in whole double phrases (so the error is at most half a double phrase). The draw `P.range(lo, hi)` is still made in every case, so the styles, tempo, meter and key (drawn before) and the length draw itself stay aligned; the sections and tracks may differ, since a different length gives a different plan. `fit` wins over `length`. The recipe records `length` only when it is not `'style'`.

- No radio song gets `length` (D1), so the endless fixtures and `DIRECTOR_VERSION` stay.
- With the growth duration `planned` (D12) the range is drawn one phrase shorter (8 bars at the usual phrase), so the grown song lands in the chosen range.
- *Alternative rejected:* reuse `fit`. It makes a clip at full energy with no intro or outro.

### D9. The old artist voice store
The "In the next song" row leaves the Compose Voices group (that group is about the open song); the panel's Voci section replaces it. `coding-misk-artist-voice` is not read any more and is removed from the backup; the panel's Voci values apply to the new song, the radio's to the radio. Its hint `vinstNewHint` goes.

### D10. Hardware theme and phone
In the hardware theme the panel's range inputs carry `data-fader="h"` (voice-full-controls D17): chaos, energy, complexity and the narrator knob are faders, so the sections stay short; the radio keeps its knobs. Chips and selects are the same as elsewhere. At phone width (400 px) the quick row wraps to Da zero, Artista and Preset on one line, Seme, Genera and Sorprendimi on the next; the sections are full width with one control per line, and the three knobs stack instead of sharing a row (side by side at 400 px their labels and values overlap).

Mockups (Italian, real page with the app's classes and the radio's own control HTML) are in the git-ignored `notes/prove-2026-10-26/nuovo-brano-spec/`: NEON and HW with the sections closed, Stile e genere with Profilo e crescita, Voci with Materiale and Durata, and two phone shots.

### D11. Icons and wording
Drawn SVG icons from `src/icons.js` only: CHEVRON on the button and folds, DICE (artist die and Sorprendimi), SLIDERS (Profilo e crescita), CROSS (close), a new PLUS on Nuovo brano, a new SAVE for the preset; no emoji, no text glyphs. LISTEN (headphones) and FLASK keep their meanings (preview, Patterns tab) and are not used for other things here. Italian labels: Nuovo brano, Da zero, Artista, Preset, Seme, Genera, Sorprendimi, Prendi dalla radio, Stile e genere, Profilo e crescita, Voci, Materiale, Durata, Voce: narratore, Voce: traccia.

### D12. Durata and the growth: the length heard (owner question 2)

**Measured.** Eight director songs (`npm run endless -- --styles berlin-techno,synthwave,dark-cyberpunk --minutes 30 --seed probe78`), grown with Live coder by `npm run growth:probe -- <file> --duration fitted|free` (Compose's growth), and with the radio's fitted growth on air (`growOnAir`, the same Node setup as the probe). Develop 83f16bb, `SHAPES_VERSION` 8, 2026-10-28.

| Song | Written | On air, fitted | Compose, fitted | Compose, free |
| --- | --- | --- | --- | --- |
| Circuito Implante | 176 bars, 5:15 | 184, 5:29 | 359, 10:42 | 383, 11:25 |
| Tramonto Noche | 96, 3:37 | 104, 3:55 | 192, 7:14 | 287, 10:49 |
| Red Noche | 96, 3:35 | 104, 3:53 | 192, 7:10 | 298, 11:08 |
| Cantina | 96, 3:23 | 104, 3:40 | 192, 6:47 | 293, 10:22 |
| Cromo Autostrada | 112, 3:51 | 120, 4:08 | 232, 8:00 | 332, 11:26 |
| Circuito | 144, 4:32 | 152, 4:47 | 295, 9:17 | 387, 12:11 |
| Chrome Corsa | 112, 3:45 | 120, 4:02 | 224, 7:31 | 356, 11:57 |
| Notte Corsa | 144, 5:00 | 152, 5:17 | 288, 10:01 | 429, 14:55 |

Crescendo in Compose (its own growth, fitted): Tramonto Noche 3:37 to 8:00, Cromo Autostrada 3:51 to 7:48, Notte Corsa 5:00 to 9:15; on air 3:55, 4:08 and 5:01.

**What this means.**

- In Compose, a growth comes before the whole written song, so a grown song is always longer than written. "Nella lunghezza del brano" (fitted) means a growth no longer than the written song: the song about doubles (2.0 times on all eight). Free lets the typing wait: 2.2 to 3.2 times, about 3 times for the songs of 3 to 4 minutes (3:23 written becomes 10:22).
- On air, a fitted growth replaces the written bars before a section boundary: every song grew by exactly one phrase (8 bars, 15 to 18 s).
- **The owner's example.** Media (3 to 4 minutes) with Live coder, if Durata set only the written song: written 3:23 to 3:51, heard 10:22 to 11:57 with Live coder's own free growth, or 6:47 to 8:00 fitted. Durata would not be what he hears.
- The cost of growing inside the plan: the growth is shorter (24 to 104 bars here), so the typing hurries more. Rushed growth steps on air: 0 to 8 per song (0, 2, 8, 0, 4, 4, 5, 8); in Compose fitted 0 to 6, free 0. The radio already plays songs this way.

**The rule (proposed).**

1. **Durata is the length heard**, growth included, as the song card shows it.
2. **Classic**: the written song gets the Durata (D8).
3. **Crescendo or Live coder, Durata set**: the song grows inside the plan, as the radio does, with a new growth duration `planned` in its configuration. The written length is drawn one phrase shorter than the range, so the heard length lands inside it (Media gives about 3:00 to 4:00 heard, not 3:17 to 4:17). The profile keeps its name (Live coder stays Live coder); only the growth duration changes, and the Profilo e crescita summary says "crescita nella durata".
4. **Durata set and the free growth exclude each other.** A free growth decides its own length, so it cannot keep one. Choosing Libera sets Durata to Come lo stile; choosing a Durata sets the growth duration to `planned`. A muted line says why each time.
5. **Come lo stile** keeps today's behaviour: fitted about doubles the written song, free about triples it, and the Durata summary says that a grown song lasts longer than written.

**`planned` in Compose.** A song with `config.controls.duration: 'planned'` grows with `growOnAir`'s fitted path (the written form, the section boundaries, the budget of one phrase more) in the Compose worker, the card length worker and the exports, so the card, Compose and the export agree. The growth hash includes it. A song whose written form cannot be planned (not made by the director, or too short for a Live coder growth: fewer than 24 bars after a boundary) grows fitted, as today. In Compose's growth duration select the value shows as "Nella durata scelta" only on songs that carry it.

- *Alternative:* Durata sets the written song only, and the summary shows the expected heard length (about 2 or 3 times). Simpler, but the owner asked for a length that holds.
- *Alternative:* shrink the written song until written plus growth fits. A free growth for 3 to 4 minutes heard would leave about one minute of written song, below the 24 bars a Live coder growth needs.

### D13. Sorprendimi (owner decision 1)
Sorprendimi (DICE icon, it "Sorprendimi", en "Surprise me") draws a new seed, then every panel value from it with the app's random tools (`check:random` covers their limits): artist (Personalizzato, a usable artist or a random artist, one third each), one to three styles (through a random genre half the time), chaos, energy and complexity in the full range, the sounds seed, the profile (Classic, Crescendo, Live coder or Custom with a random opening, pace and development), the material, each voice on or off with a random preset, and Durata (Come lo stile, Breve, Media or Lunga; D12 applies). It writes them into the panel's store in one `set` (the radio's values do not change), shows the seed, and runs Genera with the same seed. The same seed gives the same values and the same song. The drawn values stay, so the owner can change one, generate again, or save them as a preset.

## Risks / Trade-offs

- **The radio refactor** (D2) touches the radio's biggest render. Mitigation: move code without changing it, keep the `data-*` contract, run `check-radio.cjs`, `check-steering.cjs`, `check-voices.cjs`, `check-random.cjs` and `check-compilation.cjs` before the panel exists.
- **Two sets of values**: the panel and the radio can drift apart; "Prendi dalla radio" brings the radio's into the panel in one press.
- **`planned` growth in Compose** (D12) reuses the radio's growth path in three more places (the Compose worker, the card length, the exports). Mitigation: one function shared with `growOnAir`, a `check:song-options` case that grows the same song in each place to the same bars, and `npm run durations` unchanged for the built-in songs (none carries `planned`).
- **Faster typing inside the plan**: rushed growth steps go up (0 to 8 per song on air) as in the radio today.
- **Profile in the panel and in the Compose live panel** look alike but set different things (the next new song, the open song). The panel's section title and footer say "nuovo brano".

## Owner Decisions (2026-10-26 and 2026-10-28)

1. **Values** (D1): same code, separate values, with "Prendi dalla radio". Add "Sorprendimi" with a die (D13). Keep the free creation: "Da zero" (D4).
2. **Durata** (D12): analyse how it fits the profiles and the growth duration before the code; done in D12 with measured numbers.
3. **Presets in the radio**: later, with the same list of presets.
4. **Built-in presets** (D6): the five as a guide; the owner's own presets can be saved.
5. **After Genera**: the panel stays open.
6. **Shape controls with any profile** (D5.2): a change switches to Custom based on that profile.

## Open Questions

- **Q1. Where does "Da zero" go?** Recommended: first in the panel's quick row (D4, option A). Alternative: a menu on Nuovo brano with "Da zero" and "Genera…".
- **Q2. The duration rule** (D12): Durata is the length heard; with a growing profile the growth stays in the plan; Durata and the free growth exclude each other. Recommended: yes. Alternative: Durata sets the written song only, with the expected heard length shown.
- **Q3. Durata in the radio too?** On 2026-10-26 the owner accepted "not now" and wrote "già che ci siamo ok". The radio already grows inside the plan, so a Durata row for its next songs costs about 2 to 3 agent hours (the `length` option, the row, the same exclusion with an artist's free growth, the endless fixtures unchanged when absent). Recommended: an optional last phase of this change (tasks 8), done only if the owner confirms.
- **Q4. Rename Compose's "Nella lunghezza del brano"?** D12 shows it means "a growth no longer than the written song" (the song about doubles). Recommended: rename it "Al massimo quanto il brano scritto" in a separate small change, with its help text. Alternative: keep the label.

## Estimate

About 23 agent hours: options store with two instances and the radio refactor 4.5, shared control functions 2, panel and quick row (Da zero, Sorprendimi) with both themes and phone 4, presets 1.5, director length with checks 1.5, the `planned` growth in Compose, card lengths and exports with its check 3.5, generation and configuration 1.5, Guide, texts and knowledge notes 1.5, browser check and screenshots 3. Durata in the radio (Q3), if confirmed: 2 to 3 more. Slow checks (`check:endless`, radio and voices in the browser) run in the background within these hours.
