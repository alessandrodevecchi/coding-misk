# Spec Delta

## Purpose

The Video look of the stage: a real video as the stage's picture, from the video file Decode plays or from the user's stage video folders, muted, one per song, in every render style and size mode, light on the browser.

## ADDED Requirements

### Requirement: Video as a stage visual

The look menu and the arrows beside it SHALL offer "Video" (the same word in English and Italian) among the other looks. The default look SHALL stay the standard visual (Palco). The choice SHALL be remembered like any look and SHALL be part of the radio's own look when picked while the radio plays. A song file SHALL NOT carry Video as its own look; while the user has chosen Video, opening a song with its own look SHALL NOT replace the choice.

#### Scenario: Picked and remembered

- **WHEN** the user picks Video in the look menu and reloads the page
- **THEN** the look menu shows Video

#### Scenario: A song with its own look

- **WHEN** Video is chosen and the user opens a song whose file names Pixel as its look
- **THEN** the look stays Video

#### Scenario: Default

- **WHEN** a new user opens the app
- **THEN** the stage shows Palco, not Video

### Requirement: Fallback when Video has nothing to show

When Video is chosen and there is nothing to show (no track video, no stage video folder, every folder waiting for access, no playable file), the stage SHALL show the look the app would show without Video: the open song's own look when its file names one, else the default look (Palco). The look SHALL stay Video in the menu and in storage. A file that cannot be played SHALL be skipped for the session, the next file SHALL be tried, and one note SHALL say so.

#### Scenario: No folders, a song without its own look

- **WHEN** Video is chosen, no stage video folder is set and Compose plays a song whose file names no look
- **THEN** the stage shows Palco and the look menu still shows Video

#### Scenario: No folders, a song with its own look

- **WHEN** Video is chosen, no stage video folder is set and Compose plays a song whose file names Pixel as its look
- **THEN** the stage shows Pixel and the look menu still shows Video

#### Scenario: The video comes back

- **WHEN** the stage shows the fallback look and the user then adds a stage video folder
- **THEN** the stage shows a video from the folder without the user picking Video again

#### Scenario: An unplayable file

- **WHEN** the picked file uses a codec the browser cannot play
- **THEN** another file of the folders shows and a note names the skipped file

### Requirement: Access from the stage

When the fallback comes from folders waiting for access, the stage SHALL show an "Allow stage videos" chip; one click SHALL ask the browser's permission for the waiting folders and, once granted, the video SHALL show.

#### Scenario: After a reload

- **WHEN** Video is chosen with one folder, the page is reloaded and a song plays
- **THEN** the stage shows the fallback look with the "Allow stage videos" chip, and after one click on it and the browser's consent the stage shows a video from the folder

### Requirement: Track video first

While the Decode track counts as the player (open in Decode, or playing) and its file has a video track, the Video look SHALL show that file's picture, in sync with the file time heard, also for a video without sound playing in silence. Otherwise the Video look SHALL show the stage videos. The stage videos SHALL work in Compose, Radio and Decode.

#### Scenario: A video file in Decode

- **WHEN** Video is chosen, stage video folders are set, and Decode plays a video file
- **THEN** the stage shows that file's picture, not a stage video

#### Scenario: An audio file in Decode

- **WHEN** Decode plays an audio file with Video chosen and stage video folders set
- **THEN** the stage shows a stage video

### Requirement: Always muted

A video on the stage SHALL never make a sound: the stage SHALL not play or decode a video's audio, live or in an export. Video files with an audio track SHALL be allowed.

#### Scenario: A clip with sound

- **WHEN** a stage video file holds a loud audio track and shows on the stage while a song plays
- **THEN** the master output carries only the song, and its levels equal the same song on Palco

### Requirement: One stage video per song

Each song SHALL get one stage video picked at random from the folders; the video SHALL loop within the song and SHALL NOT change until the song changes. The next song (another song in Compose, the next playlist item, the next on-air song in the radio, the next Decode track without a video) SHALL get the next pick. There SHALL be no video mixtape or setlist.

#### Scenario: Next song

- **WHEN** the radio moves to the next song with three stage videos available
- **THEN** a different video shows from the next song's first bar

#### Scenario: A long song

- **WHEN** a 6-minute song plays with a 20-second stage video
- **THEN** the same video loops for the whole song

### Requirement: Variety between songs

Every playable stage video SHALL be picked once before any file repeats, and with two or more files the same file SHALL NOT show for two songs in a row.

#### Scenario: Three files, six songs

- **WHEN** a playlist of six songs plays with three stage videos
- **THEN** songs one to three show three different videos, and song four differs from song three

### Requirement: The track video follows the track

A track video SHALL show the frame at the file time heard: pausing the track SHALL pause it, seeking SHALL move it to the same time, and a drift over 0.25 s SHALL be corrected. After a release it SHALL come back at the file time heard.

#### Scenario: Seek in a video file

- **WHEN** Decode plays a video file and the user seeks to 1:30
- **THEN** the stage shows the file's frame at 1:30

### Requirement: A stage video plays on its own on the stage

On the live stage, a stage video SHALL start from its beginning when its song's pick opens, loop on its own, pause when the music pauses and go on from where it paused. Seeking or skipping within the same song SHALL NOT move it. A stage video that comes back after its release SHALL start again from its beginning. When nothing plays, the stage SHALL show the frame where it stopped. The exports use the song-time rule instead (fast video spec).

#### Scenario: Seek in a song

- **WHEN** the user seeks to 1:05 in a song while a stage video plays
- **THEN** the video keeps playing from where it was, with no seek

#### Scenario: Pause

- **WHEN** the user pauses the song
- **THEN** the video stops on its current frame, and Play goes on from that frame

### Requirement: Size modes

The Video look SHALL draw in one of three size modes, chosen in the "Stage videos" card: Fill (the default: the picture covers the stage area, centred, the overflow cropped), Fit (the whole picture inside the stage area, the bands in the theme's background colour) and Stretch (the whole picture scaled to the stage area without keeping its proportions). The mode SHALL apply to the stage, the session video, the fast video and the fragments, and SHALL be in the backup.

#### Scenario: Fill on a wide stage

- **WHEN** a 4:3 video shows in Fill on a 2.4:1 stage
- **THEN** it fills the whole width and its top and bottom are cropped

#### Scenario: Stretch

- **WHEN** a 4:3 video shows in Stretch on a 2.4:1 stage
- **THEN** the whole picture fills the stage, widened, with nothing cropped and no bands

#### Scenario: Fit in the hardware theme

- **WHEN** a 9:16 video shows in Fit on a 16:9 stage in the hardware theme
- **THEN** the bands at its sides are the hardware theme's background colour

### Requirement: Everything over the video

The stage widgets, Code over, the captions and the song card SHALL draw over the Video look as over a scene look. The Video look SHALL draw no beat flash.

#### Scenario: Code over

- **WHEN** Code over is on and the Video look shows
- **THEN** the code is drawn over the video on its side, as over Pixel

### Requirement: Light on the browser

The Video look SHALL load and decode a video only while the stage video is needed. When it stops being needed, the video SHALL pause at once and stay loaded for a grace time, then its decoder and object URL SHALL be released: 60 seconds while the stage is hidden, 30 seconds after the user picks another look. The app SHALL hold at most one video element or decoder for the stage at a time. No other look SHALL open a video file.

#### Scenario: Another look

- **WHEN** the look is Pixel and stage video folders are set
- **THEN** no video file is opened

### Requirement: Loading in the background

A video needed again within its grace SHALL go on at once from where it paused (a track video at the file time heard). A video needed after its release, or opened for the first time, SHALL load in the background and start (a stage video from its beginning, a track video at the file time heard), while the previous or fallback look keeps drawing until its first frame is ready; a wait of a few seconds is acceptable.

#### Scenario: Switching to Video

- **WHEN** the user picks Video while Pixel shows and a song plays
- **THEN** Pixel keeps drawing while the file loads, and the stage video replaces it at its first frame, from its beginning

#### Scenario: Away from Video and back

- **WHEN** the user picks Pixel while a stage video shows, and picks Video again after 10 seconds
- **THEN** the video shows at once from where it paused, without reopening the file

#### Scenario: Away from Video for long

- **WHEN** the user picks Pixel while a stage video shows and waits 40 seconds
- **THEN** the video element has no source and no object URL is open

### Requirement: When the page counts as hidden

The stage SHALL count as hidden when the page is hidden as the Page Visibility API reports it (`document.hidden`: the app's tab is not the active tab of its window, the window is minimised, or the browser reports the window fully covered). A page that is not hidden SHALL count as visible even when the app's window is not the focused one, for example on a second screen.

#### Scenario: Visible on a second screen

- **WHEN** the app's window stays visible on a second screen while the user works in another window
- **THEN** the page is not hidden and the video keeps playing

#### Scenario: Tab in the background for a short time

- **WHEN** a stage video shows and the user brings another browser tab to the front for 20 seconds
- **THEN** the video pauses at once, stays loaded, and coming back shows it at once from where it paused

#### Scenario: Tab in the background for long

- **WHEN** the user brings another browser tab to the front for 2 minutes
- **THEN** after 60 seconds the video has no source and no object URL is open, and coming back shows the fallback look until the stage video has reloaded and starts from its beginning

### Requirement: When the stage counts as hidden inside the page

In a visible page, the stage SHALL count as hidden when it is scrolled fully out of view (a stage partly on screen counts as visible), when the full-screen code panel covers it, or when the Soul display overrides its look.

#### Scenario: Scrolled away

- **WHEN** the user scrolls the stage fully out of view while a stage video shows
- **THEN** the video pauses at once and is released after 60 seconds out of view

#### Scenario: Scrolled half away

- **WHEN** half of the stage is still on screen
- **THEN** the video keeps playing

#### Scenario: Full-screen code

- **WHEN** the user opens the full-screen code panel over the stage
- **THEN** the video pauses at once, and closing the panel within 60 seconds shows it at once from where it paused

#### Scenario: Soul display

- **WHEN** the Soul display overrides the stage while Video is chosen
- **THEN** the video pauses, is released after 60 seconds, and no video is decoded until the override ends

### Requirement: Recordings and the live output keep the video

A session video that records a layout drawing the stage, and a live output window whose current view shows the stage, SHALL keep the video needed while the stage is hidden. A layout or view that does not draw the stage (stage area at zero opacity) SHALL NOT keep it.

#### Scenario: Recording in the background

- **WHEN** a session video records the visual layout and the user brings another tab to the front
- **THEN** the video keeps playing and the file keeps showing it

#### Scenario: Live output window

- **WHEN** the live output window shows a view with the stage and the app's own page is hidden
- **THEN** the video keeps playing and the window shows it

#### Scenario: A view without the stage

- **WHEN** the live output window shows a view that does not draw the stage and the app's own page is hidden
- **THEN** the video pauses and is released after 60 seconds

### Requirement: Video work never disturbs the audio

Loading, seeking, decoding, drawing or releasing a video, and scanning the stage video folders, SHALL never disturb the audio. During look switches, song changes, hides and returns with the Video look, the scheduler SHALL log no more "too late" lines than the same actions on a scene look, and video work SHALL cause no main-thread task over 50 ms. The browser check SHALL measure both and SHALL fail when either rule breaks.

#### Scenario: Look switches while playing

- **WHEN** the browser check switches between Pixel and Video 10 times while a song plays, with the files loading each time
- **THEN** the "too late" count equals the same run between Pixel and Palco, and no task over 50 ms comes from the video work

#### Scenario: Song changes

- **WHEN** the radio plays 20 songs with the Video look, each song opening a new file
- **THEN** the "too late" count equals the same radio run on Palco, and no task over 50 ms comes from the video work

### Requirement: Measured cost of the Video look

Measured by the browser check, drawing the video in Normal SHALL take at most 1.5 ms median per frame on a 1080p stage. With Video on for 10 minutes and 20 song changes, the JS heap SHALL stay within 30 MB of the same run on a scene look and SHALL NOT grow across song changes.

#### Scenario: Memory over song changes

- **WHEN** the browser check plays 20 radio songs with the Video look
- **THEN** one video element exists, at most one object URL is open, and the heap does not grow from song to song
