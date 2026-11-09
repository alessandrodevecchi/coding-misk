# Proposal

Refs: coding-misk/#82

## Why

In the radio, a console "+" shows an entry like "Enters in 5 s" and soon moves to 25 or 50 s. Several presses move the pending entries again, and a press made 15 s or more later joins the same batch, so every line enters together on a later bar. The measurements in `design.md` show where the moves come from; the listener needs entries that stay close to the press and only move for a stated reason.

Incremental steering has landed (8 November), so the replay cost that caused the longest chains is gone. The owner's final decisions of 8 November set the head target of this change and replace the earlier plan where they conflict.

## What Changes

- **Join window (owner decision A).** A press joins a pending batch only within 5 s of that batch's last press and at most 10 s after its first press. Otherwise it opens a new batch.
- **Undo goes back to its batch.** A "−" that undoes a pending "+" (or the other way round, or the opposite lock) joins the batch that holds that change, even outside the window. A press after that is an ordinary press: in the sequence "+", "−", "+" the last "+" follows the join window and, outside it, opens a new batch (a new queue entry); it never goes back to the old batch.
- **Second wave (owner decision B).** A new batch enters at least one phrase after the pending batch before it. A new press never moves a pending batch.
- **Head distance (owner, final).** The head of each batch enters within 2 phrases of its first press; 3 or 4 phrases only as fallback; never more than 4. Before moving the whole batch later, the head shrinks (down to one line on the earlier boundary, the rest on the following phrases).
- **Slow songs: a cap in seconds.** When the next phrase start is more than 30 s after the press, the batch may enter at the first half-phrase start within 30 s of the press, when its lines fit there. The director gains half-phrase entries for console changes (today it writes a change from the phrase start at or after its bar).
- **Move reasons.** Every move of a batch records its reason (typing does not fit, preparation not ready, page busy, too late, order behind an earlier batch, steering answered after a move). The reasons are logged, exposed to the checks and used for the DEVLOG numbers.
- **Badge stays cheap.** The badge updates from values the radio already has. No extra steering, growth or page work runs only to refresh a label.
- **Curve command off the page (bug in the same area).** A curve command no longer builds the director's view on the page while it waits for the worker's answer (about 115 ms with the CPU slowed 4 times, 1-2 "skip query: too late"); the curve panel shows the pending values from the command itself.
- **Checks.** `check-add-lag` gains the join window, undo, second wave and order cases and the new head targets; `tools/check-add-waves.cjs` runs the baseline scenarios (from `baseline/measure.cjs`, no instrumentation needed) and prints heads in phrases per batch, moves by reason, long tasks and "too late", at normal and slowed CPU.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `endless/steering`: console changes prepared ahead (the batch rules of `console-add-ahead`, not yet archived) gain a join window, ordered waves, recorded move reasons, a head distance target with a shrinking head and half-phrase entries on slow songs.

## Impact

- `src/radio/radio.js`: the batch a press joins, undo, the minimum boundary of a new batch, order between waves, move records, half-phrase boundaries, the curve view while the steering runs.
- `src/endless/waypoints.js` (`steerOnAir`, batch grouping): candidates by distance from the press (2 phrases, fallback up to 4, half-phrase starts on slow songs), head shrinking.
- `src/endless/steering.js` and `src/endless/director.js`: a console change on a half-phrase start (forced on its half-phrase bar); whole-phrase commands unchanged.
- `tools/check-add-lag.cjs`, new `tools/check-add-waves.cjs`; `docs/knowledge/` (console note, decisions, checks), `src/guide.js` card text, `AGENTS.md` tooling, `DEVLOG.md`, `CHANGELOG.md`.
- Recorded commands keep today's form; replay and seed fixtures must not move (see specs).
