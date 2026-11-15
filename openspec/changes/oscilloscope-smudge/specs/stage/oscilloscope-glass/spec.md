## ADDED Requirements

### Requirement: Textured smudged glass
The overlays Smudged, Smudged graticule and Real oscilloscope SHALL draw their smudges from texture masks and from elements the app draws itself (a ridged fingerprint, dust with fine scratches, a cloth wipe arc), not from round patches and arcs. Real oscilloscope SHALL use fewer and lighter elements than Smudged. The overlays Empty, Graticule and Vector display SHALL show no smudges.

#### Scenario: Smudged graticule
- **WHEN** the overlay is Smudged graticule and a song plays
- **THEN** the glass shows fingerprints, smears, haze and dust over the beam, and the graticule over them

#### Scenario: Clean overlays
- **WHEN** the overlay is Graticule
- **THEN** no mask is loaded and no smudge is drawn

### Requirement: Glass assembled per song
The glass SHALL be assembled by a plan computed from a seed: a haze base, two to four fingerprints placed near the edges of the screen, one or two smears, sometimes drops or a wipe arc, and dust. The seed SHALL be the song's seed (the song id, or the fast video's seed). The same seed SHALL give the same glass on every frame, after a reload and in every export; two different songs SHALL get different plans. The plan SHALL be computed without the DOM so a check can run it in Node.

#### Scenario: Same song, same glass
- **WHEN** a song is played on the stage and exported as a fragment
- **THEN** the stage and the fragment show the same glass

#### Scenario: Another song
- **WHEN** the next song starts
- **THEN** the glass changes to that song's plan within one frame of the song change

### Requirement: Light on the glass
A smudge SHALL be lit in two ways: faintly by the room's light, scaled by Ambient light and tinted by Screen saturation, and more strongly by the beam, as the phosphor's glow seen only where the glass is dirty. The look SHALL add the parameters Smudge (0 to 2, default 1) and Beam scatter (0 to 2, default 1), each with a song link like the other parameters; Smudge 0 SHALL draw no smudge.

#### Scenario: Grease near the beam
- **WHEN** a fingerprint lies on the trace's path
- **THEN** the fingerprint is brighter where the trace passes than away from it

#### Scenario: Smudge off
- **WHEN** Smudge is 0 on Smudged graticule
- **THEN** the stage shows the graticule only

### Requirement: Masks loaded with the look
The masks SHALL be loaded only when the Oscilloscope look shows an overlay with smudges, and SHALL be loaded before the first frame of a fast video or fragment that shows it. Until they arrive on the live stage, the look SHALL draw the glass without smudges. The masks together SHALL weigh at most 600 KB.

#### Scenario: A fragment from a fresh page
- **WHEN** a 9:16 fragment with the look on Smudged is exported from a page that never showed it
- **THEN** its first frame already shows the smudges

### Requirement: Texture licences and credits
Every file in `public/visuals/glass/` SHALL have an entry in its `manifest.json` with the source URL, the licence and the element's role, and a line in `CREDITS.md`. Only CC0 files and files made for the app SHALL be shipped. A texture whose licence does not allow shipping SHALL only serve as a reference for an element the app draws itself.

#### Scenario: A file without an entry
- **WHEN** a mask is added without a manifest entry, or with a licence outside the allowed list
- **THEN** `npm run check:oscilloscope` fails and names the file
