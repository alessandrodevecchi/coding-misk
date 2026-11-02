## ADDED Requirements

### Requirement: The poetic narrator speaks when the explaining narrator would

The poetic narrator SHALL speak on the steps that carry a step line, the same steps the explaining narrator speaks on, whether Narrated growth is on or off. Narrated growth SHALL only decide how many steps carry a step line, for both styles, and SHALL NOT change what the poetic narrator says. On a step with a step line and no track entry on its bar, it SHALL say a movement image. It SHALL NOT say a step line, except as the fallback of "Step line when no image exists".

#### Scenario: Without Narrated growth
- **WHEN** luci-rosse grows in Crescendo with the poetic style and Narrated growth off
- **THEN** the narrator speaks on the same bars as the explaining narrator would, except where an entry's image moves its line to the bar before
- **AND** every bar with a step line and no entry says a movement image, and every entry says its image

#### Scenario: With Narrated growth
- **WHEN** the same song grows with the poetic style and Narrated growth on
- **THEN** every step with a step line and no entry on its bar says a movement image, and every entry says its image
- **AND** no step line is said

#### Scenario: The explaining style
- **WHEN** a song grows with the explaining style, with or without Narrated growth
- **THEN** every step with a step line says its step line, as today

### Requirement: Poetic images at track entries

At a track entry the poetic narrator SHALL say only the image of the entering track: in the bar before the entry, or on the entry's own bar when that bar is the song's first bar or the first bar of the radio window. It SHALL say nothing more on the entry's bar. Every entry SHALL get its image, also when no step on its bar carries a step line. A step that brings the voice track in SHALL stay unnarrated.

#### Scenario: An entry step
- **WHEN** a step brings the bass in on bar 16 and carries a step line
- **THEN** the bass's image is said on bar 15 and nothing is said on bar 16

#### Scenario: An entry on a step without a step line
- **WHEN** a step brings the pad in on bar 24 and no step on bar 24 carries a step line
- **THEN** the pad's image is said on bar 23, as today

#### Scenario: An entry on the first bar of the radio window
- **WHEN** a radio song's first bar in the window brings the drums in
- **THEN** the drums' image is said on that bar

### Requirement: One poetic line per bar

The poetic narrator SHALL say at most one line per bar; an entry image SHALL win a bar shared with a movement image. It SHALL stay quiet on bars where the voice track speaks.

#### Scenario: An image and a movement image on one bar
- **WHEN** bar 31 carries a step line with no entry and bar 32 brings a track in
- **THEN** bar 31 says the entering track's image, not a movement image

#### Scenario: The voice track speaks
- **WHEN** a voice-track line sounds on a bar where the poetic narrator would speak
- **THEN** the narrator stays quiet on that bar

### Requirement: Movement images in turn

Consecutive movement images SHALL follow the movement list in order from a start drawn with the song's seed, counted over the steps that say a movement image, so that an image comes back only after the whole list, whether many or few steps speak. The list SHALL be the song's own movement lines, else its style's, else the built-in vocabulary's, in the interface language (English or Italian).

#### Scenario: Few steps speak
- **WHEN** a song grows without Narrated growth with the poetic style and 8 steps say a movement image
- **THEN** the 8 movement images are all different

#### Scenario: Italian
- **WHEN** the interface is in Italian
- **THEN** the movement images and the entry images are said in Italian

### Requirement: Step line when no image exists

When the poetic narrator has no image for a moment, it SHALL say the step line instead of staying quiet: for a movement image, the step's line on its bar; for an entry, the step line of the entry's bar on that bar, if a step there carries one. An image is missing when no list gives one, or when it has no text in the current language. A line with no sample SHALL follow the narrator's sample rule unchanged.

#### Scenario: An empty movement list
- **WHEN** a song's own movement lines are an empty list and no style or vocabulary list gives one
- **THEN** each step that would say a movement image says its step line

#### Scenario: An image with no text in the language
- **WHEN** the interface is in Italian and the image for the bass has English text only
- **THEN** the entry's bar says its step line in Italian, if a step there carries one

#### Scenario: The built-in vocabulary
- **WHEN** a song and its style give no image lists
- **THEN** the built-in vocabulary gives every image and no step line is said

### Requirement: Stage captions of the poetic narrator

The stage caption SHALL be the line heard: the image or the movement image, or the step line when it is the fallback. The step line SHALL show as the small tag when it differs from the line heard, as for any narrator line. A step line not said SHALL NOT show as a spoken caption.

#### Scenario: A movement image on stage
- **WHEN** the poetic narrator says "the light shifts" on bar 9, whose step line is "tighter rhythm"
- **THEN** the caption on bar 9 is "the light shifts" and the tag is "tighter rhythm"

#### Scenario: An entry bar on stage
- **WHEN** the bass's image is said on bar 15 and bar 16 carries the step line "need bass"
- **THEN** bar 15 shows the image as the caption, and bar 16 shows "need bass" only as the tag
