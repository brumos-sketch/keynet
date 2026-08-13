# Nuevo texto del hero

## Qué cambia

En la portada (`src/routes/index.tsx`), sección hero:

- Título: "Intercambiá llaves" pasa a **"Simplificá tu check-in"** (en navy), manteniendo la segunda línea "sin coordinar horarios" en azul eléctrico.
- Subtítulo: pasa a
  "La red de puntos seguros para entrega y retiro de llaves en comercios de tu barrio."
  y en un renglón aparte, en negrita y con el color navy del título:
  "Simple, cercano y 100% confiable."

## Detalle técnico

- Editar el `<h1>` y el `<p>` del hero (líneas ~170-176).
- El renglón final va como `<span className="block font-semibold text-navy">` dentro del mismo párrafo, para conservar el espaciado actual.
- Actualizar también el `head()` de la ruta (title, description, og:title, og:description) para que coincida con el nuevo mensaje.
