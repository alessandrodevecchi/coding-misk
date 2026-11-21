Estimates are in agent hours. Stage 1 is the Radio MVP on the built-in engine (about 10 h). Stages 2 to 4 follow after the owner's go for each.

## 1. Stage 1: built-in engine and the Radio console (about 10 h)

- [ ] 1.1 Probe on the owner's Mac: `LanguageModel.availability()` on `http://localhost:5173`, the context window and usage names this Chrome exposes, a `responseConstraint` answer with the D3 schema, time per request. Record the numbers in `docs/knowledge/` and DEVLOG (0.5 h).
- [ ] 1.2 `src/ai/engine.js` (interface, timeouts, AbortSignal) and `src/ai/engines/nano.js`: status, download with progress from a click, base session plus `clone()` per request, both quota API names, destroy on leaving the Radio tab (D1, D3) (1.5 h).
- [ ] 1.3 `src/ai/areas.js` and the Radio area's prompt builder: command lines from `COMMANDS` and the English help texts, argument lists, the song state, 6 examples, the shortening order; the D3 schema with the MVP kind list (1.5 h).
- [ ] 1.4 Validator and apply: map to button objects, drop with reasons, `whyNot` and `airWhy` in sequence, `pend` and `command`, `by: "assistant"` in the steering record (D4) (2 h).
- [ ] 1.5 Console UI: request field, engine and model label, progress and Cancel, answer row with chips, download and unavailable states, the English-only hint (D5); strings in `src/i18n.js` in both languages (1.5 h).
- [ ] 1.6 Settings, AI section, minimal: the Radio console's engine (built-in only in this stage), its status and the download button; the `coding-misk-ai` store (D2) (0.5 h).
- [ ] 1.7 Guide card for the assistant (both languages), `docs/knowledge/` note `ai-assistant.md` and its row in the README table, `docs/AGENT-API.md` with the answer format, a line in `docs/knowledge/decisions.md`; `npm run check:guide`, `npm run check:knowledge` (1 h).
- [ ] 1.8 `npm run check:ai` (prompt size and content, schema, about 40 validator fixtures) and `tools/check-ai.cjs` with a fake engine (queue, cancel, reasons, row, Italian, 400 px); the manual quality probe with 30 requests on the built-in engine, results in DEVLOG (D12) (1.5 h).

## 2. Stage 2: OpenRouter, keys, model lists and upgrades (about 6 h)

- [ ] 2.1 Local helper routes in `vite.config.js`: `/ai/status`, `/ai/openrouter/models|chat|key`, local only, key from `ai-keys.local.json` or the environment, body and time caps, no logging; `.gitignore` entry (D9) (1.5 h).
- [ ] 2.2 `src/ai/engines/openrouter.js`: json_schema with `strict` and `require_parameters`, error mapping, the free daily count; direct calls with a Settings key when the helper is absent (D6, D9) (1 h).
- [ ] 2.3 Model registry: fetch, filter, cache, Refresh, daily refresh on first request; Settings list with search, free mark, price per 1000 requests, date, retirement date; the `~…-latest` aliases (D7) (1.5 h).
- [ ] 2.4 Family key and upgrade rules, toast with Undo, pinned models, retry after "model not found" (D8) (1 h).
- [ ] 2.5 Key field with the warning, masked, Delete, in the backup's SKIP list; Online engines switch; "What is sent"; the local log with Clear (D9, D10) (0.5 h).
- [ ] 2.6 Checks: family and upgrade fixtures on a trimmed saved model list, helper routes with a fake upstream (no key in any answer), the backup without keys; browser check for Settings per area, the upgrade toast and the key warning; Guide and knowledge updated (0.5 h, plus reruns).

## 3. Stage 3: the Anthropic API engine (about 2 h)

- [ ] 3.1 Helper routes `/ai/anthropic/models|messages`, `src/ai/engines/anthropic.js` with structured output, model ids from `GET /v1/models`, families for the API's id form (`claude-haiku-5-5`); fixtures and Guide line (2 h).

## 4. Stage 4: Compose area (about 14 h, its own OpenSpec change first)

- [ ] 4.1 A separate change for the Compose edit format (operations on tracks, ideas, sounds, rack devices), its validator on top of `src/song/`, the diff view with Apply and Undo, and its default model per area (D11).
