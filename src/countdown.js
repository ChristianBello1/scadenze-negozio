// Calcolo del countdown a scaglioni: mesi → settimane → giorni.

export function oggi() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function giorniMancanti(iso) {
  const ms = parseISO(iso) - oggi();
  return Math.round(ms / 86400000);
}

function mesiInteri(da, a) {
  let m = (a.getFullYear() - da.getFullYear()) * 12 + (a.getMonth() - da.getMonth());
  if (a.getDate() < da.getDate()) m--;
  return m;
}

export function countdown(iso) {
  const g = giorniMancanti(iso);
  if (g < -1) return { testo: `Scaduto da ${-g} giorni`, livello: "scaduto", giorni: g };
  if (g === -1) return { testo: "Scaduto ieri", livello: "scaduto", giorni: g };
  if (g === 0) return { testo: "Scade oggi", livello: "urgente", giorni: g };
  if (g === 1) return { testo: "Scade domani", livello: "urgente", giorni: g };

  let testo;
  if (g < 14) testo = `Scade tra ${g} giorni`;
  else if (g < 30) testo = `Scade tra ${Math.floor(g / 7)} settimane`;
  else {
    const m = Math.max(1, mesiInteri(oggi(), parseISO(iso)));
    if (m >= 12) {
      const a = Math.floor(m / 12);
      testo = a === 1 ? "Scade tra più di 1 anno" : `Scade tra più di ${a} anni`;
    } else testo = m === 1 ? "Scade tra 1 mese" : `Scade tra ${m} mesi`;
  }

  let livello = "ok";
  if (g <= 3) livello = "urgente";
  else if (g <= 7) livello = "presto";
  else if (g <= 30) livello = "attenzione";
  return { testo, livello, giorni: g };
}

// "05/03/2027" ← "2027-03-05"
export function formatoData(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Accetta "GG/MM/AAAA", "GG/MM/AA", "MM/AAAA", "MM/AA" (→ ultimo giorno del mese).
// Restituisce "AAAA-MM-GG" oppure null se non valida.
export function leggiData(testo) {
  const r = leggiDataStretta(testo);
  if (r) return r;
  // "03/20/27" (cioè 032027 digitato) → marzo 2027, fine mese
  const c = testo.replace(/\D/g, "");
  if (c.length === 6) return leggiDataStretta(c.slice(0, 2) + "/" + c.slice(2));
  return null;
}

function leggiDataStretta(testo) {
  const parti = testo.trim().split(/[\/\.\-\s]+/).filter(Boolean).map((p) => p.replace(/\D/g, ""));
  let g, m, a;
  if (parti.length === 3) [g, m, a] = parti.map(Number);
  else if (parti.length === 2) {
    [m, a] = parti.map(Number);
    g = null;
  } else return null;
  if (a < 100) a += 2000;
  if (!(m >= 1 && m <= 12) || a < 2000 || a > 2100) return null;
  const ultimo = new Date(a, m, 0).getDate();
  if (g === null) g = ultimo;
  if (!(g >= 1 && g <= ultimo)) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
}
