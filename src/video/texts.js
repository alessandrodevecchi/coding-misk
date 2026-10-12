// Texts for sharing (#57): a title and a description in the app's voice for a fragment, a long video or a recording.
// Built from what the timeline and the recipe hold (song titles and starts, genres, length, seed). No artist names: the
// artists are invented. The same seed gives the same texts. Pure: checked in Node (tools/check-clips.mjs).
import { stream } from '../endless/random.js';
import { clockOf } from './fragments.js';

export const MOOD = [
  'Music written as code, played by a machine with a human pulse.',
  'Every track grows from a seed and never plays the same way twice.',
  'Somewhere between the sunset and the scanlines, the groove finds its soul.',
  'Code taps the beat. The machine plays the strings.',
  'An endless radio, tuned to frequencies no one else is broadcasting.',
  'Neon sunsets, analog ghosts and a sequencer that never sleeps.',
  'Human and machine at the same desk, writing rhythm in plain text.',
  'Signals from a synth lab at the edge of the grid.',
  'The soul of a song, read one bar at a time.',
  'Patterns fold into patterns until the code starts to dance.',
  'Low light, warm tape, cold logic.',
  'No two sessions alike: the seed decides, the rhythm obeys.',
  'From the first kick to the last echo, every note is a line of code.',
];
const FRAGMENT_LINES = [
  'A fragment of the endless radio.',
  'A fragment of the song\'s soul, recovered from the tape.',
  'A few seconds of signal, pulled out of the noise.',
  'One shard of a longer transmission.',
  'A glimpse of the machine at work.',
];

const genreLine = genres => [...new Set((genres || []).filter(Boolean))].map(g => g.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' · ');
const minutes = s => `${Math.max(1, Math.round(s / 60))} min`;
// a chapter time: 03:25, or 0:03:25 when the video lasts an hour or more
const stamp = (s, long) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = String(Math.floor(s / 60) % 60).padStart(2, '0'), x = String(s % 60).padStart(2, '0'); return long ? `${h}:${m}:${x}` : `${m}:${x}`; };

// info: { kind: 'fragment' | 'video' | 'audio', title, songs: [{ title, start }], genres, seconds, seed,
//   fragment: { label, start, end }, fullLine, draw } → { title, description }
// draw: a number that changes the mood lines and the title (the panel's "draw again"), song list and facts stay
export function textsFor(info) {
  const r = stream(`${info.seed || 'coding-misk'}/${info.draw || 0}`, 'texts');
  const songs = info.songs || [], genres = genreLine(info.genres), long = (info.seconds || 0) >= 3600;
  const mood = r.shuffle(MOOD);
  let title, body = [];
  if (info.kind === 'fragment') {
    const f = info.fragment || {};
    const num = (String(f.label || '').match(/#\d+/) || [''])[0];
    title = r.pick([`Fragment ${num} · ${info.title}`, `${info.title} · fragment ${num}`, `Fragment ${num} · soul of ${info.title}`]).replace(/\s+·\s*$/, '').trim();
    body.push(r.pick(FRAGMENT_LINES));
    if (info.fullLine) body.push(info.fullLine);
    body.push('', mood[0]);
    if (f.label) body.push('', f.label);
  } else {
    const kind = songs.length > 1 ? r.pick(['Endless radio', 'Radio session', 'Live-coded session']) : (info.title || 'coding-misk');
    const parts = [kind];
    if (songs.length > 1 && genres) parts.push(genres.split(' · ').slice(0, 2).join(' & '));
    if (info.seconds) parts.push(minutes(info.seconds));
    title = parts.join(' · ');
    body.push(mood[0], mood[1]);
    if (songs.length > 1) body.push('', ...songs.map(s => `${stamp(s.start || 0, long)} ${s.title}`));
  }
  const facts = [genres, info.seconds ? `Length ${clockOf(info.seconds)}` : '', info.seed ? `Seed ${info.seed}` : ''].filter(Boolean);
  if (facts.length) body.push('', facts.join(' · '));
  body.push('', 'coding with rhythm · misk \'til dusk');
  return { title: title.slice(0, 100), description: body.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

// the text file saved next to a video or recording
export const textFile = t => `${t.title}\n\n${t.description}\n`;
