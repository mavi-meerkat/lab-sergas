// Contexto compartido de la app (lo rellena app.js al arrancar).
export const A = {
  c: null,      // Contenido
  p: null,      // Store (progreso)
  m: null,      // Motor
  sim: null,    // Simulacros
  main: null,   // contenedor de la vista
  vista: null,  // {nombre, destruir?, teclas?, refrescarRemoto?}
  ir: null,
  abrirLeccion: null,
  actualizarNav: null,
};

export const TIPOS_TARJETA = {
  concepto: ["CONCEPTO", "azul", "azul_bg"],
  explicacion: ["EXPLICACIÓN DEL PROFESOR", "acento", "panel"],
  esquema: ["ESQUEMA", "acento", "panel"],
  tabla: ["TABLA RESUMEN", "acento", "panel"],
  mnemotecnia: ["REGLA MNEMOTÉCNICA · del profesor, no del libro", "violeta", "violeta_bg"],
  trampa: ["TRAMPA DE EXAMEN", "trampa", "trampa_bg"],
  ejercicio: ["EJERCICIO PRÁCTICO", "aviso", "aviso_bg"],
  comprobacion: ["COMPRUEBA QUE LO HAS ENTENDIDO", "ok", "ok_bg"],
  examen: ["ASÍ LO PREGUNTÓ EL SERGAS", "trampa", "trampa_bg"],
};

export const CONSEJOS_DESCANSO = [
  "Regla 20-20-20: mira algo a unos 6 metros durante 20 segundos para relajar el enfoque.",
  "Bebe un vaso de agua. La deshidratación leve ya empeora la concentración.",
  "Levántate y estira cuello y hombros: rota despacio 5 veces hacia cada lado.",
  "Cierra los ojos y respira: 4 s inspirando, 4 s aguantando, 6 s soltando. Repite 5 veces.",
  "Camina un poco, aunque sea por casa. Moverse ayuda a fijar lo estudiado.",
  "Aleja la vista de la pantalla. Nada de móvil: el descanso tiene que ser de verdad.",
];
