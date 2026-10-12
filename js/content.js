// Contenido de estudio: se descarga cifrado (content.enc) y se descifra con la clave que guarda Firestore.
// Una vez descifrado se guarda en IndexedDB para funcionar sin conexión.
import { norm } from "./util.js";

const DB_NOMBRE = "lab-sergas";
const AAD = new TextEncoder().encode("LAB-SERGAS-v1");

function idb() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(DB_NOMBRE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
export async function kvGet(k) {
  try {
    const db = await idb();
    return await new Promise((ok, mal) => {
      const t = db.transaction("kv").objectStore("kv").get(k);
      t.onsuccess = () => ok(t.result);
      t.onerror = () => mal(t.error);
    });
  } catch { return undefined; }
}
export async function kvSet(k, v) {
  try {
    const db = await idb();
    await new Promise((ok, mal) => {
      const t = db.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, k);
      t.oncomplete = ok;
      t.onerror = () => mal(t.error);
    });
  } catch (e) { console.warn("kvSet", e); }
}
export async function kvDel(k) {
  try {
    const db = await idb();
    await new Promise((ok) => {
      const t = db.transaction("kv", "readwrite");
      t.objectStore("kv").delete(k);
      t.oncomplete = ok; t.onerror = ok;
    });
  } catch { /* nada */ }
}

function b64urlBytes(s) {
  s = s.trim().replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** Descifra content.enc. Lanza error si la clave no es correcta. */
export async function descifrar(buf, claveTxt) {
  const bytes = new Uint8Array(buf);
  const key = await crypto.subtle.importKey("raw", b64urlBytes(claveTxt), "AES-GCM", false, ["decrypt"]);
  const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: AAD }, key, bytes.slice(12));
  const ds = new Response(new Blob([plano]).stream().pipeThrough(new DecompressionStream("gzip")));
  return JSON.parse(await ds.text());
}

/** Versión publicada del contenido (o null sin conexión). */
export async function versionRemota() {
  try {
    const r = await fetch("content.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()).v;
  } catch { return null; }
}
export async function descargarCifrado(v) {
  const r = await fetch("content.enc?v=" + encodeURIComponent(v || ""), { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo descargar el contenido (" + r.status + ")");
  return await r.arrayBuffer();
}

// ------------------------------------------------------------------ modelo
export const necesitaValidar = (q) => !!q.alerta && !q.respuesta_oficial && !q.anulada;

export class Contenido {
  constructor(raw) {
    this.raw = raw;
    this.modulos = raw.temario.modulos;
    this.unidades = {};
    for (const m of this.modulos) {
      for (const u of m.unidades) {
        this.unidades[u.id] = {
          id: u.id, modulo: m.numero, numero: u.numero, titulo: u.titulo, libro: m.libro,
          peso_examen: u.peso_examen || 0, contenidos: u.contenidos || [],
        };
      }
    }
    this.lecciones = raw.lecciones;
    this.preguntas = {};
    for (const q of raw.preguntas) {
      q._correcta_original = q.correcta;
      this.preguntas[q.id] = q;
    }
    this.audio = raw.audio || {};
    this._ruta = Object.values(this.unidades).sort(
      (a, b) => b.peso_examen - a.peso_examen || a.modulo - b.modulo || a.numero - b.numero);
    this.validaciones = null; // lo pone la app (depende del progreso)
  }
  ruta() { return this._ruta; }
  preguntasDeUnidad(uid) { return Object.values(this.preguntas).filter((q) => q.unidad === uid); }
  modulo(n) { return this.modulos.find((m) => m.numero === n); }
  nombreLibro(codigo) {
    const m = this.modulos.find((m) => m.libro === codigo);
    return m ? `${codigo} · ${m.titulo}` : codigo || "libro";
  }
  porValidar(qid) {
    const q = this.preguntas[qid] || {};
    return necesitaValidar(q) || (this.validaciones && qid in this.validaciones.datos());
  }
}

export const ESTADOS_VALIDACION = {
  pendiente: "Pendiente de validar",
  confirmada: "Confirmada por profesional",
  corregida: "Corregida por profesional",
  dudosa: "Dudosa (consultar otra fuente)",
};

/** Revisión humana de respuestas sin apoyo en los libros. Los datos viven en el progreso sincronizado. */
export class Validaciones {
  constructor(contenido, store) {
    this.c = contenido;
    this.s = store;
    this.aplicarTodas();
  }
  datos() { return this.s.validaciones(); }
  estado(qid) { return (this.datos()[qid] || {}).estado || "pendiente"; }
  _aplicar(qid) {
    const q = this.c.preguntas[qid];
    if (!q) return;
    const v = this.datos()[qid] || {};
    q.correcta = v.estado === "corregida" && "ABCD".includes(v.correcta || "x") ? v.correcta : q._correcta_original;
  }
  aplicarTodas() {
    for (const qid in this.c.preguntas) this._aplicar(qid);
  }
  guardar(qid, estado, correcta, nota = "", quien = "") {
    this.s.setValidacion(qid, { estado, correcta: correcta || null, nota: nota.trim(), quien: quien.trim(), fecha: this.s.hoy() });
    this._aplicar(qid);
  }
  marcar(qid) {
    if (!(qid in this.datos())) {
      this.s.setValidacion(qid, { estado: "pendiente", correcta: null, nota: "Marcada por mí para revisar", quien: "", fecha: this.s.hoy() });
    }
  }
  quitar(qid) {
    this.s.setValidacion(qid, null);
    this._aplicar(qid);
  }
  lista() {
    const d = this.datos();
    const ids = Object.keys(this.c.preguntas).filter((qid) => necesitaValidar(this.c.preguntas[qid]) || qid in d);
    return ids.sort((a, b) => {
      const ua = this.c.preguntas[a].unidad || "", ub = this.c.preguntas[b].unidad || "";
      return ua < ub ? -1 : ua > ub ? 1 : a < b ? -1 : a > b ? 1 : 0;
    });
  }
  pendientes() {
    return this.lista().filter((q) => ["pendiente", "dudosa"].includes(this.estado(q)));
  }
}

export { norm };
