// Grows radio songs away from the page (radio-profiles stage 4): a growth takes up to a few seconds, and the page
// must keep the music on time meanwhile. The same pure growth as the radio's rebuild and the Node checks (growth.js),
// with the voice instrument's context of the page, so a song grows here exactly as it would in the page.
// Steering a grown song (stage 5, D9: commands as waypoints, waypoints.js) runs here too: it measures the typing of
// the code, and grows the song first when the page has not got it yet.
// Classic steering (console-add-ahead D4) runs here too: the radio's "+" and "−" steer a Classic song here, and a grown
// song's director view (plan, options, the song as steered) comes back with its steering, so the page never rewrites a
// song from bar 0 for a press.
// The page's own work runs here too, in a second worker so the radio never waits for it: the growth of the song
// restored in Compose at start (crescendo: crescendoSong with the Compose rules) and the grown length of a song card
// (duration: src/live/card-duration.js). Song lists never grow songs in the page.
// The written plan of a radio window's song on air (#82) is made here too, in a worker of its own: in the page it took
// hundreds of ms in slices after every console command.
import { growOnAir, composeGrowth } from './growth.js';
import { grownDuration } from '../live/card-duration.js';
import { steerOnAir, steerView } from './waypoints.js';
import { steerSong } from './steering.js';
import { setSpokenContext, spokenContext } from '../song/spoken.js';
import { liveCode } from '../live/live-code.js';

self.onmessage = e => {
  const { id, song, ctx, spoken, steer, classic, crescendo, duration, plan, warm } = e.data || {};
  // (started ahead by the page: the modules are loaded, nothing to do)
  if (warm) return;
  try {
    if (spoken) setSpokenContext(spoken);
    // the written plan of a radio window's song on air (#82): the plan the page would make in slices, from the same
    // build, controls, language and samples (live-code.js, written-plan.js are pure)
    if (plan) {
      globalThis.codingMiskAhead = plan.limits || undefined;
      const p = liveCode(plan.build, plan.ctl, { lang: () => plan.lang, files: () => spokenContext.files }).plan();
      self.postMessage({ id, plan: { edits: [...p.edits], ahead: p.ahead } });
      return;
    }
    if (crescendo) { self.postMessage({ id, crescendo: composeGrowth(crescendo.song, crescendo.opts) }); return; }
    if (duration) { self.postMessage({ id, duration: grownDuration(duration, spokenContext.styles) }); return; }
    if (classic) { const r = steerSong(classic); self.postMessage({ id, steered: { song: r.song, plan: r.plan, opts: r.opts } }); return; }
    if (steer) { const r = steerOnAir(steer); self.postMessage({ id, steered: { song: r.song, grown: r.grown, commands: r.commands, ...(steer.view ? { view: steerView(steer, r) } : {}) } }); return; }
    self.postMessage({ id, song: growOnAir(song, ctx) });
  } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};

