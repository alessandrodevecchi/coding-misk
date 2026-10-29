## Context

See proposal.md for the problem. Observed in the code (`src/main.js` at `240d4a7` unless stated):

### How the code types itself

- One typing object per step, not a queue of characters. `liveBuild()` (lines 812-826) makes `typing = makeTyping(...)` (line 795) towards `to = codeFor(sg, next.at)`, the code of the next step. `makeTyping` wraps `typingPlan(from, to, …)` from `src/song/typing.js` (line 342) with a start time and the tempo: `{ plan, start, cps, shown }`.
- The plan holds the whole edit (every changed place of every changed line, pastes, typos and their fixes). `typeFrame()` (lines 805-811) asks `plan.frame(t)` for the text `t` seconds after the start and writes it with `setCodeRange()` (lines 711-721), one CodeMirror transaction for the changed range. `frame(t)` returns `to` once `t >= total` (`src/song/typing.js` lines 290 and 424).
- Before `T.start` (the listening pause of the Live coder profile, or the wait until "as late as it can") `typeFrame` returns early, so the code shown is still the code playing. `settleOthers` (the lines of sections not playing) only reaches the editor through the first frame.
- When the step is due, `liveBuild` drops `typing`, counts the step as built and writes and evaluates `codeNow(sg, next.at)`, the same text as `to`.
- Several steps at one bar are one typing: `codeFor(sg, next.at)` includes every step up to that bar. Later steps are not queued anywhere: they stay in `song.build` and get their own typing after the current step is built.
- "Resume live build" types the same way: `resumeHand()` (lines 845-865) sets `resumeTo = { bar, target?, ...makeTyping(user code, song code) }`, and `resumeBuild()` (lines 866-873) types it with `typeFrame` until its bar.

### How a takeover happens

- `#edhost` listens in the capture phase to `keydown` (an edit key: a single character, Backspace, Delete, Enter, Tab, without Ctrl, Cmd or Alt) and to `paste`, `cut` and `drop` (lines 841-843). The handler runs before CodeMirror applies the key.
- `takeOver()` (lines 835-840) returns when already by hand, when the song has no steps, or when nothing plays (the Radio's pause excepted). Otherwise it sets `typing = null` and `resumeTo = null`, records `handFrom` (the bar), and shows the hand controls. The half-typed text stays in the editor. This is the bug.
- By hand, `songTick` skips `liveBuild` and the radio tick (lines 4289-4291), and the comment over the stage is hidden (`say` at line 4348: `!hand && resumeTo === null`). Spoken comments are code lines (`say_` samples, `.voice(`), so a completed edit can contain the narrator's line of the next step: it is heard only if the user evaluates.
- Other paths that evaluate the editor's code by hand and would fail on half-typed text: a seek or the growth column of the timeline (#88) by hand (`playSong(..., { keepHand: true })`, line 951) and resume after a pause (line 980). The completion fixes them too, since the code is valid from the takeover on.
- "Back to this code" (lines 889-893) replaces the whole code with `ed.setCode`; no half text there.

### Profiles and modes

Classic with the Live build switch, Crescendo, Live coder, the growth of the timeline and the Radio's song on air all go through `liveBuild`/`typeFrame`; only the plan's style differs (`typingHuman()`, Live coder). The Radio console's steering commands become steps of the grown song on air with a boundary that leaves time for their typing (`src/radio/radio.js` lines 206-212), so they type through the same path. The fast export and video (`src/video/feed.js`) replay typing without an editor and have no takeover.

### Undo and cursor today

- `@strudel/codemirror` installs `history()` (`basicSetup.mjs` line 29). Every typing frame is a plain transaction, so it is recorded; CodeMirror joins adjacent changes made within 500 ms into one undo event. Not measured: how many Ctrl+Z it takes after a takeover to get back to a half-typed text.
- The typing never moves the selection: CodeMirror maps the user's cursor through each change. A cursor inside a replaced range maps to one of its ends. Not measured.

### What happens when the code still fails

The completed code is the code of a step, which the build checks evaluate (`check-endless-play.cjs`, `check:crescendo`, `check-hand.cjs`). A failure there is a generator bug. The user's own changes can still fail: Strudel keeps playing the last pattern and the app shows `evalError`, as today.

## Goals / Non-Goals

**Goals:**

- The code the user gets on takeover is always the code of a step (or the code playing), never a half-typed one.
- One small change in the shared takeover path, so every profile and mode gets it.
- A browser check that fails on `develop` and passes with the change.

**Non-Goals:**

- No automatic evaluation on takeover.
- No change to the typing plans, their timing, the song format, the director or any fixture.
- No change to when steps happen after resume.

## Decisions

### D1. Complete the edit in `takeOver()`, before the user's key

`takeOver()` takes the active typing (`resumeTo` if set, else `typing`). If its typing has started (`T.shown` is not empty) and the editor does not show the target yet, it writes `T.plan.frame(Infinity)` with `setCodeRange()` and then drops the typing as today. Because the handler runs in the capture phase, CodeMirror applies the user's key, paste, cut or drop to the completed code.

Alternatives: complete on the first Ctrl+Enter instead (the user would type into broken code and see it change under the cursor later; rejected); only complete when the half-typed text does not parse (needs a parser on every keydown and makes the result depend on timing; rejected).

### D2. Not started means nothing to complete

When the typing has not shown a frame yet (`T.shown === ''`), the editor still shows the code playing. Nothing changes; the step does not appear early. This keeps a takeover during the listening pause identical to today.

### D3. The completed code is not evaluated

The music keeps the last evaluated code, as the hand spec says. The editor can be up to one step ahead of what plays until the user evaluates. Evaluating it automatically would change the music at a moment the user did not choose.

### D4. Later steps unchanged

Today later steps stay in `song.build` and come back on resume (`resumeBuild` counts `built` from the resume bar; "from where I was" replays from `handFrom`). This change keeps that. `handFrom` stays the bar of the takeover, so "from where I was" restarts at the code of that bar, before the completed step.

### D5. Cursor

The user's key goes where CodeMirror maps the cursor through the completion. If the cursor was inside the replaced range, the implementation measures where it lands and, if it lands at the start of the range, moves it to the end of the completed text in the same transaction, so a key typed "at the end of the line being typed" lands after the completed line. See tk4.

## Risks / Trade-offs

- [The editor shows the next step's code while the previous step plays] → the user's next Ctrl+Enter plays it; this is the owner's choice. A short highlight (tk3) makes the jump visible.
- [A dispatch inside a keydown handler could disturb CodeMirror's input handling] → the check types characters, Backspace, Enter and a paste in the middle of an edit and compares the resulting text with the expected one.
- [Undo can bring back a half-typed text through the coder's frames in history] → tk2.
- [The typing object may be stale (song changed between frames)] → completion only when `typing` belongs to the current `song`; otherwise fall back as tk1 says.

## Migration Plan

None: no data changes. Rollback is reverting the commit.

## Open Questions

Each with a recommended option. None changes the task breakdown; tasks follow the recommendations.

- **tk1. Fallback when completion is not possible** (the typing object is missing or stale): (a) leave the code as it is, today's behavior; (b) cancel: restore the code playing (the last step's code, `codeFor(song, steps[built - 1].at)`). **Recommended: (b)**, so the guarantee "valid code on takeover" holds in every case.
- **tk2. Undo.** (a) The completion is one undo event of its own (`isolateHistory: 'full'`), the coder's frames stay in history as now; (b) as (a), and the coder's typing frames and the completion are not recorded at all (`addToHistory: false`), so the user's undo history starts at the takeover and Ctrl+Z never brings back a half-typed text. **Recommended: (b).** Today a Ctrl+Z by hand may already step back into the coder's typing (not measured); (b) fixes that too.
- **tk3. Visual hint of the completed edit.** (a) None; (b) the lines changed by the completion briefly highlighted (about 1 s, the code theme's flash colour, off with reduced motion). **Recommended: (b)**, small and silent: the code jumps in front of the user and the hint says why.
- **tk4. Cursor inside the edit being typed.** (a) Leave it where CodeMirror maps it; (b) move it to the end of the completed range when it was inside it (D5). **Recommended: (b).**
- **tk5. Remaining steps.** (a) Keep today's behavior: they wait and come back with resume; (b) also complete every step due at the same bar (already one typing today, so nothing more to do). **Recommended: (a)**, no change.
- **tk6. Complete or cancel as the main rule.** The owner chose complete; cancel (restore the code playing) stays only as the tk1 fallback. **Recommended: complete.**
