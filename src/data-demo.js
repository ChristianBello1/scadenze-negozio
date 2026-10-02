// Modalità demo: salva tutto sul telefono (localStorage). Niente condivisione.
const K = "scadenze-demo-v1";

function carica() {
  try {
    return JSON.parse(localStorage.getItem(K)) || { prodotti: [], catalogo: {} };
  } catch {
    return { prodotti: [], catalogo: {} };
  }
}
function salva(s) {
  try {
    localStorage.setItem(K, JSON.stringify(s));
  } catch (e) {
    alert("Spazio del telefono pieno per la demo: " + e.message);
  }
}

export function creaDemo() {
  let ascoltatori = [];
  const notifica = () => {
    const lista = carica().prodotti;
    ascoltatori.forEach((cb) => cb(lista));
  };
  return {
    demo: true,
    async init() {
      return { loggato: true };
    },
    async login() {},
    async logout() {},
    ascolta(cb) {
      ascoltatori.push(cb);
      setTimeout(() => cb(carica().prodotti), 0);
      return () => (ascoltatori = ascoltatori.filter((x) => x !== cb));
    },
    async aggiungi(p) {
      const s = carica();
      s.prodotti.push({ ...p, id: crypto.randomUUID?.() || String(Date.now() + Math.random()), creato: Date.now() });
      if (p.codice) s.catalogo[p.codice] = { nome: p.nome, foto: p.foto || null };
      salva(s);
      notifica();
    },
    async modifica(id, campi) {
      const s = carica();
      const p = s.prodotti.find((x) => x.id === id);
      if (p) Object.assign(p, campi);
      if (p?.codice) s.catalogo[p.codice] = { nome: p.nome, foto: p.foto || null };
      salva(s);
      notifica();
    },
    async rimuovi(id) {
      const s = carica();
      s.prodotti = s.prodotti.filter((x) => x.id !== id);
      salva(s);
      notifica();
    },
    async cercaCatalogo(codice) {
      return carica().catalogo[codice] || null;
    },
  };
}
