// Vistas Inicio y Profesor (ruta de lecciones).
import { A } from "./ctx.js";
import { el, boton, chip, tarjeta, donut, segmentado } from "./ui.js";
import { UMBRAL_DEBILIDAD, NUEVAS_POR_DIA_DEFECTO } from "./engine.js";
import { busto, EQUIPO } from "./u-arte.js";
import { narradorDe, casoDe, NOMBRE_JUEGO } from "./l-guion.js";

// En modo personajes los textos hablan el idioma de la Unidad de Análisis; en clásico, los de siempre.
const pj = () => A.p.get("modo_personajes", true) !== false;
const T = (clasico, personajes) => (pj() ? personajes : clasico);

function frasePlan(plan, nCola) {
  if (plan.modo === "sin_fecha")
    return `Pon la fecha del examen arriba y ajustaré el ritmo diario automáticamente. Mientras tanto: 1 lección y ${NUEVAS_POR_DIA_DEFECTO} preguntas nuevas al día.`;
  if (plan.modo === "pasada") return "La fecha del examen ya ha pasado. Actualízala arriba para recalcular el plan.";
  if (plan.modo === "repaso_final")
    return `Quedan ${plan.dias} días: estás en la fase de REPASO FINAL. Prioridad absoluta a la cola del día y a tus unidades débiles.`;
  return `Quedan ${plan.dias} días para el examen. Para llegar con todo visto y ${plan.colchon} días de repaso final, hoy tocan ` +
    `${plan.lecciones_dia} lección(es), ${plan.nuevas_dia} preguntas nuevas y ${nCola} repasos.`;
}

export function vistaInicio(main) {
  const { m, c, p } = A;
  const plan = m.planDiario();
  const cola = m.colaDelDia();
  const h = new Date().getHours();
  const saludo = h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
  if (pj()) {
    main.append(el("div.l-quien.grande.inicio-duarte", el("div.l-quien-foto", { html: busto(EQUIPO.duarte, "neutro") }),
      el("div.l-quien-txt", el("h1", `${saludo}, Anna.`), el("p.suave.intro", frasePlan(plan, cola.length)))));
    // orden del día: el expediente que toca y el caso de la Unidad que encaja con él
    const sigE = plan.siguientes[0];
    if (sigE) {
      const caso = casoDe(sigE.id);
      main.append(tarjeta("l-caso orden-dia", el("div.l-caso-cab", "ORDEN DEL DÍA · TENIENTE DUARTE"),
        el("p", `Hoy: expediente ${sigE.id} (${sigE.titulo}) y después, «${NOMBRE_JUEGO[caso.juego]}».`),
        el("div.fila.envuelve", boton("📁 Abrir expediente", () => A.abrirLeccion(sigE.id), "primario"),
          boton(`🔎 ${NOMBRE_JUEGO[caso.juego]}`, () => A.ir("unidad", caso), "secundario"))));
    }
  } else main.append(el("h1", saludo), el("p.suave.intro", frasePlan(plan, cola.length)));

  // botón principal
  const top = tarjeta("principal");
  if (cola.length) {
    const emerg = cola.filter((q) => p.estado(q).emergencia).length;
    top.append(el("div.flex1",
      el("h2", T(`${cola.length} preguntas esperan repaso hoy`, `Casos urgentes: ${cola.length} esperan revisión hoy`)),
      el("p.suave.peq", (emerg ? T(`${emerg} vienen de fallos recientes (cola de emergencia). `, `${emerg} son pistas que se te escaparon hace poco (alerta máxima). `) : "") +
        T("Mientras haya repasos pendientes no se abren tests aleatorios ni temario nuevo.", "«Hasta cerrar los casos urgentes no se abre ningún expediente nuevo. Órdenes del jefe.»"))),
      boton(T("▶  Estudiar Cola del Día", "▶  Revisar los casos urgentes"), () => A.ir("repaso", { modo: "cola" }), "primario grande"));
  } else {
    const sig = plan.siguientes[0];
    top.append(el("div.flex1",
      el("h2.c-ok", T("Cola del día al día ✓", "Casos urgentes cerrados ✓")),
      el("p.suave.peq", sig ? T(`Siguiente lección de tu ruta: ${sig.titulo}`, `Próximo expediente: ${sig.titulo}`) : T("Has terminado todas las lecciones disponibles.", "No quedan expedientes por abrir."))));
    if (sig) top.append(boton(T("▶  Continuar con el Profesor", "▶  Abrir expediente"), () => A.abrirLeccion(sig.id), "primario grande"));
  }
  main.append(top);

  // gráficos
  const rej = el("div.rejilla3");
  const r = m.recuentoEstados();
  const total = r.nuevo + r.aprendizaje + r.consolidada;
  const ley = (items) => el("div.leyenda", items.map(([t, n, col]) => el("div", el("span.punto", { style: { color: `var(--${col})` } }, "●"), ` ${t} `, el("b", n))));
  rej.append(tarjeta("", el("h3", T("Banco de preguntas", "Archivo de interrogatorios")), el("div.fila",
    donut([[r.nuevo, "borde"], [r.aprendizaje, "aviso"], [r.consolidada, "ok"]], `${total ? Math.round((r.consolidada / total) * 100) : 0}%`, "consolidado"),
    ley([[T("Nuevas", "Sin abrir"), r.nuevo, "borde"], [T("En aprendizaje", "Casos pendientes"), r.aprendizaje, "aviso"], [T("Consolidadas", "Casos cerrados"), r.consolidada, "ok"]]))));
  const hechas = p.leccionesCompletadas().size;
  const totU = Object.keys(c.unidades).length;
  rej.append(tarjeta("", el("h3", T("Temario enseñado", "Expedientes estudiados")), el("div.fila",
    donut([[hechas, "acento"], [totU - hechas, "borde"]], `${hechas}/${totU}`, "unidades"),
    el("div.leyenda",
      el("div", T(`Hoy: ${plan.lecciones_hoy} de ${plan.lecciones_dia} lecciones`, `Hoy: ${plan.lecciones_hoy} de ${plan.lecciones_dia} expedientes`)),
      el("div", T(`Hoy: ${plan.nuevas_hoy} de ${plan.nuevas_dia} preguntas nuevas`, `Hoy: ${plan.nuevas_hoy} de ${plan.nuevas_dia} interrogatorios nuevos`)),
      el("div.c-aviso", el("b", T(`🔥 Racha: ${m.racha()} días`, `🔥 ${m.racha()} ${m.racha() === 1 ? "día" : "días"} de servicio seguidos`)))))));
  const g3 = tarjeta("", el("h3", T("Repaso urgente hoy", "Casos urgentes")));
  const top3 = m.topRepasoUrgente(3);
  if (!top3.length) g3.append(el("p.suave.peq", "Aún no hay datos suficientes. Responde preguntas y aquí verás tus 3 unidades más flojas."));
  for (const [uid, pct, pend] of top3) {
    const u = c.unidades[uid];
    const debil = pct !== null && pct < UMBRAL_DEBILIDAD;
    const f = el("div.urgente" + (debil ? ".bg-mal_bg" : ".bg-aviso_bg"),
      el("div.flex1",
        el("b.peq", `M${u.modulo}·U${u.numero}  ${u.titulo.length > 42 ? u.titulo.slice(0, 42) + "…" : u.titulo}`),
        el("div.suave.peq", (pct !== null ? `${Math.round(pct * 100)} % ${T("acierto", "de acierto ante el tribunal")}` : "sin datos") + (pend ? ` · ${pend} pendientes` : ""))));
    if (debil) f.append(boton(T("Choque", "Redada"), () => A.ir("repaso", { modo: "choque", unidad: uid }), "mal peq"));
    g3.append(f);
  }
  rej.append(g3);
  main.append(rej);

  // ruta
  const rf = tarjeta("", el("h3", T("Tu ruta de hoy (ordenada por lo más preguntado en exámenes SERGAS)", "Expedientes pendientes · primero, lo que más cae en el examen SERGAS")));
  for (const u of plan.siguientes.slice(0, 5)) {
    rf.append(el("div.fila.ruta",
      chip(`M${u.modulo}·U${u.numero}`),
      el("span.flex1", u.titulo, u.peso_examen ? el("span.c-aviso.peq", `   🔥 ${u.peso_examen} preg. en exámenes`) : null),
      boton(T("Abrir", "Abrir expediente"), () => A.abrirLeccion(u.id), "fantasma")));
  }
  if (!plan.siguientes.length) rf.append(el("p.suave", T("No quedan lecciones pendientes. ¡Todo a repasar!", "«No quedan expedientes por abrir. Ahora toca que los cerrados sigan cerrados.»")));
  main.append(rf);
  return { nombre: "inicio", refrescarRemoto: true };
}

export function vistaProfesor(main) {
  const { c, p } = A;
  let orden = p.get("orden_ruta", "frecuencia");
  main.append(el("div.fila.entre.envuelve",
    el("h1", T("Modo Profesor", "Sala de briefing")),
    segmentado(T(["Por frecuencia en examen", "Orden del temario"], ["Por peso en el examen", "Por módulos"]), orden === "frecuencia" ? T("Por frecuencia en examen", "Por peso en el examen") : T("Orden del temario", "Por módulos"), (v) => {
      orden = v === "Por frecuencia en examen" || v === "Por peso en el examen" ? "frecuencia" : "temario";
      p.set("orden_ruta", orden);
      pintar();
    })),
  el("p.suave.intro", T("Cada lección son tarjetas guiadas: concepto, recorte literal del libro, esquema, mnemotecnia, trampa de examen, ejercicio y preguntas de comprobación.",
    "Cada expediente te lo explica un miembro de la Unidad: Duarte (módulos 1, 2 y 5), Carmen (3 y 4) y Valeria (6, 7 y 8). Marco te avisa de las trampas e Iker te cuenta sus trucos.")));
  const lista = el("div");
  main.append(lista);

  function fila(u, hechas, siguiente) {
    const disp = u.id in c.lecciones;
    const [icono, col] = hechas.has(u.id) ? ["✔", "ok"] : u.id === siguiente ? ["▶", "acento"] : ["○", "suave"];
    const sub = [];
    if (u.peso_examen) sub.push(`🔥 ${u.peso_examen} preguntas en exámenes SERGAS`);
    if (disp) {
      const lec = c.lecciones[u.id];
      sub.push(`${lec.tarjetas.length} tarjetas · ~${lec.minutos || 15} min`);
      if (A.c.audio[u.id]) sub.push("🎧 con clase en audio");
    } else sub.push("lección en preparación");
    const f = tarjeta("fila-unidad" + (disp ? "" : " bg-panel2"),
      el("span.icono.c-" + col, icono), chip(`M${u.modulo}·U${u.numero}`),
      el("div.flex1",
        el("div" + (u.id === siguiente ? ".negrita" : "") + (disp ? "" : ".suave"), u.titulo),
        el("div.suave.peq", sub.join("   ·   "))));
    if (disp) f.append(boton(hechas.has(u.id) ? T("Repasar", "Revisar") : T("Empezar", "Abrir expediente"), () => A.abrirLeccion(u.id), hechas.has(u.id) ? "secundario" : "primario"));
    return f;
  }
  function pintar() {
    lista.replaceChildren();
    const hechas = p.leccionesCompletadas();
    const ruta = c.ruta().filter((u) => u.id in c.lecciones);
    const siguiente = (ruta.find((u) => !hechas.has(u.id)) || {}).id;
    if (orden === "frecuencia") for (const u of c.ruta()) lista.append(fila(u, hechas, siguiente));
    else {
      for (const mod of c.modulos) {
        const n = narradorDe("M" + mod.numero);
        lista.append(pj() ? el("h3.modulo.fila", el("span.l-quien-foto.mini", { html: busto(EQUIPO[n], "neutro") }), `Módulo ${mod.numero} · ${mod.titulo} · con ${EQUIPO[n].nombre}`)
          : el("h3.modulo", `Módulo ${mod.numero} · ${mod.titulo}   (${mod.libro}.pdf)`));
        for (const ud of mod.unidades) lista.append(fila(c.unidades[ud.id], hechas, siguiente));
      }
    }
  }
  pintar();
  return { nombre: "profesor", refrescarRemoto: true };
}
