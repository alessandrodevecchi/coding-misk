Estimate: about 16 agent hours (design, Estimate), after `code-themes`.

## 0. Owner

- [x] 0.1 Owner answers the open questions in the design (third button, dark stage, follow the system, accents, videos, code, order). Verify: answers in the design; proposal, spec and tasks updated
- [x] 0.2 `code-themes` built. Verify: its checks pass
- [x] 0.3 Owner says go. Verify: answers and go in the DEVLOG

## 1. Tokens and accents (2 h)

- [x] 1.1 `data-ui="light"`: light token set, `color-scheme: light`, a light accent pair per look. Verify: contrast check (new, no browser) on every look passes the spec limits

## 2. Fixed colours (4 h)

- [x] 2.1 Review the shared colour literals in `src/style.css` (outside hardware rules); chips, overlays, shadows, glows and dimmed states become tokens with neon values unchanged. Verify: neon and HW screenshots of every tab identical before and after
- [x] 2.2 Light values for those tokens. Verify: LIGHT screenshots of every tab, both languages, 400 px; no dark patch or invisible text

## 3. Stage (1.5 h)

- [x] 3.1 Stage overlay tokens equal to neon's in every theme, frame border and shadow for a light page. Verify: screenshot of the stage with a song playing in LIGHT

## 4. Canvases outside the stage (3 h)

- [x] 4.1 Radio curves, timeline, FM lab scope, pattern previews read the tokens; the Soul display shell and cable keep a dark inner screen. Verify: `node tools/check-steering.cjs`, `node tools/check-timeline.cjs`, `node tools/check-fm-lab.cjs`, `node tools/check-soul-display.cjs` with screenshots in LIGHT

## 5. Switch and settings (1.5 h)

- [x] 5.1 LIGHT button in the top bar and in Settings, saved, backup, reset, "Follow the system" if the owner says yes (Q3); code theme Automatic gives Light high contrast. Verify: `node tools/check-settings.cjs`, `node --no-warnings tools/check-backup.mjs`, `node tools/check-modes.cjs`
- [x] 5.2 Texts in English and Italian, Guide line. Verify: `npm run check:guide`

## 6. Checks and docs (4 h)

- [x] 6.1 Browser check of the light theme: every tab in LIGHT, both languages, 400 px, a contrast probe of text against its computed background. Verify: it passes; screenshots shown to the owner
- [ ] 6.2 Videos unchanged in LIGHT: `node tools/check-video.cjs`, `node tools/check-live.cjs`. Verify: stage frames identical to neon
- [x] 6.3 `docs/DESIGN-SYSTEM.md` (light theme), `docs/knowledge/` (settings, decisions), `npm run knowledge`. Verify: `npm run check:knowledge`
