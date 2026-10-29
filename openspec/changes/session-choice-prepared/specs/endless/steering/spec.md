## ADDED Requirements

### Requirement: A session choice reaches the song being prepared
A command given with "The whole session" SHALL also reach the next song when that song is already prepared, also while it still grows or is steered away from the page. The player SHALL play that song with the choice from its first bar.

#### Scenario: "+ kick" while the next song grows
- **WHEN** the scope is "The whole session" and the listener presses "+ kick" while the next Live coder song still grows
- **THEN** once its growth is ready the window on air holds the next song with one kick more, and the next song plays it
