## Why

When the code types itself (live build in blocks or crescendo, radio, session videos), every change is typed in about 0.8 bars whatever its length, so a long line runs at hundreds of characters per second. A change in several places of a long line deletes and retypes the whole middle, and the code panel jumps to the edit. It does not look written on the spot (#64, owner's feedback on the first Crescendo video).

## What Changes

- **Edits where they are.** Inside a changed line the typing finds the words that change and edits only those: the cursor goes there, deletes the old word, types the new one, then moves to the next.
- **Human speed.** Small edits are typed at about 8 characters a second with short pauses between places; long edits speed up to about 30 characters a second and are typed in small pieces (one function of a chain, one line).
- **More time.** Typing may start right after the previous step and use the whole gap before the next one; the sound still changes on the step's bar.
- **Always on time.** When an edit cannot be typed at those speeds before its bar, the speed rises just enough.
- **Smooth scroll.** The code panel glides to the edit and keeps it in view instead of jumping.
- **Setting.** Typing speed: slow, normal (default), fast. Applies wherever the code types itself.

## Capabilities

### New Capabilities

- `live-build/typing`: how a change of code is typed in the code panel and in videos: word-level edits, speeds, timing and scrolling.

### Modified Capabilities

None in their requirements: the live build, Crescendo, the radio and the video feed keep their steps; only how the edit is shown changes.

## Impact

- **Code:** the typing animation (`src/song/typing.js`), its callers in the app (live build, resume after hand takeover) and the video feed; a setting key for the speed.
- **Checks:** a Node check of the typing frames (only changed words are touched, speeds, the frame at the end equals the new code, deadline kept) and the existing live build and video checks.
- **Out of scope:** what the code looks like (views and generators: `code-now`, `idiomatic-code`).
