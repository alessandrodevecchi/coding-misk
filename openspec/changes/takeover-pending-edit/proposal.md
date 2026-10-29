## Why

When the user takes over a live build while the code is typing itself towards the next step, the editor keeps the half-typed text: a lone `/` of a comment, a call cut in two. The first Ctrl+Enter then fails with a syntax error until the user repairs the line by hand. The browser check `tools/check-hand.cjs` hit this (about one run in three with the voice samples present) and was fixed on the test side only (`a1fd108`, `nextStep()` waits for a step before typing). Measured then: 17 % of the typing snapshots between bars 0 and 26 of Primo Segnale are not valid JavaScript (113 of 662). The owner chose to complete the pending edit on takeover, as a priority to avoid bugs.

## What Changes

- On takeover (a character typed or deleted, a paste, a cut or a drop in the code during a live build), an edit that the code is typing at that moment is completed at once: the editor jumps to the text the edit was typing towards, before the user's key, paste, cut or drop is applied.
- The same holds for the typing that "Resume live build" does back to the song's code: a takeover during it completes that typing.
- An edit that has not started yet (the listening pause before typing) leaves the code as it is: that code is the code playing.
- The completed code is not evaluated: the music keeps playing the last code evaluated, as by hand today. The user's next Ctrl+Enter plays the completed code with the user's change.
- The later steps of the build stay where they are: by hand they do not change the code, and "Resume live build" brings them back as today.
- Same behavior in Compose (songs with their own steps, the Live build switch, Classic, Crescendo and Live coder profiles, the growth column of the timeline) and in the Radio, since they share one typing path.
- `tools/check-hand.cjs` gains a takeover in the middle of a typed edit, followed by Ctrl+Enter without an evaluation error.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-build/hand-takeover`: a new requirement, "Takeover completes the edit being typed", and the "Take over by typing" requirement now says what code the user gets.

## Impact

- `src/main.js`: `takeOver()` (line 835), the typing state of the live build (`typing`, `makeTyping`, `typeFrame`, lines 782-811) and of the resume (`resumeTo`, lines 845-873).
- `src/song/typing.js`: no change expected; `frame(t)` already returns the target text once `t` reaches the plan's total (lines 290 and 424).
- `tools/check-hand.cjs`: a new mid-edit takeover check.
- Docs: `docs/knowledge/live-build.md` (Hand coding), `docs/ARCHITECTURE.md` (hand live coding), the Guide card in `src/guide.js` if its text changes, DEVLOG.
- No change to the song format, the director, the growth shapes, the fixtures or saved data.
