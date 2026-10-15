// Unidad de Análisis — arte vectorial propio: personajes (bustos con expresiones) y escenarios.
// Todo es SVG generado por código: pesa muy poco y se ve nítido en cualquier pantalla.
import { rngSemilla } from "./util.js";

const TRAZO = "#22170F";

// ------------------------------------------------------------------ piezas de la cara
function cejas(expr, color, y = 84) {
  const d = {
    neutro: [[72, y, 90, y - 2], [110, y - 2, 128, y]],
    sonrie: [[72, y - 2, 90, y - 5], [110, y - 5, 128, y - 2]],
    serio: [[72, y - 4, 92, y + 2], [108, y + 2, 128, y - 4]],
    sorpresa: [[72, y - 8, 90, y - 11], [110, y - 11, 128, y - 8]],
    duda: [[72, y - 6, 90, y - 9], [110, y - 1, 128, y]],
  }[expr] || [[72, y, 90, y - 2], [110, y - 2, 128, y]];
  return d.map(([a, b, c, e]) => `<path d="M${a} ${b} Q${(a + c) / 2} ${Math.min(b, e) - 3} ${c} ${e}" stroke="${color}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`).join("");
}
function ojos(expr, color = "#3B2A1E", y = 98) {
  const r = expr === "sorpresa" ? 5.5 : 4.6;
  if (expr === "sonrie") {
    return `<path d="M76 ${y + 1} q7 -7 14 0" stroke="${TRAZO}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M110 ${y + 1} q7 -7 14 0" stroke="${TRAZO}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  }
  return [83, 117].map((x) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="${expr === "serio" ? 5 : 6.5}" fill="#FFFFFF"/>
    <circle cx="${x + 1}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x + 2.5}" cy="${y - 1.5}" r="1.4" fill="#FFF"/>`).join("");
}
function boca(expr, labios = "#B4545A", y = 138) {
  switch (expr) {
    case "sonrie": return `<path d="M86 ${y - 3} Q100 ${y + 12} 114 ${y - 3} Q100 ${y + 3} 86 ${y - 3}z" fill="#7A2730" stroke="${TRAZO}" stroke-width="2.5"/><path d="M90 ${y - 1} Q100 ${y + 3} 110 ${y - 1}" stroke="#FFF" stroke-width="2.5" fill="none"/>`;
    case "serio": return `<path d="M88 ${y + 2} Q100 ${y - 3} 112 ${y + 2}" stroke="${labios}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "sorpresa": return `<ellipse cx="100" cy="${y + 1}" rx="7" ry="9" fill="#7A2730" stroke="${TRAZO}" stroke-width="2.5"/>`;
    case "duda": return `<path d="M88 ${y + 1} Q96 ${y - 2} 112 ${y + 3}" stroke="${labios}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    default: return `<path d="M89 ${y} Q100 ${y + 4} 111 ${y}" stroke="${labios}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
}
const nariz = (piel) => `<path d="M100 104 Q96 118 101 122 Q104 123 106 120" stroke="${sombra(piel)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
function sombra(hex, f = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------ peinados (detrás / delante de la cara)
const PELO = {
  largoOndulado: (c) => ({
    atras: `<path d="M52 92 Q46 40 100 34 Q154 40 150 96 Q158 140 150 178 Q160 200 146 214 Q128 206 132 180 L68 180 Q72 206 54 214 Q40 200 50 178 Q42 140 52 92z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
    delante: `<path d="M56 98 Q54 52 100 46 Q148 50 146 92 Q132 66 108 62 Q118 76 112 84 Q96 64 72 70 Q62 82 56 98z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
      <path d="M118 66 Q134 74 140 92" stroke="${sombra(c, 1.35)}" stroke-width="3" fill="none" opacity=".5"/>`,
  }),
  cortoCanoso: (c) => ({
    atras: "",
    delante: `<path d="M58 96 Q54 50 100 46 Q146 50 142 96 Q138 74 120 68 Q100 76 78 68 Q62 76 58 96z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
      <path d="M60 90 l-4 18 M140 90 l4 18" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`,
  }),
  mono: (c) => ({
    atras: `<circle cx="100" cy="40" r="20" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
    delante: `<path d="M57 98 Q56 50 100 48 Q144 50 143 98 Q136 70 100 64 Q66 70 57 98z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
  }),
  cortoTupe: (c) => ({
    atras: "",
    delante: `<path d="M58 94 Q52 54 88 44 Q112 34 136 52 Q148 66 142 94 Q138 72 122 66 Q104 72 80 66 Q64 74 58 94z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
  }),
  rizado: (c) => ({
    atras: "",
    delante: [[64, 70, 15], [80, 54, 16], [100, 48, 17], [120, 54, 16], [136, 70, 15], [58, 88, 11], [142, 88, 11]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`).join(""),
  }),
  melenaCorta: (c) => ({
    atras: `<path d="M52 96 Q48 44 100 40 Q152 44 148 96 L150 150 Q130 158 120 146 L80 146 Q70 158 50 150z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
    delante: `<path d="M56 100 Q54 52 100 46 Q146 52 144 100 Q128 64 96 66 Q70 70 56 100z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
  }),
  coleta: (c) => ({
    atras: `<path d="M140 70 Q176 90 160 150 Q150 120 138 104z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
    delante: `<path d="M57 98 Q56 50 100 46 Q144 50 143 98 Q136 66 100 62 Q66 66 57 98z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>`,
  }),
  calvo: (c) => ({ atras: "", delante: `<path d="M58 92 Q60 72 66 66 M142 92 Q140 72 134 66" stroke="${c}" stroke-width="8" stroke-linecap="round" fill="none"/>` }),
};

// ------------------------------------------------------------------ ropa
const ROPA = {
  cuero: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M82 174 L100 214 L118 174" fill="#F3F1EC" stroke="${TRAZO}" stroke-width="2.5"/>
    <path d="M78 176 L92 226 M122 176 L108 226" stroke="${sombra(c, 1.6)}" stroke-width="3" fill="none"/>
    PLACA`,
  traje: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M86 174 L100 236 L114 174z" fill="#2E3540"/><path d="M84 174 L100 196 L116 174" fill="#E9ECEF" stroke="${TRAZO}" stroke-width="2"/>
    <path d="M80 176 L98 236 M120 176 L102 236" stroke="${sombra(c, 0.7)}" stroke-width="4"/>`,
  bata: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="#F7F8FA" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M82 174 Q100 196 118 174 L112 240 L88 240z" fill="${c}" stroke="${TRAZO}" stroke-width="2.5"/>
    <path d="M78 178 L94 240 M122 178 L106 240" stroke="#C9CED4" stroke-width="3"/>
    <rect x="132" y="206" width="22" height="14" rx="2" fill="#FFF" stroke="#9AA3AD"/><line x1="136" y1="211" x2="150" y2="211" stroke="#9AA3AD"/>`,
  chaqueta: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M86 174 L100 200 L114 174" fill="#DCE6F2" stroke="${TRAZO}" stroke-width="2.5"/><path d="M97 196 l3 30 l3 -30z" fill="#7A1F2B"/>`,
  pijama: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M84 174 L100 204 L116 174" fill="none" stroke="${TRAZO}" stroke-width="2.5"/>`,
  camiseta: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M84 176 Q100 190 116 176" fill="none" stroke="${TRAZO}" stroke-width="2.5"/>`,
  sudadera: (c) => `<path d="M14 240 Q22 182 100 172 Q178 182 186 240z" fill="${c}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M72 178 Q100 206 128 178" fill="none" stroke="${sombra(c)}" stroke-width="6"/><line x1="92" y1="196" x2="90" y2="226" stroke="#EEE" stroke-width="2.5"/><line x1="108" y1="196" x2="110" y2="226" stroke="#EEE" stroke-width="2.5"/>`,
};

// ------------------------------------------------------------------ accesorios
const gafasSol = `<path d="M66 92 h30 q2 0 2 3 q-2 14 -15 14 q-15 0 -17 -14 q0 -3 0 -3z M104 92 h30 q2 0 0 3 q-2 14 -15 14 q-15 0 -17 -14 q0 -3 2 -3z" fill="#141820" stroke="${TRAZO}" stroke-width="2"/>
  <line x1="96" y1="95" x2="104" y2="95" stroke="${TRAZO}" stroke-width="3"/><path d="M70 96 l10 0" stroke="#5D6B80" stroke-width="2"/><path d="M108 96 l10 0" stroke="#5D6B80" stroke-width="2"/>`;
const gafasRedondas = `<circle cx="83" cy="98" r="13" fill="rgba(255,255,255,.15)" stroke="${TRAZO}" stroke-width="3"/><circle cx="117" cy="98" r="13" fill="rgba(255,255,255,.15)" stroke="${TRAZO}" stroke-width="3"/><line x1="96" y1="97" x2="104" y2="97" stroke="${TRAZO}" stroke-width="3"/>`;
const gafasFinas = `<rect x="70" y="90" width="26" height="16" rx="4" fill="none" stroke="#6B5A8C" stroke-width="2.5"/><rect x="104" y="90" width="26" height="16" rx="4" fill="none" stroke="#6B5A8C" stroke-width="2.5"/><line x1="96" y1="97" x2="104" y2="97" stroke="#6B5A8C" stroke-width="2.5"/>`;
const pendientes = `<circle cx="57" cy="122" r="3" fill="#E0B23A"/><circle cx="143" cy="122" r="3" fill="#E0B23A"/>`;
const barba = (c) => `<path d="M62 118 Q64 168 100 170 Q136 168 138 118 Q126 150 100 152 Q74 150 62 118z" fill="${c}" opacity=".9"/>`;
const estetoscopio = `<path d="M74 178 Q70 214 94 222 M126 178 Q130 214 106 222" stroke="#333" stroke-width="3" fill="none"/><circle cx="100" cy="226" r="7" fill="#9AA3AD" stroke="#333" stroke-width="2"/>`;

/** Busto de un personaje. expr: neutro | sonrie | serio | sorpresa | duda */
export function busto(p, expr = "neutro") {
  const pelo = (PELO[p.peinado] || PELO.cortoTupe)(p.pelo);
  const piel = p.piel;
  const conGafasSol = p.extra && p.extra.includes("gafasSol") && !(expr === "sorpresa" && p.quitaGafas);
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" class="busto">
    ${pelo.atras}
    ${(ROPA[p.ropa] || ROPA.camiseta)(p.color).replace("PLACA", p.placa ? `<path d="M136 206 l10 -6 l10 6 l-2 14 l-8 6 l-8 -6z" fill="#E0B23A" stroke="${TRAZO}" stroke-width="2"/>` : "")}
    <path d="M84 150 L84 178 Q100 186 116 178 L116 150z" fill="${sombra(piel, 0.9)}" stroke="${TRAZO}" stroke-width="3"/>
    ${p.extra && p.extra.includes("estetoscopio") ? estetoscopio : ""}
    <ellipse cx="55" cy="108" rx="7" ry="11" fill="${piel}" stroke="${TRAZO}" stroke-width="3"/>
    <ellipse cx="145" cy="108" rx="7" ry="11" fill="${piel}" stroke="${TRAZO}" stroke-width="3"/>
    <path d="M56 96 Q56 46 100 46 Q144 46 144 96 Q144 150 100 160 Q56 150 56 96z" fill="${piel}" stroke="${TRAZO}" stroke-width="3"/>
    ${p.barba ? barba(p.barba) : ""}
    <ellipse cx="74" cy="122" rx="8" ry="4" fill="#E58C8C" opacity="${expr === "sonrie" ? 0.45 : 0.18}"/>
    <ellipse cx="126" cy="122" rx="8" ry="4" fill="#E58C8C" opacity="${expr === "sonrie" ? 0.45 : 0.18}"/>
    ${conGafasSol ? "" : ojos(expr, p.ojos)}
    ${cejas(expr, p.cejas || sombra(p.pelo, 0.8))}
    ${nariz(piel)}
    ${boca(expr, p.labios)}
    ${pelo.delante}
    ${conGafasSol ? gafasSol : ""}
    ${p.extra && p.extra.includes("gafasRedondas") ? gafasRedondas : ""}
    ${p.extra && p.extra.includes("gafasFinas") ? gafasFinas : ""}
    ${p.extra && p.extra.includes("pendientes") ? pendientes : ""}
  </svg>`;
}

// ------------------------------------------------------------------ el equipo
// voz: preferencia de voz del dispositivo (h/m), tono y velocidad; piper: voz grabada (ver u-voz.js)
export const EQUIPO = {
  anna: { nombre: "Anna", cargo: "Detective · técnica de laboratorio", piel: "#F2C7A5", pelo: "#4A2C1D", peinado: "largoOndulado", ropa: "cuero", color: "#2A2522",
    ojos: "#5A3A22", labios: "#A84B55", extra: ["pendientes"], placa: true, voz: { g: "m", tono: 1.05, vel: 1.04 } },
  duarte: { nombre: "Teniente Duarte", cargo: "Jefe de la Unidad", piel: "#E7B48F", pelo: "#B9B4AE", peinado: "cortoCanoso", ropa: "traje", color: "#5A6270",
    labios: "#9C5A50", extra: ["gafasSol"], quitaGafas: true, voz: { g: "h", tono: 0.78, vel: 0.9 } },
  valeria: { nombre: "Dra. Valeria Ortega", cargo: "Científica jefa del laboratorio", piel: "#F5D6BC", pelo: "#2C2A2E", peinado: "mono", ropa: "bata", color: "#2E6DB4",
    labios: "#A6505C", extra: ["gafasFinas"], voz: { g: "m", tono: 1.15, vel: 1.08 } },
  marco: { nombre: "Agente Marco Ruiz", cargo: "Agente de campo", piel: "#C99068", pelo: "#1E1612", peinado: "cortoTupe", ropa: "chaqueta", color: "#26344A",
    barba: "rgba(40,28,20,.28)", labios: "#8E4B44", voz: { g: "h", tono: 1.0, vel: 1.06 } },
  iker: { nombre: "Iker «Pipeta» Salgado", cargo: "Técnico de laboratorio", piel: "#F0CDB0", pelo: "#7A4A26", peinado: "rizado", ropa: "bata", color: "#3A8C5C",
    labios: "#A35A55", extra: ["gafasRedondas"], voz: { g: "h", tono: 1.25, vel: 1.14 } },
  carmen: { nombre: "Dra. Carmen Ibarra", cargo: "Médica forense", piel: "#E3AE8A", pelo: "#C9C4C0", peinado: "melenaCorta", ropa: "pijama", color: "#3C8C86",
    labios: "#A0545A", extra: ["estetoscopio"], voz: { g: "m", tono: 0.92, vel: 0.96 } },
};

// ------------------------------------------------------------------ sospechosos (aleatorios pero estables por semilla)
const PIELES = ["#F6D3B8", "#EDBE98", "#D9A27A", "#B9805A", "#8E5B3C", "#6B422B"];
const PELOS = ["#1E1612", "#4A2C1D", "#7A4A26", "#C08A3E", "#D9C27A", "#9B9690", "#8A2E1E"];
const ROPAS = ["camiseta", "sudadera", "chaqueta", "traje", "cuero"];
const COLORES = ["#8C3B3B", "#3B5C8C", "#4E7A3E", "#7A5C2E", "#5C3B7A", "#2E6E6E", "#8C6A2E", "#444"];
const NOM_H = ["Ramón Ferreiro", "Jacobo Lema", "Tito Barreiro", "Nicolás Vidal", "Óscar Pazos", "Luis Seoane", "Bruno Castro", "Hugo Nieto", "Félix Otero", "Andrés Mato"];
const NOM_M = ["Lidia Couto", "Rocío Varela", "Nerea Iglesias", "Paula Rial", "Sabela Freire", "Inés Dopico", "Marta Losada", "Irene Gómez", "Olga Pena", "Celia Rey"];
const OFICIOS = ["celador", "repartidor", "socorrista", "crupier", "camarera", "vigilante", "taxista", "enfermera", "estudiante", "conserje", "fotógrafo", "pescadero", "DJ", "jardinera", "mecánico"];
export function sospechoso(semilla) {
  const R = rngSemilla(semilla);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const mujer = R() < 0.5;
  const peinado = mujer ? pick(["largoOndulado", "melenaCorta", "coleta", "mono"]) : pick(["cortoTupe", "rizado", "calvo", "cortoCanoso"]);
  return {
    nombre: pick(mujer ? NOM_M : NOM_H), oficio: pick(OFICIOS), piel: pick(PIELES), pelo: pick(PELOS), peinado,
    ropa: pick(ROPAS), color: pick(COLORES), barba: !mujer && R() < 0.35 ? "rgba(30,20,15,.45)" : null,
    extra: R() < 0.2 ? ["gafasRedondas"] : mujer && R() < 0.4 ? ["pendientes"] : [],
    voz: { g: mujer ? "m" : "h", tono: 0.85 + R() * 0.4, vel: 0.95 + R() * 0.15 },
  };
}

// ------------------------------------------------------------------ escenarios (800 × 450)
const ESC = (cuerpo, defs = "") => `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="escena-svg"><defs>${defs}</defs>${cuerpo}</svg>`;
function edificios(R, base, n, colores, ventanas, hmin = 120, hmax = 300) {
  let s = "", x = -10;
  for (let i = 0; i < n && x < 820; i++) {
    const w = 40 + R() * 70, h = hmin + R() * (hmax - hmin), c = colores[Math.floor(R() * colores.length)];
    s += `<rect x="${x.toFixed(0)}" y="${(base - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${c}"/>`;
    for (let yy = base - h + 12; yy < base - 14; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12)
      if (R() < 0.45) s += `<rect x="${xx.toFixed(0)}" y="${yy.toFixed(0)}" width="5" height="7" fill="${ventanas}" opacity="${(0.4 + R() * 0.6).toFixed(2)}"/>`;
    x += w + 2 + R() * 6;
  }
  return s;
}
const palmera = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q6 -60 -4 -120" stroke="#3A2416" stroke-width="9" fill="none"/>
  ${[-150, -110, -60, -20, 20].map((a) => `<path d="M-4 -120 q${Math.cos((a * Math.PI) / 180) * 50} ${Math.sin((a * Math.PI) / 180) * 30 - 10} ${Math.cos((a * Math.PI) / 180) * 80} ${Math.sin((a * Math.PI) / 180) * 30 + 25}" stroke="#2D3B1E" stroke-width="10" fill="none" stroke-linecap="round"/>`).join("")}</g>`;

export const ESCENAS = {
  miami: () => {
    const R = rngSemilla(21);
    return ESC(`<rect width="800" height="450" fill="url(#cielo)"/><circle cx="600" cy="250" r="70" fill="#FFD27A" opacity=".9"/>
      ${edificios(R, 330, 18, ["#7A3B4E", "#8E4A50", "#6A3446", "#A0585A"], "#FFE3A8", 60, 190)}
      <rect y="330" width="800" height="120" fill="url(#mar)"/><path d="M0 330 h800" stroke="#FFD9A0" stroke-width="2" opacity=".6"/>
      ${palmera(90, 450, 1.3)}${palmera(720, 450, 1.1)}${palmera(640, 460, 0.8)}`,
    `<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7E45"/><stop offset=".55" stop-color="#FFB25E"/><stop offset="1" stop-color="#FFD9A0"/></linearGradient>
     <linearGradient id="mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A8FA6"/><stop offset="1" stop-color="#145566"/></linearGradient>`);
  },
  vegas: () => {
    const R = rngSemilla(33);
    let est = ""; for (let i = 0; i < 60; i++) est += `<circle cx="${(R() * 800).toFixed(0)}" cy="${(R() * 200).toFixed(0)}" r="${(R() * 1.6 + 0.4).toFixed(1)}" fill="#FFF" opacity="${(0.3 + R() * 0.7).toFixed(2)}"/>`;
    return ESC(`<rect width="800" height="450" fill="url(#noche)"/>${est}
      <path d="M0 300 L120 220 L220 280 L330 210 L460 290 L560 230 L680 285 L800 240 L800 320 L0 320z" fill="#2A1840"/>
      ${edificios(R, 400, 16, ["#1A1030", "#24163E", "#2E1A4A"], "#FF5FD2", 90, 260)}
      <rect x="300" y="190" width="200" height="54" rx="10" fill="#120A20" stroke="#FF3FB0" stroke-width="5"/>
      <text x="400" y="228" text-anchor="middle" font-size="30" font-weight="800" fill="#FFE04A" font-family="system-ui" letter-spacing="4">LAB · 24 h</text>
      <rect x="60" y="250" width="120" height="34" rx="8" fill="#120A20" stroke="#3FE0FF" stroke-width="4"/><text x="120" y="274" text-anchor="middle" font-size="18" fill="#3FE0FF" font-family="system-ui" font-weight="700">MOTEL</text>
      <rect y="400" width="800" height="50" fill="#0D0818"/>`,
    `<linearGradient id="noche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0620"/><stop offset=".6" stop-color="#3A1460"/><stop offset="1" stop-color="#7A2A6E"/></linearGradient>`);
  },
  nuevayork: () => {
    const R = rngSemilla(47);
    return ESC(`<rect width="800" height="450" fill="url(#ny)"/>
      ${edificios(R, 380, 14, ["#5C6B7E", "#4E5C6E", "#66778C"], "#E8EEF5", 160, 330)}
      ${edificios(R, 420, 18, ["#2E3846", "#353F4E", "#28313D"], "#FFD98A", 80, 220)}
      <path d="M0 360 Q200 300 400 360 Q600 300 800 360" stroke="#1E2632" stroke-width="6" fill="none"/>
      ${[100, 300, 500, 700].map((x) => `<line x1="${x}" y1="330" x2="${x}" y2="420" stroke="#1E2632" stroke-width="5"/>`).join("")}
      <rect y="420" width="800" height="30" fill="#1A2029"/>`,
    `<linearGradient id="ny" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FA3BC"/><stop offset="1" stop-color="#D5DEE8"/></linearGradient>`);
  },
  interrogatorio: (tinte = "#2E3A4A") => ESC(`<rect width="800" height="450" fill="#1B1F26"/>
    <rect x="0" y="0" width="800" height="300" fill="${tinte}" opacity=".55"/>
    <rect x="120" y="40" width="560" height="190" rx="6" fill="#0E1218" stroke="#3A4250" stroke-width="8"/>
    <rect x="128" y="48" width="544" height="174" fill="url(#espejo)"/>
    <path d="M400 0 L400 30" stroke="#555" stroke-width="3"/><path d="M370 30 h60 l-14 22 h-32z" fill="#3A3F48"/>
    <path d="M384 52 L240 300 L560 300 L416 52z" fill="#FFF6C8" opacity=".06"/>
    <rect y="300" width="800" height="150" fill="#14171C"/><rect x="180" y="330" width="440" height="22" rx="4" fill="#3A3027"/>`,
  `<linearGradient id="espejo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C2430"/><stop offset=".5" stop-color="#26303E"/><stop offset="1" stop-color="#1A212C"/></linearGradient>`),
  archivo: () => {
    const R = rngSemilla(5);
    let cajas = "";
    for (let fila = 0; fila < 4; fila++) for (let i = 0; i < 12; i++) {
      const x = 20 + i * 64, y = 40 + fila * 90;
      cajas += `<rect x="${x}" y="${y}" width="56" height="62" rx="3" fill="${["#C9B48A", "#BFA77A", "#D2BE94"][Math.floor(R() * 3)]}" stroke="#7A6646"/>
        <rect x="${x + 14}" y="${y + 22}" width="28" height="12" fill="#F4EEDF"/>`;
    }
    return ESC(`<rect width="800" height="450" fill="#1E2A33"/>${cajas}
      ${[100, 190, 280, 370].map((y) => `<rect x="10" y="${y + 2}" width="780" height="8" fill="#3A4652"/>`).join("")}
      <rect width="800" height="450" fill="url(#frio)"/>`,
    `<linearGradient id="frio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FB0FF" stop-opacity=".18"/><stop offset="1" stop-color="#0A1520" stop-opacity=".7"/></linearGradient>`);
  },
  morgue: () => ESC(`<rect width="800" height="450" fill="#1A2026"/>
    ${[0, 1, 2].map((f) => [0, 1, 2, 3, 4, 5].map((c) => `<rect x="${40 + c * 125}" y="${30 + f * 80}" width="110" height="66" rx="4" fill="url(#acero2)" stroke="#5A646E" stroke-width="2"/>
      <rect x="${80 + c * 125}" y="${56 + f * 80}" width="30" height="8" rx="3" fill="#2A3036"/><rect x="${52 + c * 125}" y="${40 + f * 80}" width="24" height="12" fill="#E8E2D0" opacity=".85"/>`).join("")).join("")}
    <path d="M400 0 L400 40" stroke="#555" stroke-width="3"/><ellipse cx="400" cy="48" rx="70" ry="14" fill="#C9D1D9"/>
    <path d="M330 52 L180 330 L620 330 L470 52z" fill="#E6F0FF" opacity=".07"/>
    <rect y="330" width="800" height="120" fill="#11161A"/>
    <rect x="200" y="300" width="400" height="26" rx="6" fill="url(#acero2)" stroke="#5A646E" stroke-width="2"/>
    <path d="M250 300 Q400 262 560 300z" fill="#DDE6EE" opacity=".9"/>
    <rect x="230" y="326" width="12" height="70" fill="#4E565E"/><rect x="558" y="326" width="12" height="70" fill="#4E565E"/>`,
  `<linearGradient id="acero2" x1="0" x2="1"><stop offset="0" stop-color="#7C858E"/><stop offset=".5" stop-color="#C9D0D6"/><stop offset="1" stop-color="#6E777F"/></linearGradient>`),
  laboratorio: (tinte = "#3FE0FF") => ESC(`<rect width="800" height="450" fill="#121820"/>
    <rect x="0" y="0" width="800" height="260" fill="url(#cristal)"/>
    ${[60, 260, 460, 660].map((x) => `<rect x="${x}" y="40" width="160" height="110" rx="6" fill="#0B1118" stroke="${tinte}" stroke-width="2" opacity=".9"/>
      <path d="M${x + 12} 120 l25 -30 l20 15 l30 -45 l25 25 l30 -20" stroke="${tinte}" stroke-width="3" fill="none"/>`).join("")}
    <rect y="300" width="800" height="150" fill="#1C252F"/><rect y="290" width="800" height="16" fill="#3A4756"/>
    <g transform="translate(560 200)"><rect x="0" y="80" width="80" height="12" fill="#AAB4BF"/><rect x="30" y="20" width="14" height="62" fill="#C9D1D9"/><circle cx="37" cy="14" r="12" fill="#C9D1D9"/><rect x="44" y="40" width="30" height="8" fill="#9AA6B2"/></g>
    ${[120, 160, 200].map((x, i) => `<rect x="${x}" y="240" width="18" height="50" rx="8" fill="#F4F6F8" opacity=".9"/><rect x="${x}" y="262" width="18" height="28" rx="8" fill="${["#C62828", "#9C6ADE", "#7EC8E3"][i]}"/>`).join("")}`,
  `<linearGradient id="cristal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tinte}" stop-opacity=".18"/><stop offset="1" stop-color="#121820" stop-opacity="0"/></linearGradient>`),
};
