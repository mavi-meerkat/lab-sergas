// Buscador del temario: lecciones (tarjetas, filas de tablas, esquemas, trampas, trucos, recortes), banco de preguntas y notas propias.
// Todo en el dispositivo (el contenido ya está descifrado en memoria). Tolera tildes, errores de una letra y letras cambiadas de sitio.
// Modo clásico: lupa en la barra superior. Modo personajes: «Pregúntale a Valeria».
import { A, TIPOS_TARJETA } from "./ctx.js";
import { el, boton, modal, rico } from "./ui.js";
import { busto, EQUIPO } from "./u-arte.js";
import { TIPOS_PJ, narradorDe } from "./l-guion.js";
import { decir, callar } from "./u-voz.js";

const pj = () => A.p.get("modo_personajes", true) !== false;

// ------------------------------------------------------------------ normalización
const quitaTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
/** minúsculas, sin tildes, sin markdown; «3.5» y «3,5» quedan igual. */
export const norm = (s) => quitaTildes(String(s || "").toLowerCase())
  .replace(/\*\*|__|_|`/g, "").replace(/(\d)[.,](\d)/g, "$1,$2").replace(/[^a-z0-9ñ,µ%+\-⁺⁻₀-₉ ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s) => norm(s).split(" ").filter((w) => w.length > 1 || /\d/.test(w));

// Palabras de uso diario → término del temario
const SINONIMOS = {
  "tapon lila": "edta", "tubo lila": "edta", "morado": "edta", "tubo morado": "edta",
  "azul celeste": "citrato", "tapon azul": "citrato", "tapon negro": "vsg", "tapon gris": "fluoruro",
  "tapon verde": "heparina", "tapon rojo": "seco", "tapon amarillo": "gel", "glucosa tubo": "fluoruro",
  "globulos rojos": "hematies", "globulos blancos": "leucocitos", "velocidad de sedimentacion": "vsg",
};
function expandir(q) {
  let n = norm(q);
  for (const [k, v] of Object.entries(SINONIMOS)) if (n.includes(k)) n += " " + v;
  return n;
}

/** Distancia de edición con intercambio de letras vecinas (Damerau), cortando pronto. */
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let minFila = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      minFila = Math.min(minFila, d[i][j]);
    }
    if (minFila > max) return max + 1;
  }
  return d[a.length][b.length];
}

// ------------------------------------------------------------------ índice
let INDICE = null;
const plano = (s) => String(s || "").replace(/\*\*|__/g, "").replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;])/g, "$1$2").replace(/\s+/g, " ").trim();

function construir() {
  const { c } = A;
  const docs = [];
  for (const [lid, lec] of Object.entries(c.lecciones)) {
    const u = c.unidades[lid];
    // índice de la tarjeta dentro de la lección tal y como la pinta la vista (sin preguntas inexistentes)
    let k = -1;
    lec.tarjetas.forEach((t) => {
      if (["comprobacion", "examen"].includes(t.tipo) && !(t.pregunta in c.preguntas)) return;
      k++;
      if (["comprobacion", "examen"].includes(t.tipo)) return; // las preguntas se indexan aparte
      const base = { tipo: t.tipo, lid, tarjeta: k, donde: `M${u.modulo}·U${u.numero}`, leccion: lec.titulo || u.titulo, titulo: t.titulo || "" };
      const partes = [];
      if (t.texto) partes.push(t.texto);
      if (t.nodos) partes.push(t.nodos.map((n) => `${n.t}: ${n.d || ""}`).join(" · "));
      if (t.ramas) partes.push((t.raiz || "") + " · " + t.ramas.map((r) => `${r.t}: ${(r.hijos || []).join(", ")}`).join(" · "));
      if (t.solucion) partes.push(t.solucion);
      if (t.nota) partes.push(t.nota);
      if (partes.length || t.titulo) docs.push({ ...base, texto: plano(partes.join(" · ")) });
      const tab = t.tabla || (t.tipo === "tabla" ? t : null);
      if (tab && tab.filas) {
        const cols = tab.columnas || [];
        tab.filas.forEach((f) => docs.push({ ...base, tipo: "fila", texto: plano(f.map((x, j) => (cols[j] ? cols[j] + ": " : "") + x).join(" · ")) }));
      }
      if (t.recorte && t.recorte.texto) docs.push({ ...base, tipo: "recorte", texto: plano(t.recorte.texto), pagina: t.recorte.pagina, libro: t.recorte.libro });
    });
  }
  for (const q of Object.values(c.preguntas)) {
    const u = c.unidades[q.unidad];
    docs.push({ tipo: "pregunta", qid: q.id, lid: q.unidad, donde: u ? `M${u.modulo}·U${u.numero}` : "", leccion: u ? u.titulo : "",
      titulo: (q.origen || "").startsWith("SERGAS") ? "Examen " + q.origen.replace("SERGAS", "SERGAS ").replace("_", " · nº ") : "Pregunta del banco",
      texto: plano(`${q.enunciado} · Respuesta: ${q.opciones["ABCD".indexOf(q.correcta)] || ""} · ${(q.explicacion_rapida || "").replace(/^\[ALERTA:[^\]]*\]\s*/, "")}`) });
  }
  for (const d of docs) { d.n = norm(d.titulo + " " + d.texto); d.tk = [...new Set(d.n.split(" "))]; d.nt = norm(d.titulo); }
  return docs;
}
function indice() { if (!INDICE) INDICE = construir(); return INDICE; }

/** Busca y devuelve [{doc, puntos, marcas}] ordenado. */
export function buscar(consulta, filtro = "todo") {
  const q = expandir(consulta);
  const qt = [...new Set(tokens(q))];
  if (!qt.length) return [];
  const docs = indice().slice();
  // notas propias (pueden cambiar: se añaden al vuelo)
  for (const [qid, txt] of Object.entries(A.p.notas || {})) {
    if (!txt) continue;
    const pq = A.c.preguntas[qid], u = pq && A.c.unidades[pq.unidad];
    const n = norm(txt);
    docs.push({ tipo: "nota", qid, lid: pq ? pq.unidad : null, donde: u ? `M${u.modulo}·U${u.numero}` : "", leccion: u ? u.titulo : "", titulo: "Mi truco", texto: plano(txt), n, tk: n.split(" "), nt: "" });
  }
  const frase = norm(consulta);
  const res = [];
  for (const d of docs) {
    if (filtro !== "todo" && !FILTROS[filtro].tipos.includes(d.tipo)) continue;
    let puntos = 0, marcas = new Set(), todas = true;
    for (const w of qt) {
      let mejor = 0, marca = null;
      if (d.n.includes(w)) { mejor = 3; marca = w; }
      else if (w.length >= 4) {
        const max = w.length >= 8 ? 2 : 1;
        for (const t of d.tk) {
          if (t.length < 3) continue;
          if (t.startsWith(w.slice(0, -1)) && w.length >= 5) { mejor = 2; marca = t; break; }
          if (distancia(w, t, max) <= max) { mejor = 2; marca = t; break; }
        }
      }
      if (!mejor) { todas = false; continue; }
      puntos += mejor + (d.nt.includes(marca) ? 2 : 0);
      marcas.add(marca);
    }
    if (!puntos) continue;
    // si la consulta tiene varias palabras, primero los que las tienen todas
    if (todas) puntos += 4;
    if (frase.length > 3 && d.n.includes(frase)) puntos += 6;
    if (d.tipo === "trampa" || d.tipo === "mnemotecnia") puntos += 0.5;
    res.push({ d, puntos, marcas: [...marcas], todas });
  }
  const conTodas = res.filter((r) => r.todas);
  return (conTodas.length ? conTodas : res).sort((a, b) => b.puntos - a.puntos).slice(0, 60);
}

// ------------------------------------------------------------------ interfaz
const FILTROS = {
  todo: { nombre: "Todo", tipos: [] },
  trucos: { nombre: "Trucos", pj: "Trucos de Pipeta", tipos: ["mnemotecnia", "nota"] },
  trampas: { nombre: "Trampas", pj: "Trampas del abogado", tipos: ["trampa"] },
  valores: { nombre: "Valores y tablas", pj: "Archivo de pruebas", tipos: ["fila", "tabla"] },
  preguntas: { nombre: "Preguntas", pj: "Interrogatorios", tipos: ["pregunta"] },
  libro: { nombre: "Del libro", tipos: ["recorte"] },
  notas: { nombre: "Mis notas", tipos: ["nota"] },
};
function etiqueta(d) {
  if (d.tipo === "fila") return pj() ? "ARCHIVO DE PRUEBAS · fila de tabla" : "TABLA · fila";
  if (d.tipo === "recorte") return `DEL LIBRO · ${A.c.nombreLibro ? A.c.nombreLibro(d.libro) : d.libro}, pág. ${d.pagina ?? "?"}`;
  if (d.tipo === "pregunta") return pj() ? "INTERROGATORIO · " + d.titulo : d.titulo.toUpperCase();
  if (d.tipo === "nota") return pj() ? "TU TRUCO" : "MI NOTA";
  if (pj() && TIPOS_PJ[d.tipo]) return TIPOS_PJ[d.tipo][0];
  return (TIPOS_TARJETA[d.tipo] || [d.tipo.toUpperCase()])[0];
}
function quienDe(d) {
  if (d.tipo === "mnemotecnia") return "iker";
  if (d.tipo === "trampa") return "marco";
  return d.lid ? narradorDe(d.lid) : "valeria";
}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Trozo del texto alrededor de la primera coincidencia, con las coincidencias resaltadas. */
function fragmento(texto, marcas) {
  const n = quitaTildes(texto.toLowerCase());
  let pos = -1;
  for (const m of marcas) { const p = n.indexOf(m); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
  const ini = Math.max(0, pos - 90), fin = Math.min(texto.length, (pos < 0 ? 0 : pos) + 230);
  let frag = (ini > 0 ? "…" : "") + texto.slice(ini, fin) + (fin < texto.length ? "…" : "");
  const span = el("span");
  if (!marcas.length) { span.textContent = frag; return span; }
  const re = new RegExp(marcas.map((m) => escRe(m)).join("|"), "gi");
  const fn = quitaTildes(frag.toLowerCase());
  let i = 0, mm;
  while ((mm = re.exec(fn))) {
    if (mm[0].length === 0) { re.lastIndex++; continue; }
    span.append(frag.slice(i, mm.index), el("mark", frag.slice(mm.index, mm.index + mm[0].length)));
    i = mm.index + mm[0].length;
  }
  span.append(frag.slice(i));
  return span;
}

export function abrirBuscador(inicial = "") {
  const conPj = pj();
  let filtro = "todo", ultimo = null;
  const entrada = el("input.entrada.busca-entrada", { type: "search", placeholder: conPj ? "¿Qué buscamos? Una palabra, un valor, una sigla…" : "Busca un término, un valor, un truco…", value: inicial, "aria-label": "Buscar en el temario" });
  const lblValeria = el("div.l-quien-frase");
  const lista = el("div.busca-lista");
  const filtros = el("div.busca-filtros");
  const pintarFiltros = () => {
    filtros.replaceChildren(...Object.entries(FILTROS).map(([k, f]) => {
      const b = el("button.busca-filtro" + (k === filtro ? ".activo" : ""), { type: "button" }, conPj && f.pj ? f.pj : f.nombre);
      b.onclick = () => { filtro = k; pintarFiltros(); ejecutar(); };
      return b;
    }));
  };
  const recientes = () => (A.p.get("busquedas", []) || []).slice(0, 6);
  function guardarReciente(q) {
    const l = [q, ...recientes().filter((x) => x !== q)].slice(0, 6);
    A.p.set("busquedas", l);
  }
  function vacio() {
    const r = recientes();
    lista.replaceChildren(
      el("p.suave.peq", conPj ? "Valeria busca en las 58 lecciones, en el banco de preguntas, en los recortes del libro y en tus trucos. No hace falta escribirlo perfecto." : "Busca en las 58 lecciones, el banco de preguntas, los recortes del libro y tus notas. No hace falta escribirlo perfecto: tildes, una letra de más o dos letras cambiadas de sitio también valen."),
      r.length ? el("div.fila.envuelve", el("span.suave.peq", "Recientes:"), ...r.map((q) => boton(q, () => { entrada.value = q; ejecutar(); }, "fantasma peq"))) : null);
    lblValeria.textContent = "«Dime qué necesitas encontrar. Si existe en el archivo, lo encuentro.»";
  }
  function ejecutar() {
    const q = entrada.value.trim();
    callar();
    if (q.length < 2) { vacio(); return; }
    const res = buscar(q, filtro);
    const lecciones = new Set(res.map((r) => r.d.lid).filter(Boolean)).size;
    lblValeria.textContent = res.length
      ? `«He encontrado ${res.length === 60 ? "más de 60" : res.length} ${res.length === 1 ? "coincidencia" : "coincidencias"} en ${lecciones} ${lecciones === 1 ? "expediente" : "expedientes"}. Lo más probable, arriba.»`
      : "«Nada en el archivo con eso. Prueba con otra palabra, con menos letras o quita algún filtro.»";
    ultimo = q;
    if (!res.length) { lista.replaceChildren(el("p.suave", conPj ? "Sin coincidencias." : "No hay resultados. Prueba con otra palabra o quita el filtro.")); return; }
    lista.replaceChildren(...res.map(({ d, marcas }) => {
      const q2 = quienDe(d);
      const cab = el("div.busca-cab",
        el("span.chip.peq", d.donde || "—"),
        el("span.busca-tipo", etiqueta(d)),
        conPj ? el("span.l-quien-foto.mini", { html: busto(EQUIPO[q2], "neutro"), title: EQUIPO[q2].nombre }) : null);
      const acciones = el("div.fila.envuelve");
      if (d.tipo === "pregunta" || d.tipo === "nota") {
        if (d.lid && A.c.lecciones[d.lid]) acciones.append(boton("📖 Abrir la lección", () => { cerrar(); A.abrirLeccion(d.lid, 0); }, "fantasma peq"));
      } else acciones.append(boton(conPj ? "📁 Abrir aquí" : "Abrir aquí", () => { guardarReciente(ultimo); cerrar(); A.abrirLeccion(d.lid, d.tarjeta); }, "primario peq"));
      acciones.append(boton("🔊 Escuchar", () => decir((d.titulo ? d.titulo + ". " : "") + d.texto, q2, EQUIPO[q2].voz, false), "fantasma peq"));
      return el("div.busca-res",
        cab,
        d.titulo ? el("b.busca-tit", d.titulo) : null,
        d.leccion ? el("div.suave.peq", d.leccion) : null,
        el("div.busca-frag", fragmento(conPj ? d.texto.replace(/Regla del profesor/g, "Truco de Pipeta").replace(/del profesor/g, "de Pipeta") : d.texto, marcas)),
        acciones);
    }));
  }
  let t = null;
  entrada.addEventListener("input", () => { clearTimeout(t); t = setTimeout(ejecutar, 180); });
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { guardarReciente(entrada.value.trim()); ejecutar(); }
  });
  const cab = conPj
    ? el("div.l-quien.grande.busca-valeria", el("div.l-quien-foto", { html: busto(EQUIPO.valeria, "sonrie") }),
      el("div.l-quien-txt", el("b", "Pregúntale a Valeria"), lblValeria))
    : el("h2", "🔍 Buscar en el temario");
  const cerrar = modal((c) => [cab, entrada, filtros, lista], { ancho: 860, clase: "busca-modal", onCerrar: () => { callar(); if (ultimo) guardarReciente(ultimo); } });
  pintarFiltros();
  if (inicial) ejecutar(); else vacio();
  setTimeout(() => entrada.focus(), 30);
  return cerrar;
}

/** Botón de la barra superior: lupa (clásico) o Valeria (personajes). */
export function botonBuscador() {
  const b = el("button.busca-boton", { type: "button", title: "Buscar en el temario ( / )", "aria-label": "Buscar en el temario" });
  const pintar = () => {
    if (pj()) b.replaceChildren(el("span.l-quien-foto.mini", { html: busto(EQUIPO.valeria, "neutro") }), el("span.busca-boton-txt", "Pregúntale a Valeria"));
    else b.replaceChildren(el("span", "🔍"), el("span.busca-boton-txt", "Buscar"));
  };
  b.onclick = () => abrirBuscador();
  b.pintar = pintar;
  pintar();
  return b;
}
