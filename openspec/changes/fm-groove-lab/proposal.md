# Proposal

## Why

FM sounds can only be heard inside generated songs (#80). The material generator composes nine sound kinds, eight of them with an FM patch (`SOUND_KINDS`, `src/material/sound.js`), and the FM rack device can be set by hand in Compose, but nothing in the app lets the owner hear one FM kind on its own, see what the FM amount does to the wave, or compare the kinds side by side. The owner asked for an FM section in the Groove Lab: one card per FM type, playable on its own, a drawing of how the wave changes with the FM amount, and a live scope while it plays.

The owner also asked whether risers can come in the same change. Today the riser is one sound, a noise sweep ("Fruscio"); the radio console's riser row already has a "Suono" menu with that single option, built to take more sounds later (radio-arrangement D11). FM sweeps are natural riser sounds; the owner chose to do risers later, as their own change, after hearing the FM cards (design D9).

## What Changes

### FM section

- **An "FM" category in the Sounds tab** of the Groove Lab, next to Drum machine, Instruments, Samples, Acoustic, Synths and Yours. It holds one card per FM kind: Campana (bell), Reese, Ringhio (growl), Sporco (dirty), Piano elettrico (tine), Metallo (clang), Sub, Organo (organ). `square` has no FM patch and gets no card.
- **Each card plays on its own** with the headphones button, through the existing preview player (`src/player/preview.js`): alone when the song is stopped, on the song's bars when it plays, never changing what the player bar plays (icon rule D10 of pattern-preview). One lab preview at a time.
- **What a card plays**: a fixed, representative patch of its kind (inside `FM_RANGES`), on a short part that suits it (a bassline for the bass kinds, an arpeggio, chords or a melody for the others), in A minor at the kind's usual tempo.
- **Three listening modes, all shipped, with a selector in the card detail**: Phrase (the default: the card's part, how the sound works in music), Held note (one long note per bar, to hear the FM envelope and see a still wave) and FM rise (one note repeated while the FM amount climbs from 0 to the card's maximum over 4 bars, the sound of an FM riser). Each mode has a one-line explanation under the selector, in both languages.
- **A drawing of the wave against the FM amount**: four small drawings (FM 0, 1, 2, 3) of the card's wave, computed from the same formula superdough uses, and an "FM amount" control that redraws the wave and changes the sound from the next bar. In the hardware theme the control is a horizontal fader, centred under the drawings and narrower than the card (not window-wide), to save space.
- **A live scope** of the card's own sound while it plays, read from its own analyser, so it shows only the card, not the song.
- **Actions**: Stop, "Use in track" (puts the wave and the FM device on the track selected in Compose, like "Use" does for the other sounds), Copy (the code line).
- **Texts** in Italian and English, a Guide card update, knowledge notes, a Node check and a browser check.

### Follow-ups (not in this change)

- **Riser sounds** (owner decision 5): FM rise and FM fall next to the noise sweep, a "Riser" category, more sounds in the radio console's "Suono" menu, risers as a Patterns kind. Its own change after the owner has picked the good rises by ear with the FM rise mode (design D9). About 14 to 20 agent hours.
- **FM-like effects for every sound** (owner decisions fx-1 and fx-2): rack devices with few parameters, usable on every track, voices included: Fold first (the existing `distort` fold curves), then a 3-hour trial of Ring (does it sound right in the page and in the fast export, and what does it cost); Ring and Fast vibrato follow only if the trial satisfies the owner, otherwise they are dropped. Its own issue and change after this one; the FM cards serve to hear each effect before and after (design D10).

## Capabilities

### New Capabilities

- `app/fm-lab`: the FM category of the Sounds tab: the cards, the lab preview and its three listening modes with their selector, the wave drawing and the FM amount (a horizontal fader in the hardware theme), the live scope, the actions, texts and levels.

### Modified Capabilities

- None archived. The preview player of `pattern-preview` gets a third instance and an optional analyser id (design D3); its requirements do not change.

## Impact

- New pure module `src/sounds/fm-lab.js`: the cards (kind, name, carrier wave, patch, part, tempo), the wave formula for the drawings, the loop of each card and the FM rise expression. Testable in Node.
- `src/sounds/browser.js`: the FM category, its cards, its inspector (drawings, slider, scope, play modes, actions).
- `src/main.js`: a third `createPreview` instance (`labPreview`) with its source, stop on leaving the Sounds tab, on an export or recording, and when another preview starts; "Use in track" through the existing `useSound` path plus the rack.
- `src/player/preview.js`: an optional `analyze` id kept on the preview expression (default none, so Compose and the radio do not change).
- `src/visuals.js`: the stage visual skips the lab's analyser id.
- `src/style.css` (both themes, phone width), `src/i18n.js` (both languages), `src/guide.js` (Sounds card), `docs/knowledge/sounds.md`, `docs/knowledge/glossary.md`, `docs/ARCHITECTURE.md`.
- Checks: `npm run check:fm-lab` (Node) and `tools/check-fm-lab.cjs` (browser).
- No change to the song format, the compiler, presets, the director or growth: no level snapshots, fixtures or version bumps.


## Estimate

About 11 to 14 agent hours: module and Node check 3, Sounds tab section, drawings, mode selector and hardware fader 4.5, lab preview and scope 2, texts, guide, docs 1.5, browser check and levels 2. The follow-ups are not counted.
