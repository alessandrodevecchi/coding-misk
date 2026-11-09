## ADDED Requirements

### Requirement: A press joins a pending batch only within its join window
A press of "+", "−", a lock or a saved pattern on the song on air SHALL join the latest pending batch of the song only when it comes at most 5 seconds after that batch's last press, at most 10 seconds after that batch's first press, and at least 2 seconds before that batch's boundary. Otherwise the press SHALL open a new batch.

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
A press that undoes a pending change (a "−" after a pending "+" of the same instrument, the other way round, or the opposite lock) SHALL go to the latest pending batch that holds that change while more than a third of a bar is left before its boundary, whatever the join window. It SHALL NOT count as a press of that batch for the window. A later press SHALL be an ordinary press: it SHALL follow the join window and SHALL NOT go back to the batch the change was taken from because of the undo.

#### Scenario: Undo outside the window
- **WHEN** "+ arp" is pending in a batch whose first press was 12 seconds ago, and the listener presses "− arp"
- **THEN** the pending "+ arp" is taken back from that batch, and no new batch is opened

#### Scenario: Plus, minus, plus
- **WHEN** "+ arp" is pending in a batch whose first press was 12 seconds ago, the listener presses "− arp" and then "+ arp" again
- **THEN** the "− arp" takes the change back from the first batch, and the last "+ arp" opens a new batch with its own queue entry

### Requirement: A later batch enters as a second wave
A new batch SHALL take as its earliest boundary the first boundary that leaves the usual lead and preparation time and that is at least one phrase after the head boundary of every pending batch before it on the same song. A new press SHALL NOT move a pending batch.

#### Scenario: Two waves
- **WHEN** a batch is pending for bar 81 (8-bar phrases) and the listener presses "+ hook" 15 seconds after that batch's first press
- **THEN** "+ hook" is pending for bar 89 or later, and the first batch still enters on bar 81

### Requirement: Waves keep their order
When an earlier batch moves for its own reason to a boundary less than one phrase before a later batch's boundary, or after it, the later batch SHALL move to keep at least one phrase after it, with the reason "order".

#### Scenario: The earlier batch moves
- **WHEN** the first batch moves from bar 81 to bar 89 because it was not ready, and the second batch was pending for bar 89
- **THEN** the second batch moves to bar 97 with the reason "order", and both badges show their new times at once

### Requirement: Every move of a batch has a recorded reason
Each time a pending batch's boundary moves, the radio SHALL record the old bar, the new bar and one reason: "typing" (its lines cannot be typed in time on that boundary), "not ready" (preparation not finished), "busy page" (page not quiet), "late" (boundary passed), "order" (behind an earlier batch) or "answered after a move" (a steering that answered after the batch moved placed it later). The browser checks SHALL read the reasons and the presses of pending and entered batches, and each move SHALL be logged on the console.

#### Scenario: A move for preparation
- **WHEN** a Live coder batch is not ready a third of a bar before its boundary
- **THEN** it moves to the next boundary that leaves its preparation, and its record shows the move with the reason "not ready"

#### Scenario: A batch that never moved
- **WHEN** a batch enters on the boundary shown at the press
- **THEN** its record shows no move

### Requirement: The head of a batch enters close to the press
On a grown song, the head of a batch (at least one new line) SHALL enter within 2 phrases of its first press when any boundary within 2 phrases leaves time to type one line. A head 3 or 4 phrases after the press SHALL happen only as a fallback, when no boundary within 2 phrases leaves time for even one line. The steering SHALL never place a head more than 4 phrases after the press. On the baseline scenarios of this change and the owner's session (seed 69qgtn), at least 90 % of the heads SHALL enter within 2 phrases of their first press and all within 4.

#### Scenario: Six quick presses on a grown song
- **WHEN** the listener presses "+" six times on three instruments within 2 seconds, late in a Live coder song with eight commands already applied
- **THEN** at least one new line enters within 2 phrases of the first press, and every new line of the batch enters within 4 phrases

### Requirement: The head shrinks before the batch moves
Before the head of a batch moves to a later boundary for typing, the steering SHALL first take fewer lines on the earlier boundary, down to one line, and bring the rest in over the following phrases.

#### Scenario: Too much to type at once
- **WHEN** the six lines of a batch cannot all be typed in time on the first boundary but one line can
- **THEN** one or more lines enter on the first boundary and the rest follow on the next phrases, instead of the whole batch moving later

### Requirement: Slow songs enter within 30 seconds on a half-phrase start
When the first phrase start a batch may take is more than 30 seconds after its first press, the radio SHALL also offer the half-phrase starts within 30 seconds of the first press, and the batch SHALL enter on the first of them where its lines fit (on a grown song, at least one line of its head; on a Classic song, the lead and preparation). The director SHALL accept a console change on a half-phrase start and place it on that bar; a command on any other bar SHALL be placed as before.

#### Scenario: A slow song
- **WHEN** a Live coder song plays at 67 BPM with 16-bar phrases (about 57 s each), the listener presses "+ pad" 5 seconds after a phrase start, and one line can be typed before the half-phrase start
- **THEN** the "+ pad" line enters on that half-phrase start, about 23 seconds after the press, not on the next phrase start

#### Scenario: Fixtures unchanged by half phrases
- **WHEN** `npm run check:endless` and the Crescendo and Live coder checks run after this change
- **THEN** no fixture moves

### Requirement: The badge estimate costs nothing extra
The badge time SHALL come from values the radio already has (the batch's boundary, this song's preparation estimate) and SHALL update when the batch moves or its steering answers. The radio SHALL NOT run any extra steering, growth, typing estimate or console rebuild only to refresh the badge.

#### Scenario: Estimate refined later
- **WHEN** the badge shows "Enters in 5 s" and the steering then places the head one phrase later
- **THEN** the badge shows the new time at its next paint with its highlight, and no extra work ran beyond the press and the steering

### Requirement: A curve command does no director work on the page
A curve or curve reset command on a grown song SHALL NOT make the director's view on the main thread while its steering runs away from the page; the curve panel SHALL show the pending value from the command until the steering answers.

#### Scenario: A curve at 4 times slower CPU
- **WHEN** the listener sets a curve part on a Live coder song with the CPU slowed 4 times
- **THEN** no main-thread task over 100 ms and no "skip query: too late" follow the command, and the curve shows the new value at once

### Requirement: Waves stay within the load budget
The join window, the second wave, the head rule and the move records SHALL add no main-thread task over 100 ms of the batches' own work with the CPU slowed 4 times, from the first press until the batch is ready, compared with the same presses before this change.

#### Scenario: Two waves at 4 times slower CPU
- **WHEN** the listener presses three "+" quickly and two more 15 seconds later on a Live coder song, with the CPU slowed 4 times
- **THEN** the batches' own work on the main thread stays under 100 ms in every task

### Requirement: Waves replay the same
The recorded commands SHALL keep their present form with their entry bars, and a replay of the recipe SHALL give the same song with every batch's lines on the bars where they entered. The endless seed fixtures and the Live coder and Crescendo fixtures SHALL NOT move; if an intended change moves them, the director or shapes version SHALL be raised in the same commit.

#### Scenario: Replay of two waves
- **WHEN** a session had a first batch entering on bars 81 and 89 and a second batch entering on bar 97, and the recipe is replayed
- **THEN** the replay has the same lines on bars 81, 89 and 97 and the same song
