// Bloque de pregunta tipo test con corrección inmediata + visor del recorte del libro.
import { A } from "./ctx.js";
import { el, boton, chip, rico, tarjeta, modal } from "./ui.js";

export function verRecorte(rec, titulo = "Recorte literal del manual") {
  modal((cerrar) => el("div.dialogo",
    el("div.fila.entre",
      el("h3", "📖  " + titulo),
      el("span.suave", `${A.c.nombreLibro(rec.libro)} · pág. PDF ${rec.pagina ?? "?"}`)),
    rec.texto ? tarjeta("bg-aviso_bg", rico(rec.texto)) : el("p.suave", "Este recorte no tiene texto."),
    el("p.suave.peq", "Los libros en PDF siguen en tu ordenador (carpeta LAB). Aquí ves la frase exacta y la página para buscarla."),
    el("div.fila.derecha", boton("Cerrar", cerrar, "secundario"))), { ancho: 760 });
}

const limpia = (s) => s.replace(/^[A-D]\)\s*/, "");

/**
 * opts: { onFin(correcta), contexto, valorar=true, onRespuesta(correcta) }
 */
export function bloquePregunta(qid, opts = {}) {
  const { onFin, contexto = "tutor", valorar = true, onRespuesta } = opts;
  const q = A.c.preguntas[qid];
  const est = A.p.estado(qid);
  const orden = A.m.ordenOpciones(qid);
  let resuelta = false;
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
  raiz.append(meta, rico(q.enunciado, "enunciado"));

  const botones = [];
  const lista = el("div.opciones");
  orden.forEach((idx, pos) => {
    const b = el("button.opcion", { type: "button" }, el("b", "ABCD"[pos] + ")"), " ", limpia(q.opciones[idx]));
    b.onclick = () => elegir(idx);
    botones.push([idx, b]);
    lista.append(b);
  });
  raiz.append(lista);
  const zona = el("div.zona-fb");
  raiz.append(zona);

  function elegir(idx) {
    if (resuelta) return;
    resuelta = true;
    const letra = "ABCD"[idx];
    const res = A.m.responder(qid, letra, contexto);
    const cIdx = "ABCD".indexOf(q.correcta);
    for (const [i, b] of botones) {
      b.disabled = true;
      if (i === cIdx) b.classList.add("bien");
      else if (i === idx) b.classList.add("mal");
    }
    const caja = tarjeta(res.correcta ? "bg-ok_bg" : "bg-mal_bg");
    caja.append(el("div.fb-tit" + (res.correcta ? ".c-ok" : ".c-mal"), res.correcta ? "✔  ¡Correcto!" : "✘  No es esa"));
    if (res.alerta_trampa_nueva) {
      caja.append(el("p.c-aviso.peq", "⚠ Has caído dos veces en el mismo distractor: queda marcada como ALERTA TRAMPA y la próxima vez cambiaré el orden de las opciones."));
    }
    caja.append(rico(q.explicacion_rapida || ""));
    const fila = el("div.fila.envuelve");
    if (q.recorte_teorico) fila.append(boton("📖  Ver recorte del manual", () => verRecorte(q.recorte_teorico), res.correcta ? "secundario" : "aviso"));
    if (!A.c.porValidar(qid)) {
      const bf = boton("🚩", () => {
        A.c.validaciones.marcar(qid);
        bf.textContent = "🚩 Enviada a «Por validar»";
        bf.disabled = true;
        A.actualizarNav();
      }, "fantasma", { title: "Enviar a revisión: creo que la respuesta está mal" });
      fila.append(bf);
    }
    if (res.correcta && valorar) {
      const pv = A.m.previsiones(qid);
      fila.append(el("span.suave.peq.sep", "¿Cómo te ha resultado?"));
      for (const [txt, val, tipo] of [[`Difícil · ${pv.dificil} d`, "dificil", "secundario"], [`Bien · ${pv.bien} d`, "bien", "secundario"], [`Fácil · ${pv.facil} d`, "facil", "ok"]]) {
        fila.append(boton(txt, () => { A.m.valorar(qid, val); onFin && onFin(true); }, tipo, { "data-val": val }));
      }
    } else {
      if (!res.correcta) fila.append(el("span.suave.peq.sep", "Vuelve a la cola de emergencia: la repetirás en esta sesión y mañana."));
      fila.append(el("span.flex1"), boton("Continuar →", () => onFin && onFin(res.correcta), "primario", { "data-continuar": "1" }));
    }
    caja.append(fila);
    zona.append(caja);
    if (onRespuesta) { try { onRespuesta(res.correcta); } catch (e) { console.error(e); } }
    setTimeout(() => caja.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  }
  raiz.elegirVisible = (pos) => { if (!resuelta && botones[pos]) elegir(botones[pos][0]); };
  return raiz;
}
