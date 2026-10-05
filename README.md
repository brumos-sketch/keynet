# pasallave

# PASALLAVE — Prompt completo para Lovable

Construí PASALLAVE, una plataforma SaaS para gestión de intercambio de llaves físicas en puntos asociados (kioscos, cafés, tiendas) para anfitriones de Airbnb en Argentina.

## DISEÑO
- TODO es LIGHT MODE. No uses dark mode en NINGUNA vista.
- Tipografía: DM Sans para texto, JetBrains Mono para códigos
- Colores: fondo #f8f9fb, tarjetas #ffffff, bordes #e5e7eb, texto #111827, muted #6b7280, accent #3b5bdb
- Border-radius: 12-16px tarjetas, 10px inputs/botones
- Usá shadcn/ui como base

## STACK
- React + Vite + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- MercadoPago para pagos

## 5 ROLES
- **admin**: control total, gestiona todo
- **associate**: dueño de puntos, ve sus comisiones
- **host**: anfitrión, gestiona llaves e intercambios
- **kiosk**: operador del punto, solo teclado numérico

## AUTENTICACIÓN
- Login ÚNICO: email + contraseña + Google OAuth. Sin selector de rol.
- Registro público: al registrarse automáticamente es "host". Se crea registro en tabla hosts. Entra directo a su panel.
- Admin crea usuarios manualmente con cualquier rol desde su panel.
- Si role=pending → error "Tu cuenta está pendiente de aprobación".
- Redirección automática: admin→/admin, associate→/associate, host→/host, kiosk→/kiosk

## 3 PLANES

### Pasa Una (Un Uso) — $7.500
- Depósito + retiro = completado. Sin devolución.
- 48 horas de almacenamiento incluidas desde el depósito.
- Después de 48hs: código se vence (estado "expired"). $1.500 por cada 24hs extra.
- Para retirar después: anfitrión paga días extra → se genera nuevo código.

### Pasa Mes (Mensual) — $30.000/mes
- Código depósito FIJO en la llave (nunca cambia).
- Al crear llave → auto-genera intercambio "libre" (sin fechas) + pickup_code bidireccional.
- Anfitrión configura: check-in, check-out, pickup_time (horario retiro, selector 30min, opcional).
- Si pickup_time y huésped llega antes → countdown en pantalla del punto.
- Devolución con mismo código. Al devolver → auto-genera nuevo intercambio libre.
- Intercambios ilimitados.

### Pasa Pro — Precio personalizado
- Todo lo del mensual + access codes por rol (huésped/limpieza/colaborador/mantenimiento/otro).
- Códigos fijos (permanentes) y de estadía (rotativos).
- Validez por fecha y horario. Bloqueo remoto. Registro de accesos.
- El anfitrión toca "Contactar ventas", el admin configura precio y descuento.

## COMISIONES A PUNTOS
- Porcentaje del ingreso de planes, configurable POR PUNTO (ej: Punto A = 20%, Punto B = 15%).
- El % se define al crear/editar cada punto.

## BASE DE DATOS (Supabase)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT, name TEXT,
  role TEXT DEFAULT 'host' CHECK (role IN ('pending','admin','associate','host','kiosk')),
  kiosk_id UUID, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE associates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL, email TEXT, phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, address TEXT, positions INTEGER DEFAULT 50,
  category TEXT DEFAULT 'kiosco', custom_category TEXT,
  commission_percent INTEGER DEFAULT 20,
  associate_id UUID REFERENCES associates(id),
  contact_name TEXT, contact_phone TEXT,
  access_code TEXT UNIQUE NOT NULL,
  is_24h BOOLEAN DEFAULT false, schedule JSONB DEFAULT '{}',
  photo_url TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES hosts(id), kiosk_id UUID REFERENCES kiosks(id),
  name TEXT NOT NULL, property_name TEXT,
  subscription_type TEXT CHECK (subscription_type IN ('one_use','monthly','pro')),
  status TEXT DEFAULT 'active', locked BOOLEAN DEFAULT false,
  deposit_code TEXT, photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE key_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES keys(id), kiosk_id UUID REFERENCES kiosks(id),
  booking_ref TEXT UNIQUE NOT NULL, locker_position INTEGER NOT NULL,
  deposit_code TEXT NOT NULL, pickup_code TEXT, return_code TEXT,
  pickup_time TEXT,
  status TEXT DEFAULT 'waiting_deposit',
  check_in DATE, check_out DATE,
  deposited_at TIMESTAMPTZ, picked_up_at TIMESTAMPTZ, returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES keys(id),
  exchange_id UUID REFERENCES key_exchanges(id),
  code TEXT NOT NULL, role TEXT, person_name TEXT,
  has_validity BOOLEAN DEFAULT false,
  valid_from DATE, valid_to DATE, time_from TIME, time_to TIME,
  reusable BOOLEAN DEFAULT true, scope TEXT,
  uses_count INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID, code_id UUID,
  action TEXT, role TEXT, person_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES hosts(id),
  type TEXT, message TEXT, booking_ref TEXT,
  read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES hosts(id),
  period TEXT, plan TEXT, keys_count INTEGER,
  exchanges_count INTEGER, amount INTEGER,
  extra_days INTEGER DEFAULT 0, extra_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE point_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id UUID REFERENCES kiosks(id),
  period TEXT, plans_revenue INTEGER,
  commission_percent INTEGER, total INTEGER,
  status TEXT DEFAULT 'pending', paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pro_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES hosts(id),
  monthly_price INTEGER, keys_included INTEGER,
  discount_percent INTEGER DEFAULT 0,
  start_date DATE, status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL, email TEXT NOT NULL,
  name TEXT, phone TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
```

## PUNTOS (establecimientos asociados)
- Categorías: kiosco, café, estacionamiento, tienda, farmacia, lavandería, recepción, coworking, hotel, otro (texto libre)
- Horario por día: selectores cada 30 min (00:00, 00:30, 01:00... 23:30) o checkbox "24 horas"
- Código acceso: PP-XXXXXX (autogenerado, regenerable)
- Comisión %: configurable por punto
- Asociado: dueño del punto (puede tener varios)
- Foto de referencia

## FORMATOS DE CÓDIGOS
- Intercambio: XXX-XXX (6 dígitos con guión)
- Booking ref: ABC-123 (3 letras + 3 números)
- Punto: PP-XXXXXX
- Posiciones: aleatorias entre libres

## VALIDACIÓN DE CÓDIGOS EN PUNTO (este orden exacto)
1. Pro access codes (bidireccional, check validez+horario+bloqueo)
2. Depósito fijo monthly+pro (buscar en keys.deposit_code)
3. Pickup bidireccional monthly (check fecha check_in/check_out + pickup_time → countdown si temprano)
4. Standard one_use (deposit + pickup). Si expired → "CÓDIGO VENCIDO — CONTACTE AL ANFITRIÓN"

## ESTADOS DE INTERCAMBIO
created → waiting_deposit → deposited → picked_up → completed
                                     → expired (un uso: 48hs sin retiro)
                                     → overdue (mensual/pro: check_out pasó)

## INFORMACIÓN OCULTA AL ANFITRIÓN
La posición (locker_position) NO se muestra al anfitrión ni en el boarding pass. Solo admin y kiosk la ven.

## VISTAS

### /login — Login único
- Email + contraseña + Google OAuth
- Link "Registrate" → registro → automáticamente host → entra a /host
- Light mode, tarjeta blanca centrada

### /admin — Panel administrador
Sidebar con: Dashboard, Usuarios, Anfitriones, Llaves, Intercambios, Puntos, Facturación.

**Dashboard:** 6 stat cards, gráfico barras 7 días, donut estados, ocupación puntos, intercambios activos.

**Usuarios:** tabla nombre/email/rol(badge)/fecha. Selector rol por fila. Crear manual. Al asignar host→crear en hosts. Associate→crear en associates. Kiosk→seleccionar punto.

**Anfitriones:** CRUD nombre/email/teléfono. No eliminar si tiene llaves.

**Llaves:** tabla con plan(badge), deposit_code(monospace monthly+pro). Crear: si monthly/pro → deposit_code fijo + auto-genera intercambio libre + (pro) access_code huésped.

**Intercambios:** tabla con booking_ref(badge), posición, estado. Detalle: códigos según plan, timeline.

**Puntos:** tarjetas con categoría(badge), comisión %(badge), horario, código PP, panel posiciones. Crear/editar con todos los campos.

**Facturación:**
- Tab Anfitriones: período, plan, llaves, intercambios, monto, estado(pagado/pendiente). Botón marcar pagado.
- Tab Puntos: ingresos, comisión %, total, estado. Botón marcar pagado.
- Tab Acuerdos Pro: anfitrión, precio, llaves incluidas, descuento %, crear nuevo.

### /associate — Panel asociado
- Header: PASALLAVE + badge ASOCIADO + nombre + salir
- 4 stats: mis puntos, intercambios, cobradas, pendiente
- Tarjetas por punto: categoría, ocupación, intercambios, comisión %, pendiente, horario
- Tabla historial comisiones

### /host — Panel anfitrión
- Header: PASALLAVE + badge ANFITRIÓN + campana notificaciones + nombre + salir
- Stats + botón "+ Agregar propiedad" (4 pasos: elegir punto → nombre propiedad → elegir plan → pagar MercadoPago)
- Tabla llaves: deposit_code visible (monthly+pro), "Gestionar →" para Pro
- Tabla intercambios: SIN columna posición. Badge "Libre" si sin fechas.
- Configurar estadía (monthly+pro): check-in, check-out, pickup_time (selector 30min)
- Expired un uso: botón "Pagar $X → Renovar" con cálculo días extra
- Detalle con códigos + botón "Ver Boarding Pass"
- Gestión Pro: access codes por rol, registro accesos, bloqueo

### /kiosk — Interfaz del punto
- Login automático por role=kiosk
- Teclado numérico: • • • - • • • Light mode, JetBrains Mono
- Resultado: solo ACCIÓN + POSICIÓN → confirmar
- Countdown si fuera de horario
- Auto-renovación al devolver (monthly+pro)

### /pass/[bookingRef] — Boarding pass (PÚBLICO)
- Sin auth, accesible por cualquiera con el link
- Multi-idioma: detecta navigator.language → es/en/pt (traducciones en JSON)
- Código grande, pickup_time si hay, fechas, punto con Google Maps, horario, instrucciones
- Para Pro: muestra access_code huésped
- SIN posición, SIN teléfono del punto
- Botón copiar link

### /buscar — Buscador público de puntos
- "Usar mi ubicación" (geolocalización) + campo dirección (Google Places autocomplete)
- Mapa con puntos cercanos: nombre, dirección, horario, disponibilidad
- Si no hay punto → formulario waitlist (dirección + email)
- Selecciona punto → "Empezar" → login/registro → flujo compra

## DATOS DE PRUEBA
- admin@pasallave.com / admin123 → admin
- maria@mail.com / maria123 → anfitrión (María González)
- roberto@mail.com / roberto123 → asociado (Roberto Díaz, dueño de 2 puntos)
- punto1@pasallave.com / punto123 → kiosk (Kiosco Palermo)
- nuevo@mail.com / juan123 → pending

## ORDEN DE CONSTRUCCIÓN
Construí módulo por módulo en este orden. NO avances al siguiente sin verificar el anterior:
1. Supabase + tablas + auth + RLS
2. Login + registro + redirección por rol
3. Layout admin + sidebar
4. Usuarios (roles, crear manual)
5. CRUD anfitriones
6. CRUD puntos (categoría, horarios, comisión %, asociado)
7. CRUD llaves (planes, deposit_code, auto-gen intercambio)
8. CRUD intercambios
9. Interfaz punto (teclado, validación, countdown)
10. Lógica planes (un uso 48h+extra, mensual, pro)
11. Panel anfitrión (agregar propiedad, configurar estadía, expired)
12. Gestión Pro
13. Panel asociado
14. Dashboard admin
15. Facturación
16. Boarding pass (multi-idioma)
17. Buscador puntos + waitlist
18. MercadoPago
19. Notificaciones + vencimientos
20. SEO + seguridad

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://keynet.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cacbdc4e-698f-4ce9-bb37-98bba121c3e7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
