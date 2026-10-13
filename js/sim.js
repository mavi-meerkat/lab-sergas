// Simulacros de examen — formato oficial SERGAS. Port de simulacro.py.
import { norm, rngSemilla, ahoraISO } from "./util.js";
import { necesitaValidar } from "./content.js";
import { tipoFallo } from "./cifras.js";

export const PUNTOS_ACIERTO = 0.5;
export const PUNTOS_FALLO = -0.125;
export const TIPOS = {
  oficial: ["Simulacro oficial", 100, 10, 150],
  medio: ["Medio simulacro", 50, 5, 75],
  rapido: ["Simulacro rápido", 30, 0, 45],
  modulo: ["Simulacro de un módulo", 30, 0, 45],
};
const VENTANA_REPETICION = 4;
const MAX_POR_TEMA = 2;
const NO_BARAJAR = /(anterior|todas|ninguna|\b[a-dA-D]\s*y\s*[a-dA-D]\b|respuestas?\s+[a-dA-D]\b|son correctas|es correcta|son falsas)/i;

const STOP = new Set(`a al ante bajo con contra de del desde durante en entre hacia hasta mediante para por segun sin sobre tras
el la los las un una unos unas lo y o u e ni que se su sus es son ser esta estan este esto ese esa como cual cuales
mas menos muy no si tambien ya cuando donde porque pues sino tanto todo toda todos todas otro otra otros otras puede
pueden hay ha han tiene tienen sea siendo dicho dicha ello ella ellos cada mismo misma correcta correcto incorrecta
señale senale indique cual afirmacion opcion respuesta respuestas siguiente siguientes verdadera falsa`.split(/\s+/));

export function tokens(s) {
  const m = norm(s).match(/[a-z0-9αβγκλ]+/g) || [];
  return new Set(m.filter((t) => t.length > 2 && !STOP.has(t)));
}
const inter = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
export function textoOpcion(q, letra) {
  return q.opciones["ABCD".indexOf(letra)].replace(/^[A-D]\)\s*/, "");
}
export const barajable = (q) => !q.opciones.some((o) => NO_BARAJAR.test(o));

function sorteoPonderado(rng, items, pesos, k) {
  const claves = items.map((it, i) => [rng() ** (1 / Math.max(pesos[i], 1e-9)), it]);
  claves.sort((a, b) => b[0] - a[0]);
  return claves.slice(0, k).map((x) => x[1]);
}

export class Simulacros {
  constructor(contenido, store, motor) {
    this.c = contenido; this.p = store; this.m = motor;
  }

  pool(modulo = null, soloEstudiado = false) {
    const hechas = soloEstudiado ? this.p.leccionesCompletadas() : null;
    const res = [];
    for (const q of Object.values(this.c.preguntas)) {
      if (q.anulada || necesitaValidar(q)) continue;
      if (this.c.validaciones.estado(q.id) === "dudosa") continue;
      const u = this.c.unidades[q.unidad];
      if (!u || (modulo && u.modulo !== modulo)) continue;
      if (hechas && !hechas.has(u.id)) continue;
      res.push(q);
    }
    return res;
  }
  frecuenciaOficial() {
    const f = {};
    for (const uid in this.c.unidades) f[uid] = 0;
    for (const q of Object.values(this.c.preguntas)) {
      if ((q.origen || "").startsWith("SERGAS") && q.unidad in f) f[q.unidad] += 1;
    }
    return f;
  }
  ordenados() {
    return this.p.listaSims().sort((a, b) => Number(b.id) - Number(a.id));
  }
  recientes() {
    const pen = {};
    this.ordenados().slice(0, VENTANA_REPETICION).forEach((s, k) => {
      for (const it of s.items || []) pen[it.q] = (pen[it.q] || 0) + 1 / (k + 1);
    });
    return pen;
  }
  pesosUnidades(pool, adaptativo) {
    const freq = this.frecuenciaOficial();
    const porU = {};
    for (const q of pool) porU[q.unidad] = (porU[q.unidad] || 0) + 1;
    const ef = adaptativo ? this.m.eficaciaUnidades() : {};
    const w = {};
    for (const uid of Object.keys(porU)) {
      let peso = ((freq[uid] || 0) + 1.5) ** 0.85;
      if (adaptativo) {
        const [pct, nresp] = ef[uid] || [null, 0];
        if (pct === null || nresp < 3) peso *= 1.15;
        else peso *= 1 + 1.6 * (1 - pct);
      }
      w[uid] = peso;
    }
    return w;
  }
  pesosPreguntas(qs, adaptativo, recientes) {
    return qs.map((q) => {
      const e = this.p.estado(q.id);
      let w = 1.0;
      if ((q.origen || "").startsWith("SERGAS")) w *= 1.6;
      w *= 1 + (adaptativo ? 0.6 : 0.25) * Math.min(3, e.fallos);
      if (e.alerta_trampa) w *= 1.5;
      if (e.estado === "consolidada") w *= adaptativo ? 0.6 : 0.85;
      w *= 0.12 ** (recientes[q.id] || 0);
      return Math.max(w, 1e-4);
    });
  }

  generar(tipo = "oficial", { modulo = null, adaptativo = false, soloEstudiado = false, semilla = null } = {}) {
    let [titulo, nMain, nRes, minutos] = TIPOS[tipo];
    semilla = semilla ?? (Date.now() % 2 ** 31);
    const rng = rngSemilla(semilla);
    const pool = this.pool(tipo === "modulo" ? modulo : null, soloEstudiado);
    const total = nMain + nRes;
    if (pool.length < total) throw new Error(`Solo hay ${pool.length} preguntas disponibles con esos filtros; hacen falta ${total}.`);
    const porU = {};
    for (const q of pool) (porU[q.unidad] ||= []).push(q);
    const wu = this.pesosUnidades(pool, adaptativo);
    const rec = this.recientes();
    const uids = Object.keys(porU);
    const cupo = Object.fromEntries(uids.map((u) => [u, 0]));
    for (let r = total; r > 0; r--) {
      const libres = uids.filter((u) => cupo[u] < porU[u].length);
      const u = rng.choice(libres, libres.map((x) => wu[x]));
      cupo[u] += 1;
    }
    let elegidas = [];
    for (const [u, n] of Object.entries(cupo)) {
      if (!n) continue;
      const qs = porU[u];
      const orden = sorteoPonderado(rng, qs, this.pesosPreguntas(qs, adaptativo, rec), qs.length);
      const porTema = {};
      const tomadas = [], resto = [];
      for (const q of orden) {
        const t = norm(q.tema || "");
        if ((porTema[t] || 0) < MAX_POR_TEMA) { porTema[t] = (porTema[t] || 0) + 1; tomadas.push(q); }
        else resto.push(q);
        if (tomadas.length === n) break;
      }
      if (tomadas.length < n) tomadas.push(...resto.slice(0, n - tomadas.length));
      elegidas.push(...tomadas);
    }
    rng.shuffle(elegidas);
    const items = elegidas.map((q, i) => {
      const orden = [0, 1, 2, 3];
      if (barajable(q)) rng.shuffle(orden);
      return { q: q.id, orden, reserva: i >= nMain };
    });
    if (tipo === "modulo" && modulo) titulo = `Simulacro · Módulo ${modulo}`;
    const config = { modulo, adaptativo, solo_estudiado: soloEstudiado, semilla, n_main: nMain, n_res: nRes };
    return this._nuevo(tipo, titulo, config, items, minutos * 60);
  }

  generarReal(anio) {
    const qs = Object.values(this.c.preguntas).filter((q) => q.id.startsWith(`SERGAS${anio}_`));
    if (!qs.length) throw new Error(`No hay preguntas del examen ${anio}.`);
    const items = qs.map((q) => ({
      q: q.id, orden: [0, 1, 2, 3], reserva: (q.origen || "").includes("(reserva)"), num: Number(q.id.split("_")[1]),
    }));
    items.sort((a, b) => (a.reserva - b.reserva) || a.num - b.num);
    const nMain = items.filter((it) => !it.reserva).length;
    return this._nuevo("real", `Examen oficial SERGAS ${anio}`, { anio, n_main: nMain, n_res: items.length - nMain }, items, 150 * 60);
  }

  _nuevo(tipo, titulo, config, items, segundos) {
    const id = String(Date.now());
    this.p.guardarSim({
      id, inicio: ahoraISO(), fin: null, tipo, titulo, config, items, respuestas: {}, marcadas: [],
      segundos_usados: 0, segundos_limite: segundos, estado: "en_curso", resumen: null,
    });
    return id;
  }

  cargar(id) { return this.p.sim(id); }
  enCurso() { return this.ordenados().find((s) => s.estado === "en_curso") || null; }
  guardarParcial(id, respuestas, marcadas, segundos) {
    this.p.actualizarSim(id, { respuestas, marcadas: [...marcadas].sort((a, b) => a - b), segundos_usados: Math.floor(segundos) });
  }
  descartar(id) { const s = this.cargar(id); if (s && s.estado === "en_curso") this.p.borrarSim(id); }
  borrar(id) { this.p.borrarSim(id); }
  historial(n = 30) { return this.ordenados().filter((s) => s.estado === "entregado").slice(0, n); }

  puntuables(sim) {
    const items = sim.items;
    const anul = (it) => !!(this.c.preguntas[it.q] || {}).anulada;
    const principales = items.map((it, i) => [it, i]).filter(([it]) => !it.reserva).map(([, i]) => i);
    const reservas = items.map((it, i) => [it, i]).filter(([it]) => it.reserva && !anul(it)).map(([, i]) => i);
    const validas = principales.filter((i) => !anul(items[i]));
    const faltan = principales.length - validas.length;
    return [...validas, ...reservas.slice(0, faltan)];
  }

  corregir(sim) {
    const items = sim.items, resp = sim.respuestas || {};
    const cuentan = new Set(this.puntuables(sim));
    const detalle = [];
    let ac = 0, fa = 0, bl = 0;
    const porMod = {};
    items.forEach((it, i) => {
      const q = this.c.preguntas[it.q];
      if (!q) return;
      const elegida = resp[String(i)] ?? null;
      let res;
      if (elegida === null) res = "blanco";
      else if (q.anulada) res = "anulada";
      else res = elegida === q.correcta ? "acierto" : "fallo";
      const cuenta = cuentan.has(i);
      if (cuenta) {
        ac += res === "acierto"; fa += res === "fallo"; bl += res === "blanco";
        const u = this.c.unidades[q.unidad];
        if (u) {
          const m = (porMod[u.modulo] ||= [0, 0, 0]);
          m[0] += res === "acierto"; m[1] += res === "fallo"; m[2] += res === "blanco";
        }
      }
      detalle.push({ i, q: it.q, elegida, res, cuenta });
    });
    const n = cuentan.size;
    const neta = ac * PUNTOS_ACIERTO + fa * PUNTOS_FALLO;
    const maximo = n * PUNTOS_ACIERTO;
    const r3 = (x) => Math.round(x * 1000) / 1000;
    return {
      aciertos: ac, fallos: fa, blancos: bl, n, neta: r3(neta), maximo,
      sobre10: maximo ? Math.round((1000 * neta) / maximo) / 100 : 0, por_modulo: porMod, detalle,
      puntos_perdidos_fallos: r3(-fa * PUNTOS_FALLO),
    };
  }

  entregar(id, respuestas, marcadas, segundos) {
    this.guardarParcial(id, respuestas, marcadas, segundos);
    const sim = this.cargar(id);
    if (sim.estado === "entregado") return sim.resumen;
    const res = this.corregir(sim);
    const marc = new Set(sim.marcadas || []);
    for (const d of res.detalle) {
      // las marcadas para revisar son las que dudabas: alimentan el entrenamiento de la seguridad
      const dudada = marc.has(d.i);
      if (d.res === "fallo") this.m.responder(d.q, d.elegida, "simulacro", { certeza: dudada ? "duda" : null });
      else if (d.res === "acierto") {
        const q = this.c.preguntas[d.q];
        const e = this.p.estado(d.q);
        this.p.registrarRespuesta(d.q, q.unidad, true, d.elegida, "simulacro", { certeza: dudada ? "duda" : null });
        this.p.actualizar(d.q, { aciertos: e.aciertos + 1 });
        if (dudada) this.m.aciertoDudoso(d.q);
      }
    }
    this.p.actualizarSim(id, {
      estado: "entregado", fin: ahoraISO(), aciertos: res.aciertos, fallos: res.fallos, blancos: res.blancos,
      neta: res.neta, resumen: res,
    });
    return res;
  }

  // ------------------------------------------------------------ «Entender el error»
  diagnostico(qid, elegida) {
    const q = this.c.preguntas[qid];
    const correcta = q.correcta;
    const txtOk = textoOpcion(q, correcta);
    const txtTu = elegida ? textoOpcion(q, elegida) : null;
    const enun = norm(q.enunciado);
    const causas = [];

    const negativa = /\b(no|incorrect[ao]s?|fals[ao]s?|excepto|salvo|menos)\b/.test(enun) &&
      /(no es|no corresponde|no se|no produce|no detecta|no pertenece|incorrect|fals|excepto|salvo|no ser|no esta|no sera|no estan|no forma|no aparece|no indica|no tiene)/.test(enun);
    if (negativa) causas.push(["Pregunta en negativo",
      "El enunciado pide la opción FALSA o la que NO cumple. Tres opciones son ciertas y solo una es la «intrusa». " +
      "Truco: lee cada opción y pon V o F; la respuesta es la única F."]);

    const okN = norm(txtOk);
    const combinada = /(\b[a-d]\s*y\s*[a-d]\b|todas|ambas|anteriores)/.test(okN);
    if (combinada && elegida) {
      const letras = okN.match(/\b([a-d])\b/g) || [];
      if (letras.includes(elegida.toLowerCase()) || /todas|anteriores/.test(okN)) {
        causas.push(["Respuesta incompleta",
          `Tu opción era cierta, pero la correcta la incluye y además añade otra: «${txtOk}». En el SERGAS, cuando dos ` +
          "opciones son verdad, suele haber una que las junta. Antes de marcar, comprueba si hay una opción que agrupe."]);
      }
    }
    if (elegida && /(todas|anteriores|ninguna)/.test(norm(txtTu || "")) && !combinada) {
      causas.push(["Elegiste «todas / ninguna»",
        "Marcaste una opción global, pero al menos una de las otras es falsa (o cierta). Para elegir «todas» tienes que estar seguro de CADA una."]);
    }
    const tf = tipoFallo(q, elegida);
    if (tf && tf.tipo === "inversion") {
      causas.push(["Dígitos invertidos",
        `Marcaste «${txtTu}» y la correcta es «${txtOk}»: ${tf.tu} en vez de ${tf.ok}, los mismos dígitos en otro orden. ` +
        "La cifra la sabías; el fallo fue al leerla. Antes de marcar una opción con números, léela dígito a dígito."]);
    } else if (tf && tf.tipo === "cifra") {
      causas.push(["Fallo de cifra",
        `Las opciones dicen lo mismo y solo cambia el número: marcaste ${tf.tu} y era ${tf.ok}. ` +
        "El concepto lo tienes; lo que falta es fijar el valor exacto."]);
    }
    const e = this.p.estado(qid);
    if (elegida && e.ultimo_distractor === elegida && e.repeticion_distractor >= 2) {
      causas.push(["Distractor repetido (ALERTA TRAMPA)",
        `Es la ${e.repeticion_distractor}.ª vez que eliges esta misma opción incorrecta. Ya no es un despiste: tienes la ` +
        "idea equivocada fijada. A partir de ahora te saldrá con las opciones cambiadas de orden."]);
    }
    let confundida = null;
    if (txtTu) {
      const tt = tokens(txtTu);
      let mejor = 0;
      for (const o of Object.values(this.c.preguntas)) {
        if (o.id === qid || o.anulada) continue;
        const to = tokens(textoOpcion(o, o.correcta));
        if (tt.size < 2 || !to.size) continue;
        const i = inter(tt, to);
        const sim = i / (tt.size + to.size - i);
        if (sim > mejor && sim >= 0.6) { mejor = sim; confundida = o; }
      }
    }
    if (confundida) causas.push(["Confusión con otro concepto",
      `Lo que marcaste («${txtTu}») es la respuesta correcta de otra pregunta: «${confundida.enunciado}». Estás mezclando los dos conceptos.`]);
    if (!elegida) causas.push(["Pregunta en blanco",
      "No restó, pero tampoco sumó. Recuerda la cuenta: el fallo resta 0,125 (la cuarta parte de un acierto), así que " +
      "incluso al azar arriesgar tiene esperanza positiva (+0,03), y si descartas una opción, +0,08."]);
    if (!causas.length) causas.push(["Concepto sin fijar",
      "No es una trampa de redacción: el dato de la opción correcta no estaba consolidado. Repasa la explicación y la tarjeta de la lección de abajo."]);

    let sobreTu = null;
    if (txtTu) {
      const tt = tokens(txtTu);
      const exp = (q.explicacion_rapida || "").replace(/\b(p\. ?ej|ej|aprox|etc|vs|pág|n\.º)\./g, (m) => m.replace(/\./g, "§"));
      const frases = exp.split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ¿«(0-9])/).map((f) => f.replace(/§/g, "."));
      const raiz = (ts) => new Set([...ts].map((t) => t.slice(0, 5)));
      const rt = raiz(tt);
      const punt = frases.filter((f) => f.length >= 25).map((f) => [inter(rt, raiz(tokens(f))), f]);
      punt.sort((a, b) => b[0] - a[0]);
      if (punt.length && punt[0][0] >= 1 && frases.length > 1) sobreTu = punt[0][1];
    }
    const { leccion, idx, tarjeta, trampa } = this.tarjetasRelacionadas(q);
    const h = this.m.historialPregunta(qid);
    const ef = this.m.eficaciaUnidades()[q.unidad];
    return {
      q, correcta, elegida, txt_ok: txtOk, txt_tu: txtTu, causas, sobre_tu: sobreTu, leccion, tarjeta_idx: idx,
      tarjeta, trampa, unidad: this.c.unidades[q.unidad] || null, veces: h.n, veces_ok: h.ok, pct_unidad: ef ? ef[0] : null,
    };
  }

  tarjetasRelacionadas(q) {
    const lid = q.unidad;
    const lec = this.c.lecciones[lid];
    if (!lec) return { leccion: null, idx: null, tarjeta: null, trampa: null };
    const tarjetas = lec.tarjetas.filter((t) => !["comprobacion", "examen"].includes(t.tipo) || t.pregunta in this.c.preguntas);
    const clave = tokens(`${q.enunciado} ${textoOpcion(q, q.correcta)} ${q.tema || ""} ${q.explicacion_rapida || ""}`);
    const texto = (t) => {
      const p = [t.titulo || "", t.texto || ""];
      for (const f of t.filas || []) p.push(...f.map(String));
      for (const n of t.nodos || []) p.push(n.t || "", n.d || "");
      for (const r of t.ramas || []) p.push(r.t || "", ...(r.hijos || []));
      return p.join(" ");
    };
    const explicativas = ["concepto", "tabla", "esquema", "explicacion", "mnemotecnia", "ejercicio"];
    let idx = null;
    for (let i = 0; i < tarjetas.length; i++) {
      if (tarjetas[i].pregunta === q.id) {
        for (let j = i - 1; j >= 0; j--) if (explicativas.includes(tarjetas[j].tipo)) { idx = j; break; }
        break;
      }
    }
    if (idx === null) {
      let mejor = 0;
      tarjetas.forEach((t, i) => {
        if (explicativas.includes(t.tipo)) {
          const s = inter(clave, tokens(texto(t)));
          if (s > mejor) { mejor = s; idx = i; }
        }
      });
    }
    let trampa = null, mejor = 2;
    for (const t of tarjetas) {
      if (t.tipo === "trampa") {
        const s = inter(clave, tokens(texto(t)));
        if (s > mejor) { mejor = s; trampa = t; }
      }
    }
    return { leccion: lid, idx, tarjeta: idx !== null ? tarjetas[idx] : null, trampa };
  }

  evolucion() {
    return this.p.listaSims().filter((s) => s.estado === "entregado")
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((s) => [(s.fin || "").slice(0, 10), (s.resumen || {}).sobre10 || 0]);
  }
}
