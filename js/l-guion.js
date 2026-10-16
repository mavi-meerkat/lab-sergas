// Lecciones con personajes (modo personajes). Generado desde build/guion_lecciones.json: casos del día, cierres y entradas.
export const NARRADOR = { M1: "duarte", M2: "duarte", M5: "duarte", M3: "carmen", M4: "carmen", M6: "valeria", M7: "valeria", M8: "valeria" };
export const narradorDe = (lid) => NARRADOR[String(lid).slice(0, 2)] || "duarte";
/** Nombre de cada tipo de tarjeta en modo personajes y quién la presenta (null = el narrador del módulo). */
export const TIPOS_PJ = {
  concepto: ["INFORME DEL CASO", null], explicacion: ["INFORME DEL CASO", null], esquema: ["INFORME DEL CASO", null],
  tabla: ["ARCHIVO DE PRUEBAS", null], trampa: ["TE LA INTENTA COLAR EL ABOGADO", "marco"], mnemotecnia: ["TRUCO DE PIPETA", "iker"],
  examen: ["CASO REAL ARCHIVADO", null], comprobacion: ["INTERROGATORIO RÁPIDO", null], ejercicio: ["RECONSTRUCCIÓN DE LOS HECHOS", null],
};
export const CASOS = {
 "M1_U1": "Un hospital compra la máquina más cara del mercado y cura a los mismos pacientes que antes. Eficaz, sí. Eficiente, no. Hoy hablamos de dinero y salud.",
 "M1_U2": "Un informe perfecto… con el nombre de otro paciente. Sin trazabilidad, la mejor prueba del mundo no vale nada. Hoy, papeles. Y papeles que salvan casos.",
 "M1_U3": "Un potasio de ocho en un hombre sano. O tiene un milagro… o tiene un tubo mal sacado.",
 "M1_U4": "Tapón lila, tapón azul, tapón gris. Elige mal el color y el laboratorio te dará una mentira con decimales.",
 "M1_U5": "Un hisopo seco llega al laboratorio. Lo que hubiera dentro ya no puede declarar. Hoy: exudados y muestras que se sacan con aguja.",
 "M1_U6": "La muestra salió bien, viajó mal y llegó muerta. Embalaje, temperatura y tiempo: aquí el transporte también es la escena del crimen.",
 "M1_U7": "En este laboratorio el enemigo no siempre es el sospechoso. A veces es una aguja reencapuchada. Hoy, seguridad.",
 "M2_U1": "Una pipeta mal enrasada y el resultado sale torcido desde el primer microlitro. Hoy conocemos las herramientas. Sin herramientas no hay pruebas.",
 "M2_U2": "Un frasco sin etiqueta en la estantería. Nadie sabe qué es. Nadie debería tocarlo. Hoy: riesgos y cómo no convertirte en víctima.",
 "M2_U3": "Diluyes uno a veinte y crees que has puesto veinte partes de agua. Error. Hoy, disoluciones. Las matemáticas también dejan huellas.",
 "M2_U4": "Una mezcla es un grupo de sospechosos que van juntos. Hoy aprendemos a separarlos: filtrar, centrifugar, extraer.",
 "M2_U5": "Una prueba que siempre da el mismo resultado… equivocado. Precisa, sí. Exacta, no. Hoy validamos.",
 "M2_U6": "La prueba estaba en el portaobjetos. Lo que faltaba era saber enfocar. Hoy, el microscopio.",
 "M2_U7": "Certificar no es acreditar. Confundirlas en el examen es firmar tu propia condena. Hoy, calidad.",
 "M3_U1": "Un perfil de ADN que coincide… con el técnico que hizo la PCR. Cariño, eso no es un culpable: es una contaminación. Hoy aprendemos a que no te pase.",
 "M3_U2": "Unas células que no paran de crecer en la placa. ¿Línea continua o contaminación? Hoy cuidamos cultivos, como quien cuida plantas, cariño.",
 "M3_U3": "Cuarenta y siete cromosomas en un cariotipo. Uno de más lo cambia todo. Hoy contamos cromosomas con calma.",
 "M3_U4": "El ADN no miente, pero hay que sacarlo limpio de la muestra. Hoy extraemos ácidos nucleicos sin romperlos.",
 "M3_U5": "Una sola molécula de ADN y, unas horas después, millones de copias. Así funciona la PCR. Y así se resuelven casos imposibles.",
 "M3_U6": "Una sonda que busca su pareja exacta entre millones de secuencias. Si la encuentra, se pega. Hoy, hibridación.",
 "M3_U7": "Quince marcadores y la probabilidad de que otra persona tenga tu mismo perfil se vuelve casi imposible. Hoy, ADN forense y secuenciación.",
 "M4_U1": "Antes de entender qué falla en un cuerpo, hay que saber cómo está hecho. Hoy empezamos por la célula, cariño.",
 "M4_U2": "Dos células muertas en la misma muestra. Una se suicidó y la otra fue asesinada. Hoy distinguimos apoptosis y necrosis.",
 "M4_U3": "El cuerpo tiene su propia unidad de investigación: el sistema inmunitario. Hoy conocemos a sus agentes.",
 "M4_U4": "Un brote en un barrio. ¿De dónde salió, cómo se movió y a quién alcanzó? Hoy seguimos la cadena epidemiológica.",
 "M4_U5": "Un bulto en la biopsia. ¿Benigno o maligno? Hoy aprendemos los criterios que lo deciden, sin prisas.",
 "M4_U6": "Un amoníaco altísimo y un paciente confuso. Cuando el hígado falla, la urea no se fabrica. Hoy, los grandes sistemas.",
 "M4_U7": "Un trombo que se suelta y viaja. Donde se pare, deja una escena del crimen. Hoy, hemostasia, trombosis y embolia.",
 "M4_U8": "Una hormona de más o una de menos y todo el cuerpo lo nota. Hoy, el sistema endocrino y sus mensajeros.",
 "M5_U1": "La luz entra en la cubeta y sale menos. Lo que se queda dentro es tu resultado. Hoy, espectrofotometría.",
 "M5_U2": "Una glucosa que baja sola en el tubo mientras espera. No es un milagro: son los hematíes comiendo. Hoy, glúcidos, lípidos y proteínas.",
 "M5_U3": "Escleróticas amarillas. La bilirrubina siempre deja rastro. Hoy, urea, creatinina y los restos del metabolismo.",
 "M5_U4": "Una enzima fuera de su órgano es un chivato. Te dice exactamente dónde hubo daño. Hoy, enzimas.",
 "M5_U5": "Una tira, un vaso de orina y medio cuerpo queda al descubierto. Hoy, el sistemático de orina.",
 "M5_U6": "Heces, líquido cefalorraquídeo y semen. Muestras incómodas, pruebas decisivas. Hoy, sin remilgos.",
 "M5_U7": "Un pH de siete coma dos. El cuerpo está pidiendo ayuda. Hoy leemos la gasometría.",
 "M5_U8": "Un positivo en el cribado de drogas. Sin confirmación, no vale ante el juez. Hoy, hormonas, fármacos y tóxicos.",
 "M6_U1": "Unos hematíes que se apelotonan al mezclarlos con un suero. La aglutinación es una confesión visible. Hoy, reacciones antígeno-anticuerpo.",
 "M6_U2": "Un pocillo que cambia de color. En un ELISA, el color es la prueba. Hoy, inmunoensayos. Me encantan.",
 "M6_U3": "El cuerpo atacándose a sí mismo. Los autoanticuerpos son la firma del agresor. Hoy, autoinmunidad.",
 "M6_U4": "Un cacahuete y una reacción en minutos. Hoy clasificamos la hipersensibilidad. Hay cuatro tipos, y solo uno es la alergia clásica.",
 "M6_U5": "Miles de células por segundo pasando por delante de un láser. Ninguna escapa. Hoy, citometría de flujo.",
 "M6_U6": "Separar linfocitos en un tubo con Ficoll es como separar testigos por capas. Hoy, la inmunidad celular.",
 "M6_U7": "Un trasplante que el cuerpo rechaza. El culpable estaba escrito en el HLA. Hoy, histocompatibilidad.",
 "M7_U1": "Un agente del grupo cuatro en la cabina equivocada. Hoy, bioseguridad. Aquí los errores no se repiten.",
 "M7_U2": "Morado o rosa. Con una tinción de Gram, la bacteria confiesa a qué bando pertenece. Hoy, teñir bacterias.",
 "M7_U3": "Una bacteria solo crece si le das el medio adecuado. Hoy, medios de cultivo: la comida de los sospechosos.",
 "M7_U4": "Una placa sembrada por agotamiento: colonias aisladas, una por sospechoso. Hoy, siembra y recuento.",
 "M7_U5": "Un estafilococo resistente a la meticilina. Saber qué es y qué antibiótico lo frena cierra el caso. Hoy, identificación y antibiograma.",
 "M7_U6": "Una mancha en la piel, un huevo en las heces. Hoy, hongos y parásitos.",
 "M7_U7": "El virus no puede vivir solo: necesita una célula que lo aloje. Hoy, virus de interés clínico.",
 "M8_U1": "La víctima tenía los hematíes apilados como monedas. Antes de pensar en un veneno, piensa en sus proteínas. Hoy empezamos con la sangre: de la médula al frotis.",
 "M8_U2": "Un hemograma trae un montón de cifras, y cada una cuenta algo distinto. Yo las leo todas. Hoy aprendes tú.",
 "M8_U3": "Unos hematíes pequeños y pálidos. Falta hierro. O no. Hoy, la serie roja y las anemias.",
 "M8_U4": "Un recuento de leucocitos disparado. ¿Infección o algo más serio? Hoy, serie blanca y plaquetas.",
 "M8_U5": "Una herida que no deja de sangrar. La cascada de la coagulación tiene un eslabón roto. Hoy lo buscamos.",
 "M8_U6": "Grupo A en el historial, grupo 0 en el tubo. Alguien se ha equivocado, y en transfusión eso no se perdona. Hoy, grupos sanguíneos.",
 "M8_U7": "Cuatrocientos cincuenta mililitros de sangre que salvan tres vidas. Hoy, la donación y los hemoderivados."
};
export const CIERRES = {
 "duarte": [
  "Expediente cerrado. El siguiente no se va a estudiar solo.",
  "Datos, no suposiciones. Hoy has traído datos.",
  "Bien. Mañana lo repasas. Los casos cerrados también se reabren.",
  "Buen trabajo, Anna. No te lo diré dos veces.",
  "Esto ya es tuyo. Que no te lo quite el examen.",
  "Lección terminada. El tribunal no avisa: repasa.",
  "Hoy has ganado terreno. Mañana, más.",
  "Correcto. Así se trabaja en esta unidad."
 ],
 "carmen": [
  "Buen trabajo, cariño. Ahora descansa un poco: el cerebro también necesita su tiempo de fijación.",
  "Lo has entendido. Y eso, en mi mesa, vale más que correr.",
  "Cerramos por hoy. Mañana lo repasamos juntas, ¿vale?",
  "Muy bien, cariño. Paso a paso, como en una autopsia.",
  "Eso es. Si mañana dudas, vuelves aquí y lo miramos otra vez.",
  "Has aprendido algo que mucha gente no sabe. Siéntete orgullosa.",
  "Terminado. Bebe agua, estira la espalda y sigue cuando quieras.",
  "Así me gusta. Con calma se llega más lejos."
 ],
 "valeria": [
  "Lección completada. Probabilidad de que lo recuerdes mañana: alta. Si lo repasas: altísima.",
  "Correcto. He anotado tu progreso. Me gusta anotar progresos.",
  "Fin de la lección. Datos registrados, conclusiones claras. Así me gusta.",
  "Excelente. Tu curva de aprendizaje es estadísticamente significativa.",
  "Completado. La repetición espaciada hará el resto. Confía en el método.",
  "Bien hecho. Esto ya no es una hipótesis: es un conocimiento.",
  "Lección cerrada. Si fuera un experimento, diría que ha salido limpio.",
  "Perfecto. Siguiente muestra, cuando estés lista."
 ]
};
export const ENTRADAS = {
 "marco": [
  "Cuidado, Anna: aquí es donde el abogado te intenta engañar.",
  "Ojo con esta, que la defensa la usa siempre.",
  "Atenta: esta tiene trampa. Te lo digo por experiencia.",
  "El abogado de la defensa adora esta. No le des el gusto.",
  "Para un momento. Aquí hay gato encerrado.",
  "Esta la he visto colar en mil interrogatorios. Escucha.",
  "Te la van a poner al revés. Prepárate.",
  "Aquí es donde cae todo el mundo. Tú no."
 ],
 "iker": [
  "¡Truco de Pipeta! Apúntatelo.",
  "Te cuento cómo me lo aprendí yo. Truco de Pipeta.",
  "Esto no viene así en el libro, pero funciona. Truco de Pipeta.",
  "Truco de Pipeta, garantizado. Bueno… casi garantizado.",
  "Atenta, que este truco me salvó en un examen.",
  "Pipeta al rescate. Escucha esto."
 ]
};

// «Ir al caso»: juego de la Unidad de Análisis que encaja con cada lección (el resto, interrogatorio de su sede).
const SEDE_MOD = { M1: "miami", M2: "miami", M4: "miami", M3: "vegas", M5: "vegas", M6: "vegas", M7: "nuevayork", M8: "nuevayork" };
const JUEGO_LECCION = {
  M1_U3: "muestra", M1_U4: "muestra", M1_U6: "custodia", M1_U5: "mesa", M5_U7: "mesa", M5_U3: "mesa", M5_U8: "custodia",
  M2_U4: "laboratorio", M3_U5: "laboratorio", M3_U7: "laboratorio", M8_U6: "laboratorio", M7_U2: "laboratorio", M7_U5: "laboratorio",
};
export const NOMBRE_JUEGO = { muestra: "El caso de la muestra", custodia: "Cadena de custodia", mesa: "La mesa de autopsias", laboratorio: "El laboratorio", interrogatorio: "El interrogatorio" };
export const casoDe = (lid) => ({ sede: SEDE_MOD[String(lid).slice(0, 2)] || "miami", juego: JUEGO_LECCION[lid] || "interrogatorio" });
