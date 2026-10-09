# Proposal

## Why

The radio ends each song when its plan ends. A listener who likes the song on air can only repeat the part playing ("Stay here"); there is no way to say "keep this song going a bit longer" and still get its ending and transition (#45).

## What Changes

- **Extend button** in the console's Song group, right after "Stay here", with the shortcut `L`. Each press adds one double phrase (the song's building block) before the planned ending: a new stretch in the song's character, with its own moves, not a copy of the part playing. The outro and the transition to the next song come after it.
- **Duration on the button:** the button shows how long one press adds at the song's tempo and meter ("+29 s"); its tooltip explains the logic.
- **Total shown:** the bar line of the now playing card shows the total added ("+1:27").
- **No limit:** the listener can press as often as they like. Holding the key does not repeat the command.
- **Song on air only, replayed:** extensions change only the song on air, are recorded like the other commands and replayed by Replay; the next songs move later in time.

## Capabilities

### New Capabilities

- `endless/extend-song`: the extend command, where the new stretch goes, its length, the button, its label and tooltip, the total shown, replay.

### Modified Capabilities

None. The other steering commands (open change `radio-steering`) stay as they are.

## Impact

- `src/endless/steering.js`: an `extend` command that inserts a double phrase before the ending of the plan.
- `src/radio/radio.js` (button, label, total, shortcut), `src/i18n.js`.
- Checks: `check:endless` (length, place, ending kept, determinism), `check-steering.cjs` (button, label, queue, total); docs `ENDLESS.md`, README, DEVLOG, `PROVE-v0.6.0.md`.
