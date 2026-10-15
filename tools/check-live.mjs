// Checks for the live output (#52): preset areas inside the picture without overlap, transitions between views,
// the beat's staleness, and the OBS client (challenge answer, identify, requests, errors) against a fake OBS. No browser.
//   npm run check:live      exit 1 when any check fails
import { createHash } from 'node:crypto';
import { VIEWS, PRESETS, presetOf, liveAreas, lerpAreas, ease, isStale, STALE, timelineWindow } from '../src/live/presets.js';
import { futureShown, shownRange, playingAt, drawTimeline, drawColumn } from '../src/live/timeline.js';
import { authOf, connectObs, onAirClock } from '../src/live/obs.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const shown = a => a.a > .5 && a.x < 1920;
const inside = (a, w, h) => a.x >= 0 && a.y >= 0 && a.x + a.w <= w + .01 && a.y + a.h <= h + .01 && a.w > 0 && a.h > 0;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const b64sha = s => createHash('sha256').update(s).digest('base64');

// a fake OBS: Hello with or without a challenge, then answers requests
function fakeObs({ password = '', salt = 'c2FsdA==', challenge = 'Y2hhbGxlbmdl', refuse = false } = {}) {
  const seen = [];
  class WS {
    constructor() {
      setTimeout(() => {
        if (refuse) { this.onclose({ code: 1006 }); return; }
        this.onmessage({ data: JSON.stringify({ op: 0, d: { rpcVersion: 1, ...(password ? { authentication: { salt, challenge } } : {}) } }) });
      }, 1);
    }
    send(raw) {
      const m = JSON.parse(raw); seen.push(m);
      if (m.op === 1) {
        if (password && m.d.authentication !== b64sha(b64sha(password + salt) + challenge)) { setTimeout(() => this.onclose({ code: 4009 }), 1); return; }
        setTimeout(() => this.onmessage({ data: JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }) }), 1);
      }
      if (m.op === 6) {
        const ok = m.d.requestType !== 'Nope';
        setTimeout(() => this.onmessage({ data: JSON.stringify({ op: 7, d: { requestType: m.d.requestType, requestId: m.d.requestId, requestStatus: { result: ok, code: ok ? 100 : 204, comment: ok ? undefined : 'unknown' }, responseData: ok ? { echo: m.d.requestData } : undefined } }) }), 1);
      }
    }
    close() { this.onclose({ code: 1000 }); }
  }
  return { WS, seen };
}

const CHECKS = {
  'presets: one per view, ids from 1'() {
    assert(PRESETS.length === VIEWS.length && PRESETS.every((p, i) => p.id === i + 1), 'ids');
    assert(new Set(PRESETS.map(p => p.view)).size === VIEWS.length, 'one per view');
  },
  'presetOf keeps known values and falls back'() {
    assert(presetOf({ view: 'soul', card: false }).view === 'soul' && presetOf({ view: 'soul', card: false }).card === false, 'kept');
    assert(presetOf({ view: 'nope' }).view === 'visual' && presetOf(null).card === true, 'fallback');
  },
  'every view: shown areas inside the picture, no overlap'() {
    for (const [w, h] of [[1920, 1080], [384, 216], [160, 90]]) for (const v of VIEWS) {
      const A = liveAreas(v, w, h), parts = Object.entries(A).filter(([, a]) => a.a > .5 && a.x < w);
      assert(parts.length > 0, `${v} shows something`);
      parts.forEach(([n, a]) => assert(inside(a, w, h), `${v} ${n} inside at ${w}`));
      // a floating area lies over the stage on purpose
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) if (!parts[i][1].float && !parts[j][1].float) assert(!overlap(parts[i][1], parts[j][1]), `${v} ${parts[i][0]}/${parts[j][0]} overlap`);
    }
  },
  'views show what their names say'() {
    const s = v => Object.entries(liveAreas(v, 1920, 1080)).filter(([, a]) => shown(a)).map(([n]) => n).sort().join(',');
    assert(s('visual') === 'stage', 'visual'); assert(s('code') === 'code,stage', 'code'); assert(s('code-soul') === 'code,soul,stage', 'code-soul');
    assert(s('soul') === 'soul', 'soul'); assert(s('code-only') === 'code', 'code-only');
    assert(s('visual-tl') === 'stage,timeline', 'visual-tl'); assert(s('visual-code-tl') === 'code,stage,timeline', 'visual-code-tl');
    assert(s('code-tl') === 'code,timeline', 'code-tl'); assert(s('soul-tl') === 'soul,timeline', 'soul-tl');
    assert(s('visual-float') === 'stage,timeline', 'visual-float'); assert(s('visual-column') === 'column,stage', 'visual-column');
  },
  'code-only leaves room at the bottom for the song card'() {
    const c = liveAreas('code-only', 1920, 1080).code; assert(1080 - (c.y + c.h) > 140, 'room');
  },
  'transition: ends match the views, middle in between, smooth ease'() {
    const a = liveAreas('visual', 1920, 1080), b = liveAreas('code-soul', 1920, 1080);
    // shown areas match at the ends; hidden ones only need to stay hidden
    const s = A => JSON.stringify(Object.fromEntries(Object.entries(A).map(([n, r]) => [n, r.a > 0 ? r : 'hidden'])));
    assert(s(lerpAreas(a, b, 0)) === s(a) && s(lerpAreas(a, b, 1)) === s(b), 'ends');
    assert(s(lerpAreas(b, a, 0)) === s(b) && s(lerpAreas(b, a, 1)) === s(a), 'ends back');
    const m = lerpAreas(a, b, .5);
    assert(m.stage.w < a.stage.w && m.stage.w > b.stage.w && m.code.a > 0 && m.code.a < 1, 'middle');
    // the code comes in at its final size and height, from the right
    const q = lerpAreas(a, b, .3).code;
    assert(q.y === b.code.y && q.h === b.code.h && q.w === b.code.w && q.x > b.code.x, 'slides in at its size');
    assert(ease(0) === 0 && ease(1) === 1 && ease(.5) === .5 && ease(-1) === 0 && ease(2) === 1, 'ease');
  },
  'timeline: future rules, window, tracks playing'() {
    assert(futureShown('auto', false) && !futureShown('auto', true) && futureShown('show', true) && !futureShown('hide', false), 'future');
    assert(presetOf({ view: 'code-tl' }).future === 'auto' && presetOf({ future: 'hide' }).future === 'hide' && presetOf({ future: 'x' }).future === 'auto', 'preset future');
    const [a, b] = shownRange(100, 50, 16); assert(b - a === 16 && a < 50 && 50 < b, 'window'); assert(shownRange(100, 50, 0).join() === '0,100', 'whole');
    assert(timelineWindow('visual-float') > 0 && timelineWindow('visual-tl') === 0, 'float scrolls');
    const tr = { clips: [{ start: 0, bars: 8 }], off: [[0, 4]] };
    assert(!playingAt(tr, 2) && playingAt(tr, 5) && !playingAt(tr, 9), 'playing');
  },
  'timeline: draws on a canvas without errors'() {
    const calls = []; const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.push(k); return { width: 10 }; }), set: (o, k, v) => { o[k] = v; return true; } });
    const shape = { bars: 32, sections: [{ label: 'A', start: 0, len: 16 }, { label: 'B', start: 16, len: 16 }], tracks: [{ id: 'drums', type: 'drums', clips: [{ start: 0, bars: 32 }], off: [[0, 4]], marks: [{ at: 4, say: 'go' }] }] };
    const P = { bg: '#000', panel: '#111', line: '#333', ink: '#fff', muted: '#888', a1: '#f0f', a2: '#0ff', a3: '#ff0' };
    drawTimeline(ctx, { x: 0, y: 0, w: 1800, h: 240, a: 1 }, shape, 6, P, { future: false });
    drawColumn(ctx, { x: 0, y: 0, w: 300, h: 900, a: 1 }, shape, 6, P);
    assert(calls.includes('fillRect') && calls.includes('fillText'), 'drawn');
  },
  'beat: stale after STALE seconds or when none came'() {
    assert(isStale(0, 1e12) && !isStale(1000, 1000 + STALE * 1000 - 1) && isStale(1000, 1000 + STALE * 1000 + 1), 'stale');
  },
  'on-air clock'() { assert(onAirClock(0) === '0:00:00' && onAirClock(3723000) === '1:02:03', 'clock'); },
  async 'OBS: challenge answer as obs-websocket computes it'() {
    assert(await authOf('pw', 'salt', 'ch') === b64sha(b64sha('pwsalt') + 'ch'), 'auth');
    // the example in obs-websocket's protocol document
    assert(await authOf('supersecretpassword', 'lM1GncleQOaCu9lT1yeUZhFYnqhsLLP1G5lAGo3ixaI=', '+IxH4CnCiqpX1rM9scsNynZzbOe4KhDeYcTNS3PDaeY=') === '1Ct943GAT+6YQUUX47Ia/ncufilbe6+oD6lY+5kaCu4=', 'protocol example');
  },
  async 'OBS: connects with a password, sends events wanted, answers requests'() {
    const f = fakeObs({ password: 'secret' });
    const c = await connectObs({ password: 'secret' }, { WebSocketImpl: f.WS });
    const id = f.seen.find(m => m.op === 1);
    assert(id && id.d.rpcVersion === 1 && id.d.eventSubscriptions > 0 && id.d.authentication, 'identify');
    const r = await c.call('GetStreamStatus', { x: 1 });
    assert(r.echo.x === 1, 'response');
    let err = null; try { await c.call('Nope'); } catch (e) { err = e; }
    assert(err && err.code === 'request' && err.status === 204, 'request error');
  },
  async 'OBS: no password needed when OBS asks none'() {
    const f = fakeObs(); const c = await connectObs({}, { WebSocketImpl: f.WS }); assert(c.open && !f.seen[0].d.authentication, 'open');
  },
  async 'OBS: wrong or missing password, OBS not running'() {
    const code = async (o, f) => { try { await connectObs(o, { WebSocketImpl: f.WS }); return 'ok'; } catch (e) { return e.code; } };
    assert(await code({ password: 'bad' }, fakeObs({ password: 'secret' })) === 'auth', 'wrong');
    assert(await code({}, fakeObs({ password: 'secret' })) === 'auth', 'missing');
    assert(await code({}, fakeObs({ refuse: true })) === 'refused', 'refused');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
