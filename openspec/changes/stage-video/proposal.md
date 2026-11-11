# Proposal

## Why

The stage draws its pictures from code: scenes, widget looks, the soul. The owner wants a real video behind the music too, chosen like any other visual. Two kinds of video matter: the picture of a video file that Decode plays (a recording whose sound is being decoded into code, or a video without sound that Decode now plays in silence for its length, `fix/91-library-silent-video`), and the user's own clips, kept in folders, as a moving background for any song in Compose, Radio and Decode. The owner decided the lines of the feature on 11 November.

## What Changes

- **"Video" is a stage visual.** It is one more entry in the look menu and the arrows beside it. The default stays the standard visual (Palco). The choice is remembered like any look. When Video is chosen and there is nothing to show (no folder, no access, no playable file), the stage shows the look the app would show without Video (the song's own look, else the default) and the preference stays Video.
- **Two sources.** *Track video*: while Decode plays a video file, the stage shows that file's picture, synced to the playback (also for a video without sound). *Stage videos*: the videos found in one or more folders the user picks in a new settings list "Stage videos", with the same File System Access mechanism and permission flow as the Decode folders (Chrome and Edge; other browsers get a note). Stage videos work across the app: Compose, Radio and Decode. The track video wins over the stage videos while Decode plays a video file.
- **Always muted.** A video on the stage never makes a sound. Files with an audio track are allowed; their audio is never played by the stage.
- **One video per song.** For stage videos, each song gets one video picked at random from the folders. It starts from its beginning, loops within the song on its own (live it is not seeked to the song's position) and pauses with the music. The next song gets the next video. There are no video mixtapes or setlists: the user changes folders in the settings instead.
- **Render styles and size.** The video goes through the stage's render styles like any look: Normal, CRT, LED, 1-bit, ASCII, Terminal. Size modes: Fill (the default: cover, cropped), Fit (contain, bands in the theme's background) and Stretch (the whole picture, proportions not kept). The code over the stage, the stage widgets, the captions and the song card go over it as over any scene.
- **Light browser.** A video is loaded and decoded only while it is needed: the stage on screen, or a recording or the live output window showing it. "Hidden" is defined on the real app (page in the background, stage scrolled fully away, full-screen code over it, the Soul display override); a hidden video pauses at once and is released after 60 seconds (30 seconds after picking another look); loading happens in the background while the previous look keeps drawing. Video work never disturbs the audio: no extra late notes and no long main-thread task, measured by a check. One video element or decoder at a time. The styled renders work on their existing low-resolution work picture. Frame cost per render and memory are measured against stated targets.
- **Exports.** The session video (real time) records the stage as it is, video included. The fast video draws, for each frame, the video frame at the song's time modulo the video's length, decoded offline with mediabunny, applies the render style, then draws the code and widgets over it as today; the audio is unchanged. Vertical fragments follow the fast video. Exports pick the same videos for the same song every time, so two exports give the same frames. The fast export's speed with Video has a target (at most 2× the export on another look); a slower export still completes, with honest progress and time left.
- Strings in Italian and English, the Guide, the hardware and light themes, knowledge notes and checks (Node checks of the pure rules, browser checks with a small video made by a tool of the repo).

Out of scope:

- video mixtapes, setlists, a per-song choice of video, or a video stored in a song file;
- playing a video's sound on the stage;
- trimming, cropping or colour controls for a video;
- videos in browsers without the File System Access API, apart from the track video of a file opened in Decode;
- video files from the network.

## Capabilities

### New Capabilities

- `stage/video`: the Video look, its two sources, muting, the pick of one video per song, size modes, render styles, the fallback look, and the light-browser rules with the hidden cases.
- `stage/video-folders`: the "Stage videos" settings list: adding and removing folders, permission, the scan for video files, the note in other browsers.

### Modified Capabilities

- `decode/playback`: the picture of a video file shown on the stage while Decode plays it.
- `endless/session-video`: the session video records the Video look as it is on the stage.
- `endless/fast-video`: the fast video and the fragments draw the Video look from the files, frame by frame.
- `render-styles`: the render styles apply to the Video look, within the budget.

## Impact

- `src/music.js` (`LOOKS`, `RENDER_GAIN`), `src/visuals.js` (`paint`, `drawAt`), a new `src/visuals/stage-video.js` (the live layer) and `src/video/stage-video-frames.js` (the offline frames), `src/main.js` (look menu, song look rule, export wiring), `src/export/fast-video.js` (an awaited step before each frame), `src/decode/folders.js` (a picker id and a filter for the scan), a small store `coding-misk-stage-videos` in IndexedDB, `src/settings/settings.js` (the "Stage videos" list and the size mode), `src/settings/backup.js` (the size mode only), `src/i18n.js`, `src/guide.js`, `src/style.css`, `src/theme-light.css`, `docs/knowledge/visuals.md`, `docs/knowledge/settings.md`, `docs/knowledge/export.md`, and checks under `tools/`.
- Depends on `decode-library` (folders and permission) and on the silent video work of `fix/91-library-silent-video` for the track video of a video without sound.
