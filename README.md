# LAB SERGAS (web)

Entrenador de estudio para la oposición TSLCB del SERGAS. Es una app web instalable que funciona sin conexión
y sincroniza el progreso entre el ordenador y la tablet con Firebase.

- El temario va cifrado (`content.enc`) porque contiene fragmentos de los libros. La clave no está en este repositorio.
- `firestore.rules`: reglas de acceso de Firestore (solo las cuentas permitidas).
- `audio/`: clases narradas (voz sintética), una por tarjeta.
