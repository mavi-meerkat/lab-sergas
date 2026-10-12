// Progreso del usuario sincronizado con Firestore (funciona sin conexión gracias a la caché persistente).
//
// Estructura en Firestore (todo bajo users/{uid}):
//   d/general    -> { ajustes:{}, lecciones:{lid:{tarjeta,completada,fecha}}, diario:{fecha:{...}}, validaciones:{} }
//   d/preguntas  -> { [qid]: {aciertos, fallos, factor, intervalo, escalon_facil, estado, proxima, ... } }
//   resp/{fecha} -> { items: [ {id, t, q, u, c, e, x} ] }   (respuestas del día, solo se añaden)
//   sims/{id}    -> simulacro completo
import {
  doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, writeBatch,
  increment, arrayUnion, deleteField, FieldPath,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { hoy, ahoraISO } from "./util.js";

export const FACTOR_INICIAL = 2.5;
const DEF_PREGUNTA = () => ({
  aciertos: 0, fallos: 0, factor: FACTOR_INICIAL, intervalo: 0, escalon_facil: 0, estado: "nuevo",
  proxima: null, emergencia: 0, ultimo_distractor: null, repeticion_distractor: 0, alerta_trampa: 0, vista: null,
});

export class Store {
  constructor(db, uid) {
    this.db = db;
    this.uid = uid;
    this.g = { ajustes: {}, lecciones: {}, diario: {}, validaciones: {} };
    this.p = {};
    this.respDia = {};      // fecha -> items
    this.sims = {};         // id -> sim
    this._resp = null;      // caché ordenada
    this.listeners = new Set();
    this.refGeneral = doc(db, "users", uid, "d", "general");
    this.refPreg = doc(db, "users", uid, "d", "preguntas");
    this.refNotas = doc(db, "users", uid, "d", "notas");   // trucos propios por pregunta
    this.notas = {};
    this.colResp = collection(db, "users", uid, "resp");
    this.colSims = collection(db, "users", uid, "sims");
    this.sincronizado = false;
    this.pendientes = false;
  }

  /** Arranca la escucha. Resuelve cuando hay un primer estado (de caché o del servidor). */
  iniciar(migracion) {
    const listos = { g: false, p: false, r: false, s: false, n: false };
    let resolver;
    const prom = new Promise((r) => (resolver = r));
    const comprobar = () => { if (Object.values(listos).every(Boolean)) resolver(); };
    this._unsubs = [
      onSnapshot(this.refGeneral, { includeMetadataChanges: true }, (snap) => {
        this._meta(snap);
        if (snap.exists()) {
          const d = snap.data();
          this.g = { ajustes: d.ajustes || {}, lecciones: d.lecciones || {}, diario: d.diario || {}, validaciones: d.validaciones || {} };
        } else if (!snap.metadata.fromCache && migracion && !this._migrando) {
          this._migrando = true;
          this.importar(migracion).catch((e) => console.error("migración", e));
        }
        listos.g = true; comprobar(); this._emit("general", snap);
      }, (e) => this._error(e)),
      onSnapshot(this.refPreg, (snap) => {
        this.p = snap.exists() ? snap.data() : {};
        listos.p = true; comprobar(); this._emit("preguntas", snap);
      }, (e) => this._error(e)),
      onSnapshot(this.refNotas, (snap) => {
        this.notas = snap.exists() ? snap.data() : {};
        listos.n = true; comprobar(); this._emit("notas", snap);
      }, (e) => { listos.n = true; comprobar(); this._error(e); }),
      onSnapshot(this.colResp, (snap) => {
        for (const ch of snap.docChanges()) {
          if (ch.type === "removed") delete this.respDia[ch.doc.id];
          else this.respDia[ch.doc.id] = ch.doc.data().items || [];
        }
        this._resp = null;
        listos.r = true; comprobar(); this._emit("respuestas", snap);
      }, (e) => this._error(e)),
      onSnapshot(this.colSims, (snap) => {
        for (const ch of snap.docChanges()) {
          if (ch.type === "removed") delete this.sims[ch.doc.id];
          else this.sims[ch.doc.id] = { ...ch.doc.data(), id: ch.doc.id };
        }
        listos.s = true; comprobar(); this._emit("sims", snap);
      }, (e) => this._error(e)),
    ];
    return prom;
  }
  _meta(snap) {
    this.sincronizado = !snap.metadata.fromCache;
    this.pendientes = snap.metadata.hasPendingWrites;
  }
  _error(e) {
    console.error("Firestore", e);
    this._emit("error", e);
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(tipo, snap) {
    const remoto = snap && snap.metadata ? !snap.metadata.hasPendingWrites && !snap.metadata.fromCache : false;
    for (const fn of this.listeners) { try { fn(tipo, remoto, snap); } catch (e) { console.error(e); } }
  }
  _w(prom) { prom.catch((e) => this._error(e)); }

  hoy() { return hoy(); }

  // ---------------------------------------------------------------- ajustes
  get(k, def = null) { return k in this.g.ajustes && this.g.ajustes[k] !== null ? this.g.ajustes[k] : def; }
  set(k, v) {
    this.g.ajustes[k] = v;
    this._w(setDoc(this.refGeneral, { ajustes: { [k]: v } }, { merge: true }));
  }

  // ---------------------------------------------------------------- preguntas
  estado(qid) { return { ...DEF_PREGUNTA(), ...(this.p[qid] || {}) }; }
  actualizar(qid, campos) {
    const nuevo = { ...this.estado(qid), ...campos };
    this.p[qid] = nuevo;
    this._w(setDoc(this.refPreg, { [qid]: nuevo }, { merge: true }));
  }
  /** ids de preguntas ya vistas (estado distinto de nuevo). */
  vistas() {
    const s = new Set();
    for (const [qid, e] of Object.entries(this.p)) if (e.estado && e.estado !== "nuevo") s.add(qid);
    return s;
  }

  // ---------------------------------------------------------------- trucos propios (mnemotecnias)
  nota(qid) { return this.notas[qid] || ""; }
  setNota(qid, texto) {
    texto = (texto || "").trim().slice(0, 600);
    if (texto) {
      this.notas[qid] = texto;
      this._w(setDoc(this.refNotas, { [qid]: texto }, { merge: true }));
    } else {
      delete this.notas[qid];
      this._w(setDoc(this.refNotas, { [qid]: deleteField() }, { merge: true }));
    }
  }

  // ---------------------------------------------------------------- respuestas
  respuestas() {
    if (!this._resp) {
      const todas = [];
      for (const items of Object.values(this.respDia)) todas.push(...items);
      todas.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
      this._resp = todas;
    }
    return this._resp;
  }
  registrarRespuesta(qid, unidad, correcta, elegida, contexto, { certeza = null, ms = null } = {}) {
    const t = ahoraISO();
    const item = { id: Math.random().toString(36).slice(2, 10), t, q: qid, u: unidad || null, c: correcta ? 1 : 0, e: elegida || null, x: contexto };
    // k: certeza declarada (s = segura, d = duda, a = al azar); ms: tiempo de respuesta
    const k = { segura: "s", duda: "d", azar: "a" }[certeza];
    if (k) item.k = k;
    if (ms) item.ms = Math.min(600000, Math.round(ms / 100) * 100);
    const dia = t.slice(0, 10);
    (this.respDia[dia] ||= []).push(item);
    this._resp = null;
    this._w(setDoc(doc(this.colResp, dia), { items: arrayUnion(item) }, { merge: true }));
    return item;
  }

  // ---------------------------------------------------------------- diario
  diario(fecha = hoy()) {
    return { nuevas: 0, lecciones: 0, pase_usado: 0, minutos: 0, ...(this.g.diario[fecha] || {}) };
  }
  sumarDiario(campo, n = 1) {
    const f = hoy();
    const d = (this.g.diario[f] ||= {});
    d[campo] = (d[campo] || 0) + n;
    this._w(setDoc(this.refGeneral, { diario: { [f]: { [campo]: increment(n) } } }, { merge: true }));
  }

  // ---------------------------------------------------------------- lecciones
  leccion(lid) { return { tarjeta: 0, completada: 0, fecha: null, ...(this.g.lecciones[lid] || {}) }; }
  guardarLeccion(lid, tarjeta, completada = null) {
    const ant = this.leccion(lid);
    const nuevo = { ...ant, tarjeta };
    if (completada !== null) {
      nuevo.completada = completada ? 1 : 0;
      nuevo.fecha = hoy();
      if (completada && !ant.completada) this.sumarDiario("lecciones");
    }
    this.g.lecciones[lid] = nuevo;
    this._w(setDoc(this.refGeneral, { lecciones: { [lid]: nuevo } }, { merge: true }));
  }
  leccionesCompletadas() {
    return new Set(Object.entries(this.g.lecciones).filter(([, l]) => l.completada).map(([k]) => k));
  }

  // ---------------------------------------------------------------- validaciones
  validaciones() { return this.g.validaciones; }
  setValidacion(qid, v) {
    if (v === null) {
      delete this.g.validaciones[qid];
      this._w(updateDoc(this.refGeneral, new FieldPath("validaciones", qid), deleteField()));
    } else {
      this.g.validaciones[qid] = v;
      this._w(setDoc(this.refGeneral, { validaciones: { [qid]: v } }, { merge: true }));
    }
  }

  // ---------------------------------------------------------------- simulacros
  listaSims() { return Object.values(this.sims); }
  sim(id) { return this.sims[String(id)] || null; }
  guardarSim(sim) {
    const id = String(sim.id);
    this.sims[id] = { ...sim, id };
    const { id: _, ...datos } = this.sims[id];
    this._w(setDoc(doc(this.colSims, id), JSON.parse(JSON.stringify(datos))));
  }
  actualizarSim(id, campos) {
    id = String(id);
    if (!this.sims[id]) return;
    Object.assign(this.sims[id], campos);
    // updateDoc reemplaza cada campo entero (p. ej. el mapa de respuestas al borrar una)
    this._w(updateDoc(doc(this.colSims, id), JSON.parse(JSON.stringify(campos))));
  }
  borrarSim(id) {
    id = String(id);
    delete this.sims[id];
    this._w(deleteDoc(doc(this.colSims, id)));
  }

  // ---------------------------------------------------------------- mantenimiento
  async borrarTodo() {
    const b = writeBatch(this.db);
    b.set(this.refGeneral, { ajustes: this.g.ajustes, lecciones: {}, diario: {}, validaciones: this.g.validaciones });
    b.set(this.refPreg, {});
    for (const id of Object.keys(this.respDia)) b.delete(doc(this.colResp, id));
    await b.commit();
    this.g.lecciones = {}; this.g.diario = {}; this.p = {}; this.respDia = {}; this._resp = null;
  }

  /** Importa el progreso de la app de escritorio (formato build_content.py). */
  async importar(m, sobrescribir = false) {
    const b = writeBatch(this.db);
    const general = {
      ajustes: m.ajustes || {}, lecciones: m.lecciones || {}, diario: m.diario || {},
      validaciones: m.validaciones || {}, migrado: ahoraISO(),
    };
    if (sobrescribir) b.set(this.refGeneral, general);
    else b.set(this.refGeneral, general, { merge: true });
    b.set(this.refPreg, m.preguntas || {}, { merge: !sobrescribir });
    const porDia = {};
    for (const r of m.respuestas || []) {
      const it = { id: Math.random().toString(36).slice(2, 10), t: r.ts, q: r.pregunta, u: r.unidad, c: r.correcta ? 1 : 0, e: r.elegida, x: r.contexto || "tutor" };
      (porDia[r.ts.slice(0, 10)] ||= []).push(it);
    }
    for (const [dia, items] of Object.entries(porDia)) b.set(doc(this.colResp, dia), { items: arrayUnion(...items) }, { merge: true });
    for (const s of m.simulacros || []) {
      const id = String(Date.parse(s.inicio) || s.id);
      const { id: _, ...datos } = { ...s, id_original: s.id };
      b.set(doc(this.colSims, id), JSON.parse(JSON.stringify(datos)));
    }
    await b.commit();
  }

  async exportar() {
    return { g: this.g, p: this.p, notas: this.notas, resp: this.respDia, sims: this.sims, fecha: ahoraISO() };
  }

  async refrescarRespuestas() {
    const s = await getDocs(this.colResp);
    this.respDia = {};
    s.forEach((d) => (this.respDia[d.id] = d.data().items || []));
    this._resp = null;
  }
}
