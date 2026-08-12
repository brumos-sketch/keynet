# PASALLAVE — Fase 1: backend, acceso y panel administrador

Primera entrega: toda la base de datos, autenticación por roles y el panel de administrador funcionando de punta a punta (módulos 1 a 8 del orden de construcción). Las fases siguientes (interfaz del punto, planes, panel anfitrión, boarding pass, buscador, pagos) se construyen encima sin rehacer nada.

## Diseño

Light mode en todas las vistas, sin modo oscuro en ningún lado.

- Fondo #f8f9fb, tarjetas #ffffff, bordes #e5e7eb, texto #111827, secundario #6b7280, acento #3b5bdb
- DM Sans para texto, JetBrains Mono para todos los códigos
- Bordes redondeados: 12-16px en tarjetas, 10px en inputs y botones
- Componentes shadcn/ui adaptados a esta paleta

## Qué incluye esta fase

### 1. Base de datos
Se crean las 13 tablas del esquema (profiles, associates, hosts, kiosks, keys, key_exchanges, access_codes, access_log, notifications, billing, point_commissions, pro_agreements, waitlist) con permisos y reglas de seguridad por rol: cada anfitrión ve solo sus llaves e intercambios, cada asociado solo sus puntos y comisiones, el operador de punto solo lo suyo, el administrador ve todo. El boarding pass y el buscador de puntos quedan preparados como lectura pública acotada.

Los roles se guardan en una tabla separada consultada mediante una función segura, para evitar que alguien pueda auto-asignarse permisos.

### 2. Acceso
- `/login`: email + contraseña + Google, tarjeta blanca centrada, sin selector de rol
- Registro público: queda como anfitrión automáticamente y entra a `/host`
- Cuenta con rol `pending`: mensaje "Tu cuenta está pendiente de aprobación"
- Redirección por rol: admin→/admin, associate→/associate, host→/host, kiosk→/kiosk
- Rutas protegidas: quien no tiene el rol correspondiente no entra

### 3. Panel administrador
Sidebar con Dashboard, Usuarios, Anfitriones, Llaves, Intercambios, Puntos, Facturación. En esta fase se completan:

- **Usuarios**: tabla con nombre, email, rol (badge) y fecha; cambio de rol por fila; creación manual. Al asignar host se crea el registro en anfitriones, associate en asociados, kiosk pide elegir punto.
- **Anfitriones**: alta, edición y baja (bloqueada si tiene llaves).
- **Puntos**: tarjetas con categoría, comisión %, horario y código PP; alta/edición con las 10 categorías (incluida "otro" con texto libre), horarios por día en selectores de 30 minutos o casilla 24 horas, comisión configurable por punto, asociado, contacto, foto y código PP-XXXXXX autogenerado y regenerable; panel de posiciones ocupadas/libres.
- **Llaves**: tabla con plan (badge) y código de depósito en monoespaciado. Al crear una llave mensual o pro se fija su código de depósito permanente, se genera automáticamente un intercambio "libre" con código de retiro bidireccional y, en pro, el código de acceso del huésped.
- **Intercambios**: tabla con booking_ref, posición y estado; vista de detalle con los códigos según plan y línea de tiempo.
- Dashboard y Facturación quedan como pantallas con la estructura y datos reales básicos; se completan con gráficos y ciclos de cobro en una fase posterior.

La posición del casillero nunca se muestra al anfitrión: solo administrador y operador del punto.

### 4. Datos demo
Se cargan los cinco usuarios de prueba (admin, María González anfitriona, Roberto Díaz asociado con 2 puntos, Kiosco Palermo como operador, y una cuenta pendiente) más puntos, llaves e intercambios de ejemplo para poder recorrer todo el panel desde el primer minuto.

## Decisiones acordadas

- Pagos: el flujo de compra queda simulado; MercadoPago se integra en la fase 18.
- Mapas: se usará OpenStreetMap/Nominatim (sin API key) cuando llegue el buscador.

## Detalles técnicos

- Generadores de códigos centralizados: intercambio XXX-XXX, booking ref ABC-123, punto PP-XXXXXX, posición aleatoria entre las libres del punto.
- La lógica de validación de códigos en el punto (orden: pro → depósito fijo → retiro bidireccional mensual → un uso) se escribe como función de servidor única y reutilizable ya en esta fase, aunque la pantalla del teclado numérico llegue en la fase siguiente.
- Estados de intercambio y transiciones (created, waiting_deposit, deposited, picked_up, completed, expired, overdue) definidos en un módulo compartido.
- Tipografías cargadas por `<link>` en la raíz y registradas como tokens del tema; todos los colores como tokens semánticos, sin clases de color fijas en los componentes.
- Cada vista con su propio título y descripción para SEO.

## Fases siguientes (no incluidas ahora)

9-10 interfaz del punto y lógica de planes · 11-12 panel anfitrión y gestión Pro · 13-15 panel asociado, dashboard y facturación · 16-17 boarding pass multi-idioma y buscador con lista de espera · 18-20 MercadoPago, notificaciones y seguridad.
