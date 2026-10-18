## ADDED Requirements

### Requirement: Test tag
A song SHALL be able to carry the free tag `test`. The Songs tab SHALL have a filter that shows only the songs with the `test` tag, combined with the other filters like any filter. The built-in test songs SHALL carry the `test` tag.

#### Scenario: Show only test songs
- **WHEN** the user turns on the test filter
- **THEN** the list shows only songs tagged `test`, built-in and the user's

#### Scenario: Tag one of my songs
- **WHEN** the user adds the free tag `test` to one of their songs
- **THEN** the song appears when the test filter is on

#### Scenario: Default view
- **WHEN** the Songs tab opens with no filter
- **THEN** test songs are listed as before this change
