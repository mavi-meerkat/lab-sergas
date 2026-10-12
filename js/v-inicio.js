// Vistas Inicio y Profesor (ruta de lecciones).
import { A } from "./ctx.js";
import { el, boton, chip, tarjeta, donut, segmentado } from "./ui.js";
import { UMBRAL_DEBILIDAD, NUEVAS_POR_DIA_DEFECTO } from "./engine.js";

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
  main.append(el("h1", saludo), el("p.suave.intro", frasePlan(plan, cola.length)));

  // botón principal
  const top = tarjeta("principal");
  if (cola.length) {
    const emerg = cola.filter((q) => p.estado(q).emergencia).length;
    top.append(el("div.flex1",
      el("h2", `${cola.length} preguntas esperan repaso hoy`),
      el("p.suave.peq", (emerg ? `${emerg} vienen de fallos recientes (cola de emergencia). ` : "") +
        "Mientras haya repasos pendientes no se abren tests aleatorios ni temario nuevo.")),
      boton("▶  Estudiar Cola del Día", () => A.ir("repaso", { modo: "cola" }), "primario grande"));
  } else {
    const sig = plan.siguientes[0];
    top.append(el("div.flex1",
      el("h2.c-ok", "Cola del día al día ✓"),
      el("p.suave.peq", sig ? `Siguiente lección de tu ruta: ${sig.titulo}` : "Has terminado todas las lecciones disponibles.")));
    if (sig) top.append(boton("▶  Continuar con el Profesor", () => A.abrirLeccion(sig.id), "primario grande"));
  }
  main.append(top);

  // gráficos
  const rej = el("div.rejilla3");
  const r = m.recuentoEstados();
  const total = r.nuevo + r.aprendizaje + r.consolidada;
  const ley = (items) => el("div.leyenda", items.map(([t, n, col]) => el("div", el("span.punto", { style: { color: `var(--${col})` } }, "●"), ` ${t} `, el("b", n))));
  rej.append(tarjeta("", el("h3", "Banco de preguntas"), el("div.fila",
    donut([[r.nuevo, "borde"], [r.aprendizaje, "aviso"], [r.consolidada, "ok"]], `${total ? Math.round((r.consolidada / total) * 100) : 0}%`, "consolidado"),
    ley([["Nuevas", r.nuevo, "borde"], ["En aprendizaje", r.aprendizaje, "aviso"], ["Consolidadas", r.consolidada, "ok"]]))));
  const hechas = p.leccionesCompletadas().size;
  const totU = Object.keys(c.unidades).length;
  rej.append(tarjeta("", el("h3", "Temario enseñado"), el("div.fila",
    donut([[hechas, "acento"], [totU - hechas, "borde"]], `${hechas}/${totU}`, "unidades"),
    el("div.leyenda",
      el("div", `Hoy: ${plan.lecciones_hoy} de ${plan.lecciones_dia} lecciones`),
      el("div", `Hoy: ${plan.nuevas_hoy} de ${plan.nuevas_dia} preguntas nuevas`),
      el("div.c-aviso", el("b", `🔥 Racha: ${m.racha()} días`))))));
  const g3 = tarjeta("", el("h3", "Repaso urgente hoy"));
  const top3 = m.topRepasoUrgente(3);
  if (!top3.length) g3.append(el("p.suave.peq", "Aún no hay datos suficientes. Responde preguntas y aquí verás tus 3 unidades más flojas."));
  for (const [uid, pct, pend] of top3) {
    const u = c.unidades[uid];
    const debil = pct !== null && pct < UMBRAL_DEBILIDAD;
    const f = el("div.urgente" + (debil ? ".bg-mal_bg" : ".bg-aviso_bg"),
      el("div.flex1",
        el("b.peq", `M${u.modulo}·U${u.numero}  ${u.titulo.length > 42 ? u.titulo.slice(0, 42) + "…" : u.titulo}`),
        el("div.suave.peq", (pct !== null ? `${Math.round(pct * 100)} % acierto` : "sin datos") + (pend ? ` · ${pend} pendientes` : ""))));
    if (debil) f.append(boton("Choque", () => A.ir("repaso", { modo: "choque", unidad: uid }), "mal peq"));
    g3.append(f);
  }
  rej.append(g3);
  main.append(rej);

  // ruta
  const rf = tarjeta("", el("h3", "Tu ruta de hoy (ordenada por lo más preguntado en exámenes SERGAS)"));
  for (const u of plan.siguientes.slice(0, 5)) {
    rf.append(el("div.fila.ruta",
      chip(`M${u.modulo}·U${u.numero}`),
      el("span.flex1", u.titulo, u.peso_examen ? el("span.c-aviso.peq", `   🔥 ${u.peso_examen} preg. en exámenes`) : null),
      boton("Abrir", () => A.abrirLeccion(u.id), "fantasma")));
  }
  if (!plan.siguientes.length) rf.append(el("p.suave", "No quedan lecciones pendientes. ¡Todo a repasar!"));
  main.append(rf);
  return { nombre: "inicio", refrescarRemoto: true };
}

export function vistaProfesor(main) {
  const { c, p } = A;
  let orden = p.get("orden_ruta", "frecuencia");
  main.append(el("div.fila.entre.envuelve",
    el("h1", "Modo Profesor"),
    segmentado(["Por frecuencia en examen", "Orden del temario"], orden === "frecuencia" ? "Por frecuencia en examen" : "Orden del temario", (v) => {
      orden = v.startsWith("Por") ? "frecuencia" : "temario";
      p.set("orden_ruta", orden);
      pintar();
    })),
  el("p.suave.intro", "Cada lección son tarjetas guiadas: concepto, recorte literal del libro, esquema, mnemotecnia, trampa de examen, ejercicio y preguntas de comprobación."));
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
    if (disp) f.append(boton(hechas.has(u.id) ? "Repasar" : "Empezar", () => A.abrirLeccion(u.id), hechas.has(u.id) ? "secundario" : "primario"));
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
        lista.append(el("h3.modulo", `Módulo ${mod.numero} · ${mod.titulo}   (${mod.libro}.pdf)`));
        for (const ud of mod.unidades) lista.append(fila(c.unidades[ud.id], hechas, siguiente));
      }
    }
  }
  pintar();
  return { nombre: "profesor", refrescarRemoto: true };
}
