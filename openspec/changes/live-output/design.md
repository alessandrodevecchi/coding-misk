# Design

## Context

The app composes a video frame (#27, #53) and renders sessions offline. A browser cannot send a live stream by itself. OBS can: it composes scenes, mixes audio with filters, sends and records, and it exposes a local control channel (obs-websocket, built in since OBS 28).

## Decisions

- **OBS as the engine, coding-misk as the director.** No mixer or sender of our own: OBS keeps the output running whatever happens to the page.
- **Where the session runs: in the app, as today (chosen with the owner).** Running the radio inside OBS would turn the app into a remote control and every radio control (steering, curves, artist) would have to be forwarded. Instead the radio runs in the app; a second window of the app (opened by the app, same session) shows only the composed picture and OBS captures it, with the browser's audio. A Chrome profile used only for coding-misk keeps other tabs' sound out. If the app freezes, the picture freezes but OBS keeps sending and switches to Standby. Running the radio in OBS (Browser Source) stays an option if this proves fragile.
- **Overlays in the broadcast page.** Song title, banner and the call to follow are drawn by the frame composer, with the app's style and the same transitions; OBS only carries the result.
- **Sound effects in the app.** The pad plays files into the page's master (so they reach OBS with the music); the files stay in the browser.
- **Microphone in OBS.** OBS's audio filters: noise suppression, a compressor, and ducking of the music while speaking (sidechain compressor keyed by the microphone).
- **Watchdog as an OBS script.** A short Lua script in OBS checks the app's heartbeat (a custom event over obs-websocket every second); after five seconds without it, it switches to Standby, and back to Live when it returns.
- **Scene collection to import:** Live (window capture of the broadcast window, the browser's audio, microphone), Standby (an image first, a looping video later, a line of text, a music bed: a few calm coding-misk songs exported to one file and played as a loop), Starting soon (later, with a designed countdown).
- **Control bar** in every tab, like the player bar: presets 1 to 5 also from the keyboard, TAKE with a preview, Standby; the full control room opens from it. Settings for 1080p30 at about 6 Mbit/s.
- **Memory over hours:** the radio's stream, history and caches get bounds; a soak test of a few hours watches the page's memory.

## Risks / Trade-offs

- [The browser's audio can carry other sounds] → a dedicated Chrome profile for the live session.
- [OBS setup is new for the owner] → the scene collection, a checklist in the Guide and a connection test in the tab.
