# Design

## Decisions

- **Blocks of 4 minutes with 8 seconds of lead in.** The parent splits the song into time windows; each window is rendered in a fresh render page (superdough's node pools forbid reusing a page across contexts) with the haps from 8 seconds before the window, then trimmed to the window. The last block keeps the 3 second tail. A 20 ms crossfade hides any difference at the cut.
- **Streaming encoder.** `createEncoder(format)` takes blocks of samples and returns the file at the end: WAV keeps 16 bit parts and writes the header at the end; Mediabunny sources take each block as it comes.
- **Haps by time.** The tempo map gains the inverse (cycle at a time), so a block queries only the segments it covers.
- **Radio ranges.** `rebuild(recipe, count, { until })` grows the session one song at a time and stops when the length is reached. The songs from the one on air are joined with the existing join and exported like a saved session.
- **One export at a time** with the song and session exports; progress on the radio's button.

## Risks / Trade-offs

- [Effects with tails longer than the lead in (long reverbs, delay feedback) may change slightly at a cut] → 8 seconds covers the app's reverbs; the check compares one piece and blocks.
- [A 3 hour WAV is about 2 GB] → the panel shows the expected size; FLAC halves it.
