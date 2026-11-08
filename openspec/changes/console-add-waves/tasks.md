# Tasks

Groups 1 to 4 do not depend on incremental steering. Group 5 starts only after the incremental steering change has landed and the owner has confirmed the thresholds on the re-measured baseline.

## 1. Move reasons (D3)

- [ ] 1.1 Record every move of a batch as `{ from, to, why, detail }` with `why` in `typing`, `not ready`, `busy page`, `late`, `order`, `bound`; log it with the reason; expose `moves` in `pendingAdds` and `addsDone`. Verify: `check-add-lag.cjs --quick` passes and its push case reads `busy page` from `addsDone`.
- [ ] 1.2 Return from `steerOnAir` (worker and page path) the boundaries a pending batch tried, each with lines, typing needed and usable seconds, as a field next to `commands`, never inside a recorded command. Verify: `npm run check:endless` and `check:radio-profiles` unchanged, and a Live coder batch moved for typing shows its probes in `addsDone`.
- [ ] 1.3 Note the move reasons in `docs/knowledge/radio-commands.md` (console "+" timing) and run `npm run check:knowledge`.

## 2. Join window and undo (D1)

- [ ] 2.1 Keep `tFirst` and `tLast` on each batch; `batchFor` joins the latest pending batch only within 5 s of its last press, 10 s of its first and with `ADD_LEAD` left, else opens a new batch. Verify in the new check (4.1): presses at 0, 4, 8, 12 s give two batches (0-8 s and 12 s); presses at 0 and 6 s give two batches.
- [ ] 2.2 An undo press ("−" after a pending "+", "+" after a pending "−", the opposite lock) goes to the latest batch holding that change while `ADD_LEAD` is left, without moving `tLast`. Verify: "+ arp", then "− arp" 12 s later leaves no pending change and no new batch.

## 3. Second wave, order and lead (D2, D4, D6)

- [ ] 3.1 A new batch's boundary is at least one phrase after the head of the latest pending batch; a press never moves an earlier batch. Verify: in the p6 pattern no earlier batch has a move made at a press time, and the second batch's head is at least one phrase after the first's.
- [ ] 3.2 Steer a later batch on top of the earlier pending batches (their commands pending with their own `q` and `min`) and accept its result when they commit unchanged. Verify: the second wave of p6 on a Live coder song is ready without a restart after the first wave commits, and its song is JSON-equal to a fresh steering of all commands.
- [ ] 3.3 When an earlier batch moves or restarts, restart later batches and move one that falls less than a phrase after it, with the reason `order`. Verify: the check forces the first wave to move (a long task before its boundary) and reads `order` on the second.
- [ ] 3.4 `addAt` reads this song's measured preparation (`item.addPrep`, else the page's); a `not ready` move goes to the first phrase start that leaves it; remove `expectedPrep` or route it through this value. Verify: on the baseline Live coder seed `waves-switch-berlin-techno-8-p1` (12 s steering) the batch has at most 2 `not ready` moves (baseline: 11).
- [ ] 3.5 Badge: the first estimate stays the default boundary; it updates when the steering places the head and at each move, with the highlight; no extra work at the press. Verify: the click's own task stays under 20 ms (`check-add-lag.cjs`) and the badge changes within one tick of the steering answer.
- [ ] 3.6 Update the console card in `src/guide.js` (English and Italian) if the wording of waves or badge changes, and `docs/knowledge/radio-commands.md`; run `npm run check:guide` and `npm run check:knowledge`.

## 4. Check, replay and load (D7)

- [ ] 4.1 Add `tools/check-add-waves.cjs` from `openspec/changes/console-add-waves/baseline/measure.cjs` (no instrumentation): baseline scenarios, join window cases, undo, forced `order` move, two-wave replay (song JSON-equal, lines on their entry bars), head-distance distribution and moves by reason printed like the baseline table. List it in `AGENTS.md` Tooling and `docs/knowledge/checks.md`. Verify: it runs green on Classic, Crescendo and Live coder.
- [ ] 4.2 Load: with the CPU slowed 4 times, no main-thread task over 100 ms from the first press of p6 until two bars after the last entry, against the same run before the change (reported). Verify: `check-add-waves.cjs --rate 4` and `check-add-lag.cjs` pass.
- [ ] 4.3 Fixtures and replay: `npm run check:endless`, `npm run check:radio-profiles`, `npm run check:live-code`, `npm run check:crescendo` (quick) with no fixture moved; if an intended change moves them, raise `DIRECTOR_VERSION` or `SHAPES_VERSION` in the same commit. Verify: the commands' output.
- [ ] 4.4 Record the numbers (before and after for groups 1 to 4) in `DEVLOG.md`, from the check's output.

## 5. Head distance and shrinking (D5, after incremental steering)

- [ ] 5.1 Re-run `baseline/run.sh` with the instrumentation on the branch where incremental steering has landed; record the table and ask the owner to confirm the 2-phrase target, one-line head and `BATCH_HURRY`. Verify: the re-measured table is in the DEVLOG and the owner's answer in `design.md`.
- [ ] 5.2 In the batch grouping, on the first two candidate boundaries shrink the head down to one line (families in order) before trying a later boundary; candidates 3 and 4 keep today's `need`; `BATCH_TRIES` stays 4. Verify: `check-add-waves.cjs` reports at least 90 % of heads within 2 phrases and all within 4 on the baseline scenarios with a quiet page, and `check:endless` fixtures unchanged.
- [ ] 5.3 Update the head rule in `docs/knowledge/radio-commands.md` and `docs/knowledge/decisions.md` (shrink before moving, rejected: whole batch later) and run `npm run check:knowledge`; record before and after numbers in `DEVLOG.md`.
