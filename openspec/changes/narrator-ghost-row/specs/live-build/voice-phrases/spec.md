## ADDED Requirements

### Requirement: Narrator lines as heard

When the narrator's lines are made by the build (derived Live build, Crescendo, Live coder), the read-only Narrator lines list of the Voice: narrator block SHALL list the lines as heard, the same lines the timeline marks (the poetic images, no line where the voice instrument speaks, none without a sample). A song with its own written steps SHALL keep the list of its step lines, editable in place.

#### Scenario: Same count as the timeline

- **WHEN** luci-rosse is open in Live coder without a narrator track
- **THEN** the Narrator lines list says 19 lines, as the tooltip of the ghost row's name
