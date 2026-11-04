## MODIFIED Requirements

### Requirement: Stage captions of the poetic narrator

The stage caption SHALL be the line heard: the image or the movement image, or the step line when it is the fallback. The step line of the step the line speaks for SHALL show as the small tag when it differs from the line heard: the entering step's line under an entry image, the step's own line under a movement image. The tag SHALL appear and leave with its line, and no step line SHALL show as a tag without a narrator line. A step line not said SHALL NOT show as a spoken caption.

#### Scenario: A movement image on stage

- **WHEN** the poetic narrator says "the light shifts" on bar 9, whose step line is "tighter rhythm"
- **THEN** the caption on bar 9 is "the light shifts" and the tag is "tighter rhythm"

#### Scenario: An entry bar on stage

- **WHEN** the bass's image is said on bar 15 and bar 16 carries the step line "need bass"
- **THEN** bar 15 shows the image as the caption with "need bass" as its tag, and the tag leaves with the image
- **AND** no narrator caption shows on bar 16

#### Scenario: A step that says nothing

- **WHEN** an entry image takes bar 31, where a step with the step line "open the filter" would have said a movement image
- **THEN** "open the filter" shows neither as a caption nor as a tag
