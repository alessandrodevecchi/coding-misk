## Why

In Prima luce a new drum line was typed over the voice comment that was leaving: the typing paired two unrelated lines and mixed deletions and typing (#64, owner's feedback). A live coder writes a new line on its own, copies a similar line and changes its values, and breaks a line when it grows.

## What Changes

- **Only similar lines are edited in place.** A changed line is edited word by word only when it is similar to the old one; otherwise the old line goes and the new one is written on its own.
- **Copy and change.** A new line similar to an existing one (two drum lines of the same kit) is pasted as a copy of it, at once, then its values are edited.
- **Line breaks.** When a line grows past the panel width, the typing breaks it before a function, as a person would.
- **Edits anywhere in the chain.** Insertions at the start or in the middle of a chain are typed there, not by retyping the rest.

## Capabilities

### New Capabilities

- `live-build/typing-lines`: line pairing by similarity, copy and change, line breaks, edits anywhere in the chain.

### Modified Capabilities

- `live-build/typing` (change `live-typing`): pairing of changed lines and new lines (requirements added here).

## Impact

- **Code:** `typingPlan` in `src/song/typing.js` (line pairing, paste actions, line breaks); the compilers may break long lines.
- **Checks:** Node checks for the Prima luce case (no mix of unrelated lines), copy and change, line breaks; existing typing checks.
