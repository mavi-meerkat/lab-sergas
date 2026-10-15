// Unidad de Análisis — frases fijas de los personajes (son las que se graban con voz Piper en el PC).
// Cualquier frase que NO esté aquí (enunciados, opciones, explicaciones) se lee con la voz del dispositivo.
// Cada entrada: [personaje, expresión, texto]

export const GUION = {
  bienvenida: [
    ["duarte", "neutro", "Bienvenida a la Unidad de Análisis, Anna. Aquí no adivinamos. Analizamos."],
    ["duarte", "serio", "Tres sedes, un equipo y un montón de muestras esperando. Elige por dónde empezamos."],
    ["duarte", "neutro", "Las personas mienten, Anna. Las muestras… no saben hacerlo."],
    ["duarte", "neutro", "Hoy hay trabajo en las tres sedes. Tú decides el orden."],
  ],
  sede_miami: [
    ["duarte", "neutro", "Miami. Sol, playa… y muestras mal conservadas a cuarenta grados."],
    ["marco", "sonrie", "Me encanta Miami. Hasta los cadáveres están morenos."],
    ["duarte", "serio", "En Miami el calor estropea las muestras antes que las coartadas."],
  ],
  sede_vegas: [
    ["duarte", "neutro", "Las Vegas. Aquí todo el mundo apuesta. Nosotros no: nosotros medimos."],
    ["iker", "sonrie", "¡Las Vegas! El único sitio donde el ADN tiene más luces que el casino."],
    ["duarte", "serio", "Lo que pasa en Las Vegas… acaba en nuestro laboratorio."],
  ],
  sede_nuevayork: [
    ["duarte", "neutro", "Nueva York. Ocho millones de personas y todas dejan rastro."],
    ["valeria", "neutro", "Nueva York tiene la mayor densidad de microorganismos por metro cuadrado de esta misión. Me parece fascinante."],
    ["duarte", "serio", "En esta ciudad nadie duerme. Y las bacterias, tampoco."],
  ],
  interrogatorio_intro: [
    ["duarte", "serio", "Tenemos cuatro sospechosos y una sola verdad. Entra ahí y encuéntrala."],
    ["marco", "sonrie", "He traído a los sospechosos. Y café. El café es para nosotros."],
    ["duarte", "neutro", "Escucha lo que dicen. Y luego escucha lo que dice la ciencia."],
    ["marco", "neutro", "Cuatro versiones de la misma historia. Ya sabes cómo va esto, Anna."],
  ],
  regla_verdad: [
    ["marco", "neutro", "Solo uno de ellos dice la verdad. Los otros tres mienten."],
    ["marco", "serio", "Atenta: aquí solo hay una declaración correcta."],
  ],
  regla_mentira: [
    ["marco", "serio", "Cuidado con esta. Tres dicen la verdad… y uno miente."],
    ["marco", "neutro", "Esta vez la pregunta va al revés: busca al único que miente."],
  ],
  acierto: [
    ["anna", "sonrie", "Lo tengo. Esa era la declaración que buscaba."],
    ["anna", "sonrie", "Caso resuelto. La ciencia no se equivoca."],
    ["marco", "sonrie", "¡Bien visto, Anna! Ya puedo terminarme el café tranquilo."],
    ["duarte", "neutro", "Buen trabajo. Siguiente."],
    ["iker", "sonrie", "¡Coincidencia confirmada! Me encanta cuando los datos cuadran."],
    ["anna", "sonrie", "Lo sabía. Lo he visto mil veces en el laboratorio."],
  ],
  fallo: [
    ["anna", "duda", "Mmm… no era ese. Vuelvo a mirar el expediente."],
    ["marco", "duda", "Ese no era, Anna. Pero tranquila, nadie se va de aquí."],
    ["duarte", "serio", "Te has dejado llevar por la historia. Fíate de los datos."],
    ["valeria", "neutro", "Estadísticamente, este error es muy común. Lo cual no lo hace correcto."],
  ],
  acusado_inocente: [
    ["sospechoso", "sorpresa", "¿Yo? ¡Pero si lo que he dicho es verdad!"],
    ["sospechoso", "serio", "Se equivoca de persona, detective."],
    ["sospechoso", "sorpresa", "¡Quiero hablar con mi abogado!"],
  ],
  acusado_culpable: [
    ["sospechoso", "serio", "Está bien… me ha pillado."],
    ["sospechoso", "sorpresa", "¿Cómo lo ha sabido?"],
    ["sospechoso", "duda", "No tengo nada más que decir."],
  ],
  explica: [
    ["valeria", "neutro", "Te lo explico con datos."],
    ["iker", "neutro", "Mira, esto es lo que dice el laboratorio."],
    ["carmen", "neutro", "Cariño, fíjate en esto, que es lo importante."],
  ],
  cierre: [
    ["duarte", "sorpresa", "Algunos mienten. Las muestras… nunca."],
    ["duarte", "sorpresa", "Puede huir de nosotros. Pero no… de su propio ADN."],
    ["duarte", "sorpresa", "En este laboratorio, las coartadas… se coagulan."],
    ["duarte", "sorpresa", "La verdad siempre deja rastro. Solo hay que saber… centrifugarla."],
    ["duarte", "sorpresa", "Al final, todo encaja. Como el tapón… en su tubo."],
    ["duarte", "sorpresa", "Caso cerrado. Y esta vez… sin hemólisis."],
  ],
  cierre_flojo: [
    ["duarte", "serio", "No ha sido tu mejor día, Anna. Los casos fríos te estarán esperando."],
    ["duarte", "serio", "Hoy han ganado ellos. Mañana, no."],
  ],
  rango: [
    ["duarte", "sonrie", "Anna… acabas de subir de rango. No te acostumbres a los aplausos."],
    ["carmen", "sonrie", "¡Enhorabuena, cielo! Esto hay que celebrarlo con un café de máquina."],
  ],
  frios_intro: [
    ["carmen", "neutro", "Bienvenida al archivo de casos sin resolver. Aquí guardamos lo que se nos resiste."],
    ["carmen", "sonrie", "Estos expedientes llevan tiempo en la nevera, cariño. A cuatro grados, como manda el protocolo."],
    ["carmen", "neutro", "Cada caso se cierra cuando lo resuelves bien dos veces seguidas. Sin prisas."],
  ],
  frios_vacio: [
    ["carmen", "sonrie", "El archivo está vacío. Eso es muy buena señal… o que aún no has fallado lo suficiente."],
  ],
  frios_bien: [
    ["carmen", "sonrie", "Muy bien. Una vez más y lo cerramos."],
    ["carmen", "sonrie", "Eso es. Ya casi lo tenemos."],
  ],
  frios_cerrado: [
    ["duarte", "sorpresa", "Caso frío… cerrado. Que no vuelva a calentarse."],
    ["carmen", "sonrie", "¡Archivado! Este ya no vuelve a la nevera."],
  ],
  frios_mal: [
    ["carmen", "neutro", "Todavía no. Lo dejamos en el archivo y lo intentamos otro día."],
    ["carmen", "duda", "Este se resiste. Léete bien la explicación, cariño."],
  ],
  lab_intro_adn: [
    ["duarte", "neutro", "Tenemos sangre en la escena y cuatro sospechosos. El ADN decidirá."],
    ["iker", "sonrie", "¡Gel listo! Cinco carriles, un marcador y un culpable. Me encanta mi trabajo."],
    ["duarte", "serio", "Los testigos olvidan. Los microsatélites, no."],
  ],
  lab_intro_abo: [
    ["duarte", "neutro", "Una mancha de sangre en el suelo. Antes del ADN, empecemos por el grupo."],
    ["iker", "sonrie", "Prueba directa, prueba inversa y Rh. Si cuadran, tenemos grupo. Si no cuadran, tenemos un problema."],
    ["carmen", "neutro", "La sangre de la escena no es de la víctima, cariño. Averigüemos de quién es."],
  ],
  lab_intro_micro: [
    ["valeria", "neutro", "He teñido la muestra del arma con Gram. Lo que vemos al microscopio nos dirá de dónde viene."],
    ["iker", "neutro", "Cuatro sospechosos, cuatro laboratorios y cuatro cultivos distintos. Solo uno coincide con el arma."],
    ["duarte", "neutro", "Las bacterias no mienten. Ni siquiera las de Nueva York."],
  ],
  lab_analiza: [
    ["iker", "neutro", "Primero lo primero: interpreta el resultado."],
    ["valeria", "neutro", "Antes de acusar a nadie, quiero oír tu interpretación técnica."],
  ],
  lab_bien: [
    ["valeria", "sonrie", "Interpretación correcta. Ahora compárala con los sospechosos."],
    ["iker", "sonrie", "¡Exacto! Ya solo falta ver con quién coincide."],
  ],
  lab_mal: [
    ["valeria", "neutro", "No es correcto. Te explico por qué, y luego comparamos."],
    ["iker", "duda", "Uy, casi. Mira bien el resultado otra vez."],
  ],
  lab_acusa: [
    ["duarte", "serio", "Ya tienes el resultado. ¿Con quién coincide?"],
    ["marco", "neutro", "Los cuatro esperan en la sala. Dime a cuál detengo."],
  ],
  lab_tribunal: [
    ["valeria", "neutro", "El juez querrá saber si dominas la técnica. Dos preguntas más."],
    ["duarte", "neutro", "Un buen caso se gana en el laboratorio… y se defiende en el juicio. Responde."],
  ],
  tablero_intro: [
    ["duarte", "neutro", "El tablero de pruebas, Anna. Une cada prueba con lo que significa. Y no me gastes todo el hilo rojo."],
    ["marco", "sonrie", "Chinchetas, hilo rojo y fotos en el corcho. Esto sí que es una investigación de verdad."],
    ["valeria", "neutro", "He colgado las pruebas. Cada una tiene exactamente una explicación correcta. Ni más ni menos."],
  ],
  tablero_bien: [
    ["iker", "sonrie", "¡Conectado!"],
    ["marco", "sonrie", "Eso encaja."],
    ["valeria", "neutro", "Correcto."],
  ],
  tablero_mal: [
    ["duarte", "serio", "Esas dos no tienen nada que ver."],
    ["valeria", "neutro", "No. Esa relación no existe."],
    ["iker", "duda", "Mmm… ese hilo no va ahí."],
  ],
  tablero_fin: [
    ["duarte", "sorpresa", "Todas las pruebas conectadas. El tablero… ya no tiene secretos."],
    ["marco", "sonrie", "Mira qué tablero más bonito ha quedado. Lo enmarcaría."],
  ],
  autopsia_intro: [
    ["carmen", "neutro", "Pasa, cariño. Nuestro paciente ya no tiene prisa, pero nosotras sí."],
    ["carmen", "serio", "Antes de abrir, hagamos las cosas bien. Aquí el protocolo no es opcional."],
    ["duarte", "neutro", "La víctima no puede hablar. Pero su química sí."],
  ],
  autopsia_analitica: [
    ["valeria", "neutro", "Ingresó en urgencias antes de morir. Tengo su analítica completa."],
    ["iker", "neutro", "He rescatado los resultados del laboratorio del hospital. Míralos con calma."],
  ],
  autopsia_veredicto: [
    ["carmen", "sonrie", "Eso es. Ya puedo firmar el informe."],
    ["duarte", "sorpresa", "La química no miente. Y ahora… tampoco el informe."],
  ],
  charla: [
    ["duarte", "neutro", "No me mires así. Las gafas de sol son parte del protocolo."],
    ["valeria", "neutro", "He contado los pasos hasta la máquina de café. Ciento doce. Es ineficiente."],
    ["marco", "sonrie", "Si necesitas un compañero para un interrogatorio, ya sabes dónde estoy."],
    ["iker", "sonrie", "¿Sabías que el tapón lila es mi favorito? EDTA. Elegante. Sin coágulos."],
    ["carmen", "sonrie", "Si te cansas, descansa. Un cerebro agotado no fija nada, cariño."],
    ["iker", "neutro", "He calibrado tres veces la centrífuga. Por si acaso. Bueno, cuatro."],
    ["valeria", "neutro", "No creo en la suerte. Creo en la repetición espaciada."],
  ],
};

// frases fijas usadas fuera de GUION (también se graban)
export const FRASES_EXTRA = [
  ["carmen", "Este expediente sigue abierto. Léelo con calma y dime qué ves."],
  ["sospechoso_h", "¡Por fin alguien me cree, detective!"], ["sospechoso_m", "¡Por fin alguien me cree, detective!"],
  ["sospechoso_h", "Vaya… se lo ha creído."], ["sospechoso_m", "Vaya… se lo ha creído."],
];

/** Todas las frases fijas con su voz (para el guion de grabación en el PC). */
export function frasesParaGrabar() {
  const out = [];
  for (const lista of Object.values(GUION)) for (const [q, , t] of lista) {
    if (q === "sospechoso") out.push(["sospechoso_h", t], ["sospechoso_m", t]);
    else out.push([q, t]);
  }
  out.push(...FRASES_EXTRA);
  const vistos = new Set();
  return out.filter(([q, t]) => { const k = q + "|" + t; if (vistos.has(k)) return false; vistos.add(k); return true; });
}
