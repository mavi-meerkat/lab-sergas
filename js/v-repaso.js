// Vista Repaso (modo Tutor): cola del día, sesión de choque, micro-bloques y listas.
import { A } from "./ctx.js";
import { el, boton, tarjeta, barra, confirmar, aviso } from "./ui.js";
import { bloquePregunta, teclasPregunta } from "./pregunta.js";
import { TAM_SESION_CHOQUE, SEGUNDOS_REFLEJOS, TAM_REFLEJOS } from "./engine.js";

export function vistaRepaso(main, { modo = null, unidad = null, ids = null } = {}) {
  const { m, p, c } = A;
  let cola = [], reintentos = new Set(), aciertos = 0, total = 0, modoActual = modo;
  let sinDudas = 0, tiempos = [];
  let bloque = null;
  const ctl = { nombre: "repaso", refrescarRemoto: false, teclas: null };

  function menu() {
    main.replaceChildren();
    bloque = null;
    ctl.refrescarRemoto = true;
    main.append(el("h1", "Repaso · Modo Tutor"), el("p.suave.intro", "Sesiones cortas, retroalimentación inmediata y sin nota final."));
    const colaD = m.colaDelDia();
    const opcion = (titulo, desc, txt, cmd, tipo = "primario", activo = true, bg = "") => {
      const b = boton(txt, cmd, tipo);
      b.disabled = !activo;
      main.append(tarjeta("fila-opcion" + (bg ? " bg-" + bg : ""), el("div.flex1", el("h3", titulo), el("p.suave.peq", desc)), b));
    };
    opcion(`Cola del día (${colaD.length})`, "Repasos vencidos según la repetición espaciada + cola de emergencia de fallos.",
      "Estudiar cola", () => empezar("cola"), "primario", colaD.length > 0);
    for (const [uid, pct] of m.unidadesDebiles().slice(0, 3)) {
      const u = c.unidades[uid];
      opcion(`Sesión de choque · ${Math.round(pct * 100)} %`, `M${u.modulo}·U${u.numero} ${u.titulo}. ${TAM_SESION_CHOQUE} preguntas exclusivas de esta unidad.`,
        "Empezar choque", () => empezar("choque", uid), "mal", true, "mal_bg");
    }
    const bloqueo = m.bloqueoContenidoNuevo();
    const tam = p.get("tam_sesion", 10);
    opcion(`Micro-bloque de ${tam} preguntas nuevas`, bloqueo || "Preguntas aún no vistas de las unidades que ya te ha enseñado el Profesor.",
      "Empezar", () => empezar("nuevas"), "primario", !bloqueo);
    const errS = m.erroresSeguros();
    if (errS.length) opcion(`🎯 Errores seguros (${errS.length})`, "Preguntas que fallaste estando convencida. Cada una necesita dos aciertos seguros seguidos para darse por corregida.",
      "Corregirlos", () => empezar("errores"), "mal", true, "trampa_bg");
    const nRef = m.colaReflejos().length;
    opcion(`⚡ Reflejos · ${SEGUNDOS_REFLEJOS} s por pregunta`, nRef
      ? `Hasta ${TAM_REFLEJOS} preguntas que aún no te salen solas (las acertaste dudando, por suerte o despacio). Contra reloj para automatizarlas.`
      : "Aparecerán aquí las preguntas que aciertes dudando, por suerte o despacio.",
      "Entrenar", () => empezar("reflejos"), "aviso", nRef > 0);
    main.append(panelSeguridad());
    const pf = panelFallos();
    if (pf) main.append(pf);
    if (bloqueo && m.paseDisponible()) {
      main.append(el("div.fila.envuelve", el("span.suave.peq", "¿Hoy no puedes cumplir? Tienes 1 pase de emergencia al día."),
        boton("Usar pase de emergencia", async () => {
          if (await confirmar("Pase de emergencia", "El pase desbloquea temario y preguntas nuevas hasta mañana.\nLos repasos pendientes seguirán ahí. ¿Usarlo ahora?", { si: "Usar pase", tipo: "aviso" })) {
            m.usarPase();
            menu();
          }
        }, "aviso")));
    }
  }

  async function empezar(md, uid = null) {
    const tam = p.get("tam_sesion", 10);
    if (md === "cola") cola = m.colaDelDia().slice(0, Math.max(tam, 15));
    else if (md === "choque") cola = m.sesionChoque(uid);
    else if (md === "lista") cola = (ids || []).filter((q) => q in c.preguntas);
    else if (md === "errores") cola = m.erroresSeguros().slice(0, Math.max(tam, 15));
    else if (md === "reflejos") cola = m.colaReflejos();
    else {
      cola = m.preguntasNuevas(tam);
      if (!cola.length) {
        await aviso("Sin preguntas nuevas", "No hay preguntas nuevas de las unidades ya enseñadas.\nAvanza una lección en el Modo Profesor.");
        menu();
        return;
      }
    }
    modoActual = md;
    aciertos = total = sinDudas = 0;
    tiempos = [];
    reintentos = new Set();
    ctl.refrescarRemoto = false;
    siguiente();
  }

  function siguiente() {
    main.replaceChildren();
    if (!cola.length) return fin();
    const qid = cola.shift();
    const nombre = { cola: "Cola del día", choque: "Sesión de choque", nuevas: "Micro-bloque", lista: "Repaso de fallos del simulacro",
      errores: "Corregir errores seguros", reflejos: "⚡ Reflejos" }[modoActual];
    main.append(el("div.fila.entre",
      el("div.fila", boton("← Salir", menu, "fantasma"), el("h2", nombre)),
      el("span.suave.peq", `${total} respondidas · quedan ${cola.length + 1}`)),
      barra(total / Math.max(1, total + cola.length + 1)));
    const reflejos = modoActual === "reflejos";
    bloque = bloquePregunta(qid, {
      onFin: (ok) => resuelta(qid, ok, reflejos),
      onRespuesta: (ok, res) => { if (ok && res.certeza === "segura" && !res.lento) sinDudas += 1; },
      limite: reflejos ? SEGUNDOS_REFLEJOS : null, certeza: reflejos ? true : undefined,
      contexto: reflejos ? "reflejos" : "tutor", reinsertar: !reflejos,
    });
    main.append(tarjeta("", bloque));
    A.main.scrollTop = 0;
  }
  function resuelta(qid, ok, sinReinsertar = false) {
    total += 1;
    aciertos += ok ? 1 : 0;
    if (!ok && !reintentos.has(qid) && !sinReinsertar) {
      reintentos.add(qid);
      cola.splice(Math.min(cola.length, 3), 0, qid);
    }
    siguiente();
  }

  function panelSeguridad() {
    const cal = m.calibracion();
    const rs = m.recuentoSeguridad();
    const f = (x) => (x === null ? "—" : Math.round(x * 100) + " %");
    const caja = tarjeta("", el("h3", "🧠 Seguridad al responder"),
      el("p.suave.peq", "Tras elegir opción dices si estás segura, dudas o vas al azar. Así el algoritmo distingue «lo sé» de «me ha sonado» y entrena que la respuesta salga sola."));
    if (cal.n < 10) {
      caja.append(el("p.peq", "Aún hay pocas respuestas con seguridad declarada. Cuando tengas unas cuantas verás aquí tu calibración y un consejo para el examen."));
      return caja;
    }
    caja.append(el("div.calib",
      el("div", el("div.suave.peq", "Cuando estás segura aciertas"), el("div.big.c-ok", f(cal.segura.pct)), el("div.suave.peq", `${cal.segura.n} respuestas`)),
      el("div", el("div.suave.peq", "Cuando dudas aciertas"), el("div.big.c-aviso", f(cal.duda.pct)), el("div.suave.peq", `${cal.duda.n} respuestas`)),
      el("div", el("div.suave.peq", "Al azar aciertas"), el("div.big", f(cal.azar.pct)), el("div.suave.peq", `${cal.azar.n} respuestas`))));
    caja.append(el("p.peq", `🏅 ${rs.dominadas} dominadas sin dudas · 🤔 ${rs.inseguras} inseguras · 🎯 ${rs.errores} errores seguros por corregir` +
      (cal.t_mediano ? ` · tiempo típico de respuesta segura: ${Math.round(cal.t_mediano / 1000)} s` : "")));
    for (const c of m.consejoExamen(cal)) caja.append(el("p.peq.c-acento", "💡 " + c));
    return caja;
  }
  function panelFallos() {
    const t = m.tiposDeFallo();
    const tot = t.concepto + t.cifra + t.inversion;
    if (tot < 5) return null;
    const pc = (x) => Math.round((x / tot) * 100) + " %";
    const nf = (x) => (x === 1 ? "1 fallo" : `${x} fallos`);
    const caja = tarjeta("", el("h3", "🔢 Tipos de fallo"),
      el("div.calib",
        el("div", el("div.suave.peq", "De concepto"), el("div.big", pc(t.concepto)), el("div.suave.peq", nf(t.concepto))),
        el("div", el("div.suave.peq", "De cifra"), el("div.big.c-aviso", pc(t.cifra)), el("div.suave.peq", nf(t.cifra))),
        el("div", el("div.suave.peq", "Dígitos invertidos"), el("div.big.c-trampa", pc(t.inversion)), el("div.suave.peq", nf(t.inversion)))),
      el("p.suave.peq", "Últimos 400 fallos. «De cifra»: la opción decía lo mismo y solo cambiaba el número. «Dígitos invertidos»: los mismos dígitos en otro orden (45 por 54), la cifra la sabías."));
    return caja;
  }
  function fin() {
    bloque = null;
    const fallos = reintentos.size;
    main.append(tarjeta("bg-ok_bg",
      el("h2.c-ok", "Sesión terminada"),
      el("p", fallos ? `${fallos} pregunta(s) han ido a la cola de emergencia y volverán mañana.` : "Sin fallos. El algoritmo ha espaciado los próximos repasos."),
      el("p.suave", `${aciertos} aciertos de ${total} respuestas · ${sinDudas} sin dudas (seguras y rápidas).`),
      el("div.fila", boton("Volver al inicio", () => A.ir("inicio"), "primario"), boton("Otra sesión", menu, "secundario"))));
  }

  ctl.teclas = (e) => teclasPregunta(bloque, e);
  ctl.destruir = () => { if (bloque && bloque.detener) bloque.detener(); };
  ctl.refrescar = () => { if (ctl.refrescarRemoto) menu(); };

  if (modo) empezar(modo, unidad);
  else menu();
  return ctl;
}
