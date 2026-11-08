# Spec Delta

## ADDED Requirements

### Requirement: Steering reuses the work of earlier commands

The steering of a radio song SHALL keep its result after each command or batch of commands, for both the director's rewrite and the steering on air of a grown song. A new steering of the same song SHALL reuse the kept result for the longest list of commands it shares with an earlier steering, and steer only the commands after it. The director's view of a steered song SHALL reuse the same results.

#### Scenario: A new press late in a Live coder song

- **WHEN** a grown Live coder song has eleven standing console commands and the listener presses "+" on a later phrase
- **THEN** the console worker steers only the new command, reusing the kept result of the eleven before it

#### Scenario: A burst of presses

- **WHEN** the listener presses "+ arp", then "− pad" a phrase later, then a lock a phrase after that
- **THEN** each steering costs about what its own command costs, whatever the number of commands before it

#### Scenario: A second batch on top of a pending one

- **WHEN** a batch is pending and the listener starts a second batch that enters after it
- **THEN** the steering of the second batch reuses the kept result of the first

#### Scenario: The console's view

- **WHEN** a steering on air has finished and the console asks for the director's view of the same commands
- **THEN** the view comes from the kept results, without steering the song again

### Requirement: Reuse never changes the result

A steering that reuses kept results SHALL give exactly the same output as a full steering from the song's base: the same song, notes, written code, transitions, commands with their boundaries, plan, options and director's view, byte for byte when serialized. A check SHALL compare the two over many songs, seeds, lengths and seeded random command sequences, and SHALL fail on any difference or on a kept result changed after it was kept.

#### Scenario: The check over many songs

- **WHEN** `npm run check:steer-memo` steers 20 Classic, 5 Crescendo and 10 Live coder songs, a third of them 10 minutes long, with 6 to 12 random presses each, including cancels, replaced batches and pending batches on top of each other
- **THEN** after every press the reused result equals the full steering byte for byte, and the check passes

#### Scenario: Replay of a steered session

- **WHEN** a session with console commands is replayed in a fresh page or process
- **THEN** every song is the same as it was live, although the replay starts with nothing kept, and the recorded recipe is unchanged

#### Scenario: The endless fixtures

- **WHEN** `npm run check:endless` and `tools/check-radio-profiles.mjs` run with the reuse in place
- **THEN** their fixtures do not move, and `DIRECTOR_VERSION` and `SHAPES_VERSION` stay the same

### Requirement: What makes a kept result stale

A kept result SHALL be used only for the same song base, seed, song index, controls, chooser and steering context (language, spoken context, my phrases), and for the same commands up to it, field by field. Any other change SHALL steer again from the first command that differs.

#### Scenario: A cancel in the middle

- **WHEN** the listener cancels the third of five pending or standing commands
- **THEN** the steering reuses the result of the first two and steers the rest again

#### Scenario: A change of language

- **WHEN** the app's language changes between two presses
- **THEN** the next steering keeps nothing from before the change and still gives the same result as a full steering

### Requirement: Kept results stay bounded

The kept results SHALL be bounded per worker in number and in size, the least recently used going first. A song that leaves the air SHALL drop its own kept results, and a new session SHALL drop all of them. The main thread of the page SHALL keep no results.

#### Scenario: The next song

- **WHEN** the song on air ends or is skipped and the next song starts
- **THEN** the console worker drops the kept results of the song that left

#### Scenario: A long session

- **WHEN** twenty presses are steered on each of three 10-minute songs in one worker
- **THEN** the memory the worker keeps for reuse stays under its bound

### Requirement: Steering time of a press late in a song

On the reference machine (the owner's Mac with no checks running) in Node, a press on a 10-minute Live coder or Crescendo song with eleven standing commands SHALL be steered in under 1.5 s (90th percentile over the timing script's songs). On any grown song, a press SHALL cost under 1.5 times the first press of the same song. A Classic press on a 10-minute song with eleven standing commands SHALL be steered in under 150 ms.

#### Scenario: The timing script

- **WHEN** `node tools/steer-bench.mjs` runs on the reference machine
- **THEN** it reports press 12 under 1.5 s for the 10-minute Live coder and Crescendo songs, under 150 ms for Classic, and the load average it ran under

#### Scenario: The cost does not grow with the commands

- **WHEN** the timing script compares press 12 with press 1 of the same grown song
- **THEN** press 12 costs less than 1.5 times press 1

### Requirement: A late change enters on time in the page

The radio's expected preparation of a console batch on a grown song SHALL follow the measured cost of one steering and the number of new commands in the batch, not the number of commands standing before it. In the page, with the CPU slowed 4 times, a console batch late in a 10-minute Live coder or Crescendo song SHALL be ready within one phrase, so the steering alone never pushes its entry to a later phrase.

#### Scenario: A late press on air

- **WHEN** the listener presses "+ pad" on a 10-minute Live coder song with eleven standing commands
- **THEN** the pad enters on the first phrase start that leaves the lead time plus the expected preparation, as on a song with no standing commands

#### Scenario: The estimate after many commands

- **WHEN** the twelfth command of a 10-minute grown song is pressed after the eleventh was steered in about one second
- **THEN** the expected preparation is a few seconds, not the 30 s bound
