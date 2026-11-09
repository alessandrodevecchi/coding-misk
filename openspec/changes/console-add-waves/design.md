## Context

Console "+", "−", lock and saved-pattern presses are prepared ahead in batches (`console-add-ahead`, not yet archived; `src/radio/radio.js`, "+ and − prepared ahead"). On 8 November, before this change was implemented, incremental steering landed and the late-entries fix followed (DEVLOG of 8 November). The code this change starts from:

- `batchFor` joins the **earliest** pending batch of the song that has at least `ADD_LEAD` = 2 s left, with no limit on how long after its first press. A join restarts the batch's preparation.
- A new batch takes `addAt`: the first phrase start at least `ADD_LEAD` + `expectedPrep` seconds ahead. `expectedPrep` is this song's estimate (incremental-steering D9: Classic, the last preparation of the song; a grown song, the steering time per command measured on the song times the batch's commands, plus the rest of the preparation). A "not ready" move goes to the first phrase start that leaves this estimate.
- On a grown song the steering on air (`steerOnAir`, in the console worker, with kept results) places the batch's head on the first of `BATCH_TRIES` = 2 phrase starts from its earliest one where `need = max(families, half the lines)` lines can be typed at 5 times a person's pace (`BATCH_HURRY`); the rest go over `BATCH_TAIL` = 2 phrases. With no fitting boundary it takes the first with at least 75 % of the most typing time.
- Moves are logged with a reason (`[radio] console change moved … (typing: …)`, not ready, busy page, late, steering answered after a push), but not recorded on the batch.
- A curve command on a grown song makes the director's view on the page, in a task after the press (`steerAir`, `airView`), while the worker steers; about 115 ms with the CPU slowed 4 times, 1-2 "skip query: too late" (DEVLOG of 9 November).
- The director writes a console change from the phrase start at or after its bar (`steerSong`: `from = round(at / phrase)`, forced moves keyed by phrase index). A change on a half-phrase bar is not accepted today: its forced key is fractional and never read, and `round` skips the half phrase. Verified on 9 November while writing this update.

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

### After incremental steering (8 November, same kit, adapted instrumentation)

Live coder with earlier commands: heads within 2 phrases 4 → 5 of 8, worst head 11.77 → 3.84 phrases, median steering 4.4 → 0.3 s; Crescendo with earlier commands, steering 2.4 → 0.4 s; "not ready" moves 12 → 1, "busy page" 3 → 0, "typing" 9 → 12. The remaining moves come from the head rule (at least one line per instrument) and the late joins. The before numbers of this change are measured again on the branch with `tools/check-add-waves.cjs` (DEVLOG).

## Goals / Non-Goals

**Goals:**
- Batches follow the press rhythm: a burst is one batch, a later press is a second wave that never moves the first.
- The head of each batch enters within 2 phrases of its first press; 3 or 4 phrases only as fallback; never more than 4.
- A smaller head is preferred to a later one.
- On slow songs a batch enters within 30 s of the press when a half-phrase start there leaves time for its lines.
- Every move is explained, so the checks and the DEVLOG can count causes.
- The badge costs nothing extra; a curve command does no director work on the page.

**Non-Goals:**
- Changing the typing pace model of Live coder or the Crescendo typing probe (finding 5: a follow-up question below).
- An exact badge at the press.
- Half-phrase entries for commands other than the console's prepared batches ("+", "−", saved patterns, locks).

## Decisions

### D1. Join window (owner decision A)

A batch keeps `tFirst` and `tLast` (performance time of its first and last press). `batchFor` takes the **latest** pending batch of the song and joins it only when `now − tLast ≤ 5 s`, `now − tFirst ≤ 10 s` and at least `ADD_LEAD` seconds are left. Otherwise it opens a new batch (D3).

Alternatives: a window measured on the boundary (seconds left) rather than on presses: rejected, the owner's complaint is about presses far apart in time joining. Keeping "earliest batch": rejected, it is what merges second waves into the first.

### D2. Undo (owner, final)

An undo press ("−" when a "+" of the same instrument is pending, "+" when a "−" is pending, the opposite lock) goes to the **latest** pending batch that holds the change it undoes, while that batch has more than a third of a bar left (`ADD_MARGIN`, as the lock undo today), whatever the join window, and does not move `tLast`. Taking a change back must never add a track first and remove it a phrase later.

Simplification (owner): a press after an undo is an ordinary press. In "+", "−", "+" the last "+" follows the join window of the latest batch; outside it, it opens a new batch (a new queue entry) and never goes back to the batch it was taken from.

### D3. Second wave and order (owner decision B)

A new batch's earliest boundary is `max(addAt(item), head(prev) + phrase)` where `prev` is the latest pending batch of the song (its boundary, its head once steered). A new press never moves an earlier batch: it only joins the latest one or opens a new one.

A later batch is steered on top of the earlier pending batches: its steering input is the song's commands, then the commands of each earlier pending batch as last prepared (pending, with their own `q`, `min` and `batch`), then its own. `steerOnAir` places batches in order and keeps the results of the earlier ones (incremental steering), so the later batch's head and badge are right early and cost only its own commands. When an earlier batch commits, the commands on air change and the later batch is steered again; with the kept results this costs about its own commands (0.2 to 0.8 s on a long Live coder song at normal speed). When an earlier batch moves for its own reason to less than a phrase before a later batch, or after it, the later batch moves with the reason `order`; when an earlier batch restarts, the later ones restart too.

Alternative: prepare the second wave only after the first commits. Rejected: the badge would show the default boundary for a whole phrase and the head would be placed late.

### D4. Move reasons

Every move pushes `{ from, to, why, detail }` onto the batch (`why` ∈ `typing`, `not ready`, `busy page`, `late`, `order`, `answered after a move`), keeps the existing log line and is exposed in `pendingAdds` and `addsDone` for the checks. For `typing`, the detail is the head probe `steerOnAir` already returns next to `commands` (`heads`: candidates, lines, seconds of typing needed and usable), never inside a recorded command, so the recipe and replay are untouched. Each batch also records its presses (`{ t, rel, part, kind }`, the undo ones marked) so the checks read the first press of every batch.

### D5. Head distance and shrinking (owner, final)

In `steerOnAir`'s batch grouping, the candidate boundaries are the phrase starts (and, D6, half-phrase starts) from the batch's earliest boundary (`min`) on, sorted by their distance from the batch's first press `q` (bars, in phrases):

1. **Near:** candidates within 2 phrases of `q`, in order. On each, the head takes as many lines as fit (all of them when they fit, else the most that fit, down to one line, families in the existing order: the first line of each instrument, then the second…). The first near candidate where one line fits takes the head.
2. **Near, in a hurry:** when no near candidate fits even one line (inside a growth the song has a step about every bar, so a line rarely fits a person's pace, even five times faster), the first near candidate with at least 75 % of the most typing time among them, with today's head (at least one line of each instrument and half of the lines) typed as fast as it must. Crescendo, whose typing probe never fits, keeps its bursts together this way.
3. **Fallback:** the candidates more than 2 and at most 4 phrases after `q` only when no near candidate is left (a later wave held a phrase after the one before it, a boundary held by the lead and preparation), the same way.

Measured on 9 November: taking a far boundary where a line fits before a near one in a hurry put the owner's heads 2.3 to 3.3 phrases (2 to 3 minutes) after the press on the 54-second phrases of Voltaggio, against 0.25 to 0.92 before; rejected.

The rest of the lines go over the next `BATCH_TAIL` = 2 phrases after the head, as today. `BATCH_HURRY` stays 5; `BATCH_TRIES` is replaced by the distance bounds (2 and 4 phrases). A move after the steering ("not ready", "busy page", "late", "order") still moves the whole batch to the next boundary; the 4-phrase bound is the target of the head rule, and the checks report the batches that went past it and why.

A shrunk head changes where lines go on a fresh press only; a replay uses recorded boundaries and does not run this choice, so seed fixtures do not move (`check:endless`, `check:steer-memo` must confirm).

Alternatives: keep "at least one line per instrument" on the head: rejected by the owner (a smaller head is preferred to a later one). Try the far candidates with all lines before shrinking on the near ones: rejected, it moves the head later.

### D6. Slow songs: half-phrase starts within 30 s

`ADD_CAP` = 30 s. When the first phrase start a batch may take (after `addAt`'s lead and preparation) is more than `ADD_CAP` seconds after the batch's first press, the half-phrase starts (phrase start + phrase / 2) within `ADD_CAP` seconds of the first press are candidates too, before it. On a grown song they are near candidates of D5, taken when at least one line fits there; on a Classic song (no typing) `addAt` returns the first one that leaves the lead and preparation.

The director accepts a console change on a half-phrase bar: `steerSong` rewrites from the phrase start before it (`floor`, only when the bar is exactly a half-phrase start; every other bar keeps `round`, so recorded commands and fixtures do not move) and keeps the listener's "+"/"−" entries of a half-phrase bar in its forced list under the half key; `directSong` takes them on the half-phrase bar after the moves of the phrase start. The transit and typing of a grown song already work on any bar (mixer commands use bars).

Alternative: shorten the phrase of slow songs: rejected, it changes the director's song and every fixture.

### D7. Badge

At the press the badge shows the batch's boundary as `addAt` gives it (this song's preparation estimate, D3's order). It updates when the steering answers (head placed) and at each move, with the existing highlight, from the batch's fields on the existing quarter-second paint. No steering, growth, typing probe or console rebuild runs only to refresh it.

### D8. Curve command off the page

`steerAir` no longer makes the director's view on the page while the worker steers (the worker's answer brings the view, `view: true`). Until the answer, the curve panel reads the pending curve commands of the song (energy target, lane values, resets) over the last view: a few array reads per paint. A song steered on the page (no worker) still makes the view there, as before.

### D9. Checks

`tools/check-add-lag.cjs` gains: the join window (presses at 0, 4, 8, 12 s give two batches; at 0 and 6 s two batches), an undo outside the window, "+", "−", "+" with the last press outside the window (a new batch), a second wave at least a phrase after the first, an `order` move forced by a long task before the first wave's boundary, the six presses and the owner's session with the new head targets, and a curve command at 4× CPU (no task over 100 ms, no "too late"). `tools/check-add-waves.cjs` runs the baseline scenarios of `baseline/run.sh` without instrumentation (it records the presses itself and reads the moves from the log and `addsDone`), at normal speed and with the CPU slowed, and prints the heads in phrases per batch, the moves by reason, the long tasks and "too late"; it fails when fewer than 90 % of the heads are within 2 phrases or any head is past 4.

## Risks / Trade-offs

- [A shrunk head brings one instrument in a phrase before the others, less of a "burst"] → only when the whole batch does not fit; the owner chose it over a later head.
- [Half-phrase entries change the director's rewrite on those bars] → only for new console batches on slow songs; a whole-phrase command is unchanged, fixtures do not move. A half-phrase entry sounds mid-phrase, which the owner accepted for slow songs.
- [Stacked steering of a second wave is wasted when the first wave restarts] → only when an undo reaches the first wave; the second restarts, as a join does today.
- [More, smaller batches mean more window swaps] → one per wave, at most one per phrase by D3; covered by the load checks.
- [The curve panel shows the pending value before the director has placed it] → the same value the listener dragged; the answer replaces it within about a second.

## Migration Plan

No stored data changes: recorded commands keep their form, so saved sessions replay as before. Rollback is a revert; nothing is migrated.

## Open Questions

- Crescendo's typing probe never fits (finding 5). Recommended: a follow-up issue to check whether the probe should use Crescendo's own typing pace; this change keeps the last-resort rule for Crescendo.
