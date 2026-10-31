# Spec Delta

## Purpose

Exports of a decoded track: audio, video and fragments with the original audio as heard, and the rights line in the texts for sharing.

## ADDED Requirements

### Requirement: Everything exports
The Decode tab SHALL export audio, video and fragments with the app's existing formats, layouts and settings. The sound of an export SHALL be the mix as heard in the tab: the original and the code tracks with their mute, solo and slider state at the start of the export.

#### Scenario: Audio with the original
- **WHEN** the slider is in the middle and the user exports FLAC
- **THEN** the file holds the original and the code together, as heard

#### Scenario: Code only
- **WHEN** the slider is fully on Code and the user exports a video
- **THEN** the video's sound holds only the code

### Requirement: Fragments carry the original audio
A fragment of a decoded track SHALL carry the sound of its time span as heard, the original included, aligned with its picture and code within one video frame.

#### Scenario: A 30-second fragment
- **WHEN** the user exports a random 30-second 9:16 fragment with the original on
- **THEN** the fragment's sound is the original's same 30 seconds, mixed with the code as heard

### Requirement: Fast export matches real time
The fast export of a decoded track SHALL sound the same as its real-time export, and SHALL pass the app's master limiter, so a file never clips.

#### Scenario: Same sound
- **WHEN** a decoded track is exported fast and in real time with the same mix
- **THEN** the two files match within the tolerance the existing export check uses

### Requirement: Rights line in the texts for sharing
The texts for sharing of an export that contains the original audio, or the decoded code, SHALL carry a rights line. With Attribution on, it SHALL name the original's title and artist as a cover. With Attribution off, it SHALL say that the recording belongs to its rights holders without naming it. The app SHALL put no other limit on exports.

#### Scenario: Attribution on
- **WHEN** a video of "Night Run" by "Some Band" is exported with Attribution on
- **THEN** its texts carry a line naming "Night Run" by "Some Band" as the original

#### Scenario: Attribution off
- **WHEN** the same export runs with Attribution off
- **THEN** its texts carry a line saying the recording belongs to its rights holders, and neither the title nor the artist of the original

### Requirement: The original only in the user's exports
The app SHALL reproduce the original audio only while the Decode tab plays it and inside exports the user starts. No other player, playlist, radio session or saved song SHALL hold or play it.

#### Scenario: Open in Compose
- **WHEN** a decoded track is opened in Compose and exported there
- **THEN** the export holds only the code's sound
