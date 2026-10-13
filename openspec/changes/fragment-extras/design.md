## Context

The tagline is drawn by the vertical composer in the bottom band; texts come from a pure generator; the panel shows title and description.

## Decisions

- **Pool and draw.** The pool lives with the fragment helpers. The die writes the drawn phrase into the tagline setting (owner's choice after the first try, which was an on/off random mode): what the field shows is what the video carries. The call option `taglineMode: 'random'` picks by the fragment code (source and start), stable without stored state.
- **Typing.** Characters shown = time since the opening glitch × 18 per second; the block cursor blinks at 2 Hz while typing and for 2 s after, then hides; one glitch in each 5 s window, at a time picked from the fragment code, scrambles a few characters and splits the colours for about 4 frames. All from the fragment time.
- **Inspiration.** Optional `inspiration: { en, it }` in the song JSON; templates such as "Inspired by {x}." or "Born from {x}." pick by seed. Radio songs have none.
- **Upload fields.** Tags: genres and styles, plus "live coding", "algorithmic music", "music as code", "strudel", "synth". Hashtags: the first five as camel-case words. Category: "Music".

## Risks / Trade-offs

- Long taglines may not fit the band while typing; the band text already shrinks to fit.
