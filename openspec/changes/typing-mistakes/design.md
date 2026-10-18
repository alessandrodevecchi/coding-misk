## Context

See proposal.md for the motivation. Today in `src/song/typing.js`:

- `humanKeys(text, cps, rng, lean)` turns the text of one edit into keys `{ dt, key }`. A typo has a chance of 1 in 55 per character with a keyboard neighbour (`NEAR`). After it, 0 to 2 keys of the right text follow, a wait of 0.25 to 0.75 seconds, then backspaces with `dt = (0.6..1.1) / (cps * 2.5)`, which is a burst.
- A change of mind (10% on a number) types another value, waits 0.5 to 1.7 seconds and deletes it with the same burst.
- `humanPlan` builds the plan with mistakes; if it is longer than `max`, it builds a lean plan (no pauses, typos or changes of mind), then scales the times.
- A new line like a line above is already pasted whole and then edited (`typing-lines`). A new line unlike any other is always typed.
- All draws come from `mulberry(seed)`, where the seed holds the song seed and both texts. The fast video uses the same plan.

## Goals / Non-Goals

**Goals:**

- A typo the owner can see in normal playback and in a video frame.
- Whole wrong words and pasted long lines, rarer than typos.
- Same plan for the same song and step; code exact at the step.

**Non-Goals:**

- Mistakes that are ever evaluated: frames are only shown, never run.
- Changing exact style, the profile table, or the time budget rules of `human-typing` (listening pause, then typing).
- Wrong notes or wrong values that sound: this is about the text on screen only.

## Decisions

### D1. Typo timing

After the wrong key, `3 + floor(rng() * 4)` keys of the right text follow, cut at the end of the edit or at a line break. Then a wait of `0.5 + rng() * 0.5` seconds. Then the backspaces, each with `dt = (0.9 + rng() * 0.6) / cps`, the first one a little longer. Then the right keys again. The chance stays about 1 in 55 per character, so a long edit shows one or two visible typos.

Alternative: keep 0 to 2 keys and only slow the backspaces. Rejected: the wrong key would still be at the end of the text, close to the cursor, and easy to miss.

### D2. Whole wrong word

A word is a run of letters inside a string, or a function name after `.`. At the start of such a word, with a chance of about 1 in 12 words (seeded), the plan types a wrong word first. The wrong word is drawn from words of the same kind in the target code of the step (other sound names, other scale names, other function names), or, when none exists, the right word with two neighbouring letters swapped. Then a wait of 0.5 to 1 second, backspaces at the pace of D1, and the right word. At most one whole wrong word per edit.

Alternative: draw wrong words from a fixed list of Strudel names. Rejected: a name foreign to the song looks random; a word from the same song looks like a real slip.

### D3. Pasted long lines

A new line with no similar line above (`kind: 'new'`, not already pasted) and at least 60 characters is pasted whole with a chance of about 1 in 3, seeded. A paste is one action that adds the whole line at once after a pause of 0.4 to 0.8 seconds. It uses the paste path that already exists for similar lines, without the edit after it. Comment lines and the voice code are never pasted.

Alternative: paste only lines longer than the panel. Rejected: the panel width is a view setting; the plan must not depend on it, or the app and the video would differ.

### D4. Fitting in the time

`humanPlan` tries plans in this order and keeps the first that fits in `max`: full (D1, D2, D3), without whole wrong words, without thinking pauses (typos and changes of mind stay), lean (as today), then lean scaled (as today). Each plan draws from its own seeded stream, as `full` and `lean` do now.

### D6. A rate that changes

The typo rate is not fixed. The text of a live build is split into stretches of about 20 to 60 seconds of typing; each stretch draws its rate from a range, about one typo every 25 to 120 characters, with a slight bias to careful stretches. Several mistakes may come close together in a hurried stretch; a careful stretch may have none. Most edits change a few characters (a number), so an edit shorter than 20 characters has the typo chance of a 20-character one, and the start of an edit counts as the start of a number for changes of mind. Measured on three Switch songs: 9 to 10 mistakes per song (about one a minute of growth), each on screen 1.2 to 1.9 seconds on average. Changes of mind follow the same stretch (more in hurried ones). The draw uses the song seed and the stretch index, so it is repeatable.

### D7. Mistakes switch

`CONTROLS.mistakes = ['on', 'off']` in `src/live/profiles.js`, `on` in the Switch profile; Classic and Crescendo use exact typing, where the switch has no effect. With `off`, `humanKeys` skips typos, wrong words and changes of mind but keeps key times, thinking pauses and pasted lines. The switch sits under Human typing in the Compose panel and is greyed out when Human typing is off.

### D5. Seeding

Every new draw comes from the same `mulberry` stream of the plan. The seed string does not change, so a song still gives one plan. Human plans change once with this change; exact plans do not.

## Risks / Trade-offs

- [Edits take longer, so more plans fall back to lean] → D4 drops the new mistakes first; a check counts how many steps of the Switch songs keep at least one visible typo.
- [A pasted line hides how the line was written] → Only about one in three long new lines, and never comments or voice code.
- [A wrong word could break the mini-notation look, for example inside `<...>`] → Wrong words only replace letters of a word; brackets and symbols are never touched.
- [Existing fast videos of Switch songs look different when exported again] → Expected; sound is unchanged.

## Open Questions

- **Typo rate.** Decided with the owner: variable by stretch (D6), one typo every 25 to 120 characters; the range can be tuned after seeing it.
- **Pasted line chance.** Recommended: 1 in 3 for new lines of 60 characters or more. Alternative: only for lines of 100 characters or more.
- **Toggle for mistakes.** Decided with the owner: a separate switch, on by default (D7).
