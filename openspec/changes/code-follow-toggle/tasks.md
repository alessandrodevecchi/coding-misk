## 1. Toggle and pause (about 1 h)

- [ ] 1.1 The "Follow edits" toggle in the code panel header (`index.html`, `src/style.css`), labels and tooltips in English and Italian (`src/i18n.js`), state in localStorage and in the settings backup; verify it is on by default and remembered after a reload.
- [ ] 1.2 `followEdit` respects the toggle and the pause (D3, D4); manual scroll detection on the panel; the paused look (D5); pressing while paused follows at once; verify that the app's own glide never starts a pause.
- [ ] 1.3 A line in the Guide card about the code panel (`src/guide.js`, en and it); verify with `npm run check:guide`.
- [ ] 1.4 A browser check: with the toggle off the panel's scroll position does not change over 16 bars of Live coder typing; with it on, a manual wheel scroll stops following for 10 s, then it follows again; pressing while paused follows at once; the state survives a reload. Run `npx vite build`, `check:guide`, `check:knowledge`, `check-settings.cjs`, `check-backup.mjs`.
- [ ] 1.6 Full-screen code ends above the player bar, which stays visible and usable (`src/style.css`); verify in the browser at desktop and 400 px that the bar is visible and Pause works with the code full screen.
- [ ] 1.5 Screenshots of the header with the toggle on, off and paused (neon, hardware, light, 400 px), DEVLOG entry in Italian, `npm run knowledge`.
