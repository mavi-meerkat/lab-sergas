// Vista Repaso (modo Tutor): cola del día, sesión de choque, micro-bloques y listas.
import { A } from "./ctx.js";
import { el, boton, tarjeta, barra, confirmar, aviso } from "./ui.js";
import { bloquePregunta } from "./pregunta.js";
import { TAM_SESION_CHOQUE } from "./engine.js";

export function vistaRepaso(main, { modo = null, unidad = null, ids = null } = {}) {
  const { m, p, c } = A;
  let cola = [], reintentos = new Set(), aciertos = 0, total = 0, modoActual = modo;
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
    else {
      cola = m.preguntasNuevas(tam);
      if (!cola.length) {
        await aviso("Sin preguntas nuevas", "No hay preguntas nuevas de las unidades ya enseñadas.\nAvanza una lección en el Modo Profesor.");
        menu();
        return;
      }
    }
    modoActual = md;
    aciertos = total = 0;
    reintentos = new Set();
    ctl.refrescarRemoto = false;
    siguiente();
  }

  function siguiente() {
    main.replaceChildren();
    if (!cola.length) return fin();
    const qid = cola.shift();
    const nombre = { cola: "Cola del día", choque: "Sesión de choque", nuevas: "Micro-bloque", lista: "Repaso de fallos del simulacro" }[modoActual];
    main.append(el("div.fila.entre",
      el("div.fila", boton("← Salir", menu, "fantasma"), el("h2", nombre)),
      el("span.suave.peq", `${total} respondidas · quedan ${cola.length + 1}`)),
      barra(total / Math.max(1, total + cola.length + 1)));
    bloque = bloquePregunta(qid, { onFin: (ok) => resuelta(qid, ok) });
    main.append(tarjeta("", bloque));
    A.main.scrollTop = 0;
  }
  function resuelta(qid, ok) {
    total += 1;
    aciertos += ok ? 1 : 0;
    if (!ok && !reintentos.has(qid)) {
      reintentos.add(qid);
      cola.splice(Math.min(cola.length, 3), 0, qid);
    }
    siguiente();
  }
  function fin() {
    bloque = null;
    const fallos = reintentos.size;
    main.append(tarjeta("bg-ok_bg",
      el("h2.c-ok", "Sesión terminada"),
      el("p", fallos ? `${fallos} pregunta(s) han ido a la cola de emergencia y volverán mañana.` : "Sin fallos. El algoritmo ha espaciado los próximos repasos."),
      el("p.suave", `${aciertos} aciertos de ${total} respuestas.`),
      el("div.fila", boton("Volver al inicio", () => A.ir("inicio"), "primario"), boton("Otra sesión", menu, "secundario"))));
  }

  ctl.teclas = (e) => {
    if (!bloque) return false;
    if (/^[a-dA-D1-4]$/.test(e.key)) {
      const pos = /\d/.test(e.key) ? Number(e.key) - 1 : "ABCD".indexOf(e.key.toUpperCase());
      bloque.elegirVisible(pos);
      return true;
    }
    if (e.key === "Enter") {
      const b = bloque.querySelector("[data-continuar]") || bloque.querySelector('[data-val="bien"]');
      if (b) { b.click(); return true; }
    }
    return false;
  };
  ctl.refrescar = () => { if (ctl.refrescarRemoto) menu(); };

  if (modo) empezar(modo, unidad);
  else menu();
  return ctl;
}
