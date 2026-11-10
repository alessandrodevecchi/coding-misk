# Spec Delta

## Purpose

The code of a decoded track, refined in two rounds. Part 1: it changes only when the music does, and stands for the top line with lines that look like code. Part 2 (on hold): it sounds closer to the original, with a Lead part and sounds by measure.

## ADDED Requirements

### Requirement: Balanced code changes

In both levels a line SHALL change only when its part enters or stops, at a section change, or when its new pattern differs by the minimum musical difference and 4 bars passed since that line's last edit and 2 bars since any edit. In level A the new pattern SHALL also have held for two bars, and a part that enters SHALL count as a section change. Sounds SHALL change only at a section change. The numbers SHALL sit in one place in the code.

#### Scenario: Small noise does not edit

- **WHEN** a bass bar differs from the loop on 2 of 16 steps
- **THEN** the bass line does not change

### Requirement: Minimum musical difference

A new pattern SHALL differ enough to edit its line when: drums, 3 steps or a row that enters or leaves; bass, 25 % of the note steps and at least 3 steps in a bar, or another root on the loop's first bar; chords, a chord that is neither the other quality nor the relative on at least 3 of 8 bars.

#### Scenario: A relative chord does not edit

- **WHEN** a chord loop `<Am F C G>` is heard once as `<Am F C Em>`
- **THEN** the chord line does not change

### Requirement: Level B parts hold

In level B a part SHALL enter or stop inside a section only when it holds for 2 bars, and a drum variant SHALL start only after the same waits as any edit.

#### Scenario: A part that flickers

- **WHEN** in a level B section the drums are heard every other bar
- **THEN** the drum lines play through the section instead of muting on every other bar

### Requirement: Level A loops settle

In level A a loop of 2 or 4 bars SHALL replace a one-bar loop once it repeated, and SHALL not grow again inside the section.

#### Scenario: A four-bar chord loop

- **WHEN** a chord loop of four bars has played twice in level A
- **THEN** the chord line stays the same until the section changes or a chord of the loop changes

### Requirement: Edit measures

`tools/decode-edits.mjs` SHALL measure, on any audio file and for both levels, the share of bars with an edited line, the edits per minute, the mutes and unmutes, the average edit size in characters and the share of edits of 12 characters or less (both without the mutes), and the share of section changes with an edit within one bar.

#### Scenario: The owner's files

- **WHEN** the tool runs on four audio files
- **THEN** it prints one row per file and level with every measure

### Requirement: Edit balance targets

`npm run check:decode` SHALL measure a generated song with known sections in both levels. The targets SHALL be: 10-30 % of bars, 2-8 edits per minute at 120-130 BPM, an average of at least 20 characters, at most 15 % small edits, at least 90 % of section changes in level B.

#### Scenario: Live on a steady track

- **WHEN** a generated song with known sections plays in level A from start to end
- **THEN** at most 30 % of its bars have an edited line and there are at most 8 edits a minute

#### Scenario: A real change is not delayed

- **WHEN** the drums stop at bar 33 of `decode-test-124` with look ahead 2 bars
- **THEN** the drum lines are muted on bar 33, whatever the time since the last edit

### Requirement: Lead part (part 2)

In level B the writer SHALL write the top line as a code track `lead` with one loop of 1, 2 or 4 bars per section, using `n(…).scale(…)` in the track's key and a sound by measure. A section whose top line is voiced on less than 30 % of its steps SHALL have no Lead. A sung melody SHALL be written as a Lead muted by default. The Lead SHALL have its own track with mute and solo. Level A SHALL write no Lead.

#### Scenario: A hook is written

- **WHEN** the radio song is decoded in level B
- **THEN** the code has a `lead` line in the sections where the hook plays and none in the others

#### Scenario: Instrumental without a top line

- **WHEN** a track's sections have no voiced top line
- **THEN** the code has no `lead` line

## MODIFIED Requirements

### Requirement: Sound presets

The tab SHALL offer two sound presets. "Our sounds" (default) SHALL choose sounds by measure and "Simple kit" SHALL use one fixed set of sounds for every track. A preset SHALL change the code from the next bar. (Part 2:) "Our sounds" SHALL choose, per section, the drum machine nearest to the track's measured kick decay, kick brightness and hat brightness, the bass wave by its harmonics with its filter and resonance by its brightness and movement, distortion where the drums or bass are distorted, the chord and Lead sounds by brightness and decay, and each part's level so the code's band shares are within 0.10 of the original's. Measures SHALL be relative to the track.

#### Scenario: Simple kit

- **WHEN** the user picks "Simple kit"
- **THEN** every decoded track uses the same drum machine and the same bass and chord sounds

#### Scenario: Our sounds by measure

- **WHEN** level B measures a dark, heavy section and a bright one
- **THEN** with "Our sounds" the two sections use different filter settings or sounds

#### Scenario: The right machine (part 2)

- **WHEN** the app's exports of `luci-rosse` and the radio seed (both on the 909 with distortion) are decoded
- **THEN** "Our sounds" picks the 909 with `crunch` or `distort` for both (today the 808 without distortion)

#### Scenario: An acid bass (part 2)

- **WHEN** the bass has a resonant peak moving over the bar
- **THEN** the bass line uses a sawtooth with `res(…)` and a moving cutoff

### Requirement: Vocals placeholder

The code SHALL end with a group of one to three lines that look like code and stand for the top line: `vox(…)` lines for a track whose top line runs through it as a voice does, `melody(…)` lines for any other, such as `$: vox("reading from track").gain(0.8)` or `$: melody("tracing the hook").room(0.3)`. `vox` and `melody` SHALL be app helpers that evaluate to silence, also in the code copied out of the app. The labels SHALL come from a list of about 20 phrases per kind, chosen by a seed from the file and the section; the methods after them SHALL be catalog functions only. A line SHALL be `$:` where the model hears a top line and `_$:` where it does not, and SHALL change only when the section or that state changes. A track with no top line SHALL have no group. The lines SHALL never play a sound and SHALL not go with Open in Compose. `npm run check:strudel` SHALL scan decoded code with its group and pass.

#### Scenario: A song with vocals

- **WHEN** Vocal track 1 plays in level B
- **THEN** the code ends with a `vox` group whose lines are `$:` in the sections with the voice, and no sound comes from them

#### Scenario: A hook

- **WHEN** a generated song with a hook section is decoded in level B
- **THEN** the code ends with a `melody` group, `$:` in the hook section and `_$:` in the other sections

#### Scenario: Copy

- **WHEN** the user copies the decoded code and evaluates it in a plain Strudel page
- **THEN** the group's lines evaluate without an error and play nothing

#### Scenario: Same track, same lines

- **WHEN** the same file is decoded twice
- **THEN** the labels are the same, and two sections of one track can differ
