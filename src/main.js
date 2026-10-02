import { firebaseConfig, EMAIL_NEGOZIO, GIORNI_AVVISO } from "./config.js";
import { countdown, formatoData, leggiData, giorniMancanti } from "./countdown.js";
import { comprimiFoto } from "./foto.js";
import { scansiona } from "./scanner.js";
import { creaDemo } from "./data-demo.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const memoria = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let dati;
let prodotti = [];
let filtro = "ritirare";
let ricerca = "";
let inModifica = null; // id del prodotto in modifica
let fotoCorrente = null;
let dettaglioId = null;
let stopAscolto = null;

// ── Avvio ────────────────────────────────────────────────────
async function avvio() {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  $("#menu-giorni").textContent = GIORNI_AVVISO;

  if (firebaseConfig) {
    const { creaFirebase } = await import("./data-firebase.js");
    dati = creaFirebase(firebaseConfig, EMAIL_NEGOZIO);
  } else {
    dati = creaDemo();
    $("#demo-banner").hidden = false;
    $("#l-codice-box").hidden = true;
    $("#l-codice").required = false;
  }

  const { loggato } = await dati.init();
  if (loggato && memoria.get("nome")) mostraLista();
  else mostraLogin();
}

function mostraLogin() {
  $("#v-lista").hidden = true;
  $("#v-login").hidden = false;
  $("#l-nome").value = memoria.get("nome") || "";
}

$("#f-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("#l-nome").value.trim();
  const err = $("#l-errore");
  err.hidden = true;
  if (!nome) return;
  const btn = e.submitter;
  btn.disabled = true;
  btn.textContent = "Accesso…";
  try {
    if (!dati.demo) await dati.login($("#l-codice").value);
    memoria.set("nome", nome);
    $("#l-codice").value = "";
    mostraLista();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Entra";
  }
});

function mostraLista() {
  $("#v-login").hidden = true;
  $("#v-lista").hidden = false;
  stopAscolto?.();
  stopAscolto = dati.ascolta(
    (lista) => {
      prodotti = lista.slice().sort((a, b) => a.scadenza.localeCompare(b.scadenza));
      disegna();
      if (dettaglioId) aggiornaDettaglio();
    },
    (e) => {
      if (/permission/.test(e.code)) {
        toast("Accesso scaduto, rientra con il codice negozio");
        dati.logout();
        mostraLogin();
      } else toast("Errore di connessione: " + e.code);
    }
  );
}

// ── Lista ────────────────────────────────────────────────────
function disegna() {
  const daRitirare = prodotti.filter((p) => giorniMancanti(p.scadenza) <= GIORNI_AVVISO);
  $("#n-ritirare").textContent = daRitirare.length;
  $("#n-tutti").textContent = prodotti.length;

  const r = $("#riepilogo");
  const scaduti = daRitirare.filter((p) => giorniMancanti(p.scadenza) < 0).length;
  if (daRitirare.length) {
    r.className = "riepilogo allarme";
    r.innerHTML = `${daRitirare.length} ${daRitirare.length === 1 ? "prodotto da ritirare" : "prodotti da ritirare"}
      <small>${scaduti ? `di cui ${scaduti} già ${scaduti === 1 ? "scaduto" : "scaduti"} · ` : ""}scadenza entro ${GIORNI_AVVISO} giorni</small>`;
  } else {
    r.className = "riepilogo tutto-ok";
    r.innerHTML = `Niente da ritirare <small>Nessun prodotto scade nei prossimi ${GIORNI_AVVISO} giorni</small>`;
  }

  let vista = filtro === "ritirare" ? daRitirare : prodotti;
  const q = ricerca.trim().toLowerCase();
  if (q) vista = vista.filter((p) => p.nome.toLowerCase().includes(q) || (p.codice || "").includes(q));

  $("#lista").innerHTML = vista
    .map((p) => {
      const c = countdown(p.scadenza);
      const img = p.foto
        ? `<img class="miniatura" src="${p.foto}" alt="" loading="lazy" />`
        : `<div class="miniatura">📦</div>`;
      return `<li class="voce l-${c.livello}" data-id="${esc(p.id)}">
        ${img}
        <div class="info">
          <div class="nome">${esc(p.nome)}</div>
          <div class="dati">${formatoData(p.scadenza)}${p.codice ? " · " + esc(p.codice) : ""}</div>
          <span class="pill l-${c.livello}">${c.testo}</span>
        </div>
      </li>`;
    })
    .join("");

  const v = $("#vuoto");
  v.hidden = vista.length > 0;
  if (!vista.length) {
    if (q) v.innerHTML = `<b>🔍</b>Nessun prodotto trovato per “${esc(ricerca)}”.`;
    else if (filtro === "ritirare" && prodotti.length) v.innerHTML = `<b>✅</b>Niente da ritirare oggi.`;
    else v.innerHTML = `<b>📦</b>Nessun prodotto registrato.<br>Tocca “Aggiungi prodotto” per iniziare.`;
  }
}

document.querySelectorAll(".scheda").forEach((b) =>
  b.addEventListener("click", () => {
    filtro = b.dataset.filtro;
    document.querySelectorAll(".scheda").forEach((x) => x.classList.toggle("attiva", x === b));
    disegna();
  })
);
$("#cerca").addEventListener("input", (e) => {
  ricerca = e.target.value;
  disegna();
});
$("#lista").addEventListener("click", (e) => {
  const li = e.target.closest(".voce");
  if (li) apriDettaglio(li.dataset.id);
});

// Il countdown cambia a mezzanotte: ridisegna quando si torna sull'app.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && prodotti.length) disegna();
});

// ── Fogli (con tasto "indietro" di Android) ─────────────────
const aperti = [];
function apri(id) {
  $(id).hidden = false;
  aperti.push(id);
  history.pushState({ foglio: id }, "");
}
function chiudi() {
  if (aperti.length) history.back();
}
window.addEventListener("popstate", () => {
  const id = aperti.pop();
  if (!id) return;
  $(id).hidden = true;
  if (id === "#s-scanner") fermaScanner?.();
  if (id === "#s-dettaglio") dettaglioId = null;
});
document.querySelectorAll("[data-chiudi]").forEach((b) => b.addEventListener("click", chiudi));
document.querySelectorAll(".foglio").forEach((f) =>
  f.addEventListener("click", (e) => {
    if (e.target === f) chiudi();
  })
);

// ── Modulo prodotto ──────────────────────────────────────────
function apriModulo(p = null) {
  inModifica = p?.id || null;
  $("#form-titolo").textContent = p ? "Modifica prodotto" : "Nuovo prodotto";
  $("#p-codice").value = p?.codice || "";
  $("#p-nome").value = p?.nome || "";
  $("#p-scadenza").value = p ? formatoData(p.scadenza) : "";
  impostaFoto(p?.foto || null);
  $("#p-noto").hidden = true;
  $("#p-errore").hidden = true;
  aggiornaAnteprima();
  apri("#s-form");
}

function impostaFoto(f) {
  fotoCorrente = f;
  $("#p-foto-img").hidden = !f;
  if (f) $("#p-foto-img").src = f;
  $("#p-foto-vuoto").hidden = !!f;
  $("#b-foto-via").hidden = !f;
}

$("#b-aggiungi").addEventListener("click", () => apriModulo());

$("#p-foto").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  $("#p-foto-vuoto").textContent = "Elaboro…";
  try {
    impostaFoto(await comprimiFoto(file));
  } catch {
    toast("Non riesco a leggere la foto");
  } finally {
    $("#p-foto-vuoto").textContent = "📷 Scatta una foto";
  }
});
$("#b-foto-via").addEventListener("click", () => impostaFoto(null));

// Scadenza: inserisce le barre da solo mentre scrivi (050327 → 05/03/27)
$("#p-scadenza").addEventListener("input", (e) => {
  const el = e.target;
  if (!e.inputType?.startsWith("delete")) {
    const c = el.value.replace(/\D/g, "").slice(0, 8);
    el.value = c.slice(0, 2) + (c.length > 2 ? "/" + c.slice(2, 4) : "") + (c.length > 4 ? "/" + c.slice(4) : "");
  }
  aggiornaAnteprima();
});
function aggiornaAnteprima() {
  const iso = leggiData($("#p-scadenza").value);
  const a = $("#p-anteprima");
  if (!iso) {
    a.textContent =
      $("#p-scadenza").value.length >= 8
        ? "Data non valida"
        : "Solo numeri: 05032027. Se c'è solo mese e anno: 032027";
    a.style.color = "var(--tenue)";
    return;
  }
  const c = countdown(iso);
  a.textContent = `${formatoData(iso)} → ${c.testo}`;
  a.style.color = `var(--${c.livello === "scaduto" ? "urgente" : c.livello})`;
}

async function codiceInserito(codice) {
  if (!codice) return;
  const noto = await dati.cercaCatalogo(codice);
  if (noto && $("#p-codice").value === codice) {
    if (!$("#p-nome").value) $("#p-nome").value = noto.nome;
    if (!fotoCorrente && noto.foto) impostaFoto(noto.foto);
    const n = $("#p-noto");
    n.textContent = "✓ Prodotto già registrato in passato: nome e foto compilati";
    n.hidden = false;
    $("#p-scadenza").focus();
  }
}
$("#p-codice").addEventListener("change", (e) => codiceInserito(e.target.value.trim()));

$("#f-prodotto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#p-errore");
  const nome = $("#p-nome").value.trim();
  const scadenza = leggiData($("#p-scadenza").value);
  const codice = $("#p-codice").value.trim().replace(/\s/g, "");
  err.hidden = false;
  if (!nome) return (err.textContent = "Scrivi il nome del prodotto");
  if (!scadenza) return (err.textContent = "Scrivi la scadenza come GG/MM/AAAA (o MM/AAAA)");
  if (codice && !/^[\w\-]{1,40}$/.test(codice)) return (err.textContent = "Il codice contiene caratteri non validi");
  err.hidden = true;

  const campi = { codice, nome, scadenza, foto: fotoCorrente };
  try {
    if (inModifica) {
      await dati.modifica(inModifica, campi);
      toast("Modifiche salvate");
    } else {
      await dati.aggiungi({ ...campi, da: memoria.get("nome") || "" });
      toast(`Salvato: ${countdown(scadenza).testo.toLowerCase()}`);
    }
    chiudi();
  } catch (ex) {
    err.textContent = "Non sono riuscito a salvare: " + ex.message;
    err.hidden = false;
  }
});

// ── Scanner ──────────────────────────────────────────────────
let fermaScanner = null;
$("#b-scansiona").addEventListener("click", async () => {
  apri("#s-scanner");
  try {
    const { risultato, ferma } = await scansiona($("#video"));
    fermaScanner = ferma;
    const codice = await risultato;
    navigator.vibrate?.(80);
    $("#p-codice").value = codice;
    chiudi();
    codiceInserito(codice);
  } catch (e) {
    chiudi();
    toast(
      e?.name === "NotAllowedError"
        ? "Serve il permesso per la fotocamera (impostazioni del browser)"
        : "Fotocamera non disponibile: scrivi il codice a mano"
    );
  }
});
$("#b-scanner-chiudi").addEventListener("click", chiudi);

// ── Dettaglio ────────────────────────────────────────────────
function apriDettaglio(id) {
  dettaglioId = id;
  aggiornaDettaglio();
  apri("#s-dettaglio");
}
function aggiornaDettaglio() {
  const p = prodotti.find((x) => x.id === dettaglioId);
  if (!p) return;
  const c = countdown(p.scadenza);
  $("#dettaglio").innerHTML = `
    ${p.foto ? `<img class="det-foto" src="${p.foto}" alt="" />` : ""}
    <div class="det-nome">${esc(p.nome)}</div>
    <span class="pill det-pill l-${c.livello}">${c.testo}</span>
    <div class="det-riga"><span>Scadenza</span><span>${formatoData(p.scadenza)}</span></div>
    ${p.codice ? `<div class="det-riga"><span>Codice</span><span>${esc(p.codice)}</span></div>` : ""}
    ${p.da ? `<div class="det-riga"><span>Registrato da</span><span>${esc(p.da)}</span></div>` : ""}`;
}
$("#b-modifica").addEventListener("click", () => {
  const p = prodotti.find((x) => x.id === dettaglioId);
  if (!p) return;
  history.back();
  setTimeout(() => apriModulo(p), 50);
});
$("#b-ritirato").addEventListener("click", async () => {
  const p = prodotti.find((x) => x.id === dettaglioId);
  if (!p) return;
  chiudi();
  await dati.rimuovi(p.id);
  const { id, creato, ...copia } = p;
  toast(`“${p.nome}” tolto dalla lista`, "Annulla", () => dati.aggiungi(copia));
});

// ── Menu ─────────────────────────────────────────────────────
$("#b-menu").addEventListener("click", () => {
  $("#menu-chi").textContent = `Sei entrato come ${memoria.get("nome") || "?"}${dati.demo ? " (modalità demo)" : ""}.`;
  apri("#s-menu");
});
$("#b-cambia-nome").addEventListener("click", () => {
  const n = prompt("Il tuo nome", memoria.get("nome") || "");
  if (n && n.trim()) {
    memoria.set("nome", n.trim());
    $("#menu-chi").textContent = `Sei entrato come ${n.trim()}.`;
  }
});
$("#b-esci").addEventListener("click", async () => {
  if (!confirm("Vuoi uscire? Per rientrare servirà il codice negozio.")) return;
  stopAscolto?.();
  await dati.logout();
  memoria.set("nome", "");
  chiudi();
  mostraLogin();
});

// ── Toast ────────────────────────────────────────────────────
let timerToast;
function toast(testo, azione, fn) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(testo)}</span>${azione ? `<button>${esc(azione)}</button>` : ""}`;
  t.hidden = false;
  if (azione) t.querySelector("button").onclick = () => { t.hidden = true; fn(); };
  clearTimeout(timerToast);
  timerToast = setTimeout(() => (t.hidden = true), azione ? 6000 : 2500);
}

avvio();
