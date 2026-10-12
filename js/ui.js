// Piezas de interfaz reutilizables (sin frameworks).
import { esc, md } from "./util.js";

/** Crea un elemento: el("div.clase#id", {onclick, style, ...}, hijos...) */
export function el(sel, attrs, ...hijos) {
  if (attrs === null || typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs !== undefined && attrs !== null) hijos.unshift(attrs);
    attrs = {};
  }
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const n = document.createElement(m && m[1] ? m[1] : "div");
  if (m && m[2]) {
    for (const p of m[2].match(/[.#][\w-]+/g)) {
      if (p[0] === ".") n.classList.add(p.slice(1));
      else n.id = p.slice(1);
    }
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (k === "html") n.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
    else if (k === "class") n.className += " " + v;
    else if (k in n && k !== "list" && typeof v !== "string") n[k] = v;
    else n.setAttribute(k, v === true ? "" : v);
  }
  agregar(n, hijos);
  return n;
}
function agregar(n, hijos) {
  for (const h of hijos.flat(Infinity)) {
    if (h === null || h === undefined || h === false) continue;
    n.appendChild(h instanceof Node ? h : document.createTextNode(String(h)));
  }
}
export const rico = (texto, cls = "") => el("div.rico" + (cls ? "." + cls : ""), { html: md(texto) });

export function boton(texto, cmd, tipo = "primario", attrs = {}) {
  return el("button.btn." + tipo.trim().split(/\s+/).join("."), { type: "button", onclick: cmd, ...attrs }, texto);
}
export function chip(texto, col = "acento", bg = "panel2") {
  return el(`span.chip.c-${col}.bg-${bg}`, texto);
}
export function tarjeta(clase = "", ...hijos) {
  return el("div.tarjeta" + (clase ? "." + clase.trim().split(/\s+/).join(".") : ""), ...hijos);
}
export function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

/** Donut SVG: partes = [[valor, colorVar], ...] */
export function donut(partes, centro = "", sub = "", tam = 140, grosor = 20) {
  const r = (tam - grosor) / 2 - 2, cx = tam / 2, cy = tam / 2, L = 2 * Math.PI * r;
  const total = partes.reduce((s, [v]) => s + v, 0);
  let arcos = "";
  if (!total) arcos = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--borde)" stroke-width="${grosor}"/>`;
  let off = 0;
  for (const [v, col] of partes) {
    if (v <= 0) continue;
    const len = (L * v) / total;
    arcos += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--${col})" stroke-width="${grosor}"
      stroke-dasharray="${len} ${L - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off += len;
  }
  return el("div.donut", {
    html: `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">${arcos}
      <text x="50%" y="${cy - 4}" text-anchor="middle" class="d-centro">${esc(centro)}</text>
      <text x="50%" y="${cy + 18}" text-anchor="middle" class="d-sub">${esc(sub)}</text></svg>`,
  });
}

// ------------------------------------------------------------ diálogos
let pilaModales = [];
export function modal(contenido, { ancho = 920, onCerrar, clase = "" } = {}) {
  const fondo = el("div.modal-fondo");
  const caja = el("div.modal" + (clase ? "." + clase : ""), { style: { maxWidth: ancho + "px" } });
  const cerrar = () => {
    if (!fondo.isConnected) return;
    fondo.remove();
    pilaModales = pilaModales.filter((x) => x !== cerrar);
    onCerrar && onCerrar();
  };
  fondo.addEventListener("mousedown", (e) => { if (e.target === fondo) cerrar(); });
  agregar(caja, [typeof contenido === "function" ? contenido(cerrar) : contenido]);
  fondo.appendChild(caja);
  document.body.appendChild(fondo);
  pilaModales.push(cerrar);
  return cerrar;
}
export function cerrarModalSuperior() {
  const c = pilaModales.at(-1);
  if (c) { c(); return true; }
  return false;
}
export function hayModal() { return pilaModales.length > 0; }

export function confirmar(titulo, texto, { si = "Sí", no = "Cancelar", tipo = "primario" } = {}) {
  return new Promise((ok) => {
    let res = false;
    modal((cerrar) => el("div.dialogo",
      el("h3", titulo),
      el("div.rico", { html: md(texto) }),
      el("div.fila.derecha",
        boton(no, () => cerrar(), "secundario"),
        boton(si, () => { res = true; cerrar(); }, tipo)),
    ), { ancho: 520, onCerrar: () => ok(res) });
  });
}
export function aviso(titulo, texto) {
  return new Promise((ok) => {
    modal((cerrar) => el("div.dialogo",
      el("h3", titulo), el("div.rico", { html: md(texto) }),
      el("div.fila.derecha", boton("Aceptar", () => cerrar(), "primario"))), { ancho: 520, onCerrar: ok });
  });
}

let toastT = null;
export function toast(texto, ms = 2600) {
  let t = document.getElementById("toast");
  if (!t) { t = el("div#toast"); document.body.appendChild(t); }
  t.textContent = texto;
  t.classList.add("visible");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("visible"), ms);
}

/** Barra de progreso simple. */
export function barra(valor, col = "acento") {
  return el("div.barra", el("div", { style: { width: Math.max(0, Math.min(1, valor)) * 100 + "%", background: `var(--${col})` } }));
}

/** Control segmentado. */
export function segmentado(valores, actual, onCambio) {
  const cont = el("div.seg");
  for (const v of valores) {
    const b = el("button" + (v === actual ? ".activo" : ""), { type: "button" }, v);
    b.onclick = () => {
      cont.querySelectorAll("button").forEach((x) => x.classList.remove("activo"));
      b.classList.add("activo");
      onCambio(v);
    };
    cont.appendChild(b);
  }
  return cont;
}
