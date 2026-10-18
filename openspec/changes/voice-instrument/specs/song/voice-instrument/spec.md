## Purpose

The voice instrument plays spoken lines as part of a song's music: refrains, chops, spoken openings and long spoken passages, apart from the narrator. The narrator gains a poetic style next to the one that explains build steps.

## ADDED Requirements

### Requirement: Voice instrument track
A song SHALL be able to hold voice instrument tracks, apart from narrator voice tracks. A voice instrument track SHALL play its lines in the song as written, in audio and video exports and in every live build. Narrator voice tracks SHALL keep their behaviour.

#### Scenario: Song without live build
- **WHEN** a song with a voice instrument plays with the live build off
- **THEN** its spoken lines play at their bars

#### Scenario: Export
- **WHEN** that song is exported to audio
- **THEN** the export holds the same spoken lines at the same bars as playback

### Requirement: Spoken passage
A spoken passage SHALL be a longer text (a few sentences) spoken in a quiet part of the song with light effects only, so the words stay clear (#39).

#### Scenario: Passage in a breakdown
- **WHEN** a song holds a spoken passage on its breakdown
- **THEN** the passage is heard in the breakdown, understandable, and ends before the drop

### Requirement: Poetic narrator
The narrator SHALL have two styles: "explain" (today: it says what the step does) and "poetic" (a short image announces the element that is about to come in, for example "a heartbeat under the city" before the kick). The poetic style SHALL speak only at the steps where a track enters or comes back, with lines from the song, its style or the vocabulary, and SHALL follow the same rules as the explaining narrator (on and off, languages, speakers). Explain SHALL stay the default.

#### Scenario: Poetic entry
- **WHEN** a live build with the poetic narrator reaches the step where the bass enters
- **THEN** a short image is spoken just before the bass is heard, instead of "here comes the bass"

#### Scenario: Default unchanged
- **WHEN** a song does not ask for the poetic style
- **THEN** the narrator explains the steps as before

### Requirement: Refrain
A refrain SHALL repeat a short line every few bars, only in parts of the song where few tracks play or the energy is low, and SHALL stop when the song gets full again.

#### Scenario: Quiet part
- **WHEN** a song with a refrain reaches a break with two tracks playing
- **THEN** the refrain line repeats in the break and is not heard in the drop that follows

### Requirement: Chop
A chop SHALL cut a spoken phrase into slices and play them in a rhythm aligned to the song's steps, as a rhythmic part of the song.

#### Scenario: Chopped word
- **WHEN** a chop of one phrase in 8 slices plays with the rhythm `"0 1 0 1 2 2 3 ~"`
- **THEN** the slices are heard on those sixteenth steps of every bar

### Requirement: Spoken opening
A voice instrument line SHALL be able to open a song, alone or over a held sound. The growth shape opening "voice" SHALL use it.

#### Scenario: Live build opens with a voice
- **WHEN** a song with a spoken opening builds with the "voice" opening
- **THEN** the first sound of the build is the spoken line

### Requirement: Effects
A voice instrument track SHALL accept the voice settings, characters and rack devices that narrator tracks accept. Its words SHALL stay understandable within the voice limits, except in chops, which MAY go further.

#### Scenario: Radio character
- **WHEN** a voice instrument track uses the "radio" character
- **THEN** its lines sound filtered like the narrator with the same character

### Requirement: Texts
The texts of a voice instrument SHALL come from the song, else from its style, else from a small vocabulary of words and short phrases in English and Italian, drawn with the song's seed. Texts SHALL be public domain or written for the project. A line SHALL hold at most 12 words.

#### Scenario: Generated refrain
- **WHEN** a song has a refrain without a text and its style has none
- **THEN** a refrain is drawn from the vocabulary, and the same song draws the same refrain every time

### Requirement: Languages and speakers
Each line SHALL be spoken in the app's language when it has a text in that language, and in its only language otherwise. A voice instrument track SHALL use one of the existing speakers; by default it SHALL NOT use the narrator's speaker of the same song.

#### Scenario: Italian app
- **WHEN** the app is in Italian and a line has English and Italian texts
- **THEN** the Italian text is spoken

#### Scenario: Two voices
- **WHEN** a song has a narrator and a voice instrument and neither names a speaker
- **THEN** they speak with different speakers

### Requirement: Samples made offline
Spoken samples SHALL be made in advance by `npm run voices` for every line of the songs, the styles and the vocabulary. Playback SHALL NOT generate speech or fetch it from the network. A line without its sample SHALL stay silent without errors.

#### Scenario: Missing sample
- **WHEN** a line has no sample on this machine
- **THEN** the song plays without that line and without an evaluation error

### Requirement: Narrator and voice instrument apart
When the narrator and a voice instrument would speak in the same bars, the narrator's comment SHALL be skipped. They SHALL play on separate orbits.

#### Scenario: Same bar
- **WHEN** a step comment falls on a bar where a refrain plays
- **THEN** only the refrain is heard

### Requirement: Voice instrument in the live build
In a live build the voice instrument track SHALL enter like a track, with its line appearing in the code when it first speaks. It SHALL NOT be the first track of a growth unless the opening is "voice".

#### Scenario: Voice in the code
- **WHEN** a live build reaches the first line of the voice instrument
- **THEN** the line is typed into the code and the line is heard

### Requirement: Director
A style recipe MAY give the voice instrument a weight, texts and ways to speak. The director SHALL add a voice instrument to a song with that weight as its chance, and SHALL NOT add one for styles without a weight. The draws SHALL be seeded so the same session gives the same voice instruments.

#### Scenario: Style without weight
- **WHEN** a session uses only styles without a voice instrument weight
- **THEN** its songs have no voice instrument

### Requirement: Sung vocals out of scope
The voice instrument SHALL speak only. Sung vocals SHALL NOT be part of it.

#### Scenario: No pitch tracking
- **WHEN** a voice instrument line plays
- **THEN** it is spoken speech with its effects, not a sung melody
