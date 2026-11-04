# Spec Delta

## ADDED Requirements

### Requirement: A press only records a pending change
Pressing "+" or "−" on an instrument in the Arrangement group SHALL record a pending change and update the console at once. The click SHALL NOT rewrite the song, build the window or evaluate code in its own task. The heavy work SHALL happen in the background, away from the main thread where possible, and the music on air SHALL keep playing as written until the change enters.

#### Scenario: One press late in a song
- **WHEN** the listener presses "+ arp" on bar 42 of a song with eight commands already applied
- **THEN** the "+ arp" button shows its pending badge within 100 ms of the click and no main-thread task over 100 ms runs from the click on

#### Scenario: The music keeps going
- **WHEN** a "+" is pending and its preparation is still running
- **THEN** the song on air plays exactly as before the press, with no skipped scheduler window

### Requirement: A predictable default entry
By default a pending change SHALL enter at the start of the next phrase that leaves enough time: at least 2 seconds after the press plus the expected preparation time. The phrase SHALL come from the song's plan of bars, the same for songs with and without a voice track. The entry moment SHALL be deterministic: the same press at the same point of the same song SHALL give the same bar, with no random variety.

#### Scenario: Enough time
- **WHEN** the listener presses "+ pad" 9 seconds before the next phrase, the preparation takes 1 second and the page is quiet
- **THEN** the pad starts on that phrase start

#### Scenario: Too close to the phrase
- **WHEN** the listener presses "+ pad" 1.5 seconds before the next phrase
- **THEN** the pad is pending for the phrase start after it, and the instrument shows that time from the click

#### Scenario: The same press twice
- **WHEN** a session is replayed and the listener presses "+ arp" at the same bar and beat as before, on a quiet page
- **THEN** the arp is planned for the same bar as before

#### Scenario: A song without a voice track
- **WHEN** the song on air has no voice track and the listener presses "+ arp"
- **THEN** the arp is planned for the next phrase start of the song's plan, as on a song with a voice

### Requirement: A later entry only when needed
A change SHALL move later than its planned phrase start only when its preparation is not finished a third of a bar before it, or when the page is busy: a main-thread task over 50 ms or a skipped scheduler window in the last 2 seconds, or an expected entry cost above the scheduler's margin. It SHALL then move to the next sensible boundary: a half-phrase start, else the next phrase start.

#### Scenario: Preparation late
- **WHEN** the new track's soundfont has not loaded a third of a bar before the planned phrase start, in an 8-bar phrase
- **THEN** the change moves to four bars later, the instrument shows the new time, and the change enters there with its sound

#### Scenario: A busy page
- **WHEN** a "+ arp" is ready but a long task of 120 ms ran 1 second before the planned phrase start
- **THEN** the arp moves to the next sensible boundary, and the instrument and the queue show the new bar and time

### Requirement: The wait under load is bounded
A change SHALL never be lost and SHALL never enter half-ready. When the page stays busy, the change SHALL keep moving to the next sensible boundary until 30 seconds after the press. It SHALL then enter on the next boundary where it is ready, even under load, and the page SHALL log that it entered under load, with the bar.

#### Scenario: The upper bound
- **WHEN** the page stays busy for 30 seconds after the press
- **THEN** the change enters on the next boundary where it is ready, and the page logs "entered under load" with the bar

#### Scenario: Cancel while waiting
- **WHEN** a change waits under load and the listener cancels it
- **THEN** nothing changes at any boundary

### Requirement: The new track's sound is ready before its bar
Before a pending change enters, the samples and soundfonts of every track it brings in SHALL be loaded and warmed, so the first note of the new track sounds on its bar. Loading SHALL be split into tasks that stay within the load budget.

#### Scenario: A guitar the song lacks
- **WHEN** the listener presses "+ guitar" on a song with no guitar
- **THEN** the guitar's sound is loaded before its bar and its first note on that bar is heard

### Requirement: Presses on one instrument merge into a net count
Pending "+" and "−" on the same instrument for the same boundary SHALL merge into one net change: each "+" adds one, each "−" removes one. A net count of zero SHALL leave the song unchanged at that boundary and SHALL remove the row from the queue. The net change SHALL follow the existing rules of "+" and "−" (which track comes in, which leaves, the track cap, "−" never leaving the song silent). Presses beyond what the rules allow SHALL be refused with the usual reason.

#### Scenario: Two quick "+" on arp
- **WHEN** one arp plays and the listener presses "+ arp" twice within 300 ms
- **THEN** the arp shows "+2" with one entry time, and from that boundary three arps play

#### Scenario: Three quick "+" on pad
- **WHEN** the listener presses "+ pad" three times within 500 ms and the track cap allows only two more tracks
- **THEN** the net count stops at "+2 pad", the third press is refused with the track limit reason, and two pads enter together

#### Scenario: "+" then "−" before the entry
- **WHEN** the listener presses "+ melody" and then "− melody" before the change enters
- **THEN** the two cancel out, the queue shows no row for melody, and nothing changes at the boundary

#### Scenario: "+ − +" on texture
- **WHEN** the listener presses "+ texture", "− texture", "+ texture" within 500 ms
- **THEN** one pending row "+1 texture" shows and one texture enters at the boundary

#### Scenario: Two quick "−" on pad
- **WHEN** three pads play and the listener presses "− pad" twice quickly
- **THEN** one pending row "−2 pad" shows, and from its boundary one pad plays: the last two added leave first

#### Scenario: "−" on the last track of the song
- **WHEN** a song plays only one track and the listener presses "−" on its instrument
- **THEN** the press is refused with the reason, as today, and nothing is pending

### Requirement: Changes for one boundary enter together
Pending changes on different instruments for the same boundary SHALL be prepared as one batch and SHALL enter together on that boundary, with one change of the window. A press made while a batch is being prepared or ready SHALL join that batch when at least 2 seconds are left before its boundary, else it SHALL be pending for the next sensible boundary. The order of presses within a batch SHALL NOT change the result.

#### Scenario: Different instruments in a burst
- **WHEN** the listener presses "+ arp", "− bass", "+ pad" and "+ texture" within 500 ms, 9 seconds before the next phrase, on a quiet page
- **THEN** the four changes enter together on that phrase boundary, and no main-thread task over 100 ms runs from the first click until two bars after the boundary

#### Scenario: A press during the preparation
- **WHEN** a batch for bar 81 is being prepared and the listener presses "+ hook" 5 seconds before bar 81
- **THEN** "+ hook" joins the batch and enters on bar 81 with the others

#### Scenario: A press too late for the batch
- **WHEN** a batch for bar 81 is ready and the listener presses "+ hook" 1 second before bar 81
- **THEN** the batch enters on bar 81 without the hook, and "+ hook" is pending for the next sensible boundary

### Requirement: The entry time is shown at the click and counted down
From the click, each instrument with a pending change SHALL show a badge with the net count and the time left, for example "+1 · Enters in 6 s", counted down every second until the entry. When the entry moves later, the badge SHALL show the new time at once with a short visible highlight. The tooltip SHALL name the bar. Texts SHALL exist in English and Italian, English as the reference.

#### Scenario: Time at the click
- **WHEN** the listener presses "+ arp" and the arp is planned for bar 17, 6 seconds away
- **THEN** within 100 ms the arp shows "+1 · Enters in 6 s", and its tooltip reads "Enters on bar 17"

#### Scenario: Countdown
- **WHEN** 3 seconds pass with the arp pending for bar 17
- **THEN** the badge reads "+1 · Enters in 3 s"

#### Scenario: Moved later
- **WHEN** the arp's entry moves from bar 17 to bar 21 because the page was busy
- **THEN** the badge shows the new time at once with a short highlight, and the tooltip reads "Enters on bar 21"

#### Scenario: Entered
- **WHEN** the arp enters
- **THEN** the badge goes and the instrument's track count goes up by one

### Requirement: Pending changes are listed and can be cancelled
The queue SHALL show one row per instrument and boundary, with its bar and the time left, for example "bar 81 · +2 arp · 6 s". Each row SHALL have a cancel button until a third of a bar before its bar.

#### Scenario: Several pending rows
- **WHEN** "+2 arp" and "−1 bass" are pending for bar 81
- **THEN** the queue shows two rows for bar 81, each with its cancel button, and both badges show

#### Scenario: Cancel before the entry
- **WHEN** the listener cancels the row "+2 arp" 4 seconds before its bar
- **THEN** the badge goes, nothing changes for the arp at that bar, and the other rows of the batch still enter

#### Scenario: Too late to cancel
- **WHEN** less than a third of a bar is left before the row's bar
- **THEN** the cancel button is disabled with the tooltip "Entering now"

### Requirement: Adding and removing stay within the load budget
From the first press of a change until two bars after it enters, the page SHALL log no "skip query: too late" and SHALL run no main-thread task over 100 ms at normal CPU speed. With the CPU slowed 4 times, no main-thread task over 100 ms SHALL run from the press until the batch is ready. This SHALL hold for "+" and "−", alone or in a burst, in Classic, Crescendo and Live coder, with up to 12 tracks, except for a change that reached the 30-second bound under load.

#### Scenario: Removal in Live coder
- **WHEN** the listener presses "− pad" twice quickly on a Live coder song on bar 50
- **THEN** no "skip query: too late" is logged and no task over 100 ms runs until two bars after the pads leave

#### Scenario: A burst on a 12-track song
- **WHEN** a Classic song plays 11 tracks and the listener presses "+ arp" and "− bass" within 300 ms
- **THEN** no "skip query: too late" is logged until two bars after the boundary

### Requirement: Merged changes replay the same
A session SHALL record the net changes that entered, with their boundary, in the same command form the radio records today. A replay SHALL give the same song. Presses that cancelled each other SHALL leave nothing in the record.

#### Scenario: Replay after a burst
- **WHEN** a session had "+ arp", "+ arp", "− arp" and "+ pad" pressed quickly for bar 33 and is replayed
- **THEN** the replay has one more arp and one more pad from bar 33, as heard

### Requirement: A lock press is prepared ahead like "+" and "−"
Pressing the lock of an instrument in the Arrangement group, or the lock of a track in the mixer, SHALL record a pending lock change and SHALL NOT rewrite the song in the click's task. The change SHALL follow the rules of "+" and "−": the default entry at the next phrase start that leaves enough time, a later entry only for preparation or load, the 30-second bound, one batch per boundary with the "+" and "−" changes of that boundary, and the load budget. A lock and an unlock of the same instrument or track for one boundary SHALL cancel out. From the click the lock SHALL show its pending state and the time left, and its tooltip SHALL name the bar.

#### Scenario: A lock late in a song
- **WHEN** the listener presses the lock of the kick on bar 75 of a Classic song with six commands already applied
- **THEN** the lock shows its pending state within 100 ms, no main-thread task over 100 ms runs from the click on, and the kick is locked from the next phrase start that leaves enough time

#### Scenario: Lock and unlock before the entry
- **WHEN** the listener locks the bass and unlocks it again before the change enters
- **THEN** nothing is pending for the bass and nothing changes at the boundary

#### Scenario: A lock with a "+" in a burst
- **WHEN** the listener presses "+ arp" and the lock of the bass within 500 ms, 9 seconds before the next phrase
- **THEN** both enter together on that phrase start, with one steering and one change of the window

#### Scenario: A lock in the mixer
- **WHEN** the listener presses the lock of one track in the mixer
- **THEN** the same rules apply to that track, and its lock button shows the pending state until the change enters

