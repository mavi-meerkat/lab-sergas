// Simulacros: menú, examen con hoja de respuestas y cronómetro, corrección y «Entender el error».
import { A, TIPOS_TARJETA } from "./ctx.js";
import { el, boton, chip, tarjeta, rico, barra, segmentado, confirmar, aviso, modal } from "./ui.js";
import { verRecorte } from "./pregunta.js";
import { num } from "./util.js";

const limpia = (s) => s.replace(/^[A-D]\)\s*/, "");

export function vistaExamenes(main, { sid = null, modo = null } = {}) {
  const S = A.sim;
  const ctl = { nombre: "examenes", refrescarRemoto: false, teclas: null, destruir: null };
  if (sid && modo === "examen") examen(main, sid, ctl);
  else if (sid && modo === "resultado") resultado(main, sid);
  else menu(main, ctl);
  return ctl;

  // ================================================================ MENÚ
  function menu(main, ctl) {
    ctl.refrescarRemoto = true;
    main.append(el("h1", "Simulacros de examen"),
      el("p.suave.intro", "Formato oficial SERGAS: +0,50 por acierto · −0,125 por fallo · 0 en blanco. Cada simulacro se genera de nuevo por sorteo ponderado: nunca sale el mismo."));
    const cur = S.enCurso();
    if (cur) {
      const resto = Math.max(0, cur.segundos_limite - (cur.segundos_usados || 0));
      main.append(tarjeta("fila-opcion bg-aviso_bg",
        el("div.flex1", el("h3.c-aviso", `Tienes a medias: ${cur.titulo}`),
          el("p.suave.peq", `${Object.keys(cur.respuestas || {}).length} de ${cur.items.length} respondidas · quedan ${Math.floor(resto / 60)} min`)),
        boton("Continuar", () => A.ir("examenes", { sid: cur.id, modo: "examen" }), "aviso"),
        boton("Descartar", async () => {
          if (await confirmar("Descartar", "¿Seguro que quieres descartar el simulacro a medias? No se guardará la nota.", { si: "Descartar", tipo: "mal" })) {
            S.descartar(cur.id); A.ir("examenes");
          }
        }, "secundario")));
    }
    const p = A.p;
    const sw = (clave, txt) => {
      const i = el("input", { type: "checkbox", checked: !!p.get(clave, false), onchange: () => p.set(clave, i.checked) });
      return el("label.interruptor", i, el("span.desliz"), el("span", txt));
    };
    main.append(tarjeta("",
      el("h3", "Cómo se genera"),
      sw("sim_adaptativo", "Reforzar mis puntos débiles (más preguntas de las unidades y preguntas que más fallas)"),
      sw("sim_solo_estudiado", "Solo unidades que ya he estudiado en el Modo Profesor"),
      el("p.suave.peq", "El reparto por unidades sigue la frecuencia real de los exámenes 2016-2021-2025; las preguntas que salieron en tus últimos simulacros casi no se repiten y las opciones se barajan.")));

    const fila = (titulo, desc, txt, cmd, tipo = "primario", extra = null) =>
      main.append(tarjeta("fila-opcion", el("div.flex1", el("h3", titulo), el("p.suave.peq", desc)), extra, boton(txt, cmd, tipo)));
    fila("Simulacro oficial", "100 preguntas + 10 de reserva · 150 minutos · como el día del examen.", "Empezar", () => nuevo("oficial"));
    fila("Medio simulacro", "50 + 5 de reserva · 75 minutos.", "Empezar", () => nuevo("medio"), "secundario");
    fila("Simulacro rápido", "30 preguntas · 45 minutos. Para días con poco tiempo.", "Empezar", () => nuevo("rapido"), "secundario");
    const sel = el("select.selector", A.c.modulos.map((m) => el("option", { value: m.numero }, `${m.numero} · ${m.titulo.slice(0, 38)}`)));
    fila("Simulacro de un módulo", "30 preguntas de un único módulo · 45 minutos.", "Empezar", () => nuevo("modulo", Number(sel.value)), "secundario", sel);
    main.append(tarjeta("fila-opcion bg-trampa_bg",
      el("div.flex1", el("h3.c-trampa", "Exámenes oficiales reales"),
        el("p.suave.peq", "Tal como salieron (parte específica, 110 preguntas). Las anuladas no puntúan y entra la reserva.")),
      ["2025", "2021", "2016"].map((a) => boton(a, () => nuevoReal(a), "secundario"))));
    main.append(tarjeta("bg-azul_bg", el("h3.c-azul", "Estrategia de puntuación"), rico(
      "- El fallo resta **0,125**, que es solo **la cuarta parte** del acierto (0,50). Con 4 opciones, contestar al azar ya tiene esperanza **positiva**: 0,25 × 0,50 − 0,75 × 0,125 = **+0,03** por pregunta.\n" +
      "- Si descartas **1** opción con seguridad: **+0,08** de media. Si descartas **2**: **+0,19**.\n" +
      "- Conclusión: dejar en blanco nunca mejora la esperanza de nota. Reserva el blanco solo para cuando dudes entre opciones que te parecen todas posibles y prefieras no arriesgar.")));

    const hist = S.historial(30);
    if (hist.length) {
      main.append(el("h2", "Tu evolución"));
      const ev = S.evolucion();
      if (ev.length >= 2) main.append(tarjeta("", grafica(ev)));
      for (const h of hist) {
        const r = h.resumen || {};
        const col = (r.sobre10 || 0) >= 5 ? "ok" : "mal";
        main.append(tarjeta("fila-hist",
          el("span.suave.peq.ancho-fecha", (h.fin || "").slice(0, 16).replace("T", "  ")),
          el("b.flex1", h.titulo),
          el("b.c-" + col + ".nota", `${num(r.sobre10 || 0, 2)} / 10`),
          el("span.suave.peq", `${num(r.neta || 0, 2)} / ${num(r.maximo || 0, 0)} pts · ✔ ${r.aciertos}  ✘ ${r.fallos}  ○ ${r.blancos}`),
          boton("Ver corrección", () => A.ir("examenes", { sid: h.id, modo: "resultado" }), "fantasma"),
          boton("🗑", async () => {
            if (await confirmar("Borrar del historial", "¿Quitar este simulacro del historial y de la gráfica?\nLos fallos que ya pasaron a tu cola de repaso se mantienen.", { si: "Borrar", tipo: "mal" })) {
              S.borrar(h.id); A.ir("examenes");
            }
          }, "fantasma", { title: "Borrar" })));
      }
    }
  }

  function grafica(ev) {
    const w = 860, h = 170, m = 34, n = ev.length;
    const x = (i) => m + (w - 2 * m) * (i / Math.max(1, n - 1));
    const y = (v) => h - 24 - (h - 44) * (v / 10);
    let s = "";
    for (const v of [0, 5, 10]) s += `<line x1="${m}" x2="${w - m}" y1="${y(v)}" y2="${y(v)}" stroke="var(--borde)" ${v === 5 ? 'stroke-dasharray="3 3"' : ""}/><text x="${m - 8}" y="${y(v) + 4}" text-anchor="end" class="g-txt">${v}</text>`;
    const pts = ev.map(([, v], i) => [x(i), y(v)]);
    s += `<polyline fill="none" stroke="var(--acento)" stroke-width="3" points="${pts.map((p) => p.join(",")).join(" ")}"/>`;
    for (const [px, py] of pts) s += `<circle cx="${px}" cy="${py}" r="5" fill="var(--acento)" stroke="var(--panel)" stroke-width="2"/>`;
    const [lx, ly] = pts.at(-1);
    s += `<text x="${lx}" y="${ly - 12}" text-anchor="middle" class="g-txt negrita">${num(ev.at(-1)[1], 2)}</text>`;
    s += `<text x="${w - m}" y="${h - 6}" text-anchor="end" class="g-txt">últimos ${n} simulacros · nota sobre 10</text>`;
    return el("div.grafica", { html: `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${s}</svg>` });
  }

  async function nuevo(tipo, modulo = null) {
    const cur = S.enCurso();
    if (cur) {
      if (!(await confirmar("Simulacro a medias", "Tienes un simulacro sin entregar. Si empiezas otro, se descartará. ¿Continuar?", { si: "Empezar otro" }))) return;
      S.descartar(cur.id);
    }
    let id;
    try {
      id = S.generar(tipo, { modulo, adaptativo: !!A.p.get("sim_adaptativo", false), soloEstudiado: !!A.p.get("sim_solo_estudiado", false) });
    } catch (e) {
      await aviso("No se puede generar", e.message);
      return;
    }
    A.ir("examenes", { sid: id, modo: "examen" });
  }
  async function nuevoReal(anio) {
    const cur = S.enCurso();
    if (cur) {
      if (!(await confirmar("Simulacro a medias", "Se descartará el simulacro sin entregar. ¿Continuar?", { si: "Continuar" }))) return;
      S.descartar(cur.id);
    }
    A.ir("examenes", { sid: S.generarReal(anio), modo: "examen" });
  }

  // ================================================================ EXAMEN
  function examen(main, sid, ctl) {
    const sim = S.cargar(sid);
    if (!sim) { A.ir("examenes"); return; }
    if (sim.estado !== "en_curso") { resultado(main, sid); return; }
    const items = sim.items;
    const resp = { ...(sim.respuestas || {}) };
    const marc = new Set(sim.marcadas || []);
    let usados = Number(sim.segundos_usados || 0);
    const limite = Number(sim.segundos_limite);
    let i = 0, activo = true, ultGuardado = Date.now(), cambios = false;
    const nMain = items.filter((it) => !it.reserva).length;

    const lblReloj = el("span.reloj");
    const lblCont = el("span.suave.peq");
    main.append(el("div.cab-examen",
      boton("⏸  Pausar y salir", () => A.ir("examenes"), "fantasma"),
      el("h2.flex1", sim.titulo), lblCont, lblReloj,
      boton("Entregar y corregir", confirmarEntrega, "aviso")));
    const zona = el("div.ex-pregunta");
    const rej = el("div.rejilla-hoja");
    const hoja = tarjeta("hoja",
      el("div.fila.entre", el("b", "Hoja de respuestas"), boton("▾", () => hoja.classList.toggle("plegada"), "fantasma peq plegar")),
      el("div.fila.envuelve.peq", chip("respondida", "blanco", "acento"), chip("marcada", "aviso", "panel2"), chip("en blanco", "tinta", "panel2")),
      rej);
    main.append(el("div.ex-cuerpo", zona, hoja));

    const celdas = [];
    const bloques = [[null, [0, nMain]]];
    if (nMain < items.length) bloques.push(["Reserva", [nMain, items.length]]);
    for (const [tit, [a, b]] of bloques) {
      if (tit) rej.append(el("div.suave.peq.negrita.ancho-total", tit));
      for (let k = a; k < b; k++) {
        const c = el("button.celda", { type: "button", onclick: () => ir(k) }, String(items[k].num || k + 1));
        celdas[k] = c;
        rej.append(c);
      }
    }
    const pintarCelda = (k) => {
      const c = celdas[k];
      c.classList.toggle("resp", String(k) in resp);
      c.classList.toggle("marc", marc.has(k));
      c.classList.toggle("actual", k === i);
    };
    items.forEach((_, k) => pintarCelda(k));
    const guardar = () => { S.guardarParcial(sid, resp, [...marc], usados); ultGuardado = Date.now(); cambios = false; };
    const contador = () => (lblCont.textContent = `${Object.keys(resp).length}/${items.length} respondidas · ${marc.size} marcadas`);

    let ops = [];
    function pintarPregunta() {
      zona.replaceChildren();
      const it = items[i];
      const q = A.c.preguntas[it.q];
      contador();
      const caja = tarjeta("");
      const meta = el("div.fila.envuelve", el("b.suave", `Pregunta ${i + 1} de ${items.length}` + (it.num ? `  ·  nº ${it.num} del examen` : "")));
      if (it.reserva) meta.append(chip("RESERVA", "aviso", "aviso_bg"));
      if (sim.tipo === "real" && q.anulada) meta.append(chip("⛔ Anulada por el tribunal (no puntúa)", "mal", "mal_bg"));
      caja.append(meta, rico(q.enunciado, "enunciado"));
      const elegida = resp[String(i)];
      ops = it.orden.map((idx, pos) => {
        const b = el("button.opcion" + (elegida === "ABCD"[idx] ? ".sel" : ""), { type: "button", onclick: () => elegirVis(pos) },
          el("b", "ABCD"[pos] + ")"), " ", limpia(q.opciones[idx]));
        return b;
      });
      caja.append(el("div.opciones", ops));
      caja.append(el("div.fila.envuelve.pie-pregunta",
        boton("← Anterior", () => ir(i - 1), "secundario", { disabled: i === 0 }),
        boton("Borrar respuesta", borrar, "fantasma"),
        boton(marc.has(i) ? "🚩 Quitar marca" : "🚩 Marcar · dudo", marcar, "fantasma"),
        el("span.flex1"),
        boton("Siguiente →", () => ir(i + 1), "primario", { disabled: i === items.length - 1 })));
      zona.append(caja, el("p.suave.peq.solo-escritorio", "Teclas: A B C D para responder · ← → para moverte. Puedes cambiar la respuesta hasta entregar."));
    }
    function ir(j) {
      if (j < 0 || j >= items.length) return;
      const ant = i;
      i = j;
      pintarCelda(ant); pintarCelda(j);
      pintarPregunta();
      zona.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    function elegirVis(pos) {
      const it = items[i];
      resp[String(i)] = "ABCD"[it.orden[pos]];
      ops.forEach((o, k) => o.classList.toggle("sel", k === pos));
      pintarCelda(i);
      contador();
      guardar();
    }
    function borrar() { delete resp[String(i)]; pintarCelda(i); pintarPregunta(); guardar(); }
    function marcar() { marc.has(i) ? marc.delete(i) : marc.add(i); pintarCelda(i); pintarPregunta(); guardar(); }

    function tick() {
      if (!activo) return;
      usados += 1;
      reloj();
      if (activo && Date.now() - ultGuardado > 15000) guardar();
    }
    function reloj() {
      const resto = limite - usados;
      if (resto <= 0) {
        lblReloj.textContent = "00:00";
        lblReloj.className = "reloj c-mal";
        entregar(true);
        return;
      }
      const hh = Math.floor(resto / 3600), mm = Math.floor((resto % 3600) / 60), ss = resto % 60;
      const p2 = (n) => String(n).padStart(2, "0");
      lblReloj.textContent = hh ? `${hh}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`;
      lblReloj.className = "reloj " + (resto <= 300 ? "c-mal" : resto <= 900 ? "c-aviso" : "");
    }
    const timer = setInterval(tick, 1000);
    // si se oculta la pestaña el tiempo sigue corriendo como en el examen real
    let ocultaDesde = null;
    const vis = () => {
      if (document.hidden) ocultaDesde = Date.now();
      else if (ocultaDesde) { usados += Math.max(0, Math.floor((Date.now() - ocultaDesde) / 1000) - 1); ocultaDesde = null; }
    };
    document.addEventListener("visibilitychange", vis);

    async function confirmarEntrega() {
      const blancos = Array.from({ length: nMain }, (_, k) => k).filter((k) => !(String(k) in resp)).length;
      let txt = `Has respondido ${Object.keys(resp).length} de ${items.length}.`;
      if (blancos) txt += `\n${blancos} del bloque principal quedan en blanco.`;
      if (marc.size) txt += `\nTienes ${marc.size} marcadas para revisar.`;
      if (await confirmar("Entregar", txt + "\n\n¿Entregar y corregir ahora?", { si: "Entregar", tipo: "aviso" })) entregar(false);
    }
    async function entregar(auto) {
      if (!activo) return;
      activo = false;
      clearInterval(timer);
      S.entregar(sid, resp, [...marc], usados);
      if (auto) await aviso("Tiempo agotado", "Se acabó el tiempo. El simulacro se ha entregado automáticamente.");
      A.ir("examenes", { sid, modo: "resultado" });
    }
    ctl.destruir = () => {
      document.removeEventListener("visibilitychange", vis);
      clearInterval(timer);
      if (activo) { activo = false; guardar(); }
    };
    ctl.teclas = (e) => {
      if (/^[a-dA-D]$/.test(e.key)) { elegirVis("ABCD".indexOf(e.key.toUpperCase())); return true; }
      if (e.key === "ArrowRight") { ir(i + 1); return true; }
      if (e.key === "ArrowLeft") { ir(i - 1); return true; }
      return false;
    };
    pintarPregunta();
    reloj();
  }

  // ================================================================ RESULTADO
  function resultado(main, sid) {
    const sim = S.cargar(sid);
    if (!sim) { A.ir("examenes"); return; }
    const r = sim.resumen || S.corregir(sim);
    const col = r.sobre10 >= 5 ? "ok" : "mal";
    main.append(el("div.fila", boton("← Simulacros", () => A.ir("examenes"), "fantasma"), el("h2", `Corrección · ${sim.titulo}`)));
    const prev = S.historial(30).filter((h) => Number(h.id) < Number(sid));
    const der = el("div.flex1",
      rico(`**✔ ${r.aciertos}** aciertos (+${num(r.aciertos * 0.5, 2)})   ·   **✘ ${r.fallos}** fallos (−${num(r.puntos_perdidos_fallos, 3)})   ·   **○ ${r.blancos}** en blanco\n` +
        `Tiempo: **${Math.floor((sim.segundos_usados || 0) / 60)} min** de ${Math.floor(sim.segundos_limite / 60)}. Puntúan ${r.n} preguntas.`));
    if (prev.length) {
      const d = r.sobre10 - ((prev[0].resumen || {}).sobre10 || 0);
      der.append(el("b.peq.c-" + (d >= 0 ? "ok" : "mal"), `${d >= 0 ? "▲" : "▼"} ${num(Math.abs(d), 2)} respecto al simulacro anterior`));
    }
    {
      // calibración: las marcadas son las dudas declaradas
      const marc = new Set(sim.marcadas || []);
      const md = r.detalle.filter((d) => d.cuenta && marc.has(d.i) && d.res !== "blanco");
      const nm = r.detalle.filter((d) => d.cuenta && !marc.has(d.i) && d.res !== "blanco");
      const okM = md.filter((d) => d.res === "acierto").length, okN = nm.filter((d) => d.res === "acierto").length;
      if (md.length || nm.length) {
        let txt = `🧠 Sin marcar (respondidas con seguridad): ${okN}/${nm.length} aciertos`;
        if (md.length) txt += ` · marcadas (con duda): ${okM}/${md.length}`;
        der.append(el("p.peq", txt));
        const fs = nm.length - okN;
        if (fs) der.append(el("p.peq.c-trampa", `${fs} fallo(s) sin marcar: respondiste sin dudar y no era. Son los que más cuestan; revísalos primero.`));
        if (md.length >= 5) der.append(el("p.suave.peq", md.length && okM / md.length > 0.2
          ? "Con tus dudas aciertas más del 20 %: en el examen te compensa contestarlas."
          : "Con tus dudas aciertas menos del 20 %: en el examen, déjalas en blanco."));
      }
    }
    if (r.fallos) der.append(el("p.suave.peq", `Si esas ${r.fallos} preguntas falladas las hubieras dejado en blanco, tendrías ${num(r.neta + r.puntos_perdidos_fallos, 2)} puntos.`));
    main.append(tarjeta("fila-opcion bg-" + col + "_bg",
      el("div", el("div.nota-grande.c-" + col, `${num(r.neta, 3)} / ${num(r.maximo, 0)}`), el("b.c-" + col, `puntos SERGAS  ·  ${num(r.sobre10, 2)} sobre 10`)),
      der));
    const pm = tarjeta("", el("h3", "Resultado por módulos"));
    for (const mod of Object.keys(r.por_modulo).sort((a, b) => a - b)) {
      const [a, f, b] = r.por_modulo[mod];
      const tot = a + f + b, pct = tot ? a / tot : 0;
      pm.append(el("div.fila-modulo",
        el("span.mod-tit", `M${mod} · ${A.c.modulo(Number(mod)).titulo.slice(0, 42)}`),
        barra(pct, pct >= 0.65 ? "ok" : pct >= 0.5 ? "aviso" : "mal"),
        el("span.suave.peq", `${num(pct * 100, 0)} %  ·  ✔ ${a}  ✘ ${f}  ○ ${b}`)));
    }
    main.append(pm);
    const fallos = r.detalle.filter((d) => d.res === "fallo").map((d) => d.q);
    main.append(el("div.fila.envuelve",
      fallos.length ? boton(`🔁 Repasar mis ${fallos.length} fallos ahora`, () => A.ir("repaso", { modo: "lista", ids: fallos }), "primario") : null,
      boton("Nuevo simulacro", () => A.ir("examenes"), "secundario")));
    main.append(el("h2", "Revisión pregunta a pregunta"));
    let filtro = fallos.length ? "Fallos" : "Todas", pagina = 0;
    main.append(segmentado(["Fallos", "En blanco", "Marcadas", "Aciertos", "Todas"], filtro, (v) => { filtro = v; pagina = 0; pintarLista(); }));
    const lista = el("div");
    main.append(lista);
    const marc = new Set(sim.marcadas || []);
    const letraVis = (it, letra) => (letra ? "ABCD"[it.orden.indexOf("ABCD".indexOf(letra))] : null);

    function pintarLista(scroll = false) {
      lista.replaceChildren();
      const f = { Fallos: (d) => d.res === "fallo", "En blanco": (d) => d.res === "blanco", Marcadas: (d) => marc.has(d.i), Aciertos: (d) => d.res === "acierto", Todas: () => true }[filtro];
      const ds = r.detalle.filter(f);
      const porPag = 15, pags = Math.max(1, Math.ceil(ds.length / porPag));
      pagina = Math.min(pagina, pags - 1);
      if (!ds.length) lista.append(el("p.suave", "No hay preguntas en este filtro."));
      for (const d of ds.slice(pagina * porPag, (pagina + 1) * porPag)) {
        const it = sim.items[d.i];
        const q = A.c.preguntas[d.q];
        if (!q) continue;
        const bg = { acierto: "ok_bg", fallo: "mal_bg", blanco: "panel", anulada: "panel2" }[d.res];
        const icono = { acierto: "✔", fallo: "✘", blanco: "○", anulada: "⛔" }[d.res];
        const colr = { acierto: "ok", fallo: "mal", blanco: "suave", anulada: "suave" }[d.res];
        const u = A.c.unidades[q.unidad];
        let txt = `Correcta: ${letraVis(it, q.correcta)}) ${limpia(q.opciones["ABCD".indexOf(q.correcta)])}`;
        if (d.elegida && d.res !== "acierto") txt = `Tu respuesta: ${letraVis(it, d.elegida)}) ${limpia(q.opciones["ABCD".indexOf(d.elegida)])}\n` + txt;
        lista.append(tarjeta("bg-" + bg,
          el("div.fila.envuelve",
            el("b.c-" + colr, `${icono}  ${it.num || d.i + 1}`),
            u ? chip(`M${u.modulo}·U${u.numero}`, "suave") : null,
            (q.origen || "").startsWith("SERGAS") ? chip(q.origen, "trampa", "trampa_bg") : null,
            it.reserva ? chip("reserva", "aviso", "aviso_bg") : null,
            el("span.flex1"),
            ["fallo", "blanco"].includes(d.res)
              ? boton("🔍 Entender el error", () => desglose(sim, d), "aviso")
              : boton("Ver explicación", () => desglose(sim, d), "fantasma")),
          el("p", q.enunciado),
          el("p.suave.peq.pre", txt)));
      }
      if (pags > 1) {
        lista.append(el("div.fila.centro",
          boton("← Anteriores", () => { pagina--; pintarLista(true); }, "secundario", { disabled: pagina === 0 }),
          el("span.suave.peq", `Página ${pagina + 1} de ${pags} · ${ds.length} preguntas`),
          boton("Siguientes →", () => { pagina++; pintarLista(true); }, "secundario", { disabled: pagina >= pags - 1 })));
      }
      if (scroll) lista.scrollIntoView({ block: "start" });
    }
    pintarLista();
  }
}

// ------------------------------------------------------------------ desglose
export function tarjetaCompacta(t) {
  const [nombre, col, bg] = TIPOS_TARJETA[t.tipo] || [t.tipo.toUpperCase(), "acento", "panel"];
  const caja = el("div.compacta.bg-" + (bg !== "panel" ? bg : "panel2"), el("div.tipo-tarjeta.c-" + col, nombre));
  if (t.titulo) caja.append(el("b", t.titulo));
  if (t.texto) caja.append(rico(t.texto));
  if (t.columnas) {
    caja.append(el("div.tabla-cont", el("table.tabla",
      el("thead", el("tr", t.columnas.map((c) => el("th", c)))),
      el("tbody", (t.filas || []).map((f) => el("tr", f.map((x) => el("td", String(x)))))))));
  }
  (t.nodos || []).forEach((n, k) => caja.append(el("div.peq", `${k ? "↓ " : ""}${n.t || ""}: ${n.d || ""}`)));
  if (t.ramas) {
    if (t.raiz) caja.append(el("b.c-acento.peq", t.raiz));
    for (const r of t.ramas) caja.append(el("div.peq", `• ${r.t}: ${(r.hijos || []).join("; ")}`));
  }
  return caja;
}

export function desglose(sim, d) {
  const it = sim.items[d.i];
  const q = A.c.preguntas[d.q];
  const dg = A.sim.diagnostico(d.q, d.elegida);
  const res = d.res;
  modal((cerrar) => {
    const cont = el("div.dialogo.desglose");
    cont.append(el("div.fila.entre",
      el("h2.c-" + { fallo: "mal", blanco: "suave", acierto: "ok", anulada: "suave" }[res],
        { fallo: "✘ Pregunta fallada", blanco: "○ Pregunta en blanco", acierto: "✔ Pregunta acertada", anulada: "⛔ Pregunta anulada" }[res]),
      boton("✕", cerrar, "fantasma")));
    const u = dg.unidad;
    cont.append(el("div.fila.envuelve",
      u ? chip(`M${u.modulo}·U${u.numero}  ${u.titulo.slice(0, 70)}`, "suave") : null,
      (q.origen || "").startsWith("SERGAS") ? chip(q.origen, "trampa", "trampa_bg") : null,
      q.respuesta_oficial ? chip("✔ Respuesta oficial SERGAS", "ok", "ok_bg") : null));
    const caja = tarjeta("", rico(q.enunciado, "enunciado"));
    it.orden.forEach((idx, pos) => {
      const letra = "ABCD"[idx];
      const cls = letra === q.correcta ? ".bien" : letra === d.elegida ? ".mal" : "";
      const pre = letra === q.correcta ? "✔ " : letra === d.elegida ? "✘ " : "";
      caja.append(el("div.opcion.estatica" + cls, `${pre}${"ABCD"[pos]})  ${limpia(q.opciones[idx])}`,
        idx !== pos ? el("span.orig", ` · ${letra} en el original`) : null));
    });
    cont.append(caja);
    let n = 1;
    const seccion = (titulo, col = "acento", bg = "panel") => {
      const f = tarjeta(bg !== "panel" ? "bg-" + bg : "", el("h3.c-" + col, `${n++}.  ${titulo}`));
      cont.append(f);
      return f;
    };
    if (res !== "acierto") {
      const f = seccion("Qué tipo de error ha sido", "violeta", "violeta_bg");
      for (const [t, x] of dg.causas) f.append(el("b.c-violeta", "▸ " + t), rico(x));
      if (dg.txt_tu) {
        const f2 = seccion(`Por qué no vale tu opción: «${dg.txt_tu}»`, "mal", "mal_bg");
        f2.append(rico(dg.sobre_tu || "Tu opción no responde a lo que pide el enunciado. Compárala con la correcta: la diferencia está en el dato clave que se explica en el punto siguiente."));
      }
    }
    const f3 = seccion(`Por qué la correcta es «${dg.txt_ok}»`, "ok", "ok_bg");
    f3.append(rico(q.explicacion_rapida || "Sin explicación disponible."));
    if (q.anulada && q.motivo_anulacion) f3.append(el("b.c-mal.peq", `⛔ Anulada por el tribunal: ${q.motivo_anulacion}`));
    const rec = q.recorte_teorico;
    if (rec && rec.texto) {
      const f4 = seccion("Lo que dice el libro", "azul", "azul_bg");
      f4.append(el("div.suave.peq.negrita", `📖 ${A.c.nombreLibro(rec.libro)}, pág. PDF ${rec.pagina ?? "?"}`), rico("«" + rec.texto + "»"));
    }
    if (dg.tarjeta) {
      const f5 = seccion("Dónde lo explica tu lección");
      f5.append(tarjetaCompacta(dg.tarjeta),
        boton(`Abrir la lección en esta tarjeta (${dg.tarjeta_idx + 1})`, () => { cerrar(); A.abrirLeccion(dg.leccion, dg.tarjeta_idx); }, "secundario"));
    }
    if (dg.trampa) {
      const f6 = seccion("Trampa de examen relacionada", "trampa", "trampa_bg");
      if (dg.trampa.titulo) f6.append(el("b", dg.trampa.titulo));
      f6.append(rico(dg.trampa.texto || ""));
    }
    const f7 = seccion("Tu historial con esto", "suave", "panel2");
    const lineas = [`Has respondido esta pregunta **${dg.veces}** veces y acertado **${dg.veces_ok}**.`];
    if (dg.pct_unidad !== null && u) lineas.push(`En la unidad M${u.modulo}·U${u.numero} llevas un **${num(dg.pct_unidad * 100, 0)} %** de acierto` +
      (dg.pct_unidad < 0.65 ? " (por debajo del 65 %: te saldrá una sesión de choque)." : "."));
    if (res === "fallo") lineas.push("Ya está en tu **cola de repaso**: volverá mañana y, si la vuelves a fallar, antes.");
    f7.append(rico(lineas.join("\n")));
    cont.append(el("div.fila.entre.pie-modal",
      u ? boton("Practicar ahora esta unidad", () => { cerrar(); A.ir("repaso", { modo: "choque", unidad: u.id }); }, "primario") : el("span"),
      boton("Cerrar", cerrar, "secundario")));
    return cont;
  }, { ancho: 960 });
}

export { verRecorte };
