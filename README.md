# Scadenze Negozio

App (PWA) per registrare le scadenze dei prodotti esposti e vedere subito cosa ritirare.
Codice a barre, nome, scadenza, foto. Lista condivisa tra colleghi, con un countdown per ogni prodotto.

- `src/` codice dell'app · `public/` pagina, stile, icone · `docs/` versione pronta da pubblicare
- `src/config.js` → qui va incollata la configurazione di Firebase
- `firestore.rules` → regole di sicurezza da incollare su Firebase
- Dopo ogni modifica: `npm install` (solo la prima volta) e poi `node build.mjs`

---

## 1. Crea il progetto Firebase (circa 10 minuti, dal computer)

1. Vai su **console.firebase.google.com** → **Crea un progetto** → nome `scadenze-negozio` → Google Analytics **disattivato** → Crea.
2. Menu a sinistra **Build → Firestore Database** → **Crea database** → posizione **eur3 (Europe)** → **Avvia in modalità produzione** → Crea.
3. Sempre in Firestore, scheda **Regole**: cancella tutto, incolla il contenuto di `firestore.rules` → **Pubblica**.
4. **Build → Authentication** → **Inizia** → **Email/password** → attiva solo la prima opzione → Salva.
5. Authentication → scheda **Users** → **Aggiungi utente**:
   - Email: `negozio@scadenze-app.it` (non deve esistere davvero)
   - Password: il **codice negozio** che darai ai colleghi (almeno 6 caratteri, es. `tedi2026mn`)
6. Rotellina ⚙️ in alto a sinistra → **Impostazioni progetto** → in fondo **Le tue app** → icona **`</>`** (Web) → nome `scadenze` → **non** spuntare Hosting → Registra.
7. Copia l'oggetto `firebaseConfig = { apiKey: ..., ... }` che compare.

In `src/config.js` sostituisci `export const firebaseConfig = null;` con quello che hai copiato, poi `node build.mjs`.
(Oppure manda la configurazione a Claude e lo fa lui.)

> La `apiKey` di Firebase non è una password: può stare in un sito pubblico. Quello che protegge i dati
> sono le regole del punto 3, che permettono l'accesso solo a chi conosce il codice negozio.

## 2. Pubblica l'app con GitHub Pages (gratis)

1. Su GitHub crea un repository **pubblico** chiamato `scadenze-negozio` e carica questa cartella
   (o fatti aiutare da Claude a caricarla).
2. Nel repository: **Settings → Pages** → Source **Deploy from a branch** → Branch `main`, cartella **`/docs`** → Save.
3. Dopo 1-2 minuti l'app è su `https://<tuo-utente>.github.io/scadenze-negozio/`.

## 3. Installala sui telefoni

- **Android**: apri il link con **Chrome** → menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").
- **iPhone**: apri il link con **Safari** → tasto Condividi → **Aggiungi alla schermata Home**.

Al primo avvio ognuno scrive il proprio nome e il codice negozio. Poi resta collegato.

## Come funziona

- **Da ritirare**: prodotti che scadono entro 7 giorni (o già scaduti). Il numero si cambia in `GIORNI_AVVISO` in `src/config.js`.
- **Countdown**: mesi → settimane → giorni (“tra 5 mesi”, “tra 2 settimane”, “tra 9 giorni”… “domani”, “oggi”, “scaduto ieri”).
- **Colori**: verde oltre 30 giorni · giallo 8-30 · arancione 4-7 · rosso 3 o meno (in “Da ritirare” finiscono già da 7 giorni).
- **Ritirato**: dal dettaglio del prodotto, tocca “✓ Ritirato dallo scaffale”: sparisce dalla lista (c'è “Annulla” per qualche secondo).
- **Prodotto già visto**: se scansioni un codice già registrato in passato, nome e foto si compilano da soli.
- **Scadenza veloce**: si scrivono solo numeri, le barre si mettono da sole. `05032027` = 05/03/2027.
  Se sulla confezione c'è solo mese e anno: `032027` = fine marzo 2027.
- **Senza rete** l'app si apre lo stesso e quello che salvi viene sincronizzato appena torna la connessione.
- Non c'è un limite di persone: chiunque abbia il codice negozio può entrare. Per togliere l'accesso a tutti,
  cambia la password dell'utente su Firebase → Authentication.
