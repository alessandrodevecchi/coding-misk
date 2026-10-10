# Proposal

## Why

Exporting a song takes as long as the song, because the audio is recorded while it plays (#8). The owner wants exports in a few seconds with the same sound, and more formats: MP3 and FLAC beside WAV and Opus.

## What Changes

- **Fast export:** the song is rendered offline (faster than real time) in a hidden, separate copy of the audio engine, with the same code, tempo changes, section fades and live build steps as playback. The app keeps playing meanwhile.
- **Progress** shown on the Export button ("Rendering 42%"), with cancel.
- **Formats:** WAV (16 bit), FLAC (lossless, 16 bit), MP3 (320 kbps) and Opus (192 kbps), chosen in the settings and shown on the Export display ("AUDIO · FLAC").
- **Radio sessions in playlists** can be exported as one audio file the same way (the session's songs joined with their transitions).
- **Real time stays** as a fallback: when the fast render fails, the app says so and records in real time; a setting can force real time.
- Video and the live radio recording stay real time (the picture is drawn live).

## Non-goals

- Faster video export.
- Formats beyond the four above, or bit depth and bitrate choices.

## Capabilities

### New Capabilities

- `endless/fast-export`: export songs and saved sessions as audio files faster than real time, in WAV, FLAC, MP3 or Opus.

## Impact

- Export flow of song cards, Compose and playlist sessions; settings (format, speed); the Export display; i18n; Guide card lines.
- A new hidden render page loaded on demand; a media toolkit (Mediabunny with its MP3 and FLAC encoders, MPL-2.0) loaded only when exporting those formats.
