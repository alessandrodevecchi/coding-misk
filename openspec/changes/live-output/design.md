# Design

## Context

The app composes a video frame (#27, #53) and renders sessions offline. A browser cannot send a live stream by itself. OBS can: it composes scenes, mixes audio with filters, sends and records, and it exposes a local control channel (obs-websocket, built in since OBS 28).

## Decisions

- **OBS as the engine, coding-misk as the director.** No mixer or sender of our own: OBS keeps the output running whatever happens to the page.
- **Where the session runs: in OBS (Browser Source), recommended.** The broadcast page is loaded by OBS as a Browser Source and plays the radio itself: its sound is isolated (no other tabs), no window has to stay open, and OBS can reload it. The Live tab in the normal app is the remote control: it talks to OBS over obs-websocket, and to the broadcast page through OBS custom events (preset, overlay, session commands); the page answers with its state (song on air, heartbeat). Alternative: the session runs in the normal app and OBS captures a clean window and the browser's audio (simpler, but the browser's whole audio goes out, and a crash of the app takes the picture with it).
- **Overlays in the broadcast page.** Song title, banner and the call to follow are drawn by the frame composer, with the app's style and the same transitions; OBS only carries the result.
- **Sound effects in the app.** The pad plays files into the page's master (so they reach OBS with the music); the files stay in the browser.
- **Microphone in OBS.** OBS's audio filters: noise suppression, a compressor, and ducking of the music while speaking (sidechain compressor keyed by the microphone).
- **Watchdog as an OBS script.** A short Lua script in OBS checks the page's heartbeat; after five seconds without it, it switches to Standby and refreshes the Browser Source. The page restores the session from its saved recipe and song.
- **Scene collection to import:** Live (broadcast page + microphone), Standby (image or looping video, a line of text, a music bed file), Starting soon (optional). Settings for 1080p30 at about 6 Mbit/s.
- **Memory over hours:** the radio's stream, history and caches get bounds; a soak test of a few hours watches the page's memory.

## Risks / Trade-offs

- [OBS's embedded browser may lack a feature Strudel needs (audio worklets, autoplay)] → test first; fall back to window capture.
- [Two app instances (control and broadcast) can disagree on state] → the broadcast page is the source of truth; the Live tab only shows what it reports.
- [OBS setup is new for the owner] → the scene collection, a checklist in the Guide and a connection test in the tab.
