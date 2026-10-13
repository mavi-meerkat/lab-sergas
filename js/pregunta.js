// Bloque de pregunta tipo test con corrección inmediata + visor del recorte del libro.
import { A } from "./ctx.js";
import { el, boton, chip, rico, tarjeta, modal } from "./ui.js";
import { tipoFallo } from "./cifras.js";

export function verRecorte(rec, titulo = "Recorte literal del manual") {
  modal((cerrar) => el("div.dialogo",
    el("div.fila.entre",
      el("h3", "📖  " + titulo),
      el("span.suave", `${A.c.nombreLibro(rec.libro)} · pág. PDF ${rec.pagina ?? "?"}`)),
    rec.texto ? tarjeta("bg-aviso_bg", rico(rec.texto)) : el("p.suave", "Este recorte no tiene texto."),
    el("p.suave.peq", "Los libros en PDF siguen en tu ordenador (carpeta LAB). Aquí ves la frase exacta y la página para buscarla."),
    el("div.fila.derecha", boton("Cerrar", cerrar, "secundario"))), { ancho: 760 });
}

export const limpia = (s) => s.replace(/^[A-D]\)\s*/, "");

/** Editor del truco propio (mnemotecnia) de una pregunta. */
export function editarNota(qid, alGuardar) {
  const q = A.c.preguntas[qid];
  const area = el("textarea.entrada.ancho.nota-area", { rows: 4, maxlength: 600, placeholder: "Tu regla, frase o asociación para no fallarla. Ej.: «El cielo coagula: azul celeste = citrato»" });
  area.value = A.p.nota(qid);
  modal((cerrar) => el("div.dialogo",
    el("h3", "✏️ Mi truco para esta pregunta"),
    el("p.suave.peq", q.enunciado.slice(0, 220)),
    el("p.peq", "Correcta: ", el("b", limpia(q.opciones["ABCD".indexOf(q.correcta)] || ""))),
    area,
    el("p.suave.peq", "Lo que inventas tú se recuerda mejor. Aparecerá cada vez que respondas esta pregunta y en el cuaderno de errores."),
    el("div.fila.entre",
      A.p.nota(qid) ? boton("Borrar", () => { A.p.setNota(qid, ""); cerrar(); alGuardar && alGuardar(""); }, "fantasma") : el("span"),
      el("div.fila", boton("Cancelar", cerrar, "secundario"),
        boton("Guardar", () => { A.p.setNota(qid, area.value); cerrar(); alGuardar && alGuardar(A.p.nota(qid)); }, "primario")))), { ancho: 620 });
  setTimeout(() => area.focus(), 50);
}
export function cajaNota(qid) {
  const t = A.p.nota(qid);
  return t ? el("div.truco", el("b", "✏️ Tu truco: "), t) : null;
}

const CERTEZAS = [
  ["segura", "✔ Segura", "ok", "Enter"],
  ["duda", "🤔 Dudo", "aviso", "Espacio"],
  ["azar", "🎲 Al azar", "secundario", "Z"],
];
const seg = (ms) => Math.round(ms / 1000);

/**
 * opts: { onFin(correcta, res), contexto, valorar=true, onRespuesta(correcta), certeza (preguntar seguridad),
 *         limite (segundos: modo Reflejos) }
 * Flujo: se elige opción → se dice cómo de segura → corrección. Así se entrena responder sin dudar.
 */
export function bloquePregunta(qid, opts = {}) {
  const { onFin, contexto = "tutor", valorar = true, onRespuesta, limite = null } = opts;
  const preguntarCerteza = opts.certeza ?? A.p.get("preguntar_certeza", true);
  const q = A.c.preguntas[qid];
  const est = A.p.estado(qid);
  const orden = A.m.ordenOpciones(qid);
  const t0 = performance.now();
  let resuelta = false, seleccion = null, reloj = null;
  const raiz = el("div.pregunta");

  const meta = el("div.meta");
  const u = A.c.unidades[q.unidad];
  if (u) meta.append(chip(`M${u.modulo}·U${u.numero}  ${u.titulo.slice(0, 60)}`, "suave"));
  const origen = q.origen || "libro";
  if (origen.startsWith("SERGAS")) meta.append(chip("📝 " + origen, "trampa", "trampa_bg"));
  const ev = A.c.validaciones.estado(qid);
  if (q.anulada) meta.append(chip("⛔ Anulada por el tribunal", "mal", "mal_bg"));
  else if (q.respuesta_oficial) meta.append(chip("✔ Respuesta oficial SERGAS", "ok", "ok_bg"));
  else if (["confirmada", "corregida"].includes(ev)) meta.append(chip("✔ Respuesta validada por profesional", "ok", "ok_bg"));
  else if (q.alerta) meta.append(chip("⚠ Fuera del temario base · respuesta propuesta", "mal", "mal_bg"));
  else if (qid in A.c.validaciones.datos()) meta.append(chip("🚩 En revisión", "aviso", "aviso_bg"));
  if (est.alerta_trampa) meta.append(chip("⚠ ALERTA TRAMPA · opciones reordenadas", "aviso", "aviso_bg"));
  if ((est.confirmar || 0) > 0) meta.append(chip("🎯 Error seguro por corregir", "mal", "mal_bg"));
  else if (est.dominada) meta.append(chip("🏅 Dominada sin dudas", "ok", "ok_bg"));
  raiz.append(meta);

  let barraTiempo = null;
  if (limite) {
    barraTiempo = el("div.barra.reflejo", el("div", { style: { width: "100%" } }));
    raiz.append(barraTiempo);
  }
  raiz.append(rico(q.enunciado, "enunciado"));

  const botones = [];
  const lista = el("div.opciones");
  orden.forEach((idx, pos) => {
    const b = el("button.opcion", { type: "button" }, el("b", "ABCD"[pos] + ")"), " ", limpia(q.opciones[idx]));
    b.onclick = () => tocar(idx);
    botones.push([idx, b]);
    lista.append(b);
  });
  raiz.append(lista);
  const zonaCerteza = el("div.zona-certeza");
  const zona = el("div.zona-fb");
  raiz.append(zonaCerteza, zona);

  function tocar(idx) {
    if (resuelta) return;
    if (!preguntarCerteza) return elegir(idx, null);
    seleccion = idx;
    for (const [i, b] of botones) b.classList.toggle("sel", i === idx);
    if (!zonaCerteza.firstChild) {
      zonaCerteza.append(el("div.certeza",
        el("span.suave.peq", "¿Cómo de segura estás?"),
        ...CERTEZAS.map(([val, txt, tipo, tecla]) =>
          boton(txt, () => confirmar(val), tipo + " certeza-btn", { "data-certeza": val, title: "Tecla: " + tecla }))));
    }
  }
  function confirmar(cert) {
    if (resuelta || seleccion === null) return;
    elegir(seleccion, cert);
  }

  function elegir(idx, certeza) {
    if (resuelta) return;
    resuelta = true;
    if (reloj) clearInterval(reloj);
    zonaCerteza.replaceChildren();
    const ms = performance.now() - t0;
    const letra = idx === null ? null : "ABCD"[idx];
    const res = A.m.responder(qid, letra, contexto, { certeza, ms });
    const cIdx = "ABCD".indexOf(q.correcta);
    const barajada = orden.some((v, k) => v !== k);
    for (const [i, b] of botones) {
      b.disabled = true;
      b.classList.remove("sel");
      // la explicación usa las letras originales: se indican si el orden se ha cambiado
      if (barajada) b.append(el("span.orig", ` · ${"ABCD"[i]} en el original`));
      if (i === cIdx) b.classList.add("bien");
      else if (i === idx) b.classList.add("mal");
    }
    const bueno = res.correcta && !res.suerte;
    const caja = tarjeta(res.error_seguro ? "bg-trampa_bg" : res.correcta ? (bueno && !res.duda ? "bg-ok_bg" : "bg-aviso_bg") : "bg-mal_bg");
    let titulo, cls;
    if (idx === null) { titulo = "⏱  Se acabó el tiempo"; cls = ".c-mal"; }
    else if (res.error_seguro) { titulo = "✘  Error seguro: estabas convencida y no era"; cls = ".c-trampa"; }
    else if (!res.correcta) { titulo = "✘  No es esa"; cls = ".c-mal"; }
    else if (res.suerte) { titulo = "✔  Correcta… pero al azar"; cls = ".c-aviso"; }
    else if (res.duda) { titulo = "✔  Correcta, pero dudabas"; cls = ".c-aviso"; }
    else { titulo = res.dominada ? "🏅  ¡Dominada sin dudas!" : "✔  ¡Correcto!"; cls = ".c-ok"; }
    caja.append(el("div.fb-tit" + cls, titulo, certeza ? el("span.suave.peq.tiempo", ` · ${seg(ms)} s`) : null));

    const avisos = [];
    if (res.error_seguro) avisos.push("Es el error más caro del examen: lo contestarías sin dudar y restaría. Lee bien la explicación; esta pregunta volverá hasta que la aciertes **segura " + res.confirmar + " veces seguidas**.");
    else if (res.suerte) avisos.push("Acertar por suerte no es saberla: no cuenta como aprendida y vuelve mañana.");
    else if (res.duda) avisos.push(res.confirmar ? "Sigue en corrección: necesitas acertarla **segura**." : "Vuelve en 2 días para fijarla. Cuando la contestes segura y rápido, el algoritmo la espaciará.");
    else if (res.correcta && res.confirmar > 0) avisos.push(`Bien corregida. Falta **${res.confirmar}** confirmación más para darla por superada.`);
    else if (res.correcta && res.lento) avisos.push(`Has tardado ${seg(ms)} s: aún no sale sola, así que no se permite «Fácil». En el examen tienes ~80 s por pregunta, pero las que dominas deben salir en segundos.`);
    else if (res.dominada) avisos.push("Tres veces seguidas segura y rápida: ya es un reflejo.");
    const tf = !res.correcta && letra ? tipoFallo(q, letra) : null;
    if (tf && tf.tipo === "inversion") avisos.push(`🔢 **Dígitos invertidos:** marcaste **${tf.tu}** y era **${tf.ok}**. La cifra la sabías; el fallo fue al leerla. Antes de marcar, lee la cifra dígito a dígito.`);
    else if (tf && tf.tipo === "cifra") avisos.push(`🔢 **Fallo de cifra:** la opción dice lo mismo y solo cambia el número. Marcaste **${tf.tu}**; era **${tf.ok}**.`);
    else if (tf && tf.tipo === "concepto") avisos.push("📘 **Fallo de concepto:** no es un número; repasa la idea en la explicación.");
    if (res.alerta_trampa_nueva) avisos.push("⚠ Has caído dos veces en el mismo distractor: queda marcada como ALERTA TRAMPA y la próxima vez cambiaré el orden de las opciones.");
    for (const a of avisos) caja.append(rico(a, "peq aviso-fb"));
    caja.append(rico(q.explicacion_rapida || ""));
    const zonaNota = el("div");
    const pintarNota = () => zonaNota.replaceChildren(...[cajaNota(qid)].filter(Boolean));
    pintarNota();
    caja.append(zonaNota);

    const fila = el("div.fila.envuelve");
    const bNota = boton(A.p.nota(qid) ? "✏️ Editar mi truco" : "✏️ Mi truco", () => editarNota(qid, () => {
      pintarNota();
      bNota.textContent = A.p.nota(qid) ? "✏️ Editar mi truco" : "✏️ Mi truco";
    }), "fantasma", { title: "Escribe tu propia regla para recordarla" });
    if (q.recorte_teorico) fila.append(boton("📖  Ver recorte del manual", () => verRecorte(q.recorte_teorico), bueno ? "secundario" : "aviso"));
    fila.append(bNota);
    if (!A.c.porValidar(qid)) {
      const bf = boton("🚩", () => {
        A.c.validaciones.marcar(qid);
        bf.textContent = "🚩 Enviada a «Por validar»";
        bf.disabled = true;
        A.actualizarNav();
      }, "fantasma", { title: "Enviar a revisión: creo que la respuesta está mal" });
      fila.append(bf);
    }
    if (res.valorar && valorar) {
      const pv = A.m.previsiones(qid);
      fila.append(el("span.suave.peq.sep", "¿Cómo te ha resultado?"));
      const opcionesV = [[`Difícil · ${pv.dificil} d`, "dificil", "secundario"], [`Bien · ${pv.bien} d`, "bien", "secundario"]];
      if (!res.lento) opcionesV.push([`Fácil · ${pv.facil} d`, "facil", "ok"]);
      for (const [txt, val, tipo] of opcionesV) {
        fila.append(boton(txt, () => { A.m.valorar(qid, val); onFin && onFin(true, res); }, tipo, { "data-val": val }));
      }
    } else {
      if (!res.correcta || res.suerte) fila.append(el("span.suave.peq.sep", opts.reinsertar === false ? "Vuelve mañana en la cola de emergencia." : "Vuelve a la cola de emergencia: la repetirás en esta sesión y mañana."));
      fila.append(el("span.flex1"), boton("Continuar →", () => onFin && onFin(bueno, res), "primario", { "data-continuar": "1" }));
    }
    caja.append(fila);
    zona.append(caja);
    if (onRespuesta) { try { onRespuesta(res.correcta, res); } catch (e) { console.error(e); } }
    setTimeout(() => caja.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  }

  if (limite) {
    const fin = t0 + limite * 1000;
    reloj = setInterval(() => {
      if (!raiz.isConnected && performance.now() - t0 > 2000) { clearInterval(reloj); return; }
      const resto = fin - performance.now();
      const f = barraTiempo.firstChild;
      f.style.width = Math.max(0, (resto / (limite * 1000)) * 100) + "%";
      f.style.background = resto < 5000 ? "var(--mal)" : resto < 10000 ? "var(--aviso)" : "var(--acento)";
      if (resto <= 0) {
        clearInterval(reloj);
        // sin respuesta = no salió; con opción marcada pero sin confirmar = dudaba
        if (seleccion === null) elegir(null, "duda"); else elegir(seleccion, "duda");
      }
    }, 100);
  }

  raiz.elegirVisible = (pos) => { if (!resuelta && botones[pos]) tocar(botones[pos][0]); };
  raiz.confirmarCerteza = (cert) => { if (!resuelta && seleccion !== null) { confirmar(cert); return true; } return false; };
  raiz.pendienteCerteza = () => !resuelta && seleccion !== null;
  raiz.detener = () => { if (reloj) clearInterval(reloj); };
  return raiz;
}

/** Teclado común: A-D/1-4 eligen; Enter = segura, Espacio = dudo, Z = al azar; Enter continúa. */
export function teclasPregunta(bloque, e) {
  if (!bloque) return false;
  if (/^[a-dA-D1-4]$/.test(e.key)) {
    const pos = /\d/.test(e.key) ? Number(e.key) - 1 : "ABCD".indexOf(e.key.toUpperCase());
    bloque.elegirVisible(pos);
    return true;
  }
  if (bloque.pendienteCerteza && bloque.pendienteCerteza()) {
    if (e.key === "Enter") return bloque.confirmarCerteza("segura");
    if (e.key === " ") return bloque.confirmarCerteza("duda");
    if (e.key === "z" || e.key === "Z") return bloque.confirmarCerteza("azar");
  }
  if (e.key === "Enter") {
    const b = bloque.querySelector("[data-continuar]") || bloque.querySelector('[data-val="bien"]');
    if (b) { b.click(); return true; }
  }
  return false;
}
