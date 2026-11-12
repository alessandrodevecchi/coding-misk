# Proposal

Refs: coding-misk/#91

## Why

Decode turns a file into code. The owner also listens to music in other browser tabs: a music player or a video page. Decode should be able to follow that music too, without a file. Later it could also work on separated parts (stems), so it can hear drums, bass and the top line under pads more clearly.

The browser can share one tab's sound with a page when the user picks that tab (screen capture with audio, Chrome and Edge on a computer). This change describes how Decode uses it: what the user sees and allows, how both levels work on a stream that the app cannot seek or pause, what is stored and exported, and what the measurements on this machine show. Separated parts are researched and measured, and the recommendation is to wait (`design.md`, D10).

This is a spec only. No code changes until the owner says go.

## What Changes

- **Listen to another tab.** In Decode, "Listen to another tab" opens a short panel that says what will happen, then the browser's own picker. The user picks the tab and keeps its sound shared. The app uses the sound only and stops the picture at once.
- **Level A (Live) on a stream.** The captured sound goes through Decode's mix as the Original track, so mute, solo and the Original ↔ Code slider work as with a file. The code follows what was heard 1 to 2 bars later, as with a file and Look ahead off. Look ahead is offered as a delay of the sound.
- **Level B (Full) on what was heard.** While the tab plays, the app keeps the sound in memory (mono, at most 10 minutes, about 106 MB). On Stop or on demand, Full analyses it, and the user can play the result back from memory until they leave the track.
- **Pause, seek and end in the other tab.** The app cannot control the other tab. A silence pauses the code, a jump relocks the grid, and a closed tab or Chrome's Stop sharing ends the session.
- **Nothing captured is stored.** The captured sound is never stored. The analysis is stored only when the user saves it under a name they type, because the other tab gives no title.
- **Exports.** Code only by default. With the captured sound only during the session, after a one-time confirmation, and always with the rights line.
- **Unsupported browsers.** Firefox and Safari give no sound for a shared tab. There, the button is disabled and says why.
- **Separated parts: later.** The measurements and the reasons are in `design.md` D10. A Node probe on the bench is proposed as the first step when the owner wants it.

## Capabilities

### New Capabilities

- `decode/tab-audio`: Decode on the sound of another browser tab.

### Modified Capabilities

(none: the file input, the two levels and the exports keep their requirements for files)

## Legal note

The feature is for the user's own listening. The captured sound plays only in the user's browser. It is not stored or shared by default. An export that holds it is made only on the user's request, during the session, with the rights line that says the recording belongs to its rights holders.

## Impact

- New module for the capture (`src/decode/`, owned by the Decode work: no change while group 10 is open), the Decode panel, the mix and the store (a record kind "tab" without audio).
- Guide card (en, it), knowledge note `docs/knowledge/decode.md`, checks (Node, and a browser check with a stand-in stream; the real capture needs a headed Chrome).
- No new dependency for the tab audio. Separated parts would add a 84-160 MB model download, on demand only (not in this change).
