// Clasifica un fallo: ¿de concepto o de cifra? Y si es de cifra, ¿se han invertido dígitos (45 ↔ 54)?
import { norm } from "./util.js";

const limpia = (s) => String(s || "").replace(/^[A-D]\)\s*/, "");
const ROMANOS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const RE_NUM = /\d+(?:[.,]\d+)*|\b(?:VIII|VII|VI|IV|IX|III|II|I|V|X)\b/g;

/** Números de un texto, en orden (incluye romanos en mayúsculas: clase II, grupo IV…). */
export function numeros(s) {
  return (limpia(s).match(RE_NUM) || []).map((t) => (t in ROMANOS ? String(ROMANOS[t]) : t));
}
const sinNumeros = (s) => norm(limpia(s).replace(RE_NUM, " # ")).replace(/[^a-z0-9ñ# ]/g, " ").split(/\s+/).filter((w) => w.length > 2 || w === "#");
function parecido(a, b) {
  const A = new Set(sinNumeros(a)), B = new Set(sinNumeros(b));
  if (!A.size && !B.size) return 1;
  let i = 0; for (const w of A) if (B.has(w)) i++;
  return i / (A.size + B.size - i || 1);
}
const digitos = (t) => t.replace(/\D/g, "");
const ordenados = (t) => digitos(t).split("").sort().join("");

/**
 * Devuelve { tipo: "inversion" | "cifra" | "concepto", tu, ok } donde tu/ok son las cifras que difieren.
 * - inversion: mismos dígitos en otro orden dentro de una cifra (45 ↔ 54, 2814 ↔ 2841, 5,0 ↔ 0,5).
 * - cifra: las dos opciones dicen lo mismo y solo cambia el número.
 * - concepto: lo demás.
 */
export function tipoFallo(q, elegida) {
  if (!q || !elegida || elegida === q.correcta) return null;
  const txtTu = q.opciones["ABCD".indexOf(elegida)], txtOk = q.opciones["ABCD".indexOf(q.correcta)];
  const nTu = numeros(txtTu), nOk = numeros(txtOk);
  if (!nTu.length || !nOk.length || nTu.join("|") === nOk.join("|")) return { tipo: "concepto" };
  // dígitos invertidos en alguna cifra
  if (nTu.length === nOk.length) {
    for (let i = 0; i < nTu.length; i++) {
      const a = nTu[i], b = nOk[i];
      const mismaForma = a.replace(/\d/g, "") === b.replace(/\d/g, ""); // misma coma o punto en el mismo sitio
      if (a !== b && mismaForma && digitos(a).length >= 2 && digitos(a) !== digitos(b) && ordenados(a) === ordenados(b)) {
        return { tipo: "inversion", tu: a, ok: b };
      }
    }
  }
  const opcionesConNumero = q.opciones.filter((o) => numeros(o).length).length;
  if (parecido(txtTu, txtOk) >= 0.5 || opcionesConNumero >= 3) {
    const difTu = nTu.filter((x) => !nOk.includes(x)), difOk = nOk.filter((x) => !nTu.includes(x));
    return { tipo: "cifra", tu: (difTu.length ? difTu : nTu).join(" · "), ok: (difOk.length ? difOk : nOk).join(" · ") };
  }
  return { tipo: "concepto" };
}

export const NOMBRE_FALLO = { inversion: "dígitos invertidos", cifra: "fallo de cifra", concepto: "fallo de concepto" };
