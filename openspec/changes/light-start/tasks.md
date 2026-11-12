## 1. Measure before (about 15 min)

- [x] 1.1 `tools/check-light-start.cjs`: photo requests at startup, CLS with its largest shifts, same-origin and image bytes, first paint, at 1440 × 900, 390 × 844 and 390 × 844 touch; the Sounds tab opened loads photos on screen. Run it on the production build before the change and keep the numbers (DEVLOG).

## 2. Sound photos on demand (about 20 min)

- [ ] 2.1 `render()` of the Sounds browser returns while hidden (D1); verify the tab still fills when opened, after a language change and after the custom samples load.
- [ ] 2.2 `loading="lazy"`, `decoding="async"` and a size on the photos (D2); verify with the check: no photo at startup, photos on screen when the tab opens.

## 3. Reserved stage space (about 30 min)

- [ ] 3.1 Reserved label lines and the hidden work area with its 4 s fallback (`src/style.css`), the ready mark after the startup render (`src/main.js`) (D3); verify CLS under 0.1 at every width with the check.

## 4. Verify and record (about 20 min)

- [ ] 4.1 Measure after on the production build; `check:guide`, `check:knowledge`, `npm run build`; AGENTS.md line for the check; DEVLOG (Italian) and CHANGELOG.
