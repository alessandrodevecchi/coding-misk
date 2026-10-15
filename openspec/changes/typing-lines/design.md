## Decisions

### D1. Similarity

Two lines pair when they share at least half of their tokens (by a token diff) and the same leading call (`$: s(`, `$: note(`, `.lpf(`). Others: deletion of the old, a new line for the new one.

### D2. Paste

For a new line, the most similar existing line (same kit or same sound, at least half of the tokens) is pasted below it at once (one action with no typing time), then the differing tokens are edited as usual.

### D3. Breaks

A line longer than the panel's columns breaks before a `.function(` at the last break point that fits; continuation lines are indented as the compiler does.
