// Unidad de Análisis — aventura gráfica de estudio (se carga solo al entrar).
// Primera entrega: sede central con rangos, El interrogatorio y Casos sin resolver.
import { A } from "./ctx.js";
import { el, boton, tarjeta, rico, barra, toast, segmentado } from "./ui.js";
import { bloquePregunta, teclasPregunta, limpia } from "./pregunta.js";
import { necesitaValidar } from "./content.js";
import { azar, norm } from "./util.js";
import { busto, EQUIPO, sospechoso, ESCENAS } from "./u-arte.js";
import { GUION } from "./u-guion.js";
import { decir, callar } from "./u-voz.js";

// ======================================================================== datos de juego
export const SEDES = {
  miami: { nombre: "Miami", lema: "Sol, playa y muestras a 40 grados", modulos: [1, 2, 4], tinte: "#FF8A3D", escena: "miami" },
  vegas: { nombre: "Las Vegas", lema: "Noches de neón y laboratorio 24 horas", modulos: [3, 5, 6], tinte: "#FF3FB0", escena: "vegas" },
  nuevayork: { nombre: "Nueva York", lema: "Ocho millones de rastros", modulos: [7, 8], tinte: "#5FA8FF", escena: "nuevayork" },
};
const RANGOS = [
  [0, "Técnica en prácticas"], [150, "Técnica de campo"], [400, "Técnica especialista"],
  [900, "Supervisora de laboratorio"], [1800, "Jefa de laboratorio"], [3500, "Leyenda de la Unidad"],
];
const PUNTOS = { acierto: 10, pleno: 20, frio_cerrado: 25, frio_bien: 5 };
const RONDAS_INTERROGATORIO = 5;
const AMBIGUA = /(todas|ninguna|ambas|anteriores|\b[a-d]\)? y \b[a-d]\b|son correctas|son ciertas|son falsas)/i;

const estado = () => {
  const u = A.p.get("unidad", null) || {};
  return { puntos: 0, casos: 0, resueltas: 0, frios: {}, cerrados: {}, visto: false, ...u };
};
const guardar = (U) => A.p.set("unidad", JSON.parse(JSON.stringify(U)));
function rango(p) {
  let r = RANGOS[0], sig = null;
  for (let i = 0; i < RANGOS.length; i++) if (p >= RANGOS[i][0]) { r = RANGOS[i]; sig = RANGOS[i + 1] || null; }
  return { nombre: r[1], desde: r[0], hasta: sig ? sig[0] : null, siguiente: sig ? sig[1] : null };
}
const sedeDeUnidad = (uid) => {
  const u = A.c.unidades[uid];
  if (!u) return null;
  return Object.keys(SEDES).find((k) => SEDES[k].modulos.includes(u.modulo)) || null;
};
function jugable(qid) {
  const q = A.c.preguntas[qid];
  if (!q || q.anulada) return false;
  const v = A.c.validaciones, est = v.estado(qid);
  if (est === "dudosa") return false;
  if (necesitaValidar(q) && !["confirmada", "corregida"].includes(est)) return false;
  return true;
}
function esNegativa(q) {
  const e = norm(q.enunciado);
  return /\b(no|incorrect[ao]s?|fals[ao]s?|excepto|salvo)\b/.test(e) &&
    /(no es|no son|no corresponde|no se|no produce|no detecta|no pertenece|incorrect|fals|excepto|salvo|no ser|no esta|no estan|no forma|no aparece|no indica|no tiene|no debe|no presenta|no se considera)/.test(e);
}
const elegirUna = (lista) => lista[Math.floor(azar() * lista.length)];
const numeroCaso = () => String(1000 + Math.floor(azar() * 8999));

// ======================================================================== vista
export function vistaUnidad(main, args = {}, ctlExterno = null) {
  let vivo = true;
  const ctl = Object.assign(ctlExterno || {}, { nombre: "unidad", teclas: null, refrescarRemoto: false });
  ctl.destruir = () => { vivo = false; callar(); };
  let U = estado();

  // ---------------------------------------------------------------- piezas de escena
  function escena(fondo, actores = []) {
    const capa = el("div.u-actores");
    const cont = el("div.u-escena", el("div.u-fondo", { html: fondo }), capa);
    cont.ponerActores = (lista) => {
      capa.replaceChildren(...lista.map(([id, expr, extra = ""]) => {
        const p = EQUIPO[id];
        const n = el("div.u-actor" + (extra ? "." + extra : ""), { html: busto(p, expr || "neutro"), "data-id": id, title: p.nombre });
        return n;
      }));
    };
    cont.ponerActores(actores);
    return cont;
  }
  /** Caja de diálogo estilo cómic. Devuelve una función hablar(). */
  function dialogo() {
    const retrato = el("div.u-retrato");
    const nombre = el("div.u-nombre");
    const texto = el("div.u-texto");
    const sig = el("button.u-sig", { type: "button", title: "Continuar (Enter)" }, "▸");
    const caja = el("div.u-dialogo", retrato, el("div.u-bocadillo", nombre, texto, sig));
    let terminarEscritura = null, esperar = null, tEscritura = null;
    const avanzar = () => {
      if (terminarEscritura) { terminarEscritura(); return; }
      if (esperar) { const f = esperar; esperar = null; callar(); f(); }
    };
    caja.addEventListener("click", avanzar);
    caja.avanzar = avanzar;
    /**
     * persona: {id del equipo} o un objeto sospechoso; fija: frase del guion (voz grabada si existe).
     */
    caja.hablar = (persona, expr, txt, { fija = false, vozId = null, escena: esc = null, esperarClic = true } = {}) => new Promise((ok) => {
      if (!vivo) return ok();
      const p = typeof persona === "string" ? EQUIPO[persona] : persona;
      retrato.innerHTML = busto(p, expr);
      nombre.textContent = p.nombre + (p.oficio ? ` · ${p.oficio}` : "");
      caja.classList.toggle("sospechoso", typeof persona !== "string");
      if (esc && typeof persona === "string") esc.querySelectorAll(".u-actor").forEach((a) => a.classList.toggle("habla", a.dataset.id === persona));
      // escritura progresiva (corta cualquier frase anterior a medias)
      clearInterval(tEscritura); terminarEscritura = null;
      if (esperar) { const f = esperar; esperar = null; f(); }
      sig.classList.remove("listo");
      texto.textContent = "";
      let i = 0; const total = txt.length;
      const t = tEscritura = setInterval(() => {
        i = Math.min(total, i + 3);
        texto.textContent = txt.slice(0, i);
        if (i >= total) fin();
      }, 18);
      const fin = () => {
        clearInterval(t); terminarEscritura = null; texto.textContent = txt;
        if (p.quitaGafas && expr === "sorpresa") setTimeout(() => { if (vivo) retrato.innerHTML = busto(p, "serio"); }, 900);
        if (!esperarClic) { ok(); return; }
        sig.classList.add("listo");
        esperar = () => { sig.classList.remove("listo"); ok(); };
      };
      terminarEscritura = fin;
      decir(txt, vozId || (typeof persona === "string" ? persona : `sospechoso_${p.voz.g}`), p.voz, fija);
    });
    return caja;
  }
  const linea = (grupo) => elegirUna(GUION[grupo]);
  async function decirGuion(dlg, grupo, esc = null, sosp = null) {
    const [quien, expr, txt] = linea(grupo);
    if (quien === "sospechoso") return dlg.hablar(sosp, expr, txt, { fija: true, vozId: `sospechoso_${sosp.voz.g}` });
    return dlg.hablar(quien, expr, txt, { fija: true, escena: esc });
  }
  function teclasDialogo(dlg, extra = null) {
    ctl.teclas = (e) => {
      if (extra && extra(e)) return true;
      if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
      return false;
    };
  }
  async function sumar(puntos, dlg = null) {
    const antes = rango(U.puntos).nombre;
    U.puntos += puntos;
    guardar(U);
    const ahora = rango(U.puntos).nombre;
    if (ahora !== antes) {
      toast(`🎖️ Nuevo rango: ${ahora}`, 4000);
      if (dlg) await decirGuion(dlg, "rango");
    }
  }

  // ================================================================ SEDE CENTRAL
  function portada() {
    callar(); ctl.teclas = null;
    U = estado();
    main.replaceChildren();
    const r = rango(U.puntos);
    main.append(el("div.fila.entre.envuelve",
      el("h1", "🔎 Unidad de Análisis"),
      el("div.fila.envuelve", el("span.suave.peq", "Velocidad de las voces:"),
        segmentado(["1×", "1,15×", "1,3×", "1,5×", "1,75×"], { 1: "1×", 1.15: "1,15×", 1.3: "1,3×", 1.5: "1,5×", 1.75: "1,75×" }[Number(A.p.get("unidad_vel", 1.3))] || "1,3×",
          (v) => A.p.set("unidad_vel", { "1×": 1, "1,15×": 1.15, "1,3×": 1.3, "1,5×": 1.5, "1,75×": 1.75 }[v])),
        boton(A.p.get("unidad_voz", true) !== false ? "🔊 Voces" : "🔇 Voces", (e) => {
        const on = A.p.get("unidad_voz", true) === false;
        A.p.set("unidad_voz", on); e.target.textContent = on ? "🔊 Voces" : "🔇 Voces"; if (!on) callar();
      }, "fantasma"))));
    // ficha de Anna
    const prog = r.hasta ? (U.puntos - r.desde) / (r.hasta - r.desde) : 1;
    main.append(tarjeta("u-ficha",
      el("div.u-ficha-foto", { html: busto(EQUIPO.anna, "sonrie") }),
      el("div.flex1",
        el("div.suave.peq", "DETECTIVE · PLACA 2814"),
        el("h2", "Anna"),
        el("div.u-rango", "🎖️ " + r.nombre),
        barra(prog, "aviso"),
        el("div.suave.peq", r.hasta ? `${U.puntos} puntos · faltan ${r.hasta - U.puntos} para «${r.siguiente}»` : `${U.puntos} puntos · rango máximo`),
        el("div.peq", `📁 ${U.casos} casos cerrados · ✔ ${U.resueltas} interrogatorios acertados · 🗄️ ${Object.keys(U.cerrados).length} casos fríos archivados`))));
    // sedes
    const rej = el("div.u-sedes");
    for (const [k, s] of Object.entries(SEDES)) {
      const mods = s.modulos.map((m) => `M${m}`).join(" · ");
      rej.append(el("button.u-sede", { type: "button", onclick: () => sede(k) },
        el("div.u-sede-img", { html: ESCENAS[s.escena]() }),
        el("div.u-sede-txt", el("b", s.nombre), el("span.peq", s.lema), el("span.peq.suave", mods))));
    }
    main.append(el("h3", "Elige sede"), rej);
    const nFrios = casosFrios().length;
    main.append(tarjeta("fila-opcion u-frios-card",
      el("div.flex1", el("h3", `🗄️ Casos sin resolver (${nFrios})`), el("p.suave.peq", "Tus errores seguros, las trampas en las que caíste y las preguntas que más fallas. Cada caso se cierra resolviéndolo bien dos veces seguidas.")),
      boton("Abrir el archivo", () => archivo(null), "primario")));
    // equipo: tocar para charlar
    const eq = el("div.u-equipo");
    const dlg = dialogo();
    for (const id of ["duarte", "valeria", "marco", "iker", "carmen"]) {
      eq.append(el("button.u-miembro", { type: "button", onclick: () => {
        const ls = GUION.charla.filter((l) => l[0] === id);
        const [, ex, t] = ls.length ? elegirUna(ls) : ["", "neutro", "…"];
        dlg.hablar(id, ex, t, { fija: true });
      } }, el("div", { html: busto(EQUIPO[id], "neutro") }), el("span.peq", EQUIPO[id].nombre.replace(/^(Teniente|Dra\.|Agente) /, ""))));
    }
    main.append(el("h3", "El equipo"), el("p.suave.peq", "Toca a cualquiera para charlar."), eq, dlg);
    teclasDialogo(dlg);
    if (!U.visto) {
      U.visto = true; guardar(U);
      decirGuion(dlg, "bienvenida");
    }
  }

  // ================================================================ SEDE
  async function sede(k) {
    callar();
    const s = SEDES[k];
    main.replaceChildren();
    const esc = escena(ESCENAS[s.escena](), [["duarte", "neutro"], ["anna", "neutro"]]);
    const dlg = dialogo();
    main.append(el("div.fila.entre", el("div.fila", boton("← Unidad", portada, "fantasma"), el("h2", `Sede de ${s.nombre}`)),
      el("span.suave.peq", s.modulos.map((m) => `M${m} ${A.c.modulo(m).titulo}`).join(" · "))), esc, dlg);
    const nFrios = casosFrios(k).length;
    const juegos = el("div.u-juegos",
      juegoBtn("🗣️", "El interrogatorio", "Cuatro sospechosos, una verdad. Preguntas de esta sede.", () => interrogatorio(k)),
      juegoBtn("🗄️", `Casos sin resolver (${nFrios})`, "Lo que se te resiste de los módulos de esta sede.", () => archivo(k), nFrios === 0),
      juegoBtn("🧪", "El laboratorio identifica al culpable", "ADN, grupos sanguíneos y microscopía.", () => laboratorio(k)),
      juegoBtn("📌", "El tablero de pruebas", "Une cada prueba con su significado.", null, true, "Próximamente"),
      juegoBtn("🩻", "La mesa de autopsias", "Bioquímica, gasometría y causa de la muerte.", null, true, "Próximamente"),
      juegoBtn("🧫", "El caso de la muestra", "¿Dónde falló la preanalítica?", null, true, "Próximamente"),
      juegoBtn("🔗", "Cadena de custodia", "Encuentra el eslabón roto.", null, true, "Próximamente"));
    main.append(juegos);
    teclasDialogo(dlg);
    await decirGuion(dlg, "sede_" + k, esc);
  }
  function juegoBtn(ic, tit, desc, cmd, desactivado = false, etiqueta = "") {
    return el("button.u-juego" + (desactivado ? ".bloqueado" : ""), { type: "button", onclick: desactivado ? null : cmd, disabled: desactivado || null },
      el("div.u-juego-ic", ic), el("div", el("b", tit), el("div.peq.suave", desc), etiqueta ? el("div.u-pronto", etiqueta) : null));
  }

  // ================================================================ EL INTERROGATORIO
  function preguntasSede(k) {
    const s = SEDES[k];
    const hechas = A.p.leccionesCompletadas(), vistas = A.p.vistas();
    const base = Object.keys(A.c.preguntas).filter((id) => {
      const q = A.c.preguntas[id], u = A.c.unidades[q.unidad];
      return u && s.modulos.includes(u.modulo) && jugable(id) && q.opciones.length === 4 && !q.opciones.some((o) => AMBIGUA.test(limpia(o)));
    });
    const est = base.filter((id) => hechas.has(A.c.preguntas[id].unidad) || vistas.has(id));
    return est.length >= RONDAS_INTERROGATORIO * 2 ? est : base;
  }
  async function interrogatorio(k) {
    callar();
    const s = SEDES[k];
    const ids = azar.shuffle(preguntasSede(k)).slice(0, RONDAS_INTERROGATORIO);
    if (!ids.length) { toast("No hay preguntas disponibles en esta sede."); return; }
    const caso = numeroCaso();
    let aciertos = 0;
    main.replaceChildren();
    const lblM = el("span.suave.peq");
    const esc = escena(ESCENAS.interrogatorio(s.tinte), [["marco", "neutro"], ["anna", "neutro"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    main.append(el("div.fila.entre", el("div.fila", boton("← Sede", () => sede(k), "fantasma"), el("h2", `🗣️ Caso #${caso}`)), lblM), esc, dlg, zona);
    teclasDialogo(dlg);
    await decirGuion(dlg, "interrogatorio_intro", esc);
    for (let ronda = 0; ronda < ids.length && vivo; ronda++) {
      lblM.textContent = `Interrogatorio ${ronda + 1} de ${ids.length} · ${aciertos} resueltos`;
      const ok = await rondaInterrogatorio(ids[ronda], ronda, esc, dlg, zona, k);
      if (ok) aciertos++;
    }
    if (!vivo) return;
    lblM.textContent = `${aciertos} de ${ids.length} resueltos`;
    zona.replaceChildren();
    esc.classList.remove("compacta");
    U = estado();
    U.casos += 1; U.resueltas += aciertos;
    let pts = aciertos * PUNTOS.acierto + (aciertos === ids.length ? PUNTOS.pleno : 0);
    guardar(U);
    esc.ponerActores([["duarte", "serio"], ["anna", aciertos >= 3 ? "sonrie" : "duda"]]);
    await decirGuion(dlg, aciertos >= 3 ? "cierre" : "cierre_flojo", esc);
    await sumar(pts, dlg);
    zona.append(tarjeta(aciertos >= 3 ? "bg-ok_bg" : "",
      el("h2", aciertos === ids.length ? "📁 Caso cerrado · ¡pleno!" : aciertos >= 3 ? "📁 Caso cerrado" : "📂 Caso pendiente"),
      el("p", `${aciertos} de ${ids.length} interrogatorios resueltos · +${pts} puntos · rango: ${rango(estado().puntos).nombre}`),
      el("p.suave.peq", "Todas las respuestas cuentan para tu repaso: las falladas vuelven a la cola de emergencia."),
      el("div.fila.envuelve", boton("Otro caso", () => interrogatorio(k), "primario"), boton("Volver a la sede", () => sede(k), "secundario"))));
  }

  function rondaInterrogatorio(qid, ronda, esc, dlg, zona, k) {
    return new Promise(async (resolver) => {
      const q = A.c.preguntas[qid];
      const mentira = esNegativa(q);
      zona.replaceChildren();
      esc.ponerActores([["marco", "neutro"], ["anna", "neutro"]]);
      await decirGuion(dlg, mentira ? "regla_mentira" : "regla_verdad", esc);
      if (!vivo) return resolver(false);
      esc.classList.add("compacta");   // durante la ronda manda la sala: el escenario se pliega
      // expediente con la pregunta
      const u = A.c.unidades[q.unidad];
      zona.append(el("div.u-expediente",
        el("div.u-exp-cab", `EXPEDIENTE · M${u.modulo}·U${u.numero} ${u.titulo.slice(0, 70)}`),
        rico(q.enunciado, "enunciado"),
        el("div.u-exp-regla", mentira ? "Tres dicen la verdad. Señala al que MIENTE." : "Solo uno dice la verdad. Señala al que dice la VERDAD.")));
      // sospechosos
      const usados = new Set();
      const sos = [0, 1, 2, 3].map((i) => {
        let s, semilla = Math.floor(azar() * 1e9);
        do { s = sospechoso(semilla++); } while (usados.has(s.nombre));
        usados.add(s.nombre);
        return s;
      });
      const orden = azar.shuffle([0, 1, 2, 3]);
      const rej = el("div.u-sospechosos");
      let resuelta = false;
      const tarjetas = [];
      orden.forEach((idx, pos) => {
        const s = sos[pos];
        const t = el("button.u-sospechoso", { type: "button" },
          el("div.u-sos-foto", { html: busto(s, "neutro") }),
          el("div.u-sos-nombre", el("b", `${pos + 1}. ${s.nombre}`), el("span.peq.suave", s.oficio)),
          el("div.u-sos-dice", "«" + limpia(q.opciones[idx]) + "»"));
        t.onclick = () => elegir(pos);
        tarjetas.push({ t, s, idx });
        rej.append(t);
      });
      zona.append(rej);
      ctl.teclas = (e) => {
        if (!resuelta && /^[1-4]$/.test(e.key)) { elegir(Number(e.key) - 1); return true; }
        if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
        return false;
      };
      // la voz de Marco lee la pregunta (voz del dispositivo)
      dlg.hablar("marco", "neutro", q.enunciado, { escena: esc, esperarClic: false });

      async function elegir(pos) {
        if (resuelta) return;
        resuelta = true;
        callar();
        const { t, s, idx } = tarjetas[pos];
        const letra = "ABCD"[idx];
        const res = A.m.responder(qid, letra, "unidad");
        const ok = res.correcta;
        const cIdx = "ABCD".indexOf(q.correcta);
        tarjetas.forEach((x) => {
          x.t.disabled = true;
          if (x.idx === cIdx) x.t.classList.add(mentira ? "miente" : "verdad");
          else if (x === tarjetas[pos]) x.t.classList.add("error");
          else x.t.classList.add("apagado");
        });
        t.querySelector(".u-sos-foto").innerHTML = busto(s, ok ? (mentira ? "serio" : "sonrie") : "sorpresa");
        if (mentira) await decirGuion(dlg, ok ? "acusado_culpable" : "acusado_inocente", esc, s);
        else await dlg.hablar(s, ok ? "sonrie" : "sonrie", ok ? "¡Por fin alguien me cree, detective!" : "Vaya… se lo ha creído.", { fija: true, vozId: `sospechoso_${s.voz.g}` });
        if (!vivo) return resolver(ok);
        setTimeout(() => dlg.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
        esc.ponerActores([[ok ? "anna" : "valeria", ok ? "sonrie" : "neutro"], ["duarte", "neutro"]]);
        await decirGuion(dlg, ok ? "acierto" : "fallo", esc);
        if (!ok && vivo) {
          const [quien] = linea("explica");
          esc.ponerActores([[quien, "neutro"], ["anna", "duda"]]);
          await dlg.hablar(quien, "neutro", `La correcta era: «${limpia(q.opciones[cIdx])}». ${(q.explicacion_rapida || "").replace(/\[ALERTA:[^\]]*\]/i, "").replace(/\*\*/g, "").trim()}`, { escena: esc });
        }
        resolver(ok);
      }
    });
  }

  // ================================================================ CASOS SIN RESOLVER
  function casosFrios(k = null) {
    const U2 = estado();
    const out = [];
    for (const [qid, e] of Object.entries(A.p.p)) {
      const q = A.c.preguntas[qid];
      if (!q || !jugable(qid)) continue;
      if (k && sedeDeUnidad(q.unidad) !== k) continue;
      const motivos = [];
      if ((e.confirmar || 0) > 0 || (e.err_seguro || 0) > 0) motivos.push("ERROR SEGURO");
      if (e.alerta_trampa) motivos.push("TRAMPA");
      if ((e.fallos || 0) >= 2 && e.fallos > e.aciertos) motivos.push(`${e.fallos} FALLOS`);
      if (!motivos.length) continue;
      if (qid in U2.cerrados && U2.cerrados[qid] >= (e.fallos || 0)) continue;   // cerrado y sin fallos nuevos
      out.push({ qid, q, motivos, racha: U2.frios[qid] || 0 });
    }
    out.sort((a, b) => b.motivos.length - a.motivos.length);
    return out;
  }
  async function archivo(k) {
    callar();
    main.replaceChildren();
    const esc = escena(ESCENAS.archivo(), [["carmen", "neutro"], ["anna", "neutro"]]);
    const dlg = dialogo();
    const lista = casosFrios(k);
    const volver = () => (k ? sede(k) : portada());
    main.append(el("div.fila.entre", el("div.fila", boton(k ? "← Sede" : "← Unidad", volver, "fantasma"),
      el("h2", "🗄️ Casos sin resolver" + (k ? ` · ${SEDES[k].nombre}` : ""))), el("span.suave.peq", `${lista.length} expedientes`)), esc, dlg);
    teclasDialogo(dlg);
    const rej = el("div.u-carpetas");
    for (const c of lista) {
      const u = A.c.unidades[c.q.unidad];
      rej.append(el("button.u-carpeta", { type: "button", onclick: () => abrirFrio(c, k) },
        el("div.u-carpeta-pest", "EXP-" + c.qid.replace(/\W/g, "").slice(-6).toUpperCase()),
        el("div.peq.negrita", `M${u.modulo}·U${u.numero}`),
        el("div.peq", u.titulo.slice(0, 60)),
        el("div.u-sellos", c.motivos.map((m) => el("span.u-sello", m))),
        el("div.u-racha", c.racha ? "● ○  1 de 2" : "○ ○  0 de 2")));
    }
    main.append(rej);
    await decirGuion(dlg, lista.length ? "frios_intro" : "frios_vacio", esc);
  }
  async function abrirFrio(c, k) {
    callar();
    main.replaceChildren();
    const esc = escena(ESCENAS.archivo(), [["carmen", "neutro"], ["anna", "serio"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    main.append(el("div.fila", boton("← Archivo", () => archivo(k), "fantasma"), el("h2", "Expediente EXP-" + c.qid.replace(/\W/g, "").slice(-6).toUpperCase())), esc, dlg, zona);
    teclasDialogo(dlg);
    const b = bloquePregunta(c.qid, {
      contexto: "unidad",
      onFin: async (ok) => {
        U = estado();
        if (ok) {
          U.frios[c.qid] = (U.frios[c.qid] || 0) + 1;
          if (U.frios[c.qid] >= 2) {
            U.cerrados[c.qid] = A.p.estado(c.qid).fallos || 0;
            delete U.frios[c.qid];
            U.casos += 1;
            guardar(U);
            zona.prepend(el("div.u-sello-grande", "CASO CERRADO"));
            esc.ponerActores([["duarte", "sorpresa"], ["anna", "sonrie"]]);
            await decirGuion(dlg, "frios_cerrado", esc);
            await sumar(PUNTOS.frio_cerrado, dlg);
          } else {
            guardar(U);
            esc.ponerActores([["carmen", "sonrie"], ["anna", "sonrie"]]);
            await decirGuion(dlg, "frios_bien", esc);
            await sumar(PUNTOS.frio_bien, dlg);
          }
        } else {
          U.frios[c.qid] = 0;
          guardar(U);
          esc.ponerActores([["carmen", "duda"], ["anna", "duda"]]);
          await decirGuion(dlg, "frios_mal", esc);
        }
        if (vivo) archivo(k);
      },
    });
    zona.append(el("div.u-expediente.tira", el("div.u-exp-cab", `CASO SIN RESOLVER · ${c.motivos.join(" · ")}`)), tarjeta("u-exp-cuerpo", b));
    ctl.teclas = (e) => teclasPregunta(b, e) || ((e.key === "Enter" || e.key === " ") && (dlg.avanzar(), true));
    await dlg.hablar("carmen", "neutro", "Este expediente sigue abierto. Léelo con calma y dime qué ves.", { fija: true, escena: esc });
  }

  // ================================================================ EL LABORATORIO IDENTIFICA AL CULPABLE
  // Tres análisis con ciencia real del temario: grupo ABO/Rh (M8·U6), huella genética por STR (M3·U7, M2·U4)
  // y microscopía con Gram (M7·U2, M7·U5). Después, dos preguntas del banco de esas unidades («el tribunal»).
  const LAB_UNIDADES = { abo: ["M8_U6"], adn: ["M3_U7", "M3_U5", "M2_U4"], micro: ["M7_U2", "M7_U5"] };
  const LAB_TIPOS = { miami: [["adn", 2], ["abo", 1], ["micro", 1]], vegas: [["adn", 3], ["abo", 1]], nuevayork: [["abo", 1], ["micro", 1]] };
  const elegirPeso = (pares) => azar.choice(pares.map((p) => p[0]), pares.map((p) => p[1]));

  function preguntasDe(unidades, n) {
    const hechas = A.p.leccionesCompletadas(), vistas = A.p.vistas();
    const base = Object.keys(A.c.preguntas).filter((id) => unidades.includes(A.c.preguntas[id].unidad) && jugable(id));
    const est = base.filter((id) => hechas.has(A.c.preguntas[id].unidad) || vistas.has(id));
    return azar.shuffle(est.length >= n ? est : base).slice(0, n);
  }
  function sospechososUnicos(n) {
    const usados = new Set(), out = [];
    while (out.length < n) {
      const s = sospechoso(Math.floor(azar() * 1e9));
      if (!usados.has(s.nombre)) { usados.add(s.nombre); out.push(s); }
    }
    return out;
  }

  // ---------------------------------------------------------------- dibujos de los análisis
  const GRUPOS = ["A", "B", "AB", "O"];
  const nombreGrupo = (g, rh) => `${g} ${rh ? "Rh+" : "Rh−"}`;
  function pocillo(aglutina, etiqueta) {
    const grumos = [[22, 22, 7], [36, 20, 5], [30, 33, 8], [18, 37, 4.5], [41, 34, 5.5], [27, 46, 4], [40, 45, 3.5], [16, 27, 3]];
    const dentro = aglutina ? grumos.map(([x, y, r]) => `<circle cx="${x}" cy="${y - 2}" r="${r}" fill="#8E1B24"/>`).join("") : "";
    return `<svg viewBox="0 0 60 78" class="pocillo"><circle cx="30" cy="30" r="24" fill="${aglutina ? "#F7E3E3" : "#D9686E"}" stroke="#555" stroke-width="2"/>${dentro}
      <text x="30" y="72" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${etiqueta}</text></svg>`;
  }
  function gel(carriles, nombres) {
    // carriles: listas de posiciones (0 = arriba, 1 = abajo). Arriba el cátodo (−): el ADN, negativo, baja hacia el ánodo (+).
    const W = 70 * carriles.length + 90, H = 300, y0 = 44, alto = 220;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="gel"><rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#141C2B"/>
      <text x="8" y="${y0 - 4}" font-size="12" fill="#9FB4D9" font-weight="700">− cátodo</text><text x="10" y="${H - 8}" font-size="13" fill="#FFB0B0" font-weight="700">+ ánodo</text>`;
    carriles.forEach((bandas, i) => {
      const x = 80 + i * 70;
      s += `<rect x="${x}" y="${y0 - 10}" width="46" height="8" fill="#0A0F18" stroke="#3A4A66"/>`;
      s += `<text x="${x + 23}" y="${y0 - 16}" text-anchor="middle" font-size="12" fill="#DDE6F5" font-weight="700">${nombres[i]}</text>`;
      for (const p of bandas) s += `<rect x="${x + 3}" y="${(y0 + p * alto).toFixed(1)}" width="40" height="5" rx="2" fill="${i === 0 ? "#8FD3FF" : "#FF9DF0"}" opacity=".95"/>`;
    });
    return s + "</svg>";
  }

  async function laboratorio(k) {
    callar();
    const s = SEDES[k];
    const tipo = elegirPeso(LAB_TIPOS[k]);
    const caso = numeroCaso();
    let puntos = 0, aciertosCaso = 0;
    main.replaceChildren();
    const esc = escena(ESCENAS.laboratorio(s.tinte), [["iker", "neutro"], ["anna", "neutro"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    const lbl = el("span.suave.peq");
    main.append(el("div.fila.entre", el("div.fila", boton("← Sede", () => sede(k), "fantasma"), el("h2", `🧪 Caso #${caso}`)), lbl), esc, dlg, zona);
    teclasDialogo(dlg);
    await decirGuion(dlg, "lab_intro_" + tipo, esc);
    if (!vivo) return;
    esc.classList.add("compacta");
    const sos = sospechososUnicos(4);
    const culpable = Math.floor(azar() * 4);
    const analisis = { abo: analisisABO, adn: analisisADN, micro: analisisMicro }[tipo];
    lbl.textContent = "1 · Análisis";
    const r = await analisis(sos, culpable, dlg, zona);
    if (!vivo) return;
    if (r.interpretacion) { puntos += 10; aciertosCaso++; }
    if (r.acusacion) { puntos += 20; aciertosCaso++; }
    // el tribunal: dos preguntas del banco de las unidades del análisis
    lbl.textContent = "2 · El tribunal";
    zona.replaceChildren();
    await decirGuion(dlg, "lab_tribunal", esc);
    for (const qid of preguntasDe(LAB_UNIDADES[tipo], 2)) {
      if (!vivo) return;
      const ok = await new Promise((res) => {
        zona.replaceChildren();
        const b = bloquePregunta(qid, { contexto: "unidad", onFin: (bien) => res(bien) });
        ctl.teclas = (e) => teclasPregunta(b, e);
        zona.append(el("div.u-expediente.tira", el("div.u-exp-cab", "PREGUNTA DEL TRIBUNAL")), tarjeta("u-exp-cuerpo", b));
        b.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      if (ok) { puntos += PUNTOS.acierto; aciertosCaso++; }
    }
    if (!vivo) return;
    teclasDialogo(dlg);
    zona.replaceChildren();
    esc.classList.remove("compacta");
    U = estado(); U.casos += 1; if (r.acusacion) U.resueltas += 1; guardar(U);
    esc.ponerActores([["duarte", "serio"], ["anna", r.acusacion ? "sonrie" : "duda"]]);
    await decirGuion(dlg, r.acusacion ? "cierre" : "cierre_flojo", esc);
    await sumar(puntos, dlg);
    lbl.textContent = "Caso terminado";
    zona.append(tarjeta(r.acusacion ? "bg-ok_bg" : "",
      el("h2", r.acusacion ? "📁 Caso cerrado" : "📂 El culpable sigue suelto"),
      el("p", `${aciertosCaso} de 4 aciertos · +${puntos} puntos · rango: ${rango(estado().puntos).nombre}`),
      el("div.fila.envuelve", boton("Otro caso", () => laboratorio(k), "primario"), boton("Volver a la sede", () => sede(k), "secundario"))));
  }

  /** Fase de interpretación con botones; devuelve true si acierta. */
  function interpretar(zona, dlg, titulo, opciones, correcta, explicacion) {
    return new Promise(async (res) => {
      const caja = el("div.u-lab-pregunta", el("b", titulo));
      const fila = el("div.u-lab-opciones");
      let hecho = false;
      opciones.forEach((o, i) => {
        const b = el("button.opcion", { type: "button" }, o);
        b.onclick = async () => {
          if (hecho) return; hecho = true;
          const ok = o === correcta;
          [...fila.children].forEach((x) => { x.disabled = true; if (x.textContent === correcta) x.classList.add("bien"); else if (x === b) x.classList.add("mal"); });
          await decirGuion(dlg, ok ? "lab_bien" : "lab_mal");
          caja.append(rico((ok ? "✔ " : "✘ ") + explicacion, "peq u-lab-expl"));
          res(ok);
        };
        fila.append(b);
      });
      caja.append(fila);
      zona.append(caja);
      ctl.teclas = (e) => {
        if (/^[1-9]$/.test(e.key) && fila.children[Number(e.key) - 1]) { fila.children[Number(e.key) - 1].click(); return true; }
        if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
        return false;
      };
      await decirGuion(dlg, "lab_analiza");
    });
  }
  /** Fase de acusación: tarjetas de sospechosos con su dato; devuelve true si acierta. */
  function acusar(zona, dlg, sos, datos, culpable) {
    return new Promise(async (res) => {
      const rej = el("div.u-sospechosos");
      let hecho = false;
      sos.forEach((s, i) => {
        const t = el("button.u-sospechoso", { type: "button" },
          el("div.u-sos-foto", { html: busto(s, "neutro") }),
          el("div.u-sos-nombre", el("b", `${i + 1}. ${s.nombre}`), el("span.peq.suave", s.oficio)),
          el("div.u-sos-dice", datos[i]));
        t.onclick = async () => {
          if (hecho) return; hecho = true;
          const ok = i === culpable;
          [...rej.children].forEach((x, j) => { x.disabled = true; if (j === culpable) x.classList.add("miente"); else if (j === i) x.classList.add("error"); else x.classList.add("apagado"); });
          t.querySelector(".u-sos-foto").innerHTML = busto(s, ok ? "serio" : "sorpresa");
          await decirGuion(dlg, ok ? "acusado_culpable" : "acusado_inocente", null, s);
          if (vivo) await decirGuion(dlg, ok ? "acierto" : "fallo");
          res(ok);
        };
        rej.append(t);
      });
      zona.append(el("div.u-lab-pregunta", el("b", "¿Con quién coincide?")), rej);
      ctl.teclas = (e) => {
        if (/^[1-4]$/.test(e.key)) { rej.children[Number(e.key) - 1].click(); return true; }
        if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
        return false;
      };
      rej.scrollIntoView({ behavior: "smooth", block: "nearest" });
      await decirGuion(dlg, "lab_acusa");
    });
  }

  // ---------------------------------------------------------------- 1. grupo ABO y Rh
  async function analisisABO(sos, culpable, dlg, zona) {
    // grupos distintos para que solo uno coincida
    const todos = azar.shuffle(GRUPOS.flatMap((g) => [[g, true], [g, false]])).slice(0, 4);
    const [g, rh] = todos[culpable];
    const tieneA = g === "A" || g === "AB", tieneB = g === "B" || g === "AB";
    zona.replaceChildren(el("div.u-expediente",
      el("div.u-exp-cab", "INFORME DEL LABORATORIO · MANCHA DE SANGRE DE LA ESCENA"),
      el("div.u-lab-bloque", el("b.peq", "Prueba directa o celular (hematíes de la muestra + antisueros)"),
        el("div.u-pocillos", { html: pocillo(tieneA, "anti-A") + pocillo(tieneB, "anti-B") + pocillo(tieneA || tieneB, "anti-AB") + pocillo(rh, "anti-D") + pocillo(false, "control") })),
      el("div.u-lab-bloque", el("b.peq", "Prueba inversa o sérica (suero de la muestra + hematíes conocidos)"),
        el("div.u-pocillos", { html: pocillo(!tieneA, "hem. A1") + pocillo(!tieneB, "hem. B") })),
      el("p.peq", "Grumos rojos = aglutina (positivo). Rosa homogéneo = no aglutina (negativo).")));
    const correcta = nombreGrupo(g, rh);
    const opciones = GRUPOS.flatMap((x) => [nombreGrupo(x, true), nombreGrupo(x, false)]);
    const anti = [tieneA ? "" : "anti-A", tieneB ? "" : "anti-B"].filter(Boolean);
    const expl = `Aglutina con ${[tieneA && "anti-A", tieneB && "anti-B"].filter(Boolean).join(" y ") || "ningún antisuero ABO"} → ${g === "O" ? "sin antígenos A ni B (grupo O)" : "antígeno " + (g === "AB" ? "A y B (grupo AB)" : g + " (grupo " + g + ")")}. ` +
      `La inversa lo confirma: el suero tiene ${anti.length ? anti.join(" y ") : "ningún anticuerpo ABO (grupo AB)"} y por eso aglutina ${anti.length ? anti.map((a) => "hematíes " + (a === "anti-A" ? "A1" : "B")).join(" y ") : "nada"}. ` +
      `Directa e inversa deben cuadrar: son su propio control. Anti-D ${rh ? "positivo → Rh+" : "negativo → Rh−"}, con el control negativo.`;
    const interpretacion = await interpretar(zona, dlg, "¿De qué grupo es la sangre de la escena?", opciones, correcta, expl);
    if (!vivo) return {};
    const acusacion = await acusar(zona, dlg, sos, todos.map(([gg, rr]) => `Grupo ${nombreGrupo(gg, rr)}`), culpable);
    return { interpretacion, acusacion };
  }

  // ---------------------------------------------------------------- 2. huella genética (STR)
  const DATOS_GEL = [
    ["¿Hacia qué polo migra el ADN en la electroforesis?", ["Hacia el ánodo (+)", "Hacia el cátodo (−)", "No migra: está en su punto isoeléctrico", "Depende del colorante"], "Hacia el ánodo (+)",
      "El ADN tiene **carga negativa** (los fosfatos), así que se aplica cerca del **cátodo** y migra hacia el **ánodo (+)**."],
    ["En el gel, ¿qué fragmentos llegan más lejos del pocillo?", ["Los más pequeños", "Los más grandes", "Todos llegan igual", "Los que tienen más guanina"], "Los más pequeños",
      "En un soporte **restrictivo** (agarosa, poliacrilamida) se separan por **carga y tamaño**: los **pequeños** avanzan más; los grandes van más lentos."],
    ["En una huella genética por STR, ¿qué es un alelo?", ["El número de repeticiones del microsatélite", "Una mutación puntual (SNP)", "Una secuencia Alu", "Un gen del grupo sanguíneo"], "El número de repeticiones del microsatélite",
      "Los **STR** (microsatélites) son polimorfismos de **longitud**: el alelo se nombra por el **número de repeticiones** (p. ej. TH01-7). Se estudian **por PCR**."],
    ["¿Para qué sirve el primer carril, el marcador?", ["Para conocer el tamaño de las bandas", "Para teñir el gel", "Es el control negativo", "Para medir la concentración de sal"], "Para conocer el tamaño de las bandas",
      "El **marcador de peso molecular** lleva fragmentos de tamaño conocido: comparando con él se estima el tamaño de cada banda."],
  ];
  async function analisisADN(sos, culpable, dlg, zona) {
    const perfil = () => [0, 1, 2].flatMap((locus) => {
      const base = 0.1 + locus * 0.3;
      const a = Math.floor(azar() * 6), b = Math.floor(azar() * 6);
      return [...new Set([a, b])].map((x) => base + x * 0.04);
    });
    const perfiles = [];
    while (perfiles.length < 4) {
      const p = perfil(), firma = p.map((x) => x.toFixed(2)).sort().join();
      if (!perfiles.some((q) => q.firma === firma)) perfiles.push(Object.assign(p, { firma }));
    }
    const marcador = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
    const carriles = [marcador, perfiles[culpable], ...perfiles];
    const nombres = ["M", "Escena", "S1", "S2", "S3", "S4"];
    zona.replaceChildren(el("div.u-expediente",
      el("div.u-exp-cab", "INFORME DEL LABORATORIO · HUELLA GENÉTICA (3 STR, PCR + ELECTROFORESIS)"),
      el("div.u-gel", { html: gel(carriles, nombres) }),
      el("p.peq", "M = marcador de tamaño. Escena = sangre del arma. S1-S4 = sospechosos, en el orden de abajo.")));
    const [tit, ops, ok, expl] = elegirUna(DATOS_GEL);
    const interpretacion = await interpretar(zona, dlg, tit, azar.shuffle([...ops]), ok, expl);
    if (!vivo) return {};
    const acusacion = await acusar(zona, dlg, sos, sos.map((_, i) => `Carril S${i + 1}`), culpable);
    return { interpretacion, acusacion };
  }

  // ---------------------------------------------------------------- 3. microscopía (Gram)
  async function analisisMicro(sos, culpable, dlg, zona) {
    const { MAZOS } = await import("./imagenes.js");
    const mazo = MAZOS.find((m) => m.id === "gram");
    const cartas = azar.shuffle([...mazo.tarjetas]).slice(0, 4);
    const buena = cartas[culpable];
    zona.replaceChildren(el("div.u-expediente",
      el("div.u-exp-cab", "INFORME DEL LABORATORIO · TINCIÓN DE GRAM DE LA MUESTRA DEL ARMA"),
      el("div.img-grande", { html: buena.img() }),
      el("p.peq", "Violeta = grampositivo (retiene el cristal violeta). Rojo = gramnegativo (se decolora y toma la safranina).")));
    const interpretacion = await interpretar(zona, dlg, "¿Qué se ve al microscopio?", cartas.map((c) => c.n), buena.n, buena.d);
    if (!vivo) return {};
    const acusacion = await acusar(zona, dlg, sos, cartas.map((c) => `Su laboratorio cultiva: ${c.n.split(" · ")[1] || c.n}`), culpable);
    return { interpretacion, acusacion };
  }

  // ---------------------------------------------------------------- arranque
  if (args.sede && SEDES[args.sede]) sede(args.sede);
  else portada();
  return ctl;
}

