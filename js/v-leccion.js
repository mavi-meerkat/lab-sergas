// Vista Lección (modo Profesor): tarjetas guiadas, modo clase con audio y resumen imprimible.
import { A, TIPOS_TARJETA } from "./ctx.js";
import { el, boton, tarjeta, rico, barra, segmentado, aviso } from "./ui.js";
import { bloquePregunta, verRecorte } from "./pregunta.js";
import { esc, md, mdInline } from "./util.js";

export function audioUrl(hash) { return `audio/${hash}.ogg`; }

export function vistaLeccion(main, { lid, inicio = null }) {
  const { c, p } = A;
  const lec = c.lecciones[lid];
  const u = c.unidades[lid];
  const orig = [];
  lec.tarjetas.forEach((t, k) => { if (!["comprobacion", "examen"].includes(t.tipo) || t.pregunta in c.preguntas) orig.push(k); });
  const tarjetas = orig.map((k) => lec.tarjetas[k]);
  const guion = c.audio[lid] || null;
  const guardada = p.leccion(lid);
  let i = guardada.completada ? 0 : Math.min(guardada.tarjeta, tarjetas.length - 1);
  if (inicio !== null) i = Math.max(0, Math.min(inicio, tarjetas.length - 1));
  const resueltas = new Set();
  let bloqueActual = null;

  // ---------------- audio (modo clase)
  const audio = new Audio();
  audio.preload = "auto";
  let clase = false, sonando = null, pausado = null, timerAvance = null;
  let vel = Number(p.get("clase_vel", 1.25));

  // ---------------- cabecera
  const lblN = el("span.suave.peq");
  const bClase = guion ? boton("🎧 Escuchar la clase", () => (clase ? claseParar() : claseEmpezar()), "primario") : null;
  const mod = c.modulo(u.modulo);
  main.append(el("div.cab-leccion",
    boton("← Ruta", () => A.ir("profesor"), "fantasma"),
    el("div.flex1",
      el("div.suave.peq", `Módulo ${u.modulo} · ${mod.titulo}  ·  Unidad ${u.numero}`),
      el("h2", lec.titulo || u.titulo)),
    el("div.fila.envuelve.derecha", bClase, boton("📄 Resumen PDF", () => imprimirResumen(lid), "secundario"), lblN)));
  const barraProg = el("div.barra-cont");
  main.append(barraProg);

  const bPP = boton("⏸", () => clasePP(), "primario cuadrado");
  const lblClase = el("span.suave.peq.flex1");
  const barraClase = el("div.barra-clase.oculto",
    bPP, el("b.c-azul", "🎧 Modo clase"), lblClase,
    el("span.suave.peq", "Velocidad"),
    segmentado(["1×", "1,25×", "1,5×"], { 1: "1×", 1.25: "1,25×", 1.5: "1,5×" }[vel] || "1×", (v) => {
      vel = { "1×": 1, "1,25×": 1.25, "1,5×": 1.5 }[v];
      p.set("clase_vel", vel);
      audio.playbackRate = vel;
    }),
    boton("⏹ Salir", () => claseParar(), "secundario"));
  main.append(barraClase);

  const zona = el("div.zona-tarjetas");
  main.append(zona);
  const bAnt = boton("← Anterior", () => ant(), "secundario");
  const bSig = boton("Siguiente →", () => sig(), "primario");
  const lblAviso = el("span.suave.peq.flex1.derecha-txt");
  main.append(el("div.pie-leccion", bAnt, lblAviso, bSig));

  const bloqueada = () => tarjetas[i].tipo === "comprobacion" && !resueltas.has(i);
  function ant() { if (i > 0) { i--; pintar(); } }
  function sig() {
    if (bloqueada()) { lblAviso.textContent = "Responde la pregunta para seguir"; return; }
    if (i < tarjetas.length - 1) {
      i++;
      p.guardarLeccion(lid, i);
      pintar();
    } else final();
  }

  function pintar() {
    clearTimeout(timerAvance);
    zona.replaceChildren();
    bloqueActual = null;
    const n = tarjetas.length;
    lblN.textContent = `Tarjeta ${i + 1} de ${n}`;
    barraProg.replaceChildren(barra((i + 1) / n));
    bAnt.disabled = i === 0;
    bSig.disabled = false;
    bSig.textContent = i === n - 1 ? "Terminar lección ✓" : "Siguiente →";
    lblAviso.textContent = "";
    if (i === 0 && lec.objetivos && lec.objetivos.length) {
      zona.append(tarjeta("bg-panel2", el("div.c-acento.negrita.peq", "En esta lección vas a aprender"),
        rico(lec.objetivos.map((o) => "- " + o).join("\n"))));
    }
    zona.append(pintarTarjeta(tarjetas[i]));
    window.scrollTo({ top: 0 });
    A.main.scrollTop = 0;
    if (clase) sonar(String(orig[i]));
  }

  function pintarTarjeta(t) {
    const tipo = t.tipo;
    const [nombre, col, bg] = TIPOS_TARJETA[tipo] || [tipo.toUpperCase(), "acento", "panel"];
    const caja = tarjeta("tarjeta-leccion" + (bg !== "panel" ? " bg-" + bg : ""));
    caja.append(el("div.tipo-tarjeta.c-" + col, nombre));
    if (t.titulo) caja.append(el("h2.titulo-tarjeta", t.titulo));
    if (t.texto) caja.append(rico(t.texto, "grande"));
    if (tipo === "esquema") caja.append(esquema(t));
    if (tipo === "tabla" || t.tabla) caja.append(tabla(t.tabla || t));
    if (tipo === "ejercicio") caja.append(ejercicio(t));
    if (tipo === "comprobacion" || tipo === "examen") {
      const qid = t.pregunta;
      if (qid in c.preguntas) {
        const idx = i;
        bloqueActual = bloquePregunta(qid, {
          contexto: "profesor",
          onFin: () => { resueltas.add(idx); if (idx === i) sig(); },
          onRespuesta: () => { if (clase) sonar(`${orig[i]}_tras`); },
        });
        caja.append(bloqueActual);
      } else resueltas.add(i);
    }
    if (t.nota) caja.append(el("p.suave.peq", t.nota));
    const rec = t.recorte;
    if (rec) {
      caja.append(el("div.recorte",
        el("div.suave.peq.negrita", `📖  Del libro · ${c.nombreLibro(rec.libro)}, pág. PDF ${rec.pagina ?? "?"}`),
        rec.texto ? rico("«" + rec.texto + "»") : null));
    }
    return caja;
  }

  function esquema(t) {
    const cont = el("div.esquema");
    if ((t.estilo || "flujo") === "flujo") {
      (t.nodos || []).forEach((n, k) => {
        cont.append(el("div.nodo", el("div.nodo-t", n.t), n.d ? rico(n.d) : null));
        if (k < t.nodos.length - 1) cont.append(el("div.flecha", "↓"));
      });
    } else {
      if (t.raiz) cont.append(el("div.raiz", t.raiz));
      cont.append(el("div.ramas", (t.ramas || []).map((r) => el("div.rama", el("div.nodo-t", r.t), el("ul", (r.hijos || []).map((h) => el("li", h)))))));
    }
    return cont;
  }
  function tabla(t) {
    const cols = t.columnas || [], filas = t.filas || [];
    if (!cols.length) return null;
    return el("div.tabla-cont", el("table.tabla",
      el("thead", el("tr", cols.map((cn) => el("th", cn)))),
      el("tbody", filas.map((f) => el("tr", f.map((celda) => el("td", { html: mdInline(String(celda)) })))))));
  }
  function ejercicio(t) {
    const ent = el("input.entrada", { placeholder: "Tu resultado", inputmode: "decimal" });
    const res = el("b");
    const sol = el("div");
    const verSol = () => sol.replaceChildren(tarjeta("bg-panel", rico("**Solución paso a paso**\n" + (t.solucion || ""))));
    const comprobar = () => {
      let ok;
      const v = parseFloat(ent.value.replace(",", ".").trim());
      const obj = parseFloat(t.respuesta);
      if (!isNaN(v) && !isNaN(obj)) {
        const tol = t.tolerancia !== undefined ? parseFloat(t.tolerancia) : Math.abs(obj) * 0.02 || 0.01;
        ok = Math.abs(v - obj) <= tol;
      } else ok = ent.value.trim().toLowerCase() === String(t.respuesta ?? "").toLowerCase();
      res.textContent = ok ? "✔ Correcto" : "✘ Revisa el cálculo";
      res.className = ok ? "c-ok" : "c-mal";
      if (ok) verSol();
    };
    ent.addEventListener("keydown", (e) => { if (e.key === "Enter") comprobar(); });
    return el("div",
      el("div.fila.envuelve", ent, t.unidad_resultado ? el("span", " " + t.unidad_resultado) : null,
        boton("Comprobar", comprobar, "primario"), boton("Ver solución", verSol, "secundario"), res),
      sol);
  }

  function final() {
    if (clase) claseParar();
    p.guardarLeccion(lid, 0, true);
    zona.replaceChildren();
    const hechas = p.leccionesCompletadas();
    const sigU = c.ruta().find((x) => x.id in c.lecciones && !hechas.has(x.id));
    zona.append(tarjeta("bg-ok_bg",
      el("h2.c-ok", "🎉  Lección completada"),
      el("p", "Las preguntas de comprobación ya están en tu repetición espaciada: el algoritmo te las volverá a traer justo antes de que se te olviden."),
      lec.resumen ? rico("**Para llevarte:**\n" + lec.resumen.map((x) => "- " + x).join("\n")) : null,
      el("div.fila.envuelve",
        sigU ? boton(`Siguiente: ${sigU.titulo.slice(0, 50)} →`, () => A.abrirLeccion(sigU.id), "primario") : null,
        boton("Volver al inicio", () => A.ir("inicio"), "secundario"),
        boton("📄 Resumen PDF", () => imprimirResumen(lid), "secundario"))));
    bSig.disabled = true;
    bAnt.disabled = true;
    barraProg.replaceChildren(barra(1));
  }

  // ---------------- modo clase
  const esPregunta = () => (guion && guion.p.includes(String(orig[i]))) || ["comprobacion", "examen"].includes(tarjetas[i].tipo);
  function claseEmpezar() {
    clase = true;
    bClase.textContent = "⏹ Parar la clase";
    barraClase.classList.remove("oculto");
    sonar(String(orig[i]));
  }
  function sonar(clave) {
    if (!clase) return;
    clearTimeout(timerAvance);
    const hash = guion && guion.a[clave];
    sonando = null;
    if (!hash) {
      audio.pause();
      lblClase.textContent = "Esta tarjeta no tiene explicación en audio";
      if (!clave.includes("_") && !esPregunta()) avanzarLuego();
      return;
    }
    audio.src = audioUrl(hash);
    audio.playbackRate = vel;
    audio.play().then(() => {
      sonando = clave;
      bPP.textContent = "⏸";
      lblClase.textContent = clave.includes("_") ? "Comentando la respuesta…" : `Explicando la tarjeta ${i + 1} de ${tarjetas.length}`;
    }).catch((e) => {
      console.warn(e);
      if (sonando === clave) sonando = null;
      lblClase.textContent = navigator.onLine ? "No se pudo reproducir este audio" : "Sin conexión: este audio no está descargado";
    });
    sonando = clave;
  }
  audio.addEventListener("ended", () => {
    if (!clase || !sonando) return;
    const clave = sonando;
    sonando = null;
    if (clave.includes("_tras")) lblClase.textContent = "Cuando quieras, pulsa Continuar o valora la pregunta";
    else if (esPregunta()) lblClase.textContent = "⏸ Esperando tu respuesta…";
    else avanzarLuego();
  });
  function avanzarLuego() {
    const iAhora = i;
    timerAvance = setTimeout(() => {
      if (clase && i === iAhora && !sonando) {
        if (i < tarjetas.length - 1) sig();
        else { lblClase.textContent = "Fin de la clase"; claseParar(); }
      }
    }, 700);
  }
  function clasePP() {
    if (!audio.paused) {
      audio.pause();
      bPP.textContent = "▶";
      pausado = sonando;
      sonando = null;
      lblClase.textContent = "En pausa";
    } else {
      sonando = pausado || String(orig[i]);
      audio.play().catch(() => {});
      bPP.textContent = "⏸";
      lblClase.textContent = `Explicando la tarjeta ${i + 1} de ${tarjetas.length}`;
    }
  }
  function claseParar() {
    clase = false;
    sonando = null;
    clearTimeout(timerAvance);
    audio.pause();
    barraClase.classList.add("oculto");
    if (bClase) bClase.textContent = "🎧 Escuchar la clase";
  }

  pintar();
  return {
    nombre: "leccion",
    destruir: () => { claseParar(); audio.src = ""; },
    teclas: (e) => {
      if (e.key === "ArrowRight") { sig(); return true; }
      if (e.key === "ArrowLeft") { ant(); return true; }
      if (bloqueActual && /^[a-dA-D]$/.test(e.key) && bloqueActual.elegirVisible) {
        bloqueActual.elegirVisible("ABCD".indexOf(e.key.toUpperCase()));
        return true;
      }
      return false;
    },
  };
}

// ------------------------------------------------------------------ resumen para imprimir / PDF
const CSS_RESUMEN = `
@page { size: A4 landscape; margin: 14mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: #222; font-family: Cambria, Georgia, "Times New Roman", serif; font-size: 10.6pt; line-height: 1.5; }
.barra-imp { font-family: system-ui, sans-serif; background: #0F6E66; color: #fff; padding: 10px 16px; display: flex; gap: 12px; align-items: center; }
.barra-imp button { font: 600 15px system-ui; padding: 8px 16px; border-radius: 8px; border: 0; cursor: pointer; }
@media print { .barra-imp { display: none; } }
.doc { padding: 8mm; }
.portada { text-align: center; column-span: all; margin-bottom: 4mm; }
.tema { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #6b6b6b; font-size: 22pt; margin: 0 0 3mm; }
.modulo { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #0a8a3c; font-weight: 700; font-size: 17pt; text-transform: uppercase; }
.titulo { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #0a8a3c; font-size: 14.5pt; margin: 1mm 0 4mm; }
.ficha { background: #efefef; padding: 3mm 6mm; margin: 0 auto 2mm; max-width: 170mm; }
.cols { column-count: 2; column-gap: 12mm; }
@media (max-width: 700px) { .cols { column-count: 1; } }
h2 { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #0a8a3c; font-style: italic; font-size: 12pt; margin: 5mm 0 2mm; padding-bottom: 1mm; border-bottom: 1.2px solid #9a9a9a; break-after: avoid; }
h3 { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #555; font-style: italic; font-size: 11pt; margin: 4mm 0 1.5mm; border-bottom: 1px solid #c4c4c4; }
p { margin: 0 0 2mm; text-align: justify; }
ul { margin: 0 0 2mm; padding-left: 4.5mm; }
li { margin: 0 0 1mm; }
.gris { background: #efefef; padding: 3mm 4mm; margin: 2mm 0 3mm; break-inside: avoid; }
.recuerda { background: #d9e8d2; padding: 3mm 4mm; margin: 2mm 0 3mm; break-inside: avoid; }
.et { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-weight: 700; color: #0a8a3c; margin-bottom: 1mm; }
.ojo { background: #fbe9d7; } .ojo .et { color: #b5530d; }
.cita { font-size: 8.6pt; color: #777; font-style: italic; margin: -1mm 0 2.5mm; }
table { width: 100%; border-collapse: collapse; margin: 1mm 0 3mm; font-size: 9.4pt; font-family: Calibri, "Segoe UI", Arial, sans-serif; line-height: 1.3; }
th { color: #0a8a3c; text-align: left; padding: 1.4mm 2mm; border-top: 1.5px solid #0a8a3c; border-bottom: 1.5px solid #0a8a3c; }
tr { break-inside: avoid; }
td { padding: 1.4mm 2mm; border-bottom: 1px solid #0a8a3c; vertical-align: top; }
td:not(:first-child) { color: #0a7a35; font-style: italic; font-weight: 600; }
.nodo { break-inside: avoid; border-radius: 3mm; padding: 2mm 3mm; font-family: Calibri, "Segoe UI", Arial, sans-serif; }
.nodo .t { font-weight: 700; } .nodo .d { font-size: 9.2pt; }
.flecha { text-align: center; color: #0a8a3c; margin: .6mm 0; }
.raiz { background: #0a8a3c; color: #fff; font-weight: 700; text-align: center; padding: 2mm; border-radius: 2mm; font-family: Calibri, Arial, sans-serif; }
.rejilla { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; margin: 2mm 0 3mm; }
.rama { background: #d9e8d2; padding: 2mm 3mm; border-radius: 1.5mm; font-size: 9.2pt; text-align: center; font-family: Calibri, Arial, sans-serif; }
.rama .t { font-weight: 700; color: #1f4d2b; }
.preg { break-inside: avoid; margin: 0 0 3mm; font-size: 9.8pt; }
.preg .en { font-weight: 700; } .preg .orig { font-family: Calibri, Arial, sans-serif; font-size: 8.5pt; color: #0a8a3c; font-weight: 700; }
.preg ol { margin: 0; padding-left: 0; list-style: none; }
.pie { column-span: all; text-align: center; font-size: 8pt; color: #999; margin-top: 6mm; }
`;
const VERDES = ["#0a8a3c", "#3aa45f", "#6dbb84", "#8fcb9f", "#a9d6b4"];

export function htmlResumen(lid) {
  const { c } = A;
  const lec = c.lecciones[lid], u = c.unidades[lid], mod = c.modulo(u.modulo);
  let n = 0;
  const cuerpo = [], preguntas = [];
  const seccion = (t) => `<h2>${u.numero}.${++n} ${esc(t)}</h2>`;
  const cita = (r) => (r ? `<div class="cita">Fuente: manual ${esc(r.libro || "")}, pág. ${r.pagina ?? ""}</div>` : "");
  const tabla = (t) => `<table><thead><tr>${(t.columnas || []).map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>` +
    (t.filas || []).map((f) => "<tr>" + f.map((x) => `<td>${mdInline(String(x))}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
  const flujo = (t) => {
    const ns = t.nodos || [];
    return ns.map((nd, k) => {
      const col = ns.length <= 5 ? VERDES[Math.min(k, 4)] : VERDES[k % 2];
      const txt = k < 2 || ns.length > 5 ? "#fff" : "#14361f";
      return `<div class="nodo" style="background:${col};color:${txt}"><div class="t">${mdInline(nd.t || "")}</div>${nd.d ? `<div class="d">${mdInline(nd.d)}</div>` : ""}</div>` +
        (k < ns.length - 1 ? '<div class="flecha">▼</div>' : "");
    }).join("");
  };
  const ramas = (t) => `<div class="raiz">${mdInline(t.raiz || "")}</div><div class="rejilla">` +
    (t.ramas || []).map((r) => `<div class="rama"><div class="t">${mdInline(r.t || "")}</div>${(r.hijos || []).map((h) => `<div>${mdInline(h)}</div>`).join("")}</div>`).join("") + "</div>";
  for (const t of lec.tarjetas) {
    const tit = t.titulo || "";
    if (["concepto", "explicacion"].includes(t.tipo)) cuerpo.push(seccion(tit) + md(t.texto) + cita(t.recorte));
    else if (t.tipo === "tabla") cuerpo.push(seccion(tit) + tabla(t) + (t.nota ? md(t.nota) : "") + cita(t.recorte));
    else if (t.tipo === "esquema") cuerpo.push(seccion(tit) + (t.estilo === "ramas" ? ramas(t) : flujo(t)) + (t.nota ? md(t.nota) : "") + cita(t.recorte));
    else if (t.tipo === "mnemotecnia") cuerpo.push(`<div class="recuerda"><div class="et">¡Recuerda! · ${esc(tit)}</div>${md(t.texto)}</div>`);
    else if (t.tipo === "trampa") cuerpo.push(`<div class="recuerda ojo"><div class="et">¡Ojo en el examen! · ${esc(tit)}</div>${md(t.texto)}</div>`);
    else if (t.tipo === "ejercicio") cuerpo.push(`<div class="gris"><div class="et">Ejercicio resuelto · ${esc(tit)}</div>${md(t.texto)}<p><b>Solución:</b></p>${md(t.solucion)}</div>`);
    else if (["examen", "comprobacion"].includes(t.tipo)) {
      const q = c.preguntas[t.pregunta];
      if (q && !preguntas.includes(q)) preguntas.push(q);
    }
  }
  if (lec.resumen) cuerpo.push(`<div class="recuerda"><div class="et">Lo esencial de este tema</div><ul>${lec.resumen.map((x) => `<li>${mdInline(x)}</li>`).join("")}</ul></div>`);
  if (preguntas.length) {
    cuerpo.push(`<h2>${u.numero}.${n + 1} Preguntas para practicar</h2>`);
    preguntas.forEach((q, k) => {
      const et = (q.origen || "").startsWith("SERGAS") ? "Examen " + q.origen : "Comprobación del manual";
      cuerpo.push(`<div class="preg"><div class="orig">${k + 1}. ${esc(et)}</div><div class="en">${esc(q.enunciado)}</div><ol>${q.opciones.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></div>`);
    });
    cuerpo.push("<h3>Soluciones</h3>" + preguntas.map((q, k) => {
      const exp = (q.explicacion_rapida || "").replace(/^\[ALERTA:[^\]]*\]\s*/, "").trim();
      return `<p><b>${k + 1}. ${esc(q.correcta)}</b>${q.alerta ? " <i>(respuesta propuesta: no está en el manual)</i>" : ""} — ${esc(exp)}</p>`;
    }).join(""));
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tema ${u.numero} · ${esc(u.titulo)}</title><style>${CSS_RESUMEN}</style></head><body>
<div class="barra-imp"><button onclick="print()">🖨️ Imprimir / Guardar como PDF</button><span>En «Destino» elige «Guardar como PDF».</span></div>
<div class="doc"><div class="cols"><div class="portada"><div class="tema">TEMA ${u.numero}</div><div class="modulo">${esc(mod.titulo)}</div>
<div class="titulo">${esc(lec.titulo || u.titulo)}</div><div class="ficha"><b>Módulo ${u.modulo}</b> · Resumen elaborado a partir del manual <b>${esc(mod.libro)}</b></div></div>
${cuerpo.join("\n")}<div class="pie">LAB SERGAS · Resumen del modo Profesor · Módulo ${u.modulo}, unidad ${u.numero}</div></div></div></body></html>`;
}

export function abrirImprimible(html) {
  const w = window.open("", "_blank");
  if (!w) { aviso("Ventana bloqueada", "Permite las ventanas emergentes para esta página y vuelve a intentarlo."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
export function imprimirResumen(lid) { abrirImprimible(htmlResumen(lid)); }
