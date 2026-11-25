---
id: ai-assistant
related: [radio-commands, radio, patterns, settings, decisions]
code: [src/ai/commands.js, src/ai/generate.js, src/ai/engine.js, src/ai/engines/nano.js, src/ai/areas.js, src/ai/console-row.js, src/radio/radio.js, docs/AGENT-API.md]
checks: [npm run check:agent-api, npm run check:ai, node tools/check-ai.cjs]
---

# AI assistant

## What it is

A request typed in the Radio console ("more energy and add an arp") becomes one or more existing console commands. An AI engine reads the request; the app validates every command with the console's own rules and applies it through the same function as the button, so it waits for its boundary in the queue and can be cancelled like a press. The engine never writes Strudel code. The first engine is the browser's built-in model: no key, no network after its download. Requests are understood in English; Italian may work but is not guaranteed.

## How it connects

- **The command registry** (`src/ai/commands.js`) has one entry per console command the assistant may use: `kind`, `button`, `description`, `args` (a JSON Schema), `words` (for the vague guard), `map` (the arguments to the object the button sends) and `apply` (the button's code path through an `api` of the console's functions: `command`, `pend`, `pendLock`, the saved patterns' path, the typed-line path). `validate` adds the console's own reason (`whyNot`, or `airWhy` on a grown song). The legacy and drawn commands are in `LEFT_OUT` with a reason.
- **Generated from the registry** (`src/ai/generate.js`): the system prompt and initial prompts, the text of one request (the song on air, the playing tracks, the fitting saved patterns), the answer schema (`note` first and required, one `anyOf` branch per entry), tool definitions for online engines, MCP tools (#26) and `docs/AGENT-API.md` (`npm run agent-api`).
- **Engines** (`src/ai/engine.js`): one interface (`status`, `listModels`, `prompt`). The built-in engine (`src/ai/engines/nano.js`) keeps one base session and runs each request in a clone. **Areas** (`src/ai/areas.js`): the engine, model and mode per area in `coding-misk-ai` (in the backup).
- **The row** (`src/ai/console-row.js`): mounted at the top of the console by `renderSteer` in `src/radio/radio.js`, which gives it the song's context and the buttons' functions. Commands queued through `command` carry `by: "assistant"` in the recorded steering.

## Options

- **Mode** (menu of the row, Settings → AI assistant): Apply at once (default) or Ask before applying. A vague request is always shown as a proposal.
- **Engine and model per area**: the built-in model for the Radio console; online engines are listed as coming. Compose is coming, on online engines only.
- **Guards**: saved pattern names are free text matched by the app (normalised, fuzzy per word, threshold 0.75, ties within 0.05 refused); tempo, time signature and playing backwards are answered "cannot" before the engine; a request with no command word, instrument, playing track or saved pattern is vague. After the engine, the answer is read against the request (probe v3): a saved pattern the request does not name is replaced by the one it names, rejected with the request's name, or shown as a proposal; an answer that leaves out the one command whose words the request uses (or a saved pattern it names in full) is shown as a proposal with "The answer may not match the request"; a "cannot" answer to a request that is not vague and names exactly one command without arguments by its unique words ("go to the drop") becomes a proposal of that command with the same line (probe v4); "say: …" or a line in quotes becomes Say now without the engine, and a request that only asks for the drop ("go to the drop", "skip to the drop", "vai al drop", "al drop") becomes Go to the drop without the engine.

## Example

"replace the bass with the acid line pattern": the model answers `{"note":"","commands":[{"kind":"pattern","name":"acid line","track":"bass"}]}`; the app matches "Acid Line 303" among the fitting saved patterns and queues it in place of the bass, as the panel's Replace button does. "change the tempo to 140 bpm" is answered "Cannot: The console cannot change the tempo." with no model call.

Measured on the owner's Mac (probe rounds 1 and 2): a window of 9216 tokens, a prompt of about 800, round 2 30 of 38 English requests exact with a median of about 2.2 s. The probe page (`openspec/changes/ai-assistant/probe/`) stays as a bench: round 3 runs the real registry and guards.

## Where to read more

- `docs/AGENT-API.md`: every command and its arguments, generated.
- OpenSpec change `ai-assistant`: design D0 (registry), D3 (prompt and schema), D4 (validation, guards, modes), D5 (the row).
- [radio-commands.md](radio-commands.md): what each command does.
