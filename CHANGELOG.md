# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `tools/decode-hits.mjs`: the bars where the decoded code is silent and the original plays, in the Decode bench.
- Settings: "Deep beat analysis" option, off by default, that downloads the third-party beat tracker Beat This! (about 88 MB, files pinned by SHA-256) with progress, Cancel and Remove, and a disclaimer on its licence, training data, size, host and on-device use.
- Decode: with "Deep beat analysis" on and downloaded, Full takes its beat grid from Beat This! and names it in the panel.
- Local build flag `VITE_DECODE_BEAT_TRACKER` that starts "Deep beat analysis" on.
- `tools/local-models.mjs`: local dev server plugin that serves the "Deep beat analysis" model files from one folder on the machine, copied into each local origin's cache after the SHA-256 check.
- `tools/check-beat-tracker.cjs`: browser check of the "Deep beat analysis" card and of Full with and without the tracker.
- Compose: sound dice in the track panel of drums, bass, arp, lead, pad and guitar tracks, with a roll number, lock chips per group and Undo.
- Songs: `tone` drum setting with decay, tune, drive and cutoff per kit piece group, inside a safe range table.
- Songs: `vary` setting with up to three seeded per-hit variations around the track's own values.
- Radio: new sessions, compilations and New song panel songs compose drum tones and per-hit variation (session option `sound`).
- Styles: `tones` (drums) and `variation` fields in an instrument's `material`.
- `tools/endless.mjs --sound` to turn on composed drum tones and variation.
- `npm run check:sound-params`, `tools/check-sound-dice.cjs` and `tools/check-sound-levels.cjs`.
- Guide: "Sound dice" card.
- Radio: a request row at the top of the console turns a typed request into console commands with the browser's built-in model, applied at once or proposed first.
- Radio: requests name saved patterns by name, refuse unknown or unclear names, answer "cannot" for tempo, time signature and playing backwards, and show vague requests as a proposal.
- Radio: a "cannot" answer to a request that names exactly one command without arguments is shown as a proposal of that command.
- Radio: requests for the drop ("go to the drop", "vai al drop" and similar) give Go to the drop without asking the model.
- Settings: AI assistant card with the engine, model, status, download and mode per area.
- `docs/AGENT-API.md`: every console command an AI engine or agent may give, generated from the command registry.
- `npm run agent-api`, `npm run check:agent-api`, `npm run check:ai` and `tools/check-ai.cjs`: the command registry, its document and the console assistant.
- Guide: "Ask the console" part in the Radio card.
- Code: Instrument name option (Random per song, `$:`, name at line start) and Names from option (instrument or track), in Compose's code options, the radio's Custom section and the Decode tab's Options.
- `tools/check-light-start.cjs`: browser check of a light start (no Sounds photo at startup, layout shift under 0.1 at desktop and phone width).
- `tools/decode-hits.mjs`: hit density per band and per part for the Decode bench, with six songs built for repeated chords and basses (`tools/decode-export.cjs --hits`, `tools/decode-bench.cjs --set hits`).
- `tools/decode-kits.mjs`: the app's drum machines measured from their hat samples into `src/decode/kits.js`; `--holdout` checks the choice on held-out songs.
- `tools/decode-levels.cjs`: the sounds Decode writes, measured through the app into `src/decode/part-levels.js`.
- `tools/decode-similarity.cjs --holdout`: the held-out songs' similarity, printed only.
- Decode: in Full, a Lead track writes the top line as a loop per section, with mute and solo; a sung melody starts muted.
- Decode: All, Audio and Video filters in the library list, with the count of each, remembered and followed by Autoplay, Previous and Next.
- Stage: Video look in the look menu and the arrows, showing a muted video with every render style, Code over, the widgets and the captions over it.
- Stage: with Video chosen and nothing to show, the stage shows the song's own look or Palco, and the menu keeps Video.
- Guide: "Video on the stage" card for the Video look and the Stage videos card.
- Fast video and fragments: the Video look decoded from the files frame by frame, the same frames in every export of the same song, and Video offered as a fixed visual and a fragment visual.
- Session video: a recording with the Video look keeps the stage video playing while the stage is scrolled away or the tab is in the background.
- Decode: with the Video look, the stage shows the picture of the video file Decode plays, in sync with the sound, also for a video without sound.
- Settings: "Stage videos" card with the folders of the Video look (Chrome, Edge), their number of videos, Allow access, remove with confirmation, and the size mode Fill, Fit or Stretch.
- Stage: "Allow stage videos" chip beside the render menu while the stage video folders wait for the browser's permission.
- `tools/make-test-video.mjs`: numbered, coloured test videos drawn by the repository, with and without sound, 9:16, 4K and an unplayable file.
- `npm run check:stage-video` and `tools/check-stage-video.cjs` for the Video look.

- Decode: a music note or video icon on every row of the library list and of mixtapes, and a "no sound" mark on videos without sound.
- Decode: "Another file" opens a panel with "Choose a file…", the recent tracks and the files of the user's folders in one list; the empty tab shows the same list.
- Decode: Add folder (Chrome, Edge), with subfolders, up to 2000 files per folder, the browser's permission asked once per visit, and a video icon for video files.
- Decode: search, a chip per folder, order by name or by recent, and the marks ◆ Full and ◇ Live in the list.
- Decode: Autoplay, off by default, that prepares the next track of the list or mixtape before the end and hands over without a gap.
- Decode: Previous and Next on the player bar for a track opened from the list or a mixtape; with the order by recent they keep the order the list had when the track opened.
- Decode: mixtapes, ordered references to the user's files, with drag, File…, repeat, rename and delete, in the settings backup without file handles.
- Settings: "Include all Decode analyses" checkbox in the backup card.
- `npm run check:decode-library` and `tools/check-decode-library.cjs` (fake folders in the origin private file system); `tools/check-decode.cjs --library`.
- Decode: Tap button next to ½× and 2×, with the count of taps, and the T key to tap the tempo.
- Decode: Auto button that goes back to the analysed tempo after a tapped, halved or doubled tempo.
- Decode: the tab proposes Full after 8 bars in Live, once per track.
- Decode: `vox(…)` and `melody(…)` lines at the end of the decoded code where a top line is heard; they play nothing, also in copied code.
- Decode bench: an acid test song and an arp-and-lead test song in `tools/decode-songs.mjs`, with the lead notes in their truth.
- `tools/decode-export.cjs`: also exports `luci-rosse` and a frozen radio song (`tests/snapshots/decode-radio-song.json`) with their timeline JSON.
- `tools/decode-measure.mjs`: kick, clap and hat F1, recall and false hits, distinct drum grids, chord quality per bar and bass octave errors against the app songs' timelines.
- `tools/decode-similarity.cjs`: similarity of the level B code's sound to the original, with scores in `tests/snapshots/decode-similarity.json`, the owner's files through `DECODE_OWNER_DIR` and an A/B listening set with and without Essentia.js (`--ab`).
- `tools/decode-edits.mjs`: edits per minute, share of edited bars and edit sizes of the decoded code, on any audio file.
- `tools/check-add-waves.cjs`: heads in phrases, moves by reason, long tasks and "too late" of console "+" waves on the baseline scenarios.
- Every move of a pending console batch is recorded with its reason.
- Italian speaker Siri 4 (`siri4`), spoken with the macOS system voice; `npm run voices` makes its samples with `say` without `-v`.
- Draw styles grid on each voice card of the Voices tab: switch the voice styles automatic draws may give a voice, with a mark on changed styles, the count of allowed styles and Reset to defaults.
- Voice style choices kept in the browser and in the settings backup; an import merges them per voice.
- Radio sessions record the allowed voice styles they started with, so Replay, saved sessions and exports keep them.
- Guide card for the Draw styles grid.
- `src/voices/combos.json`: the voice styles automatic draws may use per speaker and language; it ships with every pair allowed.
- Voice style pickers mark a style that is not allowed for the current speaker; it stays selectable.
- Voices tab test bench line that says whether the chosen speaker and style are allowed.
- `npm run check:voice-combos`.
- Narrator style control: automatic, explaining or poetic, for any song.
- Voices group in Compose and in the radio Custom profile: narrator voice, narrator style and narrated growth.
- Voice instrument controls for generated songs: phrases per song, different, repeated or mixed lines, ways and how often, with presets.
- Voice instrument options for a new song by an artist.
- Guide card that compares the narrator, the poetic narrator and the voice instrument.
- Voice instrument controls for the song being edited, in the Compose Voices group and in the voice instrument track panel, with New phrases and Undo.
- Add a voice instrument to a song that has none, from the Compose Voices group.
- Radio steering command that changes the voice instrument of the song on air from its next quiet part.
- Optional `voiceOptions` field on spoken tracks.
- Pattern preview in Compose: a headphones button next to a track's preset or groove menu plays the selected pattern in a loop, on the song's bars while the song plays, alone while it is stopped.
- Bar counter in the player bar: `bar n / total` of what plays, grown songs included.
- Sound controls for both voices (voice style, speaker, volume, pitch, speed, filter, low cut, drive, reverb, delay) in the Compose and radio Voices groups.
- Voice styles: Clear, Radio, Distant, Robot, Deep, Bright, Cathedral, Echo, Dirty, Slow.
- Phrase list of the voice track with bars, way and text editable in place, heard bars in Crescendo and Live coder, Fill with, + Add line and a remove button per row.
- Narrator lines list in the Compose Voices group.
- Where the voice track speaks: quiet, medium and busy parts.
- On/off switch for each voice in the Compose and radio Voices groups.
- How often Always for the radio voice track.
- A voice track chance in every style.
- Console Voice group: phrase preset and voice style for the song on air, and a typed line said now or at the right moment.
- Dev-server voice helper that makes the samples of new and edited lines.
- `npm run voices -- --song <file>` and `--list`.
- Faders for the voice Sound controls in the hardware theme.
- `npm run check:speakers`: every speaker is installed and sounds different from the default voice.
- `npm run voices -- --jobs N` makes several samples at a time.
- `node tools/voice.mjs --prune` lists the sample banks of removed speakers; `--prune --yes` deletes them.
- Growth openings `bass`, `chord` and `top`: the bass, a chord part or the beat without its kick first.
- Kick starts: the first kick of a build can be one kick, two, four on the floor, a push, the off-beat or the first two kicks of the groove, weighted per style with `growthShapes.kicks`.
- More drum machines and sounds in every style.
- New kits in the kit menu: `RolandR8`, `KorgM1`, `RolandMC303`, `RolandTR505`, `RolandTR626`, `BossDR110`, `AlesisSR16`, `YamahaRY30`, `RolandCompurhythm78`, `MPC1000`.
- `npm run probe:openings` reports how radio songs open, `-- --check` checks the targets.
- `npm run check:kit-rows`: every style kit has the drum rows its grooves play.
- Four-on-the-floor kick variants in the drum generator: straight, pickup, push, rolling and broken, drawn by energy.
- Twelve built-in grooves: Techno pickup, Rolling kick (techno), Broken techno, Trance push, Trance pickup, House pickup, Rolling kick (house), Drift, Heartbeat, Phonk roll, Phonk half-time and Rock push.
- Presets Strum (country guitar), Swell (ambient pad) and Two-feel (jazz bass).
- Radio: a countdown badge next to Extend until it enters ("Extend +16 s · in 24 s").
- `npm run check:steer-memo`: the radio steering with kept results compared with a full steering.
- `npm run check:added-play`: tracks added with the radio console's "+" play every bar of the phrase they enter.
- `tools/steer-bench.mjs`: steering time per console press.
- One-row pianoroll looks: a pianoroll widget whose hits fall on one row draws thin ticks in a low strip when every hit is as loud, and shows accents by bar height, transparency or both, in the editor, on the stage panels and in videos.
- Settings "One-row pianoroll, equal volume" (Thin, Full) and "One-row pianoroll, varying volume" (Height, Transparency, Both, Random) in the Code widgets card.
- `npm run check:one-row-roll`.
- `tools/convolver-bench.cjs`: the cost of replacing a playing reverb's response against a fresh reverb, while a radio song plays.
- `tools/check-add-lag.cjs --convolvers`: every reverb response a case puts on a convolver, with its cost and orbit.

### Changed

- `onnxruntime-web` 1.31.1 is an app dependency instead of a development dependency.
- Built-in styles give drum tone ranges and variation amounts and targets in their character.
- Playlists: a session saved with an older composed sound version warns that it may sound different.
- Startup: the photos of the Sounds tab load only when the tab opens, and only for the rows on screen.
- Startup: the header, the stage and the work area keep their place after the first paint (no layout jump).
- Decode: in Full, chords that hit with clear, repeating gaps are written with their rhythm (`.struct("…")` after the voicing).
- Decode: in Full, a bass note struck again where the analysis heard one held note or none, under the kick too, is written again.
- Decode: in Full, two sections that sound alike get the same parts: a section that lost its kick or its bass takes them from its twin.
- Decode: stored Full analyses are made again (analysis version 20).
- Decode: in Full, the drums get a drive of 1, 2 or 3 when the high band calls for it, decided apart from the drums' level.
- Decode: in Full, a bass note repeated with a new attack is written again instead of held.
- Decode: in Full, a driven bass is no longer written as a clean square, and a square bass is told by its odd harmonics.
- Decode: in Full, chords whose roots fit the key but whose thirds do not are written as power chords.
- Decode: in Full, the tempo follows three agreeing estimates at double the tempo found, or at 3:2 of it.
- Decode: in Full, each part's level is predicted from the drum rows and the steps the code plays, in five bands, and a part that already balances keeps its written level.
- Guide: the Decode card describes the Lead track in Full, the tempo checked again after 8 bars with a kick in Live, Essentia.js for the top line and the video picture with the Video visual.
- Guide: the Settings card says what the backup holds of Decode and the "Include all Decode analyses" choice.
- Guide: the "Video on the stage" card says that the fast video and fragments offer Video as a chosen visual.
- Guide: the Stage widgets card says that the hit grid panel comes in with the first drum line and that a new song chooses its panels again.
- Decode: the store keeps up to 2000 analyses instead of 50 and drops Live-only analyses before full ones.
- Decode: a light index of the stored analyses feeds the lists; opening the tab no longer reads every stored analysis.
- Settings backup: it carries the 100 Decode analyses used last by default, and the import counts Decode analyses and mixtapes.
- Decode: the recent tracks are rows of the panel's list, without their length.
- Decode: kicks under a loud bass are found when they fall on every beat of a bar.
- Decode: quieter hats between loud ones are kept, and claps need noise darker than the hats just before them.
- Decode: in Full, a section's main drum pattern is the majority of each step, and a variant must come back often.
- Decode: in Live, the tempo and the beat are checked again after the first 8 bars with kicks, and the code restarts on the new grid.
- Decode: stored analyses are made again once more for the new drum analysis.
- Decode: in Full, a chord keeps the quality most bars of its section give its root.
- Decode: in Full, the bass stays in one octave range per section and plays nothing where the bass is quiet.
- Decode: a detuned bass under a kick is heard.
- Decode: in Full, "Our sounds" picks the drum machine whose hats sound nearest to the track's.
- Decode: in Full, chords that ring on get a room, the Lead's sound follows the track's brightness, and each part's level follows the original's balance of low, mid and high.
- Decode: a bass whose filter moves over the bar is written as a sawtooth with a moving resonant filter.
- Decode: the code changes less often, in Live and in Full: a line waits a few bars between edits and changes only for a real musical difference.
- Decode: the space bar only plays and pauses.
- Decode: stored analyses are made again once, with a note in the tab.
- Radio console "+", "−", saved patterns and locks join a pending batch only within 5 s of its last press and 10 s of its first; a later press opens a second wave at least one phrase after the first, which it never moves.
- A "−" that takes back a pending "+" goes back to that batch, even outside the join window.
- On a grown radio song a batch's head enters within two phrases of the first press with as many new lines as can be typed there, at least one; three or four phrases only as a fallback.
- On slow songs a console batch can enter on the half-phrase start within 30 s of the press.
- Generated voices, the voice instrument and the narrator speaker drawn next to a chosen narrator style use only the speaker and style pairs that `src/voices/combos.json` allows.
- Radio: a style the compilation invents shows in Now playing and in On air, STYLES as the same chip and hint as the Invent die's trial style, with an explicit Keep.
- "Fully narrated" is now "Narrated growth".
- The Compose Voices group is always shown; narrator controls that cannot apply are disabled with the reason.
- New-song voice instrument settings moved from the Compose toolbar to the "In the next song" row of the Voices group.
- The radio narrator controls and voice instrument controls are in one Voices group.
- The radio Voice knob, compilation range, curve and console group are now named Narrator.
- The track panel splits its pattern row into "Song patterns" (patterns and Delete) and "Make patterns" (New, Save as pattern, Compose a part).
- The button that opens a track's pattern in the Patterns tab shows a flask instead of headphones.
- The player bar shows the time of the radio song on air; its bars moved to the bar counter.
- The voices are labelled "Voice: narrator" and "Voice: track"; the Guide card is "Two voices".
- The radio Voices group holds the settings for the next songs only; the song on air changes from the console.
- The radio How often menu no longer offers Never; a saved Never reads as the voice track switch off.
- The radio narrator switch works with every profile.
- The poetic narrator keeps the step lines with Narrated growth.
- The narrator track of generated and built-in songs is named Narrator.
- The speakers are Albert, Fred, Junior and Kathy, in English only; in Italian Alice speaks their lines.
- A removed speaker in a saved song, session or style plays with the default voice.
- `npm run voices` leaves out a speaker that speaks like the default voice.
- Crescendo draws its first track from the style's opening weights instead of always starting on the kick.
- The Compose Opening control also steers the first track in Crescendo, with the lead openings only.
- Every style has its own opening weights; the default weight of the slow opening is 1.
- Radio: «+ kick» and «+ beat» compose the new rows first when the session composes on air, then use the style's built-in grooves, and avoid the rhythms the instrument already plays.
- Every style with a kick lists at least two kick rhythms; acid, ambient, berlin-techno, classic-rock, country, dark-cyberpunk, gated-trance, house, industrial, phonk, progressive-house, pure-trance and trance list more grooves.
- Acid lists more arp, hook and bass presets, country and darksynth more guitar patterns, ambient a new pad and jazz a new bassline.
- Radio sessions made before director version 20 may sound different.
- Radio console changes on Live coder and Crescendo songs are steered in about the time of the new command, not of every command before it.
- The first boundary a console change on a grown radio song takes follows that song's measured steering time per command.

### Fixed

- Decode: Full puts the beat grid on the kick when the whole track's kick sits a sixteenth off it, so the drums read `x...x...x...x...`.
- Decode: Full keeps writing a pad that fades out to the very end of a track, and a quiet pad that fades in before it is heard.
- Decode: Full keeps writing a pad that fades out after the drums stop, and a quiet outro that holds one note, instead of ending in silence.
- Decode: Full writes four kicks a bar in a loud section with a kick on every beat that its kick test hears only now and then.
- Decode: Full writes no chords before a pad enters inside a section, where only the drums' noise read as chords.
- Decode: Full writes the quiet pads of intros, breaks and outros, at a lower level, instead of silence.
- Decode: Full writes no chords where they are only the harmonics of a distorted bass on 16ths.
- Decode: Full writes the kick on its click when the beat grid sits a 16th early, and a backbeat snare a 16th off the grid as a clap, not an open hat.
- Radio: near the end of a growth the console's riser button stays enabled when the riser fits on the grown song, and a riser with no room within two phrases shows a notice instead of disappearing.
- Radio: a track added with "+" on the half-phrase start just before a break or a charge plays its whole first phrase instead of leaving with the drums after 4 bars.

- Decode: in Full, a two-bar drum groove is written as its two bars in turn, not as the hits they share.
- Decode: in Full, a chord from Essentia.js on another root no longer turns minor from the old chord's quiet third.
- Decode: a bass note at the end of a bar no longer starts again on the next bar's second step under a kick.
- Decode: a track saved in Live before the tempo check ran gets that check when it is opened again.
- Fast export: two exports of a song with a supersaw give the same sound.
- Decode: the similarity check gives the same scores on two runs.
- Stage widgets: after a song change, Monitor and the side panels show the new song's panels; no hit grid space is kept from the song before, and the hit grid keeps no rows of earlier songs.
- Video on the stage: a seek in Decode keeps the last picture until the new one shows, instead of the normal look for a moment.
- Backup: the default backup file is written compact like the one with all Decode analyses, so the two differ only by the analyses.
- Decode: the library list keeps its scroll on Select, a tick, the Add to mixtape menu and Cancel; a new order starts it at the top like a new chip or kind.
- Decode: in Full, Essentia.js's tempo is also taken from a confidence of 2.0 when the app's own tempo agrees, so a borderline track no longer changes the tempo's source from one run to the next.
- Decode: a video without sound plays in silence for its length, with a placeholder in the code column, instead of doing nothing.
- Decode: a file of the library that cannot open gives a note in the panel and no longer stops the open track.
- Decode: a mixtape's Play, Autoplay, Previous and Next skip rows that fail to open with a note naming them, and stop with a note when nothing can play.
- Decode library: ticking a row's checkbox in Select mode now selects the row.
- Decode: the name of a track not heard keeps its contrast in the light theme.
- Decode: in Full, a part heard every other bar no longer mutes and unmutes on every bar.
- A curve or energy command on a grown radio song no longer builds the director's view on the page while it waits for its steering.
- Radio: a song's own drum machine and sample sounds are loaded ahead, notes out of a soundfont's range play from another font of the instrument, and a resume, a console change or the next song no longer makes the scheduler skip notes on a slow computer.
- Radio console changes on a long Live coder song enter within a phrase or two of the press instead of minutes later, and the sounds of the tracks they bring in are loaded before their entry.
- A track added with «+» on a grown radio song plays from its phrase, also when several instruments are added at once.
- A line typed in the radio console with Say now is heard with its own new sample, and no later line of the same voice plays a neighbouring sample.
- An unsaved change in the phrase editor of the Voices tab is no longer lost when the tab redraws in the background.
- Saving a phrase edit in the Voices tab no longer closes the next phrase form when the voice helper is slow.
- Radio: Keep on a style invented by the compilation saves it with one click while Now playing is redrawn.
- Radio: a line typed in the console is no longer lost when its sample decodes late; it plays on a later bar.
- Shorter main-thread pause on the bar where a live build step changes the code (Classic Say now included).
- Radio: Now playing is redrawn only when what it shows changes; the position marks move in place.
- Radio: Skip no longer freezes the page while the next song grows; it shows "Skipping…" until the next song is ready.
- Radio: the change to the next song at the end of a song no longer freezes the page; the next song's window and its code plan are made before the change.
- Radio: the new song's code goes into the editor, the next typing is planned and the console is drawn in tasks of their own after a song change.
- Reverb impulse responses are reused for the same room settings, so reverbs that change together no longer stall the scheduler.
- Radio: a riser pressed inside the growth of a Live coder or Crescendo song comes within two phrases, not near the song's end.
- Radio: console commands steer Classic songs and make the code plan of the window away from the page; the window is not made again while the steering runs.
- Radio: adding a saved pattern redraws only the saved patterns panel after the press.
- The code typing updates the editor at most 30 times a second, and the code panel's scroll no longer forces a layout each frame.
- Song cards are updated each frame only while the Songs tab is shown.
- A new hit grid or tone cloud canvas in the editor starts empty, not at the browser's default 300 × 150, until its first draw.

### Removed

- Decode: the `// vox: …` comment at the end of the decoded code.
- The radio button Apply to the song on air (the console's Voice group replaces it).
- The speakers Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy and Shelley.

## [0.6.0-beta.2] - 2026-10-25

### Added

- Listen and Groove Lab modes, each with its own tabs.
- Player bar with a global volume and a draggable timeline.
- Playlists with shuffle and repeat, and radio sessions saved in playlists.
- Song search, filters, tags, favourites, dates and a paged song list.
- Trash bin for songs, kept for 30 days, built-in songs included.
- Styles, Artists and Genres tabs to read, edit and share styles and artists.
- Built-in artists with pixel-art portraits, taste and quirks, among them a live coder artist.
- Radio console to steer the song on air: energy, parts, vary, swap, mute, level, end.
- Radio curves for density, brightness, tension and voice.
- Radio compilation mode with presets and random artists, styles, knobs and sounds.
- Transitions between radio songs.
- Continue a Compose song in the radio.
- Crescendo and Live coder profiles: a song grows from one sound in small code edits, in Compose and in the radio.
- Growth shapes for the opening, pace and development of a Live coder growth.
- Human typing with listening pauses, typing mistakes and changes of mind.
- Code views: code of the moment, compact code, one line per track and code per section.
- Code options: comments, technical functions, song and library functions, and one line per part (Sections).
- Each song keeps its own configuration, with trials per song and buttons back to the original song or configuration.
- Narrator voice switch.
- Voice instrument: spoken lines played as part of the music.
- Material generator that composes melodies, basslines, arpeggios, chords, grooves and sounds from a number.
- Patterns tab to hear, compose and keep song parts.
- Song soul: a scene of the stage and a hidden display beside it.
- Recording studio scene and endless scrolling visuals (Caravan, Neon city).
- Fast offline export to WAV, FLAC, MP3 and Opus, by songs, minutes or exact length.
- Video of songs and radio sessions, with fast rendering from the timeline.
- Vertical fragments with labels, taglines and texts for sharing.
- Live output window with a control room, presets and transitions.
- Radio recording with a track list.
- Settings page with a backup of everything in the browser.
- Guide with a card for every feature.
- Master limiter in the app and in every export.
- Knowledge base and checks for agents working on the project.

### Changed

- The app starts in about a second, also with many songs of your own.
- Song cards show the length of each song with its own profile.
- Parts are stored as ideas, so the same sound is written with shorter code.

### Fixed

- The hidden mixer gives every part the level of the code in full.
- Exports keep their length, their sounds and the audio in line with the picture.
- Songs keep playing when the tab is in the background.
- Sample addresses that never loaded.

[Unreleased]: https://github.com/alessandrodevecchi/coding-misk/compare/v0.6.0-beta.2...HEAD
[0.6.0-beta.2]: https://github.com/alessandrodevecchi/coding-misk/compare/v0.5.0...v0.6.0-beta.2
