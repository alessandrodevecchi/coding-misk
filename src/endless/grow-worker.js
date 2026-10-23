// Grows radio songs away from the page (radio-profiles stage 4): a growth takes up to a few seconds, and the page
// must keep the music on time meanwhile. The same pure growth as the radio's rebuild and the Node checks (growth.js),
// with the voice instrument's context of the page, so a song grows here exactly as it would in the page.
// Steering a grown song (stage 5, D9: commands as waypoints, waypoints.js) runs here too: it measures the typing of
// the code, and grows the song first when the page has not got it yet.
// The page's own work runs here too, in a second worker so the radio never waits for it: the growth of the song
// restored in Compose at start (crescendo: crescendoSong with the Compose rules) and the grown length of a song card
// (duration: src/live/card-duration.js). Song lists never grow songs in the page.
import { growOnAir } from './growth.js';
import { crescendoSong } from '../song/crescendo.js';
import { grownDuration } from '../live/card-duration.js';
import { steerOnAir } from './waypoints.js';
import { setSpokenContext, spokenContext } from '../song/spoken.js';

self.onmessage = e => {
  const { id, song, ctx, spoken, steer, crescendo, duration } = e.data || {};
  try {
    if (spoken) setSpokenContext(spoken);
    if (crescendo) { self.postMessage({ id, crescendo: crescendoSong(crescendo.song, crescendo.opts) }); return; }
    if (duration) { self.postMessage({ id, duration: grownDuration(duration, spokenContext.styles) }); return; }
    if (steer) { const r = steerOnAir(steer); self.postMessage({ id, steered: { song: r.song, grown: r.grown, commands: r.commands } }); return; }
    self.postMessage({ id, song: growOnAir(song, ctx) });
  } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};
