## Context

`src/song/writer.js` rewrites the compiled code for the profile's Technical functions value (`full`, `short`, `mixer`): `.orbit(n).analyze("x")` becomes `.o("x")` or moves to a hidden mixer, `.distort(x).distortvol(.5)` becomes `.drive(x)`, and a voice line's effects become `.voice("flo")` with the chain in `globalThis.miskVoices`. `installHelpers` registers `o`, `drive` and `voice` once per page (`src/main.js`, `src/render/page.js`); `preludeText` writes the same helpers as Strudel code for Copy and Open in Strudel. `liveCode` (`src/live/live-code.js`) computes the buses and levels from the song as written, then rewrites the code of every step.

The Strudel catalog (`docs/strudel/functions.json`) lists `drive` (filter overdrive), `voice` (a control) and `o` (synonym of `orbit`). Over the 38 built-in songs the most frequent effect runs are `decay.sustain.delay.room` (29 songs), `lpf.lpq` with `decay.sustain` (29) and a moving `hpf(sine.range().slow().late())` (24).

Hand-coded versions live in the song library as `codeSongs`, with their code in `lib.code[id]`.

## Goals / Non-Goals

**Goals:** shorter code in the Live coder profile with the same events; no app helper hides a Strudel function; one control for how much the code hides.

**Non-Goals:** folding sounds, notes, rhythms or masks; user-defined library functions (later, with `pattern-library` votes); changing Classic or Crescendo code.

## Decisions

### D1. Helper names
`o` → `chan`, `drive` → `grit`. `voice` is not registered: a voice chain becomes a song function like any other. `HELPERS` in `writer.js` lists the new names; `tools/check-strudel.mjs` fails when a name of `HELPERS`, of the library or of a name list is a catalog name or synonym. No alias for the old names: registering them would hide Strudel again.

### D2. Song functions are text templates
A function is `{ name, params: ['a','b'], chain: '.decay(a).sustain(b).delay(.3)' }`. It is registered per evaluation through `globalThis.miskFns` (name → template), set with the buses before the code is evaluated, as `miskVoices` today; `installHelpers` registers each new name once with a function built from the template (`new Function(...params, 'p', 'return p' + chain)`), cached by template text. `preludeText` writes them as `register('name', (a, b, p) => p.decay(a)…)`, so Strudel's own `register` curries the parameters.

### D3. Finding runs
Folding works on the code of the song as written in full (the same reference `liveCode` already compiles for buses and levels):
1. Split every pattern line into calls; mark effect calls (not `s`, `n`, `note`, `sound`, `bank`, `scale`, `chord`, `voicing`, `anchor`, `mode`, `struct`, `beat`, `mask`, `velocity`, `orbit`, `analyze`, `gain`, `postgain`, the arithmetic and time calls on the head).
2. Runs of 3 to 6 consecutive effect calls; keep a run when its call names appear on two or more lines, or it has four or more calls on one line.
3. Arguments that differ between uses become parameters (at most three, in order of first appearance); equal arguments stay inside the template. More than three: not folded.
4. Library first: a run whose call names and constant arguments match a library template uses that function; otherwise a song function.
5. Longest runs first; a call belongs to one function at most.

The table of functions is fixed for the song. At every step, `writeLine` folds a run only when its calls match a template with the constant arguments equal; the differing values go in as arguments. So a step that changes a parameter shows the new value in the call, and a step that changes a constant or adds a call inside the run leaves that line written out (spec "Growth changes parameters"), with no extra state.

### D4. Library and names
`src/song/functions.js` exports `LIBRARY` (data: name, params, chain, a one-line description in both languages) and `NAMES` (word lists per style family, per track type, plus generic words). First library: `pluck` (decay, sustain), `space` (delay, room), `res` (lpf, lpq), `sweep`-like moving filter under a free name (checked against the catalog). Song function names: the seed of the song (`hash(song.id)`) picks from the list of its style family, then its track type, then generic; a used name is skipped. A single letter only when the function has one use; two or three letters only for library entries.

### D5. Technical functions as a preset
Profile options, booleans like the comment options: `fnBus`, `fnLevel`, `fnGrit`, `fnVoice`, `fnSong`, `fnLib`. `FUNCTION_PRESETS = { full: {}, short: {bus, grit, voice}, mixer: {short + level}, compact: {mixer + song + lib} }`, and `functionPreset(opts)` names the preset or `custom`, as `commentPreset` does. A saved profile with `functions: 'short'` expands to its options on load. Live coder sets `functions: 'compact'`. The UI shows the preset menu and a small group of checkboxes, as the comment options.

### D6. Update of saved code
On start, a pure function `upgradeCode(code)` rewrites `.o("x")` → `.chan("x")` and `.drive(` → `.grit(`, and replaces `.voice("name")` with the chain from the version's saved voices when present, or with the chain written out. Versions carry `codeVersion: 2` after the update so it runs once. Checked in Node.

### D7. Equivalence
`tools/check-functions.mjs` compiles every built-in song with Live coder in full and in compact for every step, evaluates both with Strudel in Node (as `check:ideas` does for events where possible, or by expanding templates textually and comparing the full text) and requires the same events. The textual expansion (template applied back to the line) must give exactly the full line: a cheap check without the browser.

## Risks / Trade-offs

- A viewer does not know our function names → they are few, only for repeated chains, and the hidden code shows them; sounds and notes stay in standard Strudel.
- Hand-written code with `.drive(` sounds different after the update → the update rewrites it once; user code written later with `.drive(` gets Strudel's overdrive, as in Strudel.
- Typing: a line folds at the step where its run matches; when a parameter changes the typing edits only the value.
