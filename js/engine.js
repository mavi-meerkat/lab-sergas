// Motor de estudio activo: repetición espaciada SM-2 modificada, debilidades, trampas y plan diario.
// Port fiel de engine.py de la app de escritorio.
import { hoy, sumarDias, diasEntre, ahoraISO, round, azar } from "./util.js";
import { tipoFallo } from "./cifras.js";

export const UMBRAL_DEBILIDAD = 0.65;
export const MIN_RESPUESTAS_DEBILIDAD = 5;
export const VENTANA_DEBILIDAD = 20;
export const TAM_SESION_CHOQUE = 10;
export const INTERVALO_DIFICIL = 2;
export const INTERVALO_BIEN_INICIAL = 4;
export const ESCALERA_FACIL = [7, 14, 30, 60];
export const FACTOR_MIN = 1.3;
export const DIAS_CONSOLIDADA = 21;
export const NUEVAS_POR_DIA_DEFECTO = 20;
// Seguridad al responder
export const RACHA_DOMINIO = 3;              // aciertos seguros y rápidos seguidos = dominada sin dudas
export const CONFIRMACIONES_ERROR_SEGURO = 2; // aciertos seguros seguidos para dar por corregido un error seguro
export const LENTO_BASE_MS = 25000;          // por encima: todavía no es automático
export const LENTO_MIN_MS = 15000, LENTO_MAX_MS = 45000;
export const TAM_REFLEJOS = 15;
export const SEGUNDOS_REFLEJOS = 20;
export const UMBRAL_RENTABLE = 0.2;          // +0,5·p − 0,125·(1−p) > 0  ⇔  p > 20 %

export class Motor {
  constructor(contenido, store) {
    this.c = contenido;
    this.p = store;
  }

  // ------------------------------------------------ fecha examen y plan
  fechaExamen() { return this.p.get("fecha_examen"); }
  setFechaExamen(iso) { this.p.set("fecha_examen", iso || null); }
  diasRestantes() {
    const f = this.fechaExamen();
    return f ? diasEntre(hoy(), f) : null;
  }

  planDiario() {
    const hechas = this.p.leccionesCompletadas();
    const disponibles = this.c.ruta().filter((u) => u.id in this.c.lecciones);
    const pendientes = disponibles.filter((u) => !hechas.has(u.id));
    const vistas = this.p.vistas();
    const nuevasPend = Object.keys(this.c.preguntas).filter((q) => !vistas.has(q));
    const dias = this.diasRestantes();
    let diasEstudio, colchon, modo, lecDia, nuevasDia;
    if (dias === null) {
      diasEstudio = null; colchon = 0; modo = "sin_fecha";
      lecDia = pendientes.length ? 1 : 0;
      nuevasDia = NUEVAS_POR_DIA_DEFECTO;
    } else if (dias < 0) {
      diasEstudio = 0; colchon = 0; modo = "pasada"; lecDia = 0; nuevasDia = 0;
    } else {
      colchon = dias > 14 ? Math.max(7, round(dias * 0.15)) : Math.max(0, Math.floor(dias / 3));
      diasEstudio = Math.max(1, dias - colchon);
      modo = dias <= colchon ? "repaso_final" : "aprendizaje";
      if (modo === "repaso_final") {
        lecDia = pendientes.length;
        nuevasDia = nuevasPend.length;
      } else {
        lecDia = pendientes.length ? Math.ceil(pendientes.length / diasEstudio) : 0;
        nuevasDia = nuevasPend.length ? Math.ceil(nuevasPend.length / diasEstudio) : 0;
      }
    }
    const d = this.p.diario();
    return {
      modo, dias, colchon, dias_estudio: diasEstudio,
      lecciones_dia: lecDia, lecciones_hoy: d.lecciones,
      lecciones_pendientes: pendientes.length, lecciones_total: disponibles.length,
      nuevas_dia: nuevasDia, nuevas_hoy: d.nuevas, nuevas_pendientes: nuevasPend.length,
      siguientes: pendientes.slice(0, Math.max(lecDia, 3)),
    };
  }

  // ------------------------------------------------ colas
  colaDelDia() {
    const h = hoy();
    const filas = [];
    for (const [qid, e] of Object.entries(this.p.p)) {
      if (!this.c.preguntas[qid] || !e.estado || e.estado === "nuevo") continue;
      if (e.emergencia === 1 || (e.proxima && e.proxima <= h)) filas.push([qid, e.emergencia ? 1 : 0, e.proxima || ""]);
    }
    filas.sort((a, b) => b[1] - a[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return filas.map((f) => f[0]);
  }
  hayRepasosPendientes() { return this.colaDelDia().length > 0; }

  preguntasNuevas(n, unidad = null) {
    const vistas = this.p.vistas();
    const orden = {};
    this.c.ruta().forEach((u, i) => (orden[u.id] = i));
    let cand = Object.values(this.c.preguntas).filter(
      (q) => !vistas.has(q.id) && !q.anulada && (unidad === null || q.unidad === unidad));
    if (unidad === null) {
      const hechas = this.p.leccionesCompletadas();
      cand = cand.filter((q) => hechas.has(q.unidad));
    }
    cand.sort((a, b) => (orden[a.unidad] ?? 999) - (orden[b.unidad] ?? 999) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return cand.slice(0, n).map((q) => q.id);
  }

  // ------------------------------------------------ debilidades
  eficaciaUnidades() {
    const porU = {};
    const resp = this.p.respuestas();
    for (let i = resp.length - 1; i >= 0; i--) {
      const r = resp[i];
      if (!r.u) continue;
      const l = (porU[r.u] ||= []);
      if (l.length < VENTANA_DEBILIDAD) l.push(r.c);
    }
    const res = {};
    for (const [u, l] of Object.entries(porU)) {
      if (this.c.unidades[u] && l.length) res[u] = [l.reduce((s, x) => s + x, 0) / l.length, l.length];
    }
    return res;
  }
  unidadesDebiles() {
    const ef = this.eficaciaUnidades();
    return Object.entries(ef)
      .filter(([, [pct, n]]) => n >= MIN_RESPUESTAS_DEBILIDAD && pct < UMBRAL_DEBILIDAD)
      .map(([u, [pct]]) => [u, pct])
      .sort((a, b) => a[1] - b[1]);
  }
  topRepasoUrgente(n = 3) {
    const ef = this.eficaciaUnidades();
    const pend = {};
    for (const qid of this.colaDelDia()) {
      const u = this.c.preguntas[qid].unidad;
      pend[u] = (pend[u] || 0) + 1;
    }
    const punt = [];
    for (const u of new Set([...Object.keys(ef), ...Object.keys(pend)])) {
      const [pct, nresp] = ef[u] || [1.0, 0];
      const urg = (1 - pct) * 2 + (pend[u] || 0) / 10;
      punt.push([u, nresp ? pct : null, pend[u] || 0, urg]);
    }
    punt.sort((a, b) => b[3] - a[3]);
    return punt.slice(0, n).filter((x) => x[3] > 0).map(([u, pct, p]) => [u, pct, p]);
  }
  sesionChoque(uid) {
    const qs = this.c.preguntasDeUnidad(uid);
    const clave = (q) => {
      const e = this.p.estado(q.id);
      return [-e.fallos + e.aciertos * 0.5, e.proxima || "9999"];
    };
    qs.sort((a, b) => {
      const ka = clave(a), kb = clave(b);
      return ka[0] - kb[0] || (ka[1] < kb[1] ? -1 : ka[1] > kb[1] ? 1 : 0);
    });
    return azar.shuffle(qs.map((q) => q.id).slice(0, TAM_SESION_CHOQUE));
  }

  // ------------------------------------------------ bloqueos y pase
  paseDisponible() { return !this.p.diario().pase_usado; }
  usarPase() {
    this.p.sumarDiario("pase_usado");
    this.p.set("pase_hasta", hoy());
  }
  paseActivo() { return this.p.get("pase_hasta") === hoy(); }
  repasosAtrasados() {
    const h = hoy();
    return this.colaDelDia().filter((q) => (this.p.estado(q).vista || "").slice(0, 10) < h);
  }
  bloqueoContenidoNuevo(tipo = "test") {
    if (this.paseActivo()) return null;
    const deb = this.unidadesDebiles();
    if (deb.length) {
      const u = this.c.unidades[deb[0][0]];
      return `La unidad «${u.titulo}» está al ${(deb[0][1] * 100).toFixed(0)} % (umbral 65 %). ` +
        `Haz antes una micro-sesión de choque de ${TAM_SESION_CHOQUE} preguntas.`;
    }
    const n = (tipo === "test" ? this.colaDelDia() : this.repasosAtrasados()).length;
    if (n) return `Tienes ${n} repasos pendientes. Termina la cola del día antes de avanzar.`;
    return null;
  }

  // ------------------------------------------------ orden de opciones
  ordenOpciones(qid) {
    const n = this.c.preguntas[qid].opciones.length;
    const base = [...Array(n).keys()];
    let orden = [...base];
    if (this.p.estado(qid).alerta_trampa && n > 1) {
      while (orden.every((v, i) => v === base[i])) azar.shuffle(orden);
    }
    return orden;
  }

  // ------------------------------------------------ SM-2 modificado + entrenamiento de la seguridad
  //
  // Además de acertar, se entrena responder SIN DUDAR. Cada respuesta lleva:
  //   certeza: "segura" | "duda" | "azar" | null (null = no se preguntó)
  //   ms: tiempo de respuesta
  // Reglas:
  //   · acierto «al azar» -> no cuenta como aprendido: vuelve mañana (cola de emergencia).
  //   · acierto dudando     -> intervalo corto (2 días) sin valoración: aún no es firme.
  //   · acierto seguro pero lento -> no se permite «Fácil»: todavía no es automático.
  //   · fallo estando segura (error seguro) -> la idea equivocada está asentada: penalización
  //     mayor y hacen falta CONFIRMACIONES_ERROR_SEGURO aciertos seguros seguidos para soltarla.
  //   · «Dominada sin dudas» = RACHA_DOMINIO aciertos seguros y rápidos seguidos.
  umbralLento(qid) {
    const e = this.p.estado(qid);
    const propio = e.t_med ? e.t_med * 1.8 : 0;
    return Math.max(LENTO_MIN_MS, Math.min(LENTO_MAX_MS, propio || LENTO_BASE_MS));
  }

  responder(qid, elegida, contexto = "tutor", { certeza = null, ms = null } = {}) {
    const q = this.c.preguntas[qid];
    const e = this.p.estado(qid);
    const correcta = elegida === q.correcta;
    const ahora = ahoraISO();
    if (e.estado === "nuevo") this.p.sumarDiario("nuevas");
    this.p.registrarRespuesta(qid, q.unidad, correcta, elegida, contexto, { certeza, ms });
    const res = { correcta, certeza, alerta_trampa_nueva: false, proxima: null, valorar: correcta, lento: false,
      suerte: false, duda: false, error_seguro: false, confirmar: 0, dominada: false };
    const cambios = { vista: ahora, ult_certeza: certeza };
    if (ms && correcta && certeza !== "azar") {
      // media móvil del tiempo de las respuestas acertadas (la «velocidad de recuerdo» de esa pregunta)
      cambios.t_med = Math.round(e.t_med ? e.t_med * 0.6 + ms * 0.4 : ms);
    }
    if (correcta) {
      cambios.aciertos = e.aciertos + 1;
      if (certeza === "azar") {
        // acertar por suerte no es saber: se trata como un fallo «blando» (sin castigar el distractor)
        Object.assign(cambios, {
          factor: Math.max(FACTOR_MIN, e.factor - 0.1), intervalo: 0, escalon_facil: 0, estado: "aprendizaje",
          emergencia: 1, proxima: sumarDias(hoy(), 1), seg: 0, suertes: (e.suertes || 0) + 1,
        });
        res.suerte = true; res.valorar = false; res.proxima = hoy();
      } else if (certeza === "duda") {
        Object.assign(cambios, {
          intervalo: INTERVALO_DIFICIL, factor: Math.max(FACTOR_MIN, e.factor - 0.05), escalon_facil: 0,
          estado: "aprendizaje", emergencia: 0, proxima: sumarDias(hoy(), INTERVALO_DIFICIL), seg: 0,
        });
        if ((e.confirmar || 0) > 0) Object.assign(cambios, { emergencia: 1, proxima: sumarDias(hoy(), 1), intervalo: 0 });
        res.duda = true; res.valorar = false; res.proxima = cambios.proxima; res.confirmar = e.confirmar || 0;
      } else {
        const lento = ms !== null && ms > this.umbralLento(qid);
        res.lento = lento;
        const seg = certeza === "segura" && !lento ? (e.seg || 0) + 1 : certeza === "segura" ? (e.seg || 0) : 0;
        cambios.seg = seg;
        if (seg >= RACHA_DOMINIO && !e.dominada) { cambios.dominada = 1; res.dominada = true; }
        if ((e.confirmar || 0) > 0 && certeza !== null) {
          // tras un error seguro hay que demostrar varias veces seguidas que ya está corregido
          const quedan = certeza === "segura" ? e.confirmar - 1 : e.confirmar;
          cambios.confirmar = quedan;
          res.confirmar = quedan;
          if (quedan > 0) {
            Object.assign(cambios, { emergencia: 1, proxima: sumarDias(hoy(), 1), intervalo: 0 });
            res.valorar = false; res.proxima = cambios.proxima;
          }
        }
      }
    } else {
      const mismo = e.ultimo_distractor === elegida;
      const rep = mismo ? e.repeticion_distractor + 1 : 1;
      const alerta = e.alerta_trampa || rep >= 2;
      res.alerta_trampa_nueva = !!(alerta && !e.alerta_trampa);
      const seguro = certeza === "segura";
      res.error_seguro = seguro;
      Object.assign(cambios, {
        fallos: e.fallos + 1, factor: Math.max(FACTOR_MIN, e.factor - (seguro ? 0.3 : 0.2)),
        intervalo: 0, escalon_facil: 0, estado: "aprendizaje", emergencia: 1,
        proxima: sumarDias(hoy(), 1), ultimo_distractor: elegida, repeticion_distractor: rep,
        alerta_trampa: alerta ? 1 : 0, seg: 0, dominada: 0,
      });
      if (seguro) {
        cambios.err_seguro = (e.err_seguro || 0) + 1;
        cambios.confirmar = CONFIRMACIONES_ERROR_SEGURO;
        res.confirmar = CONFIRMACIONES_ERROR_SEGURO;
      }
      res.proxima = hoy();
      res.valorar = false;
    }
    if (cambios.factor !== undefined) cambios.factor = Math.round(cambios.factor * 1000) / 1000;
    this.p.actualizar(qid, cambios);
    return res;
  }

  /** Simulacro: una pregunta acertada pero marcada para revisar se trata como acierto dudando. */
  aciertoDudoso(qid) {
    const e = this.p.estado(qid);
    const corto = sumarDias(hoy(), INTERVALO_DIFICIL);
    const cambios = { seg: 0, ult_certeza: "duda", vista: ahoraISO() };
    if (!e.proxima || e.proxima > corto) Object.assign(cambios, { proxima: corto, intervalo: INTERVALO_DIFICIL, estado: "aprendizaje" });
    this.p.actualizar(qid, cambios);
  }

  /** Días que daría cada botón tras un acierto (para mostrarlo en el botón). */
  previsiones(qid) {
    const e = this.p.estado(qid);
    const bien = e.intervalo < INTERVALO_BIEN_INICIAL ? INTERVALO_BIEN_INICIAL : round(e.intervalo * e.factor);
    const facil = e.escalon_facil < ESCALERA_FACIL.length
      ? Math.max(ESCALERA_FACIL[e.escalon_facil], e.intervalo)
      : round(Math.max(e.intervalo, ESCALERA_FACIL.at(-1)) * e.factor);
    return { dificil: INTERVALO_DIFICIL, bien, facil };
  }

  valorar(qid, valoracion) {
    const e = this.p.estado(qid);
    let { factor, intervalo, escalon_facil: escalon } = e;
    if (valoracion === "dificil") {
      intervalo = INTERVALO_DIFICIL;
      factor = Math.max(FACTOR_MIN, factor - 0.15);
      escalon = 0;
    } else if (valoracion === "bien") {
      intervalo = intervalo < INTERVALO_BIEN_INICIAL ? INTERVALO_BIEN_INICIAL : round(intervalo * factor);
    } else if (valoracion === "facil") {
      if (escalon < ESCALERA_FACIL.length) intervalo = Math.max(ESCALERA_FACIL[escalon], intervalo);
      else intervalo = round(Math.max(intervalo, ESCALERA_FACIL.at(-1)) * factor);
      escalon += 1;
      factor = factor + 0.15;
    } else throw new Error(valoracion);
    factor = Math.round(factor * 1000) / 1000;
    const proxima = sumarDias(hoy(), intervalo);
    const estado = intervalo >= DIAS_CONSOLIDADA ? "consolidada" : "aprendizaje";
    this.p.actualizar(qid, { factor, intervalo, escalon_facil: escalon, estado, proxima, emergencia: 0, ult_valoracion: valoracion });
    return proxima;
  }

  // ------------------------------------------------ seguridad y calibración
  /** Cómo de fiable es la sensación de seguridad: % de acierto según lo segura que dijo estar. */
  calibracion(ultimas = 400) {
    const r = this.p.respuestas().filter((x) => x.k).slice(-ultimas);
    const g = { s: [0, 0], d: [0, 0], a: [0, 0] };
    const tiempos = [];
    for (const x of r) {
      if (!g[x.k]) continue;
      g[x.k][0] += 1; g[x.k][1] += x.c;
      if (x.k === "s" && x.c && x.ms) tiempos.push(x.ms);
    }
    const pct = ([n, ok]) => (n ? ok / n : null);
    tiempos.sort((a, b) => a - b);
    return {
      n: r.length,
      segura: { n: g.s[0], pct: pct(g.s) }, duda: { n: g.d[0], pct: pct(g.d) }, azar: { n: g.a[0], pct: pct(g.a) },
      // acierto sin dudas: segura y correcta sobre el total con certeza declarada
      sin_dudas: r.length ? g.s[1] / r.length : null,
      t_mediano: tiempos.length ? tiempos[Math.floor(tiempos.length / 2)] : null,
    };
  }
  /** Consejo de estrategia para el examen real (+0,5 / −0,125): contestar compensa si se acierta más del 20 %. */
  consejoExamen(cal = this.calibracion()) {
    const out = [];
    const f = (x) => Math.round(x * 100) + " %";
    if (cal.segura.n >= 15 && cal.segura.pct < 0.85)
      out.push(`Cuando te sientes segura aciertas el ${f(cal.segura.pct)}: hay ideas mal fijadas que parecen ciertas. Prioriza los «errores seguros».`);
    if (cal.duda.n >= 10)
      out.push(cal.duda.pct > UMBRAL_RENTABLE
        ? `Dudando aciertas el ${f(cal.duda.pct)}: en el examen te compensa contestar (rentable a partir del 20 %).`
        : `Dudando solo aciertas el ${f(cal.duda.pct)}: en el examen, si dudas de verdad, mejor en blanco.`);
    if (cal.azar.n >= 10)
      out.push(cal.azar.pct > UMBRAL_RENTABLE
        ? `Incluso «al azar» aciertas el ${f(cal.azar.pct)}: tu intuición descarta bien; si eliminas al menos una opción, arriesga.`
        : `Al azar aciertas el ${f(cal.azar.pct)}: sin descartar nada, deja la pregunta en blanco.`);
    return out;
  }
  /** Reparto de los fallos (últimos `ultimas`): concepto, cifra y dígitos invertidos. */
  tiposDeFallo(ultimas = 400, filtro = null) {
    const r = { concepto: 0, cifra: 0, inversion: 0 };
    const resp = this.p.respuestas().filter((x) => !x.c && x.e && (!filtro || filtro(x))).slice(-ultimas);
    for (const x of resp) {
      const t = tipoFallo(this.c.preguntas[x.q], x.e);
      if (t) r[t.tipo] += 1;
    }
    return r;
  }
  erroresSeguros() {
    return Object.entries(this.p.p).filter(([q, e]) => this.c.preguntas[q] && (e.confirmar || 0) > 0).map(([q]) => q);
  }
  recuentoSeguridad() {
    let dominadas = 0, inseguras = 0, errores = 0;
    for (const [q, e] of Object.entries(this.p.p)) {
      if (!this.c.preguntas[q] || !e.estado || e.estado === "nuevo") continue;
      if ((e.confirmar || 0) > 0) errores++;
      else if (e.dominada) dominadas++;
      else if (e.ult_certeza === "duda" || e.ult_certeza === "azar") inseguras++;
    }
    return { dominadas, inseguras, errores };
  }
  /**
   * Entrenamiento «Reflejos»: preguntas ya vistas que aún no salen solas (errores seguros, aciertos con duda o
   * por suerte, respuestas lentas). Se responden contra reloj para automatizar el recuerdo.
   */
  colaReflejos(n = TAM_REFLEJOS) {
    const cand = [];
    for (const [qid, e] of Object.entries(this.p.p)) {
      const q = this.c.preguntas[qid];
      if (!q || q.anulada || !e.estado || e.estado === "nuevo") continue;
      let p = 0;
      if ((e.confirmar || 0) > 0) p += 5;
      if (e.ult_certeza === "azar") p += 4;
      if (e.ult_certeza === "duda") p += 3;
      if (e.t_med && e.t_med > LENTO_BASE_MS) p += 2;
      if (!e.dominada && e.aciertos > 0) p += 1;
      if (e.dominada) p -= 3;
      if (p > 0) cand.push([qid, p + azar() * 1.5]);
    }
    cand.sort((a, b) => b[1] - a[1]);
    return azar.shuffle(cand.slice(0, n).map((x) => x[0]));
  }

  // ------------------------------------------------ estadísticas
  recuentoEstados() {
    const total = Object.keys(this.c.preguntas).length;
    const r = { nuevo: 0, aprendizaje: 0, consolidada: 0 };
    for (const [qid, e] of Object.entries(this.p.p)) {
      if (this.c.preguntas[qid] && e.estado in r) r[e.estado] += 1;
    }
    r.nuevo = total - r.aprendizaje - r.consolidada;
    return r;
  }
  racha() {
    const dias = new Set();
    for (const [f, d] of Object.entries(this.p.g.diario)) if (d.nuevas > 0 || d.lecciones > 0 || d.minutos > 0) dias.add(f);
    for (const f of Object.keys(this.p.respDia)) if ((this.p.respDia[f] || []).length) dias.add(f);
    let n = 0, d = hoy();
    if (!dias.has(d)) d = sumarDias(d, -1);
    while (dias.has(d)) { n += 1; d = sumarDias(d, -1); }
    return n;
  }
  historialPregunta(qid) {
    let n = 0, ok = 0;
    for (const r of this.p.respuestas()) if (r.q === qid) { n++; ok += r.c; }
    return { n, ok };
  }
}
