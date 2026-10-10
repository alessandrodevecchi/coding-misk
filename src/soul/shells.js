// Soul display shells (#46, phase 2): seven displays seen from the front, drawn as SVG (500 × 420) from the
// mockups in docs/soul/display-v4. Each shell: id, name, screen [x, y, w, h, radius], glass ('crt' or 'flat'),
// mono (monochrome screen), svg() for the body, and the controls as elements with data-act (power, fs, prev,
// next, lock, override). Lamps carry data-led, toggles data-bat, the guard data-guard, knobs data-rot.
// Shared gradients and filters live in one hidden SVG (ensureDefs), with ids prefixed "sd-".
const DEFS = `
    <filter id="sd-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -.62"/></filter>
    <filter id="sd-grime" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".014 .03" numOctaves="4" seed="8"/><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .15  0 0 0 0 .07  1.9 0 0 0 -.95"/></filter>
    <filter id="sd-rust" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="4" seed="21"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .24  0 0 0 0 .08  0 2.6 0 0 -1.6"/></filter>
    <filter id="sd-brushed" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .004" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 -.2"/></filter>
    <filter id="sd-scratch" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".003 .55" numOctaves="1" seed="11"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 .95  0 0 0 6 -4.6"/></filter>
    <filter id="sd-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="sd-drop" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.6"/><feOffset dx="0" dy="2.2"/><feComponentTransfer><feFuncA type="linear" slope=".7"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="sd-inner" x="-5%" y="-5%" width="110%" height="110%"><feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur stdDeviation="5"/><feOffset dx="1.5" dy="4" result="s"/><feFlood flood-color="#000" flood-opacity=".85"/><feComposite in2="s" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="sh"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sh"/></feMerge></filter>
    <filter id="sd-innerS" x="-5%" y="-5%" width="110%" height="110%"><feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur stdDeviation="1.6"/><feOffset dx=".6" dy="1.4" result="s"/><feFlood flood-color="#000" flood-opacity=".8"/><feComposite in2="s" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="sh"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sh"/></feMerge></filter>
    <linearGradient id="sd-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity=".05"/><stop offset=".75" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <linearGradient id="sd-edgeIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset=".5" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>
    <radialGradient id="sd-chrome" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d4d8de"/><stop offset=".7" stop-color="#6b717b"/><stop offset="1" stop-color="#2a2e34"/></radialGradient>
    <linearGradient id="sd-chromeV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b616b"/><stop offset=".3" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#9aa0aa"/><stop offset="1" stop-color="#3a3e46"/></linearGradient>
    <radialGradient id="sd-bakelite" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#6a4a34"/><stop offset=".55" stop-color="#2a1a10"/><stop offset="1" stop-color="#0c0805"/></radialGradient>
    <radialGradient id="sd-blackknob" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#5a5a60"/><stop offset=".55" stop-color="#1d1d20"/><stop offset="1" stop-color="#050505"/></radialGradient>
    <radialGradient id="sd-rubber" cx="40%" cy="25%" r="90%"><stop offset="0" stop-color="#3a3a3e"/><stop offset="1" stop-color="#0d0d0f"/></radialGradient>
    <radialGradient id="sd-ledglass" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></radialGradient>
  `;

// ---------- drawing kit (front view, light from the top left) ----------
let uid = 0; const id = p => `sd${p}${++uid}`;
const lg = (stops, x2 = 0, y2 = 1) => { const i = id('g'); return [i, `<linearGradient id="${i}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`]; };
const rg = (stops, cx = .4, cy = .3, r = .8) => { const i = id('r'); return [i, `<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`]; };
const T = (s, x, y, size, fill, font = 'Share Tech Mono', ex = '') => `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" ${ex}>${s}</text>`;
// engraved or embossed text: a light edge under a dark fill
const engrave = (s, x, y, size, fill, font, ex = '', light = 'rgba(255,255,255,.45)') => T(s, x, y + .8, size, light, font, ex) + T(s, x, y, size, fill, font, ex);
// a body panel: fill, a lit top edge and a shadowed bottom edge
function plate(x, y, w, h, r, fill, ex = '') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${ex}/><rect x="${x + .6}" y="${y + .6}" width="${w - 1.2}" height="${h - 1.2}" rx="${Math.max(0, r - .6)}" fill="none" stroke="url(#sd-edge)" stroke-width="1.4"/>`; }
// a recess with a sloped wall: dark at the top, lit at the bottom
function well(x, y, w, h, r, wall = 10, top = '#050505', bottom = '#4a4a50', floor = '#000') {
  const [g, gd] = lg([[0, top], [.5, top], [1, bottom]]);
  return `<defs>${gd}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${g})"/><rect x="${x + wall}" y="${y + wall * .8}" width="${w - wall * 2}" height="${h - wall * 1.7}" rx="${Math.max(2, r - wall * .6)}" fill="${floor}" filter="url(#sd-inner)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="url(#sd-edgeIn)" stroke-width="1.2"/>`;
}
const screw = (x, y, r = 4, ang = 30) => `<g transform="translate(${x},${y})"><circle r="${r + 1}" fill="rgba(0,0,0,.35)"/><circle r="${r}" fill="url(#sd-chrome)"/><line x1="${-r * .7}" y1="0" x2="${r * .7}" y2="0" stroke="rgba(0,0,0,.6)" stroke-width="1.1" transform="rotate(${ang})"/><line x1="0" y1="${-r * .7}" x2="0" y2="${r * .7}" stroke="rgba(0,0,0,.6)" stroke-width="1.1" transform="rotate(${ang})"/></g>`;
const rivet = (x, y, r = 3.4) => `<circle cx="${x}" cy="${y + .8}" r="${r}" fill="rgba(0,0,0,.4)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sd-chrome)" opacity=".85"/>`;
// a lamp: bezel, coloured glass, glow when on (k is a data key for the live state)
const led = (x, y, r, col, k = '', on = false) => `<g ${k ? `data-led="${k}" data-col="${col}"` : ''}><circle cx="${x}" cy="${y}" r="${r + 2.2}" fill="url(#sd-chrome)"/><circle cx="${x}" cy="${y}" r="${r + .6}" fill="#111"/><circle class="lit" cx="${x}" cy="${y}" r="${r}" fill="${on ? col : '#2a221c'}" ${on ? 'filter="url(#sd-glow)"' : ''}/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sd-ledglass)"/></g>`;
const vents = (x, y, w, h, n, vertical = false, col = '#0a0a0a') => { let s = ''; for (let i = 0; i < n; i++) { const p = i / n; s += vertical ? `<rect x="${x + p * w}" y="${y}" width="${w / n * .55}" height="${h}" rx="${w / n * .27}" fill="${col}" filter="url(#sd-innerS)"/>` : `<rect x="${x}" y="${y + p * h}" width="${w}" height="${h / n * .5}" rx="${h / n * .25}" fill="${col}" filter="url(#sd-innerS)"/>`; } return s; };
const grille = (x, y, w, h, pitch = 6, r = 1.6, col = '#151517') => { let s = ''; for (let yy = y; yy < y + h; yy += pitch) for (let xx = x + ((yy - y) / pitch % 2) * pitch / 2; xx < x + w; xx += pitch) s += `<circle cx="${xx}" cy="${yy}" r="${r}" fill="${col}"/>`; return s; };
// a knob seen from the front: skirt, knurled cap, pointer
function knob(x, y, r, cap = 'url(#sd-blackknob)', k = '', act = '', ticks = 28) {
  let s = `<g ${act ? `data-act="${act}"` : ''}><circle cx="${x}" cy="${y + 2.4}" r="${r + 2}" fill="rgba(0,0,0,.5)"/><circle cx="${x}" cy="${y}" r="${r + 2}" fill="url(#sd-chromeV)"/><g ${k ? `data-rot="${k}"` : ''} transform="translate(${x},${y})"><circle r="${r}" fill="${cap}"/>`;
  for (let i = 0; i < ticks; i++) { const a = i / ticks * 6.283; s += `<line x1="${Math.cos(a) * r * .86}" y1="${Math.sin(a) * r * .86}" x2="${Math.cos(a) * r}" y2="${Math.sin(a) * r}" stroke="rgba(255,255,255,.12)" stroke-width="1.4"/>`; }
  return s + `<circle r="${r * .62}" fill="${cap}" stroke="rgba(255,255,255,.08)"/><rect x="-1.4" y="${-r * .9}" width="2.8" height="${r * .5}" rx="1" fill="#f2efe6"/></g></g>`;
}
// a toggle switch seen from the front: nut, bat up or down
function toggle(x, y, k, act, label, lc = '#222', lf = 'Share Tech Mono') {
  return `<g data-act="${act}"><polygon points="${[0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * 6.283 + .52; return `${x + Math.cos(a) * 11},${y + Math.sin(a) * 11}`; }).join(' ')}" fill="url(#sd-chrome)" stroke="rgba(0,0,0,.4)"/><circle cx="${x}" cy="${y}" r="6" fill="#2a2a2e"/>
    <g data-bat="${k}" transform="translate(${x},${y})"><rect x="-3.2" y="-19" width="6.4" height="19" rx="3.2" fill="url(#sd-chromeV)" stroke="rgba(0,0,0,.35)" stroke-width=".6"/><circle cx="0" cy="-19" r="4.4" fill="url(#sd-chrome)"/></g>
    ${label ? T(label, x + 18, y + 3, 8, lc, lf, 'letter-spacing="1"') : ''}</g>`;
}
// a push key: shadow, cap with a gradient, legend; k lights its lamp
function key(x, y, w, h, label, cap, act, legend = '#1d1b17', r = 3, font = 'Share Tech Mono', size = 9, lampKey = '') {
  const [g, gd] = lg([[0, cap[0]], [1, cap[1]]]);
  return `<g data-act="${act}"><defs>${gd}</defs><rect x="${x}" y="${y + 2.4}" width="${w}" height="${h}" rx="${r}" fill="rgba(0,0,0,.55)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${g})"/><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h * .35}" rx="${r - .5}" fill="rgba(255,255,255,.22)"/><rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="url(#sd-edge)"/>
    ${T(label, x + w / 2, y + h / 2 + size * .36, size, legend, font, 'text-anchor="middle" font-weight="700" letter-spacing=".6"')}${lampKey ? led(x + w - 7, y + 7, 2.2, '#ffb21e', lampKey) : ''}</g>`;
}
const overlay = (shape, filter, op, blend = 'multiply') => { const c = id('c'); return `<clipPath id="${c}">${shape}</clipPath><rect x="0" y="0" width="500" height="420" filter="url(#sd-${filter})" pointer-events="none" clip-path="url(#${c})" opacity="${op}" style="mix-blend-mode:${blend}"/>`; };

// ---------- the seven shells (500 × 420, screen [x, y, w, h, radius], glass crt or flat) ----------
export const SHELLS = [
  { id: 'A', name: 'MISK/OS 6000', note: 'industrial sci-fi console', screen: [44, 62, 412, 254, 10], glass: 'crt', svg: () => {
    const [b, bd] = lg([[0, '#e4dcc7'], [.5, '#d2c9b1'], [1, '#b9af95']]);
    let s = `<defs>${bd}</defs>` + plate(0, 0, 500, 420, 8, `url(#${b})`);
    // panel seams and a darker lower band
    s += `<rect x="0" y="336" width="500" height="84" fill="rgba(80,70,50,.12)"/><line x1="0" y1="336" x2="500" y2="336" stroke="rgba(0,0,0,.35)"/><line x1="0" y1="337" x2="500" y2="337" stroke="rgba(255,255,255,.5)"/>`;
    s += engrave('MISK/OS 6000', 22, 30, 15, '#2a261e', 'Chakra Petch', 'font-weight="700" letter-spacing="3"') + engrave('INTERFACE 2037', 178, 29, 8, '#5a5446', 'Share Tech Mono', 'letter-spacing="1.6"');
    s += led(420, 25, 3.2, '#ffb21e', 'power') + led(436, 25, 3.2, '#5dff6a', 'power') + led(452, 25, 3.2, '#ff3b2a', 'override') + led(468, 25, 3.2, '#ffb21e', 'lock');
    s += `<rect x="20" y="40" width="460" height="290" rx="20" fill="#1a1916"/><rect x="20.5" y="40.5" width="459" height="289" rx="20" fill="none" stroke="url(#sd-edgeIn)" stroke-width="1.5"/>` + well(30, 50, 440, 276, 16, 12, '#030303', '#3a3832');
    // key row
    s += vents(22, 352, 46, 52, 7, false, '#2d2a24');
    s += key(82, 352, 56, 40, 'PWR', ['#f5944a', '#d0631d'], 'power', '#1a0d03', 3, 'Share Tech Mono', 10, 'power');
    s += key(146, 352, 56, 40, 'FULL', ['#f6f1e4', '#d8d1be'], 'fs');
    s += key(210, 352, 56, 40, '◀ VIEW', ['#a29d91', '#7d786c'], 'prev', '#f4f0e6');
    s += key(274, 352, 56, 40, 'VIEW ▶', ['#a29d91', '#7d786c'], 'next', '#f4f0e6');
    s += key(338, 352, 56, 40, 'LOCK', ['#f6f1e4', '#d8d1be'], 'lock', '#1d1b17', 3, 'Share Tech Mono', 9, 'lock');
    // guarded override toggle
    s += `<rect x="408" y="346" width="72" height="62" rx="4" fill="#4a463c"/><rect x="408.5" y="346.5" width="71" height="61" rx="4" fill="none" stroke="url(#sd-edge)"/>` + toggle(444, 384, 'override', 'override', '');
    s += `<g data-guard="override"><path d="M 420 352 h 48 v 30 q 0 6 -6 6 h -36 q -6 0 -6 -6 Z" fill="rgba(214,40,30,.82)" stroke="rgba(90,10,5,.8)"/><rect x="424" y="356" width="40" height="6" rx="2" fill="rgba(255,255,255,.25)"/></g>`;
    s += T('OVRD VISUAL', 444, 416, 7, '#2a2620', 'Share Tech Mono', 'text-anchor="middle" letter-spacing="1"');
    s += T('CAUTION · SOUL SIGNAL · DO NOT OBSTRUCT', 82, 408, 6.5, '#7a5a2a', 'Share Tech Mono', 'letter-spacing="1.2"');
    s += overlay(`<rect x="0" y="0" width="500" height="420"/>`, 'grain', .22) + overlay(`<rect x="0" y="330" width="500" height="90"/>`, 'grime', .35);
    s += screw(10, 10) + screw(490, 10) + screw(10, 410) + screw(490, 410);
    return s;
  } },
  { id: 'B', name: 'Unified terminal', note: 'wasteland terminal, rusted steel', mono: true, screen: [62, 66, 376, 238, 30], glass: 'crt', svg: () => {
    const [b, bd] = lg([[0, '#7e866e'], [.55, '#626a55'], [1, '#4b5243']]);
    let s = `<defs>${bd}</defs>` + plate(0, 0, 500, 420, 22, `url(#${b})`);
    // the hood: a thick frame around the tube, with a lip
    const [h, hd] = lg([[0, '#4f5646'], [1, '#353a2f']]);
    s += `<defs>${hd}</defs><rect x="26" y="26" width="448" height="314" rx="44" fill="url(#${h})" filter="url(#sd-drop)"/><rect x="26.5" y="26.5" width="447" height="313" rx="44" fill="none" stroke="url(#sd-edge)" stroke-width="2"/>`;
    s += well(42, 44, 416, 278, 38, 16, '#060706', '#3d4434');
    // nameplate
    s += `<rect x="150" y="6" width="200" height="18" rx="3" fill="#c9b680" filter="url(#sd-drop)"/><rect x="150.5" y="6.5" width="199" height="17" rx="3" fill="none" stroke="url(#sd-edge)"/>` + engrave('MISK UNIFIED OS · MOD. 59', 250, 19, 9, '#2c2412', 'Chakra Petch', 'text-anchor="middle" font-weight="700" letter-spacing="2"', 'rgba(255,255,240,.5)') + rivet(156, 15, 2) + rivet(344, 15, 2);
    // control strip
    s += `<rect x="26" y="352" width="448" height="58" rx="10" fill="#2f3428"/><rect x="26" y="352" width="448" height="58" rx="10" fill="none" stroke="url(#sd-edgeIn)"/>`;
    s += knob(70, 381, 17, 'url(#sd-bakelite)', 'view', 'prev') + T('VIEW −', 70, 407, 8, '#d8cfaf', 'Special Elite', 'text-anchor="middle"');
    s += toggle(140, 388, 'lock', 'lock', 'HOLD', '#d8cfaf', 'Special Elite');
    s += `<g data-act="power"><circle cx="250" cy="381" r="22" fill="url(#sd-chromeV)"/><circle cx="250" cy="381" r="17" fill="#3a0a05"/><circle data-led="power" data-col="#ff4a2a" class="lit" cx="250" cy="381" r="15" fill="#7a1408"/><circle cx="244" cy="375" r="6" fill="rgba(255,255,255,.35)"/></g>`;
    s += toggle(352, 388, 'override', 'override', 'PATCH', '#d8cfaf', 'Special Elite');
    s += knob(430, 381, 17, 'url(#sd-bakelite)', 'view', 'next') + T('VIEW +', 430, 407, 8, '#d8cfaf', 'Special Elite', 'text-anchor="middle"');
    s += key(192, 368, 26, 26, '⛶', ['#ddd6bc', '#a59e84'], 'fs', '#2a2414', 4, 'Space Grotesk', 13) + led(300, 381, 4, '#ff9a1e', 'override');
    // tape label
    s += `<g transform="rotate(4 420 30)"><path d="M 372 20 L 466 22 L 468 40 L 370 39 Z" fill="rgba(232,218,165,.94)"/>` + T('don\'t unplug — R.', 378, 34, 11, '#3a2a10', 'Special Elite') + `</g>`;
    s += overlay(`<rect x="0" y="0" width="500" height="420" rx="22"/>`, 'grime', .95) + overlay(`<rect x="0" y="0" width="500" height="420" rx="22"/>`, 'rust', .7) + overlay(`<rect x="0" y="0" width="500" height="420" rx="22"/>`, 'grain', .35) + overlay(`<rect x="0" y="0" width="500" height="420" rx="22"/>`, 'scratch', .25, 'screen');
    s += `<rect x="1" y="1" width="498" height="418" rx="22" fill="none" stroke="rgba(230,225,200,.35)" stroke-width="1.6" stroke-dasharray="30 9 6 14 44 6 12 20"/>`;
    s += rivet(14, 50) + rivet(14, 300) + rivet(486, 50) + rivet(486, 300) + rivet(50, 346) + rivet(450, 346);
    return s;
  } },
  { id: 'C', name: 'Wrist-Link', note: 'wrist computer panel, gauge and wheel', mono: true, screen: [36, 58, 318, 236, 22], glass: 'crt', svg: () => {
    const [b, bd] = lg([[0, '#5d6058'], [.5, '#44463f'], [1, '#2c2d28']]);
    let s = `<defs>${bd}</defs>` + plate(0, 0, 500, 420, 30, `url(#${b})`);
    // ribbed top and bottom bands
    for (let i = 0; i < 4; i++) s += `<rect x="40" y="${8 + i * 7}" width="420" height="3" rx="1.5" fill="rgba(0,0,0,.35)"/><rect x="40" y="${11 + i * 7}" width="420" height="1" fill="rgba(255,255,255,.12)"/>`;
    s += `<rect x="18" y="40" width="354" height="272" rx="34" fill="#141512" filter="url(#sd-drop)"/>` + well(24, 46, 342, 260, 30, 12, '#030303', '#34352f');
    // right column: gauge, model plate, big knob
    s += `<circle cx="428" cy="98" r="44" fill="url(#sd-chromeV)"/><circle cx="428" cy="98" r="38" fill="#111"/><circle cx="428" cy="98" r="35" fill="#efe6cf"/>`;
    s += `<path d="M 401 112 A 30 30 0 0 1 412 72" stroke="#c43a2a" stroke-width="7" fill="none"/>`;
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (.8 + i * .117); s += `<line x1="${428 + Math.cos(a) * 25}" y1="${102 + Math.sin(a) * 25}" x2="${428 + Math.cos(a) * (i % 3 ? 29 : 31)}" y2="${102 + Math.sin(a) * (i % 3 ? 29 : 31)}" stroke="#333" stroke-width="${i % 3 ? 1 : 1.6}"/>`; }
    s += T('SIGNAL', 428, 124, 7, '#555', 'Michroma', 'text-anchor="middle"') + `<g data-needle transform="translate(428,104)"><line x1="0" y1="0" x2="0" y2="-28" stroke="#1a1a1a" stroke-width="2"/><circle r="4" fill="#222"/></g><circle cx="428" cy="98" r="35" fill="url(#sd-ledglass)" opacity=".6"/>`;
    s += `<rect x="388" y="152" width="80" height="34" rx="4" fill="#26271f"/>` + engrave('WRIST-LINK', 428, 168, 10, '#d8d4c4', 'Michroma', 'text-anchor="middle" font-style="italic"', 'rgba(0,0,0,.6)') + T('MODEL 59', 428, 181, 7, '#9a9888', 'Share Tech Mono', 'text-anchor="middle" letter-spacing="1.5"');
    s += knob(428, 236, 32, 'url(#sd-blackknob)', 'view', 'next', 36) + T('VIEW', 428, 284, 8, '#c8c4b4', 'Michroma', 'text-anchor="middle"');
    s += `<g data-act="prev"><rect x="378" y="226" width="12" height="20" rx="3" fill="transparent"/></g>`;
    // tuning wheel on the right edge = override
    s += `<g data-act="override"><rect x="482" y="186" width="16" height="104" rx="5" fill="#1b1b18"/>`; for (let i = 0; i < 18; i++) s += `<rect x="484" y="${190 + i * 5.6}" width="12" height="2.4" rx="1" fill="#b9a878"/>`; s += `</g>` + T('PATCH', 470, 302, 6, '#9a9888', 'Michroma');
    // rubber tabs under the screen
    [['POWER', 'power'], ['FULL', 'fs'], ['◀ VIEW', 'prev'], ['HOLD', 'lock']].forEach(([l, a], i) => { s += `<g data-act="${a}"><rect x="${36 + i * 82}" y="${330 + 2.4}" width="70" height="30" rx="8" fill="rgba(0,0,0,.6)"/><rect x="${36 + i * 82}" y="330" width="70" height="30" rx="8" fill="url(#sd-rubber)"/><rect x="${40 + i * 82}" y="332" width="62" height="8" rx="4" fill="rgba(255,255,255,.1)"/>` + T(l, 71 + i * 82, 349, 9, '#d8d4c4', 'Michroma', 'text-anchor="middle"') + `</g>`; });
    s += led(52, 384, 6, '#ff9a1e', 'power') + led(80, 384, 4, '#5dff6a', 'lock') + led(100, 384, 4, '#ff3b2a', 'override');
    s += engrave('PROPERTY OF MISK SHELTER 06', 270, 396, 10, 'rgba(8,8,6,.92)', 'Michroma', 'text-anchor="middle" letter-spacing="1.5"', 'rgba(255,255,255,.18)');
    s += overlay(`<rect x="0" y="0" width="500" height="420" rx="30"/>`, 'brushed', .5, 'overlay') + overlay(`<rect x="0" y="0" width="500" height="420" rx="30"/>`, 'grime', .55) + overlay(`<rect x="0" y="0" width="500" height="420" rx="30"/>`, 'scratch', .2, 'screen');
    s += screw(16, 16, 3.6) + screw(484, 16, 3.6) + screw(16, 404, 3.6) + screw(484, 404, 3.6);
    return s;
  }, anim: (t, el) => { const n = el.querySelector('[data-needle]'); if (n) n.setAttribute('transform', `translate(428,104) rotate(${-55 + 85 * (.5 + .5 * Math.sin(t * 1.6)) + Math.sin(t * 17) * 2.5})`); } },
  { id: 'D', name: 'Deck console', note: 'starship console, pill keys', screen: [96, 46, 380, 236, 4], glass: 'flat', svg: () => {
    const [b, bd] = lg([[0, '#e8ebef'], [.45, '#c9ced5'], [1, '#a2a8b1']]);
    let s = `<defs>${bd}</defs>` + plate(0, 0, 500, 420, 26, `url(#${b})`);
    s += `<rect x="16" y="16" width="468" height="290" rx="16" fill="#050506"/><rect x="16.5" y="16.5" width="467" height="289" rx="16" fill="none" stroke="url(#sd-edgeIn)" stroke-width="1.4"/>`;
    // console frame printed on the glass around the picture
    const O = '#f2a65a', L = '#c9a0dc', B = '#9cc4ff', R = '#e7666a';
    s += `<path d="M 26 40 a 16 16 0 0 1 16 -16 h 44 v 16 h -24 a 8 8 0 0 0 -8 8 v 230 a 8 8 0 0 0 8 8 h 24 v 10 h -44 a 16 16 0 0 1 -16 -16 Z" fill="${O}"/>`;
    s += `<rect x="26" y="70" width="28" height="56" fill="${L}"/><rect x="26" y="130" width="28" height="26" fill="${B}"/><rect x="26" y="160" width="28" height="70" fill="${O}"/><rect x="26" y="234" width="28" height="30" fill="${R}"/>`;
    s += `<rect x="92" y="286" width="150" height="10" rx="5" fill="${B}"/><rect x="246" y="286" width="90" height="10" rx="5" fill="${O}"/><rect x="340" y="286" width="134" height="10" rx="5" fill="${L}"/>`;
    s += `<rect x="92" y="24" width="190" height="14" rx="7" fill="${L}"/><rect x="286" y="24" width="70" height="14" rx="7" fill="${O}"/><rect x="360" y="24" width="114" height="14" rx="7" fill="${B}"/>`;
    s += T('SOUL', 30, 64, 11, '#050505', 'Antonio', 'font-weight="700"') + T('47', 34, 152, 10, '#050505', 'Antonio', 'font-weight="700"') + T('1701', 30, 226, 10, '#050505', 'Antonio', 'font-weight="700"');
    // pill keys with legends above
    const keys = [['POWER', 'power', O], ['FULL', 'fs', B], ['◀ VIEW', 'prev', L], ['VIEW ▶', 'next', L], ['LOCK', 'lock', B], ['OVERRIDE', 'override', R]];
    keys.forEach(([l, a, c], i) => {
      const x = 30 + i * 76;
      s += `<rect x="${x}" y="318" width="64" height="12" rx="6" fill="${c}"/>` + T(l, x + 32, 328, 9, '#050505', 'Antonio', 'text-anchor="middle" font-weight="700" letter-spacing=".8"');
      s += `<g data-act="${a}"><rect x="${x + 6}" y="${338 + 3}" width="52" height="66" rx="24" fill="rgba(0,0,0,.4)"/><rect x="${x + 6}" y="338" width="52" height="66" rx="24" fill="#0b0b0d"/><rect x="${x + 12}" y="342" width="16" height="50" rx="8" fill="rgba(255,255,255,.13)"/><rect data-led="${a}" data-col="${c}" data-mode="stroke" x="${x + 7}" y="339" width="50" height="64" rx="23" fill="none" stroke="transparent" stroke-width="2"/></g>`;
    });
    s += overlay(`<rect x="0" y="0" width="500" height="420" rx="26"/>`, 'brushed', .3, 'overlay') + overlay(`<rect x="0" y="0" width="500" height="420" rx="26"/>`, 'grain', .08);
    return s;
  } },
  { id: 'E', name: 'MiskVision', note: '2000s CRT monitor', screen: [56, 52, 388, 260, 16], glass: 'crt', svg: () => {
    const [b, bd] = lg([[0, '#e6e8eb'], [.5, '#c8cbd0'], [1, '#a8acb2']]);
    let s = `<defs>${bd}</defs>` + plate(0, 0, 500, 420, 18, `url(#${b})`);
    // a soft rounded bezel around the tube, then the dark inner bezel
    const [c, cd] = lg([[0, '#f5f6f8'], [1, '#b4b8be']]);
    s += `<defs>${cd}</defs><rect x="14" y="12" width="472" height="336" rx="22" fill="url(#${c})"/><rect x="14.5" y="12.5" width="471" height="335" rx="22" fill="none" stroke="url(#sd-edge)" stroke-width="1.6"/>`;
    s += `<rect x="30" y="26" width="440" height="310" rx="18" fill="#2b2d31"/>` + well(36, 32, 428, 298, 18, 14, '#0c0d0f', '#55585e', '#000');
    // chin
    s += engrave('MISKVISION', 30, 378, 15, '#3a3d44', 'Space Grotesk', 'font-weight="700" letter-spacing="3"') + T('PureFlat 17"', 160, 378, 11, '#5a5e66', 'Space Grotesk', 'font-style="italic"');
    s += grille(30, 392, 110, 18, 5, 1.3, '#6a6e75');
    const btn = (x, l, a) => `<g data-act="${a}"><rect x="${x}" y="${366 + 1.6}" width="30" height="16" rx="8" fill="rgba(0,0,0,.35)"/><rect x="${x}" y="366" width="30" height="16" rx="8" fill="url(#sd-chromeV)" opacity=".9"/><rect x="${x + 1}" y="366.5" width="28" height="7" rx="4" fill="rgba(255,255,255,.4)"/>${T(l, x + 15, 397, 7, '#4a4e56', 'Space Grotesk', 'text-anchor="middle" font-weight="600"')}</g>`;
    s += btn(250, 'VIEW ◂', 'prev') + btn(288, 'VIEW ▸', 'next') + btn(326, 'HOLD', 'lock') + btn(364, 'INPUT', 'override') + btn(402, 'FULL', 'fs');
    s += `<g data-act="power"><circle cx="458" cy="374" r="13" fill="rgba(0,0,0,.3)"/><circle cx="458" cy="372" r="13" fill="url(#sd-chromeV)"/><circle cx="458" cy="372" r="9" fill="#d9dce0"/>${T('⏻', 458, 377, 11, '#4a4e56', 'Space Grotesk', 'text-anchor="middle"')}</g>` + led(438, 398, 2.6, '#2a8cff', 'power') + T('POWER', 458, 400, 6, '#4a4e56', 'Space Grotesk', 'text-anchor="middle"');
    s += `<rect x="372" y="20" width="76" height="0" fill="none"/><g transform="rotate(-3 410 362)"><rect x="196" y="388" width="48" height="16" rx="2" fill="#9fe0a8"/>${T('ECO SAVER', 220, 399, 6.5, '#0b4a1a', 'Space Grotesk', 'text-anchor="middle" font-weight="700"')}</g>`;
    s += overlay(`<rect x="0" y="0" width="500" height="420" rx="18"/>`, 'grain', .1);
    return s;
  } },
  { id: 'F', name: 'Pro monitor', note: 'broadcast monitor, tally and button panel', screen: [58, 46, 384, 252, 18], glass: 'crt', svg: () => {
    const [b, bd] = lg([[0, '#c9cbce'], [.6, '#b1b3b7'], [1, '#97999d']]);
    let s = `<defs>${bd}</defs>` + plate(0, 0, 500, 420, 6, `url(#${b})`);
    s += `<rect x="18" y="14" width="464" height="318" rx="6" fill="#1b1c20"/>` + well(24, 20, 452, 306, 6, 22, '#08090b', '#3b3d42', '#000');
    // tally lamp and a brand line
    s += `<g data-led="override" data-col="#ff2a1a" data-mode="tally"><rect x="230" y="2" width="40" height="9" rx="2" fill="#3a0a06"/></g>` + engrave('MISK', 26, 352, 12, '#2a2c30', 'Space Grotesk', 'font-weight="700" letter-spacing="4"') + T('PRO VIDEO MONITOR · PVM 14', 84, 351, 7, '#3a3c40', 'Space Grotesk', 'letter-spacing="1.5"');
    // control panel with small rectangular keys and their labels
    s += `<rect x="18" y="360" width="464" height="52" rx="3" fill="#a3a5a9"/><rect x="18" y="360" width="464" height="52" rx="3" fill="none" stroke="url(#sd-edgeIn)"/>`;
    s += grille(28, 368, 110, 38, 5, 1.3, '#5a5c60');
    const k = (x, y, l, a, lamp) => `<g data-act="${a}"><rect x="${x}" y="${y + 1.4}" width="26" height="12" rx="1.5" fill="rgba(0,0,0,.4)"/><rect x="${x}" y="${y}" width="26" height="12" rx="1.5" fill="#e6e7e9"/><rect x="${x + 1}" y="${y + .6}" width="24" height="4" fill="rgba(255,255,255,.6)"/>${lamp ? `<rect data-led="${lamp}" data-col="#ffb21e" class="lit" x="${x + 9}" y="${y + 4}" width="8" height="3" fill="#7a6a4a"/>` : ''}</g>${T(l, x + 13, y + 22, 5.6, '#2a2c30', 'Space Grotesk', 'text-anchor="middle" font-weight="600"')}`;
    s += k(152, 366, 'VIEW −', 'prev') + k(184, 366, 'VIEW +', 'next') + k(216, 366, 'HOLD', 'lock', 'lock') + k(248, 366, 'EXT', 'override', 'override') + k(280, 366, 'FULL', 'fs');
    ['CHROMA', 'PHASE', 'CONTR', 'BRIGHT'].forEach((l, i) => { s += knob(328 + i * 28, 378, 7, 'url(#sd-blackknob)', '', '', 14) + T(l, 328 + i * 28, 404, 5, '#2a2c30', 'Space Grotesk', 'text-anchor="middle"'); });
    s += `<g data-act="power"><rect x="448" y="366" width="24" height="26" rx="2" fill="#2a2c30"/><rect x="450" y="368" width="20" height="11" fill="#55585e"/></g>` + led(460, 400, 2.6, '#5dff5d', 'power') + T('POWER', 460, 362, 5.6, '#2a2c30', 'Space Grotesk', 'text-anchor="middle"');
    s += overlay(`<rect x="0" y="0" width="500" height="420"/>`, 'brushed', .35, 'overlay') + overlay(`<rect x="0" y="0" width="500" height="420"/>`, 'grain', .12);
    s += screw(8, 8, 3) + screw(492, 8, 3) + screw(8, 412, 3) + screw(492, 412, 3);
    return s;
  } },
  { id: 'G', name: 'Electronic Brain 1958', note: 'mid-century home computer, two tone', screen: [40, 46, 290, 232, 52], glass: 'crt', svg: () => {
    const [c, cd] = lg([[0, '#f6eed8'], [1, '#e2d6b6']]), [tl, td] = lg([[0, '#a4cec6'], [1, '#79a69e']]);
    let s = `<defs>${cd}${td}</defs>` + plate(0, 0, 500, 420, 22, `url(#${c})`);
    s += `<rect x="0" y="318" width="500" height="102" rx="0" fill="url(#${tl})"/><path d="M 0 318 h 500 v 80 q 0 22 -22 22 h -456 q -22 0 -22 -22 Z" fill="url(#${tl})"/>`;
    s += `<rect x="0" y="312" width="500" height="8" fill="url(#sd-chromeV)"/><rect x="0" y="312" width="500" height="2" fill="rgba(255,255,255,.7)"/>`;
    // TV tube surround
    s += `<rect x="18" y="22" width="334" height="280" rx="70" fill="#d8cca8"/><rect x="18.5" y="22.5" width="333" height="279" rx="70" fill="none" stroke="url(#sd-edge)" stroke-width="2"/>` + well(28, 32, 314, 260, 62, 14, '#2a2418', '#a69a78', '#000');
    // right column: meter, piano keys, dial
    s += `<rect x="372" y="26" width="108" height="40" rx="5" fill="#2a2a24"/><rect x="378" y="32" width="96" height="28" rx="2" fill="#0f1a12"/>`;
    s += `<g data-meter><rect x="378" y="32" width="96" height="28" fill="#7dd38a" opacity=".85"/>` + T('ON AIR', 426, 51, 12, '#0f2a14', 'Oswald', 'text-anchor="middle" font-weight="600" letter-spacing="2"') + `</g>`;
    [['POWER', 'power', '#c43a2a'], ['VIEW ◂', 'prev'], ['VIEW ▸', 'next'], ['HOLD', 'lock'], ['FULL', 'fs']].forEach(([l, a, cc], i) => {
      const y = 82 + i * 30;
      s += `<g data-act="${a}"><rect x="372" y="${y + 2.4}" width="108" height="22" rx="3" fill="rgba(0,0,0,.35)"/><rect x="372" y="${y}" width="108" height="22" rx="3" fill="#fbf6e6"/><rect x="373" y="${y + 1}" width="106" height="7" rx="2" fill="rgba(255,255,255,.8)"/><rect x="376" y="${y + 6}" width="10" height="10" rx="2" fill="${cc || '#d9cdab'}"/>${T(l, 434, y + 15, 9, '#4a3f28', 'Oswald', 'text-anchor="middle" font-weight="500" letter-spacing="1.5"')}</g>`;
    });
    s += knob(426, 268, 26, 'url(#sd-chrome)', 'src', 'override', 32) + T('DISPLAY', 392, 236, 6.5, '#6a5f45', 'Oswald', 'text-anchor="middle"') + T('STAGE', 462, 236, 6.5, '#6a5f45', 'Oswald', 'text-anchor="middle"');
    s += `<rect x="26" y="332" width="200" height="72" rx="6" fill="#5f8a82"/>`; for (let i = 0; i < 22; i++) s += `<rect x="${34 + i * 8.6}" y="340" width="4" height="56" rx="2" fill="#3c625c" filter="url(#sd-innerS)"/>`;
    s += engrave('MISK · ELECTRONIC BRAIN', 360, 362, 11, '#22423d', 'Michroma', 'text-anchor="middle" letter-spacing="1"', 'rgba(255,255,255,.35)') + T('MODEL 1958 · SOUL RECEIVER', 360, 380, 7, '#2e5650', 'Michroma', 'text-anchor="middle" letter-spacing="1.5"');
    s += led(300, 398, 4, '#ff9a1e', 'power') + led(320, 398, 4, '#5dff6a', 'lock') + led(340, 398, 4, '#ff3b2a', 'override');
    s += overlay(`<rect x="0" y="0" width="500" height="420" rx="22"/>`, 'grain', .14) + overlay(`<rect x="0" y="0" width="500" height="420" rx="22"/>`, 'grime', .2);
    return s;
  } },
];


// ---------- extra details, drawn over each shell ----------
const stencil = (s, x, y, size, fill, ex = '') => T(s, x, y, size, fill, 'Special Elite', ex);
const chips = (pts, col = '#a8a898') => pts.map(([x, y, r]) => `<path d="M ${x - r} ${y} q ${r * .4} ${-r * .9} ${r} ${-r * .7} q ${r * .8} ${r * .1} ${r} ${r * .8} q ${-r * .3} ${r * .9} ${-r * 1.1} ${r * .6} q ${-r * .7} ${-r * .2} ${-r * .9} ${-r * .7} Z" fill="${col}" opacity=".55"/>`).join('');
export const DETAILS = {
  A: () => {
    let s = `<rect x="24" y="44" width="452" height="282" rx="18" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="2"/>`;
    // signal bar in the title strip
    s += `<rect x="338" y="18" width="70" height="12" rx="2" fill="#16140f"/>`; for (let i = 0; i < 10; i++) s += `<rect data-vu="${i}" x="${341 + i * 6.6}" y="21" width="4.6" height="6" fill="#3a3220"/>`;
    // labels over the key groups, hazard band on the override box
    s += T('PRIMARY', 110, 347, 6, '#6a604a', 'Share Tech Mono', 'text-anchor="middle" letter-spacing="1.4"') + `<line x1="146" y1="345" x2="330" y2="345" stroke="#8a806a" stroke-width=".8"/>` + T('DISPLAY', 238, 347, 6, '#6a604a', 'Share Tech Mono', 'text-anchor="middle" letter-spacing="1.4" style="paint-order:stroke" stroke="#d2c9b1" stroke-width="4"');
    s += T('MEM', 366, 347, 6, '#6a604a', 'Share Tech Mono', 'text-anchor="middle" letter-spacing="1.4"');
    s += ``;
    for (let i = 0; i < 10; i++) s += `<path d="M ${408 + i * 8} 351 l 4 -5 h 4 l -4 5 Z" fill="${i % 2 ? '#111' : '#e6b400'}"/>`;
    s += `<rect x="20" y="331" width="54" height="0"/>` + `<rect x="430" y="402" width="0" height="0"/>`;
    s += `<rect x="20" y="394" width="0" height="0"/>` + T('S/N 6000-0412', 22, 418, 5.5, '#7a7058', 'Share Tech Mono', 'letter-spacing="1"');
    return s;
  },
  B: () => {
    let s = chips([[8, 120, 7], [492, 210, 9], [30, 404, 8], [470, 24, 6], [250, 344, 5], [120, 412, 6], [400, 412, 7]]);
    s += stencil('T-59', 40, 338, 13, 'rgba(230,220,180,.35)', 'letter-spacing="2"') + stencil('NO STEP', 400, 338, 8, 'rgba(230,220,180,.3)');
    // weld seam under the hood
    s += `<path d="M 60 344 ${Array.from({ length: 38 }, (_, i) => `q 5 ${i % 2 ? 3 : -3} 10 0`).join(' ')}" fill="none" stroke="rgba(30,25,15,.45)" stroke-width="2.4"/>`;
    // small signal dial in the top left corner
    s += `<circle cx="54" cy="15" r="10" fill="url(#sd-chromeV)"/><circle cx="54" cy="15" r="8" fill="#e8dcb8"/><g data-dial transform="translate(54,18)"><line x1="0" y1="0" x2="0" y2="-8" stroke="#222" stroke-width="1.2"/></g>` + T('SIG', 68, 18, 6, '#d8cfaf', 'Special Elite');
    return s;
  },
  C: () => {
    let s = '';
    'ABCDEFGHIJ'.split('').forEach((l, i) => { const a = (-90 + i * 36) * Math.PI / 180; s += T(l, 428 + Math.cos(a) * 44, 239 + Math.sin(a) * 44, 7, '#c8c4b4', 'Michroma', 'text-anchor="middle"'); });
    s += screw(32, 54, 2.6) + screw(358, 54, 2.6) + screw(32, 298, 2.6) + screw(358, 298, 2.6);
    s += `<rect x="388" y="300" width="80" height="14" rx="2" fill="#1f201b"/>` + T('SN 59-0612', 428, 310, 6.5, '#9a9888', 'Share Tech Mono', 'text-anchor="middle" letter-spacing="1"');
    return s;
  },
  D: () => {
    let s = T('SOUL ANALYSIS', 466, 35, 9, '#050505', 'Antonio', 'text-anchor="end" font-weight="700" letter-spacing="1"') + T('03-118', 238, 295, 8, '#050505', 'Antonio', 'text-anchor="end" font-weight="700"');
    s += `<text data-num x="470" y="295" font-family="Antonio" font-size="8" font-weight="700" fill="#050505" text-anchor="end">47.0612</text>`;
    for (let i = 0; i < 14; i++) s += `<rect x="3" y="${110 + i * 12}" width="7" height="6" rx="2" fill="rgba(0,0,0,.18)"/><rect x="490" y="${110 + i * 12}" width="7" height="6" rx="2" fill="rgba(0,0,0,.18)"/>`;
    return s;
  },
  E: () => {
    let s = `<g transform="rotate(2 420 30)"><rect x="380" y="18" width="84" height="14" rx="2" fill="#f4f4f0" stroke="#bbb" stroke-width=".5"/>` + T('1280×1024 · 85 Hz', 422, 28, 6.5, '#333', 'Space Grotesk', 'text-anchor="middle" font-weight="600"') + `</g>`;
    s += T('MV-1702', 160, 392, 7, '#6a6e75', 'Space Grotesk', 'letter-spacing="1"') + `<rect x="18" y="352" width="464" height="1" fill="rgba(0,0,0,.12)"/><rect x="18" y="353" width="464" height="1" fill="rgba(255,255,255,.5)"/>`;
    s += `<circle cx="20" cy="406" r="3" fill="#9da1a8"/><circle cx="480" cy="406" r="3" fill="#9da1a8"/>`;
    return s;
  },
  F: () => {
    let s = '';
    for (const x of [0, 486]) { s += `<rect x="${x}" y="0" width="14" height="420" fill="#a5a7ab"/><rect x="${x}" y="0" width="14" height="420" fill="none" stroke="url(#sd-edge)"/>`; for (const y of [40, 200, 360]) s += `<rect x="${x + 4}" y="${y}" width="6" height="18" rx="3" fill="#2a2c30" filter="url(#sd-innerS)"/>`; }
    s += T('TALLY', 280, 10, 5.5, '#3a3c40', 'Space Grotesk', 'letter-spacing="1"');
    for (const [x, y] of [[50, 36], [450, 36], [50, 306], [450, 306]]) s += `<path d="M ${x - 6} ${y} h 12 M ${x} ${y - 6} v 12" stroke="rgba(255,255,255,.25)" stroke-width=".8"/>`;
    return s;
  },
  G: () => {
    let s = `<rect x="19" y="23" width="332" height="278" rx="69" fill="none" stroke="#b8954a" stroke-width="2.2"/><rect x="19" y="23" width="332" height="278" rx="69" fill="none" stroke="rgba(255,240,200,.6)" stroke-width=".7"/>`;
    s += `<g transform="translate(240,358)">`; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, r = i % 2 ? 7 : 13; s += `<line x1="0" y1="0" x2="${Math.cos(a) * r}" y2="${Math.sin(a) * r}" stroke="#b8954a" stroke-width="1.4"/>`; } s += `<circle r="3" fill="#b8954a"/></g>`;
    s += `<g opacity=".35" style="mix-blend-mode:multiply"><clipPath id="sd-spkG"><rect x="26" y="332" width="200" height="72" rx="6"/></clipPath><rect x="0" y="0" width="500" height="420" filter="url(#sd-grain)" clip-path="url(#sd-spkG)"/></g>`;
    for (let i = 0; i <= 10; i++) { const a = (-150 + i * 30 - 90) * Math.PI / 180; s += `<line x1="${426 + Math.cos(a) * 31}" y1="${268 + Math.sin(a) * 31}" x2="${426 + Math.cos(a) * 35}" y2="${268 + Math.sin(a) * 35}" stroke="#6a5f45" stroke-width="1"/>`; }
    return s;
  },
};
export const DETAIL_ANIM = {
  A: (t, el) => { const lvl = Math.round(5 + 4 * Math.sin(t * 3.1) * Math.sin(t * 1.3)); el.querySelectorAll('[data-vu]').forEach(r => { const i = +r.dataset.vu; r.setAttribute('fill', i < lvl ? (i > 7 ? '#ff4a2a' : '#ffb21e') : '#3a3220'); }); },
  B: (t, el) => { const d = el.querySelector('[data-dial]'); if (d) d.setAttribute('transform', `translate(54,18) rotate(${-40 + 60 * (.5 + .5 * Math.sin(t * 2.3))})`); },
  D: (t, el) => { const n = el.querySelector('[data-num]'); if (n) n.textContent = (47 + (t % 100) / 100).toFixed(4); },
};


export const SHELL_IDS = SHELLS.map(s => s.id);
export const DEFAULT_SHELL = { neon: 'E', hw: 'A' };
let defsDone = false;
export function ensureDefs() {
  if (defsDone) return;
  defsDone = true;
  const d = document.createElement('div');
  d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs></svg>`;
  document.body.appendChild(d.firstChild);
}
// the markup of a shell (a fresh set of ids each time)
export function shellSvg(id) {
  uid = 0;
  const sh = SHELLS.find(s => s.id === id);
  return sh.svg() + (DETAILS[id] ? DETAILS[id]() : '');
}
