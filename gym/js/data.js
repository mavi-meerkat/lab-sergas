// Plan de entreno (fuente: "TREN SUPERIOR DELANTERO.pdf" de Ana).
// Cada semana = una fase del ciclo. Lunes A, martes B, miércoles cardio 1, jueves C, viernes cardio 2.

export const FASES = [
  { n: 1, id: "menstrual", nombre: "Fase menstrual", lema: "Baja energía", color: "#C2456B" },
  { n: 2, id: "folicular", nombre: "Fase folicular", lema: "Alta energía", color: "#2E8B6A" },
  { n: 3, id: "ovulatoria", nombre: "Fase ovulatoria", lema: "Fuerza máxima", color: "#D08A1E" },
  { n: 4, id: "lutea", nombre: "Fase lútea", lema: "Energía decreciente", color: "#7A5BB5" },
];

// Catálogo de ejercicios: nombre, zona trabajada y figura (ver figuras.js).
export const EJ = {
  pressMaqPlano:   { nombre: "Press de pecho en máquina plano", zona: "Pecho", equipo: "Máquina" },
  pressMaqInc:     { nombre: "Press de pecho en máquina inclinado", zona: "Pecho", equipo: "Máquina" },
  aperturas:       { nombre: "Aperturas de pecho con mancuernas", zona: "Pecho", equipo: "Mancuernas · banco plano" },
  elevFrontal:     { nombre: "Elevaciones frontales alternas con mancuernas", zona: "Hombro", equipo: "Mancuernas", doble: "brazo", nota: "Ejercicio alterno: 1 repetición = los dos brazos, por eso cuenta el doble de tiempo." },
  curlPolea:       { nombre: "Curl de bíceps en polea baja", zona: "Bíceps", equipo: "Polea baja" },
  pressMancInc:    { nombre: "Press con mancuernas en banco inclinado", zona: "Pecho", equipo: "Mancuernas · banco inclinado" },
  pressMancPlano:  { nombre: "Press con mancuernas en banco plano", zona: "Pecho", equipo: "Mancuernas · banco plano" },
  pressHombro:     { nombre: "Press de hombros con mancuernas", zona: "Hombro", equipo: "Mancuernas · banco" },
  curlSimul:       { nombre: "Curl de bíceps con mancuernas (simultáneo)", zona: "Bíceps", equipo: "Mancuernas" },
  elevCombinada:   { nombre: "Elevaciones combinadas (frontal + lateral)", zona: "Hombro", equipo: "Mancuernas", nota: "1 elevación frontal + 1 elevación lateral = 1 repetición." },
  curlAlterno:     { nombre: "Curl de bíceps con mancuernas (alterno)", zona: "Bíceps", equipo: "Mancuernas", doble: "brazo", nota: "Ejercicio alterno: 1 repetición = los dos brazos, por eso cuenta el doble de tiempo." },
  elevLateral:     { nombre: "Elevaciones laterales con mancuernas", zona: "Hombro", equipo: "Mancuernas" },

  jalonNuca:       { nombre: "Jalón trasnuca con barra larga", zona: "Espalda", equipo: "Polea alta" },
  jalonMedia:      { nombre: "Jalón al pecho con barra media", zona: "Espalda", equipo: "Polea alta" },
  jalonCorta:      { nombre: "Jalón al pecho con barra corta", zona: "Espalda", equipo: "Polea alta" },
  remoCorta:       { nombre: "Remo en polea baja con barra corta", zona: "Espalda", equipo: "Polea baja" },
  remoLarga:       { nombre: "Remo en polea baja con barra larga", zona: "Espalda", equipo: "Polea baja" },
  cubana:          { nombre: "Rotación cubana / «Espantapájaros»", zona: "Espalda · manguito rotador", equipo: "Mancuernas" },
  facePull:        { nombre: "Face Pull en polea alta", zona: "Hombro posterior", equipo: "Polea alta · cuerda" },
  tricepsCuerda:   { nombre: "Extensión de tríceps con cuerda doble", zona: "Tríceps", equipo: "Polea alta · cuerda" },
  chestPull:       { nombre: "Chest Pull en polea alta", zona: "Espalda", equipo: "Polea alta" },
  fondosBanco:     { nombre: "Fondos de tríceps en banco", zona: "Tríceps", equipo: "Banco" },
  tricepsBarra:    { nombre: "Extensión de tríceps con barra", zona: "Tríceps", equipo: "Polea alta · barra" },
  aperturaAlterna: { nombre: "Elevación / apertura alterna con mancuernas", zona: "Espalda · hombro posterior", equipo: "Mancuernas", doble: "brazo", nota: "Ejercicio alterno: 1 repetición = los dos brazos, por eso cuenta el doble de tiempo." },
  crucesInv:       { nombre: "Cruces invertidos en polea", zona: "Hombro posterior", equipo: "Polea" },

  prensa:          { nombre: "Prensa de piernas", zona: "Cuádriceps", equipo: "Máquina" },
  extCuad:         { nombre: "Extensión de cuádriceps", zona: "Cuádriceps", equipo: "Máquina" },
  curlFemoral:     { nombre: "Curl femoral en máquina", zona: "Isquios", equipo: "Máquina" },
  abductores:      { nombre: "Máquina de abductores (abrir)", zona: "Glúteo", equipo: "Máquina" },
  aductores:       { nombre: "Máquina de aductores (cerrar)", zona: "Aductores", equipo: "Máquina", nota: "Misma máquina, seguido del anterior." },
  goblet:          { nombre: "Sentadilla Goblet con mancuerna", zona: "Cuádriceps", equipo: "Mancuerna" },
  rumano:          { nombre: "Peso muerto rumano con mancuernas", zona: "Isquios", equipo: "Mancuernas" },
  hipThrust:       { nombre: "Hip Thrust con mancuerna", zona: "Glúteo", equipo: "Mancuerna · banco" },
  sumo:            { nombre: "Sentadilla Sumo con mancuerna", zona: "Aductores", equipo: "Mancuerna" },
  hack:            { nombre: "Sentadilla Hack en máquina", zona: "Cuádriceps", equipo: "Máquina" },
  rumanoUni:       { nombre: "Peso muerto rumano a una pierna", zona: "Isquios", equipo: "Mancuernas ligeras · banco", doble: "pierna", nota: "Ejercicio por pierna: haces las repeticiones con una pierna y luego con la otra, por eso cuenta el doble de tiempo." },
};

// Volumen por fase (para espalda y pierna el PDF no lo indica: se usan los de tren superior delantero).
const VOL = {
  1: { series: 3, reps: "12–15", repsMax: 15, descanso: 45, intensidad: "Baja (pesos ligeros y el propio peso de las máquinas)" },
  2: { series: 3, reps: "8–10", repsMax: 10, descanso: 60, intensidad: "Alta (pesos desafiantes, las últimas repeticiones deben costar)" },
  3: { series: 3, reps: "6–8", repsMax: 8, descanso: 60, intensidad: "Muy alta (tu peso máximo posible manteniendo la técnica)" },
  4: { series: 3, reps: "10–12", repsMax: 12, descanso: 60, intensidad: "Moderada (pesos medios-ligeros)" },
};

const e = (id, detalle = "") => ({ id, detalle });

export const BLOQUES = {
  A: {
    nombre: "Pecho, hombro y bíceps", corto: "Tren superior delantero",
    semanas: {
      1: { intro: "Primero las dos máquinas para quitarte esa zona y luego bancos y polea.", vol: { ...VOL[1], descanso: 45 },
        ej: [e("pressMaqPlano", "Sin cargar peso"), e("pressMaqInc", "Sin cargar peso"), e("aperturas", "Peso ligero, bajada lenta"), e("elevFrontal"), e("curlPolea")] },
      2: { intro: "Todo en la zona de peso libre (bancos y mancuernas), sin pisar las máquinas.", vol: VOL[2],
        ej: [e("pressMancInc"), e("pressMancPlano"), e("aperturas"), e("pressHombro"), e("curlSimul", "Ambos brazos a la vez")] },
      3: { intro: "Todo en la zona de bancos para aprovechar al máximo tu fuerza con las mancuernas.", vol: VOL[3],
        ej: [e("pressMancPlano", "Busca tus mancuernas más pesadas"), e("pressMancInc"), e("aperturas", "Muy controladas en la apertura"), e("elevCombinada"), e("curlAlterno", "Toda la fuerza en un brazo cada vez")] },
      4: { intro: "Una única máquina al principio y rápido a peso libre con mancuernas más ligeras y polea.", vol: { ...VOL[4], descanso: 60, descansoTxt: "45–60 s" },
        ej: [e("pressMaqInc", "Sin cargar peso"), e("pressMancPlano", "Menos peso que en las semanas 2 y 3"), e("aperturas"), e("elevLateral"), e("curlPolea")] },
    },
  },
  B: {
    nombre: "Espalda, hombro posterior y tríceps", corto: "Tren superior posterior",
    semanas: {
      1: { intro: "", vol: VOL[1], ej: [e("jalonNuca"), e("jalonMedia"), e("remoCorta"), e("cubana"), e("facePull"), e("tricepsCuerda")] },
      2: { intro: "", vol: VOL[2], ej: [e("jalonMedia"), e("jalonCorta"), e("remoLarga"), e("chestPull"), e("facePull"), e("fondosBanco")] },
      3: { intro: "", vol: VOL[3], ej: [e("jalonMedia"), e("jalonCorta"), e("remoCorta", "Peso máximo"), e("chestPull", "Peso máximo"), e("facePull", "Peso máximo"), e("tricepsBarra")] },
      4: { intro: "", vol: VOL[4], ej: [e("jalonNuca"), e("jalonCorta"), e("remoLarga"), e("aperturaAlterna"), e("crucesInv", "Con el peso único disponible"), e("tricepsCuerda")] },
    },
  },
  C: {
    nombre: "Tren inferior", corto: "Tren inferior",
    semanas: {
      1: { intro: "Supervivencia y cero estrés lumbar. Todo en máquina: te sientas y trabajas sin estabilizar el tronco.", vol: VOL[1],
        ej: [e("prensa", "Bajada controlada, sin presionar la barriga"), e("extCuad"), e("curlFemoral"), e("abductores"), e("aductores")] },
      2: { intro: "Alta energía y rango de movimiento. Entran el Hip Thrust y la Sentadilla Sumo, con mancuernas.", vol: VOL[2],
        ej: [e("prensa", "Bajando profundo"), e("goblet"), e("rumano"), e("hipThrust"), e("sumo")] },
      3: { intro: "Tu pico de fuerza: los pesos más pesados del mes, de forma segura.", vol: VOL[3],
        ej: [e("prensa", "Busca tu récord de peso"), e("hack", "Fuerza máxima guiada"), e("rumano", "O curl femoral si prefieres tirar peso en máquina"), e("hipThrust", "Peso máximo"), e("sumo", "Peso máximo")] },
      4: { intro: "Debilidad y bombeo. Sin prensa pesada: aislamos en máquinas y trabajo unilateral.", vol: VOL[4],
        ej: [e("goblet", "Peso ligero/medio"), e("extCuad"), e("rumanoUni", "Casi sin peso en las manos"), e("abductores"), e("aductores")] },
    },
  },
};

// Cardio en cinta: bloques con minutos, velocidad (km/h) e inclinación (%).
const b = (tipo, min, vel, inc) => ({ tipo, min, vel, inc });
const rep = (n, ...bs) => Array.from({ length: n }, () => bs).flat();
const CAL = (vel, inc) => b("Calentamiento", 5, vel, inc);
const ENF = b("Enfriamiento", 5, "4.0", "0");

export const CARDIO = {
  1: {
    lema: "Cardio suave y regulador", intro: "Velocidades moderadas, flujo constante sin sobrecargar la zona pélvica.",
    s1: [CAL("4.5", "0–2"), b("Bloque principal", 20, "5.0", "6–8"), ENF],
    s2: [CAL("4.5", "0"), b("Bloque principal", 40, "4.8–5.0", "5–6"), ENF],
    notaS2: "El bloque principal puede ser de 35–40 min.",
  },
  2: {
    lema: "Intervalos de quema y subida", intro: "Subimos un punto la velocidad de crucero y exprimimos las pendientes.",
    s1: [CAL("4.8", "0–2"), ...rep(4, b("Subida", 3, "5.2–5.5", "10–12"), b("Recupera", 2, "4.8", "4–5")), ENF],
    s2: [CAL("4.8", "0"), ...rep(5, b("Subida", 5, "5.0–5.2", "10"), b("Recupera", 3, "4.8", "5")), ENF],
  },
  3: {
    lema: "Pico de intensidad y pendiente máxima", intro: "Caminatas de auténtica montaña a velocidad controlada.",
    s1: [CAL("5.0", "0–2"), ...rep(3, b("Subida larga", 7, "5.2–5.5", "12–14"), b("Recupera", 2, "4.8", "6")), ENF],
    s2: [CAL("5.0", "0"), ...rep(4, b("Subida", 6, "5.2–5.5", "12"), b("Recupera", 3, "4.8", "5–6")), b("Subida", 4, "5.2–5.5", "12"), ENF],
  },
  4: {
    lema: "Cardio regulador y antihinchazón", intro: "Velocidad contenida para no estresar el sistema nervioso antes de la regla.",
    s1: [CAL("4.5", "0–2"), b("Bloque principal", 20, "4.8–5.0", "7–9"), ENF],
    s2: [CAL("4.5", "0"), ...rep(5, b("Subida", 4, "4.8–5.0", "8"), b("Recupera", 4, "4.5", "4")), ENF],
  },
};

// Lunes=1 … domingo=7
export const DIAS = {
  1: { tipo: "fuerza", bloque: "A" },
  2: { tipo: "fuerza", bloque: "B" },
  3: { tipo: "cardio", sesion: "s1", nombre: "Cardio · 30 min" },
  4: { tipo: "fuerza", bloque: "C" },
  5: { tipo: "cardio", sesion: "s2", nombre: "Cardio · 45–50 min" },
  6: { tipo: "descanso" },
  7: { tipo: "descanso" },
};
export const NOMBRE_DIA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function sesionDe(dia, semana) {
  const d = DIAS[dia];
  if (d.tipo === "fuerza") {
    const bl = BLOQUES[d.bloque], s = bl.semanas[semana];
    return { tipo: "fuerza", key: `${d.bloque}${semana}`, bloque: d.bloque, titulo: bl.nombre, subtitulo: bl.corto, intro: s.intro, vol: s.vol,
      ejercicios: s.ej.map((x) => ({ ...x, ...EJ[x.id] })) };
  }
  if (d.tipo === "cardio") {
    const c = CARDIO[semana];
    return { tipo: "cardio", key: `${d.sesion}-${semana}`, titulo: d.sesion === "s1" ? "Cardio corto" : "Cardio largo", subtitulo: c.lema,
      intro: c.intro, bloques: c[d.sesion], nota: d.sesion === "s2" ? c.notaS2 : "" };
  }
  return { tipo: "descanso", key: "descanso", titulo: "Descanso" };
}
