## Context

My phrases (`openspec/changes/my-phrases/`) keeps one store. A phrase has one kind (`voice`, `explain`, `poetic`) and a tag whose meaning depends on the kind. The pick is `candidates()` in `src/voices/mine.js`. The phrase key is `keyOf(kind, lang, text)` in `src/voices/phrases.js`. The owner wants a line that several voices can say without typing it once per kind.

## Goals / Non-Goals

**Goals**

- Five options in Who says it, for My phrases only.
- Data that allows all seven combinations later.
- No change to draws when every phrase has one kind.

**Non-Goals**

- No change to built-in vocabularies.
- No checkbox UI now.
- No per-speaker choice.

## Decisions

### D1. `kinds` is a list

A phrase stores `kinds`, a non-empty list drawn from `voice`, `explain`, `poetic`, in that order, with no repeats. `KINDS` stays the three values. A new `KIND_SETS` in `src/voices/phrases.js` holds the five lists the form offers: `[voice]`, `[explain]`, `[poetic]`, `[explain, poetic]`, `[voice, explain, poetic]`. `normalize` accepts any non-empty valid list, so the seven combinations work in data. Alternative: a fourth kind `any`. Rejected: it covers one combination and needs another value for Both narrators.

### D2. Migration: normalize on load

`readStore` reads a phrase with a single `kind` as `kinds: [kind]`. Phrases are written back with `kinds` and without `kind` the next time the store is saved. This is backwards safe: a phrase with one kind says and is tagged as before. The backup reads through `readStore`, so an old backup imports the same way. A backup written after this change opens in an older build as phrases it cannot read, which the older `normalize` drops. This is accepted because the app and backup move together.

### D3. Picking

`candidates()` in `src/voices/mine.js` changes `p.kind === kind` to `(p.kinds || [p.kind]).includes(kind)`. The tag test `!p.tag || p.tag === tag` already lets a phrase with no tag through, so a phrase with several kinds matches every tag. The stream name `mine/<kind>/<key>` and the least-used rule stay. `mineSnapshot` copies `kinds`, so Replay draws the same way.

### D4. Tag only for one kind

`validTag(kinds, tag)` is true for no tag, and for a tag of the one kind when the list has exactly one kind. `normalize` drops any other tag. The form clears the tag when the user chooses Both narrators or All.

### D5. Duplicates

The key is no longer one string. The rule is: no two phrases share lang, text and a kind. `find(store, kind, lang, text)` returns the phrase whose `kinds` includes the kind. In `addPhrase`, an existing phrase that includes the asked kind is reused (one more use). In `editPhrase`, after the new kinds are set, every other phrase with the same lang and text and at least one included kind is merged: keep the older id, sum `uses`, take the newer `last`, union `styles` and `kinds`, keep `on` true if any is on. The result carries `merged: [ids]` so the tab can offer Undo. Narrowing never merges. `mergePhrases` (backup) matches by id, then by an included kind, as it did by key.

### D6. Form and row

`src/voices/voices-tab.js`: the select shows the five `KIND_SETS`. Drawn icons only: wave for voice track, microphone for explaining, quill for poetic, and the matching icons side by side for the two lists. The tag select is not rendered for Both narrators or All. The row shows the kind icons and, in the tag position, "Any" for a list of several kinds. The kind chips filter by a kind and show a phrase under every kind it includes. `groupsOf` lists a phrase of several kinds in its own group after the three single groups.

`src/i18n.js`, EN and IT: "Both narrators" / "Entrambi i narratori" and "All" / "Tutte le voci", with a short hint each.

### D7. Samples

The sample file is `say_<lang>[_<speaker>]/<slug>.wav`. `lineSamples` in `src/main.js` and the preparation of samples resolve the speaker per role: `speakerOf` for the voice track, the narrator's speaker from `voiceOf(T)` settings. A phrase with several kinds gets one need per distinct bank among its roles. `phraseFiles` and the usage answer in `src/voices/samples.js` count the slug in every such bank, and the protect list marks those files as used. Delete follows `phraseFiles`.

### D8. Checks

`tools/check-phrases.mjs`: pick for each of the five lists, tag rules, load of old phrases and old backups, merge and reuse, snapshot. `tools/check-voices-tab.cjs`: the form (five options, tag hidden, tag cleared), the row, the merge toast with Undo, delete count with two speakers.

## Risks / Trade-offs

- A phrase with several kinds widens the pool of every draw, so a user with many of them hears fewer built-in lines at the same share. That is the intent.
- Two speakers make two files for one phrase. Delete removes both.
- Old builds cannot read `kinds`. See D2.

## Estimate

About 1.25 agent hours: store, load and pick 0.4, form and labels 0.3, samples per speaker 0.25, checks 0.3.

## Open Questions

- Merging a phrase that has a mood, moment or track into a wider phrase loses that tag. Recommended: accept it and show the Undo toast, because a phrase with several kinds has no tag by the owner's rule.
