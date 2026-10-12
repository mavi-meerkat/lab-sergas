// Arranque de LAB SERGAS (web): sesión, contenido cifrado, sincronización y navegación.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { A, CONSEJOS_DESCANSO } from "./ctx.js";
import { el, boton, tarjeta, vaciar, modal, cerrarModalSuperior, hayModal, toast, confirmar } from "./ui.js";
import { Contenido, Validaciones, descifrar, versionRemota, descargarCifrado, kvGet, kvSet, kvDel } from "./content.js";
import { Store } from "./store.js";
import { Motor } from "./engine.js";
import { Simulacros } from "./sim.js";
import { vistaInicio, vistaProfesor } from "./v-inicio.js";
import { vistaLeccion, audioUrl } from "./v-leccion.js";
import { vistaRepaso } from "./v-repaso.js";
import { vistaExamenes } from "./v-examenes.js";
import { vistaValidar, vistaAjustes } from "./v-validar.js";
import { vistaEntrena } from "./v-entrena.js";
import { fechaEs, parseFechaEs, azar } from "./util.js";

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const raiz = document.getElementById("app");

// ------------------------------------------------------------------ tema
function aplicarTema(t) {
  document.documentElement.dataset.theme = t === "Dark" ? "dark" : "light";
  try { localStorage.setItem("tema", t); } catch { /* nada */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === "Dark" ? "#1F232A" : "#0F6E66";
}
try { aplicarTema(localStorage.getItem("tema") || "Light"); } catch { aplicarTema("Light"); }

function pantallaCarga(msg) {
  vaciar(raiz).append(el("div.carga", el("div.logo-grande", "🧪"), el("h2", "LAB SERGAS"), el("p.suave", msg), el("div.spinner")));
}

// ------------------------------------------------------------------ sesión
function pantallaLogin(error = "") {
  const email = el("input.entrada.ancho", { type: "email", placeholder: "Correo electrónico", autocomplete: "username" });
  const pass = el("input.entrada.ancho", { type: "password", placeholder: "Contraseña", autocomplete: "current-password" });
  const msg = el("p.c-mal.peq", error);
  const entrar = async () => {
    msg.textContent = "";
    try { await signInWithEmailAndPassword(auth, email.value.trim(), pass.value); }
    catch (e) { msg.textContent = traducirError(e); }
  };
  const olvido = async () => {
    if (!email.value.trim()) { msg.textContent = "Escribe tu correo y vuelve a pulsar."; return; }
    try { await sendPasswordResetEmail(auth, email.value.trim()); msg.className = "c-ok peq"; msg.textContent = "Te he enviado un correo para cambiar la contraseña."; }
    catch (e) { msg.textContent = traducirError(e); }
  };
  pass.addEventListener("keydown", (e) => { if (e.key === "Enter") entrar(); });
  vaciar(raiz).append(el("div.login", tarjeta("",
    el("div.logo-grande", "🧪"), el("h1", "LAB SERGAS"),
    el("p.suave", "Entrenador de la oposición TSLCB. Entra con tu cuenta para sincronizar el progreso entre el ordenador y la tablet."),
    email, pass, msg,
    boton("Entrar", entrar, "primario grande ancho"),
    el("div.fila.entre", el("span"), boton("He olvidado la contraseña", olvido, "fantasma")))));
  email.focus();
}
function traducirError(e) {
  const c = (e && e.code) || "";
  return {
    "auth/invalid-email": "El correo no es válido.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/user-not-found": "No hay ninguna cuenta con ese correo. Pulsa «Crear cuenta».",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo: usa «Entrar».",
    "auth/weak-password": "La contraseña es demasiado débil (mínimo 6 caracteres).",
    "auth/network-request-failed": "Sin conexión a internet.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/operation-not-allowed": "El acceso con correo y contraseña no está activado en Firebase.",
  }[c] || (e && e.message) || String(e);
}

// ------------------------------------------------------------------ contenido
async function obtenerClave() {
  let k = await kvGet("clave");
  if (k) return k;
  try {
    const snap = await getDoc(doc(db, "config", "clave"));
    if (snap.exists() && snap.data().k) { k = snap.data().k; await kvSet("clave", k); return k; }
  } catch (e) {
    if (e.code === "permission-denied") throw new Error("SIN_PERMISO");
    throw e;
  }
  return null;
}
function pedirClave(buf) {
  return new Promise((ok) => {
    const ent = el("input.entrada.ancho", { placeholder: "Pega aquí la clave del temario" });
    const msg = el("p.c-mal.peq");
    const probar = async () => {
      const k = ent.value.trim();
      try {
        const raw = await descifrar(buf, k);
        await kvSet("clave", k);
        try { await setDoc(doc(db, "config", "clave"), { k }); } catch (e) { console.warn("No se pudo guardar la clave en la nube", e); }
        ok(raw);
      } catch { msg.textContent = "Esa clave no abre el contenido. Revísala (sin espacios)."; }
    };
    ent.addEventListener("keydown", (e) => { if (e.key === "Enter") probar(); });
    vaciar(raiz).append(el("div.login", tarjeta("",
      el("h2", "🔑 Primera vez: clave del temario"),
      el("p", "Las lecciones llevan fragmentos de los libros, así que van cifradas. Pega la clave que te pasé (solo se pide una vez: después se guarda en tu cuenta y la tablet la coge sola)."),
      ent, msg, boton("Desbloquear", probar, "primario grande ancho"))));
    ent.focus();
  });
}
async function cargarContenido() {
  const cache = await kvGet("contenido");
  const vRemota = await versionRemota();
  if (cache && (!vRemota || cache.v === vRemota)) return cache.raw;
  if (!vRemota && !cache) throw new Error("Necesitas conexión a internet la primera vez.");
  pantallaCarga("Descargando el temario…");
  const buf = await descargarCifrado(vRemota);
  let clave = await obtenerClave();
  let raw = null;
  if (clave) { try { raw = await descifrar(buf, clave); } catch { await kvDel("clave"); clave = null; } }
  if (!raw) raw = await pedirClave(buf);
  await kvSet("contenido", { v: vRemota, raw });
  return raw;
}

// ------------------------------------------------------------------ arranque
let arrancado = false;
onAuthStateChanged(auth, async (user) => {
  if (!user) { arrancado = false; pantallaLogin(); return; }
  if (arrancado) return;
  arrancado = true;
  A.usuario = user.email;
  try {
    pantallaCarga("Preparando el temario…");
    const raw = await cargarContenido();
    pantallaCarga("Sincronizando tu progreso…");
    const c = new Contenido(raw);
    const store = new Store(db, user.uid);
    await Promise.race([store.iniciar(raw.migracion), new Promise((_, mal) => setTimeout(() => mal(new Error("TIEMPO")), 25000))]);
    A.c = c; A.p = store; A.m = new Motor(c, store); A.sim = new Simulacros(c, store, A.m);
    c.validaciones = new Validaciones(c, store);
    aplicarTema(store.get("tema", "Light"));
    construir();
    A.ir("inicio");
    store.on((tipo, remoto) => {
      if (tipo === "general") { c.validaciones.aplicarTodas(); A.actualizarNav(); pintarSync(); }
      if (tipo === "error") pintarSync(true);
      if (remoto) programarRefresco();
    });
  } catch (e) {
    console.error(e);
    arrancado = false;
    let txt = e.message || String(e);
    if (txt === "SIN_PERMISO" || (e.code === "permission-denied"))
      txt = `La cuenta ${user.email} no tiene permiso para usar esta app. Si es la tuya, revisa las reglas de Firestore.`;
    if (txt === "TIEMPO") txt = "No consigo conectar con la base de datos. Comprueba la conexión y vuelve a intentarlo.";
    vaciar(raiz).append(el("div.login", tarjeta("", el("h2", "No se pudo arrancar"), el("p", txt),
      el("div.fila", boton("Reintentar", () => location.reload(), "primario"), boton("Cerrar sesión", () => signOut(auth), "secundario")))));
  }
});

let tRefresco = null;
function programarRefresco() {
  clearTimeout(tRefresco);
  tRefresco = setTimeout(() => {
    if (hayModal() || !A.vista) return;
    if (A.vista.refrescarRemoto) {
      if (A.vista.refrescar) A.vista.refrescar();
      else A.ir(A.vista.nombre, A.vista.args || {});
    }
    pintarFecha();
  }, 800);
}

// ------------------------------------------------------------------ esqueleto
const NAV = [["inicio", "🏠", "Inicio"], ["profesor", "🎓", "Profesor"], ["repaso", "🔁", "Repaso"], ["entrena", "🎮", "Entrena"], ["examenes", "📝", "Simulacros"], ["validar", "🩺", "Por validar"], ["ajustes", "⚙", "Ajustes"]];
let navBtns = {}, lblRacha, lblDias, entFecha, lblPomo, bPomo, lblSync;

function construir() {
  vaciar(raiz);
  entFecha = el("input.entrada.fecha", { placeholder: "dd/mm/aaaa", value: fechaEs(A.m.fechaExamen()), inputmode: "numeric" });
  entFecha.addEventListener("change", fechaCambiada);
  entFecha.addEventListener("keydown", (e) => { if (e.key === "Enter") entFecha.blur(); });
  lblDias = el("span.c-aviso.negrita.peq.dias");
  lblPomo = el("span.pomo-txt");
  bPomo = boton("▶", pomoToggle, "primario cuadrado");
  lblSync = el("span.sync", { title: "Estado de la sincronización" }, "●");
  const top = el("header.barra-top",
    el("div.marca", el("span", "🧪"), el("b", "LAB SERGAS")), lblSync,
    el("span.flex1"),
    el("div.caja-fecha", el("b.c-aviso.peq", "📅 Examen"), entFecha, lblDias),
    el("div.caja-pomo", lblPomo, bPomo, boton("↺", pomoReset, "secundario cuadrado")));
  const nav = el("nav.lateral");
  navBtns = {};
  for (const [k, ic, txt] of NAV) {
    const b = el("button.nav-btn", { type: "button", onclick: () => A.ir(k) }, el("span.nav-ic", ic), el("span.nav-txt", txt));
    navBtns[k] = b;
    nav.append(b);
  }
  lblRacha = el("div.racha.suave.peq");
  nav.append(lblRacha);
  A.main = el("main.cuerpo");
  raiz.append(top, el("div.marco", nav, A.main));
  pintarFecha();
  pomoPintar();
  pintarSync();
}

function pintarSync(error = false) {
  if (!lblSync) return;
  const ok = A.p && A.p.sincronizado && !error;
  lblSync.className = "sync " + (error ? "c-mal" : ok ? "c-ok" : "c-aviso");
  lblSync.title = error ? "Error de sincronización" : ok ? "Sincronizado con la nube" : "Sin conexión: los cambios se guardan y se enviarán al volver";
}
window.addEventListener("online", () => setTimeout(pintarSync, 1500));
window.addEventListener("offline", () => pintarSync());

function marcarNav(clave) {
  for (const [k, b] of Object.entries(navBtns)) b.classList.toggle("activo", k === clave);
  if (lblRacha) lblRacha.textContent = `🔥 Racha: ${A.m.racha()} días`;
  A.actualizarNav();
}

A.ir = (clave, args = {}) => {
  if (A.vista && A.vista.destruir) { try { A.vista.destruir(); } catch (e) { console.error(e); } }
  while (cerrarModalSuperior()) { /* cerrar diálogos abiertos */ }
  vaciar(A.main);
  A.main.scrollTop = 0;
  const fn = { inicio: vistaInicio, profesor: vistaProfesor, repaso: vistaRepaso, examenes: vistaExamenes, validar: vistaValidar, ajustes: vistaAjustes, leccion: vistaLeccion, entrena: vistaEntrena }[clave];
  try {
    A.vista = fn(A.main, args) || { nombre: clave };
    A.vista.args = args;
    if (!A.vista.nombre) A.vista.nombre = clave;
  } catch (e) {
    console.error(e);
    A.main.append(tarjeta("bg-mal_bg", el("h3", "Ha fallado algo al abrir esta pantalla"), el("pre.peq", String(e.stack || e))));
  }
  marcarNav(clave === "leccion" ? "profesor" : clave);
  pomoOverlay();
};

A.actualizarNav = () => {
  const b = navBtns.validar;
  if (!b || !A.c.validaciones) return;
  const n = A.c.validaciones.pendientes().length;
  b.querySelector(".nav-txt").textContent = n ? `Por validar (${n})` : "Por validar";
};

A.abrirLeccion = (lid, inicio = null) => {
  const hechas = A.p.leccionesCompletadas();
  const motivo = A.m.bloqueoContenidoNuevo("leccion");
  if (!hechas.has(lid) && motivo && inicio === null) return dialogoBloqueo(motivo, lid);
  A.ir("leccion", { lid, inicio });
};

function dialogoBloqueo(motivo, lid) {
  const deb = A.m.unidadesDebiles();
  modal((cerrar) => el("div.dialogo",
    el("h3", "🔒  Antes de avanzar temario nuevo"), el("p", motivo),
    el("div.fila.entre.envuelve",
      deb.length
        ? boton("Ir a la sesión de choque", () => { cerrar(); A.ir("repaso", { modo: "choque", unidad: deb[0][0] }); }, "mal")
        : boton("Estudiar la cola del día", () => { cerrar(); A.ir("repaso", { modo: "cola" }); }, "primario"),
      A.m.paseDisponible()
        ? boton("Usar pase de emergencia (1/día)", () => { A.m.usarPase(); cerrar(); A.abrirLeccion(lid); }, "aviso")
        : el("span.suave.peq", "Pase de hoy ya usado"))), { ancho: 560 });
}

A.cambiarTema = (modo) => { A.p.set("tema", modo); aplicarTema(modo); };
A.cerrarSesion = async () => {
  if (await confirmar("Cerrar sesión", "Tu progreso queda guardado en la nube. ¿Cerrar sesión en este dispositivo?", { si: "Cerrar sesión" })) {
    await signOut(auth);
    location.reload();
  }
};

// ------------------------------------------------------------------ fecha del examen
function fechaCambiada() {
  const txt = entFecha.value.trim();
  if (!txt) A.m.setFechaExamen(null);
  else {
    const iso = parseFechaEs(txt);
    if (!iso) { entFecha.classList.add("error"); return; }
    entFecha.classList.remove("error");
    if (iso !== A.m.fechaExamen()) A.m.setFechaExamen(iso);
    entFecha.value = fechaEs(iso);
  }
  pintarFecha();
  if (A.vista && A.vista.nombre === "inicio") A.ir("inicio");
}
function pintarFecha() {
  if (!lblDias) return;
  if (document.activeElement !== entFecha) entFecha.value = fechaEs(A.m.fechaExamen());
  const d = A.m.diasRestantes();
  if (d === null) lblDias.textContent = "← escribe la fecha";
  else if (d < 0) lblDias.textContent = "fecha pasada";
  else lblDias.textContent = `faltan ${d} días · ${A.m.planDiario().lecciones_dia} lecc./día`;
}
A.pintarFecha = pintarFecha;

// ------------------------------------------------------------------ pomodoro
let pomoEstado = "parado", pomoSeg = null, overlay = null, lblOver = null, lblConsejo = null;
const pomoEstudio = () => Number(A.p.get("pomo_estudio", 50)) * 60;
function pomoToggle() {
  if (pomoEstado === "parado" || pomoEstado === "pausa_estudio") pomoEstado = "estudio";
  else if (pomoEstado === "estudio") pomoEstado = "pausa_estudio";
  pomoPintar();
}
function pomoReset() {
  pomoEstado = "parado";
  pomoSeg = pomoEstudio();
  quitarOverlay();
  pomoPintar();
}
A.pomoReset = pomoReset;
function pomoPintar() {
  if (!lblPomo) return;
  if (pomoSeg === null) pomoSeg = pomoEstudio();
  const m = Math.floor(Math.max(0, pomoSeg) / 60), s = Math.max(0, pomoSeg) % 60;
  lblPomo.textContent = `${pomoEstado === "descanso" ? "☕" : "🍅"} ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  lblPomo.className = "pomo-txt " + (pomoEstado === "descanso" ? "c-ok" : pomoEstado === "estudio" ? "" : "suave");
  bPomo.textContent = pomoEstado === "estudio" ? "⏸" : "▶";
}
function pitido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; g.gain.value = 0.15;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.35);
  } catch { /* nada */ }
}
setInterval(() => {
  if (!A.p || !lblPomo) return;
  if (pomoEstado === "estudio" || pomoEstado === "descanso") {
    pomoSeg -= 1;
    if (pomoEstado === "estudio" && pomoSeg % 60 === 0) A.p.sumarDiario("minutos");
    if (pomoSeg <= 0) {
      if (pomoEstado === "estudio") {
        pomoEstado = "descanso";
        pomoSeg = Number(A.p.get("pomo_descanso", 10)) * 60;
        pitido();
        ponerOverlay();
      } else {
        pomoEstado = "parado";
        pomoSeg = pomoEstudio();
        quitarOverlay();
        pitido();
      }
    }
    pomoPintar();
    if (overlay && lblOver) {
      lblOver.textContent = `${String(Math.floor(Math.max(0, pomoSeg) / 60)).padStart(2, "0")}:${String(Math.max(0, pomoSeg) % 60).padStart(2, "0")}`;
      if (pomoSeg % 30 === 0) lblConsejo.textContent = azar.choice(CONSEJOS_DESCANSO, CONSEJOS_DESCANSO.map(() => 1));
    }
  }
}, 1000);
function ponerOverlay() {
  quitarOverlay();
  lblOver = el("div.over-reloj.c-ok");
  lblConsejo = el("p.over-consejo", azar.choice(CONSEJOS_DESCANSO, CONSEJOS_DESCANSO.map(() => 1)));
  overlay = el("div.overlay-descanso", tarjeta("",
    el("h1.c-ok", "☕  Tiempo de descanso"),
    el("p.suave", "Las preguntas quedan ocultas para forzar la desconexión y evitar la saturación."),
    lblOver, lblConsejo,
    boton("Volver antes (no recomendado)", pomoReset, "fantasma")));
  document.body.append(overlay);
}
function pomoOverlay() { if (overlay) document.body.append(overlay); }
function quitarOverlay() { if (overlay) { overlay.remove(); overlay = null; } }

// ------------------------------------------------------------------ teclado
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cerrarModalSuperior()) return;
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey || e.altKey || hayModal() || overlay) return;
  if (A.vista && A.vista.teclas && A.vista.teclas(e)) e.preventDefault();
});

// ------------------------------------------------------------------ audios sin conexión
A.estadoAudios = async (lbl) => {
  try {
    const cache = await caches.open("audio-v1");
    const n = (await cache.keys()).length;
    const total = new Set(Object.values(A.c.audio).flatMap((g) => Object.values(g.a))).size;
    lbl.textContent = `${n} de ${total} guardados en este dispositivo`;
  } catch { lbl.textContent = ""; }
};
A.descargarAudios = async (lbl, btn) => {
  const hashes = [...new Set(Object.values(A.c.audio).flatMap((g) => Object.values(g.a)))];
  btn.disabled = true;
  try {
    const cache = await caches.open("audio-v1");
    const ya = new Set((await cache.keys()).map((r) => new URL(r.url).pathname.split("/").pop().replace(".ogg", "")));
    const faltan = hashes.filter((h) => !ya.has(h));
    let hechos = hashes.length - faltan.length, errores = 0;
    const trabajador = async () => {
      while (faltan.length) {
        const h = faltan.pop();
        try {
          const url = new URL(audioUrl(h), location.href).href;
          const r = await fetch(url);
          if (r.ok) await cache.put(url, r); else errores++;
        } catch { errores++; }
        hechos++;
        if (hechos % 10 === 0 || !faltan.length) lbl.textContent = `Descargando… ${hechos} de ${hashes.length}`;
      }
    };
    await Promise.all([1, 2, 3, 4].map(trabajador));
    lbl.textContent = errores ? `Hecho, pero ${errores} fallaron (vuelve a pulsar).` : `✔ Los ${hashes.length} audios están en este dispositivo.`;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {
    lbl.textContent = "No se pudo: " + e.message;
  }
  btn.disabled = false;
};

// ------------------------------------------------------------------ PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw && nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Hay una versión nueva de la app: se usará al volver a abrirla.", 5000);
        });
      });
    }).catch((e) => console.warn("SW", e));
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
