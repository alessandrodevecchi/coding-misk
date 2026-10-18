## Purpose

A live build grows a part the way a live coder grows an idea: it starts from a simple form and reaches the written one, while Classic and Crescendo keep growing by thinning as before.

## ADDED Requirements

### Requirement: An idea grows from simple to written
In the Live coder profile, a part that holds an idea SHALL grow through forms of that idea, from a simple form to the written one. Every form SHALL be valid code, stay in the song's key and chords, and differ from the previous form by a small edit.

#### Scenario: Bass cell grows
- **WHEN** a Live coder song grows a bass with the cell `[~ x x x]*4`
- **THEN** the bass first plays a simpler cell such as `x*4`, then `[~ x]*4`, then the written cell, and each step changes only the cell text

#### Scenario: Arp from a held chord
- **WHEN** a Live coder song grows an arp written as indices into chord names
- **THEN** the arp first plays the voiced chord held or on a single index, then reaches the written indices

### Requirement: Classic and Crescendo unchanged
Classic and Crescendo SHALL build as before: the same steps, at the same bars, with the same events. Crescendo SHALL keep thinning written material, and a pattern that holds an idea SHALL be thinned from the events the idea plays.

#### Scenario: Crescendo song
- **WHEN** a built-in song plays with the Crescendo profile after this change
- **THEN** its build steps and its events are the same as before

#### Scenario: Idea thinned in Crescendo
- **WHEN** a song whose bass holds the cell `[~ x x x]*4` plays with the Crescendo profile
- **THEN** the bass is thinned as the same written steps would be

### Requirement: Switch on a prepared variant
A live build step SHALL be able to switch on a prepared variant of a track's idea. From that bar the variant SHALL play, and the code SHALL show the line without its comment mark. A later step SHALL be able to switch it off again.

#### Scenario: Variant arrives
- **WHEN** a step at bar 64 switches on the bass variant `.add("0 0 4 0 5")`
- **THEN** from bar 64 the bass plays with the added line, and the code shows `.add("0 0 4 0 5")` without `//`

#### Scenario: Seek past the step
- **WHEN** the player seeks to bar 80 of that song
- **THEN** the variant is already on, as if the song had played from the start

### Requirement: Same growth every time
The forms an idea grows through SHALL depend only on the idea, the song and its seed, so the same song grows the same way in the app, in exports and in checks.

#### Scenario: Two runs
- **WHEN** the same Live coder song is built twice
- **THEN** both runs have the same steps and the same forms of each idea
