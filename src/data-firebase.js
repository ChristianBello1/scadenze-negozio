// Backend condiviso: Firebase (Firestore + Authentication).
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export function creaFirebase(config, emailNegozio) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const prodotti = collection(db, "prodotti");

  const salvaCatalogo = (p) =>
    p.codice
      ? setDoc(doc(db, "catalogo", p.codice), { nome: p.nome, foto: p.foto || null, aggiornato: serverTimestamp() })
      : Promise.resolve();

  return {
    demo: false,
    init() {
      return new Promise((ok) => {
        const stop = onAuthStateChanged(auth, (u) => {
          stop();
          ok({ loggato: !!u });
        });
      });
    },
    async login(codice) {
      try {
        await signInWithEmailAndPassword(auth, emailNegozio, codice);
      } catch (e) {
        if (/invalid-credential|wrong-password|invalid-password/.test(e.code))
          throw new Error("Codice negozio sbagliato");
        if (/network/.test(e.code)) throw new Error("Nessuna connessione internet");
        if (/too-many-requests/.test(e.code)) throw new Error("Troppi tentativi, riprova tra qualche minuto");
        throw new Error("Accesso non riuscito (" + e.code + ")");
      }
    },
    logout: () => signOut(auth),
    ascolta(cb, errore) {
      return onSnapshot(
        query(prodotti, orderBy("scadenza")),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => errore?.(e)
      );
    },
    async aggiungi(p) {
      // Non aspettiamo il server: con la cache locale il salvataggio è immediato
      // e viene sincronizzato appena c'è rete.
      addDoc(prodotti, { ...p, creato: serverTimestamp() });
      salvaCatalogo(p);
    },
    async modifica(id, campi) {
      updateDoc(doc(db, "prodotti", id), campi);
      salvaCatalogo(campi);
    },
    async rimuovi(id) {
      deleteDoc(doc(db, "prodotti", id));
    },
    async cercaCatalogo(codice) {
      try {
        const s = await getDoc(doc(db, "catalogo", codice));
        return s.exists() ? s.data() : null;
      } catch {
        return null;
      }
    },
  };
}
