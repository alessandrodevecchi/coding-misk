# Tasks

Incremental steering has landed (8 November); every group can start. The owner's final decisions of 8 November are in `design.md` (D1 to D8).

## 0. Before

- [x] 0.1 Add `tools/check-add-waves.cjs` from `baseline/measure.cjs` without instrumentation: it records each press and the batch it went to, reads the moves from the console log and `addsDone`, and prints per batch the head and last line in phrases from the first press, the moves with their reasons, the steering time; per run the long tasks and "too late"; a summary per profile; `--rate n` slows the CPU. Run it on the branch before any code change (normal speed: the scenarios of `baseline/run.sh`; 4×: berlin-techno with 8 earlier commands, p3 and p6, every profile) and keep the output for the DEVLOG.

## 1. Move reasons (D4)

- [x] 1.1 Record every move of a batch as `{ from, to, why, detail }` with `why` in `typing`, `not ready`, `busy page`, `late`, `order`, `answered after a move`; keep the log line; record the presses (`{ t, rel, part, kind, undo }`); expose `moves` and `presses` in `pendingAdds` and `addsDone`. Verify: `check-add-lag.cjs` reads `busy page` from `addsDone` in its push case.
- [x] 1.2 The typing detail comes from the `heads` field `steerOnAir` already returns next to `commands`, never inside a recorded command. Verify: `check:endless` and `check:radio-profiles` unchanged.

## 2. Join window and undo (D1, D2)

- [x] 2.1 Keep `tFirst` and `tLast` on each batch; `batchFor` joins the latest pending batch only within 5 s of its last press, 10 s of its first and with `ADD_LEAD` left, else opens a new batch. Verify in `check-add-lag`: presses at 0, 4, 8, 12 s give two batches (0-8 s and 12 s); presses at 0 and 6 s give two batches.
- [x] 2.2 An undo press goes to the latest batch holding that change while more than `ADD_MARGIN` of a bar is left, without moving `tLast`; a later press is ordinary. Verify: "+ arp", then "− arp" 12 s later leaves no pending change and no new batch; "+", then "−" and "+" 12 s later leave one new batch with "+1".

## 3. Second wave, order (D3)

- [x] 3.1 A new batch's earliest boundary is at least one phrase after the head of the latest pending batch; a press never moves an earlier batch. Verify: in the p6 pattern no earlier batch moves at a press, and the second batch's head is at least one phrase after the first's.
- [x] 3.2 Steer a later batch on top of the earlier pending batches (their last prepared commands); steer it again when they commit or restart. Verify: `check:steer-memo` (stacked batches) and the second wave of p6 enter with their song JSON-equal to a replay.
- [x] 3.3 When an earlier batch moves to less than a phrase before a later one, or after it, move the later one with the reason `order`. Verify: `check-add-lag` forces the first wave to move (a long task before its boundary) and reads `order` on the second.

## 4. Head distance and shrinking (D5)

- [x] 4.1 In the batch grouping of `steerOnAir`: near candidates within 2 phrases of the first press, then fallback candidates up to 4 phrases, each taking the most lines that fit down to one; last resort bounded to 4 phrases. Verify: `check:endless`, `check:steer-memo`, `check:radio-profiles`, `check:live-code`, `check:crescendo` unchanged.
- [x] 4.2 Update `check-add-lag` (six presses, owner's session): head within 2 phrases, every head within 4, at least 90 % within 2 in the owner's session. Verify: `check-add-lag` (all profiles) and `--owner` pass.

## 5. Slow songs (D6)

- [x] 5.1 Director: a console "+"/"−" on a half-phrase start is forced on that bar (`steerSong` from the phrase start before it, `directSong` half keys); any other bar as before. Verify: a Node test (in `check:endless` or `check:radio-profiles`) that a "+" on a half-phrase bar adds its track on that bar, and fixtures unchanged.
- [x] 5.2 Radio and steering: when the first phrase start is more than `ADD_CAP` = 30 s after the first press, offer the half-phrase starts within 30 s (Classic `addAt`, grown songs' near candidates). Verify: the owner's session (67-71 BPM) has heads within 30 s where one line fits; `check-add-waves` lo-fi runs unchanged where phrases are under 30 s.

## 6. Badge and curve (D7, D8)

- [x] 6.1 Badge: the estimate from the batch's fields; no extra steering, growth or rebuild to refresh it. Verify: the click's own task stays under 20 ms (`check-add-lag`).
- [x] 6.2 Curve: no director view on the page while the worker steers; the curve panel shows pending curve values. Verify: `check-add-lag` curve case at 4× (no task over 100 ms, no "too late", the curve value shown at once); `check-steering` curve drag.

## 7. Docs, checks, numbers

- [x] 7.1 Update the console card in `src/guide.js` (English and Italian), `docs/knowledge/radio-commands.md`, `docs/knowledge/decisions.md`, `docs/knowledge/checks.md`, `AGENTS.md` tooling; run `npm run check:guide` and `npm run check:knowledge`.
- [x] 7.2 Run `check:steer-memo`, `check:endless`, `check:radio-profiles`, `check:live-code`, `check:crescendo`, `check:sound-guard`, `check:knowledge`, `check:guide`, `npm run build`, `check-add-lag` (all profiles and `--owner`), `check-add-waves` (1× and 4×); no fixture moves (or a version bump, explained).
- [x] 7.3 Record before and after (heads in phrases per batch, moves by reason, long tasks, "too late", 1× and 4×) in `DEVLOG.md`; `CHANGELOG.md` under Unreleased.
