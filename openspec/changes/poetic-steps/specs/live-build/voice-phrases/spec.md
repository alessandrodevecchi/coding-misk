## ADDED Requirements

### Requirement: Poetic movement lines for steps without an entry
With the poetic narrator style and Narrated growth on, a step that has a step line, does not bring the voice instrument in, and shares its bar with no step that brings a track in SHALL be said as a short poetic image of movement instead of its step line. The image SHALL come from the song's `narrator.lines.move`, else its style's, else the vocabulary's `move` group, in the interface language (English or Italian). Consecutive steps SHALL take different images while the list lasts. A step on an entry's bar SHALL keep its step line, and the image of the entry SHALL stay in the bar before. The stage SHALL keep showing the step line. Without Narrated growth, or with the explaining style, the narrator SHALL say what it says today.

#### Scenario: A filter step in English
- **WHEN** luci-rosse grows in Crescendo with the poetic style and Narrated growth, and a step that opens a filter (step line "open the filter") falls on a bar with no entry
- **THEN** the narrator says a line of the `move` group, for example "the light shifts", and not "open the filter"

#### Scenario: The same step in Italian
- **WHEN** the interface is in Italian
- **THEN** the narrator says the Italian line of the same image, for example "la luce si sposta", and not "apro il filtro"

#### Scenario: An entry step
- **WHEN** a step brings the bass in on bar 16
- **THEN** the image of the bass is said on bar 15 and the step line on bar 16, as before

#### Scenario: Explaining narrator
- **WHEN** the same song grows with the explaining style and Narrated growth
- **THEN** every step says its step line, as before

#### Scenario: Samples
- **WHEN** `npm run voices` runs
- **THEN** every line of the `move` group has a sample for every narrator speaker in English and Italian
