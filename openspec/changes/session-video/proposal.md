# Proposal

## Why

The owner wants to publish sessions on YouTube (#27). Songs and radio sessions are saved as data, so the studio can replay them exactly. Today only the audio can be exported; a video needs the stage and the code as well. The same frame will feed the YouTube live of #52.

## What Changes

- **Record video** for a saved song, a radio session saved in a playlist, and the radio while it plays (next to the audio recording).
- **Video frame** composed by the app at a fixed 16:9 size (the YouTube format), not a screen capture: no browser bars, no permission prompt, the same result on every screen. Quality: 1080p 30 fps (default), 1080p 60 fps, 720p 30 fps.
- **Layouts:** "Visual" (the stage fills the frame), "Visual + code" (the stage on the left two thirds, the code typing itself on the right; above the code a Soul panel, only while the Soul display is on, that folds and opens also during the recording) and "Whole tab" (the browser tab as it is, through the browser's tab sharing). More presets come with #52.
- **Song card** (title, artist, styles): always, for a few seconds when each song starts, or never.
- **Soul:** the stage shows the soul only when the Soul look is active, as in the app.
- **Audio** is the same master output as the audio export, recorded together with the frame, so picture and sound stay in sync.
- **Output file:** MP4 (H.264 + AAC) where the browser can make it, otherwise WebM (VP9 + Opus). YouTube accepts both.
- **Recording runs in real time:** a 10 minute session takes 10 minutes. A progress bar and Cancel, as for the audio export.

## Non-goals

- Faster than real time rendering (the audio side is #8).
- Uploading to YouTube or streaming live (#52).
- Editing the video (cuts, intro, captions).
- Vertical 9:16 video for Shorts (later, if wanted).

## Capabilities

### New Capabilities

- `endless/session-video`: record a song or a radio session as a video file with a chosen layout.

## Impact

- Songs card and player bar (export menu), radio recording controls, playlist session rows, settings (layout, quality), i18n, Guide card lines.
- Reuses the stage canvas, the code typing and the master audio tap of the audio export.
