// Unidad de Análisis — voces de los personajes.
// · Frases fijas del guion: audio grabado con Piper (audio/u/<clave>.ogg) si existe en audio/u/indice.json.
// · Todo lo demás (enunciados, opciones, explicaciones): voz del dispositivo con tono y velocidad por personaje.
import { A } from "./ctx.js";

let indice = null;          // Set de claves grabadas
let cargando = null;
let audioActual = null;
let generacion = 0;

async function cargarIndice() {
  if (indice) return indice;
  if (!cargando) {
    cargando = fetch("audio/u/indice.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : []))
      .catch(() => []).then((l) => (indice = new Set(l)));
  }
  return cargando;
}
export async function claveFrase(quien, texto) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(`${quien}|${texto}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 14);
}

// ------------------------------------------------------------------ voz del dispositivo
const FEM = /(helena|laura|elvira|luc[ií]a|paulina|m[oó]nica|sabina|marisol|elena|dalia|paloma|carmen|esperanza|estrella|irene|abril|ximena|ver[oó]nica|female|mujer|eea|eec|eed)/i;
const MAS = /(pablo|[aá]lvaro|jorge|diego|ra[uú]l|enrique|juan|carlos|gerardo|alonso|arnau|dar[ií]o|tom[aá]s|male|hombre|eef|eee)/i;
let vocesEs = null;
function voces() {
  if (vocesEs && vocesEs.length) return vocesEs;
  const vs = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter((v) => /^es/i.test(v.lang));
  const orden = (v) => (/es[-_]ES/i.test(v.lang) ? 0 : 1) + (/natural|online|neural|google/i.test(v.name) ? 0 : 0.5);
  vocesEs = vs.sort((a, b) => orden(a) - orden(b));
  return vocesEs;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { vocesEs = null; };
function vozPara(g) {
  const vs = voces();
  if (!vs.length) return null;
  const re = g === "m" ? FEM : MAS;
  return vs.find((v) => re.test(v.name)) || vs[0];
}
const limpiaVoz = (s) => String(s || "")
  .replace(/\[ALERTA:[^\]]*\]/gi, "").replace(/\*\*|__/g, "").replace(/…/g, ", ")
  .replace(/µ[lL]\b/g, " microlitros").replace(/\bm[lL]\b/g, " mililitros").replace(/º\s?C|°\s?C/g, " grados")
  .replace(/\s+/g, " ").trim();

function hablarDispositivo(texto, perfil, gen) {
  return new Promise((ok) => {
    if (!window.speechSynthesis) return ok();
    const partes = limpiaVoz(texto).match(/[^.!?;]+[.!?;]*/g) || [];
    const v = vozPara(perfil.g);
    let i = 0;
    const sig = () => {
      if (gen !== generacion || i >= partes.length) return ok();
      const u = new SpeechSynthesisUtterance(partes[i++]);
      u.lang = "es-ES"; if (v) u.voice = v;
      u.pitch = Math.max(0.1, Math.min(2, perfil.tono || 1));
      u.rate = (perfil.vel || 1) * Number(A.p ? A.p.get("unidad_vel", 1.3) : 1);
      u.onend = sig; u.onerror = sig;
      speechSynthesis.speak(u);
    };
    sig();
  });
}

// ------------------------------------------------------------------ API
export function vozActiva() { return A.p ? A.p.get("unidad_voz", true) !== false : true; }
export function callar() {
  generacion++;
  try { window.speechSynthesis && speechSynthesis.cancel(); } catch { /* nada */ }
  if (audioActual) { try { audioActual.pause(); } catch { /* nada */ } audioActual = null; }
}
/**
 * Dice una frase. quienVoz = clave de voz grabada ("duarte", "sospechoso_h"...); perfil = {g, tono, vel} para el dispositivo.
 * fija = true si la frase es del guion (puede estar grabada).
 */
export async function decir(texto, quienVoz, perfil, fija = false) {
  callar();
  const gen = generacion;
  if (!vozActiva() || !texto) return;
  if (fija) {
    const idx = await cargarIndice();
    const k = await claveFrase(quienVoz, texto);
    if (gen !== generacion) return;
    if (idx.has(k)) {
      const a = new Audio(`audio/u/${k}.ogg`);
      a.playbackRate = Number(A.p ? A.p.get("unidad_vel", 1.3) : 1);
      audioActual = a;
      await new Promise((ok) => { a.onended = ok; a.onerror = ok; a.play().catch(ok); });
      return;
    }
  }
  await hablarDispositivo(texto, perfil || { g: "h" }, gen);
}
