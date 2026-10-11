// A small client for OBS's control channel (obs-websocket 5, built into OBS 28 and later), for the control room (#52).
// Protocol: Hello (op 0), Identify (1), Identified (2), Event (5), Request (6), RequestResponse (7).

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const sha256 = async s => b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
// the answer to OBS's challenge: base64(sha256(base64(sha256(password + salt)) + challenge))
export async function authOf(password, salt, challenge) { return sha256((await sha256(password + salt)) + challenge); }

export const OBS_DEFAULTS = { host: '127.0.0.1', port: 4455 };
// events wanted: general, scenes, outputs (bit flags of obs-websocket)
const EVENTS = (1 << 0) | (1 << 2) | (1 << 6);

// connect({ host, port, password }) resolves to the client, or rejects with { code } :
// 'refused' (OBS not running or its control channel off), 'auth' (wrong or missing password), 'closed'
export function connectObs({ host = OBS_DEFAULTS.host, port = OBS_DEFAULTS.port, password = '' } = {}, { onEvent = () => {}, onClose = () => {}, WebSocketImpl = globalThis.WebSocket } = {}) {
  return new Promise((resolve, reject) => {
    let ws, ready = false, seq = 0;
    const waiting = new Map();
    try { ws = new WebSocketImpl(`ws://${host}:${port}`); } catch (e) { reject({ code: 'refused' }); return; }
    const client = {
      // a request: resolves to its responseData, rejects with { code: 'request', status, comment }
      call(requestType, requestData = {}) {
        return new Promise((res, rej) => {
          if (!ready) { rej({ code: 'closed' }); return; }
          const requestId = `cm${++seq}`;
          waiting.set(requestId, { res, rej });
          ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
        });
      },
      close() { try { ws.close(); } catch (e) {} },
      get open() { return ready; },
    };
    ws.onmessage = async e => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.op === 0) {
        const d = { rpcVersion: 1, eventSubscriptions: EVENTS };
        if (m.d.authentication) {
          if (!password) { reject({ code: 'auth' }); ws.close(); return; }
          d.authentication = await authOf(password, m.d.authentication.salt, m.d.authentication.challenge);
        }
        ws.send(JSON.stringify({ op: 1, d }));
      } else if (m.op === 2) { ready = true; resolve(client); }
      else if (m.op === 5) onEvent(m.d.eventType, m.d.eventData || {});
      else if (m.op === 7) {
        const w = waiting.get(m.d.requestId); if (!w) return;
        waiting.delete(m.d.requestId);
        if (m.d.requestStatus && m.d.requestStatus.result) w.res(m.d.responseData || {});
        else w.rej({ code: 'request', status: m.d.requestStatus && m.d.requestStatus.code, comment: m.d.requestStatus && m.d.requestStatus.comment });
      }
    };
    ws.onclose = e => {
      const was = ready; ready = false;
      for (const w of waiting.values()) w.rej({ code: 'closed' });
      waiting.clear();
      // 4009: authentication failed
      if (!was) reject({ code: e && e.code === 4009 ? 'auth' : 'refused' });
      else onClose();
    };
    ws.onerror = () => {};
  });
}

// OBS's names in the scene collection the Guide describes
export const SCENES = { live: 'Live', standby: 'Standby' };
// the input the control room writes the beat into, read by the watchdog script in OBS
export const BEAT_INPUT = 'cm-heartbeat';

// "1:02:03" from milliseconds
export const onAirClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
