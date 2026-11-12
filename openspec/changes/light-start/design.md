## Context

Measured on the production build (`npm run build`, `npx vite preview`), fresh browser, 6 s after load:

- 55 same-origin requests, 2 583 kB, of which 998 kB are the 37 Sounds photos. The photos come from `renderSounds()` after `/samples/strudel.json` is read (`src/main.js`): the Sounds browser renders while hidden and `<img src>` loads even under `display: none`. Without custom samples in `public/samples/` the render happens before the catalogue has drums, so the photos do not load; on the owner's machine they always do.
- CLS 0.448 at 1440 × 900 and 0.224 at 390 × 844 (0.000 as a touch phone). The first paint (about 200 ms) shows the HTML with empty `data-i18n` labels: the header is 17 px shorter, the mode buttons and tab row are one line short, and the Compose panels that the app hides are still visible. When the app fills the labels the stage moves down and the work area is rebuilt.

## Decisions

### D1. The Sounds browser renders only when shown
`render()` in `src/sounds/browser.js` returns early while its root is not displayed (`!root.offsetParent`) and marks itself stale; `showTab('suoni')` already calls it once the tab is shown. Every caller that renders while hidden (language change, custom samples loaded, the catalogue poll) then costs nothing until the tab opens.

### D2. Photos with `loading="lazy"` and a size
The library's photos and the inspector's photo get `loading="lazy"` and `decoding="async"`, with `width` and `height` from the slot (48, 24) so the row keeps its size. Chrome loads lazy images only near the viewport, so on a phone only the first rows load. The zoom modal is unchanged (it loads on click).

### D3. Reserved lines and a hidden work area until the first render
- Before the app marks itself ready, every empty `[data-i18n]` element gets a no-break space (`::before`), so labels keep one line of height and the header and the stage keep their place.
- `.work` stays `visibility: hidden` until the ready mark (`html[data-ready]`), set after `renderAll()` of the startup. A hidden element's moves are not layout shifts, and it keeps its space. A CSS animation makes it visible after 4 s whatever happens, so a failed start still shows the page.

Rejected: writing the English labels into `index.html` (two sources for every string), and a fixed height for the work area (it depends on the tab and the width).

## Risks

- A check that reads Sounds DOM while the tab is hidden finds nothing until the tab opens. Existing Sounds checks open the tab first.
- The work area shows about 200-400 ms after the stage instead of with empty labels; the stage and the header show as before.
