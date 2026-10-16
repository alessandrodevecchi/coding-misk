## Decisions

### D1. Plan with actions

`typingPlan(from, to, { style, seed, start, end })` keeps its edits (pairing, paste, breaks) and adds actions: `pause`, `typo` (wrong key, typed keys after it, the same number of backspaces, the right key), `mind` (a different value typed, deleted, the right one). The frame at time t applies the actions done by t, so the editor and the video show the same thing.

### D2. Time budget

Human style aims at about 60% of the time from half a bar after the previous step to the step, bounded by a person's speed (3 to 12 characters a second) and the existing deadline; exact style keeps today's rule (as late as possible). Pauses and typos are added before the speed is set, so the total stays within the time.

### D3. Where typos come from

Neighbour keys on a QWERTY keyboard for letters and digits, and shifted neighbours for symbols (`!`/`1`, `<`/`,`, `"`/`'`). Not inside function names that would break evaluation in the middle (the frame is only shown, never evaluated, so any typo is safe). About one typo every 40 to 80 keys, seen after 0 to 3 keys; one change of mind every few steps on a number or a group of notes.
