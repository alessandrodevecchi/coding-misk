# Proposal

## Why

The radio console changes a track's sound with one blind key («Instrument» in the Sound group, and the ♪ of each Mixer row), with no way back except cancelling the command before its bar. A new pattern for one track needs Vary (which picks the target itself) and cannot be heard before it goes on air. Saving what the radio made, or putting a saved pattern in place of a track, lives in a long panel in the middle of the console. The owner reviewed three layouts on 2026-11-24 and picked version A: a card per track that opens under its Mixer row (`notes/` plan of that day, mockup "A · Scheda per traccia nel Mixer").

## What Changes

- **Track card in the Mixer.** The name of a Mixer row becomes a button that opens a card under the row. One card is open at a time. A locked track's name is disabled, with the reason in its tooltip.
- **Sound row.** «New sound» rolls the Compose sound dice (`src/material/dice.js`) on that track in the song's style, with the same lock groups as Compose. The new sound waits with the «+» of its boundary and enters at the same phrase start, shows in the Queue with its ✕, and goes through the same preparation (sounds loaded ahead) and the sound guard as any other sound. Chips list the sounds of this track in the session (the original, #1, #2…): the one on air is lit, the one waiting is dashed. A chip brings that sound back at the next phrase; «Undo» takes the waiting one back, else returns to the sound before.
- **Movement in the roll.** The dice may also roll one movement device (Sweep, LFO, Pump, Gate) for melodic tracks, inside the device limits and the rack validator. A «Movement» lock chip keeps the movement out of the roll. Path is not rolled in the radio (design D4).
- **Pattern row.** «New pattern» makes a pattern for that track with the generator the radio uses for its new tracks (`airIdea`, `airGroove`), in the key, chords and energy of the next phrase. «Listen» plays it in the headphones with the saved-patterns preview, never on air. «Use» puts it on the track from the next phrase start (same wave as «+»). «Save» adds it to the pattern library. «From the library» lists the saved patterns of the same instrument that fit the song and replaces the pattern on air with the chosen one.
- **Movement row.** Reserved for the live knobs of `sound-modulation` (task 6.6 now places them here, not in the Parts row). Hidden until then.
- **Reorganised console.** «Instrument» leaves the Sound group, and the ♪ leaves the Mixer rows (the card's «New sound» replaces both). The I key rolls a new sound in the open card, or opens the card of the track «Instrument» used to change. The saved patterns panel moves below the Mixer, hidden by default; adding a saved pattern as a new track keeps its wave, Queue and Arrangement badges.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: a track card in the Mixer (sound, pattern, movement rows), a new `sound` command, the console's order (Sound group without «Instrument», saved patterns below the Mixer and hidden by default).

## Impact

- `src/endless/steering.js`: the `sound` command (why not, rewrite as listener steps, kept by later rewrites).
- `src/radio/track-card.js` (new, no DOM): the radio's roll (sound and movement), the card's new pattern, the library list of a track, the history of a track's sounds.
- `src/material/dice.js`: `rollMove` (movement devices drawn inside the limits).
- `src/radio/radio.js`: the card, its handlers, the batch entries for `sound` and card patterns, the Queue rows, the I key, the saved patterns panel's place and default.
- `src/main.js`: the radio's `savePattern` option; `src/i18n.js`, `src/style.css`, `src/guide.js`, `src/ai/commands.js` (the `sound` command left out of the assistant, with its reason).
- `openspec/changes/sound-modulation`: task 6.6, design and `app/device-knobs` place the radio knobs in the card's Movement row.
- Checks: `npm run check:track-card` (new, no browser), `tools/check-track-card.cjs` (browser); the chain of radio checks unchanged.
- Docs: knowledge (radio commands, radio), CHANGELOG, DEVLOG.
