# Design

## Context

The audio export records the master output with `MediaRecorder` while the song plays in real time. The stage is a canvas (`#stage`); the Soul look draws its scene into an offscreen canvas. Code typing already produces the text shown in the editor frame by frame. Radio sessions in playlists replay their frozen songs or rebuild them from the recipe.

## Goals / Non-Goals

**Goals:** a video file per song or session, two layouts, the frame reusable for the live stream of #52.

**Non-Goals:** offline rendering faster than real time, upload or live streaming, video editing.

## Decisions

- **Composed canvas, not screen capture.** A hidden 1920×1080 canvas is redrawn every frame from the stage canvas, the code text and a title card, and recorded with `canvas.captureStream(30)`. Screen capture (`getDisplayMedia`) would need a prompt each time, record the browser and panels, and depend on the window size. The composed canvas is also the source for #52.
- **Stage at video size.** While recording, the stage renders at the size its layout area needs (1920×1080 for Visual, about 1150×1080 beside the code), not at the window size, so the picture is sharp. The visible stage keeps working; it may show the same picture scaled.
- **Code drawn on the canvas.** The code area draws the current text with the app's monospace font and the same token colours as the editor, scrolling to keep the typing line in view. The DOM editor is not captured.
- **One recorder for picture and sound.** The canvas video track and the master audio track (the same tap as the audio export, before the volume) go into one `MediaStream` and one `MediaRecorder`, so they share the clock.
- **Format choice.** Try `video/mp4;codecs=avc1,mp4a.40.2`, then `video/webm;codecs=vp9,opus`, then `video/webm;codecs=vp8,opus`. Bitrate about 8 Mbit/s for 1080p30.
- **Layouts as data.** A layout is a small description (areas for stage, code, card). "Visual" and "Visual + code" now; #52 adds more without changing the recorder.
- **Recording state shared with the audio export.** One recording at a time; the same progress and cancel UI, labelled as video.

## Risks / Trade-offs

- [Heavy looks drop frames at 1080p] → measure with the heaviest looks; cap the stage render scale while recording and show a warning if frames drop.
- [Tab in the background throttles drawing] → tell the listener to keep the tab visible; the audio keeps going, so a hidden tab gives frozen picture, not a broken file.
- [MP4 recording not available in some browsers] → WebM fallback; YouTube accepts it.
- [Long sessions make big files in memory] → chunks every second; about 3.6 GB per hour at 8 Mbit/s is the upper bound, so warn above one hour.
