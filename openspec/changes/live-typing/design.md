## Context

`typingFrames(from, to)` diffs lines and, for a changed line, keeps the common start and end and retypes the middle. It is driven by progress 0 to 1 between "type from" and "type until" (`liveBuild` in `main.js`: from about one bar before the step to 0.2 bars before it), and by the video feed (`src/video/feed.js`) over the last bar before a segment. `settleOthers` already makes edits outside the playing section at once.

## Goals / Non-Goals

**Goals:** edits that look typed by a person; enough time for them; the same frames live and in videos.

**Non-Goals:** shorter code (other changes); cursor movement shown as a moving caret between lines beyond what the text shows.

## Decisions

### D1. Word-level edits

Inside a changed line, a token diff (words, numbers, strings and punctuation kept as tokens) gives a list of small replacements. Each one is: delete the old token (fast, like backspace), type the new one. Between two replacements on the same line there is a short pause (the cursor moving). Lines that are new are typed whole; removed lines go first, as today.

### D2. Speed and time

- A schedule of actions with durations: typing at `small` speed (8 chars/s) for edits under about 40 characters, rising linearly to `large` speed (30 chars/s) for long edits; deletes at three times the typing speed; pauses of 0.15 to 0.3 s between places.
- The time available runs from the previous step's bar (plus half a bar) to 0.2 bars before the next step. Typing starts as late as it can while finishing on time, so a short edit is typed just before its step, as today.
- When the schedule does not fit, every duration is scaled down to fit.
- Setting `coding-misk-typing`: slow (0.6 times), normal, fast (1.6 times).

The frames become `f(seconds since start)` instead of `f(progress)`, with the schedule's total exposed so the caller can choose when to start.

### D3. Scroll

The panel scrolls with an easing over about 0.3 s to put the edit at a third of its height, and does not move while the edit stays visible.

### D4. Video

The video feed uses the same schedule with the same timing, so a video shows what the app shows.

## Risks / Trade-offs

- **[Two steps one bar apart]** → one bar at 140 BPM is 1.7 s: about 14 characters at small speed. Longer edits speed up (D2) or, with `code-now`, become short.
- **[Typing earlier changes the code before the sound]** → as today, the code being typed is not evaluated until the step's bar.
