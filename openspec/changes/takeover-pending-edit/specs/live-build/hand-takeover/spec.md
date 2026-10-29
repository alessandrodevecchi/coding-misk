## MODIFIED Requirements

### Requirement: Take over by typing
While a live build plays, the first character typed or deleted in the code panel, and a paste, a cut or a drop in it, SHALL switch the song to "by hand". Clicking, moving the cursor, selecting and copying SHALL NOT switch it. When the code was being typed at that moment, the edit SHALL be completed first (see "Takeover completes the edit being typed") and the user's key, paste, cut or drop SHALL apply to the completed code. By hand, no build step SHALL change the code in the editor, the music SHALL keep playing the last code evaluated, and evaluating (Ctrl+Enter) SHALL play the user's code.

#### Scenario: Typing takes over
- **WHEN** a live build plays and the user types a character in the code
- **THEN** the "BY HAND" label appears, the next step does not change the code, and the music goes on

#### Scenario: Selecting does not take over
- **WHEN** the user clicks in the code, selects a line and copies it
- **THEN** the live build goes on and the next step is typed as usual

#### Scenario: Evaluate own code
- **WHEN** the user, by hand, changes a number and presses Ctrl+Enter
- **THEN** the change is heard from the next query of the scheduler

## ADDED Requirements

### Requirement: Takeover completes the edit being typed
When the user takes over while the code is typing an edit (towards the next step, or back to the song's code after "Resume live build"), the editor SHALL show at once the text that edit was typing towards. An edit whose typing has not started yet SHALL leave the code as it is. This SHALL hold in Compose, with every build profile, and in the Radio.

#### Scenario: Takeover in the middle of an edit
- **WHEN** a live build is typing an edit, the code shows a half-typed line, and the user types a character
- **THEN** the half-typed line is replaced by the line the edit was typing towards, the user's character is added to that code, and the "BY HAND" label appears

#### Scenario: First evaluation after a mid-edit takeover
- **WHEN** the user takes over in the middle of an edit and presses Ctrl+Enter without other changes
- **THEN** the code evaluates without error and plays

#### Scenario: Takeover before the typing starts
- **WHEN** the next step's typing has not started and the user types a character
- **THEN** the code is the code playing plus the user's character, and nothing of the next step appears

#### Scenario: Paste in the middle of an edit
- **WHEN** a live build is typing an edit and the user pastes text in the code
- **THEN** the edit is completed and the pasted text goes into the completed code

#### Scenario: Takeover while resuming
- **WHEN** "Resume live build" is typing the user's code back to the song's code and the user types a character
- **THEN** the code becomes the song's code that typing was heading to, plus the user's character, by hand

#### Scenario: Radio
- **WHEN** the song on air in the Radio is typing an edit and the user types a character
- **THEN** the edit is completed, the song on air is held by hand, and Ctrl+Enter evaluates without error

### Requirement: Completion keeps the music and the steps
Completing an edit on takeover SHALL NOT evaluate the code: the music SHALL keep playing the last code evaluated until the user evaluates. The steps after the completed edit SHALL NOT change the code by hand and SHALL come back with "Resume live build" as before.

#### Scenario: Music unchanged on takeover
- **WHEN** the user takes over in the middle of an edit and does not evaluate
- **THEN** the music keeps playing the code of the last step evaluated

#### Scenario: Steps after the takeover
- **WHEN** the user takes over in the middle of an edit, the bar of a later step passes, and the user resumes from where the song has got to
- **THEN** the later step's code comes back with the resume typing, as before this change
