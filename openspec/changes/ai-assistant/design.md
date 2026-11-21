## Context

The Radio console steers the song on air with commands (`COMMANDS` in `src/endless/steering.js`, documented in `docs/knowledge/radio-commands.md`). A press calls `command(c)` in `src/radio/radio.js`, or `pend(kind, instrument)` for the Arrangement "+" and "−" (console-add-ahead). A command that cannot apply has a reason from `whyNot` or, on a grown song, `airWhy`.

The app already has a local helper: middleware of the Vite dev server in `vite.config.js` (`/voice/say`, `/voice/status`), answering only local requests. It exists under `npm run dev`, not in a static build.

Issue #25 plans optional agents with validated answers and "a small local server that keeps the API keys". The owner chose a first MVP: typed requests in the Radio console, the browser's built-in model first.

Research (21 November 2026, raw notes in the git-ignored `notes/`):

- **Built-in model (Chrome Prompt API).** On web pages since Chrome 148 (stable 5 May 2026), no origin trial for the base API; text, image and audio input are part of the shipped API, output is text only. `LanguageModel.availability()` returns `unavailable`, `downloadable`, `downloading` or `available`; `create()` needs a user activation while the model is `downloadable` or `downloading`, and its `monitor` reports `downloadprogress`. The context window is not documented as a number: read `session.contextWindow` and `contextUsage`, measure with `measureContextUsage()` (old names `inputQuota`, `inputUsage`, `measureInputUsage` are removed on the web, deprecated in extensions). Early releases reported about 4k to 6k tokens; nothing official is newer. On overflow the oldest turns go, the system prompt stays, and `QuotaExceededError` is thrown if that is not enough. `responseConstraint` takes a JSON Schema; `omitResponseConstraintInput` keeps the schema out of the context. `initialPrompts` with a system role, `clone()`, `destroy()`, AbortSignal. No tool calling. Languages: English, Spanish, Japanese, German, French (German and French from Chrome 149; no Italian). Hardware: macOS 13+, 22 GB free on the profile volume (a requirement, not the download size), a GPU with more than 4 GB of VRAM or 16 GB of RAM and 4 cores (audio input needs the GPU).
- **Size and storage.** The model itself is about 4 GB (4.0 GB on the owner's Mac, Chrome 158, folder `OptGuideOnDeviceModel` in Chrome's user data directory). It is one copy per Chrome install, shared by every site and every profile: a project that already triggered it reuses it. Below 10 GB free it is deleted; the Prompt API page says it comes back once the requirements are met, the model-management page says it is not downloaded again by itself, so the app treats a deleted model as `downloadable` again. `chrome://on-device-internals` shows the model, its version and errors; the old entry in `chrome://components` is gone in current builds.
- **Where it runs.** `LanguageModel` is `[Exposed=Window, SecureContext]`: top-level windows and same-origin iframes (cross-origin iframes need `allow="language-model"`, default allowlist `'self'`), never workers. `http://localhost` is a potentially trustworthy origin, so the dev server qualifies; Chrome's docs have a "Troubleshoot localhost" section but do not state it outright, so task 1.1 confirms it.
- **Managed browsers.** Two Chrome Enterprise policies can turn the engine off: `GenAILocalFoundationalModelSettings` (machine level, default 0 = download and use; 1 = no download and the model is deleted) and `BuiltInAIAPIsEnabled` (per profile, default true; false makes the API calls fail). A work Google profile can carry them; `chrome://policy` lists them and `chrome://management` says whether the browser or profile is managed. The engine reports this as `unavailable` with the reason "turned off by your organisation" when `availability()` says unavailable and the hardware is fine.
- **OpenRouter.** `GET /api/v1/models` needs no key and returns `id`, `canonical_slug`, `name`, `created`, `expiration_date`, `pricing`, `context_length`, `supported_parameters` and more (476 models, 407 with `structured_outputs`). It also lists alias ids such as `~anthropic/claude-haiku-latest`. CORS is open (`access-control-allow-origin: *`). Structured output: `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }` with `provider: { require_parameters: true }`. Free models (`:free`): 20 requests a minute, 50 a day, 1000 a day once 10 credits were ever bought; `GET /api/v1/key` reports the daily free count.
- **Anthropic API.** `GET /v1/models` lists the current models with `id`, `display_name`, `created_at`. Browser calls need a special opt-in header; calls through the helper do not.

## Goals / Non-Goals

**Goals:** a typed English request in the Radio console becomes valid console commands, applied like presses; engines and models are pluggable and chosen per area; model lists refresh and gone models are replaced inside their family; keys stay out of page code; the built-in engine works with no key and no network after its download.

**Non-Goals:** Compose edits (kept open, D11), voice input, the director's own agents, Italian requests on the built-in engine, streaming answers, tool calling.

## Decisions

### D1. One engine interface

`src/ai/engines/*.js` each export an engine:

```js
{ id: 'nano' | 'openrouter' | 'anthropic', local: boolean,
  status(): Promise<{ state: 'ready'|'download'|'downloading'|'no-key'|'unavailable'|'offline', detail? }>,
  listModels(): Promise<Model[]>,          // { id, name, family, version, created, expires, free, price, context, json }
  prompt({ model, system, examples, input, schema, signal }): Promise<{ json, raw, usage, ms }> }
```

The area code never sees engine details. An engine that cannot force a schema still returns `json` parsed from text; validation (D4) is the same for all. Requests time out after 20 s (built-in: 30 s on the first request after a download).

### D2. Areas, each with its engine and model

`src/ai/areas.js` registers areas: `radio` now, `compose` later. An area brings its prompt builder, its schema, its validator and its apply step. Settings stores, per area, `{ engine, model, family, pinned }` in `coding-misk-ai` (in the backup; it holds no secret). Defaults: Radio console on the built-in engine; when it is `unavailable`, the request field says why and offers Settings.

### D3. The prompt and the answer format for the Radio console

Generated, never hand-copied, so it follows the console:

- **System prompt** (about 600 tokens): the role ("turn a listener's request into console commands of a live music radio; never invent a command"), one line per command kind from `COMMANDS` and the console's help texts (`src/i18n.js`, English), the argument words (instruments `INSTRUMENTS`, parts `VARY_TYPES`, treatments, key moves `KEY_MOVES`, riser lengths), rules (at most 4 commands, order as asked, nothing when unclear), and 6 short examples.
- **Per request** (about 200 tokens): the style, energy, the playing tracks with ids and instruments, locked parts, the kinds disabled now with their reason, then the request.
- **Answer schema** (flat, small enough for the built-in model's grammar):

```json
{
  "type": "object",
  "required": ["commands"],
  "properties": {
    "commands": {
      "type": "array",
      "maxItems": 4,
      "items": {
        "type": "object",
        "required": ["kind"],
        "properties": {
          "kind": { "enum": ["energy-up", "…every kind of the MVP set…"] },
          "part": {
            "enum": [
              "kick",
              "beat",
              "bass",
              "arp",
              "hook",
              "guitar",
              "pad",
              "texture",
              "riser"
            ]
          },
          "type": { "enum": ["lead", "bass", "arp", "pad", "guitar"] },
          "track": { "type": "string" },
          "name": { "type": "string", "maxLength": 60 },
          "value": { "type": "number" },
          "treatment": { "type": "string" },
          "to": { "type": "string" },
          "bars": { "type": "string" },
          "dir": { "enum": ["up", "down"] },
          "text": { "type": "string", "maxLength": 120 }
        }
      }
    },
    "note": { "type": "string", "maxLength": 120 }
  }
}
```

`note` is a short reply when nothing fits ("I can't change the tempo from the console").

**MVP command set:** energy, more and less of an instrument, the instrument locks, more and less complex, riser, part harmony, vary, swap, the five sound commands, change instrument, change chords, change key, talk more and less, add a line (`say-live`), a saved pattern by name (`pattern`), drop, stay, extend, end, and the mixer (volume, mute, back, lock, unlock). Left out: the legacy `add` and `remove`, `voice` and `voice-sound` (preset forms), `curve` and `curve-reset` (drawn values).

**Saved patterns by name.** The per-request state lists the names of the saved patterns that fit the song on air (`fitsAir`), at most 20, the most used first (about 100 tokens). The answer gives `{ kind: "pattern", name, track? }`: no `track` means a new track, a `track` id means in place of that playing track. The validator matches `name` against the fitting patterns (case and accents ignored, exact first, then a unique prefix or a unique close match); no match or two equal matches drop the command with "no saved pattern called …" or "which one: A or B?". The match builds the same `{ kind: 'pattern', mode, target, item }` the Saved patterns panel sends, with `item` from `forRadio`.

**Size.** Total about 1.6k tokens with the schema and the pattern names, about 1.3k with `omitResponseConstraintInput`. That fits a context window of 4k or more with room to spare. The full knowledge note (about 6k tokens) is never sent. If a build reports a smaller window, the builder drops in order: the examples down to 2, the kinds disabled now, the help text (kind names only). `npm run check:ai` fails when the prompt passes 2k tokens (counted as characters / 4).

**Built-in sessions.** One base session per page with the system prompt, created on the first request (or on the download click); each request runs in a `clone()` and destroys it after, so turns never pile up and `contextoverflow` cannot drop anything that matters. The base session is destroyed when the Radio tab closes. Expected languages `en` in and out.

### D4. Validation and apply

1. The answer must parse and match the schema; otherwise nothing applies and the row says "The answer was not understood" with Retry.
2. Each command is mapped to the object a button would send (`{ kind, part }`, `{ kind, type, target }`, `{ kind, track, value }`…). Unknown kinds, words outside the lists, track ids not on air, values out of range (volume 0 to 150 %) are dropped with a reason.
3. Each kept command is checked with `whyNot` or `airWhy` against the song with the commands before it. A disabled one shows its usual reason ("late", "not-playing", "cap"…).
4. Valid commands are applied in order through the same functions as the buttons: `pend` for "+" and "−" of an instrument, `command` for the rest. They enter the queue, keep their boundaries and can be cancelled with ✕ like any press. A request never bypasses the console.

**Two modes**, a switch in the field's small menu and in Settings, stored per area in `coding-misk-ai` (`apply: 'now' | 'ask'`, default `now`):

- **Apply at once:** step 4 runs as soon as the answer is validated.
- **Ask before applying:** the answer row shows the valid commands as a proposal with Apply (Enter) and Dismiss (Escape); each chip can be dropped with its ✕ before Apply. Nothing is queued until Apply. On Apply steps 3 and 4 run again against the song as it is then, so a proposal that went stale shows the new reasons. A new request replaces an open proposal.

Commands from a request carry `by: "assistant"` in the recorded steering, so replay and history show them; the song they make is the same as with the presses.

### D5. What the console shows

**Placement: inside the existing Radio console, compact.** The console is already crowded, so the assistant adds no panel and no new group. It is one row at the top of the console area, above the command groups: a single-line text field ("Ask the console…", Enter to send, Escape to clear) that takes the row's free width, with one small icon button at its end for a menu (engine and model, the mode switch, "What is sent", Settings). The engine and model name show as the field's placeholder suffix, not as a separate label. At 400 px the row stays one line. While the engine works the icon becomes a spinner and Cancel. Then a single answer line under the field, the same height as a queue row: one chip per command with its button label ("▼ Less energy", "+ Arp") marked applied, proposed, or struck through with its reason, and the `note` if any; it wraps only when the chips do not fit, and has a ✕ to close it. The line stays until the next request or ✕. Long texts (download progress, the reason a model is unavailable) go in the same line, never in a box. On the built-in engine: `downloadable` shows "Download the built-in model (about 4 GB; Chrome needs 22 GB free)" with a progress bar; `unavailable` shows the reason (hardware, disk, browser version, turned off by the organisation) and a link to Settings. When the app language is Italian, the field says that the built-in engine understands English only.

### D6. OpenRouter and Anthropic engines

OpenRouter: chat completions with `response_format` json_schema, `strict: true`, `provider: { require_parameters: true }`, `temperature: 0`, `max_tokens: 300`, attribution headers with the app name only. Errors map to `status()`: 401 no key, 402 no credit, 429 rate limit (with the free daily count from `GET /api/v1/key`, shown in Settings). Anthropic (later): Messages API with the schema as the only tool or as structured output, model ids from `GET /v1/models`.

Both go through the local helper when it answers `/ai/status`; directly from the page only with a key from Settings (D9).

### D7. Model lists and refresh

- Each engine lists its models; the list is cached in `coding-misk-ai-models` with the fetch time (in the backup's SKIP list: it can be fetched again).
- Only models that can return structured JSON are offered (`supported_parameters` holds `structured_outputs`; models with only `response_format` are shown under "Other, less reliable").
- Settings shows per model: name, free mark, price per 1000 requests of the area (from its typical token count), context, date; sorted by family, newest first; a search field.
- Refresh: a button per engine, and once a day on the first request of the day. A failed fetch keeps the cached list and says when it was fetched.
- The built-in engine lists one model, "Built-in (Gemini Nano)", with its status.

### D8. Families and the automatic upgrade

**Family key.** From the id without the engine prefix variants:

1. Split off the provider (`anthropic/`), the variant suffix (`:free`, `:batch`) and an alias marker (`~`).
2. Split the name on `-` and drop tokens that are versions or dates: `^v?\d+(\.\d+)*$`, `^\d{4,8}$`, and a trailing `-\d{4}` snapshot.
3. The rest, joined, with the provider and the variant, is the family; the dropped numbers, read as a tuple, are the version.

Examples: `anthropic/claude-haiku-5.5` → family `anthropic/claude-haiku`, version 5.5; Anthropic API `claude-haiku-5-5` → `claude-haiku`, version 5.5 (two single digits read as major and minor); `openai/gpt-6.1-terra` → `openai/gpt-terra`, 6.1; `deepseek/deepseek-v4.1-flash-1017` → `deepseek/deepseek-flash`, 4.1; `x/y:free` keeps `:free` in its family, so a free model never becomes a paid one. When the name has no version, the family is the id itself and only `created` orders it.

**When it runs.** After each refresh; and when a request fails with "model not found", after a refresh, then the request is sent once more.

**Rules.** A chosen model is replaced when it is missing from the list or its `expiration_date` has passed (from 14 days before, Settings shows "retires on 11 December"). The replacement is the model of the same engine and family with the highest version, then the newest `created`. It is skipped, and the user is asked instead, when its price is more than twice the old one or no model of the family is left. A model marked "Keep this exact model" (`pinned`) is never replaced; its area shows "This model is gone: choose another" instead.

**What the user sees.** A toast once ("Claude Haiku 5.5 is no longer offered: the Radio console now uses Claude Haiku 5.6" with Undo), and a line in the area's Settings row until dismissed. Undo restores the old id and pins it, so the user then sees the "gone" message and chooses.

OpenRouter's own `~…-latest` aliases are offered too, as "Always the newest (…)"; with them the app never needs to upgrade.

### D9. Where API keys live (recommended: the local helper)

**Recommended, the local helper.** The dev server reads keys from a git-ignored file at the repository root, `ai-keys.local.json` (`{ "openrouter": "…", "anthropic": "…" }`), or from `OPENROUTER_API_KEY` and `ANTHROPIC_API_KEY`. New routes, local requests only like `/voice/say`:

- `GET /ai/status`: which engines have a key (`{ openrouter: true, anthropic: false }`), never the key.
- `GET /ai/openrouter/models`, `POST /ai/openrouter/chat`, `GET /ai/openrouter/key`; `GET /ai/anthropic/models`, `POST /ai/anthropic/messages`.

The helper adds the key, forwards only these paths, caps the body at 64 kB and the time at 30 s, and never logs a key or a request body. The page never holds the key, so it cannot leak through page code, the backup, an export or a shared song.

**Fallback, a key in Settings.** For a build served without the helper (a static build, another device). Settings shows a key field per engine with the warning: "This key is stored in this browser on this device. Any code running in this page can read it. Use a key with a spending limit." The key is stored in `coding-misk-ai-keys`, added to the backup's SKIP list, shown masked, with Delete. When the helper answers `/ai/status` with a key, the helper wins and the Settings field says so.

### D10. Privacy

- Settings, AI: "Online engines" off or on. Off (the default until a key exists) keeps every area on the built-in engine.
- "What is sent" under the request field opens the exact prompt of the last request: the request text and the song state of D3 (style, energy, track ids and instruments). No audio, no saved songs, no names of the user's files.
- A local log of the last 20 requests (request, answer, engine, model, time, cost estimate), in `coding-misk-ai-log`, not in the backup, with Clear.

### D11. Room for Compose

A later `compose` area returns a structured edit of the song, never Strudel code: operations such as `set-track`, `add-idea`, `set-sound`, `rack-add`, `rack-remove` on tracks, ideas, sounds and rack devices, validated by the song format's validator (`src/song/`, as `tools/song.mjs validate`) and shown as a diff with Apply and Undo. It reuses D1, D2, D7 to D10 unchanged; only its prompt builder, schema, validator and apply step are new. Its default model is a larger one (Sonnet class), chosen per area.

**Compose needs OpenRouter or Claude, not the built-in engine.** A Compose request carries about 8k to 15k tokens of song format and schema plus a song of several thousand tokens: 12k to 20k tokens or more. The built-in model's window has only ever been reported at about 4k to 6k tokens, and a single prompt larger than the window fails with `QuotaExceededError`. The `compose` area therefore offers only online engines; the built-in engine is not listed for it.

### D12. Checks

- `npm run check:ai` (no browser): the prompt builder's size and content for songs of every profile; the schema; the validator on about 40 fixture requests with canned answers (good, partly wrong, unknown kinds, bad tracks, invalid JSON); the family key and upgrade rules on a saved, trimmed model list (missing model, expired model, price jump, pinned, free stays free); the helper's routes with a fake upstream (no key in any answer).
- `tools/check-ai.cjs` (browser, dev server): a fake engine; requests apply through the queue, cancel, disabled reasons, the answer row, Settings per area, the upgrade toast and Undo, the key warning, the backup without keys, Italian, 400 px.
- A manual quality probe, not a gate: 30 English requests against the real built-in engine and one OpenRouter model, scored by how many commands match the expected ones.

## Risks / Trade-offs

- **The built-in model is small.** It may pick the wrong kind or invent track ids. Mitigation: enums in the schema, per-request state with real ids, validation that drops what does not fit, the quality probe before release.
- **Hardware.** On a machine without the GPU, RAM or disk the built-in engine is `unavailable`; the field says so and offers an online engine.
- **Free online models churn.** A free model may vanish within weeks; the family upgrade and the daily refresh cover it, and the free mark never turns into a paid one silently.
- **API names move.** The Prompt API renamed its quota fields during 2026; the engine feature-detects both names.
- **Managed browsers.** A work profile or an MDM can turn the built-in model off by policy; the field says so and the online engines still work.
- **Disk.** Chrome deletes the model below 10 GB free; the engine falls back to `downloadable` and offers the download again.
- **A key in Settings can be read by page code.** Hence the helper is the recommendation and the warning is shown on the field.

## Migration Plan

Nothing to migrate. Without an engine the console is unchanged. Steering records gain an optional `by: "assistant"` that older builds ignore.

## Open Questions

1. **Apply at once or confirm?** Decided: both, as two modes (D4); default "Apply at once".
2. **Italian requests.** Recommended: English only on the built-in engine for the MVP; online engines accept Italian, so the hint shows only on the built-in engine.
3. **Which key file.** Recommended: `ai-keys.local.json` in the repository root (git-ignored), with environment variables as a fallback.
4. **`pattern` by name in the MVP?** Decided: yes (D3, saved patterns by name).
5. **Add a line (`say-live`) in the MVP?** Recommended: yes, with the text limited to 120 characters and the usual voice helper path; it is the most natural spoken request.
6. **Daily auto refresh.** Recommended: once a day on the first request, never at startup, so a closed network never slows the app.
