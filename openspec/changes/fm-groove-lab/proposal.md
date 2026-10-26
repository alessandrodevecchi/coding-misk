# Proposal

## Why

FM sounds can only be heard inside generated songs (#80). The material generator composes nine sound kinds, eight of them with an FM patch (`SOUND_KINDS`, `src/material/sound.js`), and the FM rack device can be set by hand in Compose, but nothing in the app lets the owner hear one FM kind on its own, see what the FM amount does to the wave, or compare the kinds side by side. The owner asked for an FM section in the Groove Lab: one card per FM type, playable on its own, a drawing of how the wave changes with the FM amount, and a live scope while it plays.

The owner also asked whether risers can come in the same change. Today the riser is one sound, a noise sweep ("Fruscio"); the radio console's riser row already has a "Suono" menu with that single option, built to take more sounds later (radio-arrangement D11). FM sweeps are natural riser sounds, so this change evaluates a riser phase and recommends when to do it (design D9).

## What Changes

### Phase 1: FM section (recommended now)

- **An "FM" category in the Sounds tab** of the Groove Lab, next to Drum machine, Instruments, Samples, Acoustic, Synths and Yours. It holds one card per FM kind: Campana (bell), Reese, Ringhio (growl), Sporco (dirty), Piano elettrico (tine), Metallo (clang), Sub, Organo (organ). `square` has no FM patch and gets no card.
- **Each card plays on its own** with the headphones button, through the existing preview player (`src/player/preview.js`): alone when the song is stopped, on the song's bars when it plays, never changing what the player bar plays (icon rule D10 of pattern-preview). One lab preview at a time.
- **What a card plays**: a fixed, representative patch of its kind (inside `FM_RANGES`), on a short part that suits it (a bassline for the bass kinds, an arpeggio, chords or a melody for the others), in A minor at the kind's usual tempo. Three play modes: Phrase (default), Held note, FM rise (the FM amount goes from 0 to the card's maximum over 4 bars).
- **A drawing of the wave against the FM amount**: four small drawings (FM 0, 1, 2, 3) of the card's wave, computed from the same formula superdough uses, and an "FM amount" slider (a knob in the hardware theme) that redraws the wave and changes the sound from the next bar.
- **A live scope** of the card's own sound while it plays, read from its own analyser, so it shows only the card, not the song.
- **Actions**: Stop, "Use in track" (puts the wave and the FM device on the track selected in Compose, like "Use" does for the other sounds), Copy (the code line).
- **Texts** in Italian and English, a Guide card update, knowledge notes, a Node check and a browser check.

### Phase 2: riser sounds (recommended later, as its own change)

- More riser sounds: FM rise and FM fall next to "Fruscio", playable in a "Riser" category of the Sounds tab, and offered in the radio console's "Suono" menu.
- Risers as a kind in the Patterns tab, so a saved riser can be picked in the "Suono" menu.
- This phase changes the compiler's riser code, the song format (a riser `sound` setting), the director's riser settings and the Patterns store. It is specified here (`app/riser-sounds`) so the owner can judge it, but the recommendation is to split it into its own change after the owner has heard the FM cards (design D9).

## Capabilities

### New Capabilities

- `app/fm-lab`: the FM category of the Sounds tab: the cards, the lab preview and its play modes, the wave drawing and the FM amount, the live scope, the actions, texts and levels.
- `app/riser-sounds` (phase 2): riser sounds beyond noise, their category in the Sounds tab, the "Suono" menu of the radio console, and risers as patterns.

### Modified Capabilities

- None archived. The preview player of `pattern-preview` gets a third instance and an optional analyser id (design D3); its requirements do not change.

## Impact

Phase 1:

- New pure module `src/sounds/fm-lab.js`: the cards (kind, name, carrier wave, patch, part, tempo), the wave formula for the drawings, the loop of each card and the FM rise expression. Testable in Node.
- `src/sounds/browser.js`: the FM category, its cards, its inspector (drawings, slider, scope, play modes, actions).
- `src/main.js`: a third `createPreview` instance (`labPreview`) with its source, stop on leaving the Sounds tab, on an export or recording, and when another preview starts; "Use in track" through the existing `useSound` path plus the rack.
- `src/player/preview.js`: an optional `analyze` id kept on the preview expression (default none, so Compose and the radio do not change).
- `src/visuals.js`: the stage visual skips the lab's analyser id.
- `src/style.css` (both themes, phone width), `src/i18n.js` (both languages), `src/guide.js` (Sounds card), `docs/knowledge/sounds.md`, `docs/knowledge/glossary.md`, `docs/ARCHITECTURE.md`.
- Checks: `npm run check:fm-lab` (Node) and `tools/check-fm-lab.cjs` (browser).
- No change to the song format, the compiler, presets, the director or growth: no level snapshots, fixtures or version bumps.

Phase 2 (if done here): `src/music.js` (riser code), `src/song/validate.js`, `src/endless/steering.js` (`RISER_SOUNDS`), `src/endless/director.js` (riser settings), `src/library/patterns.js` and the Patterns tab (a `risers` kind), `src/radio/radio.js` (the menu), level snapshots and code snapshots.

## Estimate

- Phase 1: about 10 to 14 agent hours (module and Node check 3, Sounds tab section and drawings 4, lab preview and scope 2, texts, guide, docs 1.5, browser check and levels 2).
- Phase 2: about 14 to 20 agent hours, mostly the compiler and director changes, the level measurements of the new riser sounds, and the Patterns kind.
