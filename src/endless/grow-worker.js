// Grows radio songs away from the page (radio-profiles stage 4): a growth takes up to a few seconds, and the page
// must keep the music on time meanwhile. The same pure growth as the radio's rebuild and the Node checks (growth.js),
// with the voice instrument's context of the page, so a song grows here exactly as it would in the page.
import { growOnAir } from './growth.js';
import { setSpokenContext } from '../song/spoken.js';

self.onmessage = e => {
  const { id, song, ctx, spoken } = e.data || {};
  try {
    if (spoken) setSpokenContext(spoken);
    self.postMessage({ id, song: growOnAir(song, ctx) });
  } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};
