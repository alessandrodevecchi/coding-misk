# Design

## Decisions

- **Visuals driven by a feed.** `startVisuals` gains `drawAt({ now, cyc, playing, feed, look })`: the same frame code with the analyser readout replaced by a feed of per instrument levels and a waveform, and the clock given instead of read. While a fast video renders the live loop pauses its drawing; the stage shows the frames being made.
- **Feed from the timeline and the audio.** Per instrument level at time t from its onsets (a short attack, then a decay that depends on the note's length), the waveform from the rendered audio around t. The visuals normalise levels per instrument, so the scale need not match the analysers exactly.
- **Code, voice lines, card and soul from the timeline**: code segments with the typing animation over the bar before each step (the same typing frames as live), voice lines held 4 bars, the song title per section range, the soul from the song document.
- **Encoding** with Mediabunny: a canvas source (H.264 through WebCodecs, VP9 as fallback) and the rendered audio, into MP4 (WebM fallback). Frames are encoded as they are drawn, block by block with the audio blocks.
- **Direction** extends `coding-misk-video` with `visual` (`song`, `fixed:<look>`, `song-cycle`, `section-cycle`) and `soul` (`off`, `panel`, `full`), and `coding-misk-video-presets`.

## Risks / Trade-offs

- [Drawing 1080p frames is the slowest part] → measure; 720p as a faster option; the heaviest looks may run near real time.
- [Visual reactions differ a little from live (levels from onsets, not from the sound)] → onsets come from the same notes; compare a few frames side by side.
