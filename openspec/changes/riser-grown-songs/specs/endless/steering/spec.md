## MODIFIED Requirements

### Requirement: Riser row
The Arrangement group SHALL have a Riser row with a button "+ Riser before the next change" ("+ Riser al prossimo cambio"), a length menu (Auto, 2, 4, 8 bars), a direction menu (up, down), a Sound dropdown ("Suono") and a lock for the director's risers. The Sound dropdown SHALL be shown even with one option; today it SHALL offer only the noise sweep ("Fruscio"). The row SHALL show in every style; in a style without a riser the director SHALL still place none by itself. The button SHALL place one riser that ends on the next phrase where the song's part changes (or the next double phrase when no change is left before the outro), with the chosen length and direction, replacing a riser the director placed on that change. On a radio song grown on air, a riser pressed during the growth SHALL go on the grown song itself instead: it SHALL end (up) or start (down) on the first phrase start or growth step within two phrases of the press where its length fits, with its first bar at least a bar and a half after the press, trying the chosen length first and then a shorter one; the command SHALL record the bars it took, so a replay gives the same song, and the written form SHALL NOT get a riser from it. A closed riser lock SHALL keep the director from placing risers in the song; the listener's risers SHALL still play. The row SHALL have a tooltip that says what a riser is and that during a growth it comes within two phrases. The riser SHALL NOT count toward the 12-track cap.

#### Scenario: A riser into the drop
- **WHEN** the next part change is a drop 6 bars ahead and the listener picks 4 bars, up, and presses the button
- **THEN** a noise sweep rises over the 4 bars before the drop and ends on its first bar

#### Scenario: A riser inside a long growth
- **WHEN** a Live coder or Crescendo radio song has a growth of 96 bars or more, phrases of 8 bars, and the listener presses the riser (Auto, up) on bar 30.4
- **THEN** the riser plays on the grown song and ends on bar 32 or 40, not after the growth

#### Scenario: A riser after the growth
- **WHEN** the growth is over and the listener presses the riser
- **THEN** the riser ends on the next part change of the form, as on a Classic song

#### Scenario: Replay of a riser inside a growth
- **WHEN** a session with a riser pressed inside a growth is replayed
- **THEN** the riser plays on the same bars

#### Scenario: No risers from the director
- **WHEN** the listener closes the riser lock
- **THEN** the director places no riser in the rest of the song

#### Scenario: One riser sound
- **WHEN** the listener opens the Riser row
- **THEN** the Sound dropdown is shown with Fruscio as its only option, selected

#### Scenario: A style without a riser
- **WHEN** the song on air has a style without a riser
- **THEN** the Riser row is shown, the director places no riser, and the listener's riser plays
