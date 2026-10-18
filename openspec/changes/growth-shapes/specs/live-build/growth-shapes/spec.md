## Purpose

Growth shapes give a live build its opening, its pace and its development, so songs built with the Live coder profile do not all start and grow the same way.

## ADDED Requirements

### Requirement: Growth shape
A growth shape SHALL be made of an opening, a pace and a development. A live build with the Live coder profile (the growth "natural, like a live coder") SHALL follow one growth shape. Each of the three parts SHALL be chosen by the song when the song names it, else by the weights of the song's style recipe, else by a draw from the song's seed.

#### Scenario: Song names its opening
- **WHEN** a song names the opening "full kick" and plays with the Live coder profile
- **THEN** its build opens with the full kick, whatever its style weights say

#### Scenario: Style weights
- **WHEN** a song names no shape and its style gives the opening "pad or drone" the only weight
- **THEN** its build opens with a pad or a drone

#### Scenario: Nothing named
- **WHEN** neither the song nor its style names any part of the shape
- **THEN** the seed of the song draws the opening, the pace and the development, and the same song draws the same shape every time

### Requirement: Classic and Crescendo unchanged
The Classic and Crescendo profiles SHALL NOT use growth shapes. Their builds SHALL stay identical to the builds before this change, step for step.

#### Scenario: Crescendo build
- **WHEN** a built-in song plays with the Crescendo profile
- **THEN** its steps, bars, code and comments equal those before this change

### Requirement: Openings
The opening SHALL be one of: slow ("Lenta", a single kick on beat one that grows, as today), full kick, typed (silence while the first line is typed), broken beat (first hits not built around beat one), filtered kick that opens, melodic (an arpeggio or a synth first), pad or drone, voice (a spoken line), muted base (written tracks muted with `_$:` switched on one by one), mid-set (two tracks already playing in solo).

#### Scenario: Broken beat from a breakbeat
- **WHEN** a song with a breakbeat groove opens with "broken beat"
- **THEN** its first drum hits keep the off-beat kicks of the groove, not one kick on beat one

#### Scenario: Typed opening
- **WHEN** a song opens with "typed"
- **THEN** the first bars are silent while the first line appears key by key, and the line sounds on the bar after it is complete

#### Scenario: Muted base
- **WHEN** a song opens with "muted base"
- **THEN** the code shows its tracks from the start, the muted ones with `_$:`, and each later step removes one `_`

### Requirement: Impossible openings
An opening that the song cannot play (no drums for a kick opening, no voice instrument for the voice opening, no melodic track for the melodic opening) SHALL NOT be chosen; the choice SHALL fall to the next candidate of the same rule (song, style, seed).

#### Scenario: Impossible opening
- **WHEN** the seed draws "voice" for a song without a voice instrument
- **THEN** another opening is chosen and the build plays without errors

### Requirement: Pace
The pace SHALL be slow, medium or fast. Slow SHALL keep today's spacing of the Live coder growth. Medium SHALL give 4 to 6 audible changes in the first minute. Fast SHALL give 7 to 8 audible changes in the first minute. With medium and fast pace the drums, when they play, SHALL reach their written kick within the first minute.

#### Scenario: Fast pace
- **WHEN** a song builds with fast pace
- **THEN** the first minute holds 7 or 8 steps that change what is heard

#### Scenario: Slow pace
- **WHEN** a song builds with slow pace
- **THEN** its step spacing follows today's Live coder rules

### Requirement: Development
The development SHALL be one of: by type (today's order of instrument types), as written (the order the clips start in the song), masks (each instrument enters, leaves and varies by its own mask), parameters (the song grows by filters, density, room and delay only), metamorphosis (a full song changes tempo, key and genre over minutes by rewriting its lines), second section (new lines built in solo with `S$:` while the first part is silent, then both play).

#### Scenario: As written
- **WHEN** a song whose arpeggio clip starts before its drums builds "as written"
- **THEN** the arpeggio enters before the drums

#### Scenario: Parameters only
- **WHEN** a song builds with "parameters"
- **THEN** after the first steps no track enters or leaves for a while, and the steps change filters, density, room or delay

#### Scenario: Second section
- **WHEN** a song builds with "second section"
- **THEN** at some point new lines marked `S$:` play alone, grow for a few steps, and then lose the mark so everything plays

### Requirement: Live coder moves
The Live coder growth SHALL be able to use these moves, each shown in the code as a small edit:
- move one step of a beat (a number in a step list);
- uncomment a prepared variant written earlier as a comment;
- solo a line with `S$:` and take the solo away;
- a key change prepared in a comment and uncommented later;
- alternate two parts with `pick`;
- a value that moves slowly over minutes;
- `seg(16)` that turns a held chord into a sixteenth rhythm.

#### Scenario: Prepared variant
- **WHEN** a prepared variant is used
- **THEN** the line first appears as a comment and a later step uncomments it

#### Scenario: Held chord becomes rhythm
- **WHEN** a pad holding its chord gets the `seg(16)` move
- **THEN** the pad plays the same chord in sixteenths from that step

### Requirement: Musical second thoughts
A build MAY bring in a part that later leaves because it was meant only for that moment, and MAY play a first version of a part that a later step refines. Such parts SHALL use the song's own material or material composed for the song in its key and scale. They SHALL NOT play notes outside the song's scale or sounds foreign to the song's style.

#### Scenario: Passing melody
- **WHEN** a passing melody enters and later leaves
- **THEN** every note it plays belongs to the scale of the section where it plays

#### Scenario: Refined part
- **WHEN** a first version of the bass is refined
- **THEN** the first version uses the bass's own idea in a simpler or different form, and the build ends with the written bass

### Requirement: Ideas grow
When a part is stored as an idea and the shape needs it, the build SHALL grow the idea (for example add beat steps one at a time, add scale degrees, add a chord's rhythm) instead of thinning the written result. Parts that are not ideas SHALL grow as today.

#### Scenario: Beat steps
- **WHEN** a kick written as a list of steps grows
- **THEN** each step of the build adds or moves one number in the list

### Requirement: Voice tracks and the growth
Narrator voice tracks SHALL stay out of the growth as today. A voice instrument line MAY take part in the growth when the opening or the development uses it.

#### Scenario: Narrator
- **WHEN** a song with a narrator voice track builds with any shape
- **THEN** the narrator speaks the step comments and is never a step of the growth

### Requirement: Same destination and determinism
After the growth the song SHALL play as written, except with the metamorphosis, which SHALL end on the last skin it planned. The same song, profile and seed SHALL give the same shape and the same steps. Every state of the build SHALL evaluate without errors.

#### Scenario: Same seed
- **WHEN** the same song builds twice with the same seed
- **THEN** the shape, the steps, their bars and their comments are identical

### Requirement: Shape controls and display
Compose SHALL show the shape of the song playing (opening, pace, development) for profiles that use shapes, and SHALL let the user set each part to automatic or to one value. A value set by the user SHALL make the profile custom, like any other control. The Guide SHALL describe the shapes in English and Italian.

#### Scenario: Pick an opening
- **WHEN** the user sets the opening to "melodic" in Compose and plays a song with an arpeggio
- **THEN** the build opens with the arpeggio and the profile shows as custom

### Requirement: Shape version
Growth shapes SHALL carry a version number. An intended change to the shape rules that changes the steps of a checked song SHALL raise it, so saved songs and playlists can warn that a song may build differently.

#### Scenario: Rules change
- **WHEN** a change to the shape rules alters the steps of a checked song
- **THEN** the shape version is raised in the same change
