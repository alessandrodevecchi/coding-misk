# Proposal

Refs: coding-misk/#82

## Why

In the radio, a console "+" shows an entry like "Enters in 5 s" and soon moves to 25 or 50 s. Several presses move the pending entries again, and a press made 15 s or more later joins the same batch, so every line enters together on a later bar. The measurements in `design.md` show where the moves come from; the listener needs entries that stay close to the press and only move for a stated reason.

## What Changes

- **Join window (owner decision A).** A press joins a pending batch only within 5 s of that batch's last press and at most 10 s after its first press. Otherwise it opens a new batch.
- **Second wave (owner decision B).** A new batch enters at least one phrase after the pending batch before it. A new press never moves a pending batch.
- **Move reasons.** Every move of a batch records its reason (typing does not fit at a boundary, preparation not ready, page busy, too late, order behind an earlier batch, 30 s bound). The reasons are logged, exposed to the checks and used for the DEVLOG numbers.
- **Distance target, to be re-measured after incremental steering.** A batch's head should enter within 2 phrases of the press, with 3 or 4 phrases only as automatic fallback (4 stays the maximum). Before moving the whole batch later, the head shrinks (fewer lines on the first boundaries, the rest on the following phrases). This part depends on the incremental steering change, which comes first as its own change; its thresholds are fixed only after that change lands and the baseline of `design.md` is measured again.
- **Badge.** The badge's estimate updates phrase by phrase from values the radio already has. No extra work is done to make the first estimate exact (not essential, no performance cost).
- **Check.** A browser check measures the join window, the second wave, the move reasons, the head distance in phrases, the load budget and replay determinism.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `endless/steering`: console changes prepared ahead (the batch rules of `console-add-ahead`, not yet archived) gain a join window, ordered waves, recorded move reasons and a head distance target.

## Impact

- `src/radio/radio.js`: the batch a press joins, the minimum boundary of a new batch, the batch prepared on top of an earlier pending batch, move reasons, badge estimate.
- `src/endless/waypoints.js` (`steerOnAir`, batch grouping): head shrinking and the candidate boundaries, after incremental steering.
- `tools/check-add-lag.cjs` or a new `tools/check-add-waves.cjs`; `docs/knowledge/` (console note), `src/guide.js` card text if the badge wording changes, `DEVLOG.md`.
- Depends on: the incremental steering change (separate, done first by another agent) for the distance target and head shrinking.
- Recorded commands keep today's form; replay and seed fixtures must not move (see specs).
