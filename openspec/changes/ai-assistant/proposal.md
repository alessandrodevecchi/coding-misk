## Why

The Radio console has about forty buttons. A listener who knows what they want ("darker, drop the hats and add an arp") has to find each one. Issue #25 asks for optional agents on top of the director, with every answer validated. This change starts that work with the smallest useful piece: a typed request in the Radio console that becomes one or more existing console commands.

## What Changes

- **A request field in the Radio console.** One compact text field inside the existing console area, not a new panel: the console is already crowded. The listener types a request in English. An AI engine turns it into existing console commands (`COMMANDS` in `src/endless/steering.js`), saved patterns by name included. Each command is validated with the console's own rules, shown, and applied the way a button press is: the same boundaries, the same queue, the same cancel.
- **Two modes.** "Apply at once" queues the valid commands right away. "Ask before applying" shows them as a proposal that the listener accepts or dismisses.
- **Pluggable engines.** One engine interface with three engines: the browser's built-in model (Chrome Prompt API, Gemini Nano) first, OpenRouter second, the Anthropic API directly later. The app never depends on one engine.
- **An engine and a model per app area.** Settings gets an AI section where the user picks an engine and a model for each area: the Radio console now, Compose and others later.
- **Model lists that stay current.** The app fetches the models of each engine, filters those that can return structured JSON, caches the list and lets the user refresh it. When a chosen model is deprecated or gone, the app moves to the newest model of the same family and says so, with Undo.
- **API keys never in page code.** Recommended: the local helper (the dev server middleware that already serves `/voice/say`) keeps the keys and forwards the calls. Fallback for a build without the helper: a key stored in Settings on this device, with a clear warning, never in the backup.
- **Privacy basics.** The user sees what a request sends, can keep the app on the built-in engine only, and can clear a short local log of requests.

Not in scope: Compose edits (the design keeps room for them; they need an online engine, the built-in model's context window is too small), voice input, free Strudel code from a model, Italian requests on the built-in model (it does not support Italian), the director's own agents from #25.

## Capabilities

### New Capabilities

- `app/ai-engines`: engines, models per area, model lists and refresh, family upgrade, where keys live, privacy settings.
- `endless/console-assistant`: the typed request in the Radio console, the prompt and the answer format, validation and apply, what the console shows.

### Modified Capabilities

None. The console commands, their boundaries and their reasons stay as they are; the assistant only calls them.

## Impact

- New `src/ai/`: the engine interface, the built-in, OpenRouter and Anthropic engines, the model registry and family rules, the area registry.
- `src/radio/radio.js`: the request field, the answer row, a call into `command` and `pend` with the validated commands.
- `src/settings/settings.js`: the AI section; `src/settings/backup.js`: the key store left out of the backup.
- `vite.config.js`: local helper routes `/ai/status`, `/ai/openrouter/*`, `/ai/anthropic/*`; `.gitignore`: the local key file.
- `src/i18n.js`, `src/guide.js` (a card for the assistant), `docs/knowledge/` (a new note), `docs/AGENT-API.md` (the answer format).
- New checks: `npm run check:ai` (no browser) and `tools/check-ai.cjs` (browser, fake engine).
