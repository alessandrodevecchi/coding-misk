## Why

Compose can make a new song only from an artist (the "New song from artist…" select) or as an empty song with one drum track. The director behind the radio already lets the owner choose most of how a song is made: styles and genre, chaos, energy and complexity, the profile and its growth shape, the two voices, the material and the generator. None of that reaches Compose, and the voice options for "the next new song by an artist" live in a separate store of their own. Issue #78.

## What Changes

- **New song button opens a panel.** "Nuovo brano" in the Compose title row opens an inline panel under it instead of making an empty song at once. The separate "New song from artist…" select leaves the row.
- **Quick row.** Artist (or Custom), Preset, Seed (empty: random), a primary **Genera** button and **Brano vuoto** (the empty song of today). Picking an artist or a preset and pressing Genera is enough.
- **Five folded sections**, closed by default, each with a one-line summary when closed and remembered when opened:
  - **Stile e genere**: genre chips that pick the styles of a genre, the style chips, chaos, energy and complexity with their dice, the sounds die.
  - **Profilo e crescita**: Profile (as the artist and style say, Classic, Crescendo, Live coder, Custom) and the growth shape (opening, pace, development) with the other Custom controls.
  - **Voci**: the "Voce: narratore" and "Voce: traccia" blocks with their on/off switches, the same group as the radio.
  - **Materiale**: the material source (Pattern, Variati, Composti, Misto) and the Generator (standard or short patterns).
  - **Durata**: as the style, short, medium, long or an exact length in minutes.
- **One set of values with the radio.** The panel and the radio read and write the same options (styles, knobs, artist, profile, Custom controls, material, voices, sounds seed). The controls are drawn by the same functions, so a change in one place shows in the other. Length is a new option, used by the panel only.
- **Presets.** Named snapshots of those options: a few built-in ones and the owner's own (save, delete).
- **Generated song.** Written by the same director call as a radio song, opened unsaved in Compose with the chosen profile and controls as its own configuration (song-own-settings), so it plays as chosen and Save keeps it.
- **Song length in the director.** A new `length` option for one song: short, medium, long or exact minutes. Without it, songs are drawn as today.
- **Artists tab.** "♪ Nuovo brano" opens Compose with the panel open and the artist picked, and generates as today.
- **Hardware theme.** The panel's knobs (chaos, energy, complexity, narrator) are faders, as in the voices' Sound parts.
- **Guide.** A "Nuovo brano" card in English and Italian.

## Capabilities

### New Capabilities

- `live-build/new-song-panel`: the New song panel in Compose, its quick row, sections, presets and the generated song.
- `endless/song-options`: the options of how a song is made, shared by the radio and the New song panel, and the director's song length.

### Modified Capabilities

None in `openspec/specs/`. The radio Voices group of voice-full-controls (not archived) is reused as it is; its hint line gains the panel.

## Impact

- **Code:** new `src/endless/song-options.js` (the shared options, their storage under the radio's key, the director options built once); new `src/radio/song-controls.js` (the control HTML and events moved out of `src/radio/radio.js`); `src/radio/radio.js` (reads the shared options, draws the moved controls); `src/main.js` and `index.html` (panel, quick row, `#tr-new`, `#tr-artist` removed, the "In the next song" voice row removed); `src/endless/director.js` (`length`); `src/library/artists-tab.js` (Nuovo brano); `src/hardware.js` (faders in the panel); `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Storage:** the radio options key `coding-misk-radio` stays as it is and gains `length`; new `coding-misk-song-presets`; `coding-misk-new-song-folds` for the open sections. The old `coding-misk-artist-voice` is no longer read.
- **Sound:** unchanged for every song and radio session: `length` is absent by default and the radio never sends it; the endless fixtures must not move, so `DIRECTOR_VERSION` stays.
- **Checks:** `check:endless` (fixtures unchanged, new length cases), new `npm run check:song-options` (no browser), new `tools/check-new-song.cjs` (browser), `tools/check-radio.cjs`, `tools/check-voices.cjs`, `tools/check-library.cjs` and `tools/check-random.cjs` updated, `check:guide`, `check:knowledge`.
