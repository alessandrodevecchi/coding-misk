// Spoken comments of the endless director: a fixed pool of short phrases per kind of move,
// in English and Italian. `npm run voices` makes a sample for each (tools/voice.mjs).
// Keep them short: a few words, said over the music.
export const POOL = {
  'song-start': [['here we go', 'si parte'], ['new song', 'brano nuovo'], ['from scratch', 'da zero'], ["let's build", 'costruiamo'], ['one more', 'un altro'], ["let's go", 'andiamo'], ['fresh start', 'si ricomincia'], ['listen to this', 'ascolta questo'], ['first notes', 'prime note'], ['a new story', 'una nuova storia']],
  'song-end': [['winding down', 'chiudiamo'], ['last round', 'ultimo giro'], ['that was it', 'ed è finita'], ['fade out', 'sfumiamo'], ['see you next', 'alla prossima'], ["that's all", 'è tutto'], ['last notes', 'ultime note'], ['fading away', 'svanisce piano'], ['almost over', 'quasi finito'], ['time to land', 'è ora di atterrare']],
  'add-drums': [['more rhythm', 'più ritmo'], ['drums in', 'entra la batteria'], ['feel the beat', 'senti il battito'], ['kick in', 'entra la cassa'], ['rhythm section', 'arriva il ritmo']],
  'add-bass': [['need bass', 'serve il basso'], ['low end', 'giù in basso'], ['bass in', 'entra il basso'], ['the groove gets deep', 'il groove si fa profondo'], ['low and heavy', 'basso e pesante']],
  'add-lead': [['melody', 'melodia'], ['a little tune', 'un motivetto'], ['now the lead', 'ora la melodia'], ['a hook', 'un ritornello'], ['sing along', 'canta con noi']],
  'add-pad': [['some warmth', "un po' di calore"], ['wider', 'più largo'], ['chords', 'accordi'], ['chords underneath', 'accordi sotto'], ['fill it up', 'riempiamo']],
  'add-guitar': [['guitars', 'chitarre'], ['plug it in', 'attacca la chitarra'], ['six strings', 'sei corde'], ['riff time', 'tempo di riff'], ['turn it up', 'alza il volume']],
  'add-texture': [['some dirt', "un po' di sporco"], ['noise', 'rumore'], ['some grain', "un po' di grana"], ['dust and crackle', 'polvere e crepitio'], ['rough edges', 'bordi ruvidi']],
  'add-riser': [['here it comes', 'sta arrivando'], ['hold on', 'tieniti forte'], ['building up', 'sale la tensione'], ['get ready', 'preparatevi'], ['up we go', 'si sale']],
  strip: [['strip it back', 'togliamo qualcosa'], ['less is more', 'meno è meglio'], ['make room', 'facciamo spazio'], ['just the core', "solo l'essenziale"], ['pull back', 'tiriamo indietro'], ['slice it up', 'a fette'], ['chop it down', 'a pezzi'], ['thinner, sinner', 'più snello, monello']],
  variation: [['switch it up', 'cambiamo'], ['new pattern', 'pattern nuovo'], ['twist', 'una variazione'], ['something new', 'qualcosa di nuovo'], ['flip it', 'giriamolo']],
  brighter: [['open it up', 'apriamo'], ['brighter', 'più luce'], ['more air', 'più aria'], ['let it shine', 'facciamolo brillare'], ['filter open', 'filtro aperto']],
  darker: [['darker', 'più scuro'], ['close the filter', 'chiudiamo il filtro'], ['into the shade', "verso l'ombra"], ['lower the lights', 'abbassiamo le luci'], ['deeper tone', 'suono più cupo']],
  dirtier: [['dirtier', 'più sporco'], ['more grit', 'più grinta'], ['add some drive', "un po' di drive"], ['distort it', 'distorciamolo'], ['rough it up', 'sporchiamolo']],
  cleaner: [['clean it up', 'puliamo'], ['softer', 'più morbido'], ['polish it', 'lucidiamo'], ['less noise', 'meno rumore'], ['smooth it out', 'ammorbidiamo']],
  'more-space': [['more space', 'più spazio'], ['echoes', 'echi'], ['add reverb', 'più riverbero'], ['let it ring', 'lascia risuonare'], ['a bigger room', 'una stanza più grande']],
  break: [['breakdown', 'pausa'], ['breathe', 'respira'], ['drop the drums', 'via la batteria'], ['hold it', 'fermi'], ['quiet moment', 'momento di calma'], ['take a breath', 'prendi fiato'], ['slow it down', 'rallentiamo'], ['silence now', 'ora silenzio'], ['wait for it', 'aspetta'], ['floating', 'sospesi']],
  drop: [['drop', 'drop'], ['back in', 'si riparte'], ['all in', 'tutti dentro'], ['full power', 'piena potenza'], ['hit it', 'vai'], ['here it is', 'eccolo'], ['full speed', 'a tutta velocità'], ['bring it back', 'riportiamolo dentro'], ['now!', 'ora!']],
};
export const KINDS = Object.keys(POOL);

// { en, it } for one phrase of a kind
export const phrase = (kind, rng) => { const [en, it] = rng.pick(POOL[kind]); return { en, it }; };
// every phrase, for tools/voice.mjs
export const allPhrases = () => Object.values(POOL).flat().map(([en, it]) => ({ en, it }));
