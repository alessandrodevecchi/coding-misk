## Context

The tagline is drawn by the vertical composer in the bottom band; texts come from a pure generator; the panel shows title and description.

## Decisions

- **Pool and draw.** The pool lives with the fragment helpers; the phrase is picked by the fragment code (source and start), so it is stable and needs no stored state. The setting stores `taglineMode: 'fixed' | 'random'`.
- **Typing.** Characters shown = time since the end of the opening glitch × about 18 per second; the block cursor blinks at 2 Hz while typing and for 2 s after, then hides; a glitch every few seconds, picked from the fragment code, shifts and recolours a few characters for 2 to 3 frames. All from the fragment time.
- **Inspiration.** Optional `inspiration: { en, it }` in the song JSON; templates such as "Inspired by {x}." or "Born from {x}." pick by seed. Radio songs have none.
- **Upload fields.** Tags: genres and styles, plus "live coding", "algorithmic music", "music as code", "strudel", "synth". Hashtags: the first five as camel-case words. Category: "Music".

## Risks / Trade-offs

- Long taglines may not fit the band while typing; the band text already shrinks to fit.
