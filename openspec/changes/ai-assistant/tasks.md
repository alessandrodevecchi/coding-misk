Estimates are in agent hours. Stage 0 is the command registry; stage 1 is the Radio MVP on the built-in engine (about 10 h). Stages 2 to 4 follow after the owner's go for each.

## 0. Stage 0: the command registry (about 2 h)

- [x] 0.1 `src/ai/commands.js`: one entry per console command of the MVP set with `kind`, `button`, `description`, `args` (JSON Schema), `words`, `validate` (the console's rules and reasons) and `apply` (the button's code path through an `api` of the console's functions); the "cannot" list (D0, D4) (1 h).
- [x] 0.2 Generators from the registry: the system prompt and the answer schema (D3), tool definitions for online engines, MCP tools (#26); `tools/agent-api.mjs` writes `docs/AGENT-API.md`; `npm run check:agent-api` checks the entries and that the file is current; added to `docs/knowledge/checks.md` like the other checks (1 h).

## 1. Stage 1: built-in engine and the Radio console (about 8 h)

- [ ] 1.1 Rerun the probe page as a bench (probe v3, page updated, waiting for the owner's run: the real registry, prompt, schema and guards; the radio requests of both rounds) on the owner's Mac; the owner runs it (about 5 minutes). Expected: at least round 2's 30 of 38 exact, the pattern requests right or rejected with a clear message, the impossible requests answered "cannot". Record the numbers in DEVLOG (0.5 h, plus the owner's run). Rounds 1 and 2 are done: window 9216 tokens, prompt about 800 tokens, 23 of 28 then 30 of 38 exact, median 1.26 s then about 2.2 s, Compose 5 of 12 musically right.
- [x] 1.2 `src/ai/engine.js` (interface, timeouts, AbortSignal) and `src/ai/engines/nano.js`: status, download with progress from a click, base session plus `clone()` per request, both quota API names, destroy on leaving the Radio tab (D1, D3) (1.5 h).
- [x] 1.3 `src/ai/areas.js` and the Radio area: the prompt and schema from the registry, the song state, the fitting saved pattern names as text, the shortening order (D2, D3) (1 h).
- [x] 1.4 Validation, apply and the guards: the registry's `validate` and `apply`, pattern names matched with the fuzzy threshold and the ambiguous case, the "cannot" path and list, the vague-request flag; `by: "assistant"` on queued commands; the two modes, with the proposal checked again on Apply (D4) (2 h).
- [x] 1.5 Console UI, one compact row inside the existing console area: request field with the engine in the placeholder, one menu icon (mode, What is sent, Settings), progress and Cancel, the one-line answer row with chips, the proposal's Apply and Dismiss, the vague line, download and unavailable states, the English-only hint; one line at 400 px (D5); strings in `src/i18n.js` in both languages (1.5 h).
- [x] 1.6 Settings, AI section, minimal: the engine and model per area (built-in only now; the online engines listed as coming), its status and the download button, the mode switch; the `coding-misk-ai` store (D2, D4) (0.5 h).
- [x] 1.7 Guide part for the assistant (both languages), `docs/knowledge/` note `ai-assistant.md` and its row in the README table, the "Add a radio command" recipe updated for the registry, a line in `docs/knowledge/decisions.md`; `npm run check:guide`, `npm run check:knowledge` (0.5 h).
- [x] 1.8 `npm run check:ai` (prompt size and content, schema, the three guards, validator fixtures with a fake console); `tools/check-ai.cjs` with a fake engine (queue, cancel, reasons, row, Italian, 400 px) (1 h).

- [ ] 1.9 (code and checks done, waiting for the owner's v4 run) The checks after the engine from probe v3 (D4, checks 4 to 6): the pattern the request names, the command the request names (proposal), spoken lines after a colon or in quotes without the model; two prompt examples ("more energy", a spoken line); `npm run check:ai` with the three v3 answers from the log and no-regression cases (near names, two-step, Italian); the probe saves v4 files with what the app does per request; the owner reruns it (1.5 h, plus the owner's run).
- [x] 1.10 The "cannot" guard from probe v4 (D4, check 7): a "cannot" answer to a request that is not vague and names exactly one command without arguments by its unique words becomes a proposal of that command with the check line; the "cannot" list before the engine unchanged; `npm run check:ai` with the exact v4 answer to "go to the drop" and no-regression cases from the v4 log; probe round v5 with `?autorun=1` rerun on the owner's Chrome (1 h).
- [x] 1.11 The drop without the model (#25, D4 check 8): drop requests in English and Italian become Drop before the engine; `npm run check:ai` with the phrases, the struck reason with no drop left and requests that must still reach the engine; `tools/check-ai.cjs` with "go to the drop" and "vai al drop" (0.5 h).

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

- [ ] 4.1 A separate change for the Compose edit format (operations on tracks, ideas, sounds, rack devices), its validator on top of `src/song/`, the diff view with Apply and Undo, and its default model per area; online engines only, the built-in model's context window is too small (D11).
