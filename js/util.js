// Utilidades comunes: fechas locales, formato, marcado sencillo, azar con semilla.

export const pad = (n, w = 2) => String(n).padStart(w, "0");

/** Fecha local YYYY-MM-DD (no UTC: la «hoy» del usuario). */
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function hoy() { return isoDate(new Date()); }
export function ahoraISO() {
  const d = new Date();
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function parseISO(s) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function sumarDias(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function diasEntre(desdeIso, hastaIso) {
  return Math.round((parseISO(hastaIso) - parseISO(desdeIso)) / 86400000);
}
export function fechaEs(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function parseFechaEs(s) {
  s = (s || "").trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    const d = new Date(y, +m[2] - 1, +m[1]);
    if (d.getMonth() !== +m[2] - 1) return null;
    return isoDate(d);
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? s : null;
}

/** Número con coma decimal y sin ceros sobrantes. */
export function num(x, dec = 2) {
  let t = Number(x).toFixed(dec);
  if (t.includes(".")) t = t.replace(/0+$/, "").replace(/\.$/, "");
  return t.replace(".", ",");
}
export const round = (x) => {
  // redondeo «del banquero» como Python round() para enteros
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 ? (r % 2 === 0 ? r : r - 1) : r;
};

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Marcado de las lecciones: **negrita**, _cursiva_, líneas «- » como viñetas. */
export function md(texto) {
  const inline = (s) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^\w])_([^_]+)_(?![\w])/g, "$1<i>$2</i>");
  const out = [];
  let lista = [];
  const cerrar = () => {
    if (lista.length) out.push("<ul>" + lista.map((x) => `<li>${x}</li>`).join("") + "</ul>");
    lista = [];
  };
  for (const linea of String(texto || "").split("\n")) {
    const l = linea.trim();
    if (!l) { cerrar(); continue; }
    if (l.startsWith("- ") || l.startsWith("• ")) lista.push(inline(l.slice(2)));
    else { cerrar(); out.push(`<p>${inline(l)}</p>`); }
  }
  cerrar();
  return out.join("");
}
export function mdInline(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

/** Generador con semilla (mulberry32) — simulacros reproducibles. */
export function rngSemilla(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.choice = (items, pesos) => {
    const tot = pesos.reduce((s, x) => s + x, 0);
    let u = r() * tot;
    for (let i = 0; i < items.length; i++) {
      u -= pesos[i];
      if (u < 0) return items[i];
    }
    return items[items.length - 1];
  };
  r.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  return r;
}
export const azar = rngSemilla((Date.now() ^ (Math.random() * 2 ** 31)) >>> 0);

/** Normaliza: sin tildes y en minúsculas. */
export function norm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
