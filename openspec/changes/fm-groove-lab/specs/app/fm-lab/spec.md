# Spec Delta

## Purpose

An FM section in the Groove Lab: one card per FM sound kind, each playable on its own, with a drawing of how its wave changes with the FM amount and a live scope while it plays.

## ADDED Requirements

### Requirement: FM category in the Sounds tab
The Sounds tab SHALL show a category "FM" next to the other categories, with its count. It SHALL hold one card for each sound kind of the material generator that has an FM patch, and no card for a kind without FM. Each card SHALL show the kind's name in the interface language, its carrier wave, its FM amount, the part it plays, a drawing of its wave, and a headphones button. Search SHALL find the cards by their names in both languages and by "fm".

#### Scenario: Cards in place
- **WHEN** the user opens the Groove Lab, the Sounds tab and the FM category in Italian
- **THEN** eight cards show: Campana, Reese, Ringhio, Sporco, Piano elettrico, Metallo, Sub, Organo, each with a wave drawing and a headphones button

#### Scenario: A new FM kind
- **WHEN** a developer adds a sound kind with an FM patch to the generator and no card for it
- **THEN** `npm run check:fm-lab` fails and names the kind

### Requirement: A card plays on its own
The headphones button of a card SHALL play the card's sound in a loop through a preview player that never changes what the player bar plays, shows or controls. While a song plays, the card SHALL start at the song's next bar and follow its tempo; while no song plays, it SHALL play alone at the card's tempo. The button SHALL show stop while the card plays.

#### Scenario: Alone
- **WHEN** no song plays and the user presses the headphones of Campana
- **THEN** Campana plays in a loop, the player bar's title, position and play state do not change, and the button shows stop

#### Scenario: Over a playing song
- **WHEN** a song plays and the user presses the headphones of Reese
- **THEN** Reese starts on the song's next bar and plays with it, and the song's code, title and position do not change

### Requirement: One preview at a time
Only one preview SHALL play at a time in the app: starting a card SHALL stop the Compose preview and any other card, and starting the Compose preview SHALL stop the card.

#### Scenario: One at a time
- **WHEN** Campana plays and the user presses the headphones of Sub
- **THEN** Campana stops and Sub starts from the next bar

### Requirement: When a card stops
A playing card SHALL stop when the user presses its button again, when the user leaves the Sounds tab, and when an export or a recording starts; its button SHALL be disabled while an export or a recording runs.

#### Scenario: Leaving the tab
- **WHEN** a card plays and the user opens another tab
- **THEN** the card stops

### Requirement: Play modes
The card detail SHALL offer three modes: Phrase (the card's part, the default), Held note (one note per bar) and FM rise (the FM amount rising from 0 to the card's maximum over 4 bars). A change of mode SHALL play from the next bar, without stopping.

#### Scenario: FM rise
- **WHEN** the user picks FM rise on a playing card
- **THEN** from the next bar the FM amount of its notes rises from 0 at the first sixteenth to the card's maximum at the last sixteenth of 4 bars, and starts again

### Requirement: Wave drawing and FM amount
The card detail SHALL draw the card's wave at FM amounts 0, 1, 2 and 3 (no higher than the card's maximum), computed with the same FM formula the audio engine uses, and SHALL light the drawing nearest the current amount. An "FM amount" control SHALL go from 0 to the card's maximum; moving it SHALL redraw the waves at once and change the sound from the next bar. At FM amount 0 the drawing SHALL be the plain carrier wave.

#### Scenario: Moving the amount
- **WHEN** a card plays and the user moves the FM amount from 2 to 0.5
- **THEN** the lit drawing moves to FM 1 at once, and from the next bar the card plays with FM 0.5

#### Scenario: Hardware theme
- **WHEN** the hardware theme is on
- **THEN** the FM amount shows as a knob, like the other ranges of that theme

### Requirement: Live scope
While a card plays, the card detail SHALL draw a scope of the card's own sound, not the song's, steadied on a rising zero crossing. When the card stops, the scope SHALL stop and say so. The card's sound SHALL NOT move the stage visual.

#### Scenario: Scope over a song
- **WHEN** a song plays and the user plays Organo
- **THEN** the scope shows the organ's wave, and the stage visual reacts to the song only

### Requirement: Card actions
The card detail SHALL offer "Use in track", which puts the card's wave and FM device on the track selected in Compose, and Copy, which copies the card's code line in the current mode and FM amount. "Use in track" SHALL be disabled with a tooltip that says why when no melodic track is selected.

#### Scenario: Use in track
- **WHEN** a bass track is selected in Compose and the user presses "Use in track" on Reese
- **THEN** the bass track's wave becomes sawtooth and its rack holds the Reese FM device, and the song plays it from the next evaluation

### Requirement: Levels and texts
Every card SHALL play below clipping on the master in every mode and at every FM amount of its control. Every text of the section SHALL exist in Italian and English, and the Guide's Sounds card SHALL describe the FM section in both languages.

#### Scenario: Level check
- **WHEN** `tools/check-fm-lab.cjs` plays each card in each mode at its maximum FM amount
- **THEN** no peak on the master reaches 0.97 and no evaluation error shows
