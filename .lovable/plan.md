# Estado: módulos 1 al 20

No, todavía no está todo. Están completas las Fases 1 y 2 (módulos 1 al 13). Faltan los módulos 14 al 20.

## Listo hoy (verificado en el código)

- Base de datos completa con roles y reglas de acceso (14 tablas).
- Login por email y Google, con redirección según rol.
- Panel Administrador: dashboard, usuarios, anfitriones, puntos (nueva vista tipo tarjeta con horario y grilla de posiciones), llaves, intercambios con línea de tiempo, facturación básica y comisiones.
- Panel Punto: teclado numérico, validación de códigos, horario y ocupación en vivo.
- Panel Anfitrión: asistente de nueva propiedad, estadías, renovaciones, códigos de acceso Pro.
- Panel Asociado: puntos, ocupación y comisiones por período.

## Falta (módulos 14 al 20)

1. **Acuerdos Pro (14)** — pantalla en admin para crear y editar acuerdos Pro por anfitrión: precio mensual, llaves incluidas, descuento, fecha de inicio y estado. Hoy la tabla existe pero no hay interfaz.
2. **Facturación completa (15)** — generación de períodos mensuales por anfitrión (plan, cantidad de llaves, intercambios, días extra) y de comisiones por punto, con cierre de período y detalle.
3. **Pase de abordar (16)** — página pública por reserva con instrucciones para el huésped: punto, dirección, mapa, horario, código y posición, en español, inglés y portugués, lista para compartir por link.
4. **Buscador público de puntos (17)** — página pública con mapa OpenStreetMap y búsqueda por dirección/zona, tarjetas de puntos cercanos y lista de espera cuando no hay cobertura.
5. **Pagos (18)** — flujo de checkout para Pasa Una, Pasa Mes y días extra. Sigue simulado: se marca pagado y se registra en facturación, con la integración real de MercadoPago dejada preparada pero no conectada.
6. **Notificaciones (19)** — avisos al anfitrión cuando se deposita, se retira o se devuelve una llave, y cuando una estadía queda vencida; campana con no leídos en el panel.
7. **SEO y cierre (20)** — títulos y descripciones propias por página pública, datos estructurados, sitemap y robots, más una revisión final de reglas de acceso.

## Detalles técnicos

- Nuevas rutas públicas: `/buscar` (buscador + mapa), `/pase/$ref` (pase de abordar), y `/checkout` para el flujo de pago simulado.
- Nuevas pantallas en admin: `/admin/pro` (acuerdos) y ampliación de `/admin/facturacion` con generación de período.
- Lógica de servidor nueva en `src/lib/pasallave.functions.ts`: generar facturación de período, generar comisiones, crear y leer notificaciones, y lectura pública del pase por referencia de reserva.
- El pase público se lee con una función de servidor con clave publicable y una política de solo lectura acotada, para no exponer datos del anfitrión.
- Mapa con Leaflet/OpenStreetMap cargado solo en el navegador y geocodificación con Nominatim, sin claves.
- Orden sugerido: 14 y 15 primero (cierran el circuito de dinero), luego 16 y 17 (cara pública), después 18, 19 y 20.
