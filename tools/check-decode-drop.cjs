// Decode: a file dropped on the drop area opens (#91). A real drop empties the drop's data after the handler's first
// await; the check's drop does the same, so a handler that reads the file late fails here as it does in the browser.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-decode-drop.cjs   (dev server)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.env.PORT || 5173, URL0 = `http://localhost:${PORT}/`;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL0); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('coding-misk-decodes'); });
  await page.reload(); await sleep(2500);
  await page.click('[data-tab="decode"]'); await sleep(300);
  const over = await page.evaluate(() => {
    // 4 s of a 440 Hz tone as a 16-bit WAV
    const rate = 22050, n = rate * 4, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 440 * i / rate) * 8000, true);
    const dt = new DataTransfer(); dt.items.add(new File([buf], 'Drop Test - Tone.wav', { type: 'audio/wav' }));
    // the browser's protected mode: the files are gone once the event's dispatch returns
    let live = true; const files = dt.files, none = new DataTransfer().files;
    Object.defineProperty(dt, 'files', { get: () => (live ? files : none) });
    const area = document.querySelector('#dc-drop');
    const ev = type => new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
    const o = ev('dragover'); area.dispatchEvent(o);
    area.dispatchEvent(ev('drop')); live = false;
    return o.defaultPrevented;
  });
  check(over, 'dragging a file over the drop area accepts it');
  let s = null;
  for (let i = 0; i < 40; i++) { await sleep(250); s = await page.evaluate(() => globalThis.codingMiskDecode.state()); if (s.title || (s.status && s.status.kind === 'error')) break; }
  check(!!(s && s.title), 'a dropped file opens', s ? `${s.title || ''} ${s.status ? s.status.kind : ''}` : 'no state');
  check(!errors.length, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
