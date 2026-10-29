// Vocabulary of the voice instrument (voice-instrument, #39): words and short phrases in English and Italian, all
// written for this project, grouped by mood. A generated line picks 1 to 4 entries with the song's seed on its own
// stream ("spoken"), so it never changes the music of a seed. `npm run voices` makes one sample per entry, speaker and
// language; a generated line plays as a sequence of entry samples, one per beat.
// The `poetic` group holds the poetic narrator's short images, by the type of the track that comes in.
export const VOCABULARY = {
  dark: [
    { en: 'shadow', it: 'ombra' }, { en: 'cold steel', it: 'acciaio freddo' }, { en: 'under the ash', it: 'sotto la cenere' },
    { en: 'no light', it: 'niente luce' }, { en: 'deeper', it: 'più a fondo' }, { en: 'the wire hums', it: 'il filo ronza' },
    { en: 'rust', it: 'ruggine' }, { en: 'smoke', it: 'fumo' }, { en: 'hold still', it: 'resta fermo' },
    { en: 'falling', it: 'cadendo' }, { en: 'black water', it: 'acqua nera' }, { en: 'static', it: 'statica' },
  ],
  calm: [
    { en: 'breathe', it: 'respira' }, { en: 'slowly', it: 'piano piano' }, { en: 'the tide', it: 'la marea' },
    { en: 'far away', it: 'lontano' }, { en: 'soft rain', it: 'pioggia leggera' }, { en: 'let go', it: 'lascia andare' },
    { en: 'still air', it: 'aria ferma' }, { en: 'morning', it: 'mattino' }, { en: 'drifting', it: 'alla deriva' },
    { en: 'a long sigh', it: 'un lungo respiro' }, { en: 'quiet', it: 'quiete' }, { en: 'warm light', it: 'luce calda' },
  ],
  machine: [
    { en: 'signal', it: 'segnale' }, { en: 'system online', it: 'sistema attivo' }, { en: 'loop', it: 'ciclo' },
    { en: 'pulse', it: 'impulso' }, { en: 'zero one', it: 'zero uno' }, { en: 'running', it: 'in corsa' },
    { en: 'feedback', it: 'ritorno' }, { en: 'circuit', it: 'circuito' }, { en: 'step by step', it: 'passo dopo passo' },
    { en: 'reset', it: 'azzera' }, { en: 'frequency', it: 'frequenza' }, { en: 'connected', it: 'connesso' },
  ],
  night: [
    { en: 'midnight', it: 'mezzanotte' }, { en: 'neon', it: 'neon' }, { en: 'empty streets', it: 'strade vuote' },
    { en: 'city lights', it: 'luci della città' }, { en: 'awake', it: 'sveglio' }, { en: 'after hours', it: 'a notte fonda' },
    { en: 'the last train', it: "l'ultimo treno" }, { en: 'rain on glass', it: 'pioggia sul vetro' }, { en: 'stay', it: 'resta' },
    { en: 'moonlight', it: 'chiaro di luna' }, { en: 'wide awake', it: 'ben sveglio' }, { en: 'closer', it: 'più vicino' },
  ],
};
export const VOCAB_GROUPS = Object.keys(VOCABULARY);

// the poetic narrator: a short image before the element that comes in, by track type ("any" for the others)
export const POETIC = {
  drums: [{ en: 'a heartbeat under the city', it: 'un battito sotto la città' }, { en: 'footsteps in the dark', it: 'passi nel buio' }, { en: 'the ground starts to move', it: 'la terra si muove' }],
  bass: [{ en: 'something deep wakes up', it: 'qualcosa di profondo si sveglia' }, { en: 'the floor below the floor', it: 'il piano sotto il piano' }, { en: 'a low tide rising', it: 'una marea bassa che sale' }],
  pad: [{ en: 'fog over the water', it: "nebbia sull'acqua" }, { en: 'a warm room', it: 'una stanza calda' }, { en: 'the sky opens slowly', it: 'il cielo si apre piano' }],
  guitar: [{ en: 'sparks on the wire', it: 'scintille sul filo' }, { en: 'a storm in a box', it: 'una tempesta in una scatola' }],
  arp: [{ en: 'lights on a long road', it: 'luci su una strada lunga' }, { en: 'rain in small steps', it: 'pioggia a piccoli passi' }, { en: 'a clock made of glass', it: 'un orologio di vetro' }],
  hook: [{ en: 'a voice from far away', it: 'una voce da lontano' }, { en: 'a song for the night', it: 'una canzone per la notte' }, { en: 'a thread of light', it: 'un filo di luce' }],
  texture: [{ en: 'dust in the air', it: "polvere nell'aria" }, { en: 'wind through the cracks', it: 'vento tra le crepe' }],
  riser: [{ en: 'the wave is coming', it: "l'onda sta arrivando" }, { en: 'hold your breath', it: 'trattieni il respiro' }],
  code: [{ en: 'a strange machine', it: 'una macchina strana' }],
  spoken: [{ en: 'someone is talking', it: 'qualcuno sta parlando' }],
  any: [{ en: 'something new is here', it: "c'è qualcosa di nuovo" }, { en: 'another light', it: "un'altra luce" }],
  // poetic-steps: a short image of movement for a step that brings no track in (poetic style with Narrated growth),
  // neither rising nor falling, since a step may open a filter or take something away
  move: [
    { en: 'the light shifts', it: 'la luce si sposta' }, { en: 'the river bends', it: 'il fiume fa una curva' },
    { en: 'shadows change places', it: 'le ombre cambiano posto' }, { en: 'the wind turns', it: 'il vento gira' },
    { en: 'the city breathes', it: 'la città respira' }, { en: 'the colours change', it: 'cambiano i colori' },
    { en: 'a door half open', it: 'una porta socchiusa' }, { en: 'the road turns a corner', it: "la strada gira l'angolo" },
    { en: 'something moves inside', it: 'qualcosa si muove dentro' }, { en: 'the night turns over', it: 'la notte si gira' },
    { en: 'ripples on the glass', it: 'cerchi sul vetro' }, { en: 'the room tilts', it: 'la stanza si inclina' },
  ],
};

// every text of the vocabulary and of the poetic group, for tools/voice.mjs
export const vocabularyTexts = () => VOCAB_GROUPS.flatMap(g => VOCABULARY[g]);
export const poeticTexts = () => Object.values(POETIC).flat();
