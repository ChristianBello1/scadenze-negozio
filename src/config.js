// ─────────────────────────────────────────────────────────────
//  CONFIGURAZIONE
// ─────────────────────────────────────────────────────────────
// Incolla qui sotto l'oggetto firebaseConfig che ti dà Firebase
// (Impostazioni progetto → Le tue app → App web).
// Finché resta null, l'app funziona in MODALITÀ DEMO: i dati
// restano solo su quel telefono e non sono condivisi.
export const firebaseConfig = {
  apiKey: "AIzaSyC4F9J-rthfIWlCqGn0X_6LpxyCvEzkAs0",
  authDomain: "scadenze-negozio-9fec9.firebaseapp.com",
  projectId: "scadenze-negozio-9fec9",
  storageBucket: "scadenze-negozio-9fec9.firebasestorage.app",
  messagingSenderId: "865301126194",
  appId: "1:865301126194:web:50976925af186a6e56b02b",
};

// Email dell'account unico del negozio (lo crei su Firebase →
// Authentication → Users). La password di quell'account è il
// "codice negozio" che i colleghi inseriscono al primo accesso.
export const EMAIL_NEGOZIO = "negozio@scadenze-app.it";

// Quanti giorni prima della scadenza un prodotto finisce in "Da ritirare".
export const GIORNI_AVVISO = 3;
