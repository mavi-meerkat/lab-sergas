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

/** Todas las frases fijas (para generar el guion de grabación). */
export function todasLasFrases() {
  const out = [];
  for (const lista of Object.values(GUION)) for (const [q, , t] of lista) out.push([q, t]);
  return out;
}
