# Proposal

## Why

The app has nine tabs in one row: the ways to use music (Compose, Songs, Playlists, Radio) sit next to the material music is made of (Artists, Styles, Sounds) and the learning pages (Guide, References). The row does not fit on a phone and does not say what each part is for (#42).

## What Changes

- **Two modes at the top**, chosen by the owner from mockups (option A2):
  - **Listen:** Compose, Songs, Playlists, Radio.
  - **Groove Lab:** Artists, Styles, Sounds, Guide, References; Genres joins later (#43).
- Under the mode, a row with the tabs of that mode. Each mode remembers its last tab.
- The live code stays on the right in both modes and can be collapsed as today. The settings page stays as it is (next to the code), opened by the gear.
- Links that open a tab of the other mode (for example "New song from artist" opening Compose, or the radio opening Compose) switch the mode too.
- The tab remembered from before opens in its mode after the update.

## Capabilities

### New Capabilities

- `app/navigation`: the two modes, their tabs, remembering, switching from links, the layout on a phone.

### Modified Capabilities

None.

## Impact

- `index.html` (mode bar and tab rows), `src/main.js` (`showTab` knows each tab's mode), `src/style.css` (both themes, phone width), `src/i18n.js`.
- Browser checks that click tabs by name keep working; a new check for the modes.
- Docs: `DESIGN-SYSTEM.md`, `ARCHITECTURE.md`, README, DEVLOG.
