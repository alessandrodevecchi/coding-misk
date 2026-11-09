## ADDED Requirements

### Requirement: A press joins a pending batch only within its join window
A press of "+", "−", a lock or a saved pattern on the song on air SHALL join a pending batch only when it comes at most 5 seconds after that batch's last press, at most 10 seconds after that batch's first press, and at least 2 seconds before that batch's boundary. Otherwise the press SHALL open a new batch.

#### Scenario: A quick burst
- **WHEN** the listener presses "+ arp", "+ pad" and "+ bass" 300 ms apart
- **THEN** the three presses make one batch

#### Scenario: A press 15 seconds later
- **WHEN** a batch has its first press at 0 s and the listener presses "+ arp" again at 15 s, while the batch is still pending
- **THEN** the second press opens a new batch, and the first batch keeps its boundary

#### Scenario: A burst that goes on
- **WHEN** the listener presses every 4 seconds from 0 s to 12 s
- **THEN** the presses at 0, 4 and 8 s make one batch and the press at 12 s opens a new batch, because it comes more than 10 s after the first press

### Requirement: A press that undoes a pending change goes back to its batch
A press that undoes a pending change (a "−" after a pending "+" of the same instrument, the other way round, or the opposite lock) SHALL go to the latest pending batch that holds that change while at least 2 seconds are left before its boundary, whatever the join window. It SHALL NOT count as a press of that batch for the window.

#### Scenario: Undo outside the window
- **WHEN** "+ arp" is pending in a batch whose first press was 12 seconds ago, and the listener presses "− arp"
- **THEN** the pending "+ arp" is taken back from that batch, and no new batch is opened

### Requirement: A later batch enters as a second wave
A new batch SHALL take as its earliest boundary the first phrase start that leaves the usual lead and preparation time and that is at least one phrase after the head boundary of every pending batch before it on the same song. A new press SHALL NOT move a pending batch.

#### Scenario: Two waves
- **WHEN** a batch is pending for bar 81 (8-bar phrases) and the listener presses "+ hook" 15 seconds after that batch's first press
- **THEN** "+ hook" is pending for bar 89 or later, and the first batch still enters on bar 81

### Requirement: Waves keep their order
When an earlier batch moves for its own reason to a boundary less than one phrase before a later batch's boundary, or after it, the later batch SHALL move to keep at least one phrase after it, with the reason "order".

#### Scenario: The earlier batch moves
- **WHEN** the first batch moves from bar 81 to bar 89 because it was not ready, and the second batch was pending for bar 89
- **THEN** the second batch moves to bar 97 with the reason "order", and both badges show their new times at once

### Requirement: Every move of a batch has a recorded reason
Each time a pending batch's boundary moves, the radio SHALL record the old bar, the new bar and one reason: "typing" (its lines cannot be typed in time on that boundary), "not ready" (preparation not finished), "busy page" (page not quiet), "late" (boundary passed), "order" (behind an earlier batch) or "bound" (entered under load after 30 seconds). The browser checks SHALL read the reasons of pending and entered batches, and each move SHALL be logged on the console.

#### Scenario: A move for preparation
- **WHEN** a Live coder batch is not ready a third of a bar before its boundary
- **THEN** it moves to the next phrase start, and its record shows the move with the reason "not ready"

#### Scenario: A batch that never moved
- **WHEN** a batch enters on the boundary shown at the press
- **THEN** its record shows no move

### Requirement: The head of a batch enters close to the press
On a grown song with a quiet page, the head of a batch (at least one new line) SHALL enter within 2 phrases of its first press. A later head, at most 4 phrases after the press, SHALL happen only as an automatic fallback when no earlier boundary leaves time for even one line. This requirement depends on the incremental steering change: it SHALL be verified only after that change has landed, on the same scenarios as this change's baseline, with the thresholds confirmed by the owner then.

#### Scenario: Six quick presses on a grown song
- **WHEN** the listener presses "+" six times on three instruments within 2 seconds, late in a Live coder song with eight commands already applied
- **THEN** at least one new line enters within 2 phrases of the first press, and every new line of the batch enters within 4 phrases

### Requirement: The head shrinks before the batch moves
Before the head of a batch moves to a later boundary for typing, the radio SHALL first take fewer lines on the earlier boundary, down to one line, and bring the rest in over the following phrases. This requirement depends on the incremental steering change and SHALL be verified after it, as the head distance is.

#### Scenario: Too much to type at once
- **WHEN** the six lines of a batch cannot all be typed in time on the first boundary but one line can
- **THEN** one or more lines enter on the first boundary and the rest follow on the next phrases, instead of the whole batch moving later

### Requirement: The badge estimate costs nothing extra
The badge time SHALL come from values the radio already has at the press (the planned boundary, the last preparation time) and SHALL update when the batch moves or its steering answers. The radio SHALL NOT run any extra steering, growth or typing estimate only to make the first estimate exact.

#### Scenario: Estimate refined later
- **WHEN** the badge shows "Enters in 5 s" and the steering then places the head one phrase later
- **THEN** the badge shows the new time at once with its highlight, and no extra work ran at the press beyond the press itself

### Requirement: Waves stay within the load budget
The join window, the second wave and the move records SHALL add no main-thread task over 100 ms with the CPU slowed 4 times, from the first press until two bars after the last entry, compared with the same presses before this change.

#### Scenario: Two waves at 4 times slower CPU
- **WHEN** the listener presses three "+" quickly and two more 15 seconds later on a Live coder song, with the CPU slowed 4 times
- **THEN** no main-thread task over 100 ms runs from the first press until two bars after the second wave enters

### Requirement: Waves replay the same
The recorded commands SHALL keep their present form with their entry bars, and a replay of the recipe SHALL give the same song with every batch's lines on the bars where they entered. The endless seed fixtures and the Live coder and Crescendo fixtures SHALL NOT move; if an intended change moves them, the director or shapes version SHALL be raised in the same commit.

#### Scenario: Replay of two waves
- **WHEN** a session had a first batch entering on bars 81 and 89 and a second batch entering on bar 97, and the recipe is replayed
- **THEN** the replay has the same lines on bars 81, 89 and 97 and the same song

#### Scenario: Fixtures unchanged
- **WHEN** `npm run check:endless` and the Crescendo checks run after this change
- **THEN** no fixture moves
