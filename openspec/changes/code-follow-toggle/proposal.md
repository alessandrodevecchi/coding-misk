## Why

While the app types the code (Live coder, Crescendo, Decode), the code panel always scrolls to the line being edited. A person who wants to read another part of the code loses their place at every edit, and there is no way to stop it. The owner asked for a way to turn it off (backlog of #44, test of 2026-10-31).

## What Changes

- A "Follow edits" toggle in the code panel's header, next to the full-screen and collapse buttons. On: the panel scrolls to the line being edited, as today. Off: the panel stays where the person left it. The choice is remembered.
- A pause on manual scrolling: when the person scrolls the code panel by hand while following is on, the panel stops following for 10 seconds after the last manual scroll, then follows again. The toggle shows the pause.
- English and Italian labels and tooltips, and a line in the Guide card about the code panel.

Not in scope: the code in videos, fragments and Code over on the stage (they have their own code view options), and the typing itself (the code keeps being typed; only the scrolling changes).

## Capabilities

### New Capabilities

- `app/code-follow`: whether and when the code panel scrolls to the line the app is editing.

### Modified Capabilities

None.

## Impact

- The code panel header in `index.html`, the editor's follow logic and its settings in `src/main.js`, styles in `src/style.css`, labels in `src/i18n.js`, the Guide in `src/guide.js`.
- A browser check. No change to songs, fixtures, videos or exports.
