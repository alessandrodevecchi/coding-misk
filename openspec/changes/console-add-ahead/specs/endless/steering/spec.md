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

### Requirement: Changes enter on a ready phrase boundary
A pending change SHALL enter on the first phrase boundary that starts at least 2 seconds after the press and for which the song, the window, the new track's samples and its soundfonts are all ready a third of a bar before it. When they are not ready in time, the change SHALL move to the next phrase boundary (a push) and the console SHALL show the new bar. A change SHALL never be lost and SHALL never enter half-ready. After three pushes the preparation SHALL be finished at once.

#### Scenario: Enough time
- **WHEN** the listener presses "+ pad" 9 seconds before the next phrase and the preparation takes 1 second
- **THEN** the pad starts on that phrase boundary

#### Scenario: Too close to the boundary
- **WHEN** the listener presses "+ pad" 1.5 seconds before the next phrase
- **THEN** the pad is pending for the phrase after, and the badge and the queue show that bar

#### Scenario: Preparation late
- **WHEN** the new track's soundfont has not loaded a third of a bar before the planned boundary
- **THEN** the change moves to the next phrase boundary, the queue shows the new bar, and the change enters there with its sound

### Requirement: The new track's sound is ready before its bar
Before a pending change enters, the samples and soundfonts of every track it brings in SHALL be loaded and warmed, so the first note of the new track sounds on its bar. Loading SHALL be split into tasks that stay within the load budget.

#### Scenario: A guitar the song lacks
- **WHEN** the listener presses "+ guitar" on a song with no guitar
- **THEN** the guitar's sound is loaded before its bar and its first note on that bar is heard

### Requirement: Presses on one instrument merge into a net count
Pending "+" and "−" on the same instrument for the same boundary SHALL merge into one net change: each "+" adds one, each "−" removes one. A net count of zero SHALL leave the song unchanged at that boundary and SHALL remove the row from the queue. The net change SHALL follow the existing rules of "+" and "−" (which track comes in, which leaves, the track cap, "−" never leaving the song silent). Presses beyond what the rules allow SHALL be refused with the usual reason.

#### Scenario: Two quick "+" on arp
- **WHEN** one arp plays and the listener presses "+ arp" twice within 300 ms
- **THEN** one pending row "+2 arp" shows, and from its boundary three arps play

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
Pending changes on different instruments for the same boundary SHALL be prepared as one batch and SHALL enter together on that boundary, with one change of the window. A press made while a batch is being prepared SHALL join that batch when the batch can still be prepared again in time for its boundary, else it SHALL be pending for the next phrase boundary. The order of presses within a batch SHALL NOT change the result.

#### Scenario: Different instruments in a burst
- **WHEN** the listener presses "+ arp", "− bass", "+ pad" and "+ texture" within 500 ms, 9 seconds before the next phrase
- **THEN** the four changes enter together on that phrase boundary, and no main-thread task over 100 ms runs from the first click until two bars after the boundary

#### Scenario: A press during the preparation
- **WHEN** a batch for bar 81 is being prepared and the listener presses "+ hook" 5 seconds before bar 81
- **THEN** "+ hook" joins the batch and enters on bar 81 with the others

#### Scenario: A press too late for the batch
- **WHEN** a batch for bar 81 is ready and the listener presses "+ hook" 1 second before bar 81
- **THEN** the batch enters on bar 81 without the hook, and "+ hook" is pending for the next phrase boundary

### Requirement: Pending changes are shown and can be cancelled
Each instrument with a pending change SHALL show a small badge next to its name with the net count ("+1", "+2", "−1") and the bar it enters, with the seconds left in the tooltip. The queue SHALL show one row per instrument and boundary, for example "bar 81 · +2 arp". Each row SHALL have a cancel button until a third of a bar before its bar. The texts SHALL exist in English and Italian, with English as the reference.

#### Scenario: Badge while pending
- **WHEN** "+ arp" is pending for bar 17
- **THEN** the arp's name shows a "+1" badge, its tooltip reads "Enters on bar 17, in 6 s" in English, and the queue shows "bar 17 · +1 arp"

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
From the first press of a change until two bars after it enters, the page SHALL log no "skip query: too late" and SHALL run no main-thread task over 100 ms at normal CPU speed. With the CPU slowed 4 times, no main-thread task over 100 ms SHALL run from the press until the batch is ready. This SHALL hold for "+" and "−", alone or in a burst, in Classic, Crescendo and Live coder, with up to 12 tracks.

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
