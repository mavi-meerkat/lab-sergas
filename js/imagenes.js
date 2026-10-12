// Tarjetas con imagen: dibujos esquemáticos (SVG propio) de lo que el examen pide reconocer a simple vista.
// Los datos salen de las lecciones (M1·U4, M1·U7, M7·U2, M7·U5, M8·U4). Sin imágenes de terceros.
import { rngSemilla } from "./util.js";

const W = 240, H = 200;
const svg = (cuerpo, vb = `0 0 ${W} ${H}`) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" class="img-svg">${cuerpo}</svg>`;

// ------------------------------------------------------------------ tubos y frascos
function tubo(tapon, { gel = false, rayas = null } = {}) {
  const x = 95, w = 50;
  let s = `<rect x="${x}" y="58" width="${w}" height="122" rx="22" fill="#F4F6F8" stroke="#9AA3AD" stroke-width="2"/>`;
  // sangre
  s += `<path d="M${x + 2} 110 h${w - 4} v48 a21 21 0 0 1 -${w - 4} 0 z" fill="#8E1B24"/>`;
  if (gel) s += `<rect x="${x + 2}" y="104" width="${w - 4}" height="10" fill="#E9E4C8"/>`;
  s += `<rect x="${x + 6}" y="74" width="${w - 12}" height="26" rx="3" fill="#FFFFFF" stroke="#C9CED4"/>
    <line x1="${x + 11}" y1="82" x2="${x + w - 11}" y2="82" stroke="#C9CED4" stroke-width="2"/>
    <line x1="${x + 11}" y1="90" x2="${x + w - 18}" y2="90" stroke="#C9CED4" stroke-width="2"/>`;
  // tapón
  s += `<rect x="${x - 6}" y="22" width="${w + 12}" height="40" rx="7" fill="${tapon}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
  for (let i = 0; i < 6; i++) s += `<line x1="${x + 2 + i * 9}" y1="26" x2="${x + 2 + i * 9}" y2="58" stroke="rgba(0,0,0,.15)" stroke-width="3"/>`;
  if (rayas) s += `<rect x="${x - 6}" y="38" width="${w + 12}" height="8" fill="${rayas}"/>`;
  return svg(s);
}
function frasco(tapon) {
  let s = `<path d="M85 70 q0 -12 12 -16 v-12 h46 v12 q12 4 12 16 v100 q0 12 -12 12 h-46 q-12 0 -12 -12 z" fill="#EEF2F5" stroke="#9AA3AD" stroke-width="2"/>`;
  s += `<path d="M87 120 h66 v50 q0 10 -10 10 h-46 q-10 0 -10 -10 z" fill="#E7D9A8" opacity=".8"/>`;
  s += `<rect x="93" y="86" width="54" height="24" rx="3" fill="#FFFFFF" stroke="#C9CED4"/>`;
  s += `<rect x="94" y="16" width="52" height="28" rx="6" fill="${tapon}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
  s += `<circle cx="120" cy="30" r="7" fill="#D9DEE3" stroke="rgba(0,0,0,.2)"/>`;
  return svg(s);
}

// ------------------------------------------------------------------ residuos
const BIO = (x, y, t = 26, col = "#111") => `<text x="${x}" y="${y}" font-size="${t}" text-anchor="middle" fill="${col}">☣</text>`;
function bolsa(color, simbolo = false, borde = "rgba(0,0,0,.3)") {
  let s = `<path d="M70 70 q50 -30 100 0 l12 100 q-62 18 -124 0 z" fill="${color}" stroke="${borde}" stroke-width="2"/>`;
  s += `<path d="M98 58 q22 -40 44 0" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
        <path d="M98 58 q22 -40 44 0" fill="none" stroke="${borde}" stroke-width="2"/>`;
  if (simbolo) s += BIO(120, 138, 40);
  return s;
}
const RES_VERDE_BLANCA = () => svg(`<g transform="translate(-40 0) scale(.85) translate(10 20)">${bolsa("#3E9A4A")}</g>
  <g transform="translate(60 0) scale(.85) translate(10 20)">${bolsa("#F7F7F5", false, "#9AA3AD")}</g>`);
const RES_ROJA = () => svg(bolsa("#C62828", true));
const RES_PUNZANTE = () => svg(`<rect x="72" y="70" width="96" height="104" rx="8" fill="#F2C230" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
  <rect x="66" y="56" width="108" height="20" rx="6" fill="#D9A41C" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
  <rect x="104" y="58" width="32" height="8" rx="3" fill="#333"/>
  <line x1="120" y1="20" x2="120" y2="60" stroke="#8A939C" stroke-width="3"/><rect x="113" y="6" width="14" height="18" rx="3" fill="#7FB2EE"/>
  ${BIO(120, 138, 40)}`);
const RES_AZUL = () => svg(`<rect x="66" y="66" width="108" height="108" rx="8" fill="#1F5FA8" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
  <rect x="60" y="52" width="120" height="20" rx="6" fill="#174C88" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
  <rect x="98" y="54" width="44" height="8" rx="3" fill="#0E2F55"/>`);
const RES_ACERO = () => svg(`<defs><linearGradient id="acero" x1="0" x2="1"><stop offset="0" stop-color="#7C858E"/><stop offset=".45" stop-color="#E3E7EA"/><stop offset="1" stop-color="#6E777F"/></linearGradient></defs>
  <rect x="78" y="44" width="84" height="130" rx="10" fill="url(#acero)" stroke="#4E565E" stroke-width="2"/>
  <ellipse cx="120" cy="44" rx="42" ry="10" fill="#B9C0C6" stroke="#4E565E" stroke-width="2"/>
  <line x1="78" y1="84" x2="162" y2="84" stroke="#4E565E" stroke-width="2"/><line x1="78" y1="134" x2="162" y2="134" stroke="#4E565E" stroke-width="2"/>`);

// ------------------------------------------------------------------ campo de microscopio
function campo(contenido, fondo = "#F6EEF0") {
  return svg(`<defs><clipPath id="cmp"><circle cx="120" cy="100" r="92"/></clipPath></defs>
    <circle cx="120" cy="100" r="96" fill="#1B1D21"/>
    <g clip-path="url(#cmp)"><rect width="${W}" height="${H}" fill="${fondo}"/>${contenido}</g>
    <circle cx="120" cy="100" r="92" fill="none" stroke="#2B2F36" stroke-width="4"/>`);
}
const VIOLETA = "#4B2A8C", ROSA = "#D2486E";
const coco = (x, y, r, col) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${col}"/>`;
function racimos(col) {
  const R = rngSemilla(7); let s = "";
  for (const [cx, cy] of [[80, 70], [150, 85], [105, 135], [165, 140], [60, 120]]) {
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = R() * 16; s += coco(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4.6, col); }
  }
  return s;
}
function cadenas(col) {
  let s = "";
  const lineas = [[[40, 60], [200, 90]], [[50, 150], [190, 120]], [[90, 30], [130, 180]]];
  for (const [[x1, y1], [x2, y2]] of lineas) {
    const n = 15;
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = Math.sin(t * 9) * 6;
      s += `<ellipse cx="${(x1 + (x2 - x1) * t + w).toFixed(1)}" cy="${(y1 + (y2 - y1) * t).toFixed(1)}" rx="5.2" ry="4.4" fill="${col}"/>`;
    }
  }
  return s;
}
function diplococosLanceolados() {
  const R = rngSemilla(11); let s = "";
  for (let i = 0; i < 9; i++) {
    const x = 50 + R() * 140, y = 40 + R() * 120, a = R() * 180;
    s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})">
      <ellipse cx="0" cy="0" rx="17" ry="11" fill="#FFFFFF" stroke="#D9D2E6"/>
      <path d="M-12 0 q6 -7 11 0 q-5 7 -11 0z" fill="${VIOLETA}"/><path d="M12 0 q-6 -7 -11 0 q5 7 11 0z" fill="${VIOLETA}"/></g>`;
  }
  return s;
}
function diplococosRinon() {
  const R = rngSemilla(5);
  // neutrófilo con diplococos dentro (como en el gonococo)
  let s = `<circle cx="120" cy="100" r="44" fill="#E9D3E0"/>
    <path d="M95 92 q8 -18 22 -8 q12 -14 24 0 q14 4 6 20 q-10 10 -20 2 q-12 12 -24 2 q-14 -2 -8 -16z" fill="#6A3C8C"/>`;
  // dos «granos de café» enfrentados por su lado plano
  const par = (x, y, a) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})">
    <path d="M-1.5 -7 a6 7 0 1 0 0 14 z" fill="${ROSA}"/><path d="M1.5 -7 a6 7 0 1 1 0 14 z" fill="${ROSA}"/></g>`;
  for (let i = 0; i < 5; i++) s += par(98 + i * 11, 118 + (i % 2) * 10, R() * 40 - 20);
  for (let i = 0; i < 6; i++) s += par(30 + R() * 180, R() < .5 ? 30 + R() * 25 : 160 + R() * 20, R() * 180);
  return s;
}
function bacilos(col, espora = false) {
  const R = rngSemilla(espora ? 3 : 9); let s = "";
  for (let i = 0; i < 18; i++) {
    const x = 40 + R() * 160, y = 30 + R() * 140, a = R() * 180, L = espora ? 26 : 20;
    s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})"><rect x="${-L / 2}" y="-4" width="${L}" height="8" rx="4" fill="${col}"/>
      ${espora ? `<ellipse cx="${L / 2 - 6}" cy="0" rx="4.5" ry="3.2" fill="#FFFFFF"/>` : ""}</g>`;
  }
  return s;
}

// ------------------------------------------------------------------ leucocitos (frotis)
function hematies(R, evitar) {
  let s = "";
  for (let i = 0; i < 26; i++) {
    const x = 20 + R() * 200, y = 15 + R() * 170;
    if (Math.hypot(x - 120, y - 100) < evitar) continue;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="#E8A3A6"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#F1C3C4"/>`;
  }
  return s;
}
function granulos(R, n, r, col, rad, op = 1) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, d = Math.sqrt(R()) * rad;
    s += `<circle cx="${(120 + Math.cos(a) * d).toFixed(1)}" cy="${(100 + Math.sin(a) * d).toFixed(1)}" r="${r}" fill="${col}" opacity="${op}"/>`;
  }
  return s;
}
function leuco(tipo) {
  const R = rngSemilla({ neutro: 1, eosino: 2, baso: 3, linfo: 4, mono: 5 }[tipo]);
  let s = "";
  if (tipo === "neutro") {
    s += hematies(R, 44) + `<circle cx="120" cy="100" r="36" fill="#EAD7E4"/>` + granulos(R, 70, 1.2, "#C49AB8", 32, .8);
    s += `<g fill="#5B2C83"><ellipse cx="102" cy="94" rx="10" ry="12"/><ellipse cx="122" cy="86" rx="10" ry="11"/><ellipse cx="138" cy="102" rx="9" ry="12"/><ellipse cx="118" cy="114" rx="10" ry="9"/></g>
      <g stroke="#5B2C83" stroke-width="3"><line x1="108" y1="90" x2="116" y2="88"/><line x1="130" y1="92" x2="134" y2="96"/><line x1="134" y1="110" x2="126" y2="114"/></g>`;
  } else if (tipo === "eosino") {
    s += hematies(R, 46) + `<circle cx="120" cy="100" r="38" fill="#F2D9C9"/>` + granulos(R, 120, 3, "#E0612F", 34);
    s += `<g fill="#4E2A73"><ellipse cx="104" cy="98" rx="13" ry="15"/><ellipse cx="138" cy="98" rx="13" ry="15"/></g><line x1="116" y1="98" x2="126" y2="98" stroke="#4E2A73" stroke-width="4"/>`;
  } else if (tipo === "baso") {
    s += hematies(R, 42) + `<circle cx="120" cy="100" r="34" fill="#D9CDE6"/>`;
    s += `<g fill="#6A4F8C" opacity=".75"><ellipse cx="108" cy="98" rx="12" ry="14"/><ellipse cx="132" cy="100" rx="12" ry="13"/></g>` + granulos(R, 70, 3.6, "#24113A", 31);
  } else if (tipo === "linfo") {
    s += hematies(R, 28) + `<circle cx="120" cy="100" r="19" fill="#8FB6E3"/><circle cx="118" cy="100" r="16" fill="#3D2470"/>`;
  } else if (tipo === "mono") {
    s += hematies(R, 54) + `<path d="M74 96 q4 -40 48 -44 q44 2 46 44 q-2 44 -48 46 q-44 -4 -46 -46z" fill="#C9D0E0"/>`;
    s += granulos(R, 10, 3, "#F4F6FA", 34);
    s += `<path d="M92 84 q24 -16 52 -2 q8 16 -4 30 q-10 -12 -22 -2 q-14 10 -24 -4 q-8 -10 -2 -22z" fill="#6E58A0"/>`;
  }
  return campo(s, "#F7EFF0");
}

// ------------------------------------------------------------------ mazos
export const MAZOS = [
  {
    id: "tubos", nombre: "Tubos de extracción", pregunta: "¿Qué tubo es (tapón)?",
    tarjetas: [
      { n: "Rojo · tubo seco", d: "Sin aditivos: suero (se deja coagular al menos 10 min y se centrifuga).", img: () => tubo("#C62828") },
      { n: "Amarillo · gel separador", d: "Suero con gel que lo separa del coágulo al centrifugar.", img: () => tubo("#F2C230", { gel: true }) },
      { n: "Lila · EDTA", d: "Hematología (hemograma) y genética: no altera la morfología.", img: () => tubo("#9C6ADE") },
      { n: "Verde · heparina", d: "Bioquímica en plasma y gasometrías (inhibe la trombina).", img: () => tubo("#2E8B57") },
      { n: "Azul celeste · citrato", d: "Coagulación. «El cielo coagula».", img: () => tubo("#7EC8E3") },
      { n: "Negro · citrato (VSG)", d: "Velocidad de sedimentación: citrato a otra concentración.", img: () => tubo("#1E1E1E") },
      { n: "Gris · fluoruro-oxalato", d: "Glucosa y ácido láctico: el fluoruro frena la glucólisis.", img: () => tubo("#8C939B") },
    ],
  },
  {
    id: "hemocultivo", nombre: "Frascos de hemocultivo", pregunta: "¿Qué frasco es?",
    tarjetas: [
      { n: "Aerobio · tapón azul", d: "Adulto: 15-20 ml; 2 o 3 hemocultivos, cada uno de una vena distinta.", img: () => frasco("#1F5FA8") },
      { n: "Anaerobio · tapón rojo", d: "Adulto: frasco aerobio + anaerobio. Proporción sangre/medio 1:10.", img: () => frasco("#C62828") },
      { n: "Pediátrico · tapón amarillo", d: "Un solo frasco; niño: 1-3 ml. Nunca a la nevera.", img: () => frasco("#F2C230") },
    ],
  },
  {
    id: "residuos", nombre: "Residuos sanitarios", pregunta: "¿Qué residuo va aquí?",
    tarjetas: [
      { n: "Inertes (material de curas)", d: "Bolsas de mayor galga, VERDES o BLANCAS; recogida municipal.", img: RES_VERDE_BLANCA },
      { n: "Sólidos infecciosos", d: "Bolsa ROJA con el símbolo de riesgo biológico.", img: RES_ROJA },
      { n: "Punzantes y cortantes", d: "Envase RÍGIDO con riesgo biológico. La aguja va sin reencapuchar ni doblar.", img: RES_PUNZANTE },
      { n: "Citotóxicos", d: "Contenedor AZUL rígido con riesgo citotóxico.", img: RES_AZUL },
      { n: "Radiactivos", d: "Contenedor de acero inoxidable blindado con plomo.", img: RES_ACERO },
    ],
  },
  {
    id: "gram", nombre: "Bacterias al Gram", pregunta: "¿Qué estás viendo al microscopio?",
    tarjetas: [
      { n: "Cocos grampositivos en racimos · Staphylococcus", d: "Violeta (Gram +). Catalasa + → Staphylococcus.", img: () => campo(racimos(VIOLETA)) },
      { n: "Cocos grampositivos en cadenas · Streptococcus", d: "Violeta en cadenas o parejas. Catalasa − → Streptococcus.", img: () => campo(cadenas(VIOLETA)) },
      { n: "Diplococos grampositivos lanceolados capsulados · neumococo", d: "Halo claro = cápsula. Optoquina sensible.", img: () => campo(diplococosLanceolados()) },
      { n: "Diplococos gramnegativos en riñón · Neisseria", d: "Rojos (Gram −); el gonococo se ve dentro de los neutrófilos.", img: () => campo(diplococosRinon()) },
      { n: "Bacilos gramnegativos · enterobacterias (E. coli)", d: "Rojos con safranina: perdieron el violeta en la decoloración.", img: () => campo(bacilos(ROSA)) },
      { n: "Bacilos grampositivos esporulados · Bacillus / Clostridium", d: "Violeta con una zona clara: la espora, forma de resistencia.", img: () => campo(bacilos(VIOLETA, true)) },
    ],
  },
  {
    id: "leucocitos", nombre: "Leucocitos en el frotis", pregunta: "¿Qué célula es?",
    tarjetas: [
      { n: "Neutrófilo", d: "Núcleo de 2-5 lóbulos, gránulos finos y pálidos. 50-70 %; forman el pus.", img: () => leuco("neutro") },
      { n: "Eosinófilo", d: "Núcleo bilobulado «en gafas» y gránulos rojo-anaranjados. Alergia y parásitos.", img: () => leuco("eosino") },
      { n: "Basófilo", d: "Gránulos grandes negro-morados que tapan el núcleo. Histamina y heparina.", img: () => leuco("baso") },
      { n: "Linfocito", d: "Núcleo redondo que ocupa casi toda la célula; poco citoplasma azul.", img: () => leuco("linfo") },
      { n: "Monocito", d: "La más grande; núcleo arriñonado y citoplasma gris-azulado. En tejidos: macrófago.", img: () => leuco("mono") },
    ],
  },
];
