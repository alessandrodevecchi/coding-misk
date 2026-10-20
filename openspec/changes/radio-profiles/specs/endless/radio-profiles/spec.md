## ADDED Requirements

### Requirement: Profile of a generated song
Each generated radio song SHALL have one profile (Classic, Crescendo or Live coder), taken from the first source that gives one: the session Profile control, the compilation setup, the artist's weights, the drums style's declared profile, else Classic.

#### Scenario: Style declares Live coder
- **WHEN** the Profile control is "as the artist", no artist plays and a song's drums come from the Acid style
- **THEN** the song plays as Live coder

#### Scenario: Artist weights
- **WHEN** the Profile control is "as the artist" and the artist on air has `profiles: { "crescendo": 1 }`
- **THEN** its songs play as Crescendo

### Requirement: Session Profile control
The radio SHALL offer a Profile control with "as the artist" (default) and one value per profile. A profile chosen there SHALL apply to every generated song from the next song prepared, whatever the artist, the compilation, the styles or the genre.

#### Scenario: Only Live coder with a Classic artist
- **WHEN** the listener sets Profile to Live coder and picks an artist without profile weights
- **THEN** the next songs keep the artist's styles and knobs and play as Live coder

#### Scenario: Only Live coder in a compilation
- **WHEN** a compilation plays with Profile set to Live coder
- **THEN** every generated song plays as Live coder and the compilation still draws artists, random artists and styles

### Requirement: Custom profile in the radio
The radio Profile control SHALL also offer Custom. With Custom the console SHALL show the same profile controls as Compose (build, growth, duration, growth shape, code view, generator, comments, technical functions, typing, mistakes, wrap, lit notes) in a section that can be collapsed, and the chosen combination SHALL apply to every generated song from the next song prepared. It SHALL be saved with the session and replay identically.

#### Scenario: Custom combination
- **WHEN** the listener picks Custom, sets Live coder growth with comments off and technical functions at the mixer, and collapses the section
- **THEN** the next songs play with that combination and the section stays collapsed with a summary of the choice

### Requirement: Profile draws do not move other draws
Weighted profile draws SHALL use their own seeded stream, so the songs' styles, knobs, parts and transitions are the same as without the draw.

#### Scenario: Classic session unchanged
- **WHEN** a session with Classic styles and artists without profile weights is generated with a seed from the endless fixtures
- **THEN** the session is identical to the fixture

### Requirement: Artist profile fields
An artist SHALL be able to give `profiles` weights and a `growth` block (duration and growth shape weights). An artist without `profiles` SHALL leave the choice to the next source. The validator SHALL report wrong ids and weights with their path.

#### Scenario: Invalid weight
- **WHEN** an artist file has `profiles: { "switch": -1 }`
- **THEN** validation fails at `profiles.switch`

### Requirement: Random and built-in Live coder artists
Random artists SHALL draw profile weights from a separate stream, keeping every other field they had for the same seed. A built-in artist SHALL be made for the Live coder.

#### Scenario: Same random artist
- **WHEN** a random artist is made from a seed used before this change
- **THEN** its name, styles and knob ranges are the same as before

### Requirement: Compilation profiles
The compilation setup SHALL be able to limit or weight the profiles of generated songs, and SHALL offer a built-in "Live coder" preset. A setup without profiles SHALL leave the choice to the artist and the style.

#### Scenario: Live coder preset
- **WHEN** the listener picks the Live coder compilation preset with Profile "as the artist"
- **THEN** every generated song plays as Live coder

### Requirement: Profile of a saved song in a stream
A saved song played as song 0, in a frozen session or in the playlist Mix SHALL play with its own declared profile. Without one it SHALL take the radio session's forced profile when it plays in the radio, else the profile it would have when played alone.

#### Scenario: Continue in radio
- **WHEN** a song playing as Live coder in Compose is continued in the radio
- **THEN** it keeps playing as Live coder with the same code on screen

#### Scenario: Mix of saved songs
- **WHEN** a playlist Mix holds one song declaring Live coder and one declaring Classic
- **THEN** the first grows like a live coder and the second plays in blocks

### Requirement: Growth on air
A radio song with Crescendo or Live coder SHALL grow on air from the director's song, with the same growth rules as in Compose, and SHALL then follow the director's plan. Classic songs SHALL build in blocks as before.

#### Scenario: Written form
- **WHEN** a director song is turned into its written form and played in blocks
- **THEN** it gives the same events as the director's song

#### Scenario: Live coder song
- **WHEN** a Live coder song comes on air
- **THEN** it opens with its growth shape's opening and grows with small typed moves

### Requirement: Growth shapes on air
The growth shape of a Live coder radio song SHALL come from the song's own shape, then the artist's `growth` weights, then the style's weights, then the default weights. Metamorphosis SHALL not be drawn on air. The typed opening SHALL be drawn only after a cut or an interlude.

#### Scenario: After a mix
- **WHEN** a Live coder song follows a mix transition
- **THEN** its opening is not the typed opening

### Requirement: Fitted duration by default
A grown radio song SHALL fit its planned length unless its artist asks for free duration. With free duration the song SHALL wait for its typing and the next song SHALL start later.

#### Scenario: Fitted song
- **WHEN** a Live coder song is planned for four minutes with fitted duration
- **THEN** it ends within one phrase of four minutes

#### Scenario: Free song
- **WHEN** an artist with `growth.duration: "free"` plays a Live coder song whose typing needs more bars
- **THEN** the song gets longer and the next song starts after it, with its transition as planned

### Requirement: Typing on air
Typing on air SHALL follow the song's profile: human typing with mistakes for Live coder, never faster than a person, with forced pastes only as the Compose rules allow. The sound SHALL never depend on the typing or the panel width.

#### Scenario: Narrow panel
- **WHEN** the same session plays in a narrow and in a wide window
- **THEN** both play the same events at the same bars

### Requirement: Code panel shows the song on air
The code panel SHALL show only the song on air, written with its own profile's view, comments and technical functions.

#### Scenario: Live coder song on air
- **WHEN** a Live coder song is on air
- **THEN** the panel shows the code of the moment with compact functions, essential comments and no voice code, and the narrator still speaks

### Requirement: Hidden incoming song
During a transition into a Crescendo or Live coder song, the incoming song SHALL play from evaluated code that is not shown, and SHALL appear whole when it goes on air. The tail of the outgoing song SHALL also play hidden once the incoming song is on air.

#### Scenario: Transition into a Live coder song
- **WHEN** a Live coder song fades in under the song on air
- **THEN** the panel shows only the song on air until the new song goes on air

### Requirement: Incoming song option
An option SHALL show the incoming song in the panel as today. Its default SHALL be visible when the incoming song is Classic and hidden otherwise.

#### Scenario: Classic to Classic
- **WHEN** a Classic song mixes into another Classic song with the default option
- **THEN** the panel shows both songs during the transition, as before this change

### Requirement: Hidden songs keep their own levels
The hidden incoming and outgoing songs SHALL play in full technical form on their own buses, so both songs sound as written while the song on air uses the hidden mixer and song functions.

#### Scenario: Two basslines
- **WHEN** both songs have a bass during a transition
- **THEN** each bass keeps its own level and no song function name of one song changes the other

### Requirement: Commands as waypoints
On a grown song a steering command, a curve point or Extend SHALL become the next waypoint, reached by small typed moves from the code on air; the steps before its boundary SHALL stay. End SHALL lead to the ending as a last waypoint.

#### Scenario: More energy
- **WHEN** the listener asks for more energy during a Live coder song
- **THEN** the next steps move toward a fuller state a few characters at a time

#### Scenario: End
- **WHEN** the listener presses End during a Live coder song
- **THEN** lines are muted or commented one at a time until the outro, then the transition plays

### Requirement: Command boundary waits for typing
On a grown song a command SHALL apply at the first boundary that leaves time to type its edit at a person's pace, and the queue SHALL show that bar.

#### Scenario: Long edit
- **WHEN** a Swap on a Live coder song needs more typing than the bars left before the next phrase
- **THEN** the queue shows the phrase after and the edit is typed without speeding up

### Requirement: Vary and Swap typed on air
On a grown song Vary and Swap SHALL reach the new part through small edits of the line's notes, ending on the new part at the boundary.

#### Scenario: Vary the bass
- **WHEN** the listener varies the bass of a Live coder song
- **THEN** the bass line's notes change in small edits and the new bass plays from the boundary

### Requirement: Mixer commands in the code
On a grown song a mute or unmute SHALL be typed as the line's `_$:` label, and a volume SHALL appear as a level on the line.

#### Scenario: Mute
- **WHEN** the listener mutes the hats of a Live coder song
- **THEN** the hats line gets `_$:` and is silent from the next bar

### Requirement: Session replay
A session SHALL record the Profile option and its changes, and replaying it with the same commands SHALL give the same profiles, shapes, growth steps and sounds. A recipe saved before this change SHALL replay every song in blocks.

#### Scenario: Old recipe
- **WHEN** a recipe saved before this change is replayed
- **THEN** every song builds in blocks as when it was heard

### Requirement: Versions of saved sessions
A session saved in a playlist SHALL record the shapes and growth versions when it holds a grown song, and SHALL warn when any recorded version differs from the app's. A frozen session SHALL store its grown songs as heard and SHALL not warn.

#### Scenario: Shapes version changed
- **WHEN** a saved session with Live coder songs was saved with an older shapes version
- **THEN** its item shows "may sound different" and offers Freeze

### Requirement: Console shows the profile
The radio console SHALL show the Profile control and, on the now playing card, the profile of the song on air and its growth shape when it has one.

#### Scenario: Now playing
- **WHEN** a Live coder song with opening full kick, pace fast and development masks is on air
- **THEN** the card shows "Live coder · full kick · fast · masks"

### Requirement: Exports with grown songs
Fast export, radio ranges, saved sessions, session video and fast video SHALL play grown songs with their hidden code, and the video SHALL show only the song on air.

#### Scenario: One-hour export
- **WHEN** a one-hour session with Live coder songs is exported fast
- **THEN** the export completes, sounds like the session in real time, and its speed is reported

#### Scenario: Video code
- **WHEN** a session with a transition into a Live coder song is exported as video
- **THEN** the code area shows only the song on air at each moment

### Requirement: Display options apply on air
Options that change only how the code looks (comments, technical functions, line breaks, lit notes, human typing, typing mistakes) SHALL apply to the song on air from its next code edit when the listener changes them, in the radio as in Compose. Options that change how a song grows SHALL apply from the next song. A replay SHALL use the display options set when it starts; it SHALL NOT record each change.

#### Scenario: Comments off during a song
- **WHEN** a Live coder song is on air with track names and the listener sets comments to none
- **THEN** the track names leave the code at the next edit, and the sound does not change

### Requirement: Live coder shows no track comments by default
The Live coder profile SHALL show only the title as comments by default, in Compose and in the radio. Classic and Crescendo SHALL keep their comments.

#### Scenario: Default
- **WHEN** a song plays with the Live coder profile and no override
- **THEN** its code has the title line and no track name or note comments

