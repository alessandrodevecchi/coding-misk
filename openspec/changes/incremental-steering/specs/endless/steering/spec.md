# Spec Delta

## ADDED Requirements

### Requirement: Steering reuses the work of earlier commands
The steering of a radio song SHALL keep its result after each command, for both the director's rewrite and the steering on air of a grown song. A new steering of the same song SHALL reuse the kept result for the longest list of commands it shares with an earlier steering, and steer only the commands after it. The director's view of a steered song SHALL reuse the same results.

#### Scenario: A new press late in a Live coder song
- **WHEN** a grown Live coder song has eight standing console commands and the listener presses "+" on a later phrase
- **THEN** the console worker steers only the new command, reusing the kept result of the eight before it

#### Scenario: A burst of presses
- **WHEN** the listener presses "+ arp", then "− pad" a phrase later, then a lock a phrase after that
- **THEN** each steering costs about what its own command costs, whatever the number of commands before it

#### Scenario: The console's view
- **WHEN** a steering on air has finished and the console asks for the director's view of the same commands
- **THEN** the view comes from the kept results, without steering the song again

### Requirement: Reuse never changes the result
A steering that reuses kept results SHALL give exactly the same output as a full steering from the song's base: the same song, commands with their boundaries, plan, options and director's view, byte for byte when serialized. A check SHALL compare the two over many songs, seeds and mixed command sequences, and SHALL fail on any difference or on a kept result changed after it was kept.

#### Scenario: The check over many songs
- **WHEN** `npm run check:steer-memo` steers 20 Classic, 5 Crescendo and 10 Live coder songs with 6 to 10 mixed presses each
- **THEN** after every press the reused result equals the full steering byte for byte, and the check passes

#### Scenario: Replay of a steered session
- **WHEN** a session with console commands is replayed in a fresh page
- **THEN** every song is the same as it was live, although the replay starts with nothing kept

#### Scenario: The endless fixtures
- **WHEN** `npm run check:endless` and `tools/check-radio-profiles.mjs` run with the reuse in place
- **THEN** their fixtures do not move, and `DIRECTOR_VERSION` and `SHAPES_VERSION` stay the same

### Requirement: What makes a kept result stale
A kept result SHALL be used only for the same song base, seed, song index and steering context, and for the same commands up to it, field by field. Any other change SHALL steer again from the first command that differs. Kept results SHALL be bounded per worker, the least recently used going first, and a song that leaves the air SHALL drop its own.

#### Scenario: A cancel in the middle
- **WHEN** the listener cancels the third of five pending or standing commands
- **THEN** the steering reuses the result of the first two and steers the rest again

#### Scenario: A change of language
- **WHEN** the app's language changes between two presses
- **THEN** the next steering keeps nothing from before the change and still gives the same result as a full steering

#### Scenario: The next song
- **WHEN** the song on air ends and the next song starts
- **THEN** the console worker drops the kept results of the song that left

### Requirement: Steering time of a press late in a song
On a quiet machine in Node, a console press late in a grown Live coder song with eight standing commands SHALL be steered in under 1.5 s (90th percentile over the timing script's songs), and in under 1.5 times the first press of the same song. A Classic press late in a 144-bar song with nine standing commands SHALL be steered in under 150 ms.

#### Scenario: The timing script
- **WHEN** `node tools/steer-bench.mjs` runs on the owner's Mac with no other checks running
- **THEN** it reports press 9 under 1.5 s for the Live coder songs, under 150 ms for Classic, and the load average it ran under

#### Scenario: The cost does not grow with the commands
- **WHEN** the timing script compares press 9 with press 1 of the same Live coder song
- **THEN** press 9 costs less than 1.5 times press 1

### Requirement: A late change enters on time in the page
In the page, a console batch late in a Live coder song SHALL be ready within one phrase, so the steering alone never pushes its entry to a later phrase.

#### Scenario: A late press on air
- **WHEN** the listener presses "+ pad" on a Live coder song with eight standing commands, 9 seconds before the next phrase
- **THEN** the pad enters on that phrase start, as on a song with no standing commands
