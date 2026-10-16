## Why

In Tappe the code is typed perfectly and late: a long lead line arrives in a few seconds after minutes of almost no change (owner's feedback, #64). A person starts earlier, types at an uneven speed, stops to think about a note or a scale, makes typos and fixes them, and changes their mind about a number.

## What Changes

- **Start earlier, type slower.** The typing of a step may use the time since the previous step, not only the last bars before it: a long edit starts earlier and goes slower, within a person's range.
- **Uneven speed.** Every key has its own small delay; words come in bursts.
- **Thinking pauses.** Pauses of half a second to a few seconds before a number, inside a mini-notation group, before a string such as a scale name; longer in long lines.
- **Typos.** Now and then a wrong key (a neighbour on the keyboard, `<` for `!`), seen after a few keys, deleted and typed again; rarely a second typo.
- **Changes of mind.** Now and then a different value first (`269`, then `249`), or a group of notes added and taken out again.
- **Profile control "typing style": exact or human.** Switch uses human; Classic and Crescendo stay exact.
- **Same every time.** Seeded by the song and the step; the code is always exact when the step plays.

## Capabilities

### New Capabilities

- `live-build/human-typing`: when typing starts, uneven speed, thinking pauses, typos, changes of mind.

### Modified Capabilities

- `live-build/typing` (changes `live-typing`, `typing-lines`): the plan can start earlier and carries human actions.

## Impact

- **Code:** `typingPlan` (actions for pauses, typos and changes of mind, start time), the app and the fast video use it; profile table and Compose panel.
- **Checks:** same plan for the same seed, the last frame is the new code before the step, no typo left, pauses and typos present in human style and absent in exact style.
