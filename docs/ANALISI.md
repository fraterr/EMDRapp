# Analisi e ricostruzione EMDRapp

Repository analizzato: https://github.com/fraterr/EMDRapp

Commit di partenza: `e2abf9703091b783bc292b7501fc8266f647b4b5`.

## Cosa c’era

L’app originale è composta da HTML, CSS e JavaScript, senza backend. Guida attraverso valutazioni prima/dopo, cinque categorie sensoriali, tapping EFT/TFT, 9 Gamut, stimolazione visiva, respirazione, visualizzazione e diario locale. Il grafo strutturale generato con graphify identifica 37 nodi e 60 relazioni; è conservato in `original-code-graph.json`.

La semplicità dell’architettura è un punto di forza, quindi non è stato introdotto un framework. Le criticità riguardavano soprattutto il percorso e la gestione dell’interfaccia.

| Osservazione sul codice originale | Intervento |
| --- | --- |
| Molte schermate montate contemporaneamente e mostrate/nascoste con stili e reflow forzati | Una vista attiva alla volta e shell di navigazione stabile |
| CSS esteso, numerose animazioni decorative e stili inline ripetuti | Sistema visivo coerente, superfici chiare, area di movimento scura, componenti condivisi |
| Il movimento usa valori fissati nel codice e una grande immagine del dito | Durata/velocità reali esposte, punto geometrico leggero, traiettoria orizzontale regolare |
| Click su tutta la schermata termina il set; non c’è una vera pausa | Avvia/Pausa/Riprendi/Termina separati e tastiera, mantenendo il tempo trascorso |
| Un nuovo AudioContext viene creato a ogni chime | Un contesto riutilizzato, inizializzato su gesto, nodi audio disconnessi a fine suono |
| Il README parla di 1 minuto, mentre il codice usa 90 secondi | Durata indicata esplicitamente: 30, 60 o 90 secondi |
| La descrizione sensoriale `images` è salvata nel diario originale | Nuovi record limitati a data e punteggi; migrazione dei record precedenti al salvataggio |
| EFT, TFT, EMDR e “erase the memory” vengono presentati in un flusso terapeutico unico | Esercizi complementari distinti, saltabili; visualizzazione senza promessa di cancellazione dei ricordi |

## Direzione grafica

Indaco su superfici bianche e grigio chiaro, testo antracite, titoli ampi con un accento tipografico serif. La navigazione e le cinque fasi rimangono visibili su desktop; su mobile la navigazione si compatta senza togliere le etichette accessibili.

Il pulsante principale è nel primo schermo anche a 320 px. La pagina iniziale consente subito di impostare durata, velocità, suono e ritmo e provare il movimento. Durante la stimolazione la superficie scura isola il punto; il resto dell’interfaccia non anima lo sfondo.

## Prestazioni misurate

Confronto dei tre file principali (`index.html`, `app.js`, `styles.css`) prima e dopo la ricostruzione, prima della consegna:

| Misura | Originale | Ricostruzione | Riduzione |
| --- | ---: | ---: | ---: |
| Byte sorgente complessivi | 110.388 | 65.042 | 41,1% |
| Somma dei file compressi con gzip | 26.127 | 18.530 | 29,1% |

Il confronto gzip è una misura riproducibile sui file, non una misura della compressione effettiva del server né del tempo di caricamento. Non è stato eseguito un audit Lighthouse o un benchmark su telefoni reali. Dati grezzi: `payload-metrics.json`.

La pagina iniziale non carica immagini, font o librerie esterne. Le immagini esistenti del tapping vengono caricate quando servono. Il movimento usa `transform: translate3d` e le dimensioni del contenitore vengono rilevate con ResizeObserver, senza leggere il layout a ogni fotogramma. Il timer aggiornato usa tempo monotono e conserva il tempo trascorso in pausa. L’anteprima ha un tempo indipendente dal set attivo.

## Funzioni mantenute e cambiamenti intenzionali

Il percorso conserva valutazioni 1–10, cinque sensi, nove punti illustrati, 9 Gamut, Butterfly Hug facoltativo, set ripetibili, respirazione 4/4/8 per tre cicli, visualizzazione e diario. Le varianti multisensoriali possono essere saltate. La respirazione può essere interrotta prima della fine.

Il countdown automatico è sostituito da un avvio esplicito. Il movimento casuale multidirezionale è sostituito da una traiettoria orizzontale e variazioni regolari di velocità. Sono state eliminate le particelle e l’animazione della cancellazione del ricordo, mantenendo i passaggi testuali della visualizzazione. I testi sono stati riscritti in italiano.

Il diario conserva ogni set completato quando si sceglie di continuare o salvare, evitando duplicati. Terminare un set non ancora valutato non crea record incompleti. La pagina avvisa se lo storage non è disponibile; i record caricati sono validati e i testi sono escapati prima del rendering.

## Verifiche eseguite

`npm ci` dal lockfile consegnato, controllo di sintassi e otto test browser passati su Edge headless:

1. Layout a 1440, 1024, 768, 390 e 320 px, assenza di overflow orizzontale e azione principale nel primo schermo.
2. Timer, pausa, ripresa, navigazione, indipendenza dell’anteprima, fine automatica, tre respiri e salvataggio.
3. Note sensoriali, navigazione tra sensi, caricamento di tutte e nove le immagini, checkbox 9 Gamut, visualizzazione e assenza delle note nei record salvati.
4. Ripetizione dei set, aggiornamento del valore iniziale, salvataggio singolo e conclusione anticipata.
5. Rendering sicuro di date importate, rimozione delle vecchie descrizioni, limite di 20 record e conferma della cancellazione.
6. Storage malformato e salvataggio bloccato senza interrompere l’uso dell’app.
7. Tastiera, pausa su pagina nascosta e preferenza di riduzione del movimento nella respirazione.
8. Anteprima locale limitata ai file pubblici, con esclusione di metadati Git e report.

Le durate estese nei test usano l’orologio simulato del browser. L’impaginazione desktop/mobile, il tapping e la stimolazione sono stati anche ispezionati tramite screenshot. Un controllo browser aggiuntivo ha verificato un solo AudioContext dopo riattivazioni del suono, ingresso/uscita dallo schermo intero e permanenza del punto entro l’area di movimento. Queste verifiche non certificano accessibilità completa, compatibilità con Safari/Firefox o efficacia clinica.

## Testi e fonte

La distinzione fra strumento e terapia si basa sulla descrizione del NHS, che presenta l’EMDR come lavoro con un terapeuta: [NHS — Talking therapies](https://www.nhs.uk/tests-and-treatments/talking-therapies/). La revisione dell’interfaccia non valida clinicamente il protocollo originale né equipara gli esercizi complementari all’EMDR.

## Consegna

Ricostruzione preparata e verificata nella copia locale `emdr-redesign`, poi predisposta per la pubblicazione autorizzata dall’utente. Il workflow GitHub Pages è predisposto a pubblicare solo i file dell’app, escludendo dipendenze di sviluppo, test e report.


## Aggiornamento: inglese e Dark Mode

Su richiesta, tutta l’interfaccia è stata tradotta in inglese, compresi testi dinamici, attributi accessibili, metadati e nuove date del diario. Le descrizioni personali e le date dei record preesistenti non sono riscritte.

Il tema chiaro/scuro usa variabili condivise per superfici, testo, bordi, controlli, grafico e finestre di dialogo. Al primo accesso segue il sistema; una scelta esplicita viene salvata in `emdr_theme`. Il tema viene applicato prima del CSS per evitare un lampeggio chiaro e può cambiare durante il set senza interromperlo. Se lo storage è bloccato, rimane applicabile per la visita corrente.

Passati gli otto test del percorso, aggiornati alla lingua inglese, e due controlli aggiuntivi per tema di sistema, persistenza, tastiera, storage bloccato e continuità del timer. Screenshot della modalità scura: `desktop-dark.png`, `mobile-dark.png`, `stimulation-dark.png`. Le misurazioni e gli screenshot originali sopra descrivono la prima ricostruzione, precedente a questo aggiornamento.
