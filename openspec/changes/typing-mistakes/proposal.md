## Why

Human typing (`human-typing`) makes typos, but each one shows for well under a second: the wrong key is seen after 0 to 2 keys, fixed after a pause of a quarter to three quarters of a second, and deleted at two and a half times the typing speed. The owner never sees a mistake (#64). Reference live coders leave a mistake on screen for a moment, stop, and fix it by hand. They also paste long phrases at once instead of typing them.

## What Changes

- **Mistakes stay on screen.** After a wrong key the typing goes on for 3 to 6 more keys, then stops for about half a second to one second, as if the coder noticed.
- **Fixed at a person's pace.** The backspaces of a fix come at a person's pace, one by one, not in a burst.
- **Sometimes a whole wrong word.** Now and then a whole word is typed wrong (another sound, another scale, another function of the same song), seen, deleted and typed again.
- **Sometimes a long line is pasted.** Now and then a long new line arrives whole at once, as if pasted from notes.
- **Unchanged:** the code is exact when the step plays; the same song gives the same typing; the exact typing style (Classic, Crescendo) does not change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-build/human-typing` (change `human-typing`): visible typos, whole wrong words, pasted long lines, and how they fit in the time (requirements added here; they refine "Typos and changes of mind").

## Impact

- **Code:** `src/song/typing.js` (`humanKeys`, `humanPlan`); the app and the fast video already share the plan, so both change together. No change to the profile table: the Switch profile already uses human typing.
- **Checks:** `tools/check-typing.mjs` (`npm run check:typing`) gets new cases; exact style output stays identical.
- **Docs:** Guide card "Crescendo" (Human typing) in English and Italian, DEVLOG.
