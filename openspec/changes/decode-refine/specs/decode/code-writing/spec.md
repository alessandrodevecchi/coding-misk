# Spec Delta

## Purpose

The code of a decoded track, refined so it sounds closer to the original, changes only when the music does, and stands for the voice with lines that look like code.

## ADDED Requirements

### Requirement: Lead part

In level B the writer SHALL write the top line as a code track `lead` with one loop of 1, 2 or 4 bars per section, using `n(…).scale(…)` in the track's key and a sound by measure. A section whose top line is voiced on less than 30 % of its steps SHALL have no Lead. The Lead SHALL have its own track with mute and solo. Level A SHALL write no Lead.

#### Scenario: A hook is written

- **WHEN** the radio song is decoded in level B
- **THEN** the code has a `lead` line in the sections where the hook plays and none in the others

#### Scenario: Instrumental without a top line

- **WHEN** a track's sections have no voiced top line
- **THEN** the code has no `lead` line

### Requirement: Balanced code changes

In both levels a line SHALL change only when its part enters or stops, at a section or energy change of the model, or when its new pattern differs by a minimum musical difference (drums: 3 steps or a row; bass and Lead: 25 % of the note steps or another root on the loop's first bar; chords: another chord in the loop) and at least 4 bars passed since that line's last edit and 2 bars since any edit. Sounds SHALL change only at a section change.

#### Scenario: Small noise does not edit

- **WHEN** a bass bar differs from the loop on 2 of 16 steps
- **THEN** the bass line does not change

### Requirement: Level A loops settle

In level A a loop of 2 or 4 bars SHALL replace a one-bar loop once it repeated, and SHALL not grow again inside the section.

#### Scenario: A four-bar chord loop

- **WHEN** a chord loop of four bars has played twice in level A
- **THEN** the chord line stays the same until the section changes or a chord of the loop changes

### Requirement: Edit balance targets

`npm run check:decode` SHALL measure, on the bench's test songs and the app's songs, the share of bars with an edited line, the edits per minute, the average edit size in characters, the share of edits of 12 characters or less, and the share of section changes with an edit within one bar. The targets SHALL be: 10-30 % of bars, 2-8 edits per minute at 120-130 BPM, an average of at least 20 characters, at most 15 % small edits, at least 90 % of section changes.

#### Scenario: Live on a steady track

- **WHEN** the radio song plays in level A from start to end
- **THEN** at most 30 % of its bars have an edited line (today 93 %) and at most 8 edits fall in any minute (today 41)

#### Scenario: A real change is not delayed

- **WHEN** the drums stop at bar 33 of `decode-test-124` with look ahead 2 bars
- **THEN** the drum lines are muted on bar 33, whatever the time since the last edit

## MODIFIED Requirements

### Requirement: Sound presets

The tab SHALL offer two sound presets. "Our sounds" (default) SHALL choose, per section, the drum machine nearest to the track's measured kick decay, kick brightness and hat brightness, the bass wave by its harmonics with its filter and resonance by its brightness and movement, distortion where the drums or bass are distorted, the chord and Lead sounds by brightness and decay, and each part's level so the code's band shares are within 0.10 of the original's. Measures SHALL be relative to the track. "Simple kit" SHALL use one fixed set of sounds for every track. A preset SHALL change the code from the next bar.

#### Scenario: Simple kit

- **WHEN** the user picks "Simple kit"
- **THEN** every decoded track uses the same drum machine and the same bass and chord sounds

#### Scenario: Our sounds by measure

- **WHEN** level B measures a dark, heavy section and a bright one
- **THEN** with "Our sounds" the two sections use different filter settings or sounds

#### Scenario: The right machine

- **WHEN** the app's exports of `luci-rosse` and the radio seed (both on the 909 with distortion) are decoded
- **THEN** "Our sounds" picks the 909 with `crunch` or `distort` for both (today the 808 without distortion)

#### Scenario: An acid bass

- **WHEN** the bass has a resonant peak moving over the bar
- **THEN** the bass line uses a sawtooth with `res(…)` and a moving cutoff

### Requirement: Vocals placeholder

The code SHALL end with a `vox` group of one to three lines that look like code and stand for the voice, such as `$: vox("reading from track").gain(.8)`. `vox` SHALL be an app helper that evaluates to silence, also in the standalone code copied out of the app. The labels SHALL come from a list of about 20 phrases, chosen by a seed from the file and the section; the methods after `vox(…)` SHALL be catalog functions only. A line SHALL be `$:` where the model hears a top line and `_$:` where it does not, and SHALL change at most at a section change. A track with no top line SHALL have no `vox` lines. The lines SHALL never play a sound and SHALL not go with Open in Compose. `npm run check:strudel` SHALL scan decoded code with its `vox` lines and pass.

#### Scenario: A song with vocals

- **WHEN** Heartstring plays in level B
- **THEN** the code ends with a `vox` group whose lines are `$:` in the sections with the voice, and no sound comes from them

#### Scenario: Copy

- **WHEN** the user copies the decoded code and evaluates it in a plain Strudel page with the app's standalone prelude
- **THEN** the `vox` lines evaluate without an error

#### Scenario: Same track, same lines

- **WHEN** the same file is decoded twice
- **THEN** the `vox` labels are the same, and two sections of one track can differ
