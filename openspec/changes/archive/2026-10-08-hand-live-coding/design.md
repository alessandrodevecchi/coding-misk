# Design

## Context

- The editor is Strudel's CodeMirror (`ed.editor`, a CodeMirror view). `liveBuild()` in `src/main.js` replaces the editor content with `ed.setCode()` during the typing animation and before each step, and evaluates with `ed.evaluate()`.
- `transport()` sets the tempo per bar, runs `liveBuild()`, shows the comment of the latest step (`#say`), stops at `meta.bars` (except in radio mode) and calls `radio.tick()` in radio mode.
- The radio moves its window at each song end and can cut a song with `skip`.

## Goals / Non-Goals

**Goals:** take over without losing a keystroke; resume in place; same behaviour in Compose and Radio.

**Non-Goals:** saving the hand code as a new song version (#33); merging hand edits into the song's tracks.

## Decisions

**1. Detect typing through CodeMirror transactions.** An update listener checks `tr.isUserEvent('input')` or `'delete'` (also paste and drop, which are input events) on transactions that change the document. Clicks, selections and copy produce no document change, so they never trigger it. The code the app writes with `setCode` is not a user event, so the typing animation never triggers it either. Alternative: keydown on the editor (misses paste, catches shortcuts like Ctrl+C).

**2. A `hand` flag in the player, not a new mode.** `hand` is true from the first user edit until resume. While true, `transport()` skips `liveBuild()`, the comment overlay, the stop at the end and `radio.tick()`; the tempo map stays. The mode (`track`, `free`, `radio`) is unchanged, so resume knows where to go back. Alternative: a fourth mode `hand` (it would need to remember the previous one anyway).

**3. Resume types back to the song.** Resume stores the editor code in `lastHand`, then animates with the existing `typingFrames(from, to)` over about one beat from the user's code to `codeFor(song, bar)`, evaluates it on the next bar, and recomputes `built` from that bar. In the radio, if the song on air ended while by hand, resume calls the radio's skip, which starts the next song on the next bar.

**4. "Your last code" block.** A collapsible block under the editor in the code column, shown only when `lastHand` exists, with copy and "back to this code" (sets `hand`, puts the code in the editor, evaluates). It holds one code, replaced at each resume, kept in browser storage per session only.

## Risks / Trade-offs

- [A step is being typed when the user starts typing] → The user's keystroke wins: the animation stops at once and the editor keeps the text as it is with the keystroke applied; checked in the browser.
- [Strudel's own evaluation shortcut runs while by hand] → Intended: Ctrl+Enter evaluates the user's code.
- [Sections lanes repeat after the song end] → Strudel `<...>` lanes cycle, so by hand past the end the song's sections play again from the start; acceptable for live coding and documented.
