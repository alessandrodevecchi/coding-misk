# Spec Delta

## ADDED Requirements

### Requirement: Artist picker
The radio SHALL offer an artist picker. Picking an artist SHALL set the favourite styles and the slider values from the artist's taste, and the next songs SHALL be made by that artist, each with its own values. Changing styles or sliders afterwards SHALL make the session "custom" (no artist), applying from the next song.

#### Scenario: Pick an artist
- **WHEN** the user picks the night owl artist
- **THEN** its favourite styles are selected, the next song is made by it, and the now playing card names the artist

#### Scenario: Custom after a change
- **WHEN** the user then raises the energy slider
- **THEN** the picker shows "custom" and the following songs use the controls
