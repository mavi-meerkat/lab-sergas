// Vista «Entrena»: juegos y herramientas para fijar el temario de otra forma.
// Verdadero o falso relámpago · Ordena el proceso · Caza la trampa · Pregunta al revés · Tarjetas con imagen ·
// Podcast de preguntas · Mis trucos · Cuaderno de errores.
import { A } from "./ctx.js";
import { el, boton, chip, tarjeta, rico, barra, segmentado, aviso, toast } from "./ui.js";
import { bloquePregunta, teclasPregunta, limpia, editarNota, cajaNota, verRecorte } from "./pregunta.js";
import { necesitaValidar } from "./content.js";
import { azar, norm, esc, md, mdInline, hoy, fechaEs } from "./util.js";
import { MAZOS } from "./imagenes.js";
import { abrirImprimible } from "./v-leccion.js";

// ======================================================================== utilidades comunes
const LETRAS = "ABCD";
const textoCorrecta = (q) => limpia(q.opciones[LETRAS.indexOf(q.correcta)] || "");
const NEG_RE = /(\bno\b|incorrect|fals[ao]|excepto|salvo)/i;
const AMBIGUA_RE = /(todas|ninguna|ambas|anteriores|\b[a-d]\)? y \b[a-d]\b|son correctas|son ciertas)/i;

function esNegativa(q) {
  const e = norm(q.enunciado);
  return /\b(no|incorrect[ao]s?|fals[ao]s?|excepto|salvo)\b/.test(e) &&
    /(no es|no son|no corresponde|no se|no produce|no detecta|no pertenece|incorrect|fals|excepto|salvo|no ser|no esta|no estan|no forma|no aparece|no indica|no tiene|no debe|no presenta|no se considera)/.test(e);
}
function jugable(qid) {
  const q = A.c.preguntas[qid];
  if (!q || q.anulada) return false;
  const v = A.c.validaciones;
  const est = v.estado(qid);
  if (est === "dudosa") return false;
  if (necesitaValidar(q) && !["confirmada", "corregida"].includes(est)) return false;
  return true;
}
/** Preguntas del ámbito elegido: lo ya estudiado (lecciones hechas o preguntas vistas) o todo el temario. */
function pool() {
  const todo = A.p.get("entrena_ambito", "estudiado") === "todo";
  const ids = Object.keys(A.c.preguntas).filter(jugable);
  if (todo) return { ids, aviso: null };
  const hechas = A.p.leccionesCompletadas();
  const vistas = A.p.vistas();
  const est = ids.filter((id) => hechas.has(A.c.preguntas[id].unidad) || vistas.has(id));
  if (est.length >= 20) return { ids: est, aviso: null };
  return { ids, aviso: "Aún has estudiado poco temario: juegas con preguntas de todo el temario." };
}
function leccionesAmbito() {
  const todo = A.p.get("entrena_ambito", "estudiado") === "todo";
  const hechas = A.p.leccionesCompletadas();
  const lids = Object.keys(A.c.lecciones).sort();
  const est = lids.filter((l) => hechas.has(l));
  return !todo && est.length >= 2 ? est : lids;
}
const unidadTxt = (uid) => {
  const u = A.c.unidades[uid];
  return u ? `M${u.modulo}·U${u.numero} ${u.titulo}` : uid;
};
function trampaDeUnidad(uid) {
  const l = A.c.lecciones[uid];
  if (!l) return null;
  const ts = l.tarjetas.filter((t) => t.tipo === "trampa");
  return ts.length ? azar.choice(ts, ts.map(() => 1)) : null;
}
function cabecera(main, titulo, salir, extra = null) {
  main.append(el("div.fila.entre.cab-juego",
    el("div.fila", boton("← Entrena", salir, "fantasma"), el("h2", titulo)), extra));
}
function marcador(...partes) { return el("div.marcador", ...partes); }

// ======================================================================== vista principal
export function vistaEntrena(main, args = {}) {
  const ctl = { nombre: "entrena", refrescarRemoto: false, teclas: null, destruir: null };
  let limpiar = null;
  const salir = () => { if (limpiar) { limpiar(); limpiar = null; } ctl.teclas = null; menu(); };
  ctl.destruir = () => { if (limpiar) limpiar(); };

  function menu() {
    main.replaceChildren();
    main.append(el("h1", "Entrena"), el("p.suave.intro",
      "Otras formas de sacar el temario de la cabeza: juegos rápidos, imágenes, audio y tus propios trucos. Las preguntas que falles aquí puedes mandarlas al repaso."));
    main.append(el("div.fila.envuelve.ambito", el("span.suave.peq", "Jugar con:"),
      segmentado(["Lo que ya he estudiado", "Todo el temario"], A.p.get("entrena_ambito", "estudiado") === "todo" ? "Todo el temario" : "Lo que ya he estudiado",
        (v) => A.p.set("entrena_ambito", v === "Todo el temario" ? "todo" : "estudiado"))));
    const rej = el("div.rejilla-juegos");
    const tj = (ic, titulo, desc, cmd, extra = null) => rej.append(el("button.juego", { type: "button", onclick: cmd },
      el("div.juego-ic", ic), el("div.juego-tit", titulo), el("div.juego-desc", desc), extra));
    const rec = A.p.get("record_vf", 0);
    tj("⚡", "Verdadero o falso relámpago", "60 segundos: ¿esta opción es la respuesta correcta? Desliza o pulsa. Entrena las preguntas «señale la falsa».",
      () => juegoVF(), rec ? el("div.juego-extra", `Récord: ${rec}`) : null);
    tj("🔢", "Ordena el proceso", "Pon en orden los pasos de los esquemas: llenado de tubos, tinciones, procesado de muestras…", () => juegoOrdena());
    tj("🪤", "Caza la trampa", "Descubre qué trampa esconde cada pregunta antes de responderla, y la opción que ya te engañó.", () => juegoTrampa());
    tj("🔄", "Pregunta al revés", "Te doy la respuesta: elige a qué pregunta corresponde. Obliga a entender el concepto.", () => juegoReves());
    tj("🖼️", "Tarjetas con imagen", "Tubos, hemocultivos, residuos, bacterias al Gram y leucocitos: reconócelos de un vistazo.", () => menuImagenes());
    tj("🎧", "Podcast de preguntas", "Escucha pregunta, pausa para pensar y respuesta. Para el gimnasio, el coche o la cocina.", () => podcastMenu());
    const nNotas = Object.keys(A.p.notas || {}).filter((q) => q in A.c.preguntas).length;
    tj("✏️", "Mis trucos", "Tus propias reglas y frases para las preguntas que se te resisten.", () => listaTrucos(), el("div.juego-extra", nNotas === 1 ? "1 guardado" : `${nNotas} guardados`));
    tj("📕", "Cuaderno de errores", "PDF con tus errores seguros, trampas y preguntas más falladas, con la correcta y tu truco. Para la recta final.", () => cuadernoErrores());
    main.append(rej);
  }

  // ====================================================================== 1. VERDADERO O FALSO RELÁMPAGO
  function juegoVF() {
    const { ids, aviso: av } = pool();
    if (!ids.length) return aviso("Sin preguntas", "No hay preguntas disponibles.");
    const DURACION = 60;
    let fin = 0, aciertos = 0, fallos = 0, racha = 0, mejorRacha = 0, item = null, pausa = false, tiempoPausa = 0;
    const fallidas = new Set();
    let reloj = null;
    main.replaceChildren();
    const lblT = el("b.reloj-juego"), lblP = el("span"), barraT = barra(1);
    cabecera(main, "⚡ Verdadero o falso", salir, marcador(lblP, lblT));
    main.append(barraT);
    if (av) main.append(el("p.suave.peq", av));
    const zona = el("div.vf-zona");
    main.append(zona, el("p.suave.peq.centro", "Teclas: ← no es · → es la correcta. En la tablet puedes deslizar la tarjeta."));

    const nuevo = () => {
      const qid = ids[Math.floor(azar() * ids.length)];
      const q = A.c.preguntas[qid];
      const ci = LETRAS.indexOf(q.correcta);
      let idx = ci;
      if (azar() > 0.42) {
        const otras = q.opciones.map((_, i) => i).filter((i) => i !== ci);
        idx = otras[Math.floor(azar() * otras.length)];
      }
      item = { qid, idx, es: idx === ci };
      pintar();
    };
    const pintar = (fb = null) => {
      const q = A.c.preguntas[item.qid];
      const carta = el("div.vf-carta" + (fb ? (fb.ok ? ".ok" : ".mal") : ""),
        el("div.suave.peq", unidadTxt(q.unidad).slice(0, 80)),
        rico(q.enunciado, "enunciado"),
        el("div.vf-opcion", limpia(q.opciones[item.idx])),
        fb && !fb.ok ? el("div.vf-fb", el("b", item.es ? "Sí era la correcta." : "No era la correcta."), " Correcta: ", textoCorrecta(q)) : null,
        fb && fb.ok ? el("div.vf-fb.c-ok", "✔") : null);
      zona.replaceChildren(carta,
        el("div.vf-botones",
          boton("✘ No es", () => responder(false), "mal grande", { disabled: !!fb }),
          boton("✔ Es la correcta", () => responder(true), "ok grande", { disabled: !!fb })));
      if (!fb) deslizar(carta, (dir) => responder(dir > 0));
    };
    const responder = (dice) => {
      if (pausa || !item || Date.now() > fin) return;
      const ok = dice === item.es;
      if (ok) { aciertos++; racha++; mejorRacha = Math.max(mejorRacha, racha); }
      else { fallos++; racha = 0; fallidas.add(item.qid); }
      pausa = true; tiempoPausa = Date.now();
      pintar({ ok });
      setTimeout(() => { fin += Date.now() - tiempoPausa; pausa = false; if (Date.now() < fin) nuevo(); }, ok ? 450 : 2200);
      marcar();
    };
    const marcar = () => { lblP.textContent = `✔ ${aciertos}  ✘ ${fallos}  🔥 ${racha}  ·  `; };
    const tick = () => {
      if (pausa) return;
      const resto = Math.max(0, fin - Date.now());
      lblT.textContent = `${Math.ceil(resto / 1000)} s`;
      barraT.firstChild.style.width = (resto / (DURACION * 1000)) * 100 + "%";
      if (resto <= 0) terminar();
    };
    const terminar = () => {
      clearInterval(reloj); reloj = null; ctl.teclas = null;
      const punt = aciertos - fallos;
      const rec = A.p.get("record_vf", 0);
      const nuevoRec = punt > rec;
      if (nuevoRec) A.p.set("record_vf", punt);
      zona.replaceChildren(tarjeta(nuevoRec ? "bg-ok_bg" : "",
        el("h2", nuevoRec ? "🏆 ¡Nuevo récord!" : "Se acabó el tiempo"),
        el("p.grande", `Puntuación: ${punt}  (✔ ${aciertos} · ✘ ${fallos}) · mejor racha ${mejorRacha}`),
        el("p.suave", `Récord: ${Math.max(rec, punt)}. Cada fallo resta un punto, como en el examen restan los errores.`),
        el("div.fila.envuelve",
          boton("Otra ronda", juegoVF, "primario"),
          fallidas.size ? boton(`🔁 Repasar las ${fallidas.size} preguntas falladas`, () => A.ir("repaso", { modo: "lista", ids: [...fallidas] }), "secundario") : null,
          boton("Volver", salir, "fantasma"))));
    };
    ctl.teclas = (e) => {
      if (e.key === "ArrowRight") { responder(true); return true; }
      if (e.key === "ArrowLeft") { responder(false); return true; }
      return false;
    };
    limpiar = () => { if (reloj) clearInterval(reloj); };
    fin = Date.now() + DURACION * 1000;
    marcar(); nuevo();
    reloj = setInterval(tick, 200); tick();
  }

  // ====================================================================== 2. ORDENA EL PROCESO
  // esquemas de flujo que NO son una secuencia (listas, árboles o ramas): no sirven para ordenar
  const NO_SECUENCIA = new Set(["M1_U7:12", "M5_U2:3", "M7_U3:18", "M7_U5:0", "M8_U5:17", "M8_U6:2", "M8_U7:15", "M4_U4:8"]);
  function procesos() {
    const out = [];
    for (const lid of leccionesAmbito()) {
      const l = A.c.lecciones[lid];
      l.tarjetas.forEach((t, i) => {
        if (t.tipo === "esquema" && t.estilo === "flujo" && !NO_SECUENCIA.has(`${lid}:${i}`) && (t.nodos || []).length >= 3 && t.nodos.length <= 9) out.push({ lid, i, t });
      });
    }
    return out;
  }
  const quitaNumero = (s) => String(s || "")
    .replace(/^\s*(paso|fase|etapa)\s*\d+\s*[:.\-–)]?\s*/i, "")
    .replace(/^\s*\d+\s*(\.?\s*º|°|\.|\)|:|-|–)?\s*/, "")
    .replace(/^\s*(primero|segundo|tercero|cuarto|quinto|sexto|último)\s*[:.,\-–]\s*/i, "");

  function juegoOrdena() {
    const lista = azar.shuffle(procesos());
    if (!lista.length) return aviso("Sin procesos", "No hay esquemas de procesos en las lecciones estudiadas.");
    let k = 0, totalErr = 0, hechos = 0;
    const siguiente = () => {
      if (k >= lista.length) k = 0;
      jugar(lista[k++]);
    };
    const jugar = ({ lid, t }) => {
      main.replaceChildren();
      const lblM = el("span");
      cabecera(main, "🔢 Ordena el proceso", salir, marcador(lblM));
      const nodos = t.nodos.map((n, i) => ({ i, t: quitaNumero(mdTxt(n.t)), d: n.d || "" }));
      const orden = azar.shuffle([...nodos]);
      if (orden.every((n, j) => n.i === j)) orden.reverse();
      let siguienteIdx = 0, errores = 0;
      const colocados = el("ol.orden-hechos");
      const piezas = el("div.orden-piezas");
      const msg = el("p.suave.peq", "Toca los pasos en el orden correcto.");
      const caja = tarjeta("",
        el("div.suave.peq", unidadTxt(lid)), el("h3", mdTxt(t.titulo || "Proceso")),
        colocados, msg, piezas);
      main.append(caja);
      const marcar = () => { lblM.textContent = `Procesos: ${hechos} · errores totales: ${totalErr}`; };
      marcar();
      for (const n of orden) {
        const b = el("button.pieza", { type: "button" }, n.t);
        b.onclick = () => {
          if (n.i === siguienteIdx) {
            b.remove();
            colocados.append(el("li.colocado", el("b", n.t), n.d ? el("div.suave.peq", mdTxt(n.d)) : null));
            siguienteIdx++;
            if (siguienteIdx === nodos.length) {
              hechos++; marcar();
              msg.replaceChildren(el("b" + (errores ? ".c-aviso" : ".c-ok"), errores ? `Completado con ${errores} error(es).` : "¡Perfecto, a la primera!"));
              caja.append(el("div.fila.envuelve",
                boton("Siguiente proceso →", siguiente, "primario"),
                boton("Ver la lección", () => A.abrirLeccion(lid, 0), "secundario"),
                boton("Terminar", salir, "fantasma")));
            }
          } else {
            errores++; totalErr++; marcar();
            b.classList.remove("temblar"); void b.offsetWidth; b.classList.add("temblar");
            msg.textContent = `Ese no va ahora (paso ${siguienteIdx + 1} de ${nodos.length}).`;
          }
        };
        piezas.append(b);
      }
    };
    siguiente();
  }
  const mdTxt = (s) => String(s || "").replace(/\*\*/g, "").replace(/(^|\s)_([^_]+)_/g, "$1$2");

  // ====================================================================== 3. CAZA LA TRAMPA
  const TRAMPAS = {
    neg: ["Pide la FALSA o la que NO", "Tres opciones son ciertas y la respuesta es la intrusa. Pon V o F a cada una: la respuesta es la única F."],
    casi: ["Opciones casi idénticas", "Solo cambia una palabra o un dato entre dos opciones. Localiza esa palabra: ahí está lo que preguntan."],
    cifras: ["Cifras parecidas", "Varias opciones solo se diferencian en números. Recuerda la cifra con su unidad y su contexto, y descarta primero las absurdas."],
    todas: ["«Todas / ninguna / ambas»", "Comprueba cada opción por separado. Si dos son ciertas y compatibles, sospecha de «todas son correctas»."],
    abs: ["Palabras absolutas", "«Siempre», «nunca», «solo», «exclusivamente»… Las afirmaciones tajantes suelen ser falsas, salvo en definiciones."],
  };
  const palabras = (s) => new Set(norm(s).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
  const jaccard = (a, b) => {
    const A1 = palabras(a), B1 = palabras(b);
    if (!A1.size || !B1.size) return 0;
    let i = 0; for (const w of A1) if (B1.has(w)) i++;
    return i / (A1.size + B1.size - i);
  };
  function detectar(q) {
    const tipos = new Set();
    const ops = q.opciones.map(limpia);
    if (esNegativa(q)) tipos.add("neg");
    const ci = LETRAS.indexOf(q.correcta);
    if (ops.some((o, i) => i !== ci && jaccard(o, ops[ci]) >= 0.6)) tipos.add("casi");
    if (ops.filter((o) => /\d/.test(o)).length >= 3) tipos.add("cifras");
    if (ops.some((o) => /\b(todas|ninguna|ambas)\b/i.test(o))) tipos.add("todas");
    if (ops.some((o, i) => i !== ci && /\b(siempre|nunca|solo|sólo|únicamente|exclusivamente|jamás|en ningún caso)\b/i.test(o))) tipos.add("abs");
    return tipos;
  }
  function juegoTrampa() {
    const { ids } = pool();
    const personales = ids.filter((id) => { const e = A.p.estado(id); return e.alerta_trampa && e.ultimo_distractor && e.ultimo_distractor !== A.c.preguntas[id].correcta; });
    const patron = ids.filter((id) => !personales.includes(id) && detectar(A.c.preguntas[id]).size);
    const rondas = [
      ...azar.shuffle(personales).slice(0, 4).map((id) => ({ id, tipo: "personal" })),
      ...azar.shuffle(patron).slice(0, 10).map((id) => ({ id, tipo: "patron" })),
    ].slice(0, 10);
    azar.shuffle(rondas);
    if (!rondas.length) return aviso("Sin trampas", "No hay preguntas con trampa en el temario elegido.");
    let k = 0, cazadas = 0;
    const lblM = el("span");
    const siguiente = () => {
      if (k >= rondas.length) return final();
      const r = rondas[k++];
      main.replaceChildren();
      cabecera(main, "🪤 Caza la trampa", salir, marcador(lblM));
      lblM.textContent = `Ronda ${k} de ${rondas.length} · cazadas ${cazadas}`;
      main.append(barra((k - 1) / rondas.length));
      r.tipo === "personal" ? rondaPersonal(r.id) : rondaPatron(r.id);
    };
    const pista = (uid) => {
      const t = trampaDeUnidad(uid);
      return t ? tarjeta("bg-trampa_bg", el("div.c-trampa.negrita.peq", "💡 TRAMPA CLÁSICA DEL TEMA · " + mdTxt(t.titulo || "")), rico(t.texto || "")) : null;
    };
    const opcionesEstaticas = (q, marcar = {}) => el("div.opciones", q.opciones.map((o, i) =>
      el("div.opcion.estatica" + (marcar[i] || ""), `${LETRAS[i]})  ${limpia(o)}`)));

    function rondaPersonal(qid) {
      const q = A.c.preguntas[qid], e = A.p.estado(qid);
      const caja = tarjeta("", el("p.c-trampa.negrita", "🎯 Aquí ya caíste dos veces en la misma opción. ¿Cuál era la que te engañaba?"),
        el("div.suave.peq", unidadTxt(q.unidad)), rico(q.enunciado, "enunciado"));
      const ops = el("div.opciones");
      q.opciones.forEach((o, i) => ops.append(el("button.opcion", { type: "button", onclick: () => resolver(i) }, el("b", LETRAS[i] + ")"), " ", limpia(o))));
      caja.append(ops);
      main.append(caja);
      const resolver = (i) => {
        const trampa = LETRAS.indexOf(e.ultimo_distractor), ci = LETRAS.indexOf(q.correcta);
        const ok = i === trampa;
        if (ok) cazadas++;
        ops.replaceWith(opcionesEstaticas(q, { [trampa]: ".mal", [ci]: ".bien" }));
        caja.append(tarjeta(ok ? "bg-ok_bg" : "bg-aviso_bg",
          el("b", ok ? "✔ Cazada. Ya la tienes identificada." : `Era la ${LETRAS[trampa]}: la que eliges cuando no piensas.`),
          rico(`**Por qué engaña:** se parece a lo que recuerdas, pero la correcta es la **${q.correcta}**.`),
          rico(q.explicacion_rapida || ""), cajaNota(qid)),
          pista(q.unidad) || "",
          el("div.fila.envuelve", boton("Siguiente →", siguiente, "primario"),
            boton(A.p.nota(qid) ? "✏️ Editar mi truco" : "✏️ Escribir un truco", () => editarNota(qid), "secundario")));
      };
    }
    function rondaPatron(qid) {
      const q = A.c.preguntas[qid];
      const tipos = detectar(q);
      const caja = tarjeta("", el("p.negrita", "¿Qué trampa esconde esta pregunta? Míralo antes de contestar."),
        el("div.suave.peq", unidadTxt(q.unidad)), rico(q.enunciado, "enunciado"), opcionesEstaticas(q));
      const chips = el("div.fila.envuelve.chips-trampa");
      for (const [k2, [nom]] of Object.entries(TRAMPAS)) chips.append(boton(nom, () => elegir(k2), "secundario"));
      caja.append(chips);
      main.append(caja);
      const elegir = (k2) => {
        const ok = tipos.has(k2);
        if (ok) cazadas++;
        chips.replaceWith(tarjeta(ok ? "bg-ok_bg" : "bg-aviso_bg",
          el("b", ok ? "✔ Bien visto." : "No es la principal."),
          ...[...tipos].map((t) => rico(`**${TRAMPAS[t][0]}:** ${TRAMPAS[t][1]}`))));
        caja.append(el("div.fila.envuelve", boton("Ahora respóndela →", () => responder(), "primario"), boton("Saltar", siguiente, "fantasma")));
      };
      const responder = () => {
        main.replaceChildren();
        cabecera(main, "🪤 Caza la trampa", salir, marcador(lblM));
        const b = bloquePregunta(qid, { contexto: "trampa", onFin: siguiente });
        ctl.teclas = (e) => teclasPregunta(b, e);
        main.append(tarjeta("", b));
        const p = pista(q.unidad);
        if (p) main.append(p);
      };
    }
    const final = () => {
      ctl.teclas = null;
      main.replaceChildren();
      cabecera(main, "🪤 Caza la trampa", salir);
      main.append(tarjeta("bg-ok_bg", el("h2", `Has cazado ${cazadas} de ${rondas.length} trampas`),
        el("p", "Reconocer el tipo de trampa antes de contestar es lo que evita los errores «seguros»."),
        el("div.fila", boton("Otra partida", juegoTrampa, "primario"), boton("Volver", salir, "fantasma"))));
    };
    siguiente();
  }

  // ====================================================================== 4. PREGUNTA AL REVÉS
  function juegoReves() {
    const { ids } = pool();
    const validas = ids.filter((id) => {
      const q = A.c.preguntas[id];
      const t = textoCorrecta(q);
      return !esNegativa(q) && !AMBIGUA_RE.test(t) && t.split(/\s+/).length >= 2;
    });
    if (validas.length < 8) return aviso("Pocas preguntas", "Estudia alguna lección más o elige «Todo el temario».");
    const rondas = azar.shuffle([...validas]).slice(0, 10);
    let k = 0, ok = 0;
    const fallidas = [];
    const siguiente = () => {
      if (k >= rondas.length) return final();
      const qid = rondas[k++];
      const q = A.c.preguntas[qid];
      const tc = norm(textoCorrecta(q));
      let candidatas = validas.filter((x) => x !== qid && A.c.preguntas[x].unidad === q.unidad && norm(textoCorrecta(A.c.preguntas[x])) !== tc);
      if (candidatas.length < 3) {
        const mod = (A.c.unidades[q.unidad] || {}).modulo;
        candidatas = validas.filter((x) => x !== qid && (A.c.unidades[A.c.preguntas[x].unidad] || {}).modulo === mod && norm(textoCorrecta(A.c.preguntas[x])) !== tc);
      }
      const opciones = azar.shuffle([qid, ...azar.shuffle(candidatas).slice(0, 3)]);
      main.replaceChildren();
      const lblM = el("span", `Ronda ${k} de ${rondas.length} · aciertos ${ok}`);
      cabecera(main, "🔄 Pregunta al revés", salir, marcador(lblM));
      main.append(barra((k - 1) / rondas.length));
      const caja = tarjeta("", el("div.suave.peq", "LA RESPUESTA ES:"), el("div.reves-resp", textoCorrecta(q)),
        el("p.negrita", "¿A qué pregunta responde?"));
      const lista = el("div.opciones");
      opciones.forEach((id, pos) => {
        const b = el("button.opcion", { type: "button" }, el("b", LETRAS[pos] + ")"), " ", A.c.preguntas[id].enunciado);
        b.onclick = () => {
          const bien = id === qid;
          if (bien) ok++; else fallidas.push(qid);
          [...lista.children].forEach((x, j) => {
            x.disabled = true;
            if (opciones[j] === qid) x.classList.add("bien"); else if (x === b) x.classList.add("mal");
          });
          caja.append(tarjeta(bien ? "bg-ok_bg" : "bg-mal_bg", el("b", bien ? "✔ Esa es." : "✘ No: esa respuesta era de la marcada en verde."),
            rico(q.explicacion_rapida || ""), cajaNota(qid),
            el("div.fila.envuelve", boton("Siguiente →", siguiente, "primario"))));
        };
        lista.append(b);
      });
      caja.append(lista);
      main.append(caja);
      ctl.teclas = (e) => {
        const pos = "ABCD1234".indexOf(e.key.toUpperCase()) % 4;
        if (/^[a-dA-D1-4]$/.test(e.key) && lista.children[pos] && !lista.children[pos].disabled) { lista.children[pos].click(); return true; }
        if (e.key === "Enter") { const s = [...caja.querySelectorAll("button.btn")].find((x) => x.textContent.startsWith("Siguiente")); if (s) { s.click(); return true; } }
        return false;
      };
    };
    const final = () => {
      ctl.teclas = null;
      main.replaceChildren();
      cabecera(main, "🔄 Pregunta al revés", salir);
      main.append(tarjeta(ok >= 8 ? "bg-ok_bg" : "", el("h2", `${ok} de ${rondas.length}`),
        el("p", "Si sabes reconocer la respuesta pero no la pregunta, la tienes memorizada de vista y no entendida."),
        el("div.fila.envuelve", boton("Otra partida", juegoReves, "primario"),
          fallidas.length ? boton(`🔁 Repasar las ${fallidas.length} falladas`, () => A.ir("repaso", { modo: "lista", ids: fallidas }), "secundario") : null,
          boton("Volver", salir, "fantasma"))));
    };
    siguiente();
  }

  // ====================================================================== 5. TARJETAS CON IMAGEN
  function menuImagenes() {
    ctl.teclas = null;
    main.replaceChildren();
    cabecera(main, "🖼️ Tarjetas con imagen", salir);
    main.append(el("p.suave", "Dibujos esquemáticos hechos para la app a partir de las lecciones: lo importante es el color, la forma y la disposición."));
    let modo = "¿Qué es?";
    main.append(el("div.fila.envuelve", el("span.suave.peq", "Modo:"),
      segmentado(["¿Qué es?", "¿Cuál es?"], modo, (v) => (modo = v)),
      el("span.suave.peq", "«¿Qué es?»: ves la imagen y eliges el nombre. «¿Cuál es?»: lees el nombre y eliges la imagen.")));
    const rej = el("div.rejilla-juegos");
    for (const m of MAZOS) {
      const portada = el("div.juego-img", { html: m.tarjetas[0].img() });
      rej.append(el("button.juego", { type: "button", onclick: () => jugarImagenes([m], modo) },
        portada, el("div.juego-tit", m.nombre), el("div.juego-desc", `${m.tarjetas.length} tarjetas`)));
    }
    rej.append(el("button.juego", { type: "button", onclick: () => jugarImagenes(MAZOS, modo) },
      el("div.juego-ic", "🎲"), el("div.juego-tit", "Todo mezclado"), el("div.juego-desc", `${MAZOS.reduce((s, m) => s + m.tarjetas.length, 0)} tarjetas`)));
    main.append(rej);
  }
  function jugarImagenes(mazos, modo) {
    const cartas = azar.shuffle(mazos.flatMap((m) => m.tarjetas.map((t) => ({ ...t, mazo: m }))));
    const rondas = cartas.concat(azar.shuffle([...cartas])).slice(0, Math.max(10, Math.min(16, cartas.length)));
    let k = 0, ok = 0;
    const siguiente = () => {
      if (k >= rondas.length) return final();
      const c = rondas[k++];
      const rivales = azar.shuffle(c.mazo.tarjetas.filter((t) => t.n !== c.n)).slice(0, 3);
      const opciones = azar.shuffle([c, ...rivales]);
      main.replaceChildren();
      cabecera(main, "🖼️ " + c.mazo.nombre, menuImagenes, marcador(el("span", `${k} de ${rondas.length} · aciertos ${ok}`)));
      main.append(barra((k - 1) / rondas.length));
      const caja = tarjeta("");
      const resp = el("div");
      const elegir = (t, nodo, todos) => {
        const bien = t.n === c.n;
        if (bien) ok++;
        todos.forEach(([tt, nn]) => { nn.disabled = true; if (tt.n === c.n) nn.classList.add("bien"); else if (nn === nodo) nn.classList.add("mal"); });
        resp.replaceChildren(tarjeta(bien ? "bg-ok_bg" : "bg-mal_bg", el("b", (bien ? "✔ " : "✘ Era: ") + c.n), el("p", c.d),
          el("div.fila", boton("Siguiente →", siguiente, "primario"))));
      };
      if (modo === "¿Qué es?") {
        caja.append(el("p.negrita", c.mazo.pregunta), el("div.img-grande", { html: c.img() }));
        const lista = el("div.opciones"), todos = [];
        opciones.forEach((t, pos) => {
          const b = el("button.opcion", { type: "button" }, el("b", LETRAS[pos] + ")"), " ", t.n);
          b.onclick = () => elegir(t, b, todos);
          todos.push([t, b]); lista.append(b);
        });
        caja.append(lista);
        ctl.teclas = (e) => { const i = "ABCD".indexOf(e.key.toUpperCase()); if (i >= 0 && todos[i] && !todos[i][1].disabled) { todos[i][1].click(); return true; } return false; };
      } else {
        caja.append(el("p.negrita", "¿Cuál es…?"), el("div.reves-resp", c.n));
        const rej = el("div.img-rejilla"), todos = [];
        opciones.forEach((t) => {
          const b = el("button.img-opcion", { type: "button", html: t.img() });
          b.onclick = () => elegir(t, b, todos);
          todos.push([t, b]); rej.append(b);
        });
        caja.append(rej);
        ctl.teclas = null;
      }
      caja.append(resp);
      main.append(caja);
    };
    const final = () => {
      ctl.teclas = null;
      main.replaceChildren();
      cabecera(main, "🖼️ Tarjetas con imagen", menuImagenes);
      main.append(tarjeta(ok === rondas.length ? "bg-ok_bg" : "", el("h2", `${ok} de ${rondas.length}`),
        el("div.fila", boton("Otra vez", () => jugarImagenes(mazos, modo), "primario"), boton("Otros mazos", menuImagenes, "secundario"))));
    };
    siguiente();
  }

  // ====================================================================== 6. PODCAST DE PREGUNTAS
  function podcastMenu() {
    ctl.teclas = null;
    main.replaceChildren();
    cabecera(main, "🎧 Podcast de preguntas", salir);
    if (!("speechSynthesis" in window)) {
      main.append(tarjeta("bg-mal_bg", el("p", "Este navegador no puede leer en voz alta. Prueba con Chrome o Edge.")));
      return;
    }
    main.append(el("p.suave", "La app lee la pregunta y sus opciones, deja una pausa para que contestes en voz alta y después dice la correcta. Usa la voz en español del dispositivo y mantiene la pantalla encendida mientras suena."));
    const { ids } = pool();
    const fuentes = [
      ["Cola del día", () => A.m.colaDelDia()],
      ["Mis errores y dudas", () => [...new Set([...A.m.erroresSeguros(), ...A.m.colaReflejos(30)])]],
      ["Preguntas oficiales SERGAS", () => ids.filter((id) => (A.c.preguntas[id].origen || "").startsWith("SERGAS"))],
      ["Al azar de lo estudiado", () => ids],
    ];
    let fuente = fuentes[0][0];
    let pausaS = Number(A.p.get("podcast_pausa", 6)), vel = Number(A.p.get("podcast_vel", 1.05)), explicar = A.p.get("podcast_expl", true);
    const fila = (t, ...c) => main.append(tarjeta("fila-opcion", el("div.flex1", el("h3", t)), el("div.fila.envuelve", ...c)));
    fila("Qué escuchar", segmentado(fuentes.map((f) => f[0]), fuente, (v) => (fuente = v)));
    const selU = el("select.selector", el("option", { value: "" }, "— o una unidad concreta —"),
      A.c.ruta().filter((u) => u.id in A.c.lecciones).map((u) => el("option", { value: u.id }, `M${u.modulo}·U${u.numero} ${u.titulo.slice(0, 50)}`)));
    fila("Unidad (opcional)", selU);
    fila("Pausa para pensar", segmentado(["3 s", "6 s", "10 s"], `${pausaS} s`, (v) => { pausaS = parseInt(v, 10); A.p.set("podcast_pausa", pausaS); }));
    fila("Velocidad", segmentado(["0,9×", "1×", "1,15×", "1,3×"], { 0.9: "0,9×", 1: "1×", 1.15: "1,15×", 1.3: "1,3×" }[vel] || "1×",
      (v) => { vel = { "0,9×": 0.9, "1×": 1, "1,15×": 1.15, "1,3×": 1.3 }[v]; A.p.set("podcast_vel", vel); }));
    fila("Leer también la explicación", segmentado(["Sí", "No"], explicar ? "Sí" : "No", (v) => { explicar = v === "Sí"; A.p.set("podcast_expl", explicar); }));
    main.append(el("div.fila", boton("▶ Empezar", () => {
      let lista = selU.value ? A.c.preguntasDeUnidad(selU.value).map((q) => q.id).filter(jugable) : fuentes.find((f) => f[0] === fuente)[1]();
      lista = lista.filter((id) => id in A.c.preguntas);
      if (!lista.length) return aviso("Nada que escuchar", "Esa lista está vacía ahora mismo. Elige otra.");
      podcast(azar.shuffle([...lista]).slice(0, 60), { pausaS, vel, explicar });
    }, "primario grande")));
  }

  function vozEs() {
    const vs = speechSynthesis.getVoices();
    return vs.find((v) => /^es[-_]ES/i.test(v.lang) && /google|natural|online/i.test(v.name)) ||
      vs.find((v) => /^es[-_]ES/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang)) || null;
  }
  const paraVoz = (s) => String(s || "")
    .replace(/\[ALERTA:[^\]]*\]/gi, "")
    .replace(/\*\*|__|_/g, "")
    .replace(/×\s?10\s?([³⁹⁶])/g, (m, e) => ` por diez elevado a ${({ "³": 3, "⁶": 6, "⁹": 9 })[e]} `)
    .replace(/µ[lL]\b/g, " microlitro").replace(/\bm[lL]\b/g, " mililitros").replace(/\bdL\b/g, " decilitro")
    .replace(/\bmg\b/g, " miligramos").replace(/º\s?C|°\s?C/g, " grados").replace(/\s+/g, " ").trim();
  const frases = (s) => paraVoz(s).match(/[^.!?;]+[.!?;]*/g) || [];

  function podcast(lista, { pausaS, vel, explicar }) {
    main.replaceChildren();
    let k = 0, sonando = false, parado = false, timer = null, lock = null, gen = 0;
    const lblE = el("span.suave.peq");
    cabecera(main, "🎧 Podcast", () => { parar(); podcastMenu(); }, marcador(lblE));
    const pantalla = tarjeta("podcast-pantalla");
    const bPlay = boton("⏸", () => (sonando ? pausar() : reanudar()), "primario grande cuadrado");
    main.append(pantalla, el("div.fila.centro.envuelve",
      boton("⏮", () => saltar(-1), "secundario grande cuadrado"), bPlay, boton("⏭", () => saltar(1), "secundario grande cuadrado"),
      boton("⏹ Parar", () => { parar(); podcastMenu(); }, "fantasma")));
    const voz = vozEs();
    if (!voz) main.append(el("p.c-aviso.peq", "No encuentro una voz en español en este dispositivo: se usará la voz por defecto."));

    const decir = (texto, miGen) => new Promise((ok) => {
      const partes = frases(texto);
      let i = 0;
      const sig = () => {
        if (miGen !== gen || parado) return ok(false);
        if (i >= partes.length) return ok(true);
        const u = new SpeechSynthesisUtterance(partes[i++]);
        u.lang = "es-ES"; if (voz) u.voice = voz; u.rate = vel;
        u.onend = sig; u.onerror = sig;
        speechSynthesis.speak(u);
      };
      sig();
    });
    const esperar = (ms, miGen) => new Promise((ok) => { timer = setTimeout(() => ok(miGen === gen && !parado), ms); });

    async function reproducir() {
      const miGen = ++gen;
      sonando = true; bPlay.textContent = "⏸";
      while (k < lista.length && miGen === gen && !parado) {
        const qid = lista[k];
        const q = A.c.preguntas[qid];
        lblE.textContent = `${k + 1} de ${lista.length}`;
        pantalla.replaceChildren(el("div.suave.peq", unidadTxt(q.unidad)), rico(q.enunciado, "enunciado"),
          el("div.opciones", q.opciones.map((o, i) => el("div.opcion.estatica", `${LETRAS[i]})  ${limpia(o)}`))), el("p.suave.peq.pensar", ""));
        const opcionesTxt = q.opciones.map((o, i) => `${LETRAS[i]}, ${limpia(o).replace(/[.\s]+$/, "")}.`).join(" ");
        if (!(await decir(`Pregunta ${k + 1}. ${q.enunciado} ${opcionesTxt}`, miGen))) return;
        pantalla.querySelector(".pensar").textContent = "🤔 Piensa tu respuesta…";
        if (!(await esperar(pausaS * 1000, miGen))) return;
        const ci = LETRAS.indexOf(q.correcta);
        pantalla.querySelectorAll(".opcion")[ci].classList.add("bien");
        pantalla.querySelector(".pensar").replaceChildren(rico(q.explicacion_rapida || ""), cajaNota(qid) || "");
        let txt = `La correcta es la ${q.correcta}, ${textoCorrecta(q).replace(/[.\s]+$/, "")}.`;
        if (explicar && q.explicacion_rapida) txt += " " + q.explicacion_rapida;
        if (A.p.nota(qid)) txt += " Tu truco: " + A.p.nota(qid);
        if (!(await decir(txt, miGen))) return;
        if (!(await esperar(1200, miGen))) return;
        k++;
      }
      if (k >= lista.length) {
        sonando = false;
        pantalla.replaceChildren(el("h2", "🎧 Fin de la lista"), el("p", `Has escuchado ${lista.length} preguntas.`));
        bPlay.textContent = "▶";
        soltarPantalla();
      }
    }
    async function pedirPantalla() { try { lock = await navigator.wakeLock.request("screen"); } catch { lock = null; } }
    function soltarPantalla() { try { lock && lock.release(); } catch { /* nada */ } lock = null; }
    function pausar() { gen++; speechSynthesis.cancel(); clearTimeout(timer); sonando = false; bPlay.textContent = "▶"; }
    function reanudar() { if (k >= lista.length) k = 0; pedirPantalla(); reproducir(); }
    function saltar(d) { pausar(); k = Math.max(0, Math.min(lista.length - 1, k + d)); reanudar(); }
    function parar() { parado = true; gen++; speechSynthesis.cancel(); clearTimeout(timer); soltarPantalla(); }
    limpiar = parar;
    ctl.teclas = (e) => {
      if (e.key === " ") { sonando ? pausar() : reanudar(); return true; }
      if (e.key === "ArrowRight") { saltar(1); return true; }
      if (e.key === "ArrowLeft") { saltar(-1); return true; }
      return false;
    };
    // las voces pueden tardar en cargarse
    if (!speechSynthesis.getVoices().length) speechSynthesis.onvoiceschanged = () => {};
    pedirPantalla();
    reproducir();
  }

  // ====================================================================== 7. MIS TRUCOS
  function listaTrucos() {
    ctl.teclas = null;
    main.replaceChildren();
    cabecera(main, "✏️ Mis trucos", salir);
    const ids = Object.keys(A.p.notas || {}).filter((q) => q in A.c.preguntas)
      .sort((a, b) => (A.c.preguntas[a].unidad < A.c.preguntas[b].unidad ? -1 : 1));
    main.append(el("p.suave", "Escribe un truco desde cualquier pregunta ya respondida (botón «✏️ Mi truco»). Aquí tienes todos juntos."));
    if (!ids.length) {
      main.append(tarjeta("", el("p", "Todavía no tienes trucos. La próxima vez que una pregunta se te atragante, pulsa «✏️ Mi truco» tras responderla y escribe tu propia regla: lo que inventas tú se recuerda mucho mejor.")));
      return;
    }
    for (const qid of ids) {
      const q = A.c.preguntas[qid];
      main.append(tarjeta("",
        el("div.suave.peq", unidadTxt(q.unidad)),
        el("p.negrita", q.enunciado), el("p", "✔ ", textoCorrecta(q)), cajaNota(qid),
        el("div.fila", boton("Editar", () => editarNota(qid, listaTrucos), "secundario"),
          boton("Practicarla", () => A.ir("repaso", { modo: "lista", ids: [qid] }), "fantasma"))));
    }
  }

  // ====================================================================== 8. CUADERNO DE ERRORES
  function cuadernoErrores() {
    const filas = [];
    for (const [qid, e] of Object.entries(A.p.p)) {
      const q = A.c.preguntas[qid];
      if (!q || q.anulada) continue;
      let peso = 0; const motivos = [];
      if ((e.confirmar || 0) > 0) { peso += 6; motivos.push("error seguro sin corregir"); }
      else if ((e.err_seguro || 0) > 0) { peso += 3; motivos.push(`${e.err_seguro} error(es) seguro(s)`); }
      if (e.alerta_trampa) { peso += 4; motivos.push("alerta trampa"); }
      if ((e.fallos || 0) >= 2) { peso += Math.min(4, e.fallos); motivos.push(`${e.fallos} fallos`); }
      if (e.ult_certeza === "azar" || e.ult_certeza === "duda") { peso += 1; motivos.push("la última vez dudabas"); }
      if (A.p.nota(qid) && peso) peso += 0.5;
      if (peso >= 2) filas.push({ qid, q, e, peso, motivos });
    }
    if (!filas.length) return aviso("Cuaderno vacío", "Todavía no hay errores que merezcan el cuaderno: aparecen aquí los errores seguros, las alertas trampa y las preguntas falladas 2 o más veces.");
    filas.sort((a, b) => b.peso - a.peso);
    const porMod = {};
    for (const f of filas) { const u = A.c.unidades[f.q.unidad]; (porMod[u ? u.modulo : 0] ||= []).push(f); }
    const unidades = new Set(filas.map((f) => f.q.unidad));
    let n = 0;
    const bloques = Object.keys(porMod).sort((a, b) => a - b).map((m) => {
      const mod = A.c.modulo(Number(m));
      const items = porMod[m].map((f) => {
        const ci = LETRAS.indexOf(f.q.correcta), ti = LETRAS.indexOf(f.e.ultimo_distractor || "");
        const ops = f.q.opciones.map((o, i) => `<li class="${i === ci ? "ok" : i === ti ? "ko" : ""}">${i === ci ? "✔ " : i === ti ? "✘ " : ""}${esc(o)}</li>`).join("");
        const expl = (f.q.explicacion_rapida || "").replace(/\[ALERTA:[^\]]*\]/i, "").trim();
        const nota = A.p.nota(f.qid);
        return `<div class="q"><div class="cab">${++n}. ${esc(unidadTxt(f.q.unidad))} · <span class="mot">${esc(f.motivos.join(" · "))}</span></div>
          <div class="en">${esc(f.q.enunciado)}</div><ol>${ops}</ol>
          ${ti >= 0 && ti !== ci ? `<div class="tu">Tu error habitual: <b>${esc(LETRAS[ti])}</b></div>` : ""}
          <div class="ex">${md(expl)}</div>${nota ? `<div class="truco">✏️ Tu truco: ${esc(nota)}</div>` : ""}</div>`;
      }).join("");
      return `<h2>Módulo ${m}${mod ? " · " + esc(mod.titulo) : ""}</h2>${items}`;
    }).join("");
    const trampas = [...unidades].map((u) => {
      const l = A.c.lecciones[u];
      if (!l) return "";
      const ts = l.tarjetas.filter((t) => t.tipo === "trampa");
      return ts.map((t) => `<div class="tr"><b>${esc(unidadTxt(u))} · ${mdInline(t.titulo || "")}</b>${md(t.texto || "")}</div>`).join("");
    }).join("");
    abrirImprimible(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cuaderno de errores · LAB SERGAS</title><style>
body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;margin:0;color:#222}.doc{padding:12mm;max-width:190mm;margin:auto}
.barra{background:#A3123A;color:#fff;padding:10px 16px;display:flex;gap:12px;align-items:center}
.barra button{font:600 15px system-ui;padding:8px 16px;border:0;border-radius:8px}@media print{.barra{display:none}}
h1{color:#A3123A;font-size:20pt;margin:0 0 2mm}h2{color:#0F6E66;font-size:13pt;border-bottom:2px solid #0F6E66;margin-top:7mm}
.q{break-inside:avoid;border-bottom:1px solid #ddd;padding:2.5mm 0}.cab{font-size:8.5pt;color:#0F6E66;font-weight:700}.mot{color:#A3123A}
.en{font-weight:700;margin:1mm 0}ol{list-style:none;padding-left:0;margin:1mm 0}li{padding:.4mm 2mm;border-radius:3px}
li.ok{background:#E3F4E8;font-weight:700}li.ko{background:#FCE8EE;text-decoration:line-through}.tu{font-size:9pt;color:#A3123A}
.ex{font-size:9.5pt;color:#444}.ex p{margin:.8mm 0}.truco{background:#F1EBFB;border-left:3px solid #6A3FB5;padding:1mm 2mm;font-size:9.5pt;margin-top:1mm}
.tr{break-inside:avoid;background:#FCE8EE;border-radius:4px;padding:2mm 3mm;margin:2mm 0;font-size:9.5pt}.tr p{margin:.8mm 0}
.int{color:#555}</style></head><body>
<div class="barra"><button id="imp">🖨️ Imprimir / Guardar como PDF</button><span>En «Destino» elige «Guardar como PDF».</span></div>
<div class="doc"><h1>Cuaderno de errores</h1><p class="int">${filas.length} preguntas · generado el ${fechaEs(hoy())}. Ordenadas por gravedad dentro de cada módulo:
los errores seguros (fallos estando convencida) primero. En verde la correcta; tachada, la opción en la que sueles caer.</p>
${bloques}${trampas ? `<h2>Trampas clásicas de estos temas</h2>${trampas}` : ""}</div>
<script>document.getElementById("imp").onclick=function(){print()}</script></body></html>`);
    toast("Cuaderno abierto en otra pestaña.");
  }

  // ---------------------------------------------------------------- arranque
  if (args.juego === "vf") juegoVF();
  else menu();
  ctl.refrescar = () => { if (ctl.refrescarRemoto && !limpiar) menu(); };
  return ctl;
}

// ======================================================================== gesto de deslizar (tablet)
function deslizar(nodo, alSoltar) {
  let x0 = null, id = null;
  nodo.style.touchAction = "pan-y";
  nodo.addEventListener("pointerdown", (e) => { x0 = e.clientX; id = e.pointerId; nodo.setPointerCapture(id); nodo.style.transition = "none"; });
  nodo.addEventListener("pointermove", (e) => {
    if (x0 === null || e.pointerId !== id) return;
    const dx = e.clientX - x0;
    nodo.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    nodo.classList.toggle("tira-ok", dx > 40); nodo.classList.toggle("tira-mal", dx < -40);
  });
  const soltar = (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    nodo.style.transition = "transform .15s"; nodo.style.transform = "";
    nodo.classList.remove("tira-ok", "tira-mal");
    if (Math.abs(dx) > 90) alSoltar(dx);
  };
  nodo.addEventListener("pointerup", soltar);
  nodo.addEventListener("pointercancel", () => { x0 = null; nodo.style.transform = ""; });
}
