# Spec Delta

## Purpose

The radio voice gives each style its own speaker and lets the listener choose how often the radio talks.

## ADDED Requirements

### Requirement: Voice amount
The director SHALL accept a voice amount from 0 to 1. At 0 songs SHALL carry no spoken comments; higher amounts SHALL comment more of the moves, never closer than 8 bars; 0.5 SHALL give the same songs as before the option existed. The radio SHALL offer it as a control and the command line as `--talk`.

#### Scenario: Silent radio
- **WHEN** the voice amount is 0
- **THEN** the next songs have no spoken comments

#### Scenario: Same songs by default
- **WHEN** a session is generated with the default voice amount
- **THEN** it equals the sessions generated before the option existed for the same seed

### Requirement: A speaker per style
A recipe SHALL be able to name a speaker for its voice part, among the system voices that speak both English and Italian. The voice track SHALL play the comments with that speaker's samples, and `npm run voices` SHALL make the samples of every speaker the recipes name. A song whose voice part comes from a style with a speaker SHALL sound with that speaker.

#### Scenario: Different styles, different speakers
- **WHEN** one song takes its voice from industrial and the next from country
- **THEN** their comments are spoken by two different speakers

### Requirement: A voice per song
Each song SHALL have its own voice: the style that gives the voice part SHALL provide a base (speakers and a range for each effect), each song SHALL draw its own values, and now and then a song SHALL take another speaker or a voice character beyond the base, more often with more chaos. The voice draws SHALL NOT change the music of a seed.

#### Scenario: Same style, different voices
- **WHEN** a session of several songs in one style is generated
- **THEN** no two songs have the same voice settings, and some have a character or another speaker

#### Scenario: Music unchanged
- **WHEN** the same seed is generated before and after voice variety
- **THEN** the songs are the same apart from their voice track

