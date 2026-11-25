// The Radio console assistant in the browser (ai-assistant D5, D12), with a fake built-in model injected before the page
// loads (canned answers per request, a call counter, a slow answer to cancel): the row at the top of the console, a
// precise request applied through the queue, a struck command with its reason, "cannot" answered without the model, a
// vague request shown as a proposal and applied on Apply, Ask before applying from the menu with Dismiss, an answer
// that is not understood, an unknown saved pattern, a "cannot" answer to "go to the drop part" shown as a proposal of Drop,
// "go to the drop" and "vai al drop" answered Drop without the model,
// Cancel while waiting, What is sent, the Italian hint, Settings → AI, one line at 400 px, no page errors.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-ai.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const until = async (fn, ms = 8000, step = 60) => { const t = Date.now(); for (;;) { let v = null; try { v = await fn(); } catch (e) {} if (v || Date.now() - t > ms) return v; await sleep(step); } };
const shots = process.argv.slice(2).find(a => !a.startsWith('--'));
if (shots) fs.mkdirSync(shots, { recursive: true });

// the fake model: the answer for the request's text; $T0 and $T1 become the first playing track ids of the prompt
const FAKE = () => {
  const answers = {
    'more energy and add an arp': '{"note":"","commands":[{"kind":"energy-up"},{"kind":"more","part":"arp"}]}',
    'mute the ghost track': '{"note":"","commands":[{"kind":"mute","track":"ghost"},{"kind":"energy-down"}]}',
    'it is getting boring': '{"note":"","commands":[{"kind":"progression"}]}',
    'make it dirtier': '{"note":"","commands":[{"kind":"dirtier"}]}',
    'garbage please darker': 'this is not json',
    'add my saved pattern Sunset Lead': '{"note":"","commands":[{"kind":"pattern","name":"Sunset Lead"}]}',
    'go to the drop part': '{"note":"The console cannot change the tempo.","commands":[]}',
    'go to the drop': '{"note":"","commands":[{"kind":"more","part":"pad"},{"kind":"brighter"}]}',
  };
  globalThis.__aiCalls = 0;
  const session = initial => ({
    contextWindow: 9216, contextUsage: 800,
    clone: async () => session(initial),
    destroy() {},
    async prompt(input, opts = {}) {
      globalThis.__aiCalls++;
      const req = (/Request: (.*)$/m.exec(input) || [])[1] || '';
      if (req === 'slow request darker') {
        await new Promise((res, rej) => { const id = setTimeout(res, 5000); if (opts.signal) opts.signal.addEventListener('abort', () => { clearTimeout(id); rej(opts.signal.reason || new DOMException('aborted', 'AbortError')); }); });
      }
      return answers[req] || '{"note":"","commands":[]}';
    },
  });
  globalThis.LanguageModel = { availability: async () => 'available', create: async o => session(o && o.initialPrompts) };
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctxB = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  await ctxB.addInitScript(FAKE);
  const page = await ctxB.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const base = `http://localhost:${process.env.PORT || 5173}/`;
  await page.goto(base); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'ai-check');
  await page.click('#radio-start');
  await until(() => page.$('#radio-steer .ask-input'), 15000);
  // the song after the lead-in (song 0 is not steered when it comes from Compose; the radio's own first song is)
  const row = await page.$('#radio-steer .ask-row');
  check(!!row, 'the request row is in the console');
  const order = await page.evaluate(() => { const box = document.querySelector('#radio-steer'), r = box.querySelector('.ask-row'), c = box.querySelector('.steer-console'); return r && c ? !!(r.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) : false; });
  check(order, 'the row sits above the command groups');
  const ph = await page.getAttribute('#radio-steer .ask-input', 'placeholder');
  check(/Ask the console/.test(ph || '') && /built-in model/.test(ph || ''), 'the placeholder names the engine', ph);

  // (the first request is typed with Enter; the others call the row's send, the console may be redrawn under the keyboard)
  let typed = false;
  const ask = async q => { if (!typed) { typed = true; await page.fill('#radio-steer .ask-input', q); await page.press('#radio-steer .ask-input', 'Enter'); } else await page.evaluate(x => { globalThis.codingMiskRadio.ask.send(x); }, q); await until(() => page.evaluate(() => !globalThis.codingMiskRadio.ask.busy), 8000); await sleep(150); return page.innerText('#radio-steer .ask-answer').catch(() => ''); };
  const calls = () => page.evaluate(() => globalThis.__aiCalls);
  const queue = () => page.innerText('#radio-steer .steer-queue');

  // a precise request: More energy queued, + Arp in its batch
  let a = await ask('more energy and add an arp');
  const q1 = await queue(), pend = await page.evaluate(() => (globalThis.codingMiskRadio.pendingAdds || []).map(b => b.parts));
  check(/energy/i.test(q1), 'More energy is in the queue', q1.replace(/\n/g, ' | ').slice(0, 120));
  check(pend.some(p => (p.arp || 0) > 0), '+ Arp waits in a batch like a press', JSON.stringify(pend));
  check((await page.$$('#radio-steer .ask-chip.applied')).length === 2, 'two chips marked applied', a.replace(/\n/g, ' '));
  if (shots) await (await page.$('#radio-steer')).screenshot({ path: path.join(shots, 'ai-applied.png') });
  const rec = await page.evaluate(() => (globalThis.codingMiskRadio.state.recipe.steering || []).filter(x => x.by === 'assistant').map(x => x.kind));
  check(rec.includes('energy-up'), 'the recorded steering marks the command as from the assistant', rec.join());

  // a track not on air: struck with its reason, the other command applies
  a = await ask('mute the ghost track');
  check(/no track “ghost” on air/.test(a), 'a track not on air is struck with its reason', a.replace(/\n/g, ' '));
  check((await page.$$('#radio-steer .ask-chip.struck')).length === 1 && (await page.$$('#radio-steer .ask-chip.applied')).length === 1, 'one struck chip, one applied');

  // cannot, without the model
  const before = await calls();
  a = await ask('change the tempo to 140 bpm');
  check(/Cannot/.test(a) && /tempo/.test(a) && (await calls()) === before, '"cannot" is answered without asking the model', a.replace(/\n/g, ' '));

  // a vague request: a proposal even in Apply at once, applied on Apply
  const qBefore = await queue();
  a = await ask('it is getting boring');
  check(/vague/i.test(a) && !!(await page.$('#radio-steer [data-ask-apply]')), 'a vague request is a proposal with Apply', a.replace(/\n/g, ' '));
  check((await queue()) === qBefore, 'nothing is queued before Apply');
  await page.click('#radio-steer [data-ask-apply]'); await sleep(400);
  check(/chords/i.test(await queue()), 'Apply queues the proposal', (await queue()).replace(/\n/g, ' | ').slice(0, 160));

  // Ask before applying from the menu, then Dismiss
  await page.click('#radio-steer [data-ask-menu]'); await sleep(100);
  await page.click('#radio-steer [data-ask-mode="ask"]'); await sleep(100);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-ai') || '{}'));
  check(stored.radio && stored.radio.apply === 'ask', 'the mode is stored per area', JSON.stringify(stored));
  await page.click('#radio-steer [data-ask-sent]'); await sleep(100);
  const sent = await page.innerText('#radio-steer .ask-sent');
  check(/Playing tracks/.test(sent) && /Request: it is getting boring/.test(sent), 'What is sent shows the last prompt');
  await page.click('#radio-steer [data-ask-menu]');
  const q2 = await queue();
  a = await ask('make it dirtier');
  check(!!(await page.$('#radio-steer .ask-chip.proposed')) && (await queue()) === q2, 'Ask before applying shows a proposal and queues nothing');
  await page.click('#radio-steer [data-ask-dismiss]'); await sleep(200);
  check((await queue()) === q2 && !(await page.$('#radio-steer .ask-chip')), 'Dismiss drops the proposal');
  await page.evaluate(() => localStorage.setItem('coding-misk-ai', JSON.stringify({ radio: { engine: 'nano', model: 'built-in', apply: 'now' } })));

  // not understood, unknown pattern, cancel
  a = await ask('garbage please darker');
  check(/not understood/.test(a) && !!(await page.$('#radio-steer [data-ask-retry]')), 'an answer that is not JSON says so, with Retry', a.replace(/\n/g, ' '));
  a = await ask('add my saved pattern Sunset Lead');
  check(/no saved pattern called “Sunset Lead”/.test(a), 'an unknown saved pattern is refused by name', a.replace(/\n/g, ' '));
  // a "cannot" answer to a request that names one command (probe v4): a proposal of that command, not the note
  const q3 = await queue();
  a = await ask('go to the drop part');
  check(/may not match/.test(a) && !/tempo/.test(a) && !!(await page.$('#radio-steer .ask-chip')) && (await queue()) === q3, 'a "cannot" answer to "go to the drop part" becomes a proposal of Drop', a.replace(/\n/g, ' '));
  if (shots) await (await page.$('#radio-steer .ask-row')).screenshot({ path: path.join(shots, 'ai-cannot-drop.png') });
  await page.click('#radio-steer [data-ask-dismiss]'); await sleep(200);
  // a request for the drop (#25): Drop without the model (the fake model would answer "+ Pad, Brighter"), applied or
  // struck with "there is no drop in the rest of the song"
  for (const q of ['go to the drop', 'vai al drop']) {
    const n0 = await calls();
    a = await ask(q);
    check((await calls()) === n0 && /drop/i.test(a) && !/pad|brighter/i.test(a) && !!(await page.$('#radio-steer .ask-chip')), `"${q}" is Drop without the model`, a.replace(/\n/g, ' '));
  }
  await page.evaluate(() => { globalThis.codingMiskRadio.ask.send('slow request darker'); });
  await until(() => page.evaluate(() => globalThis.codingMiskRadio.ask.busy), 3000);
  await page.click('#radio-steer [data-ask-menu]');
  await until(() => page.evaluate(() => !globalThis.codingMiskRadio.ask.busy), 3000); await sleep(100);
  a = await page.innerText('#radio-steer .ask-answer');
  check(/cancelled/i.test(a), 'Cancel aborts the request', a.replace(/\n/g, ' '));

  // focus and text kept across a console rebuild
  await page.fill('#radio-steer .ask-input', 'half typed'); await page.focus('#radio-steer .ask-input');
  await page.evaluate(() => globalThis.codingMiskRadio.renderConsole());
  const kept = await page.evaluate(() => { const i = document.querySelector('#radio-steer .ask-input'); return i && i.value === 'half typed' && document.activeElement === i; });
  check(kept, 'the text and the focus survive a console rebuild');

  // 400 px: one line, nothing wider than the page
  await page.setViewportSize({ width: 400, height: 900 }); await sleep(400);
  const lay = await page.evaluate(() => { const l = document.querySelector('#radio-steer .ask-line'), r = l.getBoundingClientRect(), i = l.querySelector('input').getBoundingClientRect(), m = l.querySelector('button').getBoundingClientRect(); return { h: r.height, same: Math.abs(i.top - m.top) < 8, right: r.right, vw: document.documentElement.clientWidth }; });
  check(lay.h < 44 && lay.same && lay.right <= lay.vw, 'one line at 400 px', JSON.stringify(lay));
  if (shots) await (await page.$('#radio-steer .ask-row')).screenshot({ path: path.join(shots, 'ai-400.png') });
  await page.setViewportSize({ width: 1300, height: 1300 }); await sleep(200);

  // Settings → AI
  await page.click('#radio-steer [data-ask-menu]'); await page.click('#radio-steer .ask-menu [data-ask-settings]'); await sleep(800);
  const card = await page.$('#set-ai');
  check(!!card, 'the menu opens Settings → AI');
  const status = await until(() => page.evaluate(() => { const s = document.querySelector('#set-ai-status'); return s && s.textContent !== '…' ? s.textContent : null; }), 4000);
  check(/Ready/.test(status || ''), 'Settings shows the built-in model ready', status);
  const coming = await page.evaluate(() => [...document.querySelectorAll('#set-ai [data-ai-engine] option')].map(o => `${o.textContent}${o.disabled ? ' (off)' : ''}`).join(' | '));
  check(/coming \(off\)/.test(coming), 'the online engines are listed as coming', coming);
  if (shots) await card.screenshot({ path: path.join(shots, 'ai-settings.png') });

  // Italian
  await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'it'));
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(200);
  await page.click('#radio-start');
  await until(() => page.$('#radio-steer .ask-input'), 15000);
  const phIt = await page.getAttribute('#radio-steer .ask-input', 'placeholder');
  check(/in inglese/.test(phIt || ''), 'in Italian the field says English only', phIt);

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
