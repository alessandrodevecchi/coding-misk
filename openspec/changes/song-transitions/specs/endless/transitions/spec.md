# Spec Delta

## Purpose

Transitions join one song to the next the way a DJ would, in the radio and in playlists, chosen by the artist's taste.

## ADDED Requirements

### Requirement: Transition kinds
The system SHALL support six transitions between a song and the next one: mix, morph, break and riser, echo out, interlude, and cut. Every transition SHALL start and end on phrase boundaries, SHALL keep the beat continuous (no gap longer than one beat, except the silence of an interlude), and SHALL leave the next song playing as written once the transition is over.

#### Scenario: Mix
- **WHEN** a mix of 16 bars joins song A to song B
- **THEN** during the last 16 bars of A the tracks of B enter one group at a time (drums first, then bass, then the rest), the tracks of A fade and filter out by the end, the second half of the mix is in B's key, and from the first bar after the mix only B plays

#### Scenario: Morph
- **WHEN** a morph of two phrases joins A to B
- **THEN** the tracks of A are removed and those of B added one at a time on phrase or half-phrase boundaries, and at the end only B's tracks play

#### Scenario: Break and riser
- **WHEN** a break and riser joins A to B
- **THEN** A's last phrase keeps at most pad and texture with a riser and a rising filter, and B starts on its first bar with a crash

#### Scenario: Echo out
- **WHEN** an echo out joins A to B
- **THEN** A's tracks end into a delay and reverb tail of one to two bars and B starts while the tail fades

#### Scenario: Interlude
- **WHEN** an interlude joins A to B
- **THEN** between A and B there are one to four phrases with at most two quiet tracks, occasional sounds and at least one spoken comment, then B starts

#### Scenario: Cut
- **WHEN** a cut joins A to B
- **THEN** B starts on the bar after A's last bar, as before

### Requirement: Tempo across a transition
When two songs have different tempos, a mix and a morph SHALL ramp the tempo from A's to B's over the transition; the other transitions SHALL change tempo at the start of B. A mix or morph SHALL NOT be planned for a tempo change larger than 12 BPM; the director SHALL pick another kind from the artist's preferences instead.

#### Scenario: Tempo ramp
- **WHEN** a mix joins A at 126 BPM to B at 132 BPM
- **THEN** the tempo rises from 126 to 132 across the mix bars

### Requirement: Artist preferences and chaos
An artist SHALL be able to give weights for the six transitions, a range of lengths in bars, and a harmony mode (compatible or free). An artist without these SHALL get defaults (mostly mix and cut, compatible harmony). Chaos SHALL raise the chance of a less preferred kind. Each transition SHALL be chosen with the session's seeded random, so a seed always gives the same transitions.

#### Scenario: Preferences followed
- **WHEN** a long session is generated with an artist who weights break and riser highest
- **THEN** break and riser is the most frequent transition of the session

#### Scenario: Same seed, same transitions
- **WHEN** the same seed and options are used twice
- **THEN** the transitions are the same kinds, at the same bars, with the same lengths

### Requirement: Radio menus
The Radio SHALL offer a "Transitions" menu (the artist's choice, or always one of the six kinds) and a "Harmony" menu (the artist's choice, compatible, free). A change SHALL apply from the next transition the director plans and SHALL be recorded in the session recipe.

#### Scenario: Always mix
- **WHEN** the user picks "always mix"
- **THEN** every transition planned after that is a mix, unless the tempo jump forbids it, in which case a cut is used

### Requirement: Harmony modes
In compatible mode the director SHALL pick the next song's key a fifth up or down from the current song's key, and its tempo within 12 BPM of the current one, when the styles allow it. In free mode keys and tempos SHALL be chosen as before. In both modes consecutive songs SHALL NOT share the same key unless the styles allow only one.

#### Scenario: Compatible key
- **WHEN** compatible harmony is on, a song is in A, and the next song's styles allow D and E
- **THEN** the next song is in D or E

### Requirement: Transitions in playlists
The player bar SHALL offer, for playlists, a choice between cut and mix, remembered in the browser. With mix, two composed songs in a row SHALL be joined by a mix of 8 bars; a song with a different tempo SHALL get a tempo ramp within the mix limit, or a cut beyond it. A code song SHALL always be joined with a cut.

#### Scenario: Mix in a playlist
- **WHEN** mix is chosen and a playlist plays two composed songs in a row
- **THEN** the second song's tracks enter during the first song's last 8 bars and the second song continues as written after that

#### Scenario: Code song cuts
- **WHEN** a playlist moves from a composed song to a code song with mix chosen
- **THEN** the code song starts with a plain cut
