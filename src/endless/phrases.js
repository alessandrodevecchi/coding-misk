// Spoken comments of the endless director: a fixed pool of short phrases per kind of move,
// in English and Italian. `npm run voices` makes a sample for each (tools/voice.mjs).
// Keep them short: a few words, said over the music.
export const POOL = {
  'song-start': [['here we go', 'si parte'], ['new song', 'brano nuovo'], ['from scratch', 'da zero']],
  'song-end': [['winding down', 'chiudiamo'], ['last round', 'ultimo giro'], ['that was it', 'ed è finita']],
  'add-drums': [['more rhythm', 'più ritmo'], ['drums in', 'entra la batteria'], ['feel the beat', 'senti il battito']],
  'add-bass': [['need bass', 'serve il basso'], ['low end', 'giù in basso'], ['bass in', 'entra il basso']],
  'add-lead': [['melody', 'melodia'], ['a little tune', 'un motivetto'], ['now the lead', 'ora la melodia']],
  'add-pad': [['some warmth', "un po' di calore"], ['wider', 'più largo'], ['chords', 'accordi']],
  'add-guitar': [['guitars', 'chitarre'], ['plug it in', 'attacca la chitarra']],
  'add-texture': [['some dirt', "un po' di sporco"], ['noise', 'rumore']],
  'add-riser': [['here it comes', 'sta arrivando'], ['hold on', 'tieniti forte']],
  strip: [['strip it back', 'togliamo qualcosa'], ['less is more', 'meno è meglio'], ['make room', 'facciamo spazio']],
  variation: [['switch it up', 'cambiamo'], ['new pattern', 'pattern nuovo'], ['twist', 'una variazione']],
  brighter: [['open it up', 'apriamo'], ['brighter', 'più luce']],
  darker: [['darker', 'più scuro'], ['close the filter', 'chiudiamo il filtro']],
  dirtier: [['dirtier', 'più sporco'], ['more grit', 'più grinta']],
  cleaner: [['clean it up', 'puliamo'], ['softer', 'più morbido']],
  'more-space': [['more space', 'più spazio'], ['echoes', 'echi']],
  break: [['breakdown', 'pausa'], ['breathe', 'respira'], ['drop the drums', 'via la batteria']],
  drop: [['drop', 'drop'], ['back in', 'si riparte'], ['all in', 'tutti dentro']],
};
export const KINDS = Object.keys(POOL);

// { en, it } for one phrase of a kind
export const phrase = (kind, rng) => { const [en, it] = rng.pick(POOL[kind]); return { en, it }; };
// every phrase, for tools/voice.mjs
export const allPhrases = () => Object.values(POOL).flat().map(([en, it]) => ({ en, it }));
