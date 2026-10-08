# Proposal

## Why

Listening to generated songs, the owner found that many are not wrong, just not to his taste (#35). Taste belongs to a person: the radio needs **artists**, each with a stage name, a face, a bio and their own way of making music, so picking an artist changes what plays and how it evolves. Styles are data too, and the owner wants to see how each one is made and edit or create them from the app (#31, styles part).

## What Changes

- **Artists** (the name replaces "director" in the interface; the director stays the engine underneath):
  - **Profile:** stage name, a pixel-art portrait, a short bio with "inspired by", shown as a character sheet.
  - **Taste with variety:** favourite styles with weights (other styles stay possible, more rarely), and ranges rather than fixed values for chaos, energy, complexity and voice amount, preferred energy shapes, pace of change and favourite kinds of move, voice characters. Each song draws its own values, so two songs by the same artist differ.
  - **Quirks:** a few habits from a fixed list, each with a chance (for example "two drops", "long breaks", "no guitars", "texture first", "hard endings").
  - **Six to start:** a dark techno night owl, a hype drop maker, a dreamer, a jukebox, a purist, and one inspired by Avicii (melodic progressive house).
- **New style** progressive house for the Avicii-inspired artist (uplifting vi-IV-I-V progressions, piano, plucks, supersaw).
- **Styles tab:** every style as a readable sheet (tempo, keys, chords, instruments, sounds, shapes, voice), editable with a form and an advanced JSON view; built-in styles are read-only and can be duplicated; your styles live in the browser, with import and export as JSON; validation errors shown in place.
- **Artists tab:** profiles as cards, the character sheet, edit, duplicate, create, import and export, same rules.
- **Where artists are used:** the Radio gets an artist picker (picking one sets styles and sliders; touching them makes the session "custom"); Compose gets "New song from artist", which writes one live build song and opens it.
- **Kept up to date:** artist and style files carry a format version; new parameters added by later features get defaults, so older artists keep working.

## Capabilities

### New Capabilities

- `endless/artists`: artist format, profile, taste with variety, quirks, the six built-in artists, how the director uses an artist, format versions.
- `app/styles-tab`: browsing, editing, creating, importing and exporting styles in the app.
- `app/artists-tab`: browsing, editing, creating, importing and exporting artists, the character sheet.
- `app/compose-from-artist`: a new live build song from an artist in Compose.

### Modified Capabilities

- `endless/radio-view`: an artist picker next to the styles.

## Impact

- `src/endless/` (artist format and validator, director options per song, quirks), `styles/progressive-house.json`, `artists/*.json`, `src/music.js` (major mode, any building block progressive house needs).
- New UI modules for the two tabs and the portrait, `src/radio/radio.js`, `src/main.js`, `index.html`, `src/style.css`, `src/i18n.js`.
- Command line: `--artist` in `tools/endless.mjs`, `tools/artist.mjs validate`.
- The settings page for theme, language and rare options stays in #31 for later; per-artist voice phrases are a later idea.
