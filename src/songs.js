// Legge dal codice di un brano le righe SECTIONS e TEMPO e ne ricava la mappa per battuta.
// Il tempo lo cambia il player dall'esterno (scheduler.setCps al confine di battuta):
// un .cps() dentro il pattern sposterebbe le note già in coda e ne farebbe perdere alcune.

const ramp = (n, a, b) => Array.from({ length: n }, (_, i) => a + (b - a) * (i + 1) / n);
const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

export function parseSong(code) {
  // le righe usano apici singoli (vedi il brano): li convertiamo per JSON.parse
  const read = re => JSON.parse(code.match(re)[1].replace(/'/g, '"'));
  const sec = read(/const SECTIONS = (\[.*\])/);
  const tempo = read(/const TEMPO = (\{.*\})/);
  const bpm = [], sections = [];
  let start = 0;
  for (const [key, len] of sec) {
    // un numero è fisso, [da, a] è una rampa, [[battute, da, a], …] sono segmenti
    const v = tempo[key];
    bpm.push(...(!Array.isArray(v) ? Array(len).fill(v)
      : typeof v[0] === 'number' ? ramp(len, v[0], v[1])
      : v.flatMap(([k, a, b = a]) => ramp(k, a, b))));
    sections.push({ key, label: label(key), start, len });
    start += len;
  }
  const bars = start;
  // secondi trascorsi alla posizione "cyc" (in battute)
  const secondsAt = cyc => {
    const c = Math.max(0, Math.min(bars, cyc)), whole = Math.floor(c);
    let s = 0;
    for (let i = 0; i < whole; i++) s += 240 / bpm[i];
    if (whole < bars) s += (c - whole) * 240 / bpm[whole];
    return s;
  };
  const sectionAt = cyc => sections.findIndex(s => cyc >= s.start && cyc < s.start + s.len);
  const min = Math.round(Math.min(...bpm)), max = Math.round(Math.max(...bpm));
  return { sections, bpm, bars, secondsAt, sectionAt, seconds: secondsAt(bars), bpmLabel: min === max ? `${min}` : `${min}→${max}` };
}

export const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
