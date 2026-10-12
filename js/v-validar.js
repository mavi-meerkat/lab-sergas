// Vistas «Por validar» y «Ajustes».
import { A } from "./ctx.js";
import { el, boton, chip, tarjeta, segmentado, confirmar, aviso, toast } from "./ui.js";
import { ESTADOS_VALIDACION, necesitaValidar, kvDel } from "./content.js";
import { verRecorte } from "./pregunta.js";
import { abrirImprimible } from "./v-leccion.js";
import { esc, parseFechaEs, fechaEs } from "./util.js";

const POR_PAGINA = 15;

export function vistaValidar(main, { filtro = "pendientes", pagina = 0, qid = null } = {}) {
  const V = A.c.validaciones;
  const ctl = { nombre: "validar", refrescarRemoto: !qid };
  if (qid) detalle(qid); else lista();
  return ctl;

  function ids() {
    const t = V.lista();
    if (filtro === "pendientes") return t.filter((q) => ["pendiente", "dudosa"].includes(V.estado(q)));
    if (filtro === "validadas") return t.filter((q) => ["confirmada", "corregida"].includes(V.estado(q)));
    return t;
  }
  function lista() {
    const todas = V.lista();
    const pend = todas.filter((q) => ["pendiente", "dudosa"].includes(V.estado(q))).length;
    main.append(el("div.fila.entre.envuelve", el("h1", "Por validar"), boton("📄 Hoja para el profesional (PDF)", exportar, "secundario")),
      el("p.suave.intro", `Preguntas cuya respuesta no aparece en tus libros (⚠) o que has enviado a revisión (🚩). Llévalas a un profesional, marca la respuesta correcta y la app la aplicará en tus repasos.  Pendientes: ${pend} de ${todas.length}.`),
      segmentado(["Pendientes", "Validadas", "Todas"], filtro[0].toUpperCase() + filtro.slice(1), (x) => A.ir("validar", { filtro: x.toLowerCase() })));
    const lst = ids();
    if (!lst.length) { main.append(el("p.suave", "No hay preguntas en esta lista. 🎉")); return; }
    const npag = Math.max(1, Math.ceil(lst.length / POR_PAGINA));
    pagina = Math.min(pagina, npag - 1);
    const colores = { pendiente: ["aviso", "aviso_bg"], dudosa: ["mal", "mal_bg"], confirmada: ["ok", "ok_bg"], corregida: ["ok", "ok_bg"] };
    for (const id of lst.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)) {
      const q = A.c.preguntas[id];
      const est = V.estado(id);
      const [col, bg] = colores[est];
      main.append(tarjeta("fila-opcion",
        el("div.flex1",
          el("div.fila.envuelve", chip((q.unidad || "").replace("_", "·"), "suave"), chip(q.origen || "libro", "trampa", "trampa_bg"), chip(ESTADOS_VALIDACION[est], col, bg)),
          el("p", q.enunciado.length < 170 ? q.enunciado : q.enunciado.slice(0, 167) + "…")),
        boton("Revisar", () => A.ir("validar", { filtro, pagina, qid: id }), "primario")));
    }
    if (npag > 1) {
      main.append(el("div.fila.centro",
        boton("← Anterior", () => A.ir("validar", { filtro, pagina: pagina - 1 }), "secundario", { disabled: pagina === 0 }),
        el("span.suave.peq", `Página ${pagina + 1} de ${npag}`),
        boton("Siguiente →", () => A.ir("validar", { filtro, pagina: pagina + 1 }), "secundario", { disabled: pagina >= npag - 1 })));
    }
  }

  function detalle(id) {
    const q = A.c.preguntas[id];
    const dat = V.datos()[id] || {};
    const est = V.estado(id);
    const orig = q._correcta_original;
    main.append(el("div.fila.entre", boton("← Volver a la lista", () => A.ir("validar", { filtro, pagina }), "fantasma"), el("b.suave.peq", `${q.origen || "libro"}  ·  ${id}`)));
    const u = A.c.unidades[q.unidad];
    if (u) main.append(el("p.suave.peq", `M${u.modulo}·U${u.numero}  ${u.titulo}`));
    main.append(el("h2", q.enunciado));
    q.opciones.forEach((op, i) => {
      const letra = "ABCD"[i];
      let marca = "", bg = "";
      if (letra === orig) { marca = "   ← respuesta propuesta"; bg = "bg-aviso_bg"; }
      if (est === "corregida" && letra === q.correcta) { marca = "   ← corregida por profesional"; bg = "bg-ok_bg"; }
      main.append(tarjeta(bg, el("span", op + marca)));
    });
    const expl = (q.explicacion_rapida || "").replace(/\*\*(.+?)\*\*/g, "$1").replace("[ALERTA: Concepto ausente en el temario base. Indica fuente alternativa]", "").trim();
    main.append(tarjeta("bg-panel2", el("b", "Por qué se propone esta respuesta"), el("p", expl)));
    if (q.recorte_teorico) main.append(boton("📖  Ver lo que dice el libro", () => verRecorte(q.recorte_teorico), "secundario"));
    let letra = dat.correcta || q.correcta;
    const quien = el("input.entrada.ancho", { placeholder: "Quién lo ha revisado (nombre, puesto)", value: dat.quien || "" });
    const nota = el("input.entrada.ancho", { placeholder: "Fuente o comentario (ley, guía, manual…)", value: dat.nota || "" });
    const form = tarjeta("",
      el("h3", "Resultado de la consulta"),
      el("div.fila.envuelve", el("span", "Respuesta correcta según el profesional:"), segmentado(["A", "B", "C", "D"], letra, (v) => (letra = v))),
      quien, nota,
      el("div.fila.envuelve",
        boton("✔ Guardar como validada", () => guardar(null), "ok"),
        boton("? Dudosa, consultar más", () => guardar("dudosa"), "aviso"),
        el("span.flex1"),
        !necesitaValidar(q) && id in V.datos() ? boton("Quitar de la lista", () => { V.quitar(id); A.actualizarNav(); A.ir("validar", { filtro, pagina }); }, "secundario") : null),
      dat.fecha ? el("p.suave.peq", `Última revisión: ${dat.fecha} · ${ESTADOS_VALIDACION[est]}`) : null);
    main.append(form);

    async function guardar(forzar) {
      const l = letra || orig;
      if (forzar === "dudosa") V.guardar(id, "dudosa", l, nota.value, quien.value);
      else {
        V.guardar(id, l === orig ? "confirmada" : "corregida", l, nota.value, quien.value);
        if (l !== orig) await aviso("Respuesta corregida", `A partir de ahora la respuesta correcta de esta pregunta es la ${l} (antes ${orig}). Se aplica en el Profesor y en tus repasos.`);
      }
      A.actualizarNav();
      A.ir("validar", { filtro, pagina });
    }
  }

  function exportar() {
    const lst = V.pendientes();
    if (!lst.length) { aviso("Por validar", "No hay preguntas pendientes."); return; }
    const filas = lst.map((id, k) => {
      const q = A.c.preguntas[id];
      const u = A.c.unidades[q.unidad];
      const expl = (q.explicacion_rapida || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[ALERTA:[^\]]*\]/, "").trim();
      return `<div class="q"><div class="cab">${k + 1}. ${esc(q.origen || "libro")} · ${esc(id)}${u ? ` · M${u.modulo}·U${u.numero} ${esc(u.titulo)}` : ""}</div>
        <div class="en">${esc(q.enunciado)}</div><ol>${q.opciones.map((o) => `<li>${esc(o)}${o[0] === q._correcta_original ? " <b>← propuesta</b>" : ""}</li>`).join("")}</ol>
        <div class="ex"><b>Motivo de la propuesta:</b> ${esc(expl)}</div>
        <div class="resp">Respuesta correcta: &nbsp; A &nbsp; B &nbsp; C &nbsp; D &nbsp;&nbsp;&nbsp; Fuente / comentario: ______________________________________</div></div>`;
    }).join("");
    abrirImprimible(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisión de respuestas · LAB SERGAS</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;margin:0;color:#222}.doc{padding:12mm}.barra{background:#0F6E66;color:#fff;padding:10px 16px}
.barra button{font:600 15px system-ui;padding:8px 16px;border:0;border-radius:8px}@media print{.barra{display:none}}
h1{color:#0a8a3c;font-size:18pt}.q{break-inside:avoid;border-bottom:1px solid #ccc;padding:3mm 0}.cab{color:#0a8a3c;font-weight:700;font-size:9.5pt}
.en{font-weight:700;margin:1mm 0}ol{list-style:none;padding-left:0;margin:1mm 0}.ex{font-size:9.5pt;color:#555}.resp{margin-top:2mm;font-size:10pt}</style></head><body>
<div class="barra"><button onclick="print()">🖨️ Imprimir / Guardar como PDF</button></div><div class="doc">
<h1>Revisión de respuestas — Oposición TSLCB SERGAS</h1><p>Respuestas que no aparecen en los manuales de estudio. Marque la correcta e indique la fuente, por favor. Gracias.</p>${filas}</div></body></html>`);
  }
}

// ======================================================================== AJUSTES
export function vistaAjustes(main) {
  const p = A.p;
  main.append(el("h1", "Ajustes"));
  const fila = (titulo, desc, ...ctrl) => main.append(tarjeta("fila-opcion", el("div.flex1", el("h3", titulo), el("p.suave.peq", desc)), el("div.fila.envuelve", ...ctrl)));

  const fe = el("input.entrada.fecha", { placeholder: "dd/mm/aaaa", value: fechaEs(p.get("fecha_examen")) });
  fila("Fecha del examen", "El plan diario se ajusta solo a los días que quedan.", fe,
    boton("Guardar", () => {
      const v = fe.value.trim();
      if (!v) { A.m.setFechaExamen(null); toast("Fecha borrada"); }
      else {
        const iso = parseFechaEs(v);
        if (!iso) { toast("Fecha no válida (dd/mm/aaaa)"); return; }
        A.m.setFechaExamen(iso); toast("Fecha guardada");
      }
      A.pintarFecha && A.pintarFecha();
    }, "secundario"));

  const e1 = el("input.entrada.corta", { type: "number", min: 5, value: p.get("pomo_estudio", 50) });
  const e2 = el("input.entrada.corta", { type: "number", min: 1, value: p.get("pomo_descanso", 10) });
  fila("Pomodoro", "Minutos de estudio y de descanso.", e1, el("span", " / "), e2,
    boton("Guardar", () => {
      const a = parseInt(e1.value, 10), b = parseInt(e2.value, 10);
      if (!isNaN(a) && !isNaN(b)) { p.set("pomo_estudio", Math.max(5, a)); p.set("pomo_descanso", Math.max(1, b)); A.pomoReset(); toast("Pomodoro guardado"); }
    }, "secundario"));
  fila("Tamaño de los micro-bloques", "Preguntas por sesión en el Modo Tutor.",
    segmentado(["10", "15"], String(p.get("tam_sesion", 10)), (v) => p.set("tam_sesion", Number(v))));
  fila("Apariencia", "Claro u oscuro.",
    segmentado(["Claro", "Oscuro"], p.get("tema", "Light") === "Dark" ? "Oscuro" : "Claro", (v) => A.cambiarTema(v === "Oscuro" ? "Dark" : "Light")));
  fila("Velocidad de la clase en audio", "Velocidad por defecto del modo clase.",
    segmentado(["1×", "1,25×", "1,5×"], { 1: "1×", 1.25: "1,25×", 1.5: "1,5×" }[Number(p.get("clase_vel", 1.25))] || "1×",
      (v) => p.set("clase_vel", { "1×": 1, "1,25×": 1.25, "1,5×": 1.5 }[v])));

  const estAudio = el("span.suave.peq", "");
  const bAudio = boton("Descargar audios", () => A.descargarAudios(estAudio, bAudio), "secundario");
  fila("Audios sin conexión", "Guarda en este dispositivo las 58 clases en audio (unos 125 MB) para escucharlas sin internet. Si no, se descargan al escucharlas.", bAudio, estAudio);
  A.estadoAudios && A.estadoAudios(estAudio);

  fila("Cuenta", `Sesión iniciada como ${A.usuario || "?"}. El progreso se sincroniza entre el ordenador y la tablet.`,
    el("span.peq" + (A.p.sincronizado ? ".c-ok" : ".c-aviso"), A.p.sincronizado ? "● Sincronizado" : "● Sin conexión (se sincroniza al volver)"),
    boton("Cerrar sesión", () => A.cerrarSesion(), "secundario"));

  fila("Copia de seguridad", "Descarga todo tu progreso en un archivo (por si acaso).",
    boton("Descargar copia", async () => {
      const datos = await p.exportar();
      const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: "application/json" })), download: `lab-sergas-progreso-${p.hoy()}.json` });
      document.body.append(a); a.click(); a.remove();
    }, "secundario"));

  fila("Actualizar el contenido", "Vuelve a descargar las lecciones y preguntas (si he publicado cambios).",
    boton("Buscar actualización", async () => { await kvDel("contenido"); location.reload(); }, "secundario"));

  fila("Borrar todo el progreso", "Empieza de cero. No se puede deshacer.",
    boton("Borrar", async () => {
      if (await confirmar("Borrar progreso", "¿Seguro? Se perderán todas tus respuestas y lecciones (en todos tus dispositivos).", { si: "Borrar todo", tipo: "mal" })) {
        await p.borrarTodo();
        A.ir("inicio");
      }
    }, "mal"));

  main.append(el("p.suave.peq", `Contenido cargado: ${Object.keys(A.c.lecciones).length} lecciones · ${Object.keys(A.c.preguntas).length} preguntas · ${Object.keys(A.c.unidades).length} unidades del temario oficial.`));
  return { nombre: "ajustes" };
}
