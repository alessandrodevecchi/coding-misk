# Campioni personalizzati

Metti qui i tuoi file audio: diventano suoni di Strudel senza configurazione.

- Una cartella per strumento: `voce/01.wav`, `voce/02.wav` → `s("voce").n(0)`, `s("voce").n(1)`.
- Un file sciolto diventa un suono col suo nome: `swoosh.wav` → `s("swoosh")`.
- Formati: WAV (consigliato, 44,1 kHz, 16 o 24 bit), MP3, OGG, FLAC.
- Nomi senza spazi né accenti. File già tagliati, senza silenzio all'inizio.

I campioni compaiono nel canale Texture di Componi e nel tab Suoni. Ricarica la pagina dopo averli aggiunti.

Le cartelle `say_en/`, `say_it/` e `say_<lingua>_<voce>/` e il file `say_lengths.json` (durata di ogni campione) li crea `npm run voices` (commenti parlati dei brani in divenire e righe della voce strumento, voci di sistema di macOS): non vanno nel repository.
