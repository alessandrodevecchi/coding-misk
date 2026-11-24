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

**Measured on the owner's Mac (probe page `probe/`, 21 November 2026, results in the git-ignored `notes/`).** Two rounds against the real built-in model on `http://localhost`:

- **Context window: 9216 tokens** (`session.contextWindow`); the console prompt (system text, 6 examples) takes **about 800 tokens** (783 in round 1, 799 in round 2). A clone costs about 0 ms; the base session is reused.
- **Round 1** (flat schema, free strings for pattern names and track ids): **23 of 28 English requests exact**, 3 partial, 2 invalid (both saved-pattern requests); **median 1.26 s**. Italian: 3 of 3 exact, but the model does not declare Italian, so it is not guaranteed.
- **Round 2** (one `anyOf` branch per command kind, enums for pattern names and track ids, 20 s timeout): **30 of 38 English exact**, 4 partial, 4 wrong; **median about 2.2 s**, no timeouts. The `anyOf` schema is accepted. Two new failures: with an enum of pattern names the model picks a wrong existing name ("Sunset Lead", which does not exist, became "Rolling Sub"; "acid line" became "Rolling Sub"); and the "cannot" path was lost ("change the tempo to 140 bpm" became a key change). Variance: 4 of 10 hard requests gave the same answer three times.
- **Compose on the built-in model:** with one `anyOf` branch per track type, **12 of 12 answers valid**, 10 of 12 of the right type, but **only 5 of 12 musically right**, about **10 s each**. Compose on the built-in model is at most a "light" option (one track, clearly labelled); real Compose needs the online engines (D11).

## Goals / Non-Goals

**Goals:** a typed English request in the Radio console becomes valid console commands, applied like presses; engines and models are pluggable and chosen per area; model lists refresh and gone models are replaced inside their family; keys stay out of page code; the built-in engine works with no key and no network after its download.

**Non-Goals:** Compose edits (kept open, D11), voice input, the director's own agents, Italian requests on the built-in engine, streaming answers, tool calling.

## Decisions

### D0. The command registry (the first step)

One registry, `src/ai/commands.js`, holds one entry per Radio console command the assistant may use. Everything an engine or an agent sees of the console is generated from it, never written by hand twice. An entry has:

- `kind` (the console command, a key of `COMMANDS`) and `button` (how the console labels it);
- `description`: one English line of what it does;
- `args`: a JSON Schema for its arguments (`properties`, `required`), with the console's own lists (`INSTRUMENTS`, `VARY_TYPES`, `TREATMENTS`, `KEY_MOVES`, `RISER_BARS`) and, filled per request, the playing track ids;
- `words`: the words a precise request uses for it ("darker", "mute", "drop"…), read by the vague-request guard (D4);
- `validate(args, ctx)`: the same rules as the console: the arguments mapped to the object the button sends, then the console's own reason (`whyNot`, or `airWhy` on a grown song) for the song on air; it returns the command or a reason;
- `apply(cmd, api)`: the same code path as the console button. `api` is the set of functions the buttons call in `src/radio/radio.js` (`command`, `pend`, `pendPattern`, `pendLock`, the typed-line path); the registry never touches the song itself.

From the registry the app generates:

1. the built-in model's system prompt and its `responseConstraint` (D3);
2. tool definitions for the online engines (name, description, input schema), used from stage 2;
3. the tools of the future MCP server (#26), the same definitions with the MCP field names;
4. `docs/AGENT-API.md`, written by `npm run agent-api` and checked by `npm run check:agent-api`, which fails when the file is stale or an entry is incomplete (no description, no schema, a kind outside `COMMANDS`, a schema property without a type).

Only the Radio console commands are in scope now. Compose and other areas add their own entries later, in registries of their own with the same shape.

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

`src/ai/areas.js` registers areas: `radio` now, `compose` later. An area brings its command registry (D0), from which its prompt, schema, validation and apply step come. Settings stores, per area, `{ engine, model, family, pinned }` in `coding-misk-ai` (in the backup; it holds no secret). Defaults: Radio console on the built-in engine; when it is `unavailable`, the request field says why and offers Settings.

### D3. The prompt and the answer format for the Radio console

Generated from the registry (D0), never hand-copied, so it follows the console:

- **System prompt** (about 800 tokens measured, with the examples): the role ("turn a listener's request into console commands of a live music radio; never invent a command"), one line per registry entry (`kind: description {arguments}`), the argument lists, the rules (at most 4 commands, order as asked, a saved pattern's name written as the listener wrote it, nothing and a note when the console cannot do it), and 7 short examples, one of them a request the console cannot do and one a spoken line.
- **Per request** (about 200 tokens): the style, energy and part, the playing tracks with ids and instruments, the names of the saved patterns that fit (at most 20, the most used first), then the request.
- **Answer schema**: an object with `note` first, then `commands`. `note` is required: empty when the console can do the request, else one short sentence of what it cannot do. `commands` is an array of at most 4 items, each item an `anyOf` with one branch per registry entry (its `kind` as a one-value enum and only its own arguments, `additionalProperties: false`); kinds without arguments share one branch. Track ids are an enum of the playing tracks. A saved pattern's `name` is free text (`maxLength` 60), never an enum (D4, guard 1). Round 2 showed the built-in model takes `anyOf` branches.

```json
{
  "type": "object",
  "required": ["note", "commands"],
  "additionalProperties": false,
  "properties": {
    "note": { "type": "string", "maxLength": 120 },
    "commands": {
      "type": "array",
      "maxItems": 4,
      "items": {
        "anyOf": [
          {
            "type": "object",
            "required": ["kind"],
            "additionalProperties": false,
            "properties": {
              "kind": {
                "enum": [
                  "energy-up",
                  "energy-down",
                  "…kinds without arguments…"
                ]
              }
            }
          },
          {
            "type": "object",
            "required": ["kind", "part"],
            "additionalProperties": false,
            "properties": {
              "kind": { "enum": ["more"] },
              "part": {
                "enum": [
                  "kick",
                  "beat",
                  "bass",
                  "arp",
                  "hook",
                  "guitar",
                  "pad",
                  "texture"
                ]
              }
            }
          },
          {
            "type": "object",
            "required": ["kind", "name"],
            "additionalProperties": false,
            "properties": {
              "kind": { "enum": ["pattern"] },
              "name": { "type": "string", "maxLength": 60 },
              "track": { "enum": ["…playing track ids…"] }
            }
          },
          "…one branch per registry entry with arguments…"
        ]
      }
    }
  }
}
```

**MVP command set:** energy, more and less of an instrument, the instrument locks, more and less complex, riser, part harmony, vary, swap, the five sound commands, change instrument, change chords, change key, talk more and less, add a line (`say-live`), a saved pattern by name (`pattern`), drop, stay, extend, end, and the mixer (volume, mute, back, lock, unlock). Left out: the legacy `add` and `remove`, `voice` and `voice-sound` (preset forms), `curve` and `curve-reset` (drawn values).

**Size.** Measured: about 800 tokens for the system text and the examples in a window of 9216 tokens, plus about 200 per request and the schema (kept out of the context with `omitResponseConstraintInput` when the build supports it). The full knowledge note is never sent. If a build reports a window smaller than the prompt needs, the builder drops in order: the examples down to 2, the kinds disabled now, the descriptions (kind names only). `npm run check:ai` fails when the prompt passes 2000 tokens (counted as characters / 4).

**Built-in sessions.** One base session per page with the system prompt, created on the first request (or on the download click); each request runs in a `clone()` and destroys it after, so turns never pile up and `contextoverflow` cannot drop anything that matters. The base session is destroyed when the Radio tab closes. Expected languages `en` in and out.

### D4. Validation and apply

1. The answer must parse and match the schema; otherwise nothing applies and the row says "The answer was not understood" with Retry.
2. A non-empty `note` with no commands is the "cannot" answer (guard 2): nothing applies and the row shows the note.
3. Each command goes through its registry entry's `validate` (D0): mapped to the object a button would send (`{ kind, part }`, `{ kind, type, target }`, `{ kind, track, value }`…). Unknown kinds, words outside the lists, track ids not on air, values out of range (volume 0 to 1.2, the mixer slider's range) and unknown or ambiguous pattern names (guard 1) are dropped with a reason.
4. Each kept command is checked with the console's own reason, `whyNot` or `airWhy`, on the song on air, as the button's tooltip is. "+" and "−" are then checked by `pend` against the pending changes, as a press is. A disabled one shows its usual reason ("late", "not-playing", "cap"…).
5. Valid commands are applied in order through the entry's `apply`, the same functions as the buttons: `pend` for "+" and "−" of an instrument, `pendPattern` for a saved pattern as a new track, `pendLock` for the locks, the typed-line path for `say-live`, `command` for the rest. They enter the queue, keep their boundaries and can be cancelled with ✕ like any press. A request never bypasses the console.

**Three guards** (from the probe's failures):

1. **Pattern names.** The model writes the name as free text, as the listener said it. The app matches it against the names of the saved patterns that fit the song: normalised (case, accents, punctuation, and the filler words "my", "saved", "pattern"), exact first, then a fuzzy score per word (edit distance) with a threshold of 0.75. No match gives "No saved pattern called “Sunset Lead”"; two matches within 0.05 of each other give "Which one: Tape Chords or Tape Chord Stabs?". Round 2 showed that an enum of names makes the model pick a wrong existing name, so the schema never lists them as an enum; the prompt lists them as plain text.
2. **A "cannot" path, always.** The schema's `note` is required and comes first, `commands` may be empty, and one of the examples is a request the console cannot do. Round 2 lost this path ("change the tempo to 140 bpm" became a key change). Before the engine is asked, the registry's short list of things the console never does (tempo or BPM, time signature, playing backwards) answers "cannot" at once, with no model call.
3. **Ask before applying for vague requests.** A request is vague when it names no registry entry's `words`, no instrument, no playing track and no saved pattern ("it is getting boring", "give it some air"). Decided: the app flags it and shows that answer as a proposal even in "Apply at once", with the line "A vague request: check before applying". Settings and the menu still recommend "Ask before applying" to listeners who mostly type moods. Rationale: the probe's vague requests were the least stable (several answers are right, the model picks one), and a proposal costs one key press.

**Checks after the engine** (4 to 6 from probe v3, run on the owner's Mac: 26 of 38 English requests exact; 7 from probe v4). The model is small and sometimes answers with the wrong thing that still validates, so the app reads the answer against the request text before applying (`reviewAnswer` and `directAnswer` in `src/ai/commands.js`):

4. **The pattern the request names.** v3 answered "play Glass Arp" and "replace the bass with the acid line pattern" with "Rolling Sub", the pattern of the prompt's example; it exists, so guard 1 accepted it. Now a pattern command is kept only when most words of the model's name (60 %, the same per-word score as guard 1) appear in the request; near spellings ("Dusty Break") pass. Otherwise the app takes the name from the request itself (after "pattern", before "pattern", or in quotes) and matches it with guard 1; with no such phrase it looks for a saved pattern whose words all appear in the request. A match replaces the model's name; a phrase with no match is rejected as "no saved pattern called …" with the request's words; nothing found turns the answer into a proposal.
5. **The command the request names.** v3 answered "more energy" with "+ Pad" and Brighter. When the request holds a registry `words` entry that belongs to exactly one command (shared words like "energy" or "lock" do not count) and no answered command is that one or a close one (a small table: "−" and Mute, the two locks, Swap and a saved pattern…), the answer becomes a proposal with "The answer may not match the request: check before applying". The same when the request names a saved pattern in full and the answer has no pattern. Requests whose words name two or more commands are not checked, so two-step requests answered right never become proposals. The prompt also gets "more energy" as its first example.
6. **Spoken lines without the model.** v3 refused "add a spoken line: welcome to the night shift". A request with say, speak, spoken line, announce (or the Italian dici, frase, annuncia) followed by a colon or a quoted text becomes `say-live` with that text before the engine and before the "cannot" list (a line may say "faster"). The entry's own checks still apply: more than 12 words is "too long", no voice helper is "no voice helper". The prompt gets one example of a spoken line.

7. **A "cannot" answer to a request that names one command** (from probe v4). v4 answered "go to the drop" with `{"note":"The console cannot change the tempo.","commands":[]}`; v3 got it right. When the engine answers no commands, the request is not vague, and its words name exactly one command by the unique words of check 5 (`kindsNamed`), and that command takes no required arguments, the app replaces the "cannot" note with a proposal of that command (`check: 'cannot'`, shown with the line of check 5, "The answer may not match the request: check before applying"); the engine's note is dropped, since it may speak of something else. A command that needs an argument (an instrument, a track, a pattern, a spoken line) cannot be built from the words alone, so its "cannot" stays. The "cannot" list before the engine (tempo, time signature, backwards) is unchanged and still answers without the model. A proposal costs one key press, and the console's own reason still strikes the chip when the command is disabled.

The prompt stays small: the two examples change the measured size from 879 to 904 tokens (characters / 4, eight playing tracks).

**Two modes**, a switch in the field's small menu and in Settings, stored per area in `coding-misk-ai` (`apply: 'now' | 'ask'`, default `now`):

- **Apply at once:** step 4 runs as soon as the answer is validated.
- **Ask before applying:** the answer row shows the valid commands as a proposal with Apply (Enter) and Dismiss (Escape); each chip can be dropped with its ✕ before Apply. Nothing is queued until Apply. On Apply steps 3 and 4 run again against the song as it is then, so a proposal that went stale shows the new reasons. A new request replaces an open proposal.

Commands queued through `command` carry `by: "assistant"` in the recorded steering, so replay and history show them; the song they make is the same as with the presses. The "+", "−", locks and new saved-pattern tracks go through the prepared batches like presses and are recorded as presses.

### D5. What the console shows

**Placement: inside the existing Radio console, compact.** The console is already crowded, so the assistant adds no panel and no new group. It is one row at the top of the console area, above the command groups: a single-line text field ("Ask the console…", Enter to send, Escape to clear) that takes the row's free width, with one small icon button at its end for a menu (engine and model, the mode switch, "What is sent", Settings). The engine and model name show as the field's placeholder suffix, not as a separate label. At 400 px the row stays one line. While the engine works the icon becomes a spinner and Cancel. Then a single answer line under the field, the same height as a queue row: one chip per command with its button label ("▼ Less energy", "+ Arp") marked applied, proposed, or struck through with its reason, and the `note` if any; it wraps only when the chips do not fit, and has a ✕ to close it. The line stays until the next request or ✕. Long texts (download progress, the reason a model is unavailable) go in the same line, never in a box. On the built-in engine: `downloadable` shows "Download the built-in model (about 4 GB; Chrome needs 22 GB free)" with a progress bar; `unavailable` shows the reason (hardware, disk, browser version, turned off by the organisation) and a link to Settings. When the app language is Italian, the field says that the built-in engine understands English only (Italian requests may work, round 1 got 3 of 3, but are not guaranteed). A vague request (D4, guard 3) shows its proposal with the line "A vague request: check before applying".

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

**Real Compose needs the online engines; the built-in engine is at most a "light" option.** A full Compose request carries the song format, the schema and a song of several thousand tokens: 12k to 20k tokens or more, past the built-in model's measured window of 9216 tokens. The probe's single-track request (one `anyOf` branch per track type, a small example song) fitted and gave 12 of 12 valid answers, 10 of 12 of the right type, but only 5 of 12 musically right, at about 10 s each. So the `compose` area defaults to an online engine; the built-in engine may be listed later as "Light: one track, may miss what you asked", never as the default, and only after its own change measures it again.

### D12. Checks

- `npm run check:agent-api` (no browser, D0): every registry entry has a kind of `COMMANDS`, a description, a button label, a schema whose properties all have a type, words for the vague guard, `validate` and `apply`; the generated prompt, schema, tool definitions and MCP tools build; `docs/AGENT-API.md` is the same as `npm run agent-api` writes.
- `npm run check:ai` (no browser): the prompt's size (under 2000 tokens) and content for a song with eight playing tracks; the schema (`note` first and required, one branch per entry, no enum of pattern names); the three guards (pattern names exact, near, unknown and ambiguous; the "cannot" list; vague and precise requests); the validator on fixture answers (good, partly wrong, unknown kinds, bad tracks, values out of range, invalid JSON) with a fake console. Stage 2 adds the family key and upgrade rules and the helper's routes.
- The probe page stays as a permanent prompt bench (`openspec/changes/ai-assistant/probe/`): it imports the real registry, prompt, schema and guards, runs the radio requests of both rounds on the real built-in model and saves `notes/nano-probe-results-v5-<time>.json` (since v4 its summary also says, per request, what the app does after the checks: applied, proposal or rejected; v5 adds check 7 and compares with v4). `?autorun=1` starts the run by itself after load when the model is available. Task 1.1 reruns it with the guards; the owner runs it (about 5 minutes). It is a measure, not a gate.
- `tools/check-ai.cjs` (browser, dev server, a fake engine): requests apply through the queue, cancel, disabled reasons, the answer row, Settings per area, Italian, 400 px. Later stages add the upgrade toast and Undo, the key warning and the backup without keys.

## Risks / Trade-offs

- **The built-in model is small.** It may pick the wrong kind or invent track ids (round 2: 30 of 38 exact). Mitigation: one schema branch per kind, enums for the console's lists and the playing track ids, free-text pattern names matched by the app, the "cannot" path, proposals for vague requests, validation that drops what does not fit, and the bench rerun before release.
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
