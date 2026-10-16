## Decisions

### D1. Plan with actions

`typingPlan(from, to, { style, seed, start, end })` keeps its edits (pairing, paste, breaks) and adds actions: `pause`, `typo` (wrong key, typed keys after it, the same number of backspaces, the right key), `mind` (a different value typed, deleted, the right one). The frame at time t applies the actions done by t, so the editor and the video show the same thing.

### D2. Time budget

The typing time is what the text needs at a person's pace: about 4 to 8 characters a second for new text, faster for deletes, plus the thinking pauses, typos and changes of mind of the plan. The listening pause after the previous step is at least about a fifth of the gap (some seconds to tens of seconds). The typing ends at the step, so it starts at the step minus its time, but not before the listening pause is over; when the two do not fit, the listening pause shrinks to a few seconds first, then pauses and typos are dropped, then the speed goes up as today. Exact style keeps today's rule (as late as possible, at the fastest speed that fits).

### D3. Where typos come from

Neighbour keys on a QWERTY keyboard for letters and digits, and shifted neighbours for symbols (`!`/`1`, `<`/`,`, `"`/`'`). Not inside function names that would break evaluation in the middle (the frame is only shown, never evaluated, so any typo is safe). About one typo every 40 to 80 keys, seen after 0 to 3 keys; one change of mind every few steps on a number or a group of notes.
