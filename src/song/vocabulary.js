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
  drums: [{ en: 'a heartbeat under the city', it: 'un battito sotto la città' }, { en: 'footsteps in the dark', it: 'passi nel buio' }, { en: 'the ground starts to move', it: 'la terra si muove' }, { en: 'the collective starts to march', it: 'il collettivo comincia a marciare' }, { en: 'thunder far away', it: 'tuono in lontananza' }],
  bass: [{ en: 'something deep wakes up', it: 'qualcosa di profondo si sveglia' }, { en: 'the floor below the floor', it: 'il piano sotto il piano' }, { en: 'a low tide rising', it: 'una marea bassa che sale' }, { en: 'the earth hums back', it: 'la terra risponde vibrando' }, { en: 'a whale in the dark', it: 'una balena nel buio' }],
  pad: [{ en: 'fog over the water', it: "nebbia sull'acqua" }, { en: 'a warm room', it: 'una stanza calda' }, { en: 'the sky opens slowly', it: 'il cielo si apre piano' }, { en: 'a blanket of light', it: 'una coperta di luce' }, { en: 'the room gets wider', it: 'la stanza si allarga' }],
  guitar: [{ en: 'sparks on the wire', it: 'scintille sul filo' }, { en: 'a storm in a box', it: 'una tempesta in una scatola' }, { en: 'wires on fire', it: 'fili in fiamme' }, { en: 'a scream made of metal', it: 'un urlo di metallo' }, { en: 'the amp wakes up', it: "l'amplificatore si sveglia" }],
  arp: [{ en: 'lights on a long road', it: 'luci su una strada lunga' }, { en: 'rain in small steps', it: 'pioggia a piccoli passi' }, { en: 'a clock made of glass', it: 'un orologio di vetro' }, { en: 'a necklace of stars', it: 'una collana di stelle' }, { en: 'raindrops counting time', it: 'gocce che contano il tempo' }],
  hook: [{ en: 'a voice from far away', it: 'una voce da lontano' }, { en: 'a song for the night', it: 'una canzone per la notte' }, { en: 'a thread of light', it: 'un filo di luce' }, { en: 'a name you remember', it: 'un nome che ricordi' }, { en: 'a song stuck in the walls', it: 'una canzone chiusa nei muri' }],
  texture: [{ en: 'dust in the air', it: "polvere nell'aria" }, { en: 'wind through the cracks', it: 'vento tra le crepe' }, { en: 'static on the radio', it: 'statica alla radio' }, { en: 'sand in the gears', it: 'sabbia negli ingranaggi' }, { en: 'the hiss of old tape', it: 'il fruscio di un vecchio nastro' }],
  riser: [{ en: 'the wave is coming', it: "l'onda sta arrivando" }, { en: 'hold your breath', it: 'trattieni il respiro' }, { en: 'the stairs go up', it: 'le scale salgono' }, { en: 'pressure in the air', it: "pressione nell'aria" }, { en: 'the air gets tight', it: "l'aria si fa tesa" }],
  code: [{ en: 'a strange machine', it: 'una macchina strana' }, { en: 'the machine dreams', it: 'la macchina sogna' }, { en: 'numbers start to sing', it: 'i numeri cominciano a cantare' }, { en: 'a ghost in the wires', it: 'un fantasma nei cavi' }, { en: 'the code writes back', it: 'il codice risponde' }],
  spoken: [{ en: 'someone is talking', it: 'qualcuno sta parlando' }, { en: 'a voice in the static', it: 'una voce nella statica' }, { en: 'words in the dark', it: 'parole nel buio' }, { en: 'someone is listening', it: 'qualcuno sta ascoltando' }, { en: 'a whisper on the line', it: 'un sussurro sulla linea' }],
  any: [{ en: 'something new is here', it: "c'è qualcosa di nuovo" }, { en: 'another light', it: "un'altra luce" }, { en: 'the void stares back', it: 'il vuoto ricambia lo sguardo' }, { en: 'rust on the walls', it: 'ruggine sui muri' }, { en: 'look, the dark side of the sun', it: 'guarda, il lato oscuro del sole' }, { en: 'twin stars', it: 'stelle gemelle' }, { en: 'a stroll, alone', it: 'una passeggiata, in solitudine' }, { en: 'sickness in the tune', it: 'qualcosa di malato nella melodia' }, { en: 'a remedy for the beat', it: 'un rimedio per il ritmo' }, { en: 'absorbed by the sound', it: 'assorbiti dal suono' }, { en: 'vibing through the night', it: 'a ritmo per tutta la notte' }, { en: 'diversity is abundance', it: 'la diversità è abbondanza' }],
  // poetic-steps: a short image of movement for a step that brings no track in (poetic style with Narrated growth),
  // neither rising nor falling, since a step may open a filter or take something away
  move: [
    { en: 'the light shifts', it: 'la luce si sposta' }, { en: 'the river bends', it: 'il fiume fa una curva' },
    { en: 'shadows change places', it: 'le ombre cambiano posto' }, { en: 'the wind turns', it: 'il vento gira' },
    { en: 'the city breathes', it: 'la città respira' }, { en: 'the colours change', it: 'cambiano i colori' },
    { en: 'a door half open', it: 'una porta socchiusa' }, { en: 'the road turns a corner', it: "la strada gira l'angolo" },
    { en: 'something moves inside', it: 'qualcosa si muove dentro' }, { en: 'the night turns over', it: 'la notte si gira' },
    { en: 'ripples on the glass', it: 'cerchi sul vetro' }, { en: 'the room tilts', it: 'la stanza si inclina' },
    { en: 'tremors deep below', it: 'tremori nel profondo' }, { en: 'sailing higher and higher', it: 'sempre più in alto' },
    { en: 'here it rises', it: 'eccolo che sale' }, { en: 'crashing down', it: 'tutto crolla' },
    { en: 'upside down, then back', it: 'sottosopra, e poi di nuovo dritto' }, { en: 'adrift in the beat', it: 'alla deriva nel ritmo' },
    { en: 'liftoff in three', it: 'decollo tra tre' }, { en: 'in the upper atmosphere', it: "nell'alta atmosfera" },
    { en: 'a glimpse of light', it: 'un lampo di luce' }, { en: 'a glimpse of hope', it: 'uno spiraglio di speranza' },
    { en: 'a glimpse of the void', it: 'uno sguardo nel vuoto' }, { en: 'noises in the walls', it: 'rumori nei muri' },
    { en: 'the depth of the ocean', it: "il fondo dell'oceano" }, { en: 'joy, for an instant', it: 'gioia, per un istante' },
    { en: 'dissolution by choice', it: 'dissolversi per scelta' }, { en: 'the tide comes in', it: 'sale la marea' },
    { en: 'the ground shifts', it: 'il terreno si sposta' }, { en: 'clouds open', it: 'si aprono le nuvole' },
    { en: 'the streets fill up', it: 'le strade si riempiono' }, { en: 'a heartbeat quickens', it: 'un battito accelera' },
    { en: 'the mist lifts', it: 'si alza la nebbia' }, { en: 'footsteps getting closer', it: 'passi sempre più vicini' },
    { en: 'the walls grow thin', it: 'i muri si fanno sottili' }, { en: 'sparks in the dark', it: 'scintille nel buio' },
    { en: 'the floor starts to hum', it: 'il pavimento comincia a vibrare' }, { en: 'the horizon tilts', it: "l'orizzonte si inclina" },
    { en: 'a wave rolls in', it: "arriva un'onda" }, { en: 'the lights go dim', it: 'le luci si abbassano' },
    { en: 'the engine wakes', it: 'il motore si sveglia' }, { en: 'gravity lets go', it: 'la gravità ci lascia andare' },
    { en: 'a crack in the silence', it: 'una crepa nel silenzio' }, { en: 'the stars rearrange', it: 'le stelle cambiano posto' },
    { en: 'we fall upward', it: "cadiamo verso l'alto" }, { en: 'echoes answer back', it: 'rispondono gli echi' },
    { en: 'the night opens up', it: 'la notte si apre' }, { en: 'phasing in', it: 'entra in fase' },
    { en: 'next phase, plurality', it: 'fase successiva, pluralità' }, { en: 'back to singularity', it: 'ritorno alla singolarità' },
    { en: "it's growing", it: 'sta crescendo' }, { en: 'from sapling, to majesty', it: 'dal germoglio alla maestosità' },
  ],
};

// every text of the vocabulary and of the poetic group, for tools/voice.mjs
export const vocabularyTexts = () => VOCAB_GROUPS.flatMap(g => VOCABULARY[g]);
export const poeticTexts = () => Object.values(POETIC).flat();
