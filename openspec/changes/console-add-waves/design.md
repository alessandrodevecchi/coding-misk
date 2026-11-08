## Context

Console "+", "−", lock and saved-pattern presses are prepared ahead in batches (`console-add-ahead`, not yet archived; `src/radio/radio.js`, "+ and − prepared ahead"). Today:

- `batchFor` joins the **earliest** pending batch of the song that has at least `ADD_LEAD` = 2 s left, with no limit on how long after its first press. A join restarts the batch's preparation from scratch.
- A new batch takes `addAt`: the first phrase start at least `ADD_LEAD` + `addPrep` seconds ahead, where `addPrep` is the **page's** last preparation time. `item.addPrep` (this song's, raised on every push) is written but `addAt` never reads it, and `expectedPrep` (the quadratic guess for grown songs) is defined but never called.
- On a grown song the steering on air (`steerOnAir` in `src/endless/waypoints.js`, in the growth worker) replays every command of the song and places the batch's head on the first of `BATCH_TRIES` = 4 phrase starts where `need = max(families, half the lines)` lines can be typed at 5 times a person's pace (`BATCH_HURRY`); the rest go over `BATCH_TAIL` = 2 phrases. With no fitting boundary it takes the first with at least 75 % of the most typing time.
- A batch that is not ready a third of a bar before its boundary moves to `addAt(item, b.at)`. A steering still running is left to finish, then the batch is steered again for the new boundary.

### Baseline measurements (8 November, before this change and before incremental steering)

Script and data: `baseline/` in this change (`run.sh`, `measure.cjs`, `instrumentation.patch` with the temporary logging, `table.py`, `stats.py`, `results-2026-11-08.jsonl`). Dev server on port 5298, Chrome headless, normal CPU speed. Scenarios: Classic, Crescendo, Live coder × berlin-techno (126-134 BPM, about 15 s per 8-bar phrase) and lo-fi (70-88 BPM, about 23 s per phrase) × no earlier commands or many (8 energy commands in berlin-techno, 6 packed in the first two phrases of the shorter lo-fi songs) × press patterns p1 (one "+"), p3 (three "+" 300 ms apart), p6 (three "+", two more 15 s later, one more 5 s after those). One more Live coder berlin-techno run on a second seed. 44 batches.

| Profile | Earlier commands | Batches | Head ≤ 1 phrase | Head ≤ 2 phrases | Head > 2 phrases | Worst head | Batches moved | Median steering |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classic | none | 8 | 6 | 8 | 0 | 1.8 ph | 1 | 0.0 s |
| Classic | many | 8 | 7 | 8 | 0 | 1.9 ph | 1 | 0.1 s |
| Crescendo | none | 8 | 8 | 8 | 0 | 0.9 ph | 0 | 0.7 s |
| Crescendo | many | 7 | 5 | 6 | 1 | 2.7 ph | 2 | 2.4 s |
| Live coder | none | 6 | 2 | 5 | 1 | 2.8 ph | 4 | 0.3 s |
| Live coder | many | 8 | 1 | 4 | 4 | 11.8 ph | 6 | 4.4 s |

Head distance: phrases from the batch's first press to its first entry bar. Moves by reason, all 44 batches: typing 9 (9 batches, all grown songs, +1 to +3 phrases), not ready 12 (11 of them in one batch), busy page 3, order and bound 0. 12 batches absorbed presses made 5 to 22 s after their first press.

Grown-song batches that moved:

| Profile, style, earlier commands, presses | Badge at press | Entry (head) | Moves (reason) | Steering | Typing probe of the chosen boundary |
| --- | --- | --- | --- | --- | --- |
| Live coder, berlin-techno, 8, one "+" | Enters in 11 s | bar 89 → 177 (11.8 ph, about 170 s) | 11 × not ready, one phrase each | 12.2 s (each restart 5-12 s) | fits |
| Live coder, berlin-techno, 8, p6 (6 presses up to 22 s apart) | Enters in 27 s | 89 → 97 (2.8 ph), last line 3.8 ph | typing | 10.0 s | 3 of 6 lines fit at 97 (52 s of typing, 12 s usable × 5) |
| Live coder, berlin-techno, 8 (seed 2), p3 | Enters in 12 s | 65 → 81 (2.8 ph) | typing | 3.2 s | — |
| Live coder, berlin-techno, 0, p3 | Enters in 4 s | 85 → 93 (1.3 ph) | typing (1.9 s usable at 85) | 0.8 s | fits at 93 |
| Live coder, berlin-techno, 0, p6 | Enters in 12 s | 89 → 97 (1.8 ph), last 2.8 ph | typing | 1.6 s | fallback, 3 of 6 |
| Live coder, lo-fi, 0, p3 | Enters in 19 s | 25 → 41 (2.8 ph) | typing | 0.2 s | fits at 41 only (63 s of typing) |
| Live coder, lo-fi, 6, p3 | Enters in 22 s | 25 → 49 (3.8 ph) | typing | 2.7 s | 25, 33, 41 do not fit; 49 fits |
| Live coder, lo-fi, 6, p6 | Enters in 20 s | 25 → 33 (1.8 ph), last 2.8 ph | not ready | 1.1 s | fallback, 3 of 6 |
| Live coder, lo-fi, 6, one "+" | Enters in 20 s | 25 → 33 (1.8 ph) | busy page | 0.7 s | fits |
| Crescendo, berlin-techno, 8, p6 second wave | Enters in 11 s | 97 → 113 (2.7 ph) | typing (fallback) | 3.1 s | no boundary fits |
| Crescendo, lo-fi, 6, p6 | Enters in 19 s | 25 → 33 (1.8 ph), last 2.8 ph | typing | 1.7 s | no boundary fits |

What the numbers say:

1. **Typing fit is the most frequent cause** (9 of 15 moved batches, +1 to +3 phrases, 15 to 70 s). Three or more lines on three instruments need 50 to 70 s of typing at a person's pace; `need` is at least one line per instrument, so the head never shrinks below the number of instruments pressed.
2. **Preparation is the cause of the largest delays.** With many earlier commands the steering on a grown song takes 2 to 13 s (0.2 to 1.6 s with none): it replays every command. When one steering takes about as long as a phrase, the batch chains "not ready" moves, one phrase at a time (11 moves, 170 s), because each move goes to the next phrase that leaves the page's last preparation time (1 s), not this song's, and each move steers again from scratch. The same case on a second seed (4.4 s steering) entered on time.
3. **Late joins make it worse.** Presses 15 to 22 s after the first join the batch, add lines (more typing) and restart its preparation; the whole batch then moves together.
4. **Classic and Crescendo without earlier commands are fine.** Crescendo without earlier commands never moved; Classic moved twice, both for a busy page (lo-fi, one phrase). Classic steering takes under 0.2 s even with 8 earlier commands.
5. **Crescendo's typing probe never fits** (1.2 to 2.8 s usable at every boundary), so every Crescendo head is placed by the fallback rule. It usually keeps the first boundary, but the probe tells nothing on Crescendo.

The main cause of the owner's "+5 s becomes +25 or +50 s" is the steering on air: its replay time (preparation) causes the long chains, and its typing rule causes the frequent one-to-three-phrase moves. The incremental steering change (separate, done first) removes the replay cost; this change fixes the batching rules and the head rule.

## Goals / Non-Goals

**Goals:**
- Batches follow the press rhythm: a burst is one batch, a later press is a second wave that never moves the first.
- Every move is explained, so the checks and the DEVLOG can count causes.
- After incremental steering lands: heads within 2 phrases of the press, preferring fewer head lines to a later head.

**Non-Goals:**
- Incremental steering itself (separate change, first). This change only notes where it depends on it.
- Changing the typing pace model of Live coder or the Crescendo typing probe (finding 5: a follow-up question below).
- An exact badge at the press.

## Decisions

### D1. Join window (owner decision A)

A batch keeps `tFirst` and `tLast` (performance time of its first and last press). `batchFor` takes the **latest** pending batch of the song and joins it only when `now − tLast ≤ 5 s`, `now − tFirst ≤ 10 s` and at least `ADD_LEAD` seconds are left. Otherwise it opens a new batch (D2). An undo press ("−" after a pending "+", the opposite lock) goes to the latest batch that holds the change it undoes, while `ADD_LEAD` seconds are left, and does not move `tLast`: taking a change back must never add a track first and remove it a phrase later.

Alternatives: a window measured on the boundary (seconds left) rather than on presses: rejected, the owner's complaint is about presses far apart in time joining. Keeping "earliest batch": rejected, it is what merges second waves into the first.

### D2. Second wave (owner decision B)

A new batch's boundary is `max(addAt(item), head(prev) + phrase)` where `prev` is the latest pending batch of the song. The new batch is steered **on top of** the pending batches before it: its steering input is the song's commands, then each earlier pending batch's commands (pending, with their own `q` and `min`), then its own. Because `steerOnAir` places batches in order, the earlier batches get the same placement as in their own steering, and the result stays valid when they commit unchanged: `fresh()` accepts a base equal to the commands on air plus the committed batches' commands (same ids). If an earlier batch restarts or moves, the later ones restart; a later batch that would fall less than a phrase after an earlier one moves with the reason `order`. A new press never moves an earlier batch (it only joins or opens).

Alternative: prepare the second wave only after the first commits. Simpler, but with the present replay cost (2 to 13 s on grown songs with history) the second wave would often miss its phrase and add "not ready" moves. After incremental steering both are cheap; stacking keeps the second wave on time in both worlds.

### D3. Move reasons

Every move pushes `{ from, to, why, detail }` onto the batch (`why` ∈ `typing`, `not ready`, `busy page`, `late`, `order`, `bound`), logged as today's `[radio] console change moved …` with the reason, exposed in `pendingAdds` and `addsDone` for the checks. For `typing`, `steerOnAir` returns per batch the boundaries it tried and why each failed (lines needed, seconds of typing needed and usable). This comes back as a field next to `commands`, never inside a recorded command, so the recipe and replay are untouched. The temporary instrumentation in `baseline/instrumentation.patch` is the sketch: it put the probe on the commands, which the real change must not do.

### D4. Lead from this song's preparation

`addAt` reads `item.addPrep ?? addPrep` (this song's measured preparation, else the page's). `expectedPrep` is deleted or used only through this value: its quadratic formula models the replay that incremental steering removes, so it must not be tuned now. A `not ready` move goes to the first phrase start that leaves this song's measured preparation, not simply the next one. This is the small fix for the chain of finding 2; it does not need incremental steering and stays useful after it.

### D5. Head distance and head shrinking (after incremental steering)

In `steerOnAir`'s batch grouping: on the first two candidate boundaries the head may shrink down to one line (one family first, in the existing family order) before the next boundary is tried; candidates 3 and 4 keep today's `need` as fallback; `BATCH_TRIES` stays 4. The rest of the lines go over the next `BATCH_TAIL` phrases as today. The thresholds (2 phrases, one line, `BATCH_HURRY`) are re-measured with `baseline/run.sh` once incremental steering has landed, and confirmed with the owner before this group is implemented. A shrunk head changes where lines go on a fresh press only; a replay uses recorded boundaries and does not run this choice, so seed fixtures do not move (`check:endless` must confirm).

### D6. Badge

At the press the badge shows the default boundary as today (`addAt`, which now reads this song's preparation, D4). It updates when the steering answers (head placed) and at each move, with the existing highlight. No extra steering, growth or typing probe runs to refine the first number. On a Classic song the first number was right in the baseline; on a grown song with history it is a lower bound until the steering answers.

### D7. Check

`tools/check-add-waves.cjs` (dev server on PORT), built on `baseline/measure.cjs` without the instrumentation (it reads the move reasons from `pendingAdds` and `addsDone`): the baseline scenarios plus the join window cases (presses at 0, 4, 8, 12 s; at 0 and 6 s; an undo at 12 s), a second wave with an earlier batch forced to move (`order`), the replay of a two-wave session (song JSON-equal), and the load budget at 4× CPU. It prints the head-distance distribution and the moves by reason in the format of the baseline table, so the DEVLOG numbers come from it.

## Risks / Trade-offs

- [Stacked preparation of a second wave is wasted when the first wave restarts] → only when the listener changes the first wave inside its window; the second wave restarts, as a join does today.
- [A shrunk head brings in one instrument a phrase before the others, which can sound less like a "burst"] → only when the whole batch does not fit; the alternative today is everything one to three phrases later. The owner confirms after re-measuring (D5).
- [More, smaller batches mean more window swaps] → one per wave, at most one per phrase by D2; covered by the load budget check.
- [Move-reason data travelling from the worker] → a small field next to the result; never recorded.
- [The 2-phrase target may still fail with the present replay cost] → stated dependency; the head-distance requirement is verified only after incremental steering.

## Migration Plan

No stored data changes: recorded commands keep their form, so saved sessions replay as before. Implement D1 to D4, D6 and D7 first (independent of incremental steering). Implement D5 after incremental steering has landed and the baseline has been re-measured. Rollback is a revert; nothing is migrated.

## Open Questions

- Crescendo's typing probe never fits (finding 5). Recommended: a follow-up issue to check whether the probe should use Crescendo's own typing pace, after incremental steering; this change keeps the fallback as is for Crescendo.
