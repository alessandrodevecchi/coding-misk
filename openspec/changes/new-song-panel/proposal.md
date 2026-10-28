## Why

Compose can make a new song only from an artist (the "New song from artist…" select) or as an empty song with one drum track. The director behind the radio already lets the owner choose most of how a song is made: styles and genre, chaos, energy and complexity, the profile and its growth shape, the two voices, the material and the generator. None of that reaches Compose, and the voice options for "the next new song by an artist" live in a separate store of their own. Issue #78.

## What Changes

- **New song button opens a panel.** "Nuovo brano" in the Compose title row opens an inline panel under it instead of making an empty song at once. The separate "New song from artist…" select leaves the row.
- **Quick row.** **Da zero** first (the empty song of today, free hand coding), then Artist (or Custom), Preset, Seed (empty: random), a primary **Genera** button and **Sorprendimi** with a die (a song with every value drawn at random). Picking an artist or a preset and pressing Genera is enough.
- **Five folded sections**, closed by default, each with a one-line summary when closed and remembered when opened:
  - **Stile e genere**: genre chips that pick the styles of a genre, the style chips, chaos, energy and complexity with their dice, the sounds die.
  - **Profilo e crescita**: Profile (as the artist and style say, Classic, Crescendo, Live coder, Custom) and the growth shape (opening, pace, development) with the other Custom controls.
  - **Voci**: the "Voce: narratore" and "Voce: traccia" blocks with their on/off switches, the same group as the radio.
  - **Materiale**: the material source (Pattern, Variati, Composti, Misto) and the Generator (standard or short patterns).
  - **Durata**: as the style, short, medium, long or an exact length in minutes; the length heard, growth included.
- **Same controls as the radio, values of its own.** The controls are drawn and handled by the same functions as the radio's, but the panel keeps its own values (styles, knobs, artist, profile, Custom controls, material, voices, sounds seed, length): a trial in Compose never changes the radio. The panel starts from a copy of the radio's values, and "Prendi dalla radio" copies them again.
- **Presets.** Named snapshots of those options: five built-in ones as a guide and the owner's own, which he can save, overwrite and delete.
- **Generated song.** Written by the same director call as a radio song, opened unsaved in Compose with the chosen profile and controls as its own configuration (song-own-settings), so it plays as chosen and Save keeps it.
- **Song length in the director.** A new `length` option for one song: short, medium, long or exact minutes. Without it, songs are drawn as today.
- **Growth inside the plan.** With Crescendo or Live coder and a Durata, the song grows as the radio grows it (the growth takes the written bars before a section boundary), through a new growth duration `planned`; measured on 8 songs, the heard length stays within one phrase of the plan, where Compose's growth today doubles it (fitted) or triples it (free). The song keeps the chosen Durata as a target, so switching profile in Compose keeps the heard length within a phrase; Libera turns the target off; songs without a target behave as today (design D12).
- **Artists tab.** "♪ Nuovo brano" opens Compose with the panel open and the artist picked, and generates as today.
- **Hardware theme.** The panel's knobs (chaos, energy, complexity, narrator) are faders, as in the voices' Sound parts.
- **Guide.** A "Nuovo brano" card in English and Italian.

## Capabilities

### New Capabilities

- `live-build/new-song-panel`: the New song panel in Compose, its quick row, sections, presets and the generated song.
- `endless/song-options`: the options of how a song is made, one code and two sets of values for the radio and the New song panel, the director's song length, and the growth inside the planned length.

### Modified Capabilities

None in `openspec/specs/`. The radio Voices group of voice-full-controls (not archived) is reused as it is; its hint line gains the panel.

## Impact

- **Code:** new `src/endless/song-options.js` (the options store, one instance for the radio under its key and one for the panel, the director options built by one function); new `src/radio/song-controls.js` (the control HTML and events moved out of `src/radio/radio.js`); `src/radio/radio.js` (reads the shared options, draws the moved controls); `src/main.js` and `index.html` (panel, quick row, `#tr-new`, `#tr-artist` removed, the "In the next song" voice row removed); `src/endless/director.js` (`length`); `src/endless/growth.js`, the Compose worker, `src/live/card-duration.js` and the export path (the `planned` growth duration); `src/library/artists-tab.js` (Nuovo brano); `src/hardware.js` (faders in the panel); `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Storage:** the radio options key `coding-misk-radio` stays as it is; new `coding-misk-new-song` (the panel's values), `coding-misk-song-presets`; `coding-misk-new-song-folds` for the open sections. The old `coding-misk-artist-voice` is no longer read.
- **Sound:** unchanged for every existing song and radio session: `length` is absent by default and the radio never sends it, and only generated songs carry `planned`; the endless fixtures and the built-in card lengths must not move, so `DIRECTOR_VERSION` and `SHAPES_VERSION` stay.
- **Checks:** `check:endless` (fixtures unchanged, new length cases), new `npm run check:song-options` (no browser), new `tools/check-new-song.cjs` (browser), `tools/check-radio.cjs`, `tools/check-voices.cjs`, `tools/check-library.cjs` and `tools/check-random.cjs` updated, `check:guide`, `check:knowledge`.

## Estimate

About 24 agent hours (design, Estimate); Durata in the radio, if the owner confirms it (design Q3), 2 to 3 more.
