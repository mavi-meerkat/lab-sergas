// Unidad de Análisis — aventura gráfica de estudio (se carga solo al entrar).
// Primera entrega: sede central con rangos, El interrogatorio y Casos sin resolver.
import { panelVelocidades } from "./velocidades.js";
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
      el("div.fila.envuelve",
        boton("⏩ Velocidades", () => { velPanel.hidden = !velPanel.hidden; }, "fantasma"),
        boton(A.p.get("unidad_voz", true) !== false ? "🔊 Voces" : "🔇 Voces", (e) => {
        const on = A.p.get("unidad_voz", true) === false;
        A.p.set("unidad_voz", on); e.target.textContent = on ? "🔊 Voces" : "🔇 Voces"; if (!on) callar();
      }, "fantasma"))));
    const velPanel = tarjeta("", el("h3", "Velocidad de cada personaje"), el("p.suave.peq", "Se aplica a sus voces en el juego. También puedes cambiarlo en Ajustes."), panelVelocidades());
    velPanel.hidden = true;
    main.append(velPanel);
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
      juegoBtn("📌", "El tablero de pruebas", "Une cada prueba con su significado.", () => tablero(k)),
      juegoBtn("🩻", "La mesa de autopsias", "Protocolo, gasometría, bilirrubina y electrolitos.", () => mesa(k)),
      juegoBtn("🧫", "El caso de la muestra", "¿Dónde falló la preanalítica? Tubos, tiempos y temperaturas.", () => muestra(k)),
      juegoBtn("🔗", "Cadena de custodia", "Encuentra el eslabón roto. Firmas, precintos y triple embalaje.", () => custodia(k)));
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

  // ================================================================ EL TABLERO DE PRUEBAS
  // Sale de las tablas de las lecciones: cada fila es una prueba (primera columna) y su significado (otra columna).
  const limpiaMd = (x) => String(x ?? "").replace(/\*\*/g, "").replace(/(^|\s)_([^_]+)_/g, "$1$2").trim();
  function tablasSede(k) {
    const s = SEDES[k], hechas = A.p.leccionesCompletadas();
    const out = [];
    for (const [lid, l] of Object.entries(A.c.lecciones)) {
      const u = A.c.unidades[lid];
      if (!u || !s.modulos.includes(u.modulo)) continue;
      l.tarjetas.forEach((t) => {
        const tb = t.tipo === "tabla" ? t : t.tabla;
        if (!tb || !Array.isArray(tb.filas) || tb.filas.length < 4 || (tb.columnas || []).length < 2) return;
        out.push({ lid, titulo: limpiaMd(t.titulo || ""), cols: tb.columnas.map(limpiaMd), filas: tb.filas.map((f) => f.map(limpiaMd)), hecha: hechas.has(lid) });
      });
    }
    const est = out.filter((x) => x.hecha);
    return est.length >= 3 ? est : out;
  }
  function montarTablero(tb) {
    // columna de significados: la que tenga valores distintos y no demasiado largos
    const cand = [];
    for (let j = 1; j < tb.cols.length; j++) {
      const filas = tb.filas.filter((f) => f[0] && f[j] && f[j].length <= 120 && f[0].length <= 70);
      const unicos = (i) => new Set(filas.map((f) => f[i].toLowerCase())).size === filas.length;
      if (filas.length >= 4 && unicos(0) && unicos(j)) cand.push([j, filas]);
    }
    if (!cand.length) return null;
    const [j, filas] = elegirUna(cand);
    const pares = azar.shuffle([...filas]).slice(0, 5).map((f) => [f[0], f[j]]);
    const sub = tb.cols[0] === "" || tb.cols.length > 2 ? tb.cols[j] : "";
    return { titulo: tb.titulo, sub, colA: tb.cols[0] || "Prueba", colB: tb.cols[j], pares, lid: tb.lid };
  }

  async function tablero(k) {
    callar();
    const s = SEDES[k];
    let datos = null;
    for (const tb of azar.shuffle(tablasSede(k))) { datos = montarTablero(tb); if (datos) break; }
    if (!datos) { toast("No hay tablas disponibles en esta sede."); return; }
    main.replaceChildren();
    const esc = escena(ESCENAS.laboratorio(s.tinte), [["marco", "neutro"], ["anna", "neutro"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    const lbl = el("span.suave.peq");
    main.append(el("div.fila.entre", el("div.fila", boton("← Sede", () => sede(k), "fantasma"), el("h2", "📌 El tablero de pruebas")), lbl), esc, dlg, zona);
    teclasDialogo(dlg);
    await decirGuion(dlg, "tablero_intro", esc);
    if (!vivo) return;
    esc.classList.add("compacta");
    const u = A.c.unidades[datos.lid];
    const n = datos.pares.length;
    let unidos = 0, errores = 0, sel = null;
    const marcar = () => (lbl.textContent = `${unidos} de ${n} conectadas · ${errores} hilos mal puestos`);
    marcar();
    const izq = el("div.u-tab-col"), der = el("div.u-tab-col");
    const hilos = el("div.u-hilos");
    const corcho = el("div.u-corcho", hilos, el("div.u-tab-cols", izq, der));
    zona.append(el("div.u-tab-cab", el("b", `📌 ${datos.titulo}${datos.sub ? " · " + datos.sub : ""}`),
      el("span.suave.peq", `M${u.modulo}·U${u.numero} · Toca una prueba y luego su significado.`)), corcho);
    const conexiones = [];
    function dibujarHilos() {
      const r0 = corcho.getBoundingClientRect();
      const lineas = conexiones.map(([a, b, cls]) => {
        const ra = a.querySelector(".u-chincheta").getBoundingClientRect(), rb = b.querySelector(".u-chincheta").getBoundingClientRect();
        const x1 = ra.left + ra.width / 2 - r0.left, y1 = ra.top + ra.height / 2 - r0.top, x2 = rb.left + rb.width / 2 - r0.left, y2 = rb.top + rb.height / 2 - r0.top;
        const cx = (x1 + x2) / 2, cy = Math.max(y1, y2) + 24;
        return `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" class="${cls}"/>`;
      }).join("");
      hilos.innerHTML = `<svg width="${r0.width}" height="${r0.height}">${lineas}</svg>`;
    }
    const alRedimensionar = () => dibujarHilos();
    window.addEventListener("resize", alRedimensionar);
    const quitar = () => window.removeEventListener("resize", alRedimensionar);
    const pruebas = datos.pares.map(([a], i) => {
      const n1 = el("button.u-nota", { type: "button" }, el("span.u-chincheta"), el("span", a));
      n1.dataset.i = i;
      n1.onclick = () => {
        if (n1.classList.contains("unida")) return;
        pruebas.forEach((x) => x.classList.remove("sel"));
        sel = n1; n1.classList.add("sel");
      };
      return n1;
    });
    const orden = azar.shuffle(datos.pares.map((_, i) => i));
    const signif = orden.map((i) => {
      const n2 = el("button.u-ficha-sig", { type: "button" }, el("span.u-chincheta"), el("span", datos.pares[i][1]));
      n2.dataset.i = i;
      n2.onclick = async () => {
        if (!sel || n2.classList.contains("unida")) return;
        const a = sel; sel = null; a.classList.remove("sel");
        if (a.dataset.i === n2.dataset.i) {
          a.classList.add("unida"); n2.classList.add("unida");
          conexiones.push([a, n2, "bien"]); unidos++; marcar(); dibujarHilos();
          if (unidos === n) terminar();
          else decirGuion(dlg, "tablero_bien");
        } else {
          errores++; marcar();
          const tmp = [a, n2, "mal"]; conexiones.push(tmp); dibujarHilos();
          n2.classList.add("temblar"); a.classList.add("temblar");
          setTimeout(() => { conexiones.splice(conexiones.indexOf(tmp), 1); dibujarHilos(); n2.classList.remove("temblar"); a.classList.remove("temblar"); }, 700);
          decirGuion(dlg, "tablero_mal");
        }
      };
      return n2;
    });
    izq.append(el("div.u-tab-tit", datos.colA || "Prueba"), ...pruebas);
    der.append(el("div.u-tab-tit", datos.colB || "Significado"), ...signif);
    requestAnimationFrame(dibujarHilos);
    ctl.teclas = (e) => { if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; } return false; };
    const finAnterior = ctl.destruir;
    ctl.destruir = () => { quitar(); finAnterior(); };

    async function terminar() {
      await decirGuion(dlg, "tablero_fin");
      if (!vivo) return;
      let puntos = Math.max(5, n * 6 - errores * 3);
      // el tribunal: una pregunta de la misma unidad
      const qs = preguntasDe([datos.lid], 1);
      if (qs.length) {
        await decirGuion(dlg, "lab_tribunal");
        const ok = await new Promise((res) => {
          const b = bloquePregunta(qs[0], { contexto: "unidad", onFin: (bien) => res(bien) });
          ctl.teclas = (e) => teclasPregunta(b, e);
          zona.append(el("div.u-expediente.tira", el("div.u-exp-cab", "PREGUNTA DEL TRIBUNAL")), tarjeta("u-exp-cuerpo", b));
          b.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        if (ok) puntos += PUNTOS.acierto;
      }
      if (!vivo) return;
      teclasDialogo(dlg);
      U = estado(); U.casos += 1; guardar(U);
      await sumar(puntos, dlg);
      zona.append(tarjeta(errores <= 1 ? "bg-ok_bg" : "",
        el("h2", errores === 0 ? "📌 Tablero perfecto" : "📌 Tablero completado"),
        el("p", `${n} pruebas conectadas con ${errores} error(es) · +${puntos} puntos`),
        el("div.fila.envuelve", boton("Otro tablero", () => { quitar(); tablero(k); }, "primario"),
          boton("Ver la lección", () => { quitar(); A.abrirLeccion(datos.lid, 0); }, "secundario"),
          boton("Volver a la sede", () => { quitar(); sede(k); }, "fantasma"))));
    }
  }

  // ================================================================ LA MESA DE AUTOPSIAS
  // Protocolo de autopsia (M1·U5) + interpretación de la analítica previa a la muerte (M5·U7 gasometría y
  // electrolitos, M5·U3 bilirrubina). Valores generados con las reglas y rangos de las lecciones.
  const coma = (x, d = 1) => x.toFixed(d).replace(".", ",");
  const entre = (a, b) => a + azar() * (b - a);
  const PROTOCOLO = [
    ["¿Qué ley regula las autopsias clínicas?", ["Ley 29/1980", "Ley 41/2002", "Ley 14/1986", "Real Decreto 664/1997"], "Ley 29/1980",
      "La **Ley 29/1980** regula la autopsia clínica: cuando el estudio clínico no basta, hay interés científico o se sospechan lesiones de interés social, familiar o científico."],
    ["En plena autopsia clínica sospechas que la muerte no fue natural. ¿Qué haces?", ["Suspenderla y avisar al juzgado de guardia", "Terminarla y avisar a la familia", "Seguir y anotarlo en el informe", "Pedir una ecopsia"], "Suspenderla y avisar al juzgado de guardia",
      "Si se sospecha muerte **no natural**, la autopsia clínica se **suspende** y se avisa al **juzgado de guardia**."],
    ["¿En qué orden se abre en la autopsia?", ["Cráneo → tórax → abdomen", "Abdomen → tórax → cráneo", "Tórax → abdomen → cráneo", "Da igual el orden"], "Cráneo → tórax → abdomen",
      "El orden es **cráneo → tórax → abdomen**, con **al menos dos muestras** de cada órgano."],
    ["¿Qué necesita una autopsia clínica antes de empezar?", ["La autorización de la familia", "Una orden judicial", "El permiso del director del hospital", "Nada, es automática"], "La autorización de la familia",
      "La autopsia **clínica** necesita la **autorización de la familia** (la judicial es otra cosa)."],
    ["¿Qué es una ecopsia?", ["Tomar muestras por punción guiada por ecografía sin abrir el cadáver", "Una autopsia completa grabada en vídeo", "Un estudio de ADN del cadáver", "Una autopsia solo del cráneo"], "Tomar muestras por punción guiada por ecografía sin abrir el cadáver",
      "La **ecopsia** toma muestras con **punciones guiadas por ecografía** sin abrir el cadáver (hepatitis C, sida, priones): 5 punciones por órgano sano, 7 o más si hay lesión."],
    ["¿Cómo se fija una biopsia pequeña?", ["En formol al 10 %, con al menos 20 veces más formol que tejido", "En suero fisiológico a 4 °C", "En alcohol al 96 % con la tapa llena de tejido", "En seco, para no diluirla"], "En formol al 10 %, con al menos 20 veces más formol que tejido",
      "Fijación inmediata en **formol al 10 %**, proporción tejido/formol **al menos 1/20**. Las muestras **no deben secarse**."],
    ["¿Cuántas muestras se toman como mínimo de cada órgano en la autopsia?", ["Dos", "Una", "Cinco", "Ninguna si el órgano parece sano"], "Dos",
      "Se toman **al menos dos muestras de cada órgano**."],
  ];
  const GASO = {
    "Acidosis metabólica": { ph: [7.18, 7.30], pco2: [26, 33], hco3: [11, 17], comp: "Pulmón: hiperventila → ↓ pCO₂", causas: ["Insuficiencia renal", "Cetoacidosis", "Acidosis láctica", "Diarrea"] },
    "Alcalosis metabólica": { ph: [7.48, 7.56], pco2: [46, 53], hco3: [31, 38], comp: "Pulmón: hipoventila → ↑ pCO₂", causas: ["Vómitos", "Diuréticos", "Hiperaldosteronismo"] },
    "Acidosis respiratoria": { ph: [7.20, 7.31], pco2: [56, 72], hco3: [26, 29], comp: "Riñón: retiene HCO₃⁻", causas: ["Sobredosis de opiáceos", "EPOC", "Neumonía", "Guillain-Barré"] },
    "Alcalosis respiratoria": { ph: [7.48, 7.57], pco2: [24, 31], hco3: [19, 22], comp: "Riñón: elimina HCO₃⁻", causas: ["Hiperventilación por ansiedad", "Grandes alturas", "Embarazo", "Dolor"] },
  };
  function informe(titulo, filas, notas = []) {
    return el("div.u-expediente",
      el("div.u-exp-cab", titulo),
      el("table.u-analitica", el("thead", el("tr", el("th", "Prueba"), el("th", "Resultado"), el("th", "Referencia"))),
        el("tbody", filas.map(([p, r, ref, alto]) => el("tr" + (alto ? ".fuera" : ""), el("td", p), el("td", el("b", r)), el("td.suave", ref))))),
      ...notas.map((n) => el("p.peq", n)));
  }

  async function mesa(k) {
    callar();
    const caso = numeroCaso();
    let puntos = 0, aciertosCaso = 0, pasos = 0;
    main.replaceChildren();
    const esc = escena(ESCENAS.morgue(), [["carmen", "neutro"], ["anna", "serio"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    const lbl = el("span.suave.peq");
    main.append(el("div.fila.entre", el("div.fila", boton("← Sede", () => sede(k), "fantasma"), el("h2", `🩻 Caso #${caso}`)), lbl), esc, dlg, zona);
    teclasDialogo(dlg);
    await decirGuion(dlg, "autopsia_intro", esc);
    if (!vivo) return;
    esc.classList.add("compacta");
    const paso = async (titulo, ops, ok, expl, mezclar = true) => {
      pasos++;
      const bien = await interpretar(zona, dlg, titulo, mezclar ? azar.shuffle([...ops]) : ops, ok, expl);
      if (bien) { puntos += 10; aciertosCaso++; }
      return bien;
    };
    // 1. protocolo
    lbl.textContent = "1 · Protocolo";
    const [pt, po, pk, pe] = elegirUna(PROTOCOLO);
    zona.replaceChildren(el("div.u-expediente", el("div.u-exp-cab", `CASO #${caso} · SALA DE AUTOPSIAS`), el("p", "Antes de tocar nada, Carmen quiere comprobar que conoces el protocolo.")));
    await paso(pt, po, pk, pe);
    if (!vivo) return;
    // 2. analítica
    lbl.textContent = "2 · Analítica";
    zona.replaceChildren();
    await decirGuion(dlg, "autopsia_analitica");
    const tipo = elegirPeso([["gaso", 2], ["bili", 1], ["potasio", 1]]);
    let unidades = ["M5_U7"], resumen = "";
    if (tipo === "gaso") {
      const tr = elegirUna(Object.keys(GASO)), d = GASO[tr];
      const ph = entre(...d.ph), pco2 = entre(...d.pco2), hco3 = entre(...d.hco3);
      zona.append(informe("GASOMETRÍA ARTERIAL AL INGRESO", [
        ["pH", coma(ph, 2), "7,35-7,45", ph < 7.35 || ph > 7.45],
        ["pCO₂", coma(pco2, 0) + " mmHg", "35-45 mmHg", pco2 < 35 || pco2 > 45],
        ["HCO₃⁻", coma(hco3, 0) + " mEq/L", "22-26 mEq/L", hco3 < 22 || hco3 > 26],
      ], ["Clasifícala en 3 pasos: mira el pH, busca qué lo explica y comprueba la compensación."]));
      await paso("1) ¿Qué trastorno tiene?", Object.keys(GASO), tr,
        `pH ${coma(ph, 2)} → ${ph < 7.35 ? "acidosis" : "alcalosis"}. Lo explica ${tr.includes("respiratoria") ? `la pCO₂ (${coma(pco2, 0)} mmHg)` : `el HCO₃⁻ (${coma(hco3, 0)} mEq/L)`} → **${tr.toLowerCase()}**.`, false);
      if (!vivo) return;
      await paso("2) ¿Cómo está compensando?", Object.values(GASO).map((x) => x.comp), d.comp,
        `En la ${tr.toLowerCase()} compensa así: **${d.comp}**. ${tr.includes("respiratoria") ? `Por eso el HCO₃⁻ está en ${coma(hco3, 0)}.` : `Por eso la pCO₂ está en ${coma(pco2, 0)}.`}`);
      if (!vivo) return;
      const causa = elegirUna(d.causas);
      const otras = Object.entries(GASO).filter(([t]) => t !== tr).map(([, x]) => elegirUna(x.causas));
      await paso("3) ¿Qué causa encaja con esta gasometría?", [causa, ...otras], causa,
        `Causas de ${tr.toLowerCase()} según el libro: ${d.causas.join(", ").toLowerCase()}.`);
      resumen = `${tr} por ${causa.toLowerCase()}`;
    } else if (tipo === "bili") {
      unidades = ["M5_U3"];
      const pre = azar() < 0.5;
      const r1 = (x) => Math.round(x * 10) / 10;
      const total = r1(pre ? entre(3.5, 9) : entre(4, 12));
      const directa = r1(pre ? entre(0.2, 0.6) : total * entre(0.6, 0.8));
      const indirecta = r1(total - directa);
      zona.append(informe("BIOQUÍMICA · BILIRRUBINA (JENDRASSIK-GROF)", [
        ["Bilirrubina total", coma(total) + " mg/dL", "", true],
        ["Bilirrubina directa", coma(directa) + " mg/dL", "", !pre],
        ["Bilirrubina indirecta", "¿?", "", false],
      ], ["La directa reacciona sola con el ácido sulfanílico diazotado; la total, con cafeína. Escleróticas amarillas a la inspección."]));
      const opsI = [coma(indirecta), coma(total + directa), coma(directa), coma(Math.abs(total - 2 * directa))];
      await paso("1) ¿Cuánto vale la bilirrubina indirecta (mg/dL)?", [...new Set(opsI)], coma(indirecta),
        `**Indirecta = total − directa** = ${coma(total)} − ${coma(directa)} = **${coma(indirecta)} mg/dL**.`);
      if (!vivo) return;
      const tipos = ["No conjugada (indirecta, prehepática)", "Conjugada (directa)"];
      await paso("2) ¿Qué hiperbilirrubinemia predomina?", tipos, tipos[pre ? 0 : 1],
        pre ? "Casi toda es **indirecta** (no conjugada): el problema está antes de la conjugación hepática." : "Predomina la **directa** (conjugada): ya se conjugó en el hígado, pero no sale bien por la bilis.", false);
      if (!vivo) return;
      const causasPre = ["Hemólisis", "Síndrome de Gilbert", "Crigler-Najjar"], causasCon = ["Dubin-Johnson", "Colestasis extrahepática por litiasis", "Hepatitis (colestasis intrahepática)"];
      const causa = elegirUna(pre ? causasPre : causasCon);
      await paso("3) ¿Qué causa del libro encaja?", [causa, ...azar.shuffle(pre ? causasCon : causasPre).slice(0, 2), "Vómitos"], causa,
        `Causas de la ${pre ? "no conjugada: hemólisis, Gilbert, Crigler-Najjar e ictericia neonatal" : "conjugada: Rotor, Dubin-Johnson y colestasis intra o extrahepática"}. La ictericia se ve a partir de 2-3 mg/dL.`);
      resumen = `ictericia por hiperbilirrubinemia ${pre ? "no conjugada" : "conjugada"} (${causa.toLowerCase()})`;
    } else {
      const kv = entre(6.3, 7.4), artefacto = azar() < 0.5;
      zona.append(informe("BIOQUÍMICA · ELECTROLITOS", [
        ["Sodio", coma(entre(136, 146), 0) + " mEq/L", "135-148 mEq/L", false],
        ["Potasio", coma(kv) + " mEq/L", "3,5-5 mEq/L", true],
        ["Cloro", coma(entre(97, 104), 0) + " mEq/L", "95-105 mEq/L", false],
      ], [artefacto ? "Observaciones del laboratorio: suero de aspecto rojizo (hemolizado). Extracción difícil, torniquete más de 3 minutos."
        : "Observaciones del laboratorio: suero sin hemólisis, tubo correcto, extracción sin incidencias. ECG al ingreso con bradicardia."]));
      await paso("1) ¿Cómo está el potasio?", ["Hiperpotasemia (> 5,5 mEq/L)", "Normal (3,5-5 mEq/L)", "Hipopotasemia (< 3,5 mEq/L)"], "Hiperpotasemia (> 5,5 mEq/L)",
        `Potasio ${coma(kv)} mEq/L: **hiperpotasemia** (normal 3,5-5; hiper por encima de 5,5).`, false);
      if (!vivo) return;
      await paso("2) ¿Es real o un error del laboratorio?", ["Falso aumento (artefacto)", "Hiperpotasemia real"], artefacto ? "Falso aumento (artefacto)" : "Hiperpotasemia real",
        artefacto ? "Suero **hemolizado** y torniquete prolongado: al romperse los hematíes sale potasio. Es un **falso aumento**; hay que repetir la extracción." : "Sin hemólisis ni errores preanalíticos y con bradicardia en el ECG: la hiperpotasemia es **real**.", false);
      if (!vivo) return;
      if (artefacto) await paso("3) ¿Qué otro error de laboratorio fabrica una falsa hiperpotasemia?", ["Recoger la sangre en tubo con EDTA-K", "Etiquetar el tubo antes de la extracción", "Extraer en ayunas", "Dejar secar el alcohol antes de pinchar"], "Recoger la sangre en tubo con EDTA-K",
        "Los errores que la fabrican, según el libro: **torniquete prolongado, hemólisis y tubo con EDTA-K**.");
      else await paso("3) ¿Qué produce una hiperpotasemia grave?", ["Bradicardia, fibrilación y fallo cardiaco", "Tetania", "Edema cerebral", "Alcalosis metabólica"], "Bradicardia, fibrilación y fallo cardiaco",
        "La hiperpotasemia (> 5,5) da **bradicardia, fibrilación y debilidad muscular**; grave, puede matar por **fallo cardiaco**. La tetania es de la hipocalcemia y el edema cerebral, de la hiponatremia grave.");
      resumen = artefacto ? "potasio falsamente elevado por hemólisis: la causa de la muerte hay que buscarla en otra parte" : "hiperpotasemia real con fallo cardiaco";
      unidades = ["M5_U7", "M1_U4"];
    }
    if (!vivo) return;
    await dlg.hablar("carmen", aciertosCaso >= pasos - 1 ? "sonrie" : "neutro", `Conclusión del informe: ${resumen}.`);
    // tribunal
    lbl.textContent = "3 · El tribunal";
    const qs = preguntasDe([...unidades, "M1_U5"], 1);
    if (qs.length && vivo) {
      await decirGuion(dlg, "lab_tribunal");
      const ok = await new Promise((res) => {
        zona.replaceChildren();
        const b = bloquePregunta(qs[0], { contexto: "unidad", onFin: (bien) => res(bien) });
        ctl.teclas = (e) => teclasPregunta(b, e);
        zona.append(el("div.u-expediente.tira", el("div.u-exp-cab", "PREGUNTA DEL TRIBUNAL")), tarjeta("u-exp-cuerpo", b));
        b.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      pasos++;
      if (ok) { puntos += PUNTOS.acierto; aciertosCaso++; }
    }
    if (!vivo) return;
    teclasDialogo(dlg);
    zona.replaceChildren();
    esc.classList.remove("compacta");
    U = estado(); U.casos += 1; guardar(U);
    const bien = aciertosCaso >= pasos - 1;
    esc.ponerActores([["carmen", bien ? "sonrie" : "neutro"], ["anna", bien ? "sonrie" : "duda"]]);
    await decirGuion(dlg, bien ? "autopsia_veredicto" : "cierre_flojo", esc);
    await sumar(puntos, dlg);
    lbl.textContent = "Informe firmado";
    zona.append(tarjeta(bien ? "bg-ok_bg" : "",
      el("h2", bien ? "🩻 Informe firmado" : "🩻 Informe con reparos"),
      el("p", `${aciertosCaso} de ${pasos} aciertos · +${puntos} puntos`),
      el("div.fila.envuelve", boton("Otra autopsia", () => mesa(k), "primario"), boton("Volver a la sede", () => sede(k), "secundario"))));
  }

  // ================================================================ EL CASO DE LA MUESTRA
  // Un resultado «imposible» y la hoja de ruta de la muestra: hay que encontrar el error preanalítico
  // (M1·U3 factores y hemólisis, M1·U4 tubos, extracción y conservación, M1·U6 transporte y recepción).
  // Después, el orden de llenado de los tubos y una pregunta del tribunal.
  const R = (t, mal = false) => [t, mal];
  const MUESTRAS = [
    { tit: "BIOQUÍMICA URGENTE", filas: [["Potasio", "8,9 mEq/L", "3,5-5 mEq/L", true], ["Calcio", "2,1 mg/dL", "8,5-10,5 mg/dL", true], ["Sodio", "141 mEq/L", "135-148 mEq/L", false]],
      nota: "El paciente está consciente, sin síntomas y con un ECG normal.",
      ruta: [R("Bioquímica recogida en el tubo de tapón lila (EDTA-K)", true), R("Extracción a las 8:10; llegada al laboratorio a las 9:00"), R("Alcohol de 70 % dejado secar antes de pinchar"), R("Tubos transportados en vertical, con el tapón arriba")],
      porque: "El tapón **lila lleva EDTA-K**: aporta **potasio** y **fija el calcio**. Por eso sale un potasio altísimo y un calcio bajísimo en un paciente sin síntomas. La bioquímica va en tubo **seco (rojo) o con gel (amarillo)**.",
      q2: ["¿Qué tubo había que usar para esta bioquímica?", ["Tapón rojo o amarillo (suero)", "Tapón lila (EDTA)", "Tapón azul celeste (citrato)", "Tapón negro (VSG)"], "Tapón rojo o amarillo (suero)",
        "El suero se obtiene en tubo **seco (rojo)** o con **gel separador (amarillo)**: bioquímica y serología. El lila es para **hematología**."] },
    { tit: "BIOQUÍMICA", filas: [["Potasio", "6,8 mEq/L", "3,5-5 mEq/L", true], ["LDH", "780 U/L", "< 250 U/L", true], ["Haptoglobina", "Disminuida", "", true]],
      nota: "Observación del laboratorio: suero de color rojizo.",
      ruta: [R("Se pinchó sin dejar secar el alcohol, con aguja muy fina y la sangre entrando a goteo", true), R("Tubo seco que reposó 10 minutos antes de centrifugar"), R("Ayuno de 10 horas comprobado antes de la extracción"), R("Volante y etiqueta con los mismos datos")],
      porque: "Alcohol húmedo, aguja fina y sangre a goteo producen **hemólisis**: al romperse los hematíes salen **potasio** y **LDH**, y la **haptoglobina** se gasta y baja. El suero rojizo lo delata.",
      q2: ["En una muestra hemolizada, ¿qué valor BAJA?", ["Haptoglobina", "Potasio", "LDH", "Fósforo"], "Haptoglobina",
        "Suben los que están **dentro del hematíe** (potasio, LDH, fósforo). **Baja la haptoglobina**, que se consume al capturar la hemoglobina libre."] },
    { tit: "BIOQUÍMICA", filas: [["Potasio", "6,1 mEq/L", "3,5-5 mEq/L", true], ["Proteínas totales", "8,9 g/dL", "6-8 g/dL", true], ["Glucosa", "92 mg/dL", "70-110 mg/dL", false]],
      nota: "La enfermera anota: «venas difíciles, se tardó en encontrarla».",
      ruta: [R("Compresor colocado durante 5 minutos mientras se buscaba la vena", true), R("Compresor a 8 cm por encima del punto de punción"), R("Vena cubital media, bisel hacia arriba"), R("Tubos llenados hasta agotar el vacío")],
      porque: "El compresor debe estar **2 minutos como máximo**. Si se alarga, la sangre se concentra y sale potasio de las células: **falsos aumentos**. Se va a 7,5-10 cm por encima; eso estaba bien.",
      q2: ["¿Qué se hace con esta muestra?", ["Registrar la incidencia y repetir la extracción", "Corregir el potasio con una fórmula", "Darla por buena y avisar al médico", "Congelarla y analizarla mañana"], "Registrar la incidencia y repetir la extracción",
        "Una muestra con un error preanalítico no se «arregla»: **se registra la incidencia** y se **repite la extracción** en condiciones."] },
    { tit: "MICROBIOLOGÍA · HEMOCULTIVOS", filas: [["Frasco aerobio", "Sin crecimiento a los 5 días", "", false], ["Frasco anaerobio", "Sin crecimiento a los 5 días", "", false]],
      nota: "El paciente tenía 39,5 °C y escalofríos en el momento de la extracción.",
      ruta: [R("Frascos guardados en la nevera a 4 °C toda la noche, hasta el envío", true), R("Dos extracciones de venas distintas, separadas más de 1 hora"), R("Tapón de cada frasco desinfectado antes de inocular"), R("Sangre extraída antes de empezar el antibiótico")],
      porque: "Los hemocultivos **NUNCA van a la nevera**: se conservan a **35-37 °C o a temperatura ambiente**. El frío mata a las bacterias delicadas y da un **falso negativo**.",
      q2: ["¿Cómo se conservan los hemocultivos hasta llegar al laboratorio?", ["A 35-37 °C o a temperatura ambiente", "En nevera a 2-8 °C", "Congelados a −20 °C", "En hielo hasta 24 h"], "A 35-37 °C o a temperatura ambiente",
        "**Hemocultivos: 35-37 °C o ambiente, nunca nevera ni congelador.** Si una opción dice refrigerar, es falsa."] },
    { tit: "COAGULACIÓN", filas: [["Tiempo de protrombina", "38 s", "11-14 s", true], ["TTPa", "92 s", "25-35 s", true]],
      nota: "El paciente no toma anticoagulantes y no sangra.",
      ruta: [R("Orden de llenado: lila (EDTA) → azul celeste (citrato) → rojo (seco)", true), R("Tubo de citrato invertido suavemente 3-4 veces"), R("Llegada al laboratorio en menos de 2 horas"), R("Paciente identificado antes de etiquetar los tubos")],
      porque: "El **citrato va antes que los tubos con otros anticoagulantes**: si el EDTA se arrastra al tubo de coagulación, alarga los tiempos sin que el paciente tenga nada. Orden del libro: **hemocultivo → seco → citrato → VSG → EDTA → otros**.",
      q2: ["¿Cuál es el orden de llenado según el libro?", ["Hemocultivo → seco → citrato → EDTA", "EDTA → citrato → seco → hemocultivo", "Seco → EDTA → citrato → hemocultivo", "Citrato → hemocultivo → EDTA → seco"], "Hemocultivo → seco → citrato → EDTA",
        "Siempre se empieza por los **hemocultivos** (para no contaminarlos); después **seco**, **citrato** (coagulación y VSG), **EDTA** y otros aditivos."], mezclar: false },
    { tit: "GASOMETRÍA ARTERIAL", filas: [["pO₂", "148 mmHg", "80-100 mmHg", true], ["pCO₂", "31 mmHg", "35-45 mmHg", true], ["pH", "7,46", "7,35-7,45", true]],
      nota: "El paciente respira aire ambiente y tiene una EPOC grave.",
      ruta: [R("Burbuja de aire en la jeringa; se cerró doblando la aguja", true), R("Heparina sódica como anticoagulante"), R("Test de Allen positivo antes de pinchar la radial"), R("Paciente en reposo 20-30 minutos antes")],
      porque: "Las **burbujas** alteran los gases (el aire sube la pO₂): hay que **expulsarlas antes de 20 segundos** y **cerrar con tapón**. Doblar la aguja **no cierra**.",
      q2: ["¿Qué hay que hacer con las burbujas de una gasometría?", ["Expulsarlas antes de 20 segundos y tapar", "Dejarlas: no alteran nada", "Agitar fuerte para disolverlas", "Doblar la aguja para que no entren más"], "Expulsarlas antes de 20 segundos y tapar",
        "Burbujas fuera **antes de 20 s** y tapón. La muestra, en **agua con hielo** o analizada **antes de 15 minutos**."] },
    { tit: "UROCULTIVO Y SISTEMÁTICO", filas: [["Bacterias", "> 100 000 UFC/ml", "", true], ["pH", "8,5", "4,5-7,5", true], ["Cilindros", "No se observan", "", false]],
      nota: "La paciente no tiene ningún síntoma urinario.",
      ruta: [R("Muestra en la mesa del control 6 horas, a temperatura ambiente", true), R("Micción media, con higiene previa"), R("Frasco estéril bien cerrado y etiquetado"), R("Primera orina de la mañana")],
      porque: "Si la orina no llega **antes de 2 horas**, se **refrigera a 2-8 °C**. A temperatura ambiente las bacterias se multiplican y **alcalinizan**, y los **cilindros se deshacen**.",
      q2: ["Si la orina para urocultivo no puede llegar antes de 2 horas…", ["Se refrigera a 4 °C y es útil hasta 24 h", "Se deja a temperatura ambiente", "Se mete en la estufa a 37 °C", "Se le añade formol"], "Se refrigera a 4 °C y es útil hasta 24 h",
        "Urocultivo: al laboratorio **antes de 2 h**; si no, **a 4 °C**, útil **hasta 24 h**."] },
    { tit: "PARÁSITOS EN HECES", filas: [["Examen directo", "Negativo", "", false], ["Concentración", "Negativo", "", false]],
      nota: "Viajó a la selva hace un mes y tiene diarrea desde entonces.",
      ruta: [R("Las tres muestras se guardaron en la nevera de casa hasta entregarlas", true), R("Tres muestras recogidas en días sucesivos"), R("Heces sin orina ni papel higiénico"), R("Recogidas antes de empezar la medicación")],
      porque: "Las heces para **parásitos** van a **temperatura ambiente o algo frescas; nunca nevera ni estufa**. Si hay retraso: 1 parte de heces + 3 de **formol al 5-10 %**.",
      q2: ["¿Qué muestra SÍ se conserva en nevera?", ["Orina de 24 horas", "Hemocultivo", "Heces para parásitos", "Semen"], "Orina de 24 horas",
        "Regla del profesor: **si buscamos algo vivo y delicado, nada de frío**. Nevera: orina (más de 2 h), orina de 24 h y heces para bioquímica."] },
    { tit: "SEMINOGRAMA", filas: [["Volumen", "1,2 ml", "", false], ["Concentración", "9 millones/ml", "> 15 millones/ml", true]],
      nota: "Estudio de fertilidad. El resultado se usa como prueba en un juicio de paternidad.",
      ruta: [R("Abstinencia sexual de 1 día antes de la recogida", true), R("Recogida por masturbación en frasco estéril"), R("Entregado a los 30 minutos, a temperatura corporal"), R("Toda la eyaculación recogida")],
      porque: "La abstinencia debe ser de **3 a 5 días**; con **menos de 48 horas la muestra no es válida**. El resultado no sirve como prueba.",
      q2: ["¿Cómo se transporta una muestra de semen?", ["Antes de 30 min (máximo 60), a temperatura corporal", "En nevera, hasta 24 h", "Congelada a −20 °C", "En formol al 10 %"], "Antes de 30 min (máximo 60), a temperatura corporal",
        "Semen: **antes de 30 minutos (máximo 60)** y a **temperatura corporal**. Nunca frío."] },
    { tit: "BANCO DE SANGRE", filas: [["Grupo ABO", "A", "", false], ["Rh", "Negativo", "", false], ["Grupo en el historial", "0 Rh+", "", true]],
      nota: "El grupo no coincide con el de su historial de hace un año.",
      ruta: [R("El nombre de la etiqueta del tubo no coincide con el del volante", true), R("Tubo de tapón lila, bien invertido"), R("Muestra entregada en mano en 40 minutos"), R("Extracción sin hemólisis")],
      porque: "Si **etiqueta y volante no coinciden**, la muestra **se rechaza**. El peor error preanalítico: **atribuir el resultado a otra persona**.",
      q2: ["¿Cuál de estos es un criterio de rechazo de una muestra?", ["La etiqueta y el volante no coinciden", "Llegar en 1 hora", "Venir en triple embalaje", "Llevar el conservante anotado en la etiqueta"], "La etiqueta y el volante no coinciden",
        "Se rechaza sin etiqueta o volante, si **no coinciden**, si falta información, si se pasó el **tiempo**, con envase inadecuado, derrames, **hisopos secos** o **cantidad insuficiente**. **Toda incidencia se registra.**"] },
    { tit: "ANATOMÍA PATOLÓGICA", filas: [["Biopsia de colon", "No recibida: contenedor roto", "", true]],
      nota: "El laboratorio de anatomía patológica avisa de un derrame en la estación del tubo neumático.",
      ruta: [R("Biopsia en formol enviada por el tubo neumático", true), R("Formol al 10 %, unas 20 veces el volumen del tejido"), R("Recipiente etiquetado con el riesgo biológico señalado"), R("Fijación inmediata tras la extracción")],
      porque: "El **tubo neumático está prohibido** para muestras en **formol** y de **nivel 4 de seguridad**. Esa biopsia tenía que ir en mano o con embalaje secundario.",
      q2: ["¿Qué muestras NO pueden ir por el tubo neumático?", ["Las que van en formol y las de nivel 4", "Las de orina", "Todos los tubos de sangre", "Las que van refrigeradas"], "Las que van en formol y las de nivel 4",
        "Tubo neumático: contenedores de unos 10 cm a prueba de fugas; **prohibido** con **formol** y **nivel 4**."] },
    { tit: "GLUCOSA", filas: [["Glucosa", "41 mg/dL", "70-110 mg/dL", true]],
      nota: "Paciente no diabético, consciente y sin ningún síntoma de hipoglucemia.",
      ruta: [R("Tubo seco sin centrifugar, 5 horas en la mesa antes de enviarlo", true), R("Ayuno de 8 horas"), R("Paciente identificado y tubos etiquetados antes de pinchar"), R("Venopunción sin incidencias en la cubital media")],
      porque: "La sangre debe llegar en **2 horas como máximo**. Si se va a retrasar, se deja coagular y se **centrifuga**; mientras, las células siguen **consumiendo glucosa**. Para glucosa existe el tubo **gris (fluoruro + oxalato)**.",
      q2: ["¿Qué tubo se usa para la glucosa y el ácido láctico?", ["Gris (fluoruro sódico + oxalato potásico)", "Lila (EDTA)", "Negro (citrato)", "Verde (heparina)"], "Gris (fluoruro sódico + oxalato potásico)",
        "**Gris → Glucosa** (las dos con G): fluoruro sódico y oxalato potásico."] },
  ];
  // lección a la que remite cada caso (por defecto, M1_U4)
  MUESTRAS[1].lid = "M1_U3"; MUESTRAS[9].lid = "M1_U6"; MUESTRAS[10].lid = "M1_U6";

  const TUBOS = [
    { n: 1, nombre: "Hemocultivo", tapon: "#2F6FD0", frasco: true, extra: "frasco" },
    { n: 2, nombre: "Seco", tapon: "#D23A3A", extra: "suero" },
    { n: 3, nombre: "Citrato", tapon: "#8FD3F2", extra: "coagulación" },
    { n: 4, nombre: "VSG", tapon: "#222", extra: "citrato" },
    { n: 5, nombre: "EDTA", tapon: "#9B6BC8", extra: "hemograma" },
    { n: 6, nombre: "Heparina", tapon: "#3E9A5A", extra: "otros" },
    { n: 6, nombre: "Fluoruro", tapon: "#9AA0A6", extra: "glucosa" },
  ];
  function dibujoTubo(t) {
    if (t.frasco) return `<svg viewBox="0 0 50 110" class="u-tubo-svg"><rect x="17" y="4" width="16" height="12" rx="2" fill="${t.tapon}"/>
      <path d="M19 16 h12 v10 q14 6 14 22 v50 q0 8 -8 8 h-24 q-8 0 -8 -8 v-50 q0 -16 14 -22z" fill="#EEF3F8" stroke="#7A8594" stroke-width="2"/>
      <rect x="9" y="62" width="32" height="34" rx="3" fill="#E7C98A" opacity=".8"/></svg>`;
    return `<svg viewBox="0 0 50 110" class="u-tubo-svg"><rect x="13" y="4" width="24" height="16" rx="3" fill="${t.tapon}" stroke="#333" stroke-width="1"/>
      <path d="M15 20 h20 v76 q0 10 -10 10 q-10 0 -10 -10z" fill="#F4F7FA" stroke="#7A8594" stroke-width="2"/>
      <rect x="16" y="44" width="18" height="30" fill="#fff" stroke="#bbb"/><path d="M16 80 h18 v16 q0 8 -9 8 q-9 0 -9 -8z" fill="#9E1B26" opacity=".85"/></svg>`;
  }
  /** Minijuego: tocar los tubos en orden de llenado. Devuelve el número de errores. */
  function ordenTubos(zona, dlg) {
    return new Promise((res) => {
      const otros = elegirUna(TUBOS.filter((t) => t.n === 6));
      let lista = TUBOS.filter((t) => t.n < 6);
      lista = azar.shuffle(lista).slice(0, 4).concat([otros]).sort((a, b) => a.n - b.n);
      const orden = lista.map((t) => t.n);
      let pos = 0, errores = 0;
      const gradilla = el("div.u-gradilla");
      const fila = el("div.u-tubos");
      const pintar = azar.shuffle([...lista]);
      pintar.forEach((t) => {
        const b = el("button.u-tubo", { type: "button", "aria-label": `${t.nombre} (${t.extra})` },
          el("div", { html: dibujoTubo(t) }), el("b.peq", t.nombre), el("span.peq.suave", t.extra));
        b.onclick = () => {
          if (b.disabled) return;
          if (t.n === orden[pos]) {
            b.disabled = true; b.classList.add("bien");
            gradilla.append(el("div.u-hueco", el("span.peq", `${pos + 1}.º`), el("div", { html: dibujoTubo(t) }), el("span.peq", t.nombre)));
            pos++;
            if (pos >= orden.length) { ctl.teclas = (e) => ((e.key === "Enter" || e.key === " ") && (dlg.avanzar(), true)); res(errores); }
          } else {
            errores++; b.classList.add("temblar");
            setTimeout(() => b.classList.remove("temblar"), 600);
            decirGuion(dlg, "muestra_tubo_mal");
          }
        };
        fila.append(b);
      });
      zona.append(el("div.u-lab-pregunta", el("b", "Toca los tubos en el orden de llenado"), el("p.peq.suave", "Como en la venopunción: el primero que llenas, el primero que tocas.")), fila,
        el("div.u-lab-pregunta", el("b.peq", "Gradilla")), gradilla);
      ctl.teclas = (e) => {
        if (/^[1-9]$/.test(e.key) && fila.children[Number(e.key) - 1]) { fila.children[Number(e.key) - 1].click(); return true; }
        if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
        return false;
      };
    });
  }

  async function muestra(k) {
    callar();
    const s = SEDES[k];
    const caso = numeroCaso();
    let puntos = 0, aciertosCaso = 0, pasos = 0;
    main.replaceChildren();
    const esc = escena(ESCENAS.laboratorio(s.tinte), [["marco", "serio"], ["anna", "neutro"], ["valeria", "neutro"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    const lbl = el("span.suave.peq");
    main.append(el("div.fila.entre", el("div.fila", boton("← Sede", () => sede(k), "fantasma"), el("h2", `🧫 Caso #${caso}`)), lbl), esc, dlg, zona);
    teclasDialogo(dlg);
    await decirGuion(dlg, "muestra_intro", esc);
    if (!vivo) return;
    esc.classList.add("compacta");
    const m = elegirUna(MUESTRAS);
    // 1. el resultado imposible y la hoja de ruta
    lbl.textContent = "1 · La hoja de ruta";
    zona.replaceChildren(informe(`CASO #${caso} · ${m.tit}`, m.filas, [m.nota]));
    await decirGuion(dlg, "muestra_ruta");
    if (!vivo) return;
    const ruta = m.ruta.map(([t]) => t);
    const fallo = m.ruta.find(([, mal]) => mal)[0];
    pasos++;
    if (await interpretar(zona, dlg, "¿Qué paso de la hoja de ruta explica el resultado?", azar.shuffle(ruta), fallo, m.porque)) { puntos += 15; aciertosCaso++; }
    if (!vivo) return;
    // 2. la consecuencia
    lbl.textContent = "2 · La consecuencia";
    const [t2, o2, k2, e2] = m.q2;
    pasos++;
    if (await interpretar(zona, dlg, t2, m.mezclar === false ? o2 : azar.shuffle([...o2]), k2, e2)) { puntos += 10; aciertosCaso++; }
    if (!vivo) return;
    // 3. orden de llenado
    lbl.textContent = "3 · Los tubos";
    zona.replaceChildren();
    await decirGuion(dlg, "muestra_tubos");
    if (!vivo) return;
    const err = await ordenTubos(zona, dlg);
    if (!vivo) return;
    pasos++;
    if (err === 0) { puntos += 10; aciertosCaso++; } else puntos += Math.max(0, 10 - err * 3);
    zona.append(rico(err === 0 ? "✔ Orden perfecto: **hemocultivo → seco → citrato → VSG → EDTA → otros aditivos**." :
      `✘ ${err} error(es). El orden del libro: **hemocultivo → seco → citrato (coagulación) → VSG → EDTA → otros (heparina, fluoruro)**. El citrato va antes que los demás anticoagulantes.`, "peq u-lab-expl"));
    await decirGuion(dlg, err === 0 ? "lab_bien" : "lab_mal");
    if (!vivo) return;
    // 4. el tribunal
    lbl.textContent = "4 · El tribunal";
    const qs = preguntasDe(["M1_U3", "M1_U4", "M1_U6"], 1);
    if (qs.length) {
      await decirGuion(dlg, "lab_tribunal");
      const ok = await new Promise((res) => {
        zona.replaceChildren();
        const b = bloquePregunta(qs[0], { contexto: "unidad", onFin: (bien) => res(bien) });
        ctl.teclas = (e) => teclasPregunta(b, e);
        zona.append(el("div.u-expediente.tira", el("div.u-exp-cab", "PREGUNTA DEL TRIBUNAL")), tarjeta("u-exp-cuerpo", b));
        b.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      pasos++;
      if (ok) { puntos += PUNTOS.acierto; aciertosCaso++; }
    }
    if (!vivo) return;
    teclasDialogo(dlg);
    zona.replaceChildren();
    esc.classList.remove("compacta");
    const bien = aciertosCaso >= pasos - 1;
    U = estado(); U.casos += 1; if (bien) U.resueltas += 1; guardar(U);
    esc.ponerActores([["duarte", bien ? "sorpresa" : "serio"], ["anna", bien ? "sonrie" : "duda"], ["marco", bien ? "sonrie" : "neutro"]]);
    await decirGuion(dlg, bien ? "muestra_fin" : "cierre_flojo", esc);
    await sumar(puntos, dlg);
    lbl.textContent = "Caso terminado";
    zona.append(tarjeta(bien ? "bg-ok_bg" : "",
      el("h2", bien ? "🧫 Resultado anulado" : "🧫 La defensa se sale con la suya"),
      el("p", `${aciertosCaso} de ${pasos} aciertos · +${puntos} puntos`),
      el("p.peq", `El fallo: ${fallo}.`),
      el("div.fila.envuelve", boton("Otra muestra", () => muestra(k), "primario"),
        boton("Ver la lección", () => A.abrirLeccion(m.lid || "M1_U4", 0), "secundario"),
        boton("Volver a la sede", () => sede(k), "fantasma"))));
  }

  // ================================================================ CADENA DE CUSTODIA
  // La muestra forense viaja por 7 eslabones (M1·U3 cadena de custodia, M1·U6 triple embalaje, transporte y
  // recepción, M5·U8 cribado y confirmación de drogas). Uno está roto. Después, preparar un envío con triple
  // embalaje y su clasificación ONU, y la pregunta del tribunal.
  const NOMBRES_CUST = ["L. Pereira", "M. Castro", "J. Otero", "R. Varela", "S. Lago", "C. Rial", "P. Seoane", "A. Novo", "D. Iglesias"];
  const MUESTRAS_CUST = [
    { que: "Orina · drogas de abuso", motivo: "conductor implicado en un accidente con heridos", envase: "Frasco estéril de orina" },
    { que: "Sangre · drogas de abuso", motivo: "agresión en un local de ocio", envase: "Tubo de sangre" },
    { que: "Orina · drogas de abuso", motivo: "control antidopaje de un ciclista profesional", envase: "Frasco estéril de orina" },
  ];
  /** Eslabones de la cadena. Cada uno: [título, texto correcto(ctx), [errores {t, por, q}]]. */
  const ESLABONES = [
    ["Toma de la muestra", (c) => `${c.envase} recogido por ${c.n[0]} a las ${c.h[0]}. Donante identificado con su DNI. Acta firmada por quien recoge y por un testigo.`, [
      { t: (c) => `${c.envase} recogido a las ${c.h[0]}. Donante identificado con su DNI. El acta queda sin firmar: «ya se firmará en el laboratorio».`,
        por: "En la cadena de custodia **cada responsable firma** en el momento en que tiene la muestra. Un acta sin firma deja un hueco: nadie responde de la muestra en ese tramo.",
        q: ["¿Qué exige la cadena de custodia en cada paso?", ["Que firme cada responsable y que el embalaje vaya precintado", "Que la muestra viaje siempre congelada", "Que la analice el mismo técnico que la recogió", "Que el donante firme el informe final"], "Que firme cada responsable y que el embalaje vaya precintado",
          "Muestras forenses: **cada responsable firma** y el embalaje va **precintado**."] },
      { t: (c) => `${c.envase} recogido por ${c.n[0]} a las ${c.h[0]}. El donante dice su nombre en voz alta; no se comprueba ningún documento. Acta firmada.`,
        por: "Sin **identificar** de verdad al donante, el resultado puede atribuirse a **otra persona**: el peor error preanalítico según el libro.",
        q: ["Según el libro, ¿cuál es el peor error preanalítico?", ["Atribuir el resultado a otra persona por un error de identificación", "Usar un tubo de un color equivocado", "Centrifugar de más", "Llenar poco un tubo seco"], "Atribuir el resultado a otra persona por un error de identificación",
          "El peor error: atribuir el resultado a **otra persona** por un fallo de **identificación**."] },
    ]],
    ["Envase primario", (c) => `Envase estanco, etiquetado con nombre, fecha y hora. Cerrado con el precinto nº ${c.p}. Firma: ${c.n[0]}.`, [
      { t: (c) => `Envase estanco, etiquetado con nombre, fecha y hora. Se cierra con la tapa de rosca, sin precinto. Firma: ${c.n[0]}.`,
        por: "Una muestra forense va **precintada**: sin precinto nadie puede asegurar que no se abrió por el camino.",
        q: ["¿Por qué se precinta el embalaje de una muestra forense?", ["Para demostrar que nadie la ha abierto ni manipulado", "Para que no entre luz", "Para mantener la temperatura", "Porque lo exige la categoría B"], "Para demostrar que nadie la ha abierto ni manipulado",
          "El **precinto** garantiza que la muestra no se ha abierto: es parte de la **cadena de custodia**."] },
    ]],
    ["Embalaje secundario", () => "Envase primario envuelto en material absorbente suficiente para todo su contenido, dentro de un secundario estanco con gradilla. Refrigerante colocado entre el secundario y la caja exterior.", [
      { t: () => "Envase primario dentro de un secundario estanco con gradilla, sin material absorbente. Refrigerante colocado entre el secundario y la caja exterior.",
        por: "El primario va **envuelto en material absorbente suficiente** para absorber todo el líquido si se rompe.",
        q: ["¿Qué rodea al recipiente primario en el triple embalaje?", ["Material absorbente suficiente para todo el líquido", "El refrigerante", "Las etiquetas de peligro", "El material amortiguador de la caja exterior"], "Material absorbente suficiente para todo el líquido",
          "Primario **estanco**, bien etiquetado y **envuelto en material absorbente** suficiente para todo su contenido."] },
      { t: () => "Envase primario envuelto en material absorbente, dentro de un secundario estanco. El hielo seco se mete dentro del secundario, pegado al envase.",
        por: "El refrigerante (hielo, **hielo seco** o nitrógeno líquido) va **entre el embalaje secundario y el exterior**, nunca dentro del secundario.",
        q: ["¿Dónde se coloca el refrigerante en el triple embalaje?", ["Entre el embalaje secundario y el exterior", "Dentro del recipiente primario", "Dentro del secundario, junto al primario", "Fuera de la caja exterior"], "Entre el embalaje secundario y el exterior",
          "Refrigerante **entre el secundario y el exterior**; con hielo seco, el embalaje debe **dejar escapar el CO₂**."] },
    ]],
    ["Embalaje exterior", (c) => `Caja rígida de 20 × 15 cm con material amortiguador. Marcas: expedidor, destinatario y contenido. Cierre con el precinto nº ${c.p2}. Firma: ${c.n[1]}.`, [
      { t: (c) => `Caja de 8 × 8 cm con material amortiguador. Marcas: expedidor, destinatario y contenido. Cierre con el precinto nº ${c.p2}. Firma: ${c.n[1]}.`,
        por: "El embalaje exterior **no puede tener ninguna cara menor de 10 × 10 cm**: así no se pierde y caben las marcas y etiquetas.",
        q: ["¿Qué tamaño mínimo tiene cada cara del embalaje exterior?", ["10 × 10 cm", "5 × 5 cm", "20 × 20 cm", "No hay mínimo"], "10 × 10 cm",
          "**Ninguna cara menor de 10 × 10 cm.** Lleva las marcas y las etiquetas."] },
    ]],
    ["Transporte", (c) => `Entrega al mensajero ${c.n[2]} a las ${c.h[1]}: firman quien entrega y quien recibe; precinto nº ${c.p2} intacto. Viaje en vertical, sin agitación.`, [
      { t: (c) => `Recogida a las ${c.h[1]}. El paquete se deja en el mostrador de mensajería y pasa allí la noche; nadie firma la entrega.`,
        por: "Cada cambio de manos se **firma**. Una noche sin responsable rompe la cadena: no se puede demostrar quién tuvo la muestra.",
        q: ["Una muestra forense pasa la noche sin que nadie firme. ¿Qué ha pasado?", ["Se ha roto la cadena de custodia", "Nada, si llega refrigerada", "Solo es un error administrativo sin importancia", "Hay que repetir el embalaje y seguir"], "Se ha roto la cadena de custodia",
          "Sin la **firma** de cada responsable no hay **cadena de custodia**."] },
    ]],
    ["Recepción", (c) => `Recibida por ${c.n[3]} a las ${c.h[2]}, con guantes y bata. Precinto nº ${c.p2} intacto; embalaje y documentación revisados. Firma de recepción.`, [
      { t: (c) => `Recibida por ${c.n[3]} a las ${c.h[2]}, con guantes y bata. Precinto nº ${c.pMal} intacto; embalaje y documentación revisados. Firma de recepción.`,
        por: (c) => `El precinto que llega (**${c.pMal}**) **no es el mismo** que se puso al cerrar la caja (**${c.p2}**): tiene dos cifras cambiadas de sitio. Alguien abrió y volvió a cerrar, o hubo un cambio. Se **registra la incidencia** y la muestra **pierde valor de prueba**.`,
        q: ["El número de precinto al llegar no coincide con el del envío. ¿Qué se hace?", ["Registrar la incidencia: la cadena de custodia está rota", "Nada si el precinto está intacto", "Corregir el número en el acta", "Analizarla sin decir nada"], "Registrar la incidencia: la cadena de custodia está rota",
          "**Toda incidencia se registra.** Si el precinto no coincide, no se puede garantizar que la muestra no se manipuló."] },
      { t: (c) => `Recibida por ${c.n[3]} a las ${c.h[2]}. El embalaje llega mojado y el envase, mal cerrado. Se procesa igualmente y no se anota nada.`,
        por: "Roturas, derrames o envases mal cerrados son **criterios de rechazo**, y **toda incidencia se registra**, aunque no se rechace.",
        q: ["¿Cuál de estos es un criterio de rechazo en la recepción?", ["Derrame o envase mal cerrado", "Llegar con triple embalaje", "Llevar etiqueta de orientación", "Llegar en menos de 2 horas"], "Derrame o envase mal cerrado",
          "Se rechaza: sin etiqueta o volante, si no coinciden, tiempo superado, envase o conservante inadecuado, **roturas o derrames**, hisopos secos, cantidad insuficiente. **Toda incidencia se registra.**"] },
    ]],
    ["Análisis", (c) => `Cribado por inmunoanálisis: positivo. Confirmado por cromatografía de gases con espectrometría de masas. Firma: ${c.n[4]}.`, [
      { t: (c) => `Cribado por inmunoanálisis: positivo. Se emite el informe como definitivo, sin más pruebas. Firma: ${c.n[4]}.`,
        por: "El **inmunoanálisis** es solo un **cribado** (de presunción). Un positivo con valor judicial hay que **confirmarlo** con **cromatografía de gases + espectrometría de masas**.",
        q: ["¿Con qué técnica se confirma un positivo de drogas de abuso?", ["Cromatografía de gases con espectrometría de masas", "Inmunoanálisis", "Tira reactiva de orina", "Electroforesis en gel"], "Cromatografía de gases con espectrometría de masas",
          "1) **Cribado**: inmunoanálisis o POCT, cualitativo. 2) **Confirmación**: **cromatografía de gases + espectrometría de masas**. Si tiene valor judicial: **cadena de custodia**."] },
    ]],
  ];
  const hora = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  /** Número de precinto de 5 cifras y una versión con dos cifras vecinas (distintas) intercambiadas. */
  function precintos() {
    const d = String(10000 + Math.floor(azar() * 89999)).split("");
    const pares = [1, 2, 3].filter((i) => d[i] !== d[i + 1]);
    if (!pares.length) { d[2] = String((Number(d[2]) + 3) % 10); pares.push(2); }
    const n = d.join(""), i = elegirUna(pares);
    [d[i], d[i + 1]] = [d[i + 1], d[i]];
    return [n, d.join("")];
  }

  /** Muestra los eslabones; la jugadora toca el roto. Devuelve true si acierta. */
  function eslabonRoto(zona, dlg, lista, mal, explicacion) {
    return new Promise(async (res) => {
      const cad = el("div.u-cadena");
      let hecho = false;
      lista.forEach(([tit, txt], i) => {
        const b = el("button.u-eslabon", { type: "button" }, el("span.u-esl-n", String(i + 1)), el("div", el("b", tit), el("p.peq", txt)));
        b.onclick = async () => {
          if (hecho) return; hecho = true;
          const ok = i === mal;
          [...cad.children].forEach((x, j) => { x.disabled = true; if (j === mal) x.classList.add("roto"); else if (j === i) x.classList.add("error"); });
          await decirGuion(dlg, ok ? "lab_bien" : "lab_mal");
          cad.after(rico((ok ? "✔ " : `✘ El eslabón roto era el ${mal + 1}, «${lista[mal][0]}». `) + explicacion, "peq u-lab-expl"));
          res(ok);
        };
        cad.append(b);
      });
      zona.append(el("div.u-lab-pregunta", el("b", "¿Qué eslabón está roto?")), cad);
      ctl.teclas = (e) => {
        if (/^[1-9]$/.test(e.key) && cad.children[Number(e.key) - 1]) { cad.children[Number(e.key) - 1].click(); return true; }
        if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
        return false;
      };
      await decirGuion(dlg, "custodia_eslabon");
    });
  }

  // ---------------------------------------------------------------- triple embalaje
  const CAPAS = [
    { id: "primario", nombre: "Recipiente primario", d: "Estanco, con la muestra" },
    { id: "absorbente", nombre: "Material absorbente", d: "Para todo el líquido" },
    { id: "secundario", nombre: "Embalaje secundario", d: "Estanco, con gradilla" },
    { id: "refrigerante", nombre: "Refrigerante", d: "Hielo seco o nitrógeno" },
    { id: "exterior", nombre: "Embalaje exterior", d: "Rígido, con marcas" },
  ];
  function dibujoEmbalaje(n) {
    // capas concéntricas que aparecen según se colocan
    const capas = [
      `<rect x="88" y="52" width="24" height="56" rx="8" fill="#F4F7FA" stroke="#5A6577" stroke-width="2"/><rect x="90" y="84" width="20" height="20" rx="6" fill="#E3C35A"/>`,
      `<rect x="80" y="44" width="40" height="72" rx="12" fill="none" stroke="#C8B9A0" stroke-width="6" stroke-dasharray="4 3"/>`,
      `<rect x="68" y="32" width="64" height="96" rx="8" fill="none" stroke="#4A78B8" stroke-width="4"/>`,
      [[52, 40], [148, 50], [52, 112], [148, 118], [100, 22], [100, 140]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="#BFE6FF" stroke="#7AB8E0"/>`).join(""),
      `<rect x="36" y="10" width="128" height="140" rx="6" fill="none" stroke="#9A6B3A" stroke-width="7"/>`,
    ];
    const vacio = n ? "" : `<text x="100" y="86" text-anchor="middle" font-size="12" fill="currentColor" opacity=".5">Empieza por dentro</text>`;
    return `<svg viewBox="0 0 200 160" class="u-embalaje-svg">${vacio}${capas.slice(0, n).join("")}</svg>`;
  }
  function montarEmbalaje(zona, dlg) {
    return new Promise((res) => {
      let pos = 0, errores = 0;
      const dibujo = el("div.u-embalaje", { html: dibujoEmbalaje(0) });
      const fila = el("div.u-capas");
      azar.shuffle([...CAPAS]).forEach((c) => {
        const b = el("button.u-capa", { type: "button", "data-capa": c.id }, el("b", c.nombre), el("span.peq.suave", c.d));
        b.onclick = () => {
          if (b.disabled) return;
          if (c.id === CAPAS[pos].id) {
            b.disabled = true; b.classList.add("bien"); pos++;
            dibujo.innerHTML = dibujoEmbalaje(pos);
            if (pos >= CAPAS.length) { ctl.teclas = (e) => ((e.key === "Enter" || e.key === " ") && (dlg.avanzar(), true)); res(errores); }
          } else {
            errores++; b.classList.add("temblar"); setTimeout(() => b.classList.remove("temblar"), 600);
            decirGuion(dlg, "custodia_capa_mal");
          }
        };
        fila.append(b);
      });
      zona.append(el("div.u-lab-pregunta", el("b", "Monta el triple embalaje de dentro hacia fuera")), el("div.u-emb-zona", dibujo, fila));
      ctl.teclas = (e) => {
        if (/^[1-9]$/.test(e.key) && fila.children[Number(e.key) - 1]) { fila.children[Number(e.key) - 1].click(); return true; }
        if (e.key === "Enter" || e.key === " ") { dlg.avanzar(); return true; }
        return false;
      };
    });
  }
  const ENVIOS = [
    { desc: "Cultivo de un microorganismo que puede causar una enfermedad mortal en personas.", ok: "UN 2814 · embalaje P620",
      expl: "Puede causar discapacidad permanente o enfermedad mortal en **humanos** → **categoría A**, **UN 2814**, embalaje **P620**. Además: contacto 24 h y etiqueta de sustancia infecciosa." },
    { desc: "Cultivo de un agente que puede causar una enfermedad mortal, pero solo en animales.", ok: "UN 2900 · embalaje P620",
      expl: "Categoría A que afecta **solo a animales** → **UN 2900**, embalaje **P620**." },
    { desc: "Muestra de un paciente con sospecha de infección que no cumple los criterios de la categoría A.", ok: "UN 3373 · embalaje P650",
      expl: "Infecciosa pero sin los criterios de A → **categoría B**, **UN 3373 «Sustancia biológica, categoría B»**, embalaje **P650**." },
    { desc: "Suero de una persona sana para un control de colesterol: mínima probabilidad de agentes infecciosos.", ok: "«Muestra humana exenta»",
      expl: "Mínima probabilidad de agentes → **exenta**: «Muestra humana exenta», con **triple embalaje**." },
  ];
  const OPS_ENVIO = ["UN 2814 · embalaje P620", "UN 2900 · embalaje P620", "UN 3373 · embalaje P650", "«Muestra humana exenta»"];
  const REFRIG = [
    ["hielo seco", "Mercancías peligrosas diversas", "Si lleva **hielo seco**: etiqueta de **mercancías peligrosas diversas** (y el embalaje deja escapar el CO₂)."],
    ["nitrógeno líquido", "Gas no inflamable ni tóxico", "Si lleva **nitrógeno líquido**: etiqueta de **gas no inflamable ni tóxico**."],
  ];

  async function custodia(k) {
    callar();
    const s = SEDES[k];
    const caso = numeroCaso();
    let puntos = 0, aciertosCaso = 0, pasos = 0;
    main.replaceChildren();
    const esc = escena(ESCENAS.laboratorio(s.tinte), [["duarte", "serio"], ["anna", "neutro"], ["marco", "neutro"]]);
    const dlg = dialogo();
    const zona = el("div.u-zona");
    const lbl = el("span.suave.peq");
    main.append(el("div.fila.entre", el("div.fila", boton("← Sede", () => sede(k), "fantasma"), el("h2", `🔗 Caso #${caso}`)), lbl), esc, dlg, zona);
    teclasDialogo(dlg);
    await decirGuion(dlg, "custodia_intro", esc);
    if (!vivo) return;
    esc.classList.add("compacta");
    // 1. la cadena
    lbl.textContent = "1 · La cadena";
    const m = elegirUna(MUESTRAS_CUST);
    const t0 = 8 * 60 + Math.floor(azar() * 120);
    const [p1] = precintos(), [p2, pMal] = precintos();
    const c = { ...m, p: "P-" + p1, p2: "P-" + p2, pMal: "P-" + pMal, n: azar.shuffle([...NOMBRES_CUST]),
      h: [hora(t0), hora(t0 + 35 + Math.floor(azar() * 40)), hora(t0 + 160 + Math.floor(azar() * 60))] };
    const mal = Math.floor(azar() * ESLABONES.length);
    const err = elegirUna(ESLABONES[mal][2]);
    const lista = ESLABONES.map(([tit, ok], i) => [tit, i === mal ? err.t(c) : ok(c)]);
    const por = typeof err.por === "function" ? err.por(c) : err.por;
    zona.replaceChildren(el("div.u-expediente", el("div.u-exp-cab", `CASO #${caso} · CADENA DE CUSTODIA`),
      el("p", el("b", c.que), ` — ${c.motivo}.`), el("p.peq", "El resultado irá a juicio. Revisa el acta de cada eslabón: firmas, horas y precintos.")));
    pasos++;
    if (await eslabonRoto(zona, dlg, lista, mal, por)) { puntos += 15; aciertosCaso++; }
    if (!vivo) return;
    // 2. la consecuencia
    lbl.textContent = "2 · La consecuencia";
    const [t2, o2, k2, e2] = err.q;
    pasos++;
    if (await interpretar(zona, dlg, t2, azar.shuffle([...o2]), k2, e2)) { puntos += 10; aciertosCaso++; }
    if (!vivo) return;
    // 3. el envío
    lbl.textContent = "3 · El envío";
    zona.replaceChildren();
    await decirGuion(dlg, "custodia_embalaje");
    if (!vivo) return;
    const env = elegirUna(ENVIOS), [refri, etiq, eExpl] = elegirUna(REFRIG);
    zona.append(el("div.u-expediente", el("div.u-exp-cab", "ENVÍO A OTRO LABORATORIO"), el("p", env.desc), el("p.peq", `Viaja refrigerado con ${refri}.`)));
    const errCapas = await montarEmbalaje(zona, dlg);
    if (!vivo) return;
    pasos++;
    if (errCapas === 0) { puntos += 10; aciertosCaso++; } else puntos += Math.max(0, 10 - errCapas * 3);
    zona.append(rico(errCapas === 0 ? "✔ Triple embalaje perfecto." :
      `✘ ${errCapas} error(es). De dentro hacia fuera: **primario → absorbente → secundario → refrigerante → exterior**.`, "peq u-lab-expl"));
    pasos++;
    if (await interpretar(zona, dlg, "¿Cómo se clasifica y embala este envío?", OPS_ENVIO, env.ok, env.expl)) { puntos += 10; aciertosCaso++; }
    if (!vivo) return;
    pasos++;
    if (await interpretar(zona, dlg, `Lleva ${refri}. ¿Qué etiqueta de peligro hay que añadir por el refrigerante?`,
      azar.shuffle(["Mercancías peligrosas diversas", "Gas no inflamable ni tóxico", "Líquido inflamable", "Ninguna"]), etiq, eExpl)) { puntos += 10; aciertosCaso++; }
    if (!vivo) return;
    // 4. el tribunal
    lbl.textContent = "4 · El tribunal";
    const qs = preguntasDe(["M1_U6", "M5_U8", "M1_U3"], 1);
    if (qs.length) {
      await decirGuion(dlg, "lab_tribunal");
      const ok = await new Promise((res) => {
        zona.replaceChildren();
        const b = bloquePregunta(qs[0], { contexto: "unidad", onFin: (bien) => res(bien) });
        ctl.teclas = (e) => teclasPregunta(b, e);
        zona.append(el("div.u-expediente.tira", el("div.u-exp-cab", "PREGUNTA DEL TRIBUNAL")), tarjeta("u-exp-cuerpo", b));
        b.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      pasos++;
      if (ok) { puntos += PUNTOS.acierto; aciertosCaso++; }
    }
    if (!vivo) return;
    teclasDialogo(dlg);
    zona.replaceChildren();
    esc.classList.remove("compacta");
    const bien = aciertosCaso >= pasos - 1;
    U = estado(); U.casos += 1; if (bien) U.resueltas += 1; guardar(U);
    esc.ponerActores([["duarte", bien ? "sorpresa" : "serio"], ["anna", bien ? "sonrie" : "duda"], ["marco", bien ? "sonrie" : "neutro"]]);
    await decirGuion(dlg, bien ? "custodia_fin" : "cierre_flojo", esc);
    await sumar(puntos, dlg);
    lbl.textContent = "Caso terminado";
    zona.append(tarjeta(bien ? "bg-ok_bg" : "",
      el("h2", bien ? "🔗 Prueba admitida" : "🔗 El juez tiene dudas"),
      el("p", `${aciertosCaso} de ${pasos} aciertos · +${puntos} puntos`),
      el("p.peq", `El eslabón roto: ${mal + 1}, «${ESLABONES[mal][0]}».`),
      el("div.fila.envuelve", boton("Otra cadena", () => custodia(k), "primario"),
        boton("Ver la lección", () => A.abrirLeccion(mal === ESLABONES.length - 1 ? "M5_U8" : mal === 0 ? "M1_U3" : "M1_U6", 0), "secundario"),
        boton("Volver a la sede", () => sede(k), "fantasma"))));
  }

  // ---------------------------------------------------------------- arranque
  if (args.sede && SEDES[args.sede]) sede(args.sede);
  else portada();
  return ctl;
}

