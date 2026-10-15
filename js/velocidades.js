// Velocidad de voz por personaje (juego y, más adelante, lecciones). Se guarda en el perfil como {personaje: velocidad}.
import { A } from "./ctx.js";
import { el, segmentado } from "./ui.js";

export const PERSONAJES_VEL = [["duarte", "Duarte"], ["carmen", "Carmen"], ["valeria", "Valeria"], ["marco", "Marco"], ["iker", "Iker"], ["anna", "Anna"], ["sospechoso", "Sospechosos"]];
const DEF = { carmen: 1.3 };
const VALORES = { "1×": 1, "1,15×": 1.15, "1,3×": 1.3, "1,5×": 1.5, "1,75×": 1.75 };
const etiqueta = (v) => Object.keys(VALORES).find((k) => VALORES[k] === v) || "1,15×";

/** "sospechoso_h" → "sospechoso", "carmen_a" → "carmen". */
export const basePersonaje = (q) => (String(q || "").startsWith("sospechoso") ? "sospechoso" : String(q || "").replace(/_.*/, ""));

export function velocidad(q) {
  const b = basePersonaje(q);
  const guardadas = (A.p && A.p.get("velocidades", {})) || {};
  return Number(guardadas[b] ?? DEF[b] ?? 1.15);
}

/** Lista de personajes con su selector de velocidad. */
export function panelVelocidades() {
  return el("div.u-velocidades", PERSONAJES_VEL.map(([id, nombre]) =>
    el("div.fila.envuelve.u-vel-fila", el("b.u-vel-nombre", nombre),
      segmentado(Object.keys(VALORES), etiqueta(velocidad(id)), (v) => {
        const g = { ...((A.p && A.p.get("velocidades", {})) || {}) };
        g[id] = VALORES[v];
        A.p.set("velocidades", g);
      }))));
}
