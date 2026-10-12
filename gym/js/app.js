import { FASES, EJ, BLOQUES, CARDIO, DIAS, NOMBRE_DIA, sesionDe } from "./data.js";
import * as db from "./store.js";
import { animar, svgEstatico, pararAnimaciones } from "./figuras.js";

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fase = (n) => FASES[n - 1];
const DIF = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
const fmtKg = (n) => (Math.round(n * 10) / 10).toString().replace(".", ",");
const SERIE_SEG = 40; // tiempo estimado de trabajo por serie
// Alternos (1 rep = los dos brazos) y unilaterales (todas las reps con una pierna y luego la otra) duran el doble.
const segSerie = (e) => SERIE_SEG * (e && EJ[e.id]?.doble ? 2 : 1);
const ICON = {
  hoy: '<path d="M4 9h16M8 3v4M16 3v4"/><rect x="4" y="5" width="16" height="16" rx="3"/><circle cx="12" cy="15" r="1.6" class="fillc"/>',
  plan: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  prog: '<path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" class="ico">${ICON[k]}</svg>`;

function ponFase(n) { document.documentElement.style.setProperty("--acc", fase(n).color); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", fase(n).color); }

// ---------- Sonido (pitidos) ----------
let ctx = null;
function audioOn() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "transient";
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch {}
}
function pitido(freq = 880, dur = 0.14, cuando = 0) {
  if (!db.st().ajustes.sonido || !ctx) return;
  try {
    const t = ctx.currentTime + cuando, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}
const pitidoFin = () => { pitido(988, 0.18); pitido(988, 0.18, 0.25); pitido(1318, 0.45, 0.5); };

// ---------- Pantalla encendida ----------
let lock = null;
async function mantenerPantalla(on) {
  try {
    if (on && "wakeLock" in navigator && document.visibilityState === "visible") { if (!lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => (lock = null)); } }
    else if (!on && lock) { await lock.release(); lock = null; }
  } catch {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && enEntreno()) mantenerPantalla(true); });
const enEntreno = () => location.hash.startsWith("#/entreno/");

// ---------- Rutas ----------
function ruta() {
  const [, r, a, b] = (location.hash || "#/hoy").split("/");
  return { r: r || "hoy", a: a ? decodeURIComponent(a) : null, b };
}
function ir(h) { if (location.hash === h) render(); else location.hash = h; }
window.addEventListener("hashchange", render);

function render() {
  pararAnimaciones();
  const { r, a, b } = ruta();
  if (r !== "entreno") mantenerPantalla(false);
  let html = "";
  if (r === "entreno" && a) html = vEntreno(a);
  else if (r === "plan") html = vPlan(+(a || db.infoSemana().semana));
  else if (r === "ej" && a) html = vEjercicio(a, +(b || 0));
  else if (r === "progreso") html = vProgreso();
  else if (r === "ajustes") html = vAjustes();
  else html = vHoy();
  const tabs = r === "entreno" ? "" : barra(r === "ej" ? "plan" : r);
  $app.innerHTML = `<main class="vista ${r}">${html}</main>${tabs}`;
  window.scrollTo(0, 0);
  montar(r, a, b);
}
function barra(act) {
  const t = (k, h, n) => `<a href="#/${h}" class="tab ${act === k ? "on" : ""}">${ico(k === "progreso" ? "prog" : k)}<span>${n}</span></a>`;
  return `<nav class="tabs">${t("hoy", "hoy", "Hoy")}${t("plan", "plan", "Plan")}${t("progreso", "progreso", "Progreso")}${t("ajustes", "ajustes", "Ajustes")}</nav>`;
}

// ---------- Estimación de tiempos ----------
function estimar(s) {
  if (s.tipo === "cardio") return s.bloques.reduce((m, x) => m + x.min, 0) * 60;
  const n = s.ejercicios.length;
  return s.ejercicios.reduce((m, e) => m + s.vol.series * segSerie(e), 0) + n * (s.vol.series - 1) * s.vol.descanso + (n - 1) * db.st().ajustes.cambioEj;
}
function repartoTxt(s) {
  if (s.tipo === "cardio") return `${s.bloques.length} bloques en cinta`;
  const n = s.ejercicios.length;
  return `${n} ejercicios · ${s.vol.series} series de ${s.vol.reps} · descanso ${s.vol.descansoTxt || s.vol.descanso + " s"}`;
}

// ---------- HOY ----------
function planDe(fecha) {
  const ses = db.sesion(fecha);
  const info = db.infoSemana(fecha);
  const dia = ses?.dia || db.diaISO(db.parse(fecha));
  const semana = ses?.semana || info.semana;
  return { ses, info, dia, semana, plan: sesionDe(dia, semana) };
}
function estadoSesion(ses) {
  if (!ses) return "pend";
  if (ses.fin || ses.cardio?.hecho) return "hecho";
  if (ses.inicio || ses.cardio?.inicio) return "curso";
  return "pend";
}

function vHoy() {
  const f = db.hoy();
  const { ses, info, dia, semana, plan } = planDe(f);
  ponFase(semana);
  const F = fase(semana);
  const est = estadoSesion(ses);
  let aviso = "";
  if (info.sinRegla) aviso = `<div class="aviso">Aún no has registrado tu regla. Mientras tanto la app usa la <b>Semana 1</b>. Pulsa el botón de abajo el primer día de la regla.</div>`;
  else if (info.pasada) aviso = `<div class="aviso">Han pasado más de 4 semanas desde tu última regla (${db.fechaCorta(info.regla)}). Sigues en la <b>Semana 4</b> hasta que registres la nueva.</div>`;

  let tarjeta;
  if (plan.tipo === "descanso") {
    tarjeta = `<section class="card hoycard descanso"><div class="etq">${NOMBRE_DIA[dia]}</div><h2>Día de descanso</h2>
      <p class="suave">Si quieres recuperar un entreno de esta semana, elígelo aquí:</p>
      <div class="chips">${[1, 2, 3, 4, 5].map((d) => `<button class="chip" data-act="cambiaDia" data-d="${d}">${NOMBRE_DIA[d]}</button>`).join("")}</div></section>`;
  } else {
    const fig = plan.tipo === "cardio" ? "cinta" : plan.ejercicios[0].id;
    const boton = est === "hecho" ? `<a class="btn sec" href="#/entreno/${f}">Ver entreno de hoy ✓</a>` : `<a class="btn" href="#/entreno/${f}" data-act="audio">${est === "curso" ? "Continuar entreno" : "Empezar entreno"}</a>`;
    tarjeta = `<section class="card hoycard">
      <div class="hoyfig" data-fig="${fig}"></div>
      <div class="etq">${NOMBRE_DIA[dia]}${ses && ses.dia !== db.diaISO(db.parse(f)) ? " (recuperado)" : ""}</div>
      <h2>${esc(plan.titulo)}</h2>
      <p class="suave">${esc(plan.tipo === "cardio" ? plan.subtitulo : plan.vol.intensidad)}</p>
      <div class="reparto"><div><b>≈ ${Math.round(estimar(plan) / 60)} min</b><span>duración</span></div><div><b>${plan.tipo === "cardio" ? plan.bloques.length : plan.ejercicios.length}</b><span>${plan.tipo === "cardio" ? "bloques" : "ejercicios"}</span></div><div><b>${plan.tipo === "cardio" ? "Cinta" : plan.vol.descanso + " s"}</b><span>${plan.tipo === "cardio" ? "máquina" : "descanso"}</span></div></div>
      ${plan.intro ? `<p class="intro">${esc(plan.intro)}</p>` : ""}
      ${boton}
      ${est === "pend" ? `<details class="cambiar"><summary>Hacer otro entreno hoy</summary><div class="chips">${[1, 2, 3, 4, 5].filter((d) => d !== dia).map((d) => `<button class="chip" data-act="cambiaDia" data-d="${d}">${NOMBRE_DIA[d]}</button>`).join("")}</div></details>` : ""}
    </section>`;
  }

  // Tira de la semana
  const lunes = info.lunes;
  const tira = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const fe = db.sumaDias(lunes, d - 1), s = db.sesion(fe), e = estadoSesion(s);
    const p = sesionDe(s?.dia || d, s?.semana || semana);
    const ic = p.tipo === "descanso" ? "·" : p.tipo === "cardio" ? "♥" : { A: "Pec", B: "Esp", C: "Pie" }[p.bloque];
    const link = p.tipo !== "descanso" || s ? `href="#/entreno/${fe}"` : "";
    return `<a ${link} class="dia ${fe === f ? "hoy" : ""} ${e}"><span>${NOMBRE_DIA[d].slice(0, 1)}</span><b>${ic}</b><i>${e === "hecho" ? "✓" : ""}</i></a>`;
  }).join("");

  const ciclo = info.diaCiclo ? `Día ${info.diaCiclo} del ciclo` : "Sin regla registrada";
  return `<header class="cab">
      <div><div class="fecha">${NOMBRE_DIA[db.diaISO(new Date())]}, ${db.fechaCorta(f)}</div><h1>Semana ${semana}</h1></div>
      <div class="fasebadge"><b>${F.nombre}</b><span>${F.lema}</span></div>
    </header>
    <div class="ciclo"><span>${ciclo}${info.manual ? " · semana fijada a mano" : ""}</span>
      <div class="ruleta">${FASES.map((x) => `<i style="background:${x.color}" class="${x.n === semana ? "on" : ""}"></i>`).join("")}</div></div>
    ${aviso}
    ${tarjeta}
    <section class="card"><h3>Esta semana</h3><div class="tira">${tira}</div></section>
    <button class="btn regla" data-act="regla">🩸 Hoy me ha bajado la regla</button>
    <p class="nota">Si te bajó otro día, regístralo en Ajustes.</p>`;
}

// ---------- PLAN ----------
function vPlan(sem) {
  sem = Math.min(4, Math.max(1, sem || 1));
  ponFase(sem);
  const seg = FASES.map((x) => `<a href="#/plan/${x.n}" class="seg ${x.n === sem ? "on" : ""}" style="--c:${x.color}">S${x.n}</a>`).join("");
  const dias = [1, 2, 3, 4, 5].map((d) => {
    const p = sesionDe(d, sem);
    let cuerpo;
    if (p.tipo === "fuerza") {
      cuerpo = `<p class="suave">${esc(repartoTxt(p))}</p>${p.intro ? `<p class="intro">${esc(p.intro)}</p>` : ""}<ul class="lista">${p.ejercicios.map((e) =>
        `<li><a href="#/ej/${e.id}/${sem}" class="ejrow"><div class="thumb">${svgEstatico(e.id)}</div><div><b>${esc(e.nombre)}</b><span>${esc(e.zona)}${e.detalle ? " · " + esc(e.detalle) : ""}</span></div></a></li>`).join("")}</ul>`;
    } else {
      cuerpo = `<p class="intro">${esc(p.intro)}</p>${tablaCardio(p.bloques)}${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ""}`;
    }
    return `<details class="card dplan" ${d === db.diaISO(new Date()) ? "open" : ""}><summary><span class="etq">${NOMBRE_DIA[d]}</span><b>${esc(p.titulo)}</b><em>≈ ${Math.round(estimar(p) / 60)} min</em></summary>${cuerpo}</details>`;
  }).join("");
  const F = fase(sem);
  return `<header class="cab"><div><div class="fecha">Plan de 4 semanas</div><h1>Semana ${sem}</h1></div><div class="fasebadge"><b>${F.nombre}</b><span>${F.lema}</span></div></header>
    <div class="segs">${seg}</div>${dias}`;
}
function tablaCardio(bl) {
  return `<table class="tcardio"><thead><tr><th>Bloque</th><th>Min</th><th>km/h</th><th>Incl.</th></tr></thead><tbody>${bl.map((x) =>
    `<tr class="${x.tipo.startsWith("Recup") || x.tipo === "Enfriamiento" ? "suave" : ""}"><td>${esc(x.tipo)}</td><td>${x.min}</td><td>${x.vel}</td><td>${x.inc} %</td></tr>`).join("")}</tbody></table>`;
}

// ---------- DETALLE DE EJERCICIO ----------
function vEjercicio(id, sem) {
  const e = EJ[id];
  if (!e) return `<p>Ejercicio no encontrado.</p>`;
  if (sem) ponFase(sem);
  const donde = [];
  for (const [k, bl] of Object.entries(BLOQUES)) for (const [s, w] of Object.entries(bl.semanas)) if (w.ej.some((x) => x.id === id)) donde.push(`S${s}`);
  const h = db.historial(id);
  const filas = h.length ? h.map((r) => `<tr><td>${db.fechaCorta(r.fecha)}<small>S${r.semana}</small></td><td>${r.series.map((x) => `${fmtKg(+x.kg || 0)}×${x.reps}`).join(" · ") || "—"}</td><td>${r.dif ? `<span class="dif ${r.dif}">${DIF[r.dif]}</span>` : ""}</td></tr>`).join("")
    : `<tr><td colspan="3" class="suave">Todavía no hay registros.</td></tr>`;
  return `<a class="volver" href="javascript:history.back()">‹ Volver</a>
    <section class="card"><div class="bigfig" data-fig="${id}"></div><h2>${esc(e.nombre)}</h2>
    <div class="pills"><span>${esc(e.zona)}</span><span>${esc(e.equipo)}</span><span>En el plan: ${donde.join(", ")}</span></div>
    ${e.nota ? `<p class="intro">${esc(e.nota)}</p>` : ""}</section>
    <section class="card"><h3>Historial</h3>${grafica(h)}<table class="thist"><thead><tr><th>Fecha</th><th>kg × reps</th><th></th></tr></thead><tbody>${filas}</tbody></table></section>`;
}
function grafica(h) {
  const pts = [...h].reverse().map((r) => db.maxKg(r.series)).filter((x, i, a) => a.length);
  if (pts.length < 2) return "";
  const max = Math.max(...pts, 1), min = Math.min(...pts), W = 300, H = 70, rng = max - min || 1;
  const xy = pts.map((v, i) => [10 + (i * (W - 20)) / (pts.length - 1), H - 10 - ((v - min) / rng) * (H - 22)]);
  return `<svg viewBox="0 0 ${W} ${H}" class="graf"><polyline points="${xy.map((p) => p.join(",")).join(" ")}"/>${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5"/>${i === xy.length - 1 ? `<text x="${p[0] - 4}" y="${p[1] - 8}" text-anchor="end">${fmtKg(pts[i])} kg</text>` : ""}`).join("")}</svg>`;
}

// ---------- PROGRESO ----------
function vProgreso() {
  const ses = Object.values(db.st().sesiones).filter((s) => estadoSesion(s) !== "pend").sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const ids = [...new Set(ses.flatMap((s) => Object.values(s.ej || {}).map((r) => r.id)))];
  const ej = ids.map((id) => ({ id, h: db.historial(id) })).filter((x) => x.h.length).sort((a, b) => (a.h[0].fecha < b.h[0].fecha ? 1 : -1));
  const lista = ej.length ? ej.map(({ id, h }) => {
    const ult = h[0], mejor = Math.max(...h.map((r) => db.maxKg(r.series)));
    return `<li><a href="#/ej/${id}" class="ejrow"><div class="thumb">${svgEstatico(id)}</div><div><b>${esc(EJ[id].nombre)}</b><span>Última: ${fmtKg(db.maxKg(ult.series))} kg (${db.fechaCorta(ult.fecha)}) · Mejor: ${fmtKg(mejor)} kg</span></div>${ult.dif ? `<span class="dif ${ult.dif}">${DIF[ult.dif]}</span>` : ""}</a></li>`;
  }).join("") : `<li class="suave vacio">Cuando completes tu primer entreno verás aquí tus pesos y cómo evolucionan.</li>`;
  const hist = ses.slice(0, 30).map((s) => {
    const p = sesionDe(s.dia, s.semana);
    const dur = s.fin && s.inicio ? Math.round((s.fin - s.inicio) / 60000) + " min" : s.cardio?.hecho ? Math.round(estimar(p) / 60) + " min" : "en curso";
    const dif = s.cardio?.dif;
    return `<li><a href="#/entreno/${s.fecha}" class="sesrow"><i style="background:${fase(s.semana).color}"></i><div><b>${esc(p.titulo)}</b><span>${NOMBRE_DIA[db.diaISO(db.parse(s.fecha))]} ${db.fechaCorta(s.fecha)} · Semana ${s.semana} · ${dur}</span></div>${dif ? `<span class="dif ${dif}">${DIF[dif]}</span>` : ""}</a></li>`;
  }).join("");
  ponFase(db.infoSemana().semana);
  return `<header class="cab"><div><div class="fecha">Tu evolución</div><h1>Progreso</h1></div></header>
    <section class="card"><h3>Ejercicios</h3><ul class="lista">${lista}</ul></section>
    ${hist ? `<section class="card"><h3>Entrenos realizados</h3><ul class="lista">${hist}</ul></section>` : ""}`;
}

// ---------- AJUSTES ----------
function vAjustes() {
  const S = db.st(), info = db.infoSemana();
  ponFase(info.semana);
  const reglas = [...S.reglas].sort().reverse().map((r) => `<li class="fila"><span>🩸 ${db.fechaCorta(r)} ${db.parse(r).getFullYear()}</span><button class="mini" data-act="borraRegla" data-f="${r}">Borrar</button></li>`).join("") || `<li class="suave">Ninguna todavía.</li>`;
  return `<header class="cab"><div><div class="fecha">Configuración</div><h1>Ajustes</h1></div></header>
    <section class="card"><h3>Regla</h3><p class="suave">La semana (de lunes a domingo) en la que empieza la regla es la Semana 1. Cada lunes siguiente pasa a la semana 2, 3 y 4.</p>
      <div class="fila"><input type="date" id="fRegla" value="${db.hoy()}" max="${db.hoy()}"><button class="mini prim" data-act="addRegla">Añadir</button></div>
      <ul class="lista compacta">${reglas}</ul></section>
    <section class="card"><h3>Semana de esta semana</h3><p class="suave">Calculada: Semana ${info.auto}. Puedes fijarla a mano solo para esta semana.</p>
      <div class="segs">${["Auto", 1, 2, 3, 4].map((n, i) => `<button class="seg ${(i === 0 && !info.manual) || (info.manual && info.semana === n) ? "on" : ""}" style="--c:${i ? fase(n).color : "var(--txt2)"}" data-act="manual" data-n="${i ? n : 0}">${i ? "S" + n : n}</button>`).join("")}</div></section>
    <section class="card"><h3>Tiempos</h3>
      <label class="fila">Descanso al cambiar de ejercicio<select id="cambioEj">${[60, 90, 120, 150].map((s) => `<option value="${s}" ${S.ajustes.cambioEj === s ? "selected" : ""}>${s} s</option>`).join("")}</select></label>
      <label class="fila">Pitidos al terminar el descanso<input type="checkbox" id="sonido" class="sw" ${S.ajustes.sonido ? "checked" : ""}></label>
      <button class="mini" data-act="probar">Probar sonido</button>
      <p class="nota">Si el iPhone está en silencio puede que no suene: la pantalla también parpadea al acabar cada descanso.</p></section>
    <section class="card"><h3>Copia de seguridad</h3><p class="suave">Tus datos se guardan solo en este iPhone. Haz una copia de vez en cuando y guárdala en Archivos o iCloud.</p>
      <div class="fila"><button class="mini prim" data-act="exportar">Exportar copia</button><label class="mini">Importar copia<input type="file" id="imp" accept=".json,application/json" hidden></label></div></section>
    <section class="card"><h3>Instalar en el iPhone</h3><ol class="pasos"><li>Abre esta página en Safari, Chrome o Brave.</li><li>Pulsa <b>Compartir</b> (el cuadrado con la flecha).</li><li>Elige <b>Añadir a pantalla de inicio</b> y confirma.</li><li>Abre la app desde el icono: funciona sin conexión.</li></ol></section>
    <button class="btn peligro" data-act="borrarTodo">Borrar todos los datos</button>`;
}

// ---------- ENTRENO ----------
function vEntreno(fecha) {
  const { ses, dia, semana, plan } = planDe(fecha);
  ponFase(semana);
  if (plan.tipo === "descanso") return `<a class="volver" href="#/hoy">‹ Hoy</a><section class="card"><h2>Día de descanso</h2></section>`;
  const s = ses || db.crearSesion(fecha, dia, semana);
  return plan.tipo === "cardio" ? vCardio(s, plan) : vFuerza(s, plan);
}

function ultimaVez(id, fechaActual, semana) {
  const h = db.historial(id).filter((r) => r.fecha < fechaActual);
  return { mismaFase: h.find((r) => r.semana === semana), ult: h[0] };
}
function consejo(r) {
  if (!r || !r.dif) return "";
  const kg = db.maxKg(r.series);
  if (r.dif === "facil") return `Te resultó fácil: prueba a subir algo de peso (${fmtKg(kg)} → ${fmtKg(kg + (kg >= 10 ? 2 : 1))} kg).`;
  if (r.dif === "dificil") return `Te costó: mantén ${fmtKg(kg)} kg y cuida la técnica.`;
  return `Bien: repite ${fmtKg(kg)} kg o sube un poco si te ves con fuerza.`;
}

function vFuerza(s, p) {
  const n = p.ejercicios.length;
  if (s.fin && s.idx == null) s.idx = 0;
  const i = Math.min(s.idx ?? 0, n - 1);
  const e = p.ejercicios[i];
  const r = (s.ej[i] = s.ej[i] || { id: e.id, series: [], dif: null });
  if (r.id !== e.id) { r.id = e.id; r.series = []; r.dif = null; }
  const { mismaFase, ult } = ultimaVez(e.id, s.fecha, s.semana);
  const ref = mismaFase || ult;
  const kgDef = ref ? db.maxKg(ref.series) : 0;
  const repsDef = p.vol.repsMax;
  for (let k = 0; k < p.vol.series; k++) r.series[k] = r.series[k] || { kg: r.series[k - 1]?.kg ?? kgDef, reps: repsDef, hecho: false };
  db.guardar();
  const sinPeso = /sin cargar/i.test(e.detalle);

  const dots = p.ejercicios.map((x, k) => {
    const rr = s.ej[k], ok = rr && rr.dif;
    return `<button class="dot ${k === i ? "on" : ""} ${ok ? "ok" : ""}" data-act="irEj" data-i="${k}">${k + 1}</button>`;
  }).join("");
  const filas = r.series.map((x, k) => `<div class="serie ${x.hecho ? "hecha" : ""}" data-k="${k}">
      <span class="sn">${k + 1}</span>
      <div class="step"><button data-act="kg" data-k="${k}" data-d="-1">−</button><input inputmode="decimal" data-campo="kg" data-k="${k}" value="${fmtKg(+x.kg || 0)}"><button data-act="kg" data-k="${k}" data-d="1">+</button><small>kg</small></div>
      <div class="step"><button data-act="reps" data-k="${k}" data-d="-1">−</button><input inputmode="numeric" data-campo="reps" data-k="${k}" value="${x.reps}"><button data-act="reps" data-k="${k}" data-d="1">+</button><small>reps</small></div>
      <button class="check" data-act="serie" data-k="${k}" aria-label="Serie hecha">✓</button></div>`).join("");
  const todas = r.series.every((x) => x.hecho);
  const ultTxt = ref ? `<div class="ultima"><b>Última vez${mismaFase ? " en esta fase" : ""}:</b> ${ref.series.map((x) => `${fmtKg(+x.kg || 0)} kg×${x.reps}`).join(" · ")}${ref.dif ? ` <span class="dif ${ref.dif}">${DIF[ref.dif]}</span>` : ""}<br><span class="suave">${esc(consejo(ref))}</span></div>` : "";
  const ultimo = i === n - 1;
  const restante = estimarRestante(s, p);
  return `<header class="wbar"><button class="x" data-act="salir" aria-label="Salir">✕</button><div class="wt"><b>${esc(p.subtitulo)}</b><span>Semana ${s.semana} · ${fase(s.semana).nombre}</span></div><div class="reloj"><b data-reloj>${s.inicio ? mmss((Date.now() - s.inicio) / 1000) : "0:00"}</b><span>≈ ${Math.round(restante / 60)} min rest.</span></div></header>
    <div class="dots">${dots}</div>
    <section class="card ejcard">
      <div class="bigfig" data-fig="${e.id}"></div>
      <div class="etq">Ejercicio ${i + 1} de ${n} · ${esc(e.zona)}</div>
      <h2>${esc(e.nombre)}</h2>
      ${e.detalle ? `<p class="detalle">${esc(e.detalle)}</p>` : ""}${e.nota ? `<p class="intro">${esc(e.nota)}</p>` : ""}
      <div class="pauta"><div><b>${p.vol.series}</b><span>series</span></div><div><b>${p.vol.reps}</b><span>${e.doble === "pierna" ? "reps por pierna" : e.doble === "brazo" ? "reps (2 brazos)" : "reps"}</span></div><div><b>${p.vol.descansoTxt || p.vol.descanso + " s"}</b><span>descanso</span></div></div>
      ${ultTxt}
    </section>
    <section class="card series">${sinPeso ? `<p class="nota">Sin cargar peso: deja 0 kg (peso de la máquina).</p>` : ""}${filas}</section>
    <section class="card difsel ${todas ? "" : "apagado"}"><h3>¿Cómo te ha resultado?</h3><div class="difs">${Object.entries(DIF).map(([k, t]) => `<button class="dif ${k} ${r.dif === k ? "on" : ""}" data-act="dif" data-v="${k}">${t}</button>`).join("")}</div></section>
    <footer class="wfoot">
      <button class="btn sec" data-act="irEj" data-i="${i - 1}" ${i === 0 ? "disabled" : ""}>‹ Anterior</button>
      ${ultimo ? `<button class="btn" data-act="terminar">Terminar entreno</button>` : `<button class="btn" data-act="irEj" data-i="${i + 1}">Siguiente ›</button>`}
    </footer>
    ${s.fin ? resumenFuerza(s, p) : ""}
    <div id="descanso" class="descanso" hidden></div>`;
}
function estimarRestante(s, p) {
  let t = 0;
  p.ejercicios.forEach((e, k) => {
    const pend = (s.ej[k]?.series || []).filter((x) => x && x.hecho).length;
    const quedan = p.vol.series - pend;
    if (quedan > 0) t += quedan * segSerie(e) + Math.max(0, quedan - 1) * p.vol.descanso + (k > (s.idx ?? 0) ? db.st().ajustes.cambioEj : 0);
  });
  return t;
}
function resumenFuerza(s, p) {
  const dur = Math.round((s.fin - (s.inicio || s.fin)) / 60000);
  const filas = p.ejercicios.map((e, k) => { const r = s.ej[k] || { series: [] }; const ok = (r.series || []).filter((x) => x.hecho); return `<li><b>${esc(e.nombre)}</b><span>${ok.length ? ok.map((x) => `${fmtKg(+x.kg || 0)}×${x.reps}`).join(" · ") : "sin registrar"}</span>${r.dif ? `<span class="dif ${r.dif}">${DIF[r.dif]}</span>` : ""}</li>`; }).join("");
  return `<section class="card resumen"><h3>✓ Entreno completado · ${dur} min</h3><ul class="lista compacta">${filas}</ul><p class="nota">Puedes corregir cualquier dato tocando el número del ejercicio arriba.</p><a class="btn" href="#/hoy">Volver a Hoy</a></section>`;
}

// --- Cardio ---
function cardioTiempos(p) { let acc = 0; return p.bloques.map((b) => { const ini = acc; acc += b.min * 60; return { ...b, ini, fin: acc }; }); }
function cardioTrans(c) { if (!c?.inicio) return 0; const ahora = c.pausa || Date.now(); return (ahora - c.inicio - (c.pausado || 0)) / 1000 + (c.salto || 0); }
function vCardio(s, p) {
  const bl = cardioTiempos(p), total = bl[bl.length - 1].fin;
  const c = s.cardio || {};
  const barra = bl.map((b, k) => `<i style="flex:${b.min}" class="${/Subida|principal/.test(b.tipo) ? "fuerte" : ""}" data-b="${k}"></i>`).join("");
  const lista = bl.map((b, k) => `<li data-b="${k}"><span>${mmss(b.ini)}</span><b>${esc(b.tipo)}</b><em>${b.min}′</em><em>${b.vel} km/h</em><em>${b.inc} %</em></li>`).join("");
  const ctrl = c.hecho ? "" : !c.inicio ? `<button class="btn" data-act="cGo">Empezar</button>`
    : `<button class="btn sec" data-act="cPausa">${c.pausa ? "Reanudar" : "Pausa"}</button><button class="btn sec" data-act="cSalta">Saltar bloque ›</button>`;
  return `<header class="wbar"><button class="x" data-act="salir" aria-label="Salir">✕</button><div class="wt"><b>${esc(p.titulo)} · ${Math.round(total / 60)} min</b><span>Semana ${s.semana} · ${esc(p.subtitulo)}</span></div><div class="reloj"><b data-ctot>${mmss(cardioTrans(c))}</b><span>de ${mmss(total)}</span></div></header>
    <section class="card cardiocard">
      <div class="bigfig" data-fig="cinta"></div>
      <div class="cbloque"><div class="etq" data-cnombre>${esc(bl[0].tipo)}</div><div class="cuenta" data-ccuenta>${mmss(bl[0].min * 60)}</div>
        <div class="pauta"><div><b data-cvel>${bl[0].vel}</b><span>km/h</span></div><div><b data-cinc>${bl[0].inc} %</b><span>inclinación</span></div></div>
        <p class="suave" data-csig></p></div>
      <div class="cbar">${barra}<u data-cprog></u></div>
      <div class="wfoot dentro">${ctrl}</div>
    </section>
    ${c.hecho ? `<section class="card difsel"><h3>${c.dif ? "✓ Cardio completado" : "¡Hecho! ¿Cómo te ha resultado?"}</h3><div class="difs">${Object.entries(DIF).map(([k, t]) => `<button class="dif ${k} ${c.dif === k ? "on" : ""}" data-act="cDif" data-v="${k}">${t}</button>`).join("")}</div>${c.dif ? `<a class="btn" href="#/hoy">Volver a Hoy</a>` : ""}</section>` : ""}
    <section class="card"><p class="intro">${esc(p.intro)}</p>${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ""}<ul class="cblist">${lista}</ul>
    ${c.inicio && !c.hecho ? `<button class="mini" data-act="cFin">Terminar ya</button>` : ""}</section>`;
}

// ---------- Montaje, temporizadores y eventos ----------
let reloj = 0;
function montar(r, a) {
  document.querySelectorAll("[data-fig]").forEach((el) => animar(el, el.dataset.fig));
  clearInterval(reloj);
  if (r === "entreno") { reloj = setInterval(() => tickEntreno(a), 250); tickEntreno(a); }
  if (r === "ajustes") {
    document.getElementById("cambioEj")?.addEventListener("change", (ev) => { db.st().ajustes.cambioEj = +ev.target.value; db.guardar(); });
    document.getElementById("sonido")?.addEventListener("change", (ev) => { db.st().ajustes.sonido = ev.target.checked; db.guardar(); });
    document.getElementById("imp")?.addEventListener("change", async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      try { db.importar(await f.text()); toast("Copia importada"); render(); } catch (e) { toast(e.message || "No se pudo importar"); }
    });
  }
}

let ultimoBloque = -1, ultimoAviso = -1;
function tickEntreno(fecha) {
  const { ses: s, plan: p } = planDe(fecha);
  if (!s) return;
  const rel = document.querySelector("[data-reloj]");
  if (rel && s.inicio && !s.fin) rel.textContent = mmss((Date.now() - s.inicio) / 1000);
  if (p.tipo === "fuerza") return tickDescanso(s, p);
  // cardio
  const bl = cardioTiempos(p), total = bl[bl.length - 1].fin;
  const c = s.cardio || {};
  let t = Math.min(total, cardioTrans(c));
  const k = Math.max(0, bl.findIndex((b) => t < b.fin));
  const b = bl[k === -1 ? bl.length - 1 : k];
  const q = (sel) => document.querySelector(sel);
  const fig = q('.cardiocard [data-fig="cinta"]');
  if (fig) fig.style.setProperty("--inc", parseFloat(b.inc) || 0);
  if (q("[data-ctot]")) q("[data-ctot]").textContent = mmss(t);
  if (q("[data-cnombre]")) q("[data-cnombre]").textContent = `${b.tipo} · bloque ${bl.indexOf(b) + 1} de ${bl.length}`;
  if (q("[data-ccuenta]")) q("[data-ccuenta]").textContent = mmss(b.fin - t);
  if (q("[data-cvel]")) q("[data-cvel]").textContent = b.vel;
  if (q("[data-cinc]")) q("[data-cinc]").textContent = b.inc + " %";
  const sig = bl[bl.indexOf(b) + 1];
  if (q("[data-csig]")) q("[data-csig]").textContent = sig ? `Después: ${sig.tipo} · ${sig.vel} km/h · ${sig.inc} %` : "Último bloque";
  if (q("[data-cprog]")) q("[data-cprog]").style.left = (t / total) * 100 + "%";
  document.querySelectorAll(".cblist li").forEach((li) => { const j = +li.dataset.b; li.className = j < bl.indexOf(b) || c.hecho ? "pasado" : j === bl.indexOf(b) && c.inicio ? "actual" : ""; });
  if (!c.inicio || c.pausa || c.hecho) return;
  const idx = bl.indexOf(b), resto = Math.ceil(b.fin - t);
  if (resto <= 3 && resto > 0 && ultimoAviso !== idx * 10 + resto) { ultimoAviso = idx * 10 + resto; pitido(660, 0.1); }
  if (ultimoBloque !== -1 && idx !== ultimoBloque) { pitidoFin(); destello(); }
  ultimoBloque = idx;
  if (t >= total) { c.hecho = true; s.cardio = c; db.guardar(); pitidoFin(); destello(); mantenerPantalla(false); render(); }
}

function tickDescanso(s, p) {
  const box = document.getElementById("descanso");
  if (!box) return;
  const d = s.descanso;
  if (!d) { box.hidden = true; return; }
  const resta = (d.fin - Date.now()) / 1000;
  if (resta <= 0) {
    s.descanso = null; db.guardar(); box.hidden = true; pitidoFin(); destello();
    return;
  }
  const seg = Math.ceil(resta);
  if (seg <= 3 && ultimoAviso !== seg) { ultimoAviso = seg; pitido(660, 0.1); }
  if (box.hidden || box.dataset.id !== String(d.fin0)) {
    box.dataset.id = d.fin0;
    const sigEj = p.ejercicios[s.idx ?? 0];
    const r = s.ej[s.idx ?? 0];
    const k = r ? r.series.findIndex((x) => !x.hecho) : 0;
    const prox = d.tipo === "cambio" ? `<div class="etq">Siguiente ejercicio</div><b>${esc(sigEj.nombre)}</b><div class="mini-fig" data-fig2="${sigEj.id}"></div>`
      : `<div class="etq">Siguiente</div><b>Serie ${k + 1} de ${p.vol.series}${r && r.series[k] ? ` · ${fmtKg(+r.series[k].kg || 0)} kg` : ""}</b>`;
    box.innerHTML = `<div class="dcont"><div class="etq">${d.tipo === "cambio" ? "Cambio de ejercicio" : "Descanso"}</div>
      <div class="anillo"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="fondo"/><circle cx="60" cy="60" r="52" class="prog" data-anillo/></svg><b data-dcuenta></b></div>
      <div class="dbtns"><button class="mini" data-act="dMas" data-d="-15">−15 s</button><button class="mini" data-act="dMas" data-d="15">+15 s</button></div>
      <div class="prox">${prox}</div>
      <button class="btn" data-act="dSalta">Saltar descanso</button></div>`;
    box.hidden = false;
    const mf = box.querySelector("[data-fig2]"); if (mf) animar(mf, mf.dataset.fig2);
  }
  const tot = d.total || 1;
  box.querySelector("[data-dcuenta]").textContent = mmss(resta);
  const C = 2 * Math.PI * 52;
  const an = box.querySelector("[data-anillo]");
  an.style.strokeDasharray = C; an.style.strokeDashoffset = C * (1 - Math.min(1, resta / tot));
}
function destello() { document.body.classList.remove("flash"); void document.body.offsetWidth; document.body.classList.add("flash"); }
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 2600); }
function empezarDescanso(s, seg, tipo) { const fin = Date.now() + seg * 1000; s.descanso = { fin, fin0: fin, total: seg, tipo }; ultimoAviso = -1; db.guardar(); }

// Delegación de eventos
$app.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  const { a: fecha } = ruta();
  if (act === "audio") { audioOn(); return; }
  audioOn();
  const S = db.st();
  const ctxE = () => planDe(fecha);

  switch (act) {
    case "regla": {
      if (!confirm("¿Registrar hoy como primer día de la regla? Esta semana pasará a ser la Semana 1.")) return;
      db.registrarRegla(); toast("Regla registrada · Semana 1"); render(); return;
    }
    case "addRegla": { const v = document.getElementById("fRegla").value; if (v) { db.registrarRegla(v); toast("Regla añadida"); render(); } return; }
    case "borraRegla": if (confirm("¿Borrar esta fecha?")) { db.borrarRegla(el.dataset.f); render(); } return;
    case "manual": { db.forzarSemana(db.infoSemana().lunes, +el.dataset.n); render(); return; }
    case "probar": pitidoFin(); destello(); return;
    case "exportar": return exportarCopia();
    case "borrarTodo": if (confirm("Se borrarán todos tus registros de este iPhone. ¿Seguro?") && confirm("¿De verdad? No se puede deshacer.")) { db.borrarTodo(); render(); } return;
    case "cambiaDia": {
      const f = db.hoy(); const info = db.infoSemana(f);
      db.borrarSesion(f); db.crearSesion(f, +el.dataset.d, info.semana); ir(`#/entreno/${f}`); return;
    }
    case "salir": mantenerPantalla(false); ir("#/hoy"); return;
  }

  const { ses: s, plan: p } = ctxE();
  if (!s) return;
  const i = s.idx ?? 0;
  const r = s.ej[i];
  switch (act) {
    case "irEj": { const k = +el.dataset.i; if (k < 0 || k >= p.ejercicios.length) return; s.idx = k; s.descanso = null; db.guardar(); render(); return; }
    case "kg": case "reps": {
      const k = +el.dataset.k, d = +el.dataset.d, x = r.series[k];
      if (act === "kg") { const step = (+x.kg || 0) >= 10 ? 1 : 0.5; x.kg = Math.max(0, Math.round(((+x.kg || 0) + d * step) * 10) / 10); }
      else x.reps = Math.max(0, (+x.reps || 0) + d);
      // propaga el peso a las series siguientes sin hacer
      if (act === "kg") for (let j = k + 1; j < r.series.length; j++) if (!r.series[j].hecho) r.series[j].kg = x.kg;
      db.guardar(); refrescaSeries(r); return;
    }
    case "serie": {
      const k = +el.dataset.k, x = r.series[k];
      x.hecho = !x.hecho;
      if (!s.inicio) s.inicio = Date.now();
      mantenerPantalla(true);
      const quedan = r.series.some((y) => !y.hecho);
      if (x.hecho && quedan) empezarDescanso(s, p.vol.descanso, "serie");
      db.guardar(); refrescaSeries(r);
      if (!quedan) document.querySelector(".difsel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    case "dif": {
      r.dif = el.dataset.v; if (!s.inicio) s.inicio = Date.now();
      if (i < p.ejercicios.length - 1 && !s.fin) { s.idx = i + 1; empezarDescanso(s, S.ajustes.cambioEj, "cambio"); }
      db.guardar(); render(); return;
    }
    case "terminar": {
      const faltan = p.ejercicios.some((_, k) => !s.ej[k]?.dif);
      if (faltan && !confirm("Hay ejercicios sin marcar cómo te han ido. ¿Terminar igualmente?")) return;
      s.fin = Date.now(); s.inicio = s.inicio || s.fin; s.descanso = null; db.guardar(); mantenerPantalla(false); render();
      document.querySelector(".resumen")?.scrollIntoView({ behavior: "smooth" }); return;
    }
    case "dMas": if (s.descanso) { s.descanso.fin += +el.dataset.d * 1000; s.descanso.total = Math.max(1, s.descanso.total + +el.dataset.d); db.guardar(); } return;
    case "dSalta": s.descanso = null; db.guardar(); document.getElementById("descanso").hidden = true; return;
    // cardio
    case "cGo": s.cardio = { inicio: Date.now(), pausado: 0, pausa: null, salto: 0 }; ultimoBloque = -1; db.guardar(); mantenerPantalla(true); render(); return;
    case "cPausa": {
      const c = s.cardio; if (c.pausa) { c.pausado += Date.now() - c.pausa; c.pausa = null; mantenerPantalla(true); } else c.pausa = Date.now();
      db.guardar(); render(); return;
    }
    case "cSalta": {
      const bl = cardioTiempos(p), t = cardioTrans(s.cardio), b = bl.find((x) => t < x.fin);
      if (b) s.cardio.salto = (s.cardio.salto || 0) + (b.fin - t) + 0.05;
      db.guardar(); return;
    }
    case "cFin": if (confirm("¿Terminar el cardio ahora?")) { s.cardio.hecho = true; s.cardio.minutos = Math.round(cardioTrans(s.cardio) / 60); db.guardar(); mantenerPantalla(false); render(); } return;
    case "cDif": s.cardio.dif = el.dataset.v; db.guardar(); render(); return;
  }
});
$app.addEventListener("change", (ev) => {
  const el = ev.target.closest("[data-campo]");
  if (!el) return;
  const { ses: s } = planDe(ruta().a);
  const r = s.ej[s.idx ?? 0], k = +el.dataset.k;
  if (el.dataset.campo === "kg") { r.series[k].kg = num(el.value); for (let j = k + 1; j < r.series.length; j++) if (!r.series[j].hecho) r.series[j].kg = r.series[k].kg; }
  else r.series[k].reps = Math.max(0, Math.round(num(el.value)));
  db.guardar(); refrescaSeries(r);
});
$app.addEventListener("focusin", (ev) => { if (ev.target.matches("[data-campo]")) setTimeout(() => ev.target.select(), 30); });

function refrescaSeries(r) {
  r.series.forEach((x, k) => {
    const row = document.querySelector(`.serie[data-k="${k}"]`); if (!row) return;
    row.classList.toggle("hecha", !!x.hecho);
    const kg = row.querySelector('[data-campo="kg"]'), rp = row.querySelector('[data-campo="reps"]');
    if (document.activeElement !== kg) kg.value = fmtKg(+x.kg || 0);
    if (document.activeElement !== rp) rp.value = x.reps;
  });
  document.querySelector(".difsel")?.classList.toggle("apagado", !r.series.every((x) => x.hecho));
}

async function exportarCopia() {
  const txt = db.exportar(), nombre = `entreno-copia-${db.hoy()}.json`;
  try {
    const file = new File([txt], nombre, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Copia de mi entreno" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Arranque
render();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
