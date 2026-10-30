---
id: phrases
related: [voice, narrator, radio, settings, library]
code: [src/voices/phrases.js, src/voices/moments.js, src/voices/mine.js, src/voices/samples.js, src/voices/service.js, src/voices/voices-tab.js, tools/voice-sample.mjs, vite.config.js]
checks: [npm run check:phrases, node tools/check-voices-tab.cjs, node --no-warnings tools/check-backup.mjs, npm run check:samples]
---

# My phrases and the Voices tab

## What it is

My phrases (it: "Le mie frasi", my-phrases, #82) is the user's own collection of spoken lines, kept in the browser (`coding-misk-phrases`) and in the backup. Every line the user writes is offered to it: the lines typed in the radio console (Say now, At the right moment), the lines of the voice track's phrase list in Compose, the narrator lines of the user's own songs, and the phrases written in the Voices tab. The director and the narrator can say them again in place of lines from the built-in pools.

A phrase has a text (at most 12 words, 160 characters), a language, an optional translation, a kind (`voice`, `explain`, `poetic`), a tag (a vocabulary group, a moment, an entering track type or `move`; none is "any"), optional styles, an on/off switch for the director, its source, a use count and its last use. One phrase per text, language and kind: writing the same line again adds a use.

The Voices tab (it: "Voci", Groove Lab, after Sounds) has four sections: My phrases, Built-in vocabularies (read-only, Copy into my phrases), Voices and sounds (speakers, voice styles, test bench) and Samples (space, missing samples, orphan cleanup, temporary samples).

## How it connects

- **Save policy (D3).** `coding-misk-phrase-settings.save`: `always` (default; a toast with Undo, in Compose the edit's own Undo also removes the phrase), `ask` (a toast with Save, No, Always that never blocks; no answer in 10 s is No), `never`. A line already in the collection only adds a use. The radio console lists the lines typed in the song on air with a late Save until it ends.
- **Moments (D2).** The explaining narrator's 21 moments (`MOMENTS` in `src/voices/moments.js`) are one shared list for Compose and the radio, shown in three groups (tracks that come in, energy and colour, structure). The 14 kinds of `PHRASES` (Compose), the 18 move kinds of `POOL` (radio) and the growths' comments (`CRESCENDO_POOL`) all map onto them. One list or several is still open with the owner; a split would only regroup, the tag stays a moment.
- **The director (D4).** A phrase of mine replaces only a line from a built-in pool, never a song's or a style's own line. The pool draw happens first; the substitution is a second draw on its own stream (`mine/<kind>/<key>`, seeded by the song id), read only when the share is above Mai and the line has a candidate. Least used first. With Mai or no phrase every draw and fixture is as before: no `DIRECTOR_VERSION` or `SHAPES_VERSION` bump.
- **Radio ([radio.md](radio.md)).** A new session records `recipe.mine`, a snapshot of the switched-on phrases with the share and language (only when not Mai). `withMine()` passes it to the director on air, in Replay, exports and playlist sessions, so a session says the same lines after the collection changes. The voice track's vocabulary lines are written out in the plan's spoken track (`mineSpokenTrack`), so steering keeps them; the narrator's phrases go with the song as `song.mine`.
- **Narrator ([narrator.md](narrator.md)).** `setNarratorMine()` in `src/song/build.js` sets a pick the narration calls for each explaining line (`stepText`) and poetic image; unset in Node checks. Only what the narrator says changes (the `// >` comment, captions, samples): steps, growth and code stay the same. In Compose the pick reads the collection for the song open, never the texts of its own written steps.
- **Voice track ([voice.md](voice.md)).** Compose's Fill with has My phrases (`fillMine`) and Browse the vocabularies…; New phrases uses the same share (`rewriteSpoken` with `mine`).
- **Samples (D5, D6, D8).** A file is classed at read time by language and slug (`src/voices/samples.js`): built-in (the text set of `check:samples`), mine, song (the user's library), temporary (in `public/samples/say_temp.json`), orphan. The voice helper has `GET /voice/usage`, `POST /voice/delete` (only named `say_*` files, never a protected language and slug) and `POST /voice/keep` (songs playing, new temporary samples, saved or protected files). The sweep of expired temporary samples runs at the dev server's start and every hour, never on a playing song; `/voice/status` counts the sweeps that deleted something and the page reads the manifest again. A deleted sample still in use is made again by the preparation of samples or falls back (spoken-text-on-stage D9, D10).
- **Uses.** A phrase counts a use when a song that says it plays for 10 s (the same moment as "played recently").
- **Backup ([library.md](library.md)).** Merged by id; the use count keeps the larger value, `last` the newer one. `coding-misk-voices-sub` (the open section) stays out.

## Options

- Save: `always`, `ask`, `never`. Lifetime of unsaved samples (`temp`): `song` (when the song ends, at least an hour), `24h` (default), `7d`.
- How often (`share`): `never` 0, `sometimes` 0.25 (default), `often` 0.5, `lots` 0.8, `always` 1 (every replaceable line with a candidate).
- A candidate: switched on, the same kind, a text in the app's language (its own or its translation), the tag equal or none, its styles none or one of the song's.
- Settings → Voices and phrases holds the three settings and the space; the Voices tab mirrors How often.

## Example

```json
{ "format": 1, "items": [{ "id": "ph_k3x9ab", "text": "le torri non dormono mai", "lang": "it", "alt": { "en": "the towers never sleep" },
  "kind": "voice", "tag": "night", "styles": ["synthwave"], "on": true, "source": "radio", "from": { "song": "Riflesso", "style": "synthwave" },
  "created": "2026-10-29T21:04:00Z", "uses": 6, "last": "2026-10-29T22:10:00Z" }] }
```

A new pool kind or moment: [recipes-build](recipes-build.md#add-a-pool-kind-or-a-moment).

## Where to read more

- `openspec/changes/my-phrases/` (design D1 to D10, the owner's answers of round 5).
- [voice.md](voice.md), [narrator.md](narrator.md), [settings.md](settings.md), [checks.md](checks.md).
