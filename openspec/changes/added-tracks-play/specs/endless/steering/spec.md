## MODIFIED Requirements

### Requirement: Tracks the listener adds stay
The director SHALL NOT remove for good a track the listener added before the song's final outro, whether its instrument is locked or not; only the listener SHALL remove it, with "−" or the mixer. A listener track SHALL play every bar of the phrase it enters: a break or a charge before a drop that starts inside that phrase SHALL leave it in, as it leaves in a track brought in on the break's own boundary. After that, an unlocked listener track MAY sit out a break or the charge before a drop and SHALL come back at the phrase after it; the director MAY change its pattern, filter, drive and effects.

#### Scenario: Still there a few seconds later
- **WHEN** the listener presses "+ pad" and the director's plan for the next phrases would strip a pad
- **THEN** the added pad plays from the next phrase and still plays two phrases later, and in every later phrase up to the outro except during a break or a charge

#### Scenario: Back after a break
- **WHEN** an unlocked listener arp sits out a break
- **THEN** it plays again from the phrase after the break

#### Scenario: A kick added just before a break
- **WHEN** on a slow song the listener's "+ kick" enters on a half-phrase start and a break starts on the next phrase start
- **THEN** the added kick plays every bar of the phrase it entered, the break takes out the director's drums, and the added kick still plays at the drop

#### Scenario: A later command on the break's boundary
- **WHEN** the listener's "+ kick" entered on the half-phrase start before a break, and an energy command is placed on the break's boundary
- **THEN** the added kick still plays every bar of the phrase it entered
